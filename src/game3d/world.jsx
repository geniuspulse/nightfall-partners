// ============================================================
// NIGHTFALL PARTNERS — 3D World: The Hollow Creek Forest
// Phase 1 vertical slice: atmospheric forest environment.
// Procedural (no external assets): terrain, instanced trees,
// rocks, grass, a worn path, fireflies, moon, fog, lanterns.
// ============================================================

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Shared ground height — the world and the players agree on it.
export function terrainHeight(x, z) {
  return (
    Math.sin(x * 0.06) * Math.cos(z * 0.05) * 0.5 +
    Math.sin(x * 0.023 + z * 0.031) * 0.9 +
    Math.cos(x * 0.11 + z * 0.09) * 0.18
  );
}

// The worn path winds roughly north through the clearing.
export function pathX(z) {
  return Math.sin(z * 0.045) * 6 + Math.sin(z * 0.017) * 3;
}

// Deterministic pseudo-random so every client builds the SAME forest.
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Terrain ──
function Terrain() {
  const geom = useMemo(() => {
    const g = new THREE.PlaneGeometry(220, 220, 96, 96);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      pos.setY(i, terrainHeight(x, z));
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geom} receiveShadow>
      <meshStandardMaterial color="#18231c" roughness={1} />
    </mesh>
  );
}

