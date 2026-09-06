// ============================================================
// /dev/sync — Phase 0 transport validation screen (dev only).
// Open in two tabs (both partners logged in) to verify:
//   1. Session lifecycle RPCs (start/join/heartbeat/leave)
//   2. Presence (who's online in the session)
//   3. Broadcast round-trips (transform-class traffic)
//   4. Authoritative world_events ordering via postgres_changes
// This is a real test harness, not a game screen. Removed before beta.
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { roleForUser } from '../../lib/gameEngine';
import { supabase } from '../../api/supabaseClient';
import {
  startSession, joinSession, sendWorldEvent,
  SessionChannel, createRemoteAvatar, SESSION_EVENT,
} from '../../lib/realtime/sessionManager';

const MISSION_NIGHT = 1; // use Night 1 as the transport-test mission

export default function SyncTest() {
  const { session, profile, couple } = useAuth();
  const role = roleForUser(session?.user?.id, couple) || 'pathfinder';
  const [sessionId, setSessionId] = useState('');
  const [log, setLog] = useState([]);
  const [presence, setPresence] = useState({});
  const [partnerPos, setPartnerPos] = useState(null);
  const chanRef = useRef(null);
  const avatarRef = useRef(null);
  const simRef = useRef(null);

  const addLog = (t) =>
    setLog((l) => [...l.slice(-40), `${new Date().toLocaleTimeString()} — ${t}`]);

  // Resolve Night 1 mission id
  const [missionId, setMissionId] = useState(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('missions')
        .select('id')
        .eq('night_number', MISSION_NIGHT)
        .single();
      if (data) setMissionId(data.id);
    })();
  }, []);

  const connect = async (sid) => {
    const chan = new SessionChannel(sid, {
      profileId: session.user.id,
      displayName: profile?.display_name ?? 'tester',
      role: role || 'pathfinder',
    });
    await chan.connect();
    chanRef.current = chan;
    avatarRef.current = createRemoteAvatar();

    chan.onPresence((state) => setPresence(state));
    chan.onMessage((m) => {
      if (m.pos) {
        avatarRef.current.setSnapshot(m);
        const p = avatarRef.current.update();
        setPartnerPos(p ? `${p.x.toFixed(1)}, ${p.z.toFixed(1)}` : '…');
      } else addLog(`recv broadcast: ${JSON.stringify(m)}`);
    });
    chan.onWorldEvent((e) => addLog(`world_event seq=${e.seq} type=${e.type} by=${e.by_profile?.slice(0, 8)}`));

    addLog('connected to session ' + sid);
  };

  const handleStart = async () => {
    if (!missionId) return addLog('mission not loaded yet');
    try {
      const sid = await startSession(missionId);
      setSessionId(sid);
      addLog(`session started (host) id=${sid.slice(0, 8)}`);
      await connect(sid);
    } catch (e) { addLog('ERROR ' + e.message); }
  };

  const handleJoin = async () => {
    try {
      const row = await joinSession(sessionId.trim());
      addLog(`joined session (mission night ${row.night_number}, status ${row.status})`);
      await connect(sessionId.trim());
    } catch (e) { addLog('ERROR ' + e.message); }
  };

  const handleEvent = async () => {
    try {
      const seq = await sendWorldEvent(sessionId, 'test-event', { hello: Date.now() });
      addLog(`sent world_event → server seq ${seq}`);
    } catch (e) { addLog('ERROR ' + e.message); }
  };

  // Simulated movement: walk a circle, broadcast transforms, partner sees
  // the interpolated remote avatar position.
  const handleSimulate = () => {
    if (simRef.current) {
      clearInterval(simRef.current);
      simRef.current = null;
      addLog('movement sim stopped');
      return;
    }
    let t = 0;
    simRef.current = setInterval(() => {
      t += 0.05;
      chanRef.current?.sendTransform(
        { x: Math.cos(t) * 5, y: 0, z: Math.sin(t) * 5 },
        t % (Math.PI * 2),
        'walk'
      );
    }, 80);
    addLog('movement sim started (circle @ 12Hz)');
  };

  useEffect(() => {
    return () => {
      if (simRef.current) clearInterval(simRef.current);
      chanRef.current?.disconnect();
    };
  }, []);

  const online = Object.values(presence);

  return (
    <div className="page" style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
      <h2>Transport Validation — dev only</h2>
      <p style={{ opacity: 0.7, fontSize: 14 }}>
        Two tabs, both partners logged in: tab A starts, tab B joins with the session id.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0' }}>
        <button onClick={handleStart} disabled={!missionId}>Start session (host)</button>
        <input
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          placeholder="paste session id"
          style={{ flex: 1, minWidth: 200 }}
        />
        <button onClick={handleJoin} disabled={!sessionId}>Join session</button>
        <button onClick={handleEvent} disabled={!chanRef.current}>Send world event</button>
        <button onClick={handleSimulate} disabled={!chanRef.current}>Toggle movement sim</button>
      </div>

      <div style={{ margin: '12px 0' }}>
        <b>Presence ({online.length}):</b>{' '}
        {online.map((p) => `${p.name} (${p.role})`).join(', ') || 'nobody connected'}
      </div>
      <div>
        <b>Partner avatar (interpolated):</b> {partnerPos ?? '—'}
      </div>

      <div className="sync-log" style={{
        marginTop: 16, background: 'rgba(0,0,0,0.25)', borderRadius: 8,
        padding: 12, fontFamily: 'monospace', fontSize: 12,
        maxHeight: 260, overflowY: 'auto',
      }}>
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}
