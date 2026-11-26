const $=x=>document.getElementById(x);
let file,url,samples,dur=0,words=[],preset=null,presets=[],isVideo=true;
const FONTS={Cairo:'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/cairo/Cairo%5Bslnt%2Cwght%5D.ttf','Tajawal-ExtraBold':'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/tajawal/Tajawal-ExtraBold.ttf','Almarai-ExtraBold':'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/almarai/Almarai-ExtraBold.ttf',Changa:'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/changa/Changa%5Bwght%5D.ttf','IBMPlexSansArabic-Bold':'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/ibmplexsansarabic/IBMPlexSansArabic-Bold.ttf',ElMessiri:'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/elmessiri/ElMessiri%5Bwght%5D.ttf',Lemonada:'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/lemonada/Lemonada%5Bwght%5D.ttf',ReemKufi:'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/reemkufi/ReemKufi%5Bwght%5D.ttf'};
const worker=new Worker('asr-worker.js',{type:'module'});
let wres=null; worker.onmessage=({data:d})=>{ if(d.type==='progress') $('m2').textContent=d.msg+(d.pct?` (${Math.round(d.pct*100)}%)`:''); if(d.type==='ready'&&wres.ready)wres.ready(); if(d.type==='result')wres.result(d.words); if(d.type==='error'){$('m2').textContent='مشكلة: '+d.error;wres.fail&&wres.fail(d.error)} };
const loadFonts=async()=>{for(const [k,v] of Object.entries(FONTS)){const f=new FontFace(k,`url(${v})`,{weight:'100 1000'});await f.load();document.fonts.add(f)}};
(async()=>{presets=await (await fetch('presets.json')).json();preset=presets[0];await loadFonts();
 const c=$('presets');presets.forEach(p=>{const d=document.createElement('div');d.className='p'+(p===preset?' on':'');d.textContent=p.name;d.style.background=p.bg||'#0B1F14';d.style.color=p.fill==='#111111'?'#111':(p.bg?p.fill:(p.highlight||p.fill));d.style.fontFamily=p.font;d.onclick=()=>{preset=p;[...c.children].forEach(x=>x.classList.remove('on'));d.classList.add('on')};c.appendChild(d)})})();
$('gap').oninput=e=>$('gv').textContent=e.target.value;
async function decode(file){
  const buf=await file.arrayBuffer(); const ac=new (window.AudioContext||window.webkitAudioContext)();
  const ab=await ac.decodeAudioData(buf); const n=Math.ceil(ab.duration*16000);
  const oc=new OfflineAudioContext(1,n,16000); const s=oc.createBufferSource(); s.buffer=ab; s.connect(oc.destination); s.start();
  const r=await oc.startRendering(); return r.getChannelData(0);
}
$('f').onchange=async e=>{file=e.target.files[0]; if(!file)return; $('m1').textContent='بقرا الملف...';
  try{ samples=await decode(file); dur=samples.length/16000; url=URL.createObjectURL(file); isVideo=file.type.startsWith('video');
   const v=$('src'); v.src=url; await new Promise(r=>{v.onloadedmetadata=r;v.onerror=r});
   $('m1').textContent=`تمام. المدة ${dur.toFixed(1)} ثانية`; $('tr').disabled=false; window.__ready=1;}catch(err){$('m1').textContent='الملف مش مفهوم: '+err}};
let loaded=false;
$('tr').onclick=async()=>{ $('tr').disabled=true; $('m2').textContent='بجهز الموديل...';
  if(!loaded){ await new Promise((res,rej)=>{wres={ready:res,fail:rej};worker.postMessage({type:'load'})}); loaded=true; }
  const t0=performance.now();
  words=await new Promise((res,rej)=>{wres={result:res,fail:rej};worker.postMessage({type:'run',samples})});
  words=applyVocab(words); draw(); const sec=((performance.now()-t0)/1000);
  $('m2').textContent=`${words.length} كلمة في ${sec.toFixed(1)} ثانية. اضغط على أي كلمة غلط وصلّحها.`; $('rn').disabled=false; $('tr').disabled=false; window.__transcribed=1;};
