/**
 * Cena 3D (carregada sob demanda com React.lazy, enquanto a abertura roda).
 *
 * - Mesa de madeira, luz quente de abajur e poeira flutuando.
 * - Livro fechado low-poly: contracapa, bloco de páginas, lombada e a capa,
 *   que gira numa dobradiça (pivot) na lombada.
 * - A capa abre com clique ou arraste. A animação de abrir/fechar é feita
 *   com GSAP; no fim, o livro HTML assume (o texto não é textura 3D).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { content } from '../lib/content';
import { flipSignal } from '../lib/flipSignal';
import * as tex from './textures';
import { DeskProps, LAMP_SHADE } from './props';

export type ScenePhase = 'intro' | 'cover' | 'opening' | 'reading' | 'closing';
export type Theme = 'claro' | 'sepia' | 'noturno';

interface Props {
  phase: ScenePhase;
  theme: Theme;
  particles: boolean;
  reducedMotion: boolean;
  onReady: () => void;
  onRequestOpen: () => void;
  onOpened: () => void;
  onClosed: () => void;
  /** 'front' = fecha pela capa (meio do livro); 'back' = chegou ao fim: fecha pela contracapa e vira. */
  closeMode: 'front' | 'back';
}

// Dimensões do livro (unidades da cena)
const BW = 3; // largura
const BH = 4.2; // altura (profundidade no eixo z, pois o livro está deitado)
const BOARD = 0.07; // espessura da capa
const BLOCK = 0.42; // espessura do bloco de páginas

const CAM_CLOSED = new THREE.Vector3(0, 6.2, 5.4);
const CAM_OPEN = new THREE.Vector3(0, 8.4, 1.2);

