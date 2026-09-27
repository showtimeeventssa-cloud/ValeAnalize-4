
/* V28: ACCURACY ENGINE rebuild from V27. Branding/assets preserved; analysis engine upgraded; PRST binary structure preserved; no guessed model-ID writes. uses validated 552-byte container, CRC-8/0x07, model records, bypass, chain order, 80 float slots and footswitch records.. Logo-safe assets, standard guitar presets, reliable single-run import/analysis, and GP-50 workflow fixes. Main artwork and all PWA icons are generated with generous transparent/dark safe margins; no crop/cover is used. */
const state={mode:'full',file:null,analysis:null,midi:null,guitar:null,targetFamily:'electric',highAccuracy:true,guitarFocus:true,autoSections:true,analysing:false};
const fileInput=document.getElementById('file'),fileName=document.getElementById('fileName'),canvas=document.getElementById('wave'),ctx=canvas.getContext('2d');

function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===id));
  document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.screen===id));
  const scroller=document.querySelector('main');
  if(scroller) scroller.scrollTo({top:0,left:0,behavior:'auto'});
  if(id==='midi') refreshMidi();
}
function setMode(btn,mode){
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));btn.classList.add('active');state.mode=mode;
  document.getElementById('analyseMode').textContent='Mode: '+({full:'Full Song',guitar:'Guitar Track / Stem Priority',section:'Custom Section'}[mode]);
}
function toggleSwitch(el,key){el.classList.toggle('on'); if(key) state[key]=el.classList.contains('on');}
function drawWave(seed=2){
  const dpr=Math.max(1,devicePixelRatio||1),w=canvas.clientWidth||320,h=canvas.clientHeight||110;
  canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  ctx.strokeStyle='#10c7ff';ctx.lineWidth=2;ctx.beginPath();
  for(let x=0;x<w;x++){let y=h/2+Math.sin(x*.12+seed)*h*.19+Math.sin(x*.43+seed*2)*h*.08+(Math.random()-.5)*h*.11;x?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke();
}
drawWave();window.addEventListener('resize',()=>drawWave());
function updateGuitarStatus(){const g=getGuitarProfile();const st=document.getElementById('guitarStatus');if(st&&g.model)st.textContent='Selected: '+g.model+' • '+g.pickups+' • '+g.position+' • '+g.tuning;const sg=document.getElementById('settingsGuitar');if(sg&&g.model)sg.textContent=g.model}
try{applyGuitarPreset('squier-debut');updateGuitarStatus();loadGuitarProfile();setGuitarTypeChoice(getGuitarProfile().type||'electric');if(!localStorage.getItem('valeanalize-guitar')){applyGuitarPreset('squier-debut');updateGuitarStatus();setGuitarTypeChoice('electric')}}catch(e){}
fileInput.addEventListener('change',async e=>{
  const f=e.target.files?.[0];
  if(!f)return;
  state.file=f;
  state.analysis=null;
  state.guitar=getGuitarProfile();
  fileName.textContent=f.name;
  drawWave(2);
  document.getElementById('result').classList.add('hidden');
  document.getElementById('calResult')?.classList.add('hidden');
  document.getElementById('progressText').textContent='Imported '+f.name+' — '+(state.targetFamily==='acoustic'?'acoustic/piezo':'electric')+' target selected. '+(state.mode==='guitar'?'Guitar-stem analysis enabled. ':'')+'Starting analysis…';
  showScreen('analyse');
  await new Promise(r=>setTimeout(r,80));
  await runAnalysis();
});

function mean(a){return a.length?a.reduce((x,y)=>x+y,0)/a.length:0}
function median(a){if(!a.length)return 0;const b=Array.from(a).sort((x,y)=>x-y),m=Math.floor(b.length/2);return b.length%2?b[m]:(b[m-1]+b[m])/2}
function clamp(x,a,b){return Math.max(a,Math.min(b,x))}
function db(v){return 20*Math.log10(Math.max(v,1e-9))}
function fft(re,im){const n=re.length;for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]]}}for(let len=2;len<=n;len<<=1){const ang=-2*Math.PI/len,wr0=Math.cos(ang),wi0=Math.sin(ang);for(let i=0;i<n;i+=len){let wr=1,wi=0;for(let j=0;j<len/2;j++){const uR=re[i+j],uI=im[i+j],k=i+j+len/2,vR=re[k]*wr-im[k]*wi,vI=re[k]*wi+im[k]*wr;re[i+j]=uR+vR;im[i+j]=uI+vI;re[k]=uR-vR;im[k]=uI-vI;const nr=wr*wr0-wi*wi,ni=wr*wi+wi*wr0;wr=nr;wi=ni}}}}
function autocorrPitch(frame,sr){const n=frame.length;let rms=0;for(let i=0;i<n;i++)rms+=frame[i]*frame[i];rms=Math.sqrt(rms/n);if(rms<.008)return 0;const minLag=Math.floor(sr/1100),maxLag=Math.min(Math.floor(sr/65),n-2);let bestLag=minLag,best=-1;for(let lag=minLag;lag<=maxLag;lag++){let s=0,e1=0,e2=0;for(let i=0;i<n-lag;i+=2){const a=frame[i],b=frame[i+lag];s+=a*b;e1+=a*a;e2+=b*b}const c=s/Math.sqrt((e1*e2)||1);if(c>best){best=c;bestLag=lag}}return best>.5?sr/bestLag:0}
function setGuitarTypeChoice(type){state.targetFamily=type==='electric'?'electric':'acoustic';const el=document.getElementById('gType');if(el)el.value=type==='electric'?'electric':'acoustic-piezo';const e=document.getElementById('electricChoice'),a=document.getElementById('acousticChoice');if(e)e.classList.toggle('active',type==='electric');if(a)a.classList.toggle('active',type!=='electric');if(type!=='electric'){const p=document.getElementById('gPickups');if(p)p.value='piezo';const o=document.getElementById('gOutput');if(o)o.value='active'}else{const p=document.getElementById('gPickups');if(p&&p.value==='piezo')p.value='sss'}const st=document.getElementById('guitarStatus');if(st)st.textContent=type==='electric'?'ELECTRIC TARGET: analyse/build an electric-guitar GP-50 patch. A guitar stem gets priority over the full mix.':'ACOUSTIC TARGET: analyse/build an acoustic/piezo GP-50 patch. A guitar stem gets priority over the full mix.';}function getGuitarProfile(){const preset=document.getElementById('gPreset')?.value||'';return {preset,targetFamily:state.targetFamily||(document.getElementById('gType')?.value==='electric'?'electric':'acoustic'),type:document.getElementById('gType')?.value||'electric',model:document.getElementById('gModel')?.value?.trim()||'Unspecified',pickups:document.getElementById('gPickups')?.value||'sss',position:document.getElementById('gPosition')?.value||'bridge',tuning:document.getElementById('gTuning')?.value?.trim()||'E A D G B E',strings:document.getElementById('gStrings')?.value?.trim()||'10-46',scale:document.getElementById('gScale')?.value?.trim()||'',output:document.getElementById('gOutput')?.value||'passive'}}
function applyGuitarPreset(v){const presets={
  'squier-debut':{preset:'squier-debut',type:'electric',model:'Squier by Fender Debut (Stratocaster)',pickups:'sss',position:'bridge',tuning:'E A D G B E',strings:'10-46',scale:'25.5 in',output:'passive',note:'SSS passive electric starting profile.'},
  'ibanez-acoustic':{preset:'ibanez-acoustic',type:'acoustic-piezo',model:'Ibanez Acoustic',pickups:'piezo',position:'bridge',tuning:'E A D G B E',strings:'12-53',scale:'',output:'active',note:'Acoustic direct-input starting profile; verify the exact pickup/preamp on your Ibanez.'},
  'sigma-acoustic':{preset:'sigma-acoustic',type:'acoustic-piezo',model:'Sigma Acoustic',pickups:'piezo',position:'bridge',tuning:'E A D G B E',strings:'12-53',scale:'',output:'active',note:'Acoustic direct-input starting profile; verify the exact pickup/preamp on your Sigma.'},
  'ditson-acoustic':{preset:'ditson-acoustic',type:'acoustic-piezo',model:'Ditson Acoustic',pickups:'piezo',position:'bridge',tuning:'E A D G B E',strings:'12-53',scale:'',output:'active',note:'Acoustic direct-input starting profile; verify the exact pickup/preamp on your Ditson.'}
};const g=presets[v];if(!g)return;for(const [id,key] of [['gPreset','preset'],['gType','type'],['gModel','model'],['gPickups','pickups'],['gPosition','position'],['gTuning','tuning'],['gStrings','strings'],['gScale','scale'],['gOutput','output']]){const el=document.getElementById(id);if(el)el.value=g[key]||''}state.guitar=g;const st=document.getElementById('guitarStatus');if(st)st.textContent='Preset selected: '+g.model+' • '+g.note;updateGuitarStatus()} 


