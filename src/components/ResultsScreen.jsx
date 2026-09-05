import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../api/supabaseClient';
import { NIGHTS } from '../data/missions';

export default function ResultsScreen() {
  const { night } = useParams();
  const { couple, profile } = useAuth();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);

  useEffect(() => {
    (async () => {
      if (!couple) return;
      const { data: m } = await supabase
        .from('missions').select('id').eq('night_number', Number(night)).single();
      const { data } = await supabase
        .from('mission_progress')
        .select('*')
        .eq('couple_id', couple.id)
        .eq('mission_id', m.id)
        .maybeSingle();
      setResult(data);
    })();
  }, [couple?.id]);

  if (!result) return <div className="page loading">Counting the night\'s spoils…</div>;

  return (
    <div className="page results">
      <div className="result-glow" />
      <h2>{NIGHTS[Number(night)]?.title} — Complete</h2>
      <div className="score-grid">
        <div className="score-tile"><span className="score-num">{result.score}</span><span>Score</span></div>
        <div className="score-tile"><span className="score-num">◆ {result.points_awarded}</span><span>Points Each</span></div>
        <div className="score-tile"><span className="score-num">{result.objectives_done}/3</span><span>Objectives</span></div>
        <div className="score-tile"><span className="score-num">{result.sync_score}</span><span>Sync Moments</span></div>
      </div>
      <div className="result-actions">
        <button className="btn-primary" onClick={() => navigate('/missions')}>Next Night</button>
        <button className="btn-ghost" onClick={() => navigate('/shop')}>Spend Points</button>
      </div>
    </div>
  );
}
