import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial, Sparkles } from "@react-three/drei";
import { CapsuleGeometry, TorusGeometry, type Group, type Mesh, type MeshBasicMaterial } from "three";
import { GOLD, GOLD_LIGHT, LocalEnvironment, buildInfinityGeometry } from "./Scene3D";
import { getSpeechAnalyser } from "../../lib/speech";

const BODY_Y = -0.62;

const ENTRANCE_DURATION = 1.3;
const BASE_SCALE = 0.42;
const LOGO_Y = 0.75;
const RIPPLE_COUNT = 6;
const RIPPLE_LIFETIME_MS = 1150;

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/** يرجّع شدة الصوت اللحظية [0..1] — طيف حقيقي وقت صوت AI، أو نبضة اصطناعية
    ناعمة (مجموع موجات جيبية) وقت صوت المتصفح الاحتياطي اللي ما فيه تحليل
    طيف متاح له، عشان الشعار يفضل "حي" بأي الحالتين */
function readAmplitude(speaking: boolean, fakePhaseRef: { current: number }, delta: number): number {
  if (!speaking) return 0;
  const analyser = getSpeechAnalyser();
  if (analyser) {
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    return sum / data.length / 255;
  }
  fakePhaseRef.current += delta;
  const v =
    0.32 +
    Math.sin(fakePhaseRef.current * 3.1) * 0.18 +
    Math.sin(fakePhaseRef.current * 5.4 + 1.3) * 0.09;
  return Math.max(0, Math.min(1, v));
}

/** الشعار المركزي — نفس هندسة رمز اللانهاية بباقي مشاهد البراند، ينبض
    ويتوهج فعليًا حسب شدة الصوت (مو حركة عشوائية)، ويميل بخفة نحو الماوس */
function SpeakingLogo({ speaking }: { speaking: boolean }) {
  const meshRef = useRef<Mesh>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const materialRef = useRef<any>(null);
  const geometry = useMemo(() => buildInfinityGeometry(), []);
  const smoothedAmp = useRef(0);
  const fakePhase = useRef(0);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const amp = readAmplitude(speaking, fakePhase, delta);
    smoothedAmp.current += (amp - smoothedAmp.current) * 0.15;

    const t = state.clock.elapsedTime;
    meshRef.current.rotation.z += delta * 0.1;
    meshRef.current.rotation.x = Math.sin(t * 0.3) * 0.1 + state.pointer.y * 0.1;
    meshRef.current.rotation.y = Math.cos(t * 0.25) * 0.08 + state.pointer.x * 0.1;

    const breathe = 1 + Math.sin(t * 1.3) * 0.018;
    const pulse = 1 + smoothedAmp.current * 0.1;
    meshRef.current.scale.setScalar(BASE_SCALE * breathe * pulse);

    const mat = materialRef.current;
    if (mat) {
      mat.emissiveIntensity = 0.5 + smoothedAmp.current * 0.9;
      mat.distort = 0.05 + smoothedAmp.current * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <MeshDistortMaterial
        ref={materialRef}
        color={GOLD}
        metalness={0.55}
        roughness={0.22}
        distort={0.05}
        speed={1.4}
        emissive={GOLD}
        emissiveIntensity={0.5}
      />
    </mesh>
  );
}

/** جسم بسيط ومجرّد أسفل الشعار — يخلي مشاري "شخصية" ترحّب بدل رمز عائم لحاله.
    ما هو شكل بشري حرفي، بس هيكل مبسّط بنفس مادة الشعار الذهبية: جذع وذراعين،
    وذراعه اليمنى تلوّح ترحيبًا وقت الدخول، وتتحرك بخفة أكثر وقت الكلام */
