import { createContext, useContext, useEffect, useState } from "react";
import { authAPI } from "@/services/api";

const USER_STORAGE_KEY = "user";
const USER_ID_STORAGE_KEY = "userId";
const USER_LOGIN_AT_KEY = "userLoginAt";

const AuthContext = createContext(undefined);

const buildSafeUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    address: user.address,
    role: user.role ?? "user",
    managerOfShop: user.managerOfShop,
    helperPermissions: user.helperPermissions,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      let storedUserId = localStorage.getItem(USER_ID_STORAGE_KEY);
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      const storedLoginAt = localStorage.getItem(USER_LOGIN_AT_KEY);

      // 30 days in milliseconds
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

      // Auto-logout if last login was more than 30 days ago
      if (storedLoginAt) {
        const loginTime = Number(storedLoginAt);
        if (!Number.isNaN(loginTime) && Date.now() - loginTime > THIRTY_DAYS_MS) {
          localStorage.removeItem(USER_STORAGE_KEY);
          localStorage.removeItem(USER_ID_STORAGE_KEY);
          localStorage.removeItem(USER_LOGIN_AT_KEY);
          if (isMounted) {
            setCurrentUser(null);
            setLoading(false);
          }
          return;
        }
      }

      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser?.id) {
            storedUserId = storedUserId ?? parsedUser.id;
            const safeStoredUser = buildSafeUser(parsedUser);
            if (isMounted) {
              setCurrentUser(safeStoredUser);
            }
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(safeStoredUser));
            if (!storedUserId) {
              localStorage.setItem(USER_ID_STORAGE_KEY, safeStoredUser.id);
            }
          } else {
            localStorage.removeItem(USER_STORAGE_KEY);
          }
        } catch (error) {
          console.error("Failed to parse user data:", error);
          localStorage.removeItem(USER_STORAGE_KEY);
        }
      }

      if (!storedUserId) {
        if (isMounted) {
          setCurrentUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const user = await authAPI.getCurrentUser(storedUserId);
        if (!isMounted) {
          return;
        }
        const safeUser = buildSafeUser(user);
        setCurrentUser(safeUser);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(safeUser));
        localStorage.setItem(USER_ID_STORAGE_KEY, safeUser.id);
        // refresh also counts as activity, extend 30-day window
        localStorage.setItem(USER_LOGIN_AT_KEY, String(Date.now()));
      } catch (error) {
        if (!isMounted) {
          return;
        }
        console.error("Failed to load user data:", error);
        setCurrentUser(null);
        localStorage.removeItem(USER_STORAGE_KEY);
        localStorage.removeItem(USER_ID_STORAGE_KEY);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (credentials) => {
    const user = await authAPI.login(credentials);
    const safeUser = buildSafeUser(user);
    setCurrentUser(safeUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(safeUser));
    localStorage.setItem(USER_ID_STORAGE_KEY, safeUser.id);
    localStorage.setItem(USER_LOGIN_AT_KEY, String(Date.now()));
    return safeUser;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(USER_ID_STORAGE_KEY);
    localStorage.removeItem(USER_LOGIN_AT_KEY);
  };

  const register = async (payload) => {
    const user = await authAPI.register(payload);
    const safeUser = buildSafeUser(user);
    setCurrentUser(safeUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(safeUser));
    localStorage.setItem(USER_ID_STORAGE_KEY, safeUser.id);
    localStorage.setItem(USER_LOGIN_AT_KEY, String(Date.now()));
    return safeUser;
  };

  const updateUser = async (payload) => {
    if (!currentUser?.id) {
      throw new Error("No user logged in");
    }

    const user = await authAPI.update(currentUser.id, payload);
    const safeUser = buildSafeUser(user);
    setCurrentUser(safeUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(safeUser));
    localStorage.setItem(USER_ID_STORAGE_KEY, safeUser.id);
    localStorage.setItem(USER_LOGIN_AT_KEY, String(Date.now()));
    return safeUser;
  };

  const refreshUser = async () => {
    const userId = currentUser?.id ?? localStorage.getItem(USER_ID_STORAGE_KEY);
    if (!userId) {
      return null;
    }

    const user = await authAPI.getCurrentUser(userId);
    const safeUser = buildSafeUser(user);
    setCurrentUser(safeUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(safeUser));
    localStorage.setItem(USER_ID_STORAGE_KEY, safeUser.id);
    localStorage.setItem(USER_LOGIN_AT_KEY, String(Date.now()));
    return safeUser;
  };

  const value = {
    currentUser,
    isAdmin: currentUser?.role === "admin" || currentUser?.role === "owner" || currentUser?.role === "xodim",
    login,
    logout,
    register,
    updateUser,
    refreshUser,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
