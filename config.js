/* ══════════════════════════════════════════════════════════════════════════
   DEEP FIELD — CONFIG
   ══════════════════════════════════════════════════════════════════════════
   This is the only file you need to edit. app.js never has to be touched.

   ─── ADDING A SECTION ────────────────────────────────────────────────────
   Add an entry to OBJECTS. Every entry needs:
     type      which phenomenon renders it (see the list below)
     az / el   where it sits in the sky, in degrees.
               az = compass bearing, 0–360.  el = up/down, roughly -35 to +35.
     r         how far away it is. Bigger = further. 170–400 works well.
     label     the short name on the compass tape and lock-on bracket
     desig     the catalogue string, e.g. "PSR B1919+21". Flavour, but keep it.
     blocks    the panel contents (see BLOCK TYPES below)

   TYPES: blackhole · pulsar · planet · nebula · galaxy · binary · comet ·
          rogue · beacon
   You can reuse a type as many times as you like — two planets is fine.

   ─── BLOCK TYPES ─────────────────────────────────────────────────────────
   { k:"text",  body:"..." }
   { k:"stats", items:[["12","Projects"], ...] }
   { k:"media", title:"Reel", cols:2, items:[ ...see MEDIA below... ] }
   { k:"audio", title:"Library", items:[ ...see AUDIO below... ] }
   { k:"rows",  title:"Selected", items:[[name, meta, description], ...] }
   { k:"tags",  title:"Toolset", items:["Houdini", "*Nuke*", ...] }   *stars* = highlighted
   { k:"tiers", title:"Rates", items:[{t,p,flag,items:[]}, ...] }
   { k:"list",  title:"Includes", items:["...", "..."] }
   { k:"links", title:"Elsewhere", items:[[label, text, href], ...] }

   ─── SHOWING EVERYTHING, NOT JUST THE FEATURED CUT ────────────────────────
   `items` on a rows/media block is the featured 2-4 you actually want people
   to see first. Give that same block a `more` array — same item shape as
   `items` — and a "View all" button appears under it. Clicking it opens a
   full-screen list/grid of `items` + `more` together, sortable Newest first /
   Oldest first (it reads the year out of each item's meta or note text, so
   just keep writing "· 2025" the way you already do).

   Clicking any row anywhere — featured or inside View all — opens it wide in
   its own screen for an easier read. Media works the same way it already did
   (the Expand button, or now the thumbnail itself); View all just gives you
   somewhere to put the rest of the reel instead of leaving it off the page.

     { k:"rows", title:"Selected", items:[...2-4 featured...],
       more:[...the rest of the work, same [name, meta, description] shape...] }

   ─── MEDIA (your Imgur GIFs) ─────────────────────────────────────────────
   Imgur serves every GIF as an MP4 too, and it is 5–10× smaller. Take your
   link — https://i.imgur.com/AbCdEfG.gif — and just swap the extension:

     { kind:"video", src:"https://i.imgur.com/AbCdEfG.mp4",
       poster:"https://i.imgur.com/AbCdEfGh.jpg",     // optional, h = thumb
       label:"Shot 04 — debris sim", note:"Houdini · Nuke" }

   Straight GIFs and stills work too:
     { kind:"image", src:"https://i.imgur.com/AbCdEfG.gif", label:"...", note:"..." }

   Everything lazy-loads and only plays while on screen, so a page full of
   clips still costs almost nothing until someone actually looks at it.

   ─── AUDIO (your SFX) ────────────────────────────────────────────────────
   Point at a real file:
     { title:"Impact — rebar", meta:"0:04 · Layered", src:"sfx/impact-rebar.mp3" }

   Or leave src out and give a synth preset, and the browser generates the
   sound on the fly — useful for placeholders before your files are uploaded:
     { title:"Impact — rebar", meta:"0:02 · Demo", synth:"impact" }
   Presets: impact · whoosh · riser · sub · glitch · chime

   ─── AMBIENCE (each object's own background sound) ──────────────────────
   Every object on the field can carry a looping ambient bed, the same way
   the pulsar always has — it swells in as you approach and focus on it,
   and fades out again once you look away or leave. Nothing to add: every
   object already has a generated placeholder bed suited to its type
   (blackhole: hum · pulsar: pulsar.mp3 · planet: wind · nebula: shimmer ·
   galaxy: choir · binary: pulse · comet: whistle · rogue: creak ·
   beacon: carrier). To customise a specific object, add a `sound` field
   to it:

     sound: false                              // silence for this object
     sound: "sfx/blackhole-rumble.mp3"          // your own real loop
     sound: { synth:"wind", volume:0.5 }        // swap the placeholder preset
     sound: { src:"sfx/x.mp3", near:120, far:260 }  // file + custom falloff

   `volume` can also sit at the top level of the object, same as `az`/`el`/
   `r` — that's how the pulsar's is set below. near/far are the camera
   distances (in scene units) where the sound is loudest / fully silent.
   ══════════════════════════════════════════════════════════════════════════ */

