/* eslint-disable no-func-assign */
// ============================================================
//  WORLD MAP & TRAVEL — the Long Octave, Daggerfall-style.
//  T (or the World map button on the automap) opens it. The continent view shows all
//  eight realms; the region view shows every place you have found in the realm you are in.
//  Click a gold mark, choose a pace, and the hours pass on the road. Places from earlier
//  parts of the story are grey: the Kestrel does not go back.
// ============================================================
'use strict';

const TRAVEL = { img: {}, view: 'region', region: 'reach', hover: null, sel: null, pace: 'cautious', raf: 0, dests: [], here: null };

// continent hotspots: centre and radii as fractions of the painting
const TRAVEL_REALMS = [
  { id: 'organum', name: 'The Organum', c: [0.615, 0.45], r: [0.045, 0.11], text: 'The Synod\'s capital, built over the Keynote where the eight Anchor-roots meet. The city is an instrument.' },
  { id: 'caldera', name: 'The Blighted Caldera', c: [0.82, 0.12], r: [0.09, 0.1], text: 'Basalt ridges and magma vents. Cinderhold, the forge-spire, where the Cold Burn freezes fires.' },
  { id: 'reach', name: 'The Resonant Reach', c: [0.225, 0.45], r: [0.11, 0.27], region: 'reach', text: 'Orchard country in the west: Oakhaven inside its Hedge, the Chlorophyll Flume, the quarry where the Consortium milks the root.' },
  { id: 'woods', name: 'The Spectral Woods', c: [0.455, 0.46], r: [0.12, 0.22], region: 'woods', text: 'The continent\'s heart: silver willows, lilac mist, Whisper-Grove under its lit water, the Mausoleum of Chords.' },
  { id: 'peaks', name: 'The Iron Peaks', c: [0.735, 0.48], r: [0.06, 0.31], text: 'The Titan\'s Spine. Fortis, the Iron Bastion, and lodestone pits under magnetic mist.' },
  { id: 'dunes', name: 'The Shifting Dunes', c: [0.47, 0.12], r: [0.19, 0.12], text: 'The Erg of Singing Silica, and the Glass Sea on its western edge, fused to glass in the Cascade.' },
  { id: 'heights', name: 'Dawning Heights', c: [0.5, 0.85], r: [0.23, 0.1], text: 'Alabaster peaks in the south. Sol-Luminary hangs from the Spire on kilometre-long chains.' },
  { id: 'archipelago', name: 'The Tempest Archipelago', c: [0.06, 0.5], r: [0.06, 0.45], text: 'The western islands and the Rust Coast. Port Cantabile, built on singing coral.' },
  { id: 'rift', name: 'The Continental Rift', c: [0.93, 0.45], r: [0.07, 0.42], text: 'Where the continent ends: the Maw of the Octave, and Null-Watch firing white noise into the dark.' },
];
// where you are on the continent, by chapter
const TRAVEL_PINS = { 1: [0.255, 0.52], 3: [0.405, 0.5], 4: [0.485, 0.37] };

// region views: each outdoor map is laid into a rectangle of its painting (x0, y0, x1, y1)
const TRAVEL_REGIONS = {
  reach: {
    name: 'The Resonant Reach', img: 'img/map_reach.jpg', across: 240,
    maps: { oakhaven: { ch: 1, rect: [0.40, 0.505, 0.78, 0.76], safe: true }, clearing: { ch: 1, rect: [0.36, 0.15, 0.72, 0.50], risk: 0.22 } },
    extra: [
      { map: 'oakhaven', spawn: true, name: 'Oakhaven: the North Gate square' },
      { map: 'clearing', spawn: true, name: 'Outside the Hedge' },
      { map: 'clearing', near: [15.5, 18.5], name: 'Kaelen\'s hut' },
      { map: 'clearing', near: [33.5, 19.8], name: 'Sable\'s camp' },
    ],
    at: { quarry: [0.70, 0.22] },
  },
  woods: {
    name: 'The Spectral Woods', img: 'img/map_woods.jpg', across: 300,
    maps: { whispergrove: { ch: 3, rect: [0.10, 0.28, 0.50, 0.85], risk: 0.26 }, deepwoods: { ch: 4, rect: [0.55, 0.0, 0.98, 0.45], risk: 0.32 } },
    extra: [
      { map: 'whispergrove', spawn: true, name: 'The Sunken Court, under the Kestrel' },
      { map: 'deepwoods', spawn: true, name: 'The Kestrel\'s camp', at: [0.68, 0.31] },
      { map: 'deepwoods', near: [45.5, 25.5], name: 'The wreck of the Office cutter' },
    ],
    at: { mausoleum: [0.85, 0.15] },
  },
};
const TRAVEL_NAMES = { wickhouse: 'The drowned Wick house', catacombs: 'The Sunken Stair to the Catacombs', malting: 'The Malting, Relief Station Nineteen', underhedge: 'The tannery culvert', quarry: 'The quarry headframe' };
const TRAVEL_FOES = { clearing: ['hound', 'proctor'], whispergrove: ['drowned', 'proctor', 'weaverling'], deepwoods: ['hound', 'weaverling', 'outrider', 'tongueless', 'hushmoth'] };