function saveGuitarProfile(){const g=getGuitarProfile();localStorage.setItem('valeanalize-guitar',JSON.stringify(g));document.getElementById('guitarStatus').textContent='Saved: '+g.model+' • '+g.pickups+' • '+g.position;state.guitar=g;updateGuitarStatus()}
function loadGuitarProfile(){try{const g=JSON.parse(localStorage.getItem('valeanalize-guitar')||'null');if(!g){document.getElementById('guitarStatus').textContent='No saved guitar profile.';return}for(const [id,key] of [['gPreset','preset'],['gType','type'],['gModel','model'],['gPickups','pickups'],['gPosition','position'],['gTuning','tuning'],['gStrings','strings'],['gScale','scale'],['gOutput','output']]){const el=document.getElementById(id);if(el&&g[key]!=null)el.value=g[key]}state.guitar=g;document.getElementById('guitarStatus').textContent='Loaded: '+g.model+' • '+g.pickups+' • '+g.position;updateGuitarStatus()}catch(e){document.getElementById('guitarStatus').textContent='Saved profile could not be loaded.'}}
function guitarAdjustment(g){let bright=0,body=0;if(g.pickups==='sss'||g.pickups==='single')bright+=.10;if(g.pickups==='hh')body+=.10;if(g.pickups==='active'){bright+=.08;body-=.04}if(g.pickups==='p90')body+=.06;if(g.position==='bridge')bright+=.08;if(g.position==='neck')body+=.10;if(g.output==='active')bright+=.04;if(g.output==='low')body-=.04;if(g.type!=='electric'){bright-=.02;body+=.05}return {bright,body}}
function percentile(a,p){if(!a.length)return 0;const b=Array.from(a).sort((x,y)=>x-y),i=(b.length-1)*p,lo=Math.floor(i),hi=Math.ceil(i);return lo===hi?b[lo]:b[lo]+(b[hi]-b[lo])*(i-lo)}
function trimmedMean(a,lo=.15,hi=.85){if(!a.length)return 0;const s=Array.from(a).sort((x,y)=>x-y),a0=Math.floor(s.length*lo),a1=Math.max(a0+1,Math.ceil(s.length*hi));return mean(s.slice(a0,a1))}
function weightedMean(items,key,weight){let sw=0,sv=0;for(const x of items){const w=Math.max(0,weight(x));sw+=w;sv+=(Number(x[key])||0)*w}return sw?sv/sw:trimmedMean(items.map(x=>x[key]||0))}
function estimateGuitarPitch(frame,sr){
  const n=frame.length, minF=70, maxF=Math.min(1400,sr/2-20), minLag=Math.max(2,Math.floor(sr/maxF)), maxLag=Math.min(n-2,Math.floor(sr/minF));
  let mean=0;for(let i=0;i<n;i++)mean+=frame[i];mean/=n;
  const x=new Float64Array(n);let energy=0;for(let i=0;i<n;i++){x[i]=frame[i]-mean;energy+=x[i]*x[i]}
  if(energy<1e-7)return {freq:0,confidence:0};
  const d=new Float64Array(maxLag+1);let run=0,bestLag=0,best=1;
  for(let lag=1;lag<=maxLag;lag++){
    let v=0;for(let i=0;i<n-lag;i+=2){const q=x[i]-x[i+lag];v+=q*q}run+=v;d[lag]=v*lag/Math.max(run,1e-12);
    if(lag>=minLag && d[lag]<0.18){let t=lag;while(t+1<=maxLag&&d[t+1]<d[t])t++;bestLag=t;best=d[t];break}
  }
  if(!bestLag){for(let lag=minLag;lag<=maxLag;lag++){if(d[lag]<best){best=d[lag];bestLag=lag}}}
  if(!bestLag)return {freq:0,confidence:0};
  const a=d[Math.max(minLag,bestLag-1)]??best,b=d[bestLag],c=d[Math.min(maxLag,bestLag+1)]??b;
  const den=(a-2*b+c);const shift=Math.abs(den)>1e-9?0.5*(a-c)/den:0;
  let f=sr/(bestLag+clamp(shift,-0.45,0.45));
  // Correct common octave errors by checking nearby doubled/halved candidates against autocorrelation.
  const candidates=[f,f/2,f*2].filter(v=>v>=minF&&v<=maxF);
  let chosen=f,bestScore=-1;
  for(const cf of candidates){const lag=Math.max(1,Math.round(sr/cf));let corr=0,e1=0,e2=0;for(let i=0;i<n-lag;i+=3){const u=x[i],v=x[i+lag];corr+=u*v;e1+=u*u;e2+=v*v}const score=corr/Math.sqrt(Math.max(e1*e2,1e-12));if(score>bestScore){bestScore=score;chosen=cf}}
  const confidence=clamp((bestScore-.35)/.55,0,1)*clamp((.22-best)/.22,0,1);
  return {freq:chosen,confidence};
}
function analyseMonoChannels(buffer,mode){
  const ch=buffer.numberOfChannels,n=buffer.length;
  if(ch===1)return {mono:buffer.getChannelData(0),channel:'mono',correlation:1};
  const L=buffer.getChannelData(0),R=buffer.getChannelData(1);let eL=0,eR=0,c=0,e=0;
  const stride=Math.max(1,Math.floor(n/120000));
  for(let i=0;i<n;i+=stride){const l=L[i],r=R[i];eL+=l*l;eR+=r*r;c+=l*r;e+=Math.sqrt(Math.max(l*l*r*r,0))}
  const corr=c/Math.sqrt(Math.max(eL*eR,1e-12));
  if(mode==='guitar'){
    // Never average an isolated stereo stem blindly: phase cancellation can destroy the guitar's harmonics.
    const scoreL=eL*(1+0.18*(eL>eR?1:0)),scoreR=eR*(1+0.18*(eR>eL?1:0));
    return scoreL>=scoreR?{mono:L,channel:'L',correlation:corr}:{mono:R,channel:'R',correlation:corr};
  }
  if(corr<0.12){
    return eL>=eR?{mono:L,channel:'L (phase-safe)',correlation:corr}:{mono:R,channel:'R (phase-safe)',correlation:corr};
  }
  const mono=new Float32Array(n);for(let i=0;i<n;i++)mono[i]=(L[i]+R[i])*0.5;
  return {mono,channel:'L+R',correlation:corr};
}
async function analyseAudioStemCore(buffer){
  const ch=buffer.numberOfChannels,sr=buffer.sampleRate,n=buffer.length;
  const L=buffer.getChannelData(0), R=ch>1?buffer.getChannelData(1):L;
  // A real guitar stem can be stereo-processed. Never collapse it to one side and
  // never blindly sum L/R: the two operations can lose real guitar harmonics.
  let eL=0,eR=0,c=0, stride=Math.max(1,Math.floor(n/120000));
  for(let i=0;i<n;i+=stride){const l=L[i],r=R[i];eL+=l*l;eR+=r*r;c+=l*r}
  const stereoCorrelation=c/Math.sqrt(Math.max(eL*eR,1e-12));
  const stereo=ch>1;
  const size=4096,hop=1024,maxFrames=state.highAccuracy?900:450;
  const total=Math.max(1,Math.floor((n-size)/hop)+1),step=Math.max(1,Math.floor(total/maxFrames));
  const frames=[];const reL=new Float64Array(size),imL=new Float64Array(size),reR=new Float64Array(size),imR=new Float64Array(size);
  let prevMag=null;
  for(let frame=0,used=0;frame+size<=n&&used<maxFrames;frame+=hop*step,used++){
    let sumL=0,sumR=0,peak=0,zL=0,zR=0,prevL=0,prevR=0;
    for(let i=0;i<size;i++){
      const l=L[frame+i],r=R[frame+i];
      const wl=l*(.5-.5*Math.cos(2*Math.PI*i/(size-1)));
      const wr=r*(.5-.5*Math.cos(2*Math.PI*i/(size-1)));
      reL[i]=wl;imL[i]=0;reR[i]=wr;imR[i]=0;
      sumL+=wl*wl;sumR+=wr*wr;peak=Math.max(peak,Math.abs(l),Math.abs(r));
      if(i&&((l>=0)!=(prevL>=0)))zL++;if(i&&((r>=0)!=(prevR>=0)))zR++;prevL=l;prevR=r;
    }
    const rms=Math.sqrt((sumL+sumR)/(stereo?2:1)/size);
    if(rms<0.0012)continue;
    fft(reL,imL); if(stereo)fft(reR,imR);
    let magSum=0,weighted=0,cum=0,roll=0,logSum=0,count=0,totalPow=0;
    const mags=new Float64Array(size/2+1);
    for(let k=1;k<=size/2;k++){
      const ml=Math.hypot(reL[k],imL[k]);
      const mr=stereo?Math.hypot(reR[k],imR[k]):0;
      // Power-sum magnitude: phase-safe and preserves stereo information.
      const p2=ml*ml+mr*mr;
      const p=Math.sqrt(p2/(stereo?2:1));
      mags[k]=p; totalPow+=p*p; magSum+=p; weighted+=(k*sr/size)*p;
      if(p>1e-10){logSum+=Math.log(p);count++}
    }
    const centroid=weighted/Math.max(magSum,1e-9);
    for(let k=1;k<=size/2;k++){cum+=mags[k];if(cum>=magSum*.85){roll=k*sr/size;break}}
    const flat=Math.exp(logSum/Math.max(count,1))/(magSum/Math.max(count,1));
    const gpL=estimateGuitarPitch(L.subarray(frame,frame+size),sr);
    const gpR=stereo?estimateGuitarPitch(R.subarray(frame,frame+size),sr):gpL;
    const gp=gpL.confidence>=gpR.confidence?gpL:gpR;
    let harmonicity=0,highHarm=0;
    if(gp.freq){
      for(let hh=1;hh<=12;hh++){
        const fk=gp.freq*hh;if(fk>sr/2)break;
        const center=Math.round(fk*size/sr),rad=Math.max(1,Math.round(center*.006));
        let pk=0;for(let k=Math.max(1,center-rad);k<=Math.min(size/2,center+rad);k++)pk=Math.max(pk,mags[k]);
        harmonicity+=pk;if(hh>=5)highHarm+=pk;
      }
      harmonicity/=Math.max(magSum,1e-9);highHarm/=Math.max(magSum,1e-9);
    }
    const bands=[0,0,0,0,0,0];
    for(let k=1;k<=size/2;k++){
      const hz=k*sr/size,p=mags[k]*mags[k];
      if(hz<90)bands[0]+=p;else if(hz<180)bands[1]+=p;else if(hz<400)bands[2]+=p;
      else if(hz<1000)bands[3]+=p;else if(hz<2500)bands[4]+=p;else if(hz<8000)bands[5]+=p;
    }
    const norm=Math.max(totalPow,1e-9);
    const low=(bands[0]+bands[1])/norm,lowMid=bands[2]/norm,mid=bands[3]/norm,highMid=bands[4]/norm,high=bands[5]/norm;
    let sx=0,sy=0,sxx=0,sxy=0,nn=0;
    for(let k=2;k<=size/2;k+=4){const hz=k*sr/size;if(hz<120||hz>10000)continue;const x=Math.log10(hz),yy=Math.log10(Math.max(mags[k],1e-9));sx+=x;sy+=yy;sxx+=x*x;sxy+=x*yy;nn++}
    const slope=nn>1?(nn*sxy-sx*sy)/Math.max(nn*sxx-sx*sx,1e-9):0;
    let flux=0;if(prevMag){let s=0,den=0;for(let k=2;k<=size/2;k+=2){s+=Math.max(0,mags[k]-prevMag[k]);den+=mags[k]}flux=s/Math.max(den,1e-9)}prevMag=mags;
    const crest=peak/Math.max(rms,1e-9),transient=clamp((crest-1.5)/4,0,1);
    const spectralCenterScore=1-Math.min(1,Math.abs(Math.log(Math.max(centroid,120)/650))/2.2);
    const guitarScore=clamp(.34*gp.confidence+.24*clamp(harmonicity/.20,0,1)+.16*spectralCenterScore+.10*clamp((mid+highMid)/.34,0,1)+.08*(1-Math.min(1,flux/.55))+.08*clamp(1-low/.55,0,1),0,1);
    frames.push({time:frame/sr,rms,crest,zcr:(zL+zR)/(stereo?2:1)/size,centroid,rolloff:roll,flatness:flat,pitch:gp.freq,pitchConfidence:gp.confidence,low,lowMid,mid,highMid,high,harmonicity,highHarmonics:highHarm,slope,transient,flux,guitarScore,section:Math.floor((frame/sr)/Math.max(n/sr/10,.001))});
    if(used%10===0){const pct=Math.round(12+(used/Math.max(1,Math.min(maxFrames,total)))*58);setProgress(Math.min(70,pct),'Analysing stereo guitar stem '+used+' of '+Math.min(maxFrames,total)+'…');await new Promise(r=>setTimeout(r,0))}
  }
  if(!frames.length)throw new Error('No usable guitar frames were found.');
  let selected=frames;
  if(state.autoSections&&frames.length>20){
    const bySec=new Map();for(const f of frames){if(!bySec.has(f.section))bySec.set(f.section,[]);bySec.get(f.section).push(f)}
    const ranked=[...bySec.entries()].map(([k,v])=>({k,score:mean(v.map(x=>x.guitarScore))})).sort((a,b)=>b.score-a.score);
    const keep=new Set(ranked.slice(0,Math.max(3,Math.ceil(ranked.length*.75))).map(x=>x.k));selected=frames.filter(f=>keep.has(f.section));
  }
  const ranked=Array.from(selected).sort((a,b)=>b.guitarScore-a.guitarScore);
  const keepCount=Math.max(30,Math.ceil(ranked.length*(state.mode==='guitar'?.84:.55)));
  selected=ranked.filter(x=>x.guitarScore>=(state.mode==='guitar'?.48:.60)).slice(0,keepCount);
  if(selected.length<30)selected=ranked.slice(0,Math.min(keepCount,ranked.length));
  const wmean=k=>weightedMean(selected,k,x=>.35+.65*clamp(x.guitarScore,0,1));
  const pitchVals=selected.filter(x=>x.pitch&&x.pitchConfidence>.35).map(x=>x.pitch);
  const result={
    sampleRate:sr,channels:ch,duration:n/sr,frames:frames.length,selectedFrames:selected.length,selectedFraction:selected.length/frames.length,
    channelSelection:stereo?'STEREO POWER-SUM (L/R PHASE-SAFE)':'MONO',stereoCorrelation,centroid:wmean('centroid'),rolloff:wmean('rolloff'),rms:wmean('rms'),
    crest:wmean('crest'),dynamicDb:db(Math.max(...selected.map(x=>x.rms*x.crest)))-db(wmean('rms')),flatness:wmean('flatness'),
    zcr:wmean('zcr'),pitch:pitchVals.length?median(pitchVals):0,pitchConfidence:mean(selected.map(x=>x.pitchConfidence)),
    low:wmean('low'),lowMid:wmean('lowMid'),mid:wmean('mid'),highMid:wmean('highMid'),high:wmean('high'),
    harmonicity:wmean('harmonicity'),highHarmonics:wmean('highHarmonics'),slope:wmean('slope'),transient:wmean('transient'),flux:wmean('flux'),
    spectralBands:['low','lowMid','mid','highMid','high'].map(k=>wmean(k)),loudnessDbfs:db(wmean('rms')),
    guitarFocusScore:mean(selected.map(x=>x.guitarScore)),
    analysisQuality:Math.round(clamp(.42*mean(selected.map(x=>x.guitarScore))+.22*(selected.length/Math.max(frames.length,1))+.20*mean(selected.map(x=>x.pitchConfidence))+.10*(state.mode==='guitar'?1:0)+.06*(stereo?1:0),0,1)*100),
    method:(state.mode==='guitar'?'DEDICATED STEREO GUITAR STEM / POWER-SUM SPECTRUM':'FULL MIX / GUITAR EVIDENCE EXTRACTION')+(state.guitarFocus?' + MULTI-RESOLUTION HARMONIC SELECTION':'')+(state.autoSections?' + SECTION SELECTION':'')
  };
  return result;
}