const SITE = {
  name: "Deven Hodder - Deep Space Portfolio",
  sub:  "VFX · Sound · 3D · Interface · Code",

  /* ─── How black the sky is ───────────────────────────────────────────
     haze is the big one. At 0 the background is pure black and the only
     things emitting light are the stars and the nine objects. */
  sky: {
    stars: 0.85,   // background starfield brightness
    dust:  1.0,    // the near dust drifting past the camera
    haze:  0.03    // far nebulosity — set to 0 for an absolutely black sky
  },

  /* ─── How fast the camera moves ──────────────────────────────────────
     Both are multipliers. Lower = slower. */
  motion: {
    look:   0.1,   // drag and arrow-key sensitivity
    flight: 0.1    // travel speed between objects
  },

  /* Ambient drone that plays when someone presses "Ambience". Generated in the
     browser — no file needed. Set to false to remove the button entirely. */
  ambience: false
};

const OBJECTS = [

/* ─────────────────────────────────────────────────────────────── 01 ─────── */
{
  type:"blackhole", az:0, el:4, r:450,
  sound:"audio/blackhole.mp3",
  volume: 0.1,
  label:"VFX & Simulation",
  desig:"SGR A* · 4.3×10⁶ M☉",
  kind:"Supermassive black hole",
  title:"Visual <b>effects</b>",
  lede:"Destruction, fluids, volumetrics and comp. The work I take most seriously",
  blocks:[
    { k:"media", title:"Reel", note:"2024 — 2026", cols:2, items:[
      { kind:"video", src:"", label:"Shot 01 — collapse", note:"Houdini · RBD" },
      { kind:"video", src:"", label:"Shot 02 — pyro", note:"Houdini · Karma" },
      { kind:"video", src:"", label:"Shot 03 — water", note:"FLIP · Nuke" },
      { kind:"video", src:"", label:"Shot 04 — volumetrics", note:"EmberGen" }
    ], more:[
      {kind:"video", src:"https://i.imgur.com/32wPO5D.mp4", label:"Cherry Ball Impact - A Volleyball Game - Commision", note:"Roblox Studio · 2026" },
      {kind:"video", src:"https://i.imgur.com/QCsdUR8.mp4", label:"Default Ball Impact - A Volleyball Game - Commision", note:"Roblox Studio · 2026" },
      {kind:"video", src:"https://i.imgur.com/5JzVqGA.mp4", label:"Cherry Jump - A Volleyball Game - Commision", note:"Roblox Studio · 2026" },
      {kind:"video", src:"https://i.imgur.com/0ON74NO.mp4", label:"Default Jump - A Volleyball Game - Commision", note:"Roblox Studio · 2026" },
      {kind:"video", src:"https://i.imgur.com/ehVHD8q.mp4", label:"Cherry Hit - A Volleyball Game - Commision", note:"Roblox Studio · 2026" },
      {kind:"video", src:"https://i.imgur.com/xOhhu03.mp4", label:"Default Hit - A Volleyball Game - Commision", note:"Roblox Studio · 2026" },
      { kind:"video", src:"https://i.imgur.com/QVAN5Y8.mp4", label:"Might Of Heaven - Kizaru", note:"Roblox Studio · 2024" },
      { kind:"video", src:"https://i.imgur.com/bKIYjwc.mp4", label:"Light Beam - Kizaru", note:"Roblox Studio · 2024" },
      { kind:"video", src:"https://i.imgur.com/ObYDxk5.mp4", label:"Yata Mirror - Kizaru", note:"Roblox Studio · 2024" },
      { kind:"video", src:"https://i.imgur.com/oa9N1kN.mp4", label:"Light Lazer - Kizaru", note:"Roblox Studio · 2024" },
      { kind:"video", src:"https://i.imgur.com/hy753bF.mp4", label:"Light Kick - Kizaru", note:"Roblox Studio · 2024" }
    ]},
    { k:"tags", title:"Toolset", items:["*Roblox Studio*","*Blender*","Learning More Soon"] },
    { k:"stats", items:[["4+","Projects"],["7+","Commisions"],["6mo+","VFX work"]] }
  ]
},

/* ─────────────────────────────────────────────────────────────── 02 ─────── */
{
  type:"pulsar", az:36, el:-13, r:325,
  /* Pulsar-only options. period drives BOTH the flash and the audio pulse —
     they're the same event, so they stay locked together. Keep tint
     desaturated; saturated cyan reads as neon rather than starlight. */
  period:0.1933, tint:0xcfe4ff, sound:"audio/pulsar.mp3", volume:0.05,
  label:"Sound Design",
  desig:"PSR B1919+21 · 0.1933 s",
  kind:"Rotating neutron star",
  title:"Sound <b>design</b>",
  lede:"Impacts, interfaces, atmospheres, creature work. Recorded, layered, resynthesised. Everything below plays in place.",
  blocks:[
    { k:"audio", title:"Library", note:"Press to audition", items:[
      { title:"Impact — rebar on concrete", meta:"0:02 · Layered", synth:"impact" },
      { title:"Whoosh — heavy pass-by",     meta:"0:02 · Doppler", synth:"whoosh" },
      { title:"Riser — 4 bar build",        meta:"0:03 · Tonal",   synth:"riser"  },
      { title:"Sub — reactor floor",        meta:"0:04 · Loopable",synth:"sub"    },
      { title:"UI — confirm",               meta:"0:01 · Dry",     synth:"chime"  },
      { title:"Glitch — data corruption",   meta:"0:02 · Granular",synth:"glitch" }
    ]},
    { k:"tags", title:"Toolset", items:["*Audacity*", "More Coming Soon 👀"] },
  ]
},
 
/* ─────────────────────────────────────────────────────────────── 03 ─────── */
{
  type:"planet", az:72, el:11, r:315,
  sound:"audio/ringplanet.mp3",
  volume: 0.1,
  label:"3D Animation",
  desig:"HD 189733 b · 63 ly",
  kind:"Ringed gas giant",
  title:"3D <b>animation</b>",
  lede:"Modelling, rigging, animations, lighting and camera. Mostly Blender, mostly things that move with weight.",
  blocks:[
    { k:"media", title:"Recent", cols:2, items:[
    ], more:[
      { kind:"video", src:"https://i.imgur.com/dr4EdhM.mp4", label:"Dive - A Volleyball Game - Commission", note:"Blender · R15 Roblox Rig · 2026" },
      { kind:"video", src:"https://i.imgur.com/Rsqlv05.mp4", label:"Headshot - A Volleyball Game - Commission", note:"Blender · R15 Roblox Rig · 2026" },
      { kind:"video", src:"https://i.imgur.com/pu95gpB.mp4", label:"Spawn - Postman", note:"Blender · R6 Roblox Rig · 2026" },
      { kind:"video", src:"https://i.imgur.com/ExplrhO.mp4", label:"Chained Explosions - Postman", note:"Blender · R6 Roblox Rig · 2026" },
      { kind:"video", src:"https://i.imgur.com/gF56Oor.mp4", label:"Eradication - Postman", note:"Blender · R6 Roblox Rig · 2026" },
      { kind:"video", src:"https://i.imgur.com/BALrAo3.mp4", label:"Idle - Postman", note:"Blender · R6 Roblox Rig · 2026" },
      { kind:"video", src:"https://i.imgur.com/n1k53Qm.mp4", label:"Vigil Elite Animation", note:"Blender · R6 Roblox Rig · 2025" },
      { kind:"video", src:"https://i.imgur.com/BjzsYVN.mp4", label:"Baseball Throw", note:"Blender · R6 Roblox Rig · 2025" },
      { kind:"video", src:"https://i.imgur.com/1EMXPKc.mp4", label:"TestWalk", note:"Blender · R6 Roblox Rig · 2025" },
      { kind:"video", src:"https://i.imgur.com/uZVZq0R.mp4", label:"Kaioken - Goku", note:"Blender · R6 Roblox Rig · 2025" },
      { kind:"image", src:"https://i.imgur.com/OjPFz3M.png", label:"ERC-7 - Vigil ", note:"Blender · EEVEE · 2025" },
      { kind:"image", src:"https://i.imgur.com/ZWmiT4h.jpeg", label:"Ama No Murakumo - Kizaru", note:"Blender · EEVEE · 2023" },
      { kind:"image", src:"https://i.imgur.com/ofHcABR.jpeg", label:"Kikoku - Trafalgar Law", note:"Blender · EEVEE · 2023" }
    ]},
    { k:"tags", title:"Toolset", items:["*Blender*","Substance Painter","Marvelous","Cycles","EEVEE","Marmoset"] },
  ]
},

/* ─────────────────────────────────────────────────────────────── 04 ─────── */
{
  type:"nebula", az:119, el:-6, r:500,
  label:"2D Animation",
  sound:"audio/stellarnursery.mp3",
  volume: 0.1,
  desig:"M42 · Orion Nebula",
  kind:"Stellar nursery",
  title:"2D <b>animation</b>",
  lede:"The newest thing here, and the reason this section is a nursery rather than a finished star. Frame-by-frame, motion graphics, and a lot of bad first attempts.",
  blocks:[
    { k:"tags", title:"Learning", items:["*paint.net*","After Effects"] },
  ]
},

/* ─────────────────────────────────────────────────────────────── 05 ─────── */
{
  type:"binary", az:163, el:14, r:300,
  label:"Interface",
  sound:"audio/binarystar.mp3",
  volume: 0.1,
  desig:"α Cen AB · 4.37 ly",
  kind:"Binary star system",
  title:"UI &amp; <b>UX</b>",
  lede:"Two bodies locked in orbit — the person and the thing they are using. Interface work is mostly deciding which one gives way.",
  blocks:[
    { k:"text", body:"Still nothing here." },
    { k:"tags", title:"Toolset", items:["*Figma*"] }
  ]
},

/* ─────────────────────────────────────────────────────────────── 06 ─────── */
{
  type:"galaxy", az:208, el:17, r:560,
  label:"Code",
  sound:"audio/galaxy.mp3",
  volume: 0.1,
  desig:"NGC 1300 · Barred spiral",
  kind:"Barred spiral galaxy",
  title:"Code &amp; <b>tools</b>",
  lede:"Several languages, one habit: if I do a thing three times I write something that does it for me.",
  blocks:[
    { k:"tags", title:"Languages", items:["*Java*","*Python*","*Bash*","C#","C++","*Lua*","*HTML*","*CSS*", "*JavaScript*", "*Node.js*", "*Discord.js*", "AutoHotKey"] },
    { k:"tags", title:"Toolkit", items:["*VS Code*","*Cursor*","*Roblox Studio*","*Github*", "*Any AI Tool*"] },
    { k:"rows", title:"Things I've built", items:[
      ["This site","Web · 2026","Three.js, no framework, no build step. Every phenomenon here is generated in code, pretty cool imo 👀."]
    ]},
    { k:"links", title:"Elsewhere", items:[
      ["GitHub","github.com/sh0tstar474","https://github.com/sh0tstar474"],
    ]}
  ]
},

/* ─────────────────────────────────────────────────────────────── 07 ─────── */
{
  type:"comet", az:258, el:7, r:280,
  label:"Commissions",
  desig:"1P/Halley · 75 yr period",
  kind:"Periodic comet",
  title:"Take a <b>commission</b>",
  lede:"All pricing is fully negotiable — every project is unique and rates are discussed case by case. Reach out and let's figure out what works for both of us.|",
  blocks:[
    { k:"tiers", title:"Payment Methods", items:[
      { t:"Venmo", p:"https://venmo.com/u/Drhodder-47105", flag:null, items:[]},
      { t:"Paypal", p:"https://www.paypal.com/paypalme/mrwhitehod", flag:"Most preferred", items:[]},
      { t:"Robux", p:"https://www.roblox.com/users/1553913716/profile", flag:null, items:[]},
      { t:"Cashapp", p:"https://cash.app/$Shotstar474", flag:null, items:[]},
      { t:"Giftcards", p:"Discuss with me 😛", flag:null, items:[]}
    ]},
    { k:"list", title:"Things to remember", items:[
      "NO FIXED RATES — Every project is different. Price will be discussed case by case.",
      "NEGOTIATE — I will work with your budget, not against it, don't be afraid to ask.",
      "50% UP FRONT, 50% ON DELIVERY",
      "DEPOSIT AVAILABLE — If you need to pay in installments, we can work that out.",
      "REVISIONS DISCUSSED — Revisions are typically free within reason, but if the scope changes significantly, we can discuss additional costs.",
    ]}
  ]
},

/* ─────────────────────────────────────────────────────────────── 08 ─────── */
{
  type:"rogue", az:296, el:-19, r:250,
  label:"The Lab",
  sound:"audio/rogueplanet.mp3",
  volume: 0.1,
  desig:"PSO J318.5-22 · Unbound",
  kind:"Rogue planetoid",
  title:"Personal <b>work</b>",
  lede:"No client, no brief, no deadline. This is where I try things that might not work, which is most of how I get better at the paid stuff.",
  blocks:[
  ]
},

/* ─────────────────────────────────────────────────────────────── 09 ─────── */
{
  type:"beacon", az:324, el:12, r:295,
  sound:"audio/contact.mp3",
  volume: 0.1,
  label:"Contact",
  desig:"Contact Me!",
  kind:"Narrowband signal",
  title:"Send a <b>signal</b>",
  lede:"Fastest way to reach me is social media or through email. I answer everything within two days, including the ones I have to say no to.",
  blocks:[
    { k:"links", title:"Direct", items:[
      ["Email","drhodder1@gmail.com","mailto:drhodder1@gmail.com"],
      ["Discord","sh0tstar474","#"],
      ["Tiktok","@mr.whi7","https://www.tiktok.com/@mr.whi7"],
      ["Instagram","@deven_hodder_474","https://www.instagram.com/deven_hodder_474/"]
      // ["Twitter / X","@yourhandle","#"],
      // ["ArtStation","yourhandle","#"]
    ]},
    { k:"list", title:"Worth including in the first message", items:[
      "What it is",
      "When you need it",
      "A reference or two, even a rough one",
      "Your budget, if you have one in mind"
    ]},
    { k:"text", body:"Currently taking work." }
  ]
}

];
