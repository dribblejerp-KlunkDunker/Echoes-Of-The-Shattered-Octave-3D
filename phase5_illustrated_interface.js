/* ============================================================================
 * Echoes of the Shattered Octave — PHASE 5: ILLUSTRATED INTERFACE
 * Scope: Graphics — menus and screens (10 items)
 * ============================================================================ */
(function () {
  'use strict';

  const VALID_PORTRAIT_EMOTIONS = new Set(['neutral', 'angry', 'sad', 'afraid', 'wry']);
  const AUTOMAP_STAMPS = Object.freeze({
    door:        { id: 'door',        glyph: '∏', inkHex: '#d8b66c', label: 'Doorway' },
    quest_giver: { id: 'quest_giver', glyph: '!', inkHex: '#7be098', label: 'Quest Giver' },
    shop:        { id: 'shop',        glyph: '⚖', inkHex: '#e8c456', label: 'Merchant Stall' },
    danger:      { id: 'danger',      glyph: '☠', inkHex: '#e06055', label: 'Hazard / Boss' },
    recess:      { id: 'recess',      glyph: '▨', inkHex: '#94a8b8', label: 'Shrouded Recess' },
    puzzle:      { id: 'puzzle',      glyph: '◈', inkHex: '#8cf0e8', label: 'Harmonic Mechanism' }
  });

  const DEATH_CAUSE_ILLUSTRATIONS = Object.freeze({
    unwritten_by_hush:       { id: 'unwritten_by_hush',       title: 'Unwritten in the Hush',         palette: ['#222430', '#6a7288', '#d0d4e0'] },
    shattered_by_cacophony:  { id: 'shattered_by_cacophony',  title: 'Torn by the Cacophony',         palette: ['#2e1418', '#b83230', '#f2a878'] },
    drowned_in_whisper_grove:{ id: 'drowned_in_whisper_grove',title: 'Claimed by Drowned Marble',     palette: ['#10242c', '#2e6878', '#98d8d0'] },
    claimed_by_synod:        { id: 'claimed_by_synod',        title: 'Catalogued by the Synod',       palette: ['#241e28', '#8a7248', '#e6d2a2'] },
    fell_in_battle:          { id: 'fell_in_battle',          title: 'Silenced Along the Narrow',     palette: ['#241a18', '#785240', '#d8c4b0'] }
  });

  const ENDING_ILLUSTRATIONS = Object.freeze({
    ledger_restored:     { id: 'ledger_restored',     title: 'The Names Remembered',              aspect: '16:9', chaptersReflected: 4 },
    synod_concord:       { id: 'synod_concord',       title: 'The Measured Accord of Oakhaven',   aspect: '16:9', chaptersReflected: 4 },
    free_captains_sails: { id: 'free_captains_sails', title: 'Sails Toward the Rust Coast',       aspect: '16:9', chaptersReflected: 4 },
    silent_coda:         { id: 'silent_coda',         title: 'Coda of the Unrung Bell',           aspect: '16:9', chaptersReflected: 4 }
  });

  const iconCache = new Map();
  const portraitCache = new Map();

  function getCarvedWoodFrameStyle(highContrast) {
    if (highContrast) {
      return {
        borderCss: '2px solid #ffffff',
        backgroundCss: '#000000',
        brassCorners: false
      };
    }
    return {
      borderCss: '3px ridge #6e4e2e',
      boxShadowCss: 'inset 0 0 0 2px #b99856, 0 8px 24px rgba(0,0,0,0.85)',
      backgroundCss: 'linear-gradient(180deg, #1d1714 0%, #14100e 100%)',
      brassCorners: true,
      cornerOrnaments: ['tl_brass_leaf', 'tr_brass_leaf', 'bl_brass_leaf', 'br_brass_leaf']
    };
  }

  function composePaperDollLayers(G) {
    const p = (G && G.player) || {};
    const eq = p.equipment || p.equipped || {};
    const slots = ['head', 'body', 'hands', 'legs', 'feet'];
    const layers = [{ layerId: 'base_character_sheet', zIndex: 0 }];

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const item = eq[slot];
      const itemId = typeof item === 'string' ? item : (item && item.id);
      if (itemId) {
        layers.push({
          slot: slot,
          itemId: String(itemId).replace(/[^a-z0-9_-]/gi, ''),
          spriteSheet: `paperdoll_${slot}_${String(itemId).replace(/[^a-z0-9_-]/gi, '')}`,
          zIndex: i + 1,
          canRemove: true
        });
      }
    }

    const weapon = eq.weapon || p.weapon || 'iron_sword';
    const weaponId = String(typeof weapon === 'string' ? weapon : (weapon.id || 'iron_sword')).replace(/[^a-z0-9_-]/gi, '');
    const isTwoHanded = Boolean(
      weaponId === 'choir_staff' ||
      weaponId.includes('maul') ||
      weaponId.includes('crossbow') ||
      weaponId.includes('spear') ||
      (weapon && weapon.twoHanded)
    );

    layers.push({
      slot: 'weapon',
      itemId: weaponId,
      spriteSheet: `paperdoll_weapon_${weaponId}`,
      twoHanded: isTwoHanded,
      zIndex: 10
    });

    const shield = eq.offhand || eq.shield;
    const shieldId = typeof shield === 'string' ? shield : (shield && shield.id);
    const shieldSuppressed = Boolean(isTwoHanded && shieldId);
    if (shieldId && !isTwoHanded) {
      layers.push({
        slot: 'shield',
        itemId: String(shieldId).replace(/[^a-z0-9_-]/gi, ''),
        spriteSheet: `paperdoll_shield_${String(shieldId).replace(/[^a-z0-9_-]/gi, '')}`,
        zIndex: 9
      });
    }

    return {
      layers: layers,
      twoHandedShieldSuppressed: shieldSuppressed,
      equipControlsPreserved: true
    };
  }

  function getOrBuildPaintedItemIcon(itemId, category) {
    const cleanId = String(itemId || 'unknown_item').toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const cat = String(category || 'item').toLowerCase();
    const key = `${cat}:${cleanId}`;
    if (iconCache.has(key)) return iconCache.get(key);

    const pixels = new Uint8Array(24 * 24 * 4);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 160;
      pixels[i + 1] = 135;
      pixels[i + 2] = 85;
      pixels[i + 3] = 255;
    }
    const icon = { itemId: cleanId, category: cat, width: 24, height: 24, pixels: pixels };
    iconCache.set(key, icon);
    return icon;
  }

  function getNpcPortraitSheet(npcId, emotion) {
    const id = String(npcId || 'kaelen').toLowerCase();
    const emo = VALID_PORTRAIT_EMOTIONS.has(String(emotion || '').toLowerCase())
      ? String(emotion).toLowerCase()
      : 'neutral';
    const key = `${id}:${emo}`;
    if (portraitCache.has(key)) return portraitCache.get(key);

    const sheet = {
      npcId: id,
      emotion: emo,
      portraitKey: `portrait_${id}_${emo}`,
      width: 64,
      height: 64
    };
    portraitCache.set(key, sheet);
    return sheet;
  }

  function getQuestLogSketch(questId) {
    const q = String(questId || 'the_rite').toLowerCase();
    return {
      questId: q,
      sketchKey: `logbook_sketch_${q}`,
      style: 'charcoal_sepia_ink'
    };
  }

  function getAreaLoadingIllustration(mapId) {
    const m = String(mapId || 'oakhaven').toLowerCase();
    return {
      mapId: m,
      illustrationKey: `loading_painted_${m}`,
      caption: `Entering ${m.replace(/_/g, ' ')}...`
    };
  }

  function getCauseSpecificDeathScreen(cause) {
    const key = String(cause || 'fell_in_battle').toLowerCase();
    return DEATH_CAUSE_ILLUSTRATIONS[key] || DEATH_CAUSE_ILLUSTRATIONS.fell_in_battle;
  }

  function getEndingIllustration(endingId) {
    const key = String(endingId || 'ledger_restored').toLowerCase();
    return ENDING_ILLUSTRATIONS[key] || ENDING_ILLUSTRATIONS.ledger_restored;
  }

  function getTypographyConfig(options) {
    const opts = options || {};
    const large = Boolean(opts.largeText);
    return {
      headingFontFamily: "'OctaveBlackletter', 'UnifrakturMaguntia', Georgia, serif",
      headingLicense: 'SIL Open Font License 1.1 (Locally Bundled)',
      bodyFontFamily: "'OctaveReadableSerif', Georgia, system-ui, sans-serif",
      baseFontSizePx: large ? 20 : 16,
      lineHeight: large ? 1.65 : 1.45
    };
  }

  function getAutomapStamp(stampType) {
    const key = String(stampType || 'door').toLowerCase();
    return AUTOMAP_STAMPS[key] || AUTOMAP_STAMPS.door;
  }

  if (typeof window !== 'undefined') {
    window.OctaveIllustratedInterface = {
      getCarvedWoodFrameStyle,
      composePaperDollLayers,
      getOrBuildPaintedItemIcon,
      getNpcPortraitSheet,
      getQuestLogSketch,
      getAreaLoadingIllustration,
      getCauseSpecificDeathScreen,
      getEndingIllustration,
      getTypographyConfig,
      getAutomapStamp
    };
  }
})();
