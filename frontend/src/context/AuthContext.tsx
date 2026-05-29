import {
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";
import type { PropsWithChildren } from "react";
import type { AuthUser } from "../services/authService";

const AUTH_USER_KEY = "auth-user";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  setAuthenticatedUser: (user: AuthUser) => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getInitialUser() {
  const storedUser = localStorage.getItem(AUTH_USER_KEY);
  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser) as AuthUser;
  } catch {
    localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(() => getInitialUser());

  const setAuthenticatedUser = (nextUser: AuthUser) => {
    setUser(nextUser);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser));
  };

  const clearAuth = () => {
    setUser(null);
    localStorage.removeItem(AUTH_USER_KEY);
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user !== null,
      setAuthenticatedUser,
      clearAuth,
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
