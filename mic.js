// Playback stays in Apple's player. Only inspect the microphone locally.
function builtInInput(devices) {
  return devices.find(device =>
    device.kind === 'audioinput' && device.deviceId && device.deviceId !== 'default' &&
    !/bluetooth|airpods|headset|耳機/i.test(device.label) &&
    /built[- ]?in|internal mic|iphone.*(mic|麥克風)|ipad.*(mic|麥克風)|內建|内置/i.test(device.label)
  );
}

async function capture(preferBuiltIn) {
  const media = navigator.mediaDevices;
  const options = {echoCancellation:true, autoGainControl:false, noiseSuppression:false};
  const open = id => media.getUserMedia({audio:id ? {...options, deviceId:{exact:id}} : options});
  if (!preferBuiltIn || !media.enumerateDevices) return open();
  const findInput = async () => builtInInput(await media.enumerateDevices().catch(() => []));
  let target = await findInput();
  if (target) {
    try { return await open(target.deviceId); }
    catch (error) {
      if (!['OverconstrainedError','NotFoundError'].includes(error.name)) throw error;
    }
  }
  // Some browsers expose input labels only after the first permission grant.
  const first = await open();
  target = await findInput();
  if (!target || target.deviceId === first.getAudioTracks()[0].getSettings().deviceId) return first;
  first.getTracks().forEach(track => track.stop());
  try { return await open(target.deviceId); }
  catch (error) {
    if (!['OverconstrainedError','NotFoundError','NotReadableError'].includes(error.name)) throw error;
    return open();
  }
}

export async function listen(preferBuiltIn) {
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
    stream=await capture(preferBuiltIn);
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
