// ============================================================
// NIGHTFALL PARTNERS — Interaction Foundation (Phase 1)
// A reusable, extensible interaction system.
//
// Every interaction target is an InteractionZone:
//   { id, kind, position, radius, label, data }
//
// The KIND REGISTRY maps kind → verb + handler contract, so future
// gameplay (pickup, open, activate, talk, collect, carry) plugs in
// by registering handlers — world code never changes shape.
//
// Phase 1 wires: examine (read lore) and activate (lantern posts).
// Proximity detection runs in-world (useFrame); the HUD renders the
// prompt and results. Activation effects are broadcast to the
// partner over the session channel so the shared world stays in
// sync without touching the database.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { terrainHeight } from './world.jsx';

// ── Kind registry — extend in later phases ──
export const KINDS = {
  examine: { verb: 'Examine', icon: '🕯' },
  pickup: { verb: 'Pick up', icon: '✋' },      // Phase 3+
  open: { verb: 'Open', icon: '🚪' },            // Phase 3+
  activate: { verb: 'Kindle', icon: '🔥' },
  talk: { verb: 'Talk', icon: '💬' },            // Phase 5+
  collect: { verb: 'Collect', icon: '✨' },      // Phase 3+
  carry: { verb: 'Carry', icon: '🤲' },          // Phase 5+
};

// Phase-1 zone definitions for the forest prototype.
// Positions are (x derived from path, z); y from terrainHeight.
export const FOREST_ZONES = [
  {
    id: 'waystone-1',
    kind: 'examine',
    z: 4, xOff: -2.4, radius: 2.6,
    label: 'a leaning waystone',
    data: {
      title: 'The Leaning Waystone',
      text: 'Grey stone, older than the town, worn smooth on one face as if a hundred years of shoulders have passed it in the dark. Scratched into the moss, just legible: "THE SEAM IS NEAREST WHERE TWO ROADS AGREE TO BE ONE."',
    },
  },
  {
    id: 'lp-1',
    kind: 'activate',
    z: -6, xOff: 1.9, radius: 2.4,
    label: 'a cold lantern post',
    data: { title: 'Lantern Post', text: 'Old iron, wick dry, waiting. It would take two hands and one word to kindle it again.' },
  },
  {
    id: 'waystone-2',
    kind: 'examine',
    z: -14, xOff: 2.6, radius: 2.6,
    label: 'a split milestone',
    data: {
      title: 'The Split Milestone',
      text: 'A milestone cracked cleanly in two, the halves a hand-span apart. On one half: "HOLLOW CREEK 1". On the other: "HOLLOW CREEK 1" — in handwriting, deep and hurried, as if carved from the other side of the stone.',
    },
  },
  {
    id: 'lp-2',
    kind: 'activate',
    z: -22, xOff: 1.9, radius: 2.4,
    label: 'a cold lantern post',
    data: { title: 'Lantern Post', text: 'Twin of the first. The wick smells faintly of a wedding morning.' },
  },
  {
    id: 'well-mouth',
    kind: 'examine',
    z: -30, xOff: 0, radius: 3.0,
    label: 'a ring of old stones',
    data: {
      title: 'The Ring of Stones',
      text: 'Nine stones in a circle, cold-breathing, like the mouth of something that was bricked over and became a clearing instead. In the middle, the grass grows the wrong direction — toward the center. You are standing near where the Memory Well would be, if this were the other world.',
    },
  },
];

export function zonePosition(zone) {
  const x = (zone.xOff ?? 0) + Math.sin(zone.z * 0.045) * 6 + Math.sin(zone.z * 0.017) * 3;
  const z = zone.z;
  return [x, terrainHeight(x, z), z];
}

/**
 * Proximity scanner. Runs in-world, feeds the HUD via callbacks.
 */
export function ProximityScanner({ zones, playerPosRef, onPromptChange }) {
  const currentRef = useRef(null);
  const lastPrompt = useRef(null);

  useFrame(() => {
    const p = playerPosRef.current;
    if (!p) return;
    let nearest = null, best = Infinity;
    for (const z of zones) {
      const [x, , zc] = zonePosition(z);
      const d = Math.hypot(p.x - x, p.z - zc);
      if (d <= z.radius && d < best) { best = d; nearest = z; }
    }
    if (nearest?.id !== lastPrompt.current) {
      lastPrompt.current = nearest?.id ?? null;
      onPromptChange(nearest);
    }
    currentRef.current = nearest;
  });
  return null;
}

/**
 * HUD for interaction: prompt + examine panel.
 * onInteractTriggered is called by useInput on 'E'.
 */
export function useInteraction({ zones, playerPosRef, sessionChannelRef, activated, setActivated }) {
  const [prompt, setPrompt] = useState(null);
  const [examine, setExamine] = useState(null);

  const promptRef = useRef(null);
  useEffect(() => { promptRef.current = prompt; }, [prompt]);

  const handleInteract = () => {
    const z = promptRef.current;
    if (!z) return;
    if (z.kind === 'examine') {
      setExamine(z.data);
    } else if (z.kind === 'activate') {
      const on = !activated[z.id];
      setActivated((a) => ({ ...a, [z.id]: on }));
      // share the world change with the partner (no DB writes for ambience)
      sessionChannelRef.current?.send('world-state', { zone: z.id, on });
    }
  };

  const handleRemoteWorldState = (msg) => {
    if (msg.zone) setActivated((a) => ({ ...a, [msg.zone]: !!msg.on }));
  };

  return {
    prompt, setPrompt, examine, setExamine,
    handleInteract, handleRemoteWorldState,
    scanner: (
      <ProximityScanner zones={zones} playerPosRef={playerPosRef} onPromptChange={setPrompt} />
    ),
  };
}
