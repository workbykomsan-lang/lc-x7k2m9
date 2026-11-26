const $=x=>document.getElementById(x);
let autoStyle=true,file,url,samples,dur=0,words=[],preset=null,presets=[],isVideo=true;
const FONTS={Cairo:'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/cairo/Cairo%5Bslnt%2Cwght%5D.ttf','Tajawal-ExtraBold':'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/tajawal/Tajawal-ExtraBold.ttf','Almarai-ExtraBold':'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/almarai/Almarai-ExtraBold.ttf',Changa:'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/changa/Changa%5Bwght%5D.ttf','IBMPlexSansArabic-Bold':'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/ibmplexsansarabic/IBMPlexSansArabic-Bold.ttf',ElMessiri:'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/elmessiri/ElMessiri%5Bwght%5D.ttf',Lemonada:'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/lemonada/Lemonada%5Bwght%5D.ttf',ReemKufi:'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/reemkufi/ReemKufi%5Bwght%5D.ttf'};
const worker=new Worker('asr-worker.js',{type:'module'});
let wres=null; worker.onmessage=({data:d})=>{ if(d.type==='progress') $('m2').textContent=d.msg+(d.pct?` (${Math.round(d.pct*100)}%)`:''); if(d.type==='ready'&&wres.ready)wres.ready(); if(d.type==='result')wres.result(d.words); if(d.type==='error'){$('m2').textContent='مشكلة: '+d.error;wres.fail&&wres.fail(d.error)} };
const loadFonts=async()=>{for(const [k,v] of Object.entries(FONTS)){const f=new FontFace(k,`url(${v})`,{weight:'100 1000'});await f.load();document.fonts.add(f)}};
(async()=>{presets=await (await fetch('presets.json')).json();preset=presets[0];await loadFonts();
 const c=$('presets');const ac0=document.createElement('div');ac0.className='p on';ac0.textContent='تلقائي ✨ حسب الموضوع';ac0.style.background='#1d5a35';ac0.onclick=()=>{autoStyle=true;[...c.children].forEach(x=>x.classList.remove('on'));ac0.classList.add('on')};c.appendChild(ac0);
 presets.forEach(p=>{const d=document.createElement('div');d.className='p';d.textContent=p.name;d.style.background=p.bg||'#0B1F14';d.style.color=p.fill==='#111111'?'#111':(p.bg?p.fill:(p.highlight||p.fill));d.style.fontFamily=p.font;d.onclick=()=>{preset=p;autoStyle=false;[...c.children].forEach(x=>x.classList.remove('on'));d.classList.add('on')};c.appendChild(d)})})();
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
  const y=H*0.71;
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

