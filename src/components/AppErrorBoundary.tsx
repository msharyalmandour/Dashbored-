import { Component, type ErrorInfo, type ReactNode } from "react";

/** حاجز أخير للتطبيق كله: لو صار خطأ ما انمسك، بدل الشاشة السودا نعرض رسالة واضحة + نص الخطأ (عشان نعرف السبب من صورة)
    وزر يحدّث الصفحة. ستايل مضمّن عشان يطلع حتى لو التنسيق نفسه فيه مشكلة. */
export default class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null; where: string }> {
  state = { error: null as Error | null, where: "" };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const firstComponent = (info.componentStack ?? "").split("\n").map((l) => l.trim()).find(Boolean) ?? "";
    this.setState({ where: firstComponent });
    console.error("App crashed:", error, info.componentStack);
  }

  render() {
    const { error, where } = this.state;
    if (!error) return this.props.children;
    return (
      <div dir="rtl" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#0F0B09", color: "#EAE3DC", fontFamily: "Tajawal, system-ui, sans-serif" }}>
        <div style={{ maxWidth: 520, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>صار خطأ وما قدرنا نفتح الصفحة</div>
          <p style={{ color: "#ABA095", fontSize: 15, lineHeight: 1.7, margin: "0 0 16px" }}>
            حدّثوا الصفحة. لو تكرر، صوّروا هالشاشة وأرسلوها لنا عشان نصلّحه بسرعة.
          </p>
          <pre dir="ltr" style={{ textAlign: "left", whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12, color: "#FF8A7A", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 14, padding: 12, margin: "0 0 18px" }}>
            {String(error.message || error)}
            {where ? `\n${where}` : ""}
          </pre>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={() => window.location.reload()} style={{ minHeight: 44, padding: "0 22px", borderRadius: 999, border: 0, fontWeight: 800, fontSize: 15, background: "linear-gradient(90deg,#FF6A00,#FF9A3C)", color: "#1A0802", cursor: "pointer" }}>
              حدّث الصفحة
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.hash = "#/tasks";
                window.location.reload();
              }}
              style={{ minHeight: 44, padding: "0 22px", borderRadius: 999, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.07)", color: "#EAE3DC", fontWeight: 700, fontSize: 15, cursor: "pointer" }}
            >
              افتح مهامي
            </button>
          </div>
        </div>
      </div>
    );
  }
}
