"""Genera musica ed effetti sonori ORIGINALI (sintesi procedurale, nessun campione esterno).

    python tools/genera_audio.py        -> scrive public/audio/*.mp3

Serve: Python 3, numpy, scipy, ffmpeg nel PATH.
Tutto è deterministico (seed fisso): rilanciarlo produce gli stessi file.
"""
import os
import subprocess
import tempfile

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 44100
RNG = np.random.default_rng(7)
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "audio")


# ---------------------------------------------------------------- utilità
def t(sec):
    return np.arange(int(sec * SR)) / SR


def env(n, a=0.005, d=0.1, s=0.0, r=0.05, sustain_sec=0.0):
    """inviluppo ADSR lungo n campioni"""
    A, D, R = int(a * SR), int(d * SR), int(r * SR)
    S = max(0, n - A - D - R)
    e = np.concatenate([
        np.linspace(0, 1, max(A, 1)),
        np.linspace(1, s, max(D, 1)),
        np.full(S, s),
        np.linspace(s, 0, max(R, 1)),
    ])
    return np.pad(e, (0, max(0, n - len(e))))[:n]


def lp(x, f, o=4):
    return sosfilt(butter(o, f, "low", fs=SR, output="sos"), x)


def hp(x, f, o=4):
    return sosfilt(butter(o, f, "high", fs=SR, output="sos"), x)


def bp(x, f1, f2, o=4):
    return sosfilt(butter(o, [f1, f2], "band", fs=SR, output="sos"), x)


def noise(sec):
    return RNG.standard_normal(int(sec * SR))


def saw(f, tt, detune=0.0):
    ph = (f * (1 + detune)) * tt
    return 2 * (ph - np.floor(ph + 0.5))


def norm(x, peak=0.9):
    m = np.max(np.abs(x)) or 1
    return x / m * peak


def stereo(x, width=0.0, seed=0):
    """da mono a stereo con un leggero allargamento (ritardo su un canale)"""
    d = int(0.012 * SR * width)
    l = x
    r = np.concatenate([np.zeros(d), x[: len(x) - d]]) if d else x
    return np.stack([l * (1 - width * 0.15), r], axis=1)


def salva(nome, x, kbps=192):
    os.makedirs(OUT, exist_ok=True)
    if x.ndim == 1:
        x = stereo(x)
    x = np.clip(x, -1, 1)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        wavfile.write(f.name, SR, (x * 32767).astype(np.int16))
        tmp = f.name
    dest = os.path.join(OUT, nome + ".mp3")
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", tmp, "-b:a", f"{kbps}k", dest], check=True)
    os.remove(tmp)
    print("  ", nome, f"{len(x) / SR:.1f}s")


def mix_at(dst, src, start_sec, gain=1.0):
    i = max(0, int(start_sec * SR))
    if i >= len(dst):
        return
    n = min(len(src), len(dst) - i)
    dst[i : i + n] += src[:n] * gain


# ---------------------------------------------------------------- strumenti
def kick():
    tt = t(0.45)
    f = 150 * np.exp(-tt * 28) + 45
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-tt * 7)
    click = hp(noise(0.45), 2000) * np.exp(-tt * 300) * 0.4
    return norm(np.tanh((body + click) * 1.6), 1.0)


def clap():
    tt = t(0.35)
    n = bp(noise(0.35), 900, 5000)
    e = np.zeros_like(tt)
    for k, off in enumerate([0, 0.011, 0.022]):
        e += np.where(tt >= off, np.exp(-(tt - off) * (180 if k < 2 else 22)), 0)
    tone = np.sin(2 * np.pi * 190 * tt) * np.exp(-tt * 30) * 0.4
    return norm(n * e + tone, 0.85)


def hat(open_=False):
    d = 0.32 if open_ else 0.06
    tt = t(d)
    n = hp(noise(d), 7500)
    return norm(n * np.exp(-tt * (12 if open_ else 70)), 0.5 if open_ else 0.35)


def crash():
    tt = t(2.2)
    n = hp(noise(2.2), 4000) * np.exp(-tt * 1.8)
    return norm(n, 0.45)


def bass_note(f, dur):
    tt = t(dur)
    x = saw(f, tt) * 0.6 + np.sin(2 * np.pi * f / 2 * tt) * 0.6
    x = lp(x, 520)
    return x * env(len(tt), 0.004, 0.08, 0.7, 0.04)


def stab(freqs, dur):
    tt = t(dur)
    x = sum(saw(f, tt, d) for f in freqs for d in (-0.006, 0.006)) / (len(freqs) * 2)
    x = lp(x, 4200)
    return x * env(len(tt), 0.003, 0.14, 0.25, 0.08)


