import { Component, type ReactNode } from "react";

/** يمنع خطأ بمكوّن فرعي معقّد (زي مشهد ثلاثي الأبعاد) من إسقاط التطبيق كامل —
    React يوقف شجرة الواجهة كلها لو صار خطأ غير ملتقط بأي Effect، فهذا الحاجز
    يحصر الضرر بالمكوّن نفسه بس ويرجّع fallback بدله */
export default class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}
