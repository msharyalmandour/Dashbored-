import { useCallback, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true);

const isIos = () =>
  typeof navigator !== "undefined" &&
  (/iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPadOS يعرّف نفسه كماك
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

/** سفاري فقط يقدر يثبّت على iOS (متصفحات ثانية أو ويب فيو داخل تطبيقات ما تظهر فيها "إضافة للشاشة") */
const isIosSafari = () => isIos() && /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios|opios|instagram|fban|fbav|line|snapchat|twitter/i.test(navigator.userAgent);

export type InstallMode = "installed" | "prompt" | "ios" | "ios-other-browser" | "manual";

/** حالة تثبيت التطبيق (PWA): أندرويد/كروم يعطينا نافذة تثبيت جاهزة، آيفون نوريهم الخطوات. */
export function useInstallApp() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone());

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const mode: InstallMode = installed ? "installed" : deferred ? "prompt" : isIosSafari() ? "ios" : isIos() ? "ios-other-browser" : "manual";

  const install = useCallback(async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    return outcome === "accepted";
  }, [deferred]);

  return { mode, install };
}
