import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  OrbitControls,
  PerspectiveCamera,
} from "@react-three/drei";
import * as THREE from "three";
import type { Group, Mesh } from "three";
import type { TwinState } from "../types";

function Metal({ color = "#8a9098", rough = 0.28, metal = 0.85 }: { color?: string; rough?: number; metal?: number }) {
  return <meshStandardMaterial color={color} metalness={metal} roughness={rough} envMapIntensity={1.2} />;
}

function HorseHead() {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(0.55, 0.05);
    s.lineTo(0.75, -0.15);
    s.lineTo(0.7, -0.55);
    s.lineTo(0.45, -0.75);
    s.lineTo(0.15, -0.55);
    s.lineTo(0.05, -0.25);
    s.closePath();
    return s;
  }, []);
  const geo = useMemo(() => new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false }), [shape]);
  return (
    <mesh geometry={geo} castShadow position={[-1.55, 0.05, -0.06]}>
      <Metal color="#b8894a" rough={0.32} metal={0.7} />
    </mesh>
  );
}

function PumpJackAssembly({
  spm,
  stroke,
  unstable,
  load,
}: {
  spm: number;
  stroke: number;
  unstable: boolean;
  load: number;
}) {
  const crankRef = useRef<Group>(null);
  const beamRef = useRef<Group>(null);
  const pitmanRef = useRef<Group>(null);
  const rodRef = useRef<Group>(null);
  const amp = THREE.MathUtils.clamp(stroke / 2.5, 0.6, 1.4);
  const rodHot = unstable || load > 85;

  useFrame(({ clock }) => {
    const omega = (spm / 60) * Math.PI * 2;
    const t = clock.elapsedTime * omega;
    const chatter = unstable ? Math.sin(clock.elapsedTime * 22) * 0.035 : 0;

    if (crankRef.current) crankRef.current.rotation.z = t;
    const beamA = Math.sin(t) * 0.42 * amp + chatter;
    if (beamRef.current) beamRef.current.rotation.z = beamA;
    if (pitmanRef.current) {
      pitmanRef.current.rotation.z = -Math.sin(t) * 0.55 * amp;
      pitmanRef.current.position.y = -0.15 + Math.cos(t) * 0.05;
    }
    if (rodRef.current) {
      rodRef.current.position.y = 1.15 + Math.sin(t) * 0.48 * amp;
      rodRef.current.rotation.z = chatter * 0.6;
    }
  });

  return (
    <group position={[-2.1, -0.55, 0]}>
      {/* Concrete pier */}
      <mesh position={[0.2, -1.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.6, 0.28, 1.6]} />
        <meshStandardMaterial color="#4a4e54" roughness={0.9} metalness={0.05} />
      </mesh>
      <mesh position={[0.2, -1.05, 0]} castShadow>
        <boxGeometry args={[2.2, 0.12, 1.3]} />
        <meshStandardMaterial color="#3a3e44" roughness={0.85} />
      </mesh>

      {/* Gearbox housing */}
      <mesh position={[0.1, -0.7, 0]} castShadow>
        <boxGeometry args={[1.1, 0.55, 0.85]} />
        <Metal color="#3d434c" rough={0.4} metal={0.55} />
      </mesh>
      <mesh position={[0.1, -0.42, 0]}>
        <boxGeometry args={[0.95, 0.08, 0.7]} />
        <Metal color="#2f343c" rough={0.45} metal={0.5} />
      </mesh>

      {/* Crank + counterweights (both sides) */}
      <group ref={crankRef} position={[-0.45, -0.7, 0]}>
        {[-0.42, 0.42].map((z) => (
          <group key={z} position={[0, 0, z]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.09, 0.09, 0.1, 20]} />
              <Metal color="#b8894a" rough={0.3} metal={0.75} />
            </mesh>
            <mesh position={[0.55, 0, 0]}>
              <boxGeometry args={[1.1, 0.1, 0.12]} />
              <Metal color="#707880" />
            </mesh>
            <mesh position={[1.05, 0, 0]}>
              <boxGeometry args={[0.42, 0.7, 0.18]} />
              <Metal color="#3a404a" rough={0.4} metal={0.6} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Pitman arm */}
      <group ref={pitmanRef} position={[-0.05, 0.15, 0.42]}>
        <mesh>
          <boxGeometry args={[0.08, 1.35, 0.08]} />
          <Metal color="#8a9098" />
        </mesh>
      </group>

      {/* Samson post structure */}
      <mesh position={[0.75, 0.2, 0]} castShadow>
        <boxGeometry args={[0.16, 2.6, 0.16]} />
        <Metal color="#6d737b" />
      </mesh>
      {[-0.32, 0.32].map((z) => (
        <mesh key={z} position={[0.75, 0.15, z]} castShadow>
          <boxGeometry args={[0.09, 2.4, 0.09]} />
          <Metal color="#5c636c" />
        </mesh>
      ))}
      {/* Cross brace */}
      <mesh position={[0.75, -0.2, 0]} rotation={[0, 0, 0.4]}>
        <boxGeometry args={[0.06, 1.2, 0.06]} />
        <Metal color="#6d737b" rough={0.4} />
      </mesh>
      <mesh position={[0.75, 0.6, 0]} rotation={[0, 0, -0.4]}>
        <boxGeometry args={[0.06, 1.0, 0.06]} />
        <Metal color="#6d737b" rough={0.4} />
      </mesh>

      {/* Ladder */}
      <group position={[0.95, 0.1, 0.48]}>
        <mesh><boxGeometry args={[0.04, 2.0, 0.04]} /><Metal color="#5a6068" rough={0.5} metal={0.5} /></mesh>
        {[0.2, 0.5, 0.8, 1.1, 1.4].map((y) => (
          <mesh key={y} position={[-0.12, y - 0.9, 0]}>
            <boxGeometry args={[0.24, 0.03, 0.03]} />
            <Metal color="#5a6068" rough={0.5} metal={0.5} />
          </mesh>
        ))}
      </group>

      {/* Walking beam + horsehead */}
      <group ref={beamRef} position={[0.75, 1.45, 0]}>
        <mesh position={[-0.2, 0, 0]} castShadow>
          <boxGeometry args={[2.6, 0.14, 0.16]} />
          <Metal color="#b8894a" rough={0.3} metal={0.72} />
        </mesh>
        {/* Equalizer */}
        <mesh position={[1.0, -0.08, 0]}>
          <boxGeometry args={[0.35, 0.2, 0.35]} />
          <Metal color="#8a9098" />
        </mesh>
        <HorseHead />
        {/* Bridle */}
        <mesh position={[-1.85, -0.7, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.2, 10]} />
          <Metal color="#c5c9ce" metal={0.9} rough={0.15} />
        </mesh>
      </group>

      {/* Polish rod + carrier bar */}
      <group ref={rodRef} position={[2.55, 0, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.032, 0.032, 3.6, 16]} />
          <meshStandardMaterial
            color={rodHot ? "#c45c4a" : "#d0d4d8"}
            metalness={0.92}
            roughness={0.12}
            envMapIntensity={1.4}
          />
        </mesh>
        <mesh position={[0, 1.7, 0]}>
          <boxGeometry args={[0.22, 0.08, 0.12]} />
          <Metal color="#8a9098" />
        </mesh>
      </group>
    </group>
  );
}

function WellheadTree() {
  return (
    <group position={[0.45, 1.15, 0]}>
      {/* Master valve stack */}
      <mesh castShadow>
        <cylinderGeometry args={[0.16, 0.18, 0.35, 20]} />
        <Metal color="#4a5058" rough={0.32} metal={0.75} />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.2, 16]} />
        <Metal color="#3e444c" />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.16, 16]} />
        <Metal color="#5c636c" />
      </mesh>
      {/* Stuffing box */}
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.1, 0.11, 0.18, 14]} />
        <Metal color="#2f343a" rough={0.35} />
      </mesh>
      {/* Wing valves */}
      {[0, Math.PI / 2].map((rot, i) => (
        <group key={i} rotation={[0, rot, 0]}>
          <mesh position={[0.28, 0.15, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.055, 0.055, 0.35, 12]} />
            <Metal color="#6d737b" />
          </mesh>
          <mesh position={[0.48, 0.15, 0]}>
            <boxGeometry args={[0.12, 0.12, 0.12]} />
            <Metal color="#b8894a" rough={0.35} metal={0.65} />
          </mesh>
        </group>
      ))}
      {/* Pressure gauge stub */}
      <mesh position={[0.15, 0.35, 0.2]} rotation={[0.4, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.2, 8]} />
        <Metal color="#8a9098" />
      </mesh>
      <mesh position={[0.15, 0.48, 0.28]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <Metal color="#c5c9ce" metal={0.4} rough={0.25} />
      </mesh>
    </group>
  );
}

