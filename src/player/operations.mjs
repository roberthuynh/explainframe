// Small, deterministic operations for authored technical scenes. No drawing or clock state.
const finite=x=>typeof x==='number'&&Number.isFinite(x);
function vector(v,name){if(!Array.isArray(v)||!v.length||!v.every(finite))throw new Error(name+' must be a nonempty finite vector');}
function matrix(m,name){if(!Array.isArray(m)||!m.length)throw new Error(name+' must be a nonempty matrix');m.forEach(r=>vector(r,name));if(m.some(r=>r.length!==m[0].length))throw new Error(name+' must be rectangular');}
function checked(v){if(!v.every(finite))throw new Error('Numeric overflow in operation');return v;}
export function matvec(m,v){matrix(m,'Matrix');vector(v,'Vector');if(m[0].length!==v.length)throw new Error('Matrix/vector dimension mismatch');return checked(m.map(row=>row.reduce((s,x,i)=>s+x*v[i],0)));}
export function softmax(scores){vector(scores,'Scores');const max=Math.max(...scores),e=scores.map(x=>Math.exp(x-max)),sum=e.reduce((a,b)=>a+b,0);return e.map(x=>x/sum);}
export function attention(query,keys,values,{mask}={}){vector(query,'Query');matrix(keys,'Keys');matrix(values,'Values');if(keys[0].length!==query.length||keys.length!==values.length)throw new Error('Attention dimension mismatch');const scores=matvec(keys,query).map(x=>x/Math.sqrt(query.length)),weights=maskedSoftmax(scores,mask),output=checked(values[0].map((_,j)=>values.reduce((s,v,i)=>s+weights[i]*v[j],0)));return {scores,weights,output};}
// Resolve both endpoints from actual speech. A reversed/missing interval must fail.
export function between(time,cue,start,end){const a=typeof start==='string'?cue(start):cue(start.word,start),b=typeof end==='string'?cue(end):cue(end.word,end);if(![time,a,b].every(finite)||b<=a)throw new Error('Cue interval must be finite and increasing');const t=Math.max(0,Math.min(1,(time-a)/(b-a)));return t*t*(3-2*t);}
export function lerp(a,b,p){if(![a,b,p].every(finite)||p<0||p>1)throw new Error('Interpolation needs finite endpoints and progress in [0,1]');return a*(1-p)+b*p;}

// A boolean mask excludes positions before normalization. Scores remain finite for auditing.
export function maskedSoftmax(scores,mask){
 vector(scores,'Scores');
 if(mask===undefined)return softmax(scores);
 if(!Array.isArray(mask)||mask.length!==scores.length||mask.some(x=>typeof x!=='boolean')||!mask.some(Boolean))throw new Error('Mask must have one boolean per score and include at least one position');
 const visible=scores.filter((_,i)=>mask[i]),normalized=softmax(visible);let j=0;
 return scores.map((_,i)=>mask[i]?normalized[j++]:0);
}
