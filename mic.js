export function echoSettings(game = {}) {
  return {
    enabled: game.echoEnabled === true,
    delay: typeof game.echoDelay === 'number' && Number.isFinite(game.echoDelay)
      ? Math.max(0, Math.min(1000, game.echoDelay))
      : 200
  };
}

export function microphoneSettings(game = {}) {
  const number = (value, fallback, min, max) => typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value)) : fallback;
  return {
    source: ['none', 'default', 'phone'].includes(game.micSource) || (typeof game.micSource === 'string'
      && game.micSource.startsWith('device:') && game.micSource.length > 7) ? game.micSource : 'none',
    session: ['auto', 'play-and-record'].includes(game.micSessionType) ? game.micSessionType : 'play-and-record',
    latency: ['interactive', 'balanced', 'playback'].includes(game.micLatencyHint) ? game.micLatencyHint : 'interactive',
    echoCancellation: typeof game.micEchoCancellation === 'boolean' ? game.micEchoCancellation : true,
    noiseSuppression: game.micNoiseSuppression === true,
    autoGainControl: game.micAutoGainControl === true,
    threshold: number(game.micThreshold, 2, .1, 20),
    cooldown: number(game.micCooldown, 1000, 300, 3000)
  };
}

// One linear RMS pass, with a short hold to reject brief clicks. The battle
// clock handles attack cooldown separately so silence never freezes the timer.
export function soundDetector(threshold = .02) {
  let held = 0;
  return {
    sample(samples, dt) {
      let power = 0;
      for (const value of samples) power += value * value;
      const loud = samples.length > 0 && Math.sqrt(power / samples.length) >= threshold;
      held = loud ? Math.min(.15, held + dt) : 0;
      return held >= .15;
    },
    reset() { held = 0; }
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

// Only auto and play-and-record are compatible with microphone capture.
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

// Device labels may be hidden until permission is granted. Temporary permission
// capture is always stopped, including when enumeration fails.
export async function listMicrophones(host = navigator, audio = true) {
  const devices = host.mediaDevices;
  if (!devices?.enumerateDevices) throw Error('這個瀏覽器無法列出麥克風，請用 Safari 或 Chrome 重試。');
  let stream;
  try {
    let inputs = await devices.enumerateDevices();
    if (!inputs.some(device => device.kind === 'audioinput' && device.deviceId && device.label)) {
      stream = await devices.getUserMedia({ audio });
      inputs = await devices.enumerateDevices();
    }
    return inputs.filter(device => device.kind === 'audioinput' && device.deviceId
      && !['default', 'communications'].includes(device.deviceId));
  } finally {
    stream?.getTracks().forEach(track => track.stop());
  }
}

export async function selectedMicrophone(deviceId, audio, host = navigator) {
  if (host.mediaDevices.getSupportedConstraints?.().deviceId === false) {
    throw Error('這個瀏覽器不支援指定麥克風。請改用系統預設，或使用 Safari／Chrome 重試。');
  }
  let stream;
  try {
    stream = await host.mediaDevices.getUserMedia({ audio: { ...audio, deviceId: { exact: deviceId } } });
    const track = stream.getAudioTracks()[0];
    if (!track || track.getSettings().deviceId !== deviceId) {
      throw Error('瀏覽器未使用指定的麥克風，已停止收音。請重新讀取麥克風清單後再試。');
    }
    return stream;
  } catch (error) {
    stream?.getTracks().forEach(track => track.stop());
    if (['OverconstrainedError', 'NotFoundError'].includes(error.name)) {
      throw Error('指定的麥克風無法使用，請確認連線並重新讀取麥克風清單。');
    }
    throw error;
  }
}

// Never silently fall back to the car/default input when built-in is requested.
export async function phoneMicrophone(host = navigator, audio = {
  echoCancellation: false, autoGainControl: false, noiseSuppression: false
}) {
  if (host.mediaDevices?.getSupportedConstraints?.().deviceId === false) {
    throw Error('無法確認手機內建麥克風：瀏覽器不支援指定裝置。');
  }
  const inputs = await listMicrophones(host, audio);
  const phone = inputs.find(device => /\biPhone\b|\bbuilt[ -]?in\b|\binternal\b|內建|内建|內置|内置/i.test(device.label));
  if (!phone) throw Error('無法確認手機內建麥克風，已停止啟動。請讀取麥克風清單後選擇裝置。');
  return selectedMicrophone(phone.deviceId, audio, host);
}

// Playback stays in Apple's player. Microphone processing stays on the device.
export async function listen(game = {}) {
  const settings = microphoneSettings(game);
  if (settings.source === 'none') return null;
  if(!navigator.mediaDevices?.getUserMedia) throw Error('這個瀏覽器沒有提供麥克風，請用 Safari 或 Chrome 開啟。');
  const Audio = window.AudioContext || window.webkitAudioContext;
  const context = new Audio({ latencyHint: settings.latency });
  let stream;
  let restoreSession = () => {};
  function close(){
    stream?.getTracks().forEach(track=>track.stop());
    if(context.state!=='closed')context.close().catch(()=>{});
    restoreSession();
  }
  try {
    restoreSession = microphoneSession(navigator, settings.session);
    await context.resume();
    const audio = { echoCancellation: settings.echoCancellation,
      autoGainControl: settings.autoGainControl, noiseSuppression: settings.noiseSuppression };
    stream = settings.source === 'phone' ? await phoneMicrophone(navigator, audio)
      : settings.source.startsWith('device:') ? await selectedMicrophone(settings.source.slice(7), audio)
        : await navigator.mediaDevices.getUserMedia({ audio });
    const track = stream.getAudioTracks()[0];
    const source=context.createMediaStreamSource(stream);
    connectEcho(context, source, game);
    const filter=context.createBiquadFilter();
    filter.type='bandpass';filter.frequency.value=750;filter.Q.value=.48;
    const analyser=context.createAnalyser();
    analyser.fftSize=512;
    analyser.smoothingTimeConstant=0;
    source.connect(filter).connect(analyser);
    const samples=new Float32Array(analyser.fftSize);
    const detector = soundDetector(settings.threshold / 100);
    function sample(dt){
      if(context.state!=='running'||track.muted||track.readyState==='ended'){detector.reset();return false;}
      analyser.getFloatTimeDomainData(samples);
      return detector.sample(samples, dt);
    }
    return {sample, close, track, context, cooldown: settings.cooldown / 1000};
  } catch(error){close();throw error;}
}
