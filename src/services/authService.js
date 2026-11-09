import client from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';

export const authService = {
  // Đăng nhập (Backend mong đợi { account, password })
  login: async (credentials) => {
    const payload = {
      account: (credentials.account || credentials.email || '').trim(),
      password: credentials.password,
    };
    const res = await client.post('/auth/login', payload);
    const data = res.data?.data || res.data;
    if (data && data.token) {
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user || data));
    }
    return res.data;
  },

  // Đăng ký tài khoản khách hàng mới (Backend mong đợi { fullName, email, phone, password })
  register: async (userData) => {
    const payload = {
      fullName: (userData.fullName || '').trim(),
      email: (userData.email || '').trim().toLowerCase(),
      phone: (userData.phone || userData.phoneNumber || '').trim(),
      password: userData.password,
    };
    const res = await client.post('/auth/register', payload);
    return res.data;
  },

  // Xác thực OTP kích hoạt tài khoản
  verifyOtp: async (data) => {
    const res = await client.post('/auth/verify-otp', {
      email: (data.email || '').trim().toLowerCase(),
      otp: (data.otp || '').trim(),
    });
    return res.data;
  },

  // Lấy thông tin user hiện tại
  getCurrentUser: async () => {
    const res = await client.get('/users/profile');
    return res.data;
  },

  // Cập nhật thông tin profile
  updateProfile: async (data) => {
    const res = await client.put('/users/profile', data);
    return res.data;
  },

  // Đổi mật khẩu
  changePassword: async (passwords) => {
    const res = await client.post('/users/change-password', passwords);
    return res.data;
  },

  // Đăng xuất
  logout: async () => {
    await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
  }
};

export default authService;
