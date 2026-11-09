# Casting for the voiced lines: which TTS voice each speaker gets, and how it is treated.
#
# Each entry: voice (a Kokoro-82M voice id), speed (1 = the model's pace), pitch (semitones, duration kept),
# lang (en-us / en-gb), and fx, a list of named treatments applied in order (see build.py):
#   old       - a slow waver and a little breath, for the elderly
#   gravel    - a dirtied low end, for rough throats
#   glass     - a faint ring tuned to 528 Hz (Light-glass), for Kaelen's arm
#   bell      - a ring at the speaker's own Anchor-ish pitch, for bell-throated soldiers
#   radio     - narrowed band, for Office voices that read rather than speak
#   whisper   - voice turned to breath (phase scrambled), for Hollows; mix 0..1
#   chorus    - several copies a little apart, for things that speak with many voices
#   stack     - copies at a fifth and an octave below, for chords (the Aegis)
#   room / hall / chapel / outdoors / wood - reverbs
#   child     - lifted formants and pitch, for children
# Pitches and voices are chosen from each character's canon in the game (age, build, trade), see voices.js PEOPLE.

CAST = {
    # ---- Oakhaven, Part One
    'harrow':     dict(voice='bm_lewis',   speed=0.86, pitch=-2, lang='en-gb', fx=['old', 'room']),
    'lyra':       dict(voice='af_heart',   speed=0.94, pitch=0,  lang='en-us', fx=['room']),
    'lyra_ruined':dict(voice='af_heart',   speed=0.82, pitch=-3, lang='en-us', fx=[('whisper', 0.45), 'gravel', 'wood']),
    'kaelen':     dict(voice='am_fenrir',  speed=0.86, pitch=-3, lang='en-us', fx=['gravel', 'glass', 'room']),
    'hetty':      dict(voice='bf_alice',   speed=1.0,  pitch=-1, lang='en-gb', fx=['room']),
    'vane':       dict(voice='am_puck',    speed=1.0,  pitch=-1, lang='en-us', fx=['room']),
    'rooke':      dict(voice='bm_daniel',  speed=0.96, pitch=-1, lang='en-gb', fx=['room']),
    'orla':       dict(voice='bf_lily',    speed=0.86, pitch=-1, lang='en-gb', fx=['old', 'room']),
    'pim':        dict(voice='af_sky',     speed=1.06, pitch=3,  lang='en-us', fx=['child', 'outdoors']),
    'vosk':       dict(voice='bf_isabella',speed=0.96, pitch=-1, lang='en-gb', fx=['room']),
    'aldric':     dict(voice='bm_george',  speed=0.9,  pitch=-2, lang='en-gb', fx=['hall']),
    'tobiah':     dict(voice='bm_fable',   speed=1.06, pitch=1,  lang='en-gb', fx=['room']),
    'bettany':    dict(voice='bf_emma',    speed=0.94, pitch=-1, lang='en-gb', fx=['room']),
    'tam':        dict(voice='bm_lewis',   speed=0.8,  pitch=-4, lang='en-gb', fx=['old', 'outdoors']),
    'hob':        dict(voice='am_onyx',    speed=0.92, pitch=-1, lang='en-us', fx=['gravel', 'room']),
    'nell':       dict(voice='bf_lily',    speed=1.0,  pitch=1,  lang='en-gb', fx=['room']),
    'ignatius':   dict(voice='bm_fable',   speed=0.9,  pitch=-2, lang='en-gb', fx=['chapel']),
    'townsman':   dict(voice='am_adam',    speed=0.94, pitch=-1, lang='en-us', fx=['outdoors']),
    # ---- the Rite (js/rite43.js): the Church's sisters, the Governor down a speaking-tube, the men at the pumps
    'sister':     dict(voice='bf_emma',    speed=0.9,  pitch=0,  lang='en-gb', fx=['hall']),
    'aldric_tube':dict(voice='bm_george',  speed=0.92, pitch=-2, lang='en-gb', fx=['radio', 'wood']),
    'pumpman':    dict(voice='bm_lewis',   speed=0.86, pitch=-2, lang='en-gb', fx=[('whisper', 0.55), 'hall']),
    'engineer':   dict(voice='am_michael', speed=1.04, pitch=1,  lang='en-us', fx=['wood']),
    'davin':      dict(voice='bm_george',  speed=0.9,  pitch=0,  lang='en-gb', fx=['room']),
    'ada':        dict(voice='bf_isabella', speed=0.92, pitch=-1, lang='en-gb', fx=['outdoors']),
    'lyra_fortunate': dict(voice='af_heart', speed=0.72, pitch=-1, lang='en-us', fx=[('note', 174.0), 'gravel', 'hall']),
    # ---- the opening cinematic's narrator: an older man, grave and unhurried, in a great room
    'narrator':   dict(voice='bm_daniel',  speed=0.84, pitch=-3, lang='en-gb', fx=['hall']),
    'townswoman': dict(voice='af_sarah',   speed=0.96, pitch=0,  lang='en-us', fx=['outdoors']),
    # ---- the travellers
    'sable':      dict(voice='af_nicole',  speed=0.9,  pitch=-1, lang='en-us', fx=['room']),
    'mags':       dict(voice='af_kore',    speed=0.92, pitch=-1, lang='en-us', fx=['wood']),
    # ---- Whisper-Grove and the Deep Woods
    'quist':      dict(voice='am_eric',    speed=0.94, pitch=-1, lang='en-us', fx=['radio', 'room']),
    'halder':     dict(voice='bm_lewis',   speed=0.84, pitch=-2, lang='en-gb', fx=[('whisper', 0.7), 'old', 'room']),
    'lamplighter':dict(voice='bm_daniel',  speed=0.84, pitch=-1, lang='en-gb', fx=[('whisper', 0.75), 'outdoors']),
    'bettis':     dict(voice='am_liam',    speed=0.84, pitch=0,  lang='en-us', fx=[('whisper', 0.75), 'outdoors']),
    'hollow':     dict(voice='bm_daniel',  speed=0.84, pitch=-1, lang='en-gb', fx=[('whisper', 0.8), 'outdoors']),
    'sexton':     dict(voice='bm_lewis',   speed=0.8,  pitch=-3, lang='en-gb', fx=[('whisper', 0.7), 'wood']),
    'mourner':    dict(voice='bf_emma',    speed=0.84, pitch=-1, lang='en-gb', fx=[('whisper', 0.75), 'wood']),
    'herald':     dict(voice='bm_george',  speed=0.98, pitch=0,  lang='en-gb', fx=['outdoors']),
    'wren':       dict(voice='af_sky',     speed=1.0,  pitch=4,  lang='en-us', fx=['child', 'wood']),
    'aegis':      dict(voice='am_onyx',    speed=0.82, pitch=-4, lang='en-us', fx=['stack', 'bell', 'hall']),
    # ---- remembered voices (spoken by the mimics)
    'tobin':      dict(voice='bm_daniel',  speed=0.9,  pitch=-2, lang='en-gb', fx=[]),
    'lyra_child': dict(voice='af_heart',   speed=1.0,  pitch=4,  lang='en-us', fx=['child']),
    'cantor_old': dict(voice='bm_lewis',   speed=0.82, pitch=-3, lang='en-gb', fx=['old']),
    'player_mother':dict(voice='af_bella', speed=0.9,  pitch=-1, lang='en-us', fx=[]),
    'chorus_congregation':dict(voice='bm_george', speed=0.88, pitch=-1, lang='en-gb', fx=['chapel']),
    'core_voice': dict(voice='af_nicole',  speed=0.84, pitch=1,  lang='en-us', fx=[('whisper', 0.35), 'bell', 'room']),
    'wg41005':    dict(voice='af_nicole',  speed=0.8,  pitch=0,  lang='en-us', fx=[('whisper', 0.3), 'hall']),
    # ---- enemies that speak
    'proctor':    dict(voice='am_eric',    speed=0.94, pitch=-1, lang='en-us', fx=['radio', 'outdoors']),
    'legionnaire':dict(voice='am_onyx',    speed=0.88, pitch=-3, lang='en-us', fx=['bell', 'outdoors']),
    'marine':     dict(voice='am_liam',    speed=1.0,  pitch=-1, lang='en-us', fx=['radio', 'wood']),
    'bosun':      dict(voice='am_santa',   speed=0.94, pitch=-2, lang='en-us', fx=['gravel', 'wood']),
    'outrider':   dict(voice='am_echo',    speed=1.0,  pitch=-1, lang='en-us', fx=['radio', 'wood']),
    'captain':    dict(voice='am_michael', speed=0.94, pitch=-2, lang='en-us', fx=['radio', 'wood']),
    'deacon':     dict(voice='am_onyx',    speed=0.8,  pitch=-3, lang='en-us', fx=[('whisper', 0.4), 'wood']),
    'pressman':   dict(voice='bm_lewis',   speed=0.8,  pitch=-6, lang='en-gb', fx=['gravel', 'hall']),
    # ---- the many-voiced (the line's voiceOf is spoken, then put through these)
    'weaver':     dict(fx=['chorus', 'hall']),
    'wearer':     dict(fx=['chorus', 'gravel', 'hall']),
    'requiem':    dict(fx=['chorus', 'stack', 'hall']),
    'broodmother':dict(fx=['chorus', 'gravel', 'hall']),
}

# delivery notes in the script -> small adjustments
DELIVERY = {
    'whisper':  dict(speed=0.94, whisper=0.6, gain=-6),
    'murmur':   dict(speed=0.94, gain=-4),
    'low':      dict(speed=0.96, gain=-2),
    'tired':    dict(speed=0.9,  gain=-2),
    'loud':     dict(speed=1.03, gain=2),
    'shout':    dict(speed=1.06, gain=3),
    'hollow-fragment': dict(speed=0.9, gain=-3),
}

# fallbacks for speakers the table does not name: by kind
FALLBACK = dict(voice='am_adam', speed=0.95, pitch=0, lang='en-us', fx=['room'])
