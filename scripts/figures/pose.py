# Pose math from Open Exercise Figures (https://github.com/AbanoubAmir/open-exercise-figures), MIT No Attribution
# (LICENSE-MIT-0.txt): reads a figure file (figures/*.json, templates/*.json), solves the joints of a pose and places
# its equipment. Kept as published, except that Pillow is only needed for its own WebP rendering, which build.py
# does not use.
"""Render exercise figure files (figures/*.json) to looping animated WebP.

A figure file describes a mannequin in side or front view as a few key poses
plus the equipment it holds. Angles are absolute, in degrees, per segment:
0 points up, 90 points the way the figure faces, 180 points down, 270 back.

    python3 render.py figures/a.json figures/b.json   # into out/, plus out/sheet.png

build.py renders the whole exercise library.
"""

import json
import math
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:  # build.py draws SVG itself
    Image = ImageDraw = None

ROOT = Path(__file__).parent
SIZE = 400
SCALE = 3  # supersampling for smooth edges
FPS = 15
FRAMES_PER_MOVE = 14
HOLD_FRAMES = 3

BG = (244, 244, 247)
FLOOR = (214, 216, 224)
BODY = (43, 47, 58)
BODY_FAR = (138, 144, 160)
MUSCLE = (255, 61, 87)
MUSCLE_FAR = (255, 154, 168)
IRON = (31, 34, 41)
STEEL = (110, 116, 130)
PAD = (201, 204, 214)
FRAME = (160, 165, 178)
BAND = (255, 138, 61)

# Segment lengths and thickness in metres for a 1.75 m figure.
LEN = {"torso": 0.52, "neck": 0.10, "upperArm": 0.30, "forearm": 0.25, "hand": 0.09,
       "thigh": 0.44, "shin": 0.43, "foot": 0.17}
WIDTH = {"torso": 0.28, "neck": 0.09, "upperArm": 0.115, "forearm": 0.095, "hand": 0.075,
         "thigh": 0.165, "shin": 0.125, "foot": 0.085}
HEAD_R = 0.115
HIP_HALF = 0.09  # front view: half the distance between hip joints
SHOULDER_HALF = 0.17

# Where each target muscle sits: segment, which face (+1 front, -1 back,
# 0 centred), position along the segment and length as fractions.
MUSCLES = {
    "biceps": ("upperArm", 1, 0.55, 0.6), "triceps": ("upperArm", -1, 0.5, 0.65),
    "forearms": ("forearm", 0, 0.35, 0.6), "delts": ("upperArm", 0, 0.12, 0.35),
    "pectorals": ("torso", 1, 0.78, 0.32), "serratus anterior": ("torso", 1, 0.62, 0.25),
    "abs": ("torso", 1, 0.35, 0.45), "lats": ("torso", -1, 0.62, 0.4),
    "upper back": ("torso", -1, 0.8, 0.3), "traps": ("torso", -1, 0.95, 0.22),
    "spine": ("torso", -1, 0.25, 0.4), "glutes": ("torso", -1, 0.02, 0.22),
    "quads": ("thigh", 1, 0.5, 0.75), "hamstrings": ("thigh", -1, 0.5, 0.75),
    "adductors": ("thigh", 0, 0.3, 0.5), "abductors": ("thigh", 0, 0.15, 0.4),
    "calves": ("shin", -1, 0.3, 0.5), "levator scapulae": ("neck", 0, 0.5, 1.0),
}

SIDES = ("near", "far")


def unit(angle):
    a = math.radians(angle)
    return math.sin(a), math.cos(a)


def side_pair(value):
    """`[a, b]` applies to both sides; `{"near": [...], "far": [...]}` splits them."""
    if isinstance(value, dict):
        return value["near"], value.get("far", value["near"])
    return value, value