function travelChapter() { const f = G.flags; return f.part4 ? 4 : f.part3 ? 3 : 1; }
function travelRegionOfChapter(ch) { return ch >= 3 ? 'woods' : 'reach'; }
function travelImg(src) {
  if (!TRAVEL.img[src]) { const im = new Image(); im.onload = () => { if (G.openPanel === 'travel') travelDraw(); }; im.src = src; TRAVEL.img[src] = im; }
  return TRAVEL.img[src];
}
function travelMapVisited(m) { if (!m || !m.visited) return false; for (let i = 0; i < m.visited.length; i++) if (m.visited[i]) return true; return false; }
function travelSeenNear(m, x, y, r) {
  for (let yy = Math.floor(y - r); yy <= Math.ceil(y + r); yy++) for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++) {
    if (xx < 0 || yy < 0 || xx >= m.w || yy >= m.h) continue;
    if (m.visited[yy * m.w + xx]) return true;
  }
  return false;
}
function travelFree(m, x, y) {
  if (m.isBlocked(x | 0, y | 0)) return false;
  for (const [dx, dy] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) if (m.isBlocked((x + dx) | 0, (y + dy) | 0)) return false;
  for (const e of m.entities) { if (!e.solid || e.hidden || e.dead) continue; const rr = (e.radius || 0.3) + 0.3; if ((e.x - x) * (e.x - x) + (e.y - y) * (e.y - y) < rr * rr) return false; }
  return true;
}
function travelFreeNear(m, x, y) {
  if (travelFree(m, x, y)) return [x, y];
  for (let r = 0.5; r <= 4; r += 0.5) for (let a = 0; a < 16; a++) { const px = x + Math.cos(a / 16 * Math.PI * 2) * r, py = y + Math.sin(a / 16 * Math.PI * 2) * r; if (travelFree(m, px, py)) return [px, py]; }
  return null;
}
function travelPlace(R, mapId, x, y) { const rc = R.maps[mapId].rect, m = G.maps[mapId]; return [rc[0] + (x / m.w) * (rc[2] - rc[0]), rc[1] + (y / m.h) * (rc[3] - rc[1])]; }

