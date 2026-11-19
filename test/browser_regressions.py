"""Run with python3 test/browser_regressions.py and agent-browser on PATH."""
import functools
import http.server
import os
from pathlib import Path
import subprocess
import threading

ROOT = Path(__file__).resolve().parents[1]
SESSION = f"sing-rpg-test-{os.getpid()}"
SAVE = 'JSON.parse(localStorage.getItem("sing-rpg.eight-realms-v1"))'


def browser(*args):
    return subprocess.check_output(
        ["agent-browser", "--session", SESSION, *args], text=True, timeout=45
    ).strip()


def click(selector):
    browser("scrollintoview", selector)
    browser("click", selector)


def check(condition):
    result = browser("eval", "Boolean(" + condition + ")")
    assert result == "true", f"{condition}: {result}"


def wait(condition):
    browser("wait", "--fn", condition, "--timeout", "20000")


def saves(url):
    browser("open", url)
    wait("typeof action.onclick === 'function'")
    browser("eval", "if (story.open) skipStory.click()")
    browser("tab", "new", "--label", "waiting", url)
    wait("writerWaiting.open")
    check("!action.onclick")
    browser("tab", "t1")
    click("#action")
    wait(f"{SAVE}.total > 0")
    click("#returnCamp")
    click("[data-tab=settings]")
    browser("eval", """window.put = Storage.prototype.setItem;
        Storage.prototype.setItem = function(k,v) {
          if(k === 'sing-rpg.eight-realms-v1') throw new DOMException('full','QuotaExceededError');
          return put.call(this,k,v);
        };
        heroName.value='續存測試'; nameForm.requestSubmit()""")
    wait("!saveWarning.hidden && nameStatus.textContent.includes('尚未保存')")
    check(f"{SAVE}.name !== '續存測試'")
    click("#settingsAction")
    click("#returnCamp")
    wait("settingsBattleStatus.textContent.includes('尚未保存')")
    browser("eval", "Storage.prototype.setItem = put")
    click("#retrySave")
    wait(f"saveWarning.hidden && {SAVE}.name === '續存測試'")
    expected = browser("eval", f"JSON.stringify([{SAVE}.total,{SAVE}.owned,{SAVE}.runs])")
    browser("tab", "close", "t1")
    browser("tab", "waiting")
    wait("!writerWaiting.open && playerName.textContent === '續存測試'")
    browser("reload")
    wait("playerName.textContent === '續存測試'")
    assert expected == browser("eval", f"JSON.stringify([{SAVE}.total,{SAVE}.owned,{SAVE}.runs])")
    print("PASS  single writer, quota retry, handover and reload", flush=True)


def microphone():
    click("[data-tab=settings]")
    browser("eval", """micSource.value='default'; micSource.dispatchEvent(new Event('change'));
        window.stopped = 0;
        navigator.mediaDevices.getUserMedia = () => new Promise(resolve => {
          window.releaseMic = () => resolve({getTracks:()=>[{stop:()=>window.stopped++}]});
        });""")
    click("#settingsAction")
    wait("micWaiting.open && !!window.releaseMic")
    click("#cancelMic")
    browser("eval", "releaseMic(); window.releaseMic=null")
    wait("!micWaiting.open && stopped === 1 && !document.body.classList.contains('on-quest')")
    click("#settingsAction")
    wait("micWaiting.open && !!window.releaseMic")
    click("#autoInstead")
    browser("eval", "releaseMic()")
    wait("stopped === 2 && document.body.classList.contains('on-quest') && micStatus.hidden")
    check(f"{SAVE}.micSource === 'default'")
    click("#returnCamp")
    browser("eval", """micSource.value='none'; micSource.dispatchEvent(new Event('change'));
        window.releaseMic=null; navigator.mediaDevices.enumerateDevices=async()=>[];""")
    click("#loadMicrophones")
    wait("!!window.releaseMic")
    click("#settingsAction")
    browser("eval", "releaseMic()")
    wait("stopped === 3 && document.body.classList.contains('on-quest') && !loadMicrophones.disabled")
    print("PASS  cancel microphone permission and discard late capture on auto departure", flush=True)


