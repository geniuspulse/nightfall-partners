import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

export default function Lobby() {
  const { session, couple, loading, signOut } = useAuth();
  const navigate = useNavigate();

  if (!loading && session && !couple) {
    navigate('/pair');
  }

  return (
    <div className="page lobby">
      <div className="topbar">
        <span className="brand">🏮 Nightfall Partners</span>
        <button className="btn-ghost btn-sm" onClick={signOut}>Sign Out</button>
      </div>
      <div className="lobby-body">
        <h2>The night is waiting.</h2>
        {couple?.player_b ? (
          <p className="sub">You and your partner are bonded. The first night calls.</p>
        ) : (
          <p className="sub">Your bond isn't complete yet.</p>
        )}
        <button className="btn-primary" onClick={() => navigate(couple?.player_b ? '/missions' : '/pair')}>
          {couple?.player_b ? 'Choose a Night' : 'Bond With Your Partner'}
        </button>
      </div>
    </div>
  );
}
