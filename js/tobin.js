// ============================================================
//  tobin — Phase 6 (story reactivity): the twelve pages of Cantor Tobin Ashgrove's journal.
//
//  Tobin was Oakhaven's Cantor, Lyra's father, taken in the spring of 417 at the Pellow farm, before the Hedge was planted
//  (Book One's manuscript). The game already holds his Parish Register (spring 417), his Tuning-Blade and the slate
//  under the cairn. This module scatters twelve loose pages of an older, quieter book, spring 412 to the spring of
//  417, as findable items:
//    * each page is a transient item entity appended to its map when the map is entered (never saved, never
//      solid, never in a doorway), so saved entity indexes never shift and a page never respawns;
//    * collecting one sets G.flags.p6t_page_<n> = true (the only saved state) and opens the page as a held
//      document (READING.SOURCES, style 'parch', kind 'Journal');
//    * the logbook gains a "Tobin's Journal (n/12)" section that lists the found pages in order and re-reads them;
//    * finding all twelve gives a small, non-breaking reward once (p6t_done): experience, a title and a keepsake.
//
//  Security: no markup is built from saves or flags. Page text comes from the constant table below; flags are only
//  ever compared with === true. Switch: UPG.tobinPages (default on). Off = no pages, no section, original logbook.
//
//  Sprites are procedural stand-ins (a folded sheet painted into a Uint32Array, cached once).
//  Anything marked [PROPOSED] is invention beyond LORE_P6.md and the game's own text.
// ============================================================
'use strict';

if (typeof UPG !== 'undefined' && UPG.tobinPages === undefined) UPG.tobinPages = true;

