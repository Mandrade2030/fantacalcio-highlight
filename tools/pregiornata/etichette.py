"""Aggiunge sotto/sopra i nomi della locandina pre-giornata le etichette 'N° POSTO · X PT'.
Uso: python etichette.py locandina.jpg uscita.jpg '[["5","3"],["1","6"], ...]'  (8 coppie, ordine: sinistra/destra per ogni fascia)
Le barre dei nomi vengono trovate in automatico (barra rossa a destra)."""
import sys, json, numpy as np
from PIL import Image, ImageDraw, ImageFont

src, dst, dati = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])
im = Image.open(src).convert("RGB")
W, H = im.size
a = np.asarray(im).astype(int)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
rosso = ((r > 170) & (g < 70) & (b < 70))[:, int(W * 0.67):int(W * 0.97)].mean(axis=1)
righe = np.where(rosso > 0.6)[0]
barre = []
for y in righe:
    if not barre or y > barre[-1][1] + 3:
        barre.append([y, y])
    else:
        barre[-1][1] = y
barre = [b0 for b0, _ in barre][:4]
assert len(barre) == 4, f"trovate {len(barre)} barre"

FONT = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
s = W / 928
f = ImageFont.truetype(FONT, int(26 * s))
d = ImageDraw.Draw(im, "RGBA")
ultimo = max(int(p) for p, _ in dati)
for i, y0 in enumerate(barre):
    for lato in (0, 1):
        pos, pt = dati[i * 2 + lato]
        testo = f"{pos}° POSTO · {pt} PT"
        tw = d.textlength(testo, font=f)
        pw, ph = tw + 30 * s, 42 * s
        x = 22 * s if lato == 0 else W - 22 * s - pw
        y = y0 - ph - 10 * s
        if pos == "1":
            fondo, bordo, col = (255, 200, 40, 245), (120, 70, 0, 255), (40, 20, 0)
        elif int(pos) == ultimo:
            fondo, bordo, col = (200, 20, 30, 245), (255, 255, 255, 255), (255, 255, 255)
        else:
            fondo, bordo, col = (12, 20, 48, 235), (255, 210, 60, 255), (255, 255, 255)
        d.rounded_rectangle([x + 3 * s, y + 4 * s, x + pw + 3 * s, y + ph + 4 * s], radius=ph / 2, fill=(0, 0, 0, 110))
        d.rounded_rectangle([x, y, x + pw, y + ph], radius=ph / 2, fill=fondo, outline=bordo, width=max(2, int(3 * s)))
        d.text((x + pw / 2, y + ph / 2), testo, font=f, fill=col, anchor="mm")
im.save(dst, quality=93)
print("ok", barre)