// ---- SFX library (synthesized in the browser, no files) ----
const SR=44100;
const CATS=[['whoosh','ووش',12],['pop','بوب',10],['ding','دينج',10],['hit','ضربة',10],['riser','رايزر',8],['click','نقرة',6]];
const LIB=[];CATS.forEach(([k,ar,n])=>{for(let i=0;i<n;i++)LIB.push({id:k+(i+1),cat:k,ar:`${ar} ${i+1}`,en:`${k[0].toUpperCase()+k.slice(1)} ${i+1}`,i,n})});
const sfxCache={};
async function synth(it){ if(sfxCache[it.id])return sfxCache[it.id]; const f=it.i/Math.max(1,it.n-1);
  const dur={whoosh:0.3+0.5*f,pop:0.18,ding:0.9,hit:0.45,riser:0.8+0.8*f,click:0.06}[it.cat];
  const oc=new OfflineAudioContext(1,Math.ceil(SR*dur),SR); const g=oc.createGain(); g.connect(oc.destination);
  const noise=()=>{const b=oc.createBuffer(1,Math.ceil(SR*dur),SR),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;const s=oc.createBufferSource();s.buffer=b;return s};
  const env=(a,peak,d)=>{g.gain.setValueAtTime(0.0001,0);g.gain.exponentialRampToValueAtTime(peak,a);g.gain.exponentialRampToValueAtTime(0.0001,d)};
  if(it.cat==='whoosh'){const n=noise(),bp=oc.createBiquadFilter();bp.type='bandpass';bp.Q.value=1.2;const up=it.i%2===0;bp.frequency.setValueAtTime(up?300:3000+f*2000,0);bp.frequency.exponentialRampToValueAtTime(up?3500+f*3000:300,dur*0.9);n.connect(bp);bp.connect(g);env(dur*0.4,1,dur*0.98);n.start()}
  else if(it.cat==='pop'){const o=oc.createOscillator();o.frequency.setValueAtTime(500+f*900,0);o.frequency.exponentialRampToValueAtTime(180+f*200,0.12);o.connect(g);env(0.008,1,0.17);o.start()}
  else if(it.cat==='ding'){const base=520+f*900;[1,2.76,5.4].forEach((m,j)=>{const o=oc.createOscillator(),gg=oc.createGain();o.frequency.value=base*m;gg.gain.value=[1,0.4,0.15][j];o.connect(gg);gg.connect(g);o.start()});env(0.005,1,0.88)}
  else if(it.cat==='hit'){const o=oc.createOscillator();o.frequency.setValueAtTime(140+f*60,0);o.frequency.exponentialRampToValueAtTime(40,0.3);o.connect(g);const n=noise(),lp=oc.createBiquadFilter();lp.type='lowpass';lp.frequency.value=600+f*3000;n.connect(lp);lp.connect(g);env(0.004,1,0.42);o.start();n.start()}
  else if(it.cat==='riser'){const n=noise(),bp=oc.createBiquadFilter();bp.type='bandpass';bp.Q.value=2;bp.frequency.setValueAtTime(200,0);bp.frequency.exponentialRampToValueAtTime(5000+f*3000,dur);n.connect(bp);bp.connect(g);g.gain.setValueAtTime(0.02,0);g.gain.exponentialRampToValueAtTime(1,dur*0.97);g.gain.linearRampToValueAtTime(0,dur);n.start()}
  else {const n=noise(),hp=oc.createBiquadFilter();hp.type='highpass';hp.frequency.value=1500+f*3000;n.connect(hp);hp.connect(g);env(0.002,1,0.05);n.start()}
  const b=await oc.startRendering(); const d=b.getChannelData(0);let pk=0,sq=0;for(const v of d){pk=Math.max(pk,Math.abs(v));sq+=v*v}
  for(let i=0;i<d.length;i++)d[i]/=pk||1; const r={buf:b,rms:Math.sqrt(sq/d.length)/(pk||1)}; sfxCache[it.id]=r; return r}
function renderLib(q){const L=$('lib');L.innerHTML='';const nq=(q||'').trim().toLowerCase();LIB.filter(x=>!nq||x.ar.includes(nq)||x.en.toLowerCase().includes(nq)||x.cat.includes(nq)).forEach(it=>{const b=document.createElement('button');b.className='sec';b.style.cssText='width:auto;font-size:13px;padding:6px 10px;margin:2px';b.textContent='▶ '+it.ar+' · '+it.en;b.onclick=async()=>{const r=await synth(it);const c=new AudioContext();const s=c.createBufferSource();s.buffer=r.buf;s.connect(c.destination);s.start()};L.appendChild(b)})}
renderLib('');$('lq').oninput=e=>renderLib(e.target.value);
window.__lib=()=>LIB.length;
function srcToOut(ts,segs){let acc=0;for(const [a,b] of segs){if(ts>=a&&ts<=b)return acc+ts-a;acc+=b-a}return -1}
function localRms(ts){const a=Math.max(0,Math.floor((ts-0.15)*16000)),b=Math.min(samples.length,Math.floor((ts+0.15)*16000));let q=0;for(let i=a;i<b;i++)q+=samples[i]*samples[i];return Math.sqrt(q/Math.max(1,b-a))}
const KEYS=['انتبه','مهم','ركز','سر','مفاجأة','اوعى','نصيحة','اهم'];
async function planSfx(segs){ if(!$('sfxon').checked)return []; const ev=[]; const cutCat=$('sfxcut').value; const duck=+$('duck').value;
  const mk=async(cat,idx)=>{const it=LIB.find(x=>x.id===cat+idx);return it?{it,...(await synth(it))}:null};
  let acc=0;const tl=[];
  for(let i=0;i<segs.length;i++){ if(i>0&&cutCat!=='none'){const m=await mk(cutCat,1+(i%3));if(m)tl.push({t:acc-0.05,m,src:segs[i][0]})} acc+=segs[i][1]-segs[i][0]}

  {const sents=[];let cur=[];words.forEach((w,i)=>{if(cur.length&&w.s-words[i-1].s>0.5){sents.push(cur);cur=[]}cur.push(w)});if(cur.length)sents.push(cur);
   const avg=words.length?words.reduce((a,w)=>a+localRms(w.s),0)/words.length:1;let lastS=-9;
   const sc=sents.map(g=>{let v=0;const L=KEYS.map(norm);if(g.some(w=>/[0-9\u0660-\u0669]/.test(w.t)))v+=2;if(g.some(w=>L.some(k=>norm(w.t).includes(k))))v+=2;const r=g.reduce((a,w)=>a+localRms(w.s),0)/g.length;if(r>avg*1.25)v+=1;if(g.length>=4)v+=0.5;return {g,v}});
   const minN=Math.max(1,Math.ceil(segs.reduce((q,x)=>q+x[1]-x[0],0)/6));const acc=[];
   for(const {g,v} of sc.slice().sort((x,y)=>y.v-x.v)){const o=srcToOut(g[0].s,segs);if(o<0||acc.some(t=>Math.abs(t-o)<3))continue;if(v<2&&acc.length>=minN)continue;const m=await mk('whoosh',1+(Math.round(v*2)%5));if(m){tl.push({t:Math.max(0,o-0.12),m,src:g[0].s});acc.push(o)}}}
  if($('ttl').value.trim()){const m=await mk('hit',3);tl.push({t:0.05,m,src:segs[0][0]})}
  let last=-9;for(const w of words){const o=srcToOut(w.s,segs);if(o<0||o-last<2)continue;const num=/[0-9\u0660-\u0669]/.test(w.t),key=KEYS.some(k=>norm(w.t).includes(norm(k)));if(num||key){const m=await mk(num?'ding':'hit',num?2:5);if(m){tl.push({t:o,m,src:w.s});last=o}}}
  return tl.sort((a,b)=>a.t-b.t).map(e=>({t:Math.max(0,e.t),buf:e.m.buf,gain:Math.min(1.5,Math.max(0.03,localRms(e.src)*Math.pow(10,-duck/20)/e.m.rms))}))}