const norm=s=>s.replace(/[\u064b-\u0652\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي');
function lev(a,b){const d=[...Array(b.length+1).keys()];for(let i=1;i<=a.length;i++){let p=d[0];d[0]=i;for(let j=1;j<=b.length;j++){const t=d[j];d[j]=Math.min(d[j]+1,d[j-1]+1,p+(a[i-1]!==b[j-1]));p=t}}return d[b.length]}
function applyVocab(ws){const rules=$('vocab').value.split('\n').map(l=>l.split('=')).filter(x=>x.length==2&&x[0].trim()&&x[1].trim()).map(([a,b])=>[a.trim().split(/\s+/),b.trim()]);
  for(const [bad,good] of rules){for(let i=0;i<=ws.length-bad.length;i++){const ok=bad.every((w,k)=>{const x=norm(ws[i+k].t),y=norm(w);return x===y||lev(x,y)<=Math.floor(y.length/4)});
    if(ok){ws[i].t=good;ws[i].e=ws[i+bad.length-1].e;ws.splice(i+1,bad.length-1)}}} return ws}
function draw(){const w=$('words');w.innerHTML='';words.forEach((x,i)=>{const s=document.createElement('span');const inp=document.createElement('input');inp.value=x.t;inp.size=Math.max(3,x.t.length);inp.oninput=()=>words[i].t=inp.value;const sm=document.createElement('small');sm.textContent=x.s+'s';s.append(inp,sm);w.appendChild(s)})}
function segmentsFromAudio(gap){const hop=320,thr=0.012;const n=Math.floor(samples.length/hop);const act=[];for(let i=0;i<n;i++){let e=0;for(let j=0;j<hop;j++){const v=samples[i*hop+j];e+=v*v}act.push(Math.sqrt(e/hop)>thr)}
  const segs=[];let st=null,last=-1e9;const sil=Math.ceil(gap*50);
  for(let i=0;i<n;i++){if(act[i]){if(st===null)st=i;last=i}else if(st!==null&&i-last>sil){segs.push([st,last+1]);st=null}}
  if(st!==null)segs.push([st,last+1]);
  return segs.map(([a,b])=>[Math.max(0,a*hop/16000-0.08),Math.min(dur,b*hop/16000+0.08)]).filter(s=>s[1]-s[0]>0.15)}
function splitLong(segs){const out=[];for(const [a,b] of segs){let s=a;for(const w of words){if(w.s>=s+3.5&&w.s<b-1){out.push([s,w.s-0.02]);s=w.s-0.02}}out.push([s,b])}return out}
function drawCaption(ctx,t,W,H){
  const n=Math.max(1,preset.words_per_line||2);let g=-1;
  for(let i=0;i<words.length;i+=n){const nx=words[i+n]?words[i+n].s:words[Math.min(i+n-1,words.length-1)].e+0.25;if(t>=words[i].s&&t<nx){g=i;break}}
  if(g<0)return; const grp=words.slice(g,g+n); let cur=0;grp.forEach((w,k)=>{if(t>=w.s)cur=k});
  const size=Math.round(W*0.115);ctx.font=`900 ${size}px "${preset.font}"`;ctx.direction='rtl';ctx.textBaseline='middle';ctx.textAlign='left';
  const gapx=size*0.3;const ws=grp.map(w=>ctx.measureText(w.t).width);let total=ws.reduce((a,b)=>a+b,0)+gapx*(grp.length-1);
  const y={low:H*0.80,center_low:H*0.68,center:H*0.5}[preset.pos||'low'];
  let x=(W+total)/2; 
  if(preset.bg){ctx.fillStyle=preset.bg;const pad=size*0.35;ctx.beginPath();ctx.roundRect((W-total)/2-pad,y-size*0.75,total+2*pad,size*1.5,pad);ctx.fill()}
  grp.forEach((w,k)=>{x-=ws[k];const col=(k===cur&&preset.highlight)?preset.highlight:preset.fill;
    if(preset.stroke&&!preset.bg){ctx.lineWidth=(preset.stroke_w||6)*W/1080*1.4;ctx.strokeStyle=preset.stroke;ctx.lineJoin='round';ctx.strokeText(w.t,x,y)}
    ctx.fillStyle=col;ctx.fillText(w.t,x,y);x-=gapx})}
$('rn').onclick=async()=>{ $('rn').disabled=true; $('m3').textContent='بصدّر الفيديو (بياخد نفس مدة الفيديو تقريبا)...';
  const cv=$('cv'),ctx=cv.getContext('2d'),W=cv.width,H=cv.height; const el=$('src'); el.muted=false;
  let segs=$('cut').checked?segmentsFromAudio(+$('gap').value):[[0,dur]]; if(!segs.length)segs=[[0,dur]]; if($('zoom').checked)segs=splitLong(segs);
  const ac=new AudioContext(); const msrc=ac.createMediaElementSource(el); const dest=ac.createMediaStreamDestination(); msrc.connect(dest);
  const stream=new MediaStream([...cv.captureStream(30).getVideoTracks(),...dest.stream.getAudioTracks()]);
  const mime=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4;codecs=avc1','video/mp4','video/webm;codecs=vp9,opus','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));
  const rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:5e6}); const chunks=[];rec.ondataavailable=e=>chunks.push(e.data);
  const done=new Promise(r=>rec.onstop=r); let si=0; el.currentTime=segs[0][0]; await new Promise(r=>{el.onseeked=r}); await ac.resume(); rec.start(); await el.play();
  const total=segs.reduce((a,s)=>a+s[1]-s[0],0); let outT=0;
  const tick=()=>{const t=el.currentTime;
    if(t>=segs[si][1]-0.02){outT+=segs[si][1]-segs[si][0];si++;if(si>=segs.length){el.pause();rec.stop();return} el.currentTime=segs[si][0]}
    const z=(si%2===1&&$('zoom').checked)?1.12:1;ctx.fillStyle='#0B3D1E';ctx.fillRect(0,0,W,H);
    if(isVideo&&el.videoWidth){const s=Math.max(W/el.videoWidth,H/el.videoHeight)*z;const dw=el.videoWidth*s,dh=el.videoHeight*s;ctx.drawImage(el,(W-dw)/2,(H-dh)/2,dw,dh)}
    else{const gr=ctx.createLinearGradient(0,0,W,H);gr.addColorStop(0,'#0B3D1E');gr.addColorStop(1,'#00C853');ctx.fillStyle=gr;ctx.fillRect(0,0,W,H)}
    drawCaption(ctx,t,W,H);$('m3').textContent=`تصدير ${Math.round((outT+t-segs[si][0])/total*100)}%`;requestAnimationFrame(tick)};
  requestAnimationFrame(tick); await done; el.muted=true;
  let blob=new Blob(chunks,{type:mime.split(';')[0]}); let note='';
  if(mime.startsWith('video/mp4')&&!/mp4a/.test(mime)){ try{$('m3').textContent='بحوّل الصوت لـ AAC عشان واتساب وإنستا...';blob=await toAac(blob);note=' | AAC ✓'}catch(err){note=' | AAC فشل: '+err} }
