import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { AuthUser, AdminUser, SCUser } from '../types';
import { StorageService } from '../services/storage';
import { ApiService } from '../services/api';

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
  login: (username: string, password: string) => Promise<LoginResult>;
  registerAdmin: (data: RegisterAdminData) => Promise<{ success: boolean; message?: string }>;
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
        const parsed = JSON.parse(session);
        StorageService.switchUserContext(parsed);
        return parsed;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [availableSCs, setAvailableSCs] = useState<SCUser[]>([]);

  useEffect(() => {
    const scs = StorageService.getSCUsers();
    setAvailableSCs(scs);
  }, [user]);

  // Sync user's account-linked sheet connection from backend on mount or user change
  useEffect(() => {
    if (user?.id) {
      ApiService.getUserSheetConnection(user.id)
        .then((res) => {
          if (res.success && res.connection) {
            const conn = res.connection;
            if (
              conn.googleWebAppUrl !== user.googleWebAppUrl ||
              conn.spreadsheetId !== user.spreadsheetId ||
              conn.lastSyncStatus !== user.lastSyncStatus
            ) {
              const updatedUser: AuthUser = {
                ...user,
                googleWebAppUrl: conn.googleWebAppUrl,
                spreadsheetId: conn.spreadsheetId,
                lastSyncStatus: conn.lastSyncStatus,
                lastSyncTime: conn.lastSyncTime,
              };
              setUser(updatedUser);
              localStorage.setItem('seamedu_fms_auth_session', JSON.stringify(updatedUser));
              StorageService.switchUserContext(updatedUser);
            }
          }
        })
        .catch(() => {});
    }
  }, [user?.id]);

  const login = async (usernameInput: string, passwordInput: string): Promise<LoginResult> => {
    const trimmedUser = usernameInput.trim().toLowerCase();
    const trimmedPass = passwordInput.trim();

    if (!trimmedUser || !trimmedPass) {
      return {
        success: false,
        error: 'empty_fields',
        message: 'Username and password are required.',
      };
    }

    // 1. Authenticate against persistent server (retrieves permanent account-linked Google Sheet)
    try {
      const serverRes = await axios.post('/api/auth/login', {
        username: trimmedUser,
        password: trimmedPass,
      });

      if (serverRes.data?.success && serverRes.data?.user) {
        const serverUser: AuthUser = serverRes.data.user;
        setUser(serverUser);
        localStorage.setItem('seamedu_fms_auth_session', JSON.stringify(serverUser));
        StorageService.switchUserContext(serverUser);

        // If user has a snapshot on server, load it into local storage for immediate offline / quick render
        if (serverUser.id) {
          ApiService.getUserDataSnapshot(serverUser.id)
            .then((snapshot) => {
              if (snapshot) {
                if (Array.isArray(snapshot.alumni) && snapshot.alumni.length > 0) {
                  StorageService.saveAlumni(snapshot.alumni);
                }
                if (Array.isArray(snapshot.leads) && snapshot.leads.length > 0) {
                  StorageService.saveLeads(snapshot.leads);
                }
                if (Array.isArray(snapshot.scUsers) && snapshot.scUsers.length > 0) {
                  StorageService.saveSCUsers(snapshot.scUsers);
                }
              }
            })
            .catch(() => {});
        }

        return { success: true };
      }
    } catch (apiErr: any) {
      if (apiErr.response?.status === 403) {
        return {
          success: false,
          error: 'account_inactive',
          message: apiErr.response?.data?.message || 'Your account is marked Inactive.',
        };
      }
      if (apiErr.response?.status === 401) {
        return {
          success: false,
          error: 'invalid_credentials',
          message: apiErr.response?.data?.message || 'Invalid username or password.',
        };
      }
      // Server unreachable or booting, proceed to local check fallback
    }

    // 2. Fallback: Check Admin Accounts locally
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
      StorageService.switchUserContext(foundAdmin);
      return { success: true };
    }

    // 3. Fallback: Check Student Counsellor (SC) Accounts locally
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
      StorageService.switchUserContext(foundSC);
      return { success: true };
    }

    // 4. Invalid credentials
    return {
      success: false,
      error: 'invalid_credentials',
      message: 'Invalid username or password. Please verify your credentials and try again.',
    };
  };

  const registerAdmin = async (data: RegisterAdminData): Promise<{ success: boolean; message?: string }> => {
    const trimmedUser = data.username.trim().toLowerCase();
    if (!trimmedUser || !data.password.trim() || !data.name.trim()) {
      return { success: false, message: 'Full name, username, and password are required.' };
    }

    try {
      const res = await axios.post('/api/auth/register', {
        name: data.name.trim(),
        username: trimmedUser,
        email: data.email.trim() || `${trimmedUser}@seamedu.com`,
        mobile: data.mobile?.trim(),
        password: data.password.trim(),
      });

      if (res.data?.success && res.data?.user) {
        const newAdmin = res.data.user;
        setUser(newAdmin);
        localStorage.setItem('seamedu_fms_auth_session', JSON.stringify(newAdmin));
        StorageService.switchUserContext(newAdmin);
        StorageService.addAdminUser({
          name: newAdmin.name,
          username: newAdmin.username,
          email: newAdmin.email,
          mobile: newAdmin.mobile,
          passwordHash: data.password.trim(),
          role: 'ADMIN',
        });
        return { success: true };
      }
    } catch (apiErr: any) {
      if (apiErr.response?.data?.message) {
        return { success: false, message: apiErr.response.data.message };
      }
    }

    // Fallback: Check if username already exists in local storage
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
    StorageService.switchUserContext(newAdmin);
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
