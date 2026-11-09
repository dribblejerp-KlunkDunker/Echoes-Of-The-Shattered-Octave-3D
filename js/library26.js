// library26 — Phase 26, the books of the Reach: the catalogue and every way to come by a book.
//
//  The books are data (js/library26-books.js, LIBRARY_BOOKS, built from tools/library/books/*.json and
//  tools/library/placement.json by tools/library/build.js). Each has `how` and `at`:
//    shelf  on a shelf in one of the four libraries (js/libraries26.js builds them): read it there, never take it
//    pile   in a small pile in someone's house or camp (`at` = map): read it there
//    shop   sold by a vendor (`at` = NPC id): yours to carry and read from your pack
//    found  lying somewhere (`at` = map), picked up once: yours to carry
//    quest  found like the others, but someone is looking for it (libraries26.js's keepers)
//  Reading any book marks it read (G.flags 'lib:<id>' === true); the logbook's "Your Library" rereads it anywhere.
//  Piles and found books are transient entities, rebuilt on every map load and never saved; a found book is placed
//  until G.flags 'libgot:<id>' is set. Every string shown is escaped; flags only choose between constant texts.
//  Switch: UPG.library (default on). Off = no piles, no found books, no logbook section.
'use strict';

const LIBRARY = (function () {
  const BOOKS = typeof LIBRARY_BOOKS !== 'undefined' && Array.isArray(LIBRARY_BOOKS) ? LIBRARY_BOOKS : [];
  const BY_ID = Object.create(null);
  for (const b of BOOKS) { if (!b.how) b.how = 'pile'; if (!b.at) b.at = b.where; BY_ID[b.id] = b; }
  const isBook = id => typeof id === 'string' && Object.prototype.hasOwnProperty.call(BY_ID, id);
  const OWNED = ['shop', 'found', 'quest'];
  if (typeof UPG !== 'undefined' && UPG.library === undefined) UPG.library = true;
  const on = () => { try { return typeof UPG === 'undefined' || UPG.library !== false; } catch (e) { return true; } };

  // ---------------------------------------------------------------- shelves (genres) and regions
  const SHELVES = [
    { key: 'history', name: 'Histories and chronicles', genres: ['history', 'chronicle', 'almanac'] },
    { key: 'lives', name: 'Lives, letters and journals', genres: ['biography', 'autobiography', 'memoir', 'letters', 'journal'] },
    { key: 'tales', name: 'Tales and verse', genres: ['folk tale', 'fable', 'ghost story', 'romance', 'adventure', "children's", 'poetry', 'song', 'play'] },
    { key: 'craft', name: 'Craft and the natural world', genres: ['natural history', 'herbal', 'field guide', 'manual', 'cookery'] },
    { key: 'faith', name: 'Faith, law and the press', genres: ['sermon', 'catechism', 'philosophy', 'law', 'politics', 'pamphlet'] },
    { key: 'world', name: 'The wider world', genres: ['travel'] },
  ];
  const shelfOf = g => (SHELVES.find(s => s.genres.includes(String(g || '').toLowerCase())) || SHELVES[SHELVES.length - 1]);
  const GENRE_NAME = {
    'history': 'History', 'chronicle': 'Chronicle', 'almanac': 'Almanac', 'biography': 'Biography', 'autobiography': 'Autobiography',
    'memoir': 'Memoir', 'letters': 'Letters', 'journal': 'Journal', 'folk tale': 'Folk tale', 'fable': 'Fable', 'ghost story': 'Ghost story',
    'romance': 'Romance', 'adventure': 'Adventure', "children's": "Children's book", 'poetry': 'Poetry', 'song': 'Songbook', 'play': 'Play-script',
    'natural history': 'Natural history', 'herbal': 'Herbal', 'field guide': 'Field guide', 'manual': 'Manual', 'cookery': 'Cookery',
    'sermon': 'Sermon', 'catechism': 'Catechism', 'philosophy': 'Philosophy', 'law': 'Law', 'politics': 'Politics', 'pamphlet': 'Pamphlet',
    'travel': 'Travel',
  };
  const genreName = g => GENRE_NAME[String(g || '').toLowerCase()] || 'Book';
  const REGIONS = [
    { name: 'Oakhaven', maps: ['oakhaven', 'tavern', 'lyra_house', 'greenhall', 'surgery', 'mill', 'chapel', 'tannery', 'orla_house', 'cooper_house', 'watchhouse', 'p13h_tarrow', 'p16h_vestry', 'underhedge', 'lib_conservatory', 'moor_bookseller'] },
    { name: 'the Reach beyond the Hedge', maps: ['clearing', 'quarry', 'rootvault', 'p16h_depot3', 'flume_road', 'flume_landing', 'flume_lowrings', 'greenroot', 'greenroot_chapel', 'greenroot_crypt', 'p20_downs', 'p22_combe', 'p22_bellwether', 'p22_hanger', 'p22_barrow', 'lib_bonded', 'odile'] },
    { name: 'the Drift-Kestrel', maps: ['p16k_kestrel_deck', 'p16k_kestrel_below', 'vane'] },
    { name: 'Whisper-Grove and the Woods', maps: ['whispergrove', 'cloister', 'malting', 'catacombs', 'wickhouse', 'p16d_lower', 'deepwoods', 'mausoleum', 'belfry', 'lib_moot', 'lib_scriptorium', 'vane_wg'] },
  ];
  const regionOf = at => (REGIONS.find(r => r.maps.includes(at)) || { name: 'the province' }).name;

  // ---------------------------------------------------------------- state
  const flags = () => (typeof G !== 'undefined' && G.flags && typeof G.flags === 'object') ? G.flags : null;
  const has = id => { const f = flags(); return !!(f && f['lib:' + id] === true); };
  const got = id => { const f = flags(); return !!(f && f['libgot:' + id] === true); };
  const count = () => BOOKS.reduce((n, b) => n + (has(b.id) ? 1 : 0), 0);
  const booksAt = mapId => BOOKS.filter(b => b.how === 'pile' && b.at === mapId);
  const foundAt = mapId => BOOKS.filter(b => (b.how === 'found' || b.how === 'quest') && b.at === mapId);
  const onShelf = (libId, key) => BOOKS.filter(b => b.how === 'shelf' && b.at === libId && (!key || b.shelf === key));

  // ---------------------------------------------------------------- text
  const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  function bodyHtml(b) {
    const meta = [b.author, genreName(b.genre), b.year, b.origin].filter(Boolean).map(x => '<span>' + esc(x) + '</span>').join(' · ');
    const paras = (Array.isArray(b.text) ? b.text : String(b.text || '').split('\n\n')).map(p => '<p>' + String(p).split('\n').map(esc).join('<br>') + '</p>');
    return '<p class="lib-meta"><i>' + meta + '</i></p>' + paras.join('');
  }

  // ---------------------------------------------------------------- reading
  const MILESTONES = [[10, 'lib_ten', 'A Reader of the Reach', 'Read ten books from the Library of the Reach.'],
    [25, 'lib_quarter', 'Keeper of Shelves', 'Read twenty-five books from the Library of the Reach.'],
    [50, 'lib_fifty', 'Fifty Spines', 'Read fifty books from the Library of the Reach.']];
  const hooks = [];   // libraries26.js listens for first reads (names on flyleaves go into the Ledger)
  function read(id, back) {
    if (!isBook(id)) return false;
    const b = BY_ID[id], first = !has(id);
    const f = flags(); if (f) f['lib:' + id] = true;
    if (first) {
      try { if (typeof gainSkill === 'function') gainSkill('Lore', 1); } catch (e) { /* optional */ }
      try { if (typeof questXp === 'function') questXp(10); } catch (e) { /* optional */ }
      const n = count();
      try { if (typeof msg === 'function') msg('Added to your library (' + n + '/' + BOOKS.length + ').', 'good', 3500); } catch (e) { /* optional */ }
      try {
        if (typeof unlockAchievement === 'function') {
          for (const [k, aid, name, desc] of MILESTONES) if (n >= k) unlockAchievement(aid, name, desc);
          if (n >= BOOKS.length) unlockAchievement('lib_all', 'The Library of the Reach', 'Read every book in the Library of the Reach.');
        }
      } catch (e) { /* optional */ }
      for (const h of hooks) { try { h(b); } catch (e) { console.warn('library: hook failed', e); } }
    }
    try { if (typeof closeModal === 'function') closeModal(); } catch (e) { /* ignore */ }
    showEvent(b.title, bodyHtml(b), [back || { t: 'Close the book.', f: null }]);
    return true;
  }
  // A menu of books (a shelf, a pile): titles, a tick on the ones already read.
  function menu(title, intro, list) {
    const choices = list.map(b => ({ t: (has(b.id) ? '✓ ' : '') + b.title, f: () => read(b.id) }));
    choices.push({ t: 'Leave the books.', f: null });
    const unread = list.filter(b => !has(b.id)).length;
    showEvent(title, '<p>' + esc(intro) + '</p><p class="muted">' + esc(unread ? (unread === 1 ? 'One here you have not read.' : unread + ' here you have not read.') : 'You have read everything here.') + '</p>', choices);
  }
  const pile = mapId => menu('Books', PILE_TEXT[mapId] || PILE_TEXT._, booksAt(mapId));
  const PILE_TEXT = {
    _: 'A few books, kept where someone could reach them.',
    tavern: 'A shelf of books by the hearth, swollen with damp and read soft at the corners. Hetty lends them on trust.',
    lyra_house: 'The Cantor’s books, kept off the floor and away from the reeds.',
    greenhall: 'The Greenhall’s books: ledgers, almanacs, and whatever the town clerks thought worth keeping.',
    surgery: 'Rooke’s books, stacked under the window where the light is best for small print.',
    chapel: 'Books left in the Chapel, some of them by people who should not have left them.',
    mill: 'Books in a meal-sack, kept dry on the beam.',
    clearing: 'Books in a crate under the eaves of the hut, wrapped against the wet.',
    flume_landing: 'A tea-chest of books on the wharf, for sale or swap, no questions.',
    p16k_kestrel_below: 'The ship’s books, wedged into a rack so they do not fly about in weather.',
    deepwoods: 'Books in a saddlebag by the fire, dried and redried.',
    malting: 'Books the Office did not catalogue, or did and forgot.',
    whispergrove: 'Books someone carried out of a house and could not carry further.',
  };

  // ---------------------------------------------------------------- books you can own
  function installItems() {
    if (typeof ITEMS === 'undefined') return;
    for (const b of BOOKS) {
      if (!OWNED.includes(b.how) || ITEMS[b.id]) continue;
      ITEMS[b.id] = { name: b.title, sprite: 'lib_book', use: 'lib_book', value: Math.max(1, b.price || 2), key: b.how === 'quest' || undefined,
        desc: genreName(b.genre) + ' — ' + b.author + '. ' + (b.summary || '') + ' Read it from your pack; reading does not use it up.' };
    }
    for (const b of BOOKS) {
      if (b.how !== 'shop' || typeof NPCS === 'undefined' || !NPCS[b.at]) continue;
      const v = NPCS[b.at]; if (!Array.isArray(v.shop)) v.shop = [];
      if (!v.shop.some(s => s.item === b.id)) v.shop.push({ item: b.id, price: b.price || 2 });
    }
  }

  // ---------------------------------------------------------------- placement (piles and found books)
  // A free floor cell against a wall, near the room's shelf or furniture, clear of doors, triggers, entities and slopes.
  const ANCHORS = ['shelf', 'table', 'hearth', 'campfire', 'chest', 'bed', 'crates', 'lamp'];
  function findSpot(m, skip) {
    if (!m || !m.w || !m.h) return null;
    const ents = (m.entities || []).filter(e => e && !e.libPile && !e.libFound);
    const taken = skip || [];
    let ax = m.spawn ? m.spawn.x : m.w / 2, ay = m.spawn ? m.spawn.y : m.h / 2;
    for (const s of ANCHORS) { const e = ents.find(o => o.sprite === s && o.kind === 'deco'); if (e) { ax = e.x; ay = e.y; break; } }
    const doorCells = Object.keys(m.doors || {}).map(Number).map(k => [k % m.w + 0.5, Math.floor(k / m.w) + 0.5]);
    const trig = m.triggers || [];
    let best = null, bestD = Infinity;
    for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) {
      if (m.get(x, y)) continue;
      const i = y * m.w + x;
      if (m.lvls && m.lvls[i]) continue;
      if (m.smooth && m.smooth[i]) continue;
      if (m.floorCells && m.floorCells[i] === 2) continue;
      const wallN = (m.get(x + 1, y) ? 1 : 0) + (m.get(x - 1, y) ? 1 : 0) + (m.get(x, y + 1) ? 1 : 0) + (m.get(x, y - 1) ? 1 : 0);
      if (!wallN) continue;
      const cx = x + 0.5, cy = y + 0.5;
      if (doorCells.some(([dx, dy]) => (dx - cx) ** 2 + (dy - cy) ** 2 < 2.25 * 2.25)) continue;
      if (trig.some(t => (t.x - cx) ** 2 + (t.y - cy) ** 2 < (t.r + 0.8) ** 2)) continue;
      if (ents.some(e => (e.x - cx) ** 2 + (e.y - cy) ** 2 < Math.max(0.95, (e.radius || 0) + 0.6) ** 2)) continue;
      if (taken.some(([tx, ty]) => (tx - cx) ** 2 + (ty - cy) ** 2 < 1.5 * 1.5)) continue;
      const d = (cx - ax) ** 2 + (cy - ay) ** 2;
      if (d < 1.4 || d >= bestD) continue;
      best = [cx, cy]; bestD = d;
    }
    return best;
  }
  const hyd = e => (typeof hydrate === 'function' ? hydrate(e) : e);
  const carrying = id => { try { return typeof G !== 'undefined' && typeof G.has === 'function' && !!G.has(id); } catch (e) { return false; } };
  function place(m, id) {
    if (!m || !Array.isArray(m.entities)) return;
    for (let i = m.entities.length - 1; i >= 0; i--) {   // drop what should no longer be here
      const e = m.entities[i];
      if (e && ((e.libPile && (!on() || !booksAt(id).length)) || (e.libFound && (!on() || got(e.item) || carrying(e.item))))) m.entities.splice(i, 1);
    }
    if (!on()) return;
    m._libSpots = m._libSpots || {};
    const used = () => Object.values(m._libSpots).filter(Boolean);
    if (booksAt(id).length && !m.entities.some(e => e && e.libPile)) {
      const at = m._libSpots._pile || (m._libSpots._pile = findSpot(m, used()));
      if (at) m.add(hyd({ kind: 'deco', sprite: 'bookpile', x: at[0], y: at[1], scale: 0.42, solid: false, radius: 0.2, transient: true, _decor: true,
        use: 'library_pile', libPile: true, label: 'Books — read (' + booksAt(id).length + ')' }));
    }
    for (const b of foundAt(id)) {
      if (got(b.id) || carrying(b.id) || m.entities.some(e => e && e.libFound && e.item === b.id)) continue;
      const at = m._libSpots[b.id] || (m._libSpots[b.id] = findSpot(m, used()));
      if (at) m.add(hyd({ kind: 'item', item: b.id, sprite: 'lib_book', x: at[0], y: at[1], scale: 0.32, yOff: 0, solid: false, transient: true, libFound: true }));
    }
  }
  function take(e) {
    const f = flags(); if (f) f['libgot:' + e.item] = true;
    try { if (typeof G !== 'undefined' && G.give) G.give(e.item); } catch (err) { /* ignore */ }
    try { if (typeof msg === 'function') msg('You pick up a book: ' + BY_ID[e.item].title, 'good', 3500); } catch (err) { /* ignore */ }
    try { if (typeof Audio_ !== 'undefined' && Audio_.sfx && Audio_.sfx.pickup) Audio_.sfx.pickup(); } catch (err) { /* optional */ }
    try { if (G.map && Array.isArray(G.map.entities)) { const i = G.map.entities.indexOf(e); if (i >= 0) G.map.entities.splice(i, 1); } } catch (err) { /* ignore */ }
  }

  // ---------------------------------------------------------------- sprites (procedural stand-ins, 24x24)
  function paint() {
    if (typeof Engine === 'undefined' || !Engine.addSprite) return;
    const mk = (name, draw) => {
      if (Engine.sprites && Engine.sprites[name]) return;
      const w = 24, h = 24, d = new Uint32Array(w * h);
      const px = (x, y, r, g, b) => { if (x >= 0 && y >= 0 && x < w && y < h) d[y * w + x] = (255 << 24) | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0); };
      draw(px); Engine.addSprite(name, { w, h, data: d, hs: 1, cx: 0.5, dy: 0 });
    };
    mk('bookpile', px => {   // a small stack of bound books, spines out
      const books = [[3, 20, 18, [92, 52, 34]], [4, 17, 16, [58, 70, 52]], [2, 14, 17, [118, 92, 52]], [5, 11, 14, [70, 54, 84]], [4, 8, 15, [134, 48, 40]]];
      for (const [x0, y0, len, c] of books) for (let y = y0; y < y0 + 3; y++) for (let x = x0; x < x0 + len; x++) {
        const edge = y === y0 || y === y0 + 2 || x === x0 || x === x0 + len - 1;
        if (x > x0 + len - 3) px(x, y, 214, 202, 168); else px(x, y, edge ? c[0] * 0.6 : c[0], edge ? c[1] * 0.6 : c[1], edge ? c[2] * 0.6 : c[2]);
      }
      for (const [x0, y0, len] of books) for (let x = x0 + 2; x < x0 + len - 4; x += 4) px(x, y0 + 1, 196, 160, 84);
    });
    mk('lib_book', px => {   // one closed book lying flat, a ribbon out of it
      for (let y = 14; y < 21; y++) for (let x = 5; x < 19; x++) {
        const edge = y === 14 || y === 20 || x === 5 || x === 18;
        if (y >= 18 && x > 6 && x < 18) px(x, y, 216, 204, 170); else px(x, y, edge ? 70 : 104, edge ? 40 : 58, edge ? 28 : 38);
      }
      for (let x = 8; x < 16; x++) px(x, 16, 196, 160, 84);
      px(15, 21, 150, 40, 40); px(15, 22, 150, 40, 40);
    });
  }
  paint();

  // ---------------------------------------------------------------- your library (logbook)
  function decorateLog() {
    const panel = typeof document !== 'undefined' && document.getElementById('modal-panel');
    // the section appears once the first book is read, so a new game's logbook starts with its quests
    if (!panel || panel.querySelector('#lib-log') || !BOOKS.length || !count()) return;
    const sec = document.createElement('section'); sec.id = 'lib-log'; sec.className = 'lib-log';
    const h = document.createElement('h3'); h.textContent = 'Your Library (' + count() + '/' + BOOKS.length + ')'; sec.appendChild(h);
    const p = document.createElement('p'); p.className = 'muted';
    p.textContent = 'Every book you have read, to read again anywhere.';
    sec.appendChild(p);
    const b = document.createElement('button'); b.className = 'dfbtn small'; b.type = 'button'; b.id = 'lib-open'; b.textContent = 'Open your library';
    b.onclick = () => renderLibrary(); sec.appendChild(b);
    const first = panel.querySelector('h3');
    if (first) panel.insertBefore(sec, first); else panel.appendChild(sec);
  }
  function renderLibrary() {
    const parts = ['<h2>Your Library</h2><button class="dfbtn small close" id="lib-x">Close</button>',
      '<p class="muted">' + esc(count() + ' of ' + BOOKS.length + ' books read.') + '</p>'];
    for (const s of SHELVES) {
      const all = BOOKS.filter(b => shelfOf(b.genre) === s); if (!all.length) continue;
      const mine = all.filter(b => has(b.id));
      parts.push('<h3>' + esc(s.name) + ' <span class="muted">(' + mine.length + '/' + all.length + ')</span></h3><div class="lib-list" role="list">');
      for (const b of mine) parts.push('<button class="dfbtn small" type="button" role="listitem" data-lib="' + esc(b.id) + '"><b>' + esc(b.title) + '</b><br><small><span>' + esc(b.author) + '</span> · <span>' + esc(genreName(b.genre)) + '</span></small><br><small class="muted">' + esc(b.summary || '') + '</small></button>');
      parts.push('</div>');
      const left = all.filter(b => !has(b.id));
      for (const r of REGIONS) {
        const n = left.filter(b => regionOf(b.at) === r.name).length;
        if (n) parts.push('<p class="muted">' + esc('Not yet found in ' + r.name + ': ' + n + '.') + '</p>');
      }
    }
    openModal(parts.join(''), 'library');
    const x = document.getElementById('lib-x'); if (x) x.onclick = () => { closeModal(); G.state = 'play'; };
    for (const btn of document.querySelectorAll('#modal-panel [data-lib]')) btn.onclick = () => {
      G.state = 'event';
      read(btn.dataset.lib, { t: 'Back to your library.', f: () => { G.state = 'panel'; renderLibrary(); } });
    };
  }
  function injectStyle() {
    if (typeof document === 'undefined' || document.getElementById('lib-style')) return;
    const st = document.createElement('style'); st.id = 'lib-style';
    st.textContent = `.lib-log { margin: 0 0 1.2cqh; }
.lib-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 18em), 1fr)); gap: .6cqh 1cqw; }
.lib-list .dfbtn { text-align: left; min-width: 0; overflow-wrap: anywhere; white-space: normal; }
.lib-meta { opacity: .8; }`;
    (document.head || document.documentElement).appendChild(st);
  }

  // ---------------------------------------------------------------- wiring
  if (typeof READING !== 'undefined' && READING.SOURCES) for (const b of BOOKS) READING.SOURCES[b.title] = { style: b.style || 'parch', kind: genreName(b.genre) };
  installItems();
  if (typeof document !== 'undefined') injectStyle();
  if (typeof loadMap === 'function') {
    const _loadMap = loadMap;
    loadMap = function (id) {
      try { if (typeof G !== 'undefined' && G.maps && G.maps[id]) place(G.maps[id], id); } catch (e) { console.warn('library: placement failed', e); }
      const r = _loadMap.apply(this, arguments);
      try { if (G.map) place(G.map, G.mapId || id); } catch (e) { /* never break a map change */ }
      return r;
    };
  }
  if (typeof useDeco === 'function') {
    const _useDeco = useDeco;
    useDeco = function (e) {
      if (e && e.use === 'library_pile') { if (on()) pile(G.mapId); return; }
      return _useDeco.apply(this, arguments);
    };
  }
  if (typeof pickUp === 'function') {
    const _pickUp = pickUp;
    pickUp = function (e) {
      if (e && e.libFound && isBook(e.item)) { if (on()) take(e); return; }
      return _pickUp.apply(this, arguments);
    };
  }
  if (typeof useItem === 'function') {
    const _useItem = useItem;
    useItem = function (slot) {
      if (slot && isBook(slot.id)) { if (G.has(slot.id)) read(slot.id); return; }
      return _useItem.apply(this, arguments);
    };
  }
  if (typeof renderLog === 'function') {
    const _renderLog = renderLog;
    renderLog = function () {
      const r = _renderLog.apply(this, arguments);
      if (on()) { try { decorateLog(); } catch (e) { console.warn('library: logbook section failed', e); } }
      return r;
    };
  }

  return { BOOKS, BY_ID, SHELVES, REGIONS, has, got, count, booksAt, foundAt, onShelf, read, menu, pile, place, findSpot, renderLibrary,
    bodyHtml, genreName, shelfOf, regionOf, hooks, isBook, on };
})();
