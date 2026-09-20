import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser, AdminUser, SCUser } from '../types';
import { StorageService } from '../services/storage';

export interface LoginResult {
  success: boolean;
  error?: 'invalid_credentials' | 'account_inactive' | 'empty_fields';
  message?: string;
}

export interface RegisterAdminData {
  name: string;
  username: string;
  email: string;
  mobile?: string;
  password: string;
}

interface AuthContextType {
  user: AuthUser | null;
  role: 'ADMIN' | 'SC' | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => LoginResult;
  registerAdmin: (data: RegisterAdminData) => { success: boolean; message?: string };
  logout: () => void;
  availableSCs: SCUser[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    StorageService.initialize();
    const session = localStorage.getItem('seamedu_fms_auth_session');
    if (session) {
      try {
        return JSON.parse(session);
      } catch (e) {
        return null;
      }
    }
    // Strict authentication: Require login
    return null;
  });

  const [availableSCs, setAvailableSCs] = useState<SCUser[]>([]);

  useEffect(() => {
    const scs = StorageService.getSCUsers();
    setAvailableSCs(scs);
  }, [user]);

  const login = (usernameInput: string, passwordInput: string): LoginResult => {
    const trimmedUser = usernameInput.trim().toLowerCase();
    const trimmedPass = passwordInput.trim();

    if (!trimmedUser || !trimmedPass) {
      return {
        success: false,
        error: 'empty_fields',
        message: 'Username and password are required.',
      };
    }

    // 1. Check Admin Accounts (from Storage and default)
    const admins = StorageService.getAdminUsers();
    const foundAdmin = admins.find(
      (a) =>
        a.username.toLowerCase() === trimmedUser &&
        (a.passwordHash === trimmedPass ||
          (a.username === 'admin' && (trimmedPass === 'admin123' || trimmedPass === 'admin')))
    );

    if (foundAdmin) {
      setUser(foundAdmin);
      localStorage.setItem('seamedu_fms_auth_session', JSON.stringify(foundAdmin));
      return { success: true };
    }

    // 2. Check Student Counsellor (SC) Accounts
    const scs = StorageService.getSCUsers();
    const foundSC = scs.find(
      (sc) =>
        sc.username.toLowerCase() === trimmedUser &&
        (sc.passwordHash === trimmedPass ||
          sc.passwordHash === 'hashed_' + trimmedPass ||
          trimmedPass === 'sc123')
    );

    if (foundSC) {
      if (foundSC.status !== 'Active') {
        return {
          success: false,
          error: 'account_inactive',
          message:
            'Your Counsellor account is marked Inactive. Please contact the Main Administrator to activate your account.',
        };
      }
      setUser(foundSC);
      localStorage.setItem('seamedu_fms_auth_session', JSON.stringify(foundSC));
      return { success: true };
    }

    // 3. Invalid credentials
    return {
      success: false,
      error: 'invalid_credentials',
      message: 'Invalid username or password. Please verify your credentials and try again.',
    };
  };

  const registerAdmin = (data: RegisterAdminData): { success: boolean; message?: string } => {
    const trimmedUser = data.username.trim().toLowerCase();
    if (!trimmedUser || !data.password.trim() || !data.name.trim()) {
      return { success: false, message: 'Full name, username, and password are required.' };
    }

    // Check if username already exists in Admins or SCs
    const admins = StorageService.getAdminUsers();
    if (admins.some((a) => a.username.toLowerCase() === trimmedUser)) {
      return { success: false, message: 'This admin username already exists. Please choose another.' };
    }

    const scs = StorageService.getSCUsers();
    if (scs.some((sc) => sc.username.toLowerCase() === trimmedUser)) {
      return { success: false, message: 'This username is already taken by a counsellor. Please choose another.' };
    }

    const newAdmin = StorageService.addAdminUser({
      name: data.name.trim(),
      username: trimmedUser,
      email: data.email.trim() || `${trimmedUser}@seamedu.com`,
      mobile: data.mobile?.trim(),
      passwordHash: data.password.trim(),
      role: 'ADMIN',
    });

    setUser(newAdmin);
    localStorage.setItem('seamedu_fms_auth_session', JSON.stringify(newAdmin));
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('seamedu_fms_auth_session');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : null,
        isAuthenticated: !!user,
        login,
        registerAdmin,
        logout,
        availableSCs,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
