"""Offline English Kokoro adapter. The parent process prepares explicit model files."""
import os
os.environ.update(HF_HUB_OFFLINE='1',TRANSFORMERS_OFFLINE='1',HF_HUB_DISABLE_TELEMETRY='1',DO_NOT_TRACK='1',TOKENIZERS_PARALLELISM='false')
import argparse,hashlib,json,re,time
from pathlib import Path

def main():
    parser=argparse.ArgumentParser();parser.add_argument('spec');parser.add_argument('output');args=parser.parse_args()
    spec=json.loads(Path(args.spec).read_text());out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
    import torch,numpy as np,soundfile as sf
    import spacy
    if not spacy.util.is_package('en_core_web_sm'):
        raise RuntimeError('English tokenizer missing. Run the explicit setup command; synthesis never downloads models.')
    from kokoro import KPipeline,KModel
    torch.set_num_threads(int(os.environ.get('EXPLAINER_CPU_THREADS','4')))
    snapshot=Path(spec['modelPath'])
    # No moving remote ref or implicit downloads during synthesis.
    model=KModel(repo_id='hexgrad/Kokoro-82M',config=str(snapshot/'config.json'),model=str(snapshot/'kokoro-v1_0.pth')).to('cpu').eval()
    pipe=KPipeline(lang_code=spec['language'],repo_id='hexgrad/Kokoro-82M',model=model,device='cpu')
    voice=str(snapshot/'voices'/f"{spec['voice']}.pt")
    if not Path(voice).is_file():raise RuntimeError('Voice is not installed: '+spec['voice']+'. Run setup with --voices.')
    receipts=[]
    for item in spec['items']:
        started=time.monotonic();chunks=[];words=[];offset=0.10
        text=item['text']
        for word,ipa in spec.get('lexicon',{}).items():
            text=re.sub(r'(?<![\w\[])'+re.escape(word)+r'(?!\w)',lambda _m:f'[{word}](/{ipa}/)',text)
        chunks.append(np.zeros(2400,dtype=np.float32))
        for result in pipe(text,voice=voice,speed=spec['speed']):
            a=np.asarray(result.audio,dtype=np.float32);chunks.append(a)
            for token in result.tokens or []:
                if token.start_ts is None or token.end_ts is None:continue
                token_text=token.text
                if not re.search(r'\w',token_text):
                    if words:words[-1]['text']+=token_text
                    continue
                words.append({'text':token_text,'start':round(offset+float(token.start_ts),5),'end':round(offset+float(token.end_ts),5),'id':f"{item['id']}-w{len(words)}"})
            offset+=len(a)/24000
        chunks.append(np.zeros(3600,dtype=np.float32));audio=np.concatenate(chunks)
        target=out/(item['id']+'.wav');sf.write(target,audio,24000,subtype='PCM_16')
        receipt={'schemaVersion':1,'text':item['text'],'textHash':hashlib.sha256(item['text'].encode()).hexdigest(),'duration':len(audio)/24000,'sampleRate':24000,'words':words,'timingMethod':'model-duration','voice':spec['voice'],'speed':spec['speed'],'modelRevision':spec['modelRevision'],'generationSeconds':time.monotonic()-started,'audioHash':hashlib.sha256(target.read_bytes()).hexdigest()}
        receipt['language']=spec['language']
        (out/(item['id']+'.json')).write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n');receipts.append({'id':item['id'],'seconds':receipt['duration']})
    print(json.dumps({'status':'ok','items':receipts}))

if __name__=='__main__':main()
