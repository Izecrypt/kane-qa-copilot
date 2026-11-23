#!/usr/bin/env python3
"""Assembles the QA Copilot demo video from real captured frames + TTS narration.
Ken Burns zoom on static images, a pulsing cycle for the two "running" waits,
drawtext captions timed per segment, narration muxed with small silence gaps.
"""
import json
import subprocess
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
FRAMES = os.path.join(ROOT, "frames")
AUDIO = os.path.join(ROOT, "audio")
WORK = os.path.join(ROOT, "work")
os.makedirs(WORK, exist_ok=True)

W, H, FPS = 1280, 800, 25
GAP = 0.5  # seconds of silence between segments

with open(os.path.join(ROOT, "subtitles_text.json")) as f:
    CAPTIONS = {s["id"]: s["text"] for s in json.load(f)}

def dur(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
        capture_output=True, text=True, check=True,
    )
    return float(out.stdout.strip())

# (segment_id, kind, payload, zoom_start, zoom_end)
# kind: "zoom" -> single image Ken Burns; "cycle" -> list of images pulsed in a loop
SEGMENTS = [
    ("01_hook",       "zoom",  "01_homepage_hero.png", 1.00, 1.05),
    ("02_whatitis",   "zoom",  "01_homepage_hero.png", 1.05, 1.14),
    ("03_settingup",  "cross", ["02_form_empty.png", "03_form_filled.png"], None, None),
    ("04_running1",   "cycle", ["04_running1_0.png","04_running1_1.png","04_running1_2.png","04_running1_3.png","04_running1_4.png","04_running1_5.png"], None, None),
    ("05_fail",       "zoom",  "05_fail_card.png", 1.00, 1.10),
    ("06_rewrite",    "zoom",  "05_fail_card.png", 1.10, 1.22),
    ("07_running2",   "cycle", ["06_running2_0.png","06_running2_1.png","06_running2_2.png","06_running2_3.png"], None, None),
    ("08_pass",       "zoom",  "08_pass_bottom.png", 1.00, 1.12),
    ("09_code",       "zoom",  "09_code.png", 1.00, 1.08),
    ("10_close",      "zoom",  "10_closing.png", 1.00, 1.06),
]

audio_durations = {}
for seg_id, *_ in SEGMENTS:
    audio_durations[seg_id] = dur(os.path.join(AUDIO, f"{seg_id}.mp3"))

def make_zoom_clip(out_path, image, duration, z0, z1):
    frames = max(1, round(duration * FPS))
    zexpr = f"{z0}+({z1}-{z0})*on/{frames}"
    vf = (
        f"scale=3840:-1,zoompan=z='{zexpr}':d={frames}:s={W}x{H}:fps={FPS}"
    )
    subprocess.run([
        "ffmpeg", "-y", "-loop", "1", "-i", os.path.join(FRAMES, image),
        "-vf", vf, "-t", str(duration), "-pix_fmt", "yuv420p", out_path,
    ], check=True, capture_output=True)

def make_cross_clip(out_path, images, duration):
    d1 = duration * 0.35
    d2 = duration - d1
    vf = f"scale={W}:{H}"
    # build with xfade between the two stills
    subprocess.run([
        "ffmpeg", "-y",
        "-loop", "1", "-t", str(d1 + 1), "-i", os.path.join(FRAMES, images[0]),
        "-loop", "1", "-t", str(d2 + 1), "-i", os.path.join(FRAMES, images[1]),
        "-filter_complex",
        f"[0:v]scale={W}:{H},setsar=1[a];[1:v]scale={W}:{H},setsar=1[b];"
        f"[a][b]xfade=transition=fade:duration=0.6:offset={d1-0.6}[v]",
        "-map", "[v]", "-t", str(duration), "-pix_fmt", "yuv420p", out_path,
    ], check=True, capture_output=True)

def make_cycle_clip(out_path, images, duration):
    n = len(images)
    per = duration / n
    inputs = []
    for img in images:
        inputs += ["-loop", "1", "-t", str(per), "-i", os.path.join(FRAMES, img)]
    filters = "".join(f"[{i}:v]scale={W}:{H},setsar=1[v{i}];" for i in range(n))
    concat = "".join(f"[v{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=0[v]"
    subprocess.run(
        ["ffmpeg", "-y", *inputs, "-filter_complex", filters + concat, "-map", "[v]",
         "-pix_fmt", "yuv420p", out_path],
        check=True, capture_output=True,
    )

clip_paths = []
timeline = []  # (seg_id, start, end)
t = 0.0
for seg_id, kind, payload, z0, z1 in SEGMENTS:
    d = audio_durations[seg_id]
    out_path = os.path.join(WORK, f"clip_{seg_id}.mp4")
    print(f"building {seg_id} ({kind}, {d:.2f}s)...")
    if kind == "zoom":
        make_zoom_clip(out_path, payload, d, z0, z1)
    elif kind == "cross":
        make_cross_clip(out_path, payload, d)
    elif kind == "cycle":
        make_cycle_clip(out_path, payload, d)
    clip_paths.append(out_path)
    timeline.append((seg_id, t, t + d))
    t += d + GAP

with open(os.path.join(WORK, "timeline.json"), "w") as f:
    json.dump(timeline, f, indent=2)

print("Total timeline length (with gaps):", t - GAP, "seconds")
print("All segment clips built.")