/* V34 FULL-SONG GUITAR EVIDENCE ENGINE
   Full mixes are not treated as if they were stems. The analyser performs
   multi-feature source evidence scoring per frame and per song section,
   then builds the fingerprint only from frames with the strongest guitar
   evidence. This is intentionally deterministic and browser-safe; it does
   not claim to recover information that is masked by other instruments.
*/
function v34Clamp01(x){return Math.max(0,Math.min(1,Number.isFinite(x)?x:0))}
function v34BandEnergy(mags,sr,size,lo,hi){
  let s=0;
  const a=Math.max(1,Math.floor(lo*size/sr)), b=Math.min(size/2,Math.ceil(hi*size/sr));
  for(let k=a;k<=b;k++)s+=mags[k]*mags[k];
  return s;
}
function v34PitchHarmonicEvidence(mags,sr,size,pitch){
  if(!pitch||pitch<65||pitch>1400)return {harmonicity:0,highHarmonics:0,harmonicPeaks:0};
  let total=0,harm=0,high=0,peaks=0;
  for(let k=1;k<=size/2;k++)total+=mags[k]*mags[k];
  if(total<=1e-12)return {harmonicity:0,highHarmonics:0,harmonicPeaks:0};
  for(let h=1;h<=14;h++){
    const hz=pitch*h;if(hz>sr/2)break;
    const c=Math.round(hz*size/sr),r=Math.max(1,Math.round(c*.008));
    let p=0;
    for(let k=Math.max(1,c-r);k<=Math.min(size/2,c+r);k++)p=Math.max(p,mags[k]);
    harm+=p;
    if(h>=5)high+=p;
    if(p>0.06*Math.sqrt(total))peaks++;
  }
  return {harmonicity:v34Clamp01((harm/Math.max(Math.sqrt(total),1e-9))/.95),
          highHarmonics:v34Clamp01((high/Math.max(Math.sqrt(total),1e-9))/.35),
          harmonicPeaks:peaks};
}
async function analyseFullSongGuitar(buffer){
  const sr=buffer.sampleRate,n=buffer.length,ch=buffer.numberOfChannels;
  const L=buffer.getChannelData(0),R=ch>1?buffer.getChannelData(1):L;
  const size=4096,hop=1024;
  const maxFrames=state.highAccuracy?1100:600;
  const total=Math.max(1,Math.floor((n-size)/hop)+1);
  const step=Math.max(1,Math.floor(total/maxFrames));
  const frames=[];
  let prevMid=null,prevSide=null;

  for(let frame=0,used=0;frame+size<=n&&used<maxFrames;frame+=hop*step,used++){
    const reM=new Float64Array(size),imM=new Float64Array(size);
    const reS=new Float64Array(size),imS=new Float64Array(size);
    let rmsL=0,rmsR=0,peak=0,zc=0,pl=0,pr=0;
    for(let i=0;i<size;i++){
      const l=L[frame+i],r=R[frame+i];
      const mid=(l+r)*.5,side=(l-r)*.5;
      const w=.5-.5*Math.cos(2*Math.PI*i/(size-1));
      reM[i]=mid*w;reS[i]=side*w;
      rmsL+=l*l;rmsR+=r*r;peak=Math.max(peak,Math.abs(l),Math.abs(r));
      if(i&&((l>=0)!=(pl>=0)))zc++;
      if(i&&((r>=0)!=(pr>=0)))zc++;
      pl=l;pr=r;
    }
    const rms=Math.sqrt((rmsL+rmsR)/(ch>1?2:1)/size);
    if(rms<0.00045)continue;
    fft(reM,imM);fft(reS,imS);

    const mags=new Float64Array(size/2+1),midMags=new Float64Array(size/2+1),sideMags=new Float64Array(size/2+1);
    let sum=0,weighted=0,totalPow=0,logSum=0,count=0,midPow=0,sidePow=0;
    for(let k=1;k<=size/2;k++){
      const mm=Math.hypot(reM[k],imM[k]),ss=Math.hypot(reS[k],imS[k]);
      midMags[k]=mm;sideMags[k]=ss;
      const p=Math.sqrt(mm*mm+ss*ss);
      mags[k]=p;sum+=p;weighted+=(k*sr/size)*p;totalPow+=p*p;
      midPow+=mm*mm;sidePow+=ss*ss;
      if(p>1e-10){logSum+=Math.log(p);count++}
    }
    const centroid=weighted/Math.max(sum,1e-9);
    let cum=0,roll=0;
    for(let k=1;k<=size/2;k++){cum+=mags[k];if(cum>=sum*.85){roll=k*sr/size;break}}
    const flat=Math.exp(logSum/Math.max(count,1))/(sum/Math.max(count,1));
    const pL=estimateGuitarPitch(L.subarray(frame,frame+size),sr);
    const pR=ch>1?estimateGuitarPitch(R.subarray(frame,frame+size),sr):pL;
    const pitch=pL.confidence>=pR.confidence?pL:pR;
    const hb=v34PitchHarmonicEvidence(mags,sr,size,pitch.freq);

    const low=v34BandEnergy(mags,sr,size,55,180)/Math.max(totalPow,1e-12);
    const lowMid=v34BandEnergy(mags,sr,size,180,450)/Math.max(totalPow,1e-12);
    const mid=v34BandEnergy(mags,sr,size,450,1400)/Math.max(totalPow,1e-12);
    const upper=v34BandEnergy(mags,sr,size,1400,3000)/Math.max(totalPow,1e-12);
    const high=v34BandEnergy(mags,sr,size,3000,9000)/Math.max(totalPow,1e-12);
    const guitarRange= v34Clamp01((mid+upper+0.55*lowMid)/.42);

    let flux=0;
    if(prevMid){
      let s=0,d=0;
      for(let k=2;k<=size/2;k+=2){s+=Math.max(0,mags[k]-prevMid[k]);d+=mags[k]}
      flux=s/Math.max(d,1e-9);
    }
    prevMid=mags;

    let sideFlux=0;
    if(prevSide){
      let s=0,d=0;
      for(let k=2;k<=size/2;k+=2){s+=Math.max(0,sideMags[k]-prevSide[k]);d+=sideMags[k]}
      sideFlux=s/Math.max(d,1e-9);
    }
    prevSide=sideMags;

    const centerRatio=midPow/Math.max(midPow+sidePow,1e-12);
    const crest=peak/Math.max(rms,1e-9);
    const transient=v34Clamp01((crest-1.8)/5);
    const harmonicStable=v34Clamp01(pitch.confidence*.55+hb.harmonicity*.45);
    const drumPenalty=v34Clamp01(
      .42*v34Clamp01(low/.42)+
      .28*v34Clamp01(flat/.30)+
      .30*v34Clamp01(flux/.65)
    );
    const vocalPenalty=v34Clamp01(
      .48*v34Clamp01(centerRatio/.96)+
      .25*v34Clamp01((mid+upper)/.48)+
      .27*v34Clamp01(hb.harmonicity/.72)
    );
    // Do not reject centered guitars: center position is only a mild penalty.
    const stereoEvidence=ch>1?v34Clamp01(.35+.65*(1-Math.abs(centerRatio-.5)*1.4)):0.35;
    const guitarScore=v34Clamp01(
      .38*pitch.confidence+
      .24*hb.harmonicity+
      .14*guitarRange+
      .08*stereoEvidence+
      .07*(1-drumPenalty)+
      .05*transient+
      .04*(1-v34Clamp01(flat/.42))-
      .10*vocalPenalty
    );

    frames.push({
      time:frame/sr,rms,crest,zcr:zc/(Math.max(1,ch)*size),centroid,rolloff:roll,flatness:flat,
      pitch:pitch.freq,pitchConfidence:pitch.confidence,low,lowMid,mid,highMid:upper,high,
      harmonicity:hb.harmonicity,highHarmonics:hb.highHarmonics,harmonicPeaks:hb.harmonicPeaks,
      transient,flux,sideFlux,centerRatio,guitarRange,drumPenalty,vocalPenalty,guitarScore,
      section:Math.floor((frame/sr)/Math.max(n/sr/12,.001))
    });

    if(used%10===0){
      const pct=Math.round(10+(used/Math.max(1,Math.min(maxFrames,total)))*65);
      setProgress(Math.min(75,pct),'Extracting guitar evidence from full song '+used+' of '+Math.min(maxFrames,total)+'…');
      await new Promise(r=>setTimeout(r,0));
    }
  }

  if(!frames.length)throw new Error('No usable audio frames were found.');

  // Rank sections first so a chorus/solo guitar part can dominate the fingerprint
  // without allowing the whole mix to wash it out.
  const bySec=new Map();
  for(const f of frames){if(!bySec.has(f.section))bySec.set(f.section,[]);bySec.get(f.section).push(f)}
  const sections=[...bySec.entries()].map(([id,v])=>({
    id,
    score:mean(v.map(x=>x.guitarScore)),
    peak:Math.max(...v.map(x=>x.guitarScore)),
    count:v.length
  })).sort((a,b)=>(b.score+.35*b.peak)-(a.score+.35*a.peak));

  const keepSections=new Set(sections.slice(0,Math.max(3,Math.ceil(sections.length*.55))).map(x=>x.id));
  let selected=frames.filter(f=>keepSections.has(f.section));
  selected.sort((a,b)=>b.guitarScore-a.guitarScore);

  // Use the strongest guitar-evidence frames, but retain enough temporal diversity.
  const keepCount=Math.max(45,Math.min(selected.length,Math.ceil(frames.length*.32)));
  selected=selected.slice(0,keepCount);
  if(selected.length<30)selected=frames.slice().sort((a,b)=>b.guitarScore-a.guitarScore).slice(0,Math.min(60,frames.length));

  const wmean=k=>weightedMean(selected,k,x=>.20+.80*v34Clamp01(x.guitarScore));
  const pitchVals=selected.filter(x=>x.pitch&&x.pitchConfidence>.35).map(x=>x.pitch);

  const guitarEvidence=mean(selected.map(x=>x.guitarScore));
  const evidenceCoverage=selected.length/Math.max(frames.length,1);
  const pitchConf=mean(selected.map(x=>x.pitchConfidence));
  const separationConfidence=v34Clamp01(.45*guitarEvidence+.25*pitchConf+.20*Math.min(1,evidenceCoverage/.30)+.10*(1-mean(selected.map(x=>x.vocalPenalty))));

  const result={
    sampleRate:sr,channels:ch,duration:n/sr,frames:frames.length,selectedFrames:selected.length,
    selectedFraction:evidenceCoverage,
    channelSelection:'FULL MIX — GUITAR EVIDENCE / MID-SIDE / HARMONIC MASK',
    stereoCorrelation:ch>1?mean(frames.map(x=>1-2*Math.abs(x.centerRatio-.5))):1,
    centroid:wmean('centroid'),rolloff:wmean('rolloff'),rms:wmean('rms'),crest:wmean('crest'),
    dynamicDb:db(Math.max(...selected.map(x=>x.rms*x.crest)))-db(wmean('rms')),
    flatness:wmean('flatness'),zcr:wmean('zcr'),pitch:pitchVals.length?median(pitchVals):0,
    pitchConfidence:pitchConf,low:wmean('low'),lowMid:wmean('lowMid'),mid:wmean('mid'),
    highMid:wmean('highMid'),high:wmean('high'),harmonicity:wmean('harmonicity'),
    highHarmonics:wmean('highHarmonics'),slope:0,transient:wmean('transient'),flux:wmean('flux'),
    spectralBands:['low','lowMid','mid','highMid','high'].map(k=>wmean(k)),
    loudnessDbfs:db(wmean('rms')),
    guitarFocusScore:guitarEvidence,
    guitarEvidenceCoverage:evidenceCoverage,
    vocalMasking:mean(selected.map(x=>x.vocalPenalty)),
    percussiveMasking:mean(selected.map(x=>x.drumPenalty)),
    sectionCount:sections.length,
    selectedSections:sections.filter(x=>keepSections.has(x.id)).map(x=>x.id),
    analysisQuality:Math.round(separationConfidence*100),
    method:'FULL MIX / MULTI-PASS GUITAR EVIDENCE EXTRACTION + MID-SIDE ANALYSIS + HARMONIC MASK + SECTION RANKING',
    limitation:'Full-song mode estimates guitar evidence inside a mixed recording; it does not claim to reconstruct a hidden isolated stem.'
  };
  setProgress(78,'Guitar evidence extracted. Building GP-50 candidate…');
  return result;
}

