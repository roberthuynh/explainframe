import fs from 'node:fs/promises';
import path from 'node:path';
import {ROOT,escapeHTML} from './core.mjs';
export async function portableNotices(){
  const entries=[['LICENSE.txt','LICENSE'],['Figtree-OFL.txt','assets/fonts/figtree-OFL.txt'],['Newsreader-OFL.txt','assets/fonts/newsreader-OFL.txt'],['COMPONENTS.md','THIRD_PARTY.md']];
  return await Promise.all(entries.map(async([file,source])=>({file,text:await fs.readFile(path.join(ROOT,source),'utf8')})));
}
export async function noticesHTML(){return '<details id="licenses"><summary>Licenses and component notices</summary>'+ (await portableNotices()).map(n=>`<h2>${escapeHTML(n.file)}</h2><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${escapeHTML(n.text).replace(/ +(?=\r?\n)/g,s=>'&#32;'.repeat(s.length))}</pre>`).join('')+'</details>';}