def songbook():
    browser("eval", r"""(async () => {
      const { saveSongs } = await import('./songbook-store.js');
      await saveSongs([{id:'local-regression',chordpro:'{title: 本機曲}\n{tempo: 60}\n'+
        '|[C]本機歌詞 |'.repeat(10)}]);
      const fetchOriginal = window.fetch, gate = new Promise(r=>window.releaseDemos=r);
      window.fetch = async (...args) => {
        if(String(args[0]).endsWith('/songs/index.json')) await gate;
        return fetchOriginal(...args);
      };
    })()""")
    for width, height in [(390, 844), (844, 390)]:
        browser("set", "viewport", str(width), str(height))
        click("#battleMenuToggle")
        click("#scoreToggle")
        wait("songbookDialog.open && !scorePlay.disabled")
        check("battleTools.hidden && scoreSong.value === 'local-regression'")
        if width == 390:
            check("scoreSong.options.length === 1")
            click("#scorePlay")
            browser("eval", "window.lineBefore = scoreContent.firstChild; releaseDemos()")
            wait("scoreSong.options.length === 3")
            check("!scorePause.disabled && scoreContent.firstChild === lineBefore && scoreSong.value === 'local-regression'")
        browser("press", "Escape")
        wait("!songbookDialog.open && document.activeElement === battleMenuToggle")
    click("#returnCamp")
    print("PASS  local-first songbook, uninterrupted playback and mobile menu focus", flush=True)


def spells():
    plans = """performance.getEntriesByType('resource').filter(r =>
        /spell-(stars|rings|petals|forest|tide|forge|frost|gale|amber|thunder|eclipse)\\.js$/.test(r.name))"""
    check(f"{plans}.length === 0")
    click("[data-tab=books]")
    click("#legendTab")
    click("#legendBook article:first-child button")
    wait("spellDialog.open && spellProgress.style.width !== '0%'")
    click("#skipSpell")
    check(f"{plans}.length === 1 && {plans}[0].name.endsWith('spell-forest.js')")
    for simple in (True, False):
        # Resume a legacy save mid-battle. Keep the first automatic strike outside
        # this check so damage comes from exactly one full drum charge.
        browser("eval", f"""(() => {{
            const game = {SAVE}, trip = game.runs[game.country];
            Object.assign(trip, {{stage:'battle',hp:20,maxHp:20,charge:0}});
            game.simpleAnimations={str(simple).lower()}; game.drumVolume=0;
            localStorage.setItem('sing-rpg.eight-realms-v1', JSON.stringify(game));
        }})()""")
        browser("reload")
        wait("typeof action.onclick === 'function'")
        browser("eval", """(async () => {
            Math.random=()=>0.99; action.click();
            for(let i=0;i<20;i++) field.dispatchEvent(new PointerEvent('pointerdown',{button:0}));
            window.openedCinematic=spellDialog.open;
            if(spellDialog.open) skipSpell.click();
            await Promise.resolve();
            returnCamp.click();
        })()""")
        check(f"{SAVE}.runs[0].hp === 14 && openedCinematic === {str(not simple).lower()}")
        check(f"{plans}.length === 0" if simple else "!spellDialog.open")
    print("PASS  lazy preview, skip during load, and one damage settlement per cast", flush=True)


def fallback_storage():
    browser("eval", """(async () => {
        const {gameSave} = await import('./game-save.js');
        const a=gameSave(false), b=gameSave(false);
        const writes=await Promise.allSettled([a.write({...a.game,name:'甲'}),b.write({...b.game,name:'乙'})]);
        window.conflicts=writes.filter(x=>x.status==='rejected' && x.reason.message.includes('其他分頁')).length;
    })()""")
    check(f"conflicts === 1 && ['甲','乙'].includes({SAVE}.name)")
    print("PASS  concurrent writers without Web Locks preserve the winning save", flush=True)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


if __name__ == "__main__":
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    with http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler) as server:
        threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            saves(f"http://127.0.0.1:{server.server_port}/")
            microphone()
            songbook()
            spells()
            fallback_storage()
        finally:
            browser("close")
            server.shutdown()
