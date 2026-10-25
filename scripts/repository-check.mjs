import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),problems=[];
const tracked=spawnSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8'});
const actualRoot=spawnSync('git',['rev-parse','--show-toplevel'],{cwd:root,encoding:'utf8'}).stdout?.trim();
const skip=new Set(['.git','node_modules','.venv','.local','build','dist','projects','test-results','qa','__pycache__']);
async function walk(dir,prefix=''){const out=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){if(skip.has(e.name))continue;const name=prefix+e.name;if(e.isDirectory())out.push(...await walk(path.join(dir,e.name),name+'/'));else if(e.isFile())out.push(name);}return out;}
const candidates=actualRoot===root&&tracked.status===0
 ? [...new Set(tracked.stdout.split('\0').filter(Boolean))]
 : await walk(root);
const files=[];
for(const name of candidates){
 try{await fs.access(path.join(root,name));files.push(name);}
 catch(error){if(error.code!=='ENOENT')throw error;}
}
const required=['README.md','START-HERE.md','AGENTS.md','CONTRIBUTING.md','CHANGELOG.md','LICENSE','THIRD_PARTY.md','src/cli.mjs','src/engine/core.mjs','src/player/player.mjs','src/voice/narrate.py','schemas/project.schema.json','docs/README.md','docs/verification/README.md','docs/design/overview.md','docs/guides/using.md','docs/guides/tooling.md','.github/PULL_REQUEST_TEMPLATE.md','.github/workflows/verify.yml','.githooks/commit-msg'];
for(const name of required)try{await fs.access(path.join(root,name));}catch{problems.push('Missing '+name);}
for(const name of files){
 const parts=name.split('/');if(parts.some(p=>skip.has(p))||/^\.env(?:\.|$)/.test(name))problems.push('Generated/private material tracked: '+name);
 const file=path.join(root,name),stat=await fs.stat(file);if(stat.size>5_242_880)problems.push('File exceeds the current 5 MiB source limit: '+name);
 if(!/\.(md|mjs|py|json|yml|yaml|toml|html)$/.test(name))continue;
 const text=await fs.readFile(file,'utf8');
 if(name.endsWith('.json'))try{JSON.parse(text);}catch(e){problems.push('Invalid JSON '+name+': '+e.message);}
 if(/[/](?:Users|private[/]tmp)[/]/.test(text))problems.push('Machine-specific personal path: '+name);
 if(name.endsWith('.md'))for(const m of text.matchAll(/!?\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+"[^"]*")?\)/g)){
  let link=m[1]??m[2];if(/^(?:[a-z]+:|#)/i.test(link)||link.includes('<')||link.includes('>'))continue;
  link=decodeURIComponent(link.split('#')[0]);if(!link)continue;
  try{await fs.access(path.resolve(path.dirname(file),link));}catch{problems.push('Broken local link in '+name+': '+link);}
 }
}
const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8')),lock=JSON.parse(await fs.readFile(path.join(root,'package-lock.json'),'utf8'));
if(pkg.version!==lock.version||pkg.version!==lock.packages[''].version)problems.push('Node package/lock versions disagree');
const core=await fs.readFile(path.join(root,'src/engine/core.mjs'),'utf8');if(!core.includes("VERSION = '"+pkg.version+"'"))problems.push('CLI version differs from package.json');
for(const [name,command] of Object.entries(pkg.scripts??{})){
 const entry=command.match(/^node ([^\s]+\.mjs)(?:\s|$)/)?.[1];
 if(!entry)continue;
 try{await fs.access(path.join(root,entry));}
 catch{problems.push('Script '+name+' points to a missing entry: '+entry);}
}
for(const [name,value]of Object.entries(pkg.dependencies??{}))if(!/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(value))problems.push('Dependency must be pinned: '+name);
for(const adapter of ['.agents/skills/explainer/SKILL.md','.claude/skills/explainer/SKILL.md']){
 const text=await fs.readFile(path.join(root,adapter),'utf8'),reference=text.match(/`([^`]+SKILL\.md)`/);
 if(!reference)problems.push('Adapter lacks canonical skill pointer: '+adapter);else try{await fs.access(path.resolve(root,path.dirname(adapter),reference[1]));}catch{problems.push('Adapter pointer is broken: '+adapter);}
}
const workflow=await fs.readFile(path.join(root,'.github/workflows/verify.yml'),'utf8');
for(const m of workflow.matchAll(/uses:\s*([^\s@]+)@([^\s#]+)/g))if(!/^[a-f0-9]{40}$/.test(m[2]))problems.push('Action must use a full commit pin: '+m[1]);
if(!/contents:\s*read/.test(workflow)||workflow.includes('pull_request_target')||workflow.includes('secrets.'))problems.push('Verification workflow must remain read-only and secret-free');
if(!/pull_request:\s*\n\s*types:\s*\[[^\]]*\bedited\b[^\]]*\]/.test(workflow))problems.push('PR verification must run when title or body is edited');
if(problems.length){console.error(problems.join('\n'));process.exit(1);}console.log('Repository check passed: '+files.length+' source files, local links, JSON, versions, pins and skill pointers.');
