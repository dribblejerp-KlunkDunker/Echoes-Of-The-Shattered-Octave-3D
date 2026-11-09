# Game — Phase 21 New In-Game Text (for review)

Phase 21 "Wow" is the graphics pass:
- a true 3D renderer with free look up and down
- lighting, sky, shadows and water
- the player's own hands, arms, legs and boots matching the gear
- a detailed character card and photo mode
- close-up ground detail

Almost everything is visual. No dialogue or story text was added. Below are (1) the invented details for you to rule on, and (2) every new line a player can read. French for all of it is in tools/i18n/p21-*.tsv.

## 1. [PROPOSED] details, with a recommendation

1. **"The Chord": a faint band of star-dust across the night sky** (js/light21.js). The name appears only in code comments; no player sees it. *Recommend: keep the band. Rename it if the bibles have a better name for the Milky Way of Aethelgard, or remove it (one line).*
2. **Sun and moon on real arcs.** The sun rises in the east, stands about 66° up at noon and sets in the west. The moon rises at dusk, is highest at midnight and shows the calendar's phase. *Recommend: keep. It only changes where they are drawn.*
3. **The Octave lights (aurora) reach straight overhead** on the nights the game already picks for them. *Keep.*
4. **The Synod Kite Shield's "dead queen".** The data only says "painted with the Synod's dead queen". It is now drawn as a crowned ivory head in profile on an oxblood field, in a bevelled brass rim. The same picture is used on the inventory icon, the character card, the co-op figure and the shield in your hand. *Recommend: keep.*
5. **Other gear looks.** Where the data gives no look, the teams chose one:
   - Corsair Buckler: iron rim and boss, with a red painted band.
   - Carillon Bell-Helm: a bell dome with a verdigris lip; the sight-slit is painted on the helm, and no face shows through it from any angle.
   - Consortium Brigandine: brass rivets.
   - Vesper's Boarding Axe: a red-wrapped haft.
   - Throwing Knives: held as a fan of three.

   *Recommend: keep all.*
6. **The glass arm.** The Dissonant Blade's left arm is Aether-Glass in every first-person view where the left hand shows. On the card it climbs with the glassing: hand first, then the forearm from 15%, then the whole arm from 40%. That follows the bible ("glassing follows pain and climbs"); the thresholds are invented. *Keep.*
7. **Bare-armed travellers** wear a shirt in the calling's coat colour with the sleeves rolled. *Keep.*
8. **Default headwear on the card follows the portraits:** faces 1 and 4 hooded, face 3 in a captain's cap. *Keep.*
9. **The card's backdrop:** a dark niche tinted by the calling's cloak, with a worn stone plinth. *Keep.*
10. **Close-up ground detail.** The game's own floor and wall textures are redrawn at 4× detail for close range: cobbles with mortar and moss, plank grain and nails, grass blades, pebbles, flagstone chips. Sparse grass tufts, pebbles and fallen leaves grow near the player. *Keep.*

## 2. New text a player reads

### Options → Graphics & access
| Row | Hint | Choices |
|---|---|---|
| 3D renderer | True 3D (WebGL2): look up and down freely; Classic: the original raycaster | Auto: True 3D / Auto: Classic / True 3D / Classic / Not available |
| Look range | how far up and down the free look turns (Comfort: 45 degrees) | Comfort (45°) / Full (80°) |
| Player body | your gear on your arms and hands, the shield on your arm, legs and boots | On / Off |
| Feet when looking down | legs, boots and the hem of your armour | On / Off |
| Light on the body | arms and boots take the light where you stand | On / Off |
| Character card | the figure in the inventory and Character panel: detailed pixel art built from your gear, or the simple painted doll | Detailed / Simple |
| Close-up detail | (pixel-art detail on the ground and walls near you) | On / Off |

Notes on the 3D renderer row:
- "WebGL2 is not available on this device"
- "the Original preset always uses the classic raycaster"

### Notices
- "Graphics eased to the classic renderer to keep the game smooth — Options to change"
- "Screenshot saved ({w} x {h})." · "The screenshot could not be taken." · "The screenshot could not be saved."

### Character card
- Turn buttons (screen-reader labels): "Turn the figure left", "Turn the figure right".
- The eight view names: Front, Front right, Right side, Back right, Back, Back left, Left side, Front left.

### Photo mode
- Buttons: "Save screenshot" ("A PNG at your screen's full resolution, with the filter, tilt and depth of field you chose"), "Free camera: On/Off", "Filter: …", "Vignette: On/Off", "Depth of field: On/Off".
- Help line: "Free camera · W A S D fly · R F up and down · arrows or drag look · Q E tilt · P saves a screenshot · Esc leaves".
- Filters, from the lighting:
  - This place, this hour
  - Oakhaven amber · Whisper-Grove teal · Deep Woods violet · Crypt · Candlelit · Town · Meadow · Grove · Woods · Candle
  - Cinematic · Warm dusk · Cold night · Sepia · Black and white · Faded print
- If the lighting is off, photo mode falls back to its own filters: None, Warm dusk, Frost, Vivid, Old print, Noir, Hush.
