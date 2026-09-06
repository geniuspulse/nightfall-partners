import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../api/supabaseClient';
import { NIGHTS } from '../data/missions';
import {
  roleForUser, initGameState, loadState, patchState,
  subscribeToState, resolveChoice, resolveCode, resolveSyncTap,
  progressRoom,
} from '../lib/gameEngine';

export default function GameRoom() {
  const { night } = useParams();
  const { session, profile, couple } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState(null);
  const [missionId, setMissionId] = useState(null);
  const [codeVal, setCodeVal] = useState('');
  const [feedback, setFeedback] = useState(null);
  const unsubRef = useRef(null);
  const mission = NIGHTS[Number(night)];

  const myRole = roleForUser(session?.user?.id, couple);
  const partnerName = 'Your partner';
  const userId = session?.user?.id;

  // ── Setup: get mission db id, init/restore state, subscribe ──
  useEffect(() => {
    if (!couple || !mission) return;
    let dead = false;

    (async () => {
      const { data: m } = await supabase
        .from('missions').select('id').eq('night_number', Number(night)).single();
      if (dead || !m) return;
      setMissionId(m.id);

      let existing = await loadState(couple.id, m.id);
      if (!existing || existing.roomIndex >= mission.rooms.length) {
        existing = await initGameState(couple.id, m.id);
      }
      setState(existing);

      // If previously completed, reset for replay
      // (points were already awarded — complete_mission never double-awards)
      const { data: prog } = await supabase
        .from('mission_progress')
        .select('status')
        .eq('couple_id', couple.id)
        .eq('mission_id', m.id)
        .maybeSingle();
      if (prog?.status === 'complete' && !existing?.finished) {
        await initGameState(couple.id, m.id);
        setState(await loadState(couple.id, m.id));
      }

      unsubRef.current = subscribeToState(couple.id, m.id, (s) => {
        if (s) setState(s);
      });
    })();

    return () => { dead = true; unsubRef.current?.(); };
  }, [couple?.id, night]);

  if (!mission || mission.locked) {
    return <div className="page"><p className="sub">This night is still locked.</p></div>;
  }
  if (!state) return <div className="page loading">The veil is thinning…</div>;

  const room = mission.rooms[state.roomIndex];
  const isFinale = state.phase === 'finale' || state.roomIndex >= mission.rooms.length;

  // ── Handlers ──
  const castVote = async (optionId) => {
    setFeedback(null);
    await patchState(couple.id, missionId, (s) => {
      s.votes[userId] = optionId;
      return s;
    });
  };

  const submitCode = async () => {
    setFeedback(null);
    await patchState(couple.id, missionId, (s) => {
      s.codeEntries[userId] = codeVal;
      return s;
    });
    // Evaluate after both entered
    setTimeout(async () => {
      const fresh = await loadState(couple.id, missionId);
      const res = resolveCode(fresh, room);
      if (res.correct) {
        await patchState(couple.id, missionId, (s) => {
          s.objectivesDone += 1;
          s.syncHits += 1;
          s.attempts[room.id] = (s.attempts[room.id] || 0) + 1;
          return s;
        });
        setFeedback({ type: 'ok', text: room.interaction.explain });
        setTimeout(async () => {
          await patchState(couple.id, missionId, (s) => progressRoom(s));
        }, 3500);
      } else if (res.hasBoth) {
        await patchState(couple.id, missionId, (s) => {
          s.syncMisses += 1;
          s.attempts[room.id] = (s.attempts[room.id] || 0) + 1;
          s.codeEntries = {};
          return s;
        });
        setCodeVal('');
        setFeedback({ type: 'err', text: 'The lock refuses. Read your clues again — together.' });
      } else {
        setFeedback({ type: 'wait', text: 'Waiting for your partner\'s answer…' });
      }
    }, 800);
  };

  const syncTap = async () => {
    setFeedback(null);
    await patchState(couple.id, missionId, (s) => {
      s.taps[userId] = Date.now();
      return s;
    });
    setTimeout(async () => {
      const fresh = await loadState(couple.id, missionId);
      const res = resolveSyncTap(fresh, room);
      if (res.inWindow) {
        await patchState(couple.id, missionId, (s) => {
          s.objectivesDone += 1;
          s.syncHits += 1;
          return s;
        });
        setFeedback({ type: 'ok', text: room.interaction.explain });
        setTimeout(async () => {
          const cur = await loadState(couple.id, missionId);
          if (cur.roomIndex + 1 >= mission.rooms.length) {
            await finishMission(cur);
          } else {
            await patchState(couple.id, missionId, (s) => progressRoom(s));
          }
        }, 3500);
      } else if (res.done) {
        await patchState(couple.id, missionId, (s) => {
          s.syncMisses += 1;
          s.taps = {};
          return s;
        });
        setFeedback({ type: 'err', text: 'The veil holds. You reached, but not together. Try again.' });
      } else {
        setFeedback({ type: 'wait', text: 'Waiting for your partner to reach…' });
      }
    }, 800);
  };

  // Choice evaluation (watch state for both votes)
  useEffect(() => {
    if (!room || room.interaction.type !== 'choice' || feedback?.type === 'ok') return;
    const res = resolveChoice(state, room);
    if (res.done && feedback?.type !== 'ok') {
      if (res.correct) {
        (async () => {
          await patchState(couple.id, missionId, (s) => {
            s.objectivesDone += 1;
            s.syncHits += res.agree ? 1 : 0;
            s.syncMisses += res.agree ? 0 : 1;
            s.attempts[room.id] = (s.attempts[room.id] || 0) + 1;
            return s;
          });
          setFeedback({ type: 'ok', text: room.interaction.explain });
          setTimeout(async () => {
            const cur = await loadState(couple.id, missionId);
            if (cur.roomIndex + 1 >= mission.rooms.length) {
              await finishMission(cur);
            } else {
              await patchState(couple.id, missionId, (s) => progressRoom(s));
            }
          }, 3500);
        })();
      } else {
        setFeedback({
          type: res.agree ? 'err' : 'desync',
          text: res.agree
            ? 'Wrong path together. The veil shudders. Look again at what only you can see.'
            : 'You chose different paths. The veil weakens when you are divided. Discuss, then choose again.',
        });
        setTimeout(async () => {
          await patchState(couple.id, missionId, (s) => {
            s.votes = {};
            s.attempts[room.id] = (s.attempts[room.id] || 0) + 1;
            return s;
          });
        }, 3000);
      }
    }
  }, [state?.votes]);

  const finishMission = async (finalState) => {
    await patchState(couple.id, missionId, (s) => ({ ...s, phase: 'finale', finished: true }));
    // Server computes the score, records progress, and awards BOTH
    // partners atomically — clients can no longer write these tables.
    const { error } = await supabase.rpc('complete_mission', { mission_id_param: missionId });
    if (error) console.error('complete_mission failed:', error.message);
    navigate(`/results/${night}`);
  };

  // ── Render ──
  if (isFinale) {
    return (
      <div className="page gameroom finale">
        <h2>{mission.finale.title}</h2>
        <p className="story">{mission.finale.text}</p>
        <button className="btn-primary" onClick={() => navigate('/missions')}>Return to Camp</button>
      </div>
    );
  }

  const i = room.interaction;
  const myVote = state.votes[userId];
  const bothVoted = Object.keys(state.votes).length >= 2;

  return (
    <div className={`page gameroom role-${myRole}`}>
      <div className="topbar">
        <span className="brand">🏮 Night {night}</span>
        <span className="room-progress">Room {state.roomIndex + 1} / {mission.rooms.length}</span>
      </div>

      <div className="role-banner">
        {myRole === 'pathfinder' ? '🌤 You are the PATHFINDER — eyes of the daylight layer' : '🌑 You are the SEER — eyes of the shadow layer'}
      </div>

      <h2>{room.title}</h2>
      <p className="story">{room.story}</p>

      <div className="clue-card">
        <div className="clue-label">Only you can see this:</div>
        <p className="clue">{room.clues[myRole]}</p>
        <p className="clue-note">Describe it to your partner — out loud. They see something you cannot.</p>
      </div>

      {i.type === 'choice' && (
        <div className="interaction">
          <p className="prompt">{i.prompt}</p>
          <div className="choices">
            {i.options.map((o) => (
              <button
                key={o.id}
                className={`choice-btn ${myVote === o.id ? 'selected' : ''}`}
                onClick={() => castVote(o.id)}
              >
                {o.label}
              </button>
            ))}
          </div>
          {myVote && !bothVoted && <p className="sub">Locked in. Waiting for {partnerName}…</p>}
        </div>
      )}

      {i.type === 'code' && (
        <div className="interaction">
          <p className="prompt">{i.prompt}</p>
          <input
            className="code-input"
            placeholder="Enter the answer…"
            value={codeVal}
            onChange={(e) => setCodeVal(e.target.value)}
          />
          <button className="btn-primary" onClick={submitCode}>Speak the Answer</button>
        </div>
      )}

      {i.type === 'sync-tap' && (
        <div className="interaction">
          <p className="prompt">{i.prompt}</p>
          <button className="reach-btn" onClick={syncTap}>🤝 REACH</button>
        </div>
      )}

      {feedback && (
        <div className={`feedback ${feedback.type}`}>
          {feedback.type === 'ok' ? '✨ ' : feedback.type === 'err' ? '💀 ' : '💜 '}
          {feedback.text}
        </div>
      )}
    </div>
  );
}
