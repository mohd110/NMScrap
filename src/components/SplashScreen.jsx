import { StatusBar } from './Shared';
import { useLang } from '../context/LangContext';

export default function SplashScreen() {
  const { t } = useLang();
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

        <div className="splash-tagline">{t('splash_tagline')}</div>

        <div className="splash-progress-bar">
          <div className="splash-progress-fill" />
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div className="splash-footer-title">{t('splash_footer_title')}</div>
        <div className="splash-footer-sub">{t('splash_footer_sub')}</div>
        <div className="splash-version">v1.0.2 · NM SE Digital Infrastructure</div>
      </div>
    </div>
  );
}
