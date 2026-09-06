// ============================================================
// NIGHTFALL PARTNERS — WeaponSystem (Phase 4)
// In-canvas weapon viewmodel: fire input (F / click), raycast
// hit detection against combat entities, bolt tracer + muzzle
// light, ammo/cooldown/reload from the data-driven weapon.
// Hit RESOLUTION is host-authoritative — this only reports.
// ============================================================

import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { createWeaponState, tryFire, tryReload, resolveReload, getWeapon } from '../game/engine/combat/weapons.js';
import { terrainHeight } from './world.jsx';

const EMBER_BOW = getWeapon('ember-bow');

export default function WeaponSystem({
  localMotion, cameraRef, enabled, onHit, onAmmo, canFireRef,
}) {
  const { scene, camera } = useThree();
  const ws = useRef(createWeaponState('ember-bow'));
  const fireReq = useRef(false);
  const muzzleRef = useRef(null);
  const lightRef = useRef(null);
  const tracerRef = useRef(null);
  const ray = useRef(new THREE.Raycaster());
  const flashUntil = useRef(0);
  const [lastReason, setLastReason] = useState('');

  const pushAmmo = () => onAmmo?.({
    mag: ws.current.ammoInMag, reserve: ws.current.reserve,
    reloading: ws.current.reloading, reloadEndsAt: ws.current.reloadEndsAt,
    reason: lastReason,
  });

  // fire inputs
  useEffect(() => {
    const kd = (e) => {
      if (e.repeat) return;
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); fireReq.current = true; }
      if (e.key === 'r' || e.key === 'R') {
        const r = tryReload(ws.current, performance.now());
        if (r.ok) pushAmmo();
      }
    };
    const md = (e) => {
      // only when clicking the canvas area itself
      if (e.target?.tagName === 'CANVAS') fireReq.current = true;
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('mousedown', md);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('mousedown', md); };
  }, []);

  const fireNow = (now) => {
    resolveReload(ws.current, now);
    if (!canFireRef.current) return;
    const res = tryFire(ws.current, now);
    setLastReason(res.ok ? '' : res.reason);
    if (!res.ok) { pushAmmo(); return; }

    // ray from camera along look direction
    cameraRef.current.updateMatrixWorld?.();
    const dir = camera.getWorldDirection(new THREE.Vector3());
    const origin = camera.position.clone();
    ray.current.set(origin, dir.normalize());
    ray.current.far = EMBER_BOW.range + 12; // camera sits behind the player
    const hits = ray.current.intersectObjects(scene.children, true);

    // nearest entity hit (walk up parents for the entity id)
    let hitEntity = null, hitPoint = null;
    for (const h of hits) {
      let o = h.object;
      while (o && !o.userData?.entityId) o = o.parent;
      if (o?.userData?.entityId) { hitEntity = o.userData.entityId; hitPoint = h.point; break; }
    }

    // muzzle ≈ player chest
    const m = localMotion.current;
    const muzzle = new THREE.Vector3(m.x, (terrainHeight(m.x, m.z) ?? 0) + 1.45, m.z);
    const endPoint = hitPoint ?? origin.clone().add(dir.clone().multiplyScalar(ray.current.far));

    // tracer + flash
    showTracer(muzzle, endPoint);
    flashUntil.current = now + 90;

    onHit?.({ enemyId: hitEntity, damage: res.shot.damage, point: hitPoint });
    pushAmmo();
  };

  const showTracer = (from, to) => {
    if (!tracerRef.current) return;
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const len = from.distanceTo(to);
    tracerRef.current.position.copy(mid);
    tracerRef.current.lookAt(to);
    tracerRef.current.scale.set(1, len, 1);
    tracerRef.current.rotateX(Math.PI / 2);
    tracerRef.current.visible = true;
    tracerRef.current.material.opacity = 0.9;
    tracerRef.current.userData.fade = performance.now() + 140;
  };

  useFrame(() => {
    const now = performance.now();
    resolveReload(ws.current, now);
    if (fireReq.current) {
      fireReq.current = false;
      if (enabled) fireNow(now);
    }
    if (lightRef.current) lightRef.current.intensity = now < flashUntil.current ? 2.2 : 0;
    const t = tracerRef.current;
    if (t?.visible && now > (t.userData.fade ?? 0)) { t.visible = false; }
    else if (t?.visible) t.material.opacity = Math.max(0, t.material.opacity - 0.06);
  });

  useEffect(() => { pushAmmo(); }, []); // initial ammo HUD

  return (
    <group>
      {/* bolt tracer (unit cylinder scaled by showTracer) */}
      <mesh ref={tracerRef} visible={false}>
        <cylinderGeometry args={[0.015, 0.015, 1, 4]} />
        <meshBasicMaterial color="#ffcf7a" transparent opacity={0.9} />
      </mesh>
      {/* muzzle light */}
      <pointLight ref={lightRef} position={[0, 0, 0]} color="#ffb347" intensity={0} distance={7} />
    </group>
  );
}


