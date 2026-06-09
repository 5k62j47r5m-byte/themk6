import { useState, useEffect, useCallback } from "react";
import { Home as HomeIcon, Dumbbell, Moon, ListChecks, Activity, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

// Vibrant 3-hue system + tonal variants. Lighter graphite for less darkness,
// balanced cyan/yellow distribution.
const YELLOW    = "#ffe556";
const YELLOW_HI = "#fff7b0";
const YELLOW_LO = "#d4b32a";
const YELLOW_DK = "#8a6f15";
const CYAN      = "#22d4ff";  // brighter cyan for balance against yellow
const CYAN_HI   = "#7ce8ff";
const CYAN_LO   = "#1190b8";
const CYAN_DK   = "#0a5470";
const GRAPH     = "#3a4248";  // lightened — less dark canvas
const GRAPH_DK  = "#2a3035";  // recessed wells (also lighter)
const GRAPH_HI  = "#4a535b";  // raised cards
const GRAPH_HI2 = "#5a646e";  // hover
const SHADOW    = "rgba(0,0,0,0.4)";
const GLOW_Y    = "rgba(255,229,86,0.4)";
const GLOW_C    = "rgba(34,212,255,0.45)";

const C = {
  void:      GRAPH_DK,
  base:      GRAPH,
  surface:   GRAPH_HI,
  raised:    GRAPH_HI2,
  rim:       CYAN_LO,

  // "orange" name kept for legacy; semantically the warm accent (yellow)
  orange:    YELLOW,
  orangeHi:  YELLOW_HI,
  orangeDim: YELLOW_LO,

  // cool accent family
  white:     CYAN_HI,
  silver:    CYAN,
  pale:      YELLOW_HI,
  ghost:     "#a6b0b8",   // brighter muted text on lighter canvas
  charcoal:  GRAPH_DK,

  rule:      "#5a646e",
  shadow:    SHADOW,
};

// Balanced: 3 cyan-primary, 3 yellow-primary across the nav
const SP = {
  home:    { primary: YELLOW, secondary: CYAN   },
  workout: { primary: CYAN,   secondary: YELLOW },
  sleep:   { primary: CYAN,   secondary: YELLOW },
  tasks:   { primary: YELLOW, secondary: CYAN   },
  metrics: { primary: CYAN,   secondary: YELLOW },
  week:    { primary: YELLOW, secondary: CYAN   },
};

const VERSION = "The Mk16";

const SECTIONS = [
  { id:"home",    label:"HOME",    Icon: HomeIcon     },
  { id:"workout", label:"WORKOUT", Icon: Dumbbell     },
  { id:"sleep",   label:"SLEEP",   Icon: Moon         },
  { id:"tasks",   label:"TASKS",   Icon: ListChecks   },
  { id:"metrics", label:"METRICS", Icon: Activity     },
  { id:"week",    label:"WEEK",    Icon: CalendarDays },
];

const MUSCLE_GROUPS = ["Chest","Back","Shoulders","Biceps","Triceps","Legs","Glutes","Core","Calves"];
const PRESETS = {
  Chest:     ["Bench Press","Incline Bench Press","Decline Bench Press","Dumbbell Press","Incline DB Press","Cable Fly","Pec Deck","Dip","Push-up","Svend Press","Landmine Press","Floor Press"],
  Back:      ["Pull-up","Chin-up","Barbell Row","Pendlay Row","T-Bar Row","Lat Pulldown","Seated Cable Row","Single-Arm DB Row","Face Pull","Straight-Arm Pulldown","Meadows Row","Deadlift","Rack Pull","Shrug"],
  Shoulders: ["OHP","Seated DB Press","Arnold Press","Push Press","Lateral Raise","Cable Lateral","Rear Delt Fly","Reverse Pec Deck","Front Raise","Upright Row","Landmine Press"],
  Biceps:    ["Barbell Curl","EZ Bar Curl","Hammer Curl","Incline DB Curl","Preacher Curl","Cable Curl","Concentration Curl","Spider Curl","Zottman Curl","Reverse Curl"],
  Triceps:   ["Skull Crusher","Close-Grip Bench","Pushdown","Rope Pushdown","Overhead Extension","DB Overhead Ext","Dip (Triceps)","Diamond Push-up","JM Press","Kickback"],
  Legs:      ["Squat","Front Squat","Hack Squat","Leg Press","Bulgarian Split Squat","Lunge","RDL","Stiff-Leg Deadlift","Leg Curl","Leg Extension","Goblet Squat","Box Squat","Sissy Squat"],
  Glutes:    ["Hip Thrust","Barbell Glute Bridge","Sumo Deadlift","Cable Kickback","Step-Up","Bulgarian Split Squat","Single-Leg RDL","Frog Pump","Cable Pull-Through"],
  Core:      ["Plank","Side Plank","Ab Wheel","Hanging Leg Raise","Knee Raise","Dead Bug","Cable Crunch","Russian Twist","Pallof Press","V-Up","Toes to Bar","Dragon Flag"],
  Calves:    ["Standing Calf Raise","Seated Calf Raise","Leg Press Calf Raise","Donkey Calf Raise","Single-Leg Calf Raise","Jump Rope"],
};

// Strength standards (lbs) — Beginner / Intermediate / Advanced / Elite
const STRENGTH_STDS = {
  "Bench Press":   [95,155,215,275],
  "Incline Bench Press":[75,125,175,225],
  "OHP":           [55,95,135,175],
  "Push Press":    [75,120,165,210],
  "Dip":           [0,15,30,55],
  "Barbell Row":   [85,145,200,255],
  "Pendlay Row":   [95,155,210,265],
  "Pull-up":       [1,8,15,22],
  "Deadlift":      [135,225,315,405],
  "Squat":         [115,185,255,330],
  "Front Squat":   [85,145,205,265],
  "Leg Press":     [180,315,450,585],
  "RDL":           [95,165,235,305],
  "Hip Thrust":    [135,225,315,405],
  "Barbell Curl":  [45,75,105,135],
  "Skull Crusher": [45,75,105,135],
  "Lateral Raise": [10,20,30,45],
  "Standing Calf Raise":[95,155,225,295],
};

// Which muscle group each tracked lift trains (for tier→map integration)
const LIFT_MUSCLE = {
  "Bench Press":"Chest","Incline Bench Press":"Chest","Dip":"Chest",
  "OHP":"Shoulders","Push Press":"Shoulders","Lateral Raise":"Shoulders",
  "Barbell Row":"Back","Pendlay Row":"Back","Pull-up":"Back","Deadlift":"Back",
  "Squat":"Legs","Front Squat":"Legs","Leg Press":"Legs","RDL":"Legs",
  "Hip Thrust":"Glutes",
  "Barbell Curl":"Biceps",
  "Skull Crusher":"Triceps",
  "Standing Calf Raise":"Calves",
};
const SLEEP_Q = ["Terrible","Poor","OK","Good","Perfect"];

// ─── QUOTES (from show universe / paraphrased spirit) ─────────────────────────
const QUOTES = [
  "What will you have after 500 years?",
  "The older you get, the more everyone you know disappears.",
  "You have to be better than me.",
  "Every decision you make affects someone.",
  "You don't become who you're supposed to be by avoiding hard choices.",
  "Fear is only useful if it teaches you something.",
  "You can't undo what you've done, but you can decide what happens next.",
  "The future isn't something you find. It's something you build.",
  "The world keeps moving whether you're ready or not.",
  "People create their own purpose.",
  "The most important step you can take is the next one.",
  "It is possible to commit no mistakes and still lose.",
  "A man who has a why can bear almost any how.",
  "We suffer more in imagination than in reality.",
  "The obstacle is the way.",
  "You become what you repeatedly do.",
  "Better to light a candle than curse the darkness.",
  "Courage is not the absence of fear, but action despite it.",
  "You are not entitled to the fruits of your labor, only the labor itself.",
  "A smooth sea never made a skilled sailor.",
  "The best time to plant a tree was twenty years ago. The second-best time is now.",
  "The heaviest burdens are often the ones we refuse to set down.",
  "Discipline is choosing what you want most over what you want now.",
  "The cost of inaction is often greater than the cost of failure.",
  "No one is coming to save you.",
  "The man who moves a mountain begins by carrying away small stones.",
  "You don't rise to the level of your goals; you fall to the level of your systems.",
  "Freedom is what you do with what's been done to you.",
  "The only way out is through.",
  "When nothing is certain, everything is possible.",
];

// ─── UTILS ────────────────────────────────────────────────────────────────────
const today  = () => new Date().toISOString().split("T")[0];
const last7  = () => Array.from({length:7}, (_,i) => { const d=new Date(); d.setDate(d.getDate()-(6-i)); return d.toISOString().split("T")[0]; });
const last30 = () => Array.from({length:30},(_,i) => { const d=new Date(); d.setDate(d.getDate()-(29-i)); return d.toISOString().split("T")[0]; });

const useLS = (key, init) => {
  const [v,sv] = useState(() => { try { const s=localStorage.getItem(key); return s?JSON.parse(s):init; } catch { return init; }});
  const set = useCallback(val => { sv(val); try { localStorage.setItem(key,JSON.stringify(val)); } catch {} }, [key]);
  return [v,set];
};

// Shared cloud singleton — every device sees the same logs in real time.
const EMPTY = {workouts:{},sleep:{},tasks:{},metrics:{},maxw:{}};
const useCloud = () => {
  const [state,setState] = useState(EMPTY);
  const [loaded,setLoaded] = useState(false);
  useEffect(()=>{
    let alive=true;
    supabase.from("mk_state").select("*").eq("id","singleton").maybeSingle().then(({data})=>{
      if(!alive) return;
      if(data) setState({
        workouts:data.workouts||{}, sleep:data.sleep||{},
        tasks:data.tasks||{}, metrics:data.metrics||{}, maxw:data.maxw||{},
      });
      setLoaded(true);
    });
    const ch = supabase.channel("mk_state_rt")
      .on("postgres_changes",{event:"*",schema:"public",table:"mk_state"},(p)=>{
        const r=p.new;if(!r)return;
        setState({
          workouts:r.workouts||{}, sleep:r.sleep||{},
          tasks:r.tasks||{}, metrics:r.metrics||{}, maxw:r.maxw||{},
        });
      }).subscribe();
    return ()=>{alive=false;supabase.removeChannel(ch);};
  },[]);
  const save = useCallback((patch)=>{
    setState(prev=>{
      const next={...prev,...patch};
      supabase.from("mk_state").update({
        workouts:next.workouts, sleep:next.sleep, tasks:next.tasks,
        metrics:next.metrics, maxw:next.maxw, updated_at:new Date().toISOString(),
      }).eq("id","singleton").then(({error})=>{ if(error) console.error("[mk_state]",error); });
      return next;
    });
  },[]);
  return [state,save,loaded];
};

const quotePool = () => QUOTES;

const calcTier = (lift,val) => {
  const s=STRENGTH_STDS[lift]; if(!s) return null;
  if(val>=s[3]) return {label:"ELITE",    color:YELLOW,    rank:4};
  if(val>=s[2]) return {label:"ADVANCED", color:CYAN_HI,   rank:3};
  if(val>=s[1]) return {label:"INTER",    color:CYAN,      rank:2};
  return              {label:"BEGINNER",  color:YELLOW_LO, rank:1};
};

// Compute best tier per muscle from logged 1RMs
const tiersByMuscle = (maxW={}) => {
  const out={};
  Object.entries(LIFT_MUSCLE).forEach(([lift,muscle])=>{
    const v=parseFloat(maxW[lift]); if(!v) return;
    const t=calcTier(lift,v); if(!t) return;
    if(!out[muscle] || t.rank>out[muscle].rank) out[muscle]=t;
  });
  return out;
};

// ─── MUSCLE MAP GRADIENT ─────────────────────────────────────────────────────
// Cold white → battleship grey → Thragg orange → deep orange
// 0 = near-black rim, trace = ghost, low = silver, mid = pale, high = orange, elite = deep orange
const volColor = v => {
  if(!v||v<1)  return GRAPH;
  if(v<8)      return CYAN + "33";
  if(v<20)     return CYAN + "66";
  if(v<40)     return CYAN + "99";
  if(v<60)     return CYAN;
  if(v<80)     return YELLOW + "cc";
  return YELLOW;
};

const MuscleMap = ({vol, tiers = {}}) => {
  const g = m => volColor(vol[m]||0);
  // Tier-colored stroke per muscle — integrates strength ranking into the map
  const sk = m => tiers[m]?.color || "none";
  const sw = m => tiers[m] ? 1.6 : 0;

  const stops = [
    ["ELITE", YELLOW],
    ["HIGH",  YELLOW + "cc"],
    ["SOLID", CYAN],
    ["BUILD", CYAN + "99"],
    ["TRACE", CYAN + "33"],
    ["NONE",  GRAPH],
  ];

  const SIL = C.charcoal;
  const SILHOUETTE = "M60,8 C70,8 76,16 76,26 C76,34 72,40 68,42 L78,46 Q92,50 96,68 L108,80 Q112,84 108,92 L94,86 L88,80 L86,108 L82,148 Q86,170 84,196 L74,212 L66,212 L60,180 L54,212 L46,212 L36,196 Q34,170 38,148 L34,108 L32,80 L26,86 L12,92 Q8,84 12,80 L24,68 Q28,50 42,46 L52,42 C48,40 44,34 44,26 C44,16 50,8 60,8 Z";

  return (
    <div style={{display:"flex", gap:24, justifyContent:"center", alignItems:"flex-start", flexWrap:"wrap"}}>

      {/* ANTERIOR */}
      <div>
        <Lbl style={{textAlign:"center",marginBottom:10,color:C.ghost}}>Anterior</Lbl>
        <svg width="120" height="220" viewBox="0 0 120 220">
          <path d={SILHOUETTE} fill={SIL}/>
          <ellipse cx="32" cy="58" rx="9" ry="11" fill={g("Shoulders")} stroke={sk("Shoulders")} strokeWidth={sw("Shoulders")} opacity="0.95"/>
          <ellipse cx="88" cy="58" rx="9" ry="11" fill={g("Shoulders")} stroke={sk("Shoulders")} strokeWidth={sw("Shoulders")} opacity="0.95"/>
          <path d="M44,52 Q52,48 59,52 L59,74 Q52,78 44,74 Z" fill={g("Chest")} stroke={sk("Chest")} strokeWidth={sw("Chest")} opacity="0.95"/>
          <path d="M76,52 Q68,48 61,52 L61,74 Q68,78 76,74 Z" fill={g("Chest")} stroke={sk("Chest")} strokeWidth={sw("Chest")} opacity="0.95"/>
          <ellipse cx="26" cy="78" rx="7" ry="13" fill={g("Biceps")} stroke={sk("Biceps")} strokeWidth={sw("Biceps")} opacity="0.95"/>
          <ellipse cx="94" cy="78" rx="7" ry="13" fill={g("Biceps")} stroke={sk("Biceps")} strokeWidth={sw("Biceps")} opacity="0.95"/>
          <rect x="46" y="76" width="28" height="42" rx="3" fill={g("Core")} stroke={sk("Core")} strokeWidth={sw("Core")} opacity="0.95"/>
          <line x1="60" y1="76" x2="60" y2="118" stroke={C.void} strokeWidth="0.7" opacity="0.5"/>
          <line x1="46" y1="88" x2="74" y2="88" stroke={C.void} strokeWidth="0.5" opacity="0.4"/>
          <line x1="46" y1="100" x2="74" y2="100" stroke={C.void} strokeWidth="0.5" opacity="0.4"/>
          <path d="M44,124 Q40,128 40,168 L52,168 Q54,140 54,124 Z" fill={g("Legs")} stroke={sk("Legs")} strokeWidth={sw("Legs")} opacity="0.95"/>
          <path d="M76,124 Q80,128 80,168 L68,168 Q66,140 66,124 Z" fill={g("Legs")} stroke={sk("Legs")} strokeWidth={sw("Legs")} opacity="0.95"/>
          <ellipse cx="46" cy="186" rx="6" ry="10" fill={g("Calves")} stroke={sk("Calves")} strokeWidth={sw("Calves")} opacity="0.9"/>
          <ellipse cx="74" cy="186" rx="6" ry="10" fill={g("Calves")} stroke={sk("Calves")} strokeWidth={sw("Calves")} opacity="0.9"/>
        </svg>
      </div>

      {/* POSTERIOR */}
      <div>
        <Lbl style={{textAlign:"center",marginBottom:10,color:C.ghost}}>Posterior</Lbl>
        <svg width="120" height="220" viewBox="0 0 120 220">
          <path d={SILHOUETTE} fill={SIL}/>
          <path d="M48,46 Q60,42 72,46 Q66,54 60,54 Q54,54 48,46 Z" fill={g("Shoulders")} stroke={sk("Shoulders")} strokeWidth={sw("Shoulders")} opacity="0.95"/>
          <path d="M40,52 Q26,72 32,108 L60,104 L88,108 Q94,72 80,52 Q70,56 60,56 Q50,56 40,52 Z" fill={g("Back")} stroke={sk("Back")} strokeWidth={sw("Back")} opacity="0.95"/>
          <ellipse cx="26" cy="78" rx="7" ry="13" fill={g("Triceps")} stroke={sk("Triceps")} strokeWidth={sw("Triceps")} opacity="0.95"/>
          <ellipse cx="94" cy="78" rx="7" ry="13" fill={g("Triceps")} stroke={sk("Triceps")} strokeWidth={sw("Triceps")} opacity="0.95"/>
          <ellipse cx="50" cy="124" rx="11" ry="10" fill={g("Glutes")} stroke={sk("Glutes")} strokeWidth={sw("Glutes")} opacity="0.95"/>
          <ellipse cx="70" cy="124" rx="11" ry="10" fill={g("Glutes")} stroke={sk("Glutes")} strokeWidth={sw("Glutes")} opacity="0.95"/>
          <path d="M44,136 Q40,140 40,170 L52,170 Q54,150 54,136 Z" fill={g("Legs")} stroke={sk("Legs")} strokeWidth={sw("Legs")} opacity="0.95"/>
          <path d="M76,136 Q80,140 80,170 L68,170 Q66,150 66,136 Z" fill={g("Legs")} stroke={sk("Legs")} strokeWidth={sw("Legs")} opacity="0.95"/>
          <ellipse cx="46" cy="188" rx="6" ry="12" fill={g("Calves")} stroke={sk("Calves")} strokeWidth={sw("Calves")} opacity="0.95"/>
          <ellipse cx="74" cy="188" rx="6" ry="12" fill={g("Calves")} stroke={sk("Calves")} strokeWidth={sw("Calves")} opacity="0.95"/>
        </svg>
      </div>

      {/* SCALE */}
      <div style={{display:"flex",flexDirection:"column",paddingTop:22,gap:0}}>
        <Lbl style={{color:C.ghost,marginBottom:10}}>Volume</Lbl>
        <div style={{
          width:12,height:96,flexShrink:0,
          background:`linear-gradient(to top, ${GRAPH}, ${CYAN}55 20%, ${CYAN} 50%, ${YELLOW}cc 75%, ${YELLOW})`,
          border:`1px solid ${CYAN}66`,marginBottom:10,
        }}/>
        {stops.map(([l,c],i)=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:7,marginBottom:i<stops.length-1?5:0}}>
            <div style={{width:8,height:1,background:c,flexShrink:0}}/>
            <span style={{fontSize:8,letterSpacing:"0.18em",color:C.ghost,lineHeight:1}}>{l}</span>
          </div>
        ))}
        {Object.keys(tiers).length>0 && (
          <>
            <Lbl style={{color:C.ghost,marginTop:14,marginBottom:8}}>Tier ring</Lbl>
            {["BEGINNER","INTER","ADVANCED","ELITE"].map(t=>{
              const c={BEGINNER:YELLOW_LO,INTER:CYAN,ADVANCED:CYAN_HI,ELITE:YELLOW}[t];
              return (
                <div key={t} style={{display:"flex",alignItems:"center",gap:7,marginBottom:4}}>
                  <div style={{width:8,height:8,borderRadius:999,border:`1.5px solid ${c}`,background:"transparent"}}/>
                  <span style={{fontSize:8,letterSpacing:"0.18em",color:C.ghost,lineHeight:1}}>{t}</span>
                </div>
              );
            })}
          </>
        )}
      </div>

    </div>
  );
};

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────
const T = {
  micro: {fontSize:10, letterSpacing:"0.2em",  fontWeight:700, textTransform:"uppercase"},
  label: {fontSize:12, letterSpacing:"0.16em", fontWeight:700, textTransform:"uppercase"},
  body:  {fontSize:15, letterSpacing:"0.01em", fontWeight:500},
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
    background:`linear-gradient(180deg, ${accent}28, ${accent}10)`,
    border:`1.5px solid ${accent}`,
    color:accent,fontSize:11,letterSpacing:"0.2em",
    padding:"14px 24px",cursor:"pointer",
    fontFamily:"inherit",fontWeight:800,borderRadius:999,
    boxShadow:`0 2px 0 ${SHADOW}, inset 0 1px 0 ${accent}33`,
    textTransform:"uppercase",transition:"all 0.18s ease",...style,
  }}
    onMouseEnter={e=>{
      e.currentTarget.style.background=`linear-gradient(180deg, ${accent}, ${accent}cc)`;
      e.currentTarget.style.color=GRAPH_DK;
      e.currentTarget.style.boxShadow=`0 6px 18px ${accent}66, inset 0 1px 0 ${accent}`;
      e.currentTarget.style.transform="translateY(-2px)";
    }}
    onMouseLeave={e=>{
      e.currentTarget.style.background=`linear-gradient(180deg, ${accent}28, ${accent}10)`;
      e.currentTarget.style.color=accent;
      e.currentTarget.style.boxShadow=`0 2px 0 ${SHADOW}, inset 0 1px 0 ${accent}33`;
      e.currentTarget.style.transform="translateY(0)";
    }}
  >{children}</button>
);