// ---- filler (اااا / hesitation) removal ----
const FILL=new Set(['ا','اا','ااا','اه','اهه','ام','امم','اممم','مم','ممم','ايي','ايييي','اوو','اوووو','هه']);
function repTakes(ws){const out=[];const K=ws.map(w=>norm(w.t).replace(/[^\u0621-\u064a]/g,''));const n=ws.length;let i=0;
  while(i<n){let best=null;for(let L=Math.min(8,Math.floor((n-i)/2));L>=1&&!best;L--){const A=K.slice(i,i+L).join('');if(A.length<(L==1?3:6))continue;
    for(let j=i+L;j<=Math.min(n-L,i+L+10);j++){if(ws[j].s-ws[i+L-1].s>7)break;const B=K.slice(j,j+L).join('');if(!B)continue;let d=lev(A,B)/Math.max(A.length,B.length);for(let k=0;k<L;k++){const x=K[i+k],y=K[j+k];if(lev(x,y)>(Math.min(x.length,y.length)>=5?1:0))d=1}if(d<=(L==1?0.0:0.15)&&K[j]==K[i]&&(L>1||ws[j].s-ws[i].s<1.6)){best=[L,j];break}}}
  if(best){const [L,j]=best;out.push([ws[i].s,ws[j].s-0.03,'take']);i=j}else i++}
  return out}
function fillerIntervals(){const out=[];if(!words.length||!samples)return out;const hop=320,thr=0.012,n=Math.floor(samples.length/hop);
  if($('rep')&&$('rep').checked)out.push(...repTakes(words));
  for(const w of words){const k=norm(w.t).replace(/[^\u0621-\u064a]/g,'');if(FILL.has(k))out.push([w.s,w.e,'word'])}
  let st=null;const cov=t=>words.some(w=>t>=w.s-0.15&&t<=Math.max(w.e,w.s+0.45)+0.1);
  for(let i=0;i<=n;i++){let on=false;if(i<n){let e=0;for(let j=0;j<hop;j++){const v=samples[i*hop+j];e+=v*v}on=Math.sqrt(e/hop)>thr&&!cov(i*hop/16000)}
    if(on){if(st===null)st=i}else if(st!==null){const a=st*hop/16000,b=i*hop/16000;if(b-a>=0.35)out.push([a,b,'sound']);st=null}}
  return out}
function subtractIv(segs,iv){let r=segs.map(x=>[x[0],x[1]]);for(const [a0,b0] of iv){const a=a0-0.02,b=b0+0.02;const nr=[];for(const [s,e] of r){if(b<=s||a>=e){nr.push([s,e]);continue}if(a>s)nr.push([s,a]);if(b<e)nr.push([b,e])}r=nr}return r.filter(x=>x[1]-x[0]>0.15)}
window.__words=()=>words.map(w=>[w.t,w.s,w.e]);window.__rep=()=>repTakes(words).map(x=>[+x[0].toFixed(2),+x[1].toFixed(2)]);window.__fillers=()=>fillerIntervals().map(x=>[+x[0].toFixed(2),+x[1].toFixed(2),x[2]]);

