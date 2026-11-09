// ============================================================
//  hollow30 — Release road R5a: the Hollow, and the Carders' house with its root-cellar.
//
//    * THE HOLLOW (MS:326: "the lanes behind the tannery, where the town kept its burl-sick"). Thirty-one households and
//      eighty-four souls, no ward and no warden: Rooke goes house to house with his book. Doors that are past cutting carry
//      the sap-mark, a green circle with a line struck through it. Lissa Merrow, eleven, bandaged to the elbows, sits on the
//      step of the red-shutter house with her tin cup. On Rootday mornings the Grafters' wagon comes in, its wheels wrapped
//      with its harness in felt, a brazier, three masked Grafters and a Legionnaire. At the Greening the Hollow goes under bramble.
//      Its way in is the tannery's back door (R4 left it barred).
//    * "THE LIST" [PROPOSED: the quest; the book, the marks and the Inquisitor's want of the list are canon]. Rooke's
//      ward-book is chained at the well-head. Two doors are pencilled, not chalked: early, could go back. Hum the tending
//      note through each door (or leave honey for the throat of whoever hums inside), then write "Recheck next month"
//      against them, so they are not on the Grafters' Rootday list.
//    * THE CARDERS' HOUSE behind the blue door halfway down the Hollow's lane (MS ch. 6, 11: "halfway down the lane behind
//      the tannery"; it goes under bramble at the Greening with the rest of the Hollow): the pallet pulled away
//      from the wall, a hush-lamp in the window, Lyra's chalk note, and a stair to the root-cellar. The cellar is the
//      design document's Hush-Mite tutorial (GDD:125, [PROPOSED] in Book One's terms): siphoned, damp, three mites, and a
//      hush-lamp at the stair foot.
//    * "KEEP HIM OUT OF THE DAMP" (Rooke's words; the quest is [PROPOSED]). Once Pim is safe, Nell asks for the house to be
//      made fit to bring him home to: clear the cellar, and put a hot brick in his pallet.
//
//  The three maps are new, always built (a save may stand in one). The Grafters' visit is transient, placed by the clock
//  alone; nothing draws on the random stream. Both quests close with a logbook line if Oakhaven is left with them open.
// ============================================================
'use strict';

