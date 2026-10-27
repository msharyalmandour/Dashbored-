import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

export type PushState = "unsupported" | "ios-install" | "denied" | "off" | "on" | "busy";

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

function urlBase64ToUint8Array(b64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** إشعارات الجوال: تسجيل اشتراك الجهاز الحالي (Web Push). آيفون يحتاج التطبيق مثبّت على الشاشة الرئيسية أول. */
export function usePush(userId: string | undefined) {
  const [state, setState] = useState<PushState>("busy");

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setState(isIos() && !isStandalone() ? "ios-install" : "unsupported");
      return;
    }
    if (Notification.permission === "denied") return setState("denied");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setState(sub && Notification.permission === "granted" ? "on" : "off");
    } catch {
      setState("off");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enable = async (): Promise<string | null> => {
    if (!userId) return "no user";
    setState("busy");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        await refresh();
        return null;
      }
      const { data, error } = await supabase!.functions.invoke("push-notify", { body: { action: "key" } });
      const publicKey = (data as { publicKey?: string } | null)?.publicKey;
      if (error || !publicKey) throw new Error("key");
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));
      const j = sub.toJSON();
      const { error: dbError } = await supabase!
        .from("push_subscriptions")
        .upsert({ profile_id: userId, endpoint: sub.endpoint, p256dh: j.keys?.p256dh ?? "", auth: j.keys?.auth ?? "" }, { onConflict: "endpoint" });
      if (dbError) throw new Error(dbError.message);
      await refresh();
      return null;
    } catch (e) {
      await refresh();
      return e instanceof Error ? e.message : "error";
    }
  };

  const disable = async () => {
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await supabase!.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
    } finally {
      await refresh();
    }
  };

  const sendTest = async (): Promise<number> => {
    const { data } = await supabase!.functions.invoke("push-notify", { body: { action: "test" } });
    return (data as { sent?: number } | null)?.sent ?? 0;
  };

  return { state, enable, disable, sendTest };
}
