/**
 * Objetos de época sobre a mesa, todos low-poly e feitos com primitivas
 * (nada é baixado): abajur de banqueiro, tinteiro com pena, óculos,
 * xícara de café, cartas com lacre e uma vela (só no tema noturno).
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as tex from './textures';

const BRASS = { color: '#b8893e', metalness: 0.75, roughness: 0.32 } as const;

/** Posição da cúpula do abajur (a luz principal sai daqui). */
export const LAMP_SHADE = new THREE.Vector3(-3.6, 3.6, -2.2);

/** Cone de luz "volumétrico" falso: aditivo, mais forte perto da cúpula. */
function LightCone({ intensity }: { intensity: number }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const { position, quaternion } = useMemo(() => {
    const target = new THREE.Vector3(0.3, 0, 0.2);
    const dir = LAMP_SHADE.clone().sub(target);
    const len = dir.length();
    return {
      position: target.clone().add(dir.clone().multiplyScalar(0.5)),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()),
      len,
    };
  }, []);
  const uniforms = useMemo(() => ({ uColor: { value: new THREE.Color('#ffcf8a') }, uIntensity: { value: intensity } }), []); // eslint-disable-line react-hooks/exhaustive-deps
  useFrame(() => {
    if (mat.current) mat.current.uniforms.uIntensity.value += (intensity - mat.current.uniforms.uIntensity.value) * 0.05;
  });
  return (
    <mesh position={position} quaternion={quaternion} renderOrder={10}>
      <coneGeometry args={[3.2, LAMP_SHADE.distanceTo(new THREE.Vector3(0.3, 0, 0.2)), 40, 1, true]} />
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
        vertexShader={`
          varying vec2 vUv; varying vec3 vN; varying vec3 vV;
          void main() {
            vUv = uv;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vV = normalize(-mv.xyz);
            vN = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * mv;
          }`}
        fragmentShader={`
          uniform vec3 uColor; uniform float uIntensity;
          varying vec2 vUv; varying vec3 vN; varying vec3 vV;
          void main() {
            float edge = pow(abs(dot(vN, vV)), 2.2);
            float a = uIntensity * pow(vUv.y, 1.7) * edge;
            gl_FragColor = vec4(uColor, a);
          }`}
      />
    </mesh>
  );
}

function Lamp({ glow }: { glow: number }) {
  // Base fora do enquadramento: só a luz e o brilho aparecem
  const base = new THREE.Vector3(-6.4, 0, -4.8);
  return (
    <group>
      {/* Base e haste de latão */}
      <mesh position={[base.x, 0.08, base.z]} castShadow receiveShadow>
        <cylinderGeometry args={[0.62, 0.7, 0.16, 28]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
      <mesh position={[base.x, 1.9, base.z]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 3.6, 12]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
      {/* Braço até a cúpula */}
      <mesh
        position={[(base.x + LAMP_SHADE.x) / 2, 3.72, (base.z + LAMP_SHADE.z) / 2]}
        rotation={[0, Math.atan2(-(LAMP_SHADE.z - base.z), LAMP_SHADE.x - base.x), Math.PI / 2]}
        castShadow
      >
        <cylinderGeometry args={[0.045, 0.045, Math.hypot(LAMP_SHADE.x - base.x, LAMP_SHADE.z - base.z), 10]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
      {/* Cúpula de vidro verde (abajur de banqueiro), inclinada para o livro */}
      <group position={LAMP_SHADE} rotation={[0.25, 0, -0.45]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.32, 0.95, 0.62, 28, 1, true]} />
          <meshStandardMaterial color="#1e5b42" roughness={0.25} metalness={0.2} side={THREE.DoubleSide} emissive="#0d2a1e" />
        </mesh>
        <mesh position={[0, -0.12, 0]}>
          <sphereGeometry args={[0.2, 16, 12]} />
          <meshBasicMaterial color={new THREE.Color('#ffe2a8').multiplyScalar(0.6 + glow * 0.6)} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

function InkwellAndQuill() {
  return (
    <group position={[3.4, 0, -2.1]} rotation={[0, -0.4, 0]}>
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.4, 0.44, 8]} />
        <meshPhysicalMaterial color="#20263a" roughness={0.08} metalness={0.1} clearcoat={1} />
      </mesh>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.17, 0.14, 16]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
      <mesh position={[0, 0.575, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.01, 16]} />
        <meshStandardMaterial color="#05060a" roughness={0.05} />
      </mesh>
      {/* Pena: haste + vexilo achatado */}
      <group position={[0, 0.55, 0]} rotation={[0.15, 0, -0.42]}>
        <mesh position={[0, 0.9, 0]} castShadow>
          <cylinderGeometry args={[0.012, 0.02, 2, 6]} />
          <meshStandardMaterial color="#e9dfc8" />
        </mesh>
        <mesh position={[0.05, 1.3, 0]} scale={[0.13, 0.8, 0.012]} castShadow>
          <sphereGeometry args={[1, 18, 12]} />
          <meshStandardMaterial color="#e6dcc4" roughness={0.95} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

function Glasses() {
  const metal = { color: '#c7a25a', metalness: 0.8, roughness: 0.25 } as const;
  return (
    <group position={[-3.5, 0.03, 1.5]} rotation={[0, 0.5, 0]}>
      {[-0.33, 0.33].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[0.26, 0.022, 8, 28]} />
            <meshStandardMaterial {...metal} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
            <circleGeometry args={[0.25, 24]} />
            <meshPhysicalMaterial color="#ffffff" transparent opacity={0.18} roughness={0} transmission={0.6} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.02, -0.02]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.08, 0.018, 6, 12, Math.PI]} />
        <meshStandardMaterial {...metal} />
      </mesh>
      {[-0.58, 0.58].map((x) => (
        <mesh key={x} position={[x * 1.02, 0.02, -0.55]} rotation={[0, x > 0 ? -0.08 : 0.08, 0]} castShadow>
          <boxGeometry args={[0.025, 0.025, 1.1]} />
          <meshStandardMaterial {...metal} />
        </mesh>
      ))}
    </group>
  );
}