// every destination in a region, with where it is on the painting and whether you may go
function travelDestinations(regionId) {
  const R = TRAVEL_REGIONS[regionId], ch = travelChapter(), out = [];
  const push = (d) => {
    const mc = R.maps[d.map], m = G.maps[d.map];
    const seen = travelMapVisited(m) && (d.spawn || travelSeenNear(m, d.x, d.y, 3));
    d.state = !seen ? 'unknown' : mc.ch === ch || (mc.ch === 1 && ch === 1) ? 'ok' : mc.ch < ch ? 'behind' : 'unknown';
    if (d.state !== 'unknown') out.push(d);
  };
  for (const ex of R.extra) {
    const m = G.maps[ex.map]; if (!m) continue;
    let x, y, dir;
    if (ex.spawn) { x = m.spawn.x; y = m.spawn.y; dir = m.spawn.dir || 0; } else { const p = travelFreeNear(m, ex.near[0], ex.near[1]); if (!p) continue; [x, y] = p; dir = Math.atan2(ex.near[1] - y, ex.near[0] - x) || 0; }
    const [fx, fy] = ex.at || travelPlace(R, ex.map, x, y);
    push({ name: ex.name, map: ex.map, x, y, dir, fx, fy, spawn: !!ex.spawn });
  }
  for (const mapId in R.maps) {
    const m = G.maps[mapId]; if (!m) continue;
    m.cells.forEach((c, i) => {
      if (!c || !c.portal || !G.maps[c.portal.map] || G.maps[c.portal.map].outdoor) return;
      const cx = i % m.w, cy = (i / m.w) | 0;
      let best = null;
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const nx = cx + dx + 0.5, ny = cy + dy + 0.5; if (travelFree(m, nx, ny)) { best = [nx, ny]; break; } }
      if (!best) return;
      const [fx, fy] = (R.at && R.at[c.portal.map]) || travelPlace(R, mapId, cx + 0.5, cy + 0.5);
      push({ name: TRAVEL_NAMES[c.portal.map] || c.label || G.maps[c.portal.map].name, map: mapId, x: best[0], y: best[1], dir: Math.atan2(cy + 0.5 - best[1], cx + 0.5 - best[0]), fx, fy, door: c.portal.map });
    });
  }
  return out;
}
// where you are on a region painting: your spot outside, or the door you came in by
function travelHere(regionId) {
  const R = TRAVEL_REGIONS[regionId], c = Engine.cam;
  if (R.maps[G.mapId]) {
    const ov = R.extra.find(ex => ex.map === G.mapId && ex.at && Math.hypot(G.maps[G.mapId].spawn.x - c.x, G.maps[G.mapId].spawn.y - c.y) < 4 && ex.spawn);
    return ov ? ov.at : travelPlace(R, G.mapId, c.x, c.y);
  }
  for (const mapId in R.maps) {
    const m = G.maps[mapId]; if (!m) continue;
    const i = m.cells.findIndex(cell => cell && cell.portal && cell.portal.map === G.mapId);
    if (i >= 0) return (R.at && R.at[G.mapId]) || travelPlace(R, mapId, i % m.w + 0.5, ((i / m.w) | 0) + 0.5);
  }
  // deeper down (the Root-vault, the Belfry): under whatever door leads towards it
  const parent = { rootvault: 'quarry', belfry: 'mausoleum' }[G.mapId];
  if (parent) { for (const mapId in R.maps) { const m = G.maps[mapId]; const i = m.cells.findIndex(cell => cell && cell.portal && cell.portal.map === parent); if (i >= 0) return (R.at && R.at[parent]) || travelPlace(R, mapId, i % m.w + 0.5, ((i / m.w) | 0) + 0.5); } }
  return null;
}

// may you set out from here, now?
function travelBlocked() {
  const m = G.map, f = G.flags, c = Engine.cam;
  if (G.dead) return 'You are in no state to go anywhere.';
  if (G.mapId === 'watchhouse') return 'Leave the watch-house by its street door before travelling.';
  if (G.escapeTimer > 0 || G.boreHold > 0) return 'There is no time for that. Run.';
  if (f.wg_ambush && !f.wg_ambush_over) return 'The Sunken Court is a fight now. Finish it first.';
  if (f.coda_go) return 'The choir is waiting. There is nowhere else to be.';
  if (!m.outdoor && ((m.danger || 0) > 0 || G.ents.some(o => o.kind === 'enemy' && !o.dead && !o.hidden))) return 'You cannot find your way from in here. Get out under the sky first.';
  if (G.ents.some(o => o.kind === 'enemy' && !o.dead && !o.hidden && o.state === 'chase' && Math.hypot(o.x - c.x, o.y - c.y) < 14)) return 'Not with something on your heels.';
  if (travelChapter() >= 3 && !TRAVEL_REGIONS.woods.maps[G.mapId] && !travelHere('woods')) return 'You cannot find your way from here.';
  return null;
}

function travelMinutes(d) {
  const R = TRAVEL_REGIONS[TRAVEL.region], im = TRAVEL.img[R.img];
  const h = TRAVEL.here || [d.fx, d.fy];
  const ar = im && im.naturalWidth ? im.naturalWidth / im.naturalHeight : 1.5;
  const dx = (d.fx - h[0]) * (ar >= 1 ? 1 : ar), dy = (d.fy - h[1]) * (ar >= 1 ? 1 / ar : 1);
  let mins = Math.max(10, Math.hypot(dx, dy) * R.across);
  if (TRAVEL.pace === 'cautious') mins *= 1.35;
  if (window.OctaveTravelSurvivalHardcore) mins = window.OctaveTravelSurvivalHardcore.computeTravelModifiers(G, mins / 60, 0, 'reckless').hours * 60;
  else if (horseActive()) mins *= HORSE.speed;
  // Foul weather is slower going, and the horse does not like it either.
  if (typeof Weather !== 'undefined') mins *= Weather.travelFactor();
  return Math.round(mins / 5) * 5;
}
function travelFmt(mins) { const h = Math.floor(mins / 60), mm = mins % 60; return (h ? `${h} hour${h > 1 ? 's' : ''}` : '') + (h && mm ? ' ' : '') + (mm || !h ? `${mm} minutes` : ''); }
function travelRisk(d, mins) {
  const mc = TRAVEL_REGIONS[TRAVEL.region].maps[d.map];
  if (mc.safe) return 0;
  const night = G.tod < 0.25 || G.tod > 0.83 ? 1.4 : 1;
  const sky = typeof Weather !== 'undefined' ? Weather.riskFactor() : 1;
  return Math.min(0.85, (mc.risk || 0.2) * (TRAVEL.pace === 'cautious' ? 0.4 : 1) * night * sky * clamp(mins / 45, 0.4, 1.5));
}

