// ============================================================
//  festivals12 — Phase 12 (festivals of the Reach), team FESTIVALS.
//  The author's FESTIVALS_CANON ruling: festivals follow the crop, the river and the weather, are kept by a village,
//  use folk tunes, and never appear on an Office docket. Four of them are in Book One. One switch, Options ->
//  Graphics & access -> "Festivals" (default On, localStorage 'octave.festivals12.v1'). Off = the game as before:
//  no prop, no person, no line, no wrapped behaviour that does anything.
//
//   1. THE LAST SHEAF (Harvest Home). Day 2 (Hearthday the eighth of Harvestmonth) a sheaf is hung on the Hedge-gate
//      [PROPOSED date]; Oakhaven prepares (bunting, small sheaves on the lamp-posts, a harvest table in the square with
//      hearth bread, cider and moot-curd, townsfolk talk, the Sheaf Song hummed in the Boar). Day 4 (Stasisday the
//      tenth) [PROPOSED] the Church postpones it: a notice is nailed under the sheaf, the bunting comes down, and the
//      Synod Gazette prints a line. The north field (the NE corner inside the Hedge, [PROPOSED]) keeps its last stand uncut.
//   2. SIDE QUEST "The Last Sheaf". After the postponement and before the Greening, Old Harrow (who hung the sheaf)
//      asks you to help cut it in secret. At the dead hour (04:00-06:00, the hour before dawn) Dunna Sedge and four
//      villagers are in the north field. You must be quiet (G.noise low) to begin, and then cut on every beat of the
//      Sheaf Song: sixteen beats, a din meter that rises with ragged and stray strokes. Too loud and a Church patrol walks
//      the hedge-lane: the cut is abandoned for the night, no punishment. Reward: the Plaited Sheaf-Figure, a loaf and a
//      jug, a small Hedge standing bump, a journal entry. Declining, missing it, or the Greening coming first is fine
//      (the closing line is "The sheaf was still standing in the north field.").
//   3. THE RITE AS FALSE FESTIVAL. While the Rite is staged (flags rite_started, or rite_ready and day >= 10) and the
//      Greening has not come: white banners, censer smoke, a herald at the crossroads, a compulsory-gathering notice and
//      a set of sermon lines. Presentation only: no quest flag is read for anything but "is it on", none is written.
//   4. THE EEL-RUN. The night of day 6 (Driftday the twelfth) [PROPOSED]: lanterns on stakes along the Flume crossing,
//      trappers on the bank, and a quiet fishing variant at the existing fishing spot: cast, stand still, and haul on
//      the bite. Noise above the quiet limit startles the eels. Six eels at most (small validated integer).
//   5. THE DROWNED LANTERNS. After the Greening, the first night spent in Whisper-Grove [PROPOSED]: lanterns on the lit
//      water and a basket of blank ones at the edge. Set one for a name from your ledger or the people you have met
//      or read of (never markup: names are cleaned and shown with textContent), or for "the ones not written down".
//
//  Saved state: G.flags p12f_ only, small validated integers (see FLAGS): p12f_q quest stage (0 none, 1 asked and
//  accepted, 2 cut, 3 closed by the Greening), p12f_ask offered once, p12f_try day+1 of the last abandoned cut,
//  p12f_hung the figure is on the gate, p12f_seen the sheaf was seen, p12f_eel eels taken in the run, p12f_dl day+1 of
//  the first day spent in the Grove after the Greening, p12f_dls lanterns set. Anything else under that prefix is
//  dropped on load. Props and people are transient (never saved) and rebuilt from the flags and the clock.
//  Wrapped (never edited): loadMap, restoreGame, update, talk, useDeco, useItem, showEvent, renderAccessibilityMenu.
//  Every invented fact is marked [PROPOSED]; all player-visible text is in TX (registered through S()).
// ============================================================
'use strict';

