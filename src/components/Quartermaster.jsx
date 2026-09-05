import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../api/supabaseClient';

export default function Quartermaster() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState([]);
  const [owned, setOwned] = useState(new Set());
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: items } = await supabase.from('equipment').select('*').eq('is_active', true).order('cost_points');
      setCatalog(items || []);
      if (profile) {
        const { data: inv } = await supabase.from('inventory').select('equipment_id').eq('profile_id', profile.id);
        setOwned(new Set((inv || []).map((i) => i.equipment_id)));
      }
    })();
  }, [profile?.id]);

  const buyWithPoints = async (item) => {
    setMsg(null);
    if ((profile?.points ?? 0) < item.cost_points) {
      setMsg({ type: 'err', text: `Not enough points — you need ◆${item.cost_points}. Complete more nights together.` });
      return;
    }
    const newBalance = profile.points - item.cost_points;
    const { error: e1 } = await supabase.from('profiles').update({ points: newBalance }).eq('id', profile.id);
    const { error: e2 } = await supabase.from('inventory').upsert(
      { profile_id: profile.id, equipment_id: item.id }, { onConflict: 'profile_id,equipment_id' }
    );
    if (e1 || e2) { setMsg({ type: 'err', text: (e1 || e2).message }); return; }
    await supabase.from('points_ledger').insert({ profile_id: profile.id, amount: -item.cost_points, reason: `Bought ${item.name}` });
    setOwned((prev) => new Set([...prev, item.id]));
    setMsg({ type: 'ok', text: `${item.name} added to your pack.` });
    window.location.reload();
  };

  const buyWithMoney = (item) => {
    // TODO: Paychangu checkout (same pattern as Brandfletch Edge Functions)
    setMsg({ type: 'wait', text: `${item.name} is a premium relic — Paychangu checkout coming online soon. The Quartermaster holds it for you.` });
  };

  const fmt = (n) => Number(n).toLocaleString();

  return (
    <div className="page shop">
      <div className="topbar">
        <span className="brand">🏮 Quartermaster</span>
        <div className="topbar-right">
          <span className="points">◆ {profile?.points ?? 0}</span>
          <button className="btn-ghost btn-sm" onClick={() => navigate('/missions')}>Back</button>
        </div>
      </div>
      <h2>Tools of the Trade</h2>
      <p className="sub">Points are earned together — nights completed, objectives found, sync moments shared.</p>
      {msg && <div className={`feedback ${msg.type}`}>{msg.text}</div>}
      <div className="shop-grid">
        {catalog.map((item) => {
          const has = owned.has(item.id);
          return (
            <div key={item.id} className={`shop-card tier-${item.tier}`}>
              <div className="shop-icon">{item.icon}</div>
              <h3>{item.name}</h3>
              <p className="sub">{item.description}</p>
              <div className="shop-meta">
                <span className="slot-badge">{item.slot}</span>
                <span className="tier-badge">{item.tier}</span>
              </div>
              {has ? (
                <span className="badge done">✓ Owned</span>
              ) : item.cost_points > 0 ? (
                <button className="btn-primary" onClick={() => buyWithPoints(item)}>
                  Buy ◆{fmt(item.cost_points)}
                </button>
              ) : (
                <button className="btn-premium" onClick={() => buyWithMoney(item)}>
                  MK{fmt(item.cost_money)}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
