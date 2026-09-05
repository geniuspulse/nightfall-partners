import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../api/supabaseClient';
import { NIGHTS } from '../data/missions';

export default function MissionSelect() {
  const { profile, couple } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState({});
  const [dbMissions, setDbMissions] = useState([]);

  useEffect(() => {
    (async () => {
      const { data: missions } = await supabase.from('missions').select('*').order('night_number');
      setDbMissions(missions || []);
      if (couple) {
        const { data: prog } = await supabase
          .from('mission_progress')
          .select('mission_id, status')
          .eq('couple_id', couple.id);
        const map = {};
        (prog || []).forEach((p) => { map[p.mission_id] = p.status; });
        setProgress(map);
      }
    })();
  }, [couple?.id]);

  const isUnlocked = (night) => {
    if (night === 1) return true;
    const prev = dbMissions.find((m) => m.night_number === night - 1);
    return !!prev && progress[prev.id] === 'complete';
  };

  return (
    <div className="page missions">
      <div className="topbar">
        <span className="brand">🏮 Nightfall Partners</span>
        <div className="topbar-right">
          <span className="points">◆ {profile?.points ?? 0}</span>
          <button className="btn-ghost btn-sm" onClick={() => navigate('/shop')}>Quartermaster</button>
        </div>
      </div>
      <h2>Choose Your Night</h2>
      <div className="night-list">
        {dbMissions.map((m) => {
          const unlocked = isUnlocked(m.night_number);
          const done = progress[m.id] === 'complete';
          return (
            <div key={m.id} className={`night-card ${unlocked ? '' : 'locked'}`}>
              <div className="night-num">NIGHT {m.night_number}</div>
              <h3>{m.title}</h3>
              <p className="sub">{NIGHTS[m.night_number]?.summary || m.summary}</p>
              {done ? (
                <span className="badge done">✓ Complete</span>
              ) : unlocked ? (
                <button className="btn-primary" onClick={() => navigate(`/play/${m.night_number}`)}>
                  Begin
                </button>
              ) : (
                <span className="badge locked">🔒 Locked</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
