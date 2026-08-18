#!/usr/bin/env python3
"""Render proof-backed LOCAL AI OS promo masters without an external media provider.

Runtime requirements are intentionally outside npm QA because media rendering is an
operator task: Python 3, Pillow, NumPy, qrcode and ffmpeg. The renderer reads the
public proof + promo manifest and refuses claim drift before producing MP4 files.
"""
from __future__ import annotations

import argparse
import json
import math
import subprocess
import tempfile
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
import qrcode

ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / 'public/promo/local-ai-os-promo.json'
BG = (8, 11, 9)
PANEL = (16, 21, 16)
LINE = (42, 50, 43)
LINE_BRIGHT = (73, 83, 74)
INK = (242, 245, 239)
MUTED = (174, 184, 175)
ACCENT = (205, 243, 71)
DANGER = (255, 129, 110)
DURATION = 25.0
FPS = 30


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
  return max(low, min(high, value))


def ease(value: float) -> float:
  value = clamp(value)
  return 1 - (1 - value) ** 3


def smooth(value: float) -> float:
  value = clamp(value)
  return value * value * (3 - 2 * value)


def seg(t: float, start: float, end: float) -> float:
  return clamp((t - start) / (end - start))


def fade_window(t: float, start: float, end: float, edge: float = .32) -> float:
  return clamp(min((t - start) / edge, (end - t) / edge))


def blend(color: tuple[int, int, int], alpha: int) -> tuple[int, int, int, int]:
  amount = clamp(alpha / 255)
  return (
    int(BG[0] + (color[0] - BG[0]) * amount),
    int(BG[1] + (color[1] - BG[1]) * amount),
    int(BG[2] + (color[2] - BG[2]) * amount),
    255,
  )


def resolve_font(*candidates: str) -> str:
  for candidate in candidates:
    if Path(candidate).exists():
      return candidate
  raise SystemExit('Required local font not found; install Lato and DejaVu Sans Mono')


FONT_REG = resolve_font(
  '/usr/share/fonts/truetype/lato/Lato-Regular.ttf',
  '/usr/share/fonts/TTF/Lato-Regular.ttf',
)
FONT_HEAVY = resolve_font(
  '/usr/share/fonts/truetype/lato/Lato-Heavy.ttf',
  '/usr/share/fonts/TTF/Lato-Heavy.ttf',
)
FONT_MONO = resolve_font(
  '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',
  '/usr/share/fonts/TTF/DejaVuSansMono.ttf',
)


def font(size: int, heavy: bool = False, mono: bool = False) -> ImageFont.FreeTypeFont:
  path = FONT_MONO if mono else FONT_HEAVY if heavy else FONT_REG
  return ImageFont.truetype(path, max(8, size))


def text(draw: ImageDraw.ImageDraw, xy, value: str, fnt, fill, anchor: str = 'la', spacing: int = 4) -> None:
  draw.multiline_text(xy, value, font=fnt, fill=fill, anchor=anchor, spacing=spacing)


def panel(draw: ImageDraw.ImageDraw, box, fill=PANEL, outline=LINE, radius: int = 18, width: int = 1) -> None:
  draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def load_contract() -> tuple[dict, dict, dict[str, int]]:
  manifest = json.loads(MANIFEST_PATH.read_text(encoding='utf-8'))
  proof_path = ROOT / 'public/proofs' / f"{manifest['proofId']}.json"
  proof = json.loads(proof_path.read_text(encoding='utf-8'))
  if not proof.get('approvedForPublic') or proof.get('status') != 'verified':
    raise SystemExit('Promo proof is not approved verified public evidence')
  assisted = {item['label']: item['value'] for item in proof.get('assisted', [])}
  claims: dict[str, int] = {}
  for claim in manifest.get('claims', []):
    value = assisted.get(claim['label'])
    if not isinstance(value, int) or value != claim['expectedValue']:
      raise SystemExit(f"Promo claim drift: {claim['label']}")
    claims[claim['label']] = value
  return manifest, proof, claims


