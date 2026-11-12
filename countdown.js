// Use a deadline so delayed browser timers still advance without extra clicks.
export function countdown(output) {
  let timer = null;
  function cancel() {
    clearInterval(timer);
    timer = null;
    output.textContent = '';
  }
  function start(seconds, message, next) {
    cancel();
    const deadline = performance.now() + seconds * 1000;
    timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
      if (remaining === 0) {
        cancel();
        next();
      } else output.textContent = message(remaining);
    }, 250);
    output.textContent = message(seconds);
  }
  return { start, cancel };
}
