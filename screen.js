// A request may finish after the user has returned to camp or hidden the page.
export function battleScreenLock(toggle, status) {
  let battleActive = false;
  let wanted = toggle.checked;
  let generation = 0;
  let sentinel = null;

  async function update() {
    const request = ++generation;
    if (!battleActive || !wanted || document.hidden) {
      const previous = sentinel;
      sentinel = null;
      if (previous) await previous.release().catch(() => {});
      if (request === generation && !wanted) status.textContent = '螢幕常亮已關閉';
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
        if (battleActive && wanted) status.textContent = '系統已解除螢幕常亮';
      });
    } catch {
      if (request === generation) status.textContent = '系統未允許螢幕常亮';
    }
  }
  toggle.addEventListener('change', () => {
    wanted = toggle.checked;
    void update();
  });
  document.addEventListener('visibilitychange', update);
  return active => {
    battleActive = active;
    void update();
  };
}
