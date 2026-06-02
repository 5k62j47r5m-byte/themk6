import { useState, useEffect, useCallback } from "react";

// ─── PALETTE ──────────────────────────────────────────────────────────────────
// Thragg:       #C84B20 brick-orange · #9AA4AE battleship grey · #2A2C2E charcoal
// Emperor Mark: #F0F2F4 ice-white   · #C8CDD2 silver-grey     · #EAECEE cold near-white
//
// Distribution:
//   Home     → Thragg orange on quote bar / streaks; silver on status
//   Workout  → Thragg orange dominant (intensity)
//   Sleep    → Emperor silver / ice-white (cold precision)
//   Tasks    → Thragg orange (urgency / relentless)
//   Metrics  → Split: weight→white, mood→orange, energy→silver
//   Week     → Silver structure, orange for alerts

const C = {
  void:      "#09090A",
  base:      "#0D0D0F",
  surface:   "#131315",
  raised:    "#1A1A1D",
  rim:       "#232326",

  // Thragg
  orange:    "#C84B20",
  orangeHi:  "#E05828",
  orangeDim: "#4A1A08",

  // Emperor Mark
  white:     "#F0F2F4",
  silver:    "#9AA4AE",
  pale:      "#C8CDD2",
  ghost:     "#3C3F43",
  charcoal:  "#2A2C2E",

  rule:      "#1C1C1F",
};

// ─── SECTION PALETTES ─────────────────────────────────────────────────────────
// Each section has a primary + secondary accent drawn from the two character palettes
const SP = {
  home:    { primary: C.orange,  secondary: C.silver },
  workout: { primary: C.orange,  secondary: C.pale   },
  sleep:   { primary: C.silver,  secondary: C.white  },
  tasks:   { primary: C.orange,  secondary: C.pale   },
  metrics: { primary: C.white,   secondary: C.orange },
  week:    { primary: C.silver,  secondary: C.orange },
};

const VERSION = "The Mk4";

const SECTIONS = [
  { id:"home",    label:"HOME"    },
  { id:"workout", label:"WORKOUT" },
  { id:"sleep",   label:"SLEEP"   },
  { id:"tasks",   label:"TASKS"   },
  { id:"metrics", label:"METRICS" },
  { id:"week",    label:"WEEK"    },
];

const MUSCLE_GROUPS = ["Chest","Back","Shoulders","Biceps","Triceps","Legs","Glutes","Core","Calves"];
const PRESETS = {
  Chest:    ["Bench Press","Incline Press","Cable Fly","Dip","Push-up"],
  Back:     ["Pull-up","Barbell Row","Lat Pulldown","Seated Row","Face Pull"],
  Shoulders:["OHP","Lateral Raise","Rear Delt Fly","Arnold Press"],
  Biceps:   ["Barbell Curl","Hammer Curl","Cable Curl","Incline Curl"],
  Triceps:  ["Skull Crusher","Pushdown","Close-Grip Bench","Overhead Ext"],
  Legs:     ["Squat","RDL","Leg Press","Hack Squat","Leg Curl"],
  Glutes:   ["Hip Thrust","Bulgarian Split Squat","Sumo Deadlift","Cable Kickback"],
  Core:     ["Plank","Ab Wheel","Hanging Leg Raise","Dead Bug","Cable Crunch"],
  Calves:   ["Standing Calf Raise","Seated Calf Raise"],
};
const STRENGTH_STDS = {
  "Bench Press": [95,155,215,275],
  "Barbell Row": [85,145,200,255],
  "Squat":       [115,185,255,330],
  "OHP":         [55,95,135,175],
  "RDL":         [95,165,235,305],
  "Pull-up":     [1,8,15,20],
};
const SLEEP_Q = ["Terrible","Poor","OK","Good","Perfect"];

// ─── QUOTES (from show universe / paraphrased spirit) ─────────────────────────
const QUOTES = {
  default: [
    // Omni-Man energy — brutal paternal weight
    "You could have been more. Act like it.",
    "Think about what you're doing. Is this the best you can be?",
    "Everything you've built can be taken. Unless you're strong enough to keep it.",
    "The standard isn't something you meet once.",
    "You were made for more than this.",
    "How many more days are you going to waste?",
  ],
  lowSleep: [
    // Nolan / Viltrum — precision, recovery as strategy
    "A weapon left unsharpened is just dead weight.",
    "You can't outwork a broken system. Fix the recovery.",
    "Your body remembers what you do to it.",
    "Rest isn't surrender. It's how you survive the next fight.",
  ],
  missedWorkout: [
    // Thragg-voiced — cold, threatening
    "Nothing logged. This is how it starts.",
    "You had one job today. Just one.",
    "The bar was there. You weren't.",
    "Absence is a choice. Own it.",
  ],
  streak: [
    // Emperor Mark — earned authority, quiet confidence
    "This is what consistency looks like. Don't confuse it with comfort.",
    "You've shown up. Now show up better.",
    "The streak doesn't mean you've won. It means you haven't quit.",
    "Keep the standard. That's all.",
  ],
  goodSleep: [
    "Rested. Ready. No excuses.",
    "The machine is optimized. Use it today.",
    "Eight hours. Now go make it worth it.",
  ],
};

// ─── UTILS ────────────────────────────────────────────────────────────────────
const today  = () => new Date().toISOString().split("T")[0];
const last7  = () => Array.from({length:7}, (_,i) => { const d=new Date(); d.setDate(d.getDate()-(6-i)); return d.toISOString().split("T")[0]; });
const last30 = () => Array.from({length:30},(_,i) => { const d=new Date(); d.setDate(d.getDate()-(29-i)); return d.toISOString().split("T")[0]; });

const useLS = (key, init) => {
  const [v,sv] = useState(() => { try { const s=localStorage.getItem(key); return s?JSON.parse(s):init; } catch { return init; }});
  const set = useCallback(val => { sv(val); try { localStorage.setItem(key,JSON.stringify(val)); } catch {} }, [key]);
  return [v,set];
};

const pickQuote = data => {
  const s=data.sleep[today()]; const h=s?parseFloat(s.hours):0;
  if(h>0&&h<6) return QUOTES.lowSleep[Math.floor(Math.random()*QUOTES.lowSleep.length)];
  if(!data.workouts[today()]&&new Date().getHours()>18) return QUOTES.missedWorkout[Math.floor(Math.random()*QUOTES.missedWorkout.length)];
  if(h>=8) return QUOTES.goodSleep[Math.floor(Math.random()*QUOTES.goodSleep.length)];
  return QUOTES.default[Math.floor(Math.random()*QUOTES.default.length)];
};

const calcTier = (lift,val) => {
  const s=STRENGTH_STDS[lift]; if(!s) return null;
  if(val>=s[3]) return {label:"ELITE",    color:C.orange};
  if(val>=s[2]) return {label:"ADVANCED", color:C.white};
  if(val>=s[1]) return {label:"INTER",    color:C.silver};
  return              {label:"BEGINNER",  color:C.ghost};
};

