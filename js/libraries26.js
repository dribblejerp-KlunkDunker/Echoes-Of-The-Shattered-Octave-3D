// libraries26 — Phase 26, the libraries of the Reach: four rooms full of books you can walk into, their keepers,
// and the books they are missing. The books themselves are js/library26.js's catalogue (LIBRARY).
//
//   The Conservatory Reading Room   Oakhaven, Parts 1–2. Kept by Cantor-Master Ilse Brennan, who lost her voice to
//                                   the Debt of Overtone and teaches by writing (Vol II, People). Her quest: the
//                                   Conservatory's books lent out before the Hedge closed. Reward: the tending breath.
//   The Bonded Store                Stillwater Landing, Parts 1–2: where Cantabile broadsheets come in (Vol II).
//                                   Kept by Odile Quayle, book-runner [PROPOSED], who sells. Her quest: a wet crate.
//   The Moot-house                  Whisper-Grove, Part 3: the plaza's fourth side (Book One). Books whose owners lost
//                                   their names; a Hollow still shelves them. Names on the flyleaves go into your Ledger.
//   The Scriptorium of the Veil     The House of the Silent Veil (the game's Mausoleum), Part 4: first floor, east end,
//                                   sloped desks and a stove at each end (Vol V). No keeper.
//  Everything placed here is part of the maps' base build (new maps; one door cell changed on each host), so saves
//  keep working: G.flags only ('libq_*' booleans, 'libret:<id>'). [PROPOSED]: the Conservatory's place in Oakhaven,
//  Odile Quayle, the Bonded Store, the Moot-house library, the shelver. Switch: UPG.library (shared with LIBRARY).
'use strict';