function MascotBody({ speaking }: { speaking: boolean }) {
  const groupRef = useRef<Group>(null);
  const rightArmRef = useRef<Group>(null);
  const leftArmRef = useRef<Group>(null);
  const torsoGeometry = useMemo(() => new CapsuleGeometry(0.16, 0.3, 8, 16), []);
  const armGeometry = useMemo(() => new CapsuleGeometry(0.04, 0.24, 6, 12), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.25) * 0.06 + state.pointer.x * 0.04;
    }
    // ترحيب بتلويح واضح أول 3 ثواني (يوصل شبه أفقي)، وبعدها تمايل هادئ —
    // أسرع وأوضح وقت الكلام عشان يحس المستخدم إن مشاري "يتفاعل" مو بس يقف
    const waveWindow = Math.max(0, 1 - t / 3);
    const wave = Math.sin(t * (speaking ? 5 : 3.4)) * (0.55 * waveWindow + (speaking ? 0.12 : 0.05));
    if (rightArmRef.current) rightArmRef.current.rotation.z = -0.6 + wave;
    if (leftArmRef.current) leftArmRef.current.rotation.z = 0.6 + Math.sin(t * 1.6 + 1) * 0.04;
  });

  return (
    <group ref={groupRef} position={[0, BODY_Y, -0.1]}>
      <mesh geometry={torsoGeometry}>
        <meshPhysicalMaterial
          color={GOLD}
          metalness={0.5}
          roughness={0.3}
          transparent
          opacity={0.82}
          emissive={GOLD}
          emissiveIntensity={0.22}
        />
      </mesh>
      <group ref={leftArmRef} position={[-0.28, 0.14, 0.06]}>
        <mesh geometry={armGeometry} position={[0, -0.1, 0]}>
          <meshPhysicalMaterial
            color={GOLD_LIGHT}
            metalness={0.5}
            roughness={0.3}
            transparent
            opacity={0.85}
            emissive={GOLD}
            emissiveIntensity={0.28}
          />
        </mesh>
      </group>
      <group ref={rightArmRef} position={[0.28, 0.14, 0.06]}>
        <mesh geometry={armGeometry} position={[0, -0.1, 0]}>
          <meshPhysicalMaterial
            color={GOLD_LIGHT}
            metalness={0.5}
            roughness={0.3}
            transparent
            opacity={0.85}
            emissive={GOLD}
            emissiveIntensity={0.25}
          />
        </mesh>
      </group>
    </group>
  );
}

/** موجات دائرية تنطلق من الشعار — تظهر واحدة جديدة كل ما اكتشفنا "نبرة"
    جديدة بالصوت (قفزة بشدة الصوت فوق متوسطها الأخير)، وتتمدد وتخفت
    بسلاسة، بدل معادل صوت تقليدي بأعمدة حادة */
function RippleField({ speaking }: { speaking: boolean }) {
  const meshRefs = useRef<(Mesh | null)[]>([]);
  const birth = useRef<number[]>(Array(RIPPLE_COUNT).fill(-Infinity));
  const nextIndex = useRef(0);
  const smoothedAmp = useRef(0);
  const ampHistory = useRef<number[]>(Array(14).fill(0));
  const lastTrigger = useRef(0);
  const fakePhase = useRef(0);
  const geometry = useMemo(() => new TorusGeometry(1, 0.045, 12, 72), []);

  useFrame((state, delta) => {
    const nowMs = state.clock.elapsedTime * 1000;
    const amp = readAmplitude(speaking, fakePhase, delta);
    smoothedAmp.current += (amp - smoothedAmp.current) * 0.3;

    ampHistory.current.shift();
    ampHistory.current.push(smoothedAmp.current);
    const avg = ampHistory.current.reduce((a, b) => a + b, 0) / ampHistory.current.length;

    const onset = speaking && smoothedAmp.current > avg + 0.08 && smoothedAmp.current > 0.16;
    if (onset && nowMs - lastTrigger.current > 210) {
      lastTrigger.current = nowMs;
      birth.current[nextIndex.current] = nowMs;
      nextIndex.current = (nextIndex.current + 1) % RIPPLE_COUNT;
    }

    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const age = nowMs - birth.current[i];
      if (age < 0 || age > RIPPLE_LIFETIME_MS) {
        mesh.visible = false;
        return;
      }
      mesh.visible = true;
      const p = age / RIPPLE_LIFETIME_MS;
      mesh.scale.setScalar((1.15 + p * 2.6) * BASE_SCALE);
      const mat = mesh.material as MeshBasicMaterial;
      mat.opacity = (1 - p) * 0.45;
    });
  });

  return (
    <>
      {Array.from({ length: RIPPLE_COUNT }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            meshRefs.current[i] = el;
          }}
          geometry={geometry}
          rotation={[0.18, 0, 0]}
          visible={false}
        >
          <meshBasicMaterial color={GOLD_LIGHT} transparent opacity={0} />
        </mesh>
      ))}
    </>
  );
}

