// ============================================================
//  dreams — Phase 6 (story reactivity): rest dreams and Light-glass memory echoes.
//
//  1. Rest dreams. After a rest (doRest, via R) a short full-screen dream card can play. It is
//     deterministic: each dream has a story condition (flags and maps the player has actually
//     reached) and plays on the first rest after that condition becomes true, at most one per
//     game day, lowest tier first so the dreams deepen as the story does. Never during custody,
//     an escape or a bore hold, after a rest that was itself interrupted (hounds came, or the
//     siphoned dark took something) or while enemies are chasing nearby. The seen dreams are
//     G.flags.p6d_dr_<id> = true, and the day of the last dream is G.flags.p6d_day = day + 1.
//  2. Light-glass memory echoes. Glass keeps what it hears. Taking a Light-glass shard, touching
//     the glass-veined rock of the quarry and the Root-vault, using a glass lamp, or listening at
//     a Legionnaire's bell queues a short echo tied to that place. Each echo plays once
//     (G.flags.p6d_e_<id> = true). The logbook lists the dreams and echoes already met so they can
//     be read again.
//
//  Security: all text comes from the constant tables below. The one dynamic string is a
//  Legionnaire's given name for the core echoes; it is cut to letters and set with textContent.
//  Flags are only ever read by looking up our own constant keys and are validated on read.
//  Switch: UPG.storyDreams (default on). Off = the original rest, pickups and logbook.
//
//  The slow drifting light behind the cards is procedural stand-in work (CSS only, no images).
//  Lore notes: the Hush is only reported or inferred, never described. Anything beyond LORE_P6
//  is marked [PROPOSED].
// ============================================================
'use strict';

if (typeof UPG !== 'undefined' && UPG.storyDreams === undefined) UPG.storyDreams = true;

