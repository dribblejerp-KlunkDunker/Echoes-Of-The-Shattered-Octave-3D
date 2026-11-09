// ============================================================
//  PART FOUR, third pass: the Quiet Faith's hush-gift, Mags's hand-cant,
//  and the Arbiter's search party ("Lanterns in the Mist")
// ============================================================

function wildsReveal(flag) {
  for (const id in G.maps) for (const o of G.maps[id].entities) if (o.requires === flag && !o.dead) o.hidden = false;
}
function wildsWren() { return G.maps.deepwoods.entities.find(e => e.id === 'wren'); }

// ---------------------------------------------------------------- per-frame
function wildsTick(dt) {
  const f = G.flags;
  if (G.mutedT > 0) G.mutedT -= dt;
  if (!f.part4 || G.mapId !== 'deepwoods') return;
  const lamp = G.ents.find(e => e.giftLamp);
  if (lamp) lamp.glow = f.gift_dark ? 0 : 0.9;
  // the Quiets go to the light, and the child is in the light
  if (f.gift_quiets && !f.wren_taken && !f.wren_saved) {
    const w = wildsWren();
    for (const q of G.ents) {
      if (!q.giftQ || q.dead || q.hidden || q.state !== 'passive') continue;
      if (f.gift_dark) { q.state = 'chase'; q.alertT = 10; continue; }
      const dx = w.x - q.x, dy = w.y - q.y, d = Math.hypot(dx, dy);
      if (d < 0.9) { wildsWrenTaken(); break; }
      moveWithSlide(q, dx / d * 0.42 * dt, dy / d * 0.42 * dt, q);
    }
    if (!f.gift_quiets_dead && G.ents.filter(e => e.giftQ).every(e => e.dead)) {
      f.gift_quiets_dead = true; questXp(40);
      msg('The second Quiet comes apart like wet paper, and the air comes back. Behind you, the child is still singing. She has not missed a note.', 'good', 6000);
      journal('side', 'The Hush-Gift: I killed the two Quiets that came for the child. The Tongueless are still standing in the willows, watching. The Deacon has not moved.');
    }
  }
}
function wildsWrenTaken() {
  const f = G.flags; f.wren_taken = true; f.wren_gone = true;
  const w = wildsWren(); if (w) w.hidden = true;
  for (const q of G.ents) if (q.giftQ && !q.dead) { q.state = 'chase'; q.alertT = 10; }
  for (const o of G.ents) if (o.giftGuard && !o.dead) { o.hidden = true; o.dead = true; }
  msg('The Quiet reaches the light. You watch the child\'s mouth go on singing, and hear nothing, and then there is no child. The Tongueless are gone back into the willows.', 'bad', 9000);
  journal('side', 'The Hush-Gift: I was too slow. The Quiets reached the light, and the child the Quiet Faith left there is gone. I did not even learn her name.');
}