def pad(freqs, dur):
    tt = t(dur)
    x = sum(saw(f, tt, d) for f in freqs for d in (-0.01, 0, 0.01)) / (len(freqs) * 3)
    x = lp(x, 2400)
    return x * env(len(tt), 0.4, 0.2, 0.8, 0.6)


def nota(n):  # midi -> Hz
    return 440 * 2 ** ((n - 69) / 12)


# ---------------------------------------------------------------- musica
def musica():
    """Base 'pre-partita': 120 BPM (1 beat = 15 frame a 30 fps), Mi minore, 32 battute."""
    bpm = 120
    beat = 60 / bpm
    bar = beat * 4
    bars = 32
    L = int((bars * bar + 2.5) * SR)
    drums = np.zeros(L)
    bass = np.zeros(L)
    synth = np.zeros(L)
    pads = np.zeros(L)

    # Em - C - G - D
    prog = [(40, [64, 67, 71]), (36, [64, 67, 72]), (43, [62, 67, 71]), (38, [62, 66, 69])]
    K, C, H, OH, CR = kick(), clap(), hat(), hat(True), crash()

    for b in range(bars):
        t0 = b * bar
        root, chord = prog[b % 4]
        intro = b < 2
        # pad sempre
        mix_at(pads, pad([nota(n - 12) for n in chord], bar + 0.6), t0, 0.5)
        if b in (2, 18):
            mix_at(drums, CR, t0, 1.0)
        # batteria
        if not intro:
            for k in (0, 1.5, 2.5) if b % 2 else (0, 2.5):
                mix_at(drums, K, t0 + k * beat, 1.0)
            for k in (1, 3):
                mix_at(drums, C, t0 + k * beat, 0.8)
        for s16 in range(16):
            if intro and s16 % 4:
                continue
            acc = 1.0 if s16 % 4 == 2 else 0.55
            mix_at(drums, H, t0 + s16 * beat / 4, acc)
        if not intro:
            for k in (0.5, 1.5, 2.5, 3.5):
                mix_at(drums, OH, t0 + k * beat, 0.35)
        # basso a ottavi
        if not intro:
            for e in range(8):
                f = nota(root + (12 if e in (3, 7) else 0))
                mix_at(bass, bass_note(f, beat / 2 * 0.92), t0 + e * beat / 2, 0.9)
        # stab sincopati
        if b >= 2:
            for k in (0.75, 1.5, 2.75, 3.5):
                mix_at(synth, stab([nota(n) for n in chord], beat * 0.45), t0 + k * beat, 0.55)
        # piccolo fill ogni 4 battute
        if b % 4 == 3 and not intro:
            for s16 in range(12, 16):
                mix_at(drums, C, t0 + s16 * beat / 4, 0.35 + 0.1 * (s16 - 12))

    # riser nelle prime due battute
    r = t(2 * bar)
    riser = bp(noise(2 * bar), 300, 6000) * np.linspace(0, 1, len(r)) ** 2
    mix_at(synth, riser * 0.25, 0)

    mixL = drums * 0.8 + bass * 0.45 + synth * 2.4 + pads * 1.9
    mixR = drums * 0.8 + bass * 0.45 + np.roll(synth, int(0.009 * SR)) * 2.4 + np.roll(pads, int(0.015 * SR)) * 1.9
    st = np.stack([mixL, mixR], axis=1)
    st = np.tanh(st * 1.3) / np.tanh(1.3)  # leggero "glue"
    st = norm(st, 0.85)
    # sfuma la coda
    st[-int(2.5 * SR):] *= np.linspace(1, 0, int(2.5 * SR))[:, None]
    salva("musica", st, 160)


# ---------------------------------------------------------------- effetti
def whoosh():
    d = 0.6
    tt = t(d)
    n = noise(d)
    # sweep del filtro
    out = np.zeros_like(n)
    seg = 256
    for i in range(0, len(n), seg):
        p = i / len(n)
        f = 400 + 5000 * np.sin(np.pi * p) ** 2
        out[i : i + seg] = bp(n[max(0, i - 2048) : i + seg], f * 0.6, f * 1.4, 2)[-len(n[i : i + seg]):]
    e = np.sin(np.pi * np.clip(tt / d, 0, 1)) ** 1.5
    salva("whoosh", stereo(norm(out * e, 0.8), 0.8))


def impatto():
    d = 1.6
    tt = t(d)
    f = 90 * np.exp(-tt * 6) + 32
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 3.2)
    crack = lp(noise(d), 3000) * np.exp(-tt * 18) * 0.7
    tail = lp(noise(d), 600) * np.exp(-tt * 2.5) * 0.25
    salva("impatto", stereo(norm(np.tanh((boom + crack + tail) * 2), 0.95), 0.6))