async function analyseAudio(buffer){
  if(state.mode==='full') return await analyseFullSongGuitar(buffer);
  return await analyseAudioStemCore(buffer);
}

function classifyTone(a,g){
  const acoustic=(g.targetFamily||state.targetFamily)==='acoustic';
  const bright=clamp((a.centroid-1200)/3000,0,1);
  const driveIndex=clamp(.55*(a.highHarmonics/.12)+.25*(1-a.harmonicity/.22)+.20*((a.crest-1.6)/4.5),0,1);
  if(acoustic)return {family:'Acoustic',amp:bright>.55?'AC Pre2':'AC Pre1',cab:'AC BA',drive:'OFF',eq:'Guitar EQ 1'};
  if(driveIndex>.72)return {family:'High Gain',amp:bright>.55?'Eagle 120':'Dizz VH+',cab:bright>.55?'Eagle 4x12':'Dizz 4x12',drive:'OFF / AMP gain',eq:'Guitar EQ 2'};
  if(driveIndex>.42)return {family:'Drive',amp:bright>.5?'Z38 OD':'Bellman 59B',cab:bright>.5?'Foxy 2x12':'Dark Twin 2x12',drive:'Green OD / low drive',eq:'Guitar EQ 1'};
  return {family:'Clean / Edge',amp:bright>.55?'J-120':'Dark Twin',cab:bright>.55?'J-120 2x12':'Dark Twin 2x12',drive:'OFF',eq:'Guitar EQ 1'};
}
function buildCandidate(a){
  const g=state.guitar||getGuitarProfile(),adj=guitarAdjustment(g),tone=classifyTone(a,g);
  const bright=clamp((a.centroid-1100)/3200+adj.bright,0,1);
  const distortion=clamp(.55*(a.highHarmonics/.12)+.25*(1-a.harmonicity/.22)+.20*((a.crest-1.6)/4.5),0,1);
  const gain=clamp(.12+.88*distortion,0,1),space=clamp((a.rolloff-2500)/5000,0,1),body=clamp((a.lowMid+a.mid)/.65+adj.body,0,1);
  const eqLow=Math.round(clamp((a.low-.20)*12,-12,12)),eqLowMid=Math.round(clamp((a.lowMid-.16)*10,-12,12)),eqMid=Math.round(clamp((a.mid-.18)*9,-12,12)),eqHighMid=Math.round(clamp((bright-.5)*8,-12,12)),eqHigh=Math.round(clamp((a.high-.08)*10,-12,12));
  const confidence=Math.round(clamp(.30+(a.analysisQuality/100)*.45+(a.guitarFocusScore*.20)+(a.pitch?.05:0),0,1)*100);
  return {guitar:g,route:tone.family,amp:tone.amp,cab:tone.cab,eqModel:tone.eq,drive:tone.drive,nr:Math.round(8+clamp(a.flatness*3,0,1)*25),gain:Math.round(gain*100),bass:Math.round(clamp(body+.18,0,1)*100),mid:Math.round(clamp(a.mid/.28,0,1)*100),treble:Math.round(clamp(bright+.25,0,1)*100),presence:Math.round(clamp(bright+.15,0,1)*100),eqBands:{low:eqLow,lowMid:eqLowMid,mid:eqMid,highMid:eqHighMid,high:eqHigh},delay:space>.42?'Low mix / measure repeats':'OFF or very low',reverb:space>.5?'Room/Hall — low mix':'Room — low mix',instrument:g.type==='electric'?'Electric guitar':'Acoustic / non-electric',confidence,note:'Measured guitar-focused candidate. A full mix cannot uniquely reveal the original studio preset; a real GP-50 capture is required for empirical calibration.',analysisMethod:a.method,quality:a.analysisQuality};
}
function fillCandidate(c){document.getElementById('pNR').textContent='Threshold '+c.nr;document.getElementById('pPRE').textContent=c.guitar.model+' • '+c.guitar.pickups+' • '+c.guitar.position;document.getElementById('pDST').textContent=c.drive+' • Gain '+c.gain+'%';document.getElementById('pAMP').textContent=c.amp+' • Gain '+c.gain+'% • Bass '+c.bass+' • Mid '+c.mid+' • Treble '+c.treble+' • Pres '+c.presence;document.getElementById('pCAB').textContent=c.cab+' • EQ '+c.eqModel;document.getElementById('pEQ').textContent='125/400/800/1.6k/4k or nearest: '+c.eqBands.low+' / '+c.eqBands.lowMid+' / '+c.eqBands.mid+' / '+c.eqBands.highMid+' / '+c.eqBands.high+' dB';document.getElementById('pMOD').textContent='Only if periodic movement is evident in the reference.';document.getElementById('pDLY').textContent=c.delay;document.getElementById('pRVB').textContent=c.reverb;const box=document.getElementById('presetHero');if(box)box.innerHTML='<strong>'+c.route+' • '+c.amp+'</strong><div class="muted" style="margin-top:5px">Guitar: '+c.guitar.model+' • '+c.guitar.pickups+' • '+c.guitar.position+' • '+c.guitar.tuning+'</div><div class="presetTable"><div class="presetCell"><b>AMP</b><span>'+c.amp+'</span></div><div class="presetCell"><b>CAB</b><span>'+c.cab+'</span></div><div class="presetCell"><b>GAIN</b><span>'+c.gain+'%</span></div><div class="presetCell"><b>BASS / MID / TREBLE</b><span>'+c.bass+' / '+c.mid+' / '+c.treble+'</span></div><div class="presetCell"><b>PRESENCE</b><span>'+c.presence+'%</span></div><div class="presetCell"><b>NOISE GATE</b><span>'+c.nr+'</span></div></div><div class="smallNote">Analysis quality: '+c.quality+'% • Guitar-relevant frame selection is used. Set these values on the physical GP-50, record its output, then use Calibration to measure the remaining difference.</div>'}
function fingerprintDistance(a,b){
  const keys=['centroid','rolloff','crest','flatness','zcr','pitch','low','lowMid','mid','highMid','high','harmonicity','transient','flux','slope'];
  const scales={centroid:1200,rolloff:2200,crest:2.5,flatness:.10,zcr:.06,pitch:90,low:.14,lowMid:.14,mid:.16,highMid:.14,high:.14,harmonicity:.16,transient:.22,flux:.25,slope:.35};
  let sum=0,w=0;for(const k of keys){if(!Number.isFinite(a[k])||!Number.isFinite(b[k]))continue;const d=Math.abs(a[k]-b[k])/scales[k],ww=['centroid','rolloff','lowMid','mid','highMid','high','harmonicity'].includes(k)?1.5:1;sum+=Math.min(d,1)*ww;w+=ww}
  if(Array.isArray(a.spectralBands)&&Array.isArray(b.spectralBands)&&a.spectralBands.length===b.spectralBands.length){for(let i=0;i<a.spectralBands.length;i++){sum+=Math.min(1,Math.abs(a.spectralBands[i]-b.spectralBands[i])/.12)*1.8;w+=1.8}}
  return w?sum/w:1;
}
function calibrationAdvice(a,b){const out=[];const diff=(k,label,unit='')=>{const d=b[k]-a[k];if(Math.abs(d)>0.08)out.push('<div class="row"><b>'+label+'</b><span>'+ (d>0?'higher':'lower')+' by '+Math.abs(d).toFixed(2)+unit+'</span></div>')};diff('centroid','Brightness');diff('rolloff','Top-end');diff('crest','Dynamics');diff('lowMid','Low-mid body');diff('highMid','Upper-mid');diff('high','High band');return out.join('')||'<div class="muted">No large measured mismatch in the tracked fingerprint features.</div>'}
let ffmpegInstance=null,ffmpegLoading=null;async function loadFFmpegDecoder(){if(ffmpegInstance?.loaded)return ffmpegInstance;if(ffmpegLoading)return ffmpegLoading;ffmpegLoading=(async()=>{const mod=await import('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.6/dist/esm/index.js');const util=await import('https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/esm/index.js');const ff=new mod.FFmpeg();ff.on('progress',({progress})=>{const pct=Math.max(0,Math.min(1,progress||0));setProgress(20+Math.round(pct*40),'Converting unsupported audio codec… '+Math.round(pct*100)+'%')});const base='https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd';await ff.load({coreURL:await util.toBlobURL(base+'/ffmpeg-core.js','text/javascript'),wasmURL:await util.toBlobURL(base+'/ffmpeg-core.wasm','application/wasm'),classWorkerURL:await util.toBlobURL('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.6/dist/esm/worker.js','text/javascript')});ffmpegInstance=ff;return ff})();try{return await ffmpegLoading}finally{ffmpegLoading=null}}
async function decodeWithNative(file){const arr=await file.arrayBuffer(),AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('Web Audio is not supported on this browser.');const ac=new AC();try{return await ac.decodeAudioData(arr.slice(0))}finally{try{await ac.close()}catch(e){}}}
async function decodeWithFFmpeg(file){const ff=await loadFFmpegDecoder();const ext=(file.name.split('.').pop()||'bin').toLowerCase().replace(/[^a-z0-9]/g,'')||'bin',input='input.'+ext,output='output.wav';await ff.writeFile(input,new Uint8Array(await file.arrayBuffer()));const code=await ff.exec(['-i',input,'-vn','-ac','2','-ar','44100','-c:a','pcm_s16le',output]);if(code!==0)throw new Error('FFmpeg could not decode this file.');const wav=await ff.readFile(output),AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('Web Audio is not supported on this browser.');const ac=new AC();try{return await ac.decodeAudioData(wav.buffer.slice(wav.byteOffset,wav.byteOffset+wav.byteLength))}finally{try{await ac.close()}catch(e){}}}
async function decodeAndAnalyseFile(file){const status=document.getElementById('decoderStatus');try{status.textContent='Decoding '+file.name+'…';const b=await decodeWithNative(file);status.textContent='Decoded natively. Starting tone analysis…';return await analyseAudio(b)}catch(nativeErr){status.textContent='Browser decoder cannot read this codec. Starting FFmpeg fallback…';const b=await decodeWithFFmpeg(file);status.textContent='FFmpeg decoded '+file.name+'. Starting tone analysis…';return await analyseAudio(b)}}
async function runAnalysis(){
  if(state.analysing)return;
  if(!state.file){showScreen('import');return}
  const btn=document.getElementById('analyseButton');
  state.analysing=true;
  if(btn)btn.disabled=true;
  document.getElementById('result').classList.remove('hidden');
  try{
    state.guitar=getGuitarProfile();
    if(!state.guitar.preset && state.guitar.model==='Unspecified'){
      document.getElementById('progressText').textContent='Choose your actual guitar in My Guitar before analysing.';
      showScreen('import');
      return;
    }
    setProgress(5,'Starting analysis of '+state.file.name+'…');
    const a=await decodeAndAnalyseFile(state.file);
    state.analysis=a;
    setProgress(82,'Building GP-50 preset for '+(state.guitar?.model||'your guitar')+'…');
    await new Promise(r=>setTimeout(r,0));
    const c=buildCandidate(a);
    state.analysis.candidate=c;
    document.getElementById('score').textContent='READY';
    document.getElementById('scoreNote').textContent='Reference guitar evidence analysed. The GP-50 candidate is ready below.';
    document.getElementById('mCentroid').textContent=Math.round(a.centroid)+' Hz';
    document.getElementById('mRolloff').textContent=Math.round(a.rolloff)+' Hz';
    document.getElementById('mRms').textContent=db(a.rms).toFixed(1)+' dBFS';
    document.getElementById('mCrest').textContent=a.crest.toFixed(2);
    document.getElementById('mPitch').textContent=a.pitch?Math.round(a.pitch)+' Hz':'—';
    document.getElementById('mFlat').textContent=a.flatness.toFixed(3); document.getElementById('scoreNote').textContent='Analysis quality '+a.analysisQuality+'% • '+a.method+' • '+a.selectedFrames+'/'+a.frames+' frames selected as guitar-relevant. This is a confidence indicator, not a claim of exact original settings.';
    fillCandidate(c);
    setProgress(100,'Analysis complete — GP-50 preset generated.');
    setTimeout(()=>showScreen('presets'),250);
  }catch(e){
    console.error(e);
    setProgress(0,'Analysis failed: '+(e?.message||'unknown error'));
    document.getElementById('score').textContent='ERROR';
    document.getElementById('scoreNote').textContent='The file could not be decoded or analysed. Try WAV/MP3 or check the connection for the FFmpeg fallback.';
  }finally{
    state.analysing=false;
    if(btn)btn.disabled=false;
  }
}
const calInput=document.getElementById('calFile');if(calInput)calInput.addEventListener('change',e=>{const f=e.target.files[0];if(f)document.getElementById('calFileName').textContent=f.name});async function runCalibration(){if(!state.file){showScreen('import');return}const f=calInput?.files?.[0];if(!f){document.getElementById('progressText').textContent='Choose a GP-50 capture first.';return}try{document.getElementById('progressText').textContent='Comparing reference and GP-50 capture…';const ref=state.analysis||await decodeAndAnalyseFile(state.file);const cap=await decodeAndAnalyseFile(f);const d=fingerprintDistance(ref,cap),score=Math.round((1-d)*100);state.analysis=state.analysis||ref;state.analysis.calibration={captureFile:f.name,capture:cap,distance:d,score};document.getElementById('score').textContent=score+'%';document.getElementById('scoreNote').textContent='Empirical fingerprint similarity between the reference and your GP-50 capture.';const el=document.getElementById('calResult');el.classList.remove('hidden');el.innerHTML='<div class="badge">EMPIRICAL CALIBRATION</div>'+calibrationAdvice(ref,cap);document.getElementById('progressText').textContent='Calibration comparison complete.'}catch(e){document.getElementById('progressText').textContent='Calibration failed: '+(e.message||'audio decoding error')}}
function setProgress(v,msg){document.getElementById('progressBar').style.width=v+'%';document.getElementById('progressText').textContent=msg}
function savePreset(){if(!state.analysis){showScreen('analyse');return}const a=state.analysis,data={app:'ValeAnalize',version:'V34',target:'Valeton GP-50',sourceFile:state.file?.name||null,mode:state.mode,targetFamily:state.targetFamily,guitar:state.guitar||getGuitarProfile(),empiricalSimilarity:a.calibration?.score??null,analysis:a,candidate:a.candidate,midiReady:!!state.midi};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),tag=document.createElement('a');tag.href=URL.createObjectURL(blob);tag.download='ValeAnalize-V34-GP50-Preset.json';tag.click();setTimeout(()=>URL.revokeObjectURL(tag.href),1000)}