// ---------------------------------------------------------------- enemy behaviour
function wildsExtra(e, dt, dist, canSee) {
  const d = e.def, p = G.player;
  if (d.crossbow && canSee && dist > 2.2 && dist < 8.5) {
    e.shotT = (e.shotT == null ? rnd(1.2, 2.6) : e.shotT) - dt;
    if (e.shotT <= 0) {
      e.shotT = rnd(3.0, 4.2); Audio_.sfx.bow();
      const dodge = p.attrs.Agility / 300 + armorRating() * 0.01;
      if (Math.random() > dodge + Math.min(0.25, dist * 0.02)) { damagePlayer(rndi(4, 8), 'An outrider\'s bolt'); G.hurtT = 0.3; msg('A crossbow bolt comes out of the mist and takes you.', 'bad', 2200); }
      else msg('A crossbow bolt hums past your ear and into a willow.', '', 1800);
    }
  }
  if (d.rally) {
    e.rallyT = (e.rallyT == null ? 0.4 : e.rallyT) - dt;
    if (e.rallyT <= 0) {
      e.rallyT = 7;
      let n = 0;
      for (const o of G.ents) if (o.party && o !== e && !o.dead && !o.hidden) { if (o.state !== 'chase') n++; o.state = 'chase'; o.alertT = 10; }
      if (n) msg('Brennick lifts the hush-lantern and swings it twice. Every hooded light on the track turns your way.', 'bad', 3500);
    }
  }
  if (d.deaconAura && dist < 6) {
    G.mutedT = Math.max(G.mutedT || 0, 0.4);
    e.auraT = (e.auraT || 0) - dt;
    if (e.auraT <= 0) {
      e.auraT = 10;
      for (const o of G.ents) if (o.giftGuard && o !== e && !o.dead && !o.hidden) { o.state = 'chase'; o.alertT = 10; }
      msg('The Deacon lifts the clapperless bell. Nothing rings. Your next song dies in your throat, and the Tongueless come out of the willows without a sound.', 'bad', 4500);
    }
  }
}
function wildsHitFx(e, d) {
  const p = G.player;
  if (d.mute && Math.random() < 0.5) {
    const fresh = !(G.mutedT > 0.5); G.mutedT = 5; Audio_.sfx.quiet();
    if (fresh) msg('The felted bell comes down on you, and the sound goes out of your mouth. For a while you cannot sing.', 'bad', 3500);
  }
  if (d.moth) {
    p.voice = Math.max(0, p.voice - 3);
    if (!e.mothMsg) { e.mothMsg = true; msg('The moths settle on your mouth and eat. Your voice comes away in grey dust on their wings.', 'warn', 3000); }
  }
}
function wildsSilenced() {
  if (G.mutedT > 0) { msg('You open your mouth to sing and there is no sound in it. Not yet.', 'bad', 1800); return true; }
  return false;
}
function wildsBossDown(e) {
  const f = G.flags;
  if (e.type === 'deacon') {
    f.deacon_dead = true; G.give('unrungbell'); questXp(60);
    for (const o of G.ents) if (o.giftGuard && !o.dead) { o.state = 'passive'; o.hidden = true; o.dead = true; }
    msg('The Deacon of the Unrung Bell goes down without a sound, which is what he wanted. The Tongueless drop their sickles and walk away into the willows. You pick up the clapperless bell.', 'good', 7000);
    journal('side', 'The Hush-Gift: I killed the Deacon of the Unrung Bell. His brothers dropped their sickles and walked away into the willows. The child is still singing. Talk to her.');
  }
  if (e.type === 'captain') {
    f.captain_dead = true; f.party_fought = true; G.give('dispatch'); questXp(80);
    msg('Brennick\'s lantern goes out in the moss. In his coat there is a dispatch in an Arbiter\'s hand.', 'good', 6000);
    wildsDispatch();
  }
}
function wildsDispatch() {
  const f = G.flags;
  if (f.dispatch_read) return;
  f.dispatch_read = true;
  showEvent('The Arbiter\'s dispatch', 'Heavy paper, folded twice, the seal a tuning-fork in grey wax.<br><br><i>From the column of the Dread Arbiter, the Tramway.<br>To OC-742, or any officer finding this.<br><br>Report. The Arbiter will not divert the column for a cutter. Find the DK and keep listening. Note every name the archivist reads. The Cantor is not to be harmed.<br><br>— A.V.</i><br><br>Not to be harmed. Not "taken". Not "silenced". Somebody on the Tramway wants Lyra Ashgrove alive and singing, and is prepared to wait.', [{ t: 'Fold it away.', f: null }]);
  journal('side', 'Lanterns in the Mist: the Arbiter\'s dispatch, signed A.V., says the column will not divert for a cutter; whoever finds the Kestrel is to keep listening and note every name Sable reads. The Cantor is not to be harmed. Lyra should know. So should Kaelen.');
}