def solve(pose, view):
    """Forward kinematics from the hip; returns joint positions."""
    torso = pose.get("torso", 0)
    head = pose.get("head", torso)
    neck = pose.get("neck", head)
    arms = side_pair(pose.get("arms", [180, 180]))
    legs = side_pair(pose.get("legs", [180, 180, 95]))
    short = pose.get("shorten", {})
    seg = {k: v * short.get(k, 1) for k, v in LEN.items()}
    j = {"hip": (0.0, 0.0)}
    dx, dy = unit(torso)
    j["shoulder"] = (dx * seg["torso"], dy * seg["torso"])
    nx, ny = unit(neck)
    j["neckTop"] = (j["shoulder"][0] + nx * seg["neck"], j["shoulder"][1] + ny * seg["neck"])
    hx, hy = unit(head)
    j["head"] = (j["neckTop"][0] + hx * HEAD_R * 0.8, j["neckTop"][1] + hy * HEAD_R * 0.8)
    # The face looks the way the head's "forward" points (side view only).
    fx, fy = unit(head + 90)
    j["face"] = (j["head"][0] + fx * HEAD_R * 0.95, j["head"][1] + fy * HEAD_R * 0.95)
    for side, arm, leg in zip(SIDES, arms, legs):
        if view == "front":
            # Near = the figure's left, drawn on the viewer's right.
            sign = 1 if side == "near" else -1
            px, py = dy * SHOULDER_HALF * sign, -dx * SHOULDER_HALF * sign
            hipx, hipy = dy * HIP_HALF * sign, -dx * HIP_HALF * sign
            mirror = (lambda a: a) if side == "near" else (lambda a: -a)
        else:
            px = py = hipx = hipy = 0.0
            mirror = lambda a: a
        s = (j["shoulder"][0] + px, j["shoulder"][1] + py)
        j[f"{side}Shoulder"] = s
        e = add(s, unit(mirror(arm[0])), seg["upperArm"])
        j[f"{side}Elbow"] = e
        w = add(e, unit(mirror(arm[1])), seg["forearm"])
        j[f"{side}Wrist"] = w
        hand = arm[2] if len(arm) > 2 else arm[1]
        j[f"{side}Hand"] = add(w, unit(mirror(hand)), seg["hand"])
        h = (hipx, hipy)
        j[f"{side}Hip"] = h
        k = add(h, unit(mirror(leg[0])), seg["thigh"])
        j[f"{side}Knee"] = k
        a = add(k, unit(mirror(leg[1])), seg["shin"])
        j[f"{side}Ankle"] = a
        foot = leg[2] if len(leg) > 2 else 95
        # Seen from the front a foot points at the viewer, so it looks short.
        foot_len = seg["foot"] * (0.45 if view == "front" else 1)
        j[f"{side}Toe"] = add(a, unit(mirror(foot)), foot_len)
    return j


def add(p, d, length):
    return p[0] + d[0] * length, p[1] + d[1] * length


def anchored(joints, anchor):
    """Translate so the anchor joint lands on its fixed world point."""
    name, at = anchor
    ax, ay = joints[name]
    return {k: (x - ax + at[0], y - ay + at[1]) for k, (x, y) in joints.items()}


def lerp_angle(a, b, t):
    d = (b - a + 180) % 360 - 180
    return a + d * t


def lerp_pose(p, q, t):
    out = {}
    for key in set(p) | set(q):
        a, b = p.get(key, q.get(key)), q.get(key, p.get(key))
        if key == "lift":
            out[key] = a + (b - a) * t
        elif key == "shorten":
            out[key] = lerp_linear(a, b, t, 1)
        elif key == "props":
            out[key] = [lerp_linear(x, y, t, None) for x, y in zip(a, b)]
        else:
            out[key] = lerp_value(a, b, t)
    return out


def lerp_linear(a, b, t, default):
    """Plain (not angular) blend of two {name: number or [numbers]} maps."""
    out = {}
    for k in set(a) | set(b):
        x, y = a.get(k, default), b.get(k, default)
        if x is None or y is None:
            out[k] = x if y is None else y
        elif isinstance(x, list):
            out[k] = [u + (v - u) * t for u, v in zip(x, y)]
        elif isinstance(x, (int, float)) and isinstance(y, (int, float)):
            out[k] = x + (y - x) * t
        else:
            out[k] = x if t < 0.5 else y
    return out


def lerp_value(a, b, t):
    if isinstance(a, (int, float)):
        return lerp_angle(a, b, t)
    if isinstance(a, dict) or isinstance(b, dict):
        an, af = side_pair(a)
        bn, bf = side_pair(b)
        return {"near": lerp_value(an, bn, t), "far": lerp_value(af, bf, t)}
    return [lerp_angle(x, y, t) for x, y in zip(a, b)]


