import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

class HofstadterSequences {
  private aCache: number[] = [];
  private qCache: number[] = [];

  constructor() {
    this.aCache[1] = 1;
    this.aCache[2] = 1;
    this.aCache[3] = 2;
    
    this.qCache[1] = 2;
    this.qCache[2] = 2;
    this.qCache[3] = 1;
  }

  a(n: number): number {
    if (n <= 0) return 0;
    if (this.aCache[n] !== undefined) return this.aCache[n];
    const value = this.a(this.a(n - 1)) + this.a(n - this.a(n - 1));
    this.aCache[n] = value;
    return value;
  }

  Q(n: number): number {
    if (n <= 0) return 0;
    if (this.qCache[n] !== undefined) return this.qCache[n];
    const value = this.Q(n - this.Q(n - 1)) + this.Q(n - this.Q(n - 2));
    this.qCache[n] = value;
    return value;
  }

  difference(n: number): number {
    return this.a(n) - this.Q(n);
  }
}

class HofstadterHeartReal3D {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private sequences: HofstadterSequences;

  private readonly N_MAX = 1e4 + 750;
  private readonly STEP = 1;

  private heartPoints!: THREE.Points;
  private time = 0; // for twinkling

  constructor(container: HTMLElement) {
    this.sequences = new HofstadterSequences();
    this.initScene(container);
    this.setupControls();
    this.generatePureHofstadterHeart();
    this.addStarfield();                // new: galaxy background stars
    this.animate();
  }

  private initScene(container: HTMLElement): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000008); // deep space black-blue

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      10000
    );
    this.camera.position.set(200, 150, 300);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    // Lighting – keep your original, but add a subtle pink glow
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffaacc, 0.8);
    directional.position.set(100, 200, 100);
    this.scene.add(directional);

    // Cosmic fog for depth
    this.scene.fog = new THREE.FogExp2(0x000008, 0.0008);

    // Optional: keep your grid/axes if you like, or comment them out for pure space
    // const grid = new THREE.GridHelper(500, 20, 0x333333, 0x1a1a1a);
    // this.scene.add(grid);
    // const axes = new THREE.AxesHelper(100);
    // this.scene.add(axes);
  }

  private generatePureHofstadterHeart(): void {
    const vertices: number[] = [];
    const colors: number[] = [];

    const aValues: number[] = new Array(this.N_MAX + 1);
    const qValues: number[] = new Array(this.N_MAX + 1);

    for (let n = 1; n <= this.N_MAX; n++) {
      aValues[n] = this.sequences.a(n);
      qValues[n] = this.sequences.Q(n);
    }

    for (let n = 1; n <= this.N_MAX; n += this.STEP) {
      const diff = aValues[n] - qValues[n];

      const x = (n - this.N_MAX / 2) * 0.03;
      const y = diff * 0.125;

      let z = 0;
      if (n > 10) {
        const localPattern = Math.abs(aValues[n] - aValues[n-5]) +
                            Math.abs(qValues[n] - qValues[n-5]);
        z = localPattern * 0.1;
      }

      if (Math.abs(x) > 200 || Math.abs(y) > 100 || Math.abs(z) > 50) continue;

      vertices.push(x, y, z);

      const correlation = Math.abs(diff) / (aValues[n] + qValues[n] + 1);
      const color = new THREE.Color();
      if (correlation < 0.3) {
        color.setHSL(0.95, 0.9, 0.6); // Pink
      } else {
        color.setHSL(0.6, 0.7, 0.5); // Blue
      }
      colors.push(color.r, color.g, color.b);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 3.0,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });

    this.heartPoints = new THREE.Points(geometry, material);
    this.scene.add(this.heartPoints);

    this.autoFindHeartView(geometry);
  }

 private addStarfield(): void {
    const starCount = 12000;
    const starVerts: number[] = [];
    const starColors: number[] = [];

    for (let i = 0; i < starCount; i++) {
      const r = 3000 + Math.random() * 5000; // far away
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      starVerts.push(x, y, z);

      const brightness = 0.6 + Math.random() * 0.4;
      starColors.push(brightness, brightness * 0.9, brightness); // slight blue tint
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));

    const material = new THREE.PointsMaterial({
      size: 4,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });

    const stars = new THREE.Points(geometry, material);
    this.scene.add(stars);
  }

  private autoFindHeartView(geometry: THREE.BufferGeometry): void {
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    if (!box) return;

    const center = new THREE.Vector3();
    box.getCenter(center);

    const maxDim = Math.max(
      box.max.x - box.min.x,
      box.max.y - box.min.y,
      box.max.z - box.min.z
    );
    const distance = maxDim * 3;

    this.camera.position.set(
      center.x + distance * 0.7,
      center.y + distance * 0.3,
      center.z + distance * 0.5
    );
    this.controls.target.copy(center);
    this.controls.update();
  }

  private setupControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.5;

    window.addEventListener('keydown', (e) => {
      switch (e.key.toLowerCase()) {
        case 't': this.camera.position.set(0, 200, 300); break;
        case 's': this.camera.position.set(300, 0, 0); break;
        case 'f': this.camera.position.set(0, 0, 400); break;
        case 'r': this.camera.position.set(200, 150, 300); break;
        case ' ': this.controls.autoRotate = !this.controls.autoRotate; break;
      }
      this.controls.target.set(0, 0, 0);
      this.controls.update();
    });

    // Fix: use the container from renderer
    window.addEventListener('resize', () => {
      const container = this.renderer.domElement.parentElement;
      if (!container) return;
      this.camera.aspect = container.clientWidth / container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(container.clientWidth, container.clientHeight);
    });
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    this.time += 0.015;

    // Gentle twinkling for galaxy feel (your heart points will sparkle)
    if (this.heartPoints) {
      const mat = this.heartPoints.material as THREE.PointsMaterial;
      mat.size = 3.0 + Math.sin(this.time * 4) * 0.6;
      mat.needsUpdate = true;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };
}

