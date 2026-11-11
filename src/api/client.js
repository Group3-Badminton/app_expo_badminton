import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, STORAGE_KEYS } from '../utils/constants';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000, // Timeout 5 giây: Nếu không kết nối được backend sẽ ngắt ngay, không để xoay vô tận
  headers: {
    'Content-Type': 'application/json',
  },
});

console.log('🌐 [API Client] Base URL kết nối:', API_BASE_URL);

// Interceptor: Tự động gán JWT Token vào Header của mỗi request
client.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('Lỗi đọc token từ AsyncStorage', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor: Bắt lỗi phản hồi chung
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      error.customMessage = `Quá thời gian kết nối (5s) tới: ${API_BASE_URL}. Vui lòng kiểm tra lại kết nối mạng hoặc xem Backend Server đã bật chưa!`;
    } else if (!error.response) {
      error.customMessage = `Không thể kết nối đến máy chủ (${API_BASE_URL}). Hãy đảm bảo API Backend (port 9999) đang chạy!`;
    } else if (
      error.response?.status === 401 ||
      (error.response?.status === 403 &&
        (error.response?.data?.message?.includes('Token') ||
          error.response?.data?.message?.includes('khóa') ||
          error.response?.data?.message?.includes('vô hiệu')))
    ) {
      // Hết hạn phiên đăng nhập, Token không hợp lệ hoặc tài khoản bị khóa (Đồng bộ xử lý chuẩn Web)
      await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);
    }
    return Promise.reject(error);
  }
);

export default client;
