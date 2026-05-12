import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

// ── Teelworks Design Tokens ───────────────────────────────────
const T = {
  bg:            "#FAF8F5",
  bgLow:         "#F5F3F0",
  surface:       "#FFFFFF",
  surfaceHigh:   "#EAE8E5",
  border:        "#E4E2DF",
  borderMid:     "#C4C6CD",
  primary:       "#3D5066",
  primaryDark:   "#26394E",
  primaryLight:  "#EEF2F6",
  secondary:     "#E8924A",
  secondaryDark: "#914C04",
  secondaryLight:"#FFF3E8",
  text:          "#1B1C1A",
  textMid:       "#43474C",
  textDim:       "#74777D",
  green:         "#2D7A4F",
  greenBg:       "#E8F5EE",
  red:           "#BA1A1A",
  redBg:         "#FFDAD6",
  amber:         "#A05C00",
  amberBg:       "#FFECD4",
  blue:          "#3D5066",
  blueBg:        "#E8EEF5",
};

// ── 8Coatings-specific job statuses (milestone billing) ──────
const JOB_STATUSES = ["Site Survey", "Contract Signed", "Materials Delivered", "Week 1 Complete", "Week 3 Complete", "Final Acceptance", "On Hold", "Complete"];
const LEAD_STATUSES = ["New Inquiry", "Site Visit Scheduled", "Proposal Sent", "Contract Signed", "Lost"];
const INV_STATUSES  = ["Unpaid", "Partial", "Paid", "Overdue"];
const SUB_STATUSES  = ["Available", "On Job", "Unavailable"];
const CREW_ROLES    = ["Foreman", "Coating Technician", "Surface Prep", "Equipment Operator", "Laborer"];
const SUB_TRADES    = ["Polyurea Application", "Surface Preparation", "Waterproofing", "Concrete Repair", "Equipment & Logistics", "General Labor"];
const FACILITY_TYPES = ["Water Tank", "Treatment Facility", "Commercial Floor", "Walmart/Retail", "Industrial Floor", "Roof Coating", "Other"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// ── 8Coatings billing milestone draws ───────────────────────
const DRAW_SCHEDULE = [
  { milestone: "Contract Signed + Materials Delivered", pct: 40 },
  { milestone: "Week 1 Completion",                     pct: 25 },
  { milestone: "Week 3 Completion",                     pct: 25 },
  { milestone: "Final Acceptance",                      pct: 10 },
];

const STATUS_META = {
  "New Inquiry":        { color: T.blue,      bg: T.blueBg        },
  "Site Visit Scheduled":{ color: T.amber,    bg: T.amberBg       },
  "Proposal Sent":      { color: T.secondary, bg: T.secondaryLight },
  "Contract Signed":    { color: T.green,     bg: T.greenBg       },
  Lost:                 { color: T.red,       bg: T.redBg         },
  "Site Survey":        { color: T.blue,      bg: T.blueBg        },
  "Materials Delivered":{ color: T.amber,     bg: T.amberBg       },
  "Week 1 Complete":    { color: T.secondary, bg: T.secondaryLight },
  "Week 3 Complete":    { color: "#5B3E8F",   bg: "#F0ECFC"       },
  "Final Acceptance":   { color: T.green,     bg: T.greenBg       },
  "On Hold":            { color: T.amber,     bg: T.amberBg       },
  Complete:             { color: T.green,     bg: T.greenBg       },
  Unpaid:               { color: T.amber,     bg: T.amberBg       },
  Partial:              { color: T.secondary, bg: T.secondaryLight },
  Paid:                 { color: T.green,     bg: T.greenBg       },
  Overdue:              { color: T.red,       bg: T.redBg         },
  Available:            { color: T.green,     bg: T.greenBg       },
  "On Job":             { color: T.secondary, bg: T.secondaryLight },
  Unavailable:          { color: T.red,       bg: T.redBg         },
  Pending:              { color: T.amber,     bg: T.amberBg       },
  Approved:             { color: T.green,     bg: T.greenBg       },
  Declined:             { color: T.red,       bg: T.redBg         },
  Draft:                { color: T.textDim,   bg: T.surfaceHigh   },
  Sent:                 { color: T.blue,      bg: T.blueBg        },
  Approved:             { color: T.green,     bg: T.greenBg       },
  Declined:             { color: T.red,       bg: T.redBg         },
};

const AUTO_MESSAGES = {
  "Proposal Sent": {
    label: "Proposal Follow-Up", icon: "📋",
    email: { subject: () => `Your 8Coating Proposal`, body: (n) => `Hi ${n},\n\nThank you for the opportunity to assess your project. I wanted to follow up on the proposal we sent over.\n\n8Coating specializes in polyurea coating systems for potable water infrastructure and commercial flooring — and we stand behind every job with a 10-year warranty.\n\nIf you have any questions about the proposal, draw schedule, or our process, I'm happy to walk through it with you directly.\n\nLooking forward to working with you,\nDavid Brewer\n8Coating\n[Phone]` },
    sms: (n) => `Hi ${n}, David from 8Coating here. Just following up on the proposal we sent over — any questions? Happy to talk through the details. Call or reply anytime.`,
  },
  "Contract Signed": {
    label: "Welcome & Kickoff", icon: "🤝",
    email: { subject: () => `Welcome — Let's Get Started`, body: (n) => `Hi ${n},\n\nGreat news — we're officially moving forward. We'll be in touch shortly to confirm mobilization dates and coordinate the 40% materials deposit.\n\nAs a reminder, here's how our draw schedule works:\n• 40% — Contract signing + materials delivered to site\n• 25% — Week 1 completion\n• 25% — Week 3 completion\n• 10% — Final acceptance\n\nWe take care of everything from surface prep to final coat. You'll hear from us as each milestone is reached.\n\nThank you for choosing 8Coating,\nDavid Brewer` },
    sms: (n) => `Hi ${n}, David from 8Coating — we're locked in and excited to get started. We'll confirm mobilization dates shortly. Thank you for choosing us!`,
  },
  Complete: {
    label: "Job Complete + Warranty + Review", icon: "⭐",
    email: { subject: () => `Your Project Is Complete — 10-Year Warranty Active`, body: (n) => `Hi ${n},\n\nYour project is officially complete and your 10-year warranty is now active. It was a genuine pleasure working with you.\n\nWe'll be in touch at the 6-month and 1-year marks for a courtesy check-in — and we're always a call away if anything comes up in the meantime.\n\nIf you're happy with the results, a quick Google review would mean a great deal to us:\n👉 [Google Review Link]\n\nThank you for trusting 8Coating,\nDavid Brewer` },
    sms: (n) => `Hi ${n}, David from 8Coating — your project is complete and your 10-year warranty is active! A Google review would mean a lot: [Link]. Thank you!`,
  },
};

// ── Sample data — 8Coatings specific ────────────────────────
const initialCrew = [
  { id:1, name:"Marcus Webb",    role:"Foreman",           phone:"479-555-0201", email:"marcus@8coating.com",  status:"On Job",    skills:"Polyurea application, crew lead, equipment operation" },
  { id:2, name:"DeShawn Carter", role:"Coating Technician",phone:"479-555-0202", email:"deshawn@8coating.com", status:"On Job",    skills:"Polyurea spray, surface inspection, quality control" },
  { id:3, name:"Luis Herrera",   role:"Surface Prep",      phone:"479-555-0203", email:"luis@8coating.com",    status:"On Job",    skills:"Blast prep, grinding, crack repair, priming" },
  { id:4, name:"Ray Tatum",      role:"Equipment Operator",phone:"479-555-0204", email:"ray@8coating.com",     status:"Available", skills:"Spray rig operation, equipment maintenance, transport" },
  { id:5, name:"David Brewer",   role:"Foreman",           phone:"479-555-0100", email:"davidb.get@gmail.com", status:"Available", skills:"All phases — estimating, project management, application" },
];

const initialSubs = [
  { id:1, name:"Garrett Faulk",    company:"Faulk Surface Prep LLC",    trade:"Surface Preparation",    phone:"479-555-0301", email:"garrett@faulkprep.com",   status:"On Job",     contractOnFile:true,  w9OnFile:true,  insuranceCurrent:true,  notes:[{text:"Reliable — used on Rogers Water Authority job",date:"Apr 10"}] },
  { id:2, name:"Tony Reyes",       company:"Reyes Concrete Repair",     trade:"Concrete Repair",        phone:"479-555-0302", email:"tony@reyesconcrete.com",  status:"Available",  contractOnFile:true,  w9OnFile:true,  insuranceCurrent:true,  notes:[] },
  { id:3, name:"Steve Holcomb",    company:"Holcomb Equipment Co.",     trade:"Equipment & Logistics",  phone:"479-555-0303", email:"steve@holcombequip.com",  status:"Available",  contractOnFile:false, w9OnFile:true,  insuranceCurrent:false, notes:[{text:"Need updated COI before next job",date:"Apr 22"}] },
  { id:4, name:"Jorge Mendoza",    company:"Mendoza Waterproofing",     trade:"Waterproofing",          phone:"479-555-0304", email:"jorge@mendozawp.com",     status:"Unavailable",contractOnFile:true,  w9OnFile:false, insuranceCurrent:true,  notes:[{text:"Booked through June — check July availability",date:"Apr 18"}] },
  { id:5, name:"Calvin Price",     company:"Price General Labor",       trade:"General Labor",          phone:"479-555-0305", email:"calvin@pricegenlabor.com",status:"Available",  contractOnFile:true,  w9OnFile:true,  insuranceCurrent:true,  notes:[] },
];

const initialLeads = [
  { id:1, name:"Greg Whitfield",   company:"Whitfield Municipal Utilities", phone:"501-555-0411", email:"gwhitfield@whitfieldmu.gov",  facilityType:"Water Tank",       sqFt:18000, status:"Proposal Sent",        notes:[{text:"Site visit completed Apr 24 — two 500k gallon tanks",date:"Apr 24"},{text:"Proposal sent $186,400",date:"Apr 26"}], sentMessages:[] },
  { id:2, name:"Sandra Polk",      company:"Polk Commercial Properties",   phone:"479-555-0512", email:"spolk@polkcommercial.com",     facilityType:"Commercial Floor", sqFt:42000, status:"Site Visit Scheduled",  notes:[{text:"Referral from Marcus Webb — Walmart connection",date:"Apr 30"}], sentMessages:[] },
  { id:3, name:"City of Bentonville",company:"City of Bentonville",        phone:"479-555-0601", email:"projects@bentonvillecity.gov", facilityType:"Treatment Facility",sqFt:8500,  status:"New Inquiry",          notes:[], sentMessages:[] },
];

const initialJobs = [
  { id:1, client:"Rogers Water Authority",   project:"Water Tank Polyurea Coating",    facilityType:"Water Tank",       sqFt:24000, contractValue:248000, crew:[1,2,3], subIds:[1], startDate:"2026-04-14", endDate:"2026-05-16", status:"Week 3 Complete",    cos:[{id:1,desc:"Concrete crack repair — section C east wall",amount:12500,status:"Approved",paidUpfront:true,date:"Apr 20"},{id:2,desc:"Additional surface prep — oil contamination found",amount:3800,status:"Pending",paidUpfront:false,date:"Apr 27"}], delays:[{id:1,type:"Rain",date:"Apr 17",notes:"Heavy rain overnight, surface too wet for application",clientNotified:true,daysLost:1},{id:2,type:"High Winds",date:"Apr 23",notes:"Winds gusting 35mph — spray rig cannot operate safely",clientNotified:true,daysLost:1}], notes:[{text:"Surface prep complete — coating 60% done",date:"Apr 28"},{text:"CO-001 issued $12,500 — concrete crack repair",date:"Apr 20"}], sentMessages:[], draws:[{milestone:"Contract + Materials",pct:40,paid:true},{milestone:"Week 1",pct:25,paid:true},{milestone:"Week 3",pct:25,paid:false},{milestone:"Final",pct:10,paid:false}] },
  { id:2, client:"Walmart Supercenter #1482",project:"Polyurea Floor Coating",         facilityType:"Walmart/Retail",   sqFt:18500, contractValue:141200, crew:[4,5],  subIds:[2], startDate:"2026-05-05", endDate:"2026-05-14", status:"Materials Delivered", cos:[], delays:[], notes:[{text:"Materials on site May 3 — mobilizing May 5",date:"May 3"}], sentMessages:[], draws:[{milestone:"Contract + Materials",pct:40,paid:true},{milestone:"Week 1",pct:25,paid:false},{milestone:"Week 3",pct:25,paid:false},{milestone:"Final",pct:10,paid:false}] },
  { id:3, client:"Fayetteville Water & Sewer",project:"Treatment Facility Floor Coat",facilityType:"Treatment Facility",sqFt:11200, contractValue:119800, crew:[1,3],  subIds:[5], startDate:"2026-05-19", endDate:"2026-05-30", status:"Contract Signed",     cos:[], delays:[], notes:[{text:"Performance contract signed Apr 29 — mobilizing May 19",date:"Apr 29"}], sentMessages:[], draws:[{milestone:"Contract + Materials",pct:40,paid:false},{milestone:"Week 1",pct:25,paid:false},{milestone:"Week 3",pct:25,paid:false},{milestone:"Final",pct:10,paid:false}] },
  { id:4, client:"Daisy BB Gun Mfg Plant",    project:"Manufacturing Floor Coating",   facilityType:"Industrial Floor", sqFt:9800,  contractValue:88400,  crew:[2,4],  subIds:[],  startDate:"2026-04-01", endDate:"2026-04-18", status:"Complete",            cos:[{id:1,desc:"Additional floor coating — break room extension",amount:4200,status:"Approved",paidUpfront:true,date:"Apr 10"}], delays:[{id:1,type:"Extreme Heat (95°F+)",date:"Apr 8",notes:"Facility HVAC down — interior temp 98°F, coating cannot cure properly",clientNotified:true,daysLost:0.5}], notes:[{text:"Final walkthrough complete — client signed off",date:"Apr 18"}], sentMessages:[], draws:[{milestone:"Contract + Materials",pct:40,paid:true},{milestone:"Week 1",pct:25,paid:true},{milestone:"Week 3",pct:25,paid:true},{milestone:"Final",pct:10,paid:true}] },
];

const initialClients = [
  { id:1, name:"Rogers Water Authority",    contact:"James Whitaker",   title:"Director of Infrastructure",  company:"Rogers Water Authority",    phone:"479-621-0182", email:"jwhitaker@rogerswater.gov",    address:"301 W Poplar St, Rogers, AR 72756",          notes:[{text:"Key contact is James — always reaches out by email first",date:"Apr 10"},{text:"Referred by City of Fayetteville project 2025",date:"Apr 10"}] },
  { id:2, name:"Walmart Supercenter #1482", contact:"Donna Trask",      title:"Facilities Manager",          company:"Walmart Inc.",              phone:"479-204-0388", email:"donna.trask@walmart.com",      address:"2110 W Martin Luther King Jr Blvd, Fayetteville, AR 72701", notes:[{text:"Part of ongoing Walmart national floor program — 14 locations done",date:"Mar 1"}] },
  { id:3, name:"Fayetteville Water & Sewer",contact:"Bobby Trent",      title:"Project Engineer",            company:"Fayetteville Water & Sewer",phone:"479-444-0601", email:"btrent@fayettevillear.gov",    address:"113 W Mountain St, Fayetteville, AR 72701",  notes:[{text:"Contract signed Apr 29 — very detail-oriented, wants weekly updates",date:"Apr 29"}] },
  { id:4, name:"Daisy BB Gun Mfg Plant",    contact:"Rick Alderman",    title:"Plant Operations Manager",    company:"Daisy Outdoor Products",    phone:"479-636-0290", email:"ralderman@daisy.com",          address:"400 W Stribling Dr, Rogers, AR 72756",       notes:[{text:"Excellent client — paid on schedule, signed off immediately",date:"Apr 18"},{text:"Ask about additional manufacturing floor phases in 2027",date:"Apr 18"}] },
  { id:5, name:"Greenfield Water District",  contact:"Carol Simms",     title:"Operations Superintendent",  company:"Greenfield Water District",  phone:"479-756-0914", email:"csimms@greenfieldwater.org",   address:"88 Industrial Park Rd, Greenfield, AR 72738",notes:[{text:"Invoice overdue since Apr 10 — follow up directly with Carol",date:"Apr 28"}] },
];

const initialEstimates = [
  { id:1, number:"EST-2026-011", client:"Greg Whitfield",    email:"gwhitfield@whitfieldmu.gov",  facilityType:"Water Tank",       sqFt:18000, date:"Apr 26", status:"Sent",     items:[{desc:"Surface prep & blast cleaning (18,000 sq ft)",qty:18000,price:2.80},{desc:"Polyurea coating system — 250 mil DFT",qty:18000,price:6.40},{desc:"Materials — polyurea resin & hardener",qty:1,price:42000},{desc:"Equipment transport & mobilization",qty:1,price:8200},{desc:"Per diem (4 crew, 18 days)",qty:72,price:185}] },
  { id:2, number:"EST-2026-012", client:"Sandra Polk",        email:"spolk@polkcommercial.com",    facilityType:"Commercial Floor", sqFt:42000, date:"May 1",  status:"Draft",    items:[{desc:"Surface preparation & grinding (42,000 sq ft)",qty:42000,price:1.20},{desc:"Polyurea floor coating — 125 mil DFT",qty:42000,price:3.80},{desc:"Materials",qty:1,price:68000},{desc:"Equipment & mobilization",qty:1,price:11400},{desc:"Per diem (4 crew, 12 days)",qty:48,price:185}] },
];

const initialInvoices = [
  { id:1, number:"INV-2026-018", client:"Rogers Water Authority",    project:"Water Tank Polyurea Coating",  amount:248000, paid:161200, due:"2026-05-16", status:"Partial",  notes:[], sentMessages:[] },
  { id:2, number:"INV-2026-019", client:"Walmart Supercenter #1482", project:"Polyurea Floor Coating",       amount:141200, paid:56480,  due:"2026-05-14", status:"Partial",  notes:[], sentMessages:[] },
  { id:3, number:"INV-2026-015", client:"Daisy BB Gun Mfg Plant",    project:"Manufacturing Floor Coating",  amount:88400,  paid:88400,  due:"2026-04-25", status:"Paid",     notes:[], sentMessages:[] },
  { id:4, number:"INV-2026-016", client:"Greenfield Water District",  project:"Water Tank Re-coat",          amount:164000, paid:0,      due:"2026-04-10", status:"Overdue",  notes:[], sentMessages:[] },
];

// ── Change Order statuses ────────────────────────────────────
const CO_STATUSES = ["Pending", "Approved", "Declined"];

// ── Utilities ─────────────────────────────────────────────────
const fmt    = (n) => "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits:0, maximumFractionDigits:0 });
const fmtD   = (n) => "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits:2, maximumFractionDigits:2 });
const fmtK   = (n) => n >= 1000 ? "$" + (n/1000).toFixed(n%1000===0?0:1) + "k" : fmt(n);
const lineTotal = (items) => items.reduce((s,i) => s + (parseFloat(i.qty)||0) * (parseFloat(i.price)||0), 0);
const todayStr  = () => new Date().toLocaleDateString("en-US", { month:"short", day:"numeric" });
const initials  = (name) => name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);

// ── Plumbline Logo ────────────────────────────────────────────
function PlumblineMark({ size=32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill={T.primary}/>
      <line x1="16" y1="5" x2="16" y2="21" stroke="#FAF8F5" strokeWidth="1.5" strokeLinecap="round"/>
      <polygon points="16,28 11,20 21,20" fill={T.secondary}/>
      <circle cx="16" cy="5" r="2" fill={T.secondary}/>
    </svg>
  );
}

// ── Badge ─────────────────────────────────────────────────────
function Badge({ status, size="sm" }) {
  const m = STATUS_META[status] || { color: T.textDim, bg: T.surfaceHigh };
  return <span style={{ background:m.bg, color:m.color, borderRadius:6, padding: size==="lg"?"5px 12px":"3px 9px", fontSize: size==="lg"?12:10, fontWeight:700, letterSpacing:"0.03em", whiteSpace:"nowrap" }}>{status}</span>;
}