function init() {
  const container = document.getElementById('app');
  if (!container) return;

  container.style.width = '100vw';
  container.style.height = '100vh';
  container.style.overflow = 'hidden';
  container.style.background = 'linear-gradient(135deg, #000008 0%, #001122 100%)';

  // Updated overlay with galaxy colors
  const info = document.createElement('div');
  info.innerHTML = `
    <div style="
      position: absolute; top: 20px; left: 20px;
      color: white; background: rgba(0,0,0,0.85);
      padding: 20px; border-radius: 15px; z-index: 100;
      font-family: 'Arial', sans-serif; border: 2px solid #ff66ff;
      max-width: 350px; backdrop-filter: blur(10px);
      box-shadow: 0 0 30px rgba(255,102,255,0.4);
    ">
      <h2 style="margin: 0 0 15px 0; color: #ff66ff; text-align: center;">
        💖 Hofstadter Chaotic Heart Galaxy
      </h2>
      <div style="font-size: 14px; line-height: 1.6;">
        <p><strong>The Mathematical Heart:</strong></p>
        <p style="color: #aaa; font-size: 12px; font-family: monospace;">
          a(n) = a(a(n-1)) + a(n-a(n-1))<br>
          Q(n) = Q(n-Q(n-1)) + Q(n-Q(n-2))
        </p>
        <p><strong>View Controls:</strong></p>
        <p style="margin: 5px 0;">
          <span style="color: #ff66ff">T</span> = Heart View<br>
          <span style="color: #ff66ff">S</span> = Side View<br>
          <span style="color: #ff66ff">F</span> = Front View<br>
          <span style="color: #ff66ff">R</span> = Reset View<br>
          <span style="color: #ff66ff">Space</span> = Toggle Rotation
        </p>
        <p style="margin-top: 15px; font-size: 12px; color: #aaa;">
          A glowing heart nebula in the cosmic void
        </p>
      </div>
    </div>
  `;
  container.appendChild(info);

  // Loading screen (optional – keep or remove)
  const loading = document.createElement('div');
  loading.innerHTML = `
    <div style="
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      color: #ff66ff; text-align: center;
      font-family: 'Arial', sans-serif;
    ">
      <div style="font-size: 24px; margin-bottom: 20px;">
        ✨ Forging Chaotic Heart Nebula ✨
      </div>
      <div style="font-size: 14px; color: #aaa;">
        Calculating recursive sequences...
      </div>
    </div>
  `;
  container.appendChild(loading);

  setTimeout(() => {
    loading.style.opacity = '0';
    loading.style.transition = 'opacity 1s';
    setTimeout(() => container.removeChild(loading), 1000);

    new HofstadterHeartReal3D(container);
  }, 500);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}