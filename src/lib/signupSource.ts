/* من وين جا الفريق؟ رابط المشرفة (?ref=supervisor) أو رابط دعوة فريق (?ref=CODE).
   الرابط يوصل غالبًا للصفحة الرئيسية قبل الـ # (https://wesyncapp.com/?ref=supervisor)، وHashRouter ما يشوفه،
   فنلقطه أول ما يفتح الموقع ونحفظه 30 يوم لين يسجّلون. */

const KEY = "wesync.signupRef";
const TTL = 30 * 864e5;
/** كلمات مصدر (مو رموز دعوة فرق) */
export const SOURCE_WORDS = new Set(["supervisor"]);

export function parseRef(raw: string | null | undefined): { code?: string; source?: string } {
  const v = (raw ?? "").trim();
  if (!v || v.length > 24) return {};
  const low = v.toLowerCase();
  if (SOURCE_WORDS.has(low)) return { source: low };
  if (/^[A-Za-z0-9]{4,12}$/.test(v)) return { code: v.toUpperCase() };
  // كود سفير/مؤثر (MSHARY-KAU)
  if (/^[A-Za-z0-9]{2,12}(-[A-Za-z0-9]{1,10})+$/.test(v)) return { code: v.toUpperCase() };
  return {};
}

/** ينادى مرة بأول فتح: يقرا ref من العنوان (قبل # أو بعدها) ويحفظه */
export function captureSignupRef(loc: Pick<Location, "search" | "hash"> = window.location): void {
  try {
    // ?ref=CODE (دعوة) أو ?r=CODE (بطاقة الإنجاز — حلقة النمو)
    const sp = new URLSearchParams(loc.search);
    const hashQuery = loc.hash.includes("?") ? loc.hash.slice(loc.hash.indexOf("?")) : "";
    const hp = new URLSearchParams(hashQuery);
    const ref = sp.get("ref") ?? sp.get("r") ?? hp.get("ref") ?? hp.get("r");
    if (!ref || (!parseRef(ref).code && !parseRef(ref).source)) return;
    localStorage.setItem(KEY, JSON.stringify({ ref, at: Date.now() }));
  } catch {
    /* تخزين ممنوع — نكمل بدون */
  }
}

export function storedSignupRef(now = Date.now()): string | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null") as { ref?: string; at?: number } | null;
    if (!v?.ref || !v.at || now - v.at > TTL) return null;
    return v.ref;
  } catch {
    return null;
  }
}

export function clearSignupRef(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* لا شي */
  }
}

/* رابط الدكتورة wesyncapp.com/j/<كودها>: نحفظ الكود ونودّيهم للتسجيل كمصدر «supervisor»،
   وبعد ما ينشأ الفريق نربطه بكودها (join_doc_code) عشان ينحسب لها وتشوفه. */
const DOC_KEY = "wesync.docCode";
export function captureDocCode(loc: Pick<Location, "pathname"> = window.location): boolean {
  const m = loc.pathname.match(/^\/j\/([A-Za-z0-9]{6,10})\/?$/);
  if (!m) return false;
  try {
    localStorage.setItem(DOC_KEY, JSON.stringify({ code: m[1].toUpperCase(), at: Date.now() }));
    localStorage.setItem(KEY, JSON.stringify({ ref: "supervisor", at: Date.now() }));
  } catch {
    /* تخزين ممنوع */
  }
  return true;
}
export function storedDocCode(now = Date.now()): string | null {
  try {
    const v = JSON.parse(localStorage.getItem(DOC_KEY) ?? "null") as { code?: string; at?: number } | null;
    if (!v?.code || !v.at || now - v.at > TTL) return null;
    return v.code;
  } catch {
    return null;
  }
}
export function clearDocCode(): void {
  try {
    localStorage.removeItem(DOC_KEY);
  } catch {
    /* ما يهم */
  }
}
