import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

export default function LoginScreen() {
  const { signIn, signUp, isConfigured } = useAuth();
  const { lang, setLang, t } = useLang();
  const [showPass, setShowPass] = useState(false);
  const [mode, setMode] = useState('login'); // login | register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  if (!isConfigured) return <SetupNeeded />;

  const handleSubmit = async () => {
    setMsg(null);
    if (!email || !password) {
      setMsg({ type: 'error', text: t('login_need_both') });
      return;
    }
    setBusy(true);
    try {
      const fn = mode === 'login' ? signIn : signUp;
      const { data, error } = await fn(email.trim(), password);
      if (error) {
        setMsg({ type: 'error', text: error.message });
      } else if (mode === 'register' && !data.session) {
        setMsg({ type: 'ok', text: t('login_account_created') });
        setMode('login');
      }
      // On success the AuthProvider session change swaps the screen automatically.
    } catch (e) {
      setMsg({ type: 'error', text: e.message || t('login_something_wrong') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-header">
        <div className="login-logo-box"><span className="login-logo-icon">♻️</span></div>
        <div>
          <div className="login-title">{t('login_title')}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 4 }}>
            {t('login_tagline')}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {mode === 'login' ? t('login_welcome_back') : t('login_create_account')}
        </div>
        <div style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 2 }}>
          {mode === 'login' ? t('login_signin_sub') : t('login_register_sub')}
        </div>
      </div>

      <div className="login-form">
        <div className="login-form-group">
          <div className="login-label">{t('login_email')}</div>
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
          <div className="login-label">{t('login_password')}</div>
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
          {busy ? t('login_please_wait') : mode === 'login' ? t('login_btn') : t('register_btn')}
        </button>

        <div className="login-links">
          <span className="login-link" onClick={() => setMsg({ type: 'ok', text: t('login_pw_reset') })}>
            {t('login_forgot')}
          </span>
          <span className="login-link" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMsg(null); }}>
            {mode === 'login' ? t('login_register_agency') : t('login_have_account')}
          </span>
        </div>
      </div>

      <div className="login-lang-bar">
        <button className={`lang-btn ${lang === 'en' ? 'active' : 'inactive'}`} onClick={() => setLang('en')}>{t('lang_english')}</button>
        <button className={`lang-btn ${lang === 'hi' ? 'active' : 'inactive'}`} onClick={() => setLang('hi')}>{t('lang_hindi')}</button>
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