// ── Avatar ────────────────────────────────────────────────────
function Avatar({ name, size=36 }) {
  const cols = ["#3D5066","#914C04","#2D7A4F","#5B3E8F","#1A6B8A","#7A3030"];
  return <div style={{ width:size, height:size, borderRadius:"50%", background:cols[name.charCodeAt(0)%cols.length], color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.35, fontWeight:700, flexShrink:0 }}>{initials(name)}</div>;
}

// ── Doc status chip ───────────────────────────────────────────
function DocChip({ label, ok }) {
  return <span style={{ background: ok ? T.greenBg : T.redBg, color: ok ? T.green : T.red, borderRadius:5, padding:"2px 8px", fontSize:10, fontWeight:700, marginRight:4 }}>{ok ? "✓" : "✗"} {label}</span>;
}

// ── Value Tag ─────────────────────────────────────────────────
function ValueTag({ amount, color }) {
  return (
    <div style={{ display:"inline-flex", alignItems:"baseline", gap:2 }}>
      <span style={{ fontSize:11, fontWeight:700, color: color||T.textDim }}>$</span>
      <span style={{ fontSize:20, fontWeight:800, color: color||T.primary, letterSpacing:"-0.5px", lineHeight:1, fontFamily:"Newsreader,serif" }}>
        {Number(amount).toLocaleString("en-US", { minimumFractionDigits:0, maximumFractionDigits:0 })}
      </span>
    </div>
  );
}

// ── Draw Progress Bar ─────────────────────────────────────────
function DrawBar({ draws, contractValue }) {
  const pcts = [40,25,25,10];
  return (
    <div style={{ marginTop:10 }}>
      <div style={{ fontSize:10, color:T.textDim, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:6 }}>Draw Schedule</div>
      <div style={{ display:"flex", gap:3 }}>
        {(draws||[]).map((d,i) => (
          <div key={i} style={{ flex: pcts[i]||25, height:8, background: d.paid ? T.green : T.border, borderRadius:4, position:"relative" }} title={`${d.milestone}: ${pcts[i]}% — ${d.paid?"Paid":"Unpaid"}`}/>
        ))}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
        {(draws||[]).map((d,i) => (
          <div key={i} style={{ fontSize:9, color: d.paid ? T.green : T.textDim, fontWeight: d.paid ? 700 : 400, flex: pcts[i]||25, textAlign:"center" }}>{pcts[i]}%</div>
        ))}
      </div>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────
function Modal({ onClose, children, wide }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(27,28,26,0.55)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:300 }} onClick={onClose}>
      <div style={{ background:T.bg, borderRadius:"20px 20px 0 0", width:"100%", maxWidth: wide?"720px":"580px", maxHeight:"92vh", overflowY:"auto", padding:"28px 24px 56px", boxShadow:"0 -8px 48px rgba(0,0,0,0.18)" }} onClick={e=>e.stopPropagation()}>
        <div style={{ width:40, height:4, background:T.borderMid, borderRadius:2, margin:"0 auto 24px" }}/>
        {children}
      </div>
    </div>
  );
}

// ── Form Primitives ───────────────────────────────────────────
const inp = { width:"100%", background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:"11px 14px", color:T.text, fontSize:14, outline:"none", boxSizing:"border-box", marginBottom:14, fontFamily:"inherit" };
const lbl = { fontSize:11, color:T.textDim, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6, display:"block" };
const row2 = { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 };
const divider = { borderTop:`1px solid ${T.border}`, margin:"20px 0" };

function PrimaryBtn({ onClick, children, color }) {
  const [h,setH] = useState(false);
  return <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{ width:"100%", background: h ? T.secondaryDark : (color||T.secondary), color:"#fff", border:"none", borderRadius:10, padding:"13px 20px", cursor:"pointer", fontSize:14, fontWeight:700, marginTop:8, transition:"all 0.15s", fontFamily:"inherit" }}>{children}</button>;
}
function GhostBtn({ onClick, children }) {
  return <button onClick={onClick} style={{ width:"100%", background:"transparent", color:T.textMid, border:`1px solid ${T.border}`, borderRadius:10, padding:"13px 20px", cursor:"pointer", fontSize:14, fontWeight:600, marginTop:8, fontFamily:"inherit" }}>{children}</button>;
}

function StatusPicker({ statuses, value, onChange }) {
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:16 }}>
      {statuses.map(st => {
        const m = STATUS_META[st] || { color:T.textDim, bg:T.surfaceHigh };
        const active = value === st;
        return <button key={st} onClick={()=>onChange(st)} style={{ background: active?m.bg:"transparent", color: active?m.color:T.textDim, border:`1px solid ${active?m.color+"66":T.border}`, borderRadius:8, padding:"6px 12px", fontSize:12, fontWeight: active?700:500, cursor:"pointer", fontFamily:"inherit" }}>{st}</button>;
      })}
    </div>
  );
}

function NoteLog({ notes, onAdd }) {
  const [text,setText] = useState("");
  return (
    <div>
      <div style={{ fontSize:11, color:T.textDim, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:12 }}>Communication Log</div>
      {notes.length === 0 && <div style={{ fontSize:13, color:T.textDim, fontStyle:"italic", marginBottom:12 }}>No notes yet.</div>}
      {notes.map((n,i) => (
        <div key={i} style={{ background:T.bgLow, borderRadius:10, padding:"10px 14px", marginBottom:8, borderLeft:`3px solid ${T.border}` }}>
          <div style={{ fontSize:13, color:T.text }}>{n.text}</div>
          <div style={{ fontSize:11, color:T.textDim, marginTop:4 }}>{n.date}</div>
        </div>
      ))}
      <div style={{ display:"flex", gap:8, marginTop:10 }}>
        <input style={{ ...inp, marginBottom:0, flex:1 }} placeholder="Add a note..." value={text} onChange={e=>setText(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter"&&text.trim()){onAdd({text:text.trim(),date:todayStr()});setText("");} }}/>
        <button onClick={()=>{ if(text.trim()){onAdd({text:text.trim(),date:todayStr()});setText("");} }} style={{ background:T.secondary, color:"#fff", border:"none", borderRadius:10, padding:"0 16px", cursor:"pointer", fontSize:13, fontWeight:700, whiteSpace:"nowrap", fontFamily:"inherit" }}>Add</button>
      </div>
    </div>
  );
}

function AutoMessagePanel({ trigger, name, sentLog, onSend }) {
  const template = AUTO_MESSAGES[trigger];
  if (!template) return null;
  const [channel,setChannel] = useState("email");
  const [eSubject,setESubject] = useState(template.email.subject(name));
  const [eBody,setEBody] = useState(template.email.body(name));
  const [sms,setSms] = useState(template.sms(name));
  const [justSent,setJustSent] = useState(false);
  const sent = (sentLog||[]).includes(trigger) || justSent;
  return (
    <div style={{ background:T.secondaryLight, border:`1px solid ${T.secondary}55`, borderRadius:14, padding:18, marginTop:6 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
        <span style={{ fontSize:22 }}>{template.icon}</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:700, color:T.secondaryDark }}>Auto-Message: {template.label}</div>
          <div style={{ fontSize:11, color:T.textDim, marginTop:2 }}>Status changed to {trigger}</div>
        </div>
        {sent && <Badge status="Paid"/>}
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:14 }}>
        {["email","sms"].map(ch => (
          <button key={ch} onClick={()=>setChannel(ch)} style={{ background: channel===ch?T.surface:"transparent", color: channel===ch?T.secondaryDark:T.textDim, border:`1px solid ${channel===ch?T.secondary+"88":T.border}`, borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            {ch==="email"?"✉️ Email":"💬 SMS"}
          </button>
        ))}
      </div>
      {channel==="email" && (<>
        <label style={lbl}>Subject</label>
        <input style={inp} value={eSubject} onChange={e=>setESubject(e.target.value)}/>
        <label style={lbl}>Message</label>
        <textarea style={{ ...inp, minHeight:120, resize:"vertical", lineHeight:1.6 }} value={eBody} onChange={e=>setEBody(e.target.value)}/>
      </>)}
      {channel==="sms" && (<>
        <label style={lbl}>SMS Message</label>
        <textarea style={{ ...inp, minHeight:80, resize:"vertical", lineHeight:1.6 }} value={sms} onChange={e=>setSms(e.target.value)}/>
        <div style={{ fontSize:11, color:T.textDim, marginTop:-10, marginBottom:12 }}>{sms.length} chars</div>
      </>)}
      {!sent
        ? <button onClick={()=>{ setJustSent(true); onSend(trigger,channel); }} style={{ width:"100%", background:T.secondary, color:"#fff", border:"none", borderRadius:10, padding:"12px", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit" }}>Send {channel==="email"?"Email":"SMS"} Now</button>
        : <div style={{ textAlign:"center", color:T.green, fontSize:13, padding:"10px 0", fontWeight:700 }}>✓ Message sent and logged</div>
      }
    </div>
  );
}

function LineItemBuilder({ items, onChange }) {
  const upd = (i,f,v) => { const n=[...items]; n[i]={...n[i],[f]:v}; onChange(n); };
  const rem = (i) => onChange(items.filter((_,idx)=>idx!==i));
  const add = () => onChange([...items,{desc:"",qty:0,price:0}]);
  const total = lineTotal(items);
  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 80px 100px 32px", gap:8, marginBottom:8 }}>
        {["Description","Qty/SqFt","Unit Price",""].map((h,i) => <div key={i} style={{ fontSize:10, color:T.textDim, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase" }}>{h}</div>)}
      </div>
      {items.map((item,i) => (
        <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 80px 100px 32px", gap:8, marginBottom:8, alignItems:"center" }}>
          <input style={{ ...inp, marginBottom:0 }} value={item.desc} onChange={e=>upd(i,"desc",e.target.value)} placeholder="Description"/>
          <input style={{ ...inp, marginBottom:0, textAlign:"center" }} type="number" value={item.qty} onChange={e=>upd(i,"qty",e.target.value)}/>
          <input style={{ ...inp, marginBottom:0 }} type="number" value={item.price} onChange={e=>upd(i,"price",e.target.value)} placeholder="0.00"/>
          <button onClick={()=>rem(i)} style={{ background:T.redBg, color:T.red, border:"none", borderRadius:7, width:32, height:36, cursor:"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>
      ))}
      <button onClick={add} style={{ background:"transparent", color:T.secondary, border:`1px dashed ${T.secondary}88`, borderRadius:8, padding:"7px 14px", cursor:"pointer", fontSize:12, fontWeight:600, marginTop:4, fontFamily:"inherit" }}>+ Add Line Item</button>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:16, paddingTop:14, borderTop:`2px solid ${T.border}` }}>
        <span style={{ fontSize:12, color:T.textDim, fontWeight:600, letterSpacing:"0.05em", textTransform:"uppercase" }}>Estimate Total</span>
        <ValueTag amount={total} color={T.primary}/>
      </div>
    </div>
  );
}

// ── Calendar ──────────────────────────────────────────────────
function CalendarView({ jobs, subs }) {
  const today = new Date();
  const [viewDate,setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const year = viewDate.getFullYear(), month = viewDate.getMonth();
  const firstDay = new Date(year,month,1).getDay();
  const daysInMonth = new Date(year,month+1,0).getDate();
  const cells = [];
  for(let i=0;i<firstDay;i++) cells.push(null);
  for(let d=1;d<=daysInMonth;d++) cells.push(d);
  const jobsForDay = (d) => {
    if(!d) return [];
    const date = new Date(year,month,d);
    return jobs.filter(j => {
      if(!j.startDate||!j.endDate) return false;
      return date >= new Date(j.startDate) && date <= new Date(j.endDate);
    });
  };
  const isToday = (d) => d && today.getDate()===d && today.getMonth()===month && today.getFullYear()===year;
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <button onClick={()=>setViewDate(new Date(year,month-1,1))} style={{ background:T.bgLow, border:`1px solid ${T.border}`, borderRadius:8, width:36, height:36, cursor:"pointer", fontSize:18, color:T.primary }}>‹</button>
        <div style={{ fontSize:18, fontWeight:800, color:T.primary, fontFamily:"Newsreader,serif" }}>{MONTHS[month]} {year}</div>
        <button onClick={()=>setViewDate(new Date(year,month+1,1))} style={{ background:T.bgLow, border:`1px solid ${T.border}`, borderRadius:8, width:36, height:36, cursor:"pointer", fontSize:18, color:T.primary }}>›</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4 }}>
        {DAYS.map(d => <div key={d} style={{ textAlign:"center", fontSize:10, fontWeight:700, color:T.textDim, padding:"4px 0", textTransform:"uppercase" }}>{d}</div>)}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
        {cells.map((d,i) => {
          const dayJobs = jobsForDay(d);
          const isTod = isToday(d);
          return (
            <div key={i} style={{ minHeight:64, background: d?(isTod?T.primaryLight:T.surface):"transparent", border: d?`1px solid ${isTod?T.primary:T.border}`:"none", borderRadius:10, padding:5 }}>
              {d && <div style={{ fontSize:11, fontWeight:isTod?800:400, color:isTod?T.primary:T.textMid, marginBottom:3, textAlign:"center" }}>{d}</div>}
              {dayJobs.slice(0,2).map(j => {
                const m = STATUS_META[j.status] || { color:T.primary, bg:T.blueBg };
                return <div key={j.id} style={{ background:m.bg, color:m.color, borderRadius:4, padding:"2px 4px", fontSize:9, fontWeight:600, marginBottom:2, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>{j.project}</div>;
              })}
              {dayJobs.length>2 && <div style={{ fontSize:9, color:T.textDim }}>+{dayJobs.length-2}</div>}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop:20, paddingTop:16, borderTop:`1px solid ${T.border}` }}>
        <div style={{ fontSize:11, fontWeight:700, color:T.textDim, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:12 }}>Active This Month</div>
        {jobs.filter(j => {
          if(!j.startDate) return false;
          const s = new Date(j.startDate);
          return s.getMonth()===month && s.getFullYear()===year;
        }).map(j => (
          <div key={j.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:`1px solid ${T.border}` }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{j.project}</div>
              <div style={{ fontSize:11, color:T.textDim, marginTop:2 }}>{j.client} · {j.sqFt?.toLocaleString()} sq ft</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <Badge status={j.status}/>
              <div style={{ fontSize:11, color:T.secondary, fontWeight:700, marginTop:4 }}>{fmtK(j.contractValue)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Lead Card ─────────────────────────────────────────────────
function LeadCard({ lead, onClick }) {
  const [h,setH] = useState(false);
  const m = STATUS_META[lead.status] || { color:T.primary, bg:T.blueBg };
  return (
    <div onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ background:T.surface, border:`1px solid ${h?T.borderMid:T.border}`, borderRadius:16, padding:"18px 20px", cursor:"pointer", transition:"all 0.15s", boxShadow:h?"0 4px 24px rgba(61,80,102,0.1)":"none", borderLeft:`4px solid ${m.color}` }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:15, fontWeight:700, color:T.primary, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{lead.name}</div>
          <div style={{ fontSize:12, color:T.textDim, marginBottom:10 }}>{lead.company}</div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            <span style={{ background:T.bgLow, borderRadius:6, padding:"3px 8px", fontSize:11, color:T.textMid }}>🏭 {lead.facilityType}</span>
            {lead.sqFt && <span style={{ background:T.bgLow, borderRadius:6, padding:"3px 8px", fontSize:11, color:T.textMid }}>📐 {lead.sqFt?.toLocaleString()} sq ft</span>}
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8, flexShrink:0 }}>
          <Badge status={lead.status} size="lg"/>
          <div style={{ fontSize:11, color:T.textDim }}>{lead.notes.length} note{lead.notes.length!==1?"s":""}</div>
        </div>
      </div>
    </div>
  );
}

// ── Job Card ──────────────────────────────────────────────────
function JobCard({ job, crew, subs, onClick }) {
  const [h,setH] = useState(false);
  const m = STATUS_META[job.status] || { color:T.primary, bg:T.blueBg };
  const assignedCrew = job.crew.map(id => crew.find(c=>c.id===id)).filter(Boolean);
  const assignedSubs = (job.subIds||[]).map(id => subs.find(s=>s.id===id)).filter(Boolean);
  const totalPaid = job.draws ? job.draws.filter(d=>d.paid).reduce((s,d,i) => s + (job.contractValue * [0.40,0.25,0.25,0.10][i]), 0) : 0;
  const approvedCOs = (job.cos||[]).filter(c=>c.status==="Approved").reduce((s,c)=>s+(parseFloat(c.amount)||0),0);
  const pendingCOs  = (job.cos||[]).filter(c=>c.status==="Pending").length;
  const totalValue  = job.contractValue + approvedCOs;
  return (
    <div onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ background:T.surface, border:`1px solid ${h?T.borderMid:T.border}`, borderRadius:16, padding:"18px 20px", cursor:"pointer", transition:"all 0.15s", boxShadow:h?"0 4px 24px rgba(61,80,102,0.1)":"none", borderLeft:`4px solid ${m.color}` }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:10 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:15, fontWeight:700, color:T.primary, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{job.project}</div>
          <div style={{ fontSize:12, color:T.textDim, marginTop:2 }}>{job.client}</div>
        </div>
        <div style={{ flexShrink:0, textAlign:"right" }}>
          <Badge status={job.status} size="lg"/>
          <div style={{ fontSize:13, fontWeight:800, color:T.primary, marginTop:6, fontFamily:"Newsreader,serif" }}>{fmtK(totalValue)}</div>
        </div>
      </div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
        <span style={{ background:T.bgLow, borderRadius:6, padding:"3px 8px", fontSize:11, color:T.textMid }}>🏭 {job.facilityType}</span>
        <span style={{ background:T.bgLow, borderRadius:6, padding:"3px 8px", fontSize:11, color:T.textMid }}>📐 {job.sqFt?.toLocaleString()} sq ft</span>
        <span style={{ background:T.bgLow, borderRadius:6, padding:"3px 8px", fontSize:11, color:T.textMid }}>📅 {job.startDate} → {job.endDate}</span>
        {approvedCOs > 0 && <span style={{ background:T.amberBg, borderRadius:6, padding:"3px 8px", fontSize:11, color:T.amber, fontWeight:700 }}>CO: +{fmt(approvedCOs)}</span>}
        {pendingCOs > 0 && <span style={{ background:T.redBg, borderRadius:6, padding:"3px 8px", fontSize:11, color:T.red, fontWeight:700 }}>⚠ {pendingCOs} CO pending</span>}
        {(job.delays||[]).length > 0 && <span style={{ background:"#EEF3F8", borderRadius:6, padding:"3px 8px", fontSize:11, color:"#2A5278", fontWeight:700 }}>🌧️ {(job.delays||[]).length} delay{(job.delays||[]).length!==1?"s":""}</span>}
      </div>
      <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:6 }}>
        {assignedCrew.map(c => (
          <div key={c.id} style={{ display:"flex", alignItems:"center", gap:4, background:T.primaryLight, borderRadius:6, padding:"3px 8px" }}>
            <Avatar name={c.name} size={16}/><span style={{ fontSize:11, color:T.primary, fontWeight:600 }}>{c.name.split(" ")[0]}</span>
          </div>
        ))}
        {assignedSubs.map(s => (
          <div key={s.id} style={{ display:"flex", alignItems:"center", gap:4, background:T.amberBg, borderRadius:6, padding:"3px 8px" }}>
            <span style={{ fontSize:11, color:T.amber, fontWeight:600 }}>SUB</span>
            <span style={{ fontSize:11, color:T.amber }}>{s.name.split(" ")[0]}</span>
          </div>
        ))}
      </div>
      <DrawBar draws={job.draws} contractValue={job.contractValue}/>
    </div>
  );
}

// ── Sub Card ──────────────────────────────────────────────────
function SubCard({ sub, jobs, onClick }) {
  const [h,setH] = useState(false);
  const m = STATUS_META[sub.status] || { color:T.primary, bg:T.blueBg };
  const activeJobs = jobs.filter(j => (j.subIds||[]).includes(sub.id) && j.status !== "Complete");
  const allDocsOk = sub.contractOnFile && sub.w9OnFile && sub.insuranceCurrent;
  return (
    <div onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ background:T.surface, border:`1px solid ${h?T.borderMid:T.border}`, borderRadius:16, padding:"18px 20px", cursor:"pointer", transition:"all 0.15s", boxShadow:h?"0 4px 24px rgba(61,80,102,0.1)":"none", borderLeft:`4px solid ${m.color}` }}>
      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
        <Avatar name={sub.name} size={46}/>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3, flexWrap:"wrap" }}>
            <div style={{ fontSize:15, fontWeight:700, color:T.primary }}>{sub.name}</div>
            <Badge status={sub.status} size="lg"/>
            {!allDocsOk && <span style={{ background:T.redBg, color:T.red, borderRadius:5, padding:"2px 8px", fontSize:10, fontWeight:700 }}>⚠ Docs Needed</span>}
          </div>
          <div style={{ fontSize:12, color:T.textDim, marginBottom:6 }}>{sub.company} · {sub.trade}</div>
          <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:6 }}>
            <DocChip label="Contract" ok={sub.contractOnFile}/>
            <DocChip label="W-9" ok={sub.w9OnFile}/>
            <DocChip label="Insurance" ok={sub.insuranceCurrent}/>
          </div>
          {activeJobs.length > 0 && <div style={{ fontSize:11, color:T.secondary, fontWeight:700 }}>▸ {activeJobs.map(j=>j.project).join(", ")}</div>}
        </div>
      </div>
    </div>
  );
}

// ── Invoice Card ──────────────────────────────────────────────
function InvoiceCard({ inv, onClick }) {
  const [h,setH] = useState(false);
  const m = STATUS_META[inv.status] || { color:T.amber, bg:T.amberBg };
  const balance = (parseFloat(inv.amount)||0) - (parseFloat(inv.paid)||0);
  const pct = inv.amount > 0 ? Math.round((inv.paid/inv.amount)*100) : 0;
  return (
    <div onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ background:T.surface, border:`1px solid ${h?T.borderMid:T.border}`, borderRadius:16, padding:"18px 20px", cursor:"pointer", transition:"all 0.15s", boxShadow:h?"0 4px 24px rgba(61,80,102,0.1)":"none", borderLeft:`4px solid ${m.color}` }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:12 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:T.primary, marginBottom:2 }}>{inv.number}</div>
          <div style={{ fontSize:12, color:T.textDim }}>{inv.client} · {inv.project}</div>
        </div>
        <div style={{ textAlign:"right", flexShrink:0 }}>
          <Badge status={inv.status} size="lg"/>
          <div style={{ fontSize:11, color:T.textDim, marginTop:4 }}>Due {inv.due}</div>
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:8 }}>
        <ValueTag amount={inv.amount} color={T.primary}/>
        <div style={{ textAlign:"right" }}>
          {balance > 0
            ? <div style={{ fontSize:12, fontWeight:700, color:T.red }}>{fmtD(balance)} remaining</div>
            : <div style={{ fontSize:12, fontWeight:700, color:T.green }}>Paid in full</div>
          }
        </div>
      </div>
      <div style={{ height:4, background:T.border, borderRadius:4, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background: inv.status==="Overdue"?T.red:T.green, borderRadius:4 }}/>
      </div>
      <div style={{ fontSize:10, color:T.textDim, marginTop:4, textAlign:"right" }}>{pct}% collected</div>
    </div>
  );
}

