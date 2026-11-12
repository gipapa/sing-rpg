// A request may finish after the user has returned to camp or hidden the page.
export function battleScreenLock(status) {
  let wanted = false;
  let generation = 0;
  let sentinel = null;

  async function update() {
    const request = ++generation;
    if (!wanted || document.hidden) {
      const previous = sentinel;
      sentinel = null;
      if (previous) await previous.release().catch(() => {});
      return;
    }
    if (sentinel && !sentinel.released) return;
    if (!navigator.wakeLock) {
      status.textContent = '瀏覽器未支援螢幕常亮';
      return;
    }
    status.textContent = '正在要求螢幕常亮';
    try {
      const lock = await navigator.wakeLock.request('screen');
      if (request !== generation) {
        await lock.release();
        return;
      }
      sentinel = lock;
      status.textContent = '螢幕常亮中';
      lock.addEventListener('release', () => {
        if (sentinel !== lock) return;
        sentinel = null;
        status.textContent = '系統已解除螢幕常亮';
      });
    } catch {
      if (request === generation) status.textContent = '系統未允許螢幕常亮';
    }
  }
  document.addEventListener('visibilitychange', update);
  return active => {
    wanted = active;
    void update();
  };
}