// ─── MUSCLE MAP GRADIENT ─────────────────────────────────────────────────────
// Cold white → battleship grey → Thragg orange → deep orange
// 0 = near-black rim, trace = ghost, low = silver, mid = pale, high = orange, elite = deep orange
const volColor = v => {
  if(!v||v<1)  return C.rim;          // untouched
  if(v<8)      return C.ghost;        // trace
  if(v<20)     return "#5A6068";      // low — dark silver
  if(v<40)     return C.silver;       // building — battleship
  if(v<60)     return C.pale;         // solid — light silver
  if(v<80)     return C.orangeHi;     // high — bright orange
  return C.orange;                    // elite — Thragg full orange
};

const MuscleMap = ({vol}) => {
  const g = m => volColor(vol[m]||0);

  // Gradient stops for the legend
  const stops = [
    ["ELITE", C.orange],
    ["HIGH",  C.orangeHi],
    ["SOLID", C.pale],
    ["BUILD", C.silver],
    ["TRACE", C.ghost],
    ["NONE",  C.rim],
  ];

  return (
    <div style={{display:"flex", gap:24, justifyContent:"center", alignItems:"flex-start", flexWrap:"wrap"}}>

      {/* FRONT */}
      <div>
        <Lbl style={{textAlign:"center",marginBottom:10,color:C.ghost}}>Anterior</Lbl>
        <svg width="96" height="200" viewBox="0 0 96 200">
          {/* Head */}
          <ellipse cx="48" cy="16" rx="13" ry="14" fill={C.raised} stroke={C.rim} strokeWidth="1"/>
          {/* Neck */}
          <rect x="43" y="28" width="10" height="8" fill={C.raised} stroke={C.rim} strokeWidth="0.5"/>
          {/* Shoulders — wide traps feel */}
          <path d="M16,38 Q22,34 35,36 L35,52 Q22,54 16,50 Z" fill={g("Shoulders")} stroke={C.rim} strokeWidth="0.5"/>
          <path d="M80,38 Q74,34 61,36 L61,52 Q74,54 80,50 Z" fill={g("Shoulders")} stroke={C.rim} strokeWidth="0.5"/>
          {/* Chest — two lobes */}
          <path d="M35,36 Q41,32 48,34 Q55,32 61,36 L61,56 Q55,60 48,58 Q41,60 35,56 Z" fill={g("Chest")} stroke={C.rim} strokeWidth="0.5"/>
          {/* Chest center line */}
          <line x1="48" y1="36" x2="48" y2="58" stroke={C.rim} strokeWidth="0.8" opacity="0.7"/>
          {/* Core / Abs */}
          <rect x="35" y="58" width="26" height="38" rx="2" fill={g("Core")} stroke={C.rim} strokeWidth="0.5"/>
          <line x1="48" y1="58" x2="48" y2="96" stroke={C.rim} strokeWidth="0.8" opacity="0.6"/>
          <line x1="35" y1="69" x2="61" y2="69" stroke={C.rim} strokeWidth="0.5" opacity="0.5"/>
          <line x1="35" y1="80" x2="61" y2="80" stroke={C.rim} strokeWidth="0.5" opacity="0.5"/>
          {/* Obliques */}
          <path d="M35,58 Q30,68 31,88 L35,96 Z" fill={g("Core")} stroke={C.rim} strokeWidth="0.4" opacity="0.6"/>
          <path d="M61,58 Q66,68 65,88 L61,96 Z" fill={g("Core")} stroke={C.rim} strokeWidth="0.4" opacity="0.6"/>
          {/* Biceps */}
          <rect x="10" y="52" width="12" height="30" rx="6" fill={g("Biceps")} stroke={C.rim} strokeWidth="0.5"/>
          <rect x="74" y="52" width="12" height="30" rx="6" fill={g("Biceps")} stroke={C.rim} strokeWidth="0.5"/>
          {/* Triceps side peek */}
          <rect x="8"  y="56" width="6"  height="22" rx="3" fill={g("Triceps")} stroke={C.rim} strokeWidth="0.4" opacity="0.55"/>
          <rect x="82" y="56" width="6"  height="22" rx="3" fill={g("Triceps")} stroke={C.rim} strokeWidth="0.4" opacity="0.55"/>
          {/* Forearms */}
          <rect x="11" y="83" width="10" height="24" rx="5" fill={C.raised} stroke={C.rim} strokeWidth="0.5"/>
          <rect x="75" y="83" width="10" height="24" rx="5" fill={C.raised} stroke={C.rim} strokeWidth="0.5"/>
          {/* Hip crease */}
          <path d="M35,96 Q41,100 48,99 Q55,100 61,96" fill="none" stroke={C.rim} strokeWidth="0.6" opacity="0.5"/>
          {/* Quads — two heads visible */}
          <path d="M35,100 Q30,102 28,148 L41,148 Q43,115 40,100 Z" fill={g("Legs")} stroke={C.rim} strokeWidth="0.5"/>
          <path d="M61,100 Q66,102 68,148 L55,148 Q53,115 56,100 Z" fill={g("Legs")} stroke={C.rim} strokeWidth="0.5"/>
          {/* VMO highlight */}
          <ellipse cx="38" cy="142" rx="6" ry="5" fill={g("Legs")} stroke={C.rim} strokeWidth="0.4" opacity="0.7"/>
          <ellipse cx="58" cy="142" rx="6" ry="5" fill={g("Legs")} stroke={C.rim} strokeWidth="0.4" opacity="0.7"/>
          {/* Calves */}
          <path d="M29,150 Q26,158 28,176 Q32,182 37,180 Q41,174 40,150 Z" fill={g("Calves")} stroke={C.rim} strokeWidth="0.5"/>
          <path d="M67,150 Q70,158 68,176 Q64,182 59,180 Q55,174 56,150 Z" fill={g("Calves")} stroke={C.rim} strokeWidth="0.5"/>
          {/* Feet */}
          <ellipse cx="33" cy="183" rx="7" ry="4" fill={C.raised} stroke={C.rim} strokeWidth="0.5"/>
          <ellipse cx="63" cy="183" rx="7" ry="4" fill={C.raised} stroke={C.rim} strokeWidth="0.5"/>
        </svg>
      </div>

      {/* BACK */}
      <div>
        <Lbl style={{textAlign:"center",marginBottom:10,color:C.ghost}}>Posterior</Lbl>
        <svg width="96" height="200" viewBox="0 0 96 200">
          <ellipse cx="48" cy="16" rx="13" ry="14" fill={C.raised} stroke={C.rim} strokeWidth="1"/>
          <rect x="43" y="28" width="10" height="8" fill={C.raised} stroke={C.rim} strokeWidth="0.5"/>
          {/* Traps */}
          <path d="M35,36 Q41,30 48,32 Q55,30 61,36 Q55,38 48,36 Q41,38 35,36 Z" fill={g("Shoulders")} stroke={C.rim} strokeWidth="0.5" opacity="0.8"/>
          {/* Rear delts */}
          <path d="M16,38 Q22,34 35,36 L35,50 Q22,52 16,48 Z" fill={g("Shoulders")} stroke={C.rim} strokeWidth="0.5"/>
          <path d="M80,38 Q74,34 61,36 L61,50 Q74,52 80,48 Z" fill={g("Shoulders")} stroke={C.rim} strokeWidth="0.5"/>
          {/* Lats — flared */}
          <path d="M35,36 Q20,48 22,92 L48,90 L74,92 Q76,48 61,36 Q55,38 48,36 Q41,38 35,36 Z" fill={g("Back")} stroke={C.rim} strokeWidth="0.5"/>
          {/* Spine */}
          <line x1="48" y1="36" x2="48" y2="92" stroke={C.rim} strokeWidth="0.8" opacity="0.55"/>
          {/* Horizontal back lines */}
          <line x1="35" y1="52" x2="61" y2="52" stroke={C.rim} strokeWidth="0.4" opacity="0.4"/>
          <line x1="30" y1="68" x2="66" y2="68" stroke={C.rim} strokeWidth="0.4" opacity="0.4"/>
          {/* Triceps */}
          <rect x="10" y="52" width="12" height="30" rx="6" fill={g("Triceps")} stroke={C.rim} strokeWidth="0.5"/>
          <rect x="74" y="52" width="12" height="30" rx="6" fill={g("Triceps")} stroke={C.rim} strokeWidth="0.5"/>
          {/* Forearms */}
          <rect x="11" y="83" width="10" height="24" rx="5" fill={C.raised} stroke={C.rim} strokeWidth="0.5"/>
          <rect x="75" y="83" width="10" height="24" rx="5" fill={C.raised} stroke={C.rim} strokeWidth="0.5"/>
          {/* Glutes — rounded, prominent */}
          <ellipse cx="38" cy="102" rx="14" ry="12" fill={g("Glutes")} stroke={C.rim} strokeWidth="0.5"/>
          <ellipse cx="58" cy="102" rx="14" ry="12" fill={g("Glutes")} stroke={C.rim} strokeWidth="0.5"/>
          {/* Glute divide */}
          <line x1="48" y1="94" x2="48" y2="114" stroke={C.rim} strokeWidth="0.6" opacity="0.5"/>
          {/* Hamstrings */}
          <path d="M35,110 Q30,112 29,150 L42,150 Q44,120 42,110 Z" fill={g("Legs")} stroke={C.rim} strokeWidth="0.5"/>
          <path d="M61,110 Q66,112 67,150 L54,150 Q52,120 54,110 Z" fill={g("Legs")} stroke={C.rim} strokeWidth="0.5"/>
          {/* Calves — gastrocnemius two heads */}
          <path d="M29,152 Q25,162 28,176 Q32,182 38,180 Q42,172 40,152 Z" fill={g("Calves")} stroke={C.rim} strokeWidth="0.5"/>
          <path d="M67,152 Q71,162 68,176 Q64,182 58,180 Q54,172 56,152 Z" fill={g("Calves")} stroke={C.rim} strokeWidth="0.5"/>
          {/* Soleus inner */}
          <path d="M32,162 Q30,172 33,178" fill="none" stroke={C.rim} strokeWidth="0.4" opacity="0.4"/>
          <path d="M64,162 Q66,172 63,178" fill="none" stroke={C.rim} strokeWidth="0.4" opacity="0.4"/>
          <ellipse cx="33" cy="183" rx="7" ry="4" fill={C.raised} stroke={C.rim} strokeWidth="0.5"/>
          <ellipse cx="63" cy="183" rx="7" ry="4" fill={C.raised} stroke={C.rim} strokeWidth="0.5"/>
        </svg>
      </div>

      {/* SCALE — continuous gradient bar */}
      <div style={{display:"flex",flexDirection:"column",paddingTop:22,gap:0}}>
        <Lbl style={{color:C.ghost,marginBottom:10}}>Volume</Lbl>
        {/* Gradient bar */}
        <div style={{
          width:12,height:96,flexShrink:0,
          background:`linear-gradient(to top, ${C.rim}, ${C.ghost} 20%, ${C.silver} 45%, ${C.pale} 65%, ${C.orangeHi} 82%, ${C.orange})`,
          border:`1px solid ${C.rim}`,marginBottom:8,
        }}/>
        {stops.map(([l,c],i)=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:7,marginBottom:i<stops.length-1?5:0}}>
            <div style={{width:8,height:1,background:c,flexShrink:0}}/>
            <span style={{fontSize:8,letterSpacing:"0.18em",color:C.ghost,lineHeight:1}}>{l}</span>
          </div>
        ))}
      </div>

    </div>
  );
};

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────
const T = {
  micro: {fontSize:8,  letterSpacing:"0.22em", fontWeight:500, textTransform:"uppercase"},
  label: {fontSize:10, letterSpacing:"0.18em", fontWeight:500, textTransform:"uppercase"},
  body:  {fontSize:13, letterSpacing:"0.03em", fontWeight:400},
};

