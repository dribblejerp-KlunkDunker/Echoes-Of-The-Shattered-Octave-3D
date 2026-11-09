/* ============================================================================
 * Echoes of the Shattered Octave — PHASE 6: STORY REACTIVITY
 * Scope: Story and world-building (8 items)
 * ============================================================================ */
(function () {
  'use strict';

  const TOTAL_TOBIN_JOURNAL_PAGES = 8;

  const FUTURE_REGION_TEASERS = Object.freeze({
    organum: {
      region: 'Organum',
      title: 'The Brass Pipes of High Organum',
      teaserText: 'Beyond the Reach stand the cathedral-foundries of Organum, where entire valleys are tuned by steam-bellows.'
    },
    iron_peaks: {
      region: 'The Iron Peaks',
      title: 'Miners of the Unstruck Ore',
      teaserText: 'In the Iron Peaks, bell-founders quarry lodestone that hums against the Synod scale.'
    },
    the_rift: {
      region: 'The Rift',
      title: 'Where the Eighth Interval Broke',
      teaserText: 'South of the glass-veins lies the Rift, where the Shattered Octave still bleeds raw silence.'
    }
  });

  function resolveTavernRumours(G) {
    const flags = (G && G.flags) || {};
    const p = (G && G.player) || {};
    const rumours = [];

    if ((p.bounty || 0) >= 40) {
      rumours.push('The Watch has nailed your likeness to the square post—keep your hood low near the constables.');
    }
    if (flags['boss_defeated:deacon'] || flags['deacon_spared']) {
      rumours.push('Folk whisper the Unrung Bell in the Cloister fell silent without claiming its tithe.');
    }
    if (flags['ledger_hollows_restored'] > 0) {
      rumours.push('Some of the Hollows along the marsh spoke their own Christian names before dawn.');
    }
    if (!rumours.length) {
      rumours.push('The Proctors are measuring cellar casks and voices alike before the Rite.');
    }
    return rumours;
  }

  function generateSynodBroadsheet(G) {
    const flags = (G && G.flags) || {};
    const rep = (G && G.reputation) || {};
    const synodStanding = Number(rep.synod || 0);
    const bounty = Number((G && G.player && G.player.bounty) || 0);

    let spin = 'neutral_orthodoxy';
    let headline = 'THE SYNOD GAZETTE: HARMONY MAINTAINED IN THE REACH';
    if (bounty >= 40 || synodStanding < -20) {
      spin = 'alarmist_condemnation';
      headline = 'THE SYNOD GAZETTE: DISSONANT AGITATOR SOUGHT BY PROCTORS';
    } else if (synodStanding >= 25 || flags['sided_with_synod']) {
      spin = 'orthodox_praise';
      headline = 'THE SYNOD GAZETTE: FAITHFUL AUXILIARY UPHOLDS THE CANON';
    } else if (flags['boss_defeated:deacon']) {
      spin = 'censored_propaganda';
      headline = 'THE SYNOD GAZETTE: CLOISTER BELFRY CLOSED FOR ACOUSTIC REPAIRS';
    }

    return {
      spin: spin,
      headline: headline,
      issueNumber: 418
    };
  }

  function checkAndDeliverCourierLetters(G) {
    if (!G || !G.player) return [];
    G.flags = G.flags || {};
    const delivered = [];

    const candidates = [
      {
        triggerFlag: 'helped_sable_ledger',
        deliveredFlag: 'courier_delivered:sable_thanks',
        sender: 'Sable, Archivist of the Veil',
        subject: 'A Name Preserved in the Margin',
        rewardGold: 15
      },
      {
        triggerFlag: 'helped_cantor_root_note',
        deliveredFlag: 'courier_delivered:cantor_tuning',
        sender: 'Cantor Thorne',
        subject: 'The 174 Hz Tuning-Leaf',
        rewardGold: 12
      }
    ];

    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      if (G.flags[c.triggerFlag] && !G.flags[c.deliveredFlag]) {
        G.flags[c.deliveredFlag] = true;
        G.player.gold = Number(G.player.gold || 0) + c.rewardGold;
        delivered.push(c);
      }
    }
    return delivered;
  }

  function triggerRestDreamScene(G, actNumber) {
    if (!G) return null;
    G.flags = G.flags || {};
    const act = Math.max(1, Math.min(4, Number(actNumber) || 1));
    const key = `dream_seen:act_${act}`;
    if (G.flags[key]) return { alreadySeen: true, act: act };

    G.flags[key] = true;
    const visions = {
      1: 'You dream of eight bronze bells hanging above a glass sea; the seventh cracks without a sound.',
      2: 'Through drowned marble arches, a man with a tuning-fork writes "417" upon the water.',
      3: 'The Hush rises like snow over Oakhaven, erasing signboards letter by letter.',
      4: 'Two voices—one of resonant glass, one of living breath—hold the Narrow open against the dark.'
    };
    return {
      alreadySeen: false,
      act: act,
      visionText: visions[act]
    };
  }

  function triggerLightGlassMemoryEcho(G, echoId) {
    if (!G) return null;
    G.flags = G.flags || {};
    const id = String(echoId || 'tobin_hedge_417');
    G.flags[`memory_echo:${id}`] = true;
    return {
      echoId: id,
      title: 'Light-Glass Memory Echo',
      transcript: 'A green-gold afterimage shimmers in the glass: "If the Synod seals the Root-vault, strike the third interval..."'
    };
  }

  function collectTobinJournalPage(G, pageNumber) {
    if (!G) return { ok: false };
    G.flags = G.flags || {};
    const num = Math.max(1, Math.min(TOTAL_TOBIN_JOURNAL_PAGES, Math.floor(Number(pageNumber) || 1)));
    G.flags[`tobin_page:${num}`] = true;
    return getTobinJournalProgress(G);
  }

  function getTobinJournalProgress(G) {
    const flags = (G && G.flags) || {};
    const collected = [];
    for (let i = 1; i <= TOTAL_TOBIN_JOURNAL_PAGES; i++) {
      if (flags[`tobin_page:${i}`]) collected.push(i);
    }
    return {
      ok: true,
      collectedCount: collected.length,
      totalCount: TOTAL_TOBIN_JOURNAL_PAGES,
      completed: collected.length === TOTAL_TOBIN_JOURNAL_PAGES,
      pages: collected
    };
  }

  function resolveCompanionEndings(G) {
    const flags = (G && G.flags) || {};
    const approval = (G && G.companionApproval) || {};
    const kaelenScore = Number(approval.kaelen ?? 50);
    const lyraScore = Number(approval.lyra ?? 50);

    const kaelenEnding = flags['kaelen_tideline_eased']
      ? (kaelenScore >= 50 ? 'kaelen_tempered_guardian' : 'kaelen_wandering_warden')
      : 'kaelen_hardened_glass_blade';

    const lyraEnding = flags['lyra_calling_song_reconciled']
      ? (lyraScore >= 50 ? 'lyra_keeper_of_the_new_choir' : 'lyra_chronicler_of_417')
      : 'lyra_solitary_voice_in_the_narrow';

    return {
      kaelenEnding: kaelenEnding,
      lyraEnding: lyraEnding
    };
  }

  function getFutureRegionLoreTeasers() {
    return Object.assign({}, FUTURE_REGION_TEASERS);
  }

  if (typeof window !== 'undefined') {
    window.OctaveStoryReactivity = {
      TOTAL_TOBIN_JOURNAL_PAGES,
      resolveTavernRumours,
      generateSynodBroadsheet,
      checkAndDeliverCourierLetters,
      triggerRestDreamScene,
      triggerLightGlassMemoryEcho,
      collectTobinJournalPage,
      getTobinJournalProgress,
      resolveCompanionEndings,
      getFutureRegionLoreTeasers
    };
  }
})();
