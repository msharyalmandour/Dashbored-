/* يُحمَّل داخل service worker الرئيسي (workbox importScripts): يستقبل إشعارات الجوال ويفتح الصفحة عند الضغط */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Wesync", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Wesync", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag,
      renotify: !!(data.tag && data.renotify),
      dir: "rtl",
      lang: "ar",
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.navigate(url).catch(() => {});
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

/* «ارموا لـ Wesync» من تطبيق ثاني (share_target): نحفظ اللي انشارك بالجهاز ونفتح صفحة المشاركة.
   هذا المستمع ينسجّل قبل مستمعات workbox (importScripts بأول الملف)، فهو اللي يرد على POST /share-target. */
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "POST" || url.pathname !== "/share-target") return;
  event.respondWith(
    (async () => {
      try {
        const form = await event.request.formData();
        const files = form.getAll("files").filter((f) => f && typeof f !== "string").slice(0, 10);
        const rec = {
          id: "last",
          at: Date.now(),
          title: String(form.get("title") || ""),
          text: String(form.get("text") || ""),
          url: String(form.get("url") || ""),
          files: files.map((f) => ({ name: f.name || "shared", type: f.type || "", blob: f })),
        };
        await new Promise((resolve, reject) => {
          const r = indexedDB.open("wesync-share", 1);
          r.onupgradeneeded = () => r.result.createObjectStore("shared", { keyPath: "id" });
          r.onsuccess = () => {
            const tx = r.result.transaction("shared", "readwrite");
            tx.objectStore("shared").put(rec);
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
          };
          r.onerror = () => reject(r.error);
        });
      } catch (e) {
        // نفتح الصفحة على كل حال؛ تقول لهم ما وصل شي
      }
      return Response.redirect("/#/drop/share", 303);
    })(),
  );
});