// ---------- V20 REAL GP-50 .PRST ENGINE ----------
const GP50_MODULES = [
  {key:'NR', label:'Noise Reduction / Gate'},
  {key:'PRE', label:'Pre / Compressor / Wah / Pitch'},
  {key:'DST', label:'Drive / Distortion'},
  {key:'N-S', label:'N→S / SnapTone / Neural'},
  {key:'AMP', label:'Amplifier'},
  {key:'CAB', label:'Cab / IR'},
  {key:'EQ', label:'Equalizer'},
  {key:'MOD', label:'Modulation'},
  {key:'DLY', label:'Delay'},
  {key:'RVB', label:'Reverb'}
];
const GP50_TEMPLATE_B64="R1AtNTAAAAAAAAAAAAAAAAAAAQDv/////0NPVU5UUlknMjYAAAAAAAD/ABAAAQAEAAEAAAACAAQAR1A1MAAAEAABEAQACgAAAAIQBAAIAAAAAQA7AAEgAQAyAiAEAHgAAAADIAEAAAQgBAAAAAAABSAEAGQAAAAGIAEAAAcgAQAACCABAGQJIAEAAAogAQAAAgCGAQEwBACbAQAAAjAKAAABAgkDBAUGBwgDMCgAGwAAAAEAAAAAAAADBAAABxIAAAo2AAABAAAABAEAAAsEAAAMAAAADwQwQAEAAKBBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWEIAAIJCAACCQgAAIEEAAAAAAAAAAAAAAAAAAAAAAAAYQgAAaEIAACxCAABIQgAASEIAAAAAAAAAAAAAAAAAAIJCAABIQgAAXEIAACBCAABwQgAAAAAAAAAAAAAAAAAASEIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAADAAAAgQQAAgEAAAEhCAAAAAAAAAAAAAEhCAAAAPwAASEIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYEEAABBDAADgQQAAAAAAAAAAAAAAAAAAAAAAAAAAAABwQQAAPEIAAEhCAACAPwAASEIAAAAAAAAAAAAAAAAAAEhCAABIQgAASEIAAEhCAABIQgAAAAAAAAAAAAAAAAMACgAkAAAAgAAAAAYF";
let gp50Patch=null;

