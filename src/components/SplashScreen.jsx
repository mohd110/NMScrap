import { StatusBar } from './Shared';

export default function SplashScreen() {
  return (
    <div className="splash-screen">
      <StatusBar />

      <div className="splash-logo-container">
        <div className="splash-logo-box">
          <span className="splash-logo-icon">♻️</span>
        </div>

        <div>
          <div className="splash-title">NM Scrap{'\n'}Enterprises</div>
        </div>

        <div className="splash-tagline">BUY · TRACK · SELL · GROW</div>

        <div className="splash-progress-bar">
          <div className="splash-progress-fill" />
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div className="splash-footer-title">Inventory Management System</div>
        <div className="splash-footer-sub">Reliability &amp; Efficiency in Motion</div>
        <div className="splash-version">v1.0.2 · NM SE Digital Infrastructure</div>
      </div>
    </div>
  );
}