const FESTIVALS12 = (function () {
  const KEY = 'octave.festivals12.v1';
  const cfg = { on: true };
  function loadCfg() {
    try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o && typeof o === 'object' && typeof o.on === 'boolean') cfg.on = o.on; } catch (e) { /* storage blocked: the default stands */ }
  }
  function saveCfg() { try { localStorage.setItem(KEY, JSON.stringify({ on: cfg.on })); } catch (e) { /* ignore */ } }

  // ---------------------------------------------------------------- balance and schedule, one table
  const B = {
    SHEAF_DAY: 2,            // [PROPOSED] the sheaf is hung: Hearthday the eighth of Harvestmonth
    POST_DAY: 4,             // [PROPOSED] the Church postpones it: Stasisday the tenth
    RITE_DAY: 10,            // js/game.js: the Rite is Hearthday the sixteenth
    EEL_DAY: 6,              // [PROPOSED] the Eel-Run: Driftday the twelfth (the night of this day)
    NIGHT_FROM: 0.82,        // 19:41, the night a festival keeps begins
    NIGHT_TO: 0.24,          // 05:45 the next morning
    DEAD_FROM: 4 / 24,       // the dead hour: the hour before dawn, 04:00 to 06:00
    DEAD_TO: 6 / 24,
    CUT_BEATS: 16,           // one cut on every beat of the Sheaf Song
    CUT_NEED: 12,            // cuts that must land for the stand to fall clean
    BEAT: 0.72,              // seconds a beat takes (reduced motion: BEAT_SLOW)
    BEAT_SLOW: 0.95,
    WIN_PERFECT: 0.11, WIN_GOOD: 0.26, WIN_RAGGED: 0.46,     // seconds either side of a beat
    DIN_MAX: 4.0,            // the din that brings the patrol
    DIN_PERFECT: 0.25, DIN_GOOD: 0.55, DIN_RAGGED: 0.9, DIN_STRAY: 1.0, DIN_DECAY: 0.4,   // per beat
    START_NOISE: 3.2,        // G.noise above this and Dunna will not begin
    FISH_QUIET: 1.9,         // G.noise above this scares the eels (standing still is 1.0, a walk 2.4)
    FISH_WAIT: [4, 7.5], FISH_BITE: 2.4, EEL_CAP: 6, FISH_LOUD_GRACE: 0.25,
    LANTERNS_ALIVE: 16, LANTERN_LIFE: 90,
    REP_HEDGE: 5, XP_CUT: 40,
    SERMON_EVERY: 34,        // seconds between sermon lines in the square
    HUM_EVERY: 42,           // seconds between hummed verses at the Boar
  };

  // ---------------------------------------------------------------- the text (every player-visible string; see TEXT.md)
  const LIST = [];
  const S = (t) => { LIST.push(t); return t; };
  const TX = {
    opts: { label: S('Festivals'), hint: S('The Last Sheaf, the Rite dressed as a feast, the Eel-Run on the Flume and the Drowned Lanterns of Whisper-Grove. Off: none of it.') },
    sheaf: {
      hung: S('Someone has hung a sheaf on the Hedge-gate in the night. By noon every street knows what it means: the last field is ready to be cut.'),   // [PROPOSED]
      prep: [S('Oakhaven is making ready for the Last Sheaf. Bunting on the lamp-posts, flour on every step, and no one humming the song in the open street.'),
        S('The smell of new-flour bread is in the lane. Nobody has said what it is for.')],
      post: S('A Church notice has been nailed to the Hedge-gate, under the sheaf. The sheaf has not been taken down.'),
      gateLabel: S('A sheaf from the last field, hung on the Hedge-gate. It means the day is named.'),
      gateLabelPost: S('The sheaf is still on the Hedge-gate. Nobody has taken it down. Nobody has been asked to.'),
      gateLabelFig: S('Two sheaves on the Hedge-gate: the old one, and a plaited figure beside it. They stay until spring.'),
      smallLabel: S('A small sheaf tied to the lamp-post with a red cord.'),
      buntingLabel: S('Bunting of faded cloth, strung for the Last Sheaf.'),
      tableLabel: S('A harvest table: new-flour bread, cider, curd in dock-leaf.'),
      stand: S('The last stand of the north field, uncut. The rest of the field is stubble.'),
      standHint: S('The last stand of the north field, uncut. Harrow says the Reach lets one sheaf stay cut. Nobody has said it will be this one.'),
      standClosed: S('The sheaf is still standing in the north field.'),
      stubble: S('Stubble. The field was cut weeks ago, all but the last stand.'),
      stook: S('Stooks of the last stand, left to dry. It stayed cut.'),
      noticeLabel: S('A Church notice, nailed under the sheaf. Read it.'),
      noticeTitle: S('A Church notice, nailed under the sheaf'),
      noticeBody: S('NOTICE. The Choir-Church of the Pure Note acknowledges the agricultural custom of the Last Sheaf, which falls due in the week of the Rite. In the interest of the district\'s attention, the custom is postponed until after Hearthday. Gatherings in a field are gatherings. No sheaf is to be cut before notice is given. Notice will be given.'),
      noticeBtn: S('Leave it nailed.'),
      gazettePrep: S('The district custom styled the Last Sheaf is noted. It is agricultural. Agricultural customs are tolerated for as long as they remain agricultural.'),
      gazettePost: S('The custom styled the Last Sheaf, which falls in the week of the Rite, is postponed until after Hearthday. Postponement is not prohibition. No sheaf is to be cut before notice is given.'),
      gazetteRite: S('The Rite of Hearthday is declared a district festival. Attendance at a festival is voluntary and will be minuted. Absence will be recorded as a preference.'),
      folkPrep: [
        S('The sheaf is up on the gate. You saw. Everyone saw. Nobody is mentioning it, loudly.'),
        S('Last Sheaf this week. We cut it together, one cut to a beat. The field has been waiting.'),
        S('Hearth bread from the new flour. It tastes of nearly what it should.'),
        S('My mother cut the last stand with eighty people. We are fewer. We will cut it anyway.'),
        S('It is the one sheaf that stays cut. Everything else grows back by morning and tastes of less. This one is allowed to end.'),
        S('Do you know the Sheaf Song? Everyone can carry a tune. Nobody can read one.')],
      folkPost: [
        S('The Church wants it put off until after Hearthday. "Agricultural custom," it says, in that tone.'),
        S('They have told us to wait. The grain does not read notices.'),
        S('The sheaf is still on the gate. Nobody has taken it down. Nobody has been asked to.'),
        S('The north field stands. Do not walk in it. Walk beside it, and look.')],
      hum: S('Somebody at the next table is humming the Sheaf Song, low, and the man across from him is pretending not to hear. "Cut it low, and cut it slow, the last of the year is let to go."'),   // [PROPOSED] the words
    },
    baker: {
      name: S('Brenna Loft, baker'),                                                                       // [PROPOSED]
      polite: S('Softly, love. New flour, the first in a year that tastes of nearly what it should. Bread, cider, curd. Eat it while it is warm.'),
      normal: S('Hearth bread, cider, moot-curd. Last Sheaf week. Market prices; I am not here to get rich.'),
      blunt: S('If you are going to shout, buy something first, and shout into the bread.'),
      hello: S('Everything on the board is from the new flour or the last apples. Ask the scale; it is honest.'),
      broke: S('Not enough, love. Come back with coin, or with a song, and I will take the song.'),
      thanks: [S('Eat it warm.'), S('The first loaf is for luck. Yours is the second.'), S('Take the dock-leaf too. It keeps the curd.')],
      topicOak: S('We bake for the Last Sheaf every year the field is cut. This year the dough is rising and nobody has told the Church.'),
      topicHedge: S('Flour does not mind the Hedge. Flour minds the damp.'),
    },
    harrow: {
      offer: S('Still here. Good. Come close and keep it low. The Church has put the Sheaf off, and I have hung it eleven years running and I will not take it down for a notice. The north field\'s last stand is ripe, and it will not wait: grain in the Reach goes back to seed by morning and tastes of less each time. The Sheaf is the one stand that is allowed to stay cut. We mean to cut it in the dead hour, the hour before dawn, nobody speaking, one cut to a beat. We need a hand that can keep the Narrow low. Will you stand in the line?'),
      yes: S('I will stand in the line.'), no: S('Not this time.'),
      accept: S('Dunna Sedge binds it. The north field, past the Carders\' mill; any night, in the dead hour, the hour before the dawn. Keep your boots soft and your breath small. If it goes loud we lie down in the stubble and let the patrol go by, and that is all that happens. Nobody is punished for a cut that did not get cut.'),
      declined: S('No. That is an honest answer, and I will not hold it against you. The gate will keep.'),
      reoffer: S('The north field. The dead hour. If you have a mind to stand in the line, Dunna Sedge will have a sickle for you.'),
      waiting: S('North field, the dead hour. Keep the Narrow low. You are no use to us loud.'),
      waitingRite: S('Not now. They have the square. After the Rite, if there is an after.'),
      done: S('It is cut. I will not say I was there. The figure goes over the gate and stays till spring, if the Church lets spring come.'),
      jOffer: S('Old Harrow asked me to help hold the Last Sheaf in secret. The Church has put it off. The north field\'s last stand is to be cut in the dead hour, the hour before dawn, with the Narrow kept low: one cut on every beat, nobody speaking. Dunna Sedge binds it. The north field is past the Carders\' mill.'),
      jDone: S('We cut the Last Sheaf in the dead hour: sixteen sickles on sixteen beats, and nobody speaking. Dunna Sedge plaited a figure from the last of it and gave it to me, with a loaf and a jug of cider. It is allowed to stay cut. The Hedge-gate wants it.'),
      jClosed: S('The sheaf was still standing in the north field.'),
    },
    dunna: {
      name: S('Dunna Sedge, sheaf-binder'),                                                                // [PROPOSED]
      polite: S('Not here. Not now. Ask Harrow.'), normal: S('Not now. Ask Harrow.'), blunt: S('Hush. Ask Harrow, and ask him quietly.'),
      ready: S('Dunna Sedge has her hood up and a sickle in her hand. "Quiet as your footfalls?" she breathes. "Then stand where I can see you. One cut to a beat. If it goes loud we lie down in the stubble."'),
      yes: S('Take a sickle and stand in the line.'), no: S('Not yet.'),
      notYet: S('"Breathe, then," she says. "It will keep. It has kept this long."'),
      tooLoud: S('"Too loud," she breathes. "You came in like a cart. Stand still a moment, and let the field forget you."'),
      tonightOver: S('"They are still on the lane," Dunna says, without looking round. "Not tonight. The field will keep."'),
      lineUp: S('You take a sickle and kneel in the line. The stalks are cold and heavy and smell of nearly what they should.'),
      villager: [S('Shh.'), S('Sickle low. Breathe with the song.'), S('My mother cut this field. Shh.'), S('Not a word. Not one.')],
    },
    cut: {
      title: S('The Last Sheaf'),
      hint: S('Cut on every beat. The stand is cut together, in the dark, and nobody speaks.'),
      keys: S('Space, Enter or E cut · Esc puts the sickle down · pad: A cuts, B puts it down · or tap Cut'),
      begin: S('Begin'), cutBtn: S('Cut'), stop: S('Put the sickle down'), close: S('Close'),
      ready: S('Wait for the count. Cut as the ring closes.'),
      alt: S('Sixteen stalks in the dark, and a ring closing on each in turn.'),
      din: S('Noise {0} of {1}'), progress: S('Cut {0} of {1}'),
      perfect: S('A clean cut.'), good: S('A cut.'), ragged: S('A ragged cut. Somebody heard that.'), stray: S('A stray stroke, loud in the dark.'),
      patrol: S('A lantern on the hedge-lane. Two in white, walking slow. "Down," Dunna breathes, and the line goes into the stubble like a shadow. You lie there and count their steps. When they have gone nobody has the heart to finish. "Another night," she whispers. "It has kept this long."'),
      patrolLabel: S('Two in white, with a lantern, walking the hedge-lane.'),
      rag: S('The cut is ragged, and half the stand leans uncut. Dunna shakes her head, not unkindly. "Again, another night. Sing it under your breath. It keeps you on the beat."'),
      doneTitle: S('The last stand'),
      done: S('Sixteen cuts, and the field takes the sixteenth the way a held breath takes air. Nobody cheers. Dunna binds the sheaf with a plait of its own stalks and gives it to you in both hands, the way you pass a sleeping child. "This one stays cut," she says. "Everything else grows back by morning and tastes of less. This one is allowed to end." Behind her someone is crying very quietly, the way you do when you are not meant to be heard. In the morning the Church will find the stubble and say nothing, which is its way of counting.'),
      doneBtn: S('Take the sheaf-figure'),
      rep: S('The Hedge folk will remember it.'),
      put: S('You put the sickle down. Dunna nods once.'),
    },
    items: {
      bread: { name: S('Hearth Bread'), desc: S('A round loaf from the new flour, still faintly warm from some hearth. It tastes of nearly what bread should. Restores 12 health and 20 fatigue.'), eat: S('You eat the hearth bread. It tastes of nearly what it should, and you do not say so.') },
      cider: { name: S('Last-Apple Cider'), desc: S('Cloudy, sharp, in a stoppered clay jug. Restores 10 voice and 15 fatigue.'), eat: S('The cider is sharp and cloudy. Your throat remembers it is for singing.') },
      curd: { name: S('Moot-Curd'), desc: S('Soft salted curd in a dock-leaf; what is eaten at the moot. Restores 6 health and 10 voice.'), eat: S('Moot-curd, salted, in dock-leaf. Plain and good.') },
      eel: { name: S('Run-Eel'), desc: S('A green Flume eel taken alive and quiet in the Eel-Run. Eat it for strength (14 health, 25 fatigue), or sell it: the Boar pays well for run-eels.'), eat: S('You eat the run-eel, boiled twice. Warmth returns to your limbs.') },
      figure: { name: S('Plaited Sheaf-Figure'), desc: S('Plaited from the last stand of the north field, cut in the dead hour. It is the one sheaf allowed to stay cut. It belongs over the Hedge-gate until spring.') },
      hang: S('You hang the sheaf-figure over the Hedge-gate beside the old sheaf. It turns once and hangs level. It will stay until spring.'),
      hangFar: S('Hang it over the Hedge-gate. That is where it belongs.'),
    },
    rite: {
      herald: S('Herald of the Pure Note'),
      polite: S('Blessings of the Pure Note, citizen. Take a place in the square. There is bread after. There is always bread after.'),
      normal: S('The Rite is a festival. Festivals are attended.'),
      blunt: S('Lower your voice. This is a feast, and feasts are quiet.'),
      topic: S('A feast for the whole district. Attendance is a courtesy and will be noted.'),
      entry: [S('White banners hang from every roof-peg, and the censers are lit. Oakhaven has been dressed for a festival, and nobody is smiling.'),
        S('A herald in white stands at the crossroads. "By order of the Choir-Church, the district will assemble in the square. The Rite is a feast. Attendance is a courtesy and will be noted."')],
      sermon: [S('One note, held. One town, held under it. This is the peace of the Pure Note.'),
        S('Be glad. Gladness is the only attendance that cannot be counted wrong.'),
        S('The Rite is a feast for the whole district. Eat what is given. Hum what is given.'),
        S('A town that sounds one note is a town that has nothing to fear from the Quiet.'),
        S('Do not hum under the Note. It is not a punishment. It is a listening.'),
        S('Not coming to the square is not absence. It is noted as elsewhere.')],
      bannerLabel: S('A white banner of the Pure Note. It is very clean.'),
      censerLabel: S('A censer on a tripod. The smoke is sweet, and it settles in the throat.'),
      noticeLabel: S('A notice of the Choir-Church: the Rite. Read it.'),
      noticeTitle: S('By order: the Rite'),
      noticeBody: S('ALL RESIDENTS will assemble in the square at noon for the Rite of Hearthday, a district festival. Attendance is a courtesy. Absence will be recorded as a preference. Bread will be provided afterwards. Humming beneath the Pure Note is not attendance.'),
      noticeBtn: S('Step back.'),
      folk: [S('White banners. They hung them while we slept. We are to stand in the square at noon. "Attendance will be noted."'),
        S('A festival, they call it. I have been to festivals. This one has a count at the door.'),
        S('Hum under it. Low. They cannot punish what they cannot hear.'),
        S('The smoke from their censers gets in the bread. I will never eat a loaf again without tasting it.')],
    },
    eel: {
      entry: S('Lanterns have come out along the Flume, low to the water, one every few paces. The eels are going down tonight, and everyone who owns a trap is on the bank. Nobody is talking. The eels can hear.'),
      warn: S('Tonight is the Eel-Run. After dusk the Flume bank fills with lanterns and nobody speaks. It is one night only.'),
      stake: S('A paper lantern on a stake, low over the water. The eels go down toward the light.'),
      trap: S('A wicker eel-trap, weighted with a stone and set in the shallows.'),
      float: S('A paper lantern afloat on the Flume, going down with the eels.'),
      folk: [S('Shh. They run on the dark and the quiet. Cough, and they turn back.'),
        S('Late this year. Everything is late this year. The seasons are wrong and the eels came anyway.'),
        S('Stand still, line in, and wait. It is like prayer, only it works.'),
        S('The Driftday walker went down the bank at dusk and lit the first lantern. That is how we know.')],
      cast: S('You let the reed-line down into the Flume and stand very still.'),
      still: S('Still. Wait. The line is down.'),
      waiting: S('The green water goes on, close and dark. You keep your breath small.'),
      bite: S('The line shivers. Now.'),
      haul: S('You haul up an eel, green as a bruise, and it does not thrash. Even the eels keep quiet tonight.'),
      missed: S('It slips the line. The eels keep their own counsel.'),
      startled: S('The eels felt that. The water closes over them like a door.'),
      loud: S('Too loud. The eels would turn back. Stand still a moment, and try again.'),
      cap: S('Enough eels for one run. The rest of the Flume is for tomorrow\'s hunger.'),
      away: S('You let the line go slack and step away.'),
      journal: S('The night of the Eel-Run: the whole bank in lanterns, every trap down, nobody speaking. I took an eel on the Flume by standing very still. The eels can hear. Everyone on the bank behaves as though it were a church.'),
    },
    grove: {
      entry: S('The water in the Sunken Court has come up in the night, the way it does once a year, and every ripple holds a light. Paper lanterns on the lit water, a few hundred, drifting out under the willows. The Synod never banned it. Nobody from the Synod comes here.'),
      basket: S('A basket of blank paper lanterns at the water\'s edge. One lantern, one name, said aloud.'),
      float: S('A paper lantern on the lit water, drifting out.'),
      title: S('The Drowned Lanterns'),
      intro: S('One lantern, one name, said aloud as you set it. Choose the name.'),
      names: S('Names in your logbook'),
      generic: S('For the ones not written down'),
      stop: S('Step back'),
      keys: S('Up and Down choose · Enter sets the lantern · Esc steps back · pad: D-pad, A, B'),
      said: S('"{0}." The lantern turns once on the lit water, and goes out under the willows.'),
      saidGeneric: S('You set a lantern for the ones not written down. It goes out slowly, with the others, and nobody asks whose.'),
      full: S('The water is full of lights. Wait for one to go out.'),
      far: S('The water is too far. Stand at the edge.'),
      journal: S('On the night the Court\'s water rose I set a lantern on it and said a name aloud. Nobody stopped me. Nobody from the Synod comes here.'),
    },
  };

  // ---------------------------------------------------------------- small helpers
  const hasG = () => typeof G !== 'undefined' && G && G.flags && typeof G.flags === 'object';
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const flags = () => (hasG() && !Array.isArray(G.flags) ? G.flags : {});
  const dayNow = () => { const d = hasG() ? Number(G.day) : 0; return Number.isFinite(d) ? clamp(Math.floor(d), 0, 99999) : 0; };
  const todNow = () => { const t = hasG() ? Number(G.tod) : 0; return Number.isFinite(t) ? ((t % 1) + 1) % 1 : 0; };
  const fmt = (s, ...a) => String(s).replace(/\{(\d+)\}/g, (m, i) => (a[+i] == null ? '' : a[+i]));
  const el = (tag, props, text) => { const e = document.createElement(tag); if (props) for (const k in props) e.setAttribute(k, props[k]); if (text != null) e.textContent = text; return e; };
  const reduced = () => !!(typeof GFX !== 'undefined' && GFX && (GFX.reduceMotion || GFX.reducedMotion));
  const noFlash = () => !!(typeof GFX !== 'undefined' && GFX && GFX.noFlash);
  const say = (t, c, ms) => { try { if (typeof msg === 'function') msg(t, c, ms); } catch (e) { /* the message line is cosmetic */ } };
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // text that came from a save (a ledger name): markup characters out, length capped, whitespace folded
  const cleanTxt = (s, n) => String(s == null ? '' : s).replace(/[<>&"`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, n || 40);

  // ---------------------------------------------------------------- flags: small validated integers
  const FLAGS = { p12f_q: [0, 3], p12f_ask: [0, 1], p12f_try: [0, 100000], p12f_hung: [0, 1], p12f_seen: [0, 1], p12f_eel: [0, B.EEL_CAP], p12f_dl: [0, 100000], p12f_dls: [0, 99], p12f_eelw: [0, 1] };
  function fint(k) {
    const r = FLAGS[k], v = flags()[k];
    return (typeof v === 'number' && Number.isInteger(v) && v >= r[0] && v <= r[1]) ? v : r[0];
  }
  function fset(k, v) { const r = FLAGS[k]; try { if (hasG()) G.flags[k] = clamp(Math.floor(v), r[0], r[1]); } catch (e) { /* a save that cannot hold flags */ } }
  // a loaded save is untrusted: every known flag is clamped back to an integer in range, every other p12f_ key is dropped
  function sanitizeFlags() {
    if (!hasG()) return;
    const f = G.flags;
    for (const k of Object.keys(f)) {
      if (k.indexOf('p12f_') !== 0) continue;
      if (!own(FLAGS, k)) { delete f[k]; continue; }
      const r = FLAGS[k], v = f[k];
      if (!(typeof v === 'number' && Number.isInteger(v) && v >= r[0] && v <= r[1])) { if (v === true && r[1] === 1) f[k] = 1; else delete f[k]; }
    }
  }

  // ---------------------------------------------------------------- the schedule: pure functions of the day, the hour and the flags
  const gone = (f) => !!(f.greening || f.escaped || f.part3);
  const greenedOak = (f) => !!(f.greening && !f.part3 && !f.escaped);        // the Greening Oakhaven can still be walked
  function riteOn(f, d) { return !!(f && !gone(f) && (f.rite_started || (f.rite_ready && d >= B.RITE_DAY))); }
  // 'off' | 'early' | 'prep' | 'post' | 'rite' | 'gone'
  function phaseOf(d, f) {
    if (!cfg.on) return 'off';
    f = f || flags();
    if (gone(f)) return 'gone';
    if (riteOn(f, d)) return 'rite';
    if (d >= B.POST_DAY) return 'post';
    if (d >= B.SHEAF_DAY) return 'prep';
    return 'early';
  }
  const phase = () => phaseOf(dayNow(), flags());
  const isDeadHour = (tod) => tod >= B.DEAD_FROM && tod < B.DEAD_TO;
  const isEelNight = (d, tod) => (d === B.EEL_DAY && tod >= B.NIGHT_FROM) || (d === B.EEL_DAY + 1 && tod < B.NIGHT_TO);
  function isLanternNight(d, tod) {
    const v = fint('p12f_dl'); if (!v) return false;
    return (d === v - 1 && tod >= B.NIGHT_FROM) || (d === v && tod < B.NIGHT_TO);
  }
  const eelNight = () => cfg.on && hasG() && !gone(flags()) && isEelNight(dayNow(), todNow());
  const lanternNight = () => cfg.on && hasG() && !!flags().part3 && isLanternNight(dayNow(), todNow());
  const questOpen = () => { const f = flags(); const p = phase(); return fint('p12f_q') === 1 && (p === 'post' || p === 'rite'); };
  const cutDone = () => fint('p12f_q') === 2;
  // is the crew in the field right now?
  function crewOn() {
    return cfg.on && phase() === 'post' && fint('p12f_q') === 1 && isDeadHour(todNow()) && fint('p12f_try') !== dayNow() + 1;
  }
  const state = { scattered: false, scatterDay: -1, accT: 0, sermonT: 0, sermonN: 0, humT: 12, fish: { st: 'idle', t: 0, wait: 0, loud: 0, n: 0, spot: null }, lanterns: [], patrol: null, said: {}, warned: false };

  // ================================================================ art (procedural stand-in: canvas paintings)
  function paint(w, h, draw) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c = cv.getContext('2d', { willReadFrequently: true });
    draw(c, w, h);
    const id = c.getImageData(0, 0, w, h), u8 = id.data;
    for (let i = 0; i < w * h; i++) { const o = i * 4; u8[o + 3] = u8[o + 3] < 100 ? 0 : 255; }
    return new Uint32Array(id.data.buffer);
  }
  function reg(name, w, h, draw, emit) {
    if (typeof Engine === 'undefined' || !Engine.addSprite || Engine.sprites[name]) return;
    const data = paint(w, h, draw);
    Engine.addSprite(name, { w, h, data, hs: 1, cx: 0.5, dy: 0 });
    if (emit && Engine.setEmissive) {                       // the warm paper pixels of a lantern give their own light
      const m = new Uint8Array(w * h); let n = 0;
      for (let i = 0; i < m.length; i++) { const p = data[i]; if ((p >>> 24) < 160) continue; const r = p & 255, g = (p >>> 8) & 255, b = (p >>> 16) & 255; if (r > 205 && g > 120 && b < 150 && r > g * 1.08) { m[i] = 1; n++; } }
      if (n) Engine.setEmissive(name, m);
    }
  }
  function paintAll() {
    const stalks = (c, w, h, n, x0, x1, base, top, seed, col) => {
      const R = mulberry(seed);
      for (let i = 0; i < n; i++) {
        const bx = x0 + (x1 - x0) * (i + R() * 0.6) / n, lean = (R() - 0.5) * 7, ty = top + R() * 9, tx = bx + lean;
        c.strokeStyle = col[i % 3]; c.lineWidth = 1.5; c.beginPath(); c.moveTo(bx, base); c.quadraticCurveTo(bx + lean * 0.3, (base + ty) / 2, tx, ty + 6); c.stroke();
        c.fillStyle = col[(i + 1) % 3]; c.beginPath(); c.ellipse(tx, ty + 2, 1.7, 5.2, lean * 0.05, 0, 7); c.fill();
        c.strokeStyle = '#e8cd78'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(tx, ty - 3); c.lineTo(tx + lean * 0.12, ty - 8); c.stroke();
      }
    };
    const GOLD = ['#b8923a', '#d0a84a', '#a8843a'];
    reg('p12_sheaf', 28, 46, (c) => {                           // a bound sheaf, ears up, cord round the waist
      stalks(c, 28, 46, 13, 7, 21, 44, 4, 11, GOLD);
      c.fillStyle = '#a8843a'; c.beginPath(); c.moveTo(6, 44); c.lineTo(22, 44); c.lineTo(18, 33); c.lineTo(10, 33); c.closePath(); c.fill();
      c.fillStyle = '#8a2f26'; c.fillRect(8, 29, 12, 3); c.fillStyle = '#b8443a'; c.fillRect(8, 29, 12, 1);
    });
    reg('p12_sheaf_fig', 28, 46, (c) => {                       // a plaited figure: two woven lantern-shapes, a ribbon, a loop
      c.strokeStyle = '#6a4a22'; c.lineWidth = 1.2; c.beginPath(); c.arc(14, 4, 3, 0, 7); c.stroke();
      const lozenge = (cy, hw, hh) => {
        c.fillStyle = '#d2ac55'; c.beginPath(); c.moveTo(14, cy - hh); c.lineTo(14 + hw, cy); c.lineTo(14, cy + hh); c.lineTo(14 - hw, cy); c.closePath(); c.fill();
        c.strokeStyle = '#8a6a2a'; c.lineWidth = 0.9;
        for (let k = -3; k <= 3; k++) { c.beginPath(); c.moveTo(14 - hw + k * 2.6, cy - hh * 0.9); c.lineTo(14 + hw + k * 2.6 - 7, cy + hh * 0.9); c.stroke(); }
        c.strokeStyle = '#a8843a'; c.beginPath(); c.moveTo(14, cy - hh); c.lineTo(14 + hw, cy); c.lineTo(14, cy + hh); c.lineTo(14 - hw, cy); c.closePath(); c.stroke();
      };
      lozenge(15, 9, 11); lozenge(34, 8, 10);
      c.fillStyle = '#9a2f26'; c.fillRect(10, 24, 8, 3); c.fillRect(12, 27, 2, 4); c.fillRect(15, 27, 2, 3);
    });
    reg('p12_bunting', 96, 22, (c) => {                         // a sagging cord of faded pennants
      c.strokeStyle = '#3a2a1a'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(0, 3); c.quadraticCurveTo(48, 12, 96, 3); c.stroke();
      const cols = ['#a8482e', '#c9a24a', '#5a7a4a', '#8a6a9a', '#d8cfae', '#4a6a8a'];
      for (let i = 0; i < 12; i++) {
        const t = (i + 0.5) / 12, x = t * 96, y = 3 + 2 * (2 * t * (1 - t)) * 4.5 * 1.0 + 0.6;
        c.fillStyle = cols[i % cols.length]; c.beginPath(); c.moveTo(x - 4, y); c.lineTo(x + 4, y); c.lineTo(x, y + 12); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 0.6; c.stroke();
      }
    });
    reg('p12_grain', 64, 46, (c, w, h) => stalks(c, w, h, 26, 5, 59, 44, 4, 3, GOLD));
    reg('p12_grain_big', 80, 62, (c, w, h) => { stalks(c, w, h, 38, 5, 75, 60, 3, 5, GOLD); c.fillStyle = 'rgba(80,60,20,.35)'; c.fillRect(8, 56, 64, 4); });
    reg('p12_stubble', 48, 14, (c) => { const R = mulberry(9); c.strokeStyle = '#9a8040'; c.lineWidth = 1.2; for (let i = 0; i < 34; i++) { const x = 1 + R() * 46, hh = 3 + R() * 6; c.beginPath(); c.moveTo(x, 13); c.lineTo(x + (R() - 0.5) * 2, 13 - hh); c.stroke(); } });
    reg('p12_stook', 56, 44, (c) => {                           // three leaning sheaves tied at the top
      for (const [x0, x1] of [[10, 26], [46, 30], [28, 28]]) {
        c.strokeStyle = '#c0983e'; c.lineWidth = 3.2; c.beginPath(); c.moveTo(x0, 42); c.lineTo(x1, 8); c.stroke();
        c.strokeStyle = '#d8b455'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x0 + 2, 42); c.lineTo(x1 + 1, 8); c.stroke();
      }
      c.fillStyle = '#8a2f26'; c.fillRect(23, 14, 10, 3);
      c.fillStyle = '#a8843a'; c.beginPath(); c.moveTo(24, 6); c.lineTo(32, 6); c.lineTo(28, 1); c.closePath(); c.fill();
    });
    reg('p12_table', 64, 42, (c) => {                           // a trestle table with the harvest on it
      c.fillStyle = '#4a3622'; c.fillRect(6, 24, 4, 18); c.fillRect(54, 24, 4, 18);
      c.fillStyle = '#7a5a36'; c.fillRect(2, 22, 60, 5); c.fillStyle = '#9a7a4a'; c.fillRect(2, 22, 60, 1);
      c.fillStyle = '#e8dcb7'; c.fillRect(4, 20, 56, 3); c.fillStyle = '#9a2f26'; c.fillRect(4, 21, 56, 1);
      for (const x of [12, 22, 32]) { c.fillStyle = '#b8803a'; c.beginPath(); c.ellipse(x, 17, 6, 4.5, 0, 0, 7); c.fill(); c.fillStyle = '#d8a45a'; c.beginPath(); c.ellipse(x - 1, 15.5, 4, 2, 0, 0, 7); c.fill(); }
      c.fillStyle = '#7a5a3a'; c.fillRect(42, 8, 7, 12); c.fillRect(44, 4, 3, 5); c.fillStyle = '#c9a24a'; c.fillRect(43, 11, 5, 4);
      c.fillStyle = '#e8dcb7'; c.beginPath(); c.moveTo(52, 20); c.lineTo(60, 20); c.lineTo(56, 13); c.closePath(); c.fill();
      stalks(c, 64, 42, 6, 2, 10, 20, 2, 21, GOLD);
    });
    reg('p12_banner', 24, 64, (c) => {                          // a white banner on a pole; a single held note
      c.fillStyle = '#5a4630'; c.fillRect(11, 0, 2, 64); c.fillStyle = '#b08a3a'; c.fillRect(2, 3, 20, 3); c.fillRect(10, 0, 4, 3);
      c.fillStyle = '#ecece6'; c.beginPath(); c.moveTo(4, 6); c.lineTo(20, 6); c.lineTo(20, 54); c.lineTo(16, 49); c.lineTo(12, 55); c.lineTo(8, 49); c.lineTo(4, 54); c.closePath(); c.fill();
      c.strokeStyle = '#cfcfc6'; c.lineWidth = 1; for (const x of [8, 12, 16]) { c.beginPath(); c.moveTo(x, 8); c.lineTo(x, 46); c.stroke(); }
      c.fillStyle = '#2a3040'; c.fillRect(11, 16, 2, 22); c.beginPath(); c.arc(11, 38, 3, 0, 7); c.fill();
    });
    reg('p12_censer', 20, 40, (c) => {                          // a brass censer hung from a tripod
      c.strokeStyle = '#4a3622'; c.lineWidth = 1.6; for (const x of [3, 10, 17]) { c.beginPath(); c.moveTo(10, 2); c.lineTo(x, 39); c.stroke(); }
      c.strokeStyle = '#8a7a52'; c.lineWidth = 1; c.beginPath(); c.moveTo(10, 3); c.lineTo(10, 16); c.stroke();
      c.fillStyle = '#b08a3a'; c.beginPath(); c.ellipse(10, 24, 7, 5, 0, 0, 7); c.fill(); c.fillStyle = '#d0aa55'; c.beginPath(); c.ellipse(10, 21, 6, 4, 0, Math.PI, 0); c.fill();
      c.fillStyle = '#3a2a14'; for (const x of [7, 10, 13]) c.fillRect(x, 20, 1.4, 2);
    });
    reg('p12_stake_lantern', 16, 46, (c) => {                   // a paper lantern on a stake
      c.fillStyle = '#4a3622'; c.fillRect(7, 20, 2, 26); c.fillRect(5, 4, 6, 2);
      c.fillStyle = '#3a2a1a'; c.fillRect(3, 8, 10, 2); c.fillRect(3, 21, 10, 2);
      c.fillStyle = '#f2b05a'; c.fillRect(4, 10, 8, 11); c.fillStyle = '#ffe3a0'; c.fillRect(6, 12, 4, 7);
      c.strokeStyle = '#c47a2a'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(8, 10); c.lineTo(8, 21); c.stroke();
    }, true);
    reg('p12_lantern_float', 22, 18, (c) => {                   // a paper lantern on a little raft of reed
      c.fillStyle = '#2a1d10'; c.fillRect(2, 13, 18, 3); c.fillStyle = '#4a3a22'; c.fillRect(3, 12, 16, 2);
      c.fillStyle = '#f2b05a'; c.fillRect(5, 3, 12, 10); c.fillStyle = '#ffe3a0'; c.fillRect(7, 5, 8, 6);
      c.fillStyle = '#c47a2a'; c.fillRect(5, 2, 12, 2); c.fillRect(5, 12, 12, 1); c.fillRect(10, 4, 1, 8);
    }, true);
    reg('p12_trap', 30, 20, (c) => {                            // a wicker eel-trap with a stone on it
      c.fillStyle = '#7a5a2a'; c.beginPath(); c.moveTo(2, 18); c.lineTo(8, 4); c.lineTo(24, 4); c.lineTo(28, 18); c.closePath(); c.fill();
      c.strokeStyle = '#a8843a'; c.lineWidth = 0.9; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(4 + i * 4, 18); c.lineTo(9 + i * 3, 4); c.stroke(); }
      for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(5 + i * 0.5, 15 - i * 5); c.lineTo(26 - i * 0.5, 15 - i * 5); c.stroke(); }
      c.fillStyle = '#4a4a46'; c.beginPath(); c.ellipse(16, 4, 5, 3, 0, 0, 7); c.fill();
    });
    reg('p12_basket', 40, 30, (c) => {                          // a wicker basket of blank paper lanterns
      for (const [x, y, hh] of [[9, 4, 12], [16, 1, 13], [23, 3, 12], [30, 5, 11]]) { c.fillStyle = '#e8dcc0'; c.fillRect(x, y, 7, hh); c.fillStyle = '#f6efd8'; c.fillRect(x + 1, y + 1, 2, hh - 2); c.fillStyle = '#c4b890'; c.fillRect(x, y, 7, 1); }
      c.fillStyle = '#7a5a2a'; c.beginPath(); c.moveTo(3, 14); c.lineTo(37, 14); c.lineTo(34, 29); c.lineTo(6, 29); c.closePath(); c.fill();
      c.strokeStyle = '#a8843a'; c.lineWidth = 1; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(4, 16 + i * 2.4); c.lineTo(36, 16 + i * 2.4); c.stroke(); }
    });
    if (typeof ANIM !== 'undefined' && ANIM && ANIM.hanging && ANIM.hanging.add) for (const n of ['p12_sheaf', 'p12_sheaf_fig', 'p12_bunting', 'p12_banner']) ANIM.hanging.add(n);   // a gentle sway, for free
  }
  try { if (typeof document !== 'undefined') paintAll(); } catch (e) { console.warn('festivals12: art failed', e); }

  // ================================================================ items
  const ITEM_DEFS = {
    p12_hearth_bread: { name: TX.items.bread.name, sprite: 'loot', desc: TX.items.bread.desc, use: 'p12_food', hp: 12, fat: 20, eat: TX.items.bread.eat, value: 5 },
    p12_cider: { name: TX.items.cider.name, sprite: 'loot', desc: TX.items.cider.desc, use: 'p12_food', voice: 10, fat: 15, eat: TX.items.cider.eat, value: 6 },
    p12_moot_curd: { name: TX.items.curd.name, sprite: 'loot', desc: TX.items.curd.desc, use: 'p12_food', hp: 6, voice: 10, eat: TX.items.curd.eat, value: 4 },
    p12_flume_eel: { name: TX.items.eel.name, sprite: 'loot', desc: TX.items.eel.desc, use: 'p12_food', hp: 14, fat: 25, eat: TX.items.eel.eat, value: 8 },
    p12_sheaf_figure: { name: TX.items.figure.name, sprite: 'loot', desc: TX.items.figure.desc, use: 'p12_hang', key: true },
  };
  // How the player gets them: the harvest table in Oakhaven's square (days 2 and 3, in the day), a share of the cut
  // (Dunna's reward: a loaf, a jug, the figure), and the Eel-Run (the run-eel is taken at the fishing spot).
  if (typeof ITEMS !== 'undefined') for (const id in ITEM_DEFS) if (!ITEMS[id]) ITEMS[id] = ITEM_DEFS[id];
  try {
    if (typeof ICONS !== 'undefined' && ICONS && ICONS.TABLE) {
      Object.assign(ICONS.TABLE, { p12_hearth_bread: ['pebble', {}], p12_cider: ['jar', { liq: '#c9a24a' }], p12_moot_curd: ['jar', { liq: '#eadfc0' }], p12_flume_eel: ['eel', {}], p12_sheaf_figure: ['herb', { v: 'reed' }] });
    }
  } catch (e) { /* the fallback icons will do */ }

  function eat(slot) {
    const it = ITEMS[slot.id], p = G.player; if (!it || !p) return;
    if (it.hp) p.hp = Math.min(p.hpMax, p.hp + it.hp);
    if (it.voice) p.voice = Math.min(p.voiceMax, p.voice + it.voice);
    if (it.fat) p.fat = Math.min(p.fatMax, p.fat + it.fat);
    try { if (typeof needsOn === 'function' && needsOn()) p.hunger = clamp((Number(p.hunger) || 0) + 35, 0, 100); } catch (e) { /* no needs module */ }
    G.take(slot.id); say(it.eat, 'good', 3500);
    try { renderInventory(); } catch (e) { /* the panel may be closed */ }
  }
  function hangFigure(slot) {
    const near = G.mapId === 'oakhaven' && Math.hypot(Engine.cam.x - 23.5, Engine.cam.y - 2.5) < 9;
    if (!near) { say(TX.items.hangFar, '', 3500); return; }
    G.take(slot.id); fset('p12f_hung', 1); syncCurrent(); say(TX.items.hang, 'good', 5500);
    try { renderInventory(); } catch (e) { /* closed */ }
  }

  // ================================================================ the Sheaf Song (audio: a short original folk melody)
  // F-major pentatonic over the Growth Anchor's F (174 Hz is the F below middle C): sixteen notes, one to a beat. [PROPOSED]
  const SONG = [349.23, 440, 523.25, 440, 392, 440, 587.33, 523.25, 440, 523.25, 587.33, 523.25, 440, 392, 349.23, 349.23];
  const audioOk = () => { try { return typeof Audio_ !== 'undefined' && Audio_.ctx && Audio_.sfxBus && !Audio_.muted; } catch (e) { return false; } };
  function note(freq, at, dur, vol, kind) {                  // one soft voice-like note: two detuned partials through a low-pass, a slow vibrato
    if (!audioOk()) return;
    const ctx = Audio_.ctx, t = ctx.currentTime + Math.max(0, at || 0);
    const g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = kind === 'sickle' ? 900 : 1500;
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    o1.type = 'triangle'; o2.type = 'sine'; o1.frequency.value = freq; o2.frequency.value = freq * 1.004;
    lfo.frequency.value = 5.2; lg.gain.value = freq * 0.006; lfo.connect(lg); lg.connect(o1.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o1.connect(g); o2.connect(g); g.connect(lp); lp.connect(Audio_.sfxBus);
    o1.start(t); o2.start(t); lfo.start(t); o1.stop(t + dur + 0.05); o2.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
  }
  function swish(vol) {                                       // the sound of a sickle through dry stalks
    if (!audioOk()) return;
    const ctx = Audio_.ctx, t = ctx.currentTime, n = ctx.createBufferSource(), buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.16), ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);   // presentation only: its own noise, not the game's RNG stream
    n.buffer = buf; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 0.8;
    const g = ctx.createGain(); g.gain.value = vol; n.connect(bp); bp.connect(g); g.connect(Audio_.sfxBus); n.start(t);
  }
  let humming = false;
  function humSong(vol) {
    if (humming || !audioOk()) return false;
    humming = true; const step = 0.62;
    SONG.forEach((f, i) => note(f * 0.5, i * step, step * 0.95, vol, 'hum'));
    setTimeout(() => { humming = false; }, SONG.length * step * 1000 + 300);
    return true;
  }

  // ================================================================ people
  const NPC_DEFS = {
    p12_baker: { name: TX.baker.name, sprite: 'townswoman', portrait: 'townswoman', tier: 'low', markup: 0.9,
      greet: { polite: TX.baker.polite, normal: TX.baker.normal, blunt: TX.baker.blunt },
      topics: { 'Oakhaven': TX.baker.topicOak, 'The Hedge': TX.baker.topicHedge },
      shop: [{ item: 'p12_hearth_bread' }, { item: 'p12_cider' }, { item: 'p12_moot_curd' }],
      shopTalk: { hello: TX.baker.hello, broke: TX.baker.broke, thanks: TX.baker.thanks, buys: ['consumable'] }, quest: () => null },
    p12_dunna: { name: TX.dunna.name, sprite: 'townswoman', portrait: 'townswoman', tier: 'low',
      greet: { polite: TX.dunna.polite, normal: TX.dunna.normal, blunt: TX.dunna.blunt }, topics: {}, quest: (g) => dunnaQuest(g) },
    p12_herald: { name: TX.rite.herald, sprite: 'flambeau', portrait: 'flambeau', tier: 'low',
      greet: { polite: TX.rite.polite, normal: TX.rite.normal, blunt: TX.rite.blunt }, topics: { 'The Rite': TX.rite.topic }, quest: () => null },
  };
  if (typeof NPCS !== 'undefined') {
    for (const id in NPC_DEFS) if (!NPCS[id]) NPCS[id] = NPC_DEFS[id];
    if (NPCS.harrow) {
      const hq = NPCS.harrow.quest;
      // his own business first (the gate, the Cantor's word): only when it has nothing to say does the Sheaf come up
      NPCS.harrow.quest = (g) => { const r = typeof hq === 'function' ? hq(g) : null; if (r) return r; try { return harrowQuest(g); } catch (e) { console.warn('festivals12: harrow failed', e); return null; } };
    }
  }

  function harrowQuest(g) {
    if (!cfg.on || !hasG()) return null;
    const p = phase(), q = fint('p12f_q'), H = TX.harrow;
    if (q === 2 && (p === 'post' || p === 'rite' || p === 'prep')) { if (state.said.harrowDone) return null; state.said.harrowDone = true; return { text: H.done }; }
    if (p !== 'post' && p !== 'rite') return null;
    if (q === 1) return { text: p === 'rite' ? H.waitingRite : H.waiting };
    if (q !== 0 || p === 'rite') return null;
    const ask = fint('p12f_ask') === 1;
    fset('p12f_ask', 1);
    return { text: ask ? H.reoffer : H.offer, choices: [
      { t: H.yes, f: () => { fset('p12f_q', 1); journal('side', H.jOffer); syncCurrent(); return H.accept; } },
      { t: H.no, f: () => H.declined },
    ] };
  }
  function dunnaQuest(g) {
    const D = TX.dunna;
    if (!crewOn()) return null;
    if (G.noise > B.START_NOISE) return { text: D.tooLoud };
    return { text: D.ready, choices: [
      { t: D.yes, f: () => { setTimeout(openCut, 0); return D.lineUp; } },
      { t: D.no, f: () => D.notYet },
    ] };
  }

  // ================================================================ placing things on the maps (transient, rebuilt from the flags)
  const DIMS = { oakhaven: [70, 64], whispergrove: [48, 48] };
  const realMap = (m) => !!m && !!DIMS[m.id] && m.w === DIMS[m.id][0] && m.h === DIMS[m.id][1];
  const FIELD = { x0: 55.8, x1: 66.2, y0: 2.4, y1: 5.2, cx: 61.0, cy: 3.9 };       // [PROPOSED] the north field: Oakhaven's north-east corner inside the Hedge
  const ent = (o) => Object.assign({ kind: 'deco', solid: false, radius: 0.1, nopick: true, transient: true, _decor: true }, o);
  function cellFree(m, x, y) { return !m.isBlocked(x | 0, y | 0); }
  function nearFree(m, x, y, r) {
    r = r || 0.45;
    if (cellFree(m, x, y) && cellFree(m, x - r, y) && cellFree(m, x + r, y)) return [x, y];
    for (let k = 1; k <= 8; k++) for (let a = 0; a < 8; a++) { const px = x + Math.cos(a * Math.PI / 4) * k * 0.5, py = y + Math.sin(a * Math.PI / 4) * k * 0.5; if (cellFree(m, px, py) && cellFree(m, px - r, py) && cellFree(m, px + r, py)) return [px, py]; }
    return null;
  }
  const BUNT = [[23.0, 9.4], [23.0, 14.3], [23.0, 19.6], [23.0, 27.2], [23.0, 33.0], [23.0, 40.0], [13.5, 23.0], [33.5, 23.0]];
  const SMALL = [[21.35, 12.3], [25.65, 12.3], [21.35, 19.3], [25.65, 27.3], [21.35, 35.3], [28.3, 17.4], [29.8, 17.4]];
  const TABLE_AT = [19.8, 21.7], BAKER_AT = [19.8, 20.9];
  const BANNERS = [[21.2, 9.6], [25.2, 9.6], [21.2, 15.6], [17.4, 17.4], [28.6, 17.4], [17.4, 28.6], [28.6, 28.6], [21.2, 31.5], [47.0, 12.3], [51.0, 12.3]];
  const CENSERS = [[20.7, 22.7], [25.3, 22.7], [20.7, 25.4], [25.3, 25.4]];
  const HERALD_AT = [23.0, 21.2];
  const NOTICE_AT = [24.9, 3.25], RITE_NOTICE_AT = [25.9, 21.0];
  const EEL_BANK = [38.5, 41.5, 44.5, 47.5, 50.0, 57.0, 59.5, 62.5];
  const TRAPPERS = [[41.0, 48.1, 'townsman'], [47.9, 48.2, 'townswoman'], [60.8, 48.1, 'townsman']];
  const GATE = [23.5, 1.55];
  const CREW = [[59.0, 3.2, 'townsman'], [63.1, 4.7, 'townswoman'], [63.4, 3.0, 'townsman'], [60.6, 5.0, 'townswoman']], DUNNA_AT = [59.3, 4.5];

  function oakSpecs() {
    const L = [], add = (key, when, make, upd) => L.push({ key, when, make, upd });
    const p = () => phase(), f = () => flags();
    const sheafSeen = () => { const x = p(); return x === 'prep' || x === 'post' || x === 'rite'; };
    const fieldOn = () => { const x = p(); return x === 'early' || x === 'prep' || x === 'post' || x === 'rite' || (x === 'gone' && cfg.on && greenedOak(f())); };
    // ---- the gate: the sheaf, the notice, the figure
    add('gate', () => sheafSeen(), () => ent({ sprite: 'p12_sheaf', x: GATE[0], y: GATE[1], scale: 0.95, yOff: -0.18, label: TX.sheaf.gateLabel }), (e) => { e.label = fint('p12f_hung') ? TX.sheaf.gateLabelFig : (p() === 'prep' ? TX.sheaf.gateLabel : TX.sheaf.gateLabelPost); e.x = GATE[0] - (fint('p12f_hung') ? 0.28 : 0); });
    add('gatefig', () => sheafSeen() && fint('p12f_hung') === 1, () => ent({ sprite: 'p12_sheaf_fig', x: GATE[0] + 0.45, y: GATE[1], scale: 0.9, yOff: -0.18, label: TX.sheaf.gateLabelFig }));
    add('notice', () => p() === 'post' || p() === 'rite', () => ent({ sprite: 'sign', x: NOTICE_AT[0], y: NOTICE_AT[1], scale: 0.85, nopick: false, radius: 0.2, use: 'p12f_notice', label: TX.sheaf.noticeLabel }));
    // ---- the preparation: bunting, small sheaves, the harvest table (days 2 and 3 only)
    BUNT.forEach((b, i) => add('bunt' + i, () => p() === 'prep', () => ent({ sprite: 'p12_bunting', x: b[0], y: b[1], scale: 0.62, yOff: -0.42, label: TX.sheaf.buntingLabel })));
    SMALL.forEach((b, i) => add('small' + i, () => p() === 'prep', () => ent({ sprite: 'p12_sheaf', x: b[0], y: b[1], scale: 0.42, yOff: -0.02, label: TX.sheaf.smallLabel })));
    const tableOn = () => { if (p() !== 'prep') return false; const h = todNow() * 24; return h >= 7 && h < 19; };
    add('table', tableOn, () => ent({ sprite: 'p12_table', x: TABLE_AT[0], y: TABLE_AT[1], scale: 0.72, solid: true, radius: 0.55, nopick: false, label: TX.sheaf.tableLabel }));
    add('baker', tableOn, () => ent({ kind: 'npc', id: 'p12_baker', sprite: 'townswoman', x: BAKER_AT[0], y: BAKER_AT[1], scale: 1, solid: true, radius: 0.35, nopick: false, facing: Math.PI / 2, _still: true }));
    // ---- the north field: stubble, and the last stand (or the stooks, once it is cut)
    for (let i = 0; i < 18; i++) {
      const R = mulberry(77 + i), x = FIELD.x0 + (FIELD.x1 - FIELD.x0) * ((i % 6) + 0.2 + R() * 0.6) / 6, y = FIELD.y0 + (FIELD.y1 - FIELD.y0) * (Math.floor(i / 6) + 0.2 + R() * 0.6) / 3;
      if (Math.hypot(x - FIELD.cx, y - FIELD.cy) < 1.5) continue;
      add('stubble' + i, fieldOn, () => ent({ sprite: 'p12_stubble', x, y, scale: 0.22, label: TX.sheaf.stubble }));
    }
    const standUp = () => fieldOn() && !cutDone();
    add('stand', standUp, () => ent({ sprite: 'p12_grain_big', x: FIELD.cx, y: FIELD.cy, scale: 0.78, solid: false, radius: 0.5, nopick: false, use: 'p12f_stand', label: TX.sheaf.stand }), (e) => { e.label = p() === 'gone' ? TX.sheaf.standClosed : (fint('p12f_q') === 1 ? TX.sheaf.stand : TX.sheaf.standHint); });
    [[-0.9, 0.35], [0.9, 0.3], [-0.4, -0.35], [0.45, -0.3], [1.5, 0.1], [-1.5, 0.05]].forEach((o, i) => add('stand' + i, standUp, () => ent({ sprite: i % 2 ? 'p12_grain' : 'p12_grain_big', x: FIELD.cx + o[0], y: FIELD.cy + o[1], scale: i % 2 ? 0.6 : 0.7, label: TX.sheaf.stand })));
    [[-0.7, 0.2], [0.2, -0.2], [0.95, 0.3]].forEach((o, i) => add('stook' + i, () => fieldOn() && cutDone(), () => ent({ sprite: 'p12_stook', x: FIELD.cx + o[0], y: FIELD.cy + o[1], scale: 0.55, label: TX.sheaf.stook })));
    // ---- the crew at the dead hour
    add('dunna', crewOn, () => ent({ kind: 'npc', id: 'p12_dunna', sprite: 'townswoman', x: DUNNA_AT[0], y: DUNNA_AT[1], scale: 1, solid: true, radius: 0.35, nopick: false, facing: 0, _still: true }));
    CREW.forEach((c, i) => add('crew' + i, crewOn, () => ent({ kind: 'npc', id: c[2], sprite: c[2], x: c[0], y: c[1], scale: 1, solid: true, radius: 0.35, nopick: false, facing: Math.PI, _still: true, _crew: i })));
    // ---- the Rite dressed as a feast
    const rite = () => p() === 'rite';
    BANNERS.forEach((b, i) => add('banner' + i, rite, () => ent({ sprite: 'p12_banner', x: b[0], y: b[1], scale: 1.35, yOff: 0, label: TX.rite.bannerLabel })));
    CENSERS.forEach((b, i) => add('censer' + i, rite, () => ent({ sprite: 'p12_censer', x: b[0], y: b[1], scale: 0.62, solid: true, radius: 0.22, label: TX.rite.censerLabel, _censer: true })));
    add('herald', rite, () => ent({ kind: 'npc', id: 'p12_herald', sprite: 'flambeau', x: HERALD_AT[0], y: HERALD_AT[1], scale: 1, solid: true, radius: 0.35, nopick: false, facing: Math.PI / 2, _still: true }));
    add('ritenotice', rite, () => ent({ sprite: 'sign', x: RITE_NOTICE_AT[0], y: RITE_NOTICE_AT[1], scale: 0.9, nopick: false, radius: 0.2, use: 'p12f_ritenotice', label: TX.rite.noticeLabel }));
    // ---- the Eel-Run
    const run = () => eelNight() && phase() !== 'rite' && phase() !== 'off';
    EEL_BANK.forEach((x, i) => add('stake' + i, run, () => ent({ sprite: 'p12_stake_lantern', x, y: 47.7 + (i % 2) * 0.12, scale: 0.55, glow: 0.9, label: TX.eel.stake, lightCol: i % 3 === 0 ? [62, 40, 12] : undefined })));
    [[42.5, 51.5], [49.0, 51.6], [58.0, 51.5], [63.5, 51.6]].forEach((o, i) => add('south' + i, run, () => ent({ sprite: 'p12_stake_lantern', x: o[0], y: o[1], scale: 0.55, glow: 0.9, label: TX.eel.stake })));
    [[39.5, 49.4], [44.0, 50.2], [48.5, 49.6], [58.5, 50.3], [61.5, 49.5], [64.5, 50.2]].forEach((o, i) => add('float' + i, run, () => ent({ sprite: 'p12_lantern_float', x: o[0], y: o[1], scale: 0.2, yOff: 0.06, glow: 0.95, label: TX.eel.float, _drift: i + 1 })));
    TRAPPERS.forEach((t, i) => {
      add('trapper' + i, run, () => ent({ kind: 'npc', id: t[2], sprite: t[2], x: t[0], y: t[1], scale: 1, solid: true, radius: 0.35, nopick: false, facing: Math.PI / 2, _still: true, _trapper: i }));
      add('trap' + i, run, () => ent({ sprite: 'p12_trap', x: t[0] + 0.8, y: t[1] + 0.9, scale: 0.2, label: TX.eel.trap }));
    });
    return L;
  }
  // The lanterns on the lit water sit only on water: shallows or deep, chosen once per map from its own floor cells.
  function waterSpots(m) {
    const ft = m.floorTextures || [], name = (x, y) => { const fi = m.floorCells ? m.floorCells[y * m.w + x] : 0; return fi ? ft[fi] : m.floor; };
    const R = mulberry(4242), spots = [];
    for (let i = 0; i < 900 && spots.length < 16; i++) {
      // the first seven near the landing, where the player stands and looks; the rest further out on the water
      const near = spots.length < 7, x = near ? 13 + R() * 24 : 9 + R() * 30, y = near ? 31 + R() * 8 : 24 + R() * 17, cx = x | 0, cy = y | 0, nm = name(cx, cy);
      if ((nm !== 't_shallows' && nm !== 't_water') || m.isBlocked(cx, cy)) continue;
      if (Math.hypot(x - 22.0, y - 40.6) < 3.0 || (Math.abs(x - 24.5) < 1.5 && y > 30)) continue;      // keep the basket, the landing and the causeway clear
      if (spots.some((s) => Math.hypot(s[0] - x, s[1] - y) < 2.4)) continue;
      spots.push([x, y]);
    }
    return spots;
  }
  function groveSpecs(m) {
    const L = [], add = (key, when, make, upd) => L.push({ key, when, make, upd });
    const on = () => lanternNight();
    add('basket', on, () => ent({ sprite: 'p12_basket', x: 22.0, y: 40.6, scale: 0.34, nopick: false, use: 'p12f_basket', radius: 0.3, label: TX.grove.basket, lightCol: [58, 40, 14], glow: 0.7 }));
    waterSpots(m).forEach((s, i) => add('wfloat' + i, on, () => ent({ sprite: 'p12_lantern_float', x: s[0], y: s[1], scale: 0.24, yOff: 0.08, glow: 1, label: TX.grove.float, _bob: i * 1.7, _wg: true })));
    return L;
  }
  const SPEC_CACHE = {};
  const WG = new WeakMap();
  function specsFor(m) { return m.id === 'oakhaven' ? (SPEC_CACHE.oak || (SPEC_CACHE.oak = oakSpecs())) : m.id === 'whispergrove' ? (WG.get(m) || (WG.set(m, groveSpecs(m)), WG.get(m))) : []; }
  function removeMine(m, key) { for (let i = m.entities.length - 1; i >= 0; i--) { const e = m.entities[i]; if (e && e._p12f === key) m.entities.splice(i, 1); } }
  function removeAll(m) { for (let i = m.entities.length - 1; i >= 0; i--) { const e = m.entities[i]; if (e && e._p12f) m.entities.splice(i, 1); } }
  // Put this map's props and people where the clock and the flags say. Idempotent; cheap enough to run twice a second.
  function ensureMap(m) {
    if (!m || !Array.isArray(m.entities) || !realMap(m)) return;
    if (!cfg.on) { removeAll(m); return; }
    const mapIsGreen = m.id === 'oakhaven' && flags().greening;
    for (const sp of specsFor(m)) {
      let want = false;
      try { want = !!sp.when(); } catch (e) { want = false; }
      const have = m.entities.find((e) => e && e._p12f === sp.key);
      if (!want) { if (have) removeMine(m, sp.key); continue; }
      let e = have;
      if (!e) {
        const o = sp.make();
        if (m.id === 'oakhaven' && (o.kind === 'npc' || o.solid) ) { const at = nearFree(m, o.x, o.y, o.radius || 0.4); if (!at) continue; o.x = at[0]; o.y = at[1]; }
        e = Object.assign(o, { _p12f: sp.key });
        if (typeof hydrate === 'function') hydrate(e);
        if (e.kind === 'npc') { e.wanderT = 1e9; if (e.facing != null) e.dir = e.facing; }
        m.entities.push(e);
      }
      if (sp.upd) sp.upd(e);
    }
    void mapIsGreen;
  }
  function syncCurrent() { try { if (typeof G !== 'undefined' && G && G.map && G.maps) ensureMap(G.map); } catch (e) { warnOnce('sync', e); } }
  function warnOnce(k, e) { if (!state.warned) { state.warned = true; console.warn('festivals12: ' + k + ' failed', e); } }

  // ================================================================ lines on entering a map, townsfolk, the Gazette
  function sayEntry(mapId) {
    if (!cfg.on || !hasG() || typeof msg !== 'function') return;
    const p = phase(), d = dayNow(), f = flags(), out = [];
    if (mapId === 'oakhaven') {
      if (p === 'prep') { out.push([d === B.SHEAF_DAY ? TX.sheaf.hung : TX.sheaf.prep[d % TX.sheaf.prep.length], 'warn']); fset('p12f_seen', 1); }
      else if (p === 'post') { out.push([TX.sheaf.post, 'warn']); fset('p12f_seen', 1); }
      else if (p === 'rite') { for (const t of TX.rite.entry) out.push([t, 'voice']); }
      else if (p === 'gone' && greenedOak(f) && fint('p12f_seen') && !cutDone() && !state.said.closed) { state.said.closed = true; out.push([TX.sheaf.standClosed, 'warn']); }
      if (eelNight() && p !== 'rite') out.push([TX.eel.entry, 'warn']);
    } else if (mapId === 'whispergrove' && lanternNight()) out.push([TX.grove.entry, 'voice']);
    const key = d + ':' + mapId + ':' + p;
    if (!out.length || state.said['e' + key]) return;
    state.said['e' + key] = true;
    out.forEach(([t, c], i) => setTimeout(() => say(t, c, 8000), 2600 + i * 1100));
  }
  const folkId = (id) => id === 'townsman' || id === 'townswoman';
  function folkLine(e) {
    if (!cfg.on || !e || !folkId(e.id) || !hasG() || G.mapId !== 'oakhaven' || e._crew != null || e._trapper != null) return null;
    const p = phase(), k = hash(dayNow() + ':' + Math.round((e.homeX || e.x) * 10) + ':' + Math.round((e.homeY || e.y) * 10));
    if (e._crew != null) return null;
    if (p === 'prep' && k % 3 !== 0) return TX.sheaf.folkPrep[k % TX.sheaf.folkPrep.length];
    if (p === 'post' && k % 3 !== 0) return TX.sheaf.folkPost[k % TX.sheaf.folkPost.length];
    if (p === 'rite') return TX.rite.folk[k % TX.rite.folk.length];
    if (eelNight() && k % 2 === 0) return TX.eel.folk[k % TX.eel.folk.length];
    return null;
  }
  function wireTalk() {
    if (typeof talk !== 'function') return;
    const _talk = talk;
    talk = function (e) {
      const r = _talk.apply(this, arguments);
      try {
        if (G.state === 'dialogue' && DLG && DLG.ent === e && DLG.log) {
          let line = null;
          if (e && e._crew != null) line = TX.dunna.villager[e._crew % TX.dunna.villager.length];
          else if (e && e._trapper != null) line = TX.eel.folk[e._trapper % TX.eel.folk.length];
          else line = folkLine(e);
          if (line) {
            // the Rota line from calendar11 is replaced by the festival's: one remark, not two
            try { if (typeof CALENDAR11 !== 'undefined' && CALENDAR11.folkLine) { const last = DLG.log[DLG.log.length - 1], cl = CALENDAR11.folkLine(e); if (last && cl && last.t === cl) DLG.log.pop(); } } catch (err) { /* keep both */ }
            DLG.log.push({ who: 'them', t: line }); renderDialogue(DLG.choices ? 'choice' : null);
          }
        }
      } catch (err) { warnOnce('talk', err); }
      return r;
    };
  }
  function wireGazette() {
    if (typeof showEvent !== 'function') return;
    const _show = showEvent;
    showEvent = function (title, html, choices) {
      try {
        if (cfg.on && title === 'The Synod Gazette' && typeof html === 'string' && html.indexOf('rm-sheet') >= 0 && html.indexOf('p12f-item') < 0) {
          const p = phase(), add = p === 'prep' ? TX.sheaf.gazettePrep : p === 'post' ? TX.sheaf.gazettePost : p === 'rite' ? TX.sheaf.gazetteRite : '';
          if (add) { const i = html.indexOf('<div class="rm-notice">'); const item = '<div class="rm-item p12f-item">' + add + '</div>'; html = i >= 0 ? html.slice(0, i) + item + html.slice(i) : html + item; }
        }
      } catch (e) { warnOnce('gazette', e); }
      return _show.call(this, title, html, choices);
    };
  }

  // ================================================================ using things: the notices, the stand, the fishing spot, the basket
  function wireUse() {
    if (typeof useDeco === 'function') {
      const _use = useDeco;
      useDeco = function (e) {
        try {
          if (e && e.use === 'p12f_notice') { showEvent(TX.sheaf.noticeTitle, TX.sheaf.noticeBody, [{ t: TX.sheaf.noticeBtn, f: null }]); return; }
          if (e && e.use === 'p12f_ritenotice') { showEvent(TX.rite.noticeTitle, TX.rite.noticeBody, [{ t: TX.rite.noticeBtn, f: null }]); return; }
          if (e && e.use === 'p12f_stand') { say(e.label, '', 4500); return; }
          if (e && e.use === 'p12f_basket') { if (lanternNight()) openLanterns(); return; }
          if (e && e.use === 'fish_spot' && eelNight() && phase() !== 'rite') { quietFish(e); return; }
        } catch (err) { warnOnce('use', err); }
        return _use.apply(this, arguments);
      };
    }
    if (typeof useItem === 'function') {
      const _item = useItem;
      useItem = function (slot) {
        const it = slot && typeof slot.id === 'string' && typeof ITEMS !== 'undefined' ? ITEMS[slot.id] : null;
        if (it && it.use === 'p12_food') { try { eat(slot); } catch (e) { warnOnce('eat', e); } return; }
        if (it && it.use === 'p12_hang') { try { hangFigure(slot); } catch (e) { warnOnce('hang', e); } return; }
        return _item.apply(this, arguments);
      };
    }
  }

  // ---- the quiet fishing variant: cast, stand still, haul on the bite
  function fishRng() { return mulberry(hash(dayNow() + ':' + fint('p12f_eel') + ':' + state.fish.n)); }
  function quietFish(spot) {
    const F = state.fish;
    if (F.st === 'bite') { haul(); return; }
    if (F.st === 'wait') { say(TX.eel.still, '', 2200); return; }
    if (fint('p12f_eel') >= B.EEL_CAP) { say(TX.eel.cap, '', 4000); return; }
    if (G.noise > B.FISH_QUIET) { say(TX.eel.loud, 'warn', 3500); return; }
    F.st = 'wait'; F.t = 0; F.loud = 0; F.spot = spot; F.n++;
    const R = fishRng(); F.wait = B.FISH_WAIT[0] + R() * (B.FISH_WAIT[1] - B.FISH_WAIT[0]);
    say(TX.eel.cast, '', 3000); try { Audio_.sfx.ui(); } catch (e) { /* no audio yet */ }
  }
  function haul() {
    const F = state.fish; F.st = 'idle'; F.t = 0;
    G.give('p12_flume_eel'); fset('p12f_eel', fint('p12f_eel') + 1);
    try { addNoise(0.6); Audio_.sfx.pickup(); } catch (e) { /* cosmetic */ }
    say(TX.eel.haul, 'good', 4500);
    if (fint('p12f_eel') === 1) journal('side', TX.eel.journal);
  }
  function tickFish(dt) {
    const F = state.fish;
    if (F.st === 'idle') return;
    if (G.state !== 'play' || !eelNight() || !G.map || !F.spot || G.map.entities.indexOf(F.spot) < 0) { F.st = 'idle'; return; }
    const c = Engine.cam;
    if (Math.hypot(c.x - F.spot.x, c.y - F.spot.y) > 3.4) { F.st = 'idle'; say(TX.eel.away, '', 3000); return; }
    F.t += dt;
    if (F.st === 'wait') {
      if (G.noise > B.FISH_QUIET) { F.loud += dt; if (F.loud > B.FISH_LOUD_GRACE) { F.st = 'idle'; say(TX.eel.startled, 'warn', 4200); return; } } else F.loud = Math.max(0, F.loud - dt);
      if (F.t >= F.wait) { F.st = 'bite'; F.t = 0; say(TX.eel.bite, 'warn', 2600); try { Audio_.sfx.ui(); } catch (e) { /* cosmetic */ } }
    } else if (F.st === 'bite' && F.t > B.FISH_BITE) { F.st = 'idle'; say(TX.eel.missed, '', 3500); }
  }

  // ================================================================ the cut (a short rhythm: one cut on every beat)
  const cutUi = { open: false };
  function timing() { try { return (typeof TAVERN !== 'undefined' && TAVERN && TAVERN.set && TAVERN.set.timing) || 'normal'; } catch (e) { return 'normal'; } }
  const padNow = () => { try { const ps = navigator.getGamepads ? navigator.getGamepads() : null; if (ps) for (const g of ps) if (g && g.connected !== false) return g; } catch (e) { /* no pad */ } return null; };

  // The pure model of a cut, driven by a clock the caller advances: tests run it with no panel at all.
  function newCut(opts) {
    opts = opts || {};
    const mode = opts.timing || 'normal', k = mode === 'wide' ? 1.6 : 1;
    const beat = opts.beat || (reduced() ? B.BEAT_SLOW : B.BEAT);
    const n = B.CUT_BEATS, lead = beat * 3;
    const c = { n, beat, lead, mode, t: -lead - 0.6, win: { perfect: B.WIN_PERFECT * k, good: B.WIN_GOOD * k, ragged: B.WIN_RAGGED * k },
      beats: [], din: 0, landed: 0, perfect: 0, ragged: 0, stray: 0, over: false, result: null, last: null, patrol: false };
    for (let i = 0; i < n; i++) c.beats.push({ t: i * beat, state: 'wait' });
    c.din = clamp((Number(opts.noise) - 1.5) * 0.4, 0, 1.2) || 0;
    function settle() {                                       // beats whose window has passed unanswered are missed; the din breathes out
      for (const b of c.beats) if (b.state === 'wait' && c.t > b.t + c.win.good) b.state = 'miss';
    }
    function finish() {
      if (c.over) return;
      c.over = true;
      c.result = c.patrol ? 'patrol' : (c.landed >= B.CUT_NEED ? 'clean' : 'ragged');
    }
    c.step = function (dt) {
      if (c.over) return c;
      c.t += dt; c.din = Math.max(0, c.din - B.DIN_DECAY * dt / c.beat);       // the din breathes out as the song goes on
      settle();
      if (c.beats.every((b) => b.state !== 'wait') && c.t > c.beats[n - 1].t + c.win.good) finish();
      return c;
    };
    c.press = function () {
      if (c.over || c.t < -0.3) return null;                  // the count-in is for listening
      let best = null, bd = 1e9;
      for (const b of c.beats) if (b.state === 'wait') { const d = Math.abs(c.t - b.t); if (d < bd) { bd = d; best = b; } }
      let grade;
      const auto = c.mode === 'auto';
      if (best && (bd <= c.win.perfect || (auto && bd <= 0.5))) grade = auto ? 'good' : 'perfect';
      else if (best && bd <= c.win.good) grade = 'good';
      else if (best && bd <= c.win.ragged) grade = 'ragged';
      else grade = 'stray';
      if (best && (grade === 'perfect' || grade === 'good' || grade === 'ragged')) { best.state = grade; if (grade !== 'ragged') c.landed++; if (grade === 'perfect') c.perfect++; }
      if (grade === 'ragged') c.ragged++; if (grade === 'stray') c.stray++;
      c.din = Math.max(0, c.din + (grade === 'perfect' ? B.DIN_PERFECT : grade === 'good' ? B.DIN_GOOD : grade === 'ragged' ? B.DIN_RAGGED : B.DIN_STRAY));
      c.last = grade;
      if (best && best.state !== 'wait') best.note = true;
      if (c.din >= B.DIN_MAX) { c.patrol = true; finish(); }
      return { grade, beat: best ? c.beats.indexOf(best) : -1, d: bd };
    };
    return c;
  }

  function openCut() {
    if (cutUi.open || !hasG() || !G.player) return null;
    cutUi.open = true;
    try { if (G.state === 'dialogue') { closeModal(); } } catch (e) { /* none open */ }
    G.state = 'panel';
    const T = TX.cut;
    openModal(`<h2></h2><div class="f12"><canvas id="f12-cv" width="480" height="190" role="img"></canvas>
      <p class="f12-say" id="f12-say" role="status" aria-live="polite"></p>
      <div class="f12-meter"><div class="f12-bar" id="f12-bar"></div></div><p class="muted f12-din" id="f12-din"></p>
      <div class="btns"><button class="dfbtn f12-big" id="f12-go" type="button"></button><button class="dfbtn small" id="f12-stop" type="button"></button></div>
      <p class="muted f12-keys" id="f12-keys"></p></div>`, 'p12f_cut');
    const token = G.panelToken, q = (id) => document.getElementById(id);
    document.querySelector('#modal-panel h2').textContent = T.title;
    q('f12-cv').setAttribute('aria-label', T.alt);
    q('f12-keys').textContent = T.keys;
    q('f12-say').textContent = T.hint + ' ' + T.ready;
    q('f12-go').textContent = T.begin; q('f12-stop').textContent = T.stop;
    const cut = newCut({ noise: G.noise, timing: timing() });
    cut.running = false; cut.raf = 0; cut.ended = false;
    const cv = q('f12-cv'), c2 = cv.getContext('2d');
    const bar = q('f12-bar'), dinEl = q('f12-din'), sayEl = q('f12-say');
    const X = (i) => 34 + i * (cv.width - 68) / (B.CUT_BEATS - 1);
    let lastCount = 99, lastLanded = -1;
    function draw() {
      if (!cv.isConnected) return;
      const W = cv.width, H = cv.height, gy = H - 38;
      const g = c2.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0d121b'); g.addColorStop(0.7, '#27303d'); g.addColorStop(1, '#4a3d2a');
      c2.fillStyle = g; c2.fillRect(0, 0, W, H);
      c2.fillStyle = 'rgba(232,205,120,.10)'; c2.fillRect(0, gy - 10, W, 4);                   // the first grey of the dawn
      c2.fillStyle = '#2a2014'; c2.fillRect(0, gy + 6, W, H - gy);
      for (let i = 0; i < cut.n; i++) {
        const b = cut.beats[i], x = X(i), cutNow = b.state === 'perfect' || b.state === 'good' || b.state === 'ragged';
        c2.strokeStyle = cutNow ? '#6a5528' : '#c8a24a'; c2.lineWidth = 3;
        c2.beginPath(); c2.moveTo(x, gy + 6); c2.lineTo(x + (cutNow ? 9 : 0), cutNow ? gy - 4 : gy - 48); c2.stroke();
        if (!cutNow) { c2.fillStyle = '#e0bf5e'; c2.beginPath(); c2.ellipse(x, gy - 52, 3, 8, 0, 0, 7); c2.fill(); }
        // the ring closing on the next stalk: it shrinks to the stalk's mark at its beat (a steady ring under Reduce motion)
        const dt = b.t - cut.t;
        if (b.state === 'wait' && dt > -cut.win.good && dt < 1.1) {
          const r = reduced() ? 11 : 9 + Math.max(0, dt) * 34, a = Math.max(0.15, 1 - Math.max(0, dt) / 1.1);
          c2.strokeStyle = 'rgba(255,241,200,' + a + ')'; c2.lineWidth = dt < cut.win.good && dt > -cut.win.good ? 3 : 2; c2.beginPath(); c2.arc(x, gy - 22, r, 0, 7); c2.stroke();
          c2.strokeStyle = 'rgba(217,164,65,.8)'; c2.lineWidth = 1.5; c2.beginPath(); c2.arc(x, gy - 22, 9, 0, 7); c2.stroke();
        } else if (cutNow) { c2.fillStyle = b.state === 'perfect' ? '#fff1c8' : b.state === 'good' ? '#9fd6c8' : '#d46a5a'; c2.fillRect(x - 2, gy + 12, 4, 4); }
      }
      c2.font = '15px "Alegreya SC", Georgia, serif'; c2.fillStyle = '#e8d9b5'; c2.textAlign = 'right';
      c2.fillText(fmt(T.progress, cut.landed, cut.n), W - 12, 20);
      if (cut.t < 0 && cut.running) { const cnt = Math.ceil(-cut.t / cut.beat - 0.7); if (cnt >= 1 && cnt <= 3) { c2.textAlign = 'center'; c2.font = '44px "Cinzel", Georgia, serif'; c2.fillStyle = 'rgba(255,241,200,.8)'; c2.fillText(String(cnt), W / 2, 70); } }
      c2.textAlign = 'left';
      const f = clamp(cut.din / B.DIN_MAX, 0, 1);
      bar.style.width = (f * 100).toFixed(1) + '%'; bar.style.background = f > 0.75 ? '#c0452a' : f > 0.45 ? '#d98b2a' : '#7a9a6a';
      dinEl.textContent = fmt(T.din, cut.din.toFixed(1), B.DIN_MAX.toFixed(1));
    }
    function finishUi() {
      cut.ended = true; cancelAnimationFrame(cut.raf);
      const res = cut.result;
      cleanup(false);
      onCutResult(res);
    }
    function cleanup(closePanel) {
      window.removeEventListener('keydown', onKey, true); window.removeEventListener('keyup', onKeyUp, true);
      cancelAnimationFrame(cut.raf); cutUi.open = false; cutUi.cur = null;
      if (closePanel !== false && G.panelToken === token && G.openPanel === 'p12f_cut') closeModal();
      if (closePanel !== false && G.state === 'panel' && !G.openPanel) G.state = 'play';
      G.keys = {};
    }
    function stopAll() { if (cut.ended) return; cut.ended = true; cleanup(true); say(T.put, '', 3200); }
    function doCut() {
      if (!cut.running || cut.over) return;
      const r = cut.press(); if (!r) return;
      const idx = r.beat >= 0 ? r.beat : Math.min(cut.n - 1, Math.max(0, Math.round(cut.t / cut.beat)));
      note(SONG[idx] || SONG[0], 0, 0.5, r.grade === 'stray' ? 0.018 : 0.045, 'hum'); swish(r.grade === 'perfect' ? 0.012 : r.grade === 'good' ? 0.022 : 0.05);
      sayEl.textContent = T[r.grade]; q('f12-go').classList.add('hit'); setTimeout(() => q('f12-go') && q('f12-go').classList.remove('hit'), 90);
      if (cut.over) finishUi();
    }
    cut.doCut = doCut; cut.stopAll = stopAll; cutUi.cur = cut;
    function loop(now) {
      if (cut.ended) return;
      if (G.panelToken !== token || G.openPanel !== 'p12f_cut') { cleanup(false); return; }
      const dt = Math.min(0.05, Math.max(0, (now - cut.last0) / 1000)); cut.last0 = now;
      try { pad(); } catch (e) { /* no pad */ }
      if (cut.running) {
        const before = Math.floor((cut.t + cut.lead) / cut.beat);
        cut.step(dt);
        const after = Math.floor((cut.t + cut.lead) / cut.beat);
        // the guide: the song hummed on every beat, so the cut keeps time with it; the count-in ticks softly
        if (after !== before && after >= 0) { const bi = after - 3; if (bi >= 0 && bi < cut.n) note(SONG[bi] * 0.5, 0, 0.45, 0.022, 'hum'); else if (bi < 0) note(262, 0, 0.12, 0.02, 'tick'); }
        draw();
        if (cut.over) { finishUi(); return; }
      }
      cut.raf = requestAnimationFrame(loop);
    }
    function begin() {
      if (cut.running || cut.ended) return;
      cut.running = true; q('f12-go').textContent = T.cutBtn; sayEl.textContent = '';
      q('f12-go').onclick = doCut; lastLanded = -1; lastCount = 99; cut.last0 = performance.now();
    }
    q('f12-go').onclick = begin;
    q('f12-stop').onclick = stopAll;
    function onKey(ev) {
      const k = String(ev.key || '').toLowerCase();
      if (!['enter', ' ', 'e', 'escape'].includes(k)) return;
      ev.stopImmediatePropagation(); ev.preventDefault();
      if (ev.repeat) return;
      if (k === 'escape') { stopAll(); return; }
      if (!cut.running) begin(); else doCut();
    }
    function onKeyUp(ev) { const k = String(ev.key || '').toLowerCase(); if (['enter', ' ', 'e', 'escape'].includes(k)) ev.stopImmediatePropagation(); }
    window.addEventListener('keydown', onKey, true); window.addEventListener('keyup', onKeyUp, true);
    cv.style.touchAction = 'none';
    cv.addEventListener('pointerdown', (ev) => { ev.preventDefault(); if (!cut.running) begin(); else doCut(); });
    const prev = {};
    let padSeeded = false;
    function pad() {
      const g = padNow(); if (!g) return;
      const edge = (i) => { const now = !!(g.buttons[i] && g.buttons[i].pressed), was = !!prev[i]; prev[i] = now; return now && !was; };
      if (!padSeeded) { padSeeded = true; for (const i of [0, 1, 2, 8]) edge(i); return; }          // a button still held from the dialogue that opened this is not a press
      if (edge(0) || edge(2)) { if (!cut.running) begin(); else doCut(); }
      if (edge(1) || edge(8)) stopAll();
    }
    draw();
    cut.last0 = performance.now(); cut.raf = requestAnimationFrame(loop);        // one loop: the pad is read before the cut begins too
    return cut;
  }
  // the cut ended: on a clean cut the rewards; on a patrol or a ragged one a line and the crew goes home
  function onCutResult(res) {
    const T = TX.cut;
    try { closeModal(); } catch (e) { /* none open */ }
    G.state = 'play'; G.keys = {};
    if (res === 'clean') { finishCut(); return; }
    fset('p12f_try', dayNow() + 1); state.scattered = true; state.scatterDay = dayNow();
    syncCurrent();
    if (res === 'patrol') { startPatrol(); showEvent(T.title, T.patrol, [{ t: T.close, f: null }]); }
    else showEvent(T.title, T.rag, [{ t: T.close, f: null }]);
  }
  function finishCut() {
    if (fint('p12f_q') === 2) return;
    const T = TX.cut;
    fset('p12f_q', 2);                                          // settle the books first: nothing below can pay twice
    G.give('p12_sheaf_figure'); G.give('p12_hearth_bread'); G.give('p12_cider');
    try { if (typeof changeRep === 'function') changeRep('hedge', B.REP_HEDGE); } catch (e) { /* standing is a bonus */ }
    try { if (typeof questXp === 'function') questXp(B.XP_CUT); } catch (e) { /* xp is a bonus */ }
    journal('side', TX.harrow.jDone);
    syncCurrent();
    showEvent(T.doneTitle, T.done, [{ t: T.doneBtn, f: () => { say(T.rep, 'good', 5000); try { Audio_.sfx.fifth(); } catch (e) { /* cosmetic */ } } }]);
  }

  // ---- the patrol that walks the hedge-lane (decoration: it harms nothing, blocks nothing, and is gone before dawn)
  function startPatrol() {
    const m = G.map; if (!m || m.id !== 'oakhaven') return;
    const list = [];
    for (let i = 0; i < 2; i++) {
      const e = hydrate(Object.assign(ent({ sprite: 'legionnaire', x: 47.5 - i * 1.4, y: 3.3 + i * 0.5, scale: 1, label: TX.cut.patrolLabel, lightCol: i === 0 ? [70, 48, 16] : undefined }), { _p12f: 'patrol', _v: 1.15 }));
      m.entities.push(e); list.push(e);
    }
    state.patrol = { list, t: 0 };
  }
  function tickPatrol(dt) {
    const P = state.patrol; if (!P) return;
    P.t += dt;
    for (const e of P.list) { e.x += 1.15 * dt; e.facing = 0; }
    if (P.t > 22 || !G.map || G.map.id !== 'oakhaven') { for (const e of P.list) { const i = G.map ? G.map.entities.indexOf(e) : -1; if (i >= 0) G.map.entities.splice(i, 1); } state.patrol = null; }
  }

  // ================================================================ the Drowned Lanterns
  const NAMED = [   // [PROPOSED] people the player has met or read of, named by the game's own text; shown only once a flag proves it
    { name: 'Tobin Ashgrove', when: (f) => !!(f.tobin_417_done || f.lyra_met) },
    { name: 'Joram Pellow', when: (f) => f.p9q_pellow_done === true || (typeof f.p9q_pellow === 'number' && f.p9q_pellow >= 1) },
    { name: 'Essa, who was Tam\'s', when: (f) => !!f.tam_met },
    { name: 'Ned Fenning', when: (f) => !!(f.twins_found || f.twins_named) },
    { name: 'Wyn Fenning', when: (f) => !!(f.twins_found || f.twins_named) },
    { name: 'Davin Hale', when: (f) => !!f.rooke_boots },
    { name: 'Halder Wick', when: (f) => !!f.halder_dead },
  ];
  // Names for the lanterns: the ledger (names the player has kept) and the table above. Every name is cleaned and
  // capped here, shown only through textContent, deduplicated, and at most 14 are listed.
  function lanternNames() {
    const out = [], seen = new Set(), f = flags();
    const push = (raw) => { const n = cleanTxt(raw, 40); if (!n || n.length < 2) return; const k = n.toLowerCase(); if (seen.has(k)) return; seen.add(k); out.push(n); };
    for (const r of NAMED) { try { if (r.when(f)) push(r.name); } catch (e) { /* skip */ } }
    const L = hasG() && Array.isArray(G.ledger) ? G.ledger : [];
    for (const l of L) { if (out.length >= 14) break; if (l && typeof l === 'object' && typeof l.name === 'string' && l.name.length <= 60) { if (!/\b(consignment|voices|bottles)\b/i.test(l.name)) push(l.name); } }
    return out.slice(0, 14);
  }
  function aliveLanterns() { return state.lanterns.filter((e) => e && !e.hidden && G.map && G.map.entities.indexOf(e) >= 0).length; }
  function setLantern(name) {
    const m = G.map; if (!m || m.id !== 'whispergrove' || !lanternNight()) return null;
    if (aliveLanterns() >= B.LANTERNS_ALIVE) { say(TX.grove.full, 'warn', 3200); return null; }
    const side = state.lanterns.length % 2 ? 1 : -1, n = state.lanterns.length;
    const x = 24.5 + side * 1.6, y = 38.2 - (n % 3) * 0.3;
    const e = hydrate(Object.assign(ent({ sprite: 'p12_lantern_float', x, y, scale: 0.24, yOff: 0.06, glow: 1, label: TX.grove.float, lightCol: [66, 44, 14] }), { _p12f: 'set', _vx: side * (0.09 + 0.02 * (n % 3)), _vy: -0.05 - 0.01 * (n % 2), _born: G.time, _ph: n * 1.3 }));
    m.entities.push(e); state.lanterns.push(e);
    try { if (typeof WATER !== 'undefined' && WATER.ripple) { WATER.ripple(x, y, 1); setTimeout(() => { try { WATER.ripple(x + side * 0.2, y - 0.1, 0.8); } catch (err) { /* cosmetic */ } }, 350); } } catch (err) { /* cosmetic */ }
    try { Audio_.sfx.song(392, 1.2); } catch (err) { /* no audio yet */ }
    say(name ? fmt(TX.grove.said, name) : TX.grove.saidGeneric, 'voice', 7000);
    const first = fint('p12f_dls') === 0;
    fset('p12f_dls', fint('p12f_dls') + 1);
    if (first) journal('side', TX.grove.journal);
    return e;
  }
  const lanternUi = { open: false };
  function openLanterns() {
    if (lanternUi.open || !hasG() || !G.player || !lanternNight()) return null;
    if (G.mapId !== 'whispergrove' || Math.hypot(Engine.cam.x - 22.0, Engine.cam.y - 40.6) > 3.2) { say(TX.grove.far, '', 3000); return null; }
    lanternUi.open = true; G.state = 'panel';
    const T = TX.grove;
    openModal(`<h2></h2><div class="f12"><p class="f12-say" id="f12-intro"></p><h3 class="f12-h" id="f12-h"></h3>
      <div class="f12-list" id="f12-list" role="listbox"></div>
      <div class="btns"><button class="dfbtn small" id="f12-stop" type="button"></button></div><p class="muted f12-keys" id="f12-keys"></p></div>`, 'p12f_lanterns');
    const token = G.panelToken, q = (id) => document.getElementById(id);
    document.querySelector('#modal-panel h2').textContent = T.title;
    q('f12-intro').textContent = T.intro; q('f12-h').textContent = T.names; q('f12-keys').textContent = T.keys; q('f12-stop').textContent = T.stop;
    const list = q('f12-list'), names = lanternNames(), rows = [];
    const addRow = (label, name) => {
      const b = el('button', { class: 'dfbtn f12-row', type: 'button', role: 'option' }); b.textContent = label;     // save-derived text only ever goes in through textContent
      b.addEventListener('click', () => { setLantern(name); refresh(); });
      list.appendChild(b); rows.push(b);
    };
    for (const n of names) addRow(n, n);
    addRow(T.generic, null);
    let sel = 0;
    function refresh() { rows.forEach((b, i) => { b.classList.toggle('sel', i === sel); b.setAttribute('aria-selected', i === sel ? 'true' : 'false'); }); if (rows[sel]) rows[sel].scrollIntoView({ block: 'nearest' }); }
    function close() { window.removeEventListener('keydown', onKey, true); cancelAnimationFrame(raf); lanternUi.open = false; if (G.panelToken === token && G.openPanel === 'p12f_lanterns') closeModal(); if (G.state === 'panel' && !G.openPanel) G.state = 'play'; G.keys = {}; }
    function onKey(ev) {
      const k = String(ev.key || '').toLowerCase();
      if (!['arrowup', 'arrowdown', 'enter', ' ', 'escape', 'w', 's'].includes(k)) return;
      ev.stopImmediatePropagation(); ev.preventDefault(); if (ev.repeat && (k === 'enter' || k === ' ' || k === 'escape')) return;
      if (k === 'escape') close();
      else if (k === 'arrowup' || k === 'w') { sel = (sel + rows.length - 1) % rows.length; refresh(); }
      else if (k === 'arrowdown' || k === 's') { sel = (sel + 1) % rows.length; refresh(); }
      else rows[sel].click();
    }
    window.addEventListener('keydown', onKey, true);
    q('f12-stop').onclick = close;
    const prev = {}; let raf = 0, seeded = false;
    const loop = () => {
      if (G.panelToken !== token || G.openPanel !== 'p12f_lanterns') { window.removeEventListener('keydown', onKey, true); lanternUi.open = false; return; }
      const g = padNow();
      if (g) {
        const edge = (i) => { const now = !!(g.buttons[i] && g.buttons[i].pressed), was = !!prev[i]; prev[i] = now; return now && !was; };
        if (!seeded) { seeded = true; for (const i of [0, 1, 8, 12, 13]) edge(i); raf = requestAnimationFrame(loop); return; }     // a button still held from opening the basket is not a press
        if (edge(12)) { sel = (sel + rows.length - 1) % rows.length; refresh(); }
        if (edge(13)) { sel = (sel + 1) % rows.length; refresh(); }
        if (edge(0)) rows[sel].click();
        if (edge(1) || edge(8)) { close(); return; }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    refresh();
    return { names, rows, close };
  }

  // ================================================================ per-frame work
  let rs = 0x1234567;
  const rnd = () => { rs = (rs + 0x6D2B79F5) | 0; let t = Math.imul(rs ^ (rs >>> 15), 1 | rs); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };   // its own stream: never the game's RNG
  function censerSmoke(dt) {
    if (typeof FIRESMOKE === 'undefined' || !FIRESMOKE.spawn || (typeof GFX !== 'undefined' && GFX.smoke === false) || !G.map || G.mapId !== 'oakhaven' || phase() !== 'rite') return;
    const cam = Engine.cam, k = (reduced() ? 0.5 : 1) * (typeof GFX !== 'undefined' && typeof GFX.particles === 'number' ? clamp(GFX.particles, 0, 2) : 1);
    for (const e of G.map.entities) {
      if (!e._censer || e.hidden) continue;
      if ((e.x - cam.x) ** 2 + (e.y - cam.y) ** 2 > 196) continue;
      e._acc = (e._acc || rnd()) + dt * 2.2 * k;
      while (e._acc >= 1) {
        e._acc -= 1;
        const top = (G.map.lvls || G.map.smooth ? G.map.groundAt(e.x, e.y) : 0) + 0.34;
        FIRESMOKE.spawn(0, e.x + (rnd() - 0.5) * 0.06, e.y + (rnd() - 0.5) * 0.06, top, 0.05 + (rnd() - 0.5) * 0.08, 0.03 + (rnd() - 0.5) * 0.08, (0.32 + rnd() * 0.22) * (reduced() ? 0.6 : 1), 3.2 + rnd() * 1.6, 0.05, 0.3 + rnd() * 0.2, 0.5, 0, top + 2.4);
      }
    }
  }
  function tickDrift(dt) {
    const m = G.map; if (!m) return;
    const T = G.time;
    for (const e of m.entities) {
      if (!e || !e._p12f) continue;
      if (e._drift) { e.x += 0.05 * dt * (reduced() ? 0.4 : 1); if (e.x > 66) e.x = 36; e.yOff = 0.06 + (reduced() ? 0 : 0.012 * Math.sin(T * 1.3 + e._drift)); }
      else if (e._bob != null) e.yOff = 0.08 + (reduced() ? 0 : 0.012 * Math.sin(T * 1.1 + e._bob));
      else if (e._p12f === 'set') {
        const age = T - e._born;
        e.x += e._vx * dt; e.y += e._vy * dt + (reduced() ? 0 : Math.sin(T * 0.8 + e._ph) * 0.004);
        e.yOff = 0.06 + (reduced() ? 0 : 0.014 * Math.sin(T * 1.4 + e._ph));
        const left = B.LANTERN_LIFE - age;
        if (left < 24) { e.glow = Math.max(0.05, left / 24); e.scale = 0.24 * Math.max(0.35, left / 24); }
        if (left <= 0) { e.hidden = true; e.dead = true; }
      }
    }
    if (state.lanterns.length) state.lanterns = state.lanterns.filter((e) => !e.dead);
  }
  function tickSermon(dt) {
    if (G.mapId !== 'oakhaven' || phase() !== 'rite' || G.state !== 'play') return;
    state.sermonT += dt;
    if (state.sermonT >= B.SERMON_EVERY) { state.sermonT = 0; say(TX.rite.sermon[state.sermonN % TX.rite.sermon.length], 'voice', 8000); state.sermonN++; }
  }
  function tickHum(dt) {
    if (G.mapId !== 'tavern' || phase() !== 'prep' || G.state !== 'play') return;
    state.humT -= dt;
    if (state.humT <= 0) { state.humT = B.HUM_EVERY; if (humSong(0.032)) { if (!state.said.hum) { state.said.hum = true; say(TX.sheaf.hum, 'voice', 9000); } } }
  }
  // The Eel-Run is one night: say so once, on its day, before dusk (R1: it could be missed without notice)
  function tickEelWarn() {
    if (fint('p12f_eelw') || gone(flags()) || phase() === 'rite' || phase() === 'off') return;
    if (dayNow() !== B.EEL_DAY || todNow() < 0.25 || todNow() >= B.NIGHT_FROM) return;
    fset('p12f_eelw', 1); try { msg(TX.eel.warn, 'warn', 7000); } catch (e) { /* no HUD */ }
  }
  function tickClosure() {
    const f = flags();
    if (!(f.greening || f.escaped || f.part3)) return;
    if (fint('p12f_q') === 1) { fset('p12f_q', 3); journal('side', TX.harrow.jClosed); }
  }
  function tickGrove() {
    if (cfg.on && G.mapId === 'whispergrove' && flags().part3 && fint('p12f_dl') === 0) fset('p12f_dl', Math.min(99999, dayNow() + 1));
  }
  // a new day or a new night clears last night's scatter
  function tickScatter() {
    if (state.scattered && (state.scatterDay !== dayNow() || !isDeadHour(todNow()))) { state.scattered = false; }
  }
  function tick(dt) {
    if (!hasG() || !G.player || !G.map) return;
    if (!cfg.on) { if (state.had) { state.had = false; for (const id in (G.maps || {})) { try { removeAll(G.maps[id]); } catch (e) { /* ignore */ } } } return; }
    state.had = true;
    state.accT += dt;
    if (state.accT >= 0.5) { state.accT = 0; tickClosure(); tickEelWarn(); tickGrove(); tickScatter(); syncCurrent(); }
    if (G.state !== 'play') return;
    tickFish(dt); tickDrift(dt); tickPatrol(dt); censerSmoke(dt); tickSermon(dt); tickHum(dt);
  }
  function wireTick() {
    if (typeof update !== 'function') return;
    const _update = update;
    update = function (dt) {
      const r = _update.apply(this, arguments);
      try { tick(dt); } catch (e) { warnOnce('tick', e); }
      return r;
    };
  }
  function wireMaps() {
    if (typeof loadMap === 'function') {
      const _lm = loadMap;
      loadMap = function (id) {
        const r = _lm.apply(this, arguments);
        try {
          state.fish.st = 'idle'; state.patrol = null; state.lanterns = [];
          tickClosure(); tickGrove(); syncCurrent(); sayEntry(id);
        } catch (e) { warnOnce('loadMap', e); }
        return r;
      };
    }
    if (typeof restoreGame === 'function') {
      const _rg = restoreGame;
      restoreGame = function (d) {
        const r = _rg.apply(this, arguments);                // a bad save throws here, before anything below
        try { sanitizeFlags(); state.scattered = false; state.said = {}; state.fish.st = 'idle'; syncCurrent(); } catch (e) { warnOnce('restore', e); }
        return r;
      };
    }
  }

  // ================================================================ Options row and style
  function row(grid) {
    const lab = el('span', { class: 'gfx-label' }, TX.opts.label + ' '); lab.appendChild(el('small', { class: 'muted' }, TX.opts.hint));
    const b = el('button', { class: 'dfbtn small', id: 'f12-festivals-opt', type: 'button', 'aria-pressed': String(cfg.on) }, cfg.on ? 'On' : 'Off');
    b.classList.toggle('sel', cfg.on);
    b.onclick = () => {
      cfg.on = !cfg.on; saveCfg(); b.textContent = cfg.on ? 'On' : 'Off'; b.setAttribute('aria-pressed', String(cfg.on)); b.classList.toggle('sel', cfg.on);
      try { if (!cfg.on) { for (const id in G.maps) removeAll(G.maps[id]); state.fish.st = 'idle'; } else syncCurrent(); } catch (e) { /* ignore */ }
    };
    grid.appendChild(lab); grid.appendChild(b);
  }
  function wireOptions() {
    if (typeof renderAccessibilityMenu !== 'function') return;
    const _acc = renderAccessibilityMenu;
    renderAccessibilityMenu = function () {
      const r = _acc.apply(this, arguments);
      try { const grid = document.querySelector('#modal-panel .ctl-grid'); if (grid && !document.getElementById('f12-festivals-opt')) row(grid); } catch (e) { warnOnce('options', e); }
      return r;
    };
  }
  function injectStyle() {
    if (document.getElementById('festivals12-style')) return;
    const st = document.createElement('style'); st.id = 'festivals12-style';
    st.textContent = `
.f12 { display: flex; flex-direction: column; gap: .5cqh; }
.f12 canvas { width: 100%; max-width: 78cqw; aspect-ratio: 480 / 190; align-self: center; border: 1px solid rgba(217,164,65,.45); background: #0d121b; }
.f12-say { margin: 0; min-height: 4.2cqh; font-size: 1.9cqw; }
.f12-meter { height: 1.2cqh; background: rgba(232,217,181,.14); border: 1px solid rgba(232,217,181,.3); align-self: center; width: 60cqw; }
.f12-bar { height: 100%; width: 0; background: #7a9a6a; }
.f12-din, .f12-keys { margin: 0; font-size: 1.6cqw; text-align: center; }
.f12-big { min-width: 18cqw; font-size: 2.4cqw; }
.f12-big.hit { background: #d9a441; color: #1a110a; }
.f12-h { margin: .3cqh 0; font-size: 2cqw; color: var(--gold); font-family: var(--font-sc); font-weight: normal; }
.f12-list { display: flex; flex-direction: column; gap: .4cqh; max-height: 34cqh; overflow: auto; padding-right: .5cqw; }
.f12-row { text-align: left; font-size: 1.9cqw; padding: .5cqh 1cqw; }
.f12-row.sel { outline: 2px solid var(--gold); background: rgba(217,164,65,.18); }
`;
    document.head.appendChild(st);
  }

  // ================================================================ boot
  loadCfg();
  try { injectStyle(); } catch (e) { /* head not ready */ }
  const wire = (name, fn) => { try { fn(); } catch (e) { console.warn('festivals12: ' + name + ' wiring failed', e); } };
  wire('talk', wireTalk); wire('gazette', wireGazette); wire('use', wireUse); wire('tick', wireTick); wire('maps', wireMaps); wire('options', wireOptions);
  if (hasG() && G.map) wire('first sync', syncCurrent);

  return {
    cfg, saveCfg, B, TX, TEXTS: LIST, FLAGS, FIELD, SONG, NAMED, ITEM_DEFS, NPC_DEFS,
    phaseOf, phase, isDeadHour, isEelNight, isLanternNight, eelNight, lanternNight, crewOn, riteOn, questOpen, cutDone,
    ensureMap, syncCurrent, removeAll, specsFor, sayEntry, folkLine, sanitizeFlags, fint, fset,
    newCut, openCut, onCutResult, finishCut, get cutUi() { return cutUi; },
    quietFish, tickFish, tickEelWarn, haul, state, eat, hangFigure, harrowQuest, dunnaQuest,
    lanternNames, setLantern, openLanterns, get lanternUi() { return lanternUi; }, cleanTxt,
    humSong, note, tick, startPatrol, tickPatrol, tickDrift, censerSmoke,
  };
})();
if (typeof window !== 'undefined') window.FESTIVALS12 = FESTIVALS12;
