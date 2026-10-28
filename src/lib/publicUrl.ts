/** الدومين الرسمي اللي نشاركه بأي رابط (دعوة، رابط المشرفة، استبيان، إحالة…).
    روابط *.vercel.app الخاصة بكل نشر تنحذف مع الوقت وتطلع «404 DEPLOYMENT_NOT_FOUND»
    لمن يفتحها، فما نبني الرابط من العنوان اللي فاتح منه المستخدم — إلا بالتطوير المحلي. */
export const PUBLIC_ORIGIN = "https://wesyncapp.com";

function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".local");
}

/** أصل الرابط المشترك مع "/" بالآخر — يُلحق به "#/…" مباشرة */
export function publicBase(): string {
  if (typeof window === "undefined") return `${PUBLIC_ORIGIN}/`;
  const { hostname, origin, pathname } = window.location;
  return isLocalHost(hostname) ? origin + pathname : `${PUBLIC_ORIGIN}/`;
}

export const publicOrigin = (): string => publicBase().replace(/\/$/, "");