def fischio(lungo=0.55, nome="fischio"):
    tt = t(lungo)
    trill = 1 + 0.5 * (np.sin(2 * np.pi * 34 * tt) > 0)  # pallina che vibra
    f = 2950 + 40 * np.sin(2 * np.pi * 34 * tt)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.7 + np.sin(2 * np.pi * 2 * np.cumsum(f) / SR) * 0.15
    x *= trill / 1.5
    x += bp(noise(lungo), 2500, 3600) * 0.15
    x *= env(len(tt), 0.02, 0.05, 0.9, 0.06)
    salva(nome, stereo(norm(x, 0.6), 0.3))
    return x


def fischio_finale():
    out = np.zeros(int(2.6 * SR))
    corto = t(0.3)
    for i, (start, d) in enumerate([(0, 0.32), (0.55, 0.32), (1.1, 1.1)]):
        tt = t(d)
        f = 2950 + 40 * np.sin(2 * np.pi * 34 * tt)
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * (1 + 0.5 * (np.sin(2 * np.pi * 34 * tt) > 0)) / 1.5
        x *= env(len(tt), 0.02, 0.05, 0.9, 0.08)
        mix_at(out, x, start)
    salva("fischio-finale", stereo(norm(out, 0.6), 0.3))


def folla(d, nome, swell=0.35, picco=0.6, decad=1.0, tono=1.0):
    """boato: tanti 'strati' di rumore filtrato che si gonfiano"""
    tt = t(d)
    x = np.zeros_like(tt)
    for k in range(10):
        c = RNG.uniform(350, 1400) * tono
        layer = bp(noise(d), c * 0.7, c * 1.4, 2)
        mod = 1 + 0.35 * np.sin(2 * np.pi * RNG.uniform(3, 7) * tt + RNG.uniform(0, 6))
        x += layer * mod
    x += lp(noise(d), 250) * 0.6
    e = np.clip(tt / swell, 0, 1) ** 1.2 * np.exp(-np.clip(tt - picco, 0, None) * decad)
    out = np.stack([x * e, np.roll(x, 900) * e], axis=1)
    salva(nome, norm(out, 0.8))


def buu():
    d = 2.2
    tt = t(d)
    x = np.zeros_like(tt)
    for k in range(12):
        f0 = RNG.uniform(110, 220)
        f = f0 * (1 - 0.18 * tt / d)  # "uuuh" che scende
        v = saw(1, np.cumsum(f) / SR)
        x += lp(v, 700) * RNG.uniform(0.5, 1)
    x += bp(noise(d), 200, 900) * 0.8
    e = np.clip(tt / 0.25, 0, 1) * np.exp(-np.clip(tt - 0.8, 0, None) * 1.6)
    salva("buu", stereo(norm(x * e, 0.7), 0.7))


def ding():
    d = 0.9
    tt = t(d)
    x = sum(np.sin(2 * np.pi * f * tt) * a for f, a in ((1568, 1), (3136, 0.35), (2349, 0.4)))
    x *= np.exp(-tt * 5)
    salva("ding", stereo(norm(x, 0.55), 0.4))


def tick():
    d = 0.05
    tt = t(d)
    x = hp(noise(d), 3000) * np.exp(-tt * 200) + np.sin(2 * np.pi * 1800 * tt) * np.exp(-tt * 120)
    salva("tick", norm(x, 0.35))


def scintille():
    d = 1.8
    out = np.zeros(int(d * SR))
    note = [76, 79, 83, 88, 91, 95]
    for i, n in enumerate(note):
        tt = t(1.0)
        f = nota(n)
        x = (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt)) * np.exp(-tt * 6)
        mix_at(out, x, i * 0.07, 0.8)
    salva("scintille", stereo(norm(out, 0.5), 0.9))


def macchina():
    """ticchettio della telecronaca (macchina da scrivere), loop di 1,5 s"""
    d = 1.5
    out = np.zeros(int(d * SR))
    for k in range(18):
        tt = t(0.03)
        c = hp(noise(0.03), 2500) * np.exp(-tt * 260)
        mix_at(out, c, k * d / 18 + RNG.uniform(-0.01, 0.01), RNG.uniform(0.5, 1))
    salva("macchina", norm(out, 0.25))


if __name__ == "__main__":
    print("Genero audio in", os.path.abspath(OUT))
    musica()
    whoosh()
    impatto()
    fischio()
    fischio_finale()
    folla(3.5, "folla-gol", swell=0.25, picco=0.9, decad=0.9)
    folla(2.5, "folla-applauso", swell=0.5, picco=1.0, decad=1.2, tono=1.3)
    folla(2.0, "folla-ooh", swell=0.3, picco=0.5, decad=2.0, tono=0.8)
    buu()
    ding()
    tick()
    scintille()
    macchina()
