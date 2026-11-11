// استيراد من three/src مباشرة: قطعة لحالها فيها بس اللي نحتاجه (≤ 150KB gzip)،
// بدل حزمة three الكاملة المشتركة مع مشاهد صفحة الهبوط
import { WebGLRenderer } from "three/src/renderers/WebGLRenderer.js";
import { Scene } from "three/src/scenes/Scene.js";
import { PerspectiveCamera } from "three/src/cameras/PerspectiveCamera.js";
import { Group } from "three/src/objects/Group.js";
import { Mesh } from "three/src/objects/Mesh.js";
import { AmbientLight } from "three/src/lights/AmbientLight.js";
import { DirectionalLight } from "three/src/lights/DirectionalLight.js";
import { MeshBasicMaterial } from "three/src/materials/MeshBasicMaterial.js";
import { MeshStandardMaterial } from "three/src/materials/MeshStandardMaterial.js";
import { MeshPhysicalMaterial } from "three/src/materials/MeshPhysicalMaterial.js";
import { PlaneGeometry } from "three/src/geometries/PlaneGeometry.js";
import { BufferGeometry } from "three/src/core/BufferGeometry.js";
import { BufferAttribute } from "three/src/core/BufferAttribute.js";
import { CanvasTexture } from "three/src/textures/CanvasTexture.js";
import { Color } from "three/src/math/Color.js";
import { ACESFilmicToneMapping, AdditiveBlending, DoubleSide, SRGBColorSpace } from "three/src/constants.js";
import { Sprite } from "three/src/objects/Sprite.js";
import { SpriteMaterial } from "three/src/materials/SpriteMaterial.js";

/** قارئ GLB صغير لهذا الملف بالذات (٣ أجزاء: مواقع + فهارس، بدون نسيج ولا حركة) — بدل GLTFLoader الكامل */
async function loadVesselGlb(url: string): Promise<{ name: string; geometry: BufferGeometry }[]> {
  const buf = await (await fetch(url)).arrayBuffer();
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error("not glb");
  const jsonLen = dv.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jsonLen)));
  const binStart = 20 + jsonLen + 8;
  const accessor = (i: number) => {
    const a = json.accessors[i];
    const v = json.bufferViews[a.bufferView];
    const off = binStart + (v.byteOffset ?? 0) + (a.byteOffset ?? 0);
    const n = a.count * ({ SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 } as Record<string, number>)[a.type];
    const Typed = a.componentType === 5126 ? Float32Array : a.componentType === 5125 ? Uint32Array : a.componentType === 5123 ? Uint16Array : Uint8Array;
    return { array: new Typed(buf.slice(off, off + n * Typed.BYTES_PER_ELEMENT)), size: n / a.count };
  };
  return (json.nodes as { name: string; mesh?: number }[])
    .filter((n) => n.mesh !== undefined)
    .map((n) => {
      const prim = json.meshes[n.mesh!].primitives[0];
      const g = new BufferGeometry();
      const pos = accessor(prim.attributes.POSITION);
      g.setAttribute("position", new BufferAttribute(pos.array, 3));
      if (prim.attributes.NORMAL !== undefined) g.setAttribute("normal", new BufferAttribute(accessor(prim.attributes.NORMAL).array, 3));
      if (prim.indices !== undefined) g.setIndex(new BufferAttribute(accessor(prim.indices).array, 1));
      if (prim.attributes.NORMAL === undefined) g.computeVertexNormals();
      return { name: n.name, geometry: g };
    });
}

/* الوعاء الـ 3D (design-reference/3d/README.md):
   Obsidian #090706 خشونة .38 + clearcoat .6 · EmberInner #2E0F02 يضيء #FF6B00 (1 → 2.2) · MoltenCore يضيء #FFC777 حسب glow.
   ضوء دافي 2700K من فوق يمين 35° · حافة برتقالية #FF9A3C من ورا · ambient .08 · ظل تلامس مزيف ·
   كاميرا FOV 30° ارتفاع 22° · ACES + sRGB + خلفية شفافة · parallax ±3° (lerp .08) بس مع وجود المؤشر، بدون دوران تلقائي.
   يرسم بس لما فيه تغيير، ويوقف لما يطلع من الشاشة أو التبويب مخفي. */

// ضوضاء قيمية ثلاثية الأبعاد صغيرة (للعروق والحرارة) — بدل نسيج صور
const NOISE = /* glsl */ `
varying vec3 vLocal;
float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float n3(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ float v = 0.0; float a = 0.5; for (int k = 0; k < 4; k++) { v += a * n3(p); p *= 2.07; a *= 0.5; } return v; }
`;

