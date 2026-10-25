import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {ROOT,containedFile} from './core.mjs';
// Bundle dependencies so a copied job has no implicit link to its original location.
// Keep names and formatting: this is an editable source deliverable.
export async function portableModule(dir,module){
 const file=await containedFile(dir,module),allowed=[await fs.realpath(dir),await fs.realpath(ROOT)];
 const result=await build({entryPoints:[file],absWorkingDir:dir,bundle:true,write:false,platform:'browser',format:'esm',minify:false,metafile:true,plugins:[{name:'portable-project-boundary',setup(b){b.onLoad({filter:/.*/},async args=>{const real=await fs.realpath(args.path);if(!allowed.some(root=>real.startsWith(root+path.sep)))throw new Error('Custom import escapes the project: '+args.path);return undefined;});}}]});
 // esbuild's source-section comments may expose an external job's absolute path.
 const headers=new Set(Object.keys(result.metafile.inputs).map(name=>'// '+name));
 return result.outputFiles[0].text.split('\n').filter(line=>!headers.has(line)).join('\n').trim()+'\n';
}
