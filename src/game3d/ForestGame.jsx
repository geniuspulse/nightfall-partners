// ============================================================
// NIGHTFALL PARTNERS — Forest Prototype (Phase 1 vertical slice)
// Two bonded players in the same atmospheric forest: local player
// (input-driven) + remote partner (network-driven, interpolated).
// Transport = Phase 0 SessionChannel: presence + 12Hz transform
// broadcast. No database writes for movement.
// ============================================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { useAuth } from '../lib/AuthContext';
import { roleForUser } from '../lib/gameEngine';
import { supabase } from '../api/supabaseClient';
import { SessionChannel, createRemoteAvatar } from '../lib/realtime/sessionManager';
import { VoiceManager } from './voice.js';
import ForestWorld, { terrainHeight } from './world.jsx';
import Avatar from './Avatar.jsx';
import { useInput } from './useInput.js';
import { useInteraction, FOREST_ZONES, zonePosition } from './interactions.jsx';

const UP = new THREE.Vector3(0, 1, 0);
const WALK_SPEED = 2.2;
const RUN_SPEED = 4.5;
const WORLD_RADIUS = 88;

function shortest(from, to) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// ── Local player: input → motion → world transform + broadcast ──
function PlayerController({ motion, keysRef, cameraRef, groupRef, onStep }) {
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    const k = keysRef.current;
    const m = motion.current;
    tmp.set((k.r ? 1 : 0) - (k.l ? 1 : 0), 0, (k.b ? 1 : 0) - (k.f ? 1 : 0));
    const moving = tmp.lengthSq() > 0;
    if (moving) {
      tmp.normalize().applyAxisAngle(UP, cameraRef.current.angle);
    }
    const targetSpeed = moving ? (k.run ? RUN_SPEED : WALK_SPEED) : 0;
    m.speed += (targetSpeed - m.speed) * Math.min(1, dt * 9);

    m.x += tmp.x * m.speed * dt;
    m.z += tmp.z * m.speed * dt;

    // soft world boundary (the fog wall)
    const r = Math.hypot(m.x, m.z);
    if (r > WORLD_RADIUS) { m.x *= WORLD_RADIUS / r; m.z *= WORLD_RADIUS / r; }

    m.y = terrainHeight(m.x, m.z);

    if (moving) {
      const targetYaw = Math.atan2(tmp.x, tmp.z);
      m.yaw += shortest(m.yaw, targetYaw) * Math.min(1, dt * 10);
    }

    m.state = m.speed > 3 ? 'run' : m.speed > 0.4 ? 'walk' : 'idle';

    if (groupRef.current) {
      groupRef.current.position.set(m.x, m.y, m.z);
      groupRef.current.rotation.y = m.yaw;
    }
    onStep(m);
  });
  return null;
}

// ── Remote partner: interpolated network avatar ──
function RemotePlayer({ avatarRef, motion, name, role, online, speakingRef }) {
  const groupRef = useRef();
  useFrame(() => {
    const av = avatarRef.current;
    const g = groupRef.current;
    if (!av || !g) return;
    const p = av.update();
    if (!p) return;
    g.position.set(p.x, p.y, p.z);
    g.rotation.y = av.yaw;
    const newest = av.buffer[av.buffer.length - 1];
    const anim = newest?.anim ?? 'idle';
    motion.current.state = anim;
    motion.current.speed = anim === 'run' ? RUN_SPEED : anim === 'walk' ? WALK_SPEED : 0;
    motion.current.speaking = speakingRef ? speakingRef.current : false;
  });
  if (!online) return null;
  return (
    <group ref={groupRef}>
      <Avatar motion={motion} name={name} role={role} health={100} />
    </group>
  );
}

// ── Cinematic third-person camera ──
function CameraRig({ motion, cameraRef }) {
  useFrame(({ camera }, dt) => {
    const m = motion.current;
    const c = cameraRef.current;
    const desired = new THREE.Vector3(
      m.x + Math.sin(c.angle) * Math.cos(c.pitch) * c.dist,
      m.y + 1.1 + Math.sin(c.pitch) * c.dist,
      m.z + Math.cos(c.angle) * Math.cos(c.pitch) * c.dist
    );
    desired.y = Math.max(desired.y, terrainHeight(desired.x, desired.z) + 0.55);
    camera.position.lerp(desired, 1 - Math.exp(-6.5 * dt));
    camera.lookAt(m.x, m.y + 1.55, m.z);
  });
  return null;
}

// ── HUD ──
const STATUS_META = {
  connecting: { label: 'Connecting…', color: '#e0b74a' },
  online: { label: 'Online', color: '#7fd88f' },
  disconnected: { label: 'Disconnected', color: '#8b93a5' },
  reconnecting: { label: 'Reconnecting…', color: '#e08a4a' },
};

