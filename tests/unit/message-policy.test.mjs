import test from 'node:test';import assert from 'node:assert/strict';import {messageProblems,aiIdentity} from '../../scripts/message-policy.mjs';
test('conventional messages and actual human coauthors are allowed',()=>{assert.deepEqual(messageProblems('fix(captions): preserve the last spoken word\n\nCo-authored-by: Claude Dupont <claude@example.org>'),[]);assert.equal(aiIdentity('Claude Dupont <claude@example.org>'),false);});
test('common AI and bot coauthor trailers are rejected',()=>{for(const identity of ['Claude <noreply@anthropic.com>','Codex <codex@users.noreply.github.com>','ChatGPT <ai@example.org>','GitHub Copilot <ai@example.org>','helper[bot] <bot@example.org>'])assert.ok(messageProblems('docs(readme): explain setup\n\nCo-authored-by: '+identity).length);});
test('provider discussion remains allowed while promotional attribution is rejected',()=>{assert.deepEqual(messageProblems('fix(agents): clarify Claude adapter setup\n\nThe OpenAI and Kokoro routes keep their existing behavior.'),[]);assert.ok(messageProblems('fix(agents): clarify setup\n\nGenerated with Claude Code').length);});
test('invalid titles fail and a PR body is checked without requiring a commit-shaped first sentence',()=>{assert.ok(messageProblems('updated stuff').length);assert.deepEqual(messageProblems('The player now retains the final word. Checked the timing regression.',{subject:false}),[]);});

test('human GitHub noreply usernames containing model names remain allowed',()=>{
  for(const email of ['claude-dupont@users.noreply.github.com','123+claude-dupont@users.noreply.github.com','codex-researcher@users.noreply.github.com']){const identity='Claude Dupont <'+email+'>';assert.equal(aiIdentity(identity),false);assert.deepEqual(messageProblems('fix(captions): retain words\n\nCo-authored-by: '+identity),[]);}
  assert.equal(aiIdentity('Assistant <123+codex[bot]@users.noreply.github.com>'),true);
});

test('edited PR events check both the new title and attribution body locally',async()=>{
  const fs=await import('node:fs/promises'),os=await import('node:os'),path=await import('node:path');const {ROOT,run}=await import('../../src/engine/core.mjs');
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'explainer-pr-')),event=path.join(dir,'event.json');
  try{const invoke=()=>run(process.execPath,[path.join(ROOT,'scripts/check-commit.mjs'),'--pr-event',event]);
    await fs.writeFile(event,JSON.stringify({action:'edited',pull_request:{title:'fix(captions): retain words',body:'Checked the word boundaries.'}}));assert.match(await invoke(),/passed/);
    await fs.writeFile(event,JSON.stringify({action:'edited',pull_request:{title:'updated stuff',body:''}}));await assert.rejects(invoke());
    await fs.writeFile(event,JSON.stringify({action:'edited',pull_request:{title:'fix(captions): retain words',body:'Co-authored-by: Codex <codex@users.noreply.github.com>'}}));await assert.rejects(invoke());
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});
