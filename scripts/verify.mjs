import path from 'node:path';
import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
function run(command,args){
  const result=spawnSync(command,args,{cwd:root,stdio:'inherit'});
  if(result.status!==0)process.exit(result.status??1);
}
async function javascriptFiles(folder){
  const files=[];
  for(const entry of await fs.readdir(path.join(root,folder),{withFileTypes:true})){
    const name=path.join(folder,entry.name);
    if(entry.isDirectory())files.push(...await javascriptFiles(name));
    else if(entry.name.endsWith('.mjs'))files.push(name);
  }
  return files.sort();
}

run(process.execPath,['scripts/repository-check.mjs']);
const folders=['bin','src','scripts','tests'];
for(const entry of await fs.readdir(path.join(root,'examples'),{withFileTypes:true})){
  if(!entry.isDirectory())continue;
  const scenes=path.join('examples',entry.name,'scenes');
  try{await fs.access(path.join(root,scenes));folders.push(scenes);}catch{}
}
for(const folder of folders){
  for(const file of await javascriptFiles(folder))run(process.execPath,['--check',file]);
}
const python=spawnSync('python3',['--version'],{stdio:'ignore'});
if(python.status===0){
  run('python3',['-c',"import ast,pathlib; ast.parse(pathlib.Path('src/voice/narrate.py').read_text()); print('Python syntax passed; voice inference is a separate check.')"]);
}else{
  console.log('Python syntax not checked: python3 unavailable. Bundled-media tests still run.');
}
const gitRoot=spawnSync('git',['rev-parse','--show-toplevel'],{cwd:root,encoding:'utf8'}).stdout?.trim();
if(gitRoot===root)run(process.execPath,['scripts/check-commit.mjs','--history']);
else console.log('Git history not checked: this is a source archive, not a Git checkout.');
const tests=(await javascriptFiles('tests/unit')).filter(file=>file.endsWith('.test.mjs'));
if(!tests.length)throw new Error('No unit tests found in tests/unit.');
run(process.execPath,['--test',...tests]);
console.log('Verification passed. No video render, model download or speech inference was requested.');
