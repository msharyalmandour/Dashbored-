# Car RP — لعبة رول بلاي سيارات (روبلكس)

النسخة الأولى (MVP): فلوس تنحفظ، معرض تشتري منه، كراج تطلّع منه سيارتك، راتب تلقائي، ومهمة توصيل.

## الملفات ووين تحطها في Roblox Studio

| الملف | نوعه في Studio | مكانه |
|---|---|---|
| `src/ReplicatedStorage/CarConfig.lua` | **ModuleScript** باسم `CarConfig` | ReplicatedStorage |
| `src/ServerScriptService/PlayerData.lua` | **ModuleScript** باسم `PlayerData` | ServerScriptService |
| `src/ServerScriptService/Remotes.lua` | **ModuleScript** باسم `Remotes` | ServerScriptService |
| `src/ServerScriptService/CarService.server.lua` | **Script** باسم `CarService` | ServerScriptService |
| `src/ServerScriptService/JobService.server.lua` | **Script** باسم `JobService` | ServerScriptService |
| `src/StarterPlayerScripts/CarMenu.client.lua` | **LocalScript** باسم `CarMenu` | StarterPlayer › StarterPlayerScripts |

انسخ محتوى كل ملف والصقه في السكربت اللي يقابله. **الأسماء لازم تكون نفسها بالضبط.**

## تجهيز الماب

1. **السيارات:** سوِّ Folder اسمه `Cars` داخل **ServerStorage**. حط فيه موديلات سيارات أسماؤها
   `Sedan`، `Pickup`، `SUV`، `Sports` (أو غيّر الأسماء في `CarConfig`).
   - كل سيارة لازم تكون **Model** فيها **VehicleSeat** وتمشي.
   - أسهل طريقة: من الـ **Toolbox** دوّر على `A-Chassis` أو `car` وخذ سيارة تمشي، وتأكد إنها ما فيها سكربتات غريبة (احذف أي Script ما تعرفه).
2. **أماكن التوصيل:** سوِّ Folder اسمه `DeliveryPoints` داخل **Workspace**، وحط فيه Parts (Anchored) في أماكن
   مختلفة بالماب (بيوت، محلات...). كل ما كثرت أحسن.
3. **الحفظ:** انشر اللعبة (File › Publish to Roblox)، وبعدين من
   Game Settings › Security شغّل **Enable Studio Access to API Services** عشان الحفظ يشتغل وأنت تجرب في Studio.

## كيف تنلعب

- **G** أو زر 🚗 يفتح المعرض: تشتري سيارات أو تطلّع اللي عندك.
- كل لاعب يبدأ بـ 5000 ريال وسيارة سيدان مجانية.
- راتب 250 ريال كل 5 دقايق.
- اركب سيارتك واضغط 📦 توصيل، توصلك علامة برتقالية على الماب، وكل ما كانت التوصيلة أبعد تاخذ أكثر.
- ما أحد يقدر يسوق سيارتك غيرك.

كل الأرقام (أسعار، راتب، مكافآت) تتعدّل من `CarConfig`.

## الحماية

السيرفر هو اللي يتحقق من كل شي (السعر، الملكية، الفلوس، وسرعة الوصول في التوصيل). العميل
بس يطلب، فالهاكر ما يقدر يعطي نفسه فلوس أو سيارة.

## الخطوات الجاية (أفكار)

- وظائف: شرطي 🚓 (يكتب مخالفات)، تاكسي 🚕، ميكانيكي 🔧 — باستخدام Teams.
- بيوت تشتريها وتقفلها.
- محطة بنزين ووقود للسيارات.
- تعديل السيارات: لون، جنوط، سرعة.
- جوال داخل اللعبة.
- Game Pass لسيارات VIP.