def complete(pose, fig):
    """Spell out the defaults, so a pose that leaves a key out animates to the
    default (or the equipment's own value) instead of borrowing its neighbour's."""
    head = pose.get("head", pose.get("torso", 0))
    items = fig.get("equipment", [])
    moved = [set() for _ in items]
    for other in fig["poses"]:
        for keys, override in zip(moved, other.get("props", [])):
            keys.update(override)
    own = pose.get("props", [])
    props = [{**{k: item[k] for k in keys if k in item}, **(own[i] if i < len(own) else {})}
             for i, (item, keys) in enumerate(zip(items, moved))]
    return {"lift": 0, "shorten": {}, **pose, "head": head, "neck": pose.get("neck", head), "props": props}


def timeline(fig):
    """Pose for every frame: ease between keys, hold at each, loop back."""
    keys = [complete(pose, fig) for pose in fig["poses"]]
    frames = []
    loop = keys + [keys[0]] if len(keys) > 1 else keys
    for i in range(len(loop) - 1):
        frames += [keys[i]] * HOLD_FRAMES
        for f in range(FRAMES_PER_MOVE):
            t = (1 - math.cos(math.pi * (f + 1) / (FRAMES_PER_MOVE + 1))) / 2
            frames.append(lerp_pose(loop[i], loop[i + 1], t))
    return frames or keys


class Canvas:
    def __init__(self, box):
        self.img = Image.new("RGB", (SIZE * SCALE, SIZE * SCALE), BG)
        self.d = ImageDraw.Draw(self.img)
        (x0, y0), (x1, y1) = box
        margin = 0.1
        span = max(x1 - x0, y1 - y0) * (1 + 2 * margin)
        self.k = SIZE * SCALE / span
        self.cx, self.cy = (x0 + x1) / 2, (y0 + y1) / 2

    def pt(self, p):
        return ((p[0] - self.cx) * self.k + SIZE * SCALE / 2,
                SIZE * SCALE / 2 - (p[1] - self.cy) * self.k)

    def capsule(self, a, b, width, color):
        a, b = self.pt(a), self.pt(b)
        w = width * self.k
        self.d.line([a, b], fill=color, width=round(w))
        for p in (a, b):
            self.d.ellipse([p[0] - w / 2, p[1] - w / 2, p[0] + w / 2, p[1] + w / 2], fill=color)

    def circle(self, c, r, color, outline=None):
        c = self.pt(c)
        r *= self.k
        self.d.ellipse([c[0] - r, c[1] - r, c[0] + r, c[1] + r], fill=color, outline=outline,
                       width=round(0.012 * self.k) if outline else 0)

    def line(self, a, b, width, color):
        self.d.line([self.pt(a), self.pt(b)], fill=color, width=max(1, round(width * self.k)))

    def poly(self, pts, color):
        self.d.polygon([self.pt(p) for p in pts], fill=color)

    def rect(self, center, w, h, angle, color):
        dx, dy = unit(angle)  # long axis
        nx, ny = dy, -dx
        cx, cy = center
        pts = [(cx + dx * w / 2 * sx + nx * h / 2 * sy, cy + dy * w / 2 * sx + ny * h / 2 * sy)
               for sx, sy in ((1, 1), (1, -1), (-1, -1), (-1, 1))]
        self.poly(pts, color)

    def done(self):
        return self.img.resize((SIZE, SIZE), Image.LANCZOS)


SEGMENTS = [("upperArm", "Shoulder", "Elbow"), ("forearm", "Elbow", "Wrist"),
            ("thigh", "Hip", "Knee"), ("shin", "Knee", "Ankle"), ("foot", "Ankle", "Toe")]


def segment_ends(j, seg, side):
    if seg == "torso":
        return j["hip"], j["shoulder"]
    if seg == "neck":
        return j["shoulder"], j["neckTop"]
    for name, a, b in SEGMENTS:
        if name == seg:
            return j[side + a], j[side + b]
    raise KeyError(seg)


