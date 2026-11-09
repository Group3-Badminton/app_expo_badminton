import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Khôi phục phiên làm việc khi mở app
  const loadStoredSession = useCallback(async () => {
    try {
      const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.warn('Lỗi load auth session từ storage:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStoredSession();
  }, [loadStoredSession]);

  // Đăng nhập
  const login = async (credentials) => {
    const res = await authService.login(credentials);
    const payload = res.data || res;
    const currentUser = payload.user || payload;
    const tokenStr = payload.token;
    setUser(currentUser);
    setToken(tokenStr);
    return res;
  };

  // Đăng ký
  const register = async (userData) => {
    const res = await authService.register(userData);
    return res;
  };

  // Xác thực OTP kích hoạt tài khoản
  const verifyOtp = async (data) => {
    const res = await authService.verifyOtp(data);
    return res;
  };

  // Đăng xuất
  const logout = async () => {
    await authService.logout();
    setUser(null);
    setToken(null);
  };

  // Cập nhật thông tin user trong Context
  const updateUser = async (updatedData) => {
    const merged = { ...user, ...updatedData };
    setUser(merged);
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(merged));
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    login,
    register,
    verifyOtp,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được dùng bên trong AuthProvider');
  }
  return context;
};

export default AuthContext;
