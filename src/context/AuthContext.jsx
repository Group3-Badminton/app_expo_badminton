import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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
  const login = useCallback(async (credentials) => {
    const res = await authService.login(credentials);
    const payload = res.data || res;
    const currentUser = payload.user || payload;
    const tokenStr = payload.token;
    setUser(currentUser);
    setToken(tokenStr);
    return res;
  }, []);

  // Đăng ký
  const register = useCallback(async (userData) => {
    const res = await authService.register(userData);
    return res;
  }, []);

  // Xác thực OTP kích hoạt tài khoản
  const verifyOtp = useCallback(async (data) => {
    const res = await authService.verifyOtp(data);
    return res;
  }, []);

  // Gửi mã OTP khôi phục mật khẩu
  const sendOtp = useCallback(async (email) => {
    const res = await authService.sendOtp(email);
    return res;
  }, []);

  // Đặt lại mật khẩu mới (Quên mật khẩu)
  const resetPassword = useCallback(async (data) => {
    const res = await authService.resetPassword(data);
    return res;
  }, []);

  // Đăng xuất
  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setToken(null);
  }, []);

  // Cập nhật thông tin user trong Context (sử dụng functional updater để không đổi reference hàm)
  const updateUser = useCallback(async (updatedData) => {
    setUser((prevUser) => {
      const merged = { ...(prevUser || {}), ...updatedData };
      AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(merged)).catch((err) =>
        console.warn('Lỗi lưu user vào storage:', err)
      );
      return merged;
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: !!token,
      login,
      register,
      verifyOtp,
      sendOtp,
      resetPassword,
      logout,
      updateUser,
    }),
    [user, token, loading, login, register, verifyOtp, sendOtp, resetPassword, logout, updateUser]
  );

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