const TOBIN = (function () {
  const N = 12;
  const on = () => typeof UPG === 'undefined' || UPG.tobinPages !== false;
  const FLAG = (n) => 'p6t_page_' + n;

  // ---------------------------------------------------------------- the pages
  // map/x/y: where the loose sheet lies (floor cells checked by test/tobin.test.js). found: the one line shown on pickup.
  // Voice: a Cantor's - tending notes, dry humour as armour, short concrete sentences, the Hush only ever reported.
  // [PROPOSED] throughout: the dates, the people around him and the small events are inventions that stay inside
  // the game's facts (Cascade famine, Essa lost at the sluice, the lease, the blade of 415, the first silences, the
  // hounds at the orchards, the bells taken for the bore's teeth and the bore in 417, the register, the cairn). Per
  // the manuscript he is taken at the Pellow farm in the spring of 417: the Hedge is only an idea in these pages.
  // [PROPOSED] why the pages lie where they do is never explained; the found-lines only say where a sheet was tucked.
  const PAGES = [
    { n: 1, map: 'greenhall', x: 1.6, y: 5.0, head: 'The east rows', date: 'Rootday, early spring, 412 SR',
      found: 'A single sheet, folded small, is wedged behind the ledgers on the Greenhall shelf.',
      text: [
        `Tending notes, the east rows. Still cold. The buds are holding their breath.`,
        `The old men say sing nothing to a tree before the third week, and then only the root note, a hand's width above the ground, with the mouth nearly closed. I have done it thirty springs and still feel a fool, kneeling in mud and humming at a pear.`,
        `Fed the grafts on the south wall their fifth. The Bergamot took it. The Pippins are sulking. Found two reeds in the lower orchard cracked by frost and replaced them from the beds by the Flume, tuning each against my own breastbone before I cut the slot.`,
        `Bettany came by with honey for my throat and a lecture about my throat. I said a Cantor's voice is the one tool he cannot sharpen. She said that was a poor reason to leave it out in the rain.`,
        `Lyra wants the reeds this year. She says she is not afraid of them. She has said so four times, which is how many times a person says it when she is.`,
        `Does it ring? The orchard rings. True enough.`] },
    { n: 2, map: 'lyra_house', x: 1.6, y: 5.8, head: 'The long cane', date: 'Memoryday, high summer, 412 SR',
      found: 'A sheet is pinned flat under a reed-knife beside the hearth, one corner scorched brown.',
      text: [
        `Lyra has the reeds. I mean she has them the way a cat has a sunbeam: all of her, and no notice taken of anyone else.`,
        `I set her the long cane first, the one that sounds the root, and told her to blow across it until the note stopped being a noise and became a place. By supper she had it. By dark she had the fifth as well, which I did not ask for, and was blowing it at the hearth-cat to see what it thought.`,
        `She holds the cane too tight. So did I, at her age. I told her so, and she said she had noticed whose daughter she was.`,
        `Tonight she tuned the First Reed above our own door, standing on the chair with her tongue between her teeth, while the wind came up the lane and the whole house hummed under her. It is a good house. It sounds like somebody lives in it.`,
        `Called her lark at supper. She pretended to mind.`] },
    { n: 3, map: 'underhedge', x: 7.5, y: 24.5, head: 'The sluice-gate', date: 'Hearthday, Ashfall, 412 SR',
      found: 'A page is caught in the roots at the foot of the wool wall, damp and soft as cloth.',
      text: [
        `The Choir-Church sent a young man up the south road with a very clean voice, to tell us in the chapel that the Light had let go of the world because one voice had shouted at it. He did not say whose. He said the Pure Note would be our comfort. I have buried enough people to know what that sentence means.`,
        `The grain from the south has stopped. We are told the Cascade was nobody's fault. The Governor says to keep faith and ration.`,
        `Sang Essa down at the sluice-gate on Massday, there being nothing else to put in the ground. Tam asked for The Miller's Daughter, both verses. I gave him both. The water was very loud.`,
        `Went into the chapel after, and stood under the bells, and listened to them not ringing. They will ring for Essa on Rootday. Somebody ought to.`] },
    { n: 4, map: 'mill', x: 2.5, y: 9.5, head: 'Gradients', date: 'Dawnday, Frostmonth, 413 SR',
      found: 'A sheet is stuck behind a loose board near the mill wall, stiff with damp.',
      text: [
        `Surveyors at the Carders' mill today, three of them in grey, with brass staves and a chain, walking the Flume bank a pace at a time and writing every pace down. Politely. Nobody has ever been so polite to my orchard.`,
        `Nell asked what they measured. The tall one said gradients. I asked whose. He said the Synod's, as though that were a place.`,
        `They drove a stake into the bank above the sluice and hung a small glass bell on it, and it began to hum, very low. I put my hand flat on the post and knew the note. Ours. Growth. One-seven-four, coming up out of the ground and being listened to.`,
        `I asked what he was listening for. He said, "Whatever's there, Cantor." He said it kindly. He had the face of a man who has been taught to be kind about things.`,
        `Asked Harrow to walk a night-round of the mill. I could not have said what for. Perhaps for the stake.`] },
    { n: 5, map: 'quarry', x: 26.5, y: 6.5, head: 'Such resonances as lie beneath', date: 'Stasisday, Harvestmonth, 414 SR',
      found: 'A page is folded into the shelf by the quarry stores, under a fixed price-list.',
      text: [
        `The Governor read the lease aloud in the Greenhall, standing, in his good coat, and did not look at the room. The Consortium of Bores takes the quarry, the shaft, and "such resonances as lie beneath." In return, bread: a cart a week, at a fixed price, for nine years.`,
        `Nine years is not long to a tree. It is long to a hungry child.`,
        `I voted to refuse, and I was the only one who did, and I do not think the others were cowards. I had seen the ration-slates. A man can hold out against a great many things on an empty stomach, but not against the smell of the baker's.`,
        `Afterward the Governor found me in the porch and said, "Say it, Tobin." I said I had nothing to say that he had not said to himself. He said he had said it every night for a month. I thought that a very sad joke, and so did he.`,
        `Walked up to the quarry at dusk. They have fenced the headframe. Even the fence hums.`] },
    { n: 6, map: 'tavern', x: 1.6, y: 4.4, head: 'Bell-bronze', date: 'Nullday, Ashfall, 415 SR',
      found: 'A sheet, ringed by the base of a cup, is tucked behind the tavern shelf.',
      text: [
        `The smith has finished the blade. I did not ask for it. The Greenhall voted it, all but Bettany, who said a Cantor with a sword was a pair of shears in a sermon. She is right. I took it anyway.`,
        `It is long and plain, bell-bronze from the cracked treble that has stood in the chapel porch since my grandfather's day, ground until it rings at one-seven-four when struck. Not loud. It rings the way a held breath rings. I tapped it on the tavern step and every glass on the counter shivered in sympathy, and the potboy dropped a tray.`,
        `The idea is that it can cut a tuning where a voice cannot reach: a note thrown at a thing, instead of sung to it. I have no intention of using it. I have put it behind the door with the garden hooks, where it hums to the hooks.`,
        `Lyra picked it up this evening and held it correctly at once, which I do not love. I took it back. She said it was too heavy for a first fifth anyway. She was right about that as well.`] },
    { n: 7, map: 'orla_house', x: 1.6, y: 4.6, head: 'A place where a sound should be', date: 'Rootday, Firstfruit, 416 SR',
      found: 'A page is tucked down the side of the settle, the ink a little smudged.',
      text: [
        `Three doors on Cooper's Row, and their First Reeds do not sound. I went along the lane with my ear turned, door by door. The wind was up. The reeds hung straight as if painted on, and there was nothing wrong with any of them. I took one down and blew across it, and it spoke perfectly well. I hung it back, and in the wind it was silent.`,
        `Orla said she could not hear her own kettle. It was boiling. We both watched it.`,
        `That is the whole of it. A place where a sound should be, and is not. I have listened for the Hush all my life, the way one listens for a step on the stair. I did not know it would be so ordinary. It was not unkind. That was the worst of it.`,
        `Nobody screamed. I keep waiting for the part where somebody screams.`,
        `Lit a lamp in the porch of every house along the Row. A hush-lamp keeps a room from going quite still. Slept badly.`] },
    { n: 8, map: 'wickhouse', x: 2.4, y: 2.5, head: 'The drover', date: 'Driftday, Ashfall, 416 SR',
      found: 'A page lies flat on the shelf of the Wick House, weighed down by a stone.',
      text: [
        `A drover came up the south road with a story I have been trying not to believe. Whisper-Grove has stopped. He did not say fallen, or taken. He said stopped, and when I asked him to say it again he did, in the same flat voice, like a man reading from a card.`,
        `He said the Grove had kept the dead for a thousand years. "The Echo," he said. "It used to catch them. It was in all the songs." Now a man dies and the note goes out of him and nothing takes it up. He said that on the old fields beyond the Grove you can hear the dead humming, and that it is thinner every month.`,
        `That is a thing I will not tell Lyra. I have written it here instead, where a page can hold what a person should not have to.`,
        `I asked him where he was going. He said he had not decided. He only knew that he did not want to be where it was quiet.`,
        `Gave him bread and the root-note's blessing, and watched him go down the road, humming.`] },
    { n: 9, map: 'mausoleum', x: 4.4, y: 22.6, head: 'A congregation of hounds', date: 'Hearthday, Stillmonth, 417 SR',
      found: 'A sheet lies among the scriptorium papers, older than the paper around it.',
      text: [
        `The hounds came to the orchards on Massday night. Not into the town: to the edge of the east rows, where they sat. Eleven, in a row, heads on one side, like a congregation. They did not howl. They listened.`,
        `Harrow says it was the evening bell that brought them. We have stopped ringing it. Now they wait for whatever else we do that sounds like one: the kettle, the cartwheel, the milkmaid's second verse.`,
        `I called the Cantors of the three nearest parishes to the Greenhall. Two came. The third sent a note that said only: We have stopped being able to send.`,
        `It was a carder from the mill who said it. Not a wall: a stopper. Wrap the town in what eats sound, the way you pad a cradle against a draught. Pack the thorn with wool, and plant the thorn deep. A hedge three men deep that swallows what we make, so the hounds hear nothing and have nothing to come for.`,
        `It is a coward's plan. It is also the only one anyone has offered. I wrote "yes" in the register and did not feel any better.`] },
    { n: 10, map: 'chapel', x: 1.6, y: 9.4, head: 'The bells', date: 'Massday, Thawmonth, 417 SR',
      found: 'A page lies between two hymn-leaves on the chapel floor, grey with dust.',
      text: [
        `They took the bells down this week, for the bore. The Synod's order came up with the Consortium's cart and a young man of the Church with a very clean voice, who said it was a blessing, and that the bore had need of the bronze for its teeth. The Chapel's six, the clock-bell off the Greenhall, the little bells in the reed-rows. Nobody argued much. Everybody knows now what a bell brings.`,
        `It took six men and a block to bring the great bell down. It did not ring as it came. I think it was the one time in two hundred years it was not asked to.`,
        `I said the Carillon had need of the bronze. He said the Carillon would be remembered. I did not tell him what that sentence means when a Cantor says it. He will find out.`,
        `The chapel is quiet now. I keep humming into it, to see whether it will give me anything back.`] },
    { n: 11, map: 'rootvault', x: 36.4, y: 8.6, head: 'The lullaby', date: 'Memoryday, Seedmonth, 417 SR',
      found: 'A sheet is jammed under the foot of a pump-housing, its edge printed with green.',
      text: [
        `They have begun to sink the bore. I went down the quarry shaft in the first week, against advice and a Consortium clerk, because a Cantor ought to hear what is done in his parish.`,
        `Below the third landing the walls begin to be alive. I know no better word. Green-gold, warm to the hand, veined like a leaf held to the sun. The Root. It sings, if singing is the word for a thing that has been told it may not stop. A lullaby, and it keeps losing the tune. It finds it, and loses it, and finds it, and the loss is worse each time.`,
        `The engineers say it is "within tolerance." I asked, whose? A young man with a ledger said the question was outside his remit. He was not unkind. He had been shown how not to be.`,
        `I sang the root note to the wall, softly, to tell it that somebody had heard. The wall hummed back. Then the drill started, and I climbed out into daylight and was ill in the quarry road.`,
        `I do not think we have long.`] },
    { n: 12, map: 'clearing', x: 8.6, y: 21.4, head: 'For Lyra', date: 'Driftday, Lambmonth, 417 SR',
      found: 'A last sheet is pinned flat under a stone at the edge of the western oaks.',
      text: [
        `For Lyra, if the register is lost and this is not.`,
        `I am writing at the Pellows' kitchen table. Their youngest has the marsh-fever, and it has gone the wrong way: not burning, cooling. She is quieter every hour. I have sung to her all night in the Narrow, the way I taught you, and she keeps slipping.`,
        `I have put in the register what I mean to do, if it comes to it. This is what I did not put there.`,
        `If it comes to it, I will sing her back at full voice: the Root, and then the calling-song, loud enough to go through the walls. They will hear it from the quarry to the Flume. So I will go out by the kitchen door, and keep singing across the yard, so that they follow the song and not the child.`,
        `I left the blade under the oaks on my way up, since a Cantor who goes to a sickbed holding a sword has mistaken his vocation.`,
        `You will be angry. Good. Keep it in your chest, where it keeps, and save your voice for the living.`,
        `Does it ring? It rings, lark. True enough.`,
        `T.`] },
  ];

  // The closing sheet: what the player reads on gathering all twelve (a held document of its own).
  const DONE_TITLE = 'Tobin\'s Journal, bound';
  const DONE_TEXT = [
    `You square the twelve pages against your knee, spring to spring, and they sit together as if they had never been apart. They are not a book. They have no spine, and the hand wavers in the last four. But it is one hand, from the pear-grafts to the oaks, and it never once asks to be pitied.`,
    `You find you have read it as a stranger reads a stranger's letters, and that it is not working. He keeps turning into somebody you know.`,
    `Somewhere in the Reach a reed hangs over a door and does not sound. Somewhere a man set all of this down so that someone would know how the town was built, and by whom, and that he was afraid, and went anyway.`,
    `You tie the pages with a strip of your own sleeve. Does it ring? True enough.`,
  ];
  const REWARD = { xp: 100, title: 'Keeper of the Pages', item: 'tobin_journal' };

  // ---------------------------------------------------------------- items and the held-document titles
  if (typeof ITEMS !== 'undefined') {
    ITEMS.tobin_page = { name: 'A page in a Cantor\'s hand', sprite: 'tobin_page', desc: 'A loose sheet of close, careful writing. Take it up and read.', key: true };
    ITEMS.tobin_journal = { name: 'Tobin\'s Journal', sprite: 'tobin_page', desc: 'Twelve loose pages in Cantor Tobin Ashgrove\'s hand, spring 412 to spring 417, tied with a strip of sleeve.', key: true };
  }
  const titleOf = (n) => 'Tobin\'s Journal, page ' + n;
  if (typeof READING !== 'undefined' && READING.SOURCES) {
    for (const p of PAGES) READING.SOURCES[titleOf(p.n)] = { style: 'parch', kind: 'Journal' };
    READING.SOURCES[DONE_TITLE] = { style: 'parch', kind: 'Journal' };
  }

  // ---------------------------------------------------------------- the sprite (procedural stand-in)
  function paintSprite() {
    if (typeof Engine === 'undefined' || !Engine.addSprite || (Engine.sprites && Engine.sprites.tobin_page)) return;
    const w = 24, h = 24, d = new Uint32Array(w * h);
    const px = (x, y, r, g, b, a) => { if (x >= 0 && y >= 0 && x < w && y < h) d[y * w + x] = ((a == null ? 255 : a) << 24) | (b << 16) | (g << 8) | r; };
    for (let y = 7; y < 22; y++) for (let x = 5; x < 19; x++) {   // the sheet, slightly turned: a diagonal shear
      const sx = x + ((y - 7) >> 3);
      const edge = y === 7 || y === 21 || x === 5 || x === 18;
      const warm = 226 - (y - 7) * 2;
      px(sx, y, edge ? 150 : warm, edge ? 118 : warm - 26, edge ? 70 : warm - 78);
    }
    for (let k = 0; k < 5; k++) for (let x = 8; x < 16 - (k === 4 ? 3 : 0); x++) px(x + 1, 10 + k * 2, 70, 48, 28, 210);   // lines of writing
    Engine.addSprite('tobin_page', { w, h, data: d, hs: 1, cx: 0.5, dy: 0 });
  }
  paintSprite();

  // ---------------------------------------------------------------- state (flags only; always validated)
  function flags() { return (typeof G !== 'undefined' && G.flags && typeof G.flags === 'object') ? G.flags : {}; }
  const has = (n) => flags()[FLAG(n)] === true;
  function count() { let c = 0; for (let n = 1; n <= N; n++) if (has(n)) c++; return c; }
  const found = () => PAGES.filter(p => has(p.n));
  const isDone = () => flags().p6t_done === true;
  const bodyHTML = (p) => '<p><i>' + p.date + '</i></p>' + p.text.map(t => '<p>' + t + '</p>').join('');

  // ---------------------------------------------------------------- placing the pages
  function entityFor(p) {
    return { kind: 'item', item: 'tobin_page', sprite: 'tobin_page', x: p.x, y: p.y, scale: 0.4, yOff: 0, solid: false, glow: 0.2,
      transient: true, tobinPage: p.n, label: 'A page in a Cantor\'s hand' };
  }
  // Called whenever a map is entered: puts that map's uncollected pages back (anim.js sweeps transient entities).
  function ensure(map) {
    if (!map || !Array.isArray(map.entities)) return;
    for (let i = map.entities.length - 1; i >= 0; i--) {   // collected, or the switch is off: none left in the list
      const e = map.entities[i];
      if (e && e.tobinPage && (!on() || has(e.tobinPage))) map.entities.splice(i, 1);
    }
    if (!on()) return;
    for (const p of PAGES) {
      if (p.map !== map.id || has(p.n)) continue;
      if (map.entities.some(e => e && e.tobinPage === p.n)) continue;
      map.entities.push(entityFor(p));
    }
  }
  // Tobin's seven reed-pipes on their pegs in Lyra's house (Book One ch. 1): "the last reeds in the Reach that had not
  // turned. She oiled them every month, because he always had." Transient like the pages (never saved), always there.
  const PIPES = { map: 'lyra_house', x: 2.7, y: 1.45 };
  const PIPES_TITLE = 'Tobin\'s reed-pipes';
  const PIPES_TEXT = 'Seven reed-pipes on their pegs above the chest, the last reeds in the Reach that have not turned. Someone oils them every month, because he always did. They have not been played in two years.';
  const PIPES_TAKEN = 'The oil on them is fresh. She did it before they came for her.';
  function ensurePipes(map) {
    if (!map || map.id !== PIPES.map || !Array.isArray(map.entities)) return;
    if (map.entities.some(e => e && e.tobinPipes)) return;
    map.entities.push({ kind: 'deco', sprite: 'p9p_reedcase', x: PIPES.x, y: PIPES.y, scale: 0.5, radius: 0.15, solid: false, transient: true, tobinPipes: true, use: 'tobin_pipes', label: PIPES_TITLE });
  }
  function showPipes() {
    const taken = typeof G !== 'undefined' && G.flags && G.flags.rite_started === true;
    showEvent(PIPES_TITLE, PIPES_TEXT + (taken ? ' ' + PIPES_TAKEN : ''), [{ t: 'Leave them on their pegs.', f: null }]);
  }
  function syncAll() {
    if (typeof G === 'undefined' || !G.maps) return;
    for (const id in G.maps) { const m = G.maps[id]; if (m === G.map || !on()) ensure(m); }
  }

  // ---------------------------------------------------------------- reading, collecting, completion
  function showPage(p, choices) {
    if (typeof showEvent !== 'function') return;
    showEvent(titleOf(p.n), bodyHTML(p), choices);
  }
  function complete() {
    const f = flags();
    if (f.p6t_done === true || count() < N) return false;
    f.p6t_done = true;
    try {
      if (typeof questXp === 'function') questXp(REWARD.xp);
      if (typeof G !== 'undefined' && G.give && !G.has(REWARD.item)) G.give(REWARD.item, 1);
      if (typeof earnTitle === 'function') earnTitle(REWARD.title);
      if (typeof Audio_ !== 'undefined' && Audio_.sfx && Audio_.sfx.fifth) Audio_.sfx.fifth();
    } catch (e) { console.warn('tobin: reward failed', e); }
    showEvent(DONE_TITLE, DONE_TEXT.map(t => '<p>' + t + '</p>').join('') + '<p><b>(You keep Tobin\'s Journal. Your logbook holds all twelve pages.)</b></p>', [{ t: 'Put it away.', f: null }]);
    return true;
  }
  function collect(e) {
    const p = PAGES[(e.tobinPage | 0) - 1];
    if (!p) return;
    const f = flags();
    const first = f[FLAG(p.n)] !== true;
    e.hidden = true; e.dead = true;
    if (first) {
      f[FLAG(p.n)] = true;
      try { if (typeof Audio_ !== 'undefined' && Audio_.sfx && Audio_.sfx.pickup) Audio_.sfx.pickup(); } catch (err) { /* sound is optional */ }
      msg(p.found + ' (Tobin\'s Journal ' + count() + '/' + N + ')', 'good', 5000);
    }
    showPage(p, [{ t: 'Fold it away.', f: () => { try { complete(); } catch (err) { console.warn('tobin: completion failed', err); } } }]);
  }

  // ---------------------------------------------------------------- the logbook section
  function decorateLog() {
    const panel = document.getElementById('modal-panel');
    if (!panel || panel.querySelector('#tobin-log') || !count()) return;
    const sec = document.createElement('section'); sec.id = 'tobin-log'; sec.className = 'tobin-log';
    const h = document.createElement('h3'); h.textContent = 'Tobin\'s Journal (' + count() + '/' + N + ')'; sec.appendChild(h);
    const note = document.createElement('p'); note.className = 'muted';
    note.textContent = isDone() ? 'All twelve pages. Read them in order.' : 'Loose pages in Cantor Tobin Ashgrove\'s hand. Read what you have found; the rest lie somewhere he walked.';
    sec.appendChild(note);
    const list = document.createElement('div'); list.className = 'tobin-pages'; list.setAttribute('role', 'list');
    for (const p of PAGES) {
      if (has(p.n)) {
        const b = document.createElement('button'); b.className = 'dfbtn small'; b.type = 'button'; b.setAttribute('role', 'listitem');
        b.dataset.tobinPage = String(p.n);
        b.textContent = p.n + '. ' + p.head;
        b.onclick = () => reread(p);
        list.appendChild(b);
      } else {
        const s = document.createElement('span'); s.className = 'muted tobin-gap'; s.setAttribute('role', 'listitem');
        s.textContent = p.n + '. (not found)';
        list.appendChild(s);
      }
    }
    sec.appendChild(list);
    const first = panel.querySelector('h3');
    if (first) panel.insertBefore(sec, first); else panel.appendChild(sec);
  }
  function reread(p) {
    if (!has(p.n)) return;
    closeModal(); G.state = 'event';
    showPage(p, [{ t: 'Back to the logbook.', f: () => { G.state = 'panel'; renderLog(); } }]);
  }
  function injectStyle() {
    if (typeof document === 'undefined' || document.getElementById('tobin-style')) return;
    const st = document.createElement('style'); st.id = 'tobin-style';
    st.textContent = `.tobin-log { margin: 0 0 1.2cqh; }
.tobin-pages { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 15em), 1fr)); gap: .5cqh 1cqw; }
.tobin-pages .dfbtn, .tobin-gap { text-align: left; min-width: 0; overflow-wrap: anywhere; }
.tobin-gap { padding: .4em .6em; }`;
    (document.head || document.documentElement).appendChild(st);
  }

  // ---------------------------------------------------------------- wrapping the originals
  if (typeof document !== 'undefined') {
    injectStyle();
    if (typeof pickUp === 'function') {
      const _pickUp = pickUp;
      pickUp = function (e) {
        if (e && e.tobinPage && !e.dead) {
          if (!on()) return;   // switch off: the page is not there
          try { collect(e); } catch (err) { console.warn('tobin: page failed', err); }
          return;
        }
        return _pickUp.apply(this, arguments);
      };
    }
    if (typeof loadMap === 'function') {
      const _loadMap = loadMap;
      loadMap = function (id) {
        try { if (typeof G !== 'undefined' && G.maps && G.maps[id]) { ensure(G.maps[id]); ensurePipes(G.maps[id]); } } catch (err) { console.warn('tobin: placement failed', err); }
        const r = _loadMap.apply(this, arguments);
        // anim.js clears the current map's transient entities when a map is re-entered (a load onto the same map)
        try { ensure(G.map); ensurePipes(G.map); } catch (err) { /* never break a map change */ }
        return r;
      };
    }
    if (typeof useDeco === 'function') {
      const _useDeco = useDeco;
      useDeco = function (e) {
        if (e && e.tobinPipes) { try { showPipes(); } catch (err) { console.warn('tobin: pipes failed', err); } return; }
        return _useDeco.apply(this, arguments);
      };
    }
    if (typeof renderLog === 'function') {
      const _renderLog = renderLog;
      renderLog = function () {
        const r = _renderLog.apply(this, arguments);
        if (on()) { try { decorateLog(); } catch (err) { console.warn('tobin: logbook section failed', err); } }
        return r;
      };
    }
    if (typeof update === 'function') {   // a live switch change takes effect without a map change
      let shown = on();
      const _update = update;
      update = function (dt) {
        if (shown !== on()) { shown = on(); try { syncAll(); } catch (err) { /* never break a frame */ } }
        return _update.apply(this, arguments);
      };
    }
  }

  return { PIPES, ensurePipes, PAGES, N, REWARD, DONE_TITLE, DONE_TEXT, titleOf, has, count, found, ensure, syncAll, collect, complete, decorateLog, bodyHTML, flagName: FLAG };
})();
