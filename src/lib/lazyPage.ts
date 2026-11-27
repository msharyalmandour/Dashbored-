import { lazy, type ComponentType } from "react";

/** صفحة تتحمّل وقت الحاجة. لو ملفها القديم انحذف بعد نشر جديد (المتصفح فاتح نسخة قديمة)
    نعيد تحميل الصفحة مرة وحدة بس عشان ياخذ النسخة الجديدة بدل ما يطلع خطأ. */
const KEY = "wesync.chunkReload";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyPage<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return lazy(() =>
    load()
      .then((m) => {
        try {
          sessionStorage.removeItem(KEY);
        } catch {
          // التخزين ممنوع
        }
        return m;
      })
      .catch((err) => {
        let reloaded = false;
        try {
          reloaded = sessionStorage.getItem(KEY) === "1";
          if (!reloaded) sessionStorage.setItem(KEY, "1");
        } catch {
          reloaded = true;
        }
        if (!reloaded) window.location.reload();
        throw err;
      }),
  );
}
