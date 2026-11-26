const $=x=>document.getElementById(x);
let file,url,samples,dur=0,words=[],preset=null,presets=[],isVideo=true;
const FONTS={Cairo:'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/cairo/Cairo%5Bslnt%2Cwght%5D.ttf','Tajawal-ExtraBold':'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/tajawal/Tajawal-ExtraBold.ttf','Almarai-ExtraBold':'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/almarai/Almarai-ExtraBold.ttf',Changa:'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/changa/Changa%5Bwght%5D.ttf','IBMPlexSansArabic-Bold':'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/ibmplexsansarabic/IBMPlexSansArabic-Bold.ttf',ElMessiri:'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/elmessiri/ElMessiri%5Bwght%5D.ttf',Lemonada:'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/lemonada/Lemonada%5Bwght%5D.ttf',ReemKufi:'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/reemkufi/ReemKufi%5Bwght%5D.ttf'};
const worker=new Worker('asr-worker.js',{type:'module'});
let wres=null; worker.onmessage=({data:d})=>{ if(d.type==='progress') $('m2').textContent=d.msg+(d.pct?` (${Math.round(d.pct*100)}%)`:''); if(d.type==='ready'&&wres.ready)wres.ready(); if(d.type==='result')wres.result(d.words); if(d.type==='error'){$('m2').textContent='مشكلة: '+d.error;wres.fail&&wres.fail(d.error)} };
const loadFonts=async()=>{for(const [k,v] of Object.entries(FONTS)){const f=new FontFace(k,`url(${v})`,{weight:'100 1000'});await f.load();document.fonts.add(f)}};
(async()=>{presets=await (await fetch('presets.json')).json();preset=presets[0];await loadFonts();
 const c=$('presets');presets.forEach(p=>{const d=document.createElement('div');d.className='p'+(p===preset?' on':'');d.textContent=p.name;d.style.background=p.bg||'#0B1F14';d.style.color=p.fill==='#111111'?'#111':(p.bg?p.fill:(p.highlight||p.fill));d.style.fontFamily=p.font;d.onclick=()=>{preset=p;[...c.children].forEach(x=>x.classList.remove('on'));d.classList.add('on')};c.appendChild(d)})})();
$('gap').oninput=e=>$('gv').textContent=e.target.value;
$('sens').onchange=e=>{$('gap').value=e.target.value;$('gv').textContent=e.target.value};
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
  return segs.map(([a,b])=>[Math.max(0,a*hop/16000-0.10),Math.min(dur,b*hop/16000+0.10)]).filter(s=>s[1]-s[0]>0.15)}
function splitLong(segs){const out=[];for(const [a,b] of segs){let s=a;for(const w of words){if(w.s>=s+3.5&&w.s<b-1){out.push([s,w.s-0.02]);s=w.s-0.02}}out.push([s,b])}return out}
function drawCaption(ctx,t,W,H){
  const n=Math.max(1,preset.words_per_line||2);let g=-1;
  for(let i=0;i<words.length;i+=n){const nx=words[i+n]?words[i+n].s:words[Math.min(i+n-1,words.length-1)].e+0.25;if(t>=words[i].s&&t<nx){g=i;break}}
  if(g<0)return; const grp=words.slice(g,g+n); let cur=0;grp.forEach((w,k)=>{if(t>=w.s)cur=k});
  let size=Math.round(W*0.115);ctx.direction='rtl';ctx.textBaseline='middle';ctx.textAlign='left';
  let gapx,ws,total;for(let k=0;k<4;k++){ctx.font=`900 ${size}px "${preset.font}"`;gapx=size*0.3;ws=grp.map(w=>ctx.measureText(w.t).width);total=ws.reduce((a,b)=>a+b,0)+gapx*(grp.length-1);if(total<=W*0.70)break;size=Math.floor(size*W*0.70/total)}
  const y={low:H*0.68,center_low:H*0.60,center:H*0.5}[preset.pos||'low'];
  let x=(W+total)/2; 
  if(preset.bg){ctx.fillStyle=preset.bg;const pad=size*0.35;ctx.beginPath();ctx.roundRect((W-total)/2-pad,y-size*0.75,total+2*pad,size*1.5,pad);ctx.fill()}
  grp.forEach((w,k)=>{x-=ws[k];const col=(k===cur&&preset.highlight)?preset.highlight:preset.fill;
    if(preset.stroke&&!preset.bg){ctx.lineWidth=(preset.stroke_w||6)*W/1080*1.4;ctx.strokeStyle=preset.stroke;ctx.lineJoin='round';ctx.strokeText(w.t,x,y)}
    ctx.fillStyle=col;ctx.fillText(w.t,x,y);x-=gapx})}

