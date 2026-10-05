// Line chart of one value over time (exercise progress, a body measurement). Loaded on demand:
// recharts is most of the bundle and only these two screens need it.
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const AXIS = { tick: { fill: "#a3a3a3", fontSize: 11 }, axisLine: false, tickLine: false };
const ACCENT = "var(--color-accent-400)";

// points: [{ date: label, v: number }]; unit: tooltip label
export default function TrendChart({ points, unit }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="#262626" vertical={false} />
        <XAxis dataKey="date" {...AXIS} />
        <YAxis {...AXIS} domain={["auto", "auto"]} />
        <Tooltip contentStyle={{ background: "#171717", border: "none", borderRadius: 8 }} labelStyle={{ color: "#a3a3a3" }} />
        <Line type="monotone" dataKey="v" name={unit} stroke={ACCENT} strokeWidth={2.5} dot={{ r: 3, fill: ACCENT }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
