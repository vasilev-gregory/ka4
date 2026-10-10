// Field helpers shared by the import parsers: numbers as the set fields keep them, exercise names as the aliases write them.
export const str = (x) => (x == null ? "" : String(Math.round(x * 100) / 100));
// "Squat · Barbell" / "Жим лежа · штанга" → "Squat (Barbell)": the way Hevy and our aliases write equipment
export const exName = (s) => s.replace(/\s*·\s*(.+)$/, " ($1)");