// ---- Text Stretch (kashida) ----
const NOCONN=new Set('اأإآدذرزوؤءةى');
const KW={س:5,ش:5,ب:3,ت:3,ث:3,ن:3,ي:3,ئ:2,ف:3,ق:3,ك:4,ل:2,م:2,ع:3,غ:3,ح:4,ج:4,خ:4,ص:4,ض:4,ط:3,ظ:3,ه:1};
const isAr=c=>/[\u0621-\u064a]/.test(c);
function stretchWord(w,n){
  if(n<=0)return w; const cl=[];for(const ch of w){if(/[\u064b-\u0652\u0670]/.test(ch)&&cl.length)cl[cl.length-1]+=ch;else cl.push(ch)}
  const cand=[];cl.forEach((c,i)=>{const b=c[0];if(i<cl.length-1&&isAr(b)&&!NOCONN.has(b)&&isAr(cl[i+1][0])&&!(i===0&&cl.length<3))cand.push([i,KW[b]||1])});
  if(!cand.length)return w; cand.sort((a,b)=>b[1]-a[1]||a[0]-b[0]); const add={};let k=0;
  while(k<n){const c=cand[k%cand.length];add[c[0]]=(add[c[0]]||0)+1;k++;if(k>=6)break}
  return cl.map((c,i)=>c+'\u0640'.repeat(add[i]||0)).join('')}
function stretchLine(line,amt){const n=Math.round(Math.max(0,amt)*5);return line.split(/\s+/).map(w=>w.length>=3?stretchWord(w,n):w).join(' ')}
const spring=x=>x>=1?1:1-Math.cos(x*2.6*Math.PI)*Math.exp(-3.2*x);
const easeOut=x=>1-Math.pow(1-Math.min(1,x),3);
function drawTitle(ctx,t,W,H){
  const txt=($('ttl')||{}).value; if(!txt||!txt.trim())return; const D=2.8; if(t<0||t>D)return;
  const anim=$('tan').value, lines=txt.trim().split('\n').slice(0,3);
  const e=Math.min(1,t/0.6), ex=Math.max(0,(t-(D-0.35))/0.35);
  const p=preset||{}; let size=Math.round(W*0.13); ctx.direction='rtl';ctx.textBaseline='middle';ctx.textAlign='center';
  for(let k=0;k<4;k++){ctx.font=`900 ${size}px "${p.font||'Cairo'}"`;const mw=Math.max(...lines.map(l=>ctx.measureText(stretchLine(l,1)).width));if(mw<=W*0.82)break;size=Math.floor(size*W*0.82/mw)}
  let alpha=Math.min(1,e*2.2)*(1-ex),sc=1+0.08*ex,tx=0,ty=0,amt=spring(Math.min(1,t/1.0)),filt="none",vis=1e9;
  if(anim==='pop')sc*=0.55+0.45*spring(e); if(anim==='up')ty=(1-easeOut(e))*H*0.07; if(anim==='right')tx=(1-easeOut(e))*W*0.55;
  if(anim==='blur')filt=`blur(${((1-e)*18).toFixed(1)}px)`; if(anim==='type'){amt=easeOut(Math.min(1,t/0.9));vis=Math.ceil(Math.min(1,t/0.9)*lines.join(' ').split(/\s+/).length)}
  ctx.save();ctx.globalAlpha=alpha;ctx.filter=filt;ctx.translate(W/2+tx,H*0.30+ty);ctx.scale(sc,sc);
  let seen=0; lines.forEach((l,i)=>{const ws=l.split(/\s+/);const shown=ws.filter(()=>++seen<=vis);if(!shown.length)return;const str=stretchLine(shown.join(' '),amt),y=i*size*1.3-(lines.length-1)*size*0.65;
    ctx.lineJoin='round';ctx.lineWidth=size*0.14;ctx.strokeStyle=p.stroke||'#0B1F14';ctx.strokeText(str,0,y);ctx.fillStyle=p.highlight||'#FFD400';ctx.fillText(str,0,y)});
  ctx.restore()}
