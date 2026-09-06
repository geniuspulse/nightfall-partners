import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../api/supabaseClient';

const genCode = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

export default function Pairing() {
  const { session, couple, setCouple } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState(null);
  const [code, setCode] = useState('');
  const [myCode, setMyCode] = useState(null);
  const [error, setError] = useState(null);
  const [waiting, setWaiting] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (couple?.player_a && couple?.player_b) navigate('/missions');
  }, [couple]);

  // If already player A with an open invite, show waiting state
  useEffect(() => {
    if (couple && !couple.player_b) {
      setMode('created');
      setMyCode(couple.invite_code);
      setWaiting(true);

      // Watch for partner joining
      const sub = supabase
        .channel(`couple:${couple.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'couples', filter: `id=eq.${couple.id}` },
          (payload) => {
            if (payload.new.player_b) navigate('/missions');
          })
        .subscribe();
      return () => supabase.removeChannel(sub);
    }
  }, [couple?.id]);

  const createInvite = async () => {
    setError(null);
    const invite = genCode();
    const { data, error: e } = await supabase
      .from('couples')
      .insert({ player_a: session.user.id, invite_code: invite })
      .select()
      .single();
    if (e) { setError(e.message); return; }
    setCouple(data);
    setMyCode(invite);
    setMode('created');
    setWaiting(true);
  };

  const joinWithCode = async () => {
    setError(null);
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setError('Enter the full 6-letter code your partner shared with you.');
      return;
    }
    setJoining(true);
    const { data, error: e } = await supabase.rpc('join_couple', { invite_code_param: trimmed });
    setJoining(false);
    if (e) {
      if (e.message?.includes('INVALID_OR_CLOSED_INVITE')) {
        setError('That code is wrong, already used, or it\'s your own invite. Double-check with your partner.');
      } else {
        setError(e.message);
      }
      return;
    }
    setCouple(data);
    navigate('/missions');
  };

  return (
    <div className="page pairing">
      <h2>Bond With Your Partner</h2>
      <p className="sub">Nightfall Partners is played as a pair. One of you creates the bond, the other joins it.</p>
      {mode === null && (
        <div className="pair-choices">
          <button className="btn-primary" onClick={createInvite}>Create a Bond</button>
          <button className="btn-ghost" onClick={() => setMode('join')}>I Have a Code</button>
        </div>
      )}
      {mode === 'created' && (
        <div className="invite-box">
          <p>Share this code with your partner:</p>
          <div className="invite-code">{myCode}</div>
          {waiting && <p className="sub">Waiting for your partner to join…</p>}
        </div>
      )}
      {mode === 'join' && (
        <div className="invite-box">
          <label className="field-label" htmlFor="invite-code-field">Enter your partner's 6-letter code</label>
          <input
            id="invite-code-field"
            className="code-input"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            autoFocus
            placeholder="ABCDEF"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            onKeyDown={(e) => { if (e.key === 'Enter') joinWithCode(); }}
          />
          <button className="btn-primary" onClick={joinWithCode} disabled={joining}>
            {joining ? 'Joining…' : 'Join Bond'}
          </button>
          {error && <div className="form-error">{error}</div>}
        </div>
      )}
      {error && mode === null && <div className="form-error">{error}</div>}
    </div>
  );
}