const u=URL.createObjectURL(blob);$('out').src=u;$('dl').href=u;$('dl').download='local-cut.'+(mime.includes('mp4')?'mp4':'webm');
  $('res').style.display='block';$('m3').textContent='خلص';$('stat').textContent=`من ${dur.toFixed(1)}ث إلى ${total.toFixed(1)}ث، ${segs.length} مقطع، ${mime}${note}`;$('rn').disabled=false;window.__done={bytes:blob.size,mime,segs:segs.length,total,note};};

async function toAac(blob){
  const {FFmpeg}=await import('./index.js'); const ff=new FFmpeg();
  try{ const cdn='https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/';
   const bu=async(u,t)=>URL.createObjectURL(new Blob([await (await fetch(u)).arrayBuffer()],{type:t}));
   await ff.load({coreURL:await bu(cdn+'ffmpeg-core.js','text/javascript'),wasmURL:await bu(cdn+'ffmpeg-core.wasm','application/wasm')});
   await ff.writeFile('in.mp4',new Uint8Array(await blob.arrayBuffer()));
   const code=await ff.exec(['-hide_banner','-v','error','-i','in.mp4','-map','0:v:0','-map','0:a:0','-c:v','copy','-c:a','aac','-b:a','128k','-movflags','+faststart','out.mp4'],120000);
   if(code!==0)throw new Error('ffmpeg code '+code);
   const d=await ff.readFile('out.mp4'); return new Blob([d],{type:'video/mp4'});
  } finally { ff.terminate(); }
}