function Coffee() {
  const china = { color: '#f4efe6', roughness: 0.25, metalness: 0 } as const;
  return (
    <group position={[3.7, 0, 1.0]} scale={0.85}>
      <mesh position={[0, 0.03, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.62, 0.5, 0.06, 32]} />
        <meshStandardMaterial {...china} />
      </mesh>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.34, 0.25, 0.48, 28]} />
        <meshStandardMaterial {...china} />
      </mesh>
      <mesh position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.31, 28]} />
        <meshStandardMaterial color="#3b2010" roughness={0.1} />
      </mesh>
      <mesh position={[0.36, 0.3, 0]} castShadow>
        <torusGeometry args={[0.12, 0.035, 8, 16]} />
        <meshStandardMaterial {...china} />
      </mesh>
      {/* Faixa dourada da porcelana */}
      <mesh position={[0, 0.52, 0]}>
        <torusGeometry args={[0.335, 0.008, 6, 32]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
    </group>
  );
}

function Letters() {
  const map = useMemo(() => tex.letterPaper(), []);
  const sheets = [
    { p: [-3.4, 0.012, -1.0], r: 0.35 },
    { p: [-3.15, 0.032, -0.75], r: -0.12 },
    { p: [-3.3, 0.052, -0.9], r: 0.18 },
  ] as const;
  return (
    <group>
      {sheets.map((s, i) => (
        <mesh key={i} position={s.p as unknown as [number, number, number]} rotation={[0, s.r, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.5, 0.018, 2]} />
          <meshStandardMaterial map={map} roughness={0.95} />
        </mesh>
      ))}
      {/* Lacre de cera vermelha */}
      <mesh position={[-3.25, 0.075, -0.6]} castShadow>
        <cylinderGeometry args={[0.15, 0.16, 0.035, 14]} />
        <meshStandardMaterial color="#8e1b17" roughness={0.45} />
      </mesh>
    </group>
  );
}

/** Vela com chama tremulante (tema noturno). */
function Candle({ on }: { on: boolean }) {
  const light = useRef<THREE.PointLight>(null);
  const flame = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const f = 1 + Math.sin(t * 9.1) * 0.08 + Math.sin(t * 23.7) * 0.05 + Math.sin(t * 3.3) * 0.04;
    if (light.current) light.current.intensity += ((on ? 7 * f : 0) - light.current.intensity) * 0.08;
    if (flame.current) {
      flame.current.scale.set(0.07, 0.17 * f, 0.07);
      flame.current.position.x = Math.sin(t * 2.1) * 0.01;
    }
  });
  return (
    <group position={[4.6, 0, -0.5]} visible={on}>
      <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.42, 0.48, 0.08, 24]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.14, 0.95, 18]} />
        <meshStandardMaterial color="#efe6cf" roughness={0.6} />
      </mesh>
      <mesh ref={flame} position={[0, 1.15, 0]}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshBasicMaterial color="#ffb347" toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, 1.3, 0]} color="#ff9b45" intensity={0} distance={9} decay={1.6} />
    </group>
  );
}

export function DeskProps({ cone, candle, glow }: { cone: number; candle: boolean; glow: number }) {
  return (
    <>
      <Lamp glow={glow} />
      <LightCone intensity={cone} />
      <InkwellAndQuill />
      <Glasses />
      <Coffee />
      <Letters />
      <Candle on={candle} />
    </>
  );
}