function gp50Crc8(data,init=0){
  let c=init;
  for(const b of data){c^=b;for(let i=0;i<8;i++)c=(c&0x80)?(((c<<1)^0x07)&255):((c<<1)&255);}
  return c;
}
function gp50Find(bytes,hex){
  const p=hex.split(' ').map(x=>parseInt(x,16));
  outer:for(let i=0;i<=bytes.length-p.length;i++){for(let j=0;j<p.length;j++)if(bytes[i+j]!==p[j])continue outer;return i;}
  return -1;
}
function gp50U32(bytes,o){return (bytes[o]|bytes[o+1]<<8|bytes[o+2]<<16|bytes[o+3]<<24)>>>0}
function gp50SetU32(bytes,o,v){bytes[o]=v&255;bytes[o+1]=(v>>>8)&255;bytes[o+2]=(v>>>16)&255;bytes[o+3]=(v>>>24)&255}
function gp50GetF(bytes,o){return new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getFloat32(o,true)}
function gp50SetF(bytes,o,v){new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).setFloat32(o,Number.isFinite(v)?v:0,true)}
function gp50Base64ToBytes(s){const raw=atob(s);const out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out}
function gp50BytesToBase64(bytes){let s='';const chunk=0x8000;for(let i=0;i<bytes.length;i+=chunk)s+=String.fromCharCode(...bytes.subarray(i,Math.min(i+chunk,bytes.length)));return btoa(s)}
function gp50ReadName(bytes){return new TextDecoder('latin1').decode(bytes.slice(0x19,0x29)).split('\\0')[0].trim()}
function gp50WriteName(bytes,name){const enc=new TextEncoder().encode(String(name||'GP-50').slice(0,16));bytes.fill(0,0x19,0x29);bytes.set(enc.slice(0,16),0x19)}

