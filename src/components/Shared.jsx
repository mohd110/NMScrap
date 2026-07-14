import { useAuth } from '../context/AuthContext';
import { useNav } from '../context/NavContext';
import { useLang } from '../context/LangContext';

// Status Bar Component
export function StatusBar({ bg = '#fff' }) {
  const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false });
  return (
    <div className="status-bar" style={{ background: bg }}>
      <span className="status-bar-time">{time}</span>
      <div className="status-bar-icons">
        <span>●●●</span>
        <span>WiFi</span>
        <span>🔋</span>
      </div>
    </div>
  );
}

// Language toggle — the header pill that flips the whole app English ⇄ Hindi.
export function LangToggle() {
  const { lang, toggle, t } = useLang();
  return (
    <button
      className="header-hindi-btn"
      onClick={toggle}
      title={lang === 'en' ? 'हिंदी में बदलें' : 'Switch to English'}
      aria-label="Change language"
    >
      {lang === 'en' ? t('lang_switch_to') : t('lang_switch_back')}
    </button>
  );
}

// App Header — profile icon signs the user out, search jumps to inventory.
export function AppHeader({ title, subtitle }) {
  const { signOut } = useAuth();
  const { goTab } = useNav();
  const { t } = useLang();

  const handleProfile = () => {
    if (window.confirm(t('confirm_sign_out'))) signOut();
  };

  return (
    <div className="app-header">
      <div className="app-header-left">
        <div className="hamburger-btn" onClick={() => goTab('dashboard')} title={t('hdr_home')}>☰</div>
        <div>
          <div className="app-header-title">{title}</div>
          {subtitle && <div className="app-header-subtitle">{subtitle}</div>}
        </div>
      </div>
      <div className="app-header-right">
        <div className="header-icon-btn" onClick={() => goTab('inventory')} title={t('hdr_search_inventory')}>🔍</div>
        <div className="header-icon-btn" onClick={handleProfile} title={t('hdr_sign_out')}>👤</div>
        <LangToggle />
      </div>
    </div>
  );
}

// Back Header
export function BackHeader({ title, onBack, showLang = true }) {
  const { back } = useNav();
  return (
    <div className="back-header">
      <span className="back-btn" onClick={onBack || back}>←</span>
      <span className="back-header-title">{title}</span>
      {showLang && <LangToggle />}
    </div>
  );
}

// Bottom Navigation (becomes a left sidebar on desktop)
export function BottomNav({ className = '' }) {
  const { screen, goTab } = useNav();
  const { t } = useLang();
  const items = [
    { id: 'dashboard', label: t('nav_dashboard'), icon: '⊞' },
    { id: 'inventory', label: t('nav_inventory'), icon: '📋' },
    { id: 'vendors', label: t('nav_vendors'), icon: '🤝' },
    { id: 'reports', label: t('nav_reports'), icon: '📊' },
  ];

  return (
    <div className={`bottom-nav ${className}`.trim()}>
      <div className="nav-brand">{t('nav_brand')}</div>
      {items.map((item) => (
        <div
          key={item.id}
          className={`nav-item ${screen === item.id ? 'active' : ''}`}
          onClick={() => goTab(item.id)}
          id={`nav-${item.id}`}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
