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
      { kind:"video", src:"https://i.imgur.com/Jn0ejZt.mp4", label:"Auras - Goku", note:"Roblox Studio · 2026" },
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
    { k:"media", title:"Reel", note:"2026", cols:2, items:[
      { kind:"video", src:"https://i.imgur.com/RrkkHCS.mp4", label:"LEGION Remake", note:"Roblox Studio · 2026" },
    ]},
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
},

/* ═══════════════════════════════════ EXTRA — for fun, not for work ═════════
   Pure showpieces, further out than the working nine above (r 1800–2800
   instead of 250–560) so they read as further away. Real project media/rows
   can be added later the same way as anywhere else in this file. */

// {
//   type:"eyeballPlanet", az:18, el:8, r:2000,
//   label:"Eyeball Planet",
//   desig:"LP 890-9 c-type · tidally locked",
//   kind:"Tidally locked terrestrial world",
//   title:"Eyeball <b>planet</b>",
//   lede:"One face always toward its star, one face always away — molten on one side, frozen solid on the other, with a ring of maybe-survivable temperature running like an iris between them.",
//   blocks:[
//     { k:"text", body:"Every point on the surface picked a side permanently. The dayside never cools, the nightside never warms, and the only weather worth mentioning happens right at the terminator." },
//     { k:"list", title:"Why it looks like this", items:[
//       "Tidal locking — matching rotation and orbital period, so one face never turns away from the star",
//       "No axial mixing — heat can't circulate the way it does on a spinning world",
//       "The 'pupil' is the only latitude band where liquid water could plausibly exist"
//     ]}
//   ]
// },

// {
//   type:"chthonianPlanet", az:54, el:-14, r:2150,
//   label:"Chthonian Planet",
//   desig:"COROT-7 b-type · stripped core",
//   kind:"Stellar remnant core",
//   title:"Chthonian <b>planet</b>",
//   lede:"What's left after a star spends a few billion years sandblasting a gas giant down to the metal. No atmosphere left to lose — just a dense, dark, roasted core, still radiating heat with nowhere else to put it.",
//   blocks:[
//     { k:"text", body:"Named for the underworld, not for drama — \"chthonian\" just means it used to have an atmosphere and doesn't anymore. Everything you're looking at was once buried under thousands of kilometres of gas." },
//     { k:"list", title:"What it used to be", items:[
//       "A gas giant, probably, before it migrated too close to its star",
//       "The atmosphere didn't erode gradually — it was stripped, fast, by radiation and stellar wind",
//       "The cracked glow is leftover heat with nothing left to insulate it"
//     ]}
//   ]
// },

// {
//   type:"relativisticJets", az:88, el:18, r:2500,
//   label:"Relativistic Jets",
//   desig:"3C 273-type · AGN core",
//   kind:"Active galactic nucleus",
//   title:"Relativistic <b>jets</b>",
//   lede:"Twin beams of ionised matter, blasted out from the poles of a feeding supermassive black hole at a meaningful fraction of the speed of light. The disk feeds the jets; the jets are the disk's excess, with nowhere else to go.",
//   blocks:[
//     { k:"text", body:"The accretion disk can't swallow everything it pulls in. What doesn't fall past the horizon gets funnelled along the magnetic field lines at the poles instead and shot out, collimated, for thousands of light-years." },
//     { k:"list", title:"The scale of it", items:[
//       "Real AGN jets can outshine every star in their host galaxy combined",
//       "They stay collimated — narrow, not spreading out — for a genuinely absurd distance",
//       "Doppler beaming means a jet pointed roughly at you looks far brighter than one pointed away"
//     ]}
//   ]
// },