const Lbl = ({children,color=C.ghost,style={}}) => (
  <div style={{...T.micro,color,...style}}>{children}</div>
);

const Rule = ({accent,style={}}) => (
  <div style={{
    height:"1px",
    background:accent?`linear-gradient(to right,${accent}55,${C.rule} 70%)`:C.rule,
    margin:"28px 0",...style,
  }}/>
);

const Input = ({style={},...p}) => (
  <input {...p} style={{
    display:"block",width:"100%",background:"transparent",
    border:"none",borderBottom:`1px solid ${C.rim}`,
    color:C.white,fontSize:13,padding:"10px 0",
    outline:"none",fontFamily:"inherit",
    letterSpacing:"0.04em",boxSizing:"border-box",
    transition:"border-color 0.15s",...style,
  }}
    onFocus={e=>e.target.style.borderBottomColor=C.orange}
    onBlur={e =>e.target.style.borderBottomColor=C.rim}
  />
);

const Sel = ({children,style={},...p}) => (
  <select {...p} style={{
    display:"block",width:"100%",background:C.surface,
    border:`1px solid ${C.rim}`,color:C.white,
    fontSize:13,padding:"9px 10px",outline:"none",
    fontFamily:"inherit",letterSpacing:"0.04em",boxSizing:"border-box",...style,
  }}>{children}</select>
);

const Btn = ({children,onClick,accent=C.orange,style={}}) => (
  <button onClick={onClick} style={{
    background:"transparent",border:`1px solid ${accent}`,
    color:accent,fontSize:9,letterSpacing:"0.22em",
    padding:"12px 20px",cursor:"pointer",
    fontFamily:"inherit",fontWeight:600,
    textTransform:"uppercase",transition:"all 0.15s",...style,
  }}
    onMouseEnter={e=>{e.currentTarget.style.background=accent;e.currentTarget.style.color=C.void;}}
    onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=accent;}}
  >{children}</button>
);

const Chip = ({label,color=C.silver}) => (
  <span style={{
    ...T.micro,padding:"3px 8px",
    border:`1px solid ${color}55`,color,background:`${color}0F`,
  }}>{label}</span>
);

const DatePicker = ({date,setDate,accent=C.orange}) => (
  <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:32}}>
    <Lbl>Date</Lbl>
    <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{
      background:"transparent",border:"none",borderBottom:`1px solid ${C.rim}`,
      color:C.white,fontSize:13,padding:"4px 0",outline:"none",
      fontFamily:"inherit",letterSpacing:"0.04em",colorScheme:"dark",
    }}/>
  </div>
);

const Empty = ({text}) => (
  <div style={{padding:"52px 0",textAlign:"center",...T.micro,color:C.ghost,lineHeight:2}}>
    {text}
  </div>
);

const Dash = () => <span style={{color:C.rim,fontSize:14}}>—</span>;

