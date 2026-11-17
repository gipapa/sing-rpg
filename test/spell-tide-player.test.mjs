import test from 'node:test';
import assert from 'node:assert/strict';
import { tidePlan } from '../spell-tide.js';
import { legends } from '../legends.js';
import { monsters, realms } from '../catalog.js';

// Exercise the real scene and dialog player, including their exit/clock contract.
test('trident player: full scene, preview, reduced motion, hidden pause and all exits', async () => {
  const keys = ['document', 'requestAnimationFrame', 'cancelAnimationFrame', 'matchMedia'];
  const descriptors = keys.map(key => Object.getOwnPropertyDescriptor(globalThis, key));
  function context() {
    let depth = 0;
    return new Proxy({}, {
      get(target, key) {
        if (key in target) return target[key];
        if (key === 'save') return () => { depth++; };
        if (key === 'restore') return () => { assert.ok(depth > 0, 'balanced canvas stack'); depth--; };
        if (key === 'createLinearGradient' || key === 'createRadialGradient') return (...args) => {
          assert.ok(args.every(Number.isFinite));
          if (key === 'createRadialGradient') assert.ok(args[2] >= 0 && args[5] >= 0);
          return { addColorStop: n => assert.ok(n >= 0 && n <= 1) };
        };
        return (...args) => {
          for (const arg of args) if (typeof arg === 'number') assert.ok(Number.isFinite(arg), key);
          if (key === 'arc' || key === 'ellipse') assert.ok(args[2] >= 0);
        };
      },
      set(target, key, value) { target[key] = value; return true; }
    });
  }
  const canvas = (width = 480, height = 208) => {
    const c = context(); return { width, height, getContext: () => c };
  };
  let rafId = 0, queue = new Map(), reduced = false;
  globalThis.document = { hidden: false, querySelector: () => canvas(), createElement: () => canvas() };
  globalThis.requestAnimationFrame = fn => { queue.set(++rafId, fn); return rafId; };
  globalThis.cancelAnimationFrame = id => queue.delete(id);
  globalThis.matchMedia = () => ({ get matches() { return reduced; } });
  try {
    const { spellCinematic } = await import('../spell-cinematic.js');
    const legend = legends[1], style = { spell: legend.spell, color: legend.color };
    const scene = { country: 1, area: { land: 3, element: realms[1].sub[0] }, gear: [-1, -1, legend.id],
      foe: monsters.find(m => m.country === 1 && m.base === 3) };
    const captions = new Set(), handlers = {};
    const nodes = { canvas: canvas(960, 480), '#spellProgress': { style: {} }, '#skipSpell': {}, '#spellTitle': {}, '#spellCaster': {},
      '#spellShot': { set textContent(v) { captions.add(v); } } };
    const dialog = { open: false, style: { setProperty() {} }, querySelector: s => nodes[s],
      addEventListener: (name, fn) => { handlers[name] = fn; },
      showModal() { this.open = true; }, close() { this.open = false; handlers.close?.(); } };
    const player = spellCinematic(dialog);
    let now = performance.now();
    function tick(ms = 20) {
      now += ms;
      const pending = [...queue.values()]; queue.clear(); pending.forEach(fn => fn(now));
    }
    for (const fewer of [false, true]) for (const foe of [scene.foe, null]) {
      reduced = fewer; captions.clear();
      let settled = 0;
      const result = player.play(style, { ...scene, foe }, '示範主角').then(value => { settled++; return value; });
      // Actual time is capped to 100 ms/frame, so drive enough frames for the full duration.
      for (let i = 0; i < 40; i++) tick();
      document.hidden = true;
      const progress = nodes['#spellProgress'].style.width;
      for (let i = 0; i < 30; i++) tick();
      assert.equal(nodes['#spellProgress'].style.width, progress, 'hidden tab pauses');
      document.hidden = false;
      for (let i = 0; i < tidePlan.duration / 20 + 2; i++) tick();
      assert.equal(await result, true);
      assert.equal(dialog.open, false);
      assert.equal(captions.size, tidePlan.shots.length);
      assert.equal(queue.size, 0);
      nodes['#skipSpell'].onclick(); handlers.close(); player.cancel();
      assert.equal(settled, 1, 'completed playback resolves once');
    }
    for (const exit of ['skip', 'escape', 'cancel', 'close']) {
      const result = player.play(style, scene, '示範主角'); tick();
      if (exit === 'skip') nodes['#skipSpell'].onclick();
      if (exit === 'escape') { let prevented = false; handlers.cancel({ preventDefault() { prevented = true; } }); assert.ok(prevented); }
      if (exit === 'cancel') player.cancel();
      if (exit === 'close') dialog.close();
      assert.equal(await result, exit === 'skip' || exit === 'escape', exit);
      assert.equal(queue.size, 0);
    }
    const replaced = player.play(style, scene, '舊預覽');
    const replacement = player.play(style, scene, '新預覽');
    assert.equal(await replaced, false);
    nodes['#skipSpell'].onclick(); assert.equal(await replacement, true);
  } finally {
    keys.forEach((key, i) => descriptors[i] ? Object.defineProperty(globalThis, key, descriptors[i]) : delete globalThis[key]);
  }
});
