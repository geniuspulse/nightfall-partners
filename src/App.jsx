import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/AuthContext';
import Landing from './components/Landing';
import Lobby from './components/Lobby';
import Pairing from './components/Pairing';
import MissionSelect from './components/MissionSelect';
import GameRoom from './components/GameRoom';
import ResultsScreen from './components/ResultsScreen';
import Quartermaster from './components/Quartermaster';
import SyncTest from './components/dev/SyncTest';

function Protected({ children }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="loading">…</div>;
  if (!session) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/pair" element={<Protected><Pairing /></Protected>} />
      <Route path="/lobby" element={<Protected><Lobby /></Protected>} />
      <Route path="/missions" element={<Protected><MissionSelect /></Protected>} />
      <Route path="/play/:night" element={<Protected><GameRoom /></Protected>} />
      <Route path="/results/:night" element={<Protected><ResultsScreen /></Protected>} />
      <Route path="/shop" element={<Protected><Quartermaster /></Protected>} />
    <Route path="/dev/sync" element={<Protected><SyncTest /></Protected>} />
    </Routes>
  );
}