// ---------------------------------------------------------------- horses
// A hired horse is a travel modifier rather than a vehicle you steer: it shortens
// road time and carries fatigue. The term is absolute world hours, validated on load.
const HORSE = { cost: 25, refund: 10, hours: 24, speed: 0.65 };
function horseClock() { return (Number(G.day) || 0) * 24 + (Number(G.tod) || 0) * 24; }
function horseUntil() { const t = Number(G.player && G.player.horseUntil); return Number.isFinite(t) && t > 0 ? t : 0; }
function horseActive() { return horseUntil() > horseClock() + 1e-6; }
function horseHoursLeft() { return Math.max(0, horseUntil() - horseClock()); }
function horseFmtLeft(h) { const m = Math.round(h * 60); return m >= 120 ? `${(m / 60).toFixed(1).replace(/\.0$/, '')} hours` : `${m} minutes`; }
function openStable() {
  if (G.state !== 'play' || G.dead) return;
  const map = G.map;
  G.state = 'panel';
  const active = horseActive(), can = Number.isFinite(G.player.gold) && G.player.gold >= HORSE.cost;
  openModal(`<h2>The North Gate stables</h2>
    <p>Tack, hay and a mounting block under the Hedge. The ostler is a thin woman with a farrier's hands, and she does not ask where you are going.</p>
    <div class="horse-study"><b>${active ? 'Hired: the roan mare' : 'On foot'}</b><span>${active ? `${horseFmtLeft(horseHoursLeft())} left on the hire · ${Math.round((1 - HORSE.speed) * 100)}% faster on the road` : `A day's hire is ${HORSE.cost} sovereigns`}</span></div>
    <p>While she is hired, world-map journeys take about a third less time and you arrive less worn. She waits outside any door you go in by. Return her early and the ostler hands back ${HORSE.refund} sovereigns.</p>
    <div class="btns"><button class="dfbtn" id="stable-rent" ${active || !can ? 'disabled' : ''}>Hire her for a day${can || active ? '' : ' (no coin)'}</button><button class="dfbtn" id="stable-return" ${active ? '' : 'disabled'}>Return her (+${HORSE.refund})</button><button class="dfbtn" id="stable-leave">Leave</button></div>
    <p class="muted">1 hires · 2 returns · Escape leaves. Controller: A hires, X returns, B leaves.</p>`, 'stable');
  const token = G.panelToken;
  const valid = () => G.panelToken === token && G.openPanel === 'stable' && G.state === 'panel' && G.map === map && !G.dead;
  const leave = () => { closeModal(); G.state = 'play'; G.keys = {}; };
  $('#stable-leave').onclick = () => { if (valid()) leave(); };
  $('#stable-rent').onclick = () => {
    if (!valid()) return;
    const p = G.player;
    if (horseActive() || !Number.isFinite(p.gold) || p.gold < HORSE.cost) return;
    p.gold -= HORSE.cost; p.horseUntil = horseClock() + HORSE.hours;
    Audio_.sfx.pickup(); leave();
    msg(`You hire the roan mare for ${HORSE.cost} sovereigns. The ostler ties a green ribbon to the bridle: she is yours until this time tomorrow.`, 'good', 6500);
  };
  $('#stable-return').onclick = () => {
    if (!valid() || !horseActive()) return;
    const p = G.player; p.horseUntil = 0;
    p.gold = (Number.isFinite(p.gold) ? p.gold : 0) + HORSE.refund;
    Audio_.sfx.ui(); leave();
    msg(`You hand the mare back. The ostler counts ${HORSE.refund} sovereigns into your palm and hangs the green ribbon on its nail.`, '', 5500);
  };
}
window.addEventListener('keydown', (ev) => {
  if (G.openPanel !== 'stable' || ev.repeat) return;
  if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA')) return;
  const k = typeof keyOf === 'function' ? keyOf(ev) : (ev.key || '').toLowerCase();
  const id = { '1': 'stable-rent', '2': 'stable-return', escape: 'stable-leave' }[k];
  if (id) { ev.preventDefault(); const b = $('#' + id); if (b) b.click(); }
});

// ---------------------------------------------------------------- the panel
function travelOpen() {
  G.state = 'panel';
  TRAVEL.view = 'region'; TRAVEL.region = travelRegionOfChapter(travelChapter()); TRAVEL.sel = null; TRAVEL.hover = null;
  travelRender();
}
function travelRender() {
  const cont = TRAVEL.view === 'continent', R = TRAVEL_REGIONS[TRAVEL.region];
  TRAVEL.dests = cont ? [] : travelDestinations(TRAVEL.region);
  TRAVEL.here = cont ? null : travelHere(TRAVEL.region);
  const im = travelImg(cont ? 'img/map_continent.jpg' : R.img);
  const ok = TRAVEL.dests.filter(d => d.state === 'ok');
  const list = cont ? TRAVEL_REALMS.filter(r => r.region).map(r => `<button class="dfbtn small" data-realm="${r.id}">${r.name}</button>`).join('')
    : ok.length ? ok.map((d, i) => `<button class="dfbtn small${TRAVEL.sel === d.name ? ' sel' : ''}" data-dest="${i}">${d.name}</button>`).join('') : `<span class="muted">${TRAVEL.dests.length ? 'Every place here is behind you now. The Kestrel does not go back.' : 'Nowhere you know of yet. Walk, and the map fills in.'}</span>`;
  const html = `<h2>${cont ? 'The Long Octave' : R.name}</h2><button class="dfbtn small close" id="x">Close</button>
    <div class="tv-top"><button class="dfbtn small" id="tv-swap">${cont ? 'Back to ' + TRAVEL_REGIONS[travelRegionOfChapter(travelChapter())].name : 'The Long Octave'}</button>
    <span class="tv-legend">${cont ? '<i class="tv-sw gold"></i> Book One &nbsp; <i class="tv-sw here"></i> You' : '<i class="tv-sw gold"></i> Known &nbsp; <i class="tv-sw grey"></i> Left behind &nbsp; <i class="tv-sw here"></i> You'}</span></div>
    ${horseActive() ? `<p class="muted tv-horse">Horse hired · ${horseFmtLeft(horseHoursLeft())} left</p>` : ''}
    <div class="tv-body"><canvas id="tvmap" width="${im.naturalWidth || 1440}" height="${im.naturalHeight || 960}"></canvas>
    <div class="tv-side"><div class="tv-info" id="tvinfo"></div>
    <div class="tv-list" id="tvlist">${list}</div>
    <div class="tv-confirm" id="tvconfirm"></div></div></div>`;
  openModal(html, 'travel');
  $('#modal-panel').classList.add('travel');
  $('#x').onclick = travelClose;
  $('#tv-swap').onclick = () => { if (cont) { TRAVEL.view = 'region'; TRAVEL.region = travelRegionOfChapter(travelChapter()); } else TRAVEL.view = 'continent'; TRAVEL.sel = null; travelRender(); };
  for (const b of document.querySelectorAll('#tvlist [data-dest]')) b.onclick = () => travelSelect(ok[+b.dataset.dest]);
  for (const b of document.querySelectorAll('#tvlist [data-realm]')) b.onclick = () => travelRealm(TRAVEL_REALMS.find(r => r.id === b.dataset.realm));
  const cv = $('#tvmap');
  const at = (ev) => { const r = cv.getBoundingClientRect(); return [(ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height]; };
  cv.onmousemove = (ev) => { const h = travelHit(...at(ev)); if (h !== TRAVEL.hover) { TRAVEL.hover = h; travelInfo(); } cv.style.cursor = h && (h.state === 'ok' || h.region) ? 'pointer' : 'default'; };
  cv.onmouseleave = () => { TRAVEL.hover = null; travelInfo(); };
  cv.onclick = (ev) => { const h = travelHit(...at(ev)); if (!h) return; if (cont) travelRealm(h); else if (h.state === 'ok') travelSelect(h); else travelInfo(h); };
  travelInfo(); travelDraw();
  if (TRAVEL.sel) { const d = ok.find(o => o.name === TRAVEL.sel); if (d) travelConfirm(d); }
  cancelAnimationFrame(TRAVEL.raf);
  const loop = () => { if (G.openPanel !== 'travel') return; travelDraw(); TRAVEL.raf = requestAnimationFrame(loop); };
  TRAVEL.raf = requestAnimationFrame(loop);
}
function travelClose() { cancelAnimationFrame(TRAVEL.raf); $('#modal-panel').classList.remove('travel'); closeModal(); G.state = 'play'; }
function travelRealm(r) {
  if (r.region) { TRAVEL.view = 'region'; TRAVEL.region = r.region; TRAVEL.sel = null; travelRender(); return; }
  travelInfo(r, true);
}
function travelHit(fx, fy) {
  if (TRAVEL.view === 'continent') {
    for (const r of TRAVEL_REALMS) { const dx = (fx - r.c[0]) / r.r[0], dy = (fy - r.c[1]) / r.r[1]; if (dx * dx + dy * dy <= 1) return r; }
    return null;
  }
  const im = TRAVEL.img[TRAVEL_REGIONS[TRAVEL.region].img], ar = im && im.naturalWidth ? im.naturalWidth / im.naturalHeight : 1.5;
  let best = null, bd = 0.03;
  for (const d of TRAVEL.dests) { const dd = Math.hypot((d.fx - fx) * ar, d.fy - fy); if (dd < bd) { bd = dd; best = d; } }
  return best;
}
function travelInfo(item, sticky) {
  const el = $('#tvinfo'); if (!el) return;
  const h = item || TRAVEL.hover;
  if (TRAVEL.view === 'continent') {
    if (!h) { el.innerHTML = 'Eight realms around the Organum. Book One is the Reach and the Spectral Woods: click either to see it closer.'; return; }
    el.innerHTML = `<b>${h.name}</b>. ${h.text} ${h.region ? '<span class="tv-ok">Click to see it closer.</span>' : '<span class="muted">Not in this book.</span>'}`;
    if (sticky) TRAVEL.stickyRealm = h; return;
  }
  if (!h) { el.innerHTML = TRAVEL.dests.some(d => d.state === 'ok') ? 'Click a gold mark, or a name below, to travel there.' : (TRAVEL.dests.length ? 'These are places you have left behind. The Kestrel does not go back.' : 'Walk, and the map fills in with the places you find.'); return; }
  if (h.state === 'behind') { el.innerHTML = `<b>${h.name}</b>. <span class="muted">Left behind. The Kestrel does not go back.</span>`; return; }
  const mins = travelMinutes(h);
  el.innerHTML = `<b>${h.name}</b>. About ${travelFmt(mins)} ${TRAVEL.pace === 'cautious' ? 'cautiously' : 'recklessly'}${horseActive() ? ', mounted' : ''}.`;
}
function travelSelect(d) { TRAVEL.sel = d.name; for (const b of document.querySelectorAll('#tvlist [data-dest]')) b.classList.toggle('sel', b.textContent === d.name); travelConfirm(d); }
function travelConfirm(d) {
  const el = $('#tvconfirm'); if (!el) return;
  const block = travelBlocked(), mins = travelMinutes(d), risk = travelRisk(d, mins);
  const arrive = (() => { let t = G.tod + mins / 60 / 24; t -= Math.floor(t); const h = t * 24; return h < 5 ? 'in the dead hour' : h < 7 ? 'before dawn' : h < 12 ? 'in the morning' : h < 17 ? 'in the afternoon' : h < 20 ? 'at dusk' : 'at night'; })();
  const riskTxt = risk === 0 ? 'Inside the Hedge: no one will trouble you.' : risk < 0.1 ? 'The way looks quiet.' : risk < 0.22 ? 'Something may be abroad.' : 'This is hunting country.';
  el.innerHTML = `<p>Travel to <b>${d.name}</b>. About <b>${travelFmt(mins)}</b>, arriving ${arrive}. ${riskTxt}</p>
    ${horseActive() ? `<p class="muted">The roan mare is saddled: ${Math.round((1 - HORSE.speed) * 100)}% less road time, and she carries most of the wear.</p>` : ''}
    ${needsLine() ? `<p class="muted">${needsLine()}</p>` : ''}
    <div class="tv-row"><span class="tone"><button class="dfbtn small${TRAVEL.pace === 'cautious' ? ' sel' : ''}" id="tv-c">Cautiously</button><button class="dfbtn small${TRAVEL.pace === 'reckless' ? ' sel' : ''}" id="tv-r">Recklessly</button></span>
    <span class="muted tv-pace">${TRAVEL.pace === 'cautious' ? 'Slower, keeps to cover, and you arrive rested.' : 'Faster, louder, and you arrive tired.'}</span>
    <button class="dfbtn" id="tv-go"${block ? ' disabled' : ''}>Begin the journey</button></div>
    ${block ? `<p class="tv-block">${block}</p>` : ''}`;
  $('#tv-c').onclick = () => { TRAVEL.pace = 'cautious'; travelConfirm(d); travelInfo(); };
  $('#tv-r').onclick = () => { TRAVEL.pace = 'reckless'; travelConfirm(d); travelInfo(); };
  // Phase 10: js/motion10.js shows the finished journey as a walk across the map; the journey itself is still travelGo()
  $('#tv-go').onclick = () => (typeof MOTION10 !== 'undefined' && MOTION10.travel ? MOTION10.travel.go(d) : travelGo(d));
}

function travelDraw() {
  const cv = $('#tvmap'); if (!cv) return;
  const cont = TRAVEL.view === 'continent', R = TRAVEL_REGIONS[TRAVEL.region];
  const im = travelImg(cont ? 'img/map_continent.jpg' : R.img);
  if (!im.complete || !im.naturalWidth) { const x = cv.getContext('2d'); x.fillStyle = '#120d09'; x.fillRect(0, 0, cv.width, cv.height); return; }
  if (cv.width !== im.naturalWidth) { cv.width = im.naturalWidth; cv.height = im.naturalHeight; }
  const x = cv.getContext('2d'), W = cv.width, H = cv.height, T = performance.now() / 1000;
  const u = 0.62 * W / Math.max(1, cv.getBoundingClientRect().width || W); // marks keep the same size on screen
  x.drawImage(im, 0, 0, W, H);
  x.textAlign = 'center'; x.textBaseline = 'bottom';
  const label = (t, px, py, col) => { x.font = `700 ${Math.round(26 * u)}px "Alegreya SC", serif`; const hw = x.measureText(t).width / 2 + 6 * u; px = clamp(px, hw, W - hw); py = Math.max(py, 30 * u); x.lineWidth = 6 * u; x.strokeStyle = 'rgba(0,0,0,.85)'; x.strokeText(t, px, py); x.fillStyle = col || '#f3d98c'; x.fillText(t, px, py); };
  const pin = (fx, fy) => {
    const px = fx * W, py = fy * H, p = 0.5 + 0.5 * Math.sin(T * 4);
    x.beginPath(); x.arc(px, py, (14 + 8 * p) * u, 0, Math.PI * 2); x.strokeStyle = `rgba(120,240,255,${0.9 - 0.5 * p})`; x.lineWidth = 3 * u; x.stroke();
    x.beginPath(); x.moveTo(px, py - 9 * u); x.lineTo(px + 7 * u, py); x.lineTo(px, py + 9 * u); x.lineTo(px - 7 * u, py); x.closePath(); x.fillStyle = '#9ff4ff'; x.fill(); x.strokeStyle = '#06343a'; x.lineWidth = 2 * u; x.stroke();
  };
  if (cont) {
    for (const r of TRAVEL_REALMS) {
      const hov = TRAVEL.hover === r || TRAVEL.stickyRealm === r;
      if (!r.region && !hov) continue;
      x.beginPath(); x.ellipse(r.c[0] * W, r.c[1] * H, r.r[0] * W, r.r[1] * H, 0, 0, Math.PI * 2);
      x.setLineDash(r.region ? [] : [10 * u, 8 * u]); x.lineWidth = (hov ? 4 : 2) * u; x.strokeStyle = r.region ? (hov ? '#ffe7a0' : 'rgba(217,164,65,.75)') : 'rgba(230,220,200,.7)'; x.stroke(); x.setLineDash([]);
      if (hov) { x.fillStyle = 'rgba(255,230,160,.10)'; x.fill(); }
      if (r.region || hov) label(r.name, r.c[0] * W, (r.c[1] - r.r[1]) * H + 30 * u, r.region ? '#f3d98c' : '#e8e0d0');
    }
    // the Kestrel's road
    const ch = travelChapter();
    if (ch >= 3) {
      const a = TRAVEL_PINS[1], b = TRAVEL_PINS[3], c = TRAVEL_PINS[4];
      x.setLineDash([6 * u, 9 * u]); x.lineWidth = 3 * u; x.strokeStyle = 'rgba(255,240,200,.8)';
      x.beginPath(); x.moveTo(a[0] * W, a[1] * H); x.quadraticCurveTo((a[0] + b[0]) / 2 * W, (a[1] - 0.08) * H, b[0] * W, b[1] * H); if (ch >= 4) x.quadraticCurveTo((b[0] + c[0]) / 2 * W + 20 * u, (b[1] + c[1]) / 2 * H, c[0] * W, c[1] * H); x.stroke(); x.setLineDash([]);
    }
    const p = TRAVEL_PINS[ch]; pin(p[0], p[1]);
    return;
  }
  for (const d of TRAVEL.dests) {
    const px = d.fx * W, py = d.fy * H, hov = TRAVEL.hover === d, sel = TRAVEL.sel === d.name, s = (hov || sel ? 11 : 8) * u;
    x.fillStyle = d.state === 'ok' ? '#e6b04a' : '#8c8780'; x.strokeStyle = '#1a1006'; x.lineWidth = 3 * u;
    x.fillRect(px - s, py - s, s * 2, s * 2); x.strokeRect(px - s, py - s, s * 2, s * 2);
    if (sel) { x.strokeStyle = '#fff4d0'; x.lineWidth = 2.5 * u; x.strokeRect(px - s - 5 * u, py - s - 5 * u, (s + 5 * u) * 2, (s + 5 * u) * 2); }
    if (hov || sel) label(d.name, px, py - s - 8 * u, d.state === 'ok' ? '#f3d98c' : '#cfc8bd');
  }
  if (TRAVEL.here) pin(TRAVEL.here[0], TRAVEL.here[1]);
}

// ---------------------------------------------------------------- the road
function travelGo(d) {
  const block = travelBlocked(); if (block) { travelConfirm(d); return; }
  const mins = travelMinutes(d), risk = travelRisk(d, mins), pace = TRAVEL.pace, p = G.player;
  const mounted = horseActive();
  const fatigueCost = window.OctaveTravelSurvivalHardcore
    ? window.OctaveTravelSurvivalHardcore.computeTravelModifiers(G, 0, p.fatMax * 0.2, 'reckless').fatigueCost
    : p.fatMax * (mounted ? 0.08 : 0.2);
  travelClose();
  if (window.OctaveTravelSurvivalHardcore) window.OctaveTravelSurvivalHardcore.advanceJourneyNeeds(G, mins / 60);
  else passHours(mins / 60);
  if (pace === 'cautious') p.fat = Math.min(fatCap(), p.fat + p.fatMax * 0.25);
  else p.fat = Math.max(0, p.fat - fatigueCost);
  loadMap(d.map, { x: d.x, y: d.y, dir: d.dir });
  G.noise = pace === 'cautious' ? 0.8 : 2.4; G.stillT = 0;
  msg(`You travel ${pace === 'cautious' ? 'cautiously' : 'recklessly'} for ${travelFmt(mins)} and come to ${d.name}${mounted ? (horseActive() ? ', the mare blowing' : ', leading the mare the last mile') : ''}. It is ${timeName()}.`, '', 5000);
  if (Math.random() < risk) travelAmbush(d.map, pace);
}
function travelAmbush(mapId, pace) {
  const pool = TRAVEL_FOES[mapId]; if (!pool) return;
  const pool2 = pool.filter(t => ENEMIES[t]); if (!pool2.length) return;
  const n = pace === 'reckless' && Math.random() < 0.5 ? 2 : 1, c = Engine.cam, m = G.map, made = [];
  const type = pool2[rndi(0, pool2.length - 1)];
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 24; k++) {
      const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 2.5, x = c.x + Math.cos(a) * r, y = c.y + Math.sin(a) * r;
      if (!travelFree(m, x, y)) continue;
      const e = hydrate({ kind: 'enemy', type, x, y }); e.state = 'chase'; e.alertT = 10; G.ents.push(e); made.push(e); break;
    }
  }
  if (!made.length) return;
  const nm = ENEMIES[type].name;
  msg(made.length > 1 ? `On the way, two shapes fall in behind you. ${theName(nm, true)}, and another.` : `On the way, something picks up your trail: ${theName(nm, false)}.`, 'bad', 5000);
  Audio_.sfx.press && Audio_.sfx.press();
}

// ---------------------------------------------------------------- hooks
const _travelRenderMap = renderMap;
renderMap = function () {
  const r = _travelRenderMap.apply(this, arguments);
  const x = $('#x');
  if (x && !$('#tv-open')) { const b = document.createElement('button'); b.className = 'dfbtn small'; b.id = 'tv-open'; b.textContent = 'World map (T)'; b.style.cssText = 'position:absolute;right:9cqw;top:1cqh'; b.onclick = () => { closeModal(); travelOpen(); }; x.parentNode.insertBefore(b, x); }
  return r;
};
window.addEventListener('keydown', (ev) => {
  if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA') || ev.repeat) return;
  const k = typeof keyOf === 'function' ? keyOf(ev) : (ev.key || '').toLowerCase();
  if (k !== 't') return;
  if (G.state === 'play') travelOpen();
  else if (G.state === 'panel' && G.openPanel === 'travel') travelClose();
  else if (G.state === 'panel' && G.openPanel === 'map') { closeModal(); travelOpen(); }
});
const _travelOpenModal = openModal;
openModal = function (html, name) { const p = $('#modal-panel'); if (p) p.classList.toggle('travel', name === 'travel'); return _travelOpenModal(html, name); };
