import { useState, useMemo } from "react";

// ————— Berry design tokens —————
const T = {
  bg: "#FBF4F1", card: "#FFFFFF",
  ink: "#43273A", inkSoft: "#8A6B80",
  berry: "#C2417A", berrySoft: "#F5DCE8",
  sage: "#7FA383", sageSoft: "#E8F0E6",
  gold: "#D9A441", goldSoft: "#F7EDD9",
  iron: "#8B5E7E",
  line: "#F0DFE0",
  mono: "'IBM Plex Mono', 'SF Mono', Menlo, monospace",
  serif: "'Fraunces', Georgia, serif",
  body: "-apple-system, 'SF Pro Text', 'Segoe UI', sans-serif",
};

const CSS = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,500&family=IBM+Plex+Mono:wght@400;500&display=swap');
@keyframes pop { 0%{transform:scale(.92);opacity:.4} 100%{transform:scale(1);opacity:1} }
@keyframes fadeUp { 0%{transform:translateY(6px);opacity:0} 100%{transform:translateY(0);opacity:1} }
* { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
::-webkit-scrollbar { display:none }`;

// ————— Sample data (now with full macros + iron mg) —————
// c=carbs g, f=fat g, fb=fiber g, fe=iron mg
const FREQUENT = [
  { name: "Greek yogurt + honey", cals: 190, protein: 17, c: 24, f: 3, fb: 0, fe: 0.1 },
  { name: "2 eggs, scrambled", cals: 180, protein: 12, c: 1, f: 14, fb: 0, fe: 1.8 },
  { name: "TJ's chicken salad", cals: 260, protein: 22, c: 6, f: 16, fb: 1, fe: 1.0 },
  { name: "Oatmeal + berries", cals: 240, protein: 8, c: 44, f: 4, fb: 7, fe: 2.1 },
  { name: "Spinach salad + citrus", cals: 180, protein: 5, c: 18, f: 10, fb: 5, fe: 3.2 },
  { name: "Apple + almond butter", cals: 200, protein: 5, c: 24, f: 10, fb: 5, fe: 0.7 },
];

const MEALS_SAVED = [
  { name: "Sunday breakfast", desc: "Eggs · sourdough · berries", cals: 420, protein: 22, c: 42, f: 18, fb: 4, fe: 3.1 },
  { name: "Taco night plate", desc: "2 beef tacos · slaw · avocado", cals: 560, protein: 34, c: 40, f: 28, fb: 9, fe: 4.2, ironRich: true },
  { name: "Usual smoothie", desc: "Banana · spinach · whey · almond milk", cals: 310, protein: 28, c: 34, f: 6, fb: 5, fe: 2.4, ironRich: true },
  { name: "Salmon dinner", desc: "Salmon · rice · roasted broccoli", cals: 610, protein: 42, c: 52, f: 22, fb: 6, fe: 1.9 },
];

const FRIDGE = [
  { store: "Costco", items: [
    { name: "Kirkland rotisserie chicken", serv: "3 oz", cals: 140, protein: 19, c: 0, f: 7, fb: 0, fe: 0.9 },
    { name: "Grass-fed ground beef", serv: "4 oz", cals: 280, protein: 22, c: 0, f: 20, fb: 0, fe: 2.6, ironRich: true },
    { name: "Kirkland spinach (frozen)", serv: "1 cup", cals: 45, protein: 5, c: 5, f: 0, fb: 4, fe: 3.7, ironRich: true },
    { name: "Avocados", serv: "½ avocado", cals: 120, protein: 1, c: 6, f: 11, fb: 5, fe: 0.6 },
  ]},
  { store: "Trader Joe's", items: [
    { name: "Chicken salad (deli)", serv: "½ cup", cals: 260, protein: 22, c: 6, f: 16, fb: 1, fe: 1.0 },
    { name: "Organic lentil soup", serv: "1 cup", cals: 160, protein: 9, c: 26, f: 2, fb: 8, fe: 3.3, ironRich: true },
    { name: "Pumpkin seeds", serv: "¼ cup", cals: 180, protein: 9, c: 4, f: 14, fb: 2, fe: 2.5, ironRich: true },
  ]},
  { store: "Whole Foods", items: [
    { name: "365 Greek yogurt, plain", serv: "¾ cup", cals: 130, protein: 16, c: 8, f: 4, fb: 0, fe: 0.1 },
    { name: "Sourdough loaf", serv: "1 slice", cals: 120, protein: 4, c: 23, f: 1, fb: 1, fe: 1.2 },
  ]},
];

const WEIGHTS = [158.2, 157.8, 158.4, 157.5, 157.9, 157.2, 157.0, 157.4, 156.8, 156.9, 156.3, 156.6, 156.1, 155.9];

const INITIAL_LOG = [
  { id: 1, meal: "Breakfast", name: "Greek yogurt + honey", cals: 190, protein: 17, c: 24, f: 3, fb: 0, fe: 0.1, portions: 1 },
  { id: 2, meal: "Breakfast", name: "Oatmeal + berries", cals: 240, protein: 8, c: 44, f: 4, fb: 7, fe: 2.1, portions: 1 },
  { id: 3, meal: "Lunch", name: "TJ's chicken salad", cals: 260, protein: 22, c: 6, f: 16, fb: 1, fe: 1.0, portions: 1 },
  { id: 4, meal: "Lunch", name: "Spinach salad + citrus", cals: 180, protein: 5, c: 18, f: 10, fb: 5, fe: 3.2, portions: 1 },
];

// ~5 weeks of history for the calendar (July 2026; today = 12th)
const HISTORY = {};
const seedDays = [
  // [day, cals, protein, iron, energy 1-3]
  [14,1580,102,11,2],[15,1710,118,14,3],[16,1620,96,9,2],[17,1890,124,16,3],[18,1540,110,12,2],[19,1760,98,8,1],[20,1610,115,15,3],
  [21,1650,108,13,2],[22,1490,92,7,1],[23,1720,121,17,3],[24,1600,105,12,2],[25,1830,130,15,3],[26,1560,99,10,2],[27,1680,112,14,3],
  [28,1590,104,11,2],[29,1740,119,16,3],[30,1520,95,8,1],
];
seedDays.forEach(([d,c,p,fe,e]) => { HISTORY[`2026-06-${String(d).padStart(2,"0")}`] = { cals:c, protein:p, fe, energy:e }; });
const julyDays = [
  [1,1640,110,13,2],[2,1580,102,10,2],[3,1750,125,16,3],[4,1920,115,12,2],[5,1600,108,14,3],
  [6,1550,99,9,1],[7,1690,117,15,3],[8,1620,106,12,2],[9,1710,122,17,3],[10,1480,94,8,1],[11,1660,113,14,3],
];
julyDays.forEach(([d,c,p,fe,e]) => { HISTORY[`2026-07-${String(d).padStart(2,"0")}`] = { cals:c, protein:p, fe, energy:e }; });

const SAMPLE_DAY_ENTRIES = [
  { meal: "Breakfast", name: "Usual smoothie", cals: 310 },
  { meal: "Lunch", name: "Lentil soup + sourdough", cals: 280 },
  { meal: "Lunch", name: "Apple + almond butter", cals: 200 },
  { meal: "Dinner", name: "Salmon dinner", cals: 610 },
  { meal: "Snacks", name: "Pumpkin seeds", cals: 180 },
];

const TOP_FOODS = [
  { name: "Greek yogurt + honey", count: 21 }, { name: "Usual smoothie", count: 16 },
  { name: "TJ's chicken salad", count: 14 }, { name: "Oatmeal + berries", count: 12 },
  { name: "Salmon dinner", count: 9 },
];

const TARGET = { cals: 1650, protein: 115, c: 165, f: 55, fb: 25, fe: 18 };
const MEAL_ORDER = ["Breakfast", "Lunch", "Dinner", "Snacks"];

export default function BerryApp() {
  const [tab, setTab] = useState("today");
  const [view, setView] = useState(null); // null | "history"
  const [log, setLog] = useState(INITIAL_LOG);
  const [expanded, setExpanded] = useState(null);
  const [toast, setToast] = useState(null);
  const [nextId, setNextId] = useState(100);
  const [weightInput, setWeightInput] = useState("");
  const [weights, setWeights] = useState(WEIGHTS);
  const [selDay, setSelDay] = useState("2026-07-09");
  const [energyToday, setEnergyToday] = useState(null);

  const totals = useMemo(() => log.reduce((s, x) => ({
    cals: s.cals + x.cals * x.portions, protein: s.protein + x.protein * x.portions,
    c: s.c + x.c * x.portions, f: s.f + x.f * x.portions,
    fb: s.fb + x.fb * x.portions, fe: s.fe + x.fe * x.portions,
  }), { cals: 0, protein: 0, c: 0, f: 0, fb: 0, fe: 0 }), [log]);
  const remaining = TARGET.cals - totals.cals;

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 1600); };

  const addFood = (food, meal) => {
    const h = new Date().getHours();
    const m = meal || (h < 11 ? "Breakfast" : h < 15 ? "Lunch" : h < 20 ? "Dinner" : "Snacks");
    setLog(l => [...l, { id: nextId, meal: m, portions: 1, ...food }]);
    setNextId(n => n + 1);
    showToast(`Added to ${m.toLowerCase()}`);
  };
  const setPortion = (id, p) => setLog(l => l.map(f => f.id === id ? { ...f, portions: p } : f));
  const removeFood = (id) => { setLog(l => l.filter(f => f.id !== id)); setExpanded(null); };

  const logWeight = () => {
    const w = parseFloat(weightInput);
    if (!w) return;
    setWeights(ws => [...ws.slice(1), w]); setWeightInput(""); showToast("Weight logged");
  };

  const avg7 = (a) => a.slice(-7).reduce((x, y) => x + y, 0) / Math.min(7, a.length);
  const trendNow = avg7(weights), weeklyChange = trendNow - avg7(weights.slice(0, -7));

  // last-14-day averages from HISTORY for macro trends
  const hist14 = Object.entries(HISTORY).slice(-14).map(([, v]) => v);
  const avgOf = (k) => hist14.reduce((s, d) => s + d[k], 0) / hist14.length;
  const ironAvg = avgOf("fe");
  const lowIronLowEnergy = hist14.filter(d => d.fe < 12 && d.energy === 1).length;

  // ————— shared —————
  const Card = ({ children, style }) => (
    <div style={{ background: T.card, borderRadius: 18, border: `1px solid ${T.line}`,
      padding: 16, boxShadow: "0 1px 3px rgba(67,39,58,.04)", ...style }}>{children}</div>
  );
  const SectionLabel = ({ children }) => (
    <div style={{ fontFamily: T.serif, fontStyle: "italic", fontSize: 15, color: T.inkSoft, margin: "18px 2px 8px" }}>{children}</div>
  );
  const MacroBar = ({ label, val, target, color, unit = "g" }) => (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 4 }}>
        <span style={{ color: T.inkSoft, fontWeight: 600 }}>{label}</span>
        <span style={{ fontFamily: T.mono, color: T.ink }}>{Math.round(val)}{unit} <span style={{ color: T.inkSoft }}>/ {target}{unit}</span></span>
      </div>
      <div style={{ height: 6, background: `${color}22`, borderRadius: 5 }}>
        <div style={{ height: 6, width: `${Math.min(100, val / target * 100)}%`, background: color, borderRadius: 5, transition: "width .4s" }} />
      </div>
    </div>
  );

  // ————— Today —————
  const ring = () => {
    const R = 74, C = 2 * Math.PI * R, pct = Math.min(1, totals.cals / TARGET.cals), over = remaining < 0;
    return (
      <svg width="188" height="188" viewBox="0 0 200 200" style={{ display: "block", margin: "0 auto" }}>
        <circle cx="100" cy="100" r={R} fill="none" stroke={T.berrySoft} strokeWidth="10" />
        <circle cx="100" cy="100" r={R} fill="none" stroke={over ? T.gold : T.berry} strokeWidth="10"
          strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)}
          transform="rotate(-90 100 100)" style={{ transition: "stroke-dashoffset .5s ease" }} />
        <text x="100" y="92" textAnchor="middle" style={{ fontFamily: T.serif, fontWeight: 600, fontSize: 40, fill: T.ink }}>
          {Math.abs(remaining).toLocaleString()}</text>
        <text x="100" y="116" textAnchor="middle" style={{ fontFamily: T.body, fontSize: 12, fill: T.inkSoft }}>
          {over ? "over today" : "calories left"}</text>
        <text x="100" y="136" textAnchor="middle" style={{ fontFamily: T.mono, fontSize: 11, fill: T.inkSoft }}>
          {Math.round(totals.cals).toLocaleString()} of {TARGET.cals.toLocaleString()}</text>
      </svg>
    );
  };

  const TodayScreen = () => (
    <div style={{ animation: "fadeUp .25s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 2px 0" }}>
        <div style={{ width: 34 }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 600, color: T.ink }}>Sunday</div>
          <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 2 }}>July 12</div>
        </div>
        <button onClick={() => setView("history")} title="History" style={{
          width: 34, height: 34, borderRadius: 12, border: `1px solid ${T.line}`, background: T.card,
          cursor: "pointer", fontSize: 15, color: T.berry }}>▦</button>
      </div>
      {ring()}

      <Card style={{ padding: "14px 16px 8px", marginTop: -4 }}>
        <MacroBar label="Protein" val={totals.protein} target={TARGET.protein} color={T.sage} />
        <MacroBar label="Carbs" val={totals.c} target={TARGET.c} color={T.gold} />
        <MacroBar label="Fat" val={totals.f} target={TARGET.f} color={T.berry} />
        <div style={{ display: "flex", gap: 14, paddingTop: 4, borderTop: `1px solid ${T.line}`, marginTop: 4 }}>
          <div style={{ fontSize: 11.5, color: T.inkSoft, padding: "7px 0" }}>
            Fiber <span style={{ fontFamily: T.mono, color: T.ink }}>{Math.round(totals.fb)}g</span> / {TARGET.fb}g
          </div>
          <div style={{ fontSize: 11.5, color: T.inkSoft, padding: "7px 0" }}>
            Iron ⚘ <span style={{ fontFamily: T.mono, color: totals.fe >= 12 ? T.sage : T.iron }}>{totals.fe.toFixed(1)}mg</span> / {TARGET.fe}mg
          </div>
        </div>
      </Card>

      <SectionLabel>Your frequents — one tap to log</SectionLabel>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "2px 2px 6px" }}>
        {FREQUENT.map(f => (
          <button key={f.name} onClick={() => addFood(f)} style={{
            border: `1px solid ${T.line}`, background: T.card, color: T.ink, borderRadius: 14,
            padding: "9px 13px", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", cursor: "pointer",
            flexShrink: 0, boxShadow: "0 1px 2px rgba(67,39,58,.05)" }}>
            {f.name} <span style={{ fontFamily: T.mono, color: T.inkSoft, fontSize: 11 }}> {f.cals}</span>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button onClick={() => showToast("Search — in the real app")} style={{
          flex: 1, background: T.berry, color: "#fff", border: "none", borderRadius: 14,
          padding: "12px 0", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: T.body }}>+ Add food</button>
        <button onClick={() => showToast("Copied yesterday's log")} style={{
          flex: 1, background: T.card, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 14,
          padding: "12px 0", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: T.body }}>Copy yesterday</button>
      </div>

      {MEAL_ORDER.map(meal => {
        const items = log.filter(f => f.meal === meal);
        if (!items.length) return null;
        const mealCals = items.reduce((s, f) => s + f.cals * f.portions, 0);
        return (
          <div key={meal}>
            <SectionLabel>{meal} <span style={{ fontFamily: T.mono, fontStyle: "normal", fontSize: 12 }}>· {Math.round(mealCals)} cal</span></SectionLabel>
            <Card style={{ padding: 6 }}>
              {items.map((f, i) => (
                <div key={f.id}>
                  <div onClick={() => setExpanded(expanded === f.id ? null : f.id)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "11px 10px", cursor: "pointer", borderTop: i ? `1px solid ${T.line}` : "none", animation: "pop .2s ease" }}>
                    <div>
                      <div style={{ fontSize: 14, color: T.ink, fontWeight: 500 }}>
                        {f.name}{f.fe >= 2 && <span style={{ color: T.iron, fontSize: 11 }}> ⚘</span>}
                      </div>
                      {f.portions !== 1 && <div style={{ fontSize: 11, color: T.berry, marginTop: 2 }}>{f.portions}× portion</div>}
                    </div>
                    <div style={{ fontFamily: T.mono, fontSize: 13, color: T.inkSoft }}>{Math.round(f.cals * f.portions)}</div>
                  </div>
                  {expanded === f.id && (
                    <div style={{ padding: "0 10px 12px", animation: "fadeUp .2s ease" }}>
                      <div style={{ fontSize: 11, fontFamily: T.mono, color: T.inkSoft, marginBottom: 8 }}>
                        P {Math.round(f.protein * f.portions)}g · C {Math.round(f.c * f.portions)}g · F {Math.round(f.f * f.portions)}g · Fiber {Math.round(f.fb * f.portions)}g · Fe {(f.fe * f.portions).toFixed(1)}mg
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {[0.5, 1, 1.5, 2].map(p => (
                          <button key={p} onClick={() => setPortion(f.id, p)} style={{
                            border: `1px solid ${f.portions === p ? T.berry : T.line}`,
                            background: f.portions === p ? T.berrySoft : "#fff", color: T.ink,
                            borderRadius: 10, padding: "6px 12px", fontSize: 12, fontFamily: T.mono, cursor: "pointer" }}>{p}×</button>
                        ))}
                        <button onClick={() => removeFood(f.id)} style={{
                          marginLeft: "auto", border: "none", background: "none", color: T.berry, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Remove</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </Card>
          </div>
        );
      })}
      <div style={{ height: 12 }} />
    </div>
  );

  // ————— History (click-through from Today) —————
  const HistoryScreen = () => {
    const first = new Date(2026, 6, 1).getDay(); // July 2026 starts Wed
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const shade = (c) => {
      if (!c) return T.bg;
      const diff = Math.abs(c - TARGET.cals);
      if (diff <= 100) return T.sage;      // on target
      if (diff <= 250) return T.gold;      // near
      return "#D98A9E";                    // off
    };
    const sel = HISTORY[selDay];
    const selDate = new Date(selDay + "T12:00");
    return (
      <div style={{ animation: "fadeUp .25s ease" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0 2px" }}>
          <button onClick={() => setView(null)} style={{ border: "none", background: "none", color: T.berry, fontSize: 20, cursor: "pointer", padding: 0 }}>‹</button>
          <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 600, color: T.ink }}>History</div>
        </div>

        <SectionLabel>July 2026</SectionLabel>
        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5, fontSize: 10, color: T.inkSoft, textAlign: "center", marginBottom: 6 }}>
            {["S","M","T","W","T","F","S"].map((d, i) => <div key={i}>{d}</div>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5 }}>
            {Array.from({ length: first }).map((_, i) => <div key={"e" + i} />)}
            {days.map(d => {
              const key = `2026-07-${String(d).padStart(2, "0")}`;
              const rec = HISTORY[key];
              const isToday = d === 12, isSel = key === selDay, future = d > 12;
              return (
                <button key={d} onClick={() => rec && setSelDay(key)} disabled={!rec} style={{
                  aspectRatio: "1", borderRadius: 10, cursor: rec ? "pointer" : "default",
                  border: isSel ? `2px solid ${T.berry}` : isToday ? `2px solid ${T.ink}33` : `1px solid ${T.line}`,
                  background: future ? T.bg : rec ? `${shade(rec.cals)}${isSel ? "" : "55"}` : "#fff",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 0 }}>
                  <div style={{ fontSize: 11, color: T.ink, fontWeight: isToday ? 700 : 500 }}>{d}</div>
                  {rec && <div style={{ fontSize: 7.5, fontFamily: T.mono, color: T.ink, opacity: .75 }}>{(rec.cals / 1000).toFixed(1)}k</div>}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 12, fontSize: 10, color: T.inkSoft }}>
            {[[T.sage, "on target"], [T.gold, "near"], ["#D98A9E", "off"]].map(([c, l]) => (
              <span key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: c, display: "inline-block" }} />{l}</span>
            ))}
          </div>
        </Card>

        {sel && (
          <>
            <SectionLabel>{selDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</SectionLabel>
            <Card style={{ padding: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-around", padding: "10px 6px", borderBottom: `1px solid ${T.line}` }}>
                {[["Calories", sel.cals.toLocaleString()], ["Protein", sel.protein + "g"], ["Iron", sel.fe + "mg"],
                  ["Energy", ["", "low", "ok", "good"][sel.energy]]].map(([l, v]) => (
                  <div key={l} style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: T.mono, fontSize: 14, color: T.ink }}>{v}</div>
                    <div style={{ fontSize: 9.5, color: T.inkSoft, marginTop: 2 }}>{l}</div>
                  </div>
                ))}
              </div>
              {SAMPLE_DAY_ENTRIES.map((e, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 10px",
                  borderTop: i ? `1px solid ${T.line}` : "none" }}>
                  <div style={{ fontSize: 13, color: T.ink }}>
                    <span style={{ color: T.inkSoft, fontSize: 10.5, marginRight: 8 }}>{e.meal}</span>{e.name}
                  </div>
                  <span style={{ fontFamily: T.mono, fontSize: 12.5, color: T.inkSoft }}>{e.cals}</span>
                </div>
              ))}
            </Card>
          </>
        )}

        <SectionLabel>Last 14 days</SectionLabel>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-around" }}>
            {[["Avg calories", Math.round(avgOf("cals")).toLocaleString()], ["Avg protein", Math.round(avgOf("protein")) + "g"],
              ["Avg iron", ironAvg.toFixed(1) + "mg"]].map(([l, v]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: T.mono, fontSize: 17, color: T.ink }}>{v}</div>
                <div style={{ fontSize: 10, color: T.inkSoft, marginTop: 3 }}>{l}</div>
              </div>
            ))}
          </div>
        </Card>

        <SectionLabel>Most logged lately</SectionLabel>
        <Card style={{ padding: 8 }}>
          {TOP_FOODS.map((f, i) => (
            <div key={f.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 8px",
              borderTop: i ? `1px solid ${T.line}` : "none" }}>
              <div style={{ flex: 1, fontSize: 13, color: T.ink }}>{f.name}</div>
              <div style={{ width: 90, height: 6, background: T.berrySoft, borderRadius: 4 }}>
                <div style={{ height: 6, width: `${f.count / TOP_FOODS[0].count * 100}%`, background: T.berry, borderRadius: 4 }} />
              </div>
              <span style={{ fontFamily: T.mono, fontSize: 11.5, color: T.inkSoft, width: 24, textAlign: "right" }}>{f.count}</span>
            </div>
          ))}
        </Card>
        <div style={{ height: 12 }} />
      </div>
    );
  };

  // ————— Fridge —————
  const FridgeScreen = () => (
    <div style={{ animation: "fadeUp .25s ease" }}>
      <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 600, color: T.ink, padding: "6px 0 2px" }}>Fridge</div>
      <div style={{ fontSize: 12.5, color: T.inkSoft, lineHeight: 1.5 }}>
        Everything you actually buy. <span style={{ color: T.iron }}>⚘ = iron-rich</span>
      </div>
      <Card style={{ marginTop: 14, background: T.berrySoft, border: `1px solid ${T.berry}22` }}>
        <div style={{ fontWeight: 600, fontSize: 13.5, color: T.ink, marginBottom: 4 }}>🧾 Update from receipts</div>
        <div style={{ fontSize: 12, color: T.inkSoft, lineHeight: 1.55 }}>
          Every week or two: photograph receipts into your Claude project, and Coach returns a{" "}
          <span style={{ fontFamily: T.mono }}>fridge.json</span> with new items + nutrition. Import it here.
        </div>
        <button onClick={() => showToast("Fridge updated · 4 new items")} style={{
          marginTop: 10, background: T.berry, color: "#fff", border: "none", borderRadius: 12,
          padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: T.body }}>Import fridge.json</button>
      </Card>
      {FRIDGE.map(g => (
        <div key={g.store}>
          <SectionLabel>{g.store}</SectionLabel>
          <Card style={{ padding: 6 }}>
            {g.items.map((f, i) => (
              <div key={f.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "11px 10px", borderTop: i ? `1px solid ${T.line}` : "none" }}>
                <div>
                  <div style={{ fontSize: 14, color: T.ink, fontWeight: 500 }}>
                    {f.name}{f.ironRich && <span style={{ color: T.iron, fontSize: 11 }}> ⚘</span>}
                  </div>
                  <div style={{ fontSize: 11, color: T.inkSoft, marginTop: 2 }}>{f.serv} · {f.protein}g protein · {f.fe}mg iron</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: T.mono, fontSize: 13, color: T.inkSoft }}>{f.cals}</span>
                  <button onClick={() => addFood(f)} style={{
                    border: `1px solid ${T.line}`, background: "#fff", color: T.berry,
                    borderRadius: 10, width: 30, height: 30, fontSize: 17, cursor: "pointer", lineHeight: 1 }}>+</button>
                </div>
              </div>
            ))}
          </Card>
        </div>
      ))}
      <div style={{ height: 12 }} />
    </div>
  );

  // ————— Meals —————
  const MealsScreen = () => (
    <div style={{ animation: "fadeUp .25s ease" }}>
      <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 600, color: T.ink, padding: "6px 0 2px" }}>Meals</div>
      <div style={{ fontSize: 12.5, color: T.inkSoft }}>Whole plates you make often — logged in one tap.</div>
      {MEALS_SAVED.map(m => (
        <Card key={m.name} style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: T.serif, fontSize: 16, fontWeight: 600, color: T.ink }}>
              {m.name}{m.ironRich && <span style={{ color: T.iron, fontSize: 12 }}> ⚘</span>}
            </div>
            <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 3 }}>{m.desc}</div>
            <div style={{ fontFamily: T.mono, fontSize: 11.5, color: T.inkSoft, marginTop: 5 }}>
              {m.cals} cal · {m.protein}g protein · {m.fe}mg iron</div>
          </div>
          <button onClick={() => addFood(m)} style={{
            background: T.berry, color: "#fff", border: "none", borderRadius: 12,
            padding: "10px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: T.body }}>Log it</button>
        </Card>
      ))}
      <button onClick={() => showToast("Build a meal — in the real app")} style={{
        marginTop: 14, width: "100%", background: T.card, color: T.ink, border: `1.5px dashed ${T.berry}66`,
        borderRadius: 16, padding: "13px 0", fontSize: 13.5, fontWeight: 500, cursor: "pointer", fontFamily: T.body }}>
        + Build a new meal</button>
      <div style={{ height: 12 }} />
    </div>
  );

  // ————— Coach —————
  const sparkline = () => {
    const w = 280, h = 70, pad = 6;
    const min = Math.min(...weights) - .3, max = Math.max(...weights) + .3;
    const x = i => pad + i * (w - 2 * pad) / (weights.length - 1);
    const y = v => h - pad - (v - min) / (max - min) * (h - 2 * pad);
    const avgPts = weights.map((_, i) => {
      const s = weights.slice(Math.max(0, i - 6), i + 1);
      return `${x(i)},${y(s.reduce((a, b) => a + b, 0) / s.length)}`;
    }).join(" ");
    return (
      <svg width="100%" viewBox={`0 0 ${w} ${h}`}>
        <polyline points={weights.map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none" stroke={T.berrySoft} strokeWidth="2" />
        {weights.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="2.4" fill={T.berry} opacity=".35" />)}
        <polyline points={avgPts} fill="none" stroke={T.sage} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  };

  const macroTrend = () => {
    // 14-day stacked macro bars (P/C/F share of calories) — sample proportions
    const days = 14;
    return (
      <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 64 }}>
        {Array.from({ length: days }).map((_, i) => {
          const p = 24 + (i * 7) % 8, f = 28 + (i * 5) % 7, c = 100 - p - f; // % of cals
          const total = 0.75 + ((i * 13) % 10) / 25;
          return (
            <div key={i} style={{ flex: 1, height: `${total * 100}%`, display: "flex", flexDirection: "column", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ flex: c, background: T.gold }} />
              <div style={{ flex: f, background: T.berry }} />
              <div style={{ flex: p, background: T.sage }} />
            </div>
          );
        })}
      </div>
    );
  };

  const CoachScreen = () => (
    <div style={{ animation: "fadeUp .25s ease" }}>
      <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 600, color: T.ink, padding: "6px 0 2px" }}>Coach</div>

      <Card style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {[["Daily target", "1,650", "cal"], ["Protein", "115", "g"], ["Goal pace", "−0.7", "lb/wk"]].map(([l, v, u]) => (
            <div key={l} style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontFamily: T.mono, fontSize: 19, color: T.ink, fontWeight: 500 }}>
                {v}<span style={{ fontSize: 11, color: T.inkSoft }}> {u}</span></div>
              <div style={{ fontSize: 10.5, color: T.inkSoft, marginTop: 3 }}>{l}</div>
            </div>
          ))}
        </div>
      </Card>

      <SectionLabel>Weight trend — the green line is what matters</SectionLabel>
      <Card>
        {sparkline()}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12 }}>
          <span style={{ color: T.inkSoft }}>7-day average</span>
          <span style={{ fontFamily: T.mono, color: T.ink }}>{trendNow.toFixed(1)} lb
            <span style={{ color: weeklyChange <= 0 ? T.sage : T.gold, marginLeft: 8 }}>
              {weeklyChange <= 0 ? "▾" : "▴"} {Math.abs(weeklyChange).toFixed(1)}/wk</span></span>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input value={weightInput} onChange={e => setWeightInput(e.target.value)} placeholder="Today's weight" inputMode="decimal"
            style={{ flex: 1, border: `1px solid ${T.line}`, borderRadius: 12, padding: "10px 12px",
              fontSize: 14, fontFamily: T.mono, color: T.ink, outline: "none", background: T.bg }} />
          <button onClick={logWeight} style={{ background: T.sage, color: "#fff", border: "none",
            borderRadius: 12, padding: "0 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Log</button>
        </div>
      </Card>

      <SectionLabel>Macros — last 14 days</SectionLabel>
      <Card>
        {macroTrend()}
        <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 10.5, color: T.inkSoft }}>
          {[[T.sage, "Protein"], [T.berry, "Fat"], [T.gold, "Carbs"]].map(([c, l]) => (
            <span key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: c }} />{l}</span>
          ))}
          <span style={{ marginLeft: "auto", fontFamily: T.mono, color: T.ink }}>avg 27P / 44C / 29F</span>
        </div>
        <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 10, lineHeight: 1.55, borderTop: `1px solid ${T.line}`, paddingTop: 10 }}>
          Protein share is solid. Fiber averages <span style={{ fontFamily: T.mono, color: T.ink }}>19g</span> vs. a 25g goal —
          the lentil soup and pumpkin seeds in your fridge close that gap.
        </div>
      </Card>

      <SectionLabel>Iron & energy ⚘</SectionLabel>
      <Card style={{ background: "#F4EBF1", border: `1px solid ${T.iron}22` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: T.inkSoft, fontWeight: 600 }}>14-day avg iron</span>
          <span style={{ fontFamily: T.mono, fontSize: 15, color: ironAvg >= 15 ? T.sage : T.iron }}>
            {ironAvg.toFixed(1)}mg <span style={{ fontSize: 11, color: T.inkSoft }}>/ 18mg goal</span></span>
        </div>
        <div style={{ fontSize: 12.5, color: T.ink, lineHeight: 1.6 }}>
          {lowIronLowEnergy} of your recent low-energy days were also low-iron days.
          Two habits move this most:
        </div>
        <ul style={{ margin: "8px 0 0", padding: "0 0 0 18px", fontSize: 12, color: T.inkSoft, lineHeight: 1.7 }}>
          <li>Pair iron foods with <b style={{ color: T.ink }}>vitamin C</b> (citrus, peppers) — absorption roughly triples</li>
          <li>Keep <b style={{ color: T.ink }}>coffee & tea ~1hr away</b> from iron-rich meals — they block absorption</li>
        </ul>
        <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
          <span style={{ fontSize: 11.5, color: T.inkSoft }}>How's your energy today?</span>
          {["low", "ok", "good"].map((e, i) => (
            <button key={e} onClick={() => { setEnergyToday(i + 1); showToast("Energy logged"); }} style={{
              border: `1px solid ${energyToday === i + 1 ? T.iron : T.line}`,
              background: energyToday === i + 1 ? "#EBDCE8" : "#fff", color: T.ink,
              borderRadius: 10, padding: "6px 11px", fontSize: 11.5, cursor: "pointer" }}>{e}</button>
          ))}
        </div>
      </Card>

      <SectionLabel>This week's note</SectionLabel>
      <Card style={{ background: T.sageSoft, border: `1px solid ${T.sage}33` }}>
        <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.6 }}>
          Trending <b>−0.7 lb/week</b> — right on pace. Protein averaged 108g. Iron ran low Tue–Thu and
          energy dipped those same days: try the smoothie (spinach + banana's vitamin C) on busy mornings.
        </div>
        <div style={{ fontSize: 11, color: T.inkSoft, marginTop: 8 }}>From your Coach check-in · July 6</div>
      </Card>

      <SectionLabel>Coach check-in (every 1–2 weeks)</SectionLabel>
      <Card>
        <ol style={{ margin: 0, padding: "0 0 0 18px", fontSize: 12.5, color: T.inkSoft, lineHeight: 1.9 }}>
          <li>Tap <b style={{ color: T.ink }}>Export backup</b> below</li>
          <li>Attach it to your Claude project + any receipt photos</li>
          <li>Import the returned <span style={{ fontFamily: T.mono }}>plan.json</span> + <span style={{ fontFamily: T.mono }}>fridge.json</span></li>
        </ol>
        <button onClick={() => showToast("backup.json exported")} style={{
          marginTop: 12, width: "100%", background: T.berry, color: "#fff", border: "none",
          borderRadius: 12, padding: "11px 0", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: T.body }}>
          Export backup for Coach</button>
      </Card>
      <div style={{ height: 12 }} />
    </div>
  );

  // ————— frame + tabs —————
  const TABS = [
    { id: "today", label: "Today", icon: "◯" },
    { id: "fridge", label: "Fridge", icon: "❆" },
    { id: "meals", label: "Meals", icon: "❀" },
    { id: "coach", label: "Coach", icon: "✦" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#E9DCD6", display: "flex", alignItems: "center",
      justifyContent: "center", padding: 24, fontFamily: T.body }}>
      <style>{CSS}</style>
      <div style={{ width: 375, height: 760, background: T.bg, borderRadius: 44,
        border: "10px solid #3A2C33", overflow: "hidden", position: "relative",
        boxShadow: "0 24px 60px rgba(67,39,58,.35)", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 22px 4px",
          fontSize: 12, fontFamily: T.mono, color: T.ink }}>
          <span>9:41</span><span>●●●</span>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 16px 8px" }}>
          {view === "history" ? <HistoryScreen /> : (
            <>
              {tab === "today" && <TodayScreen />}
              {tab === "fridge" && <FridgeScreen />}
              {tab === "meals" && <MealsScreen />}
              {tab === "coach" && <CoachScreen />}
            </>
          )}
        </div>
        {toast && (
          <div style={{ position: "absolute", bottom: 92, left: 0, right: 0, display: "flex",
            justifyContent: "center", pointerEvents: "none" }}>
            <div style={{ background: T.ink, color: "#fff", fontSize: 12.5, padding: "9px 16px",
              borderRadius: 20, animation: "pop .2s ease", fontWeight: 500 }}>{toast}</div>
          </div>
        )}
        <div style={{ display: "flex", borderTop: `1px solid ${T.line}`, background: T.card, padding: "8px 6px 14px" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setView(null); setTab(t.id); }} style={{
              flex: 1, background: "none", border: "none", cursor: "pointer",
              color: tab === t.id && !view ? T.berry : T.inkSoft, fontFamily: T.body }}>
              <div style={{ fontSize: 17 }}>{t.icon}</div>
              <div style={{ fontSize: 10.5, fontWeight: tab === t.id && !view ? 700 : 500, marginTop: 2 }}>{t.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
