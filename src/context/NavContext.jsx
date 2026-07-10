import { createContext, useContext, useState, useCallback } from 'react';

const NavContext = createContext(null);

// Screens reachable from the bottom tab bar.
export const TAB_SCREENS = ['dashboard', 'inventory', 'vendors', 'reports'];

export function NavProvider({ initial = 'dashboard', children }) {
  const [stack, setStack] = useState([{ screen: initial, params: {} }]);

  const current = stack[stack.length - 1];

  // Navigate to a tab: reset the stack so back-button behaves predictably.
  const goTab = useCallback((screen) => {
    setStack([{ screen, params: {} }]);
  }, []);

  // Push a sub-screen on top (keeps history for back()).
  const navigate = useCallback((screen, params = {}) => {
    setStack((s) => [...s, { screen, params }]);
  }, []);

  const back = useCallback(() => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }, []);

  return (
    <NavContext.Provider
      value={{
        screen: current.screen,
        params: current.params,
        canGoBack: stack.length > 1,
        goTab,
        navigate,
        back,
      }}
    >
      {children}
    </NavContext.Provider>
  );
}

export function useNav() {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav must be used within NavProvider');
  return ctx;
}
