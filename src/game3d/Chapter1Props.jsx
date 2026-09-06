// ============================================================
// NIGHTFALL PARTNERS — Chapter 1 world props (Phase 5)
// The settlement, the healer's hut, the ridge camp, and the
// marks the creatures left behind. All simple geometry + light —
// the mood comes from fog, emissive fire, and restraint.
// ============================================================

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function Fire({ position }) {
  const lightRef = useRef();
  const flameRef = useRef();
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (lightRef.current) lightRef.current.intensity = 1.6 + Math.sin(t * 9.3) * 0.35 + Math.sin(t * 23.7) * 0.15;
    if (flameRef.current) {
      const s = 1 + Math.sin(t * 11.1) * 0.12;
      flameRef.current.scale.set(s, 1 + Math.sin(t * 14.7) * 0.2, s);
    }
  });
  return (
    <group position={[position[0], 0, position[2]]}>
      <pointLight ref={lightRef} position={[0, 1.1, 0]} color="#ff9440" intensity={1.6} distance={13} decay={2} />
      {/* ember core */}
      <mesh position={[0, 0.14, 0]}>
        <sphereGeometry args={[0.28, 8, 8]} />
        <meshBasicMaterial color="#ff7a29" />
      </mesh>
      {/* flame */}
      <mesh ref={flameRef} position={[0, 0.55, 0]}>
        <coneGeometry args={[0.22, 0.9, 6]} />
        <meshBasicMaterial color="#ffb84d" transparent opacity={0.85} />
      </mesh>
      {/* scattered wood */}
      {[...Array(4)].map((_, i) => (
        <mesh key={i} position={[Math.cos(i * 2.2) * 0.5, 0.06, Math.sin(i * 2.2) * 0.5]} rotation={[Math.PI / 2, i * 2.2, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 1.1, 5]} />
          <meshStandardMaterial color="#3a2c22" />
        </mesh>
      ))}
    </group>
  );
}

function BurnedHouse({ position, rotation = 0, scale = 1 }) {
  return (
    <group position={[position[0], 0, position[2]]} rotation={[0, rotation, 0]} scale={scale}>
      {/* charred walls — one side broken open */}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[3.2, 2, 2.6]} />
        <meshStandardMaterial color="#241d19" roughness={1} />
      </mesh>
      {/* collapsed roof */}
      <mesh position={[0.3, 1.7, 0]} rotation={[0.5, 0.3, 0.2]}>
        <boxGeometry args={[2.8, 0.18, 2.4]} />
        <meshStandardMaterial color="#1a1512" roughness={1} />
      </mesh>
      {/* fallen beam */}
      <mesh position={[-1.6, 0.5, 1.4]} rotation={[0.2, 0.8, 1.2]}>
        <cylinderGeometry args={[0.12, 0.12, 2.4, 5]} />
        <meshStandardMaterial color="#2c2118" roughness={1} />
      </mesh>
      {/* scorch mark */}
      <mesh position={[0, 0.02, 1.7]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.2, 12]} />
        <meshBasicMaterial color="#120d0a" transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

function BloodMark({ position, rotation = 0, scale = 1 }) {
  return (
    <mesh position={[position[0], 0.025, position[2]]} rotation={[-Math.PI / 2, 0, rotation]}>
      <circleGeometry args={[0.7 * scale, 9]} />
      <meshBasicMaterial color="#3d0f14" transparent opacity={0.8} />
    </mesh>
  );
}

function ClawTrack({ position, rotation = 0 }) {
  return (
    <mesh position={[position[0], 0.028, position[2]]} rotation={[-Math.PI / 2, 0, rotation]}>
      <planeGeometry args={[0.16, 0.42]} />
      <meshBasicMaterial color="#1c1420" transparent opacity={0.85} />
    </mesh>
  );
}

function HealerHut() {
  return (
    <group position={[22, 0, -86]}>
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[3, 2.2, 3]} />
        <meshStandardMaterial color="#3d3428" roughness={1} />
      </mesh>
      <mesh position={[0, 2.45, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[2.6, 1.2, 4]} />
        <meshStandardMaterial color="#2c251c" roughness={1} />
      </mesh>
      {/* door */}
      <mesh position={[0, 0.8, 1.51]}>
        <planeGeometry args={[0.9, 1.6]} />
        <meshBasicMaterial color="#141009" />
      </mesh>
      {/* medicine shelf outside — the collection point */}
      <mesh position={[1.9, 0.6, 1.4]}>
        <boxGeometry args={[1.4, 0.12, 0.5]} />
        <meshStandardMaterial color="#5a4a35" roughness={1} />
      </mesh>
      {/* hanging herb bundles */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[1.6 + i * 0.35, 1.3, 1.35]}>
          <capsuleGeometry args={[0.07, 0.24, 3, 6]} />
          <meshStandardMaterial color="#57663c" />
        </mesh>
      ))}
      <pointLight position={[0, 1.4, 1.8]} color="#a8c46a" intensity={0.5} distance={6} />
    </group>
  );
}