// ── Estimate Card ─────────────────────────────────────────────
function EstimateCard({ est, onClick }) {
  const [h,setH] = useState(false);
  const m = STATUS_META[est.status] || { color:T.primary, bg:T.blueBg };
  const total = lineTotal(est.items);
  return (
    <div onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ background:T.surface, border:`1px solid ${h?T.borderMid:T.border}`, borderRadius:16, padding:"18px 20px", cursor:"pointer", transition:"all 0.15s", boxShadow:h?"0 4px 24px rgba(61,80,102,0.1)":"none", borderLeft:`4px solid ${m.color}` }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:T.primary, marginBottom:2 }}>{est.number}</div>
          <div style={{ fontSize:12, color:T.textDim, marginBottom:8 }}>{est.client} · {est.facilityType} · {est.sqFt?.toLocaleString()} sq ft</div>
          <div style={{ fontSize:11, color:T.textMid }}>{est.items.length} line items · {est.date}</div>
        </div>
        <div style={{ textAlign:"right", flexShrink:0 }}>
          <Badge status={est.status} size="lg"/>
          <div style={{ marginTop:8 }}><ValueTag amount={total} color={T.primary}/></div>
        </div>
      </div>
    </div>
  );
}

// ── Modals ────────────────────────────────────────────────────
function LeadModal({ lead, onClose, onSave }) {
  const [form,setForm] = useState(lead || { name:"", company:"", phone:"", email:"", facilityType:"Water Tank", sqFt:"", status:"New Inquiry", notes:[], sentMessages:[] });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const handleSend = (trigger,channel) => { set("sentMessages",[...(form.sentMessages||[]),trigger]); set("notes",[...form.notes,{text:`✉️ Auto-message via ${channel}: "${AUTO_MESSAGES[trigger]?.label}"`,date:todayStr()}]); };
  const showAuto = ["Proposal Sent","Contract Signed"].includes(form.status);
  return (
    <Modal onClose={onClose}>
      <div style={{ fontSize:20, fontWeight:800, color:T.primary, marginBottom:20, fontFamily:"Newsreader,serif" }}>{lead ? lead.name : "New Lead"}</div>
      {!lead && (<>
        <label style={lbl}>Contact Name</label><input style={inp} value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Contact name"/>
        <div style={row2}>
          <div><label style={lbl}>Company / Municipality</label><input style={inp} value={form.company} onChange={e=>set("company",e.target.value)} placeholder="Organization"/></div>
          <div><label style={lbl}>Phone</label><input style={inp} value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="Phone"/></div>
        </div>
        <div style={row2}>
          <div><label style={lbl}>Email</label><input style={inp} value={form.email} onChange={e=>set("email",e.target.value)} placeholder="Email"/></div>
          <div>
            <label style={lbl}>Facility Type</label>
            <select style={{ ...inp }} value={form.facilityType} onChange={e=>set("facilityType",e.target.value)}>
              {FACILITY_TYPES.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
        </div>
        <label style={lbl}>Estimated Square Footage</label>
        <input style={inp} type="number" value={form.sqFt} onChange={e=>set("sqFt",e.target.value)} placeholder="0"/>
      </>)}
      <label style={lbl}>Status</label>
      <StatusPicker statuses={LEAD_STATUSES} value={form.status} onChange={v=>set("status",v)}/>
      {showAuto && <AutoMessagePanel trigger={form.status} name={form.name||lead?.name||"there"} sentLog={form.sentMessages} onSend={handleSend}/>}
      <div style={divider}/>
      <NoteLog notes={form.notes} onAdd={note=>set("notes",[...form.notes,note])}/>
      <div style={{ marginTop:20 }}>
        <PrimaryBtn onClick={()=>onSave(form)}>{lead?"Save Changes":"Add Lead"}</PrimaryBtn>
        <GhostBtn onClick={onClose}>Cancel</GhostBtn>
      </div>
    </Modal>
  );
}

// ── Change Order Tracker ──────────────────────────────────────
function ChangeOrderTracker({ cos, contractValue, onChange }) {
  const [adding, setAdding] = useState(false);
  const [newCO, setNewCO] = useState({ desc:"", amount:"", status:"Pending", paidUpfront:false, date:todayStr() });
  const totalCOs = (cos||[]).reduce((s,c) => s + (parseFloat(c.amount)||0), 0);
  const approvedCOs = (cos||[]).filter(c=>c.status==="Approved").reduce((s,c) => s + (parseFloat(c.amount)||0), 0);

  const addCO = () => {
    if (!newCO.desc.trim() || !newCO.amount) return;
    const co = { ...newCO, id: Date.now(), amount: parseFloat(newCO.amount) };
    onChange([...(cos||[]), co]);
    setNewCO({ desc:"", amount:"", status:"Pending", paidUpfront:false, date:todayStr() });
    setAdding(false);
  };

  const updateStatus = (id, status) => onChange((cos||[]).map(c => c.id===id ? {...c, status} : c));
  const togglePaid   = (id) => onChange((cos||[]).map(c => c.id===id ? {...c, paidUpfront:!c.paidUpfront} : c));
  const removeCO     = (id) => onChange((cos||[]).filter(c => c.id!==id));

  return (
    <div>
      {/* Summary bar */}
      <div style={{ display:"flex", gap:10, marginBottom:14 }}>
        <div style={{ flex:1, background:T.bgLow, borderRadius:10, padding:"10px 14px" }}>
          <div style={{ fontSize:10, color:T.textDim, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:4 }}>Total COs</div>
          <div style={{ fontSize:18, fontWeight:800, color:T.amber, fontFamily:"Newsreader,serif" }}>{fmt(totalCOs)}</div>
        </div>
        <div style={{ flex:1, background:T.bgLow, borderRadius:10, padding:"10px 14px" }}>
          <div style={{ fontSize:10, color:T.textDim, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:4 }}>Approved</div>
          <div style={{ fontSize:18, fontWeight:800, color:T.green, fontFamily:"Newsreader,serif" }}>{fmt(approvedCOs)}</div>
        </div>
        <div style={{ flex:1, background:T.bgLow, borderRadius:10, padding:"10px 14px" }}>
          <div style={{ fontSize:10, color:T.textDim, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:4 }}>Total w/ COs</div>
          <div style={{ fontSize:18, fontWeight:800, color:T.primary, fontFamily:"Newsreader,serif" }}>{fmt((contractValue||0)+approvedCOs)}</div>
        </div>
      </div>

      {/* CO list */}
      {(cos||[]).length === 0 && !adding && (
        <div style={{ fontSize:13, color:T.textDim, fontStyle:"italic", marginBottom:10 }}>No change orders yet.</div>
      )}
      {(cos||[]).map(co => {
        const m = STATUS_META[co.status] || { color:T.amber, bg:T.amberBg };
        return (
          <div key={co.id} style={{ background:T.bgLow, border:`1px solid ${m.color}44`, borderRadius:12, padding:"12px 14px", marginBottom:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
              <div style={{ flex:1, marginRight:10 }}>
                <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:3 }}>{co.desc}</div>
                <div style={{ fontSize:11, color:T.textDim }}>{co.date}</div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontSize:16, fontWeight:800, color:T.primary, fontFamily:"Newsreader,serif", marginBottom:4 }}>{fmt(co.amount)}</div>
                <Badge status={co.status}/>
              </div>
            </div>
            {/* Controls */}
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:8 }}>
              {CO_STATUSES.map(st => {
                const sm = STATUS_META[st] || { color:T.textDim, bg:T.surfaceHigh };
                const active = co.status === st;
                return (
                  <button key={st} onClick={()=>updateStatus(co.id,st)}
                    style={{ background: active?sm.bg:"transparent", color: active?sm.color:T.textDim, border:`1px solid ${active?sm.color+"66":T.border}`, borderRadius:6, padding:"4px 10px", fontSize:11, fontWeight: active?700:500, cursor:"pointer", fontFamily:"inherit" }}>
                    {st}
                  </button>
                );
              })}
              <button onClick={()=>togglePaid(co.id)}
                style={{ background: co.paidUpfront?T.greenBg:"transparent", color: co.paidUpfront?T.green:T.textDim, border:`1px solid ${co.paidUpfront?T.green+"66":T.border}`, borderRadius:6, padding:"4px 10px", fontSize:11, fontWeight: co.paidUpfront?700:500, cursor:"pointer", fontFamily:"inherit" }}>
                {co.paidUpfront ? "✓ Paid Upfront" : "Mark Paid"}
              </button>
              <button onClick={()=>removeCO(co.id)}
                style={{ background:T.redBg, color:T.red, border:"none", borderRadius:6, padding:"4px 10px", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", marginLeft:"auto" }}>
                Remove
              </button>
            </div>
          </div>
        );
      })}

      {/* Add CO form */}
      {adding ? (
        <div style={{ background:T.bgLow, border:`1px solid ${T.border}`, borderRadius:12, padding:"14px", marginTop:8 }}>
          <div style={{ fontSize:12, fontWeight:700, color:T.primary, marginBottom:12 }}>New Change Order</div>
          <label style={lbl}>Description</label>
          <input style={inp} value={newCO.desc} onChange={e=>setNewCO(n=>({...n,desc:e.target.value}))} placeholder="Describe the additional work"/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={lbl}>Amount ($)</label>
              <input style={inp} type="number" value={newCO.amount} onChange={e=>setNewCO(n=>({...n,amount:e.target.value}))} placeholder="0"/>
            </div>
            <div>
              <label style={lbl}>Date</label>
              <input style={inp} value={newCO.date} onChange={e=>setNewCO(n=>({...n,date:e.target.value}))} placeholder="Date"/>
            </div>
          </div>
          <label style={lbl}>Approval Status</label>
          <div style={{ display:"flex", gap:6, marginBottom:14 }}>
            {CO_STATUSES.map(st => {
              const sm = STATUS_META[st] || { color:T.textDim, bg:T.surfaceHigh };
              const active = newCO.status === st;
              return <button key={st} onClick={()=>setNewCO(n=>({...n,status:st}))} style={{ background: active?sm.bg:"transparent", color: active?sm.color:T.textDim, border:`1px solid ${active?sm.color+"66":T.border}`, borderRadius:6, padding:"5px 12px", fontSize:12, fontWeight: active?700:500, cursor:"pointer", fontFamily:"inherit" }}>{st}</button>;
            })}
          </div>
          <div onClick={()=>setNewCO(n=>({...n,paidUpfront:!n.paidUpfront}))}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderRadius:10, border:`1px solid ${newCO.paidUpfront?T.green:T.border}`, background: newCO.paidUpfront?T.greenBg:T.surface, cursor:"pointer", marginBottom:14 }}>
            <div style={{ width:18, height:18, borderRadius:"50%", background: newCO.paidUpfront?T.green:T.border, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              {newCO.paidUpfront && <span style={{ color:"#fff", fontSize:11, fontWeight:700 }}>✓</span>}
            </div>
            <span style={{ fontSize:13, color: newCO.paidUpfront?T.green:T.textMid, fontWeight: newCO.paidUpfront?700:500 }}>Paid upfront (as per 8Coating policy)</span>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={addCO} style={{ flex:1, background:T.secondary, color:"#fff", border:"none", borderRadius:9, padding:"11px", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit" }}>Add Change Order</button>
            <button onClick={()=>setAdding(false)} style={{ flex:1, background:"transparent", color:T.textMid, border:`1px solid ${T.border}`, borderRadius:9, padding:"11px", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit" }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={()=>setAdding(true)}
          style={{ width:"100%", background:"transparent", color:T.amber, border:`1px dashed ${T.amber}88`, borderRadius:9, padding:"10px", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit", marginTop:4 }}>
          + Add Change Order
        </button>
      )}
    </div>
  );
}

// ── Weather Delay Log ─────────────────────────────────────────
const WEATHER_TYPES = ["Rain", "High Winds", "Snow / Ice", "Extreme Heat (95°F+)", "Lightning", "Other"];

function WeatherDelayLog({ delays, onChange }) {
  const [adding, setAdding] = useState(false);
  const [newDelay, setNewDelay] = useState({ type:"Rain", date:todayStr(), notes:"", clientNotified:false, daysLost:1 });

  const add = () => {
    if (!newDelay.date) return;
    onChange([...(delays||[]), { ...newDelay, id:Date.now(), daysLost:parseFloat(newDelay.daysLost)||1 }]);
    setNewDelay({ type:"Rain", date:todayStr(), notes:"", clientNotified:false, daysLost:1 });
    setAdding(false);
  };

  const toggleNotified = (id) => onChange((delays||[]).map(d => d.id===id ? {...d, clientNotified:!d.clientNotified} : d));
  const remove = (id) => onChange((delays||[]).filter(d => d.id!==id));

  const totalDays = (delays||[]).reduce((s,d) => s + (parseFloat(d.daysLost)||1), 0);

  const weatherIcon = (type) => {
    const icons = { "Rain":"🌧️", "High Winds":"💨", "Snow / Ice":"❄️", "Extreme Heat (95°F+)":"🌡️", "Lightning":"⚡", "Other":"🌩️" };
    return icons[type] || "🌩️";
  };

  return (
    <div>
      {/* Summary */}
      <div style={{ display:"flex", gap:10, marginBottom:14 }}>
        <div style={{ flex:1, background:"#EEF3F8", borderRadius:10, padding:"10px 14px", border:`1px solid #C5D8E8` }}>
          <div style={{ fontSize:10, color:"#4A6B88", fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:4 }}>Weather Days</div>
          <div style={{ fontSize:22, fontWeight:800, color:"#2A5278", fontFamily:"Newsreader,serif" }}>{(delays||[]).length}</div>
        </div>
        <div style={{ flex:1, background:"#EEF3F8", borderRadius:10, padding:"10px 14px", border:`1px solid #C5D8E8` }}>
          <div style={{ fontSize:10, color:"#4A6B88", fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:4 }}>Days Lost</div>
          <div style={{ fontSize:22, fontWeight:800, color:"#2A5278", fontFamily:"Newsreader,serif" }}>{totalDays}</div>
        </div>
        <div style={{ flex:1, background:"#EEF3F8", borderRadius:10, padding:"10px 14px", border:`1px solid #C5D8E8` }}>
          <div style={{ fontSize:10, color:"#4A6B88", fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:4 }}>Clients Notified</div>
          <div style={{ fontSize:22, fontWeight:800, color:T.green, fontFamily:"Newsreader,serif" }}>{(delays||[]).filter(d=>d.clientNotified).length}/{(delays||[]).length||0}</div>
        </div>
      </div>

      {/* Delay list */}
      {(delays||[]).length === 0 && !adding && (
        <div style={{ fontSize:13, color:T.textDim, fontStyle:"italic", marginBottom:10 }}>No weather delays logged.</div>
      )}
      {(delays||[]).map(d => (
        <div key={d.id} style={{ background:"#EEF3F8", border:`1px solid #C5D8E8`, borderRadius:12, padding:"12px 14px", marginBottom:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:22 }}>{weatherIcon(d.type)}</span>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:"#2A5278" }}>{d.type}</div>
                <div style={{ fontSize:11, color:"#4A6B88" }}>{d.date} · {d.daysLost} day{d.daysLost!==1?"s":""} lost</div>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              {d.clientNotified
                ? <span style={{ background:T.greenBg, color:T.green, borderRadius:5, padding:"2px 8px", fontSize:10, fontWeight:700 }}>✓ Client Notified</span>
                : <span style={{ background:T.redBg, color:T.red, borderRadius:5, padding:"2px 8px", fontSize:10, fontWeight:700 }}>Client Not Notified</span>
              }
            </div>
          </div>
          {d.notes && <div style={{ fontSize:12, color:"#2A5278", background:"rgba(255,255,255,0.6)", borderRadius:8, padding:"6px 10px", marginBottom:8 }}>{d.notes}</div>}
          <div style={{ display:"flex", gap:6 }}>
            <button onClick={()=>toggleNotified(d.id)}
              style={{ background: d.clientNotified?T.greenBg:"#fff", color: d.clientNotified?T.green:"#4A6B88", border:`1px solid ${d.clientNotified?T.green+"66":"#C5D8E8"}`, borderRadius:6, padding:"4px 10px", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              {d.clientNotified ? "✓ Notified" : "Mark Client Notified"}
            </button>
            <button onClick={()=>remove(d.id)}
              style={{ background:T.redBg, color:T.red, border:"none", borderRadius:6, padding:"4px 10px", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", marginLeft:"auto" }}>
              Remove
            </button>
          </div>
        </div>
      ))}

      {/* Add form */}
      {adding ? (
        <div style={{ background:"#EEF3F8", border:`1px solid #C5D8E8`, borderRadius:12, padding:"14px", marginTop:8 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#2A5278", marginBottom:12 }}>Log Weather Delay</div>
          <label style={lbl}>Weather Type</label>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:14 }}>
            {WEATHER_TYPES.map(wt => (
              <button key={wt} onClick={()=>setNewDelay(n=>({...n,type:wt}))}
                style={{ background: newDelay.type===wt?"#C5D8E8":"transparent", color: newDelay.type===wt?"#2A5278":"#4A6B88", border:`1px solid ${newDelay.type===wt?"#4A6B88":"#C5D8E8"}`, borderRadius:7, padding:"5px 10px", fontSize:11, fontWeight: newDelay.type===wt?700:500, cursor:"pointer", fontFamily:"inherit" }}>
                {wt}
              </button>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={lbl}>Date</label>
              <input style={inp} value={newDelay.date} onChange={e=>setNewDelay(n=>({...n,date:e.target.value}))} placeholder="Date"/>
            </div>
            <div>
              <label style={lbl}>Days Lost</label>
              <input style={inp} type="number" min="0.5" step="0.5" value={newDelay.daysLost} onChange={e=>setNewDelay(n=>({...n,daysLost:e.target.value}))} placeholder="1"/>
            </div>
          </div>
          <label style={lbl}>Notes (optional)</label>
          <input style={inp} value={newDelay.notes} onChange={e=>setNewDelay(n=>({...n,notes:e.target.value}))} placeholder="e.g. Heavy rain, site flooded, crew stood down"/>
          <div onClick={()=>setNewDelay(n=>({...n,clientNotified:!n.clientNotified}))}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderRadius:10, border:`1px solid ${newDelay.clientNotified?T.green:"#C5D8E8"}`, background: newDelay.clientNotified?T.greenBg:"#fff", cursor:"pointer", marginBottom:14 }}>
            <div style={{ width:18, height:18, borderRadius:"50%", background: newDelay.clientNotified?T.green:"#C5D8E8", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              {newDelay.clientNotified && <span style={{ color:"#fff", fontSize:11, fontWeight:700 }}>✓</span>}
            </div>
            <span style={{ fontSize:13, color: newDelay.clientNotified?T.green:"#4A6B88", fontWeight: newDelay.clientNotified?700:500 }}>Client has been notified of this delay</span>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={add} style={{ flex:1, background:"#2A5278", color:"#fff", border:"none", borderRadius:9, padding:"11px", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit" }}>Log Delay</button>
            <button onClick={()=>setAdding(false)} style={{ flex:1, background:"transparent", color:T.textMid, border:`1px solid ${T.border}`, borderRadius:9, padding:"11px", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit" }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={()=>setAdding(true)}
          style={{ width:"100%", background:"transparent", color:"#2A5278", border:`1px dashed #4A6B8888`, borderRadius:9, padding:"10px", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit", marginTop:4 }}>
          🌧️ Log Weather Delay
        </button>
      )}
    </div>
  );
}

// ── Closing Documents Generator (Punch List + Warranty Statement) ──
function ClosingDocumentsGenerator({ job, onClose }) {
  const today = new Date().toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" });
  const warrantyNum = `WRN-${job.id}${job.contractValue||0}`.slice(0,12).replace(/\D+$/,"").padEnd(10,"0");
  const completionDate = job.endDate ? new Date(job.endDate).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}) : today;
  const warrantyExpiry = job.endDate ? (() => { const d=new Date(job.endDate); d.setFullYear(d.getFullYear()+10); return d.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}); })() : "[10 years from completion]";
  const [activeDoc, setActiveDoc] = useState("punchlist");
  const [punchSent, setPunchSent] = useState(false);
  const [warrantySent, setWarrantySent] = useState(false);
  const approvedCOs = (job.cos||[]).filter(c=>c.status==="Approved");
  const totalCOValue = approvedCOs.reduce((s,c)=>s+(parseFloat(c.amount)||0),0);
  const finalContractValue = (job.contractValue||0) + totalCOValue;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(27,28,26,0.6)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:400 }} onClick={onClose}>
      <div style={{ background:T.bg, borderRadius:"20px 20px 0 0", width:"100%", maxWidth:700, maxHeight:"94vh", overflowY:"auto", padding:"28px 24px 56px", boxShadow:"0 -8px 48px rgba(0,0,0,0.2)" }} onClick={e=>e.stopPropagation()}>
        <div style={{ width:40, height:4, background:T.borderMid, borderRadius:2, margin:"0 auto 24px" }}/>

        {/* Header */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:20, fontWeight:800, color:T.primary, fontFamily:"Newsreader,serif" }}>Closing Documents</div>
          <div style={{ fontSize:13, color:T.textDim, marginTop:2 }}>{job.project} · {job.client}</div>
        </div>

        {/* Doc switcher */}
        <div style={{ display:"flex", gap:8, marginBottom:20 }}>
          {[
            { id:"punchlist", label:"📋 Punch List" },
            { id:"warranty",  label:"🛡️ Warranty Statement" },
          ].map(tab => (
            <button key={tab.id} onClick={()=>setActiveDoc(tab.id)}
              style={{ flex:1, background: activeDoc===tab.id?T.primary:"transparent", color: activeDoc===tab.id?"#fff":T.textMid, border:`1px solid ${activeDoc===tab.id?T.primary:T.border}`, borderRadius:10, padding:"10px 16px", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit", transition:"all 0.15s" }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── PUNCH LIST ── */}
        {activeDoc==="punchlist" && (
          <div>
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:"28px 24px", marginBottom:16 }}>

              {/* Letterhead */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", paddingBottom:14, borderBottom:`2px solid ${T.primary}`, marginBottom:18 }}>
                <div>
                  <div style={{ fontSize:20, fontWeight:800, color:T.primary, fontFamily:"Newsreader,serif", fontStyle:"italic" }}>8Coating</div>
                  <div style={{ fontSize:11, color:T.textDim }}>Polyurea Coating Systems</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:13, fontWeight:800, color:T.primary, textTransform:"uppercase", letterSpacing:"0.06em" }}>Project Punch List</div>
                  <div style={{ fontSize:11, color:T.textDim, marginTop:2 }}>Completion Date: {completionDate}</div>
                </div>
              </div>

              {/* Project info */}
              <div style={{ background:T.bgLow, borderRadius:10, padding:"12px 16px", marginBottom:18 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {[
                    ["Client",         job.client],
                    ["Project",        job.project],
                    ["Facility Type",  job.facilityType],
                    ["Square Footage", `${Number(job.sqFt||0).toLocaleString()} sq ft`],
                    ["Start Date",     job.startDate||"—"],
                    ["Completion Date",completionDate],
                  ].map(([l,v]) => (
                    <div key={l}>
                      <div style={{ fontSize:10, color:T.textDim, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em" }}>{l}</div>
                      <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Work completed checklist */}
              <div style={{ marginBottom:18 }}>
                <div style={{ fontSize:11, color:T.textDim, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:12 }}>Work Completed</div>
                {[
                  "Site mobilization and equipment setup",
                  "Surface preparation — blast cleaning, grinding, and crack repair as required",
                  "Application of primer coat to prepared substrate",
                  `Application of polyurea coating system to ${Number(job.sqFt||0).toLocaleString()} sq ft`,
                  "Quality inspection — adhesion testing and mil thickness verification",
                  "Equipment demobilization and site cleanup",
                  "Final walkthrough with client representative",
                  ...(approvedCOs.map(co => `Change order work completed: ${co.desc}`)),
                ].map((item,i) => (
                  <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"8px 0", borderBottom:`1px solid ${T.border}` }}>
                    <div style={{ width:18, height:18, borderRadius:"50%", background:T.green, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                      <span style={{ color:"#fff", fontSize:11, fontWeight:700 }}>✓</span>
                    </div>
                    <div style={{ fontSize:13, color:T.text, lineHeight:1.5 }}>{item}</div>
                  </div>
                ))}
              </div>

              {/* Financial summary */}
              <div style={{ background:T.bgLow, borderRadius:10, padding:"14px 16px", marginBottom:18 }}>
                <div style={{ fontSize:11, color:T.textDim, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:10 }}>Final Financial Summary</div>
                {[
                  ["Original Contract Value", fmt(job.contractValue||0)],
                  ...(approvedCOs.map(co => [`Change Order: ${co.desc.slice(0,30)}...`, fmt(co.amount)])),
                  ["Total Final Contract Value", fmt(finalContractValue)],
                ].map(([l,v],i,arr) => (
                  <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom: i<arr.length-1?`1px solid ${T.border}`:`2px solid ${T.primary}`, marginBottom: i===arr.length-1?0:0 }}>
                    <span style={{ fontSize: i===arr.length-1?14:13, fontWeight: i===arr.length-1?800:500, color: i===arr.length-1?T.primary:T.textMid }}>{l}</span>
                    <span style={{ fontSize: i===arr.length-1?15:13, fontWeight:700, color: i===arr.length-1?T.primary:T.text }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Weather delays summary */}
              {(job.delays||[]).length > 0 && (
                <div style={{ background:"#EEF3F8", borderRadius:10, padding:"12px 16px", marginBottom:18 }}>
                  <div style={{ fontSize:11, color:"#4A6B88", fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:8 }}>Weather Delays Recorded</div>
                  {(job.delays||[]).map((d,i) => (
                    <div key={i} style={{ fontSize:12, color:"#2A5278", marginBottom:4 }}>
                      🌧️ {d.date} — {d.type} — {d.daysLost} day{d.daysLost!==1?"s":""} lost {d.clientNotified?"(client notified)":""}
                    </div>
                  ))}
                </div>
              )}

              {/* Acceptance signature */}
              <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:16 }}>
                <div style={{ fontSize:11, color:T.textDim, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:16 }}>Client Acceptance</div>
                <div style={{ fontSize:12, color:T.textMid, marginBottom:20, lineHeight:1.6 }}>
                  By signing below, the Client confirms that all work described in this punch list has been completed to satisfaction and authorizes release of the final payment draw.
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>
                  {[
                    { label:"8Coating — Contractor", name:"David Brewer, Owner" },
                    { label:`${job.client} — Client`,  name:"[Authorized Signatory]" },
                  ].map((s,i) => (
                    <div key={i}>
                      <div style={{ borderBottom:`1px solid ${T.text}`, marginBottom:6, paddingBottom:28 }}/>
                      <div style={{ fontSize:11, color:T.textDim }}>{s.label}</div>
                      <div style={{ fontSize:12, fontWeight:600, color:T.textMid, marginTop:2 }}>{s.name}</div>
                      <div style={{ fontSize:11, color:T.textDim, marginTop:2 }}>Date: _______________</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Send action */}
            <div style={{ background:T.secondaryLight, border:`1px solid ${T.secondary}55`, borderRadius:12, padding:"14px 16px", marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:700, color:T.secondaryDark, marginBottom:4 }}>📤 Send Punch List to Client</div>
              <div style={{ fontSize:11, color:T.textDim, marginBottom:12 }}>Delivers punch list to {job.email||"the client"} for review and signature. Triggers the final 10% payment draw.</div>
              {!punchSent
                ? <button onClick={()=>setPunchSent(true)} style={{ background:T.secondary, color:"#fff", border:"none", borderRadius:9, padding:"10px 20px", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit" }}>Send Punch List Email</button>
                : <div style={{ fontSize:13, color:T.green, fontWeight:700 }}>✓ Punch list sent to {job.email||"client"}</div>
              }
            </div>
          </div>
        )}

        {/* ── WARRANTY STATEMENT ── */}
        {activeDoc==="warranty" && (
          <div>
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:"28px 24px", marginBottom:16 }}>

              {/* Letterhead */}
              <div style={{ textAlign:"center", paddingBottom:14, borderBottom:`2px solid ${T.green}`, marginBottom:18 }}>
                <div style={{ fontSize:20, fontWeight:800, color:T.primary, fontFamily:"Newsreader,serif", fontStyle:"italic", marginBottom:4 }}>8Coating</div>
                <div style={{ fontSize:11, color:T.textDim }}>Polyurea Coating Systems · Potable Water Infrastructure & Commercial Flooring</div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginTop:12 }}>
                  <span style={{ fontSize:20 }}>🛡️</span>
                  <div style={{ fontSize:15, fontWeight:800, color:T.green, letterSpacing:"0.06em", textTransform:"uppercase" }}>10-Year Limited Warranty</div>
                  <span style={{ fontSize:20 }}>🛡️</span>
                </div>
              </div>

              {/* Warranty ID */}
              <div style={{ background:T.greenBg, border:`1px solid ${T.green}44`, borderRadius:10, padding:"12px 16px", marginBottom:18, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:10, color:T.green, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase" }}>Warranty Number</div>
                  <div style={{ fontSize:16, fontWeight:800, color:T.green, fontFamily:"Newsreader,serif" }}>{warrantyNum}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:10, color:T.green, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase" }}>Status</div>
                  <div style={{ fontSize:13, fontWeight:700, color:T.green }}>✓ Active</div>
                </div>
              </div>

              {/* Coverage details */}
              <div style={{ background:T.bgLow, borderRadius:10, padding:"14px 16px", marginBottom:18 }}>
                <div style={{ fontSize:11, color:T.textDim, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:12 }}>Coverage Details</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {[
                    ["Warranty Holder",  job.client],
                    ["Project",         job.project],
                    ["Facility Type",   job.facilityType],
                    ["Coated Area",     `${Number(job.sqFt||0).toLocaleString()} sq ft`],
                    ["Completion Date", completionDate],
                    ["Warranty Expiry", warrantyExpiry],
                  ].map(([l,v]) => (
                    <div key={l}>
                      <div style={{ fontSize:10, color:T.textDim, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em" }}>{l}</div>
                      <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* What's covered */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11, color:T.green, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:10 }}>✓ What Is Covered</div>
                {[
                  "Adhesion failure — coating separating from the prepared substrate",
                  "Delamination — coating layers separating from each other",
                  "Product defects — manufacturing defects in the polyurea coating material",
                  "Premature degradation — deterioration beyond normal expected wear under standard conditions",
                ].map((item,i) => (
                  <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start", padding:"6px 0", borderBottom:`1px solid ${T.border}` }}>
                    <span style={{ color:T.green, fontWeight:700, flexShrink:0 }}>✓</span>
                    <div style={{ fontSize:12, color:T.textMid, lineHeight:1.5 }}>{item}</div>
                  </div>
                ))}
              </div>

              {/* What's not covered */}
              <div style={{ marginBottom:18 }}>
                <div style={{ fontSize:11, color:T.red, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:10 }}>✗ What Is Not Covered</div>
                {[
                  "Physical damage from impact, abrasion, or improper use",
                  "Chemical exposure beyond the coating's rated specifications",
                  "Structural movement or cracking of the underlying substrate",
                  "Unauthorized modifications, repairs, or coatings applied over the 8Coating system",
                  "Damage resulting from failure to maintain the coating per 8Coating's guidelines",
                ].map((item,i) => (
                  <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start", padding:"6px 0", borderBottom:`1px solid ${T.border}` }}>
                    <span style={{ color:T.red, fontWeight:700, flexShrink:0 }}>✗</span>
                    <div style={{ fontSize:12, color:T.textMid, lineHeight:1.5 }}>{item}</div>
                  </div>
                ))}
              </div>

              {/* Follow-up schedule */}
              <div style={{ background:"#EEF3F8", borderRadius:10, padding:"14px 16px", marginBottom:18 }}>
                <div style={{ fontSize:11, color:"#2A5278", fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:10 }}>8Coating Follow-Up Schedule</div>
                <div style={{ fontSize:12, color:"#4A6B88", marginBottom:10 }}>8Coating will contact you at the following intervals to inspect the coating system and address any concerns:</div>
                {[
                  { label:"6-Month Check-In",    icon:"📞" },
                  { label:"1-Year Inspection",   icon:"🔍" },
                  { label:"3-Year Check-In",     icon:"📋" },
                  { label:"5-Year Inspection",   icon:"🔍" },
                  { label:"10-Year Warranty End",icon:"🛡️" },
                ].map((fp,i) => (
                  <div key={i} style={{ display:"flex", gap:10, alignItems:"center", padding:"5px 0" }}>
                    <span style={{ fontSize:14 }}>{fp.icon}</span>
                    <span style={{ fontSize:12, color:"#2A5278", fontWeight:600 }}>{fp.label}</span>
                  </div>
                ))}
              </div>

              {/* How to file a claim */}
              <div style={{ background:T.bgLow, borderRadius:10, padding:"14px 16px", marginBottom:18 }}>
                <div style={{ fontSize:11, color:T.textDim, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:8 }}>How to File a Warranty Claim</div>
                {[
                  "Contact 8Coating in writing at davidb.get@gmail.com with a description of the issue and photographs.",
                  "8Coating will acknowledge receipt within 3 business days.",
                  "A site inspection will be scheduled within 15 business days of a valid claim submission.",
                  "If the claim is covered, 8Coating will repair or recoat the affected area at no charge.",
                ].map((step,i) => (
                  <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:6 }}>
                    <div style={{ width:18, height:18, borderRadius:"50%", background:T.primary, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                      <span style={{ color:"#fff", fontSize:10, fontWeight:700 }}>{i+1}</span>
                    </div>
                    <div style={{ fontSize:12, color:T.textMid, lineHeight:1.5 }}>{step}</div>
                  </div>
                ))}
              </div>

              {/* Issuer signature */}
              <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:16 }}>
                <div style={{ borderBottom:`1px solid ${T.text}`, marginBottom:6, paddingBottom:24, maxWidth:280 }}/>
                <div style={{ fontSize:12, fontWeight:600, color:T.textMid }}>David Brewer, Owner — 8Coating</div>
                <div style={{ fontSize:11, color:T.textDim, marginTop:2 }}>Issued: {completionDate}</div>
              </div>
            </div>

            {/* Send action */}
            <div style={{ background:T.greenBg, border:`1px solid ${T.green}44`, borderRadius:12, padding:"14px 16px", marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:700, color:T.green, marginBottom:4 }}>📤 Send Warranty Statement to Client</div>
              <div style={{ fontSize:11, color:T.textDim, marginBottom:12 }}>Delivers the 10-year warranty certificate to {job.email||"the client"} for their records.</div>
              {!warrantySent
                ? <button onClick={()=>setWarrantySent(true)} style={{ background:T.green, color:"#fff", border:"none", borderRadius:9, padding:"10px 20px", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit" }}>Send Warranty Statement</button>
                : <div style={{ fontSize:13, color:T.green, fontWeight:700 }}>✓ Warranty statement sent to {job.email||"client"}</div>
              }
            </div>
          </div>
        )}

        <button onClick={onClose} style={{ width:"100%", background:"transparent", color:T.textMid, border:`1px solid ${T.border}`, borderRadius:10, padding:"13px 20px", cursor:"pointer", fontSize:14, fontWeight:600, fontFamily:"inherit" }}>Close</button>
      </div>
    </div>
  );
}

// ── Performance Contract Generator ───────────────────────────
function PerformanceContractGenerator({ job, onClose }) {
  const today = new Date().toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" });
  const contractNum = `PC-2026-${String(job.id).padStart(3,"0")}`;
  const drawAmounts = [0.40,0.25,0.25,0.10].map(pct => (job.contractValue||0)*pct);
  const warrantyExpiry = job.endDate ? (() => { const d = new Date(job.endDate); d.setFullYear(d.getFullYear()+10); return d.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}); })() : "[10 years from completion date]";
  const [sent, setSent] = useState(false);

  const Section = ({ num, title, children }) => (
    <div style={{ marginBottom:18 }}>
      <div style={{ fontSize:13, fontWeight:800, color:T.primary, marginBottom:6, fontFamily:"Newsreader,serif" }}>
        {num}. {title.toUpperCase()}
      </div>
      {children}
    </div>
  );

  const clause = (text) => (
    <div style={{ fontSize:12, color:T.textMid, lineHeight:1.8, marginBottom:4 }}>{text}</div>
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(27,28,26,0.6)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:400 }} onClick={onClose}>
      <div style={{ background:T.bg, borderRadius:"20px 20px 0 0", width:"100%", maxWidth:700, maxHeight:"94vh", overflowY:"auto", padding:"28px 24px 56px", boxShadow:"0 -8px 48px rgba(0,0,0,0.2)" }} onClick={e=>e.stopPropagation()}>
        <div style={{ width:40, height:4, background:T.borderMid, borderRadius:2, margin:"0 auto 24px" }}/>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
          <div>
            <div style={{ fontSize:20, fontWeight:800, color:T.primary, fontFamily:"Newsreader,serif" }}>Performance Contract</div>
            <div style={{ fontSize:13, color:T.textDim, marginTop:2 }}>Review before sending to {job.client}</div>
          </div>
          <Badge status="Contract Signed" size="lg"/>
        </div>

        {/* Contract document */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:"28px 24px", marginBottom:16 }}>

          {/* Letterhead */}
          <div style={{ textAlign:"center", paddingBottom:16, borderBottom:`2px solid ${T.primary}`, marginBottom:20 }}>
            <div style={{ fontSize:24, fontWeight:800, color:T.primary, fontFamily:"Newsreader,serif", fontStyle:"italic", marginBottom:4 }}>8Coating</div>
            <div style={{ fontSize:11, color:T.textDim }}>Polyurea Coating Systems · Potable Water Infrastructure & Commercial Flooring</div>
            <div style={{ fontSize:13, fontWeight:800, color:T.primary, marginTop:12, letterSpacing:"0.1em", textTransform:"uppercase" }}>Performance Contract</div>
            <div style={{ fontSize:11, color:T.textDim, marginTop:4 }}>Contract No. {contractNum} · {today}</div>
          </div>

          {/* Parties */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20, background:T.bgLow, borderRadius:10, padding:"14px 16px" }}>
            <div>
              <div style={{ fontSize:10, color:T.textDim, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>Contractor</div>
              <div style={{ fontSize:13, fontWeight:700, color:T.text }}>8Coating</div>
              <div style={{ fontSize:12, color:T.textDim }}>David Brewer, Owner</div>
              <div style={{ fontSize:12, color:T.textDim }}>davidb.get@gmail.com</div>
              <div style={{ fontSize:12, color:T.textDim }}>[Phone Number]</div>
            </div>
            <div>
              <div style={{ fontSize:10, color:T.textDim, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>Client</div>
              <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{job.client}</div>
              <div style={{ fontSize:12, color:T.textDim }}>{job.email||"[Client Email]"}</div>
              <div style={{ fontSize:12, color:T.textDim }}>{job.phone||"[Client Phone]"}</div>
            </div>
          </div>

          {/* Project summary */}
          <div style={{ background:T.bgLow, borderRadius:10, padding:"14px 16px", marginBottom:20 }}>
            <div style={{ fontSize:10, color:T.textDim, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:10 }}>Project Summary</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {[
                ["Project",         job.project],
                ["Facility Type",   job.facilityType],
                ["Square Footage",  `${Number(job.sqFt||0).toLocaleString()} sq ft`],
                ["Contract Value",  fmt(job.contractValue||0)],
                ["Start Date",      job.startDate||"[TBD]"],
                ["End Date",        job.endDate||"[TBD]"],
              ].map(([l,v]) => (
                <div key={l}>
                  <div style={{ fontSize:10, color:T.textDim, fontWeight:600 }}>{l}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Contract sections */}
          <Section num="1" title="Scope of Work">
            {clause(`8Coating agrees to furnish all labor, materials, equipment, and supervision necessary to apply a polyurea coating system to the ${job.facilityType?.toLowerCase()} at the project site listed above, in accordance with the approved proposal and 8Coating's standard application specifications.`)}
            {clause(`Total coating area: ${Number(job.sqFt||0).toLocaleString()} square feet. All surface preparation, priming, application, and quality inspection are included in the contract value of ${fmt(job.contractValue||0)}.`)}
          </Section>

          <Section num="2" title="Payment Schedule">
            {clause("Payment shall be made according to the following milestone-based draw schedule:")}
            <div style={{ background:T.bgLow, borderRadius:8, overflow:"hidden", marginTop:8, marginBottom:4 }}>
              {[
                { milestone:"Contract Signing + Materials Delivered to Site", pct:40 },
                { milestone:"Week 1 Completion — verified by Contractor",      pct:25 },
                { milestone:"Week 3 Completion — verified by Contractor",      pct:25 },
                { milestone:"Final Acceptance — signed off by Client",         pct:10 },
              ].map((d,i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"8px 12px", background:i%2===0?T.surface:T.bgLow, borderBottom:`1px solid ${T.border}` }}>
                  <div style={{ fontSize:12, color:T.text }}>{d.milestone}</div>
                  <div style={{ textAlign:"right", flexShrink:0, marginLeft:12 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:T.primary }}>{fmt(drawAmounts[i])}</div>
                    <div style={{ fontSize:10, color:T.textDim }}>{d.pct}%</div>
                  </div>
                </div>
              ))}
            </div>
            {clause("All payments are due within 3 business days of milestone completion. Failure to remit payment within 7 days of due date may result in suspension of work without penalty to Contractor.")}
          </Section>

          <Section num="3" title="Change Orders">
            {clause("Any work beyond the approved scope of this contract must be authorized by a written Change Order signed by both parties prior to commencement. Change orders are priced at Contractor's then-current rates.")}
            {clause("Payment for change orders is due in full at the time of written approval and prior to commencement of the additional work. Change orders are non-refundable once work has commenced.")}
          </Section>

          <Section num="4" title="Weather & Force Majeure">
            {clause("Work may be suspended at Contractor's sole discretion due to weather conditions that would compromise coating adhesion, cure time, or worker safety. Conditions warranting suspension include but are not limited to: rainfall or surface moisture, sustained winds exceeding 25 mph, ambient temperatures exceeding 95°F or below 40°F, lightning within the operational area, or snow and ice.")}
            {clause("Weather delays do not affect the contract price and do not constitute a breach of contract by either party. Project timeline extensions due to weather will be communicated in writing to Client and logged in the project record.")}
            {clause("This contract is also subject to force majeure provisions including but not limited to: labor strikes, material supply disruptions, acts of war, and governmental orders that prevent performance.")}
          </Section>

          <Section num="5" title="Materials & Pricing">
            {clause("8Coating manufactures its own polyurea coating system using petroleum-based raw materials. Contract pricing reflects material costs at the time of proposal. In the event of a significant market-driven increase in polyurea resin or hardener component costs (exceeding 15% above proposal-date pricing), Contractor reserves the right to adjust material pricing with a minimum of 5 business days written notice to Client.")}
            {clause(`Square footage pricing is based on ${Number(job.sqFt||0).toLocaleString()} sq ft as documented in the approved proposal. Discrepancies in actual square footage discovered on-site will be addressed via written change order.`)}
          </Section>

          <Section num="6" title="Warranty">
            {clause(`8Coating warrants the applied polyurea coating system against product failure under normal operating conditions for a period of ten (10) years from the date of final acceptance. Warranty expiration: ${warrantyExpiry}.`)}
            {clause("This warranty covers adhesion failure, delamination, and product-related defects. It does not cover damage caused by impact, chemical exposure beyond the product's rated specifications, structural movement of the substrate, or unauthorized modifications to the coating.")}
            {clause("Warranty claims must be submitted in writing. 8Coating will inspect and respond within 15 business days of a valid warranty claim submission.")}
          </Section>

          <Section num="7" title="Dispute Resolution">
            {clause("The parties agree to attempt good-faith resolution of any dispute arising under this contract before pursuing formal remedies. In the event of unresolved disputes, the parties agree to binding arbitration under the rules of the American Arbitration Association.")}
            {clause("This contract shall be governed by the laws of the State of Arkansas.")}
          </Section>

          {/* Signature blocks */}
          <div style={{ borderTop:`2px solid ${T.primary}`, paddingTop:20, marginTop:4 }}>
            <div style={{ fontSize:11, color:T.textDim, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:16 }}>Signatures</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>
              {[
                { label:"8Coating — Contractor", name:"David Brewer, Owner", sub:"Date: _______________" },
                { label:`${job.client} — Client`, name:"[Authorized Signatory]", sub:"Date: _______________" },
              ].map((s,i) => (
                <div key={i}>
                  <div style={{ fontSize:11, color:T.textDim, marginBottom:28 }}>{s.label}</div>
                  <div style={{ borderBottom:`1px solid ${T.text}`, marginBottom:6 }}/>
                  <div style={{ fontSize:12, fontWeight:600, color:T.textMid }}>{s.name}</div>
                  <div style={{ fontSize:11, color:T.textDim, marginTop:4 }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Send action */}
        <div style={{ background:T.secondaryLight, border:`1px solid ${T.secondary}55`, borderRadius:12, padding:"14px 16px", marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:700, color:T.secondaryDark, marginBottom:4 }}>📤 Send Contract to Client</div>
          <div style={{ fontSize:11, color:T.textDim, marginBottom:12 }}>Delivers this performance contract to {job.email||"the client"} for review and signature.</div>
          {!sent
            ? <button onClick={()=>setSent(true)} style={{ background:T.secondary, color:"#fff", border:"none", borderRadius:9, padding:"10px 20px", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit" }}>Send Contract Email</button>
            : <div style={{ fontSize:13, color:T.green, fontWeight:700 }}>✓ Contract sent to {job.email||"client"}</div>
          }
        </div>

        <button onClick={onClose} style={{ width:"100%", background:"transparent", color:T.textMid, border:`1px solid ${T.border}`, borderRadius:10, padding:"13px 20px", cursor:"pointer", fontSize:14, fontWeight:600, fontFamily:"inherit" }}>Close</button>
      </div>
    </div>
  );
}

function JobModal({ job, onClose, onSave, crew, subs }) {
  const [form,setForm] = useState(job || { client:"", project:"", facilityType:"Water Tank", sqFt:"", contractValue:"", crew:[], subIds:[], startDate:"", endDate:"", status:"Site Survey", cos:[], delays:[], notes:[], sentMessages:[], draws:[...DRAW_SCHEDULE.map(d=>({...d,paid:false}))] });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const handleSend = (trigger,channel) => { set("sentMessages",[...(form.sentMessages||[]),trigger]); set("notes",[...form.notes,{text:`✉️ Auto-message via ${channel}: "${AUTO_MESSAGES[trigger]?.label}"`,date:todayStr()}]); };
  const toggleCrew = (id) => set("crew", form.crew.includes(id) ? form.crew.filter(x=>x!==id) : [...form.crew,id]);
  const toggleSub  = (id) => set("subIds", (form.subIds||[]).includes(id) ? form.subIds.filter(x=>x!==id) : [...(form.subIds||[]),id]);
  const showAuto = ["Contract Signed","Complete"].includes(form.status);
  const [showContract, setShowContract] = useState(false);
  const [showClosing, setShowClosing] = useState(false);
  return (
    <>
    <Modal onClose={onClose} wide>
      <div style={{ fontSize:20, fontWeight:800, color:T.primary, marginBottom:20, fontFamily:"Newsreader,serif" }}>{job ? job.project : "New Job"}</div>
      {!job && (<>
        <div style={row2}>
          <div><label style={lbl}>Client</label><input style={inp} value={form.client} onChange={e=>set("client",e.target.value)} placeholder="Client name"/></div>
          <div><label style={lbl}>Project Name</label><input style={inp} value={form.project} onChange={e=>set("project",e.target.value)} placeholder="Project description"/></div>
        </div>
        <div style={row2}>
          <div>
            <label style={lbl}>Facility Type</label>
            <select style={{ ...inp }} value={form.facilityType} onChange={e=>set("facilityType",e.target.value)}>
              {FACILITY_TYPES.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Square Footage</label><input style={inp} type="number" value={form.sqFt} onChange={e=>set("sqFt",e.target.value)} placeholder="0"/></div>
        </div>
        <div style={row2}>
          <div><label style={lbl}>Contract Value ($)</label><input style={inp} type="number" value={form.contractValue} onChange={e=>set("contractValue",e.target.value)} placeholder="0"/></div>
          <div><label style={lbl}>Change Orders ($)</label><input style={inp} type="number" value={form.changeOrders} onChange={e=>set("changeOrders",e.target.value)} placeholder="0"/></div>
        </div>
        <div style={row2}>
          <div><label style={lbl}>Start Date</label><input style={inp} type="date" value={form.startDate} onChange={e=>set("startDate",e.target.value)}/></div>
          <div><label style={lbl}>End Date</label><input style={inp} type="date" value={form.endDate} onChange={e=>set("endDate",e.target.value)}/></div>
        </div>
      </>)}
      <label style={lbl}>Billing Milestone Status</label>
      <StatusPicker statuses={JOB_STATUSES} value={form.status} onChange={v=>set("status",v)}/>
      {showAuto && <AutoMessagePanel trigger={form.status} name={form.client||job?.client||"there"} sentLog={form.sentMessages} onSend={handleSend}/>}

      {/* Draw schedule */}
      <div style={divider}/>
      <div style={{ fontSize:11, color:T.textDim, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:12 }}>Draw Schedule — Mark Payments Received</div>
      {(form.draws||[]).map((d,i) => (
        <div key={i} onClick={()=>{ const draws=[...form.draws]; draws[i]={...draws[i],paid:!draws[i].paid}; set("draws",draws); }}
          style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:10, border:`1px solid ${d.paid?T.green:T.border}`, background: d.paid?T.greenBg:T.surface, cursor:"pointer", marginBottom:8, transition:"all 0.15s" }}>
          <div style={{ width:20, height:20, borderRadius:"50%", background: d.paid?T.green:T.border, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            {d.paid && <span style={{ color:"#fff", fontSize:12, fontWeight:700 }}>✓</span>}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:600, color: d.paid?T.green:T.text }}>{d.milestone}</div>
          </div>
          <div style={{ fontSize:14, fontWeight:800, color: d.paid?T.green:T.textDim }}>
            {d.pct}% — {form.contractValue ? fmt((parseFloat(form.contractValue)||job?.contractValue||0) * d.pct/100) : `${d.pct}%`}
          </div>
        </div>
      ))}

      <div style={divider}/>
      <div style={{ fontSize:11, color:T.textDim, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:12 }}>Change Orders</div>
      <ChangeOrderTracker cos={form.cos||[]} contractValue={parseFloat(form.contractValue)||job?.contractValue||0} onChange={v=>set("cos",v)}/>

      <div style={divider}/>
      <div style={{ fontSize:11, color:"#4A6B88", fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:12 }}>🌧️ Weather Delay Log</div>
      <WeatherDelayLog delays={form.delays||[]} onChange={v=>set("delays",v)}/>

      <div style={divider}/>
      <div style={{ fontSize:11, color:T.textDim, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:12 }}>Assign Crew</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:14 }}>
        {crew.map(c => {
          const sel = form.crew.includes(c.id);
          return (
            <div key={c.id} onClick={()=>toggleCrew(c.id)} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:10, border:`1px solid ${sel?T.secondary:T.border}`, background: sel?T.secondaryLight:T.surface, cursor:"pointer" }}>
              <Avatar name={c.name} size={28}/><div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:600 }}>{c.name}</div><div style={{ fontSize:11, color:T.textDim }}>{c.role}</div></div>
              <Badge status={c.status}/>{sel && <span style={{ color:T.secondary, fontWeight:700 }}>✓</span>}
            </div>
          );
        })}
      </div>

      <div style={{ fontSize:11, color:T.textDim, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:12 }}>Assign Subcontractor</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:14 }}>
        {subs.map(s => {
          const sel = (form.subIds||[]).includes(s.id);
          return (
            <div key={s.id} onClick={()=>toggleSub(s.id)} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:10, border:`1px solid ${sel?T.amber:T.border}`, background: sel?T.amberBg:T.surface, cursor:"pointer" }}>
              <Avatar name={s.name} size={28}/><div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:600 }}>{s.name}</div><div style={{ fontSize:11, color:T.textDim }}>{s.trade}</div></div>
              <Badge status={s.status}/>{sel && <span style={{ color:T.amber, fontWeight:700 }}>✓</span>}
            </div>
          );
        })}
      </div>

      <div style={divider}/>
      <NoteLog notes={form.notes} onAdd={note=>set("notes",[...form.notes,note])}/>
      <div style={{ marginTop:20 }}>
        <PrimaryBtn onClick={()=>onSave(form)}>{job?"Save Changes":"Add Job"}</PrimaryBtn>
        {form.status==="Contract Signed" && (
          <button onClick={()=>setShowContract(true)} style={{ width:"100%", background:T.primary, color:"#fff", border:"none", borderRadius:10, padding:"13px 20px", cursor:"pointer", fontSize:14, fontWeight:700, marginTop:8, fontFamily:"inherit" }}>
            📋 Generate Performance Contract
          </button>
        )}
        {form.status==="Complete" && (
          <button onClick={()=>setShowClosing(true)} style={{ width:"100%", background:T.green, color:"#fff", border:"none", borderRadius:10, padding:"13px 20px", cursor:"pointer", fontSize:14, fontWeight:700, marginTop:8, fontFamily:"inherit" }}>
            ✅ Generate Closing Documents
          </button>
        )}
        <GhostBtn onClick={onClose}>Cancel</GhostBtn>
      </div>
    </Modal>
    {showContract && <PerformanceContractGenerator job={form} onClose={()=>setShowContract(false)}/>}
    {showClosing  && <ClosingDocumentsGenerator   job={form} onClose={()=>setShowClosing(false)}/>}
    </>
  );
}

function SubModal({ sub, onClose, onSave }) {
  const [form,setForm] = useState(sub || { name:"", company:"", trade:"Surface Preparation", phone:"", email:"", status:"Available", contractOnFile:false, w9OnFile:false, insuranceCurrent:false, notes:[] });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  return (
    <Modal onClose={onClose}>
      <div style={{ fontSize:20, fontWeight:800, color:T.primary, marginBottom:20, fontFamily:"Newsreader,serif" }}>{sub ? sub.name : "New Subcontractor"}</div>
      <div style={row2}>
        <div><label style={lbl}>Name</label><input style={inp} value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Full name"/></div>
        <div><label style={lbl}>Company</label><input style={inp} value={form.company} onChange={e=>set("company",e.target.value)} placeholder="Company name"/></div>
      </div>
      <div style={row2}>
        <div>
          <label style={lbl}>Trade / Specialty</label>
          <select style={{ ...inp }} value={form.trade} onChange={e=>set("trade",e.target.value)}>
            {SUB_TRADES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div><label style={lbl}>Phone</label><input style={inp} value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="Phone"/></div>
      </div>
      <label style={lbl}>Email</label>
      <input style={inp} value={form.email} onChange={e=>set("email",e.target.value)} placeholder="Email"/>
      <label style={lbl}>Availability</label>
      <StatusPicker statuses={SUB_STATUSES} value={form.status} onChange={v=>set("status",v)}/>

      {/* Document tracking */}
      <div style={divider}/>
      <div style={{ fontSize:11, color:T.textDim, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:12 }}>Document Status</div>
      {[["contractOnFile","Performance Contract on File"],["w9OnFile","W-9 on File"],["insuranceCurrent","Insurance / COI Current"]].map(([key,label]) => (
        <div key={key} onClick={()=>set(key,!form[key])}
          style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:10, border:`1px solid ${form[key]?T.green:T.border}`, background: form[key]?T.greenBg:T.surface, cursor:"pointer", marginBottom:8, transition:"all 0.15s" }}>
          <div style={{ width:20, height:20, borderRadius:"50%", background: form[key]?T.green:T.border, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            {form[key] && <span style={{ color:"#fff", fontSize:12, fontWeight:700 }}>✓</span>}
          </div>
          <div style={{ fontSize:13, fontWeight:600, color: form[key]?T.green:T.textMid }}>{label}</div>
        </div>
      ))}

      <div style={divider}/>
      <NoteLog notes={form.notes} onAdd={note=>set("notes",[...form.notes,note])}/>
      <div style={{ marginTop:20 }}>
        <PrimaryBtn onClick={()=>onSave(form)}>{sub?"Save Changes":"Add Subcontractor"}</PrimaryBtn>
        <GhostBtn onClick={onClose}>Cancel</GhostBtn>
      </div>
    </Modal>
  );
}

// ── Proposal Generator ───────────────────────────────────────
function ProposalGenerator({ estimate, onClose }) {
  const total = lineTotal(estimate.items);
  const drawAmounts = [0.40, 0.25, 0.25, 0.10].map(pct => total * pct);
  const today = new Date().toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" });
  const [sent, setSent] = useState(false);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(27,28,26,0.6)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:400 }} onClick={onClose}>
      <div style={{ background:T.bg, borderRadius:"20px 20px 0 0", width:"100%", maxWidth:680, maxHeight:"94vh", overflowY:"auto", padding:"28px 24px 56px", boxShadow:"0 -8px 48px rgba(0,0,0,0.2)" }} onClick={e=>e.stopPropagation()}>
        <div style={{ width:40, height:4, background:T.borderMid, borderRadius:2, margin:"0 auto 24px" }}/>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
          <div>
            <div style={{ fontSize:20, fontWeight:800, color:T.primary, fontFamily:"Newsreader,serif" }}>Proposal Generated</div>
            <div style={{ fontSize:13, color:T.textDim, marginTop:2 }}>Review before sending to {estimate.client}</div>
          </div>
          <Badge status="Approved" size="lg"/>
        </div>

        {/* Proposal document preview */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:"28px 24px", marginBottom:16 }}>

          {/* Letterhead */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", paddingBottom:16, borderBottom:`2px solid ${T.primary}`, marginBottom:20 }}>
            <div>
              <div style={{ fontSize:22, fontWeight:800, color:T.primary, fontFamily:"Newsreader,serif", fontStyle:"italic" }}>8Coating</div>
              <div style={{ fontSize:11, color:T.textDim, marginTop:2 }}>Polyurea Coating Systems · Potable Water & Commercial Flooring</div>
              <div style={{ fontSize:11, color:T.textDim }}>davidb.get@gmail.com · [Phone Number]</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:11, color:T.textDim }}>Proposal No.</div>
              <div style={{ fontSize:14, fontWeight:700, color:T.primary }}>{estimate.number.replace("EST","PROP")}</div>
              <div style={{ fontSize:11, color:T.textDim, marginTop:4 }}>{today}</div>
            </div>
          </div>

          {/* Client info */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:11, color:T.textDim, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:8 }}>Prepared For</div>
            <div style={{ fontSize:15, fontWeight:700, color:T.text }}>{estimate.client}</div>
            <div style={{ fontSize:13, color:T.textDim }}>{estimate.email}</div>
            <div style={{ fontSize:13, color:T.textDim, marginTop:2 }}>{estimate.facilityType} · {Number(estimate.sqFt).toLocaleString()} sq ft</div>
          </div>

          {/* Scope */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:11, color:T.textDim, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:10 }}>Scope of Work</div>
            <div style={{ background:T.bgLow, borderRadius:10, overflow:"hidden" }}>
              {/* Table header */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 80px 90px 100px", gap:0, background:T.primary, padding:"8px 14px" }}>
                {["Description","Qty / Sq Ft","Unit Price","Total"].map((h,i) => (
                  <div key={i} style={{ fontSize:10, fontWeight:700, color:T.surface, letterSpacing:"0.06em", textTransform:"uppercase", textAlign:i>1?"right":"left" }}>{h}</div>
                ))}
              </div>
              {estimate.items.map((item,i) => {
                const rowTotal = (parseFloat(item.qty)||0) * (parseFloat(item.price)||0);
                return (
                  <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 80px 90px 100px", gap:0, padding:"9px 14px", background: i%2===0?T.surface:T.bgLow, borderBottom:`1px solid ${T.border}` }}>
                    <div style={{ fontSize:13, color:T.text }}>{item.desc}</div>
                    <div style={{ fontSize:13, color:T.textMid, textAlign:"right" }}>{Number(item.qty).toLocaleString()}</div>
                    <div style={{ fontSize:13, color:T.textMid, textAlign:"right" }}>${parseFloat(item.price).toFixed(2)}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:T.text, textAlign:"right" }}>{fmt(rowTotal)}</div>
                  </div>
                );
              })}
              {/* Total row */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 80px 90px 100px", padding:"10px 14px", background:T.primary }}>
                <div style={{ fontSize:13, fontWeight:700, color:T.surface, gridColumn:"1/4" }}>Total Proposal Value</div>
                <div style={{ fontSize:15, fontWeight:800, color:T.secondary, textAlign:"right", fontFamily:"Newsreader,serif" }}>{fmt(total)}</div>
              </div>
            </div>
          </div>

          {/* Draw schedule */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:11, color:T.textDim, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:10 }}>Payment Schedule</div>
            <div style={{ background:T.bgLow, borderRadius:10, overflow:"hidden" }}>
              {[
                { milestone:"Contract Signing + Materials Delivered to Site", pct:40 },
                { milestone:"Week 1 Completion",                              pct:25 },
                { milestone:"Week 3 Completion",                              pct:25 },
                { milestone:"Final Acceptance of All Work",                   pct:10 },
              ].map((d,i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 14px", background:i%2===0?T.surface:T.bgLow, borderBottom:`1px solid ${T.border}` }}>
                  <div style={{ fontSize:13, color:T.text }}>{d.milestone}</div>
                  <div style={{ textAlign:"right", flexShrink:0, marginLeft:12 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:T.primary }}>{fmt(drawAmounts[i])}</div>
                    <div style={{ fontSize:10, color:T.textDim }}>{d.pct}% of total</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Terms */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:11, color:T.textDim, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:10 }}>Terms & Conditions</div>
            <div style={{ background:T.bgLow, borderRadius:10, padding:"14px 16px" }}>
              {[
                "All work performed under 8Coating\u2019s standard Performance Contract, provided separately for review and signature.",
                "Change orders must be approved in writing prior to commencement. Payment for change orders is due upfront at time of approval.",
                "8Coating\u2019s polyurea coating system carries a 10-year limited warranty against product failure under normal conditions.",
                "Work may be delayed or suspended due to weather conditions including rain, high winds (exceeding 25 mph), extreme heat (exceeding 95\u00b0F), snow, or ice. Delays due to weather do not affect the contract price.",
                "Contract pricing is based on current material costs. Significant market fluctuations in polyurea resin or hardener components may require a price adjustment, which will be communicated prior to mobilization.",
                "This proposal is valid for 30 days from the date of issue.",
              ].map((term,i) => (
                <div key={i} style={{ display:"flex", gap:10, marginBottom:i<5?8:0 }}>
                  <div style={{ fontSize:12, color:T.secondary, fontWeight:700, flexShrink:0, marginTop:1 }}>{i+1}.</div>
                  <div style={{ fontSize:12, color:T.textMid, lineHeight:1.6 }}>{term}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Signature block */}
          <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:16 }}>
            <div style={{ fontSize:11, color:T.textDim, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:12 }}>Acceptance</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
              <div>
                <div style={{ borderBottom:`1px solid ${T.text}`, marginBottom:4, paddingBottom:24 }}/>
                <div style={{ fontSize:11, color:T.textDim }}>Authorized Signature — 8Coating</div>
                <div style={{ fontSize:12, fontWeight:600, color:T.textMid, marginTop:2 }}>David Brewer, Owner</div>
              </div>
              <div>
                <div style={{ borderBottom:`1px solid ${T.text}`, marginBottom:4, paddingBottom:24 }}/>
                <div style={{ fontSize:11, color:T.textDim }}>Client Signature</div>
                <div style={{ fontSize:12, fontWeight:600, color:T.textMid, marginTop:2 }}>{estimate.client}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ background:T.secondaryLight, border:`1px solid ${T.secondary}55`, borderRadius:12, padding:"14px 16px", marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:700, color:T.secondaryDark, marginBottom:4 }}>📤 Send Proposal to Client</div>
          <div style={{ fontSize:11, color:T.textDim, marginBottom:12 }}>Delivers this proposal to {estimate.email} with a request to review and confirm.</div>
          {!sent
            ? <button onClick={()=>setSent(true)} style={{ background:T.secondary, color:"#fff", border:"none", borderRadius:9, padding:"10px 20px", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit" }}>Send Proposal Email</button>
            : <div style={{ fontSize:13, color:T.green, fontWeight:700 }}>✓ Proposal sent to {estimate.email}</div>
          }
        </div>

        <button onClick={onClose} style={{ width:"100%", background:"transparent", color:T.textMid, border:`1px solid ${T.border}`, borderRadius:10, padding:"13px 20px", cursor:"pointer", fontSize:14, fontWeight:600, fontFamily:"inherit" }}>Close</button>
      </div>
    </div>
  );
}

function EstimateModal({ estimate, onClose, onSave, onConvert }) {
  const [form,setForm] = useState(estimate || { number:`EST-2026-0${Date.now()%90+13}`, client:"", email:"", facilityType:"Water Tank", sqFt:"", date:todayStr(), status:"Draft", items:[{desc:"Surface prep & blast cleaning",qty:0,price:0},{desc:"Polyurea coating system",qty:0,price:0},{desc:"Materials — polyurea resin & hardener",qty:1,price:0},{desc:"Equipment transport & mobilization",qty:1,price:0}] });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const [showProposal, setShowProposal] = useState(false);
  return (
    <>
    <Modal onClose={onClose} wide>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div style={{ fontSize:20, fontWeight:800, color:T.primary, fontFamily:"Newsreader,serif" }}>{estimate ? form.number : "New Estimate"}</div>
        {estimate && <Badge status={form.status} size="lg"/>}
      </div>
      <div style={row2}>
        <div><label style={lbl}>Client</label><input style={inp} value={form.client} onChange={e=>set("client",e.target.value)} placeholder="Client"/></div>
        <div><label style={lbl}>Email</label><input style={inp} value={form.email} onChange={e=>set("email",e.target.value)} placeholder="Email"/></div>
      </div>
      <div style={row2}>
        <div>
          <label style={lbl}>Facility Type</label>
          <select style={{ ...inp }} value={form.facilityType} onChange={e=>set("facilityType",e.target.value)}>
            {FACILITY_TYPES.map(f => <option key={f}>{f}</option>)}
          </select>
        </div>
        <div><label style={lbl}>Square Footage</label><input style={inp} type="number" value={form.sqFt} onChange={e=>set("sqFt",e.target.value)} placeholder="0"/></div>
      </div>
      <label style={lbl}>Status</label>
      <StatusPicker statuses={["Draft","Sent","Approved","Declined"]} value={form.status} onChange={v=>set("status",v)}/>
      <div style={divider}/>
      <label style={lbl}>Line Items</label>
      <LineItemBuilder items={form.items} onChange={items=>set("items",items)}/>
      <div style={{ marginTop:20 }}>
        <PrimaryBtn onClick={()=>onSave(form)}>{estimate?"Save Estimate":"Create Estimate"}</PrimaryBtn>
        {estimate && form.status==="Approved" && (
          <button onClick={()=>setShowProposal(true)} style={{ width:"100%", background:T.primary, color:"#fff", border:"none", borderRadius:10, padding:"13px 20px", cursor:"pointer", fontSize:14, fontWeight:700, marginTop:8, fontFamily:"inherit" }}>
            📄 Generate Proposal
          </button>
        )}
        {estimate && form.status==="Approved" && <PrimaryBtn onClick={()=>onConvert(form)} color={T.green}>⚡ Convert to Invoice</PrimaryBtn>}
        <GhostBtn onClick={onClose}>Cancel</GhostBtn>
      </div>
    </Modal>
    {showProposal && <ProposalGenerator estimate={form} onClose={()=>setShowProposal(false)}/>}
    </>
  );
}

function InvoiceModal({ invoice, onClose, onSave }) {
  const [form,setForm] = useState(invoice || { number:`INV-2026-0${Date.now()%90+20}`, client:"", email:"", project:"", amount:0, paid:0, due:"", status:"Unpaid", notes:[], sentMessages:[] });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const balance = (parseFloat(form.amount)||0) - (parseFloat(form.paid)||0);
  const [justSent,setJustSent] = useState(false);
  const invSent = (form.sentMessages||[]).includes("invoice") || justSent;
  return (
    <Modal onClose={onClose}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div style={{ fontSize:20, fontWeight:800, color:T.primary, fontFamily:"Newsreader,serif" }}>{form.number}</div>
        <Badge status={form.status} size="lg"/>
      </div>
      {!invoice && (<div style={row2}>
        <div><label style={lbl}>Client</label><input style={inp} value={form.client} onChange={e=>set("client",e.target.value)} placeholder="Client"/></div>
        <div><label style={lbl}>Email</label><input style={inp} value={form.email} onChange={e=>set("email",e.target.value)} placeholder="Email"/></div>
      </div>)}
      <div style={row2}>
        <div><label style={lbl}>Project</label><input style={inp} value={form.project} onChange={e=>set("project",e.target.value)} placeholder="Project"/></div>
        <div><label style={lbl}>Due Date</label><input style={inp} type="date" value={form.due} onChange={e=>set("due",e.target.value)}/></div>
      </div>
      <div style={row2}>
        <div><label style={lbl}>Invoice Amount</label><input style={inp} type="number" value={form.amount} onChange={e=>set("amount",e.target.value)}/></div>
        <div><label style={lbl}>Amount Paid</label><input style={inp} type="number" value={form.paid} onChange={e=>set("paid",e.target.value)}/></div>
      </div>
      <div style={{ background:T.bgLow, borderRadius:12, padding:"14px 18px", marginBottom:16, border:`1px solid ${T.border}` }}>
        {[["Invoice Total",fmtD(form.amount||0),T.text],["Amount Paid",fmtD(form.paid||0),T.green]].map(([l,v,c]) => (
          <div key={l} style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <span style={{ fontSize:13, color:T.textDim }}>{l}</span><span style={{ fontSize:13, fontWeight:700, color:c }}>{v}</span>
          </div>
        ))}
        <div style={{ height:3, background:T.border, borderRadius:3, overflow:"hidden", marginBottom:10 }}>
          <div style={{ height:"100%", width:`${Math.min(100,((form.paid||0)/(form.amount||1))*100)}%`, background:T.green, borderRadius:3 }}/>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", paddingTop:8, borderTop:`1px solid ${T.border}` }}>
          <span style={{ fontSize:14, fontWeight:700 }}>Balance Due</span>
          <span style={{ fontSize:18, fontWeight:800, color: balance>0?T.red:T.green, fontFamily:"Newsreader,serif" }}>{fmtD(balance)}</span>
        </div>
      </div>
      <label style={lbl}>Payment Status</label>
      <StatusPicker statuses={INV_STATUSES} value={form.status} onChange={v=>set("status",v)}/>
      <div style={{ background:T.secondaryLight, border:`1px solid ${T.secondary}55`, borderRadius:12, padding:14, marginBottom:8 }}>
        <div style={{ fontSize:13, fontWeight:700, color:T.secondaryDark, marginBottom:4 }}>📄 Send Invoice to Client</div>
        <div style={{ fontSize:11, color:T.textDim, marginBottom:10 }}>Sends invoice with draw schedule breakdown and balance due.</div>
        {!invSent
          ? <button onClick={()=>{setJustSent(true);set("sentMessages",[...(form.sentMessages||[]),"invoice"]);}} style={{ background:T.secondary, color:"#fff", border:"none", borderRadius:8, padding:"9px 18px", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit" }}>Send Invoice Email</button>
          : <div style={{ fontSize:13, color:T.green, fontWeight:700 }}>✓ Invoice sent to {form.email||invoice?.email}</div>
        }
      </div>
      <div style={{ marginTop:14 }}>
        <PrimaryBtn onClick={()=>onSave(form)}>{invoice?"Save Changes":"Create Invoice"}</PrimaryBtn>
        <GhostBtn onClick={onClose}>Cancel</GhostBtn>
      </div>
    </Modal>
  );
}

// ── Clients Tab ───────────────────────────────────────────────
function buildClientBook(clientBook, jobs, invoices) {
  // Start from clientBook as source of truth, enrich with job/invoice data
  const enriched = clientBook.map(c => {
    const clientJobs = jobs.filter(j => j.client === c.name);
    const clientInvs = invoices.filter(i => i.client === c.name);
    const totalRevenue = clientJobs.reduce((s,j) => s+(j.contractValue||0)+((j.cos||[]).filter(co=>co.status==="Approved").reduce((a,co)=>a+(parseFloat(co.amount)||0),0)), 0);
    const totalBilled  = clientInvs.reduce((s,i) => s+(parseFloat(i.amount)||0), 0);
    const facilityTypes = new Set(clientJobs.map(j=>j.facilityType).filter(Boolean));
    return { ...c, jobs:clientJobs, totalRevenue, totalBilled, facilityTypes };
  });
  return enriched.sort((a,b) => b.totalRevenue - a.totalRevenue);
}

function ClientDetailModal({ client, jobs, invoices, onClose, onSave }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...client });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const clientJobs = jobs.filter(j => j.client === client.name);
  const clientInvoices = invoices.filter(i => i.client === client.name);
  const totalCollected = clientInvoices.reduce((s,i) => s+(parseFloat(i.paid)||0), 0);
  const totalBilled    = clientInvoices.reduce((s,i) => s+(parseFloat(i.amount)||0), 0);
  const hasWarranty    = clientJobs.some(j => j.status === "Complete");

  return (
    <Modal onClose={onClose} wide>
      {editing ? (
        /* ── Edit Mode ── */
        <div>
          <div style={{ fontSize:18, fontWeight:800, color:T.primary, marginBottom:20, fontFamily:"Newsreader,serif" }}>Edit Client</div>
          <label style={lbl}>Client / Organization Name</label>
          <input style={inp} value={form.name} onChange={e=>set("name",e.target.value)}/>
          <div style={row2}>
            <div><label style={lbl}>Primary Contact</label><input style={inp} value={form.contact||""} onChange={e=>set("contact",e.target.value)} placeholder="Contact name"/></div>
            <div><label style={lbl}>Title / Role</label><input style={inp} value={form.title||""} onChange={e=>set("title",e.target.value)} placeholder="e.g. Facilities Manager"/></div>
          </div>
          <div style={row2}>
            <div><label style={lbl}>Phone</label><input style={inp} value={form.phone||""} onChange={e=>set("phone",e.target.value)} placeholder="Phone"/></div>
            <div><label style={lbl}>Email</label><input style={inp} value={form.email||""} onChange={e=>set("email",e.target.value)} placeholder="Email"/></div>
          </div>
          <label style={lbl}>Company</label>
          <input style={inp} value={form.company||""} onChange={e=>set("company",e.target.value)} placeholder="Company name"/>
          <label style={lbl}>Address</label>
          <input style={inp} value={form.address||""} onChange={e=>set("address",e.target.value)} placeholder="Street address"/>
          <div style={divider}/>
          <NoteLog notes={form.notes||[]} onAdd={note=>set("notes",[...(form.notes||[]),note])}/>
          <div style={{ marginTop:20 }}>
            <PrimaryBtn onClick={()=>{ onSave(form); setEditing(false); }}>Save Changes</PrimaryBtn>
            <GhostBtn onClick={()=>setEditing(false)}>Cancel</GhostBtn>
          </div>
        </div>
      ) : (
        /* ── View Mode ── */
        <div>
          {/* Header */}
          <div style={{ marginBottom:20 }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:14, marginBottom:14 }}>
              <Avatar name={client.name} size={52}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:20, fontWeight:800, color:T.primary, fontFamily:"Newsreader,serif", marginBottom:2 }}>{client.name}</div>
                {client.contact && <div style={{ fontSize:13, fontWeight:600, color:T.textMid }}>{client.contact}{client.title ? ` · ${client.title}` : ""}</div>}
                {client.company && client.company !== client.name && <div style={{ fontSize:12, color:T.textDim }}>{client.company}</div>}
              </div>
              <button onClick={()=>setEditing(true)} style={{ background:T.primaryLight, color:T.primary, border:`1px solid ${T.border}`, borderRadius:8, padding:"7px 14px", cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"inherit", flexShrink:0 }}>✏️ Edit</button>
            </div>

            {/* Contact details */}
            <div style={{ background:T.bgLow, borderRadius:12, padding:"14px 16px", marginBottom:12 }}>
              <div style={{ fontSize:11, color:T.textDim, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:10 }}>Contact Information</div>
              {client.phone && (
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                  <span style={{ fontSize:16, width:24, textAlign:"center" }}>📞</span>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{client.phone}</div>
                    <a href={`tel:${client.phone}`} style={{ fontSize:11, color:T.secondary, textDecoration:"none", fontWeight:600 }}>Tap to call</a>
                  </div>
                </div>
              )}
              {client.email && (
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                  <span style={{ fontSize:16, width:24, textAlign:"center" }}>✉️</span>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{client.email}</div>
                    <a href={`mailto:${client.email}`} style={{ fontSize:11, color:T.secondary, textDecoration:"none", fontWeight:600 }}>Tap to email</a>
                  </div>
                </div>
              )}
              {client.address && (
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:16, width:24, textAlign:"center" }}>📍</span>
                  <div style={{ fontSize:13, color:T.text }}>{client.address}</div>
                </div>
              )}
            </div>

            {/* Badges */}
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {hasWarranty && <span style={{ display:"flex", alignItems:"center", gap:6, background:T.greenBg, borderRadius:8, padding:"6px 12px" }}>
                <span style={{ fontSize:13 }}>🛡️</span><span style={{ fontSize:12, fontWeight:600, color:T.green }}>10-Year Warranty Active</span>
              </span>}
              {[...client.facilityTypes].map(ft => (
                <span key={ft} style={{ background:T.bgLow, borderRadius:8, padding:"6px 12px", fontSize:12, color:T.textMid }}>🏭 {ft}</span>
              ))}
            </div>
          </div>

          {/* Revenue summary */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:20 }}>
            {[
              { label:"Total Jobs",   value:clientJobs.length,    color:T.primary },
              { label:"Total Billed", value:fmtK(totalBilled),    color:T.primary },
              { label:"Collected",    value:fmtK(totalCollected), color:T.green   },
            ].map(({ label,value,color }) => (
              <div key={label} style={{ background:T.bgLow, borderRadius:10, padding:"12px 14px", textAlign:"center" }}>
                <div style={{ fontSize:10, color:T.textDim, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:6 }}>{label}</div>
                <div style={{ fontSize:18, fontWeight:800, color, fontFamily:"Newsreader,serif" }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Notes */}
          {(client.notes||[]).length > 0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, color:T.textDim, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:10 }}>Notes</div>
              {(client.notes||[]).map((n,i) => (
                <div key={i} style={{ background:T.bgLow, borderRadius:10, padding:"10px 14px", marginBottom:8, borderLeft:`3px solid ${T.border}` }}>
                  <div style={{ fontSize:13, color:T.text }}>{n.text}</div>
                  <div style={{ fontSize:11, color:T.textDim, marginTop:4 }}>{n.date}</div>
                </div>
              ))}
            </div>
          )}

          {/* Job history */}
          <div style={{ fontSize:11, color:T.textDim, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:12 }}>Job History</div>
          {clientJobs.length === 0 && <div style={{ fontSize:13, color:T.textDim, fontStyle:"italic", marginBottom:16 }}>No jobs yet.</div>}
          {clientJobs.map(j => {
            const m = STATUS_META[j.status] || { color:T.primary, bg:T.blueBg };
            const approvedCOs = (j.cos||[]).filter(c=>c.status==="Approved").reduce((s,c)=>s+(parseFloat(c.amount)||0),0);
            return (
              <div key={j.id} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:"14px 16px", marginBottom:10, borderLeft:`4px solid ${m.color}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:T.primary }}>{j.project}</div>
                    <div style={{ fontSize:11, color:T.textDim, marginTop:2 }}>{j.facilityType} · {j.sqFt?.toLocaleString()} sq ft</div>
                    <div style={{ fontSize:11, color:T.textMid, marginTop:2 }}>📅 {j.startDate} → {j.endDate}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <Badge status={j.status} size="lg"/>
                    <div style={{ fontSize:15, fontWeight:800, color:T.primary, marginTop:6, fontFamily:"Newsreader,serif" }}>{fmtK(j.contractValue + approvedCOs)}</div>
                  </div>
                </div>
                <DrawBar draws={j.draws} contractValue={j.contractValue}/>
                {(j.cos||[]).length > 0 && <div style={{ fontSize:11, color:T.amber, fontWeight:600, marginTop:8 }}>{(j.cos||[]).length} change order{(j.cos||[]).length!==1?"s":""} · {fmt(approvedCOs)} approved</div>}
                {(j.delays||[]).length > 0 && <div style={{ fontSize:11, color:"#4A6B88", fontWeight:600, marginTop:4 }}>🌧️ {(j.delays||[]).length} weather delay{(j.delays||[]).length!==1?"s":""}</div>}
              </div>
            );
          })}

          {/* Invoice history */}
          {clientInvoices.length > 0 && (<>
            <div style={{ fontSize:11, color:T.textDim, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:12, marginTop:20 }}>Invoice History</div>
            {clientInvoices.map(inv => {
              const balance = (parseFloat(inv.amount)||0) - (parseFloat(inv.paid)||0);
              return (
                <div key={inv.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${T.border}` }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{inv.number}</div>
                    <div style={{ fontSize:11, color:T.textDim, marginTop:2 }}>Due {inv.due}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <Badge status={inv.status}/>
                    <div style={{ fontSize:13, fontWeight:700, color: balance>0?T.red:T.green, marginTop:4 }}>{balance>0 ? `${fmtD(balance)} owed` : "Paid in full"}</div>
                  </div>
                </div>
              );
            })}
          </>)}

          <div style={{ marginTop:24 }}>
            <GhostBtn onClick={onClose}>Close</GhostBtn>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ClientsTab({ clientBook, jobs, invoices, onSaveClient }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const clients = buildClientBook(clientBook, jobs, invoices);
  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.contact||"").toLowerCase().includes(search.toLowerCase()) ||
    (c.email||"").toLowerCase().includes(search.toLowerCase())
  );
  const selectedClient = selected ? clients.find(c=>c.name===selected) : null;

  return (
    <div>
      {/* Search */}
      <input
        style={{ ...inp, marginBottom:16 }}
        placeholder="🔍  Search clients..."
        value={search}
        onChange={e=>setSearch(e.target.value)}
      />

      {/* Stats strip */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:20 }}>
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:"12px 14px", borderTop:`3px solid ${T.primary}` }}>
          <div style={{ fontSize:10, color:T.textDim, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>Total Clients</div>
          <div style={{ fontSize:22, fontWeight:800, color:T.primary, fontFamily:"Newsreader,serif" }}>{clients.length}</div>
        </div>
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:"12px 14px", borderTop:`3px solid ${T.green}` }}>
          <div style={{ fontSize:10, color:T.textDim, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>Under Warranty</div>
          <div style={{ fontSize:22, fontWeight:800, color:T.green, fontFamily:"Newsreader,serif" }}>{clients.filter(c=>c.jobs.some(j=>j.status==="Complete")).length}</div>
        </div>
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:"12px 14px", borderTop:`3px solid ${T.secondary}` }}>
          <div style={{ fontSize:10, color:T.textDim, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>Repeat Clients</div>
          <div style={{ fontSize:22, fontWeight:800, color:T.secondary, fontFamily:"Newsreader,serif" }}>{clients.filter(c=>c.jobs.length>1).length}</div>
        </div>
      </div>

      {/* Client list */}
      {filtered.length === 0 && (
        <div style={{ fontSize:13, color:T.textDim, fontStyle:"italic", textAlign:"center", padding:24 }}>No clients found.</div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {filtered.map(client => {
          const [h,setH] = useState(false);
          const completedJobs = client.jobs.filter(j=>j.status==="Complete").length;
          const activeJobs = client.jobs.filter(j=>j.status!=="Complete").length;
          const hasWarranty = completedJobs > 0;
          return (
            <div key={client.name} onClick={()=>setSelected(client.name)}
              onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
              style={{ background:T.surface, border:`1px solid ${h?T.borderMid:T.border}`, borderRadius:16, padding:"16px 20px", cursor:"pointer", transition:"all 0.15s", boxShadow:h?"0 4px 24px rgba(61,80,102,0.1)":"none", borderLeft:`4px solid ${hasWarranty?T.green:T.primary}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                <Avatar name={client.name} size={44}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
                    <div style={{ fontSize:15, fontWeight:700, color:T.primary, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{client.name}</div>
                    {hasWarranty && <span style={{ background:T.greenBg, color:T.green, borderRadius:5, padding:"2px 7px", fontSize:10, fontWeight:700, flexShrink:0 }}>🛡️ Warranty</span>}
                    {activeJobs > 0 && <span style={{ background:T.secondaryLight, color:T.secondaryDark, borderRadius:5, padding:"2px 7px", fontSize:10, fontWeight:700, flexShrink:0 }}>Active</span>}
                  </div>
                  {client.contact && <div style={{ fontSize:12, color:T.textMid, marginBottom:4, fontWeight:600 }}>{client.contact}{client.title ? ` · ${client.title}` : ""}</div>}
                  <div style={{ fontSize:12, color:T.textDim, marginBottom:8 }}>
                    {client.phone && `📞 ${client.phone}`}
                    {client.phone && client.email && "  ·  "}
                    {client.email && `✉️ ${client.email}`}
                  </div>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    <span style={{ background:T.bgLow, borderRadius:6, padding:"3px 8px", fontSize:11, color:T.textMid }}>{client.jobs.length} job{client.jobs.length!==1?"s":""}</span>
                    {[...client.facilityTypes].map(ft => (
                      <span key={ft} style={{ background:T.bgLow, borderRadius:6, padding:"3px 8px", fontSize:11, color:T.textMid }}>🏭 {ft}</span>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <ValueTag amount={client.totalRevenue} color={T.primary}/>
                  <div style={{ fontSize:10, color:T.textDim, marginTop:4 }}>total revenue</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedClient && (
        <ClientDetailModal
          client={selectedClient}
          jobs={jobs}
          invoices={invoices}
          onClose={()=>setSelected(null)}
          onSave={(updated)=>{ onSaveClient(updated); setSelected(null); }}
        />
      )}
    </div>
  );
}

// ── Bottom Nav ────────────────────────────────────────────────
const NAV = [
  { id:"dashboard",  label:"Home",     icon:"⌂" },
  { id:"leads",      label:"Leads",    icon:"◈" },
  { id:"jobs",       label:"Jobs",     icon:"◉" },
  { id:"clients",    label:"Clients",  icon:"◭" },
  { id:"schedule",   label:"Schedule", icon:"▦" },
  { id:"crew",       label:"Crew",     icon:"◎" },
  { id:"subs",       label:"Subs",     icon:"◆" },
  { id:"warranty",   label:"Warranty", icon:"🛡" },
  { id:"financials", label:"Finance",  icon:"◇" },
];

function BottomNav({ tab, setTab }) {
  return (
    <div style={{ position:"fixed", bottom:0, left:0, right:0, background:T.surface, borderTop:`1px solid ${T.border}`, display:"flex", justifyContent:"space-around", alignItems:"center", padding:"8px 0 max(8px,env(safe-area-inset-bottom))", zIndex:200, boxShadow:"0 -4px 24px rgba(61,80,102,0.1)" }}>
      {NAV.map(item => {
        const active = tab === item.id;
        return (
          <button key={item.id} onClick={()=>setTab(item.id)} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2, background:"none", border:"none", cursor:"pointer", padding:"4px 6px", minWidth:40, fontFamily:"inherit" }}>
            <span style={{ fontSize:18, color: active?T.secondary:T.textDim }}>{item.icon}</span>
            <span style={{ fontSize:8, fontWeight: active?800:500, color: active?T.secondary:T.textDim, letterSpacing:"0.04em", textTransform:"uppercase" }}>{item.label}</span>
            {active && <div style={{ width:16, height:2, borderRadius:1, background:T.secondary }}/>}
          </button>
        );
      })}
    </div>
  );
}

function SectionHeader({ title, sub, onAdd, addLabel }) {
  return (
    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16 }}>
      <div>
        <div style={{ fontSize:22, fontWeight:800, color:T.primary, letterSpacing:"-0.3px", fontFamily:"Newsreader,serif" }}>{title}</div>
        {sub && <div style={{ fontSize:13, color:T.textDim, marginTop:3 }}>{sub}</div>}
      </div>
      {onAdd && <button onClick={onAdd} style={{ background:T.secondary, color:"#fff", border:"none", borderRadius:10, padding:"9px 16px", cursor:"pointer", fontSize:13, fontWeight:700, whiteSpace:"nowrap", flexShrink:0, fontFamily:"inherit", boxShadow:`0 2px 12px rgba(232,146,74,0.3)` }}>{addLabel||"+ Add"}</button>}
    </div>
  );
}

// ── Warranty Tab ──────────────────────────────────────────────
const WARRANTY_YEARS = 10;
const FOLLOWUP_SCHEDULE = [
  { label:"6 Month Check-In",    months:6,   icon:"📞" },
  { label:"1 Year Inspection",   months:12,  icon:"🔍" },
  { label:"3 Year Check-In",     months:36,  icon:"📋" },
  { label:"5 Year Inspection",   months:60,  icon:"🔍" },
  { label:"10 Year Warranty End",months:120, icon:"🛡️" },
];

function warrantyData(jobs) {
  return jobs
    .filter(j => j.status === "Complete" && j.startDate)
    .map(j => {
      const completion = new Date(j.endDate || j.startDate);
      const warrantyEnd = new Date(completion);
      warrantyEnd.setFullYear(warrantyEnd.getFullYear() + WARRANTY_YEARS);
      const now = new Date();
      const monthsElapsed = Math.floor((now - completion) / (1000*60*60*24*30.44));
      const touchpoints = FOLLOWUP_SCHEDULE.map(fp => {
        const due = new Date(completion);
        due.setMonth(due.getMonth() + fp.months);
        const isPast = due <= now;
        const isUpcoming = !isPast && (due - now) < 1000*60*60*24*60; // within 60 days
        return { ...fp, due, isPast, isUpcoming, dueStr: due.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) };
      });
      return { ...j, completion, warrantyEnd, monthsElapsed, touchpoints };
    });
}

function WarrantyTab({ jobs }) {
  const [selected, setSelected] = useState(null);
  const warranties = warrantyData(jobs);
  const now = new Date();

  const upcomingAll = warranties.flatMap(w =>
    w.touchpoints.filter(t => t.isUpcoming).map(t => ({ ...t, job:w }))
  ).sort((a,b) => a.due - b.due);

  return (
    <div>
      {/* Upcoming alert */}
      {upcomingAll.length > 0 && (
        <div style={{ background:"#EEF3F8", border:`1px solid #C5D8E8`, borderRadius:14, padding:"14px 18px", marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#2A5278", marginBottom:10 }}>📅 Upcoming Follow-Ups (Next 60 Days)</div>
          {upcomingAll.map((t,i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom: i<upcomingAll.length-1?`1px solid #C5D8E855`:"none" }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:"#2A5278" }}>{t.job.client}</div>
                <div style={{ fontSize:11, color:"#4A6B88" }}>{t.icon} {t.label} — {t.job.project}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:12, fontWeight:700, color:T.secondary }}>{t.dueStr}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Warranty cards */}
      {warranties.length === 0 && (
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:32, textAlign:"center" }}>
          <div style={{ fontSize:32, marginBottom:12 }}>🛡️</div>
          <div style={{ fontSize:15, fontWeight:700, color:T.primary, marginBottom:6 }}>No completed jobs yet</div>
          <div style={{ fontSize:13, color:T.textDim }}>Warranty records appear here when jobs are marked Complete.</div>
        </div>
      )}

      {warranties.map(w => {
        const isOpen = selected === w.id;
        const pctElapsed = Math.min(100, (w.monthsElapsed / (WARRANTY_YEARS*12)) * 100);
        const nextTouchpoint = w.touchpoints.find(t => !t.isPast);
        const completedTouchpoints = w.touchpoints.filter(t => t.isPast).length;

        return (
          <div key={w.id} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, marginBottom:12, overflow:"hidden" }}>
            {/* Card header */}
            <div onClick={()=>setSelected(isOpen?null:w.id)} style={{ padding:"18px 20px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <span style={{ fontSize:18 }}>🛡️</span>
                  <div style={{ fontSize:15, fontWeight:700, color:T.primary, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{w.client}</div>
                </div>
                <div style={{ fontSize:12, color:T.textDim, marginBottom:10 }}>{w.project} · {w.sqFt?.toLocaleString()} sq ft</div>
                {/* Warranty progress bar */}
                <div style={{ marginBottom:6 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:10, color:T.textDim, fontWeight:600 }}>WARRANTY ACTIVE</span>
                    <span style={{ fontSize:10, color:T.textDim, fontWeight:600 }}>Expires {w.warrantyEnd.toLocaleDateString("en-US",{month:"short",year:"numeric"})}</span>
                  </div>
                  <div style={{ height:6, background:T.border, borderRadius:4, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${pctElapsed}%`, background:`linear-gradient(90deg, ${T.green}, ${pctElapsed>70?T.amber:T.green})`, borderRadius:4, transition:"width 0.3s" }}/>
                  </div>
                  <div style={{ fontSize:10, color:T.textDim, marginTop:3 }}>{w.monthsElapsed} of {WARRANTY_YEARS*12} months elapsed · {Math.round(pctElapsed)}%</div>
                </div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  <span style={{ background:T.greenBg, color:T.green, borderRadius:6, padding:"2px 8px", fontSize:10, fontWeight:700 }}>✓ {completedTouchpoints}/{FOLLOWUP_SCHEDULE.length} check-ins done</span>
                  {nextTouchpoint && <span style={{ background: nextTouchpoint.isUpcoming?T.amberBg:T.bgLow, color: nextTouchpoint.isUpcoming?T.amber:T.textDim, borderRadius:6, padding:"2px 8px", fontSize:10, fontWeight:700 }}>Next: {nextTouchpoint.label} — {nextTouchpoint.dueStr}</span>}
                </div>
              </div>
              <div style={{ fontSize:18, color:T.textDim, flexShrink:0 }}>{isOpen?"▾":"▸"}</div>
            </div>

            {/* Expanded touchpoint timeline */}
            {isOpen && (
              <div style={{ borderTop:`1px solid ${T.border}`, padding:"16px 20px", background:T.bgLow }}>
                <div style={{ fontSize:11, color:T.textDim, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:14 }}>Follow-Up Schedule</div>
                {w.touchpoints.map((t,i) => (
                  <div key={i} style={{ display:"flex", gap:14, alignItems:"flex-start", marginBottom:14 }}>
                    {/* Timeline dot */}
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0 }}>
                      <div style={{ width:28, height:28, borderRadius:"50%", background: t.isPast?T.green:t.isUpcoming?T.secondary:T.border, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>
                        {t.isPast ? <span style={{ color:"#fff", fontSize:12, fontWeight:700 }}>✓</span> : <span>{t.icon}</span>}
                      </div>
                      {i < w.touchpoints.length-1 && <div style={{ width:2, height:20, background: t.isPast?T.green:T.border, marginTop:2 }}/>}
                    </div>
                    {/* Content */}
                    <div style={{ flex:1, paddingTop:4 }}>
                      <div style={{ fontSize:13, fontWeight:700, color: t.isPast?T.green:t.isUpcoming?T.secondary:T.text }}>{t.label}</div>
                      <div style={{ fontSize:11, color:T.textDim, marginTop:2 }}>
                        {t.dueStr}
                        {t.isPast && <span style={{ color:T.green, fontWeight:600 }}> · Completed</span>}
                        {t.isUpcoming && <span style={{ color:T.secondary, fontWeight:600 }}> · Coming up soon</span>}
                      </div>
                    </div>
                    {/* Status */}
                    {t.isPast && <span style={{ background:T.greenBg, color:T.green, borderRadius:6, padding:"3px 8px", fontSize:10, fontWeight:700, flexShrink:0 }}>Done</span>}
                    {t.isUpcoming && <span style={{ background:T.amberBg, color:T.amber, borderRadius:6, padding:"3px 8px", fontSize:10, fontWeight:700, flexShrink:0, animation:"none" }}>Due Soon</span>}
                  </div>
                ))}
                <div style={{ marginTop:8, paddingTop:12, borderTop:`1px solid ${T.border}` }}>
                  <div style={{ fontSize:12, color:T.textDim }}>Completed {w.completion.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})} · 10-year warranty active</div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────
function Dashboard({ leads, jobs, invoices, crew, subs, setTab }) {
  const totalBilled    = invoices.reduce((s,i) => s+(parseFloat(i.amount)||0), 0);
  const totalCollected = invoices.reduce((s,i) => s+(parseFloat(i.paid)||0), 0);
  const overdue        = invoices.filter(i => i.status==="Overdue");
  const activeJobs     = jobs.filter(j => j.status!=="Complete");
  const hotLeads       = leads.filter(l => ["New Inquiry","Site Visit Scheduled","Proposal Sent"].includes(l.status));
  const docsNeeded     = subs.filter(s => !s.contractOnFile || !s.w9OnFile || !s.insuranceCurrent);
  const pipeline = activeJobs.reduce((s,j) => s+(j.contractValue||0)+((j.cos||[]).filter(c=>c.status==="Approved").reduce((a,c)=>a+(parseFloat(c.amount)||0),0)), 0);
  const warrantyAlerts = warrantyData(jobs).flatMap(w => w.touchpoints.filter(t=>t.isUpcoming).map(t=>({...t,client:w.client,project:w.project})));

  return (
    <div>
      {/* Hero */}
      <div style={{ background:`linear-gradient(135deg, ${T.primaryDark} 0%, ${T.primary} 100%)`, borderRadius:20, padding:"24px 22px", marginBottom:16, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", right:-10, top:-10, opacity:0.06 }}><PlumblineMark size={140}/></div>
        <div style={{ fontSize:10, color:"#FAF8F5aa", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>8Coating · Plumbline by Teelworks</div>
        <div style={{ fontSize:22, fontWeight:800, color:"#FAF8F5", fontFamily:"Newsreader,serif", letterSpacing:"-0.5px", marginBottom:2 }}>Good morning, David ☀️</div>
        <div style={{ fontSize:13, color:"#FAF8F5bb", marginBottom:18, fontStyle:"italic" }}>Run it true.</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
          {[
            { label:"Active Pipeline", value:fmtK(pipeline), color:"#FAF8F5" },
            { label:"Jobs In Progress", value:activeJobs.length, color:T.secondary },
            { label:"Collected", value:fmtK(totalCollected), color:"#6FCFA0" },
          ].map(({ label,value,color }) => (
            <div key={label} style={{ background:"rgba(255,255,255,0.08)", borderRadius:12, padding:"12px 14px" }}>
              <div style={{ fontSize:9, color:"#FAF8F5aa", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>{label}</div>
              <div style={{ fontSize:20, fontWeight:800, color, fontFamily:"Newsreader,serif", letterSpacing:"-0.5px" }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {overdue.length > 0 && (
        <div style={{ background:T.redBg, border:`1px solid ${T.red}55`, borderRadius:14, padding:"14px 18px", marginBottom:12, display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:20 }}>⚠️</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:T.red }}>Overdue Invoice{overdue.length>1?"s":""}</div>
            <div style={{ fontSize:12, color:T.red+"cc", marginTop:2 }}>{overdue.map(i=>`${i.number} — ${i.client} (${fmtK(i.amount-i.paid)} outstanding)`).join(" · ")}</div>
          </div>
          <button onClick={()=>setTab("financials")} style={{ background:"transparent", color:T.red, border:`1px solid ${T.red}66`, borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:12, fontWeight:700, whiteSpace:"nowrap", fontFamily:"inherit" }}>View →</button>
        </div>
      )}

      {docsNeeded.length > 0 && (
        <div style={{ background:T.amberBg, border:`1px solid ${T.amber}55`, borderRadius:14, padding:"14px 18px", marginBottom:12, display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:20 }}>📋</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:T.amber }}>Subcontractor Docs Needed</div>
            <div style={{ fontSize:12, color:T.amber+"cc", marginTop:2 }}>{docsNeeded.map(s=>s.name).join(", ")}</div>
          </div>
          <button onClick={()=>setTab("subs")} style={{ background:"transparent", color:T.amber, border:`1px solid ${T.amber}66`, borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:12, fontWeight:700, whiteSpace:"nowrap", fontFamily:"inherit" }}>View →</button>
        </div>
      )}

      {warrantyAlerts.length > 0 && (
        <div style={{ background:"#EEF3F8", border:`1px solid #C5D8E8`, borderRadius:14, padding:"14px 18px", marginBottom:12, display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:20 }}>🛡️</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#2A5278" }}>Warranty Follow-Up Due Soon</div>
            <div style={{ fontSize:12, color:"#4A6B88", marginTop:2 }}>{warrantyAlerts.map(a=>`${a.client} — ${a.label}`).join(" · ")}</div>
          </div>
          <button onClick={()=>setTab("warranty")} style={{ background:"transparent", color:"#2A5278", border:`1px solid #4A6B8866`, borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:12, fontWeight:700, whiteSpace:"nowrap", fontFamily:"inherit" }}>View →</button>
        </div>
      )}

      {/* Active Jobs */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:"16px 18px", marginBottom:12 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ fontSize:13, fontWeight:700, color:T.primary }}>Active Jobs</div>
          <button onClick={()=>setTab("jobs")} style={{ background:"transparent", color:T.secondary, border:"none", cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"inherit" }}>View all →</button>
        </div>
        {activeJobs.map((j,i) => (
          <div key={j.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom: i<activeJobs.length-1?`1px solid ${T.border}`:"none" }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{j.project}</div>
              <div style={{ fontSize:11, color:T.textDim, marginTop:1 }}>{j.client} · {j.sqFt?.toLocaleString()} sq ft</div>
            </div>
            <div style={{ textAlign:"right", display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
              <Badge status={j.status}/>
              <div style={{ fontSize:12, fontWeight:700, color:T.secondary }}>{fmtK(j.contractValue)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Hot Leads */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:"16px 18px", marginBottom:12 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ fontSize:13, fontWeight:700, color:T.primary }}>Active Leads</div>
          <button onClick={()=>setTab("leads")} style={{ background:"transparent", color:T.secondary, border:"none", cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"inherit" }}>View all →</button>
        </div>
        {hotLeads.length === 0 && <div style={{ fontSize:13, color:T.textDim, fontStyle:"italic" }}>No active leads.</div>}
        {hotLeads.map((l,i) => (
          <div key={l.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom: i<hotLeads.length-1?`1px solid ${T.border}`:"none" }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{l.name}</div>
              <div style={{ fontSize:11, color:T.textDim, marginTop:1 }}>{l.facilityType} · {l.sqFt?.toLocaleString()} sq ft</div>
            </div>
            <Badge status={l.status}/>
          </div>
        ))}
      </div>

      {/* Crew availability */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:"16px 18px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ fontSize:13, fontWeight:700, color:T.primary }}>Crew & Subs</div>
          <button onClick={()=>setTab("crew")} style={{ background:"transparent", color:T.secondary, border:"none", cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"inherit" }}>View all →</button>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {crew.map(c => (
            <div key={c.id} style={{ display:"flex", alignItems:"center", gap:6, background:T.bgLow, borderRadius:8, padding:"5px 10px", border:`1px solid ${T.border}` }}>
              <Avatar name={c.name} size={20}/>
              <span style={{ fontSize:11, fontWeight:600, color:T.text }}>{c.name.split(" ")[0]}</span>
              <Badge status={c.status}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────
export default function App() {
  const [tab,setTab]           = useState("dashboard");
  const [leads,setLeads]       = useState(initialLeads);
  const [jobs,setJobs]         = useState([]);
  const [crew,setCrew]         = useState(initialCrew);
  const [subs,setSubs]         = useState(initialSubs);
  const [clientBook,setClients]= useState(initialClients);
  const [estimates,setEsts]    = useState(initialEstimates);
  const [invoices,setInvs]     = useState(initialInvoices);
  const [modal,setModal]   = useState(null);
  const close = () => setModal(null);

  useEffect(() => {
    async function fetchJobs() {
      const [
        { data: jobRows,   error: e1 },
        { data: drawRows,  error: e2 },
        { data: coRows,    error: e3 },
        { data: delayRows, error: e4 },
      ] = await Promise.all([
        supabase.from("jobs").select("*"),
        supabase.from("draws").select("*"),
        supabase.from("change_orders").select("*"),
        supabase.from("weather_delays").select("*"),
      ]);
      if (e1 || e2 || e3 || e4) {
        console.error("Jobs fetch error:", e1 || e2 || e3 || e4);
        return;
      }
      setJobs(jobRows.map(j => ({
        id:            j.id,
        client:        j.client_name,
        project:       j.project,
        facilityType:  j.facility_type,
        sqFt:          j.sq_ft,
        contractValue: j.contract_value,
        status:        j.status,
        startDate:     j.start_date,
        endDate:       j.end_date,
        crew:          [],
        subIds:        [],
        sentMessages:  [],
        notes:         [],
        draws: drawRows
          .filter(d => d.job_id === j.id)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(d => ({ milestone: d.milestone, pct: d.pct, paid: d.paid })),
        cos: coRows
          .filter(c => c.job_id === j.id)
          .map(c => ({
            id:          c.id,
            desc:        c.description,
            amount:      c.amount,
            status:      c.status,
            paidUpfront: c.paid_upfront,
            date:        c.issued_date,
          })),
        delays: delayRows
          .filter(d => d.job_id === j.id)
          .map(d => ({
            id:             d.id,
            type:           d.delay_type,
            date:           d.delay_date,
            notes:          d.notes,
            clientNotified: d.client_notified,
            daysLost:       d.days_lost,
          })),
      })));
    }
    fetchJobs();
  }, []);

  const saveLead   = (form) => { if(form.id){setLeads(ls=>ls.map(l=>l.id===form.id?{...l,...form}:l));}else{setLeads(ls=>[...ls,{...form,id:Date.now()}]);} close(); };
  const TENANT_ID = "b5e8a1c0-4f2d-4e8b-9c3a-1d7f6e5b4a2c";

  const saveJob = async (form) => {
    const jobRow = {
      tenant_id:      TENANT_ID,
      client_name:    form.client,
      project:        form.project,
      facility_type:  form.facilityType,
      sq_ft:          parseFloat(form.sqFt)          || null,
      contract_value: parseFloat(form.contractValue) || null,
      status:         form.status,
      start_date:     form.startDate || null,
      end_date:       form.endDate   || null,
    };
    if (form.id) {
      const { error } = await supabase.from("jobs").update(jobRow).eq("id", form.id);
      if (error) { console.error("saveJob update error:", error); return; }
      setJobs(js => js.map(j => j.id === form.id ? { ...j, ...form } : j));
    } else {
      const { data: newJob, error: jobErr } = await supabase
        .from("jobs").insert(jobRow).select().single();
      if (jobErr) { console.error("saveJob insert error:", jobErr); return; }
      const drawRows = (form.draws || []).map((d, i) => ({
        job_id:     newJob.id,
        tenant_id:  TENANT_ID,
        milestone:  d.milestone,
        pct:        d.pct,
        sort_order: i,
        paid:       d.paid || false,
      }));
      if (drawRows.length > 0) {
        const { error: drawErr } = await supabase.from("draws").insert(drawRows);
        if (drawErr) console.error("saveJob draws insert error:", drawErr);
      }
      setJobs(js => [...js, { ...form, id: newJob.id }]);
    }
    close();
  };
  const saveSub    = (form) => { if(form.id){setSubs(ss=>ss.map(s=>s.id===form.id?{...s,...form}:s));}else{setSubs(ss=>[...ss,{...form,id:Date.now()}]);} close(); };
  const saveClient = (form) => { setClients(cs=>cs.map(c=>c.id===form.id?{...c,...form}:c)); };
  const saveEst    = (form) => { if(form.id){setEsts(es=>es.map(e=>e.id===form.id?{...e,...form}:e));}else{setEsts(es=>[...es,{...form,id:Date.now()}]);} close(); };
  const saveInv    = (form) => { if(form.id){setInvs(iv=>iv.map(i=>i.id===form.id?{...i,...form}:i));}else{setInvs(iv=>[...iv,{...form,id:Date.now()}]);} close(); };
  const convertToInvoice = (est) => {
    const total = lineTotal(est.items);
    setInvs(iv=>[...iv,{ id:Date.now(), number:`INV-2026-0${iv.length+20}`, client:est.client, email:est.email, project:`Est. ${est.number}`, amount:total, paid:0, due:"", status:"Unpaid", notes:[], sentMessages:[] }]);
    close(); setTab("financials");
  };

  const totalBilled    = invoices.reduce((s,i) => s+(parseFloat(i.amount)||0), 0);
  const totalCollected = invoices.reduce((s,i) => s+(parseFloat(i.paid)||0), 0);

  return (
    <div style={{ background:T.bg, minHeight:"100vh", fontFamily:"'Plus Jakarta Sans',sans-serif", color:T.text, paddingBottom:96 }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Newsreader:ital,opsz,wght@0,6..72,600;0,6..72,700;0,6..72,800;1,6..72,600&display=swap" rel="stylesheet"/>

      {/* Top Bar */}
      <div style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, padding:"14px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100, boxShadow:"0 1px 8px rgba(61,80,102,0.06)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <PlumblineMark size={30}/>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:T.primary, fontFamily:"Newsreader,serif", fontStyle:"italic", letterSpacing:"-0.3px", lineHeight:1.1 }}>Plumbline</div>
            <div style={{ fontSize:9, color:T.textDim, letterSpacing:"0.1em", textTransform:"uppercase" }}>8Coating · by Teelworks</div>
          </div>
        </div>
        <div style={{ fontSize:11, color:T.textDim, fontStyle:"italic" }}>Run it true.</div>
      </div>

      {/* Content */}
      <div style={{ padding:"20px 18px 0", maxWidth:800, margin:"0 auto" }}>

        {tab==="dashboard" && <Dashboard leads={leads} jobs={jobs} invoices={invoices} crew={crew} subs={subs} setTab={setTab}/>}

        {tab==="leads" && (<>
          <SectionHeader title="Leads" sub={`${leads.length} total · ${leads.filter(l=>l.status==="Contract Signed").length} converted`} onAdd={()=>setModal({type:"lead",data:null})} addLabel="+ Add Lead"/>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {leads.map(lead => <LeadCard key={lead.id} lead={lead} onClick={()=>setModal({type:"lead",data:lead})}/>)}
          </div>
        </>)}

        {tab==="jobs" && (<>
          <SectionHeader title="Jobs" sub={`${jobs.filter(j=>j.status!=="Complete").length} active · ${jobs.filter(j=>j.status==="Complete").length} complete`} onAdd={()=>setModal({type:"job",data:null})} addLabel="+ Add Job"/>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {jobs.map(job => <JobCard key={job.id} job={job} crew={crew} subs={subs} onClick={()=>setModal({type:"job",data:job})}/>)}
          </div>
        </>)}

        {tab==="clients" && (<>
          <SectionHeader title="Client Book" sub="All clients — jobs, revenue, warranty status"/>
          <ClientsTab clientBook={clientBook} jobs={jobs} invoices={invoices} onSaveClient={saveClient}/>
        </>)}

        {tab==="schedule" && (<>
          <SectionHeader title="Schedule" sub="Job calendar — all active projects"/>
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:20 }}>
            <CalendarView jobs={jobs} subs={subs}/>
          </div>
        </>)}

        {tab==="crew" && (<>
          <SectionHeader title="Crew" sub={`${crew.filter(c=>c.status==="Available").length} available · ${crew.filter(c=>c.status==="On Job").length} on job`} onAdd={()=>setModal({type:"crew",data:null})} addLabel="+ Add Member"/>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {crew.map(member => {
              const m = STATUS_META[member.status] || { color:T.primary, bg:T.blueBg };
              const onJobs = jobs.filter(j => j.crew.includes(member.id) && j.status!=="Complete");
              return (
                <div key={member.id} onClick={()=>setModal({type:"crew",data:member})}
                  style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:"16px 20px", cursor:"pointer", borderLeft:`4px solid ${m.color}` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                    <Avatar name={member.name} size={44}/>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
                        <div style={{ fontSize:15, fontWeight:700, color:T.primary }}>{member.name}</div>
                        <Badge status={member.status} size="lg"/>
                      </div>
                      <div style={{ fontSize:12, color:T.textDim, marginBottom:4 }}>{member.role} · {member.phone}</div>
                      <div style={{ fontSize:11, color:T.textMid, background:T.bgLow, borderRadius:6, padding:"3px 8px", display:"inline-block" }}>{member.skills}</div>
                      {onJobs.length > 0 && <div style={{ fontSize:11, color:T.secondary, fontWeight:700, marginTop:6 }}>▸ {onJobs.map(j=>j.project).join(", ")}</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>)}

        {tab==="subs" && (<>
          <SectionHeader
            title="Subcontractors"
            sub={`${subs.filter(s=>s.status==="Available").length} available · ${subs.filter(s=>!s.contractOnFile||!s.w9OnFile||!s.insuranceCurrent).length} docs needed`}
            onAdd={()=>setModal({type:"sub",data:null})}
            addLabel="+ Add Sub"
          />
          {/* Docs alert */}
          {subs.some(s=>!s.contractOnFile||!s.w9OnFile||!s.insuranceCurrent) && (
            <div style={{ background:T.amberBg, border:`1px solid ${T.amber}55`, borderRadius:12, padding:"12px 16px", marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color:T.amber }}>⚠️ Document Review Required</div>
              <div style={{ fontSize:11, color:T.amber+"cc", marginTop:3 }}>One or more subcontractors have missing or expired documents. Tap to review.</div>
            </div>
          )}
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {subs.map(sub => <SubCard key={sub.id} sub={sub} jobs={jobs} onClick={()=>setModal({type:"sub",data:sub})}/>)}
          </div>
        </>)}

        {tab==="warranty" && (<>
          <SectionHeader
            title="Warranty Tracker"
            sub={`${jobs.filter(j=>j.status==="Complete").length} active warranties · 10-year coverage`}
          />
          <WarrantyTab jobs={jobs}/>
        </>)}

        {tab==="financials" && (<>
          {/* Summary */}
          <div style={{ background:`linear-gradient(135deg, ${T.primaryDark} 0%, ${T.primary} 100%)`, borderRadius:16, padding:"20px 22px", marginBottom:20 }}>
            <div style={{ fontSize:10, color:"#FAF8F5aa", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12 }}>Financial Overview</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
              {[
                { label:"Billed",    value:fmtK(totalBilled),                color:"#FAF8F5" },
                { label:"Collected", value:fmtK(totalCollected),             color:"#6FCFA0" },
                { label:"Owed",      value:fmtK(totalBilled-totalCollected), color: totalBilled-totalCollected>0?"#FFB3B3":"#6FCFA0" },
              ].map(({ label,value,color }) => (
                <div key={label} style={{ background:"rgba(255,255,255,0.08)", borderRadius:10, padding:"12px 14px" }}>
                  <div style={{ fontSize:9, color:"#FAF8F5aa", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>{label}</div>
                  <div style={{ fontSize:20, fontWeight:800, color, fontFamily:"Newsreader,serif", letterSpacing:"-0.5px" }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          <SectionHeader title="Estimates" sub={`${estimates.length} total`} onAdd={()=>setModal({type:"estimate",data:null})} addLabel="+ New"/>
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:24 }}>
            {estimates.map(est => <EstimateCard key={est.id} est={est} onClick={()=>setModal({type:"estimate",data:est})}/>)}
          </div>

          <SectionHeader title="Invoices" sub={`${invoices.filter(i=>i.status==="Overdue").length} overdue`} onAdd={()=>setModal({type:"invoice",data:null})} addLabel="+ New"/>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {invoices.sort((a,b) => a.status==="Overdue"?-1:1).map(inv => <InvoiceCard key={inv.id} inv={inv} onClick={()=>setModal({type:"invoice",data:inv})}/>)}
          </div>
        </>)}
      </div>

      <BottomNav tab={tab} setTab={setTab}/>

      {modal?.type==="lead"     && <LeadModal     lead={modal.data}     onClose={close} onSave={saveLead}/>}
      {modal?.type==="job"      && <JobModal      job={modal.data}      onClose={close} onSave={saveJob}  crew={crew} subs={subs}/>}
      {modal?.type==="sub"      && <SubModal      sub={modal.data}      onClose={close} onSave={saveSub}/>}
      {modal?.type==="estimate" && <EstimateModal estimate={modal.data} onClose={close} onSave={saveEst}  onConvert={convertToInvoice}/>}
      {modal?.type==="invoice"  && <InvoiceModal  invoice={modal.data}  onClose={close} onSave={saveInv}/>}
    </div>
  );
}
