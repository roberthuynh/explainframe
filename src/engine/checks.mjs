import path from 'node:path';
import {missingVisualDescription} from '../player/description.mjs';
import {FORMATS,hash,hashFile,exists,readJSON,validTimings,KitError} from './core.mjs';
import {evaluateChecks,inputFingerprint} from './publish.mjs';

export async function checkProject(dir,project,{target,formats}={}){
  const renderFile=path.join(dir,'dist/render.json');
  target??=await exists(renderFile)?'video':'preview';
  if(!['preview','video','bundle'].includes(target))throw new KitError('INVALID_TARGET','Unknown check target '+target,'Use preview, video or bundle.');
  const checks=evaluateChecks(project),problems=[],warnings=[],exports=[];
  if(checks.some(c=>!c.pass))problems.push('Declared numeric check failed');
  for(const source of project.sources)if(source.status==='not-yet-read')problems.push('Unread source: '+source.id);
  for(const claim of project.claims)if(!claim.sources?.length)warnings.push('Claim has no linked source: '+claim.id);
  for(const scene of project.scenes)if(missingVisualDescription(scene))problems.push('Visual meaning is undocumented: '+scene.id+'. Add visualDescription or confirm visualMeaningInNarration after reviewing the narration.');
  const inputHash=await inputFingerprint(dir,project);
  const preparedFile=path.join(dir,'build/prepared.json');
  if(!await exists(preparedFile))problems.push('No prepared project. Run preview or render.');
  else{
    const prepared=await readJSON(preparedFile);
    if(prepared.projectHash!==hash(project)||prepared.manifest.inputHash!==inputHash)problems.push('Prepared project is stale: inputs, assets or scene code changed. Run preview/render.');
    for(const scene of prepared.manifest.scenes)if(!validTimings(scene.words,scene.audioDuration))problems.push('Invalid word timing: '+scene.id);
    const player=path.join(dir,'dist/review.html'),receiptFile=path.join(dir,'dist/review.json');
    if(!await exists(player)||!await exists(receiptFile))problems.push('No verified review player. Run preview.');
    else{
      try{const receipt=await readJSON(receiptFile);
        if(receipt.schemaVersion!==1||receipt.file!=='review.html'||receipt.inputHash!==inputHash||!Object.hasOwn(FORMATS,receipt.format))problems.push('Review player is stale or its receipt is invalid. Run preview.');
        if(receipt.sha256!==await hashFile(player))problems.push('Review player bytes changed or are empty. Run preview.');
      }catch{problems.push('Review player receipt is unreadable. Run preview.');}
    }
  }
  if(target==='video'){
    if(!await exists(renderFile))problems.push('No rendered video. Run render.');
    else{
      const receipt=await readJSON(renderFile);
      if(receipt.projectHash!==hash(project)||receipt.inputHash!==inputHash)problems.push('Video exports are stale: inputs, assets or scene code changed. Render again.');
      const requested=formats??project.formats;
      for(const format of requested)if(!receipt.results.some(r=>r.format===format))problems.push('Missing requested video format: '+format);
      for(const item of receipt.results){
        if(!item.decodePass||!await exists(item.file)||await hashFile(item.file)!==item.sha256)problems.push('Video failed verification, changed or missing: '+item.format);
        exports.push({format:item.format,decodePass:item.decodePass});
      }
    }
  }
  if(target==='bundle'){
    const file=path.join(dir,'dist/artifacts.json');
    if(!await exists(file)||!await exists(path.join(dir,'dist/handoff.zip')))problems.push('No handoff archive. Run bundle.');
    else{
      const receipt=await readJSON(file);
      if(receipt.projectHash!==hash(project)||receipt.inputHash!==inputHash)problems.push('Handoff is stale. Run bundle again.');
      for(const item of receipt.files){const file=path.join(dir,'dist/handoff',item.file);if(!await exists(file)||await hashFile(file)!==item.sha256)problems.push('Handoff file changed or missing: '+item.file);}
      if(receipt.archiveHash!==await hashFile(path.join(dir,'dist/handoff.zip')))problems.push('Handoff ZIP changed');
    }
  }
  return {status:problems.length?'needs-attention':'technical-checks-passed',target,checks,exports,problems,warnings,contentReview:'Source support, pronunciation and learner comprehension still require content review; technical success does not certify them.'};
}