function CasingString() {
  return (
    <group position={[0.45, -0.2, 0]}>
      {/* Conductor */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.22, 0.55, 28]} />
        <Metal color="#6a7078" rough={0.35} metal={0.7} />
      </mesh>
      {/* Surface casing */}
      <mesh castShadow>
        <cylinderGeometry args={[0.13, 0.13, 2.2, 32]} />
        <Metal color="#8b9199" rough={0.25} metal={0.8} />
      </mesh>
      {/* Intermediate */}
      <mesh position={[0, -1.4, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.11, 1.6, 28]} />
        <Metal color="#7a8088" rough={0.28} metal={0.78} />
      </mesh>
      {/* Production casing deeper */}
      <mesh position={[0, -2.5, 0]}>
        <cylinderGeometry args={[0.095, 0.095, 1.2, 24]} />
        <Metal color="#6d737b" />
      </mesh>
      {/* Tubing */}
      <mesh position={[0, -0.6, 0]}>
        <cylinderGeometry args={[0.048, 0.048, 4.6, 20]} />
        <Metal color="#4a5058" metal={0.88} rough={0.18} />
      </mesh>
      {/* Coupling rings */}
      {[-0.4, -1.2, -2.0, -2.8].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <torusGeometry args={[0.115, 0.014, 8, 28]} />
          <Metal color="#b8894a" rough={0.35} metal={0.7} />
        </mesh>
      ))}
      {/* Perforation interval */}
      {[-2.55, -2.65, -2.75, -2.85].map((y) => (
        <group key={y} position={[0, y, 0]}>
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <mesh key={deg} rotation={[0, (deg * Math.PI) / 180, 0]} position={[0.1, 0, 0]}>
              <boxGeometry args={[0.04, 0.02, 0.02]} />
              <meshStandardMaterial color="#d4a05a" emissive="#d4a05a" emissiveIntensity={0.25} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Formation({ temp, steam, radius = 12 }: { temp: number; steam: number; radius?: number }) {
  const heat = useMemo(() => {
    const t = THREE.MathUtils.clamp((temp - 44) / 28, 0, 1);
    return new THREE.Color().setHSL(0.065 - t * 0.04, 0.7, 0.2 + t * 0.3);
  }, [temp]);
  const s = 0.55 + Math.min(2.2, radius / 14) + (temp - 44) / 80 + steam / 2400;
  const rings = [0.35, 0.55, 0.8, 1.05].map((k, i) => ({
    k,
    opacity: 0.22 - i * 0.04,
    color: new THREE.Color().setHSL(0.08 - i * 0.02, 0.65, 0.28 + i * 0.06),
  }));

  return (
    <group position={[0.45, -2.0, 0]}>
      {[
        { y: 1.35, h: 0.4, c: "#2a2e34", w: 5.4 },
        { y: 0.9, h: 0.45, c: "#3a342c", w: 5.2 },
        { y: 0.35, h: 0.55, c: "#4a3f32", w: 5.0 },
        { y: -0.25, h: 0.5, c: "#2f2a24", w: 4.8 },
        { y: -0.8, h: 0.45, c: "#1e221c", w: 4.6 },
      ].map((layer) => (
        <mesh key={layer.y} position={[0.3, layer.y, 0]} castShadow receiveShadow>
          <boxGeometry args={[layer.w, layer.h, 3.6]} />
          <meshStandardMaterial color={layer.c} roughness={0.92} metalness={0.05} />
        </mesh>
      ))}
      <mesh position={[2.75, 0.3, 0]}>
        <boxGeometry args={[0.02, 2.4, 3.55]} />
        <meshStandardMaterial color="#d4a05a" emissive="#d4a05a" emissiveIntensity={0.2} />
      </mesh>
      {/* Deviated trajectory toward pay */}
      <mesh position={[0.55, 0.15, 0.35]} rotation={[0.35, 0, 0.18]}>
        <cylinderGeometry args={[0.035, 0.035, 2.8, 12]} />
        <meshStandardMaterial color="#8b9199" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Pay / production zone */}
      <mesh position={[0.2, -0.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.55, 0.06, 8, 24]} />
        <meshStandardMaterial color="#c45c4a" emissive="#c45c4a" emissiveIntensity={0.2} />
      </mesh>
      {rings.map((r) => (
        <mesh key={r.k} position={[0.2, 0.05, 0]} scale={[s * r.k * 1.6, s * r.k * 0.55, s * r.k * 1.25]}>
          <sphereGeometry args={[0.85, 28, 18]} />
          <meshStandardMaterial
            color={r.color}
            emissive={r.color}
            emissiveIntensity={0.35}
            transparent
            opacity={r.opacity}
            depthWrite={false}
          />
        </mesh>
      ))}
      <mesh position={[0.2, 0.2, 0]} scale={[s * 1.15, s * 0.55, s * 0.95]}>
        <sphereGeometry args={[0.85, 48, 32]} />
        <meshStandardMaterial
          color={heat}
          emissive={heat}
          emissiveIntensity={0.7}
          transparent
          opacity={0.42}
          roughness={0.3}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function OilFlow({ mobility, rate }: { mobility: number; rate: number }) {
  const ref = useRef<Group>(null);
  const n = Math.min(28, Math.round(12 + rate / 3));
  const seeds = useMemo(() => Array.from({ length: n }, (_, i) => i * 0.37), [n]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const spd = 0.2 + mobility * 2.2;
    ref.current.children.forEach((c, i) => {
      const y = ((clock.elapsedTime * spd + seeds[i]) % 1) * 4.2 - 2.8;
      c.position.set(
        0.45 + Math.sin(clock.elapsedTime * 1.3 + seeds[i]) * 0.01,
        y,
        Math.cos(clock.elapsedTime + seeds[i]) * 0.01,
      );
    });
  });

  return (
    <group ref={ref}>
      {seeds.map((s) => (
        <mesh key={s}>
          <sphereGeometry args={[0.02 + mobility * 0.012, 8, 8]} />
          <meshStandardMaterial color="#5a3210" emissive="#2a1508" emissiveIntensity={0.35} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function SteamCloud({ intensity }: { intensity: number }) {
  const ref = useRef<Group>(null);
  const n = Math.round(16 + intensity * 24);
  const seeds = useMemo(
    () => Array.from({ length: n }, (_, i) => ({ a: i * 0.55, r: 0.08 + (i % 6) * 0.07 })),
    [n],
  );

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.children.forEach((c, i) => {
      const s = seeds[i];
      const t = clock.elapsedTime * (0.35 + intensity * 0.55) + s.a;
      const rise = t % 2.2;
      c.position.set(0.45 + Math.cos(t * 1.8) * s.r, -2.4 + rise * 1.1, Math.sin(t * 1.8) * s.r);
      c.scale.setScalar(0.5 + rise * 0.9);
      const mat = (c as Mesh).material as THREE.MeshStandardMaterial;
      if (mat) mat.opacity = Math.max(0, (1 - rise / 2.2) * (0.12 + intensity * 0.22));
    });
  });

  return (
    <group ref={ref}>
      {seeds.map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.07, 10, 10]} />
          <meshStandardMaterial color="#eef2f6" transparent opacity={0.18} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function TankBattery({ rate }: { rate: number }) {
  const flow = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!flow.current) return;
    flow.current.children.forEach((c, i) => {
      const u = (clock.elapsedTime * (0.35 + rate / 90) + i * 0.15) % 1;
      c.position.set(1.1 + u * 2.8, 1.2 + Math.sin(u * Math.PI) * 0.06, 0.15);
    });
  });

  return (
    <group position={[2.2, -0.9, 0.8]}>
      <mesh position={[0, 1.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.045, 0.045, 3.2, 12]} />
        <Metal color="#6a7078" />
      </mesh>
      {[0, 1.1].map((x) => (
        <mesh key={x} position={[2.2 + x * 0.05, 0.2, x === 0 ? 0 : 0.9]} castShadow>
          <cylinderGeometry args={[0.55, 0.55, 1.9, 32]} />
          <Metal color="#3a4048" rough={0.45} metal={0.5} />
        </mesh>
      ))}
      <group ref={flow}>
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.028, 6, 6]} />
            <meshStandardMaterial color="#6b3f18" emissive="#3a2008" emissiveIntensity={0.4} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Scene({ state }: { state: TwinState }) {
  const mobility = Math.min(1, 800 / Math.max(state.oil_viscosity, 80));
  const steamI = Math.min(1, state.steam_volume / 700);
  const unstable = state.rod_floating_probability > 0.35;

  return (
    <>
      <color attach="background" args={["#0b0c0e"]} />
      <fog attach="fog" args={["#0b0c0e", 14, 32]} />
      <ambientLight intensity={0.22} />
      <hemisphereLight intensity={0.4} color="#e8e2d6" groundColor="#12141a" />
      <directionalLight
        position={[10, 14, 8]}
        intensity={1.55}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0002}
      />
      <directionalLight position={[-8, 6, -6]} intensity={0.45} color="#7a9bb8" />
      <spotLight position={[2, 8, 2]} intensity={0.6} angle={0.4} penumbra={0.5} color="#d4a05a" />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.85, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#14161a" roughness={0.95} />
      </mesh>

      <Formation temp={state.reservoir_temperature} steam={state.steam_volume} radius={state.heated_radius_m ?? 12} />
      <CasingString />
      <WellheadTree />
      <OilFlow mobility={mobility} rate={state.oil_rate_bopd} />
      <SteamCloud intensity={steamI} />
      <PumpJackAssembly
        spm={state.spm}
        stroke={state.stroke_length}
        unstable={unstable}
        load={state.rod_load}
      />
      <TankBattery rate={state.oil_rate_bopd} />

      <ContactShadows position={[0, -1.84, 0]} opacity={0.65} scale={22} blur={2.2} far={8} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.06}
        maxPolarAngle={Math.PI / 2.01}
        minDistance={5}
        maxDistance={20}
        target={[0.2, 0.1, 0]}
      />
    </>
  );
}

export function DigitalTwinScene({ state }: { state: TwinState }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
    >
      <PerspectiveCamera makeDefault position={[8.5, 4.2, 9.5]} fov={32} near={0.1} far={80} />
      <Scene state={state} />
      <Environment preset="warehouse" />
    </Canvas>
  );
}
