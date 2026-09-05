import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

export default function Landing() {
  const { session, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  React.useEffect(() => {
    if (session) navigate('/lobby');
  }, [session]);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (mode === 'signin') {
      const { error } = await signIn(email, password);
      if (error) setError(error.message);
    } else {
      const { error } = await signUp(email, password, name || 'Wanderer');
      if (error) setError(error.message);
      else setNotice('Check your email to confirm your account, then sign in.');
    }
  };

  return (
    <div className="landing">
      <div className="landing-hero">
        <div className="lantern-glow" />
        <h1>NIGHTFALL<br />PARTNERS</h1>
        <p className="tagline">A co-op adventure for two. One sees the world. The other sees what hides beneath it.</p>
        {!session && (
          <form className="auth-card" onSubmit={submit}>
            <div className="tab-row">
              <button type="button" className={mode === 'signin' ? 'active' : ''} onClick={() => setMode('signin')}>Sign In</button>
              <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Begin Journey</button>
            </div>
            {mode === 'signup' && (
              <input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
            )}
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            {error && <div className="form-error">{error}</div>}
            {notice && <div className="form-notice">{notice}</div>}
            <button className="btn-primary" type="submit">
              {mode === 'signin' ? 'Enter the Night' : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