const DREAMS = (function () {
  // ---------------------------------------------------------------- helpers
  function on() {
    try {
      if (typeof UPG !== 'undefined' && UPG.storyDreams === false) return false;
      if (typeof GFX !== 'undefined' && GFX.storyDreams === false) return false;
    } catch (e) { /* ignore */ }
    return true;
  }
  const flags = () => (typeof G !== 'undefined' && G.flags && typeof G.flags === 'object') ? G.flags : {};
  const gf = (k) => !!flags()[k];                                   // a game flag
  const mine = (k) => flags()[k] === true;                          // one of ours: strict boolean
  function seen(id) {                                               // has the player walked this map?
    try {
      if (!G.maps || !Object.prototype.hasOwnProperty.call(G.maps, id)) return false;
      const v = G.maps[id].visited; if (!v) return false;
      for (let i = 0; i < v.length; i++) if (v[i]) return true;
    } catch (e) { /* ignore */ }
    return false;
  }
  function reduced() {
    try { if (typeof GFX !== 'undefined' && GFX.reduceMotion) return true; } catch (e) { /* ignore */ }
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  function inCustody() { try { return !!(typeof crimeState === 'function' && crimeState().custody); } catch (e) { return false; } }
  function enemyNear(r) {
    try {
      const c = Engine.cam, r2 = r * r;
      return G.ents.some(e => e.kind === 'enemy' && !e.dead && !e.hidden && e.state === 'chase' && dist2(e.x, e.y, c.x, c.y) < r2);
    } catch (e) { return false; }
  }
  // Nothing may interrupt a fight, a flight, a custody term or a death.
  function calm() {
    try {
      if (!G.player || G.dead || G.state !== 'play') return false;
      if (inCustody()) return false;
      if (G.escapeTimer > 0 || G.boreHold > 0) return false;
      if (enemyNear(16)) return false;
    } catch (e) { return false; }
    return true;
  }

  // ---------------------------------------------------------------- the dreams
  // tone picks the colour of the drifting light. Text: second person, sensory, 60-140 words.
  const DREAM_LIST = [
    { id: 'reed', tier: 0, tone: 'warm', title: 'The First Reed', when: () => true,
      text: ['You are small, and the door is very tall. Above it hangs a reed, tuned to you before you could hold up your own head. In the dream it does not sound. You stand on the step and wait for it, the way you wait for a sneeze.',
        'Down the street every door has its reed, and every reed is saying something low and slightly different, a long way off, like a roomful of people agreeing not to speak first. Somebody behind you rests a hand on your hair.',
        '"Does it ring?" they ask. You open your mouth to say <i>true enough</i>, and the wind turns, and you wake with the answer still in your teeth.'] },
    { id: 'anchors', tier: 1, tone: 'gold', title: 'Eight Lamps', when: () => gf('kaelen_met') || gf('lyra_met') || seen('clearing'),
      text: ['Eight lamps stand in a ring on bare ground, and none of them is lit by fire. Each one hums. A low one, a little higher, a long step up, then a bright one, a quick one, a deep unwilling one, and under them all a note you feel in your back teeth rather than hear.',
        'You walk the ring and the sound moves through you like weather. One is warm as bread. One is cold and tastes of paper. You count them twice. Eight.',
        'The ring is not closed. Between the last lamp and the first there is a gap, as wide as a doorway, and the wind comes through it from somewhere you have not been.'] },
    { id: 'foundry', tier: 1, tone: 'ember', title: 'The Foundry Floor', when: () => gf('kaelen_met'),
      text: ['Brass floors, wet to the ankle, and a heat that goes through your clothes and into the bones. Men in grey aprons shout numbers over a noise like a very large bell being unrung. It is 412. You are not meant to be here, and nobody asks you to leave.',
        'A tall young man in a clean coat stands at a gauge with his sleeve rolled, one hand flat on the glass. Steady. Steady. "Hold," he says, to no one, to everyone.',
        'The needle climbs. Everything in the hall leans one way, the way grass leans before rain. Then the light turns, and he is still holding, and the number he called is the last one anyone says.'] },
    { id: 'hedge', tier: 1, tone: 'green', title: 'Three Deep',
      when: () => gf('hedge_answered') || gf('hedge_silent') || gf('hedge_listened') || gf('tobin_417_started') || gf('tobin_417_done') || gf('twins_found') || seen('underhedge'),
      tail: () => gf('tobin_417_done') ? ' In your other hand something long and bronze is humming at a note you know.' : '',
      text: ['Thorn, and packed wool, three men deep, and you are inside it with your sleeve caught. It is spring, and the wool smells of sheep and rain. Somewhere ahead a man is singing very quietly, a Cantor\'s line, the falling fifth, the way you sing to a child who will not settle.',
        'You push toward him. The thorn lets you through one hand at a time. You can see the back of his coat. You can see it begin to turn.',
        'Then the wind comes the other way and carries his voice down the lane, and you are standing in the road with a reed in your hand, and it is autumn, and you have forgotten which of you was meant to go home.'] },
    { id: 'quarry', tier: 2, tone: 'green', title: 'The Long Rope', when: () => seen('quarry') || gf('bore_seated'),
      text: ['You are being lowered on a rope through green light. The shaft walls are wet and warm and veined like the inside of an arm. Far below, something is singing a lullaby, five notes, over and over, and each time it reaches the fifth it loses the tune and begins again, patient, tired, exact.',
        'You want to help. You hum the missing note, and it is wrong, and the rope jerks, and the whole shaft winces.',
        'A voice from the top says, very gently, "Sorry. We needed the bread." The light goes the colour of milk. You hang there, swinging, and the lullaby starts again from the beginning, as though you had never spoken.'] },
    { id: 'names', tier: 2, tone: 'ash', title: 'The Reading', when: () => gf('part3') || seen('whispergrove'),
      text: ['Down a stair that has more steps each time you count them, someone is reading aloud. A voice worn smooth, dry and level and without hurry. <i>Halder Wick.</i> A pause, exactly long enough for a person to stand up. The next name, and the next.',
        'You try to listen to each one and keep none. The list goes on past what a life can hold. The voice reaches the bottom of a page and turns it, and you hear the paper, and it is the first page again.',
        '"Halder Wick," it says, kindly. You say "Here," because someone should. Your own voice comes back to you in the next line, and you wake before it finishes.'] },
    { id: 'silencing', tier: 2, tone: 'glass', title: 'Evening in the Court',
      when: () => seen('whispergrove') && (gf('halder_done') || gf('halder_safe') || gf('halder_dead') || gf('wg_ambush_over') || seen('cloister')),
      text: ['Evening, in a court of lit water. A man on the steps checks his watch. A girl lifts a cup. Somewhere a choir has just begun the second verse of something, thirty voices, and you know the tune, and you are about to join in.',
        'Then one long note comes from everywhere at once, from the stone and the water and the inside of your chest. The people do not fall. They do not run. They only stop being about to do things.',
        'The man puts his watch away, carefully, and goes on standing there. The girl\'s cup stays at her lip. The water keeps its light. You have a name in your mouth and cannot think whose it is.'] },
    { id: 'veil', tier: 2, tone: 'ash', title: 'The Long Desk', when: () => gf('sable_met') || gf('sable_wg_met') || gf('sable_aboard'),
      text: ['A grey hall with no windows and one long desk, and the scratch of a pen that does not stop. Someone small and pale writes in a book as tall as a door. The page she is writing is the page she is standing on.',
        'You ask what she is recording. "The end of a city," she says, in the rhythm of a thing said many times. "I do not hurry it. I do not hold it back." The ink is the colour of the sky an hour before dawn.',
        'You lean to read over her shoulder. The entry is dated tomorrow. She turns the page before you can find your name on it. "Not yet," she says, softly. "Ask me again."'] },
    { id: 'glassing', tier: 3, tone: 'glass', title: 'Clear',
      when: () => gf('kaelen_dw_done') || gf('kaelen_told_now'),
      text: ['Your hand is cold, and then it is clear. Not numb: clear, like a pond in winter, the bones showing, each one lit green from inside. There is no pain, which is how you know how much there was.',
        'The clearness climbs, patient, to the wrist. It takes the old scar first, then the older one. You tap a nail against it and it answers at a pitch you know.',
        'Someone beside you in the dark says, "It keeps what it hears," the way you would apologise for a dog. You press the hand to the wall, and the wall begins, very quietly, to tell you everything it has been told.'] },
    { id: 'organum', tier: 3, tone: 'lilac', title: 'Registry Square',
      when: () => gf('folder_given') || gf('folder_kept') || gf('folder_decided') || gf('dispatch_read') || gf('log_read') || gf('quist_press') || gf('quist_shown') || gf('press_taken') || gf('register_taken'),
      text: ['A grey square with grey buildings and a coffee stall that has been there sixty years. Brass plates beside every door, polished by someone who does not look up. A clerk hands you a slip. It says your name is being reconciled. It says the matter will be assigned. It says nothing has happened to anyone.',
        'Behind the stall the towers begin to breathe in. It is not wind. It is a low chord, held for hours, played to a city that stands very still and agrees that it is being kind.',
        '"Mind the step," the clerk says, and the step goes down a long way. You take the coffee. It is good. That is the worst of it.'] },
    { id: 'orchard', tier: 3, tone: 'warm', title: 'The Wind-Reed Orchard',
      when: () => gf('lyra_wg_met') || gf('lyra_dw_met') || gf('lyra_voice'),
      text: ['Rows of reeds, planted in the old orchard, longer than your arm, longer than you. The wind goes down the rows and every reed speaks one note, and together the notes make something like a face.',
        'A woman walks the rows with a cord of knots over her shoulder, touching one reed after another, listening with her whole body, the way you listen to someone coming up the stairs. "Not that one. It\'s sulking. That one is lying a little."',
        'She crouches and lays her ear to the soil. "Hear it? Under the tune. The ground has an opinion." You nod. You don\'t. She laughs, and the whole orchard laughs a fifth above her.'] },
    { id: 'hawser', tier: 3, tone: 'sea', title: 'Ten Heartbeats', when: () => gf('vane_vesper'),
      text: ['Salt wind. The deck tilts, then keeps tilting. A hawser runs from the rail into a black seam in the sea, thick as your waist, humming like a plucked string. Someone stands at the far end of it, where no one could stand, in a long coat, and nods.',
        'You have an axe. You are surprised how light it is. "Ten heartbeats," somebody says, and you count them with a stranger\'s patience, and at nine you know exactly what the tenth will do.',
        'The rope parts with a note you have heard before. The sea closes. You wake with your hands open, and the count still going.'] },
    { id: 'quiet', tier: 3, tone: 'ash', title: 'A Good Conversation',
      when: () => gf('shrine_used') || gf('gift_heard') || gf('gift_quiets') || gf('hew_home') || gf('hew_thanked') || gf('wren_saved') || gf('wren_gone'),
      text: ['You are talking to someone at a fire, easily, about nothing, and it is a good conversation. You realise you cannot hear the fire. You look. It is burning, bright, the sticks folding and sparking, and no sound comes of it.',
        'You cannot hear your own words either, but the other person is nodding, so they must be fine. It does not feel like losing anything. It feels like being excused.',
        'Someone has set a cup beside your hand, the one you broke years ago, whole, and you are so grateful you cannot think why that should frighten you. You wake in the ordinary noise of the night and lie very still, listening to it, one sound at a time.'] },
    { id: 'ninth', tier: 4, tone: 'gold', title: 'The Missing Bell',
      when: () => seen('mausoleum') || gf('tombs_rung') || gf('part4') || gf('coda_done') || gf('book_one_done'),
      text: ['Eight bells hang in the dark. You are asked to ring them in order, from the highest, and you do, and each one answers. When the last is quiet the air is still waiting.',
        'Not for a bell. There is no frame for one, no hook, no rope. You look for the shape of the missing thing and find only the place where it is not, the way a held breath has a shape.',
        'Very far above you a voice reads a line from an older book: "The ninth is not stone." You wake with the chord unfinished in your ears, like a sentence stopped in the middle, and for a long time you do not mind.'] },
  ];

  // ---------------------------------------------------------------- the echoes
  // trig: 'shard' (map), 'wall' (map, glass-veined rock), 'lamp' (a glass lamp's use key) or 'core'
  // (a Legionnaire's bell; maps = the maps it counts for, null = any other). {name} / {first} are the
  // Legionnaire's given name, letters only.
  const ECHO_LIST = [
    { id: 'sh_wg', trig: 'shard', maps: ['whispergrove'], title: 'The count-in', place: 'Whisper-Grove, the Sunken Court',
      lines: ['"...and a one, and a two. Lean left, Ben. Left."', 'Thirty voices find the key together, the way water finds its level.', 'Then one long note, underneath all of it, that is not in the hymn.'] },
    { id: 'sh_dw', trig: 'shard', maps: ['deepwoods'], title: 'Nose up', place: 'The Deep Woods',
      lines: ['"Nose up. Hold her nose up, hold her, hold her&mdash;"', '"Tank two is going."', 'A woman\'s voice, very level: "Everyone stays on the line."'] },
    { id: 'sh_oak', trig: 'shard', maps: ['oakhaven'], title: 'Three deep', place: 'Oakhaven',
      lines: ['"Three deep. Pack the wool into the thorn until you cannot hear yourself."', 'Spades, and a great many people breathing hard.', 'A child asks whether it will keep the hounds out. A man says, "It keeps the Narrow. That is all we ask of it."'] },
    { id: 'sh_clear', trig: 'shard', maps: ['clearing'], title: 'Beside the reed', place: 'Outside the Hedge',
      lines: ['"Don\'t sing at the reed, love. Sing beside it."', 'A girl\'s voice tries, and the reed goes sour.', '"There. Hear that? It is not wrong. It is only listening. Give it a moment to decide you are a friend."'] },
    { id: 'sh_clo', trig: 'shard', maps: ['cloister'], title: 'Hymn nine', place: 'The Cloister of the Lost Choir',
      lines: ['"Hymn nine. Altos only. Whoever has the red cloak, you are late, and you are forgiven."', 'One alto line, shy and bright, a little flat on the turn.', 'Then the room waits for the rest of the choir to come in.'] },
    { id: 'sh_cat', trig: 'shard', maps: ['catacombs'], title: 'Where the beam goes', place: 'The Whisper Catacombs',
      lines: ['"Mark the row. Mark every row. A mirror forgets what it was for."', 'A scrape of brass, a held breath, a click.', '"Glass keeps the path. Nobody told it to keep the reason."'] },
    { id: 'sh_qr', trig: 'shard', maps: ['quarry'], title: 'Shift change', place: 'The Oakhaven Quarry',
      lines: ['"Pump two is steady. Pump three is steady. Everything is steady."', 'Boots on a ladder. A man humming something he is not supposed to know.', '"Don\'t hum down here," says someone, not unkindly. "It hums back."'] },
    { id: 'sh_rv', trig: 'shard', maps: ['rootvault'], title: 'Roots do not', place: 'The Root-vault',
      lines: ['"Is it in pain?"', '"It is a root, sir. Roots don\'t."', 'A long pause, in which something very large and very far away keeps five notes of a lullaby going.'] },
    { id: 'sh_mal', trig: 'shard', maps: ['malting'], title: 'Intake', place: 'The Malting',
      lines: ['A flat, courteous voice: "Next, please."', 'A pen. A stamp. "The name, as it is currently held."', '"There is no cost to you," the clerk says. Under it, very small, someone decides to say their name anyway.'] },
    { id: 'sh_mau', trig: 'shard', maps: ['mausoleum'], title: 'The low note', place: 'The Mausoleum of Chords',
      lines: ['A gravel voice, tired: "From the highest, then. Down."', 'Bell after bell, and each one leaves the room quieter than it found it.', '"And the last is not cast in stone," someone says, and is hushed.'] },
    { id: 'gl_qr', trig: 'wall', maps: ['quarry'], title: 'The night of the bore', place: 'The Oakhaven Quarry',
      lines: ['"Seat the casing."', '"It\'s singing, foreman."', '"It\'s the drill. Seat it. Log it as resonance."', 'Hours of that, thinned to a minute: iron on iron, a cheer that goes up and does not quite come down, and under it five notes of a lullaby, losing the tune.'] },
    { id: 'gl_rv', trig: 'wall', maps: ['rootvault'], title: 'A held note', place: 'The Root-vault',
      lines: ['The wall is warm as a sleeping animal.', 'Inside the glass, a man near the stone is humming one low note with his mouth closed, over and over, as if to keep a door from swinging.', '"Easy," he tells it. "I\'m here. Easy."'] },
    { id: 'lp_cat', trig: 'lamp', use: 'mirror_lantern', maps: ['catacombs'], title: 'The emitter', place: 'The Whisper Catacombs',
      lines: ['A woman\'s voice, close to the lens: "Beam north, row one point five. If I have it right, nobody ever needs to know I was here."', 'Brass ticks as it settles.', '"If I have it wrong, I am sorry. Light never forgives a mirror."'] },
    { id: 'lp_gift', trig: 'lamp', use: 'gift_lamp', maps: ['deepwoods'], title: 'Loud', place: 'The Deep Woods',
      lines: ['A child, singing loudly and wonderfully out of tune.', '"Is it working? It\'s working. Mama says the loud one is the one that gets heard."', 'The song stops in the middle of a word, the way a page stops when someone closes the book. A beat later the lamp goes on humming, as if nothing had been asked of it.'] },
    { id: 'lp_shr', trig: 'lamp', use: 'shrine', maps: ['deepwoods'], title: 'The keeper', place: 'The Deep Woods',
      lines: ['An old voice, to the lamp, as to a dog: "There you are. There you are."', 'A knife trimming a wick. A cough.', '"Somebody will come by. Somebody always does. I keep it for them." And later, to no one: "All right. I\'ll leave it burning."'] },
    { id: 'co_qr', trig: 'core', maps: ['quarry'], title: 'The name it was made from', place: 'The Oakhaven Quarry',
      lines: ['Inside the bell, a voice, patient as a clerk: "{name}."', '"{first}. I mend pumps. The good spanner is on the shelf by the door."', '"If anyone asks, I am not late. I am on my way."'] },
    { id: 'co_mal', trig: 'core', maps: ['malting'], title: 'Assigned', place: 'The Malting',
      lines: ['"{name}," says the glass, as though reading it off a label. "Assigned. Graded. Reconciled."', 'Then, in a smaller register, a good deal younger: "{first}. Please. It is {first}."'] },
    { id: 'co_any', trig: 'core', maps: null, title: 'That one is mine', place: 'Wherever a bell still rings',
      lines: ['A voice in the glass, trying a word the way you try a stair in the dark.', '"{first}. {first}. Is that&mdash; yes. That is the one. That\'s mine."', 'It sounds so relieved that you find you are apologising.'] },
  ];
  const byId = (list, id) => { for (const x of list) if (x.id === id) return x; return null; };

  // ---------------------------------------------------------------- state we keep
  const DAY_KEY = 'p6d_day';
  const dreamSeen = (id) => mine('p6d_dr_' + id);
  const echoSeen = (id) => mine('p6d_e_' + id);
  function dayStamp() { const d = G.day; return (typeof d === 'number' && isFinite(d)) ? Math.max(0, Math.min(1e6, Math.floor(d))) + 1 : 1; }
  function dreamedToday() {
    const v = flags()[DAY_KEY];
    return typeof v === 'number' && isFinite(v) && v === dayStamp();   // anything else (hostile or stale) is "not today"
  }
  function pickDream() {
    let best = null;
    for (const d of DREAM_LIST) {
      if (dreamSeen(d.id)) continue;
      let ok = false; try { ok = !!d.when(); } catch (e) { ok = false; }
      if (ok && (!best || d.tier < best.tier)) best = d;
    }
    return best;
  }

  // ---------------------------------------------------------------- style
  const CSS = `
#p6d-overlay { position: absolute; inset: 0; z-index: 18; display: flex; align-items: center; justify-content: center; background: #05040a; color: #efe6d2; container-type: normal; }
#p6d-overlay .p6d-sky { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
#p6d-overlay .p6d-sky i { position: absolute; width: 70%; height: 90%; border-radius: 50%; filter: blur(8cqh); opacity: .5; background: radial-gradient(circle, var(--p6d-a) 0, transparent 68%); animation: p6d-drift 46s ease-in-out infinite alternate; }
#p6d-overlay .p6d-sky i:nth-child(1) { left: -15%; top: -25%; }
#p6d-overlay .p6d-sky i:nth-child(2) { right: -20%; top: 10%; background: radial-gradient(circle, var(--p6d-b) 0, transparent 68%); animation-duration: 61s; animation-direction: alternate-reverse; }
#p6d-overlay .p6d-sky i:nth-child(3) { left: 20%; bottom: -35%; background: radial-gradient(circle, var(--p6d-c) 0, transparent 68%); animation-duration: 53s; }
#p6d-overlay.p6d-still .p6d-sky i { animation: none; }
@keyframes p6d-drift { 0% { transform: translate(0, 0) scale(1); } 100% { transform: translate(14%, 9%) scale(1.18); } }
#p6d-overlay .p6d-card { position: relative; box-sizing: border-box; width: min(92%, 44rem); max-height: 100%; margin: 0 auto; padding: 3cqh 3cqw; display: flex; flex-direction: column; gap: 1.2cqh; text-align: left; }
#p6d-overlay .p6d-kicker { font-family: var(--font-sc, 'Alegreya SC', Georgia, serif); font-size: max(12px, 1.3cqw); letter-spacing: .22em; text-transform: uppercase; opacity: .85; }
#p6d-overlay .p6d-title { margin: 0; font-family: var(--font-display, 'Cinzel', Georgia, serif); font-weight: 600; font-size: max(18px, 2.4cqw); line-height: 1.2; letter-spacing: .04em; color: #fff6dc; }
#p6d-overlay .p6d-text { font-family: var(--font-body, 'Alegreya', Georgia, serif); font-size: max(15px, 1.75cqw); line-height: 1.5; overflow-y: auto; min-height: 0; padding-right: .4em; }
#p6d-overlay .p6d-text p { margin: 0 0 .65em; }
#p6d-overlay.p6d-echo .p6d-text p { font-style: italic; }
#p6d-overlay .p6d-place { font-size: .8em; opacity: .8; font-style: normal; }
#p6d-overlay .p6d-btn { align-self: flex-start; font-family: var(--font-body, 'Alegreya', Georgia, serif); font-size: max(15px, 1.6cqw); font-weight: 700; color: #fff6dc; background: rgba(20, 14, 10, .78); border: 2px solid #b99a5e; padding: .3em 1.2em; min-height: max(40px, 6cqh); cursor: pointer; }
#p6d-overlay .p6d-btn:hover, #p6d-overlay .p6d-btn:focus-visible { outline: 3px solid #d9a441; outline-offset: 2px; }
#p6d-overlay:not(.p6d-still) .p6d-card { animation: p6d-in 2.4s ease-out both; }
@keyframes p6d-in { 0% { opacity: 0; transform: translateY(1.5cqh); } 100% { opacity: 1; transform: none; } }
#p6d-overlay.p6d-echo { background: rgba(2, 10, 12, .93); }
#p6d-overlay.p6d-echo .p6d-title { color: #c8fbf3; }
#p6d-overlay.p6d-echo .p6d-card { border: 1px solid rgba(120, 230, 215, .45); box-shadow: 0 0 5cqh rgba(80, 220, 200, .25); background: rgba(3, 16, 18, .72); width: min(92%, 40rem); max-height: 94%; }
@media (max-height: 460px) { #p6d-overlay .p6d-card { padding: 1.6cqh 3.5cqw; gap: .8cqh; } #p6d-overlay .p6d-kicker { display: none; } #p6d-overlay .p6d-text { line-height: 1.38; } #p6d-overlay .p6d-text p { margin-bottom: .4em; } }
.p6d-log h3 { margin-top: 1em; }
.p6d-log .p6d-row { display: flex; flex-wrap: wrap; gap: .4em; }
`;
  const TONES = {
    warm: ['rgba(214,150,70,.7)', 'rgba(150,70,40,.6)', 'rgba(230,200,120,.4)'],
    gold: ['rgba(230,190,90,.65)', 'rgba(110,90,170,.5)', 'rgba(240,230,190,.35)'],
    ember: ['rgba(230,100,40,.7)', 'rgba(120,40,20,.6)', 'rgba(255,190,110,.35)'],
    green: ['rgba(80,170,90,.6)', 'rgba(30,90,70,.6)', 'rgba(200,220,120,.35)'],
    glass: ['rgba(80,225,210,.6)', 'rgba(40,110,170,.55)', 'rgba(190,250,240,.35)'],
    ash: ['rgba(150,150,160,.5)', 'rgba(70,70,90,.6)', 'rgba(210,210,220,.3)'],
    lilac: ['rgba(170,130,220,.6)', 'rgba(80,60,130,.6)', 'rgba(220,200,250,.35)'],
    sea: ['rgba(60,130,190,.6)', 'rgba(20,50,100,.6)', 'rgba(180,220,240,.35)'],
  };
  function injectStyle() {
    if (typeof document === 'undefined' || document.getElementById('dreams-style')) return;
    const st = document.createElement('style'); st.id = 'dreams-style'; st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  // ---------------------------------------------------------------- the card
  const S = { open: false, reread: false, prevFocus: null, raf: 0, padPrev: [], onClose: null, kind: null, id: null };
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function toneVars(tone) { const t = TONES[tone] || TONES.warm; return `--p6d-a:${t[0]};--p6d-b:${t[1]};--p6d-c:${t[2]}`; }

  function closeCard() {
    if (!S.open) return;
    const ov = document.getElementById('p6d-overlay'); if (ov) ov.remove();
    window.removeEventListener('keydown', onKey, true);
    if (S.raf) { cancelAnimationFrame(S.raf); S.raf = 0; }
    const reread = S.reread, kind = S.kind, cb = S.onClose;
    S.open = false; S.onClose = null; S.kind = null; S.id = null;
    if (!reread) { try { if (G.state === 'event' && !G.dead) { G.state = 'play'; G.keys = {}; } } catch (e) { /* ignore */ } }
    try { if (S.prevFocus && S.prevFocus.focus && document.contains(S.prevFocus)) S.prevFocus.focus(); } catch (e) { /* ignore */ }
    S.prevFocus = null;
    if (kind === 'dream' && !reread) { try { msg('You wake. The dream is already thinning, but it leaves a taste behind.', 'voice', 4500); } catch (e) { /* ignore */ } }
    if (cb) { try { cb(); } catch (e) { /* ignore */ } }
  }
  function onKey(ev) {
    if (!S.open) return;
    const k = ev.key;
    if (k === 'Escape' || k === 'Enter' || k === ' ') closeCard();
    ev.preventDefault(); ev.stopImmediatePropagation();   // nothing leaks through to the game or a panel below
  }
  function padPoll() {
    S.raf = 0; if (!S.open) return;
    try {
      const pads = navigator.getGamepads ? navigator.getGamepads() : null; let gp = null;
      if (pads) for (let i = 0; i < pads.length; i++) if (pads[i] && pads[i].connected) { gp = pads[i]; break; }
      if (gp) {
        const b = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
        let hit = false; for (const i of [0, 1, 9]) if (b(i) && !S.padPrev[i]) hit = true;
        for (let i = 0; i < 16; i++) S.padPrev[i] = b(i);
        if (hit) { closeCard(); return; }
      }
    } catch (e) { /* a controller never breaks the card */ }
    if (typeof requestAnimationFrame === 'function') S.raf = requestAnimationFrame(padPoll);
  }
  function padStart() {
    S.padPrev = [];
    try { const pads = navigator.getGamepads ? navigator.getGamepads() : null; if (pads) for (let i = 0; i < pads.length; i++) if (pads[i] && pads[i].connected) { for (let j = 0; j < 16; j++) S.padPrev[j] = !!(pads[i].buttons[j] && pads[i].buttons[j].pressed); break; } } catch (e) { /* ignore */ }
    if (typeof requestAnimationFrame === 'function') S.raf = requestAnimationFrame(padPoll);
  }
  // paras: array of {html?: constant string, text?: dynamic string}; constants may carry <i> and entities.
  function showCard(o) {
    injectStyle();
    if (S.open) closeCard();
    const host = document.getElementById('game') || document.body;
    const old = document.getElementById('p6d-overlay'); if (old) old.remove();
    const ov = el('section', 'p6d-' + o.kind + (o.kind === 'echo' ? ' p6d-echo' : '') + (reduced() ? ' p6d-still' : ''));
    ov.id = 'p6d-overlay';
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', o.kind === 'dream' ? 'A dream' : 'A Light-glass echo');
    ov.setAttribute('style', toneVars(o.tone));
    const sky = el('div', 'p6d-sky'); sky.setAttribute('aria-hidden', 'true'); sky.appendChild(el('i')); sky.appendChild(el('i')); sky.appendChild(el('i'));
    const card = el('div', 'p6d-card');
    card.appendChild(el('div', 'p6d-kicker', o.kicker));
    card.appendChild(el('h2', 'p6d-title', o.title));
    const txt = el('div', 'p6d-text'); txt.setAttribute('tabindex', '0');
    for (const p of o.paras) { const pe = el('p'); if (p.html != null) pe.innerHTML = p.html; else pe.textContent = p.text; txt.appendChild(pe); }
    if (o.place) { const pl = el('p', 'p6d-place', o.place); txt.appendChild(pl); }
    card.appendChild(txt);
    const btn = el('button', 'p6d-btn', o.button); btn.type = 'button'; btn.onclick = () => closeCard();
    card.appendChild(btn);
    ov.appendChild(sky); ov.appendChild(card); host.appendChild(ov);
    S.open = true; S.reread = !!o.reread; S.kind = o.kind; S.id = o.id; S.onClose = o.onClose || null;
    try { S.prevFocus = document.activeElement; } catch (e) { S.prevFocus = null; }
    if (!o.reread) { G.state = 'event'; G.keys = {}; }
    window.addEventListener('keydown', onKey, true);
    try { btn.focus(); } catch (e) { /* ignore */ }
    padStart();
  }

  // ---------------------------------------------------------------- playing a dream
  function dreamParas(d) {
    const paras = d.text.map(t => ({ html: t }));
    if (d.tail) { const t = d.tail(); if (t) paras[paras.length - 1] = { html: d.text[d.text.length - 1] + t }; }
    return paras;
  }
  function playDream(d, reread) {
    if (!d) return false;
    if (!reread) { flags()['p6d_dr_' + d.id] = true; flags()[DAY_KEY] = dayStamp(); }
    showCard({ kind: 'dream', id: d.id, tone: d.tone, kicker: 'You dream', title: d.title, paras: dreamParas(d), button: reread ? 'Close' : 'Wake', reread: !!reread });
    return true;
  }
  // The rest hook decides; it only ever starts a dream, never changes the rest.
  function maybeDream() {
    if (!on() || !calm() || dreamedToday()) return false;
    const d = pickDream(); if (!d) return false;
    return playDream(d, false);
  }

  // ---------------------------------------------------------------- playing an echo
  const pending = [];                                  // {id, map, t, name}
  function firstName(n) { const s = String(n == null ? '' : n).replace(/[^A-Za-z' -]/g, '').trim().slice(0, 40); return s || 'someone'; }
  function queueEcho(id, name) {
    if (!on()) return false;
    const e = byId(ECHO_LIST, id); if (!e || echoSeen(id)) return false;
    if (pending.some(p => p.id === id)) return false;
    pending.push({ id, map: G.mapId, t: Date.now(), name: name || '' });
    return true;
  }
  function playEcho(e, name, reread) {
    if (!e) return false;
    if (!reread) flags()['p6d_e_' + e.id] = true;
    const full = firstName(name), first = full.split(/\s+/)[0];
    const paras = e.lines.map(l => {
      if (l.indexOf('{') < 0) return { html: l };
      return { text: l.replace(/&mdash;/g, '—').replace(/\{name\}/g, full).replace(/\{first\}/g, first) };
    });
    if (!reread) { try { if (Audio_ && Audio_.sfx && Audio_.sfx.song) Audio_.sfx.song(528, 1.1); } catch (er) { /* sound is optional */ } }
    showCard({ kind: 'echo', id: e.id, tone: 'glass', kicker: 'The glass remembers', title: e.title, paras, place: e.place, button: reread ? 'Close' : 'Let it go', reread: !!reread });
    return true;
  }
  function pollEchoes() {
    if (!pending.length) return null;
    const now = Date.now();
    for (let i = pending.length - 1; i >= 0; i--) {
      const p = pending[i];
      if (!on() || p.map !== G.mapId || now - p.t > 180000 || echoSeen(p.id)) pending.splice(i, 1);
    }
    if (!pending.length || S.open || !calm()) return null;
    const p = pending.shift(), e = byId(ECHO_LIST, p.id);
    return playEcho(e, p.name, false) ? p.id : null;
  }

  // ---------------------------------------------------------------- hooks
  function echoFor(trig, extra) {
    for (const e of ECHO_LIST) {
      if (e.trig !== trig || echoSeen(e.id)) continue;
      if (extra && e.use !== extra) continue;
      if (e.maps) { if (e.maps.indexOf(G.mapId) >= 0) return e; }
      else return e;
    }
    return null;
  }
  function coreEcho() {   // map-specific first, then the "anywhere" one
    let any = null;
    for (const e of ECHO_LIST) {
      if (e.trig !== 'core' || echoSeen(e.id)) continue;
      if (e.maps && e.maps.indexOf(G.mapId) >= 0) return e;
      if (!e.maps) any = e;
    }
    // a map with its own echo already heard falls back to nothing, not to the generic one
    for (const e of ECHO_LIST) if (e.trig === 'core' && e.maps && e.maps.indexOf(G.mapId) >= 0) return null;
    return any;
  }

  let suppressShard = false;
  function wire() {
    // rest
    if (typeof doRest === 'function') {
      const _doRest = doRest;
      doRest = function (kind) {
        let chasing = 0, hpMax = 0;
        try { chasing = G.ents.filter(e => e.kind === 'enemy' && !e.dead && e.state === 'chase').length; hpMax = G.player.hpMax; } catch (e) { /* ignore */ }
        const r = _doRest.apply(this, arguments);
        try {
          if (on()) {
            const after = G.ents.filter(e => e.kind === 'enemy' && !e.dead && e.state === 'chase').length;
            const interrupted = after > chasing || G.player.hpMax < hpMax;   // hounds came, or the dark took something
            if (!interrupted) setTimeout(() => { try { maybeDream(); } catch (e) { console.warn('dream failed', e); } }, 350);
          }
        } catch (e) { console.warn('dreams rest hook failed', e); }
        return r;
      };
    }
    // Light-glass shards: any way of coming by one, except gear handed back from evidence
    if (typeof G !== 'undefined' && typeof G.give === 'function') {
      const _give = G.give;
      G.give = function (id) {
        const r = _give.apply(this, arguments);
        try { if (id === 'shard' && !suppressShard) { const e = echoFor('shard'); if (e) queueEcho(e.id); } } catch (er) { console.warn('dreams give hook failed', er); }
        return r;
      };
    }
    if (typeof returnEvidence === 'function') {
      const _re = returnEvidence;
      returnEvidence = function () { suppressShard = true; try { return _re.apply(this, arguments); } finally { suppressShard = false; } };
    }
    // glass-veined rock
    if (typeof wallLabel === 'function') {
      const _wl = wallLabel;
      wallLabel = function (cell) {
        try { if (on() && cell && cell.tex === 't_glassrock') { const e = echoFor('wall'); if (e) queueEcho(e.id); } } catch (er) { console.warn('dreams wall hook failed', er); }
        return _wl.apply(this, arguments);
      };
    }
    // glass lamps
    if (typeof useDeco === 'function') {
      const _ud = useDeco;
      useDeco = function (e) {
        try { if (on() && e && typeof e.use === 'string') { const ec = echoFor('lamp', e.use); if (ec) queueEcho(ec.id); } } catch (er) { console.warn('dreams lamp hook failed', er); }
        return _ud.apply(this, arguments);
      };
    }
    // a Legionnaire's bell: listening is the interact the game already offers
    if (typeof interact === 'function') {
      const _in = interact;
      interact = function () {
        try {
          if (on() && G.state === 'play') {
            const t = Engine.pick(G.ents, USE_RANGE);
            if (t && !t.dead && t.kind === 'enemy' && t.def && t.def.core && t.state !== 'chase') {
              const ec = coreEcho(); if (ec) queueEcho(ec.id, t.name);
            }
          }
        } catch (er) { console.warn('dreams core hook failed', er); }
        return _in.apply(this, arguments);
      };
    }
    // a load drops whatever was queued or open
    if (typeof restoreGame === 'function') {
      const _rg = restoreGame;
      restoreGame = function () {
        pending.length = 0;
        if (S.open) { S.reread = true; closeCard(); }
        return _rg.apply(this, arguments);
      };
    }
    // the logbook lists what has been met so it can be read again
    if (typeof renderLog === 'function') {
      const _rl = renderLog;
      renderLog = function () {
        const r = _rl.apply(this, arguments);
        try { if (on()) appendLogSection(); } catch (e) { console.warn('dreams log failed', e); }
        return r;
      };
    }
    // Options: a switch in Graphics & access
    if (typeof renderAccessibilityMenu === 'function') {
      const _acc = renderAccessibilityMenu;
      renderAccessibilityMenu = function () {
        const r = _acc.apply(this, arguments);
        try { appendToggleRow(); } catch (e) { console.warn('dreams toggle failed', e); }
        return r;
      };
    }
    if (typeof setInterval === 'function') setInterval(() => { try { pollEchoes(); } catch (e) { console.warn('echo poll failed', e); } }, 400);
  }

  function appendLogSection() {
    const panel = document.getElementById('modal-panel'); if (!panel || document.getElementById('p6d-log')) return;
    const dreams = DREAM_LIST.filter(d => dreamSeen(d.id)), echoes = ECHO_LIST.filter(e => echoSeen(e.id));
    if (!dreams.length && !echoes.length) return;
    const wrap = el('div', 'p6d-log'); wrap.id = 'p6d-log';
    const mk = (label, items, fn) => {
      if (!items.length) return;
      wrap.appendChild(el('h3', null, label));
      const row = el('div', 'p6d-row');
      for (const x of items) { const b = el('button', 'dfbtn small', x.title); b.type = 'button'; b.onclick = () => fn(x); row.appendChild(b); }
      wrap.appendChild(row);
    };
    mk('Dreams', dreams, (d) => playDream(d, true));
    mk('What the glass kept', echoes, (e) => playEcho(e, '', true));
    panel.appendChild(wrap);
  }
  function appendToggleRow() {
    const grid = document.querySelector('#modal-panel .ctl-grid'); if (!grid || document.getElementById('p6d-toggle')) return;
    const lab = el('span', 'gfx-label', 'Dreams and glass echoes ');
    lab.appendChild(el('small', 'muted', 'rest dreams, memory echoes'));
    const b = el('button', 'dfbtn small', on() ? 'On' : 'Off'); b.id = 'p6d-toggle'; b.type = 'button';
    b.onclick = () => { UPG.storyDreams = !on(); b.textContent = on() ? 'On' : 'Off'; };
    grid.appendChild(lab); grid.appendChild(b);
  }

  injectStyle();
  try { wire(); } catch (e) { console.warn('dreams module failed to wire', e); }

  return {
    DREAM_LIST, ECHO_LIST, on, calm, pickDream, maybeDream, dreamedToday, dreamSeen, echoSeen, queueEcho, pollEchoes,
    playDream, playEcho, closeCard, pending: () => pending.slice(), isOpen: () => S.open, openKind: () => S.kind, openId: () => S.id,
    DAY_KEY,
  };
})();
if (typeof window !== 'undefined') window.DREAMS = DREAMS;