function Book({ phase, closeMode, reducedMotion, onRequestOpen, onOpened, onClosed, onTexturesReady }: Omit<Props, 'theme' | 'particles' | 'onReady'> & { onTexturesReady: () => void }) {
  const group = useRef<THREE.Group>(null);
  const hinge = useRef<THREE.Group>(null);
  const coverTopMat = useRef<THREE.MeshStandardMaterial>(null);
  const blockTopMat = useRef<THREE.MeshStandardMaterial>(null);
  const { camera, gl, size } = useThree();
  const [textures, setTextures] = useState<null | ReturnType<typeof makeTextures>>(null);

  // Em telas estreitas (celular em pé) a câmera se afasta para o livro caber
  const aspect = size.width / Math.max(1, size.height);
  const camClosed = useMemo(() => CAM_CLOSED.clone().multiplyScalar(Math.max(1, 0.8 / aspect)), [aspect]);
  const camOpen = useMemo(() => CAM_OPEN.clone().multiplyScalar(Math.max(1, 1.25 / aspect)), [aspect]);
  useEffect(() => {
    if (phase === 'intro' || phase === 'cover') camera.position.copy(camClosed);
    if (phase === 'reading') camera.position.copy(camOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camClosed, camOpen]);
  const hovered = useRef(false);
  const drag = useRef<{ x: number; angle: number } | null>(null);

  /* Texturas só depois das fontes (o título da capa usa IM Fell English) */
  useEffect(() => {
    let alive = true;
    const go = () => alive && setTextures(makeTextures());
    Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 4000))]).then(go, go);
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (textures) onTexturesReady();
  }, [textures, onTexturesReady]);

  /* Abrir / fechar */
  useEffect(() => {
    const g = group.current;
    const h = hinge.current;
    if (!g || !h) return;
    const d = reducedMotion ? 0.01 : 1;
    if (phase === 'opening') {
      g.visible = true;
      const tl = gsap.timeline({ onComplete: onOpened });
      tl.to(h.rotation, { z: Math.PI, duration: 1.5 * d, ease: 'power2.inOut' }, 0)
        .to(g.position, { x: BW / 2, duration: 1.5 * d, ease: 'power2.inOut' }, 0)
        .to(camera.position, { x: camOpen.x, y: camOpen.y, z: camOpen.z, duration: 1.7 * d, ease: 'power2.inOut' }, 0.1 * d);
      return () => void tl.kill();
    }
    if (phase === 'reading') {
      // O livro HTML está por cima; esconde o 3D para não aparecer nas bordas
      g.visible = false;
      h.rotation.z = Math.PI;
      g.position.x = BW / 2;
      camera.position.copy(camOpen);
    }
    if (phase === 'closing' && closeMode === 'back' && textures) {
      /*
       * Fim do livro: as páginas estão todas à esquerda e a contracapa à direita.
       * Truque: espelhamos o modelo (scale.x = -1), então a "capa" articulada
       * passa a fazer o papel da contracapa. Ela fecha da direita para a
       * esquerda e o livro fica de costas (capa para baixo). Depois ele se
       * levanta e vira no ar (rotação de -180° no eixo da lombada), caindo
       * com a capa para cima. O lado de baixo da contracapa tem a textura da
       * capa (coverFlip), por isso a troca final para o modelo normal é invisível.
       */
      const T = BOARD * 2 + BLOCK;
      g.visible = true;
      g.scale.x = -1;
      g.position.set(-BW / 2, 0, 0);
      g.rotation.set(0, 0, 0);
      h.rotation.z = Math.PI;
      if (coverTopMat.current) coverTopMat.current.map = textures.plain;
      if (blockTopMat.current) blockTopMat.current.map = textures.last;
      const restore = () => {
        g.scale.x = 1;
        g.rotation.set(0, 0, 0);
        g.position.set(0, 0, 0);
        h.rotation.z = 0;
        if (coverTopMat.current) coverTopMat.current.map = textures.cover;
        if (blockTopMat.current) blockTopMat.current.map = textures.first;
      };
      const flipAt = 1.45 * d;
      const tl = gsap.timeline({
        onComplete: () => {
          restore();
          onClosed();
        },
      });
      tl.to(h.rotation, { z: 0, duration: 1.25 * d, ease: 'power2.inOut' }, 0.15 * d)
        .to(camera.position, { x: camClosed.x, y: camClosed.y, z: camClosed.z, duration: 2.6 * d, ease: 'power2.inOut' }, 0)
        // Vira no ar: sobe, gira sobre a lombada e pousa no centro
        .to(g.rotation, { z: -Math.PI, duration: 1.4 * d, ease: 'power2.inOut' }, flipAt)
        .to(g.position, { x: 0, duration: 1.4 * d, ease: 'power2.inOut' }, flipAt)
        .to(g.position, { y: 1.7, duration: 0.7 * d, ease: 'power2.out' }, flipAt)
        .to(g.position, { y: T, duration: 0.7 * d, ease: 'power2.in' }, flipAt + 0.7 * d)
        // Pequeno "assentar" ao tocar a mesa
        .to(g.position, { y: T + 0.06, duration: 0.12 * d, ease: 'power1.out' })
        .to(g.position, { y: T, duration: 0.18 * d, ease: 'power1.in' });
      return () => {
        tl.kill();
        restore();
      };
    }
    if (phase === 'closing') {
      g.visible = true;
      const tl = gsap.timeline({ onComplete: onClosed });
      tl.to(h.rotation, { z: 0, duration: 1.3 * d, ease: 'power2.inOut' }, 0.15 * d)
        .to(g.position, { x: 0, duration: 1.3 * d, ease: 'power2.inOut' }, 0.15 * d)
        .to(camera.position, { x: camClosed.x, y: camClosed.y, z: camClosed.z, duration: 1.5 * d, ease: 'power2.inOut' }, 0);
      return () => void tl.kill();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, camera, reducedMotion, onOpened, onClosed, closeMode]);

  useFrame((state) => {
    camera.lookAt(0, 0, 0);
    const h = hinge.current;
    if (!h || phase !== 'cover' || drag.current) return;
    // Capa "respira" levemente ao passar o mouse (convite para abrir)
    const target = hovered.current ? 0.12 + Math.sin(state.clock.elapsedTime * 3) * 0.02 : 0;
    h.rotation.z += (target - h.rotation.z) * 0.12;
  });

  /* Arraste da capa */
  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (phase !== 'cover') return;
    e.stopPropagation();
    drag.current = { x: e.clientX, angle: 0 };
    const move = (ev: PointerEvent) => {
      if (!drag.current || !hinge.current) return;
      const dx = drag.current.x - ev.clientX; // arrastar para a esquerda abre
      drag.current.angle = Math.max(0, Math.min(1, dx / 260)) * Math.PI * 0.6;
      hinge.current.rotation.z = drag.current.angle;
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const d = drag.current;
      drag.current = null;
      if (!d) return;
      const click = Math.abs(d.x - ev.clientX) < 6;
      if (click || d.angle > Math.PI * 0.15) onRequestOpen();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const setCursor = (c: string) => (gl.domElement.style.cursor = c);

  if (!textures) return null;
  const { cover, coverFlip, plain, inner, edges, first } = textures;

  return (
    <group ref={group} position={[0, 0, 0]} visible={phase !== 'reading'}>
      {/* Contracapa (face de baixo com a capa: aparece depois da virada no fim do livro) */}
      <mesh position={[0, BOARD / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[BW + 0.08, BOARD, BH + 0.12]} />
        <meshStandardMaterial attach="material-0" map={plain} roughness={0.7} />
        <meshStandardMaterial attach="material-1" map={plain} roughness={0.7} />
        <meshStandardMaterial attach="material-2" map={plain} roughness={0.7} />
        <meshStandardMaterial attach="material-3" map={coverFlip} roughness={0.55} metalness={0.05} />
        <meshStandardMaterial attach="material-4" map={plain} roughness={0.7} />
        <meshStandardMaterial attach="material-5" map={plain} roughness={0.7} />
      </mesh>
      {/* Bloco de páginas: bordas listradas, topo com a primeira página */}
      <mesh position={[0.02, BOARD + BLOCK / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[BW - 0.04, BLOCK, BH - 0.04]} />
        <meshStandardMaterial attach="material-0" map={edges} roughness={0.9} />
        <meshStandardMaterial attach="material-1" map={edges} roughness={0.9} />
        <meshStandardMaterial ref={blockTopMat} attach="material-2" map={first} roughness={0.9} />
        <meshStandardMaterial attach="material-3" color="#efe3c6" />
        <meshStandardMaterial attach="material-4" map={edges} roughness={0.9} />
        <meshStandardMaterial attach="material-5" map={edges} roughness={0.9} />
      </mesh>
      {/* Lombada */}
      <mesh position={[-BW / 2 - 0.04, BOARD + BLOCK / 2, 0]} castShadow>
        <boxGeometry args={[0.1, BLOCK + BOARD * 2, BH + 0.12]} />
        <meshStandardMaterial map={plain} roughness={0.6} />
      </mesh>
      {/* Capa: o grupo "hinge" fica na lombada e gira em z para abrir */}
      <group ref={hinge} position={[-BW / 2 - 0.04, BOARD + BLOCK + BOARD / 2, 0]}>
        <mesh
          position={[(BW + 0.08) / 2, 0, 0]}
          castShadow
          onPointerDown={onDown}
          onPointerOver={() => {
            hovered.current = true;
            if (phase === 'cover') setCursor('pointer');
          }}
          onPointerOut={() => {
            hovered.current = false;
            setCursor('');
          }}
        >
          <boxGeometry args={[BW + 0.08, BOARD, BH + 0.12]} />
          <meshStandardMaterial attach="material-0" map={plain} />
          <meshStandardMaterial attach="material-1" map={plain} />
          <meshStandardMaterial ref={coverTopMat} attach="material-2" map={cover} roughness={0.55} metalness={0.05} />
          <meshStandardMaterial attach="material-3" map={inner} roughness={0.9} />
          <meshStandardMaterial attach="material-4" map={plain} />
          <meshStandardMaterial attach="material-5" map={plain} />
        </mesh>
      </group>
    </group>
  );
}

function makeTextures() {
  const cover = tex.leatherCover(content.site.bookTitle, content.site.bookAuthor);
  // Mesma capa, invertida na vertical: vai na face de baixo da contracapa
  // (depois da virada do fim do livro ela fica para cima, na orientação certa)
  const coverFlip = cover.clone();
  coverFlip.repeat.set(1, -1);
  coverFlip.offset.set(0, 1);
  coverFlip.needsUpdate = true;
  return {
    cover,
    coverFlip,
    plain: tex.leatherPlain(),
    inner: tex.endpaper(),
    edges: tex.pageEdges(),
    first: tex.firstPage(content.site.bookTitle),
    last: tex.firstPage(''), // última página: papel com só um filete (simétrico, não "espelha")
  };
}

function Desk() {
  const map = useMemo(() => {
    const t = tex.wood();
    t.repeat.set(3, 3);
    return t;
  }, []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
      <planeGeometry args={[40, 40]} />
      {/* roughness menor = brilho leve de verniz sob o abajur */}
      <meshStandardMaterial map={map} roughness={0.55} metalness={0.05} />
    </mesh>
  );
}

/**
 * "Clima" de cada tema: cor de fundo, luz ambiente, abajur, luz de
 * preenchimento (tarde pela janela / luar) e se a vela aparece.
 */
const LOOK: Record<Theme, { bg: string; amb: [string, number]; lamp: [string, number]; fill: [string, number]; cone: number; candle: boolean }> = {
  claro: { bg: '#3d2a18', amb: ['#ffe6c4', 0.5], lamp: ['#ffd69c', 120], fill: ['#ffcf96', 0.45], cone: 0.11, candle: false },
  sepia: { bg: '#36250f', amb: ['#f0cf98', 0.42], lamp: ['#ffc571', 110], fill: ['#e6bd80', 0.32], cone: 0.12, candle: false },
  noturno: { bg: '#090c15', amb: ['#7c92c8', 0.14], lamp: ['#ffb45e', 55], fill: ['#6c8ad6', 0.6], cone: 0.07, candle: true },
};

/** Luz de abajur com leve tremulação; reage à página sendo virada. Cores mudam suavemente entre temas. */
function Lights({ theme }: { theme: Theme }) {
  const lamp = useRef<THREE.SpotLight>(null);
  const amb = useRef<THREE.AmbientLight>(null);
  const fill = useRef<THREE.DirectionalLight>(null);
  const { scene } = useThree();
  const look = LOOK[theme];
  const tmp = useMemo(() => new THREE.Color(), []);
  const level = useRef(look.lamp[1]);

  useFrame((state, dt) => {
    const k = 1 - Math.pow(0.02, dt); // suavização independente do FPS
    const t = state.clock.elapsedTime;
    // Fundo e neblina
    if (scene.background instanceof THREE.Color) scene.background.lerp(tmp.set(look.bg), k);
    if (scene.fog instanceof THREE.Fog) scene.fog.color.lerp(tmp.set(look.bg), k);
    if (amb.current) {
      amb.current.color.lerp(tmp.set(look.amb[0]), k);
      amb.current.intensity += (look.amb[1] - amb.current.intensity) * k;
    }
    if (fill.current) {
      fill.current.color.lerp(tmp.set(look.fill[0]), k);
      fill.current.intensity += (look.fill[1] - fill.current.intensity) * k;
    }
    const l = lamp.current;
    if (!l) return;
    level.current += (look.lamp[1] - level.current) * k;
    l.color.lerp(tmp.set(look.lamp[0]), k);
    const flicker = Math.sin(t * 7.3) * 0.012 + Math.sin(t * 13.1) * 0.008;
    const lift = flipSignal.lift;
    l.intensity = level.current * (1 + flicker - lift * 0.15);
  });
  return (
    <>
      <ambientLight ref={amb} intensity={look.amb[1]} color={look.amb[0]} />
      <spotLight
        ref={lamp}
        position={LAMP_SHADE.toArray()}
        angle={0.62}
        penumbra={0.9}
        decay={1.4}
        distance={30}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
      />
      <directionalLight ref={fill} position={[6, 5, 2]} castShadow={false} />
    </>
  );
}

/** Sinaliza "pronto" depois que as texturas existem e alguns frames foram desenhados. */
function ReadySignal({ texturesReady, onReady }: { texturesReady: boolean; onReady: () => void }) {
  const frames = useRef(0);
  const sent = useRef(false);
  useFrame(() => {
    if (!texturesReady || sent.current) return;
    if (++frames.current > 3) {
      sent.current = true;
      onReady();
    }
  });
  return null;
}

export default function Scene3D(props: Props) {
  const [texturesReady, setTexturesReady] = useState(false);
  const onTexturesReady = useMemo(() => () => setTexturesReady(true), []);
  return (
    <Canvas
      className="scene3d"
      shadows
      dpr={[1, 1.5]}
      camera={{ position: CAM_CLOSED.toArray(), fov: 40, near: 0.1, far: 100 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      aria-hidden="true"
    >
      <color attach="background" args={[LOOK[props.theme].bg]} />
      <fog attach="fog" args={[LOOK[props.theme].bg, 10, 24]} />
      <Lights theme={props.theme} />
      <Desk />
      <DeskProps cone={props.phase === 'reading' ? 0 : LOOK[props.theme].cone} candle={LOOK[props.theme].candle} glow={props.theme === 'noturno' ? 0.6 : 1} />
      <Book
        phase={props.phase}
        reducedMotion={props.reducedMotion}
        onRequestOpen={props.onRequestOpen}
        onOpened={props.onOpened}
        onClosed={props.onClosed}
        closeMode={props.closeMode}
        onTexturesReady={onTexturesReady}
      />
      {props.particles && !props.reducedMotion && (
        <Sparkles count={70} scale={[9, 3.5, 7]} position={[0, 1.8, 0]} size={2.2} speed={0.25} opacity={0.55} color="#f5e3c0" />
      )}
      <ReadySignal texturesReady={texturesReady} onReady={props.onReady} />
    </Canvas>
  );
}
