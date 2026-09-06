// ============================================================
// NIGHTFALL PARTNERS — Entity renderer (Phase 4/5)
// Renders combat entities from snapshots: Hollow Husks, deer,
// and the settlement's people. Interpolated movement, hit
// flash, attack lunge, and death dissolve. Kind-specific
// meshes keyed by defId.
// ============================================================

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ENEMIES } from '../game/engine/combat/enemies.js';

function HuskMesh({ hitFlash }) {
  return (
    <group>
      {/* robed body */}
      <mesh position={[0, 0.95, 0]} castShadow>
        <capsuleGeometry args={[0.34, 0.9, 4, 10]} />
        <meshStandardMaterial
          color={hitFlash ? '#a06a70' : '#3a2e46'}
          roughness={1}
          transparent
          opacity={0.96}
        />
      </mesh>
      {/* hooded head */}
      <mesh position={[0, 1.75, 0]}>
        <sphereGeometry args={[0.24, 10, 10]} />
        <meshStandardMaterial color={hitFlash ? '#a06a70' : '#2d2437'} roughness={1} />
      </mesh>
      {/* ember eyes */}
      <mesh position={[-0.08, 1.78, 0.19]}>
        <sphereGeometry args={[0.035, 6, 6]} />
        <meshBasicMaterial color="#ffb347" />
      </mesh>
      <mesh position={[0.08, 1.78, 0.19]}>
        <sphereGeometry args={[0.035, 6, 6]} />
        <meshBasicMaterial color="#ffb347" />
      </mesh>
      {/* long arms */}
      <mesh position={[-0.42, 1.0, 0.1]} rotation={[0.5, 0, 0.25]}>
        <capsuleGeometry args={[0.07, 0.8, 3, 6]} />
        <meshStandardMaterial color="#33283f" roughness={1} />
      </mesh>
      <mesh position={[0.42, 1.0, 0.1]} rotation={[0.5, 0, -0.25]}>
        <capsuleGeometry args={[0.07, 0.8, 3, 6]} />
        <meshStandardMaterial color="#33283f" roughness={1} />
      </mesh>
    </group>
  );
}

function DeerMesh({ hitFlash }) {
  return (
    <group>
      {/* body */}
      <mesh position={[0, 0.85, 0]} rotation={[0, 0, 0]}>
        <capsuleGeometry args={[0.32, 0.85, 4, 8]} />
        <meshStandardMaterial color={hitFlash ? '#d09a68' : '#9a7248'} roughness={1} />
      </mesh>
      {/* head + neck */}
      <mesh position={[0, 1.3, 0.55]} rotation={[0.6, 0, 0]}>
        <capsuleGeometry args={[0.14, 0.42, 3, 7]} />
        <meshStandardMaterial color="#8a6a44" roughness={1} />
      </mesh>
      <mesh position={[0, 1.42, 0.78]}>
        <sphereGeometry args={[0.14, 8, 8]} />
        <meshStandardMaterial color={hitFlash ? '#d09a68' : '#8a6a44'} roughness={1} />
      </mesh>
      {/* ears */}
      <mesh position={[-0.1, 1.5, 0.72]} rotation={[0, 0, 0.5]}>
        <coneGeometry args={[0.05, 0.16, 5]} />
        <meshStandardMaterial color="#7a5c3c" />
      </mesh>
      <mesh position={[0.1, 1.5, 0.72]} rotation={[0, 0, -0.5]}>
        <coneGeometry args={[0.05, 0.16, 5]} />
        <meshStandardMaterial color="#7a5c3c" />
      </mesh>
      {/* legs */}
      {[[-0.18, 0.42], [0.18, 0.42], [-0.18, -0.35], [0.18, -0.35]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.26, z]}>
          <cylinderGeometry args={[0.045, 0.06, 0.55, 5]} />
          <meshStandardMaterial color="#7a5c3c" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function VillagerMesh({ tint, small = false }) {
  const h = small ? 0.62 : 1;
  return (
    <group>
      <mesh position={[0, 0.65 * h + 0.05, 0]} castShadow>
        <capsuleGeometry args={[0.24 * h, 0.72 * h, 4, 8]} />
        <meshStandardMaterial color={tint} roughness={1} />
      </mesh>
      <mesh position={[0, 1.32 * h, 0]}>
        <sphereGeometry args={[0.2 * h, 8, 8]} />
        <meshStandardMaterial color="#c9a284" roughness={1} />
      </mesh>
    </group>
  );
}

function HpBar({ hp, maxHp }) {
  const frac = Math.max(0, hp / maxHp);
  return (
    <group position={[0, 2.3, 0]}>
      <mesh>
        <planeGeometry args={[0.9, 0.09]} />
        <meshBasicMaterial color="#201917" transparent opacity={0.8} />
      </mesh>
      <mesh position={[-(0.9 * (1 - frac)) / 2, 0, 0.01]}>
        <planeGeometry args={[0.9 * frac, 0.07]} />
        <meshBasicMaterial color={frac > 0.4 ? '#c2564e' : '#e08a4d'} />
      </mesh>
    </group>
  );
}

export default function Entity({ e }) {
  const def = ENEMIES[e.defId] ?? {};
  const grp = useRef();
  const pos = useRef(new THREE.Vector3(e.x, 0, e.z));
  const lunge = useRef(0);

  useFrame((_, dt) => {
    if (!grp.current) return;
    grp.current.userData.entityId = e.id; // raycast target registry
    // interpolate toward the snapshot position
    pos.current.x += (e.x - pos.current.x) * Math.min(1, dt * 8);
    pos.current.z += (e.z - pos.current.z) * Math.min(1, dt * 8);
    grp.current.position.set(pos.current.x, 0, pos.current.z);
    // face the movement direction
    const targetYaw = e.yaw;
    let d = targetYaw - grp.current.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    grp.current.rotation.y += d * Math.min(1, dt * 7);
    // death dissolve
    if (e.state === 'dying') {
      const deathT = Math.min(1, (Date.now() - (e.diedAt ?? Date.now())) / 2200);
      grp.current.position.y = -deathT * 1.3;
    } else {
      grp.current.position.y = 0;
    }
    // attack lunge
    if (e.state === 'attack') lunge.current = 1;
    lunge.current = Math.max(0, lunge.current - dt * 3);
    grp.current.scale.z = 1 + lunge.current * 0.25;
  });

  if (e.state === 'gone') return null;
  const hitFlash = Date.now() - (e.hitFlashAt ?? 0) < 130;
  const dying = e.state === 'dying';

  let mesh;
  if (e.defId === 'hollow-husk' || e.defId === 'husk-wave') mesh = <HuskMesh hitFlash={hitFlash} />;
  else if (e.defId === 'deer') mesh = <DeerMesh hitFlash={hitFlash} />;
  else if (e.defId === 'npc-child') mesh = <VillagerMesh tint={def.tint} small />;
  else mesh = <VillagerMesh tint={def.tint} />;

  const invulnerable = def.invulnerable;
  return (
    <group ref={grp} position={[e.x, 0, e.z]} rotation={[0, e.yaw, 0]}>
      {mesh}
      {!invulnerable && <HpBar hp={e.hp} maxHp={e.maxHp} />}
      {dying && (
        <pointLight position={[0, 1, 0]} color="#8a5c9a" intensity={0.8} distance={4} />
      )}
    </group>
  );
}