const Chip = ({label,color=C.silver}) => (
  <span style={{
    ...T.micro,padding:"4px 10px",borderRadius:999,
    border:`1.5px solid ${color}`,color,background:`${color}1a`,
  }}>{label}</span>
);

const DatePicker = ({date,setDate,accent=C.orange}) => (
  <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:32}}>
    <Lbl>Date</Lbl>
    <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{
      background:"transparent",border:"none",borderBottom:`2px solid ${C.rim}`,
      color:C.white,fontSize:15,fontWeight:600,padding:"4px 0",outline:"none",
      fontFamily:"inherit",letterSpacing:"0.04em",colorScheme:"dark",
    }}/>
  </div>
);

const Empty = ({text}) => (
  <div style={{padding:"52px 0",textAlign:"center",...T.micro,color:C.ghost,lineHeight:2}}>
    {text}
  </div>
);

const Dash = () => <span style={{color:C.rim,fontSize:16,fontWeight:600}}>—</span>;

const StatTile = ({label,value,accent,style={}}) => (
  <div style={{
    flex:1,background:`linear-gradient(160deg, ${C.surface}, ${C.base})`,
    padding:"22px 16px",borderRadius:14,
    border:`1px solid ${accent}44`,
    borderBottom:`3px solid ${accent}`,
    boxShadow:`0 4px 12px ${SHADOW}, inset 0 1px 0 ${accent}22`,
    ...style,
  }}>
    <div style={{fontSize:34,fontWeight:700,color:accent,fontVariantNumeric:"tabular-nums",lineHeight:1,textShadow:`0 0 18px ${accent}55`}}>{value}</div>
    <Lbl style={{marginTop:10}}>{label}</Lbl>
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
  const pool=quotePool(data);
  const [qIdx,setQIdx]=useState(0);
  useEffect(()=>{
    setQIdx(0);
    const id=setInterval(()=>setQIdx(i=>(i+1)%pool.length),20000);
    return ()=>clearInterval(id);
  },[pool]);
  const quote=pool[qIdx%pool.length];
  const s=data.sleep[t],w=data.workouts[t],m=data.metrics[t],tk=data.tasks[t]||[];
  const wkDays=last7();
  const sleepVals=wkDays.map(d=>data.sleep[d]?.hours).filter(Boolean).map(Number);
  const moodVals=wkDays.map(d=>data.metrics[d]?.mood).filter(Boolean).map(Number);
  const wCount=wkDays.filter(d=>data.workouts[d]).length;
  const wts=wkDays.map(d=>data.metrics[d]?.weight).filter(Boolean).map(Number);

  return (
    <div>
      {/* Quote — bold left bar, bigger heft */}
      <div style={{
        borderLeft:`4px solid ${C.orange}`,paddingLeft:24,paddingBottom:32,marginBottom:36,
        borderBottom:`1px solid ${C.rule}`,
      }}>
        <Lbl color={C.orange} style={{marginBottom:14}}>Today</Lbl>
        <div key={qIdx} style={{
          fontSize:22,fontWeight:600,color:C.white,lineHeight:1.45,letterSpacing:"0.005em",
          fontStyle:"italic",maxWidth:520,animation:"up 0.4s ease",textShadow:`0 0 24px ${GLOW_Y}33`,
        }}>
          "{quote}"
        </div>
      </div>


      {/* Streaks */}
      <Lbl style={{marginBottom:18}}>Streaks</Lbl>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:36}}>
        {[
          {label:"WORKOUT",val:streaks.workout||0,accent:C.orange},
          {label:"SLEEP",  val:streaks.sleep||0,  accent:C.silver},
          {label:"MOOD",   val:streaks.mood||0,   accent:C.pale},
          {label:"WEIGHT", val:streaks.weight||0, accent:CYAN_HI},
        ].map(({label,val,accent})=>(
          <div key={label} style={{
            background:`linear-gradient(160deg, ${C.surface}, ${C.base})`,
            padding:"22px 14px",borderRadius:14,
            border:`1px solid ${val>0?accent+"55":C.rule}`,
            borderBottom:`3px solid ${val>0?accent:C.rule}`,
            boxShadow:val>0?`0 4px 16px ${accent}33`:`0 2px 6px ${SHADOW}`,
          }}>
            <div style={{fontSize:38,fontWeight:800,color:val>0?accent:C.ghost,fontVariantNumeric:"tabular-nums",lineHeight:1,textShadow:val>0?`0 0 18px ${accent}66`:"none"}}>{val>0?val:"—"}</div>
            <Lbl style={{marginTop:10}}>{label}</Lbl>
            {val>0&&<div style={{fontSize:9,fontWeight:700,color:accent+"99",letterSpacing:"0.22em",marginTop:4}}>DAY{val!==1?"S":""}</div>}
          </div>
        ))}
      </div>

      {/* Status */}
      <Lbl style={{marginBottom:18}}>Status</Lbl>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:36}}>
        {[
          {label:"WORKOUT",logged:!!w,detail:w?`${w.exercises?.length||0} exercises`:"Not logged",accent:SP.workout.primary},
          {label:"SLEEP",  logged:!!s,detail:s?`${s.hours}h · ${s.quality}`:"Not logged",          accent:SP.sleep.primary},
          {label:"TASKS",  logged:tk.length>0,detail:tk.length>0?`${tk.filter(x=>x.done).length}/${tk.length} done`:"Nothing added",accent:SP.tasks.primary},
          {label:"METRICS",logged:!!m,detail:m?`${m.weight||"—"} lbs · ${m.mood||"—"}/5`:"Not logged",accent:SP.metrics.primary},
        ].map(item=>(
          <div key={item.label} style={{
            background:C.surface,padding:"20px 18px",borderRadius:12,
            border:`1px solid ${item.logged?item.accent+"55":C.rule}`,
            borderLeft:`4px solid ${item.logged?item.accent:C.rule}`,
            boxShadow:`0 2px 8px ${SHADOW}`,
          }}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <Lbl>{item.label}</Lbl>
              <span style={{fontSize:14,fontWeight:800,color:item.logged?"#55CC88":C.orange}}>{item.logged?"✓":"✗"}</span>
            </div>
            <div style={{fontSize:14,fontWeight:600,color:item.logged?C.white:C.ghost,letterSpacing:"0.02em"}}>{item.detail}</div>
          </div>
        ))}
      </div>

      {/* Week avg */}
      <Lbl style={{marginBottom:18}}>Week Average</Lbl>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
        {[
          {label:"SLEEP",    val:sleepVals.length?(sleepVals.reduce((a,b)=>a+b)/sleepVals.length).toFixed(1)+"h":"—",accent:C.silver},
          {label:"WORKOUTS", val:`${wCount}/7`, accent:C.orange},
          {label:"MOOD",     val:moodVals.length?(moodVals.reduce((a,b)=>a+b)/moodVals.length).toFixed(1):"—",accent:C.pale},
          {label:"WT Δ",     val:wts.length>=2?`${(wts.at(-1)-wts[0])>0?"+":""}${(wts.at(-1)-wts[0]).toFixed(1)}`:"—",accent:CYAN_HI},
        ].map(({label,val,accent})=>(
          <div key={label} style={{
            background:C.surface,padding:"20px 14px",borderRadius:12,
            border:`1px solid ${accent}33`,
            boxShadow:`0 2px 6px ${SHADOW}`,
          }}>
            <div style={{fontSize:26,fontWeight:700,color:accent,fontVariantNumeric:"tabular-nums",lineHeight:1}}>{val}</div>
            <Lbl style={{marginTop:10}}>{label}</Lbl>
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
  const [wt,setWt]=useState("");
  const [notes,setNotes]=useState("");
  const maxW = data.maxw || {};
  const setMaxW = (v) => setData({...data, maxw: v});
  const [mapWindow,setMapWindow]=useState(7); // 1 = today, 7 or 30 = trailing N days

  const day=data.workouts[date]||{exercises:[]};

  // Volume over a trailing window ending on the selected date.
  // mapWindow=1 means just the selected date.
  const vol=(()=>{
    const out={}; MUSCLE_GROUPS.forEach(m=>out[m]=0);
    const end=new Date(date+"T12:00:00");
    for(let i=0;i<mapWindow;i++){
      const d=new Date(end); d.setDate(end.getDate()-i);
      const k=d.toISOString().split("T")[0];
      const exs=data.workouts[k]?.exercises||[];
      exs.forEach(e=>{ if(out[e.muscle]!=null) out[e.muscle]+=e.sets*e.reps; });
    }
    // Normalize: scale so a strong week reads near 100. Per-day cap 100; windowed cap roughly N*30.
    const cap=Math.max(60, mapWindow*30);
    MUSCLE_GROUPS.forEach(m=>{ out[m]=Math.min(100, Math.round((out[m]/cap)*100)); });
    return out;
  })();

  const tiers = tiersByMuscle(maxW);

  const add=()=>{
    const name=useCustom?custom:exName;if(!name.trim())return;
    const ex={name,muscle,sets:parseInt(sets)||0,reps:parseInt(reps)||0,weight:wt?parseFloat(wt):null,notes};
    setData({...data,workouts:{...data.workouts,[date]:{exercises:[...(day.exercises||[]),ex]}}});
    setNotes("");setWt("");
  };
  const remove=i=>{
    if(!confirm("Delete this exercise?")) return;
    setData({...data,workouts:{...data.workouts,[date]:{exercises:day.exercises.filter((_,idx)=>idx!==i)}}});
  };
  const edit=i=>{
    const cur=day.exercises[i];
    const sets=prompt("Sets",String(cur.sets)); if(sets===null) return;
    const reps=prompt("Reps",String(cur.reps)); if(reps===null) return;
    const wt=prompt("Weight (lbs, blank for none)",cur.weight!=null?String(cur.weight):""); if(wt===null) return;
    const notes=prompt("Notes",cur.notes||""); if(notes===null) return;
    const next={...cur,
      sets:parseInt(sets)||cur.sets,
      reps:parseInt(reps)||cur.reps,
      weight:wt.trim()===""?null:parseFloat(wt),
      notes,
    };
    setData({...data,workouts:{...data.workouts,[date]:{exercises:day.exercises.map((e,idx)=>idx===i?next:e)}}});
  };

  const totalSets=(day.exercises||[]).reduce((a,e)=>a+e.sets,0);
  const totalReps=(day.exercises||[]).reduce((a,e)=>a+e.sets*e.reps,0);

  // Progression: build history per exercise name across all dates
  const history={};
  Object.keys(data.workouts).sort().forEach(d=>{
    (data.workouts[d]?.exercises||[]).forEach(e=>{
      if(!history[e.name]) history[e.name]=[];
      history[e.name].push({date:d,reps:e.reps,sets:e.sets,weight:e.weight});
    });
  });
  const exerciseNames=Object.keys(history).filter(n=>history[n].length>=2);
  const [trackEx,setTrackEx]=useState("");
  const selectedEx=trackEx&&history[trackEx]?trackEx:(exerciseNames[0]||"");


  return (
    <div>
      <DatePicker date={date} setDate={setDate} accent={CYAN}/>

      {/* Map — windowed volume + strength tier rings */}
      <div style={{background:C.surface,padding:"22px 18px",marginBottom:32,borderRadius:12,borderTop:`2px solid ${CYAN}55`,boxShadow:`0 4px 14px ${SHADOW}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:10}}>
          <Lbl color={CYAN}>Activation Map</Lbl>
          <div style={{display:"flex",gap:4}}>
            {[["TODAY",1],["7 DAYS",7],["30 DAYS",30]].map(([lbl,n])=>(
              <button key={n} onClick={()=>setMapWindow(n)} style={{
                padding:"5px 10px",fontSize:9,fontWeight:700,letterSpacing:"0.16em",
                fontFamily:"inherit",cursor:"pointer",borderRadius:999,
                border:`1px solid ${mapWindow===n?CYAN:C.rule}`,
                background:mapWindow===n?`${CYAN}22`:"transparent",
                color:mapWindow===n?CYAN:C.ghost,transition:"all 0.15s",
              }}>{lbl}</button>
            ))}
          </div>
        </div>
        <MuscleMap vol={vol} tiers={tiers}/>
        <div style={{marginTop:14,textAlign:"center",fontSize:8,color:C.ghost,letterSpacing:"0.2em"}}>
          {mapWindow===1
            ? (totalReps>0?`${totalSets} sets · ${totalReps} reps today`:"No volume today")
            : `Trailing ${mapWindow} days · rings = strength tier`}
        </div>
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
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:16}}>
          <div><Lbl style={{marginBottom:8}}>Sets</Lbl><Input type="number" value={sets} onChange={e=>setSets(e.target.value)} min="1"/></div>
          <div><Lbl style={{marginBottom:8}}>Reps</Lbl><Input type="number" value={reps} onChange={e=>setReps(e.target.value)} min="1"/></div>
          <div><Lbl style={{marginBottom:8}}>Weight</Lbl><Input type="number" value={wt} onChange={e=>setWt(e.target.value)} placeholder="lbs" min="0"/></div>
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
                    {ex.weight!=null&&<span style={{color:C.white}}>{ex.weight} lbs</span>}
                    {ex.notes&&<span style={{color:C.ghost}}>{ex.notes}</span>}
                  </div>
                </div>
                <div style={{display:"flex",gap:4,flexShrink:0}}>
                  <button onClick={()=>edit(i)} title="Edit" style={{background:"none",border:`1px solid ${C.rule}`,color:C.silver,cursor:"pointer",fontSize:10,letterSpacing:"0.15em",fontWeight:700,padding:"4px 8px",borderRadius:4,fontFamily:"inherit"}}>EDIT</button>
                  <button onClick={()=>remove(i)} title="Delete" style={{background:"none",border:`1px solid ${C.rule}`,color:C.ghost,cursor:"pointer",fontSize:14,lineHeight:1,padding:"2px 8px",borderRadius:4}}>×</button>
                </div>
              </div>
            ))}
          </>
      }

      <Rule accent={C.orange}/>

      {/* Exercise Progression — line graph of weight and reps over time */}
      <Lbl color={C.orange} style={{marginBottom:18}}>Progression</Lbl>
      <div style={{fontSize:9,color:C.ghost,letterSpacing:"0.14em",marginBottom:16}}>Reps & weight per exercise over time</div>
      {exerciseNames.length===0
        ? <Empty text="Log the same exercise twice to see progression."/>
        : <div style={{background:C.surface,padding:"20px",marginBottom:32}}>
            <Lbl style={{marginBottom:8}}>Exercise</Lbl>
            <Sel value={selectedEx} onChange={e=>setTrackEx(e.target.value)} style={{marginBottom:20}}>
              {exerciseNames.map(n=><option key={n}>{n}</option>)}
            </Sel>
            {(()=>{
              const h=history[selectedEx]||[];
              const wts=h.map(p=>p.weight!=null?p.weight:null);
              const rps=h.map(p=>p.reps);
              const hasWt=wts.some(v=>v!=null);
              return (
                <>
                  {hasWt&&<>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                      <Lbl color={C.white}>Weight (lbs)</Lbl>
                      <span style={{...T.micro,color:C.ghost}}>{h.length} sessions</span>
                    </div>
                    <Spark data={wts} color={C.white} h={70}/>
                    <div style={{height:18}}/>
                  </>}
                  <Lbl color={C.orange} style={{marginBottom:8}}>Reps</Lbl>
                  <Spark data={rps} color={C.orange} h={70}/>
                </>
              );
            })()}
          </div>
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
  const removeSleep=(d)=>{
    if(!confirm("Delete this sleep entry?")) return;
    const next={...data.sleep}; delete next[d];
    setData({...data,sleep:next});
  };
  const loadSleep=(d)=>{
    const s=data.sleep[d]; if(!s) return;
    setBed(s.bedtime); setWake(s.wakeTime); setQ(s.quality);
    setDate(d);
  };
  const ex=data.sleep[date];
  const h=ex?parseFloat(ex.hours):0;
  const recent=last7().reverse();

  const sleepAccent = h<6?C.orange : h>=8?C.white : C.silver;

  return (
    <div>
      <DatePicker date={date} setDate={setDate} accent={C.orange}/>

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
          <div style={{display:"flex",gap:8,marginTop:14}}>
            <button onClick={()=>loadSleep(date)} style={{background:"none",border:`1px solid ${C.rule}`,color:C.silver,cursor:"pointer",fontSize:10,letterSpacing:"0.18em",fontWeight:700,padding:"6px 12px",borderRadius:4,fontFamily:"inherit"}}>EDIT</button>
            <button onClick={()=>removeSleep(date)} style={{background:"none",border:`1px solid ${C.rule}`,color:C.orange,cursor:"pointer",fontSize:10,letterSpacing:"0.18em",fontWeight:700,padding:"6px 12px",borderRadius:4,fontFamily:"inherit"}}>DELETE</button>
          </div>
        </div>
      )}

      <div style={{background:C.surface,padding:"22px 20px",marginBottom:32,borderTop:`1px solid ${C.orange}55`}}>
        <Lbl color={C.orange} style={{marginBottom:18}}>Log Sleep</Lbl>
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
              background:q===sq?C.orange:"transparent",
              border:`1px solid ${q===sq?C.orange:C.rule}`,
              color:q===sq?C.void:C.ghost,
              transition:"all 0.12s",
            }}>{sq}</button>
          ))}
        </div>
        <div style={{fontSize:12,color:C.ghost,marginBottom:16,letterSpacing:"0.06em"}}>= {hrs(bed,wake)} hours</div>
        <Btn onClick={log} accent={C.orange} style={{width:"100%"}}>Log Sleep</Btn>
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
  const [data,saveCloud,loaded]=useCloud();
  const {workouts,sleep,tasks,metrics}=data;
  const [streaks,setStreaks]=useState({});

  const setData=nd=>{
    const patch={};
    if(nd.workouts!==workouts) patch.workouts=nd.workouts;
    if(nd.sleep!==sleep)       patch.sleep=nd.sleep;
    if(nd.tasks!==tasks)       patch.tasks=nd.tasks;
    if(nd.metrics!==metrics)   patch.metrics=nd.metrics;
    if(nd.maxw && nd.maxw!==data.maxw) patch.maxw=nd.maxw;
    if(Object.keys(patch).length) saveCloud(patch);
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

          {/* Wordmark */}
          <div style={{padding:"34px 24px 28px",borderBottom:`1px solid ${C.rule}`}}>
            <div style={{fontSize:32,fontWeight:800,letterSpacing:"0.06em",color:C.white,lineHeight:1,textShadow:`0 0 24px ${GLOW_Y}`}}>
              {VERSION}
            </div>
            <div style={{...T.micro,color:C.silver,marginTop:8}}>Performance</div>
            <div style={{width:36,height:3,background:`linear-gradient(90deg,${p.primary},${p.secondary})`,marginTop:14,borderRadius:999,transition:"background 0.3s"}}/>
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
            padding:"22px 36px 18px",borderBottom:`1px solid ${C.rule}`,
            background:`linear-gradient(180deg, ${C.base}, ${C.void})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
          }}>
            <div style={{fontSize:28,fontWeight:800,letterSpacing:"0.08em",color:C.white,lineHeight:1,textAlign:"center",textShadow:`0 0 22px ${GLOW_Y}`}}>
              {VERSION}
            </div>
          </div>

          <div style={{flex:1,overflowY:"auto",padding:"36px 36px 120px"}}>
            <div style={{maxWidth:620,width:"100%",margin:"0 auto"}} className="mod" key={active}>
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
          const Icon=s.Icon;
          return (
            <button key={s.id} onClick={()=>setActive(s.id)} style={{
              flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
              padding:"9px 2px 7px",background:"transparent",border:"none",
              borderTop:`1px solid ${isA?sp.primary:"transparent"}`,
              color:isA?sp.primary:C.ghost,cursor:"pointer",
              ...T.micro,fontSize:8,fontFamily:"inherit",gap:4,
            }}>
              <Icon size={16} strokeWidth={1.6}/>
              <span style={{letterSpacing:"0.12em"}}>{s.label}</span>
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
