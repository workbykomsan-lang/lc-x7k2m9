import { logMel, ctcWords } from './core.mjs';
const REPO='https://huggingface.co/yayaiu6/Verto-Arabic-ASR/resolve/71640c9359520f39999079a92f0b97a6651f06c4/';
let ort, session, filters, pieces;
const post=(type,v={})=>self.postMessage({type,...v});
async function cached(name){
  const c=await caches.open('localcut-model-v1'); const url=REPO+name;
  let r=await c.match(url);
  if(!r){ r=await fetch(url); if(!r.ok) throw new Error('model download failed '+name); await c.put(url,r.clone()); }
  return r;
}
async function load(){
  ort=await import('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.2/dist/ort.min.mjs');
  ort.env.wasm.wasmPaths='https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.2/dist/';
  ort.env.wasm.numThreads=1;
  post('progress',{msg:'تحميل الموديل (70MB، مرة واحدة)'});
  const bytes=new Uint8Array(await (await cached('metro.int8.onnx')).arrayBuffer());
  filters=await (await cached('mel_filters.json')).json();
  pieces=(await (await cached('tokenizer.json')).json()).pieces;
  session=await ort.InferenceSession.create(bytes,{executionProviders:['wasm']});
  post('ready');
}
async function transcribe(samples,offset){
  const f=logMel(samples,filters);
  const out=await session.run({features:new ort.Tensor('float32',f.data,[1,f.frames,80]),feature_lengths:new ort.Tensor('int64',BigInt64Array.of(BigInt(f.frames)),[1])});
  const T=Number(out.output_lengths.data[0]); const V=out.log_probs.dims[2];
  const words=ctcWords(out.log_probs.data,V,T,pieces,(samples.length/16000)/T);
  return words.map(w=>({t:w.t,s:+(w.s+offset).toFixed(2),e:+(w.e+offset).toFixed(2)}));
}
self.onmessage=async({data})=>{
  try{
    if(data.type==='load') await load();
    if(data.type==='run'){
      const all=[]; const s=data.samples, N=16000*30;
      for(let o=0,i=0;o<s.length;o+=N,i++){
        const chunk=s.subarray(o,Math.min(s.length,o+N)); if(chunk.length<8000) break;
        post('progress',{msg:`تفريغ الجزء ${i+1}`,pct:Math.min(1,o/s.length)});
        all.push(...await transcribe(chunk,o/16000));
      }
      post('result',{words:all});
    }
  }catch(e){ post('error',{error:String(e&&e.message||e)}); }
};