def draw_muscle(c, j, muscle, side, view, color):
    seg, face, at, length = MUSCLES[muscle]
    a, b = segment_ends(j, seg, side)
    if seg == "torso" and view == "front":
        face = 0
    vx, vy = b[0] - a[0], b[1] - a[1]
    n = math.hypot(vx, vy) or 1
    ux, uy = vx / n, vy / n
    # Front of a segment: for the torso it's the facing side; limbs hang so
    # their front is the facing side when pointing down.
    nx, ny = (uy, -ux) if seg == "torso" else (-uy, ux)
    width = WIDTH[seg]
    off = face * width * 0.22
    mid = (a[0] + vx * at + nx * off, a[1] + vy * at + ny * off)
    half = n * length / 2
    p = (mid[0] - ux * half, mid[1] - uy * half)
    q = (mid[0] + ux * half, mid[1] + uy * half)
    c.capsule(p, q, width * (0.55 if face else 0.7), color)


HELD_DEFAULT = {"barbell": ["nearHand"], "bar": ["nearHand"], "medicineBall": ["nearHand"],
                "plate": ["nearHand"]}
FIXED = ("bench", "box", "ball", "bosu", "roller", "pullupBar", "parallelBars", "rails", "pad", "wall", "sled")
CONNECTORS = ("cable", "band", "lever", "rope")


def where(j, value):
    """A prop position is a world point [x, y] or a joint name it follows."""
    return j[value] if isinstance(value, str) else tuple(value)


def equipment(fig, pose):
    """The figure's equipment with this pose's `props` overrides applied (by index)."""
    items = [dict(item) for item in fig.get("equipment", [])]
    for item, override in zip(items, pose.get("props", [])):
        item.update(override or {})
    return items


def draw_equipment(c, j, fig, layer, view):
    for item in fig.get("equipment", []):
        kind = item["type"]
        if kind in FIXED:
            if layer == "back":
                draw_fixed(c, j, item)
            continue
        if kind in CONNECTORS:
            if layer == "back":
                draw_connector(c, j, item)
            continue
        joints = item.get("on", HELD_DEFAULT.get(kind, ["nearHand", "farHand"]))
        for name in joints:
            far = name.startswith("far")
            if (layer == "far") != far or layer == "back":
                continue
            draw_held(c, j, item, kind, j[name], view)


def draw_held(c, j, item, kind, w, view):
    if kind in ("barbell", "bar") and view == "front":
        mid = ((j["nearHand"][0] + j["farHand"][0]) / 2, (j["nearHand"][1] + j["farHand"][1]) / 2)
        half = item.get("half", 0.75 if kind == "barbell" else 0.6)
        c.line((mid[0] - half, mid[1]), (mid[0] + half, mid[1]), 0.03, STEEL)
        if kind == "barbell":
            for sx in (-1, 1):
                c.rect((mid[0] + sx * (half - 0.06), mid[1]), 0.08, 0.42, 0, IRON)
    elif kind == "barbell":
        c.circle(w, item.get("r", 0.21), IRON)
        c.circle(w, 0.035, STEEL)
    elif kind == "bar":
        c.circle(w, 0.04, STEEL)
    elif kind == "dumbbell":
        if view == "front" and "axis" in item:
            c.rect(w, 0.26, 0.1, item["axis"], IRON)
        else:
            c.circle(w, 0.075, IRON)
            c.circle(w, 0.03, STEEL)
    elif kind == "kettlebell":
        c.line(w, (w[0], w[1] - 0.06), 0.03, IRON)
        c.circle((w[0], w[1] - 0.13), 0.1, IRON)
    elif kind == "plate":
        c.circle(w, item.get("r", 0.16), IRON)
        c.circle(w, 0.03, STEEL)
    elif kind == "medicineBall":
        c.circle(w, 0.13, (92, 74, 66))
    elif kind == "handle":
        c.circle(w, 0.035, IRON)
    elif kind == "hanging":
        # A weight hanging on a strap or chain: head harness, dip belt, wrist roller.
        low = (w[0], w[1] - item.get("chain", 0.3))
        c.line(w, low, 0.016, STEEL)
        c.circle(low, item.get("r", 0.1), IRON)
        c.circle(low, 0.025, STEEL)


def draw_connector(c, j, item):
    kind = item["type"]
    start = where(j, item["from"])
    for name in item.get("on", ["nearHand"]):
        end = j[name]
        if kind == "lever":
            c.line(start, end, 0.05, STEEL)
            c.circle(end, 0.045, IRON)
        elif kind == "band":
            c.line(start, end, 0.02, BAND)
        else:  # cable or rope
            c.line(start, end, 0.016, STEEL)
            c.circle(end, 0.035, IRON)
    if kind in ("cable", "lever", "rope"):
        c.circle(start, 0.05, IRON)


