/** يجمع بيانات الفريق البحثي في كائن واحد، وينزّله كملف JSON — نسخة
    احتياطية بسيطة تقدر المستخدمة تحتفظ فيها أو ترسلها لمشرفها */
export function downloadBackup(payload: Record<string, unknown>, filename = "nursync-backup.json") {
  const body = { exportedAt: new Date().toISOString(), ...payload };
  const blob = new Blob([JSON.stringify(body, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
