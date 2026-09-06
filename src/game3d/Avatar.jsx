// ============================================================
// NIGHTFALL PARTNERS — 3D Avatar (Phase 1)
// Procedural hooded wanderer: no external models yet.
// Roles keep the asymmetric flavor: the Pathfinder carries a
// warm lantern; the Seer carries cold starlight.
// Motion is driven through a shared ref so the SAME component
// renders the local player (input-driven) and the remote
// partner (network-driven) with identical animation.
// ============================================================

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

export const ROLE_STYLES = {
  pathfinder: {
    cloak: '#2f4f6f', hood: '#24405c', trim: '#c9a06a',
    lantern: '#ffb15e', eyes: '#ffd9a0', glow: '#ff9d3c',
  },
  seer: {
    cloak: '#4a3d5c', hood: '#3c3150', trim: '#a8c6d9',
    lantern: '#9fd8ff', eyes: '#bfe6ff', glow: '#5fb7ff',
  },
};

/**
 * <Avatar motion={motionRef} name="Wren" role="pathfinder" health={100} />
 * motion ref shape: { x, y, z, yaw, speed, state } — updated per frame
 * by the local controller or the network interpolator.
 */
export default function Avatar({ motion, name, role = 'pathfinder', health = 100 }) {
  const body = useRef();
  const cloakRef = useRef();
  const lanternRef = useRef();
  const eyeRef = useRef();
  const bobT = useRef(0);
  const st = ROLE_STYLES[role] ?? ROLE_STYLES.pathfinder;

  useFrame((_, dt) => {
    const m = motion?.current;
    if (!m) return;
    const { speed = 0, state = 'idle' } = m;
    const moving = state === 'walk' || state === 'run';
    const rate = state === 'run' ? 11 : state === 'walk' ? 6.2 : 1.6;
    bobT.current += dt * rate * (moving ? 1 : 0.6);

    const bob = Math.sin(bobT.current) * (moving ? 0.055 : 0.018);
    const sway = Math.sin(bobT.current * 0.5) * (moving ? 0.05 : 0.008);
    const lean = Math.min(speed / 4.5, 1) * 0.14;

    if (body.current) {
      body.current.position.y = bob;
      body.current.rotation.z = sway;
      body.current.rotation.x = lean;
    }
    if (cloakRef.current) {
      // cloak trails behind the stride
      cloakRef.current.rotation.x = lean * 0.6 + (moving ? Math.sin(bobT.current) * 0.03 : 0);
    }
    // lantern flicker (+ speaking glow: the voice lights them up)
    const speakingBoost = m.speaking
      ? 0.35 + Math.sin(bobT.current * 14) * 0.2
      : 0;
    if (lanternRef.current) {
      const f = 0.85 + Math.sin(bobT.current * 3.7) * 0.08 + Math.sin(bobT.current * 8.3) * 0.07;
      lanternRef.current.intensity = 6 * f * (1 + speakingBoost);
    }
    if (eyeRef.current) eyeRef.current.emissiveIntensity =
      1.4 + Math.sin(bobT.current * 0.9) * 0.25 + speakingBoost * 2;
  });

  return (
    <group>
      <group ref={body}>
        {/* cloak — a cone from the shoulders to the ground */}
        <mesh ref={cloakRef} position={[0, 0.62, 0]} castShadow>
          <coneGeometry args={[0.34, 1.25, 8]} />
          <meshStandardMaterial color={st.cloak} roughness={0.9} />
        </mesh>

        {/* shoulders */}
        <mesh position={[0, 1.08, 0]} castShadow>
          <sphereGeometry args={[0.17, 12, 10]} />
          <meshStandardMaterial color={st.hood} roughness={0.9} />
        </mesh>

        {/* head + hood */}
        <mesh position={[0, 1.3, 0.02]} castShadow>
          <sphereGeometry args={[0.135, 14, 12]} />
          <meshStandardMaterial color="#d9c3a5" roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.38, -0.03]} castShadow>
          <coneGeometry args={[0.17, 0.3, 8]} />
          <meshStandardMaterial color={st.hood} roughness={0.9} />
        </mesh>

        {/* glowing eyes */}
        <mesh ref={eyeRef} position={[0, 1.31, 0.13]}>
          <sphereGeometry args={[0.022, 8, 8]} />
          <meshStandardMaterial
            color={st.eyes}
            emissive={st.eyes}
            emissiveIntensity={1.4}
          />
        </mesh>

        {/* lantern arm */}
        <mesh position={[0.26, 0.92, 0.08]} rotation={[0, 0, -0.5]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 0.5, 6]} />
          <meshStandardMaterial color={st.hood} roughness={0.9} />
        </mesh>
        <mesh position={[0.4, 0.78, 0.16]}>
          <octahedronGeometry args={[0.075, 0]} />
          <meshStandardMaterial
            color={st.lantern}
            emissive={st.glow}
            emissiveIntensity={1.5}
            roughness={0.4}
          />
        </mesh>
        <pointLight
          ref={lanternRef}
          position={[0.4, 0.78, 0.16]}
          color={st.glow}
          intensity={6}
          distance={11}
          decay={2}
        />

        {/* belt — a hint of trim */}
        <mesh position={[0, 0.72, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.21, 0.018, 6, 16]} />
          <meshStandardMaterial color={st.trim} roughness={0.7} />
        </mesh>
      </group>

      {/* nameplate + health placeholder (DOM, cheap and crisp) */}
      <Html
        position={[0, 1.85, 0]}
        center
        distanceFactor={9}
        zIndexRange={[10, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          userSelect: 'none', whiteSpace: 'nowrap',
        }}>
          <div style={{
            fontFamily: 'WixMadefor, system-ui, sans-serif',
            fontSize: 13, fontWeight: 600, letterSpacing: '0.04em',
            color: '#f2ead8', textShadow: '0 1px 4px rgba(0,0,0,0.9)',
            marginBottom: 3,
          }}>
            {name}
            <span style={{ opacity: 0.55, fontWeight: 400 }}> · {role === 'seer' ? 'Seer' : 'Pathfinder'}</span>
          </div>
          {/* health placeholder — fixed 100 for the prototype */}
          <div style={{
            width: 64, height: 5, borderRadius: 3,
            background: 'rgba(0,0,0,0.55)', overflow: 'hidden',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.12)',
          }}>
            <div style={{
              width: `${health}%`, height: '100%',
              background: health > 50 ? 'linear-gradient(90deg,#7fd88f,#b9f2b9)' : '#e0645c',
            }} />
          </div>
        </div>
      </Html>
    </group>
  );
}