const LIBRARIES = (function () {
  if (typeof LIBRARY === 'undefined') return null;
  const L = LIBRARY;
  const PI = Math.PI;
  const S = (s) => s;

  // ---------------------------------------------------------------- the four rooms
  const LIBS = {
    lib_conservatory: {
      shelves: 't_lib_shelves',
      name: 'The Conservatory Reading Room', host: 'oakhaven', door: [48, 39], out: { x: 48.5, y: 38.3, dir: -PI / 2 }, hostLabel: 'The Conservatory',
      w: 13, h: 10, wall: 't_house', floor: 't_wood', ceil: 't_wood', ambient: 0.36,
      intro: 'Reeds hang over the door, cut fresh, whistling under their breath. Inside, books, and the smell of slate-dust.',
      keeper: { id: 'lib_ilse', x: 9.5, y: 3.0, facing: PI / 2 },
    },
    lib_bonded: {
      shelves: 't_lib_shelves',
      name: 'The Bonded Store', host: 'flume_landing', door: [30, 8], out: { x: 30.5, y: 9.4, dir: PI / 2 }, hostLabel: 'The Bonded Store',
      w: 12, h: 10, wall: 't_wood', floor: 't_wood', ceil: 't_wood', ambient: 0.32,
      intro: 'Tea-chests stencilled TEA and full of paper. Bales of broadsheets under oilcloth. A counter, a lamp, a woman reading.',
      keeper: { id: 'lib_odile', x: 6.5, y: 3.0, facing: PI / 2 },
    },
    lib_moot: {
      shelves: 't_lib_shelves_dust',
      name: 'The Moot-house', host: 'whispergrove', door: [40, 27], out: { x: 39.4, y: 27.5, dir: PI }, hostLabel: 'The Moot-house',
      w: 15, h: 11, wall: 't_greymarble', floor: 't_flag', ceil: 't_greymarble', ambient: 0.24,
      intro: 'The town met here. The benches are still in rows. Along the walls, the town’s books, shelved by size, not by name.',
      keeper: { id: 'lib_shelver', x: 4.5, y: 2.6, facing: PI / 2 },
    },
    lib_scriptorium: {
      shelves: 't_lib_shelves_dust',
      name: 'The Scriptorium of the Silent Veil', host: 'mausoleum', door: [1, 20], out: { x: 2.6, y: 20.5, dir: 0 }, hostLabel: 'A stair up to the scriptorium',
      w: 17, h: 8, wall: 't_mausoleum', floor: 't_wood', ceil: 't_greymarble', ambient: 0.22,
      intro: 'The first floor, the east end, where the light comes in first. Two rows of sloped desks. A stove at each end, cold.',
      keeper: null,
    },
  };
  const ROOM_ORDER = Object.keys(LIBS);

  // ---------------------------------------------------------------- keepers
  const NPC_DEFS = {
    lib_ilse: {
      name: 'Ilse Brennan, Cantor-Master', sprite: 'townswoman', portrait: 'townswoman', tier: 'high',
      greet: {
        polite: 'She writes on her slate, in a hand as clear as print, and turns it round: "Read what you like. Quietly. The reeds are listening."',
        normal: 'She writes: "The Conservatory. What is left of it. Sit, if you mean to read."',
        blunt: 'She writes one word, underlines it twice, and holds it up: "QUIETLY."',
      },
      topics: {
        'The Conservatory': S('She writes, and it takes a while: "We taught the reed and the breath. Forty Cantors went out of this room. I kept the books because I could not keep the voices."'),
        'Her voice': S('She writes: "The Debt of Overtone. Eleven years ago I sang one note too many for a dying boy. He lived. The note kept my voice. I would sing it again." She rubs it out with her sleeve before you can read it twice.'),
        'Lyra': S('She writes: "My best pupil and my worst listener. She sings the way I used to. Tell her nothing I said."'),
        'The Cantors': S('She writes: "Older than the Synod. We sang the orchards. Ask the books, not me; they are less tired."'),
      },
    },
    lib_odile: {
      name: 'Odile Quayle, book-runner', sprite: 'townswoman', portrait: 'townswoman', tier: 'low', markup: 1,
      greet: {
        polite: 'Everything here came up the river inside something else. Read on the stools; buy at the counter. A sovereign or two a book.',
        normal: 'Broadsheets, novels, sermons, filth, hymnals. I do not judge, I only carry. Mind the lamp.',
        blunt: 'If you are from the lock, you have seen nothing. If you are not, you have still seen nothing.',
      },
      topics: {
        'Port Cantabile': S('Four papers on the Row, all libellous, one occasionally correct. They print what the Synod will not, and I bring it upstream in tea-chests. Nobody in the Reach drinks that much tea.'),
        'The lockkeeper': S('He reads everything I carry before I carry it, and sells what he reads. So I carry nothing he would want to sell. Mostly.'),
        'Bastien Corvo': S('My best customer and my worst debtor. If you see him at the Boar, remind him what he owes me. Do not use the word "owes". He faints.'),
      },
      shopTalk: { hello: 'Look before you buy. Read before you look, if you like.', broke: 'Then read on the stool, for nothing. I am not a monster, only a smuggler.',
        thanks: ['Keep it dry.', 'Do not read it aloud near the lock.'], buys: ['consumable'] },
    },
    lib_shelver: {
      name: 'A Hollow among the shelves', sprite: 'hollow', portrait: 'townsman', tier: 'low',
      greet: {
        polite: '...on the left, by size... not by name... not by name...',
        normal: '...by size... the tall ones at the back... mind the spines...',
        blunt: '...not by name...',
      },
      topics: {
        'The books': S('He lifts a book from the bench and shelves it, carefully, by size. Then he takes it down again and shelves it again. "...somebody will want it..."'),
      },
    },
  };

  // ---------------------------------------------------------------- quests
  const QUESTS = {
    ilse: { keeper: 'lib_ilse', start: 'libq_ilse', done: 'libq_ilse_done',
      offer: S('She writes for a long time. "Before the Hedge closed we lent books out, as we always had. They did not come home. The borrowers are dead, or over the hills, or both. Our books carry the reed stamp on the flyleaf. If you find one, bring it back. I will not ask how you came by it."'),
      journalStart: ['side', 'Ilse Brennan, the Cantor-Master, keeps the Conservatory\'s books. Some went out before the Hedge closed and never came home; they carry the reed stamp. She wants them back.'],
      partial: S('She takes the book, wipes its boards with her sleeve, and writes: "Home. Thank you." She puts it on the returns shelf, spine out, where she can see it.'),
      remaining: S('She writes: "Still {n} out. They will be somewhere people sheltered."'),
      reward: S('She takes the last book and does not write anything. She takes your hands instead, turns them palm up, and breathes on them: four counts in, a long fall out. Then again, slower, until you are breathing with her. It is the tending breath, the one the orchard-cantors used before there was any singing at all. She writes: "Trees hear breath before voice. So do children."'),
      rewardKnown: S('She takes the last book, writes "All home," and presses a purse into your hand that she clearly cannot spare. When you try to give it back she writes "RUDE" and turns away.'),
      journalDone: ['side', 'I returned all of the Conservatory\'s lost books to Ilse Brennan. She taught me the tending breath with her hands.'],
    },
    odile: { keeper: 'lib_odile', start: 'libq_odile', done: 'libq_odile_done',
      offer: S('A crate went over the side in the Low Rings when the surge came early. Oilcloth, so the books may be dry. If you go that way, bring back what you find. I pay for paper, not for heroics.'),
      journalStart: ['side', 'Odile Quayle at the Bonded Store lost a crate of books in the Low Rings when the surge came early. She pays for whatever comes back dry.'],
      partial: S('She opens it, sniffs it, and nods. "Dry enough. Here." She counts coin onto the counter.'),
      remaining: S('"{n} more in that crate, if the water has not had them."'),
      reward: S('"That is the crate. All of it." She writes your name in a little book under the counter. "Friends of the Store pay less. Do not tell Corvo."'),
      rewardKnown: null,
      journalDone: ['side', 'I brought back Odile Quayle\'s lost crate. The Bonded Store sells to me at a friend\'s price now.'],
    },
    shelver: { keeper: 'lib_shelver', start: 'libq_shelver', done: 'libq_shelver_done',
      offer: null,   // a Hollow cannot ask; the quest starts when you read a book with a name on its flyleaf
      journalStart: ['side', 'Books in Whisper-Grove still carry their owners\' names on the flyleaves. The Hollow in the Moot-house shelves the town\'s books. These belong there.'],
      partial: S('He takes the book in both hands, turns it until the spine is the right way, and shelves it by size. "...somebody will want it..."'),
      remaining: S('He looks at the gap on the shelf. "...more... somewhere..."'),
      reward: S('When the last one is shelved he stands very still. Then he takes a book from under the bench, where it has been kept dry, and holds it out to you, the way a person holds out a thing they have been keeping for someone who did not come. "...for you..." he says, and goes back to his shelving.'),
      rewardKnown: null,
      journalDone: ['side', 'I returned the named books to the Moot-house. The Hollow who shelves them gave me a book he had been keeping for someone.'],
    },
  };
  const questBooks = q => L.BOOKS.filter(b => b.how === 'quest' && b.quest === q);
  const giftBook = q => L.BOOKS.find(b => b.how === 'gift' && b.quest === q);
  const returned = id => !!(G.flags && G.flags['libret:' + id] === true);

  function keeperQuest(qid) {
    const q = QUESTS[qid];
    return (g) => {
      const f = g.flags, books = questBooks(qid);
      if (!books.length) return null;
      if (f[q.done]) return null;
      if (!f[q.start]) {
        if (!q.offer) return null;
        f[q.start] = true;
        return { text: q.offer, journal: q.journalStart };
      }
      const carried = books.filter(b => !returned(b.id) && g.has(b.id));
      if (!carried.length) {
        const left = books.filter(b => !returned(b.id)).length;
        return left ? { text: q.remaining.replace('{n}', String(left)) } : null;
      }
      for (const b of carried) { g.take(b.id); f['libret:' + b.id] = true; if (qid === 'odile') g.gold(12); else if (qid === 'ilse') g.gold(4); }
      try { if (typeof questXp === 'function') questXp(25 * carried.length); } catch (e) { /* optional */ }
      if (books.every(b => returned(b.id))) {
        f[q.done] = true;
        let text = q.reward;
        if (qid === 'ilse') {
          const known = g.player && Array.isArray(g.player.songs) && g.player.songs.includes('tending');
          if (known) { text = q.rewardKnown; g.gold(30); } else if (g.player && Array.isArray(g.player.songs)) g.player.songs.push('tending');
        }
        if (qid === 'odile' && NPCS.lib_odile) NPCS.lib_odile.markup = 0.75;
        const gift = giftBook(qid);
        if (gift && !g.has(gift.id)) { g.give(gift.id); f['libgot:' + gift.id] = true; }
        return { text, journal: q.journalDone };
      }
      const left = books.filter(b => !returned(b.id)).length;
      return { text: q.partial + ' ' + q.remaining.replace('{n}', String(left)) };
    };
  }

  // Names on the flyleaves: reading such a book puts them in your Ledger, and opens the shelver's quest.
  L.hooks.push((b) => {
    if (!Array.isArray(b.flyleaf) || !b.flyleaf.length || typeof G === 'undefined') return;
    if (!Array.isArray(G.ledger)) G.ledger = [];
    for (const name of b.flyleaf) {
      if (G.ledger.some(l => l && l.name === name)) continue;
      G.ledger.push({ name, where: 'a flyleaf, ' + b.title, day: G.day || 0 });
    }
    try { if (typeof msg === 'function') msg('A name on the flyleaf. You write it in your Ledger.', 'voice', 4500); } catch (e) { /* optional */ }
    if (b.quest === 'shelver' && G.flags && !G.flags[QUESTS.shelver.start]) {
      G.flags[QUESTS.shelver.start] = true;
      try { if (typeof journal === 'function') journal(QUESTS.shelver.journalStart[0], QUESTS.shelver.journalStart[1]); } catch (e) { /* optional */ }
    }
  });

  // ---------------------------------------------------------------- bookshelf walls (procedural stand-ins, 64x64)
  // Four shelves of spines in a wooden case; `dusty` greys them for the Moot-house and the scriptorium.
  function paintShelfWall(name, dusty, seed) {
    if (typeof Engine === 'undefined' || !Engine.addTexture || (Engine.textures && Engine.textures[name])) return;
    const T = 64, d = new Uint32Array(T * T);
    let r = seed >>> 0; const rnd = () => ((r = (r * 1664525 + 1013904223) >>> 0) / 4294967296);
    const px = (x, y, R, Gc, B) => { if (dusty) { const g = (R + Gc + B) / 3; R = R * 0.55 + g * 0.45 + 6; Gc = Gc * 0.55 + g * 0.45 + 6; B = B * 0.55 + g * 0.45 + 8; }
      d[y * T + x] = (255 << 24) | ((Math.max(0, Math.min(255, B)) | 0) << 16) | ((Math.max(0, Math.min(255, Gc)) | 0) << 8) | (Math.max(0, Math.min(255, R)) | 0); };
    const wood = (x, y, k) => { const g = ((x * 7 + y * 3) % 11) * 2; px(x, y, 92 * k + g, 60 * k + g * 0.6, 34 * k + g * 0.3); };
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) wood(x, y, 0.55);   // the case's dark back
    const COLS = [[118, 40, 34], [52, 72, 50], [130, 96, 52], [62, 50, 88], [40, 58, 84], [140, 112, 70], [90, 34, 52], [70, 78, 60], [150, 130, 100]];
    for (let band = 0; band < 4; band++) {
      const top = band * 16 + 2, floor = band * 16 + 13;
      let x = 2;
      while (x < 61) {
        const w = 2 + Math.floor(rnd() * 3), gap = rnd() < 0.08;
        if (gap) { x += w; continue; }
        const h = 8 + Math.floor(rnd() * 4), c = COLS[Math.floor(rnd() * COLS.length)], lean = rnd() < 0.06 ? 1 : 0;
        for (let yy = floor - h; yy < floor; yy++) for (let xx = x; xx < Math.min(61, x + w); xx++) {
          const edge = xx === x || xx === x + w - 1;
          const shade = edge ? 0.7 : 1 - (yy - (floor - h)) * 0.012;
          px(Math.min(61, xx + (lean && yy < floor - h / 2 ? 1 : 0)), yy, c[0] * shade, c[1] * shade, c[2] * shade);
        }
        if (h > 9 && w > 2) { px(x + 1, floor - h + 2, 196, 164, 90); px(x + 1, floor - 3, 196, 164, 90); }   // gilt bands
        x += w + (rnd() < 0.3 ? 1 : 0);
      }
      for (let yy = floor; yy < floor + 3 && yy < T; yy++) for (let xx = 0; xx < T; xx++) wood(xx, yy, yy === floor ? 1.15 : 0.9);   // the shelf board
    }
    for (let y = 0; y < T; y++) for (const x of [0, 1, 62, 63]) wood(x, y, 1.0);   // the uprights
    Engine.addTexture(name, d);
  }
  paintShelfWall('t_lib_shelves', false, 26026);
  paintShelfWall('t_lib_shelves_dust', true, 41941);

  // ---------------------------------------------------------------- building the rooms
  function shelvesFor(libId) {
    const keys = [];
    for (const s of L.SHELVES) if (L.onShelf(libId, s.key).length) keys.push(s);
    return keys;
  }
  function buildRoom(libId) {
    const R = LIBS[libId];
    const W = R.w, H = R.h, dx = Math.floor(W / 2);
    const spawn = { x: dx + 0.5, y: H - 2.2, dir: -PI / 2 };
    const m = new GameMap(libId, R.name, W, H, { floor: R.floor, ceil: R.ceil, fogDist: 16, ambient: R.ambient, fogColor: [0, 0, 0], music: 'inside', spawn });
    m.border(R.shelves || R.wall);
    for (let x = 0; x < W; x++) m.set(x, H - 1, WALL(R.wall));
    m.set(dx, H - 1, DOOR({ portal: { map: R.host, x: R.out.x, y: R.out.y, dir: R.out.dir }, label: 'Way out' }));
    // shelves shoulder to shoulder along the north, west and east walls: the book shelves first, then the room's own
    const spots = [];
    for (let x = 1; x < W - 1; x++) spots.push([x + 0.5, 1.3]);
    for (let y = 2; y < H - 3; y++) { spots.push([1.3, y + 0.5]); spots.push([W - 1.3, y + 0.5]); }
    const keeperAt = R.keeper ? [R.keeper.x, R.keeper.y] : null;
    const free = spots.filter(([x, y]) => !keeperAt || (x - keeperAt[0]) ** 2 + (y - keeperAt[1]) ** 2 > 1.6);
    const sh = shelvesFor(libId);
    const want = sh.map(s => ({ use: 'lib_shelf', libId, shelfKey: s.key, label: 'Shelf: ' + s.name }));
    if (libId === 'lib_conservatory') want.push({ use: 'lib_shelf', libId, shelfKey: 'returns', label: 'The returns shelf' });
    const step = Math.max(1, Math.floor(free.length / Math.max(1, want.length)));
    const used = new Set();
    want.forEach((o, i) => { const k = Math.min(free.length - 1, i * step); used.add(k); m.deco('shelf', free[k][0], free[k][1], Object.assign({ radius: 0.2, scale: 1.0 }, o)); });
    // furniture: reading tables with books open on them, or sloped desks, lamps, stoves
    const pileOn = (x, y) => m.deco('bookpile', x, y, { solid: false, radius: 0.1, scale: 0.32, yOff: -0.38, label: 'Books, open where someone left off' });
    if (libId === 'lib_scriptorium') {
      const north = []; for (let x = 4; x < W - 3; x += 3) north.push(x);
      north.forEach((x, i) => { const third = i === north.length - 3; m.deco('table', x + 0.5, 3.3, { radius: 0.4, scale: 0.6, label: third ? 'The third desk from the east end, on the north side. Someone sat here for years.' : 'A sloped desk. The ink has dried in the well.' }); m.deco('table', x + 0.5, 5.6, { radius: 0.4, scale: 0.6, label: 'A sloped desk, a sheet still pinned to it, blank.' }); });
      m.deco('hearth', 2.2, H - 2.0, { radius: 0.3, scale: 0.8, glow: 0.05, label: 'The west stove, cold' });
      m.deco('hearth', W - 2.2, H - 2.0, { radius: 0.3, scale: 0.8, glow: 0.05, label: 'The east stove. The duty-scribe lit this one first.' });
      pileOn(7.5, 3.3); pileOn(10.5, 5.6);
    } else if (libId === 'lib_moot') {
      for (let y = 4; y < H - 3; y += 2) { m.deco('p9p_pew', W / 2 - 2, y + 0.5, { radius: 0.35, scale: 0.7, label: 'A bench. The town sat here to decide things.' }); m.deco('p9p_pew', W / 2 + 2, y + 0.5, { radius: 0.35, scale: 0.7, label: 'A bench, its cushion gone grey.' }); }
      m.deco('lamp', 3.5, H - 2.5, { radius: 0.12, scale: 0.7, glow: 0, label: 'A dry lamp' });
      m.deco('lamp', W - 3.5, H - 2.5, { radius: 0.12, scale: 0.7, glow: 0, label: 'A dry lamp' });
      pileOn(W / 2 - 2, 4.5);
    } else {
      const ty = Math.floor(H / 2) + 0.5;
      m.deco('table', 4.5, ty, { radius: 0.5, scale: 0.7, label: 'A reading table' }); pileOn(4.5, ty);
      m.deco('table', W - 4.5, ty, { radius: 0.5, scale: 0.7, label: 'A reading table' }); pileOn(W - 4.5, ty);
      m.deco('chair', 4.5, ty + 1.1, { radius: 0.25, scale: 0.55 }); m.deco('chair', W - 4.5, ty + 1.1, { radius: 0.25, scale: 0.55 });
      m.deco('lamp', W / 2, ty - 1, { radius: 0.12, scale: 0.7, glow: 0.6, label: libId === 'lib_conservatory' ? 'A hush-lamp. Its reed whistles under its breath.' : 'A lamp, shaded on the river side' });
      if (libId === 'lib_bonded') { m.deco('crates', 2.5, H - 2.5, { radius: 0.35, scale: 0.7, label: 'Tea-chests, stencilled TEA, full of paper' }); m.deco('crates', W - 2.5, H - 2.5, { radius: 0.35, scale: 0.7, label: 'Bales of broadsheets under oilcloth' }); }
    }
    if (R.keeper) m.npc(R.keeper.id, R.keeper.x, R.keeper.y, { facing: R.keeper.facing });
    m.baseCount = m.entities.length;
    return m;
  }
  function install(maps) {
    if (!maps) return maps;
    for (const id of ROOM_ORDER) {
      const R = LIBS[id], host = maps[R.host];
      if (!host || maps[id]) continue;
      maps[id] = buildRoom(id);
      host.set(R.door[0], R.door[1], DOOR({ portal: { map: id, x: maps[id].spawn.x, y: maps[id].spawn.y, dir: maps[id].spawn.dir }, label: R.hostLabel }));
    }
    return maps;
  }

  // ---------------------------------------------------------------- a shelf
  function useShelf(e) {
    const libId = e.libId;
    if (e.shelfKey === 'returns') {
      const back = L.BOOKS.filter(b => b.how === 'quest' && returned(b.id));
      return L.menu('The returns shelf', back.length ? 'The Conservatory’s books that have come home, spine out, where Ilse can see them.' : 'An empty shelf with a card on it, in Ilse’s hand: RETURNS.', back);
    }
    const s = L.SHELVES.find(x => x.key === e.shelfKey);
    L.menu(s ? s.name : 'Books', SHELF_TEXT[libId] || 'A shelf of books.', L.onShelf(libId, e.shelfKey));
  }
  const SHELF_TEXT = {
    lib_conservatory: 'Each spine is labelled in Ilse’s square hand. A card on the shelf: READ HERE. TAKE NOTHING. THE REEDS ARE COUNTING.',
    lib_bonded: 'Books that came upstream inside something else. Some still smell of tea.',
    lib_moot: 'Shelved by size, not by name. Some of the flyleaves have names on them. Some have had them cut out.',
    lib_scriptorium: 'The Office took the vellum to the Organum. What is left is what it did not want: the scribes’ own books, shelved in the gaps.',
  };

  // ---------------------------------------------------------------- wiring
  if (typeof NPCS !== 'undefined') {
    for (const k in NPC_DEFS) if (!NPCS[k]) NPCS[k] = NPC_DEFS[k];
    NPCS.lib_ilse.quest = keeperQuest('ilse');
    NPCS.lib_odile.quest = keeperQuest('odile');
    NPCS.lib_shelver.quest = keeperQuest('shelver');
    if (!Array.isArray(NPCS.lib_odile.shop)) NPCS.lib_odile.shop = [];
    // the library catalogue added shop books to vendors before these keepers existed: add Odile's now
    for (const b of L.BOOKS) if (b.how === 'shop' && b.at === 'lib_odile' && !NPCS.lib_odile.shop.some(s => s.item === b.id)) NPCS.lib_odile.shop.push({ item: b.id, price: b.price || 2 });
  }
  if (typeof ITEMS !== 'undefined') for (const b of L.BOOKS) if (b.how === 'gift' && !ITEMS[b.id]) {
    ITEMS[b.id] = { name: b.title, sprite: 'lib_book', use: 'lib_book', value: 1, key: true, desc: L.genreName(b.genre) + ' — ' + b.author + '. ' + (b.summary || '') + ' Read it from your pack; reading does not use it up.' };
  }
  if (typeof buildAllMaps === 'function') {
    const _build = buildAllMaps;
    buildAllMaps = function () { return install(_build.apply(this, arguments)); };
  }
  if (typeof useDeco === 'function') {
    const _useDeco = useDeco;
    useDeco = function (e) {
      if (e && e.use === 'lib_shelf') { if (L.on()) useShelf(e); return; }
      return _useDeco.apply(this, arguments);
    };
  }
  if (typeof loadMap === 'function') {
    const _loadMap = loadMap;
    loadMap = function (id) {
      const r = _loadMap.apply(this, arguments);
      try {
        const R = LIBS[id];
        if (R && G.flags && !G.flags['libseen:' + id]) { G.flags['libseen:' + id] = true; if (typeof msg === 'function') msg(R.intro, '', 7000); }
      } catch (e) { /* never break a map change */ }
      return r;
    };
  }

  return { LIBS, QUESTS, NPC_DEFS, install, buildRoom, useShelf, keeperQuest, questBooks };
})();
