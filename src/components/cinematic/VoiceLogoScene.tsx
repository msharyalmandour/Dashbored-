import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import {
  BoxGeometry,
  CapsuleGeometry,
  SphereGeometry,
  TorusGeometry,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
} from "three";
import { GOLD, GOLD_LIGHT, LocalEnvironment } from "./Scene3D";
import { getSpeechAnalyser } from "../../lib/speech";

const FACE_DARK = "#1c1206";

const ENTRANCE_DURATION = 1.3;
const MASCOT_Y = 0.02;
const RIPPLE_COUNT = 6;
const RIPPLE_LIFETIME_MS = 1150;

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/** يرجّع شدة الصوت اللحظية [0..1] — طيف حقيقي وقت صوت AI، أو نبضة اصطناعية
    ناعمة (مجموع موجات جيبية) وقت صوت المتصفح الاحتياطي اللي ما فيه تحليل
    طيف متاح له، عشان مشاري يفضل "حي" بأي الحالتين */
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

/** مشاري نفسه — شخصية وحدة كاملة (رأس، عينين، فم يتكلم، جذع، وذراعين)
    بدل شعار عائم. الرأس والجذع بنفس المادة الذهبية، والفم يتحرك فعليًا
    حسب شدة الصوت (مو حركة عشوائية)، والذراعين يلوّحون بالدخول وبعدين
    يتفاعلون بإيماءات خفيفة أثناء الكلام، زي شخص يشرح بيديه */