const HOLLOW30 = (function () {
  const TEXTS = [];
  const S = (t) => { TEXTS.push(t); return t; };
  const hasG = () => typeof G !== 'undefined' && G && G.map && G.player;
  const F = () => (hasG() && G.flags) || {};
  const gone = () => { const f = F(); return !!(f.greening || f.escaped || f.part3 || f.part4); };
  const here = () => (hasG() ? G.mapId : null);
  const hour = () => { const t = Number(G.tod) || 0; return (((t % 1) + 1) % 1) * 24; };
  const d2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
  const fmt = (t, ...a) => String(t).replace(/\{(\d)\}/g, (_, i) => a[+i]);
  const say = (t, cls, ms) => { try { msg(t, cls || '', ms || 4500); } catch (e) { /* cosmetic */ } };
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; console.warn('hollow30: ' + k + ' failed', e); } };
  const guest = () => { try { return typeof SYNC19 !== 'undefined' && !!SYNC19.isGuest(); } catch (e) { return false; } };
  const rootday = () => ((Number(G.day) || 0) % 8 + 8) % 8 === 1;   // DAYS[1]

  const MAPS = { hollow: 'p30_hollow', carders: 'p30_carders', cellar: 'p30_cellar' };
  const CARDERS_DOOR = [16, 4];          // the Hollow: the Carders' blue door, halfway down the lane from the tannery
  const TANNERY_DOOR = [11, 9];          // the tannery's back wall
  const HOLLOW_GATE = [13, 0];           // the Hollow's way back in to the tannery
  const GRAFTERS = { from: 8, to: 14 };  // Rootday morning

  const TX = {
    leave: S('Leave it.'),
    hollow: S('The Hollow'),
    carders: S('The Carders\' house'),
    cellar: S('The Carders\' root-cellar'),
    // the way in and out
    hollowDoor: S('The back door, to the Hollow'),
    bramble: S('The back door will not give. Through the cracks round it there is nothing but bramble, packed tight and still growing. The Hollow has gone under it, the whole of it.'),
    toTannery: S('The tannery\'s back door'),
    cardersDoor: S('The Carders\' house (the blue door)'),
    toLane: S('Out to the lane'),
    stairDown: S('The root-cellar stair'),
    stairUp: S('Up the stair'),
    enter: S('The Hollow hums. Not one voice: every house at once, low, behind barred doors, the sound of a town keeping very still so as not to be seen growing.'),
    // the doors
    door: S('A barred door'),
    doorShut: S('The door is barred from within. Behind it comes a sound like wind moving through a field of barley: somebody humming, very low, to keep still.'),
    marked: S('A sap-mark on the door'),
    markLook: S('A green circle, chalked at the height of a man\'s heart, with a line struck through it. Past cutting. Rooke chalks it, and the Grafters read it.'),
    pencil: S('A circle in pencil on the door'),
    pencilLook: S('A circle in soft pencil, no line through it, easy to rub out. Early. Whoever is behind this door could still go back, if kept warm and kept still.'),
    tend: S('Hum the tending note through the door (voice 8).'),
    honey: S('Leave a jar of honey on the step, for the throat of whoever hums in there.'),
    tended: S('You put your mouth to the crack and hum it low, inside the Narrow. The humming behind the door stops, listens, and starts again on your note. Somewhere in there, something draws back under the skin.'),
    honeyed: S('You set the jar on the step. After a while the bar lifts a finger\'s width, a hand takes the jar in, and the humming behind the door comes back stronger.'),
    already: S('The humming behind the door is on your note now, low and steady.'),
    noVoice: S('You have not the voice for it. The tending note wants a steady breath, and yours is torn.'),
    // the well-head and the book
    well: S('The well-head'),
    wellLook: S('A stone well-head, the only water in the Hollow. A tin cup hangs on a nail, and nobody uses it. They bring their own.'),
    book: S('Rooke\'s ward-book, chained to the well-head'),
    bookLook: S('ROOKE. THE HOLLOW. Thirty-one households, eighty-four souls, in his small square hand. Against most of the names, a green circle with a line through it: past cutting. Against two, a circle in pencil and no line: the Pells on the north row and the Ashbys on the south, "early, could go back, if kept warm". Across the top, in a different ink: FOR THE INQUISITOR, ROOTDAY.'),
    bookRead: S('Read it, and keep it in mind.'),
    bookProgress: S('The two pencilled doors, the Pells\' and the Ashbys\'. You have hummed through {0} of the two.'),
    bookWrite: S('Write "Recheck next month" against both, in pencil, as near to Rooke\'s hand as you can.'),
    bookWritten: S('You write it small against the two pencilled names, "Recheck next month", and close the book on its chain. The Grafters read the chalk. They do not read the pencil. Not this Rootday.'),
    bookAfter: S('The two pencilled names have "Recheck next month" against them, in a hand nearly Rooke\'s. Somebody has since gone over it in his own.'),
    // the people
    burl: S('One of the burl-sick, on a step'),
    burlLook0: S('A man on his doorstep with his feet gone into the cobbles to the ankle, bark up his shins. He hums with his eyes shut and does not look at you. His door has the sap-mark.'),
    burlLook1: S('A woman wrapped in a blanket, her hands in her lap gone to knuckled root. She hums the same four notes over and over, as if counting something.'),
    burlLook2: S('An old man on the bench with green coming through his collar like a second beard. When you pass, he lifts one finger off his knee, which is all the greeting he can still give.'),
    shutters: S('Red shutters'),
    bench: S('A bench by the well'),
    // the Grafters' visit
    wagon: S('The Grafters\' wagon'),
    wagonLook: S('A long white wagon behind two grey horses, their harness wrapped in felt so that nothing jingles and their hooves booted in leather. A brazier of banked coals rides in an iron cage on the bed, and under oilcloth, laid out in rows, the saws.'),
    grafter: S('A masked Grafter'),
    grafterLook: S('A Grafter in white: a long apron of white leather over a white smock, gloves to the elbow, and a mask of stiffened leather with round glass eyepieces and a lattice of wire over the mouth, so that the breathing comes through as a soft hiss. A book is open in one hand.'),
    legion: S('A Legionnaire, standing off'),
    brazier: S('The Grafters\' brazier'),
    rootday: S('It is Rootday. The Grafters\' white wagon is in the Hollow, the horses\' harness wrapped in felt, a brazier smoking in its cage. Three masked Grafters go from door to door with the book, and a Legionnaire stands off at the end of the lane. Every house has stopped humming.'),
    // the Carders' house
    hearth: S('The hearth'),
    hearthLook: S('The fire is banked low, the way you leave it for a house that is coming back. A row of bricks warms along the hearth-back.'),
    heat: S('Take a hot brick, and wrap it in flannel.'),
    heated: S('You lift a brick off the hearth-back with the tongs and wrap it in a square of flannel. It is too hot to hold for long.'),
    pallet: S('Pim\'s pallet, pulled out from the wall'),
    palletLook: S('A pallet pulled into the middle of the floor, away from the wall where the damp comes through. The blankets smell of the cellar.'),
    palletWarm: S('Put the brick in the pallet.'),
    palletWarmed: S('You push the brick down into the pallet under the blankets. The smell of the cellar gives way to the smell of hot wool. Dry. Warm.'),
    palletDone: S('The pallet is warm and dry, the brick still in it.'),
    window: S('A hush-lamp in the window'),
    windowLook: S('A hush-lamp set in the window, piping thin and high. Lyra left it there so the house would not go still while it stood empty.'),
    note: S('Lyra\'s chalk note'),
    noteLook: S('In chalk on the chimney-breast, in Lyra Ashgrove\'s hand: KEEP HIS HANDS WARM. DRY. WHEN THEY LOOK, HE HOLDS STILL.'),
    // the root-cellar
    stores: S('The stores'),
    storesLook: S('Apples in straw, gone soft; a crock of lard with a skin of green on it; seed potatoes putting out pale shoots a hand long. Everything down here has been growing in the dark.'),
    stairLamp: S('A hush-lamp at the stair foot'),
    cellarHush: S('The cellar is siphoned. Stand still down here and the Hush comes for you; the hush-lamp at the stair foot keeps it off while you stay near it. The humming in the dark is a Cacophony swarm, the hush-mites: the falling fifth stops them, and a blade finishes them.'),
    cellarQuiet: S('The cellar goes quiet. Without the mites humming, the damp will go back into the ground where it belongs.'),
    // the logbook
    jHollow: S('Rooke\'s ward-book in the Hollow names two households as "early, could go back": the Pells and the Ashbys. The Inquisitor wants the list by Rootday. If I hum the tending note through their doors, I could write them down for a recheck instead.'),
    jHollowDone: S('I hummed the tending note through the Pells\' and the Ashbys\' doors and wrote "Recheck next month" against them in Rooke\'s book. The Grafters will pass them this Rootday.'),
    jHollowClosed: S('The Hollow has gone under the bramble, and Rooke\'s book with it. I never wrote the Pells and the Ashbys down for a recheck.'),
    jCarders: S('Nell Carder wants the house behind the blue door made fit for Pim: the root-cellar cleared of the mites that bring the damp up, and a hot brick in his pallet. Rooke said to keep him out of the damp.'),
    jCardersDone: S('The Carders\' house is dry and warm. Nell is taking Pim home.'),
    jCardersClosed: S('Oakhaven is behind me. The Carders\' house never got its brick in the pallet, and I do not know where Nell took Pim.'),
  };

  // ---- Nell's second asking (her first is The Oiled Honey, data.js; this one starts only once Pim is safe)
  const NELL = {
    offer: S('You got him through it. Now the house. We cannot keep him at the mill, it is all draughts and Grafters walking past the door. Ours is behind the tannery, halfway down the Hollow lane: the blue door. Rooke said to keep him out of the damp, and the damp in that house comes up out of the root-cellar with the humming. Mites. I cannot go down there with my chest. Clear the cellar, and put a hot brick in his pallet so it is dry when we bring him home.'),
    progress: S('The cellar, and the brick in his pallet. The blue door, halfway down the Hollow lane behind the tannery. Lyra left a lamp in the window, so it is not gone still.'),
    mitesLeft: S('The brick is in, but I can hear the cellar from here. The mites are still down there.'),
    brickLeft: S('The cellar is quiet, you say? Then the brick. There are bricks on the hearth-back. Wrap one; it is too hot to hold.'),
    done: S('Dry? And warm? Then we go home tonight, and he sleeps in his own bed, in the middle of the floor where Rooke said. Take this. It is not enough. Nothing is ever enough.'),
  };

  // ---- people
  const P = {
    p30_lissa: { name: S('Lissa Merrow'), sprite: 'townswoman', portrait: 'townswoman', tier: 'low', scale: 0.68, topics: {}, quest: null,
      greet: { polite: S('You can sit on the step if you like. Not on the door. The door is for the house.'), normal: S('I am not sick. It is only in my arms, Rooke says, up to here. He looks every month.'), blunt: S('Mind my cup.') } },
  };
  const LISSA = {
    first: S('I am Lissa. Merrow. It is only in my arms, Rooke says, up to here, and he looks every month and writes it in his book. I keep my own cup, because if you drink out of a cup that has been in a house, you get what the house has. That is not true. I know it is not. I still keep my cup.'),
    after: S('Rooke came by with his book and stood at the Pells\' door a long time, and then he wrote something small and went on. He did not chalk them. Did you know he hums when he writes? Everybody in the Hollow hums.'),
    rootday: S('Do not look at them. If you look at them they look back, and then they write you down.'),
  };
  // Hob Wendle, field-hand, forty (Book One ch. 3): his roots came out through his feet in the summer; on Rootday Rooke
  // takes three toes that have gone to wood, and he walks afterwards, as Rooke promised. He dies aboard the Kestrel (ch. 13).
  P.p30_hob = { name: S('Hob Wendle, field-hand'), sprite: 'townsman', portrait: 'townsman', tier: 'low', scale: 1.08, topics: {}, quest: null,
    greet: { polite: S('Mind the step. I would get up, only it is a business, getting up, on these.'), normal: S('Field-hand. Was. You cannot follow a plough on roots.'), blunt: S('Keep \'em dry, she says. I keep \'em dry.') } };
  const HOB = {
    before: S('Hob Wendle. Field-hand, or I was. The roots came out through the soles of my feet in the summer, and I walked on them for weeks and never knew, only I left white threads in the dust of every lane. Three toes have gone to wood. Rooke comes round on Rootday with the saw and the brown bottle. He says I will walk after. He has not lied to me yet.'),
    after: S('Rooke took them clean on Rootday, three toes, with the hush-saw and the sap-iron. The drops take your voice, not the hurt; I could not make a sound. The Cantor held my head. I walk, like he promised. Keep \'em warm and dry, she told me after. I keep \'em dry.'),
  };
  P.p30_hob.quest = (g) => {
    const f = g.flags, k = (Number(g.day) || 0) >= 1 ? 'after' : 'before';
    if (f['p30_hob_' + k]) return null;
    f['p30_hob_' + k] = true;
    return { text: HOB[k] };
  };
  P.p30_lissa.quest = (g) => {
    const f = g.flags;
    if (!f.p30_lissa_met) { f.p30_lissa_met = true; return { text: LISSA.first }; }
    if (f.p30h_done && !f.p30_lissa_after) { f.p30_lissa_after = true; return { text: LISSA.after }; }
    if (hasG() && G === g && grafting()) return { text: LISSA.rootday };
    return null;
  };

  // ================================================================ sprites and a texture (procedural stand-ins)
  function paint() {
    if (typeof Engine === 'undefined' || !Engine.addSprite) return;
    const mk = (name, draw, w, h) => {
      if (Engine.sprites && Engine.sprites[name]) return;
      w = w || 24; h = h || 24; const d = new Uint32Array(w * h);
      const px = (x, y, r, g, b) => { if (x >= 0 && y >= 0 && x < w && y < h) d[y * w + x] = (255 << 24) | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0); };
      draw(px); Engine.addSprite(name, { w, h, data: d, hs: 1, cx: 0.5, dy: 0 });
    };
    const ring = (px, cx, cy, r, col, dash) => {
      for (let a = 0; a < 64; a++) { if (dash && (a >> 2) % 2) continue; const t = a / 64 * Math.PI * 2; px(Math.round(cx + Math.cos(t) * r), Math.round(cy + Math.sin(t) * r), col[0], col[1], col[2]); }
    };
    mk('p30_sapmark', (px) => {   // a green chalk circle with a line struck through it, at chest height
      for (const r of [6, 5.5, 5]) ring(px, 12, 7, r, r === 5.5 ? [70, 150, 60] : [104, 190, 88]);
      for (let k = -7; k <= 7; k++) { px(12 + k, 7 + Math.round(k * 0.6), 128, 206, 110); px(12 + k, 8 + Math.round(k * 0.6), 84, 160, 72); }
    });
    mk('p30_pencil', (px) => {   // a faint pencilled circle, no line
      ring(px, 12, 7, 6, [168, 168, 174], true); ring(px, 12, 7, 5.5, [130, 130, 136], true);
    });
    mk('p30_shutter', (px) => {   // a red shutter, slatted
      for (let y = 4; y < 16; y++) for (let x = 8; x < 16; x++) { const slat = (y % 3) === 0; px(x, y, slat ? 120 : 160, slat ? 30 : 46, slat ? 26 : 36); }
      for (let y = 4; y < 16; y++) { px(8, y, 96, 24, 20); px(15, y, 96, 24, 20); }
    });
    mk('p30_book', (px) => {   // a ledger on a chain
      for (let x = 7; x < 17; x++) for (let y = 13; y < 19; y++) px(x, y, y === 13 ? 216 : 196, y === 13 ? 206 : 184, y === 13 ? 186 : 160);
      for (let y = 13; y < 19; y++) { px(12, y, 110, 70, 40); }
      for (let x = 6; x < 18; x++) px(x, 19, 92, 58, 34);
      for (let y = 4; y < 13; y++) if (y % 2) px(16 + ((y >> 1) % 2), y, 120, 124, 130);
    });
    // the Grafters' wagon (Book One ch. 3): a long white wagon behind two grey horses, harness wrapped in felt, hooves booted
    // in leather; a brazier of banked coals in an iron cage on the bed, the saws under oilcloth. Side view, painted on a canvas.
    if (typeof document !== 'undefined' && !(Engine.sprites && Engine.sprites.p30_wagon)) {
      const W = 200, H = 72, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const c = cv.getContext('2d');
      const ell = (x, y, rx, ry, col, a) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, a || 0, 0, Math.PI * 2); c.fill(); };
      const horse = (ox, oy, body, shade, light, mane) => {
        for (const [lx, back] of [[ox + 30, 1], [ox + 64, 1], [ox + 36, 0], [ox + 70, 0]]) {   // legs, far pair first
          c.fillStyle = back ? shade : body; c.fillRect(lx, oy + 42, 5, 17);
          c.fillStyle = '#3a2618'; c.fillRect(lx - 1, oy + 57, 7, 6);                          // leather boots
          c.fillStyle = '#24170e'; c.fillRect(lx - 1, oy + 62, 7, 1);
        }
        ell(ox + 52, oy + 36, 26, 11, body);                                                    // barrel
        ell(ox + 52, oy + 40, 22, 6, shade);
        ell(ox + 70, oy + 34, 11, 10, body);                                                    // quarters
        c.fillStyle = mane; c.beginPath(); c.moveTo(ox + 80, oy + 30); c.quadraticCurveTo(ox + 88, oy + 40, ox + 84, oy + 54); c.lineTo(ox + 80, oy + 52); c.quadraticCurveTo(ox + 82, oy + 40, ox + 77, oy + 33); c.fill();   // tail
        c.fillStyle = body; c.beginPath(); c.moveTo(ox + 30, oy + 30); c.lineTo(ox + 18, oy + 12); c.lineTo(ox + 26, oy + 9); c.lineTo(ox + 40, oy + 28); c.fill();   // neck
        ell(ox + 14, oy + 15, 10, 5, body, 0.5);                                                // head
        ell(ox + 8, oy + 19, 4, 3, shade);                                                      // muzzle
        c.fillStyle = body; c.fillRect(ox + 20, oy + 4, 3, 5); c.fillRect(ox + 24, oy + 5, 3, 5);   // ears
        c.fillStyle = mane; for (let k = 0; k < 6; k++) c.fillRect(ox + 22 + k * 2.6, oy + 8 + k * 3.4, 4, 4);   // mane
        c.fillStyle = '#141414'; c.fillRect(ox + 13, oy + 13, 2, 2);                            // eye
        c.fillStyle = light; for (let k = 0; k < 7; k++) ell(ox + 40 + (k * 7) % 30, oy + 31 + (k % 3) * 3, 2.2, 1.6, light);   // dapples
        // harness wrapped in felt: collar, saddle-pad, breeching and the trace to the shaft
        c.strokeStyle = '#e4ddcc'; c.lineWidth = 4; c.beginPath(); c.ellipse(ox + 33, oy + 25, 5, 9, -0.5, 0, Math.PI * 2); c.stroke();
        c.fillStyle = '#ece6d6'; c.fillRect(ox + 46, oy + 24, 10, 6);
        c.strokeStyle = '#d8d0bc'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(ox + 36, oy + 30); c.lineTo(ox + 76, oy + 36); c.stroke();
        c.beginPath(); c.moveTo(ox + 78, oy + 30); c.quadraticCurveTo(ox + 82, oy + 40, ox + 76, oy + 44); c.stroke();
      };
      horse(6, 0, '#727c88', '#565e68', '#8e98a4', '#40444c');      // the far horse, half a step ahead and in shade
      horse(0, 4, '#8c96a2', '#68707c', '#b0bac6', '#4c5058');      // the near horse
      // shafts from the wagon to the collars
      c.strokeStyle = '#d8d2c2'; c.lineWidth = 3; c.beginPath(); c.moveTo(94, 42); c.lineTo(36, 33); c.stroke();
      // the wagon: a long white box on a dark undercarriage
      c.fillStyle = '#2e2a26'; c.fillRect(94, 44, 102, 5);
      c.fillStyle = '#e8e4da'; c.fillRect(92, 26, 106, 18);
      c.fillStyle = '#cfcabd'; c.fillRect(92, 40, 106, 4);
      c.fillStyle = '#f4f1ea'; c.fillRect(92, 26, 106, 2);
      c.fillStyle = '#bcb6a8'; for (const x of [92, 118, 144, 170, 196]) c.fillRect(x, 26, 2, 18);   // stakes
      // the saws laid under oilcloth, roped down
      c.fillStyle = '#3c4440'; c.beginPath(); c.moveTo(100, 26); c.quadraticCurveTo(128, 12, 158, 26); c.fill();
      c.fillStyle = '#4c5650'; c.beginPath(); c.moveTo(108, 24); c.quadraticCurveTo(128, 15, 150, 24); c.fill();
      c.strokeStyle = '#8a7a5a'; c.lineWidth = 1.2; for (const x of [114, 128, 142]) { c.beginPath(); c.moveTo(x, 26); c.lineTo(x + 2, 17); c.stroke(); }
      // the brazier: banked coals in an iron cage at the tail
      c.fillStyle = '#ff8a2a'; c.fillRect(170, 16, 18, 8);
      c.fillStyle = '#ffd36a'; c.fillRect(174, 18, 4, 3); c.fillRect(181, 19, 3, 2);
      c.fillStyle = '#b04812'; c.fillRect(170, 22, 18, 3);
      c.strokeStyle = '#1e1e20'; c.lineWidth = 1.5; c.strokeRect(169, 12, 20, 14);
      for (const x of [173, 177, 181, 185]) { c.beginPath(); c.moveTo(x, 12); c.lineTo(x, 26); c.stroke(); }
      c.fillStyle = '#8c8a86'; for (const [x, y] of [[176, 9], [180, 6], [178, 3], [183, 1]]) c.fillRect(x, y, 3, 2);   // smoke
      // wheels, rims bound in felt so they say nothing on the cobbles
      for (const x of [112, 180]) {
        ell(x, 56, 13, 13, '#d6d0c0'); ell(x, 56, 10, 10, '#3a3430'); ell(x, 56, 3, 3, '#d6d0c0');
        c.strokeStyle = '#d6d0c0'; c.lineWidth = 1.6; for (let a = 0; a < 6; a++) { c.beginPath(); c.moveTo(x, 56); c.lineTo(x + Math.cos(a * 1.047) * 10, 56 + Math.sin(a * 1.047) * 10); c.stroke(); }
      }
      const id = c.getImageData(0, 0, W, H), u8 = id.data;
      for (let i = 0; i < W * H; i++) { const o = i * 4; u8[o + 3] = u8[o + 3] < 100 ? 0 : 255; }
      Engine.addSprite('p30_wagon', { w: W, h: H, data: new Uint32Array(id.data.buffer), hs: 1, cx: 0.5, dy: 0 });
    }
    if (Engine.addTexture && Engine.textures && !Engine.textures.t_p30_bluedoor) {
      const d = new Uint32Array(64 * 64);
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
        const plank = (x >> 4), seam = (x & 15) === 0 || (x & 15) === 15, flake = ((x * 7 + y * 13 + plank * 29) % 23) === 0 || ((x * 11 + y * 5) % 31) === 0;
        let r = 54, g = 88, b = 140; const n = ((x * 3 + y * 7 + plank * 11) % 9) - 4; r += n; g += n; b += n * 2;
        if (seam) { r = 30; g = 44; b = 70; }
        if (flake) { r = 116; g = 98; b = 72; }        // the paint flaking to bare wood
        if (y < 3 || y > 60) { r = 70; g = 52; b = 34; }
        if (x > 48 && x < 54 && y > 30 && y < 35) { r = 40; g = 36; b = 34; }   // the latch
        d[y * 64 + x] = (255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
      }
      Engine.addTexture('t_p30_bluedoor', d);
    }
  }

  // ================================================================ the maps (new maps: always built)
  const look = (m, sprite, x, y, label, text, o) => m.deco(sprite, x, y, Object.assign({ radius: 0.3, scale: 0.7, label, use: 'p30_look', look: text }, o || {}));
  function outside(m, x, y) {
    for (const [dx, dy, dir] of [[0, 1, Math.PI / 2], [0, -1, -Math.PI / 2], [1, 0, 0], [-1, 0, Math.PI]]) {
      const nx = x + dx, ny = y + dy;
      if (nx > 0 && ny > 0 && nx < m.w - 1 && ny < m.h - 1 && !m.isBlocked(nx, ny)) return { x: nx + 0.5, y: ny + 0.5, dir };
    }
    return { x: x + 0.5, y: y - 0.5, dir: -Math.PI / 2 };
  }
  const OUT = {};
  // the Hollow's doors: [x, y, face (the lane side: 's', 'n', 'e', 'w'), mark: 'sap' | 'pencil' | null, pencil index]
  const HDOORS = [
    [3, 8, 's', 'sap'], [7, 8, 's', null], [10, 8, 's', 'sap'], [11, 4, 'e', 'sap'],
    [18, 8, 's', 'sap'], [22, 8, 's', 'pencil', 0], [26, 8, 's', 'sap'],
    [3, 13, 'n', 'sap'], [7, 13, 'n', null], [10, 13, 'n', 'sap'], [11, 17, 'e', 'sap'],
    [23, 13, 'n', 'pencil', 1], [26, 13, 'n', 'sap'], [21, 17, 'w', 'sap'],
  ];
  const RED_DOOR = [7, 13];   // Lissa's step
  const FACE = { s: [0, 1], n: [0, -1], e: [1, 0], w: [-1, 0] };
  const WELL = [18.2, 16.6];

  function buildHollow(back) {
    const W = 30, H = 22;
    const m = new GameMap(MAPS.hollow, TX.hollow, W, H, {
      outdoor: true, floor: 't_moss', floorTextures: ['t_moss', 't_cobble', 't_water', 't_shallows'], fogDist: 16, fogColor: [58, 60, 56],
      music: 'town', danger: 0, spawn: { x: HOLLOW_GATE[0] + 0.5, y: 1.5, dir: Math.PI / 2 },
    });
    m.border('t_house');
    for (let x = 0; x < W; x++) m.set(x, 0, WALL('t_wood'));       // the tannery's back wall
    m.set(HOLLOW_GATE[0], 0, DOOR({ portal: { map: 'tannery', x: back.x, y: back.y, dir: back.dir }, label: TX.toTannery }));
    // the lanes: one down from the tannery, one across, and the yard round the well
    const lane = (x0, y0, x1, y1, idx) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) m.setFloor(x, y, idx); };
    lane(12, 1, 15, 20, 1); lane(1, 9, 28, 12, 1); lane(16, 13, 20, 20, 1);
    for (const [x, y] of [[13, 5], [14, 6], [5, 10], [24, 11], [17, 18], [13, 15], [19, 14]]) m.setFloor(x, y, 3);   // standing water
    for (const [x, y] of [[1, 9], [1, 12], [28, 9], [28, 12], [12, 20], [15, 20], [20, 20], [16, 13]]) m.setFloor(x, y, 0);   // moss in the corners
    // the houses: four blocks, walls to the eaves and a stepped roof
    const block = (x0, y0, x1, y1) => {
      m.rect(x0, y0, x1, y1, 't_house');
      const along = (x1 - x0) >= (y1 - y0), ridge = along ? (y0 + y1) >> 1 : (x0 + x1) >> 1;
      for (let y = y0 + 1; y < y1; y++) for (let x = x0 + 1; x < x1; x++) m.block(x, y, 't_roof', (along ? y === ridge : x === ridge) ? 1.7 : 1.35, { capTex: 't_roof' });
    };
    block(1, 1, 11, 8); block(16, 1, 28, 8); block(1, 13, 11, 20); block(21, 13, 28, 20);
    HDOORS.forEach(([x, y, face, mark, pi]) => {
      m.set(x, y, DOOR({ locked: '__never', lockMsg: TX.doorShut, label: mark === 'sap' ? TX.marked : mark === 'pencil' ? TX.pencil : TX.door }));
      const [fx, fy] = FACE[face], ox = x + 0.5 + fx * 0.62, oy = y + 0.5 + fy * 0.62;
      const sx = ox + (fy ? 0.62 : 0), sy = oy + (fx ? 0.62 : 0);   // beside the door, on the wall
      if (mark === 'sap') look(m, 'p30_sapmark', sx, sy, TX.marked, TX.markLook, { solid: false, scale: 0.8, radius: 0.1 });
      if (mark === 'pencil') m.deco('p30_pencil', sx, sy, { solid: false, scale: 0.8, radius: 0.3, label: TX.pencil, use: 'p30_door', door: pi });
    });
    // the Carders' blue door, on the lane (it faces west)
    m.set(CARDERS_DOOR[0], CARDERS_DOOR[1], DOOR({ tex: 't_p30_bluedoor', portal: { map: MAPS.carders, x: 3.5, y: 5.0, dir: -Math.PI / 2 }, label: TX.cardersDoor }));
    // the red-shutter house, and Lissa on its step
    for (const dx of [-0.85, 0.85]) m.deco('p30_shutter', RED_DOOR[0] + 0.5 + dx, RED_DOOR[1] - 0.12, { solid: false, scale: 0.75, radius: 0.1, label: TX.shutters });
    m.npc('p30_lissa', RED_DOOR[0] + 0.5, RED_DOOR[1] - 0.6, { facing: -Math.PI / 2, scale: 0.68 });
    m.npc('p30_hob', 7.5, 9.45, { facing: Math.PI / 2, scale: 1.08 });   // on his own step, across the lane from Lissa
    // the burl-sick on their steps and the bench
    look(m, 'burlsick', 3.5, 9.45, TX.burl, TX.burlLook0, { solid: true, scale: 0.9, radius: 0.3 });
    look(m, 'burlsick', 26.5, 12.5, TX.burl, TX.burlLook1, { solid: true, scale: 0.85, radius: 0.3 });
    look(m, 'burlsick', 17.0, 19.4, TX.burl, TX.burlLook2, { solid: true, scale: 0.9, radius: 0.3 });
    m.deco('p17c_bench', 18.2, 19.5, { radius: 0.4, scale: 0.8, label: TX.bench });
    // the well-head and Rooke's book
    look(m, 'p9p_well', WELL[0], WELL[1], TX.well, TX.wellLook, { scale: 0.75, radius: 0.45 });
    m.deco('p30_book', WELL[0] + 0.85, WELL[1] - 0.35, { solid: false, scale: 0.6, radius: 0.3, label: TX.book, use: 'p30_book' });
    // hush-lamps at the crossings, always lit (the Hollow does not wait on the lamplighter)
    for (const [x, y] of [[12.3, 9.25], [15.7, 12.75], [20.6, 13.4], [1.6, 9.4], [27.4, 12.6]]) m.deco('lamp', x, y, { radius: 0.12, scale: 0.6, glow: 0.55, solid: false });
    m.item('bandage', 27.4, 9.6);
    m.baseCount = m.entities.length;
    return m;
  }
  function buildCarders(out) {
    const m = new GameMap(MAPS.carders, TX.carders, 7, 7, { floor: 't_wood', ceil: 't_wood', fogDist: 16, ambient: 0.28, fogColor: [0, 0, 0], music: 'inside', spawn: { x: 3.5, y: 5.0, dir: -Math.PI / 2 } });
    m.border('t_house');
    m.set(3, 6, DOOR({ tex: 't_p30_bluedoor', portal: { map: MAPS.hollow, x: out.x, y: out.y, dir: out.dir }, label: TX.toLane }));
    m.set(6, 3, DOOR({ portal: { map: MAPS.cellar, x: 1.5, y: 3.5, dir: 0 }, label: TX.stairDown }));
    m.deco('hearth', 1.5, 1.4, { radius: 0.4, scale: 0.9, glow: 0.7, label: TX.hearth, use: 'p30_hearth' });
    look(m, 'sign', 2.6, 1.2, TX.note, TX.noteLook, { solid: false, scale: 0.5, radius: 0.15 });
    m.deco('p29_bed', 3.5, 2.9, { radius: 0.4, scale: 0.8, solid: true, label: TX.pallet, use: 'p30_pallet' });
    look(m, 'lamp', 5.4, 1.3, TX.window, TX.windowLook, { scale: 0.6, radius: 0.12, glow: 0.6 });
    m.deco('chair', 1.5, 4.5, { radius: 0.3, scale: 0.6 });
    m.baseCount = m.entities.length;
    return m;
  }
  function buildCellar() {
    const m = new GameMap(MAPS.cellar, TX.cellar, 10, 8, { floor: 't_flag', floorTextures: ['t_flag', 't_shallows'], ceil: 't_stone', fogDist: 12, ambient: 0.22, fogColor: [10, 14, 12], music: 'dungeon', siphoned: true, danger: 0, spawn: { x: 1.5, y: 3.5, dir: 0 } });
    m.border('t_stone');
    m.set(0, 3, DOOR({ portal: { map: MAPS.carders, x: 5.5, y: 3.5, dir: Math.PI }, label: TX.stairUp }));
    for (const [x, y] of [[4, 4], [5, 4], [5, 5], [6, 5], [7, 2], [8, 2], [3, 6], [6, 6]]) m.setFloor(x, y, 1);   // the damp, standing in the floor
    m.deco('lamp', 1.5, 1.5, { radius: 0.12, scale: 0.6, glow: 0.55, solid: false, label: TX.stairLamp });
    look(m, 'shelf', 8.5, 1.3, TX.stores, TX.storesLook, { scale: 0.85, radius: 0.25 });
    m.deco('crates', 8.4, 6.4, { radius: 0.35, scale: 0.7, label: TX.stores });
    m.deco('crates', 7.3, 6.5, { radius: 0.35, scale: 0.6, label: TX.stores });
    m.enemy('mites', 6.5, 2.2); m.enemy('mites', 7.8, 5.2); m.enemy('mites', 4.6, 6.0);
    m.item('tonic', 8.5, 3.5);
    m.baseCount = m.entities.length;
    return m;
  }
  function buildMaps(maps) {
    const tan = maps.tannery;
    OUT.tannery = tan ? outside(tan, TANNERY_DOOR[0], TANNERY_DOOR[1]) : { x: 11.5, y: 8.5, dir: -Math.PI / 2 };
    OUT.carders = { x: CARDERS_DOOR[0] - 0.5, y: CARDERS_DOOR[1] + 0.5, dir: Math.PI };   // out onto the lane, facing away from the door
    if (!maps[MAPS.hollow]) maps[MAPS.hollow] = buildHollow(OUT.tannery);
    if (!maps[MAPS.carders]) maps[MAPS.carders] = buildCarders(OUT.carders);
    if (!maps[MAPS.cellar]) maps[MAPS.cellar] = buildCellar();
    syncTannery(tan);
  }
  // the tannery's back door: into the Hollow, or onto bramble once the town has gone
  function syncTannery(tan) {
    if (!tan || tan.id !== 'tannery' || tan.w !== 15 || tan.h !== 10) return;
    const [x, y] = TANNERY_DOOR, c = tan.get(x, y);
    if (gone()) { if (!c || c.locked !== '__never' || c.lockMsg !== TX.bramble) tan.set(x, y, DOOR({ locked: '__never', lockMsg: TX.bramble, label: TX.hollowDoor })); return; }
    if (!c || !c.portal || c.portal.map !== MAPS.hollow) {
      const sp = { x: HOLLOW_GATE[0] + 0.5, y: 1.5, dir: Math.PI / 2 };
      tan.set(x, y, DOOR({ portal: { map: MAPS.hollow, x: sp.x, y: sp.y, dir: sp.dir }, label: TX.hollowDoor }));
    }
  }


  // ================================================================ the Grafters' visit (Rootday morning; transient)
  const grafting = () => hasG() && rootday() && hour() >= GRAFTERS.from && hour() < GRAFTERS.to && !gone();
  const keyed = (m, k) => m.entities.find((e) => e && e._p30 === k);
  function put(m, k, make) {
    let e = keyed(m, k); if (e) return e;
    e = Object.assign(make(), { transient: true, _decor: true, _p30: k });
    m.entities.push(e); return e;
  }
  function drop(m, k) { for (let i = m.entities.length - 1; i >= 0; i--) if (m.entities[i] && m.entities[i]._p30 === k) m.entities.splice(i, 1); }
  const thing = (sprite, x, y, o) => () => Object.assign({ kind: 'deco', sprite, x, y, solid: true, radius: 0.3, scale: 1.0 }, o || {});
  const VISIT = [
    // the brazier rides on the wagon's bed in its cage (ch. 3), so the wagon carries its light
    ['wagon', thing('p30_wagon', 13.6, 17.6, { scale: 1.1, radius: 0.8, lightCol: [62, 31, 8], label: TX.wagon, use: 'p30_look', look: TX.wagonLook })],
    ['g0', thing('rooke', 21.6, 9.9, { label: TX.grafter, use: 'p30_look', look: TX.grafterLook, facing: -Math.PI / 2 })],
    ['g1', thing('rooke', 9.2, 11.8, { label: TX.grafter, use: 'p30_look', look: TX.grafterLook, facing: Math.PI / 2 })],
    ['g2', thing('rooke', 17.6, 15.2, { label: TX.grafter, use: 'p30_look', look: TX.grafterLook, facing: 0 })],
    ['leg', thing('legionnaire', 14.6, 19.4, { label: TX.legion, facing: -Math.PI / 2 })],
  ];
  function syncMap(m) {
    if (!m || m.id !== MAPS.hollow || !Array.isArray(m.entities)) return;
    const on = grafting();
    for (const [k, make] of VISIT) { if (on) put(m, k, make); else drop(m, k); }
  }

  // ================================================================ the quests
  const pencilled = () => { const f = F(); return (f.p30h_d0 ? 1 : 0) + (f.p30h_d1 ? 1 : 0); };
  function startList() {
    const f = F(); if (f.p30h_q) return;
    f.p30h_q = 1; journal('side', TX.jHollow);
  }
  function useBook() {
    const f = F();
    if (f.p30h_done) { showEvent(TX.book, TX.bookAfter, [{ t: TX.leave, f: null }]); return; }
    if (!f.p30h_q) { showEvent(TX.book, TX.bookLook, [{ t: TX.bookRead, f: () => startList() }, { t: TX.leave, f: null }]); return; }
    const n = pencilled(), body = TX.bookLook + '<br><br>' + fmt(TX.bookProgress, n);
    const ch = [];
    if (n >= 2) ch.push({ t: TX.bookWrite, f: () => finishList() });
    ch.push({ t: TX.leave, f: null });
    showEvent(TX.book, body, ch);
  }
  function finishList() {
    const f = F(); if (f.p30h_done) return;
    f.p30h_done = true; f.p30h_q = 2;
    try { questXp(40); } catch (e) { /* no xp */ }
    try { if (typeof changeRep === 'function' && !f.p30h_rep) { f.p30h_rep = true; changeRep('hedge', 3); } } catch (e) { /* no standing */ }
    say(TX.bookWritten, 'good', 7000);
    journal('side', TX.jHollowDone);
  }
  function useDoor(e) {
    const f = F(), k = 'p30h_d' + (e.door | 0);
    if (f[k]) { showEvent(TX.pencil, TX.already, [{ t: TX.leave, f: null }]); return; }
    const p = G.player, ch = [];
    const canTend = Array.isArray(p.songs) && p.songs.includes('tending');
    if (canTend) ch.push({ t: TX.tend, f: () => {
      if ((p.voice || 0) < 8) { say(TX.noVoice, 'bad', 3500); return; }
      p.voice -= 8; f[k] = 1; try { addNoise(0.6); } catch (err) { /* no noise */ } try { Audio_.sfx.song(174, 1.4); } catch (err) { /* no audio */ }
      if (!f.p30h_q) startList();
      say(TX.tended, 'good', 6000);
    } });
    if (typeof G.has === 'function' && G.has('honey')) ch.push({ t: TX.honey, f: () => {
      try { G.take('honey'); } catch (err) { return; }
      f[k] = 1; if (!f.p30h_q) startList();
      say(TX.honeyed, 'good', 6000);
    } });
    ch.push({ t: TX.leave, f: null });
    showEvent(TX.pencil, TX.pencilLook + '<br><br>' + TX.doorShut, ch);
  }
  // Nell's asking: offered through her own dialogue once Pim is safe (her quest function itself is left as it was)
  function nellAsks(g) {
    const f = g.flags;
    if (!f.pim_safe || gone() || f.p30c_q === 2) return null;
    if (!f.p30c_q) { f.p30c_q = 1; return { text: NELL.offer, journal: ['side', TX.jCarders] }; }
    if (f.p30c_mites && f.p30c_warm) {
      f.p30c_q = 2;
      try { if (typeof g.gold === 'function') g.gold(6); else g.player.gold = (g.player.gold || 0) + 6; } catch (e) { /* no purse */ }
      try { questXp(30); } catch (e) { /* no xp */ }
      try { if (typeof changeRep === 'function' && !f.p30c_rep) { f.p30c_rep = true; changeRep('hedge', 2); } } catch (e) { /* no standing */ }
      return { text: NELL.done, journal: ['side', TX.jCardersDone] };
    }
    if (f.p30c_warm && !f.p30c_mites) return { text: NELL.mitesLeft };
    if (f.p30c_mites && !f.p30c_warm) return { text: NELL.brickLeft };
    return { text: NELL.progress };
  }
  function useHearth() {
    const f = F();
    if (f.p30c_q === 1 && !f.p30c_brick && !f.p30c_warm) { showEvent(TX.hearth, TX.hearthLook, [{ t: TX.heat, f: () => { f.p30c_brick = 1; say(TX.heated, '', 4500); } }, { t: TX.leave, f: null }]); return; }
    showEvent(TX.hearth, TX.hearthLook, [{ t: TX.leave, f: null }]);
  }
  function usePallet() {
    const f = F();
    if (f.p30c_warm) { showEvent(TX.pallet, TX.palletDone, [{ t: TX.leave, f: null }]); return; }
    if (f.p30c_brick) { showEvent(TX.pallet, TX.palletLook, [{ t: TX.palletWarm, f: () => { f.p30c_brick = 0; f.p30c_warm = 1; say(TX.palletWarmed, 'good', 5000); } }, { t: TX.leave, f: null }]); return; }
    showEvent(TX.pallet, TX.palletLook, [{ t: TX.leave, f: null }]);
  }
  function mitesCleared() {
    const m = hasG() && G.maps ? G.maps[MAPS.cellar] : null; if (!m) return false;
    const base = m.entities.slice(0, m.baseCount != null ? m.baseCount : m.entities.length).filter((e) => e && e.kind === 'enemy');
    return base.length > 0 && base.every((e) => e.dead);
  }
  function closeAtLeaving() {
    if (!gone()) return;
    const f = F();
    if (f.p30h_q === 1 && !f.p30h_done && !f.p30h_closed) { f.p30h_closed = true; journal('side', TX.jHollowClosed); }
    if (f.p30c_q === 1 && !f.p30c_closed) { f.p30c_closed = true; journal('side', TX.jCardersClosed); }
  }

  // ================================================================ uses
  function useOwn(e) {
    if (!e || typeof e.use !== 'string' || e.use.indexOf('p30_') !== 0) return false;
    if (e.use === 'p30_look') { showEvent(e.label || '', e.look || '', [{ t: TX.leave, f: null }]); return true; }
    if (e.use === 'p30_book') { useBook(); return true; }
    if (e.use === 'p30_door') { useDoor(e); return true; }
    if (e.use === 'p30_hearth') { useHearth(); return true; }
    if (e.use === 'p30_pallet') { usePallet(); return true; }
    return false;
  }

  // ================================================================ the tick and the wiring
  const said = {};
  function tick() {
    if (!hasG() || G.state !== 'play' || guest()) return;
    const f = F();
    try { syncMap(G.map); } catch (e) { warnOnce('sync', e); }
    try {
      if (!f.p30c_mites && mitesCleared()) { f.p30c_mites = 1; if (here() === MAPS.cellar) say(TX.cellarQuiet, 'good', 5000); }
      if (here() === MAPS.hollow && grafting()) { const k = 'rootday:' + G.day; if (!said[k]) { said[k] = true; say(TX.rootday, 'warn', 8000); } }
      closeAtLeaving();
    } catch (e) { warnOnce('quests', e); }
  }
  function onLoad() {
    if (!hasG()) return;
    try {
      syncMap(G.map); syncTannery(G.maps && G.maps.tannery);
      if (here() === MAPS.hollow && !said['in:' + G.day]) { said['in:' + G.day] = true; if (!grafting()) say(TX.enter, '', 6500); }
      if (here() === MAPS.cellar && !G.flags.p30c_told) { G.flags.p30c_told = true; say(TX.cellarHush, 'warn', 11000); }
    } catch (e) { warnOnce('load', e); }
  }
  function wire() {
    paint();
    if (typeof NPCS !== 'undefined') for (const k in P) if (!NPCS[k]) NPCS[k] = P[k];
    try { if (typeof VOICES !== 'undefined' && VOICES.PEOPLE) Object.assign(VOICES.PEOPLE, Object.assign({ p30_lissa: { f0: 262, fs: 1.14, style: 'human' }, p30_hob: { f0: 108, fs: 0.93, style: 'human' } }, VOICES.PEOPLE)); } catch (e) { /* default voices */ }
    if (typeof buildAllMaps === 'function') {
      const _b = buildAllMaps;
      buildAllMaps = function () { const maps = _b.apply(this, arguments); try { buildMaps(maps); } catch (e) { warnOnce('build', e); } return maps; };
    }
    if (typeof LAW_MAPS !== 'undefined') { LAW_MAPS.add(MAPS.hollow); LAW_MAPS.add(MAPS.carders); }
    if (typeof useDeco === 'function') {
      const _ud = useDeco;
      useDeco = function (e) { try { if (useOwn(e)) return undefined; } catch (err) { warnOnce('use', err); } return _ud.apply(this, arguments); };
    }
    // Nell: her own quest runs first and is left untouched; once it has nothing to say, the house is asked about
    if (typeof talk === 'function') {
      const _t = talk;
      talk = function (e) {
        const n = e && e.id === 'nell' && typeof NPCS !== 'undefined' ? NPCS.nell : null;
        if (!n || !hasG() || guest()) return _t.apply(this, arguments);
        const own = n.quest;
        n.quest = function (g) { const r = own ? own.apply(this, arguments) : null; if (r) return r; try { return nellAsks(g); } catch (err) { warnOnce('nell', err); return null; } };
        try { return _t.apply(this, arguments); } finally { n.quest = own; }
      };
    }
    if (typeof updateNarrow === 'function') {
      const _un = updateNarrow;
      updateNarrow = function () { const r = _un.apply(this, arguments); tick(); return r; };
    }
    for (const fn of ['loadMap', 'restoreGame']) {
      if (typeof window[fn] !== 'function') continue;
      const _f = window[fn];
      window[fn] = function () { const r = _f.apply(this, arguments); onLoad(); return r; };
    }
    if (typeof passHours === 'function') {
      const _ph = passHours;
      passHours = function () { const r = _ph.apply(this, arguments); try { if (hasG()) syncMap(G.map); } catch (e) { warnOnce('hours', e); } return r; };
    }
  }
  try { wire(); } catch (e) { console.warn('hollow30 failed to wire', e); }

  return {
    TX, P, NELL, LISSA, HOB, MAPS, HDOORS, CARDERS_DOOR, TANNERY_DOOR, GRAFTERS, VISIT, TEXTS,
    syncMap, syncTannery, useOwn, nellAsks, mitesCleared, grafting, pencilled, closeAtLeaving,
    get out() { return OUT; },
  };
})();
if (typeof window !== 'undefined') window.HOLLOW30 = HOLLOW30;
