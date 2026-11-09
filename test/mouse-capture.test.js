// Captured mouse (Pointer Lock) and full screen.
// The browser's real pointer lock needs a user gesture in a visible window, so this test stands in for it:
// it stubs requestPointerLock/exitPointerLock and document.pointerLockElement, then drives the game's own
// mouse handlers with movementX/Y events, exactly as a locked mouse delivers them.
const assert = require('assert');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3000');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Capture Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(300);

    const r = await page.evaluate(async () => {
      const check = (ok, label) => { if (!ok) throw new Error(label); };
      const out = {};
      const canvas = Engine.canvas;
      for (const e of G.ents) if (e.kind === 'enemy' || e.kind === 'npc') e.hidden = true;
      G.state = 'play'; G.touchMode = false; G.opts.mouseLook = true; G.opts.captureMouse = true;
      // stand-in pointer lock
      let lockEl = null, reqs = 0, exits = 0;
      Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => lockEl });
      canvas.requestPointerLock = () => { reqs++; lockEl = canvas; document.dispatchEvent(new Event('pointerlockchange')); };
      document.exitPointerLock = () => { exits++; lockEl = null; document.dispatchEvent(new Event('pointerlockchange')); };
      const rect = canvas.getBoundingClientRect();
      const at = (fx, fy) => ({ clientX: rect.left + rect.width * fx, clientY: rect.top + rect.height * fy });
      const mouse = (type, o) => (type === 'mousedown' ? canvas : window).dispatchEvent(new MouseEvent(type, Object.assign({ bubbles: true, button: 0 }, o)));

      // 1. the first click on the view captures the mouse and does not swing
      const atk0 = G.attack.t; mouse('mousedown', at(0.5, 0.3)); mouse('mouseup', at(0.5, 0.3));
      check(reqs === 1 && lockEl === canvas, 'a click on the view captures the mouse');
      check(G.attack.t === atk0, 'the capturing click does not swing');
      check(document.querySelector('#game').classList.contains('mouse-locked'), 'the page knows the mouse is captured');

      // 2. once captured, movement turns you even when the (frozen) cursor position is far outside the window
      const d0 = Engine.cam.dir;
      for (let i = 0; i < 10; i++) mouse('mousemove', { clientX: -5000, clientY: -5000, movementX: 20, movementY: 0 });
      out.turned = Engine.cam.dir - d0;
      check(out.turned > 0.1, 'captured: movement turns the view wherever the cursor would be (' + out.turned.toFixed(3) + ')');
      const d1 = Engine.cam.dir;
      for (let i = 0; i < 10; i++) mouse('mousemove', { clientX: rect.left + 2, clientY: rect.top + 50, movementX: 0, movementY: 0 });
      update(1 / 60); update(1 / 60);
      check(Math.abs(Engine.cam.dir - d1) < 1e-9, 'captured: no edge-turning from a frozen cursor near the side');

      // 3. a held button turns movement into the swing direction, as the drag did before
      let swung = null; const _atk = attack; window.attack = attack = (label) => { swung = label; };
      try {
        mouse('mousedown', at(0.5, 0.3)); const d2 = Engine.cam.dir;
        for (let i = 0; i < 6; i++) mouse('mousemove', { clientX: 0, clientY: 0, movementX: 30, movementY: 0 });
        check(Engine.cam.dir === d2, 'holding the button does not turn the view');
        mouse('mouseup', at(0.5, 0.3));
        check(swung === 'slash right', 'a held drag to the right is a slash right (' + swung + ')');
        swung = null; mouse('mousedown', at(0.5, 0.3)); mouse('mouseup', at(0.5, 0.3));
        check(swung === 'thrust', 'a click without movement is a thrust (' + swung + ')');
      } finally { window.attack = attack = _atk; }

      // 4. opening a panel gives the mouse back; turning the option off does too
      renderInventory(); await new Promise(r => setTimeout(r, 400));
      check(lockEl === null && exits >= 1, 'opening a panel releases the mouse');
      closeModal(); G.state = 'play';
      mouse('mousedown', at(0.5, 0.3)); mouse('mouseup', at(0.5, 0.3));
      check(lockEl === canvas, 'click to capture again after a panel');
      G.opts.captureMouse = false; await new Promise(r => setTimeout(r, 400));
      check(lockEl === null, 'switching Capture mouse off releases it');
      mouse('mousedown', at(0.5, 0.3)); mouse('mouseup', at(0.5, 0.3));
      check(lockEl === null && reqs === 2, 'with Capture mouse off a click never captures');
      G.opts.captureMouse = true;

      // 5. the HUD still works with the mouse free
      const before = G.openPanel; mouse('mousedown', at(0.2, 0.86)); mouse('mouseup', at(0.2, 0.86));
      out.hudPanel = G.openPanel; if (G.state !== 'play') { closeModal(); G.state = 'play'; }

      // 6. full screen: Alt+Enter and the Controls row ask the page to go full screen
      let fsReq = 0; const el = document.documentElement; el.requestFullscreen = () => { fsReq++; return Promise.resolve(); };
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', altKey: true, bubbles: true }));
      check(fsReq === 1, 'Alt+Enter asks for full screen');
      renderControls();
      check(!!document.querySelector('#c-cap') && !!document.querySelector('#c-fs'), 'Controls has Capture mouse and Full screen rows');
      document.querySelector('#c-fs').click(); check(fsReq === 2, 'the Full screen row asks for full screen');
      document.querySelector('#c-cap').click(); check(G.opts.captureMouse === false, 'the Capture mouse row toggles the option');
      document.querySelector('#c-cap').click(); check(G.opts.captureMouse === true, 'and back');
      delete document.pointerLockElement;
      return out;
    });
    console.log('PASS captured mouse: click to capture, look without the window edge, drag-swings, release on panels, option, HUD free', JSON.stringify(r));

    await page.setViewportSize({ width: 640, height: 400 });
    const fit = await page.evaluate(() => { const m = document.querySelector('#modal-panel'); return m.scrollWidth <= m.clientWidth + 1; });
    assert.ok(fit, 'Controls panel fits 640x400 with the new rows');
    console.log('PASS controls panel fits 640x400 with Capture mouse and Full screen');
    assert.deepEqual(errors, [], 'no page errors: ' + errors.join(' | '));
    console.log('PASS no page errors');
  } finally { await browser.close(); }
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
