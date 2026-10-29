'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserSession } from '@/models/types';

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, avatar?: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  demoLogin: async () => {},
  logout: () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('cotuong_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.id) {
          setUser(parsed);
          // Re-verify session in background without blocking UI
          fetch(`/api/auth?userId=${parsed.id}`)
            .then((res) => res.json())
            .then((data) => {
              if (data.success && data.user) {
                setUser(data.user);
                localStorage.setItem('cotuong_user', JSON.stringify(data.user));
              }
            })
            .catch(() => {});
        }
      }
    } catch (e) {
      console.error('Error fetching session:', e);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', email, password }),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Đăng nhập thất bại');
    }
    setUser(data.user);
    localStorage.setItem('cotuong_user', JSON.stringify(data.user));
  };

  const demoLogin = async () => {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'demo_login' }),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Đăng nhập tài khoản mẫu thất bại');
    }
    setUser(data.user);
    localStorage.setItem('cotuong_user', JSON.stringify(data.user));
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    avatar?: string
  ) => {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register', email, password, name, avatar }),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Đăng ký thất bại');
    }
    setUser(data.user);
    localStorage.setItem('cotuong_user', JSON.stringify(data.user));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('cotuong_user');
  };

  const refreshUser = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/auth?userId=${user.id}`);
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        localStorage.setItem('cotuong_user', JSON.stringify(data.user));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, demoLogin, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
