import {KitError} from './core.mjs';

// Every external wait needs a deadline and an interrupt path. The caller owns cleanup.
export async function bounded(action,{timeout=30000,signal,label='Operation'}={}){
  const interrupted=()=>new KitError('INTERRUPTED',`${label} interrupted.`,'Resume the command; completed segments remain cached.');
  if(signal?.aborted)throw interrupted();
  let timer,onAbort;
  try{return await Promise.race([
    Promise.resolve().then(action),
    new Promise((_,reject)=>{timer=setTimeout(()=>reject(new KitError('TIMEOUT',`${label} timed out.`,'Inspect the browser/encoder and resume the command.')),timeout);onAbort=()=>reject(interrupted());signal?.addEventListener('abort',onAbort,{once:true});}),
  ]);}finally{clearTimeout(timer);signal?.removeEventListener('abort',onAbort);}
}
export async function waitForDrain(child,{timeout=30000,signal}={}){
  let drain,error,close;
  try{return await bounded(()=>new Promise((resolve,reject)=>{
    drain=resolve;error=reject;close=()=>reject(new KitError('ENCODER_CLOSED','Encoder closed before accepting the frame.','Inspect encoder diagnostics.'));
    child.stdin.once('drain',drain);child.stdin.once('error',error);child.once('close',close);
    if(child.exitCode!==null||child.signalCode!==null||child.stdin.destroyed)close();else if(!child.stdin.writableNeedDrain)drain();
  }),{timeout,signal,label:'Encoder input'});}finally{
    if(drain)child.stdin.off('drain',drain);if(error)child.stdin.off('error',error);if(close)child.off('close',close);
  }
}
export async function stopEncoder(child,completion,{grace=1500}={}){
  if(child.exitCode!==null||child.signalCode!==null)return;
  child.stdin.destroy();child.kill('SIGTERM');
  try{await bounded(()=>completion,{timeout:grace,label:'Encoder termination'});}
  catch{child.kill('SIGKILL');await bounded(()=>completion,{timeout:5000,label:'Encoder forced termination'});}
}
