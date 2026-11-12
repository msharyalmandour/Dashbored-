import { createRoot } from "react-dom/client";

// نسخة جديدة من الموقع: لو الخدمة الجديدة استلمت خلال أول 20 ثانية من فتح الصفحة نعيد التحميل مرة،
// عشان الناس يشوفون التحديث فورًا بدل ما يعلقون على النسخة القديمة المخزّنة بالجوال
if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
  const openedAt = Date.now();
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded || Date.now() - openedAt > 20_000) return;
    reloaded = true;
    window.location.reload();
  });
}
import "./index.css";
import { loadDictionary } from "./lib/i18n";
import { syncCanonicalLink } from "./lib/publicUrl";
import { applyReduceMotion, getReduceMotion } from "./lib/motionPref";

syncCanonicalLink();
applyReduceMotion(getReduceMotion());

// نحمّل قاموس اللغة أول، وبعدها التطبيق: النصوص (حتى الثابتة على مستوى الملفات) تنحسب باللغة الصحيحة
loadDictionary()
  .catch(() => {})
  .then(() => import("./Root.tsx"))
  .then(({ default: Root }) => {
    createRoot(document.getElementById("root")!).render(<Root />);
  });
