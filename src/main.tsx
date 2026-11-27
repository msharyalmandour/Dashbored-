import { createRoot } from "react-dom/client";

// نسخة جديدة من الموقع: لو الخدمة الجديدة استلمت خلال أول 20 ثانية من فتح الصفحة نعيد التحميل مرة،
// عشان الناس يشوفون التحديث فورًا بدل ما يعلقون على النسخة القديمة المخزّنة بالجوال.
// بس لو كان فيه خدمة قديمة أصلًا — أول زيارة (ما فيه خدمة) كانت تعيد تحميل صفحة الهبوط بعد ثانيتين لكل زائر جديد.
if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
  const openedAt = Date.now();
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloaded || Date.now() - openedAt > 20_000) return;
    reloaded = true;
    window.location.reload();
  });
}

// حارس النسخة القديمة: لو /version.json (من النت، بدون تخزين) يقول فيه نسخة أحدث من اللي شغّالة،
// نحدّث خدمة العامل ونمسح المخزّن ونعيد التحميل مرة وحدة. يشتغل عند الفتح وكل ما رجع المستخدم للتبويب.
async function ensureFreshBuild() {
  if (!__BUILD_ID__ || typeof window === "undefined") return;
  try {
    const r = await fetch(`/version.json?ts=${Date.now()}`, { cache: "no-store" });
    if (!r.ok) return;
    const { id } = (await r.json()) as { id?: string };
    if (!id || id === __BUILD_ID__) return;
    const key = "wesync.freshTried";
    if (sessionStorage.getItem(key) === id) return; // جربنا لهالنسخة — ما ندخل بحلقة إعادة تحميل
    sessionStorage.setItem(key, id);
    const regs = (await navigator.serviceWorker?.getRegistrations?.()) ?? [];
    await Promise.all(regs.map((g) => g.update().catch(() => undefined)));
    if ("caches" in window) await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
    window.location.reload();
  } catch {
    // بدون نت أو تخزين محظور: نكمل بالنسخة الحالية
  }
}
void ensureFreshBuild();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") void ensureFreshBuild();
});
import "./index.css";
import { loadDictionary } from "./lib/i18n";
import { syncCanonicalLink } from "./lib/publicUrl";
import { applyReduceMotion, getReduceMotion } from "./lib/motionPref";
import { captureDocCode, captureSignupRef } from "./lib/signupSource";

syncCanonicalLink();
captureSignupRef();
// wesyncapp.com/j/<كود الدكتورة> → التسجيل (HashRouter)
if (captureDocCode()) window.history.replaceState(null, "", "/#/login?mode=signup&ref=supervisor");
applyReduceMotion(getReduceMotion());

// نحمّل قاموس اللغة أول، وبعدها التطبيق: النصوص (حتى الثابتة على مستوى الملفات) تنحسب باللغة الصحيحة
loadDictionary()
  .catch(() => {})
  .then(() => import("./Root.tsx"))
  .then(({ default: Root }) => {
    createRoot(document.getElementById("root")!).render(<Root />);
  });
