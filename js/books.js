// A Cantabile broadsheet serial (internally still MOOR_BOOKS / moor_* for save compatibility): a tale of the Caldera,
// printed on Broadsheet Row and carried up the river through Stillwater Landing. The supplied chapter is kept, with
// names and terms brought into canon (story/Game Layer/Review - The Moor serial.md); The Gate Book continues it.
// Published fiction, not live quest evidence. Esser's papers never become saleable items.
// Copies and read markers use G.flags; carried pamphlets use the existing inventory/save schema.
'use strict';

const MOOR_BOOKS = (function () {
  const volumes = [
    {
      id: 'book_things_taken_home', title: 'The Things Taken Home', part: 1, price: 1,
      preface: 'When the lower works fell in, it took the street above it. Hessa lost her house and her father in one morning, and her husband was carried into the works infirmary. The traveler has been back into the ruin for her, and has brought out a box.',
      text: `Hessa read the back of the portrait twice.

The first time, she smiled.

It was such a small, unexpected expression that the traveler looked away.

“The shirt was yellow,” she said. “He wore it to mend everything. Mother said there was no point washing it because you could stand it in the corner by itself.”

She turned the portrait over.

For a while, she studied her mother’s face.

Then she reached for the earrings.

One clasp resisted her fingers. She tried again, became angry with it, and put both earrings on the table.

“I thought I’d know what to do when someone brought something back.”

The traveler said nothing.

“The chair, perhaps. Or his boots. Something I could clean.”

She laid her palm over the little wooden bird.

“I don’t know what to do with all this.”

Below the shelter, the Great Beat kept its four counts. She had stopped hearing it years ago. She only spoke between the falls.

Outside the shelter, someone was splitting firewood. Every few strokes, the axe caught and had to be worked free.

Hessa listened until it struck cleanly again.

Then she began putting the contents back into the box.

The visitor came before she had finished.

A young man stood in the doorway with his cap held against his stomach.

His coat was ordinary. His boots were not. They were the square-toed kind issued to clerks who had to cross works yards.

Hessa saw them before she saw his face.

“No,” she said.

He stopped.

“I haven’t told you why I’m here.”

“You’ll have a paper.”

He looked down at his coat.

That was enough.

“I’ve filled them in,” Hessa said. “Both of them. The woman said the second would do if I couldn’t get the first signed.”

“I’m not from the compensation office.”

“Then which one?”

He glanced at the traveler.

“May we close the door?”

“No.”

The young man nodded quickly.

“All right.”

He took a folded sheet from inside his coat and held it out.

Hessa did not take it.

“My name is Esser,” he said. “I recorded an examination at the lower works.”

She looked at the sheet.

“Whose?”

“Your husband’s.”

The axe outside struck wood.

Hessa’s hand tightened around the box lid.

“When?”

“After the collapse.”

“How long after?”

“They brought him into the infirmary that morning.”

She stood so abruptly that the wooden bird fell from the table.

The traveler caught it before she stepped on it.

“Where is he?”

“I don’t know where he is now.”

Hessa walked past him into the doorway.

There was no cart outside. No one waiting beyond the fence. Only two children carrying kindling, and a woman at the woodpile with her back to the road.

She looked behind the shelter.

Then she came back.

“You shouldn’t have come without knowing.”

“I know.”

“No. You don’t.”

Esser lowered the paper.

She took it from him.

It was not the official report.

The handwriting was cramped, with words inserted above the lines. The form allowed one line for the subject’s account. Esser had written his out in full.

Hessa read standing up.

Halfway down the page, she sat.

SUBJECT: Tell her I am alive.

JUSTICIAR R.: Sign the statement, and I can recommend that she be informed.

She moved her finger beneath the next exchange.

SUBJECT: Put his name in. Then tell her where I am.

“Whose name?”

“Your father’s.”

Hessa looked up.

“He heard him?”

“Yes.”

“Did they find him?”

“I don’t know.”

“You were there.”

“In the examination room. Not at the house.”

She read further.

When she reached the words personal effects, she went back to the beginning of the paragraph.

Then she read it again.

“They wanted him to say that?”

“Yes.”

“And he wouldn’t?”

“No.”

She put the paper flat against the table.

One corner kept lifting. She set the little box on it.

Esser waited.

“There was a message,” he said.

Her eyes closed.

“He asked for paper. I told him I couldn’t attach a personal message to the examination.”

“Why not?”

“Because I was afraid.”

She opened her eyes.

He made himself continue.

“He said it was only four words.”

Hessa did not move.

“I heard you, Hess.”

Her mouth opened slightly.

Esser looked at the floor.

“I should have come sooner.”

“Yes,” she said.

They let him sit only after he had told them everything he remembered.

The infirmary. The bandages. The restraints.

The door beneath the house.

At that, Hessa interrupted.

“There weren’t any steps.”

“That is what he told them.”

“We had no cellar.”

“He told them that too.”

She looked toward the traveler, as though one of them must have misunderstood a simple fact.

Esser described the engineer entering the room. The questions about the latch, the paint, the direction the door might open.

“The Justiciar had questions written for him?”

“Yes.”

“Before Matthis described it?”

“Some. Not all.”

Hessa touched the edge of the portrait.

For a moment, the room was very quiet.

Then she withdrew her hand.

“The door can wait.”

Esser nodded.

“Where did they take my husband?”

“There was an escort from the assessment office. I copied the docket number.”

“Can you follow it?”

“Not through my office. They will know which record I opened.”

The traveler spoke.

“Would it appear anywhere else?”

“At the gate,” Esser said. “The wagons are logged in and out.”

“Who keeps that book?”

“A gatekeeper. A different one on each watch.”

Hessa pulled the paper toward her.

“Write the number.”

Esser wrote it twice: once on his copy, and once on a scrap for the traveler.

It was nearly dark when Esser left.

He had offered to go to the gate himself.

Hessa had refused.

“They’ve seen your face at a desk,” she told him. “They’ll wonder why you’re asking about a wagon.”

The traveler would go instead.

Not to demand a prisoner.

To ask about transport.

A docket number, a gate entry, a road. Enough to begin.

Hessa stayed at the table after the door closed.

She took the nineteen sovereigns from the box and counted them.

Then she separated six.

The traveler pushed them back.

“We don’t know what we’ll need yet.”

“Neither do I. Take them.”

She wrapped the remaining coins.

The earrings went beside her bed. The mitten and ribbon returned to the box.

But the portrait she placed upright against a cup.

“Would you turn it a little?”

The traveler adjusted it.

“More.”

From where Hessa sat, she could now see her mother without lifting her head.

She took Wendel’s letter and unfolded the part about the handcart.

Her father had asked her to leave him if she had to.

Matthis had refused to say he had gone back for belongings.

She sat with both papers before her, trying not to make a promise to either of them that she could not keep.

At last, she turned over Esser’s copy and wrote in the empty space:

Matthis Kessler.

Alive when taken from the lower works.

Find the gate book.

Then she added the docket number beneath it.

For the first time since the collapse, there was somewhere to go.`
    },
    {
      id: 'book_gate_book', title: 'The Gate Book', part: 2, price: 1,
      preface: 'The day after the collapse, a wagon left the lower works under escort. The traveler takes the docket number to the works gate.',
      // [PROPOSED] Original continuation. The docket number itself stays unspecified.
      text: `The gatekeeper had put his supper on the book.

He moved the bowl when the traveler asked about a wagon, but left the spoon across the page.

“Which wagon?”

The traveler showed him the number on a separate scrap. Esser’s copy was still at the shelter.

“From the lower works.”

“When?”

“The day after the collapse.”

The gatekeeper looked at the number again.

“You’ll want the other book.”

He finished what was in his spoon, and waited out a hammer-fall, before he stood.

The other book was on a low shelf behind his chair. Its cover had split at the hinge. He lifted it with both hands and set it down clear of the bowl.

“Goods lost in transit go through the carrier. We only write what passes.”

“I want to know where it went.”

“That’s what I mean.”

He found the day by a strip of cloth caught between the leaves. There were more entries than the traveler had expected. Coal. Empty wagons. A water cart admitted twice. A line drawn through a team that had not arrived.

The gatekeeper ran his finger down a column and stopped.

“There.”

The number matched.

Beside it was written: EQUIPMENT RETURNED FOR ASSESSMENT.

“No passengers?” the traveler asked.

“Not in that column.”

“Is there another?”

The gatekeeper turned the book a little. There was a narrow space at the edge of the page, ruled after the rest in a different ink.

“One attendant. Two escort.”

“And someone injured?”

The finger left the paper.

“What are you looking for?”

“A man they took from the infirmary.”

“You said transport.”

“It was transport.”

Outside, a driver called for the gate to be opened. The keeper went to the window. He asked the driver’s name, repeated it, and wrote it in the current book before touching the latch.

The traveler waited.

When the keeper came back, he did not sit.

“I did not look inside that wagon.”

“All right.”

“I was on the morning watch. This is the afternoon hand.”

“Who was here?”

He looked at the window.

“What does the road column say?” the traveler asked instead.

The keeper bent over the book.

“Rim road. Lower weighing house.”

“Is that an assessment office?”

“It weighs wagons.”

“After that?”

“After that isn’t my gate.”

The traveler copied the entry. At the foot of the page, someone had added a time and the words HOLD FOR REWEIGH. The keeper said that meant the weight on the docket had not agreed with the wagon.

“Does that happen often?”

“With coal. When it’s wet.”

“There was no coal on this one.”

“No.”

He closed the book before the traveler could ask anything else.

At the door, the traveler offered him a sovereign for the trouble.

He drew his hand away.

“Don’t,” he said. “I’ve only let you read it.”

The coin went back with the other five.

The lower weighing house was a mile beyond the last cottages. The traveler reached it after the lamps had been lit. A cart stood on the platform with one wheel missing, propped on cut timber. Beside it, a woman was washing black grease from her hands in a bucket.

“No loads till morning.”

“I’m asking after one that’s gone.”

“So is everyone.”

She took a rag from the cart and listened to the number.

“I don’t keep dockets.”

“The gate sent it here. Equipment for assessment.”

“That one.”

She stopped drying her hands.

“What was on it?”

“I didn’t see the load.”

“Did you see a man?”

She looked toward the house, where a lamp burned behind a blind.

“There was someone in the back. He asked us to move the wheel.”

“Which wheel?”

“The spare. It had been laid against the board by his legs. Every rut brought it onto him.”

“Did you move it?”

“Yes.”

She folded the rag once, then opened it again.

“One of the escort said he’d manage. I told him I needed it off to weigh the wagon empty. I didn’t. We don’t weigh them empty here.”

“Was his arm bandaged?”

“Both hands. One worse. He kept the bad one under the other.”

The traveler took out the scrap, though there was nothing on it that could help.

“Did he give a name?”

“Not to me.”

“Where did they go?”

“They changed teams. The next driver took the north turning.”

“Do you know him?”

“I know his mare. Grey, with a white patch under the collar. He carries washing to the old survey house.”

She saw the traveler’s face.

“That doesn’t mean he went there.”

“No.”

“People hear a place and set off. Then they come back angry with you.”

“I won’t tell her it’s certain.”

The woman put the rag on the cart.

“Who?”

“His wife.”

For a while she watched the water settle in the bucket.

“He asked what day it was,” she said. “I told him. He said he’d lost a morning.”

The traveler waited for more.

“That was all.”

Hessa was still awake.

She listened without reaching for either paper. When the traveler put all six coins on the table, she moved them aside to make room for the copied entry.

“Equipment,” she said.

“That was how the load was entered.”

“And the woman saw him?”

“She saw a man with bandaged hands. He was speaking.”

“But no name.”

“No name.”

Hessa read the north turning aloud, then the old survey house. She fetched the stub of pencil from beside the bed.

Under the docket number, she wrote: A man with bandaged hands. Lower weighing house. Speaking.

Then: Ask the washing driver.

She held the pencil above the page.

“Not found,” she said.

“Not yet.”

She put the pencil down.

In the doorway stood the woman who had been splitting wood. She had brought two pieces too knotted for the shelter’s little stove, and had stayed to hear about the wagon.

“I know that turning,” she said. “I used to fetch my sister’s washing from there.”

Hessa looked up.

“How far?”

“Far enough you should eat before you go.”

She went to fetch a pot. Hessa pulled a second chair to the table.

When she sat again, she turned the portrait slightly so there would be room for the bowls.`
    }
  ];

  const byId = id => volumes.find(v => v.id === id);
  const escape = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const html = v => '<p><i>Printed on Broadsheet Row, Port Cantabile · installment ' + v.part + ' of 2. A tale of the Caldera; the names are changed.</i></p>'
    + (v.preface ? '<p><i>' + escape(v.preface) + '</i></p>' : '') + v.text.split('\n\n').map(p => '<p>' + escape(p) + '</p>').join('');

  for (const v of volumes) {
    ITEMS[v.id] = { name: v.title, sprite: 'broadsheet', use: 'moor_book', value: v.price,
      desc: 'A Cantabile broadsheet serial, installment ' + v.part + ' of 2: a tale of the Caldera, stitched into a pamphlet. Read from your inventory; reading does not consume it.' };
    READING.SOURCES[v.title] = { style: 'paper', kind: 'Broadsheet serial · ' + v.part + ' of 2' };
  }

  // The Cantor's shelf is only there while Lyra keeps her house: the Rite seals it (game.js, 'lyra_taken_seen').
  const shelfOpen = () => !(typeof G !== 'undefined' && G.flags && G.flags.rite_started);
  NPCS.moor_bookseller = {
    name: 'Bastien Corvo, pedlar of Cantabile broadsheets', sprite: 'townsman', portrait: 'townsman', tier: 'low',
    greet: {
      get polite() { return 'Dry pages, if you would like something to read. A Cantabile serial in two parts, a tale out of the Caldera. A sovereign a part' + (shelfOpen() ? ', or read the Cantor’s lending copies for nothing.' : '.'); },
      normal: 'Two parts, stitched, up the river from Broadsheet Row. Hetty keeps a paid-for bundle by the east table if coin is short.',
      blunt: 'Paper tears more easily than people think. So do manners. A sovereign a part, and keep it inside your coat.'
    },
    topics: {
      get Oakhaven() { return (shelfOpen() ? 'The Cantor keeps lending copies on a shelf at her house. You can read both parts there without buying them. ' : 'The Cantor’s copies went with her house, I hear. ') + 'The bundle here was paid for by a carter: one of each for whoever wants to take them home.'; },
      'Broadsheet Row': 'Four papers on the Row, all libellous, one occasionally correct. This is none of the four. It is a tale, the names are changed, and that is the only reason it came up the river past Stillwater. The lockkeeper there reads everything I carry, and sells what he reads.'
    },
    shop: volumes.map(v => ({ item: v.id, price: v.price })),
    shopTalk: { hello: 'The Things Taken Home first; The Gate Book follows it. Tales, not news. Nobody in them lives in the Reach.',
      broke: 'Keep your supper money. Try the paid-for bundle by the east table.',
      thanks: ['Keep it out of the rain.', 'The stitching will hold if you do not pull it flat.'], buys: ['consumable'] }
  };

  // A folded broadsheet, masthead and columns: its own look, so it is never mistaken for Tobin's pages on the floor.
  function paintBroadsheet() {
    if (typeof Engine !== 'undefined' && Engine.addSprite && !(Engine.sprites && Engine.sprites.broadsheet)) {
      const w = 24, h = 24, d = new Uint32Array(w * h);
      const px = (x, y, r, g, b) => { d[y * w + x] = (255 << 24) | (b << 16) | (g << 8) | r; };
      for (let y = 8; y < 21; y++) for (let x = 3; x < 21; x++) {
        const edge = y === 8 || y === 20 || x === 3 || x === 20, fold = x === 12;
        const t = 214 - (y - 8) * 2 - (x > 12 ? 10 : 0);
        px(x, y, edge ? 140 : fold ? t - 40 : t, edge ? 132 : fold ? t - 42 : t - 6, edge ? 112 : fold ? t - 50 : t - 22);
      }
      for (let x = 5; x < 19; x++) if (x !== 12) px(x, 10, 40, 36, 32);                      // the masthead
      for (let y = 12; y < 19; y += 2) for (const [a, b] of [[5, 11], [13, 19]]) for (let x = a; x < b - ((y >> 1) % 3 === 0 ? 2 : 0); x++) px(x, y, 92, 86, 76);
      Engine.addSprite('broadsheet', { w, h, data: d, hs: 1, cx: 0.5, dy: 0 });
    }
    if (typeof ICONS !== 'undefined' && ICONS.PIX && ICONS.C_PX) {
      const icon = d => {
        d.layer(ICONS.C_PX.paper).poly([3, 5, 21, 5, 21, 20, 3, 20]);
        const ink = d.layer('#2a2620', { shade: 'flat', sep: false }); ink.rect(5, 7, 14, 2);
        const col = d.layer('#5c564c', { shade: 'flat', sep: false });
        for (let y = 11; y < 19; y += 2) { col.rect(5, y, 6, 1); col.rect(13, y, 6 - (y % 4 === 1 ? 2 : 0), 1); }
        d.layer('#8a8070', { shade: 'flat', sep: false }).rect(12, 10, 1, 9);
      };
      for (const v of volumes) if (!ICONS.PIX[v.id]) ICONS.PIX[v.id] = icon;
    }
  }
  paintBroadsheet();

  function read(id) {
    const v = byId(id);
    if (!v) return false;
    closeModal();
    G.flags['moor_read:' + v.id] = true;
    showEvent(v.title, html(v), [{ t: 'Close the pamphlet.', f: null }]);
    return true;
  }

  function collect(id) {
    const v = byId(id);
    if (!v || G.mapId !== 'tavern' || G.flags['moor_taken:' + v.id] === true) return false;
    G.flags['moor_taken:' + v.id] = true;
    G.give(v.id);
    msg('You take the donated copy of ' + v.title + '.', 'good', 3500);
    return true;
  }

  function collection(takeHome) {
    const choices = volumes.map(v => ({ t: 'Read ' + v.part + '. ' + v.title, f: () => read(v.id) }));
    if (takeHome) for (const v of volumes) {
      if (G.flags['moor_taken:' + v.id] !== true) choices.push({ t: 'Take a donated copy: ' + v.title, f: () => collect(v.id) });
    }
    choices.push({ t: 'Leave the books.', f: null });
    showEvent(takeHome ? 'The donated pamphlets' : 'The Cantor’s shelf', takeHome
      ? 'Two stitched installments of the Cantabile serial lie in a dry wrapper beside the east table. A note in Hetty’s square capitals: <i>PAID FOR. TAKE ONE OF EACH. LEAVE THE CANTOR HER COPIES.</i>'
      : 'A small shelf in Lyra’s house holds the copies the Cantor lends, kept apart from her own papers. Both parts of the Cantabile serial have cloth bookmarks. These copies stay here; you may read them without charge.', choices);
  }

  // Runtime additions only: append after load, never insert into saved base-entity indexes.
  function place(map, id) {
    if (!map || !Array.isArray(map.entities)) return;
    const add = e => { if (!map.entities.some(x => x.moorPlacement === e.moorPlacement)) map.add(hydrate(Object.assign({ transient: true, _decor: true }, e))); };
    if (id === 'tavern') {
      // the wharf's river coat (flume16.js) when it has been made, so he is not the patron at the next table twice over
      const coat = typeof Engine !== 'undefined' && Engine.sprites && Engine.sprites.p16f_cutter ? 'p16f_cutter' : 'townsman';
      add({ kind: 'npc', id: 'moor_bookseller', sprite: coat, x: 14, y: 3.5, scale: 1, solid: true, radius: 0.35, facing: Math.PI, moorPlacement: 'seller' });
      add({ kind: 'deco', sprite: 'broadsheet', x: 11.5, y: 5.2, scale: 0.35, solid: false, use: 'moor_donations', label: 'Donated broadsheet pamphlets — read or take home', moorPlacement: 'donations' });
    }
    if (id === 'lyra_house' && shelfOpen()) add({ kind: 'deco', sprite: 'shelf', x: 1.5, y: 1.5, scale: 0.85, solid: true, radius: 0.25, use: 'moor_library', label: 'The Cantor’s lending shelf — read here', moorPlacement: 'library' });
    if (id === 'lyra_house' && !shelfOpen()) for (let i = map.entities.length - 1; i >= 0; i--) if (map.entities[i].moorPlacement === 'library') map.entities.splice(i, 1);
  }

  const load = loadMap;
  loadMap = function (id) { const r = load.apply(this, arguments); place(G.maps[id], id); return r; };
  const use = useDeco;
  useDeco = function (e) {
    if (e && e.use === 'moor_donations') { collection(true); return; }
    if (e && e.use === 'moor_library') { collection(false); return; }
    return use.apply(this, arguments);
  };
  const item = useItem;
  useItem = function (slot) {
    if (slot && byId(slot.id)) { if (G.has(slot.id)) read(slot.id); return; }
    return item.apply(this, arguments);
  };

  return { volumes, read, collect, collection, place };
})();