const VOICE_META = {
  off: { label: 'Voice off', color: '#8b93a5' },
  requesting: { label: 'Requesting mic…', color: '#e0b74a' },
  waiting: { label: 'Voice: waiting for partner…', color: '#e0b74a' },
  connecting: { label: 'Voice: connecting…', color: '#e0b74a' },
  connected: { label: 'Voice: connected', color: '#7fd88f' },
  reconnecting: { label: 'Voice: reconnecting…', color: '#e08a4a' },
  error: { label: 'Voice error', color: '#e0645c' },
};

function VoiceBar({ voice, onConnect, onDisconnect, onToggleMute }) {
  const meta = VOICE_META[voice.state] ?? VOICE_META.off;
  const on = voice.state !== 'off' && voice.state !== 'error';

  return (
    <div className="fh-voice">
      <div className="fv-row">
        <span className="fh-dot" style={{ background: meta.color }} />
        <span className="fv-status">{meta.label}</span>
        {voice.state === 'error' && voice.errorReason === 'permission' && (
          <span className="fv-err"> — microphone permission was denied</span>
        )}
        {voice.state === 'error' && voice.errorReason === 'peer' && (
          <span className="fv-err"> — couldn't reach your partner, try again</span>
        )}
      </div>

      {voice.state === 'off' || voice.state === 'error' ? (
        <button className="fv-btn fv-btn-primary" onClick={onConnect}>
          🎤 Connect voice
        </button>
      ) : (
        <div className="fv-controls">
          <button
            className={'fv-btn' + (voice.muted ? ' fv-btn-muted' : '')}
            onClick={onToggleMute}
            title={voice.muted ? 'Unmute' : 'Mute'}
          >
            {voice.muted ? '🔇 Muted' : voice.speaking ? '🗣️ Speaking' : '🔊 Mic live'}
          </button>
          <span className="fv-partner-status">
            {voice.peerMuted ? 'Partner muted'
              : voice.peerSpeaking ? '🟢 Partner speaking…'
              : on && voice.state === 'connected' ? 'Partner can hear you'
              : ''}
          </span>
          <button className="fv-btn fv-btn-danger" onClick={onDisconnect}>✕</button>
        </div>
      )}
    </div>
  );
}

function ForestHUD({ status, partnerName, solo, prompt, examine, onCloseExamine }) {
  const meta = STATUS_META[status] ?? STATUS_META.connecting;
  return (
    <div className="forest-hud">
      <div className="fh-top">
        <div className="fh-chip">
          <span className="fh-brand">🏮 Nightfall Partners</span>
          {!solo ? (
            <span className="fh-partner">
              <span className="fh-dot" style={{ background: meta.color }} />
              {partnerName || 'Your partner'} · {meta.label}
            </span>
          ) : (
            <span className="fh-partner">
              <span className="fh-dot" style={{ background: '#8b93a5' }} />
              Solo — bond with a partner to share the forest
            </span>
          )}
        </div>
        <div className="fh-hint">
          WASD move · Shift run · drag to look · scroll to zoom · E interact
        </div>
      </div>

      {prompt && !examine && (
        <div className="fh-prompt">
          <span className="fh-key">E</span> {prompt.verbIcon} {prompt.text}
        </div>
      )}

      {examine && (
        <div className="fh-examine">
          <div className="fh-examine-title">{examine.title}</div>
          <p>{examine.text}</p>
          <button onClick={onCloseExamine}>Close</button>
        </div>
      )}
    </div>
  );
}