function Mascot({ speaking }: { speaking: boolean }) {
  const groupRef = useRef<Group>(null);
  const headRef = useRef<Mesh>(null);
  const mouthRef = useRef<Mesh>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const headMaterialRef = useRef<any>(null);
  const leftEyeRef = useRef<Mesh>(null);
  const rightEyeRef = useRef<Mesh>(null);
  const leftArmRef = useRef<Group>(null);
  const rightArmRef = useRef<Group>(null);

  const smoothedAmp = useRef(0);
  const fakePhase = useRef(0);
  const blinkStart = useRef(2 + Math.random() * 2);

  const headGeometry = useMemo(() => new SphereGeometry(0.34, 32, 32), []);
  const eyeGeometry = useMemo(() => new SphereGeometry(0.035, 16, 16), []);
  const mouthGeometry = useMemo(() => new BoxGeometry(0.1, 0.036, 0.024), []);
  const torsoGeometry = useMemo(() => new CapsuleGeometry(0.16, 0.3, 8, 16), []);
  const armGeometry = useMemo(() => new CapsuleGeometry(0.04, 0.24, 6, 12), []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const amp = readAmplitude(speaking, fakePhase, delta);
    smoothedAmp.current += (amp - smoothedAmp.current) * 0.22;
    const amount = smoothedAmp.current;

    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.25) * 0.06 + state.pointer.x * 0.05;
    }

    // الرأس ينبض بخفة ويميل نحو الماوس شوي، زي شخص يتابعك بنظره
    if (headRef.current) {
      const breathe = 1 + Math.sin(t * 1.3) * 0.014;
      headRef.current.scale.setScalar(breathe);
      headRef.current.rotation.x = Math.sin(t * 0.3) * 0.06 + state.pointer.y * 0.08;
      headRef.current.rotation.y = Math.cos(t * 0.25) * 0.05 + state.pointer.x * 0.1;
    }
    if (headMaterialRef.current) {
      headMaterialRef.current.emissiveIntensity = 0.35 + amount * 0.6;
    }

    // فم يتكلم فعليًا — يتوسّع طول وعرض حسب شدة الصوت اللحظية، ويرجع خط
    // رفيع وهو ساكت بدل ما يفضل مفتوح أو مقفول بثبات
    if (mouthRef.current) {
      const openness = speaking ? 0.55 + amount * 2.8 : 0.55 + Math.sin(t * 1.1) * 0.08;
      mouthRef.current.scale.y = Math.max(0.4, openness);
      mouthRef.current.scale.x = 1 + amount * 0.12;
    }

    // رمشة خفيفة كل كم ثانية عشان يحس المستخدم إنه "حي" حتى وهو ساكت
    const BLINK_DURATION = 0.14;
    const sinceBlink = t - blinkStart.current;
    let eyeScale = 1;
    if (sinceBlink >= 0 && sinceBlink < BLINK_DURATION) {
      const phase = sinceBlink / BLINK_DURATION;
      const closeAmount = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
      eyeScale = 1 - closeAmount * 0.85;
    } else if (sinceBlink >= BLINK_DURATION) {
      blinkStart.current = t + 2.5 + Math.random() * 3;
    }
    if (leftEyeRef.current) leftEyeRef.current.scale.y = eyeScale;
    if (rightEyeRef.current) rightEyeRef.current.scale.y = eyeScale;

    // تلويح ترحيب واضح أول 3 ثواني، وبعدها إيماءات محادثة خفيفة تتزامن
    // مع شدة الصوت — كل ذراع بطور مختلف عشان الحركة تبان طبيعية مو متطابقة
    const waveWindow = Math.max(0, 1 - t / 3);
    const entranceWave = Math.sin(t * 5) * 0.6 * waveWindow;
    const rightGesture = speaking ? Math.sin(t * 5.2) * amount * 0.45 : Math.sin(t * 1.5) * 0.04;
    const leftGesture = speaking ? Math.sin(t * 4.4 + 1.6) * amount * 0.35 : Math.sin(t * 1.7 + 1) * 0.04;
    if (rightArmRef.current) rightArmRef.current.rotation.z = -0.55 + entranceWave + rightGesture;
    if (leftArmRef.current) leftArmRef.current.rotation.z = 0.55 + leftGesture;
  });

  return (
    <group ref={groupRef}>
      {/* الرأس */}
      <mesh ref={headRef} geometry={headGeometry} position={[0, 0.58, 0.02]}>
        <meshPhysicalMaterial
          ref={headMaterialRef}
          color={GOLD}
          metalness={0.5}
          roughness={0.25}
          emissive={GOLD}
          emissiveIntensity={0.35}
        />
        <mesh ref={leftEyeRef} geometry={eyeGeometry} position={[-0.115, 0.04, 0.29]}>
          <meshStandardMaterial color={FACE_DARK} roughness={0.4} metalness={0} />
        </mesh>
        <mesh ref={rightEyeRef} geometry={eyeGeometry} position={[0.115, 0.04, 0.29]}>
          <meshStandardMaterial color={FACE_DARK} roughness={0.4} metalness={0} />
        </mesh>
        <mesh ref={mouthRef} geometry={mouthGeometry} position={[0, -0.11, 0.315]}>
          <meshStandardMaterial color={FACE_DARK} roughness={0.4} metalness={0} />
        </mesh>
      </mesh>

      {/* الجذع */}
      <mesh geometry={torsoGeometry}>
        <meshPhysicalMaterial
          color={GOLD}
          metalness={0.5}
          roughness={0.3}
          transparent
          opacity={0.85}
          emissive={GOLD}
          emissiveIntensity={0.22}
        />
      </mesh>

      {/* الذراعين */}
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

/** موجات دائرية تنطلق من مشاري — تظهر واحدة جديدة كل ما اكتشفنا "نبرة"
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
      mesh.scale.setScalar(0.55 + p * 1.1);
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
          position={[0, 0.3, 0]}
          rotation={[0.18, 0, 0]}
          visible={false}
        >
          <meshBasicMaterial color={GOLD_LIGHT} transparent opacity={0} />
        </mesh>
      ))}
    </>
  );
}

/** حقل طاقة خفيف دايم الحضور حول مشاري — موجود حتى بدون كلام، يعطي
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
      ringA.current.scale.setScalar(0.85 + Math.sin(t * 0.4) * 0.04);
    }
    if (ringB.current) {
      ringB.current.rotation.z = -t * 0.035;
      ringB.current.rotation.x = -0.35 + Math.cos(t * 0.18) * 0.1;
      ringB.current.scale.setScalar(1.05 + Math.cos(t * 0.33) * 0.05);
    }
  });

  return (
    <>
      <mesh ref={ringA} geometry={geometry} position={[0, 0.3, 0]}>
        <meshBasicMaterial color={GOLD_LIGHT} transparent opacity={0.16} />
      </mesh>
      <mesh ref={ringB} geometry={geometry} position={[0, 0.3, 0]}>
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
    <group position={[0, MASCOT_Y, 0]}>
      <group ref={ref}>{children}</group>
    </group>
  );
}

/** تفاعل خفيف جدًا مع الماوس — الكاميرا تنجرف بلطف نحو موضع المؤشر،
    يعطي إحساس عمق بدون ما يصير مبالغ فيه أو يشتت الانتباه عن مشاري */
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

/** المشهد الكامل — مشاري نفسه هو العنصر البصري الرئيسي وسط الشاشة، شخصية
    كاملة (رأس، عينين، فم يتكلم، جذع وذراعين) بدون أي بطاقة أو خلفية UI حوله */
export default function VoiceLogoScene({ speaking }: { speaking: boolean }) {
  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reducedMotion) return null;

  return (
    <div className="pointer-events-none absolute inset-0">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 3.4], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
        // نحدد document.body كهدف تانبت للأحداث بدل ديف R3F الداخلي — الديف
        // ذاك ممكن يكون لسا ما اتعلّق بالـ DOM لحظة اتصال الأحداث، وقتها
        // R3F يحاول يستدعي addEventListener على null وتنهار الصفحة كاملة
        eventSource={document.body}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <pointLight position={[3, 2, 4]} intensity={75} color={GOLD_LIGHT} />
          <pointLight position={[-3, -2, -2]} intensity={25} color="#ffffff" />
          <pointLight position={[0, -2, 3]} intensity={15} color={GOLD} />
          <LocalEnvironment />
          <EntranceGroup>
            <Mascot speaking={speaking} />
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
