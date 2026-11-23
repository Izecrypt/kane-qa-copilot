#!/usr/bin/env python3
"""Fast path: build ONE caption-track video (transparent, same timeline as
the base video) by concatenating per-cue alpha clips, then do a SINGLE
overlay pass instead of chaining 35 overlay filters (which was far too slow).
"""
import json
import os
import re
import subprocess
import textwrap

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(ROOT, "work")
CAPDIR = os.path.join(WORK, "captions")
TRACKDIR = os.path.join(WORK, "cap_track")
os.makedirs(CAPDIR, exist_ok=True)
os.makedirs(TRACKDIR, exist_ok=True)

W, H, FPS = 1280, 800, 25

with open(os.path.join(ROOT, "subtitles_text.json")) as f:
    CAPTIONS = {s["id"]: s["text"] for s in json.load(f)}
with open(os.path.join(WORK, "timeline.json")) as f:
    TIMELINE = json.load(f)

FONT_PATH = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT = ImageFont.truetype(FONT_PATH, 27)

def split_sentences(text):
    parts = re.split(r'(?<=[.!?:])\s+', text.strip())
    return [p for p in parts if p]

cues = []
for seg_id, start, end in TIMELINE:
    text = CAPTIONS[seg_id]
    sentences = split_sentences(text)
    total_len = sum(len(s) for s in sentences) or 1
    seg_dur = end - start
    t = start
    for s in sentences:
        frac = len(s) / total_len
        dur = max(1.6, seg_dur * frac)
        cue_end = min(end, t + dur)
        cues.append((t, cue_end, s))
        t = cue_end

print(f"{len(cues)} subtitle cues")

def render_caption(text, out_path):
    lines = textwrap.wrap(text, width=52)[:2]
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    line_h = 36
    total_h = len(lines) * line_h
    pad_x, pad_y = 18, 12
    widths = [draw.textbbox((0, 0), ln, font=FONT)[2] for ln in lines]
    box_w = max(widths) + pad_x * 2
    box_h = total_h + pad_y * 2
    box_x = (W - box_w) // 2
    box_y = H - 120 - box_h
    draw.rounded_rectangle(
        [box_x, box_y, box_x + box_w, box_y + box_h], radius=8,
        fill=(10, 12, 16, 165),
    )
    y = box_y + pad_y
    for ln in lines:
        lw = draw.textbbox((0, 0), ln, font=FONT)[2]
        draw.text(((W - lw) // 2, y), ln, font=FONT, fill=(255, 255, 255, 255))
        y += line_h
    img.save(out_path)

# Blank transparent frame reused for gaps between cues.
blank_path = os.path.join(CAPDIR, "blank.png")
Image.new("RGBA", (W, H), (0, 0, 0, 0)).save(blank_path)

def make_alpha_clip(image_path, duration, out_path):
    subprocess.run([
        "ffmpeg", "-y", "-loop", "1", "-i", image_path,
        "-t", f"{duration:.3f}", "-r", str(FPS),
        "-c:v", "qtrle", "-pix_fmt", "argb",
        out_path,
    ], check=True, capture_output=True)

# Build the full caption-track timeline: blank/cue/blank/cue... matching the
# base video exactly from t=0 to the final timeline end.
track_clips = []
cursor = 0.0
video_end = TIMELINE[-1][2]  # end of last segment, before trailing gap

idx = 0
for start, end, text in cues:
    if start > cursor + 0.01:
        gap_path = os.path.join(TRACKDIR, f"gap_{idx:03d}.mov")
        make_alpha_clip(blank_path, start - cursor, gap_path)
        track_clips.append(gap_path)
    cue_png = os.path.join(CAPDIR, f"cue_{idx:03d}.png")
    render_caption(text, cue_png)
    cue_clip = os.path.join(TRACKDIR, f"cue_{idx:03d}.mov")
    make_alpha_clip(cue_png, end - start, cue_clip)
    track_clips.append(cue_clip)
    cursor = end
    idx += 1
    if idx % 10 == 0:
        print(f"  built {idx}/{len(cues)} cue clips...")

# trailing blank to the end of the video timeline
if video_end > cursor + 0.01:
    tail_path = os.path.join(TRACKDIR, "gap_tail.mov")
    make_alpha_clip(blank_path, video_end - cursor, tail_path)
    track_clips.append(tail_path)

print(f"Concatenating {len(track_clips)} caption-track clips...")
listfile = os.path.join(WORK, "cap_track_concat.txt")
with open(listfile, "w") as f:
    for p in track_clips:
        f.write(f"file '{os.path.abspath(p)}'\n")

cap_track = os.path.join(WORK, "caption_track.mov")
subprocess.run(
    ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", listfile, "-c", "copy", cap_track],
    check=True, capture_output=True,
)
print("Caption track built:", cap_track)

# Single overlay pass + audio mux.
cmd = [
    "ffmpeg", "-y",
    "-i", os.path.join(WORK, "video_concat.mp4"),
    "-i", cap_track,
    "-i", os.path.join(WORK, "audio_concat.mp3"),
    "-filter_complex", "[0:v][1:v]overlay=0:0:shortest=1[v]",
    "-map", "[v]", "-map", "2:a",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium",
    "-c:a", "aac", "-b:a", "160k",
    "-shortest",
    os.path.join(ROOT, "qa_copilot_demo.mp4"),
]
print("Running single-overlay final mux...")
res = subprocess.run(cmd, capture_output=True, text=True)
if res.returncode != 0:
    print("FFMPEG STDERR TAIL:\n", res.stderr[-4000:])
    raise SystemExit(1)
print("DONE:", os.path.join(ROOT, "qa_copilot_demo.mp4"))