/** حقل طاقة خفيف دايم الحضور حول الشعار — موجود حتى بدون كلام، يعطي
    إحساس "مجال" مو فراغ تام، ويلتف ببطء بمحاور مختلفة لعمق مكاني بسيط */
function AmbientField() {
  const ringA = useRef<Mesh>(null);
  const ringB = useRef<Mesh>(null);
  const geometry = useMemo(() => new TorusGeometry(1, 0.008, 8, 90), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ringA.current) {
      ringA.current.rotation.z = t * 0.05;
      ringA.current.rotation.x = 0.3 + Math.sin(t * 0.2) * 0.08;
      const s = (1.9 + Math.sin(t * 0.4) * 0.08) * BASE_SCALE;
      ringA.current.scale.setScalar(s);
    }
    if (ringB.current) {
      ringB.current.rotation.z = -t * 0.035;
      ringB.current.rotation.x = -0.35 + Math.cos(t * 0.18) * 0.1;
      const s = (2.4 + Math.cos(t * 0.33) * 0.1) * BASE_SCALE;
      ringB.current.scale.setScalar(s);
    }
  });

  return (
    <>
      <mesh ref={ringA} geometry={geometry}>
        <meshBasicMaterial color={GOLD_LIGHT} transparent opacity={0.16} />
      </mesh>
      <mesh ref={ringB} geometry={geometry}>
        <meshBasicMaterial color={GOLD} transparent opacity={0.1} />
      </mesh>
    </>
  );
}

/** "يطلع من الظلام" — المجموعة كاملة تبدأ صغيرة وشفافة وتكبر بسلاسة لحجمها
    الطبيعي أول ما يفتح المشهد، بدل ما تظهر فجأة بحجمها الكامل */
function EntranceGroup({ children }: { children: React.ReactNode }) {
  const ref = useRef<Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = Math.min(state.clock.elapsedTime / ENTRANCE_DURATION, 1);
    const eased = easeOutCubic(t);
    ref.current.scale.setScalar(0.35 + eased * 0.65);
  });
  return (
    <group position={[0, LOGO_Y, 0]}>
      <group ref={ref}>{children}</group>
    </group>
  );
}

/** تفاعل خفيف جدًا مع الماوس — الكاميرا تنجرف بلطف نحو موضع المؤشر،
    يعطي إحساس عمق بدون ما يصير مبالغ فيه أو يشتت الانتباه عن الشعار */
function ParallaxCamera() {
  useFrame((state) => {
    const x = state.pointer.x * 0.28;
    const y = state.pointer.y * 0.18;
    state.camera.position.x += (x - state.camera.position.x) * 0.05;
    state.camera.position.y += (-y - state.camera.position.y) * 0.05;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

/** المشهد الكامل — الشعار وحده هو العنصر البصري الرئيسي وسط الشاشة، يتنفس
    ويتفاعل مع الصوت الحقيقي، بدون أي بطاقة أو خلفية UI حوله */
export default function VoiceLogoScene({ speaking }: { speaking: boolean }) {
  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reducedMotion) return null;

  return (
    <div className="pointer-events-none absolute inset-0">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 4.3], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <pointLight position={[3, 2, 4]} intensity={75} color={GOLD_LIGHT} />
          <pointLight position={[-3, -2, -2]} intensity={25} color="#ffffff" />
          <pointLight position={[0, -2, 3]} intensity={15} color={GOLD} />
          <LocalEnvironment />
          <EntranceGroup>
            <SpeakingLogo speaking={speaking} />
            <MascotBody speaking={speaking} />
            <RippleField speaking={speaking} />
            <AmbientField />
          </EntranceGroup>
          <Sparkles
            count={70}
            scale={6}
            size={1.6}
            speed={speaking ? 0.5 : 0.25}
            color={GOLD_LIGHT}
            opacity={0.4}
          />
          <ParallaxCamera />
        </Suspense>
      </Canvas>
    </div>
  );
}
