export function echoSettings(game = {}) {
  return {
    enabled: game.echoEnabled === true,
    delay: typeof game.echoDelay === 'number' && Number.isFinite(game.echoDelay)
      ? Math.max(0, Math.min(1000, game.echoDelay))
      : 200
  };
}

// Route one delayed copy to the speakers. There is no feedback connection.
export function connectEcho(context, source, game) {
  const delay = context.createDelay(1);
  const settings = echoSettings(game);
  delay.delayTime.value = settings.delay / 1000;
  if (settings.enabled) source.connect(delay).connect(context.destination);
  return delay;
}

// Request the communication session used by WebKit's video-chat audio mode.
// The OS still chooses the physical output route.
export function microphoneSession(host = navigator, type = 'play-and-record') {
  const session = host.audioSession;
  if (!session) return () => {};
  const previous = session.type;
  try {
    session.type = type;
  } catch {
    return () => {};
  }
  return () => {
    try {
      if (session.type === type) session.type = previous;
    } catch { /* Some browsers expose a read-only session. */ }
  };
}

// Device labels are exposed only after permission is granted. Never fall back to
// an external/default microphone in this experiment if the built-in is unknown.
export async function phoneMicrophone(host = navigator) {
  const devices = host.mediaDevices;
  const audio = { echoCancellation: false, autoGainControl: false, noiseSuppression: false };
  const unavailable = () => Error('無法確認手機內建麥克風，藍牙音響測試未啟動。請用 iPhone 的 Safari 重試。');
  if (!devices?.enumerateDevices || devices.getSupportedConstraints?.().deviceId === false) throw unavailable();
  let stream;
  try {
    let inputs = await devices.enumerateDevices();
    const findPhone = () => inputs.find(device => device.kind === 'audioinput' && device.deviceId
      && !['default', 'communications'].includes(device.deviceId)
      && /\biPhone\b|\bbuilt[ -]?in\b|\binternal\b|內建|内建|內置|内置/i.test(device.label));
    let phone = findPhone();
    if (!phone) {
      stream = await devices.getUserMedia({ audio });
      inputs = await devices.enumerateDevices();
      phone = findPhone();
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
    if (!phone) throw unavailable();
    stream = await devices.getUserMedia({ audio: { ...audio, deviceId: { exact: phone.deviceId } } });
    const track = stream.getAudioTracks()[0];
    if (!track || track.getSettings().deviceId !== phone.deviceId) throw unavailable();
    return stream;
  } catch (error) {
    stream?.getTracks().forEach(track => track.stop());
    throw error;
  }
}

// Playback stays in Apple's player. Microphone processing stays on the device.
export async function listen(game = {}, { bluetoothTest = false } = {}) {
  if(!navigator.mediaDevices?.getUserMedia) throw Error('這個瀏覽器沒有提供麥克風，請用 Safari 或 Chrome 開啟。');
  const Audio = window.AudioContext || window.webkitAudioContext;
  const context = bluetoothTest ? new Audio({ latencyHint: 'interactive' }) : new Audio();
  let stream;
  let restoreSession = () => {};
  function close(){
    stream?.getTracks().forEach(track=>track.stop());
    if(context.state!=='closed')context.close().catch(()=>{});
    restoreSession();
  }
  try {
    // "playback" is incompatible with microphone capture in WebKit. Let iOS
    // choose a compatible session while requesting the built-in input explicitly.
    restoreSession = microphoneSession(navigator, bluetoothTest ? 'auto' : 'play-and-record');
    await context.resume();
    stream=bluetoothTest ? await phoneMicrophone() : await navigator.mediaDevices.getUserMedia({
      audio:{echoCancellation:true, autoGainControl:false, noiseSuppression:false}
    });
    const source=context.createMediaStreamSource(stream);
    connectEcho(context, source, bluetoothTest ? { echoEnabled: true, echoDelay: 0 } : game);
    const filter=context.createBiquadFilter();
    filter.type='bandpass';filter.frequency.value=750;filter.Q.value=.48;
    const analyser=context.createAnalyser();
    analyser.fftSize=2048;
    analyser.smoothingTimeConstant=0;
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
    return {sample, close, track:stream.getAudioTracks()[0], context};
  } catch(error){close();throw error;}
}
