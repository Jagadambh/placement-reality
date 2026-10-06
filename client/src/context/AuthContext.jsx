import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('pr_auth_token') || null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    const currentToken = localStorage.getItem('pr_auth_token');
    if (!currentToken) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const res = await authApi.getMe();
      if (res.data?.success && res.data.data?.user) {
        setUser(res.data.data.user);
        return res.data.data.user;
      }
      return null;
    } catch (err) {
      console.warn('[Auth] Session expired or invalid, resetting auth state');
      logout();
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [token]);

  const login = async (email, password) => {
    // Purge any stale tokens and user profile before authenticating
    localStorage.removeItem('pr_auth_token');
    setUser(null);
    setToken(null);

    const res = await authApi.login({ email, password });
    if (res.data?.success) {
      const { user: loggedInUser, token: authToken } = res.data.data;
      localStorage.setItem('pr_auth_token', authToken);
      setToken(authToken);

      // Verify and fetch fresh populated profile directly from backend
      try {
        const profileRes = await authApi.getMe();
        if (profileRes.data?.success && profileRes.data.data?.user) {
          setUser(profileRes.data.data.user);
          return profileRes.data.data.user;
        }
      } catch (profileErr) {
        console.warn('[Auth] Immediate profile sync fallback to login response:', profileErr);
      }

      setUser(loggedInUser);
      return loggedInUser;
    }
    throw new Error(res.data?.message || 'Login failed');
  };

  const register = async (userData) => {
    // Purge any stale tokens and user profile before registering
    localStorage.removeItem('pr_auth_token');
    setUser(null);
    setToken(null);

    const res = await authApi.register(userData);
    if (res.data?.success) {
      const { user: registeredUser, token: authToken } = res.data.data;
      localStorage.setItem('pr_auth_token', authToken);
      setToken(authToken);

      try {
        const profileRes = await authApi.getMe();
        if (profileRes.data?.success && profileRes.data.data?.user) {
          setUser(profileRes.data.data.user);
          return res.data;
        }
      } catch (profileErr) {
        console.warn('[Auth] Immediate profile sync fallback to register response:', profileErr);
      }

      setUser(registeredUser);
      return res.data;
    }
    throw new Error(res.data?.message || 'Registration failed');
  };

  const logout = () => {
    localStorage.removeItem('pr_auth_token');
    try {
      sessionStorage.clear();
    } catch (_) {}
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser((prev) => (prev ? { ...prev, ...updatedUser } : updatedUser));
  };

  const changePassword = async (currentPassword, newPassword) => {
    const res = await authApi.changePassword({ currentPassword, newPassword });
    if (res.data?.success) {
      if (res.data.data?.user) {
        setUser(res.data.data.user);
      } else {
        setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : null));
      }
      return res.data;
    }
    throw new Error(res.data?.message || 'Password update failed');
  };

  const submitStudentJoin = async (formData) => {
    localStorage.removeItem('pr_auth_token');
    setUser(null);
    setToken(null);
    const res = await authApi.studentJoinSubmit(formData);
    if (res.data?.success) {
      const { user: newUser, token: authToken } = res.data.data;
      localStorage.setItem('pr_auth_token', authToken);
      setToken(authToken);
      setUser(newUser);
      return res.data;
    }
    throw new Error(res.data?.message || 'Submission failed');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: Boolean(user && token),
        mustChangePassword: Boolean(user?.mustChangePassword),
        login,
        register,
        logout,
        updateUser,
        changePassword,
        submitStudentJoin,
        refreshProfile: fetchProfile,
        isStudent: user?.role === 'student',
        isModerator: user?.role === 'moderator' || user?.role === 'admin',
        isAdmin: user?.role === 'admin',
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
