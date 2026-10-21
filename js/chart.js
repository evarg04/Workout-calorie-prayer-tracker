// Small dependency-free SVG line chart with a crosshair tooltip.
// series: [{ name, points: [{ x: Date, y }], kind: "line" | "dots", cls }]
// ref: optional { y, label } horizontal reference line (e.g. goal weight)

const NS = "http://www.w3.org/2000/svg";
const el = (tag, attrs = {}) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};

export function lineChart(container, { series, ref, unit = "", height = 180 }) {
  container.replaceChildren();
  const all = series.flatMap((s) => s.points);
  if (all.length < 2) {
    const p = document.createElement("p");
    p.className = "muted small";
    p.textContent = "Not enough data yet — log a few more days.";
    container.append(p);
    return;
  }
  const width = Math.max(280, container.clientWidth || 320);
  const pad = { l: 40, r: 12, t: 12, b: 24 };
  const xs = all.map((p) => +p.x);
  const ys = all.map((p) => p.y).concat(ref ? [ref.y] : []);
  let [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  if (x0 === x1) x1 = x0 + 86400000;
  let [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  const span = y1 - y0 || 1;
  y0 -= span * 0.1; y1 += span * 0.1;
  const X = (v) => pad.l + ((v - x0) / (x1 - x0)) * (width - pad.l - pad.r);
  const Y = (v) => pad.t + (1 - (v - y0) / (y1 - y0)) * (height - pad.t - pad.b);

  const svg = el("svg", { viewBox: `0 0 ${width} ${height}`, width, height, class: "chart", role: "img" });
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const v = y0 + ((y1 - y0) * i) / ticks;
    svg.append(el("line", { x1: pad.l, x2: width - pad.r, y1: Y(v), y2: Y(v), class: "grid" }));
    const t = el("text", { x: pad.l - 6, y: Y(v) + 4, class: "axis", "text-anchor": "end" });
    t.textContent = Math.round(v);
    svg.append(t);
  }
  const fmt = (ms) => new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  [x0, x1].forEach((v, i) => {
    const t = el("text", { x: X(v), y: height - 6, class: "axis", "text-anchor": i ? "end" : "start" });
    t.textContent = fmt(v);
    svg.append(t);
  });

  if (ref) {
    svg.append(el("line", { x1: pad.l, x2: width - pad.r, y1: Y(ref.y), y2: Y(ref.y), class: "ref" }));
    const t = el("text", { x: width - pad.r, y: Y(ref.y) - 4, class: "axis", "text-anchor": "end" });
    t.textContent = ref.label;
    svg.append(t);
  }

  for (const s of series) {
    const pts = [...s.points].sort((a, b) => a.x - b.x);
    if (s.kind === "dots") {
      pts.forEach((p) => svg.append(el("circle", { cx: X(+p.x), cy: Y(p.y), r: 3, class: `dot ${s.cls || ""}` })));
    } else {
      const d = pts.map((p, i) => `${i ? "L" : "M"}${X(+p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join("");
      svg.append(el("path", { d, class: `line ${s.cls || ""}` }));
    }
  }

  // Crosshair + tooltip, snapping to the nearest date that has data.
  const hair = el("line", { y1: pad.t, y2: height - pad.b, class: "hair", visibility: "hidden" });
  svg.append(hair);
  const tip = document.createElement("div");
  tip.className = "tip";
  tip.hidden = true;
  const dates = [...new Set(xs)].sort((a, b) => a - b);
  const move = (ev) => {
    const r = svg.getBoundingClientRect();
    const px = ((ev.clientX - r.left) / r.width) * width;
    const nearest = dates.reduce((best, d) => (Math.abs(X(d) - px) < Math.abs(X(best) - px) ? d : best), dates[0]);
    hair.setAttribute("x1", X(nearest));
    hair.setAttribute("x2", X(nearest));
    hair.setAttribute("visibility", "visible");
    tip.replaceChildren();
    const head = document.createElement("div");
    head.className = "tip-date";
    head.textContent = fmt(nearest);
    tip.append(head);
    for (const s of series) {
      const p = s.points.find((q) => +q.x === nearest);
      if (!p) continue;
      const row = document.createElement("div");
      const key = document.createElement("span");
      key.className = `tip-key ${s.cls || ""}`;
      const val = document.createElement("strong");
      val.textContent = `${Math.round(p.y * 10) / 10}${unit}`;
      row.append(key, val, document.createTextNode(` ${s.name}`));
      tip.append(row);
    }
    tip.hidden = false;
    const left = (X(nearest) / width) * r.width;
    tip.style.left = `${Math.min(Math.max(left, 60), r.width - 60)}px`;
  };
  const leave = () => { hair.setAttribute("visibility", "hidden"); tip.hidden = true; };
  svg.addEventListener("pointermove", move);
  svg.addEventListener("pointerdown", move);
  svg.addEventListener("pointerleave", leave);

  const wrap = document.createElement("div");
  wrap.className = "chart-wrap";
  wrap.append(svg, tip);
  container.append(wrap);

  if (series.length > 1) {
    const legend = document.createElement("div");
    legend.className = "legend";
    for (const s of series) {
      const item = document.createElement("span");
      const key = document.createElement("span");
      key.className = `tip-key ${s.cls || ""}`;
      item.append(key, document.createTextNode(s.name));
      legend.append(item);
    }
    container.append(legend);
  }
}
