// Playback stays in Apple's player. Only inspect the microphone locally.
export async function listen() {
  if(!navigator.mediaDevices?.getUserMedia) throw Error('這個瀏覽器沒有提供麥克風，請用 Safari 或 Chrome 開啟。');
  const Audio = window.AudioContext || window.webkitAudioContext;
  const context = new Audio();
  let stream;
  function close(){
    stream?.getTracks().forEach(track=>track.stop());
    if(context.state!=='closed')context.close().catch(()=>{});
  }
  try {
    await context.resume();
    stream=await navigator.mediaDevices.getUserMedia({
      audio:{echoCancellation:true, autoGainControl:false, noiseSuppression:false}
    });
    const source=context.createMediaStreamSource(stream);
    const filter=context.createBiquadFilter();
    filter.type='bandpass';filter.frequency.value=750;filter.Q.value=.48;
    const analyser=context.createAnalyser();
    analyser.fftSize=2048;
    source.connect(filter).connect(analyser);
    const samples=new Float32Array(analyser.fftSize);
    const baseline=[];
    let floor=.003, held=0;
    function sample(dt){
      if(context.state!=='running'||stream.getAudioTracks()[0].muted){held=0;return false;}
      analyser.getFloatTimeDomainData(samples);
      let power=0;
      for(const v of samples)power+=v*v;
      const rms=Math.sqrt(power/samples.length);
      if(baseline.length<18){
        baseline.push(rms);
        if(baseline.length===18)floor=Math.max(.001,baseline.sort((a,b)=>a-b)[9]);
        return false;
      }
      if(rms<floor*1.3)floor=Math.max(.001,.98*floor+.02*rms);
      let periodic=false;
      if(rms>Math.max(.003,floor*1.65)){
        const low=Math.floor(context.sampleRate/650),high=Math.min(750,Math.ceil(context.sampleRate/75));
        for(let lag=low;lag<=high;lag+=4){
          let cross=0,left=0,right=0;
          for(let i=0;i<900;i+=4){
            const a=samples[i],b=samples[i+lag];
            cross+=a*b;left+=a*a;right+=b*b;
          }
          if(cross>.57*Math.sqrt(left*right) && cross>0){periodic=true;break;}
        }
      }
      held=periodic?Math.min(.6,held+dt):Math.max(0,held-2*dt);
      return held>=.22;
    }
    return {sample,close,track:stream.getAudioTracks()[0],context};
  } catch(error){close();throw error;}
}
