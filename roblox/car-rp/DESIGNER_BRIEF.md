# طلب مصمم 3D — سيارات وبيوت بطابع جدة

> القسم الأول بالعربي يشرح لك كيف يشتغل المصمم. والقسم الثاني بالإنجليزي، انسخه وأرسله للمصمم كما هو
> (أغلب مصممي روبلكس على Fiverr وTalent Hub يتكلمون إنجليزي).

## كيف يشتغل المصمم؟ (خطوة بخطوة)

| # | الخطوة | وش يسوي | البرنامج |
|---|---|---|---|
| 1 | **مراجع** | يجمع صور حقيقية: سيارات خليجية، فلل جدة، رواشين البلد | Pinterest / PureRef |
| 2 | **الموديل (Modeling)** | يبني الشكل من مضلعات. هنا يصير "طين رمادي" بدون ألوان | Blender |
| 3 | **التخفيف (Optimization)** | يقلل المضلعات عشان اللعبة ما تثقل على الجوال | Blender |
| 4 | **UV** | يفرد سطح الموديل زي ما تفرد علبة كرتون، عشان تنحط عليه الخامات | Blender |
| 5 | **الخامات (PBR Textures)** | لمعة الصبغ، خشونة الحجر، معدن الجنوط. هذا اللي يخليه **فخم وواقعي** | Substance Painter / Blender |
| 6 | **التقطيع** | يفصل البودي والزجاج والجنوط واللوحة كل وحدة لحالها، عشان الكود يقدر يغيّر لونها | Blender |
| 7 | **التصدير** | ملف FBX مع صور الخامات | Blender → Roblox Studio |
| 8 | **التركيب في روبلكس** | MeshPart + SurfaceAppearance، والسيارة تتركب على شاسيه (A-Chassis) | Roblox Studio |

**كم ياخذ وكم يكلف؟ (تقريب، والأسعار تختلف كثير)**
- سيارة واحدة جاهزة لروبلكس: تقريباً **3 إلى 10 أيام**، وسعرها من **50$ إلى 400$** حسب الجودة.
- فيلا مع تفاصيلها: **3 إلى 7 أيام**، من **40$ إلى 250$**.
- **نصيحتي:** ابدأ بسيارة وحدة وفيلا وحدة كتجربة، وإذا عجبك شغله كمّل معه الباقي.

**كيف تختار مصمم؟**
- اطلب يوريك **شغل سابق داخل روبلكس**، مو بس صور من Blender.
- اسأله: كم **Triangles** في السيارة؟ لو أكثر من 20 ألف، بتثقل اللعبة على الجوال.
- اتفقوا إن **الملكية لك** وإن الموديل **بدون شعارات ماركات**.
- ادفع على مراحل: نص بعد ما تشوف الموديل الرمادي، والنص الباقي بعد التسليم.

---

## Brief to send (English)

**Project:** Realistic car roleplay game on Roblox, set in a city inspired by **Jeddah, Saudi Arabia**
(Red Sea corniche, historic old town, modern villa neighborhoods, desert).
**Style:** Realistic and premium, **not** low-poly or cartoon. Lighting is `Future` with PBR (`SurfaceAppearance`).

### Package 1 — Vehicles (start with 1 as a trial)

Four original, **unbranded** vehicles (no real logos, badges or names, per Roblox rules), with a Gulf
car-culture feel:

| Id (model name) | Type | Notes |
|---|---|---|
| `Sedan` | Mid-size family sedan | Starter car, clean and modern |
| `Pickup` | Single/double-cab pickup | Rugged, work truck |
| `SUV` | Large full-size luxury SUV | The "hero" car: premium details |
| `Sports` | 2-door sports coupe | Low, aggressive |

**Technical requirements**
- Target **8k–20k triangles** per vehicle (mobile friendly). Provide a lower LOD if possible.
- Scale: sedan ≈ **16–18 studs long, ~7 studs wide** (Roblox character ≈ 5 studs).
- PBR textures (Color, Normal, Roughness, Metalness), max 1024×1024 per map.
- **Separate meshes**, named exactly like this, each with a string Attribute `Mod`:
  - `Body`: all painted panels, **plain base color with no baked color texture** (we recolor it in-game via script)
  - `Glass`: all windows (we change transparency in-game for tint)
  - `Rim`: one per wheel (we recolor in-game)
  - `Plate`: front and rear license plate, **flat rectangle, blank**, 2:1 ratio, outer face = `Front`
    (or set Attribute `PlateFace`). We render Saudi-style plates on it with a SurfaceGui.
  - Tyres, lights, interior, chrome trim: separate is fine, any names.
- Must be built on (or compatible with) **A-Chassis** with a working `VehicleSeat` and 4 wheels.
- Model needs a `PrimaryPart`, and pivot centered at the bottom of the car.
- No scripts inside the model other than the chassis.

### Package 2 — Buildings (start with 1 villa as a trial)
- 3 modern **Jeddah-style villas**: beige/white/sand plaster, 2 floors + roof, **high boundary wall**,
  black steel gate, car parking canopy, split AC units on walls, rooftop water tanks, satellite dish, palm trees.
- 1 **historic old-town house**: coral-stone walls, dark wooden **roshan/mashrabiya** balconies, big wooden door.
- Modular is a plus (walls/windows/doors kit we can reuse).
- Floor height ≈ 12–14 studs. Interiors optional (later phase).
- Same PBR rules; total ≤ 30k triangles per house.

### Deliverables
- `.rbxm` file per asset (ready to drop into Studio) **plus** source `.blend` + `.fbx` + texture maps.
- Short video or screenshots **inside Roblox Studio** with Future lighting.
- Full ownership / commercial rights transferred to us.

### Milestones
1. Grey clay model screenshots (approve shape) → 50%
2. Textured + in Studio + drivable → 50%