// {
//   type:"kilonova", az:104, el:-6, r:2300,
//   label:"Kilonova",
//   desig:"GW170817-type · NS merger",
//   kind:"Neutron star merger",
//   title:"<b>Kilonova</b>",
//   lede:"Two neutron stars, spiralling into each other for a few hundred million years, finally collide. What's left over is a blinding, radioactive fireball — and most of the periodic table's gold and platinum.",
//   blocks:[
//     { k:"text", body:"Everything expanding outward from the merger is decaying r-process material — the only known site violent enough to actually forge elements heavier than iron in any real quantity. The gold in the ground came from something like this." },
//     { k:"stats", items:[["~0.05c","Ejecta speed"],["Days","Afterglow"],["Au · Pt","End product"]] }
//   ]
// },

// {
//   type:"whiteDwarfDisk", az:133, el:12, r:1950,
//   label:"Cataclysmic Variable",
//   desig:"SS Cygni-type · CV system",
//   kind:"Accreting white dwarf",
//   title:"White dwarf <b>+ disk</b>",
//   lede:"An Earth-sized stellar corpse, dense enough that a teaspoon of it would weigh tons, actively stripping gas off a companion star and spiralling it down through a disk hot enough to outshine both stars combined.",
//   blocks:[
//     { k:"text", body:"It's already dead — no fusion left, just gravity doing the work now. But \"dead\" doesn't mean quiet: material torn from the companion heats up violently on the way in, and every so often the whole disk detonates in a nova bright enough to see without a telescope." },
//     { k:"list", title:"Worth knowing", items:[
//       "The white dwarf itself is roughly Earth-sized but holds close to a full stellar mass",
//       "The disk, not the star, is usually the brightest thing in the system",
//       "Enough of these eventually tip past a mass limit and go supernova instead"
//     ]}
//   ]
// },

// {
//   type:"thorneZytkow", az:149, el:-18, r:2400,
//   label:"Thorne-Żytkow Object",
//   desig:"HV 2112-type · hybrid star",
//   kind:"Red supergiant with neutron core",
//   title:"Thorne-<b>Żytkow</b> object",
//   lede:"A red supergiant that swallowed a neutron star instead of colliding with it outright — the two didn't destroy each other, they merged into one deeply unstable hybrid, giant on the outside, dead star still burning at the middle.",
//   blocks:[
//     { k:"text", body:"From outside it mostly reads as an ordinary, if unusually large, red supergiant. What gives it away is the chemistry — fusion happening under conditions no normal star could produce, dredging elements to the surface that shouldn't be there." },
//     { k:"list", title:"Still theoretical, mostly", items:[
//       "Only a small handful of real candidates have ever been proposed",
//       "The neutron core doesn't fuse — its gravity does the heavy lifting instead",
//       "Expected to be short-lived, geologically speaking, before it collapses further"
//     ]}
//   ]
// },

// {
//   type:"matrioshkaBrain", az:178, el:6, r:2200,
//   label:"Matrioshka Brain",
//   desig:"Class-B megastructure · Kardashev II+",
//   kind:"Nested Dyson computation array",
//   title:"Matrioshka <b>brain</b>",
//   lede:"A star, fully enclosed by shell after shell of solar collectors, each layer running colder and computing on the waste heat of the one inside it. Not a home. A machine the size of a solar system, built to think.",
//   blocks:[
//     { k:"text", body:"Named for the nesting dolls — the innermost shell runs hottest and fastest, and every layer after it recycles the heat the one before it couldn't use, right down to a shell running barely above the temperature of open space." },
//     { k:"list", title:"The idea, roughly", items:[
//       "Total surface area, across every shell, dwarfs the star's own surface many times over",
//       "Each layer is a full Dyson swarm in its own right, not a solid sphere",
//       "Purely speculative — nobody's found one, but the thermodynamics work out"
//     ]}
//   ]
// },

// /* ─────────── wave 2: the rest of "Exotic Stars & Objects" ─────────── */

