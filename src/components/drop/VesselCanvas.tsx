import { useEffect, useRef } from "react";
import { VesselScene, type SceneState } from "./vesselScene";

/** لوحة WebGL للوعاء (تنحمّل كقطعة لحالها lazy). كل مشهد له canvas جديد يننشئ وينشال معه
    (سياق WebGL اللي انقفل ما ينرجع له). أول ما يجهز أول رسم نخفي البوستر اللي تحتها */
export default function VesselCanvas({ state, onReady, onSlow }: { state: SceneState; onReady: () => void; onSlow?: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const scene = useRef<VesselScene | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const host = box.current;
    if (!host) return;
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
    host.appendChild(canvas);
    let s: VesselScene | null = null;
    try {
      s = new VesselScene(canvas, onReady);
      s.onSlow = onSlow;
      s.setState(stateRef.current);
      scene.current = s;
    } catch (e) {
      // WebGL فشل: يبقى البوستر
      console.warn("vessel 3D off:", e instanceof Error ? e.message : e);
    }
    return () => {
      s?.dispose();
      scene.current = null;
      canvas.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scene.current?.setState(state);
  }, [state]);

  return <div ref={box} aria-hidden className="absolute inset-0" />;
}