const StatTile = ({label,value,accent,style={}}) => (
  <div style={{
    flex:1,background:C.surface,padding:"18px 14px",
    borderBottom:`2px solid ${accent}`,...style,
  }}>
    <div style={{fontSize:26,fontWeight:300,color:accent,fontVariantNumeric:"tabular-nums",lineHeight:1}}>{value}</div>
    <Lbl style={{marginTop:8}}>{label}</Lbl>
  </div>
);

// ─── SPARKLINE ────────────────────────────────────────────────────────────────
const Spark = ({data,color=C.orange,h=56}) => {
  const pts=data.filter(Boolean);
  if(pts.length<2) return <div style={{height:h,display:"flex",alignItems:"center",...T.micro,color:C.ghost}}>No data yet</div>;
  const mn=Math.min(...pts)*0.97,mx=Math.max(...pts)*1.03,rng=mx-mn||1;
  const W=300;
  const coords=data.map((v,i)=>({x:(i/(data.length-1))*W,y:v!=null?h-((v-mn)/rng)*(h-10)-5:null}));
  let d="";coords.forEach(p=>{if(p.y==null)return;d+=d===""?`M${p.x},${p.y}`:`L${p.x},${p.y}`;});
  const id=`sg${color.replace(/\W/g,"")}${h}`;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${h}`} preserveAspectRatio="none" style={{display:"block"}}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {d&&<>
        <path d={`${d} L${coords.filter(p=>p.y!=null).at(-1).x},${h} L${coords.find(p=>p.y!=null).x},${h} Z`} fill={`url(#${id})`}/>
        <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
      </>}
      {coords.map((p,i)=>p.y!=null&&<circle key={i} cx={p.x} cy={p.y} r="2" fill={color}/>)}
    </svg>
  );
};

