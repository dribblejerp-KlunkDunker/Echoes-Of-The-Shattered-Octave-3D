// PREVIEW_URL=http://127.0.0.1:3824 PLAYWRIGHT_MODULE=/path/to/playwright node test/companion-talk.test.js
// Phase 9 TALK: real conversations with the companions (js/companion-talk.js).
//  * gating by existing flags, per companion, over several flag states ("about you" needs three other topics heard)
//  * every node offers two or three replies; every topic is 2-4 beats; once-only (a bit in G.flags.p9t_t)
//  * approval applied exactly once (live meter + the saved bank), partial topics cost nothing, restored after save/load
//  * Lyra's three voice states agree with voices.js (clear / silent slate in capitals / "her own ruined voice")
//  * save/load keeps the talked bits; an old save without p9t_ flags works; hostile values are all read as 0
//  * the camp Talk button never runs any NPC quest() (those mutate flags)
//  * 640x400 fit, keyboard, controller, touch; the party panel button, the HUD button, calm-only
//  * the small permanent unlocks; the Options switch off = the original game; no markup built from save data
//  * the French tsv covers every string
//  * no page errors
'use strict';
const fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
let fails = 0;
function ok(cond, label, extra) { console.log((cond ? 'PASS ' : 'FAIL ') + label + (!cond && extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

async function boot(browser, opts) {
  const ctx = await browser.newContext({ viewport: (opts && opts.viewport) || { width: 1280, height: 800 }, hasTouch: !!(opts && opts.touch) });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3824');
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof PRESETS !== 'undefined' && typeof COMPANION_TALK !== 'undefined');
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Reader');
  await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click(); await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
  await page.waitForTimeout(400);
  // helpers that live in the page
  await page.evaluate(() => {
    for (const id in G.maps) for (const e of G.maps[id].entities) if (e.kind === 'enemy') e.hidden = true;
    window.__reset = (flags, partyId) => {
      try { COMPANION_TALK.close(); } catch (e) { /* ignore */ }
      try { hide('#event'); } catch (e) { /* ignore */ }
      G.flags = Object.assign({}, flags || {}); G.party = null; G.state = 'play'; G.openPanel = null; G.dead = false;
      G.ents = G.ents.filter(e => !e.__fake);
      COMPANION_TALK.setOn(true);
      if (partyId) { G.flags.part4 = true; partyJoin(partyId); G.party.approval = 50; }
      return true;
    };
    window.__fake = (state, x, y) => {
      const base = Object.values(G.maps).flatMap(m => m.entities).find(e => e.kind === 'enemy' && e.def);
      return Object.assign({}, base, { __fake: 1, state, x, y, dead: false, hidden: false, hp: 99999 });
    };
    window.__avail = (who, src) => COMPANION_TALK.available(who, src).map(t => t.id);
    // play a topic through the real buttons; picks[i] = which visible reply to press at step i
    window.__play = (tid, picks) => {
      const T = COMPANION_TALK, t = T.TOPICS.find(x => x.id === tid);
      T.begin(t); const chosen = [];
      for (let i = 0; i < 12; i++) {
        const bs = Array.from(document.querySelectorAll('#p9t-opts button:not([disabled])'));
        if (!bs.length || (bs.length === 1 && bs[0].textContent === T.TXT.go)) break;
        const k = Math.min(picks && picks[i] != null ? picks[i] : 0, bs.length - 1);
        chosen.push(bs[k].textContent); bs[k].click();
      }
      return chosen;
    };
    window.__logText = () => Array.from(document.querySelectorAll('#p9t-log > div')).map(d => d.textContent);
    // every path through a topic's visible replies: [{path, sum, unlocks}]
    window.__paths = (tid, ctx) => {
      const T = COMPANION_TALK, t = T.TOPICS.find(x => x.id === tid), c = Object.assign({ lyra: 'clear', frag: 'none', heard: () => 9 }, ctx || {}), out = [], keep = T.state.c;
      T.state.c = c;
      const walk = (node, path, sum, us) => {
        const opts = T.optionsOf(node);
        if (!opts.length) { out.push({ path, sum, us }); return; }
        opts.forEach((o, i) => walk(o.n || { s: null, o: [] }, path.concat(i), sum + (o.a || 0), o.u ? us.concat(o.u) : us));
      };
      walk(t.root(c), [], 0, []);
      T.state.c = keep; return out;
    };
    window.__logTextHas = (s) => window.__logText().some(t => t.indexOf(s) >= 0);
  });
  return { page, errors, ctx };
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const allErrors = [];
  try {
    const { page, errors } = await boot(browser);
    const E = (fn, arg) => page.evaluate(fn, arg);

    // ------------------------------------------------------------------ the tables
    const shape = await E(() => {
      const T = COMPANION_TALK, out = { topics: T.TOPICS.length, per: {}, bad: [] };
      const ctxs = [];
      for (const lyra of ['clear', 'silent', 'ruined']) for (const frag of ['none', 'scribe', 'bettis', 'both']) ctxs.push({ lyra, frag, heard: () => 9 });
      const flagSets = [{}, { kaelen_dw_done: true }, { kaelen_told_now: true }, { lyra_voice: true }, { kaelen_dw_done: true, kaelen_told_now: true, lyra_voice: true }];
      const keep = G.flags;
      try {
        for (const t of T.TOPICS) {
          out.per[t.who] = (out.per[t.who] || 0) + 1;
          for (const fs_ of flagSets) for (const c of ctxs) {
            G.flags = Object.assign({}, fs_); T.state.c = c;
            const walk = (node, depth) => {
              if (depth > 3) { out.bad.push(t.id + ' deeper than 3 levels'); return; }
              const opts = T.optionsOf(node);
              if (!opts.length) return;                                     // a leaf: the reply of the last choice is the final beat
              if (opts.length < 2 || opts.length > 3) out.bad.push(t.id + ' offers ' + opts.length);
              const tones = new Set(opts.map(o => o.k)); if (tones.size < 2) out.bad.push(t.id + ' has one tone');
              for (const o of opts) {
                if (typeof o.t !== 'string' || !o.t) out.bad.push(t.id + ' empty reply');
                if (o.n) walk(o.n, depth + 1);
              }
            };
            walk(t.root(c), 1);
          }
        }
      } finally { G.flags = keep; }
      return out;
    });
    ok(shape.topics >= 20, 'there are ' + shape.topics + ' topics', shape.topics);
    ok(shape.per.kaelen >= 4 && shape.per.lyra >= 4 && shape.per.sable >= 4 && shape.per.vane >= 3 && shape.per.aegis >= 2, 'topics per companion ' + JSON.stringify(shape.per), shape.per);
    ok(shape.bad.length === 0, 'every node offers 2-3 replies in at least two tones, and topics are at most 4 beats deep', shape.bad.slice(0, 5));

    // ------------------------------------------------------------------ gating
    // Kaelen
    await E(() => __reset({}, null));
    ok(same(await E(() => __avail('kaelen', 'kaelen_dw')), ['k_arm']), 'Kaelen, nothing known: only the first topic');
    await E(() => __reset({ kaelen_met: 1, coil_done: 1 }));
    ok(same(await E(() => __avail('kaelen')), ['k_arm', 'k_foundry']), 'Kaelen after the coil: the Foundry opens');
    await E(() => __reset({ coil_done: 1 }));
    ok(same(await E(() => __avail('kaelen')), ['k_arm']), 'the Foundry needs kaelen_met as well');
    await E(() => __reset({ kaelen_met: 1, part3: 1 }));
    ok(same(await E(() => __avail('kaelen')), ['k_arm', 'k_foundry', 'k_synod', 'k_lyra']), 'Kaelen in part three');
    await E(() => __reset({ kaelen_met: 1, part4: 1 }));
    ok(same(await E(() => __avail('kaelen')), ['k_arm', 'k_foundry', 'k_synod', 'k_lyra', 'k_listen']), 'Kaelen in part four: what he hears, but not "about you" yet');
    await E(() => { __reset({ kaelen_met: 1, part4: 1 }); G.flags.p9t_t = (1 << 0) | (1 << 1); });
    ok(!(await E(() => __avail('kaelen'))).includes('k_you'), '"About you" stays shut with two other topics heard');
    await E(() => { __reset({ kaelen_met: 1, part4: 1 }); G.flags.p9t_t = (1 << 0) | (1 << 1) | (1 << 2); });
    ok((await E(() => __avail('kaelen'))).includes('k_you'), '"About you" opens after three other topics');
    await E(() => { __reset({ kaelen_met: 1, part3: 1 }); G.flags.p9t_t = 7; });
    ok(!(await E(() => __avail('kaelen'))).includes('k_you'), '"About you" needs part four as well');
    // Lyra
    await E(() => __reset({}));
    ok(same(await E(() => __avail('lyra', 'lyra')), []), 'Lyra, not met: nothing');
    await E(() => __reset({ lyra_met: 1 }));
    ok(same(await E(() => __avail('lyra', 'lyra')), ['l_reeds']), 'Lyra once met: the reeds');
    await E(() => __reset({ lyra_dw_met: 1, part3: 1 }));
    ok(same(await E(() => __avail('lyra', 'lyra_dw')), ['l_reeds', 'l_tobin', 'l_rite', 'l_hedge', 'l_sing']), 'Lyra in part three at the Deep Woods camp');
    await E(() => __reset({ lyra_met: 1, part3: 1 }));
    ok(!(await E(() => __avail('lyra', 'lyra'))).includes('l_sing'), '"What she would sing" needs a Whisper-Grove or Deep Woods meeting');
    await E(() => __reset({ lyra_met: 1, greening: 1 }));
    ok((await E(() => __avail('lyra', 'lyra'))).includes('l_hedge'), 'the Hedge topic opens on the Hedge flags alone');
    await E(() => { __reset({ lyra_dw_met: 1, part4: 1 }); G.flags.p9t_t = (1 << 8) | (1 << 9) | (1 << 10); });
    ok((await E(() => __avail('lyra', 'lyra_dw'))).includes('l_you'), 'Lyra "about you" after three heard');
    // Sable
    await E(() => __reset({ sable_met: 1 }));
    ok(same(await E(() => __avail('sable', 'sable_dw')), []), 'Sable met but not with you: no conversation yet');
    await E(() => __reset({ sable_met: 1, sable_with: 1 }));
    ok(same(await E(() => __avail('sable', 'sable_dw')), ['s_ledger', 's_veil', 's_schedule']), 'Sable with you: ledger, veil, schedule');
    await E(() => __reset({ sable_wg_met: 1, sable_joined: 1, aegis_calmed: 1 }));
    ok(same(await E(() => __avail('sable', 'sable_dw')), ['s_ledger', 's_veil', 's_schedule', 's_boy']), 'Sable after the Aegis is calmed: the boy in the Cloister');
    await E(() => { __reset({ sable_met: 1, sable_with: 1, part4: 1 }); G.flags.p9t_t = (1 << 16) | (1 << 17) | (1 << 18); });
    ok((await E(() => __avail('sable', 'sable_dw'))).includes('s_you'), 'Sable "about you" needs part four, her company and three heard');
    // Vane
    await E(() => __reset({}));
    ok(same(await E(() => __avail('vane', 'vane_dw')), []), 'Vane, not met: nothing');
    await E(() => __reset({ dw_vane_met: 1 }));
    ok(same(await E(() => __avail('vane', 'vane_dw')), ['v_kestrel']), 'Vane met: the Kestrel');
    await E(() => __reset({ vane_told: 1 }));
    ok(same(await E(() => __avail('vane', 'vane_dw')), ['v_crates']), 'Vane told: the crates');
    await E(() => __reset({ dw_vane_met: 1, part4: 1 }));
    ok(same(await E(() => __avail('vane', 'vane_dw')), ['v_kestrel', 'v_crates', 'v_cutter']), 'Vane in part four: the cutter\'s hold');
    await E(() => __reset({ tank_patched: 1 }));
    ok((await E(() => __avail('vane', 'vane_dw'))).includes('v_lift'), 'the lift-off conversation needs the tank patched');
    // Aegis
    await E(() => __reset({}));
    ok(same(await E(() => __avail('aegis', 'aegis_dw')), []), 'the Aegis, not calmed: nothing');
    await E(() => __reset({ aegis_calmed: 1 }));
    ok(same(await E(() => __avail('aegis', 'aegis_dw')), ['a_singers']), 'the calmed Aegis: the singers');
    await E(() => __reset({ aegis_calmed: 1, cloak_given: 1 }));
    ok(same(await E(() => __avail('aegis', 'aegis_dw')), ['a_singers', 'a_cloak']), 'the Aegis with the cloak given: the red cloak');
    await E(() => __reset({ aegis_calmed: 1, cloak_given: 1 }));
    ok(same(await E(() => __avail('nobody', 'x')), []) && same(await E(() => __avail('__proto__', 'x')), []), 'unknown partners offer nothing');

    // ------------------------------------------------------------------ once-only and approval, applied once
    await E(() => __reset({ kaelen_met: 1, part4: 1 }, 'kaelen'));
    await E(() => COMPANION_TALK.open('kaelen', 'kaelen', 'party'));
    ok(await E(() => G.openPanel === 'ctalk' && COMPANION_TALK.state.open), 'the panel opens for the active companion');
    const picked = await E(() => __play('k_arm', [1]));       // "Then let me take the front." (steady, +3)
    const a1 = await E(() => ({ appr: G.party.approval, bank: COMPANION_TALK.bankOf('kaelen'), t: COMPANION_TALK.talkedBits() }));
    ok(a1.appr === 53 && a1.bank === 3 && (a1.t & 1) === 1, 'finishing a topic applies its approval once: meter ' + a1.appr + ', bank ' + a1.bank + ', talked bit set (' + picked.join(' | ') + ')', a1);
    await E(() => COMPANION_TALK.renderList());
    const listed = await E(() => Array.from(document.querySelectorAll('#p9t-opts button')).map(b => ({ t: b.textContent, d: b.disabled })));
    ok(listed.some(b => b.d && /The arm/.test(b.t)) && listed.some(b => !b.d), 'a spent topic stays in the list, greyed and disabled', listed);
    await E(() => { document.querySelectorAll('#p9t-opts button').forEach(b => b.click()); });
    const a2 = await E(() => ({ appr: G.party.approval, bank: COMPANION_TALK.bankOf('kaelen') }));
    ok(a2.appr === 53 && a2.bank === 3, 'pressing a spent topic again does nothing (approval still applied once)', a2);
    await E(() => { COMPANION_TALK.renderList(); const t = COMPANION_TALK.TOPICS.find(x => x.id === 'k_foundry'); COMPANION_TALK.begin(t); });
    await E(() => { const b = document.querySelector('#p9t-opts button'); b.click(); });                // one reply, leaves via "Back" before the end?
    await E(() => document.getElementById('p9t-back').click());
    // k_foundry replies are single-beat: it completes at once. Use a two-level topic for the half-told case instead.
    await E(() => __reset({ kaelen_met: 1, part4: 1 }, 'kaelen'));
    await E(() => COMPANION_TALK.open('kaelen', 'kaelen', 'party'));
    await E(() => { COMPANION_TALK.begin(COMPANION_TALK.TOPICS.find(x => x.id === 'k_arm')); });
    const half = await E(() => ({ appr: G.party.approval, t: COMPANION_TALK.talkedBits(), n: document.querySelectorAll('#p9t-opts button').length }));
    ok(half.appr === 50 && half.t === 0 && half.n >= 2, 'a topic only begun costs nothing and is not spent', half);
    await E(() => document.getElementById('p9t-back').click());
    ok(await E(() => COMPANION_TALK.state.view === 'list' && COMPANION_TALK.talkedBits() === 0 && G.party.approval === 50), 'backing out of a half-told topic leaves it unspent');
    await E(() => { __play('k_arm', [0]); });                 // "Does it hurt?" kind
    const a3 = await E(() => ({ appr: G.party.approval, bank: COMPANION_TALK.bankOf('kaelen') }));
    ok(a3.appr > 50 && a3.bank === a3.appr - 50, 'a kind reply moves approval up and the bank agrees', a3);
    // a disapproving reply
    await E(() => { __reset({ kaelen_met: 1, part4: 1 }, 'kaelen'); COMPANION_TALK.open('kaelen', 'kaelen', 'party'); document.getElementById('msgs').textContent = ''; });
    const neg = await E(() => __paths('k_arm').filter(p => p.sum < 0)[0]);
    ok(!!neg, 'Kaelen\'s first topic has a path that costs approval (a blunt answer)');
    await E((p) => __play('k_arm', p), neg ? neg.path : [0]);
    const a4 = await E(() => ({ appr: G.party.approval, bank: COMPANION_TALK.bankOf('kaelen'), msgs: Array.from(document.querySelectorAll('#msgs .m')).map(m => m.textContent) }));
    ok(neg && a4.appr === 50 + neg.sum && a4.bank === neg.sum && a4.msgs.some(m => /^Kaelen disapproves \(-\d: something you said\)\.$/.test(m)), 'a blunt reply can cost approval: meter ' + a4.appr + ', bank ' + a4.bank, a4);
    ok(a4.msgs.every(m => !/undefined|NaN|\[object/.test(m)), 'the approval message is plain text'); ok(true, 'the approval message is plain text');
    // bank limits
    const lim = await E(() => { const T = COMPANION_TALK; __reset({}); T.setBank('kaelen', 99); const hi = T.bankOf('kaelen'); T.setBank('kaelen', -99); const lo = T.bankOf('kaelen'); T.setBank('lyra', 5); T.setBank('sable', -3); return { hi, lo, l: T.bankOf('lyra'), s: T.bankOf('sable'), k: T.bankOf('kaelen') }; });
    ok(lim.hi === 15 && lim.lo === -16 && lim.l === 5 && lim.s === -3 && lim.k === -16, 'the approval bank holds -16..15 per companion without bleeding between them', lim);
    // save / load of the bank: partyJoin and restoreGame put it back
    await E(() => { __reset({ kaelen_met: 1, part4: 1 }, 'kaelen'); COMPANION_TALK.setBank('kaelen', 4); partyJoin('kaelen'); });
    ok(await E(() => G.party.approval === 54), 'joining the party puts the banked approval back on the meter (silently)');
    const rest = await E(() => {
      try {
        const snap = JSON.parse(JSON.stringify(snapshotGame()));
        G.flags = {}; G.party = null;
        restoreGame(snap);
        return { flags: { t: G.flags.p9t_t, a: G.flags.p9t_a }, bank: COMPANION_TALK.bankOf('kaelen'), ok: true };
      } catch (e) { return { ok: false, err: String(e) }; }
    });
    ok(rest.ok && rest.bank === 4, 'a save/load keeps the banked approval', rest);

    // ------------------------------------------------------------------ talked bits survive a save
    const sv = await E(() => {
      try {
        __reset({ kaelen_met: 1, part4: 1 }, 'kaelen'); COMPANION_TALK.open('kaelen', 'kaelen', 'party');
        __play('k_arm', [0]); __play('k_foundry', [0]);
        const before = COMPANION_TALK.talkedBits();
        const snap = JSON.parse(JSON.stringify(snapshotGame()));
        G.flags = {}; G.party = null; COMPANION_TALK.close();
        const cleared = COMPANION_TALK.talkedBits();
        restoreGame(snap);
        const after = COMPANION_TALK.talkedBits();
        G.flags.part4 = true; partyJoin('kaelen'); COMPANION_TALK.open('kaelen', 'kaelen', 'party');
        const dis = Array.from(document.querySelectorAll('#p9t-opts button')).filter(b => b.disabled).map(b => b.textContent.replace(/Said$/, ''));
        return { before, cleared, after, dis, ok: true };
      } catch (e) { return { ok: false, err: String(e) }; }
    });
    ok(sv.ok && sv.before === 3 && sv.cleared === 0 && sv.after === 3 && sv.dis.length === 2, 'the talked bits survive snapshot and restore, and the spent topics are greyed again', sv);
    await E(() => COMPANION_TALK.close());

    // ------------------------------------------------------------------ old saves and hostile values
    const old = await E(() => {
      __reset({ kaelen_met: 1, part3: 1, lyra_met: 1 });
      const T = COMPANION_TALK;
      return { t: T.talkedBits(), u: T.unlockBits(), b: T.bankBits(), has: Object.keys(G.flags).some(k => k.indexOf('p9t_') === 0), av: __avail('kaelen').length };
    });
    ok(old.t === 0 && old.u === 0 && old.b === 0 && !old.has && old.av >= 3, 'an old save without any p9t_ flag reads as nothing talked, and the module wrote nothing on load', old);
    const hostile = [['text', 'abc'], ['html', '<img src=x onerror=window.__xss=1>'], ['NaN', NaN], ['negative', -5], ['float', 1.5], ['huge', 1e12], ['2^29', Math.pow(2, 29)], ['true', true], ['object', { a: 1 }], ['array', [1, 2]], ['null', null], ['Infinity', Infinity], ['digits', '7'], ['bigint-ish', 2 ** 53]];
    let badHostile = [];
    for (const [name, val] of hostile) {
      const r = await E((v) => {
        try {
          __reset({ kaelen_met: 1, part3: 1, lyra_met: 1, lyra_dw_met: 1 }, 'kaelen');
          G.flags.p9t_t = v; G.flags.p9t_u = v; G.flags.p9t_a = v;
          const T = COMPANION_TALK;
          const r = { t: T.talkedBits(), u: T.unlockBits(), b: T.bankBits(), kb: T.bankOf('kaelen'), lb: T.bankOf('lyra') };
          T.open('kaelen', 'kaelen', 'party');
          r.opened = G.openPanel === 'ctalk'; r.buttons = document.querySelectorAll('#p9t-opts button:not([disabled])').length;
          r.xss = window.__xss === undefined && !document.querySelector('#modal-panel [onerror]');
          T.close(); partyJoin('kaelen'); r.meter = G.party.approval; r.unl = T.unlocked('kaelen', 'title');
          return r;
        } catch (e) { return { err: String(e) }; }
      }, val);
      if (r.err || r.t !== 0 || r.u !== 0 || r.b !== 0 || r.kb !== 0 || r.lb !== 0 || !r.opened || r.buttons < 2 || !r.xss || (r.meter != null && r.meter !== 50) || r.unl) badHostile.push([name, r]);
    }
    ok(badHostile.length === 0, 'hostile p9t_ values (' + hostile.map(h => h[0]).join(', ') + ') are all read as 0 and nothing is printed or built from them', badHostile.slice(0, 2));
    const hostileFlags = await E(() => {
      try {
        __reset({}, null);
        // hostile values in the flags the module reads: truthy things are just "set", and nothing is ever displayed from them
        for (const k of ['kaelen_met', 'part3', 'part4', 'lyra_met', 'lyra_voice', 'sable_met', 'sable_with', 'aegis_calmed']) G.flags[k] = '<b onmouseover=window.__xss=2>x</b>';
        G.flags.part4 = { x: 1 };
        const T = COMPANION_TALK;
        T.open('kaelen', 'kaelen', 'party');
        const txt = document.getElementById('modal-panel').innerHTML;
        const r = { opened: G.openPanel === 'ctalk', inj: /onmouseover/.test(txt), xss: window.__xss };
        T.close(); return r;
      } catch (e) { return { err: String(e) }; }
    });
    ok(!hostileFlags.err && !hostileFlags.inj && hostileFlags.xss === undefined, 'string and object game-flag values never reach the markup', hostileFlags);
    // a half-wrecked G.flags object
    const wreck = await E(() => {
      const keep = G.flags, out = [];
      for (const bad of [null, undefined, 'str', 5, []]) {
        try { G.flags = bad; const T = COMPANION_TALK; T.talkedBits(); T.available('kaelen'); T.calm(); T.bankOf('lyra'); out.push('ok'); } catch (e) { out.push('throw:' + e.message); }
      }
      G.flags = keep; return out;
    });
    ok(wreck.every(x => x === 'ok'), 'a missing or wrong-typed G.flags never throws from the module', wreck);

    // ------------------------------------------------------------------ Lyra's voice, three states
    const lyraMirror = await E(() => {
      const T = COMPANION_TALK, out = [];
      const combos = [];
      for (const wg of [0, 1]) for (const dw of [0, 1]) for (const voice of [0, 1]) combos.push({ lyra_wg_met: wg, lyra_dw_met: dw, lyra_voice: voice, lyra_met: 1 });
      for (const f of combos) for (const src of ['lyra', 'lyra_dw', 'lyra_wg']) {
        __reset(f);
        const mine = T.lyraState(src), flagsOnly = T.lyraStateFlags(src);
        let game = 'clear';
        if (typeof VOICES !== 'undefined' && VOICES.resolveNpc) { const p = VOICES.resolveNpc(src); game = p && p.silent ? 'silent' : (p && /ruined/.test(String(p.why || '')) ? 'ruined' : 'clear'); }
        if (mine !== game || flagsOnly !== game) out.push([JSON.stringify(f), src, mine, flagsOnly, game]);
      }
      return { n: combos.length * 3, out };
    });
    ok(lyraMirror.out.length === 0, 'Lyra\'s state matches voices.js for all ' + lyraMirror.n + ' flag/source combinations', lyraMirror.out.slice(0, 3));
    const states = {};
    for (const [name, flags, src] of [['clear', { lyra_met: 1, part3: 1 }, 'lyra'], ['silent', { lyra_met: 1, lyra_wg_met: 1, part3: 1 }, 'lyra'], ['ruined', { lyra_met: 1, lyra_wg_met: 1, lyra_voice: 1, part3: 1 }, 'lyra']]) {
      states[name] = await E(([f, s]) => {
        __reset(f, null);
        COMPANION_TALK.open('lyra', s, 'dialogue');
        __play('l_reeds', [0]);
        const slates = Array.from(document.querySelectorAll('#p9t-log .slate')).map(d => d.textContent);
        const spoken = Array.from(document.querySelectorAll('#p9t-log .them:not(.slate)')).map(d => d.textContent);
        const tags = document.querySelectorAll('#p9t-log .tag').length;
        const lead = Array.from(document.querySelectorAll('#p9t-log .slate')).filter(d => d.textContent.indexOf(COMPANION_TALK.TXT.slate) === 0).length;
        const r = { state: COMPANION_TALK.lyraState(s), slates, spoken, tags, lead };
        COMPANION_TALK.close(); return r;
      }, [flags, src]);
    }
    const S0 = states.clear, S1 = states.silent, S2 = states.ruined;
    ok(S0.state === 'clear' && S0.slates.length === 0 && S0.tags === 0 && S0.spoken.some(t => /^"Father set me the long cane/.test(t)), 'Lyra before Whisper-Grove speaks plainly: quoted, no slate, no tag', S0);
    ok(S1.state === 'silent' && S1.slates.length >= 2 && S1.slates.every(t => /[A-Z]/.test(t) && t.replace(TXT_SLATE(S1), '') === t.replace(TXT_SLATE(S1), '').toUpperCase()) && S1.lead === 1 && S1.tags === 0, 'Lyra silent: every line on the slate in capitals, the "writes on her slate" lead once, no spoken tag', S1);
    ok(S2.state === 'ruined' && S2.slates.length === 0 && S2.tags === 1 && S2.spoken.filter(t => /^"/.test(t)).length >= 2, 'Lyra with her voice: quoted speech, "her own ruined voice" tag once, no slate', S2);
    function TXT_SLATE(s) { return 'She writes on her slate and turns it to you: '; }

    // ------------------------------------------------------------------ no NPC quest() is ever called
    const quests = await E(() => {
      try {
        const calls = []; const saved = {};
        for (const id in NPCS) { if (typeof NPCS[id].quest === 'function') { saved[id] = NPCS[id].quest; NPCS[id].quest = function () { calls.push(id); return saved[id].apply(this, arguments); }; } }
        const T = COMPANION_TALK, flagsBefore = JSON.stringify(G.flags);
        const cases = [['kaelen', 'kaelen_dw', { kaelen_met: 1, part4: 1 }], ['lyra', 'lyra_dw', { lyra_dw_met: 1, part4: 1 }], ['sable', 'sable_dw', { sable_met: 1, sable_with: 1 }], ['vane', 'vane_dw', { dw_vane_met: 1 }], ['aegis', 'aegis_dw', { aegis_calmed: 1 }]];
        const out = [];
        for (const [who, nid, fl] of cases) {
          __reset(fl);
          DLG.npc = NPCS[nid]; DLG.ent = null; DLG.log = []; G.state = 'dialogue';
          renderDialogue();
          const b = document.getElementById('p9t-open'); if (!b) { out.push(who + ': no Talk button'); continue; }
          b.click();
          if (G.openPanel !== 'ctalk') { out.push(who + ': panel did not open'); continue; }
          const first = T.available(who, nid)[0]; __play(first.id, [0]);
          document.getElementById('p9t-back').click();             // the list
          document.getElementById('p9t-back').click();             // out of the list, back to the NPC's dialogue panel
          if (G.openPanel !== 'dialogue') out.push(who + ': did not return to the dialogue panel (' + G.openPanel + ')');
          document.getElementById('d-bye').click();
        }
        for (const id in saved) NPCS[id].quest = saved[id];
        return { calls, out };
      } catch (e) { return { err: String(e) }; }
    });
    ok(!quests.err && quests.calls.length === 0 && quests.out.length === 0, 'the camp Talk button runs for Kaelen, Lyra, Sable, Vane and the Aegis and never calls any NPC quest()', quests);
    const nonCompanion = await E(() => {
      __reset({ part4: 1 });
      const other = Object.keys(NPCS).find(id => !COMPANION_TALK.NPC_TO_WHO[id] && NPCS[id].greet);
      DLG.npc = NPCS[other]; DLG.log = []; G.state = 'dialogue'; renderDialogue();
      const r = !document.getElementById('p9t-open'); document.getElementById('d-bye').click(); return r;
    });
    ok(nonCompanion, 'no Talk button on anyone else\'s dialogue panel');
    const gated = await E(() => {
      __reset({});                                                   // Sable not with you, Aegis not calmed
      const r = {};
      for (const nid of ['sable_dw', 'aegis_dw']) { DLG.npc = NPCS[nid]; DLG.log = []; G.state = 'dialogue'; renderDialogue(); r[nid] = !!document.getElementById('p9t-open'); document.getElementById('d-bye').click(); }
      return r;
    });
    ok(!gated.sable_dw && !gated.aegis_dw, 'no Talk button on Sable before she is with you, nor on the Aegis before it is calmed', gated);

    // ------------------------------------------------------------------ entry points: party panel, HUD, E
    await E(() => { __reset({ kaelen_met: 1, part4: 1 }, 'kaelen'); partyMenu(); });
    const pm = await E(() => { const b = document.querySelector('#event-panel .list .p9t-talk'); return b ? { text: b.textContent, disabled: b.disabled } : null; });
    ok(pm && pm.text === '"Can we talk?"' && !pm.disabled, 'the party panel (E on your companion) has a "Can we talk?" choice', pm);
    await E(() => document.querySelector('#event-panel .list .p9t-talk').click());
    ok(await E(() => G.openPanel === 'ctalk' && G.state === 'dialogue' && document.querySelector('#modal-panel h2').textContent === 'Kaelen Vance'), 'it opens the conversation with Kaelen');
    await E(() => COMPANION_TALK.close());
    await E(() => { __reset({ kaelen_met: 1, part4: 1 }, 'kaelen'); partyHud(); COMPANION_TALK.refreshHud(true); });
    const hud = await E(() => { const b = document.querySelector('#party button.pt'); return b ? { text: b.textContent, shown: b.style.display !== 'none', label: b.getAttribute('aria-label'), r: b.getBoundingClientRect().toJSON() } : null; });
    ok(hud && hud.text === 'Talk' && hud.shown && hud.label === 'Talk to your companion' && hud.r.width > 8 && hud.r.height > 8, 'the party HUD has a Talk button', hud);
    await page.locator('#party button.pt').click();
    ok(await E(() => G.openPanel === 'ctalk' && COMPANION_TALK.state.who === 'kaelen'), 'pressing it opens the conversation');
    await E(() => COMPANION_TALK.close());
    ok(await E(() => G.state === 'play'), 'closing the conversation hands play back');
    for (const who of ['lyra', 'sable']) {
      const o = await E((w) => { __reset({ part4: 1, lyra_dw_met: 1, lyra_met: 1, sable_met: 1, sable_with: 1 }, w); return COMPANION_TALK.openActive() && G.openPanel === 'ctalk' && COMPANION_TALK.state.who === w; }, who);
      ok(o, 'the active companion ' + who + ' can be talked to from the party');
      await E(() => COMPANION_TALK.close());
    }
    // the E key on the companion goes through partyMenu (the game's own key handling); checked above through partyMenu itself

    // ------------------------------------------------------------------ calm only
    await E(() => { __reset({ kaelen_met: 1, part4: 1 }, 'kaelen'); const c = Engine.cam; G.ents.push(__fake('chase', c.x + 1, c.y)); });
    const blocked = await E(() => { const r = COMPANION_TALK.open('kaelen', 'kaelen', 'party'); return { r, panel: G.openPanel, calm: COMPANION_TALK.calm(), msgs: Array.from(document.querySelectorAll('#msgs .m')).map(m => m.textContent) }; });
    ok(!blocked.r && blocked.panel !== 'ctalk' && !blocked.calm && blocked.msgs.some(m => m === 'Not while danger is near.'), 'a foe chasing nearby blocks the conversation with a plain message', blocked);
    await E(() => { partyMenu(); });
    ok(await E(() => { const b = document.querySelector('#event-panel .list .p9t-talk'); return !!b && b.disabled; }), 'the party panel choice is disabled while danger is near');
    await E(() => { hide('#event'); G.state = 'play'; });
    await E(() => { G.ents = G.ents.filter(e => !e.__fake); __reset({ kaelen_met: 1, part4: 1, coda_fight: 1 }, 'kaelen'); });
    ok(await E(() => !COMPANION_TALK.calm() && !COMPANION_TALK.open('kaelen', 'kaelen', 'party')), 'a Coda fight blocks it');
    await E(() => { __reset({ kaelen_met: 1, part4: 1 }, 'kaelen'); G.escapeTimer = 30; });
    ok(await E(() => !COMPANION_TALK.calm()), 'the bore escape blocks it');
    await E(() => { G.escapeTimer = 0; G.dead = true; });
    ok(await E(() => !COMPANION_TALK.calm()), 'being dead blocks it');
    ok(await E(() => { G.dead = false; __reset({ kaelen_met: 1, part4: 1 }, 'kaelen'); const c = Engine.cam; G.ents.push(__fake('idle', c.x + 1, c.y), __fake('chase', c.x + 60, c.y)); const r = COMPANION_TALK.calm(); G.ents = G.ents.filter(e => !e.__fake); return r; }), 'a sleeping foe nearby and a far-off hunter do not block it');
    await E(() => { G.ents = G.ents.filter(e => !e.__fake); });

    // ------------------------------------------------------------------ keyboard
    await E(() => { __reset({ kaelen_met: 1, part4: 1 }, 'kaelen'); COMPANION_TALK.open('kaelen', 'kaelen', 'party'); });
    ok(await E(() => document.activeElement && document.activeElement.closest('#p9t-opts') !== null), 'the first topic button has the focus on opening');
    await page.keyboard.press('ArrowDown');
    const f1 = await E(() => Array.from(document.querySelectorAll('#p9t-opts button')).indexOf(document.activeElement));
    ok(f1 === 1, 'ArrowDown moves the focus to the next topic', f1);
    await page.keyboard.press('ArrowUp');
    ok(await E(() => Array.from(document.querySelectorAll('#p9t-opts button')).indexOf(document.activeElement) === 0), 'ArrowUp moves it back');
    await page.keyboard.press('1');
    ok(await E(() => COMPANION_TALK.state.view === 'topic' && COMPANION_TALK.state.topic.id === 'k_arm'), 'the digit 1 starts the first topic');
    await page.keyboard.press('2');
    ok(await E(() => __logTextHas('How far has it climbed')), 'the digit 2 picks the second reply');
    for (let i = 0; i < 6 && !(await E(() => document.activeElement && document.activeElement.textContent === COMPANION_TALK.TXT.go)); i++) await page.keyboard.press('1');
    await page.keyboard.press('Enter');                       // "Go on"
    ok(await E(() => COMPANION_TALK.state.view === 'list'), 'Enter on "Go on" returns to the list');
    await page.keyboard.press('Escape');
    ok(await E(() => G.state === 'play' && !COMPANION_TALK.state.open || G.openPanel !== 'ctalk'), 'Escape leaves the conversation');
    ok(await E(() => G.state === 'play'), 'and hands play back');

    // ------------------------------------------------------------------ controller
    await E(() => {
      __reset({ kaelen_met: 1, part4: 1 }, 'kaelen');
      window.__pad = { connected: true, id: 'test', index: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
      navigator.getGamepads = () => [window.__pad];
      window.__press = (i) => { window.__pad.buttons[i] = { pressed: true, value: 1 }; };
      window.__release = (i) => { window.__pad.buttons[i] = { pressed: false, value: 0 }; };
      COMPANION_TALK.open('kaelen', 'kaelen', 'party');
    });
    await page.waitForTimeout(120);
    await E(() => __press(13)); await page.waitForTimeout(120); await E(() => __release(13)); await page.waitForTimeout(80);
    ok(await E(() => Array.from(document.querySelectorAll('#p9t-opts button')).indexOf(document.activeElement) === 1), 'the controller D-pad down moves the focus');
    await E(() => __press(12)); await page.waitForTimeout(120); await E(() => __release(12)); await page.waitForTimeout(80);
    ok(await E(() => Array.from(document.querySelectorAll('#p9t-opts button')).indexOf(document.activeElement) === 0), 'D-pad up moves it back');
    await E(() => __press(0)); await page.waitForTimeout(120); await E(() => __release(0)); await page.waitForTimeout(80);
    ok(await E(() => COMPANION_TALK.state.view === 'topic'), 'A chooses the focused topic');
    await E(() => __press(0)); await page.waitForTimeout(120); await E(() => __release(0)); await page.waitForTimeout(80);
    ok(await E(() => COMPANION_TALK.state.log.some(e => e.kind === 'you')), 'A chooses the focused reply');
    await E(() => __press(1)); await page.waitForTimeout(120); await E(() => __release(1)); await page.waitForTimeout(80);
    ok(await E(() => COMPANION_TALK.state.view === 'list'), 'B goes back one step');
    await E(() => __press(1)); await page.waitForTimeout(120); await E(() => __release(1)); await page.waitForTimeout(120);
    ok(await E(() => G.openPanel !== 'ctalk' && G.state === 'play'), 'B again leaves the conversation');
    await E(() => { __reset({ kaelen_met: 1, part4: 1 }, 'kaelen'); window.__pad.buttons[0] = { pressed: true, value: 1 }; COMPANION_TALK.open('kaelen', 'kaelen', 'party'); });
    await page.waitForTimeout(200);
    ok(await E(() => COMPANION_TALK.state.view === 'list'), 'an A button still held from opening does not choose anything');
    await E(() => { COMPANION_TALK.close(); __release(0); navigator.getGamepads = () => []; });

    // ------------------------------------------------------------------ unlocks: titles, rest line, road line, journal
    await E(() => { __reset({ kaelen_met: 1, part4: 1 }, 'kaelen'); COMPANION_TALK.open('kaelen', 'kaelen', 'party'); });
    const T0 = await E(() => ({ titles: (G.player.titles || []).slice(), u: COMPANION_TALK.unlockBits() }));
    const unlockTopics = await E(() => {
      // find, from the real topic data, every reply that unlocks something, and play it through its buttons
      const T = COMPANION_TALK, found = [];
      const walk = (t, node, path) => { for (const [i, o] of (node.o || []).entries()) { if (o.u) found.push({ id: t.id, who: t.who, u: o.u, path: path.concat(i) }); if (o.n) walk(t, o.n, path.concat(i)); } };
      const c = { lyra: 'ruined', frag: 'none', heard: () => 9 };
      for (const t of T.TOPICS) walk(t, t.root(c), []);
      return found;
    });
    ok(unlockTopics.length >= 6, 'there are ' + unlockTopics.length + ' replies that unlock a small permanent thing', unlockTopics.length);
    ok(unlockTopics.every(x => ['title', 'rest', 'chat', 'journal'].includes(x.u)), 'unlocks are only titles, a rest line, a road line or a logbook entry (nothing that touches combat)', unlockTopics.map(x => x.u));
    const unlockRun = await E(() => {
      const T = COMPANION_TALK, out = { got: {}, errs: [] };
      const ALL = { kaelen_dw_done: 1, kaelen_told_now: 1, vane_vesper: 1, kaelen_met: 1, part4: 1, lyra_met: 1, lyra_dw_met: 1, sable_met: 1, sable_with: 1, dw_vane_met: 1, vane_told: 1, tank_patched: 1, aegis_calmed: 1, cloak_given: 1 };
      const srcOf = { kaelen: 'kaelen_dw', lyra: 'lyra_dw', sable: 'sable_dw', vane: 'vane_dw', aegis: 'aegis_dw' };
      __reset(ALL, 'kaelen');
      const journalBefore = G.journal.length;
      for (const k of Object.keys(T.UNLOCKS)) {
        const [who, kind] = k.split(':'), mine = T.TOPICS.filter(t => t.who === who);
        let done = false;
        for (const t of mine) {
          const unl = __paths(t.id).filter(p => p.us.includes(kind));
          if (!unl.length || done) continue;
          G.flags.p9t_t = mine.filter(x => x !== t).reduce((acc, x) => acc | (1 << x.bit), 0);     // "about you" topics need three heard
          T.open(who, srcOf[who], 'dialogue');
          __play(t.id, unl[0].path);
          if (!T.talkedHas(t)) out.errs.push(t.id + ' not finished');
          T.close(); done = true;
        }
        if (!done) out.errs.push('no path for ' + k);
      }
      for (const k of Object.keys(T.UNLOCKS)) { const [w, kind] = k.split(':'); out.got[k] = T.unlocked(w, kind); }
      out.titles = (G.player.titles || []).slice(); out.journal = G.journal.length > journalBefore ? G.journal[0].text : null;
      return out;
    });
    unlockRun.kaelen = { title: unlockRun.got['kaelen:title'], rest: unlockRun.got['kaelen:rest'], chat: unlockRun.got['kaelen:chat'], titles: unlockRun.titles };
    unlockRun.vane = { journal: unlockRun.got['vane:journal'], entry: unlockRun.journal };
    ok(unlockRun.errs.length === 0 && Object.values(unlockRun.got).every(Boolean), 'every one of the ' + Object.keys(unlockRun.got).length + ' small permanent things can be earned through its topics', unlockRun);
    ok(unlockRun.titles.includes('Load-Bearing') && unlockRun.titles.includes('Beside the Reed') && unlockRun.titles.includes('Entered in the Ledger'), 'the three titles are earned through the real earnTitle', unlockRun.titles);
    ok(unlockRun.kaelen.title && unlockRun.kaelen.titles.includes('Load-Bearing'), 'Kaelen\'s deepest topic earns the title Load-Bearing', unlockRun.kaelen);
    ok(unlockRun.kaelen.rest && unlockRun.kaelen.chat, 'Kaelen\'s rest and road lines are earned through his topics', unlockRun.kaelen);
    ok(unlockRun.vane.journal && /^Vane put the axe down/.test(unlockRun.vane.entry || ''), 'Vane\'s topic adds one logbook entry', unlockRun.vane);
    const restLine = await E(() => new Promise((res) => {
      __reset({ kaelen_met: 1, part4: 1 }, 'kaelen'); COMPANION_TALK.giveUnlock('kaelen', 'rest');
      G.party.said = {}; document.getElementById('msgs').textContent = '';
      doRest('self');
      setTimeout(() => res(Array.from(document.querySelectorAll('#msgs .m')).map(m => m.textContent)), 1500);
    }));
    ok(restLine.some(m => m === 'Kaelen: "' + 'I\'ll take first watch, and I\'ll hum where she can hear it. Nobody asked me to. Sleep.' + '"'), 'the earned rest line is said once at the fire', restLine);
    const restTwice = await E(() => new Promise((res) => { document.getElementById('msgs').textContent = ''; doRest('self'); setTimeout(() => res(Array.from(document.querySelectorAll('#msgs .m')).map(m => m.textContent)), 1500); }));
    ok(!restTwice.some(m => /first watch/.test(m)), 'and not a second time', restTwice);
    const chatLine = await E(() => {
      __reset({ kaelen_met: 1, part4: 1 }, 'kaelen'); COMPANION_TALK.giveUnlock('kaelen', 'chat'); G.party.said = {}; document.getElementById('msgs').textContent = '';
      const r = Math.random; Math.random = () => 0.1; try { partyChat(); } finally { Math.random = r; }
      return Array.from(document.querySelectorAll('#msgs .m')).map(m => m.textContent);
    });
    ok(chatLine.some(m => /^Kaelen: "Your note has been steady since the Hedge/.test(m)), 'the earned road line is said on the road', chatLine);
    const lyraLines = await E(() => {
      const out = {}; const T = COMPANION_TALK;
      for (const [name, f] of [['silent', { lyra_wg_met: 1, lyra_met: 1 }], ['ruined', { lyra_wg_met: 1, lyra_met: 1, lyra_voice: 1 }]]) {
        __reset(f, 'lyra'); T.giveUnlock('lyra', 'chat'); G.party.said = {}; document.getElementById('msgs').textContent = '';
        const r = Math.random; Math.random = () => 0.1; try { partyChat(); } finally { Math.random = r; }
        out[name] = Array.from(document.querySelectorAll('#msgs .m')).map(m => m.textContent);
      }
      return out;
    });
    ok(lyraLines.silent.some(m => /^Lyra turns her slate to you: [A-Z'., ]+$/.test(m)) && lyraLines.ruined.some(m => /^Lyra: "Envy isn't/.test(m)), 'Lyra\'s earned road line follows her voice: slate capitals when silent, quoted speech when she has it', lyraLines);

    // ------------------------------------------------------------------ the switch: off = the original game
    await E(() => { __reset({ kaelen_met: 1, part4: 1, lyra_dw_met: 1, aegis_calmed: 1 }, 'kaelen'); COMPANION_TALK.setOn(false); partyMenu(); });
    ok(await E(() => !document.querySelector('#event-panel .p9t-talk')), 'switched off: no choice in the party panel');
    await E(() => { hide('#event'); G.state = 'play'; partyHud(); COMPANION_TALK.refreshHud(true); });
    ok(await E(() => !document.querySelector('#party button.pt') || document.querySelector('#party button.pt').style.display === 'none'), 'switched off: no Talk button on the HUD');
    ok(await E(() => { DLG.npc = NPCS.kaelen_dw; DLG.log = []; G.state = 'dialogue'; renderDialogue(); const r = !document.getElementById('p9t-open'); document.getElementById('d-bye').click(); return r; }), 'switched off: no Talk... button at camp');
    ok(await E(() => !COMPANION_TALK.open('kaelen', 'kaelen', 'party') && G.openPanel !== 'ctalk'), 'switched off: the panel cannot be opened');
    const stored = await E(() => { COMPANION_TALK.setOn(false); const a = localStorage.getItem('octave.ctalk.v1'); COMPANION_TALK.setOn(true); const b = localStorage.getItem('octave.ctalk.v1'); return [a, b]; });
    ok(stored[0] === '{"on":0}' && stored[1] === '{"on":1}', 'the switch is remembered in localStorage', stored);
    await E(() => { try { closeModal(); } catch (e) { /* ignore */ } G.state = 'play'; });

    // ------------------------------------------------------------------ French coverage
    const tsvPath = path.join(__dirname, '..', 'tools', 'i18n', 'p9-talk.tsv');
    const rows = fs.readFileSync(tsvPath, 'utf8').split('\n').filter(Boolean).map(l => l.split('\t'));
    const map = new Map(rows.map(r => [r[0], r[1]]));
    ok(rows.every(r => r.length === 2 && r[1].trim() && r[0].trim()), 'p9-talk.tsv: every line is <english> TAB <french>, none empty', rows.filter(r => r.length !== 2 || !r[1].trim()).slice(0, 3));
    const cat = await E(() => COMPANION_TALK.catalog());
    const miss = [];
    for (const c of cat) {
      const forms = [c.en];
      if (c.lyra && !c.note && !c.title && !c.player && !c.line) { forms.push('"' + c.en + '"', c.en.toUpperCase()); }
      for (const f of forms) if (!map.has(f)) miss.push(f);
    }
    ok(miss.length === 0, 'p9-talk.tsv has a French line for all ' + cat.length + ' catalogue strings and Lyra\'s quoted and capital forms', miss.slice(0, 3));
    const ph = rows.filter(r => (r[0].match(/\{\d\}/g) || []).join() !== (r[1].match(/\{\d\}/g) || []).join());
    ok(ph.length === 0, 'p9-talk.tsv keeps every {n} placeholder', ph.slice(0, 2));
    const lines = ['Lyra turns her slate to you: {0}', 'Kaelen: "{0}"', 'Lyra: "{0}"', 'Sable: "{0}"', '{0} approves (+{1}: something you said).', '{0} disapproves ({1}: something you said).'];
    ok(lines.every(l => map.has(l)), 'p9-talk.tsv has the template strings', lines.filter(l => !map.has(l)));
    ok(rows.some(r => /\bChantre\b/.test(r[1])) && rows.some(r => /Note-racine/.test(r[1])) && rows.some(r => /l'Étroit/.test(r[1].replace(/\u2019/g, "'"))), 'p9-talk.tsv follows the glossary (Chantre, Note-racine, l\'Étroit)');

    allErrors.push(...errors);
  } catch (e) {
    console.log('FAIL test crashed: ' + (e && e.stack || e)); fails++;
  } finally { await browser.close(); }

  // ---------------------------------------------------------------------- 640x400 and touch
  const b2 = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const { page, errors } = await boot(b2, { viewport: { width: 640, height: 400 }, touch: true });
    const E = (fn, arg) => page.evaluate(fn, arg);
    // the HUD button at 640x400
    await E(() => { __reset({ kaelen_met: 1, part4: 1 }, 'kaelen'); partyHud(); COMPANION_TALK.refreshHud(true); });
    const hudFit = await E(() => { const b = document.querySelector('#party button.pt'), p = document.getElementById('party'); if (!b) return null; const r = b.getBoundingClientRect(), pr = p.getBoundingClientRect(), vw = innerWidth, vh = innerHeight; return { l: r.left, r: r.right, t: r.top, b: r.bottom, vw, vh, w: r.width, h: r.height, col2: (function () { const i = p.querySelector('.pn'); return !i || r.left >= i.getBoundingClientRect().left - 1; })(), overlapsPortrait: !!(function () { const i = p.querySelector('img.pp'); if (!i) return false; const q = i.getBoundingClientRect(); return !(r.right <= q.left || r.left >= q.right || r.bottom <= q.top || r.top >= q.bottom); })() }; });
    ok(hudFit && hudFit.l >= 0 && hudFit.r <= hudFit.vw && hudFit.b <= hudFit.vh && hudFit.col2 && !hudFit.overlapsPortrait && hudFit.h >= 14, '640x400: the HUD Talk button is on screen, in the text column and clear of the portrait (before any conversation has opened)', hudFit);
    await page.locator('#party button.pt').tap();
    ok(await E(() => G.openPanel === 'ctalk'), 'touch: tapping the HUD button opens the conversation');
    await E(() => COMPANION_TALK.close());
    await E(() => { __reset({ kaelen_met: 1, part4: 1, lyra_dw_met: 1, lyra_met: 1, lyra_wg_met: 1, sable_met: 1, sable_with: 1, aegis_calmed: 1, cloak_given: 1, dw_vane_met: 1, vane_told: 1, tank_patched: 1 }, 'kaelen'); COMPANION_TALK.open('kaelen', 'kaelen', 'party'); });
    const fit = async (label) => {
      const r = await E(() => {
        const vw = innerWidth, vh = innerHeight, panel = document.getElementById('modal-panel');
        const pr = panel.getBoundingClientRect(), bs = Array.from(document.querySelectorAll('#modal-panel button')).map(b => b.getBoundingClientRect());
        const log = document.getElementById('p9t-log');
        return { vw, vh, left: pr.left, right: pr.right, top: pr.top, bottom: pr.bottom, docW: document.documentElement.scrollWidth, panelSW: panel.scrollWidth, panelCW: panel.clientWidth,
          badBtn: bs.filter(b => b.width > 0 && (b.left < -1 || b.right > vw + 1 || b.bottom > vh + 1 || b.top < -1)).length, logOverflowX: log ? log.scrollWidth > log.clientWidth + 1 : false, nBtn: bs.length };
      });
      ok(r.left >= -1 && r.right <= r.vw + 1 && r.bottom <= r.vh + 1 && r.docW <= r.vw + 1 && r.panelSW <= r.panelCW + 1 && r.badBtn === 0 && !r.logOverflowX, '640x400: ' + label + ' fits without horizontal overflow, every button on screen', r);
    };
    await fit('Kaelen topic list');
    await E(() => __play('k_arm', [1]));
    await fit('Kaelen topic, finished');
    // longest-looking topics for each companion
    for (const [who, src, tid] of [['kaelen', 'kaelen', 'k_synod'], ['lyra', 'lyra', 'l_tobin'], ['sable', 'sable_dw', 's_schedule'], ['vane', 'vane_dw', 'v_cutter'], ['aegis', 'aegis_dw', 'a_cloak']]) {
      await E(([w, s, t]) => { __reset({ kaelen_met: 1, part4: 1, lyra_dw_met: 1, lyra_met: 1, lyra_wg_met: 1, sable_met: 1, sable_with: 1, aegis_calmed: 1, cloak_given: 1, dw_vane_met: 1, vane_told: 1, tank_patched: 1, kaelen_dw_done: 1, kaelen_told_now: 1 }, null); COMPANION_TALK.open(w, s, 'dialogue'); COMPANION_TALK.begin(COMPANION_TALK.TOPICS.find(x => x.id === t)); }, [who, src, tid]);
      await fit(who + ' mid-topic (' + tid + ')');
      await E(() => __play(COMPANION_TALK.state.topic.id, [0, 0]));
      await fit(who + ' end of ' + tid);
    }
    // touch: tap the real buttons
    await E(() => { __reset({ kaelen_met: 1, part4: 1 }, 'kaelen'); COMPANION_TALK.open('kaelen', 'kaelen', 'party'); });
    const tb = page.locator('#p9t-opts button').first();
    await tb.tap();
    ok(await E(() => COMPANION_TALK.state.view === 'topic'), 'touch: tapping a topic starts it');
    await page.locator('#p9t-opts button').nth(1).tap();
    ok(await E(() => COMPANION_TALK.state.log.some(e => e.kind === 'you')), 'touch: tapping a reply chooses it');
    await E(() => { const b = Array.from(document.querySelectorAll('#p9t-opts button')); return b.length; });
    await page.locator('#p9t-opts button').first().tap();         // Go on (or the next beat)
    const tapMin = await E(() => Math.min(...Array.from(document.querySelectorAll('#modal-panel button')).map(b => { const r = b.getBoundingClientRect(); return Math.min(r.width, r.height); }).filter(x => x > 0)));
    ok(tapMin >= 18, 'touch: buttons are at least 18 px in each direction at 640x400 (smallest ' + Math.round(tapMin) + ')', tapMin);
    await page.locator('#p9t-bye').tap();
    ok(await E(() => G.state === 'play' && G.openPanel !== 'ctalk'), 'touch: Goodbye closes the conversation');
    allErrors.push(...errors);
  } catch (e) {
    console.log('FAIL 640x400 section crashed: ' + (e && e.stack || e)); fails++;
  } finally { await b2.close(); }

  ok(allErrors.length === 0, 'no page errors', allErrors.slice(0, 3));
  console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})();