def draw_fixed(c, j, item):
    kind = item["type"]
    at = where(j, item["at"]) if "at" in item else (0, 0)
    x, y = at
    if kind == "bench":
        draw_bench(c, item, at)
    elif kind == "pullupBar":
        c.line((x - 0.45, y), (x + 0.45, y), 0.04, STEEL)
        for px in (x - 0.45, x + 0.45):
            c.line((px, y), (px, y + 0.25), 0.04, FRAME)
    elif kind == "parallelBars":
        c.line((x - 0.3, y), (x + 0.3, y), 0.05, STEEL)
        for px in (x - 0.25, x + 0.25):
            c.line((px, y), (px, 0), 0.04, FRAME)
    elif kind == "rails":
        c.line((x, 0), (x, item.get("h", 2.2)), 0.04, FRAME)
    elif kind == "wall":
        c.line((x, 0), (x, item.get("h", 2.3)), 0.05, FRAME)
    elif kind == "ball":
        c.circle(at, item.get("r", 0.33), (124, 163, 222))
    elif kind == "bosu":
        r = item.get("r", 0.3)
        c.d.chord([*c.pt((x - r, y + r)), *c.pt((x + r, y - r))], 180, 360, fill=(124, 163, 222))
    elif kind == "roller":
        c.circle(at, item.get("r", 0.08), BAND)
    elif kind in ("box", "sled"):
        w, h = item.get("w", 0.5), item.get("h", 0.45)
        color = PAD if kind == "box" else STEEL
        c.poly([(x - w / 2, y), (x + w / 2, y), (x + w / 2, y + h), (x - w / 2, y + h)], color)
    elif kind == "pad":
        c.rect(at, item.get("w", 0.35), item.get("h", 0.12), item.get("angle", 90), PAD)


def draw_bench(c, item, at):
    x, y = at
    length = item.get("length", 1.2)
    angle = item.get("angle", 90)  # 90 = flat, pointing the way the figure faces
    c.rect((x, y), length, 0.09, angle, PAD)
    dx, dy = unit(angle)
    for t in (-0.38, 0.38):
        px, py = x + dx * length * t, y + dy * length * t
        if py > 0.05:
            c.line((px, py), (px, 0), 0.045, FRAME)


def draw_figure(c, j, fig):
    view = fig.get("view", "side")
    muscles = [m for m in fig.get("muscles", []) if m in MUSCLES]
    c.line((-5, 0), (5, 0), 0.012, FLOOR)
    draw_equipment(c, j, fig, "back", view)

    def limbs(side, color, mcolor):
        for seg, a, b in [("thigh", "Hip", "Knee"), ("shin", "Knee", "Ankle"), ("foot", "Ankle", "Toe"),
                          ("upperArm", "Shoulder", "Elbow"), ("forearm", "Elbow", "Wrist"),
                          ("hand", "Wrist", "Hand")]:
            c.capsule(j[side + a], j[side + b], WIDTH[seg], color)
        for m in muscles:
            if MUSCLES[m][0] not in ("torso", "neck"):
                draw_muscle(c, j, m, side, view, mcolor)

    front = view == "front"
    limbs("far", BODY if front else BODY_FAR, MUSCLE if front else MUSCLE_FAR)
    draw_equipment(c, j, fig, "far", view)
    c.capsule(j["shoulder"], j["neckTop"], WIDTH["neck"], BODY)
    c.capsule(j["hip"], j["shoulder"], WIDTH["torso"], BODY)
    if view == "front":
        c.capsule(j["nearShoulder"], j["farShoulder"], WIDTH["upperArm"], BODY)
        c.capsule(j["nearHip"], j["farHip"], WIDTH["thigh"], BODY)
    c.circle(j["head"], HEAD_R, BODY)
    if view == "side":
        c.circle(j["face"], 0.032, BODY)
    for m in muscles:
        if MUSCLES[m][0] in ("torso", "neck"):
            draw_muscle(c, j, m, "near", view, MUSCLE)
    limbs("near", BODY, MUSCLE)
    draw_equipment(c, j, fig, "front", view)


