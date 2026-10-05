// Line chart of one value over time (exercise progress, a body measurement). Loaded on demand:
// recharts is most of the bundle and only these two screens need it.
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const AXIS = { tick: { fill: "#a3a3a3", fontSize: 11 }, axisLine: false, tickLine: false };
const ACCENT = "var(--color-accent-400)";

const fmtDay = (t) => new Date(t).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
const fmtMonth = (t) => new Date(t).toLocaleDateString("ru-RU", { month: "short", year: "2-digit" });

// points: [{ t: epoch ms, v: number }] on a real time axis (gaps between sessions stay visible); unit: tooltip label
export default function TrendChart({ points, unit }) {
  const span = points.length ? points[points.length - 1].t - points[0].t : 0;
  const tick = span > 120 * 864e5 ? fmtMonth : fmtDay;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points} accessibilityLayer={false} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="#262626" vertical={false} />
        <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={tick} minTickGap={24} {...AXIS} />
        <YAxis {...AXIS} domain={["auto", "auto"]} />
        <Tooltip contentStyle={{ background: "#171717", border: "none", borderRadius: 8 }} labelStyle={{ color: "#a3a3a3" }}
          labelFormatter={(t) => new Date(t).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })} />
        <Line type="linear" dataKey="v" name={unit} stroke={ACCENT} strokeWidth={2.5} isAnimationActive={false}
          dot={points.length > 40 ? false : { r: 3, fill: ACCENT }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