/** يضيف vLocal (موقع الرأس بإحداثيات الجسم) للمادة، ويحقن كود اللون */
let shadeId = 0;
function shade(mat: MeshStandardMaterial, fragment: string, extraUniforms: Record<string, { value: number }> = {}) {
  // كل مادة لها برنامج لحالها (three يخبّي البرامج حسب نص onBeforeCompile، وهو نفسه للثلاث)
  const key = `vessel-${shadeId++}`;
  mat.customProgramCacheKey = () => key;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, extraUniforms);
    const decl = Object.keys(extraUniforms).map((k) => `uniform float ${k};`).join("\n");
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vLocal;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvLocal = position;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>\n${NOISE}\n${decl}`).replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\n${fragment}`);
  };
}

export type SceneState = "idle" | "hover" | "reading" | "done" | "dim";

const GLOW: Record<SceneState, number> = { idle: 0.35, hover: 1, reading: 0.8, done: 0.3, dim: 0.15 };
const DEG = Math.PI / 180;
const TAU = 0.12; // ≈ .45s للوصول

/** لهب ناعم يطلع من الوعاء (ملصق مضاف) — شدته من glow */
function plumeTexture(): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 112, 2, 32, 96, 92);
  grad.addColorStop(0, "rgba(255,231,176,1)");
  grad.addColorStop(0.25, "rgba(255,150,40,0.55)");
  grad.addColorStop(1, "rgba(255,90,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 128);
  return new CanvasTexture(c);
}