// {
//   type:"quarkStar", az:193, el:-10, r:2100,
//   label:"Quark Star",
//   desig:"XTE J1739-285-type · quark matter",
//   kind:"Ultra-dense compact remnant",
//   title:"<b>Quark</b> star",
//   lede:"Denser than a neutron star, if such a thing is allowed to exist — gravity crushing protons and neutrons past the point where they can stay protons and neutrons, down into a continuous soup of free quarks.",
//   blocks:[
//     { k:"text", body:"A neutron star is already matter held together by nothing but gravity and quantum pressure. Push past that limit and, in theory, the neutrons themselves give way — not to a black hole, but to something stranger that just barely avoids collapsing all the way." },
//     { k:"list", title:"Why it's still theoretical", items:[
//       "Nobody has directly observed quark matter — every candidate is inferred indirectly, from a mass and radius that don't fit a normal neutron star",
//       "It would be barely larger than a city, while outweighing the Sun",
//       "Some models predict it should glow at a temperature nothing else in this list reaches"
//     ]}
//   ]
// },

// {
//   type:"blueStraggler", az:223, el:20, r:2450,
//   label:"Blue Straggler",
//   desig:"WOCS 5379-type · cluster outlier",
//   kind:"Rejuvenated main-sequence star",
//   title:"Blue <b>straggler</b>",
//   lede:"A star in an old, otherwise well-behaved cluster that looks decades too young for its neighbours — hotter, bluer, and burning like it has millions of years left, because it does. It cheated.",
//   blocks:[
//     { k:"text", body:"Every other star in a cluster this old should have aged past this point by now. A blue straggler gets a second youth by colliding with, or slowly stealing mass from, another star — buying itself a fresh supply of hydrogen and starting the clock over." },
//     { k:"list", title:"Two ways to cheat", items:[
//       "A direct stellar collision, in a cluster dense enough for that to actually happen",
//       "Slow mass transfer from a binary companion, siphoned across for millions of years",
//       "Either way, the result looks younger than physically possible for its surroundings"
//     ]}
//   ]
// },

// {
//   type:"darkStar", az:243, el:-15, r:2600,
//   label:"Dark Star",
//   desig:"Pop-III DS candidate · z > 15",
//   kind:"Dark-matter-powered protostar",
//   title:"<b>Dark</b> star",
//   lede:"Not dark as in invisible — dark as in powered by dark matter, not fusion. A theoretical early-universe star, held up and heated from the inside by dark matter annihilating in its core instead of hydrogen burning.",
//   blocks:[
//     { k:"text", body:"If they existed, dark stars would have formed before any normal star — huge, puffy, and comparatively cool, running on captured dark matter instead of nuclear fusion for as long as the fuel held out. Once it ran dry, the star would collapse and finally ignite for real." },
//     { k:"list", title:"Why it looks the way it does", items:[
//       "No hard surface — modelled here as diffuse and hazy rather than a sharp blackbody sphere, the way the real prediction reads",
//       "Could have grown enormous — some estimates put them at hundreds of times the Sun's radius",
//       "A bridge object — the link between the first dark matter haloes and the first real stars"
//     ]}
//   ]
// },

// /* ─────────── wave 3: the rest of "Extreme Planetary Types" ─────────── */

// {
//   type:"carbonPlanet", az:271, el:15, r:2350,
//   label:"Carbon Planet",
//   desig:"55 Cancri e-type · C/O > 1",
//   kind:"Graphite-carbide world",
//   title:"Carbon <b>planet</b>",
//   lede:"A world built from the wrong side of the periodic table for a rocky planet — graphite and carbide instead of silicate rock, with a mantle that, under enough pressure, crystallises into layer after layer of solid diamond.",
//   blocks:[
//     { k:"text", body:"It comes down to what the system had more of while the planet was forming — carbon or oxygen. Enough carbon and you don't get ordinary rock, you get graphite, carbides, and at depth, diamond load-bearing the entire mantle." },
//     { k:"list", title:"Not actually good news", items:[
//       "A diamond mantle would likely be a poor conductor of heat, trapping it in ways that mess with plate tectonics entirely",
//       "The surface would be closer to graphite and tar than to soil",
//       "55 Cancri e is the real, if disputed, candidate this idea is built on"
//     ]}
//   ]
// },

