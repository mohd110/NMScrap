import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { NavProvider, useNav, TAB_SCREENS } from './context/NavContext';
import { ToastProvider } from './context/ToastContext';
import { LangProvider } from './context/LangContext';
import { StatusBar, BottomNav } from './components/Shared';
import SplashScreen from './components/SplashScreen';
import LoginScreen from './components/LoginScreen';
import DashboardScreen from './components/DashboardScreen';
import InventoryScreen from './components/InventoryScreen';
import AIBillScannerScreen from './components/AIBillScannerScreen';
import BazaarVendorsScreen from './components/BazaarVendorsScreen';
import AssignInventoryScreen from './components/AssignInventoryScreen';
import WednesdayLedgerScreen from './components/WednesdayLedgerScreen';
import ReportsScreen from './components/ReportsScreen';
import SellScreen from './components/SellScreen';

function renderScreen(screen) {
  switch (screen) {
    case 'dashboard': return <DashboardScreen />;
    case 'inventory': return <InventoryScreen />;
    case 'scanner':   return <AIBillScannerScreen />;
    case 'vendors':   return <BazaarVendorsScreen />;
    case 'assign':    return <AssignInventoryScreen />;
    case 'bazaar':    return <WednesdayLedgerScreen />;
    case 'reports':   return <ReportsScreen />;
    case 'sell':      return <SellScreen />;
    default:          return <DashboardScreen />;
  }
}

function AppShell() {
  const { screen } = useNav();
  const showTabBar = TAB_SCREENS.includes(screen);

  return (
    <div className="phone-frame phone-frame--app">
      <StatusBar />
      <div className="app-main">
        {renderScreen(screen)}
      </div>
      {/* Always rendered so it can become a sidebar on desktop; hidden on
          mobile sub-screens via the nav-when-tab-only class. */}
      <BottomNav className={showTabBar ? '' : 'nav-when-tab-only'} />
    </div>
  );
}

function Root() {
  const { session, loading } = useAuth();
  const [booted, setBooted] = useState(false);

  // Show the splash briefly on every launch.
  useEffect(() => {
    const t = setTimeout(() => setBooted(true), 1600);
    return () => clearTimeout(t);
  }, []);

  if (!booted || loading) {
    return <div className="phone-frame phone-frame--auth"><SplashScreen /></div>;
  }

  if (!session) {
    return <div className="phone-frame phone-frame--auth"><LoginScreen /></div>;
  }

  return (
    <DataProvider>
      <NavProvider initial="dashboard">
        <AppShell />
      </NavProvider>
    </DataProvider>
  );
}

export default function App() {
  return (
    <LangProvider>
      <AuthProvider>
        <ToastProvider>
          <Root />
        </ToastProvider>
      </AuthProvider>
    </LangProvider>
  );
}