// ── Worn path (a flat ribbon following pathX(z)) ──
function Path() {
  const geom = useMemo(() => {
    const N = 240, halfW = 1.7;
    const verts = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const z = -80 + (160 * i) / N;
      const x = pathX(z);
      verts.push(x - halfW, terrainHeight(x, z) + 0.03, z);
      verts.push(x + halfW, terrainHeight(x, z) + 0.03, z);
      if (i < N) {
        const b = i * 2;
        idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geom} receiveShadow>
      <meshStandardMaterial color="#4a4033" roughness={1} />
    </mesh>
  );
}

// ── Trees (instanced trunks + stacked-cone canopies) ──
function Trees() {
  const { trunks, canopies } = useMemo(() => {
    const rand = mulberry32(1907);
    const t = [], c = [];
    // rejection-sample positions away from the path
    let guard = 0;
    while (t.length < 150 && guard++ < 4000) {
      const x = (rand() * 2 - 1) * 95;
      const z = (rand() * 2 - 1) * 95;
      const r = Math.hypot(x, z);
      if (r < 10) continue;                    // keep the spawn clearing open
      if (r > 92) continue;                   // stay inside the fog wall
      if (Math.abs(x - pathX(z)) < 3.2) continue; // don't grow on the path
      if (t.some((p) => Math.hypot(p.x - x, p.z - z) < 3.4)) continue;
      const scale = 0.8 + rand() * 0.9;
      const y = terrainHeight(x, z);
      const sway = rand() * Math.PI * 2;
      const tint = 0.75 + rand() * 0.5;
      t.push({ x, y, z, scale, sway });
      c.push({ x, y, z, scale, sway, tint });
    }
    return { trunks: t, canopies: c };
  }, []);

  const fillTrunks = (mesh) => {
    if (!mesh || mesh.userData.filled) return;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    trunks.forEach((t, i) => {
      q.setFromEuler(new THREE.Euler(t.sway * 0.02, t.sway, t.sway * 0.02));
      p.set(t.x, t.y + (1.4 * t.scale) / 2, t.z);
      s.set(t.scale, t.scale * 1.1, t.scale);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.userData.filled = true;
  };

  const fillCanopies = (mesh) => {
    if (!mesh || mesh.userData.filled) return;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    const col = new THREE.Color();
    canopies.forEach((c, i) => {
      q.setFromEuler(new THREE.Euler(0, c.sway, 0));
      p.set(c.x, c.y + 1.4 * c.scale + 1.2 * c.scale, c.z);
      s.set(c.scale, c.scale, c.scale);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      col.setRGB(0.09 * c.tint, 0.16 * c.tint, 0.12 * c.tint);
      mesh.setColorAt(i, col);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.userData.filled = true;
  };

  return (
    <group>
      <instancedMesh
        ref={(m) => m && fillTrunks(m)}
        args={[undefined, undefined, trunks.length]}
        castShadow
      >
        <cylinderGeometry args={[0.14, 0.22, 1.4, 6]} />
        <meshStandardMaterial color="#2e2620" roughness={1} />
      </instancedMesh>
      <instancedMesh
        ref={(m) => m && fillCanopies(m)}
        args={[undefined, undefined, canopies.length]}
        castShadow
      >
        <coneGeometry args={[0.95, 2.1, 7]} />
        <meshStandardMaterial color="#12331f" roughness={1} />
      </instancedMesh>
    </group>
  );
}

// ── Rocks ──
function Rocks() {
  const fill = (mesh) => {
    if (!mesh || mesh.userData.filled) return;
    const rand = mulberry32(119);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    for (let i = 0; i < 44; i++) {
      const x = (rand() * 2 - 1) * 80, z = (rand() * 2 - 1) * 80;
      if (Math.hypot(x, z) < 8) continue;
      const sc = 0.25 + rand() * 0.7;
      q.setFromEuler(new THREE.Euler(rand() * 3, rand() * 3, rand() * 3));
      p.set(x, terrainHeight(x, z) + sc * 0.3, z);
      s.set(sc, sc * 0.8, sc);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.userData.filled = true;
  };
  return (
    <instancedMesh ref={(m) => m && fill(m)} args={[undefined, undefined, 44]} castShadow receiveShadow>
      <dodecahedronGeometry args={[0.6, 0]} />
      <meshStandardMaterial color="#3a3f47" roughness={0.95} />
    </instancedMesh>
  );
}

// ── Grass (instanced blades near the clearing) ──
function Grass() {
  const fill = (mesh) => {
    if (!mesh || mesh.userData.filled) return;
    const rand = mulberry32(77);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    let i = 0;
    while (i < 600) {
      const x = (rand() * 2 - 1) * 45, z = (rand() * 2 - 1) * 45;
      if (Math.abs(x - pathX(z)) < 1.9) continue;
      const sc = 0.5 + rand() * 0.8;
      q.setFromEuler(new THREE.Euler((rand() - 0.5) * 0.25, rand() * Math.PI, (rand() - 0.5) * 0.25));
      p.set(x, terrainHeight(x, z) + 0.22 * sc, z);
      s.set(sc, sc, sc);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      i++;
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.userData.filled = true;
  };
  return (
    <instancedMesh ref={(m) => m && fill(m)} args={[undefined, undefined, 600]}>
      <coneGeometry args={[0.05, 0.5, 3]} />
      <meshStandardMaterial color="#25402a" roughness={1} />
    </instancedMesh>
  );
}

// ── Fireflies (ambient drifting motes of light) ──
function Fireflies() {
  const ref = useRef();
  const seeds = useMemo(() => {
    const rand = mulberry32(1907119);
    return Array.from({ length: 60 }, () => ({
      x: (rand() * 2 - 1) * 50,
      y: 0.6 + rand() * 3.2,
      z: (rand() * 2 - 1) * 50,
      p: rand() * Math.PI * 2,
      s: 0.4 + rand() * 0.8,
    }));
  }, []);

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(60 * 3), 3));
    return g;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pos = geom.attributes.position;
    seeds.forEach((f, i) => {
      pos.setXYZ(i,
        f.x + Math.sin(t * f.s + f.p) * 1.4,
        f.y + Math.sin(t * f.s * 0.7 + f.p * 2) * 0.5,
        f.z + Math.cos(t * f.s * 0.9 + f.p) * 1.4
      );
    });
    pos.needsUpdate = true;
    if (ref.current) ref.current.rotation.y = 0; // keep world-fixed
  });

  return (
    <points ref={ref} geometry={geom}>
      <pointsMaterial
        color="#cfe3a0"
        size={0.09}
        transparent
        opacity={0.85}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// ── The whole environment ──
export default function ForestWorld({ activatedZones = {} }) {
  return (
    <group>
      <fog attach="fog" args={['#0a0f18', 9, 55]} />
      <color attach="background" args={['#0a0f18']} />

      {/* moonlight */}
      <directionalLight
        position={[-30, 42, -48]}
        intensity={0.5}
        color="#aebfe0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-far={120}
      />
      {/* sky fill + ground bounce */}
      <hemisphereLight args={['#22304d', '#0d140d', 0.35]} />
      <ambientLight intensity={0.06} />

      {/* the moon itself */}
      <mesh position={[-60, 52, -95]}>
        <sphereGeometry args={[5.5, 24, 24]} />
        <meshBasicMaterial color="#dfe6f5" />
      </mesh>

      <Terrain />
      <Path />
      <Trees />
      <Rocks />
      <Grass />
      <Fireflies />

      {/* Lantern posts along the path — also interaction targets */}
      <LanternPost z={-6} label="lp-1" on={!!activatedZones['lp-1']} />
      <LanternPost z={-22} label="lp-2" on={!!activatedZones['lp-2']} />
    </group>
  );
}

// A standing lantern post; lights when activated
export function LanternPost({ z, label, on }) {
  const x = pathX(z) + 1.9;
  const y = terrainHeight(x, z);
  return (
    <group position={[x, y, z]} name={label}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.08, 1.1, 6]} />
        <meshStandardMaterial color="#241f1a" roughness={1} />
      </mesh>
      <mesh position={[0, 1.28, 0]}>
        <boxGeometry args={[0.22, 0.3, 0.22]} />
        <meshStandardMaterial
          color={on ? '#ffcf8a' : '#1c1a17'}
          emissive={on ? '#ff9d3c' : '#000'}
          emissiveIntensity={on ? 1.6 : 0}
          roughness={0.6}
        />
      </mesh>
      {on && <pointLight position={[0, 1.28, 0]} color="#ff9d3c" intensity={5} distance={9} decay={2} />}
    </group>
  );
}