// {
//   type:"ironPlanet", az:283, el:-20, r:2500,
//   label:"Iron Planet",
//   desig:"Kepler-107c-type · Fe-dominant",
//   kind:"Metal-rich terrestrial world",
//   title:"Iron <b>planet</b>",
//   lede:"Almost nothing but core — a rocky planet that lost its mantle somewhere along the way, or simply never built one, leaving a dense, dark, magnetically violent iron world standing in for what should have been a whole planet.",
//   blocks:[
//     { k:"text", body:"Earth is roughly a third iron by mass, nearly all of it locked in the core. Strip away the rock on top and you'd be left with something like this — small for its weight, unnervingly dense, and generating a magnetic field way out of proportion to its size." },
//     { k:"list", title:"How a planet ends up like this", items:[
//       "A giant impact, early on, that blasts the mantle off and leaves the core exposed",
//       "Extreme proximity to its star, with radiation slowly stripping the lighter material away",
//       "Either path leaves a planet far denser than its size would suggest"
//     ]}
//   ]
// },

// {
//   type:"blanet", az:310, el:10, r:2150,
//   label:"Blanet",
//   desig:"TON 618-adjacent · SMBH orbiter",
//   kind:"Black-hole-orbiting planet",
//   title:"<b>Blanet</b>",
//   lede:"A planet that formed around a black hole instead of a star — no sunrise, no sunset, just a faint, permanent ember of accretion light standing in for a sun that was never there to begin with.",
//   blocks:[
//     { k:"text", body:"Supermassive black holes at the centres of quiet galaxies can hold a disk of gas and dust far out from the horizon — cool enough, far enough out, to collapse into planets the same way a protoplanetary disk around a young star does. The result orbits something that emits almost no visible light at all." },
//     { k:"list", title:"What it would actually be like", items:[
//       "Permanently, brutally cold — accretion glow is a poor substitute for a real star",
//       "Tidal forces this close to something this massive would be relentless",
//       "The name is exactly what it sounds like — \"black hole\" plus \"planet\""
//     ]}
//   ]
// },

// {
//   type:"synestia", az:342, el:-8, r:2450,
//   label:"Synestia",
//   desig:"Post-impact · Moon-forming stage",
//   kind:"Vaporised-rock donut structure",
//   title:"<b>Synestia</b>",
//   lede:"Not a planet and not a disk — a donut-shaped cloud of vaporised rock, spinning too fast to pull itself back into a sphere, made in the instant after two planet-sized bodies collide hard enough to melt and merge.",
//   blocks:[
//     { k:"text", body:"The name is a coinage — synestia, from the Greek for \"hearth\" plus \"together.\" It's a proposed missing stage in planet formation: the aftermath of a giant impact, spinning so fast that the merged material forms a torus instead of settling into a sphere, before eventually cooling and condensing into a moon and a planet." },
//     { k:"list", title:"The pitch", items:[
//       "It's one of the leading models for how Earth's Moon actually formed",
//       "It only exists for a geological eyeblink — thousands of years, not millions, before it collapses back down",
//       "Everything in it is simultaneously part of the same connected body, unlike a planet with a separate disk"
//     ]}
//   ]
// },

// /* ─────────── wave 4: the rest of "High-Energy Cosmic Events" plus all
//    of "Megastructures & Anomalies" ─────────── */

