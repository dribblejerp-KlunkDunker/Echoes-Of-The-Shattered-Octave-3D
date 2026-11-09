#!/usr/bin/env python3
"""Draws the README's QR code for the phone link (screenshots/readme/qr-phone.png).

    pip install segno==1.6.1     # once; any recent segno works
    python3 tools/readme/qr.py [URL]

Dark ink on the game's parchment, error correction H so it survives being shown small. The default URL is the
published game with ?touch=1, which starts the touch controls from the first frame (js/touchlink36.js).
"""
import os
import sys

import segno

URL = sys.argv[1] if len(sys.argv) > 1 else 'https://dribblejerp-klunkdunker.github.io/echoes-of-the-shattered-octave/?touch=1'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'screenshots', 'readme', 'qr-phone.png')

qr = segno.make(URL, error='h', micro=False)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
qr.save(OUT, scale=10, border=3, dark='#16110d', light='#e8d9b5')
print(os.path.normpath(OUT), qr.designator, URL)