function RidgeTent({ position }) {
  return (
    <group position={[position[0], 0, position[2]]}>
      <mesh position={[0, 0.9, 0]} rotation={[0, 0.4, 0]}>
        <coneGeometry args={[1.5, 1.8, 5]} />
        <meshStandardMaterial color="#4a4238" roughness={1} />
      </mesh>
    </group>
  );
}

/** The burned shrine — a leaning stone slab, scorched base. */
function BurnedShrine({ position }) {
  return (
    <group position={[position[0], 0, position[2]]}>
      <mesh position={[0, 0.7, 0]} rotation={[0.18, 0.4, 0.12]}>
        <boxGeometry args={[1.1, 1.4, 0.25]} />
        <meshStandardMaterial color="#4d4552" roughness={1} />
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.55, 0.7, 0.3, 8]} />
        <meshStandardMaterial color="#35303a" roughness={1} />
      </mesh>
      <mesh position={[0, 0.32, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.9, 10]} />
        <meshBasicMaterial color="#161009" transparent opacity={0.85} />
      </mesh>
    </group>
  );
}

/** Clawprint trail — data for the tracks zone. */
function TrackTrail({ from = [-6, -88], to = [2, -92], count = 8 }) {
  const tracks = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    tracks.push([
      from[0] + (to[0] - from[0]) * t + (i % 2 ? 0.18 : -0.18),
      from[1] + (to[1] - from[1]) * t,
    ]);
  }
  return (
    <group>
      {tracks.map((p, i) => <ClawTrack key={i} position={[p[0], 0, p[1]]} rotation={i * 0.7} />)}
    </group>
  );
}

/** Meadow — the hunting ground (open glade feel). */
function Meadow({ z = -45, width = 46 }) {
  return (
    <group>
      {/* light grass patches */}
      {[...Array(24)].map((_, i) => {
        const x = Math.sin(i * 12.9898) * (width / 2);
        const zz = z + Math.sin(i * 78.233) * 9;
        return (
          <mesh key={i} position={[x, 0.03, zz]} rotation={[-Math.PI / 2, 0, i]}>
            <circleGeometry args={[0.8 + (i % 3) * 0.4, 7]} />
            <meshBasicMaterial color="#2c3b28" transparent opacity={0.55} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Chapter 1 world dressing. */
export default function Chapter1Props() {
  return (
    <group>
      <Meadow />

      {/* ── the settlement (z ≈ -76..-92) ── */}
      <BurnedHouse position={[-7, -78]} rotation={0.3} />
      <BurnedHouse position={[7, -82]} rotation={-0.5} scale={0.9} />
      <BurnedHouse position={[-9.5, -87]} rotation={0.8} />
      <BurnedHouse position={[3, -91]} rotation={0.1} scale={1.1} />
      <BurnedHouse position={[11, -88]} rotation={-0.2} />
      <BurnedHouse position={[-3, -84]} rotation={1.2} scale={0.85} />
      <Fire position={[0, -78]} />
      <Fire position={[-4, -88]} />
      <BloodMark position={[1, -80]} />
      <BloodMark position={[-2, -86]} scale={1.4} />
      <BloodMark position={[5, -89]} scale={0.7} />
      <TrackTrail />
      <BurnedShrine position={[13.5, -83]} />

      {/* ── healer's hut (east) ── */}
      <HealerHut />

      {/* ── ridge camp (west) ── */}
      <RidgeTent position={[-26, -60]} />
      <RidgeTent position={[-29.5, -63]} />
      <Fire position={[-27, -62]} />

      {/* ── screams knoll marker ── */}
      <group position={[-1.5, 0, -60]}>
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.4, 0.55, 0.6, 7]} />
          <meshStandardMaterial color="#3d3830" roughness={1} />
        </mesh>
      </group>
    </group>
  );
}
