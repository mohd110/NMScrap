import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { signIn, signUp, isConfigured } = useAuth();
  const [showPass, setShowPass] = useState(false);
  const [lang, setLang] = useState('en');
  const [mode, setMode] = useState('login'); // login | register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  if (!isConfigured) return <SetupNeeded />;

  const handleSubmit = async () => {
    setMsg(null);
    if (!email || !password) {
      setMsg({ type: 'error', text: 'Enter email and password.' });
      return;
    }
    setBusy(true);
    try {
      const fn = mode === 'login' ? signIn : signUp;
      const { data, error } = await fn(email.trim(), password);
      if (error) {
        setMsg({ type: 'error', text: error.message });
      } else if (mode === 'register' && !data.session) {
        setMsg({ type: 'ok', text: 'Account created. Check your email to confirm, then log in.' });
        setMode('login');
      }
      // On success the AuthProvider session change swaps the screen automatically.
    } catch (e) {
      setMsg({ type: 'error', text: e.message || 'Something went wrong.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-header">
        <div className="login-logo-box"><span className="login-logo-icon">♻️</span></div>
        <div>
          <div className="login-title">NM Scrap Enterprises</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 4 }}>
            BUY · TRACK · SELL · GROW
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {mode === 'login' ? 'Welcome Back' : 'Create Account'}
        </div>
        <div style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 2 }}>
          {mode === 'login' ? 'Sign in to manage your inventory' : 'Register to start tracking scrap'}
        </div>
      </div>

      <div className="login-form">
        <div className="login-form-group">
          <div className="login-label">Email</div>
          <div className="login-input-wrap">
            <span className="login-input-icon">👤</span>
            <input
              id="login-username"
              className="login-input"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="login-form-group">
          <div className="login-label">Password</div>
          <div className="login-input-wrap">
            <span className="login-input-icon">🔒</span>
            <input
              id="login-password"
              className="login-input"
              type={showPass ? 'text' : 'password'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <span className="login-input-suffix" onClick={() => setShowPass(!showPass)}>
              {showPass ? '🙈' : '👁'}
            </span>
          </div>
        </div>

        {msg && (
          <div style={{
            fontSize: 12, fontWeight: 600,
            color: msg.type === 'error' ? 'var(--danger)' : 'var(--primary)',
            background: msg.type === 'error' ? 'var(--danger-light)' : 'var(--primary-bg)',
            padding: '8px 12px', borderRadius: 8,
          }}>
            {msg.text}
          </div>
        )}

        <button id="btn-login" className="btn-login" onClick={handleSubmit} disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Login / लॉगिन' : 'Register / रजिस्टर'}
        </button>

        <div className="login-links">
          <span className="login-link" onClick={() => setMsg({ type: 'ok', text: 'Password reset: contact your admin.' })}>
            Forgot Password?
          </span>
          <span className="login-link" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMsg(null); }}>
            {mode === 'login' ? 'Register Agency' : 'Have an account? Login'}
          </span>
        </div>
      </div>

      <div className="login-lang-bar">
        <button className={`lang-btn ${lang === 'en' ? 'active' : 'inactive'}`} onClick={() => setLang('en')}>🌐 English</button>
        <button className={`lang-btn ${lang === 'hi' ? 'active' : 'inactive'}`} onClick={() => setLang('hi')}>हिंदी</button>
      </div>

      <div className="login-version">Version 1.0.2 · NM Scrap Enterprises</div>
    </div>
  );
}

function SetupNeeded() {
  return (
    <div className="login-screen" style={{ justifyContent: 'center' }}>
      <div className="login-header">
        <div className="login-logo-box"><span className="login-logo-icon">♻️</span></div>
        <div className="login-title">Almost there</div>
      </div>
      <div style={{
        background: 'var(--warning-light)', border: '1px solid var(--warning)',
        borderRadius: 12, padding: 16, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6,
      }}>
        <b style={{ color: 'var(--text-primary)' }}>Connect your Supabase project</b>
        <ol style={{ margin: '10px 0 0 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li>Create a project at supabase.com.</li>
          <li>Run <code>supabase/schema.sql</code> in the SQL Editor.</li>
          <li>Copy your Project URL + anon key into the <code>.env</code> file.</li>
          <li>Restart <code>npm run dev</code>.</li>
        </ol>
      </div>
    </div>
  );
}