// ---------------------------------------------------------------- the search party
function wildsPartyCome(trail) {
  const f = G.flags;
  f.party_come = true;
  wildsReveal('party_come');
  journal('side', trail
    ? 'Lanterns in the Mist: an Office search party from the Arbiter\'s column is on the north-east cart-track: Outrider-Captain Hal Brennick, outriders with crossbows and hushwardens with felted bells. Vane gave me the listening-horn\'s wax cylinder. Set it going in the heart of the weaverling nests, south-west, and the Office will follow its own ears.'
    : 'Lanterns in the Mist: an Office search party from the Arbiter\'s column is on the north-east cart-track: Outrider-Captain Hal Brennick, outriders with crossbows and hushwardens with felted bells. Kill the captain and his lantern, and the column loses its eyes.');
}
function wildsTrail(e) {
  const f = G.flags;
  if (f.party_webbed || f.party_fought) { msg('The heart of the nests. Every thread in the woods comes here.', '', 3000); return; }
  if (!G.has('hornwax')) { msg('The heart of the nests, where every thread meets. A voice set going here would sound like it came from everywhere.', '', 3500); return; }
  if (G.ents.some(o => o.kind === 'enemy' && !o.dead && !o.hidden && (o.type === 'weaverling' || o.type === 'broodmother') && dist2(o.x, o.y, Engine.cam.x, Engine.cam.y) < 30)) { msg('The webs are shaking. Not with the brood this close.', 'warn', 3000); return; }
  showEvent('The false trail', 'You wind the cylinder, set it in the crook of the thickest web, and let it go. Out of the horn comes Lyra, singing the calling-song in the Malting; Sable reading a name; Vane saying <i>ten</i>; your own voice, asking the way. All of it at once, and from every thread in the nests.', [
    { t: 'Get out of the nests, fast.', f: () => {
      f.party_webbed = true; f.party_trail = true; G.take('hornwax'); questXp(120);
      for (const o of G.maps.deepwoods.entities) if (o.party && !o.dead) { o.dead = true; o.hidden = true; }
      wildsReveal('party_webbed');
      for (const o of G.maps.deepwoods.entities) if (o.until === 'party_webbed') o.hidden = true;
      msg('An hour later the lanterns come down off the track and into the south-west, following your voices, very carefully, very quietly. Then the webs start shaking. Then nothing.', 'good', 9000);
      journal('side', 'Lanterns in the Mist: the search party followed the horn\'s recording into the weaverling nests. The brood took them all, captain and lantern and all. Brennick is wound in silk at the edge of the nests, and there may still be something in his coat.');
    } },
  ]);
}
function wildsCaptainCocoon() {
  const f = G.flags;
  if (f.dispatch_read) { msg('Brennick, in his silk. The lantern inside it has finally gone out.', '', 3000); return; }
  G.give('dispatch'); questXp(30);
  msg('You cut the silk at his chest. His coat is still dry. There is a dispatch in it.', 'good', 3500);
  wildsDispatch();
}