// ── Main ──
export default function ForestGame() {
  const { session, profile, couple } = useAuth();
  const navigate = useNavigate();
  const role = roleForUser(session?.user?.id, couple) || 'pathfinder';
  const partnerRole = role === 'pathfinder' ? 'seer' : 'pathfinder';

  const containerRef = useRef(null);
  const chanRef = useRef(null);
  const avatarRef = useRef(null);          // remote interpolation buffer
  const localMotion = useRef({ x: 0, y: 0, z: 8, yaw: 0, speed: 0, state: 'idle' });
  const remoteMotion = useRef({ x: 0, y: 0, z: 0, yaw: 0, speed: 0, state: 'idle' });
  const localGroup = useRef(null);

  const [activated, setActivated] = useState({});
  const [status, setStatus] = useState('connecting');
  const [partnerName, setPartnerName] = useState('');
  const [voice, setVoice] = useState({ state: 'off' });
  const solo = !couple?.player_b;

  const voiceRef = useRef(null);
  const audioElRef = useRef(null);
  const partnerSpeakingRef = useRef(false);

  // Interaction system (kind registry + proximity + HUD state)
  const handlersRef = useRef({});
  const {
    prompt, setPrompt, examine, setExamine, handleInteract, scanner,
  } = useInteraction({
    zones: FOREST_ZONES,
    playerPosRef: localMotion,
    sessionChannelRef: chanRef,
    activated,
    setActivated,
  });
  handlersRef.current.remoteWorldState = (msg) => {
    if (msg?.zone) setActivated((a) => ({ ...a, [msg.zone]: !!msg.on }));
  };

  const { keysRef, cameraRef } = useInput({ onInteract: handleInteract, containerRef });

  // Broadcast local transform (throttled to 12Hz inside sendTransform)
  const onStep = (m) => {
    chanRef.current?.sendTransform({ x: m.x, y: m.y, z: m.z }, m.yaw, m.state);
  };

  // ── Session connect: find-or-start a live session, join, presence ──
  useEffect(() => {
    if (!session?.user) return;
    let disposed = false;
    let chan = null;

    const partnerId = couple?.player_a === session.user.id
      ? couple?.player_b
      : couple?.player_a;

    (async () => {
      if (!couple) { setStatus('connecting'); return; } // solo wander, no session needed
      try {
        // find an active session for this couple on Night One, or start one
        let sessionId;
        const { data: existing } = await supabase
          .from('game_sessions')
          .select('id')
          .eq('couple_id', couple.id)
          .in('status', ['lobby', 'active'])
          .order('created_at', { ascending: false })
          .limit(1);
        if (existing?.length) {
          sessionId = existing[0].id;
        } else {
          const { data: mission } = await supabase
            .from('missions')
            .select('id')
            .eq('night_number', 1)
            .single();
          const { startSession } = await import('../lib/realtime/sessionManager');
          sessionId = await startSession(mission.id);
        }
        if (disposed) return;

        const { joinSession } = await import('../lib/realtime/sessionManager');
        await joinSession(sessionId);
        if (disposed) return;

        avatarRef.current = createRemoteAvatar();
        chan = new SessionChannel(sessionId, {
          profileId: session.user.id,
          displayName: profile?.display_name ?? 'Wanderer',
          role,
        });

        chan.onPresence((state) => {
          const partnerPresent = Object.values(state).some((p) => p.pid === partnerId);
          const partnerPres = Object.values(state).find((p) => p.pid === partnerId);
          if (partnerPres?.name) setPartnerName(partnerPres.name);
          setStatus(partnerPresent ? 'online' : 'disconnected');
        });

        chan.onMessage((m) => {
          if (m?.pos) {
            avatarRef.current?.setSnapshot(m);
          } else if (m?.zone !== undefined) {
            handlersRef.current.remoteWorldState?.(m);
          } else if (typeof m?.kind === 'string' && m.kind.startsWith('voice')) {
            voiceRef.current?.handleSignal(m);
          }
        });

        // voice: P2P WebRTC, this channel is signaling-only
        const vm = new VoiceManager({
          selfId: session.user.id,
          partnerId: partnerId,
          channel: chan,
        });
        vm.setAudioElement(audioElRef.current);
        vm.onState(setVoice);
        voiceRef.current = vm;

        chanRef.current = chan;
        await chan.connect();
        if (!disposed) setStatus('disconnected'); // connected; partner not present yet
      } catch (err) {
        console.warn('forest session error:', err?.message);
        if (!disposed) setStatus('reconnecting');
      }
    })();

    return () => {
      disposed = true;
      try { voiceRef.current?.disconnect(); } catch {}
      voiceRef.current = null;
      chanRef.current?.disconnect();
      chanRef.current = null;
    };
  }, [session?.user?.id, couple?.id]);

  const promptView = prompt
    ? {
        verbIcon: `${prompt.kind === 'activate' ? '🔥 Kindle' : '🕯 Examine'}:`,
        text: prompt.label,
      }
    : null;

  return (
    <div className="forest-container" ref={containerRef}>
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ fov: 55, position: [0, 3, 14], near: 0.1, far: 200 }}
        gl={{ antialias: true }}
      >
        <ForestWorld activatedZones={activated} />
        {scanner}

        {/* local player */}
        <group ref={localGroup}>
          <Avatar
            motion={localMotion}
            name={profile?.display_name ?? 'You'}
            role={role}
            health={100}
          />
        </group>
        <PlayerController
          motion={localMotion}
          keysRef={keysRef}
          cameraRef={cameraRef}
          groupRef={localGroup}
          onStep={onStep}
        />

        {/* remote partner */}
        <RemotePlayer
          avatarRef={avatarRef}
          motion={remoteMotion}
          name={partnerName || 'Your partner'}
          role={partnerRole}
          online={status === 'online'}
          speakingRef={partnerSpeakingRef}
        />

        <CameraRig motion={localMotion} cameraRef={cameraRef} />
      </Canvas>

      <ForestHUD
        status={status}
        partnerName={partnerName}
        solo={solo}
        prompt={promptView}
        examine={examine}
        onCloseExamine={() => setExamine(null)}
      />

      {/* remote voice element — P2P audio, never stored */}
      <audio ref={audioElRef} autoPlay playsInline style={{ display: 'none' }} />

      <VoiceBar
        voice={voice}
        onConnect={() => voiceRef.current?.connect()}
        onDisconnect={() => voiceRef.current?.disconnect()}
        onToggleMute={() => voiceRef.current?.toggleMute()}
      />

      <button className="fh-exit" onClick={() => navigate('/lobby')}>✕ Leave the forest</button>
    </div>
  );
}