def draw_grid(draw: ImageDraw.ImageDraw, width: int, height: int, t: float) -> None:
  step = max(44, int(min(width, height) * .06))
  offset = int((t * 10) % step)
  for x in range(-step + offset, width + step, step):
    draw.line((x, 0, x, height), fill=blend(LINE, 36), width=1)
  for y in range(-step + offset, height + step, step):
    draw.line((0, y, width, y), fill=blend(LINE, 36), width=1)
  scan_x = int((t / DURATION) * (width + step)) - step
  draw.line((scan_x, 0, scan_x, height), fill=blend(ACCENT, 26), width=max(1, width // 800))


def draw_hook(draw, width: int, height: int, t: float, portrait: bool) -> None:
  alpha = fade_window(t, 0, 3.2, .45)
  if alpha <= 0:
    return
  margin = int(width * (.075 if portrait else .07))
  text(draw, (margin, margin), 'PRIVATE LINUX · CODEX · OWNER-CONTROLLED', font(int(min(width, height) * .022), mono=True), blend(ACCENT, int(255 * alpha)))
  size = int(min(width, height) * (.105 if portrait else .102))
  reveal = ease(seg(t, .25, 1.0))
  y = int(height * (.30 if portrait else .26))
  text(draw, (margin, y + int((1 - reveal) * 40)), 'НЕ БОЛЬШЕ\nКОНТЕКСТА.', font(size, heavy=True), blend(INK, int(255 * alpha * reveal)), spacing=int(size * .12))
  second = ease(seg(t, 1.15, 1.95))
  text(draw, (margin, y + int(size * 2.15) + int((1 - second) * 32)), 'НУЖНЫЙ\nКОНТЕКСТ.', font(size, heavy=True), blend(ACCENT, int(255 * alpha * second)), spacing=int(size * .12))
  line_y = int(height * (.84 if portrait else .82))
  line_x = margin + int((width - margin * 2) * ease(seg(t, 1.55, 2.45)))
  draw.line((margin, line_y, line_x, line_y), fill=blend(ACCENT, int(230 * alpha)), width=max(2, int(min(width, height) * .004)))
  text(draw, (margin, line_y + 18), 'Agent work becomes a controlled evidence loop.', font(int(min(width, height) * .024)), blend(MUTED, int(230 * alpha)))


def draw_context(draw, width: int, height: int, t: float, portrait: bool) -> None:
  alpha = fade_window(t, 3.0, 6.6, .42)
  if alpha <= 0:
    return
  margin = int(width * (.07 if portrait else .06))
  title_font = font(int(min(width, height) * (.064 if portrait else .061)), heavy=True)
  text(draw, (margin, int(height * (.12 if portrait else .15))), 'АГЕНТ НЕ ДОЛЖЕН\nЧИТАТЬ ЛИШНЕЕ.', title_font, blend(INK, int(255 * alpha)), spacing=8)
  if portrait:
    box = (margin, int(height * .42), width - margin, int(height * .86))
  else:
    box = (int(width * .57), int(height * .13), width - margin, int(height * .87))
    text(draw, (margin, int(height * .62)), 'Сначала — bounded context pack.\nТолько релевантные источники и scope.', font(int(min(width, height) * .026)), blend(MUTED, int(235 * alpha)), spacing=8)
  panel(draw, box, fill=blend(PANEL, int(245 * alpha)), outline=blend(LINE_BRIGHT, int(220 * alpha)), radius=max(14, int(min(width, height) * .018)))
  x1, y1, x2, y2 = box
  pad = int((x2 - x1) * .07)
  row_h = max(28, int((y2 - y1) * .085))
  files = [
    ('docs/architecture.md', False), ('runtime/session.log', False), ('src/context-pack.ts', True),
    ('src/project-scope.ts', True), ('notes/old-dump.md', False), ('tests/context-pack.test.ts', True),
    ('cache/tool-output.json', False), ('private/raw-session.txt', False),
  ]
  scan = smooth(seg(t, 3.55, 5.85))
  scan_y = y1 + pad + int(scan * max(1, (len(files) - 1) * row_h))
  draw.rectangle((x1 + 2, scan_y - row_h // 2, x2 - 2, scan_y + row_h // 2), fill=blend(ACCENT, int(20 * alpha)))
  for index, (name, relevant) in enumerate(files):
    yy = y1 + pad + index * row_h
    reveal = ease(seg(t, 3.15 + index * .06, 3.55 + index * .06))
    active = relevant and scan > index / (len(files) - 1)
    color = ACCENT if active else MUTED
    opacity = int((245 if relevant else 130) * alpha * reveal)
    draw.ellipse((x1 + pad, yy - 4, x1 + pad + 8, yy + 4), fill=blend(color, opacity))
    text(draw, (x1 + pad + 20, yy), name, font(int(min(width, height) * .018), mono=True), blend(color, opacity), anchor='lm')
  text(draw, (x1 + pad, y2 - pad), '3 relevant surfaces / 8 shown', font(int(min(width, height) * .017), mono=True), blend(ACCENT, int(220 * alpha)), anchor='ls')


def draw_flow(draw, width: int, height: int, t: float, portrait: bool) -> None:
  alpha = fade_window(t, 6.35, 10.1, .4)
  if alpha <= 0:
    return
  margin = int(width * (.07 if portrait else .06))
  text(draw, (margin, int(height * .11)), 'ЯВНАЯ ЦЕПОЧКА\nОТВЕТСТВЕННОСТИ.', font(int(min(width, height) * .063), heavy=True), blend(INK, int(255 * alpha)), spacing=7)
  steps = [('01', 'BOUNDED CONTEXT'), ('02', 'SCOPED EXECUTION'), ('03', 'VERIFICATION'), ('04', 'RUN REPORT')]
  start_y = int(height * (.39 if portrait else .46))
  total_h = int(height * (.48 if portrait else .37))
  row_h = total_h / len(steps)
  progress = smooth(seg(t, 6.75, 9.55))
  for index, (number, label) in enumerate(steps):
    y = int(start_y + index * row_h)
    step_progress = clamp(progress * len(steps) - index)
    color = ACCENT if step_progress > .45 else MUTED
    draw.line((margin, y + int(row_h * .78), width - margin, y + int(row_h * .78)), fill=blend(LINE, int(220 * alpha)), width=1)
    text(draw, (margin, y + int(row_h * .40)), number, font(int(min(width, height) * .025), mono=True), blend(color, int(255 * alpha)), anchor='lm')
    text(draw, (margin + int(width * .13), y + int(row_h * .40)), label, font(int(min(width, height) * (.036 if portrait else .045)), heavy=True), blend(color, int((120 + 135 * step_progress) * alpha)), anchor='lm')
  draw.line((margin, start_y - 18, margin + int((width - margin * 2) * progress), start_y - 18), fill=blend(ACCENT, int(255 * alpha)), width=max(2, int(min(width, height) * .004)))


def draw_scope(draw, width: int, height: int, t: float, portrait: bool) -> None:
  alpha = fade_window(t, 9.85, 13.4, .4)
  if alpha <= 0:
    return
  margin = int(width * (.07 if portrait else .06))
  text(draw, (margin, int(height * .10)), 'МЕНЯЕТ ТОЛЬКО\nРАЗРЕШЁННОЕ.', font(int(min(width, height) * .067), heavy=True), blend(INK, int(255 * alpha)), spacing=7)
  if portrait:
    box = (margin, int(height * .39), width - margin, int(height * .83))
  else:
    box = (int(width * .47), int(height * .21), width - margin, int(height * .82))
    text(draw, (margin, int(height * .62)), 'Writable scope — explicit.\nForbidden surfaces stay outside.', font(int(min(width, height) * .027)), blend(MUTED, int(235 * alpha)), spacing=8)
  x1, y1, x2, y2 = box
  panel(draw, box, fill=blend(PANEL, int(245 * alpha)), outline=blend(LINE_BRIGHT, int(220 * alpha)), radius=max(14, int(min(width, height) * .018)))
  cols, rows = 3, 4
  gap = int(min(width, height) * .014)
  pad = int(min(width, height) * .035)
  cell_w = (x2 - x1 - 2 * pad - gap * (cols - 1)) / cols
  cell_h = (y2 - y1 - 2 * pad - gap * (rows - 1)) / rows
  allowed = {(0, 1), (1, 1), (1, 2)}
  progress = ease(seg(t, 10.4, 12.5))
  for row in range(rows):
    for col in range(cols):
      bx1 = int(x1 + pad + col * (cell_w + gap))
      by1 = int(y1 + pad + row * (cell_h + gap))
      bx2 = int(bx1 + cell_w)
      by2 = int(by1 + cell_h)
      is_allowed = (row, col) in allowed
      color = ACCENT if is_allowed else LINE_BRIGHT
      draw.rounded_rectangle((bx1, by1, bx2, by2), radius=8, fill=blend(ACCENT, int((28 if is_allowed else 5) * alpha * progress)), outline=blend(color, int((230 if is_allowed else 120) * alpha)), width=max(1, int(min(width, height) * .002)))
      if not is_allowed and (row + col) % 2 == 0:
        draw.line((bx1 + 8, by2 - 8, bx2 - 8, by1 + 8), fill=blend(DANGER, int(55 * alpha)), width=1)
  path = [(0, 1), (1, 1), (1, 2)]
  index = min(len(path) - 1, int(smooth(seg(t, 10.6, 12.8)) * len(path)))
  row, col = path[index]
  cx = int(x1 + pad + col * (cell_w + gap) + cell_w / 2)
  cy = int(y1 + pad + row * (cell_h + gap) + cell_h / 2)
  radius = max(5, int(min(width, height) * .009))
  draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=blend(ACCENT, int(255 * alpha)), outline=blend(INK, int(200 * alpha)), width=2)
  text(draw, (x1 + pad, y2 - pad / 2), 'WRITE SCOPE: 3 CELLS', font(int(min(width, height) * .017), mono=True), blend(ACCENT, int(220 * alpha)), anchor='ls')


def draw_verify(draw, width: int, height: int, t: float, portrait: bool) -> None:
  alpha = fade_window(t, 13.15, 16.8, .4)
  if alpha <= 0:
    return
  margin = int(width * (.07 if portrait else .06))
  text(draw, (margin, int(height * .10)), 'НЕ «ГОТОВО».\nПРОВЕРЕНО.', font(int(min(width, height) * .073), heavy=True), blend(INK, int(255 * alpha)), spacing=7)
  if portrait:
    box = (margin, int(height * .40), width - margin, int(height * .82))
  else:
    box = (int(width * .52), int(height * .21), width - margin, int(height * .82))
    text(draw, (margin, int(height * .63)), 'Required checks run before handoff.\nThe report carries evidence, not confidence theater.', font(int(min(width, height) * .026)), blend(MUTED, int(235 * alpha)), spacing=8)
  x1, y1, x2, y2 = box
  panel(draw, box, fill=blend((6, 9, 7), int(250 * alpha)), outline=blend(LINE_BRIGHT, int(220 * alpha)), radius=max(14, int(min(width, height) * .018)))
  checks = [('typecheck', 'PASS'), ('tests', 'PASS'), ('build', 'PASS'), ('evidence', 'ATTACHED')]
  pad = int(min(width, height) * .04)
  row_h = (y2 - y1 - 2 * pad) / len(checks)
  for index, (label, result) in enumerate(checks):
    yy = int(y1 + pad + index * row_h)
    reveal = ease(seg(t, 13.55 + index * .32, 14.25 + index * .32))
    text(draw, (x1 + pad, yy), f'> {label}', font(int(min(width, height) * .022), mono=True), blend(MUTED, int(210 * alpha * reveal)))
    text(draw, (x2 - pad, yy), result, font(int(min(width, height) * .022), heavy=True, mono=True), blend(ACCENT, int(255 * alpha * reveal)), anchor='ra')


def draw_proof(draw, width: int, height: int, t: float, portrait: bool, claims: dict[str, int]) -> None:
  alpha = fade_window(t, 16.55, 20.45, .4)
  if alpha <= 0:
    return
  margin = int(width * (.07 if portrait else .06))
  text(draw, (margin, int(height * .09)), 'PUBLIC-SAFE FOUNDER PROOF', font(int(min(width, height) * .022), mono=True), blend(ACCENT, int(255 * alpha)))
  text(draw, (margin, int(height * .15)), 'ЦИФРЫ — ТОЛЬКО\nТАМ, ГДЕ ЕСТЬ EVIDENCE.', font(int(min(width, height) * .058), heavy=True), blend(INK, int(255 * alpha)), spacing=7)
  metrics = [
    (f"{claims['Verified runs']:,}".replace(',', ' '), 'VERIFIED RUNS'),
    (f"{claims['Context-preflight runs']:,}".replace(',', ' '), 'CONTEXT-PREFLIGHT RUNS'),
    (f"{claims['Recorded input-context characters']:,}".replace(',', ' '), 'RECORDED INPUT-CONTEXT CHARS'),
  ]
  top = int(height * (.42 if portrait else .48))
  bottom = int(height * .78)
  if portrait:
    gap = int(height * .02)
    card_h = (bottom - top - gap * 2) / 3
    cards = [(margin, int(top + index * (card_h + gap)), width - margin, int(top + index * (card_h + gap) + card_h)) for index in range(3)]
  else:
    gap = int(width * .018)
    card_w = (width - 2 * margin - gap * 2) / 3
    cards = [(int(margin + index * (card_w + gap)), top, int(margin + index * (card_w + gap) + card_w), bottom) for index in range(3)]
  for index, (number, label) in enumerate(metrics):
    reveal = ease(seg(t, 17.0 + index * .22, 17.7 + index * .22))
    x1, y1, x2, y2 = cards[index]
    panel(draw, (x1, y1, x2, y2), fill=blend(PANEL, int(245 * alpha * reveal)), outline=blend(LINE_BRIGHT, int(210 * alpha * reveal)), radius=max(12, int(min(width, height) * .014)))
    text(draw, (x1 + int((x2 - x1) * .08), y1 + int((y2 - y1) * .25)), number, font(int(min(width, height) * (.055 if portrait else .062)), heavy=True), blend(ACCENT, int(255 * alpha * reveal)))
    text(draw, (x1 + int((x2 - x1) * .08), y2 - int((y2 - y1) * .22)), label, font(int(min(width, height) * .017), mono=True), blend(MUTED, int(220 * alpha * reveal)), anchor='ls')
  text(draw, (margin, int(height * .87)), 'MATCHED BASELINE: UNAVAILABLE · NO INVENTED IMPROVEMENT %', font(int(min(width, height) * .016), mono=True), blend(MUTED, int(220 * alpha)))


def make_qr(url: str) -> Image.Image:
  qr = qrcode.QRCode(version=3, box_size=10, border=2, error_correction=qrcode.constants.ERROR_CORRECT_M)
  qr.add_data(url)
  qr.make(fit=True)
  return qr.make_image(fill_color=ACCENT, back_color=BG).convert('RGBA')


def draw_final(image: Image.Image, draw, width: int, height: int, t: float, portrait: bool, qr: Image.Image) -> None:
  alpha = fade_window(t, 20.2, 25, .45)
  if alpha <= 0:
    return
  margin = int(width * (.075 if portrait else .07))
  progress = ease(seg(t, 20.45, 21.3))
  draw.line((margin, int(height * .14), margin + int((width - 2 * margin) * progress), int(height * .14)), fill=blend(ACCENT, int(255 * alpha)), width=max(2, int(min(width, height) * .004)))
  text(draw, (margin, int(height * .25)), 'LOCAL AI OS', font(int(min(width, height) * (.095 if portrait else .11)), heavy=True), blend(INK, int(255 * alpha * progress)))
  text(draw, (margin, int(height * (.40 if portrait else .46))), 'КОНТЕКСТ. ГРАНИЦЫ. ПРОВЕРКА. ОТЧЁТ.', font(int(min(width, height) * .025), mono=True), blend(ACCENT, int(255 * alpha)))
  if portrait:
    size = int(width * .34)
    x, y = margin, int(height * .58)
    image.alpha_composite(qr.resize((size, size)), (x, y))
    text(draw, (x + size + int(width * .05), y + int(size * .16)), 'ПОДАЙ ОДИН\nWORKFLOW\nВ PROOF COHORT', font(int(min(width, height) * .034), heavy=True), blend(INK, int(255 * alpha)), spacing=7)
    text(draw, (margin, int(height * .92)), 'goringich.github.io/local-ai-os', font(int(min(width, height) * .019), mono=True), blend(MUTED, int(230 * alpha)))
  else:
    size = int(height * .24)
    x, y = width - margin - size, int(height * .63)
    image.alpha_composite(qr.resize((size, size)), (x, y))
    text(draw, (margin, int(height * .68)), 'ПОДАЙ ОДИН WORKFLOW\nВ PROOF COHORT', font(int(min(width, height) * .041), heavy=True), blend(INK, int(255 * alpha)), spacing=5)
    text(draw, (margin, int(height * .88)), 'goringich.github.io/local-ai-os', font(int(min(width, height) * .020), mono=True), blend(MUTED, int(230 * alpha)))


def render_frame(width: int, height: int, t: float, claims: dict[str, int], qr: Image.Image) -> Image.Image:
  portrait = height > width
  image = Image.new('RGBA', (width, height), (*BG, 255))
  draw = ImageDraw.Draw(image, 'RGBA')
  glow_x = int(width * (.82 if not portrait else .72))
  glow_y = int(height * .10)
  radius = int(max(width, height) * .38)
  draw.ellipse((glow_x - radius, glow_y - radius, glow_x + radius, glow_y + radius), fill=blend(ACCENT, 12))
  inner = int(radius * .58)
  draw.ellipse((glow_x - inner, glow_y - inner, glow_x + inner, glow_y + inner), fill=blend(ACCENT, 8))
  draw_grid(draw, width, height, t)
  draw_hook(draw, width, height, t, portrait)
  draw_context(draw, width, height, t, portrait)
  draw_flow(draw, width, height, t, portrait)
  draw_scope(draw, width, height, t, portrait)
  draw_verify(draw, width, height, t, portrait)
  draw_proof(draw, width, height, t, portrait, claims)
  draw_final(image, draw, width, height, t, portrait, qr)
  return image.convert('RGB')


def build_audio(path: Path, duration: float) -> None:
  sample_rate = 48000
  count = int(duration * sample_rate)
  timeline = np.arange(count, dtype=np.float64) / sample_rate
  audio = .035 * np.sin(2 * np.pi * 55 * timeline) * (.65 + .35 * np.sin(2 * np.pi * .24 * timeline))
  audio += .018 * np.sin(2 * np.pi * 110 * timeline)
  random = np.random.default_rng(44)
  for at in [.15, 3.05, 6.4, 9.9, 13.2, 16.6, 20.25, 22.6]:
    start = int(at * sample_rate)
    length = min(int(.44 * sample_rate), count - start)
    local = np.arange(length) / sample_rate
    audio[start:start + length] += (.11 * np.sin(2 * np.pi * 72 * local) + .045 * random.normal(size=length)) * np.exp(-local * 10)
  for at in np.arange(6.7, 9.6, .7):
    start = int(at * sample_rate)
    length = min(int(.08 * sample_rate), count - start)
    local = np.arange(length) / sample_rate
    audio[start:start + length] += .04 * np.sin(2 * np.pi * 950 * local) * np.exp(-local * 50)
  audio = np.tanh(audio * 2.2) * .38
  stereo = np.stack([audio, audio], axis=1)
  pcm = (np.clip(stereo, -1, 1) * 32767).astype(np.int16)
  with wave.open(str(path), 'wb') as handle:
    handle.setnchannels(2)
    handle.setsampwidth(2)
    handle.setframerate(sample_rate)
    handle.writeframes(pcm.tobytes())


def render_video(output: Path, width: int, height: int, claims: dict[str, int], url: str, crf: int = 24) -> None:
  output.parent.mkdir(parents=True, exist_ok=True)
  qr = make_qr(url)
  with tempfile.TemporaryDirectory(prefix='local-ai-os-promo-') as temp_dir:
    audio_path = Path(temp_dir) / 'sound.wav'
    build_audio(audio_path, DURATION)
    command = [
      'ffmpeg', '-y', '-loglevel', 'error',
      '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{width}x{height}', '-r', str(FPS), '-i', '-',
      '-i', str(audio_path), '-c:v', 'libx264', '-preset', 'medium', '-crf', str(crf), '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '112k', '-shortest', str(output),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    if process.stdin is None:
      raise SystemExit('ffmpeg stdin unavailable')
    for frame_index in range(int(DURATION * FPS)):
      process.stdin.write(render_frame(width, height, frame_index / FPS, claims, qr).tobytes())
    process.stdin.close()
    if process.wait() != 0:
      raise SystemExit('ffmpeg render failed')


def main() -> None:
  manifest, _, claims = load_contract()
  parser = argparse.ArgumentParser()
  parser.add_argument('--format', choices=('landscape', 'vertical', 'all'), default='all')
  parser.add_argument('--output-dir', type=Path, default=ROOT / '.generated/promo')
  parser.add_argument('--crf', type=int, default=24)
  args = parser.parse_args()
  args.output_dir.mkdir(parents=True, exist_ok=True)
  url = manifest['publicUrl']
  if args.format in ('landscape', 'all'):
    render_video(args.output_dir / 'local-ai-os-promo-16x9.mp4', 1280, 720, claims, url, args.crf)
  if args.format in ('vertical', 'all'):
    render_video(args.output_dir / 'local-ai-os-promo-9x16.mp4', 1080, 1920, claims, url, args.crf)
  print(f"Rendered proof-backed promo to {args.output_dir}")


if __name__ == '__main__':
  main()