// ─── HOME ─────────────────────────────────────────────────────────────────────
const Home = ({data,streaks}) => {
  const t=today();
  const quote=pickQuote(data);
  const s=data.sleep[t],w=data.workouts[t],m=data.metrics[t],tk=data.tasks[t]||[];
  const wkDays=last7();
  const sleepVals=wkDays.map(d=>data.sleep[d]?.hours).filter(Boolean).map(Number);
  const moodVals=wkDays.map(d=>data.metrics[d]?.mood).filter(Boolean).map(Number);
  const wCount=wkDays.filter(d=>data.workouts[d]).length;
  const wts=wkDays.map(d=>data.metrics[d]?.weight).filter(Boolean).map(Number);

  return (
    <div>
      {/* Quote — Thragg orange left border, cold */}
      <div style={{borderLeft:`2px solid ${C.orange}`,paddingLeft:20,paddingBottom:32,marginBottom:32,borderBottom:`1px solid ${C.rule}`}}>
        <Lbl color={C.orange} style={{marginBottom:14}}>Today</Lbl>
        <div style={{fontSize:16,fontWeight:300,color:C.white,lineHeight:1.65,letterSpacing:"0.02em",fontStyle:"italic",maxWidth:460}}>
          "{quote}"
        </div>
      </div>

      {/* Streaks — orange/silver split */}
      <Lbl style={{marginBottom:18}}>Streaks</Lbl>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:1,marginBottom:36}}>
        {[
          {label:"WORKOUT",val:streaks.workout||0,accent:C.orange},
          {label:"SLEEP",  val:streaks.sleep||0,  accent:C.silver},
          {label:"MOOD",   val:streaks.mood||0,   accent:C.pale},
          {label:"WEIGHT", val:streaks.weight||0, accent:C.ghost},
        ].map(({label,val,accent})=>(
          <div key={label} style={{background:C.surface,padding:"20px 16px",borderBottom:`2px solid ${val>0?accent:C.rule}`}}>
            <div style={{fontSize:28,fontWeight:300,color:val>0?accent:C.ghost,fontVariantNumeric:"tabular-nums",lineHeight:1}}>{val>0?val:"—"}</div>
            <Lbl style={{marginTop:8}}>{label}</Lbl>
            {/* Subtle "days" label — nod to Viltrumite lifespan obsession */}
            {val>0&&<div style={{fontSize:7,color:accent+"66",letterSpacing:"0.2em",marginTop:3}}>DAY{val!==1?"S":""}</div>}
          </div>
        ))}
      </div>

      {/* Status — secondary accent per module */}
      <Lbl style={{marginBottom:18}}>Status</Lbl>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:1,marginBottom:36}}>
        {[
          {label:"WORKOUT",logged:!!w,detail:w?`${w.exercises?.length||0} exercises`:"Not logged",accent:SP.workout.primary},
          {label:"SLEEP",  logged:!!s,detail:s?`${s.hours}h · ${s.quality}`:"Not logged",          accent:SP.sleep.primary},
          {label:"TASKS",  logged:tk.length>0,detail:tk.length>0?`${tk.filter(x=>x.done).length}/${tk.length} done`:"Nothing added",accent:SP.tasks.primary},
          {label:"METRICS",logged:!!m,detail:m?`${m.weight||"—"} lbs · ${m.mood||"—"}/5`:"Not logged",accent:SP.metrics.primary},
        ].map(item=>(
          <div key={item.label} style={{background:C.surface,padding:"18px 16px",borderBottom:`1px solid ${item.logged?item.accent:C.rule}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <Lbl>{item.label}</Lbl>
              <span style={{fontSize:10,color:item.logged?"#55CC88":C.orange}}>{item.logged?"✓":"✗"}</span>
            </div>
            <div style={{fontSize:12,color:item.logged?C.white:C.ghost,letterSpacing:"0.04em"}}>{item.detail}</div>
          </div>
        ))}
      </div>

      {/* Week avg */}
      <Lbl style={{marginBottom:18}}>Week Average</Lbl>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:1}}>
        {[
          {label:"SLEEP",    val:sleepVals.length?(sleepVals.reduce((a,b)=>a+b)/sleepVals.length).toFixed(1)+"h":"—",accent:C.silver},
          {label:"WORKOUTS", val:`${wCount}/7`, accent:C.orange},
          {label:"MOOD",     val:moodVals.length?(moodVals.reduce((a,b)=>a+b)/moodVals.length).toFixed(1):"—",accent:C.pale},
          {label:"WT Δ",     val:wts.length>=2?`${(wts.at(-1)-wts[0])>0?"+":""}${(wts.at(-1)-wts[0]).toFixed(1)}`:"—",accent:C.ghost},
        ].map(({label,val,accent})=>(
          <div key={label} style={{background:C.surface,padding:"18px 14px"}}>
            <div style={{fontSize:20,fontWeight:300,color:accent,fontVariantNumeric:"tabular-nums",lineHeight:1}}>{val}</div>
            <Lbl style={{marginTop:8}}>{label}</Lbl>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── WORKOUT ──────────────────────────────────────────────────────────────────
const Workout = ({data,setData,date,setDate}) => {
  const [muscle,setMuscle]=useState("Chest");
  const [exName,setExName]=useState(PRESETS["Chest"][0]);
  const [custom,setCustom]=useState("");
  const [useCustom,setUseCustom]=useState(false);
  const [sets,setSets]=useState("3");
  const [reps,setReps]=useState("10");
  const [notes,setNotes]=useState("");
  const [maxW,setMaxW]=useLS("mk1_maxw",{});

  const day=data.workouts[date]||{exercises:[]};
  const vol={};
  MUSCLE_GROUPS.forEach(mg=>{
    const exs=(day.exercises||[]).filter(e=>e.muscle===mg);
    vol[mg]=Math.min(100,exs.reduce((a,e)=>a+e.sets*e.reps,0));
  });

  const add=()=>{
    const name=useCustom?custom:exName;if(!name.trim())return;
    const ex={name,muscle,sets:parseInt(sets)||0,reps:parseInt(reps)||0,notes};
    setData({...data,workouts:{...data.workouts,[date]:{exercises:[...(day.exercises||[]),ex]}}});
    setNotes("");
  };
  const remove=i=>{
    setData({...data,workouts:{...data.workouts,[date]:{exercises:day.exercises.filter((_,idx)=>idx!==i)}}});
  };

  const totalSets=(day.exercises||[]).reduce((a,e)=>a+e.sets,0);
  const totalReps=(day.exercises||[]).reduce((a,e)=>a+e.sets*e.reps,0);

  return (
    <div>
      <DatePicker date={date} setDate={setDate} accent={C.orange}/>

      {/* Map — Thragg orange as the heat color */}
      <div style={{background:C.surface,padding:"22px 18px",marginBottom:32,borderTop:`1px solid ${C.orange}22`}}>
        <Lbl color={C.orange} style={{marginBottom:18}}>Activation Map</Lbl>
        <MuscleMap vol={vol}/>
        {/* subtle: "Know thy enemy" — Thragg, referring to one's own body */}
        {totalReps>0&&<div style={{marginTop:14,textAlign:"center",fontSize:8,color:C.ghost,letterSpacing:"0.2em"}}>
          {totalSets} sets · {totalReps} reps logged
        </div>}
      </div>

      {/* Log — orange dominant */}
      <div style={{background:C.surface,padding:"22px 20px",marginBottom:32}}>
        <Lbl color={C.orange} style={{marginBottom:18}}>Log Exercise</Lbl>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
          <div><Lbl style={{marginBottom:8}}>Muscle</Lbl>
            <Sel value={muscle} onChange={e=>{setMuscle(e.target.value);setExName(PRESETS[e.target.value][0]);}}>
              {MUSCLE_GROUPS.map(m=><option key={m}>{m}</option>)}
            </Sel>
          </div>
          <div><Lbl style={{marginBottom:8}}>Exercise</Lbl>
            {useCustom
              ?<Input value={custom} onChange={e=>setCustom(e.target.value)} placeholder="Name"/>
              :<Sel value={exName} onChange={e=>setExName(e.target.value)}>
                {(PRESETS[muscle]||[]).map(e=><option key={e}>{e}</option>)}
              </Sel>
            }
          </div>
        </div>
        <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:16,...T.micro,color:C.ghost}}>
          <input type="checkbox" checked={useCustom} onChange={e=>setUseCustom(e.target.checked)} style={{accentColor:C.orange}}/>
          Custom
        </label>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
          <div><Lbl style={{marginBottom:8}}>Sets</Lbl><Input type="number" value={sets} onChange={e=>setSets(e.target.value)} min="1"/></div>
          <div><Lbl style={{marginBottom:8}}>Reps</Lbl><Input type="number" value={reps} onChange={e=>setReps(e.target.value)} min="1"/></div>
        </div>
        <Lbl style={{marginBottom:8}}>Notes</Lbl>
        <Input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Optional" style={{marginBottom:20}}/>
        <Btn onClick={add} accent={C.orange} style={{width:"100%"}}>Add Exercise</Btn>
      </div>

      {/* Session log */}
      {(day.exercises||[]).length===0
        ? <Empty text="Nothing logged. That's a choice."/>
        : <>
            <Lbl style={{marginBottom:16,color:C.silver}}>Session</Lbl>
            {(day.exercises||[]).map((ex,i)=>(
              <div key={i} style={{
                display:"flex",justifyContent:"space-between",alignItems:"center",
                padding:"14px 0",borderBottom:`1px solid ${C.rule}`,
              }}>
                <div>
                  <div style={{fontSize:14,color:C.white,fontWeight:400,marginBottom:4,letterSpacing:"0.02em"}}>{ex.name}</div>
                  <div style={{display:"flex",gap:10,...T.micro}}>
                    <span style={{color:C.orange}}>{ex.muscle}</span>
                    <span style={{color:C.silver}}>{ex.sets}×{ex.reps}</span>
                    {ex.notes&&<span style={{color:C.ghost}}>{ex.notes}</span>}
                  </div>
                </div>
                <button onClick={()=>remove(i)} style={{background:"none",border:"none",color:C.ghost,cursor:"pointer",fontSize:18,lineHeight:1,padding:"0 4px"}}>×</button>
              </div>
            ))}
          </>
      }

      <Rule accent={C.orange}/>

      {/* Strength tiers — orange=elite, white=advanced, silver=inter */}
      <Lbl color={C.orange} style={{marginBottom:18}}>Strength Tiers</Lbl>
      {/* Subtle nod: "population percentiles" echoes Viltrumite strength ranking */}
      <div style={{fontSize:9,color:C.ghost,letterSpacing:"0.14em",marginBottom:16}}>Population percentile benchmarks</div>
      <div style={{background:C.surface,padding:"20px"}}>
        {Object.keys(STRENGTH_STDS).map((lift,i,arr)=>{
          const tier=maxW[lift]?calcTier(lift,maxW[lift]):null;
          return (
            <div key={lift} style={{
              display:"flex",alignItems:"center",gap:12,
              paddingBottom:i<arr.length-1?16:0,marginBottom:i<arr.length-1?16:0,
              borderBottom:i<arr.length-1?`1px solid ${C.rule}`:"none",
            }}>
              <div style={{flex:1,fontSize:13,color:C.white}}>{lift}</div>
              <Input type="number" value={maxW[lift]||""} placeholder="lbs"
                onChange={e=>setMaxW({...maxW,[lift]:parseFloat(e.target.value)||""})}
                style={{width:72,flexShrink:0}}/>
              {tier&&<Chip label={tier.label} color={tier.color}/>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── SLEEP ────────────────────────────────────────────────────────────────────
// Emperor Mark palette: white + silver — cold, precise, Viltrum clinical
const Sleep = ({data,setData,date,setDate}) => {
  const [bed,setBed]=useState("22:30");
  const [wake,setWake]=useState("06:30");
  const [q,setQ]=useState("Good");

  const hrs=(b,w)=>{
    const [bh,bm]=b.split(":").map(Number);
    let [wh,wm]=w.split(":").map(Number);
    if(wh<bh) wh+=24;
    return ((wh*60+wm-(bh*60+bm))/60).toFixed(1);
  };

  const log=()=>setData({...data,sleep:{...data.sleep,[date]:{bedtime:bed,wakeTime:wake,hours:hrs(bed,wake),quality:q}}});
  const ex=data.sleep[date];
  const h=ex?parseFloat(ex.hours):0;
  const recent=last7().reverse();

  const sleepAccent = h<6?C.orange : h>=8?C.white : C.silver;

  return (
    <div>
      <DatePicker date={date} setDate={setDate} accent={C.silver}/>

      {ex&&(
        <div style={{borderLeft:`2px solid ${sleepAccent}`,paddingLeft:20,marginBottom:32}}>
          {/* Large number — Emperor Mark ice-white scale */}
          <div style={{fontSize:52,fontWeight:300,color:sleepAccent,fontVariantNumeric:"tabular-nums",lineHeight:1}}>{ex.hours}</div>
          <Lbl style={{marginTop:6,color:C.ghost}}>Hours</Lbl>
          <div style={{fontSize:12,color:C.ghost,marginTop:8,letterSpacing:"0.06em"}}>{ex.bedtime} → {ex.wakeTime} · {ex.quality}</div>
          {/* Show spirit: "rest is a weapon" energy without quoting directly */}
          {h<6&&<div style={{...T.micro,color:C.orange,marginTop:10}}>A weapon left unsharpened is just dead weight.</div>}
          {h>=8&&<div style={{...T.micro,color:C.silver,marginTop:10}}>Optimized. The machine is ready.</div>}
          {h>=6&&h<8&&<div style={{...T.micro,color:C.ghost,marginTop:10}}>Adequate. Not optimal.</div>}
        </div>
      )}

      <div style={{background:C.surface,padding:"22px 20px",marginBottom:32,borderTop:`1px solid ${C.silver}22`}}>
        <Lbl color={C.silver} style={{marginBottom:18}}>Log Sleep</Lbl>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
          <div><Lbl style={{marginBottom:8}}>Bedtime</Lbl><Input type="time" value={bed} onChange={e=>setBed(e.target.value)}/></div>
          <div><Lbl style={{marginBottom:8}}>Wake</Lbl><Input type="time" value={wake} onChange={e=>setWake(e.target.value)}/></div>
        </div>
        <Lbl style={{marginBottom:8}}>Quality</Lbl>
        <div style={{display:"flex",gap:1,marginBottom:20}}>
          {SLEEP_Q.map(sq=>(
            <button key={sq} onClick={()=>setQ(sq)} style={{
              flex:1,padding:"9px 4px",cursor:"pointer",fontFamily:"inherit",
              ...T.micro,textTransform:"none",fontSize:9,
              background:q===sq?C.silver:"transparent",
              border:`1px solid ${q===sq?C.silver:C.rule}`,
              color:q===sq?C.void:C.ghost,
              transition:"all 0.12s",
            }}>{sq}</button>
          ))}
        </div>
        <div style={{fontSize:12,color:C.ghost,marginBottom:16,letterSpacing:"0.06em"}}>= {hrs(bed,wake)} hours</div>
        <Btn onClick={log} accent={C.silver} style={{width:"100%"}}>Log Sleep</Btn>
      </div>

      <Lbl style={{marginBottom:14}}>Recent Nights</Lbl>
      {recent.map(d=>{
        const s=data.sleep[d];if(!s)return null;
        const h2=parseFloat(s.hours);
        const c=h2<6?C.orange:h2>=8?C.white:C.pale;
        return (
          <div key={d} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:`1px solid ${C.rule}`}}>
            <span style={{fontSize:11,color:C.ghost,letterSpacing:"0.08em"}}>{d}</span>
            <span style={{fontSize:22,fontWeight:300,color:c,fontVariantNumeric:"tabular-nums"}}>{s.hours}h</span>
            <Lbl style={{color:C.ghost}}>{s.quality}</Lbl>
          </div>
        );
      })}
    </div>
  );
};

// ─── TASKS ────────────────────────────────────────────────────────────────────
// Thragg: orange urgency, relentless
const Tasks = ({data,setData,date,setDate}) => {
  const [txt,setTxt]=useState("");
  const [dl,setDl]=useState("");
  const tasks=data.tasks[date]||[];

  const add=()=>{
    if(!txt.trim())return;
    setData({...data,tasks:{...data.tasks,[date]:[...tasks,{text:txt,deadline:dl,done:false,id:Date.now()}]}});
    setTxt("");setDl("");
  };
  const toggle=id=>setData({...data,tasks:{...data.tasks,[date]:tasks.map(t=>t.id===id?{...t,done:!t.done}:t)}});
  const remove=id=>setData({...data,tasks:{...data.tasks,[date]:tasks.filter(t=>t.id!==id)}});

  const urgencyColor=dl=>{
    if(!dl) return C.rim;
    const d=(new Date(dl)-new Date())/86400000;
    if(d<0)  return C.orange;
    if(d<1)  return C.orange;
    if(d<2)  return C.orangeHi;
    if(d<3)  return "#C88020";
    return C.pale;
  };

  const done=tasks.filter(t=>t.done).length;

  return (
    <div>
      <DatePicker date={date} setDate={setDate} accent={C.orange}/>

      <div style={{background:C.surface,padding:"22px 20px",marginBottom:32,borderTop:`1px solid ${C.orange}22`}}>
        <Lbl color={C.orange} style={{marginBottom:18}}>Add Task</Lbl>
        <Lbl style={{marginBottom:8}}>Task</Lbl>
        <Input value={txt} onChange={e=>setTxt(e.target.value)} placeholder="The list doesn't care."
          onKeyDown={e=>e.key==="Enter"&&add()} style={{marginBottom:16}}/>
        <Lbl style={{marginBottom:8}}>Deadline</Lbl>
        <Input type="datetime-local" value={dl} onChange={e=>setDl(e.target.value)} style={{marginBottom:20}}/>
        <Btn onClick={add} accent={C.orange} style={{width:"100%"}}>Add Task</Btn>
      </div>

      {tasks.length===0
        ? <Empty text="The world won't wait."/>
        : <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <Lbl>Tasks</Lbl>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <Lbl style={{color:done===tasks.length&&tasks.length>0?C.pale:C.ghost}}>{done}/{tasks.length}</Lbl>
                {/* Subtle completion bar */}
                <div style={{width:60,height:1,background:C.rule,position:"relative"}}>
                  <div style={{
                    position:"absolute",top:0,left:0,height:"100%",
                    width:`${tasks.length>0?(done/tasks.length)*100:0}%`,
                    background:C.orange,transition:"width 0.3s",
                  }}/>
                </div>
              </div>
            </div>
            {tasks.map(task=>(
              <div key={task.id} style={{
                display:"flex",alignItems:"flex-start",gap:12,
                padding:"13px 0 13px 12px",
                borderBottom:`1px solid ${C.rule}`,
                borderLeft:`2px solid ${task.done?C.rule:urgencyColor(task.deadline)}`,
                opacity:task.done?0.35:1,
                transition:"opacity 0.2s,border-color 0.2s",
              }}>
                <input type="checkbox" checked={task.done} onChange={()=>toggle(task.id)}
                  style={{marginTop:3,accentColor:C.orange,cursor:"pointer",flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,color:C.white,letterSpacing:"0.02em",textDecoration:task.done?"line-through":"none"}}>{task.text}</div>
                  {task.deadline&&(
                    <div style={{...T.micro,color:urgencyColor(task.deadline),marginTop:5}}>
                      Due {new Date(task.deadline).toLocaleDateString()} {new Date(task.deadline).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
                    </div>
                  )}
                </div>
                <button onClick={()=>remove(task.id)} style={{background:"none",border:"none",color:C.ghost,cursor:"pointer",fontSize:18,lineHeight:1,flexShrink:0}}>×</button>
              </div>
            ))}
          </>
      }
    </div>
  );
};

// ─── METRICS ─────────────────────────────────────────────────────────────────
// Split palette: weight=white (Emperor Mark), mood=orange (Thragg intensity), energy=silver
const Metrics = ({data,setData,date,setDate}) => {
  const [wt,setWt]=useState("");
  const [mood,setMood]=useState(3);
  const [energy,setEnergy]=useState(3);
  const ex=data.metrics[date];

  const log=()=>setData({...data,metrics:{...data.metrics,[date]:{weight:wt?parseFloat(wt):null,mood:parseInt(mood),energy:parseInt(energy)}}});

  const wtData=last30().map(d=>data.metrics[d]?.weight||null);
  const moodData=last30().map(d=>data.metrics[d]?.mood||null);
  const engData=last30().map(d=>data.metrics[d]?.energy||null);

  return (
    <div>
      <DatePicker date={date} setDate={setDate} accent={C.pale}/>

      {ex&&(
        <div style={{display:"flex",gap:1,marginBottom:32}}>
          {ex.weight!=null&&<StatTile label="WEIGHT" value={ex.weight} accent={C.white}/>}
          <StatTile label="MOOD"   value={`${ex.mood}/5`}   accent={C.orange}/>
          <StatTile label="ENERGY" value={`${ex.energy}/5`} accent={C.silver}/>
        </div>
      )}

      <div style={{background:C.surface,padding:"22px 20px",marginBottom:32}}>
        <Lbl color={C.pale} style={{marginBottom:18}}>Log Metrics</Lbl>
        <Lbl style={{marginBottom:8}}>Weight (lbs)</Lbl>
        <Input type="number" value={wt} onChange={e=>setWt(e.target.value)} placeholder="e.g. 175" style={{marginBottom:20}}/>
        {[
          {label:"Mood",   val:mood,   set:setMood,   color:C.orange},
          {label:"Energy", val:energy, set:setEnergy, color:C.silver},
        ].map(item=>(
          <div key={item.label} style={{marginBottom:20}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <Lbl>{item.label}</Lbl>
              <span style={{fontSize:13,color:item.color,fontVariantNumeric:"tabular-nums"}}>{item.val}/5</span>
            </div>
            <div style={{display:"flex",gap:1}}>
              {[1,2,3,4,5].map(n=>(
                <button key={n} onClick={()=>item.set(n)} style={{
                  flex:1,height:34,cursor:"pointer",fontFamily:"inherit",fontSize:12,
                  border:`1px solid ${item.val>=n?item.color:C.rule}`,
                  background:item.val>=n?`${item.color}18`:"transparent",
                  color:item.val>=n?item.color:C.ghost,
                  transition:"all 0.12s",
                }}>{n}</button>
              ))}
            </div>
          </div>
        ))}
        <Btn onClick={log} accent={C.pale} style={{width:"100%"}}>Log Metrics</Btn>
      </div>

      <Lbl style={{marginBottom:12}}>Weight — 30 days</Lbl>
      <div style={{background:C.surface,padding:"16px 16px 10px",marginBottom:28}}>
        <Spark data={wtData} color={C.white} h={60}/>
      </div>

      <Lbl style={{marginBottom:12}}>Mood / Energy</Lbl>
      <div style={{background:C.surface,padding:"16px 16px 10px"}}>
        <div style={{display:"flex",gap:20,marginBottom:10}}>
          {[["Mood",C.orange],["Energy",C.silver]].map(([l,c])=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:6,...T.micro,color:c}}>
              <div style={{width:12,height:1,background:c}}/>{l}
            </div>
          ))}
        </div>
        <div style={{position:"relative"}}>
          <Spark data={moodData} color={C.orange} h={60}/>
          <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,pointerEvents:"none"}}>
            <Spark data={engData} color={C.silver} h={60}/>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── WEEK ─────────────────────────────────────────────────────────────────────
const Week = ({data}) => {
  const days=last7();
  const DN=["SUN","MON","TUE","WED","THU","FRI","SAT"];
  return (
    <div>
      <Lbl style={{marginBottom:24}}>7-Day Summary</Lbl>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:460}}>
          <thead>
            <tr>
              {["DAY","SLEEP","WORKOUT","MOOD","ENERGY","WEIGHT","TASKS"].map(h=>(
                <th key={h} style={{padding:"0 8px 12px 0",textAlign:"left",...T.micro,color:C.ghost,fontWeight:500,borderBottom:`1px solid ${C.rule}`}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map(d=>{
              const s=data.sleep[d],w=data.workouts[d],m=data.metrics[d],tk=data.tasks[d]||[];
              const h=parseFloat(s?.hours||0),isT=d===today(),done=tk.filter(t=>t.done).length;
              return (
                <tr key={d} style={{borderBottom:`1px solid ${C.rule}`,background:isT?C.surface:"transparent"}}>
                  <td style={{padding:"13px 8px 13px 0"}}>
                    <div style={{...T.micro,color:isT?C.orange:C.silver}}>{DN[new Date(d+"T12:00:00").getDay()]}</div>
                    <div style={{fontSize:10,color:C.ghost,marginTop:3}}>{d.slice(5)}</div>
                  </td>
                  <td style={{padding:"13px 8px 13px 0"}}>
                    {s?<span style={{fontSize:16,fontWeight:300,color:h<6?C.orange:h>=8?C.white:C.pale,fontVariantNumeric:"tabular-nums"}}>{s.hours}h</span>:<Dash/>}
                  </td>
                  <td style={{padding:"13px 8px 13px 0"}}>
                    {w?<span style={{...T.micro,color:C.orange}}>✓ {w.exercises?.length||0}</span>:<Dash/>}
                  </td>
                  <td style={{padding:"13px 8px 13px 0"}}>
                    {m?.mood?<span style={{fontSize:14,fontWeight:300,color:C.orange}}>{m.mood}</span>:<Dash/>}
                  </td>
                  <td style={{padding:"13px 8px 13px 0"}}>
                    {m?.energy?<span style={{fontSize:14,fontWeight:300,color:C.silver}}>{m.energy}</span>:<Dash/>}
                  </td>
                  <td style={{padding:"13px 8px 13px 0"}}>
                    {m?.weight?<span style={{fontSize:14,fontWeight:300,color:C.white,fontVariantNumeric:"tabular-nums"}}>{m.weight}</span>:<Dash/>}
                  </td>
                  <td style={{padding:"13px 0"}}>
                    {tk.length>0?<span style={{fontSize:12,fontWeight:300,color:done===tk.length?"#55CC88":C.pale}}>{done}/{tk.length}</span>:<Dash/>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Rule accent={C.silver}/>
      <Lbl style={{marginBottom:12}}>Sleep Trend</Lbl>
      <Spark data={days.map(d=>data.sleep[d]?.hours?parseFloat(data.sleep[d].hours):null)} color={C.silver} h={52}/>
      <Rule accent={C.orange}/>
      <Lbl style={{marginBottom:12}}>Mood Trend</Lbl>
      <Spark data={days.map(d=>data.metrics[d]?.mood||null)} color={C.orange} h={52}/>
    </div>
  );
};

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function Mk1() {
  const [active,setActive]=useState("home");
  const [date,setDate]=useState(today());
  const [workouts,setWorkouts]=useLS("mk1_workouts",{});
  const [sleep,setSleep]=useLS("mk1_sleep",{});
  const [tasks,setTasks]=useLS("mk1_tasks",{});
  const [metrics,setMetrics]=useLS("mk1_metrics",{});
  const [streaks,setStreaks]=useLS("mk1_streaks",{});

  const data={workouts,sleep,tasks,metrics};
  const setData=nd=>{
    if(nd.workouts!==workouts)setWorkouts(nd.workouts);
    if(nd.sleep!==sleep)setSleep(nd.sleep);
    if(nd.tasks!==tasks)setTasks(nd.tasks);
    if(nd.metrics!==metrics)setMetrics(nd.metrics);
  };

  useEffect(()=>{
    const calc=get=>{
      let n=0,d=new Date();
      while(true){const k=d.toISOString().split("T")[0];if(get(k)){n++;d.setDate(d.getDate()-1);}else break;}
      return n;
    };
    setStreaks({
      workout:calc(k=>workouts[k]),
      sleep:calc(k=>sleep[k]&&parseFloat(sleep[k].hours)>=7),
      mood:calc(k=>metrics[k]?.mood),
      weight:calc(k=>metrics[k]?.weight),
    });
  },[workouts,sleep,metrics]);

  const p=SP[active];

  const render=()=>{
    switch(active){
      case"home":    return <Home data={data} streaks={streaks}/>;
      case"workout": return <Workout data={data} setData={setData} date={date} setDate={setDate}/>;
      case"sleep":   return <Sleep data={data} setData={setData} date={date} setDate={setDate}/>;
      case"tasks":   return <Tasks data={data} setData={setData} date={date} setDate={setDate}/>;
      case"metrics": return <Metrics data={data} setData={setData} date={date} setDate={setDate}/>;
      case"week":    return <Week data={data}/>;
    }
  };

  return (
    <div style={{fontFamily:"'DM Sans','Inter','Helvetica Neue',sans-serif",background:C.void,color:C.white,minHeight:"100vh",display:"flex",flexDirection:"column"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:2px;background:${C.void};}
        ::-webkit-scrollbar-thumb{background:${C.rim};}
        input[type=date]::-webkit-calendar-picker-indicator,
        input[type=time]::-webkit-calendar-picker-indicator,
        input[type=datetime-local]::-webkit-calendar-picker-indicator{filter:invert(0.35);cursor:pointer;}
        option{background:${C.raised};}
        @keyframes up{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .mod{animation:up 0.18s ease;}
      `}</style>

      <div style={{display:"flex",flex:1,minHeight:0}}>

        {/* SIDEBAR */}
        <aside style={{
          width:196,background:C.base,borderRight:`1px solid ${C.rule}`,
          display:"flex",flexDirection:"column",
          position:"sticky",top:0,height:"100vh",flexShrink:0,
        }} className="sidebar">

          {/* Wordmark — "Mk.1" as the pun / version */}
          <div style={{padding:"32px 24px 28px",borderBottom:`1px solid ${C.rule}`}}>
            <div style={{fontSize:26,fontWeight:300,letterSpacing:"0.1em",color:C.white,lineHeight:1}}>
              {VERSION}
            </div>
            {/* Subtle: version numbering echoes Mark's growth arc */}
            <div style={{...T.micro,color:C.ghost,marginTop:6}}>Performance</div>
            {/* Accent underline that changes with section */}
            <div style={{width:24,height:1,background:p.primary,marginTop:12,transition:"background 0.3s"}}/>
          </div>

          <nav style={{flex:1,padding:"18px 0"}}>
            {SECTIONS.map(s=>{
              const isA=active===s.id;
              const sp=SP[s.id];
              return (
                <button key={s.id} onClick={()=>setActive(s.id)} style={{
                  display:"flex",alignItems:"center",justifyContent:"space-between",
                  width:"100%",padding:"12px 24px",
                  background:"transparent",border:"none",
                  color:isA?sp.primary:C.ghost,cursor:"pointer",
                  ...T.micro,fontFamily:"inherit",
                  fontWeight:isA?600:500,
                  borderRight:`2px solid ${isA?sp.primary:"transparent"}`,
                  transition:"all 0.15s",textAlign:"left",
                }}>
                  <span>{s.label}</span>
                  {isA&&<div style={{width:3,height:3,background:sp.primary}}/>}
                </button>
              );
            })}
          </nav>

          <div style={{padding:"20px 24px",borderTop:`1px solid ${C.rule}`}}>
            <div style={{...T.micro,color:C.ghost,lineHeight:2.2}}>
              {new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}).toUpperCase()}
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
          <div style={{
            padding:"24px 36px 20px",borderBottom:`1px solid ${C.rule}`,
            background:C.base,display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexShrink:0,
          }}>
            <div>
              <div style={{...T.micro,color:C.ghost,marginBottom:8}}>{VERSION} / {active.toUpperCase()}</div>
              <div style={{fontSize:20,fontWeight:300,letterSpacing:"0.08em",color:C.white,lineHeight:1}}>
                {SECTIONS.find(s=>s.id===active)?.label}
              </div>
            </div>
            {/* Mobile wordmark */}
            <div style={{fontSize:18,fontWeight:300,letterSpacing:"0.1em",color:C.white,display:"none"}} className="mwm">{VERSION}</div>
            {/* Section accent dot — Thragg orange or Emperor silver */}
            <div style={{display:"flex",gap:4,alignItems:"center"}}>
              <div style={{width:4,height:4,background:p.secondary,transition:"background 0.3s"}}/>
              <div style={{width:6,height:6,background:p.primary,transition:"background 0.3s"}}/>
            </div>
          </div>

          <div style={{flex:1,overflowY:"auto",padding:"36px 36px 120px"}}>
            <div style={{maxWidth:620,width:"100%"}} className="mod" key={active}>
              {render()}
            </div>
          </div>
        </main>
      </div>

      {/* MOBILE NAV */}
      <div style={{
        position:"fixed",bottom:0,left:0,right:0,
        background:C.base,borderTop:`1px solid ${C.rule}`,
        display:"flex",zIndex:100,
        paddingBottom:"env(safe-area-inset-bottom,0)",
      }} className="mnav">
        {SECTIONS.map(s=>{
          const isA=active===s.id;
          const sp=SP[s.id];
          return (
            <button key={s.id} onClick={()=>setActive(s.id)} style={{
              flex:1,display:"flex",flexDirection:"column",alignItems:"center",
              padding:"11px 4px 9px",background:"transparent",border:"none",
              borderTop:`1px solid ${isA?sp.primary:"transparent"}`,
              color:isA?sp.primary:C.ghost,cursor:"pointer",
              ...T.micro,fontSize:7,fontFamily:"inherit",gap:4,
            }}>
              <div style={{width:3,height:3,background:isA?sp.primary:C.ghost,transition:"background 0.15s"}}/>
              <span>{s.label.slice(0,4)}</span>
            </button>
          );
        })}
      </div>

      <style>{`
        @media(max-width:660px){.sidebar{display:none!important;}.mwm{display:block!important;}}
        @media(min-width:661px){.mnav{display:none!important;}}
      `}</style>
    </div>
  );
}
