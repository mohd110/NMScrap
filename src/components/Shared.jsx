import { useAuth } from '../context/AuthContext';
import { useNav } from '../context/NavContext';

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

// App Header — profile icon signs the user out, search jumps to inventory.
export function AppHeader({ title, subtitle, hindiLabel = 'हिंदी' }) {
  const { signOut } = useAuth();
  const { goTab } = useNav();

  const handleProfile = () => {
    if (window.confirm('Sign out of NM Scrap Enterprises?')) signOut();
  };

  return (
    <div className="app-header">
      <div className="app-header-left">
        <div className="hamburger-btn" onClick={() => goTab('dashboard')} title="Home">☰</div>
        <div>
          <div className="app-header-title">{title}</div>
          {subtitle && <div className="app-header-subtitle">{subtitle}</div>}
        </div>
      </div>
      <div className="app-header-right">
        <div className="header-icon-btn" onClick={() => goTab('inventory')} title="Search inventory">🔍</div>
        <div className="header-icon-btn" onClick={handleProfile} title="Sign out">👤</div>
        {hindiLabel && <div className="header-hindi-btn">{hindiLabel}</div>}
      </div>
    </div>
  );
}

// Back Header
export function BackHeader({ title, onBack, rightLabel }) {
  const { back } = useNav();
  return (
    <div className="back-header">
      <span className="back-btn" onClick={onBack || back}>←</span>
      <span className="back-header-title">{title}</span>
      {rightLabel && <span className="header-hindi-btn">{rightLabel}</span>}
    </div>
  );
}

// Bottom Navigation (becomes a left sidebar on desktop)
export function BottomNav({ className = '' }) {
  const { screen, goTab } = useNav();
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
    { id: 'inventory', label: 'Inventory', icon: '📋' },
    { id: 'vendors', label: 'Vendors', icon: '🤝' },
    { id: 'reports', label: 'Reports', icon: '📊' },
  ];

  return (
    <div className={`bottom-nav ${className}`.trim()}>
      <div className="nav-brand">🔩 NM Scrap</div>
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