function contactShadow(): Mesh {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(0,0,0,0.7)");
  grad.addColorStop(0.55, "rgba(0,0,0,0.35)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new CanvasTexture(c);
  const m = new Mesh(new PlaneGeometry(0.42, 0.42), new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.001;
  return m;
}

export class VesselScene {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(30, 1, 0.01, 10);
  private rig = new Group();
  private ember = new MeshStandardMaterial({ color: new Color("#2E0F02"), roughness: 0.55, emissive: new Color("#FF6B00"), emissiveIntensity: 1, side: DoubleSide });
  private core = new MeshStandardMaterial({ color: new Color("#3A1A05"), roughness: 0.9, emissive: new Color("#FFC777"), emissiveIntensity: 1, side: DoubleSide });
  private obsidian = new MeshPhysicalMaterial({ color: new Color("#090706"), roughness: 0.38, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.25 });
  private uGlow = { value: GLOW.idle };
  private plume = new SpriteMaterial({ map: plumeTexture(), color: new Color("#FF8A24"), blending: AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 });
  private glow = GLOW.idle;
  private target = GLOW.idle;
  private state: SceneState = "idle";
  private pulseStart = 0;
  private tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  private raf = 0;
  private last = 0;
  private running = false;
  private visible = true;
  private io: IntersectionObserver;
  private ro: ResizeObserver;
  private disposed = false;
  private onReady?: () => void;

  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement, onReady?: () => void) {
    this.canvas = canvas;
    this.onReady = onReady;
    // حجر Obsidian: عروق خفيفة + توهّج برتقالي على الحواف (fresnel)
    shade(
      this.obsidian,
      `float f = fbm(vLocal * 16.0 + vec3(0.0, vLocal.y * 9.0, 0.0));
       float vein = 1.0 - smoothstep(0.0, 0.035, abs(f - 0.5));
       float fine = 1.0 - smoothstep(0.0, 0.02, abs(fbm(vLocal * 41.0) - 0.5));
       diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.19, 0.17, 0.16), clamp(vein * 0.6 + fine * 0.25, 0.0, 1.0));
       float fr = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 3.0);
       float lip = smoothstep(0.1128, 0.1158, vLocal.y);
       totalEmissiveRadiance += vec3(1.0, 0.42, 0.0) * fr * (0.08 + 0.3 * uGlow)
         + vec3(1.0, 0.62, 0.25) * lip * (0.2 + 0.7 * uGlow)
         + vec3(1.0, 0.35, 0.0) * vein * smoothstep(0.06, 0.11, vLocal.y) * 0.25 * uGlow;`,
      { uGlow: this.uGlow },
    );
    // الجدار الداخلي: أحرّ تحت عند اللب، وحرارة متقطعة بالضوضاء
    shade(
      this.ember,
      `float depth = 1.0 - smoothstep(0.02, 0.105, vLocal.y);
       float heat = 0.3 + 0.7 * fbm(vLocal * 30.0);
       float crack = 1.0 - smoothstep(0.0, 0.03, abs(fbm(vLocal * 18.0) - 0.5));
       totalEmissiveRadiance *= (0.03 + 0.62 * depth * depth) * heat + crack * 0.22 * (1.0 - depth * 0.7);
       diffuseColor.rgb *= 0.4;`,
    );
    shade(
      this.core,
      `float r = clamp(length(vLocal.xz) / 0.098, 0.0, 1.0);
       vec3 hot = mix(vec3(1.0, 0.62, 0.26), vec3(0.85, 0.22, 0.0), smoothstep(0.0, 0.8, r));
       totalEmissiveRadiance = hot * emissive.r * mix(0.85, 0.2, r) * (0.6 + 0.8 * fbm(vLocal * 45.0));
       diffuseColor.rgb *= 0.08;`,
    );

    this.renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.setClearColor(0x000000, 0);

    // الكاميرا: ارتفاع 22° تطالع وسط الوعاء
    const d = 0.6;
    this.camera.position.set(0, 0.052 + d * Math.sin(22 * DEG), d * Math.cos(22 * DEG));
    this.camera.lookAt(0, 0.052, 0);

    this.scene.add(new AmbientLight(0xffffff, 0.08));
    const key = new DirectionalLight(new Color("#FFA757"), 3.6); // ≈ 2700K
    key.position.set(Math.cos(35 * DEG), Math.sin(35 * DEG) * 1.4, 0.6);
    this.scene.add(key);
    const rim = new DirectionalLight(new Color("#FF9A3C"), 3.2);
    rim.position.set(0, 0.35, -1);
    this.scene.add(rim);

    this.rig.add(contactShadow());
    const plume = new Sprite(this.plume);
    plume.scale.set(0.3, 0.26, 1);
    plume.position.set(0, 0.155, -0.01);
    this.rig.add(plume);
    this.scene.add(this.rig);

    void loadVesselGlb("/drop/wesync-ember-vessel.glb")
      .then((parts) => {
        if (this.disposed) return parts.forEach((p) => p.geometry.dispose());
        for (const p of parts) this.rig.add(new Mesh(p.geometry, p.name === "vessel_inner" ? this.ember : p.name === "molten_core" ? this.core : this.obsidian));
        this.applyGlow();
        this.kick();
        this.onReady?.();
      })
      .catch((e) => {
        // الملف ما وصل: يبقى البوستر
        console.warn("vessel glb:", e instanceof Error ? e.message : e);
      });

    this.io = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      this.kick();
    });
    this.io.observe(canvas);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    document.addEventListener("visibilitychange", this.kick);
    window.addEventListener("pointermove", this.onPointer, { passive: true });
    document.documentElement.addEventListener("pointerleave", this.onLeave);
    this.resize();
  }

  setState(s: SceneState) {
    if (s === this.state) return;
    this.state = s;
    this.target = GLOW[s];
    if (s === "reading") this.pulseStart = performance.now();
    this.kick();
  }

  private onPointer = (e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    const r = this.canvas.getBoundingClientRect();
    const nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)));
    const ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)));
    this.tilt.ty = nx * 3 * DEG;
    this.tilt.tx = ny * 3 * DEG;
    this.kick();
  };
  private onLeave = () => {
    this.tilt.tx = this.tilt.ty = 0;
    this.kick();
  };

  private resize() {
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.kick();
  }

  private applyGlow() {
    // ACES يحرق الأبيض بسرعة: نخلي اللب كهرماني (أقصاه 1.1 عند glow=1)
    this.core.emissiveIntensity = 0.4 + this.glow * 0.9;
    this.uGlow.value = this.glow;
    this.plume.opacity = Math.max(0, (this.glow - 0.3) / 0.7) * 0.85;
    this.ember.emissiveIntensity = 0.6 + this.glow * 1.4;
  }

  /** يشغّل الحلقة لو فيه شي يتحرك (ولو الوعاء ظاهر والتبويب مفتوح) */
  private kick = () => {
    if (this.disposed || this.running || !this.visible || document.hidden) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  };

  private frame = (now: number) => {
    if (this.disposed) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    // يقرا: ٣ نبضات .6 ↔ 1 (٠٫٨ث لكل نبضة) وبعدها يثبت على .8
    let target = this.target;
    let pulsing = false;
    if (this.state === "reading") {
      const t = (now - this.pulseStart) / 800;
      if (t < 3) {
        target = 0.8 - 0.2 * Math.cos(t * Math.PI * 2);
        pulsing = true;
      }
    }
    const k = pulsing ? 1 : 1 - Math.exp(-dt / TAU);
    this.glow += (target - this.glow) * k;
    this.tilt.x += (this.tilt.tx - this.tilt.x) * 0.08;
    this.tilt.y += (this.tilt.ty - this.tilt.y) * 0.08;
    this.rig.rotation.set(this.tilt.x, this.tilt.y, 0);
    this.applyGlow();
    this.renderer.render(this.scene, this.camera);
    const settled = !pulsing && Math.abs(target - this.glow) < 0.002 && Math.abs(this.tilt.tx - this.tilt.x) < 0.0005 && Math.abs(this.tilt.ty - this.tilt.y) < 0.0005;
    if (settled || !this.visible || document.hidden) {
      this.running = false;
      return;
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.io.disconnect();
    this.ro.disconnect();
    document.removeEventListener("visibilitychange", this.kick);
    window.removeEventListener("pointermove", this.onPointer);
    document.documentElement.removeEventListener("pointerleave", this.onLeave);
    this.scene.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      m.geometry.dispose();
      const mat = m.material as MeshBasicMaterial;
      mat.map?.dispose();
      mat.dispose();
    });
    [this.ember, this.core, this.obsidian].forEach((m) => m.dispose());
    this.plume.map?.dispose();
    this.plume.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