// {
//   type:"hypernova", az:9, el:12, r:2050,
//   label:"Hypernova",
//   desig:"GRB 980425-type · collapsar",
//   kind:"Black-hole-forming stellar collapse",
//   title:"<b>Hypernova</b>",
//   lede:"A supernova that doesn't stop at \"dead star\" — the core keeps collapsing straight through a neutron star and into a black hole, venting the excess energy as twin gamma-ray bursts on the way down.",
//   blocks:[
//     { k:"text", body:"An ordinary supernova leaves a neutron star behind and calls it done. A hypernova belongs to a rarer, much more massive class of collapsing star — enough mass falling in fast enough that the core doesn't stop at neutron-degenerate matter, it keeps going until it's a black hole, with a gamma-ray burst as the receipt." },
//     { k:"list", title:"Why it matters", items:[
//       "Long-duration gamma-ray bursts are the most energetic events in the universe short of the Big Bang itself",
//       "The collapsar model — core collapse straight to a black hole — is the leading explanation for where they come from",
//       "Only a star well above about 25 solar masses is thought to go this route instead of leaving a neutron star behind"
//     ]}
//   ]
// },

// {
//   type:"magnetarFlares", az:27, el:-16, r:2250,
//   label:"Magnetar Flares",
//   desig:"SGR 1806-20-type · soft gamma repeater",
//   kind:"Ultra-magnetised neutron star",
//   title:"Magnetar <b>flares</b>",
//   lede:"A neutron star with a magnetic field so strong it periodically cracks its own crust — a starquake that releases more energy in a tenth of a second than the Sun puts out in 100,000 years.",
//   blocks:[
//     { k:"text", body:"Every neutron star has a strong magnetic field. A magnetar's is stronger by another factor of a thousand — strong enough to physically twist and stress the crust until it fractures, the way tectonic stress builds and releases along a fault line, just with a lot more X-rays involved." },
//     { k:"list", title:"For scale", items:[
//       "A magnetar's field could strip the data off a credit card from roughly halfway to the Moon",
//       "The December 2004 flare from SGR 1806-20 briefly outshone every other gamma-ray source in the sky combined, from 50,000 light-years away",
//       "They're thought to be a phase most neutron stars pass through early on, not a separate species of star"
//     ]}
//   ]
// },

// {
//   type:"cosmicStrings", az:45, el:24, r:2700,
//   label:"Cosmic Strings",
//   desig:"Topological defect · pre-inflation relic",
//   kind:"Hypothetical spacetime defect",
//   title:"Cosmic <b>strings</b>",
//   lede:"A hypothetical crack left over from the instant after the Big Bang — infinitely thin, unimaginably dense, carrying so much mass per length that even a short stretch could outweigh a planet.",
//   blocks:[
//     { k:"text", body:"The early universe cooled unevenly, the way water doesn't freeze into one perfect crystal — it freezes into a lattice of domains that meet at defects. A cosmic string would be one of those defects frozen into spacetime itself: a one-dimensional flaw stretching across the observable universe, if it exists at all." },
//     { k:"list", title:"Why nobody's found one", items:[
//       "The clearest predicted signature is gravitational lensing that splits a background object into two identical, unlensed-looking images — extremely specific, and never confirmed",
//       "A moving string is predicted to occasionally form a cusp — a point briefly moving at a meaningful fraction of light speed, bright enough in theory to detect",
//       "They're a natural prediction of several inflation models, which is the main reason anyone still looks"
//     ]}
//   ]
// },

// {
//   type:"aldersonDisk", az:63, el:-8, r:2400,
//   label:"Alderson Disk",
//   desig:"Class-A megastructure · monolithic",
//   kind:"Star-centred artificial platter",
//   title:"Alderson <b>disk</b>",
//   lede:"A single flat, solid platter wide enough to swallow a solar system, with a star burning in a hole at the centre — an engineering project on a scale that makes a Dyson sphere look modest.",
//   blocks:[
//     { k:"text", body:"Named for its inventor, not for anyone who's actually built one. Set a star in the central bore of a rigid disk light-hours across and you get gravity that reads as roughly Earth-like across most of the surface, and a permanent day on one face and permanent night on the other — no rotation needed." },
//     { k:"list", title:"The engineering problems, roughly in order", items:[
//       "No known material is remotely strong enough to hold its own shape at this scale without buckling",
//       "It isn't gravitationally stable long-term without active correction — nothing this shape naturally stays centred on its star",
//       "Even granting both of those, you'd still need to move a meaningful fraction of a solar system's mass to build it"
//     ]}
//   ]
// },