function parseGp50Prst(input){
  const bytes=new Uint8Array(input);
  if(bytes.length!==552)throw new Error('GP-50 .prst must be exactly 552 bytes; this file is '+bytes.length+' bytes.');
  const header=[0x47,0x50,0x2d,0x35,0x30,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0];
  for(let i=0;i<20;i++)if(bytes[i]!==header[i])throw new Error('This .prst does not have the GP-50 header.');
  const stored=bytes[0x14],calc=gp50Crc8(bytes.slice(0x15));
  if(stored!==calc)throw new Error('GP-50 CRC check failed. Stored '+stored.toString(16).padStart(2,'0')+' / calculated '+calc.toString(16).padStart(2,'0')+'.');
  const mo=gp50Find(bytes,'03 30 28 00'), bo=gp50Find(bytes,'01 30 04 00'), oo=gp50Find(bytes,'02 30 0A 00'), po=gp50Find(bytes,'04 30 40 01'), fo=gp50Find(bytes,'03 00 0A 00');
  if([mo,bo,oo,po,fo].some(x=>x<0))throw new Error('Required GP-50 records are missing.');
  const models=[];
  for(let k=0;k<10;k++){
    const o=mo+4+k*4;
    const fxlow=bytes[o]|bytes[o+1]<<8|bytes[o+2]<<16;
    models.push({index:k,fxlow,category:bytes[o+3],fxid:((bytes[o+3]<<24)|(bytes[o+2]<<16)|(bytes[o+1]<<8)|bytes[o])>>>0});
  }
  const params=[];
  for(let k=0;k<80;k++)params.push(gp50GetF(bytes,po+4+k*4));
  const order=Array.from(bytes.slice(oo+4,oo+14));
  const bypass=gp50U32(bytes,bo+4);
  const fs1=gp50U32(bytes,fo+4),fs2=gp50U32(bytes,fo+8);
  return {bytes,name:gp50ReadName(bytes),models,bypass,order,params,fs1,fs2,crc:stored,valid:true};
}
function gp50ModelId(m){return m.fxlow}
function gp50StateOn(p,i){return !!(p.bypass & (1<<i))}
function gp50RebuildFromEditor(){
  if(!gp50Patch)return;
  const b=new Uint8Array(gp50Patch.bytes);
  const name=document.getElementById('gp50Name')?.value||gp50Patch.name;
  gp50WriteName(b,name);
  for(let k=0;k<10;k++){
    const id=parseInt(document.getElementById('gp50model'+k)?.value||gp50Patch.models[k].fxlow,10);
    const cat=parseInt(document.getElementById('gp50cat'+k)?.value||gp50Patch.models[k].category,10);
    const o=gp50Patch._modelsOffset+4+k*4;
    b[o]=id&255;b[o+1]=(id>>>8)&255;b[o+2]=(id>>>16)&255;b[o+3]=cat&255;
    for(let j=0;j<8;j++){
      const raw=document.getElementById('gp50p'+k+'_'+j)?.value;
      const v=raw==null||raw===''?gp50Patch.params[k*8+j]:parseFloat(raw);
      gp50SetF(b,gp50Patch._paramsOffset+4+(k*8+j)*4,v);
    }
  }
  let mask=0;
  for(let k=0;k<10;k++)if(document.getElementById('gp50on'+k)?.checked)mask|=(1<<k);
  gp50SetU32(b,gp50Patch._bypassOffset+4,mask>>>0);
  const order=Array.from(document.querySelectorAll('.gp50OrderInput')).map(x=>parseInt(x.value,10));
  if(order.length===10 && [...new Set(order)].size===10 && order.every(x=>x>=0&&x<10)){
    for(let i=0;i<10;i++)b[gp50Patch._orderOffset+4+i]=order[i];
  }
  gp50SetU32(b,gp50Patch._fsOffset+4,parseInt(document.getElementById('gp50fs1')?.value||gp50Patch.fs1,10)>>>0);
  gp50SetU32(b,gp50Patch._fsOffset+8,parseInt(document.getElementById('gp50fs2')?.value||gp50Patch.fs2,10)>>>0);
  b[0x14]=gp50Crc8(b.slice(0x15));
  gp50Patch=parseGp50Prst(b);
  renderGp50Editor();
}
function gp50ModuleHtml(m,i,p){
  const params=p.params.slice(i*8,i*8+8);
  return `<div class="gp50Module">
    <div class="gp50ModuleHead"><b>${GP50_MODULES[i].key} — ${GP50_MODULES[i].label}</b><label style="font-size:10px"><input id="gp50on${i}" type="checkbox" ${gp50StateOn(p,i)?'checked':''}> ON</label></div>
    <div class="gp50Grid">
      <div class="gp50Field"><label>Model ID / fxlow</label><input id="gp50model${i}" type="number" step="1" value="${m.fxlow}"></div>
      <div class="gp50Field"><label>Category byte</label><input id="gp50cat${i}" type="number" step="1" min="0" max="255" value="${m.category}"></div>
    </div>
    <div class="gp50Grid">
      ${params.map((v,j)=>`<div class="gp50Field"><label>Param ${j+1} — exact float slot</label><input id="gp50p${i}_${j}" type="number" step="any" value="${Number(v.toFixed(6))}"></div>`).join('')}
    </div>
    <div class="gp50Mono" style="margin-top:8px">fxid = 0x${m.fxid.toString(16).padStart(8,'0')} • storage block ${i} • parameter slots ${i*8}–${i*8+7}</div>
  </div>`;
}
function renderGp50Editor(){
  const s=document.getElementById('gp50PatchStatus'),sum=document.getElementById('gp50PatchSummary'),ed=document.getElementById('gp50Editor');
  if(!gp50Patch){if(s)s.textContent='No real GP-50 patch loaded yet.';return}
  if(s)s.innerHTML=`<span class="gp50Exact">VALID GP-50 BINARY • 552 bytes • CRC OK • ${gp50Patch.name}</span>`;
  if(sum)sum.innerHTML=`<div class="row"><b>Patch name</b><input id="gp50Name" value="${gp50Patch.name.replace(/"/g,'&quot;')}" maxlength="16" style="background:#071b24;border:1px solid #28687c;color:#dcebf0;border-radius:8px;padding:8px;width:100%;max-width:240px"></div>
    <div class="row"><b>Bypass mask</b><span class="gp50Mono">0x${gp50Patch.bypass.toString(16).padStart(8,'0')} (${
      gp50Patch.bypass.toString(2).padStart(10,'0')
    })</span></div>
    <div class="row"><b>Chain order</b><span class="gp50Mono">${gp50Patch.order.map(x=>GP50_MODULES[x]?.key||x).join(' → ')}</span></div>
    <div class="gp50Order">${gp50Patch.order.map((x,i)=>`<span>${i+1} <select class="gp50OrderInput" style="background:#071b24;color:#e6f2f5;border:1px solid #225b6c;border-radius:6px;padding:4px">${GP50_MODULES.map((m,j)=>`<option value="${j}" ${j===x?'selected':''}>${j} ${m.key}</option>`).join('')}</select></span>`).join('')}</div>
    <div class="gp50Grid" style="margin-top:8px"><div class="gp50Field"><label>Footswitch mask 1</label><input id="gp50fs1" type="number" value="${gp50Patch.fs1}"></div><div class="gp50Field"><label>Footswitch mask 2</label><input id="gp50fs2" type="number" value="${gp50Patch.fs2}"></div></div>
    <div class="actions"><button class="primary" onclick="gp50RebuildFromEditor()">Apply Changes + Recalculate CRC</button></div>`;
  if(ed)ed.innerHTML=gp50Patch.models.map((m,i)=>gp50ModuleHtml(m,i,gp50Patch)).join('');
}
function loadGp50Bytes(bytes,sourceName='GP-50 patch'){
  try{
    const p=parseGp50Prst(bytes);
    p._modelsOffset=gp50Find(p.bytes,'03 30 28 00');
    p._bypassOffset=gp50Find(p.bytes,'01 30 04 00');
    p._orderOffset=gp50Find(p.bytes,'02 30 0A 00');
    p._paramsOffset=gp50Find(p.bytes,'04 30 40 01');
    p._fsOffset=gp50Find(p.bytes,'03 00 0A 00');
    p.sourceName=sourceName;gp50Patch=p;renderGp50Editor();
    const status=document.getElementById('gp50PatchStatus');if(status)status.textContent='Loaded '+sourceName+' • 552 bytes • CRC verified.';
    showScreen('presets');
  }catch(e){const status=document.getElementById('gp50PatchStatus');if(status)status.textContent='Could not load .prst: '+e.message;}
}
function loadEmbeddedGp50Template(){
  loadGp50Bytes(gp50Base64ToBytes(GP50_TEMPLATE_B64),"COUNTRY'26 real GP-50 template");
}
document.getElementById('gp50PrstInput')?.addEventListener('change',async e=>{
  const f=e.target.files?.[0];if(!f)return;
  loadGp50Bytes(new Uint8Array(await f.arrayBuffer()),f.name);
});
function setGp50Param(b,po,moduleIndex,slot,value){
  const v=Number(value);
  if(!Number.isFinite(v))return;
  gp50SetF(b,po+4+(moduleIndex*8+slot)*4,v);
}
function buildAnalyzedGp50Binary(){
  if(!state.analysis?.candidate) throw new Error('Analyse a track first so ValeAnalize has a generated GP-50 candidate.');
  const c=state.analysis.candidate;
  const b=gp50Patch?new Uint8Array(gp50Patch.bytes):gp50Base64ToBytes(GP50_TEMPLATE_B64);
  const po=gp50Find(b,'04 30 40 01');
  if(po<0)throw new Error('GP-50 parameter block not found.');
  // Start from a real, validated GP-50 patch so all undocumented bytes remain valid.
  // We only change parameters whose storage meaning is supported by the current
  // ValeAnalize mapping. Model IDs/chain order remain from the validated real template
  // unless the user edits them in the manual editor.
  const source=(state.file?.name||'ANALYZED').replace(/\.[^.]+$/,'');
  gp50WriteName(b,('VA '+source).slice(0,16));

  // NR: threshold-like gate control.
  setGp50Param(b,po,0,0,Number(c.nr)||0);

  // DST: only write the generic Gain/Tone/Volume positions when a drive candidate exists.
  if(c.drive && c.drive!=='OFF'){
    setGp50Param(b,po,2,0,Number(c.gain)||0);
    setGp50Param(b,po,2,1,Number(c.treble)||50);
    setGp50Param(b,po,2,2,50);
  }

  // AMP: the first five controls are the common gain/EQ/presence controls used by
  // the candidate generator. Keep the remaining model-specific slot untouched.
  setGp50Param(b,po,4,0,Number(c.gain)||0);
  setGp50Param(b,po,4,1,Number(c.bass)||50);
  setGp50Param(b,po,4,2,Number(c.mid)||50);
  setGp50Param(b,po,4,3,Number(c.treble)||50);
  setGp50Param(b,po,4,4,Number(c.presence)||50);
  setGp50Param(b,po,4,5,50);

  // EQ: write the five measured correction bands, leaving model-specific extras intact.
  const q=c.eqBands||{};
  [q.low,q.lowMid,q.mid,q.highMid,q.high].forEach((v,j)=>setGp50Param(b,po,6,j,Number(v)||0));

  // MOD/DLY/RVB: only enable/use them when the analysis explicitly found evidence.
  // The model and parameter layout stays inherited from the validated template.
  const ambience=state.analysis?.rolloff>3000;
  let mask=gp50U32(b,gp50Find(b,'01 30 04 00')+4);
  // Always keep NR/AMP/CAB active in the generated patch. Other modules are left in
  // the validated template state; the user can switch them manually in the editor.
  mask |= (1<<0)|(1<<4)|(1<<5);
  if(c.drive && c.drive!=='OFF') mask |= (1<<2);
  if(ambience) mask |= (1<<9)|(1<<8);
  gp50SetU32(b,gp50Find(b,'01 30 04 00')+4,mask>>>0);

  b[0x14]=gp50Crc8(b.slice(0x15));
  const parsed=parseGp50Prst(b);
  parsed.source='ValeAnalize automatic analyzed build';
  return b;
}
function buildGp50BinaryFromCandidate(){ return buildAnalyzedGp50Binary(); }
function exportAnalyzedGp50Prst(){
  try{
    const b=buildAnalyzedGp50Binary();
    const parsed=parseGp50Prst(b);
    const blob=new Blob([b],{type:'application/octet-stream'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);
    const base=(state.file?.name||'ANALYZED_TRACK').replace(/\.[^.]+$/,'').replace(/[^A-Za-z0-9_-]+/g,'_').slice(0,28);
    a.download='VALEANALIZE_'+base+'_GP50.prst';a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    const s=document.getElementById('gp50PatchStatus');if(s)s.innerHTML='<span class="gp50Exact">GP-50 .prst EXPORTED • 552 bytes • CRC verified • parameters adjusted from analysis; model IDs remain from the validated source/template.</span>';
    loadGp50Bytes(b,a.download);
  }catch(e){const s=document.getElementById('gp50PatchStatus');if(s)s.textContent='Analyzed .prst export failed: '+e.message;}
}
function exportGp50Prst(){
  try{
    if(!gp50Patch && !state.analysis)loadEmbeddedGp50Template();
    const b=buildGp50BinaryFromCandidate();
    // Final structural verification before export.
    const parsed=parseGp50Prst(b);
    const blob=new Blob([b],{type:'application/octet-stream'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);
    const safe=(parsed.name||'VALETON').replace(/[^A-Za-z0-9_-]+/g,'_');
    a.download='VALETON_GP50_'+safe+'.prst';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    const s=document.getElementById('gp50PatchStatus');if(s)s.innerHTML='<span class="gp50Exact">EXPORTED: 552-byte GP-50 .prst • CRC verified • binary structure verified before download.</span>';
    loadGp50Bytes(b,a.download);
  }catch(e){const s=document.getElementById('gp50PatchStatus');if(s)s.textContent='Export failed: '+e.message;}
}
loadEmbeddedGp50Template();

// ---------- V8 Web MIDI ----------
function logMidi(msg){const el=document.getElementById('midiLog');if(el.textContent==='No MIDI messages yet.')el.textContent='';el.textContent+=msg+'\n';el.scrollTop=el.scrollHeight}
function clearMidiLog(){document.getElementById('midiLog').textContent='No MIDI messages yet.'}
function refreshMidi(){
  const support=!!navigator.requestMIDIAccess;document.getElementById('midiSupport').textContent=support?'Available':'Not available';
  if(!support){document.getElementById('midiStatus').textContent='Browser unsupported';return}
  if(!state.midi){document.getElementById('midiStatus').textContent='Not connected';return}
  const outs=Array.from(state.midi.outputs.values()),ins=Array.from(state.midi.inputs.values());
  const sel=document.getElementById('midiOut');sel.innerHTML='';
  if(!outs.length){sel.innerHTML='<option value="">No MIDI output detected</option>'}else outs.forEach(o=>{const opt=document.createElement('option');opt.value=o.id;opt.textContent=o.name||'MIDI Output';sel.appendChild(opt)})
  document.getElementById('midiStatus').textContent=outs.length+' out / '+ins.length+' in';
}
async function requestMidi(){
  if(!navigator.requestMIDIAccess){document.getElementById('midiSupport').textContent='Not available';document.getElementById('midiStatus').textContent='Use a Web-MIDI-capable browser';return}
  try{
    state.midi=await navigator.requestMIDIAccess({sysex:false});
    state.midi.onstatechange=()=>{refreshMidi();logMidi('Port state changed.')};
    state.midi.inputs.forEach(input=>input.onmidimessage=onMidiMessage);
    refreshMidi();logMidi('MIDI access granted.');
  }catch(e){document.getElementById('midiStatus').textContent='Connection blocked';logMidi('MIDI error: '+e.message)}
}
function onMidiMessage(e){const bytes=Array.from(e.data).map(x=>x.toString(16).padStart(2,'0')).join(' ');logMidi(new Date().toLocaleTimeString()+'  '+bytes)}
function sendProgramChange(){
  if(!state.midi){logMidi('Connect MIDI first.');return}
  const id=document.getElementById('midiOut').value,output=state.midi.outputs.get(id);if(!output){logMidi('No MIDI output selected.');return}
  const ch=Number(document.getElementById('midiChannel').value||0),program=Number(document.getElementById('midiProgram').value||0);
  output.send([0xC0+ch,program]);logMidi('TX  '+(0xC0+ch).toString(16).padStart(2,'0')+' '+program.toString(16).padStart(2,'0')+'  | Program Change '+(program+1));
}
for(let i=1;i<=16;i++){const o=document.createElement('option');o.value=i-1;o.textContent='Channel '+i;document.getElementById('midiChannel').appendChild(o)}
if('serviceWorker' in navigator)window.addEventListener('load',async()=>{try{const r=await navigator.serviceWorker.register('./sw.js?v=11-fixed-2');await r.update()}catch(e){}});