// ---------------------------------------------------------------- the hush-gift
function wildsGiftEvent() {
  const f = G.flags;
  f.gift_quiets = true; wildsReveal('gift_quiets');
  showEvent('The hush-gift', 'A girl of eight or so stands barefoot in a ring of unlit hush-lamps, in a crown of pale flowers, singing. She is singing loudly, the way you would sing if you had been told that singing nicely was the whole of your job. One lamp beside her is lit, and its reed-whistle has been stopped with wax.<br><br>In the willows, a little way off, men in undyed robes stand without moving. Their mouths are bound. One of them holds up a bell with no clapper.<br><br>And out of the mist to the north, the air is going thin. Two of them. They are coming to the light.' + partyLine({ kaelen: 'Kaelen is already moving. "Quiets. Iron, not glass. Get between them and her."', lyra: 'Lyra makes a sound you have never heard her make, and starts towards the child. "Put out that lamp," she says. "Quiets go to the light. Put it out."' }), [
    { t: 'Go for the Quiets.', f: null },
    { t: 'Put out the lamp. Quiets go to the light.', f: () => wildsLampOut() },
  ]);
  journal('side', 'The Hush-Gift: the Quiet Faith has left a child singing in a ring of hush-lamps in the north-west of the Deep Woods, with one lamp lit to call the Quiets. Two are coming. Kill them, or put out the lamp, before they reach her.');
}
function wildsLampOut() {
  const f = G.flags;
  if (f.gift_dark) return;
  f.gift_dark = true;
  for (const q of G.ents) if (q.giftQ && !q.dead && !q.hidden) { q.state = 'chase'; q.alertT = 10; }
  msg('You pinch out the wick. The light goes, and the Quiets stop, and turn, and go looking for the next warm thing in the dark, which is you.', 'warn', 6000);
}
function wildsDeacon() {
  const f = G.flags;
  const peace = f.mags_cant;
  showEvent('The Deacon of the Unrung Bell', 'The tall one comes out of the willows, slow, with the clapperless bell held up in front of him like a lantern. His brothers come with him. His mouth is bound with linen, and his hands begin to move.<br><br>' + (peace
    ? 'You can read it now, the way Mags taught you. <i>SHE IS GIVEN. THE QUIET IS MERCIFUL. GO.</i>'
    : 'He signs something slow and formal, and waits. You do not know hand-cant. Mags would.') + partyLine({ kaelen: 'Kaelen, very quietly, at your shoulder: "Five of them. I can hear the sickles. Say the word."', lyra: 'Lyra, behind you, very quietly: "He thinks he is being kind. That is the worst of it."' }), [
    peace ? { t: 'Sign back: "The Hush is quiet. It is not merciful."', f: () => wildsPeace() } : null,
    { t: 'Draw your weapon.', f: () => { for (const o of G.ents) if (o.giftGuard && !o.dead) { o.state = 'chase'; o.alertT = 10; } } },
    { t: 'Back away from him, for now.', f: null },
  ].filter(Boolean));
}
function wildsPeace() {
  const f = G.flags;
  showEvent('The Deacon of the Unrung Bell', 'He watches your hands all the way through, the way Mags watches a mouth. Then he looks at the child, for a long time, the way a man looks at a thing he was very sure about.<br><br>He signs: <i>WHO TAUGHT YOU.</i><br>You sign: <i>A WOMAN WHO STOPPED HEARING.</i><br><br>He takes the bell with no clapper from around his neck and puts it into your hands. <i>THEN SHE IS YOURS TO KEEP LOUD,</i> he signs, and walks back into the willows, and his brothers go with him, and none of them makes a sound.', [{ t: 'Go to the child.', f: () => {
    f.gift_peace = true; G.give('unrungbell'); questXp(100);
    for (const o of G.ents) if (o.giftGuard && !o.dead) { o.state = 'passive'; o.passive = true; o.hidden = true; o.dead = true; }
    journal('side', 'The Hush-Gift: I answered the Deacon of the Unrung Bell in hand-cant, and he gave me his clapperless bell and walked away with his brothers. Nobody had to die. The child is still singing.');
  } }]);
}
function wildsTalk(e) {
  const f = G.flags;
  if (e.id !== 'wren') return false;
  if (!f.gift_quiets) { wildsGiftEvent(); return true; }
  if (G.ents.some(q => q.giftQ && !q.dead && !q.hidden)) { msg('She will not stop singing. Behind you, the air is going thin.', 'warn', 3000); return true; }
  if (!f.gift_peace && !f.deacon_dead) { wildsDeacon(); return true; }
  showEvent('The child', 'She stops singing at last, all at once, and looks at you, and then at the empty willows. "Is it over?" she says, much too loud, and then remembers, and whispers it. "Is it over? Mam said if I sang nicely the Quiet would come and be kind to me." Her name, she tells you, is Linnet.', [{ t: '"It\'s over. Come and meet a Cantor."', f: () => {
    f.wren_saved = true; f.wren_gone = true; questXp(80);
    e.hidden = true; wildsReveal('wren_saved');
    msg('Linnet holds your sleeve all the way back to the fire, and does not sing once, and you can see how hard that is.', 'good', 6000);
    journal('side', 'The Hush-Gift: the child is called Linnet. She is at the camp fire now, and Lyra is teaching her the skipping-rhyme: too loud brings the hounds, too still brings the Hush.');
  } }]);
  return true;
}

