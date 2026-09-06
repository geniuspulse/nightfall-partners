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
  const [localPoints, setLocalPoints] = useState(null);

  const pointsBalance = localPoints ?? profile?.points ?? 0;

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
    // Atomic server-side purchase: balance check, deduction, grant, and
    // ledger entry all happen in one transaction via buy_equipment RPC.
    const { data, error } = await supabase.rpc('buy_equipment', { equipment_id_param: item.id });
    if (error) {
      if (error.message?.includes('INSUFFICIENT_POINTS')) {
        setMsg({ type: 'err', text: `Not enough points — you need ◆${Number(item.cost_points).toLocaleString()}. Complete more nights together.` });
      } else {
        setMsg({ type: 'err', text: 'The Quartermaster frowns: ' + error.message });
      }
      return;
    }
    setOwned((prev) => new Set([...prev, item.id]));
    setLocalPoints(data?.points ?? null);
    setMsg({ type: 'ok', text: `${item.name} added to your pack. ◆${Number(data?.points ?? 0).toLocaleString()} remaining.` });
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
          <span className="points">◆ {Number(pointsBalance).toLocaleString()}</span>
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
