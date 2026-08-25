import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Lightformer, MeshDistortMaterial, Sparkles, Stars } from "@react-three/drei";
import type { Mesh } from "three";

/** بيئة إضاءة محلية بالكامل (بدون تحميل أي صورة خارجية) — تعطي المواد المعدنية
    شي تعكسه، وإلا تطلع رمادية باهتة على أي كرت رسومات حقيقي (خلاف المحاكاة البرمجية) */
function LocalEnvironment() {
  return (
    <Environment resolution={256} frames={1}>
      <Lightformer intensity={5} color="#fbbf24" position={[0, 3, -4]} scale={[9, 4, 1]} />
      <Lightformer intensity={3} color="#fcd34d" position={[-5, 1, 3]} scale={[5, 5, 1]} rotation={[0, Math.PI / 2, 0]} />
      <Lightformer intensity={3} color="#ffffff" position={[5, -1, 3]} scale={[5, 5, 1]} rotation={[0, -Math.PI / 2, 0]} />
      <Lightformer intensity={2} color="#ffffff" position={[0, -5, 2]} scale={[6, 3, 1]} rotation={[Math.PI / 2, 0, 0]} />
    </Environment>
  );
}

const GOLD = "#fbbf24";
const GOLD_LIGHT = "#fcd34d";

function CenterpieceKnot() {
  const ref = useRef<Mesh>(null);
  useFrame((_state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.x += delta * 0.07;
    ref.current.rotation.y += delta * 0.1;
  });
  return (
    <Float speed={1.3} rotationIntensity={0.25} floatIntensity={1}>
      <mesh ref={ref} scale={1.5}>
        <torusKnotGeometry args={[1, 0.32, 200, 32]} />
        <MeshDistortMaterial
          color={GOLD}
          metalness={0.55}
          roughness={0.25}
          distort={0.14}
          speed={1.1}
          emissive={GOLD}
          emissiveIntensity={0.55}
        />
      </mesh>
    </Float>
  );
}

interface ShapeSpec {
  position: [number, number, number];
  scale: number;
  speed: number;
  geo: "octahedron" | "icosahedron";
}

function FloatingShapes({ count }: { count: number }) {
  const shapes = useMemo<ShapeSpec[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        position: [(Math.random() - 0.5) * 9, (Math.random() - 0.5) * 5, -2 - Math.random() * 4],
        scale: 0.18 + Math.random() * 0.26,
        speed: 0.6 + Math.random() * 0.8,
        geo: i % 2 === 0 ? "octahedron" : "icosahedron",
      })),
    [count],
  );

  return (
    <>
      {shapes.map((s, i) => (
        <Float key={i} speed={s.speed} rotationIntensity={0.6} floatIntensity={1.5}>
          <mesh position={s.position} scale={s.scale}>
            {s.geo === "octahedron" ? (
              <octahedronGeometry args={[1, 0]} />
            ) : (
              <icosahedronGeometry args={[1, 0]} />
            )}
            <meshStandardMaterial
              color={GOLD_LIGHT}
              metalness={0.45}
              roughness={0.3}
              emissive={GOLD_LIGHT}
              emissiveIntensity={0.2}
              transparent
              opacity={0.6}
            />
          </mesh>
        </Float>
      ))}
    </>
  );
}

const INTRO_START_Z = 2.2;
const INTRO_REST_Z = 6;
const INTRO_DURATION = 2.4;

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/** لقطة افتتاحية سينمائية: الكاميرا تبدأ قريبة جدًا (تكبير كبير) وتتراجع بسلاسة
    للمسافة الطبيعية، وبعدها تتبع حركة الماوس بخفة (parallax) */
function CameraRig() {
  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    const introT = Math.min(elapsed / INTRO_DURATION, 1);
    const targetZ = INTRO_START_Z + (INTRO_REST_Z - INTRO_START_Z) * easeOutCubic(introT);

    const x = state.pointer.x * 0.4;
    const y = state.pointer.y * 0.25;
    state.camera.position.x += (x - state.camera.position.x) * 0.03;
    state.camera.position.y += (-y - state.camera.position.y) * 0.03;
    state.camera.position.z += (targetZ - state.camera.position.z) * (introT < 1 ? 0.08 : 0.03);
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

/** مشهد ثلاثي الأبعاد سينمائي — عقدة ذهبية دوّارة وسط أشكال هندسية عائمة وبريق خفيف،
    يتبع حركة الماوس بخفة. يعتمد على WebGL محليًا بدون تحميل أي موارد خارجية.
    ملاحظة: تعمّدنا عدم استخدام EffectComposer/Bloom — تسبب بشاشة نصفها أسود على
    الشاشات عالية الدقة (Retina/DPR=2)؛ التوهج هنا كله عبر emissive + الإضاءة. */
export default function Scene3D({ density = "full" }: { density?: "full" | "light" }) {
  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reducedMotion) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, INTRO_START_Z], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.35} />
          <pointLight position={[4, 3, 5]} intensity={90} color={GOLD_LIGHT} />
          <pointLight position={[-4, -2, -3]} intensity={35} color="#ffffff" />
          <pointLight position={[0, -3, 2]} intensity={20} color={GOLD} />
          <LocalEnvironment />
          <Stars radius={80} depth={40} count={density === "full" ? 4500 : 2500} factor={3} saturation={0} fade speed={0.4} />
          <CenterpieceKnot />
          {density === "full" && <FloatingShapes count={7} />}
          <Sparkles
            count={density === "full" ? 110 : 55}
            scale={9}
            size={2.2}
            speed={0.3}
            color={GOLD_LIGHT}
            opacity={0.55}
          />
          <CameraRig />
        </Suspense>
      </Canvas>
    </div>
  );
}

/** طبقة نجوم ثابتة (fixed) خفيفة تغطي الصفحة كاملة خلف كل المحتوى — بدون العقدة
    ثلاثية الأبعاد الثقيلة، بس نجوم متلألئة براحة. تبقى بمكانها حتى لو تمرّرين. */
export function StarsBackdrop() {
  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reducedMotion) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 1], fov: 60 }} gl={{ antialias: false, alpha: true }}>
        <Suspense fallback={null}>
          <Stars radius={60} depth={30} count={3500} factor={2.5} saturation={0} fade speed={0.3} />
        </Suspense>
      </Canvas>
    </div>
  );
}
