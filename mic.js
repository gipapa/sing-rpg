// A syllable needs both a rise in level and concentrated energy in the voice band.
// Ignore the low fundamental of our own drum, and confirm the rise on a second frame.
export function vocalOnsets(sampleRate, fftSize) {
  const binHz = sampleRate / fftSize;
  const first = Math.ceil(50 / binHz), voiceBin = Math.ceil(210 / binHz);
  const end = Math.min(fftSize / 2, Math.ceil(3200 / binHz));
  const halfWindowMs = (fftSize / sampleRate) * 500;
  let previous, envelope, noise, candidate, lastBeat;
  function reset() {
    previous = null;
    envelope = 0;
    noise = .0005;
    candidate = null;
    lastBeat = -Infinity;
  }
  reset();
  function sample(spectrum, now) {
    if (previous !== null && now - previous > 120) reset();
    const dt = previous === null ? 30 : now - previous;
    previous = now;
    let bass = 0, band = 0, peak = 0;
    for (let i = first; i < end; i++) {
      const power = 10 ** (spectrum[i] / 10);
      if (i < voiceBin) bass += power;
      else {
        band += power;
        peak = Math.max(peak, power);
      }
    }
    const level = Math.sqrt(band);
    const tonal = band > bass * .025 && peak > band * .11;
    if (!tonal) noise += (level - noise) * (1 - Math.exp(-dt / 650));
    const voiced = tonal && level > Math.max(.0012, noise * 2.1);
    const rising = level > envelope * 1.7;
    envelope += (level - envelope) * (1 - Math.exp(-dt / (level > envelope ? 105 : 45)));
    if (candidate !== null && voiced) {
      lastBeat = candidate;
      candidate = null;
      return lastBeat;
    }
    candidate = voiced && rising && now - halfWindowMs - lastBeat >= 190 ? now - halfWindowMs : null;
    return null;
  }
  return { sample, reset };
}

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
    analyser.smoothingTimeConstant=0;
    source.connect(filter).connect(analyser);
    const samples=new Float32Array(analyser.fftSize);
    const spectrum = new Float32Array(analyser.frequencyBinCount);
    const onsets = vocalOnsets(context.sampleRate, analyser.fftSize);
    function sampleBeat(now) {
      analyser.getFloatFrequencyData(spectrum);
      return onsets.sample(spectrum, now);
    }
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
    return {sample, sampleBeat, resetBeats: onsets.reset, close, track:stream.getAudioTracks()[0], context};
  } catch(error){close();throw error;}
}