window.__titleFrame=t=>{const c=$('cv'),x=c.getContext('2d');x.fillStyle='#0B3D1E';x.fillRect(0,0,c.width,c.height);drawTitle(x,t,c.width,c.height);return c.toDataURL('image/png')};
$('tpv').onclick=()=>{const c=$('pv'),x=c.getContext('2d');const t0=performance.now();const f=()=>{const t=((performance.now()-t0)/1000)%3.4;const g=x.createLinearGradient(0,0,c.width,c.height);g.addColorStop(0,'#0B3D1E');g.addColorStop(1,'#12602f');x.fillStyle=g;x.fillRect(0,0,c.width,c.height);drawTitle(x,t,c.width,c.height);if(performance.now()-t0<10200)requestAnimationFrame(f)};f()};
$('rn').onclick=async()=>{ $('rn').disabled=true; $('m3').textContent='بصدّر الفيديو (بياخد نفس مدة الفيديو تقريبا)...';
  const cv=$('cv'),ctx=cv.getContext('2d'),W=cv.width,H=cv.height; const el=$('src'); el.muted=false;
  let segs=$('cut').checked?segmentsFromAudio(+$('gap').value):[[0,dur]]; if(!segs.length)segs=[[0,dur]]; if($('zoom').checked)segs=splitLong(segs);
  const ac=new AudioContext(); const msrc=ac.createMediaElementSource(el); const dest=ac.createMediaStreamDestination(); const gn=ac.createGain(); msrc.connect(gn); gn.connect(dest);
  const stream=new MediaStream([...cv.captureStream(30).getVideoTracks(),...dest.stream.getAudioTracks()]);
  const mime=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4;codecs=avc1','video/mp4','video/webm;codecs=vp9,opus','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));
  const rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:8e6}); const chunks=[];rec.ondataavailable=e=>chunks.push(e.data);
  const done=new Promise(r=>rec.onstop=r); let si=0,fading=false; el.currentTime=segs[0][0]; await new Promise(r=>{el.onseeked=r}); await ac.resume(); rec.start(); await el.play();
  const total=segs.reduce((a,s)=>a+s[1]-s[0],0); let outT=0;
  const tick=()=>{const t=el.currentTime;
    if(t>=segs[si][1]-0.035&&!fading){fading=true;const n=ac.currentTime;gn.gain.cancelScheduledValues(n);gn.gain.setValueAtTime(1,n);gn.gain.linearRampToValueAtTime(0,n+0.02)}
    if(t>=segs[si][1]-0.012){outT+=segs[si][1]-segs[si][0];si++;if(si>=segs.length){el.pause();rec.stop();return} el.currentTime=segs[si][0];fading=false;const n=ac.currentTime;gn.gain.cancelScheduledValues(n);gn.gain.setValueAtTime(0,n);gn.gain.linearRampToValueAtTime(1,n+0.02)}
    const z=(si%2===1&&$('zoom').checked)?1.12:1;ctx.fillStyle='#0B3D1E';ctx.fillRect(0,0,W,H);
    if(isVideo&&el.videoWidth){const s=Math.max(W/el.videoWidth,H/el.videoHeight)*z;const dw=el.videoWidth*s,dh=el.videoHeight*s;ctx.drawImage(el,(W-dw)/2,(H-dh)/2,dw,dh)}
    else{const gr=ctx.createLinearGradient(0,0,W,H);gr.addColorStop(0,'#0B3D1E');gr.addColorStop(1,'#00C853');ctx.fillStyle=gr;ctx.fillRect(0,0,W,H)}
    drawCaption(ctx,t,W,H);drawTitle(ctx,outT+t-segs[si][0],W,H);$('m3').textContent=`تصدير ${Math.round((outT+t-segs[si][0])/total*100)}%`;requestAnimationFrame(tick)};
  requestAnimationFrame(tick); await done; el.muted=true;
  let blob=new Blob(chunks,{type:mime.split(';')[0]}); let note='';
  if(mime.startsWith('video/mp4')&&($('loud').checked||!/mp4a/.test(mime))){ try{$('m3').textContent='بحوّل الصوت لـ AAC عشان واتساب وإنستا...';blob=await toAac(blob);note=' | AAC ✓'+($('loud').checked?' | -14 LUFS':'')}catch(err){note=' | AAC فشل: '+err} }
const u=URL.createObjectURL(blob);$('out').src=u;$('dl').href=u;$('dl').download='local-cut.'+(mime.includes('mp4')?'mp4':'webm');
  $('res').style.display='block';$('m3').textContent='خلص';$('stat').textContent=`من ${dur.toFixed(1)}ث إلى ${total.toFixed(1)}ث، ${segs.length} مقطع، ${mime}${note}`;$('rn').disabled=false;window.__done={bytes:blob.size,mime,segs:segs.length,total,note};};

async function toAac(blob){
  const {FFmpeg}=await import('./index.js'); const ff=new FFmpeg();
  try{ const cdn='https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/';
   const bu=async(u,t)=>URL.createObjectURL(new Blob([await (await fetch(u)).arrayBuffer()],{type:t}));
   await ff.load({coreURL:await bu(cdn+'ffmpeg-core.js','text/javascript'),wasmURL:await bu(cdn+'ffmpeg-core.wasm','application/wasm')});
   await ff.writeFile('in.mp4',new Uint8Array(await blob.arrayBuffer()));
   const code=await ff.exec(['-hide_banner','-v','error','-i','in.mp4','-map','0:v:0','-map','0:a:0','-c:v','copy',...($('loud').checked?['-af','loudnorm=I=-14:TP=-1.5:LRA=11']:[]),'-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart','out.mp4'],120000);
   if(code!==0)throw new Error('ffmpeg code '+code);
   const d=await ff.readFile('out.mp4'); return new Blob([d],{type:'video/mp4'});
  } finally { ff.terminate(); }
}
