// CSV reader (RFC 4180: quoted fields, "" escapes, line breaks inside quotes, BOM, , or ; separator).
// Returns rows as objects keyed by the header row.
export function parseCsv(text) {
  const src = text.replace(/^\uFEFF/, "");
  const firstLine = src.slice(0, src.indexOf("\n") >>> 0);
  const sep = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ";" : ",";
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((x) => x !== "")) rows.push(row);
  const [head = [], ...body] = rows;
  const keys = head.map((h) => h.trim());
  return { headers: keys, rows: body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()]))) };
}
