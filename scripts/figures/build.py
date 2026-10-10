# Draws every built-in exercise as a still SVG figure: src/assets/fig/<exercise id>.svg.
#
#     python3 scripts/figures/build.py            (plain Python 3, no packages)
#
# figures.txt names the Open Exercise Figures pose for each exercise (figures/*.json, CC0); pose.py (MIT-0) solves the
# joints of its last key pose (the worked position: the squat at the bottom, the curl at the top), and the body is drawn
# from parts.py. The SVG has no colours of its own, only classes the app styles (src/index.css): the body `b`, a
# muscle `m m-<id>`, the far limbs `far`, equipment `iron steel pad frame band ball`, the floor `floor`.
import math
import sys
from pathlib import Path

import pose as P
from parts import FRONT, PARTS, smooth

HERE = Path(__file__).parent
OUT = HERE.parent.parent / "src" / "assets" / "fig"


class Svg:
    """The canvas pose.py's equipment drawing writes to: its shapes become SVG elements with a class per colour."""
    COLORS = {P.IRON: "iron", P.STEEL: "steel", P.PAD: "pad", P.FRAME: "frame", P.FLOOR: "floor", P.BAND: "band"}

    def __init__(self, box):
        (x0, y0), (x1, y1) = box
        span = max(x1 - x0, y1 - y0) * 1.04
        self.k = 100 / span
        self.cx, self.cy = (x0 + x1) / 2, (y0 + y1) / 2
        self.out = []

    def pt(self, p):
        return round((p[0] - self.cx) * self.k + 50, 1), round(50 - (p[1] - self.cy) * self.k, 1)

    def cls(self, color):
        return self.COLORS.get(color, "ball")

    def poly(self, pts, color):
        s = " ".join(f"{x},{y}" for x, y in map(self.pt, pts))
        self.out.append(f'<polygon class="{self.cls(color)}" points="{s}"/>')

    def line(self, a, b, width, color):
        (x1, y1), (x2, y2) = self.pt(a), self.pt(b)
        w = max(.4, round(width * self.k, 1))
        self.out.append(f'<line class="{self.cls(color)}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke-width="{w}"/>')

    def circle(self, c, r, color, outline=None):
        x, y = self.pt(c)
        self.out.append(f'<circle class="{self.cls(color)}" cx="{x}" cy="{y}" r="{round(r * self.k, 1)}"/>')

    def capsule(self, a, b, width, color):
        self.line(a, b, width, color)

    def rect(self, center, w, h, angle, color):
        dx, dy = P.unit(angle)
        nx, ny = dy, -dx
        cx, cy = center
        self.poly([(cx + dx * w / 2 * sx + nx * h / 2 * sy, cy + dy * w / 2 * sx + ny * h / 2 * sy)
                   for sx, sy in ((1, 1), (1, -1), (-1, -1), (-1, 1))], color)


def angle(a, b):
    """Direction from joint a to joint b: 0 up, 90 forward (world y up)."""
    return math.degrees(math.atan2(b[0] - a[0], b[1] - a[1]))


def part(c, name, at, ang, cls="", muscles=True, view="side", far=False):
    x, y = c.pt(at)
    if view == "front":
        p = FRONT[name]
        flip = " scale(-1,1)" if far else ""  # x is outward: the far side (the viewer's left) mirrors it
    else:
        p = PARTS[name]
        flip = " scale(-1,1)" if name in ("torso", "neck", "head") else ""  # these point up: their front is the other way
    attr = f' class="{cls}"' if cls else ""
    c.out.append(f'<g{attr} transform="translate({x:.1f},{y:.1f}) rotate({ang + 180:.1f}) scale({c.k / 100:.4f}){flip}">')
    c.out.append(f'<path class="b" d="{smooth(p["o"])}"/>')
    if muscles:
        for m, shapes in p["m"].items():
            for pts in shapes if isinstance(shapes[0], list) else [shapes]:
                c.out.append(f'<path class="m m-{m}" style="fill:var(--m-{m},transparent)" d="{smooth(pts)}"/>')
    c.out.append("</g>")


def limbs(c, j, side, which, view):
    segs = {"leg": [("thigh", "Hip", "Knee"), ("shin", "Knee", "Ankle"), ("foot", "Ankle", "Toe")],
            "arm": [("upperArm", "Shoulder", "Elbow"), ("forearm", "Elbow", "Wrist"), ("hand", "Wrist", "Hand")]}[which]
    front = view == "front"
    cls = "far" if side == "far" and not front else ""  # from the side the far limbs are behind the body: dimmed, no muscles
    for name, a, b in reversed(segs) if which == "leg" else segs:
        part(c, name, j[side + a], angle(j[side + a], j[side + b]), cls, front or side == "near", view, side == "far")


def draw(fig, pose):
    view = fig.get("view", "side")
    # plates a little smaller than pose.py's, so they don't hide the body
    items = [{**it, "r": min(it.get("r", .21), .15)} if it["type"] == "barbell" else it for it in P.equipment(fig, pose)]
    posed = {**fig, "equipment": items}
    j = P.pose_joints(posed, pose)
    xs, ys = [x for x, _ in j.values()], [y for _, y in j.values()]
    c = Svg(((min(xs) - .3, min(min(ys) - .25, -.05)), (max(xs) + .3, max(ys) + .3)))  # framed on the body
    c.line((-5, 0), (5, 0), .012, P.FLOOR)
    P.draw_equipment(c, j, posed, "back", view)
    if view == "front":
        limbs(c, j, "far", "leg", view)
        limbs(c, j, "near", "leg", view)
    else:
        limbs(c, j, "far", "arm", view)
        limbs(c, j, "far", "leg", view)
    P.draw_equipment(c, j, posed, "far", view)
    if view != "front":
        limbs(c, j, "near", "leg", view)
    part(c, "neck", j["shoulder"], angle(j["shoulder"], j["neckTop"]), view=view)
    part(c, "torso", j["hip"], angle(j["hip"], j["shoulder"]), view=view)
    part(c, "head", j["head"], angle(j["neckTop"], j["head"]), view=view)
    if view == "front":
        limbs(c, j, "far", "arm", view)
    limbs(c, j, "near", "arm", view)
    P.draw_equipment(c, j, posed, "front", view)
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="fig">' + "".join(c.out) + "</svg>\n"


def main(only):
    OUT.mkdir(parents=True, exist_ok=True)
    rows = [line.split() for line in (HERE / "figures.txt").read_text().splitlines() if line.strip() and not line.startswith("#")]
    for ex_id, fig_id in rows:
        if only and ex_id not in only:
            continue
        fig = P.load(HERE / "figures" / f"{fig_id}.json")
        for problem in P.problems(fig):
            print(f"{ex_id} ({fig_id}): {problem}")
        (OUT / f"{ex_id}.svg").write_text(draw(fig, P.complete(fig["poses"][-1], fig)))
    print(f"drew {len(rows) if not only else len(only)} figure(s) into {OUT}")


if __name__ == "__main__":
    main(set(sys.argv[1:]))
