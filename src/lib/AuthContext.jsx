import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { User } from '@/api/entities';

const AuthContext = createContext(null);

/**
 * Session state for the whole app.
 *
 * The session itself is an HTTP-only cookie the browser sends automatically —
 * there is no token in JavaScript to steal or to keep in sync. This provider
 * only mirrors "who is signed in" so the UI can react to it.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoadingAuth(true);
    try {
      setUser(await User.me());
    } catch {
      // 401 is the normal case for a public visitor, not an error.
      setUser(null);
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email, password) => {
    const { user: signedIn } = await User.login(email, password);
    setUser(signedIn);
    return signedIn;
  }, []);

  const logout = useCallback(async () => {
    await User.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isAdmin: user?.role === 'admin',
        isLoadingAuth,
        login,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
