import {frame} from './scene.mjs';
import {visualDescription} from './description.mjs';

export async function boot(manifest,{format='portrait',custom={},renderOnly=false}={}){
  let viewStyle=manifest.style,viewCaption={...manifest.caption},displayedScene='';
  const config=manifest.formatPresets[format];if(!config)throw new Error('Unknown format '+format);
  const stage=document.querySelector('#stage');stage.width=config.width;stage.height=config.height;
  const player=document.querySelector('#player');player.style.setProperty('--ratio',`${config.width}/${config.height}`);
  const title=document.querySelector('#title');title.textContent=manifest.title;
  const audio=new Audio();audio.preload='auto';let currentScene='',playing=false,raf=0,globalTime=0;
  const duration=document.querySelector('#duration'),scrub=document.querySelector('#scrub'),play=document.querySelector('#play');
  scrub.max=manifest.duration;duration.textContent=clock(manifest.duration);
  const list=document.querySelector('#transcript');
  for(const scene of manifest.scenes){const b=document.createElement('button');b.className='transcript-scene';b.dataset.scene=scene.id;const heading=document.createElement('b');heading.className='scene-heading';heading.textContent=scene.title;const time=document.createElement('small');time.textContent=clock(scene.start)+' – '+clock(scene.end);const words=document.createElement('span');words.textContent=scene.narration;b.append(heading,time,words);b.addEventListener('click',()=>seek(scene.start));list.append(b);}
  const sources=document.querySelector('#sources');
  for(const source of manifest.sources){const li=document.createElement('li');if(source.url&&/^https?:\/\//.test(source.url)){const a=document.createElement('a');a.href=source.url;a.textContent=source.title??source.url;a.target='_blank';a.rel='noreferrer';li.append(a);}else li.textContent=source.title??source.id;sources.append(li);}
  const star=document.querySelector('#star');if(manifest.kitURL&&/^https:\/\/github\.com\/[^/]+\/[^/#?]+\/?$/.test(manifest.kitURL)){star.href=manifest.kitURL;star.hidden=false;}
  const setScene=scene=>{if(currentScene!==scene.id){currentScene=scene.id;audio.src=scene.audio;audio.load();}};
  function draw(t){globalTime=Math.max(0,Math.min(manifest.duration-.00001,t));const result=frame(stage,manifest,globalTime,{format,custom,style:viewStyle,caption:viewCaption});if(displayedScene!==result.scene){displayedScene=result.scene;const scene=manifest.scenes.find(s=>s.id===result.scene);showEvidence(scene);stage.setAttribute('aria-label',scene.title);document.querySelector('#visual-description').textContent=visualDescription(scene)||'Visual description not yet supplied.';}scrub.value=globalTime;document.querySelector('#current').textContent=clock(globalTime);for(const b of list.children)b.classList.toggle('current',b.dataset.scene===result.scene);return result;}
  async function seek(t){const scene=manifest.scenes.find(s=>t>=s.start&&t<s.end)??manifest.scenes.at(-1);setScene(scene);draw(t);audio.currentTime=Math.min(scene.audioDuration,Math.max(0,t-scene.start));if(playing&&t-scene.start<scene.audioDuration)await audio.play().catch(()=>pause());}
  function pause(){playing=false;audio.pause();cancelAnimationFrame(raf);play.textContent='Play';}
  async function start(){if(globalTime>=manifest.duration-.1)await seek(0);playing=true;play.textContent='Pause';if(parent!==window)parent.postMessage({kind:'explainer-play'},'*');await seek(globalTime);let previous=performance.now();const tick=now=>{if(!playing)return;const scene=manifest.scenes.find(s=>globalTime>=s.start&&globalTime<s.end)??manifest.scenes.at(-1);let next;if(!audio.paused&&!audio.ended)next=scene.start+audio.currentTime;else next=globalTime+(now-previous)/1000*audio.playbackRate;previous=now;if(next>=manifest.duration-.01){draw(manifest.duration-.00001);pause();return;}if(next>=scene.end){seek(scene.end+.00001);previous=now;}else draw(next);raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);}
  play.onclick=()=>playing?pause():start();scrub.oninput=()=>seek(Number(scrub.value));document.querySelector('#back').onclick=()=>seek(Math.max(0,globalTime-8));
  document.querySelector('#speed').onchange=e=>{audio.playbackRate=Number(e.target.value);};
  document.querySelector('#format').value=format;document.querySelector('#format').onchange=e=>{const newFormat=e.target.value;const next=manifest.formatPresets[newFormat];stage.width=next.width;stage.height=next.height;format=newFormat;player.style.setProperty('--ratio',`${next.width}/${next.height}`);draw(globalTime);};
  document.addEventListener('keydown',e=>{if(e.target.matches('input,select,textarea,button'))return;if(e.code==='Space'){e.preventDefault();playing?pause():start();}if(e.key==='ArrowLeft')seek(Math.max(0,globalTime-5));if(e.key==='ArrowRight')seek(Math.min(manifest.duration-.01,globalTime+5));});
  function appearance({style,caption}={}){
    if(style&&['paper','ink','chalk'].includes(style))viewStyle=style;
    if(caption&&['karaoke','pop','plain','none'].includes(caption)){viewCaption.mode=caption;document.querySelector('#caption-mode').value=caption;}
    return draw(globalTime);
  }
  document.querySelector('#caption-mode').value=viewCaption.mode;
  document.querySelector('#caption-mode').onchange=e=>appearance({caption:e.target.value});
  document.querySelector('#mute').onclick=e=>{audio.muted=!audio.muted;e.target.textContent=audio.muted?'Unmute':'Mute';e.target.setAttribute('aria-pressed',String(audio.muted));};
  const addText=(parent,tag,value,className)=>{const node=document.createElement(tag);node.textContent=value;if(className)node.className=className;parent.append(node);return node;};
  function sourceLabel(parent,source,locator){
    const p=document.createElement('p');p.className='source-note';
    if(source.url&&/^https?:\/\//.test(source.url)){const a=addText(p,'a',source.title??source.id);a.href=source.url;a.target='_blank';a.rel='noreferrer';}else addText(p,'span',source.title??source.id);
    if(locator??source.locator)addText(p,'span',' · '+(locator??source.locator));
    parent.append(p);
  }
  function showEvidence(scene){
    const box=document.querySelector('#evidence');box.replaceChildren();
    if(!scene.claims?.length)addText(box,'p','No claim references recorded for this scene.','source-note');
    for(const id of scene.claims??[]){const claim=manifest.claims.find(c=>c.id===id);if(!claim)continue;const article=document.createElement('article');article.className='evidence-item';addText(article,'span',claim.basis??'Linked claim','basis');addText(article,'p',claim.text);
      if(!claim.sources?.length)addText(article,'p','No linked support recorded.','support-limit');
      for(const sid of claim.sources??[]){const source=manifest.sources.find(s=>s.id===sid);if(source)sourceLabel(article,source,claim.locator);}
      if(claim.note)addText(article,'p',claim.note,'source-note');if(claim.limit)addText(article,'p','Limit: '+claim.limit,'support-limit');box.append(article);
    }
  }
  const teaching=manifest.teaching;
  if(teaching){document.querySelector('#brief').hidden=false;for(const [key,label] of [['audience','For'],['goal','Goal'],['prerequisite','Starts from'],['limit','Leaves out']])if(teaching[key])addText(document.querySelector('#brief-content'),'p',label+': '+teaching[key]);
    if(teaching.questions?.length){document.querySelector('#learning').hidden=false;for(const q of teaching.questions){const card=document.createElement('article');card.className='question';addText(card,'p',q.question);const reveal=document.createElement('details');addText(reveal,'summary','Reveal the answer');addText(reveal,'p',q.answer);if(q.explanation)addText(reveal,'p',q.explanation);card.append(reveal);if(q.scene){const replay=addText(card,'button','Replay the idea');replay.onclick=async()=>{await seek(manifest.scenes.find(s=>s.id===q.scene).start);if(!playing)await start();};}document.querySelector('#questions').append(card);}}
  }
  for(const item of manifest.downloads??[]){if(!/^[a-zA-Z0-9._-]+$/.test(item.file))continue;const a=addText(document.querySelector('#downloads'),'a',item.title);a.href=item.file;a.download=item.file;}
  function reviewNote(){const scene=manifest.scenes.find(s=>s.id===displayedScene)??manifest.scenes[0];return {schemaVersion:1,title:manifest.title,scene:scene.id,sceneTitle:scene.title,time:Number(globalTime.toFixed(2)),note:document.querySelector('#revision-note').value.trim()};}
  document.querySelector('#copy-revision').onclick=async()=>{const note=reviewNote(),text='Revise “'+note.title+'”, scene “'+note.sceneTitle+'” ('+note.scene+', '+clock(note.time)+'): '+(note.note||'Make the mechanism clearer. Preserve the sources and refresh the affected outputs.');const status=document.querySelector('#revision-status');try{await navigator.clipboard.writeText(text);status.textContent='Copied. Paste this into your agent conversation.';}catch{const field=document.querySelector('#revision-note');field.value=text;field.select();status.textContent='Select and copy the request above; clipboard access is unavailable here.';}};
  document.querySelector('#save-review').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(reviewNote(),null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='review-notes.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);document.querySelector('#revision-status').textContent='Give review-notes.json to your agent.';};
  await document.fonts.ready;
  window.sceneImages={};await Promise.all(manifest.scenes.filter(s=>s.visual.type==='image').map(async s=>{const image=new Image();image.src=s.visual.data;await image.decode();window.sceneImages[s.id]=image;}));
  window.renderAt=t=>draw(t);window.explainer={manifest,seek,pause,start,audio,frame:t=>draw(t),appearance};
  if(renderOnly)document.body.classList.add('render-only');draw(0);window.filmReady=true;
}
function clock(t){return `${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;}