// {
//   type:"klempererRosette", az:233, el:18, r:2150,
//   label:"Klemperer Rosette",
//   desig:"n=6 · co-orbital resonance",
//   kind:"Mutually stabilised orbital ring",
//   title:"Klemperer <b>rosette</b>",
//   lede:"Several equal-mass bodies sharing a single orbit, spaced perfectly evenly so each one's gravity cancels out against its neighbours — a geometric configuration balanced by nothing but the arrangement itself.",
//   blocks:[
//     { k:"text", body:"Named for the physicist who worked out the arrangement in 1962. It's a legitimate solution to the gravitational many-body problem — stable to a first approximation — for any even number of equal masses spaced evenly around a shared orbit, each one pulled equally by all the others." },
//     { k:"list", title:"The catch", items:[
//       "It's only neutrally stable — a small nudge to one body doesn't get corrected, it just slowly grows",
//       "Nothing like this has ever been observed in nature, which is roughly what that stability problem would predict",
//       "It shows up constantly in science fiction anyway, because visually nothing else looks quite like it"
//     ]}
//   ]
// },

// {
//   type:"greatAttractor", az:333, el:-22, r:2850,
//   label:"The Great Attractor",
//   desig:"Norma Cluster region · Laniakea core",
//   kind:"Regional gravitational anomaly",
//   title:"The Great <b>Attractor</b>",
//   lede:"A gravitational anomaly quietly pulling our galaxy, and thousands of others, toward it at hundreds of kilometres per second — and one that's almost impossible to actually look at.",
//   blocks:[
//     { k:"text", body:"It sits almost directly behind the disk of the Milky Way from our vantage point, in a region astronomers call the Zone of Avoidance — dust and stars in our own galaxy block most of the visible light, so most of what's known about it comes from galaxy motions and radio/X-ray surveys rather than a direct picture." },
//     { k:"list", title:"What's actually there", items:[
//       "A dense concentration of galaxy clusters, the Norma Cluster prominent among them — not one exotic object, just an ordinary and very large amount of mass",
//       "It's now understood to be one part of an even larger structure, the Laniakea Supercluster, that our own galaxy belongs to",
//       "\"Attractor\" describes the effect, not a mechanism — it's pulling on everything nearby for the most mundane reason there is: gravity, a lot of it, in one place"
//     ]}
//   ]
// },

// {
//   type:"einsteinRing", az:351, el:6, r:2550,
//   label:"Einstein Ring",
//   desig:"Perfect-alignment lens · θE geometry",
//   kind:"Gravitational lensing artefact",
//   title:"Einstein <b>ring</b>",
//   lede:"Not an object — an alignment. When a massive galaxy sits exactly between us and a more distant one, its gravity bends the background galaxy's light into a perfect ring instead of the usual smeared arc.",
//   blocks:[
//     { k:"text", body:"Gravitational lensing usually produces a smear, a partial arc, or multiple distorted images, because the alignment is never quite perfect. Line the lensing mass, the background source, and the observer up exactly, though, and general relativity predicts the light bends evenly all the way around — a ring, not an arc." },
//     { k:"list", title:"Worth knowing", items:[
//       "Einstein calculated the effect in 1936 and figured it would never actually be observable — the alignment seemed too precise to expect in nature",
//       "Real ones have since been found and photographed, mostly by wide surveys catching a lucky lineup",
//       "The ring's exact size tells you the mass of the foreground galaxy — one of the more direct ways to weigh something using only its gravity"
//     ]}
//   ]
// }

];
