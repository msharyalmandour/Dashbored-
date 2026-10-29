import { createRoot } from "react-dom/client";
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