def pose_joints(fig, pose):
    view = fig.get("view", "side")
    anchor = fig.get("anchor", ["nearAnkle", [0, 0.09]])
    joints = anchored(solve(pose, view), anchor)
    if "contact" in fig:
        joints = pivot_to_contact(joints, anchor[1], *fig["contact"])
    lift = pose.get("lift", 0)
    if lift:
        joints = {k: (x, y + lift) for k, (x, y) in joints.items()}
    return joints


def pivot_to_contact(joints, pivot, name, height):
    """Rotate the figure about the anchor until `name` sits at `height`.

    Lets a pose say "toes and hands on the floor" without solving the body
    angle by hand (push-ups, planks, bridges).
    """
    def rotated(deg):
        r = math.radians(deg)
        cs, sn = math.cos(r), math.sin(r)
        out = {}
        for k, (x, y) in joints.items():
            dx, dy = x - pivot[0], y - pivot[1]
            out[k] = (pivot[0] + dx * cs - dy * sn, pivot[1] + dx * sn + dy * cs)
        return out
    best = min((abs(rotated(d / 4)[name][1] - height), d / 4) for d in range(-360, 361))
    return rotated(best[1])


def bounds(fig, frames):
    xs, ys = [], []
    for pose in frames:
        j = pose_joints(fig, pose)
        for x, y in j.values():
            xs.append(x)
            ys.append(y)
        for item in equipment(fig, pose):
            for key in ("at", "from"):
                if key in item:
                    x, y = where(j, item[key])
                    xs.append(x)
                    ys.append(y)
    pad = 0.25
    return (min(xs) - pad, min(min(ys) - pad, -0.05)), (max(xs) + pad, max(ys) + pad)


def problems(fig):
    """Cheap sanity checks an author should fix before looking at the frames."""
    out = []
    if len(fig.get("poses", [])) < 2:
        out.append("needs at least two poses")
    for i, pose in enumerate(fig.get("poses", [])):
        j = pose_joints(fig, pose)
        low = [k for k, (_, y) in j.items() if y < -0.04]
        if low:
            out.append(f"pose {i}: below the floor: {', '.join(sorted(low))}")
    return out


def load(path, seen=()):
    """Read a figure, merging in the figure it `extends` (path relative to ROOT)."""
    fig = json.loads(Path(path).read_text())
    base = fig.pop("extends", None)
    if base:
        if base in seen:
            raise ValueError(f"extends loop at {base}")
        merged = load(ROOT / base, (*seen, base))
        merged.update(fig)
        return merged
    return fig


def render(fig, only_keys=False):
    """Every animation frame, or just the key poses (fast, for review sheets)."""
    frames = timeline(fig)
    box = bounds(fig, frames)
    images = []
    for pose in fig["poses"] if only_keys else frames:
        c = Canvas(box)
        posed = {**fig, "equipment": equipment(fig, pose)}
        draw_figure(c, pose_joints(posed, pose), posed)
        images.append(c.done())
    return images





def save(images, path):
    images[0].save(path, save_all=True, append_images=images[1:], duration=round(1000 / FPS),
                   loop=0, quality=80, method=6)


def contact_sheet(entries, path, thumb=180):
    """One row per figure: every key pose left to right, labelled."""
    cols = max(len(frames) for _, frames in entries)
    img = Image.new("RGB", (cols * thumb, len(entries) * thumb), (255, 255, 255))
    d = ImageDraw.Draw(img)
    for r, (label, frames) in enumerate(entries):
        for k, im in enumerate(frames):
            img.paste(im.resize((thumb, thumb)), (k * thumb, r * thumb))
        d.text((4, r * thumb + 4), label, fill=(0, 0, 0))
        d.line([(0, r * thumb), (cols * thumb, r * thumb)], fill=(180, 180, 180))
    img.save(path)


def main(argv):
    """Render loose figure files (templates and samples) by path."""
    paths = [Path(a) for a in argv if not a.startswith("--")] or sorted((ROOT / "figures").glob("*.json"))
    out = ROOT / "out"
    out.mkdir(exist_ok=True)
    entries = []
    for path in paths:
        fig = load(path)
        for p in problems(fig):
            print(f"{path}: {p}")
        save(render(fig), out / f"{path.stem}.webp")
        entries.append((path.stem, render(fig, only_keys=True)))
    contact_sheet(entries, out / "sheet.png")
    print(f"rendered {len(entries)} figure(s) into {out}")


if __name__ == "__main__":
    main(sys.argv[1:])