const TOPICS={money:['فلوس','جنيه','دولار','ربح','خصم','عرض','سعر','اشتري','مبيعات','تجاره','شغل','بيزنس','استثمار','مشروع','دخل'],tech:['تطبيق','موبايل','ذكاء','اصطناعي','برنامج','تقنيه','موقع','فيديو','مونتاج','ايفون','اندرويد','كمبيوتر','ai'],fun:['هههه','ضحك','طريف','مقلب','نكته','فرحه','ممتع','حلو','جامد'],serious:['صحه','دكتور','علاج','قران','دين','قانون','تعليم','درس','شرح','معلومه','مهم','خطر','تحذير'],story:['حكايه','قصه','زمان','فاكر','يوم','حصل','مره']};
function pickPreset(){const by=n=>presets.find(p=>p.name===n)||presets[0];const sc={};const ws=words.map(w=>norm(w.t).toLowerCase());
  for(const [k,list] of Object.entries(TOPICS)){const L=list.map(x=>norm(x).toLowerCase());sc[k]=ws.filter(w=>L.some(x=>w.includes(x))).length}
  const rate=words.length/Math.max(1,dur),num=words.filter(w=>/[0-9\u0660-\u0669]/.test(w.t)).length;
  let best=Object.entries(sc).sort((a,b)=>b[1]-a[1])[0];let name;
  if(best&&best[1]>0){name={money:rate>2.8?'One Word Punch':'Yellow Bar',tech:'Local Hub Pop',fun:'Fun',serious:'Clean',story:'Kufi Bold'}[best[0]]}
  else name=rate>3.2?'Karaoke':(num>1?'Yellow Bar':'Green Box');
  window.__autoStyle={name,scores:sc,rate:+rate.toFixed(2)};return by(name)}
$('rn').onclick=async()=>{ $('rn').disabled=true; $('m3').textContent='بصدّر الفيديو (بياخد نفس مدة الفيديو تقريبا)...';
  const cv=$('cv'),ctx=cv.getContext('2d'),W=cv.width,H=cv.height; const el=$('src'); el.muted=false;
  if(autoStyle&&words.length)preset=pickPreset();
  let segs=$('cut').checked?segmentsFromAudio(+$('gap').value):[[0,dur]]; if(!segs.length)segs=[[0,dur]]; let fills=[];if($('fil').checked){fills=fillerIntervals();if(fills.length)segs=subtractIv(segs,fills);if(!segs.length)segs=[[0,dur]]} window.__nfill=fills.length; if($('zoom').checked)segs=splitLong(segs);
  const sfxPlan=await planSfx(segs); window.__sfx=sfxPlan.map(e=>[+e.t.toFixed(2),+e.gain.toFixed(3)]); let sx=0; const ac=new AudioContext(); const msrc=ac.createMediaElementSource(el); const dest=ac.createMediaStreamDestination(); const gn=ac.createGain(); msrc.connect(gn); gn.connect(dest); const sfxOut=ac.createGain(); sfxOut.connect(dest);
  const stream=new MediaStream([...cv.captureStream(30).getVideoTracks(),...dest.stream.getAudioTracks()]);
  const mime=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4;codecs=avc1','video/mp4','video/webm;codecs=vp9,opus','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));
  const rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:8e6}); const chunks=[];rec.ondataavailable=e=>chunks.push(e.data);
  const done=new Promise(r=>rec.onstop=r); let si=0,fading=false; el.currentTime=segs[0][0]; await new Promise(r=>{el.onseeked=r}); await ac.resume(); rec.start(); await el.play();
  const total=segs.reduce((a,s)=>a+s[1]-s[0],0); let outT=0;
  const tick=()=>{const t=el.currentTime;
    {const ot=outT+t-segs[si][0];while(sx<sfxPlan.length&&sfxPlan[sx].t<=ot){const e=sfxPlan[sx++];const b=ac.createBufferSource();b.buffer=ac.createBuffer(1,e.buf.length,e.buf.sampleRate);b.buffer.copyToChannel(e.buf.getChannelData(0),0);const g2=ac.createGain();g2.gain.value=e.gain;b.connect(g2);g2.connect(sfxOut);b.start()}}
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