// ---------------------------------------------------------------- Mags's hand-cant
const CANT_QUIZ = [
  { sign: 'She draws her flat hand down over her mouth, slowly, like closing a door.', a: ['Quiet.', 'Eat.', 'Sleep.'], ok: 0 },
  { sign: 'Two fingers walk off the edge of her palm and keep on walking.', a: ['Fall.', 'Go.', 'Dance.'], ok: 1 },
  { sign: 'A fist against her breastbone, and then the hand opens outward, palm up.', a: ['Pray.', 'Stop.', 'Give.'], ok: 2 },
];
function wildsCantQuiz(i) {
  const f = G.flags;
  if (i >= CANT_QUIZ.length) {
    showEvent('Hand-cant', 'Mags nods. "Now a sentence. They\'ll say the Quiet is merciful. They always do. You say this back." She signs it for you, slowly, three times: <i>THE HUSH IS QUIET. IT IS NOT MERCIFUL.</i><br><br>You sign it back. She corrects your thumb. You sign it again.<br><br>"That\'ll do," she says. "Don\'t argue theology with them past that. They haven\'t got the tongues for it, and you haven\'t got the hands."', [{ t: 'Thank her.', f: () => {
      f.mags_cant = true; questXp(50);
      journal('side', 'Hand-Cant: Mags taught me the hand-cant of the dock-crews and the Quiet Faith: quiet, go, give, and one sentence: THE HUSH IS QUIET. IT IS NOT MERCIFUL.');
    } }]);
    return;
  }
  const q = CANT_QUIZ[i];
  showEvent('Hand-cant', `Mags signs it, and watches your face. ${q.sign}<br><br>"Well?"`, q.a.map((t, k) => ({ t, f: () => {
    if (k === q.ok) { msg('Mags nods once.', '', 1500); wildsCantQuiz(i + 1); }
    else { msg('Mags shakes her head and does it again, slower.', 'warn', 2000); wildsCantQuiz(i); }
  } })));
}

// ---------------------------------------------------------------- use, triggers, ending
function wildsUse(e) {
  const f = G.flags;
  if (e.use === 'gift_lamp') {
    if (f.gift_dark) { msg('The lamp is out. The wax is still in its whistle.', '', 2500); return true; }
    if (!f.gift_quiets) { msg('A lit hush-lamp with its whistle stopped. In the Narrow you keep a lamp whistling so the Hush stays off. This one is for calling it.', 'warn', 4000); return true; }
    wildsLampOut(); return true;
  }
  if (e.use === 'trail_spot') { wildsTrail(e); return true; }
  if (e.use === 'captain_cocoon') { wildsCaptainCocoon(); return true; }
  return false;
}
function wildsTrigger(t) {
  const f = G.flags;
  if (t.id === 'gift_far') {
    if (!f.gift_heard && !f.wren_gone) { f.gift_heard = true; msg('Somewhere north-west, past the pools, a child is singing. Loudly. Nobody sings loudly out here.', 'voice', 6000); journal('side', 'The Hush-Gift: a child is singing somewhere in the north-west of the Deep Woods, loudly, which nobody does. Mags might know what it means.'); }
    return true;
  }
  if (t.id === 'gift_ring') { if (!f.gift_quiets && !f.wren_gone) wildsGiftEvent(); return true; }
  return false;
}
function wildsEndingLines() {
  const f = G.flags, L = [];
  if (f.wren_saved) L.push(f.gift_peace
    ? 'You answered the Deacon of the Unrung Bell in Mags\'s hand-cant, and he gave you his clapperless bell and walked away. Linnet sings by the fire now, too loud, and Lyra lets her.'
    : 'The Deacon of the Unrung Bell died without a sound, which is what he wanted. Linnet sings by the fire now, too loud, and Lyra lets her.');
  else if (f.wren_taken) L.push('The Quiets reached the light in the north-west before you did. The Quiet Faith\'s gift was taken, and you never learned her name.');
  if (f.party_trail) L.push('The Arbiter\'s search party followed the listening-horn\'s recording of your own voices into the weaverling nests, and did not come out. Outrider-Captain Hal Brennick is still there, wound in silk.');
  else if (f.party_fought) L.push('Outrider-Captain Hal Brennick died on the north-east cart-track with his lantern in the moss.');
  if (f.dispatch_read) L.push('His dispatch, signed A.V., is in Sable\'s Ledger now: <i>the Cantor is not to be harmed.</i> Somebody on the Tramway is prepared to wait.');
  return L;
}
