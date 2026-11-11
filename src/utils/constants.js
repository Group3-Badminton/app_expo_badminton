// Các hằng số dùng chung trong ứng dụng Mobile
// Cổng Backend trong file .env của api_express_badminton là 9999
import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';

// Tự động nhận diện IP của máy tính host đang chạy Metro Dev Server
const getDevHost = () => {
  try {
    if (Platform.OS === 'web') {
      return 'localhost';
    }
    // 1. Tự động lấy IP máy chủ từ Expo Go khi quét mã QR
    const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost;
    if (hostUri) {
      const host = hostUri.split(':')[0];
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        return host;
      }
    }
    // 2. Dự phòng: scriptURL
    const scriptURL = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
      const hostPart = scriptURL.split('://')[1]?.split('/')[0]?.split(':')[0];
      if (hostPart && hostPart !== 'localhost' && hostPart !== '127.0.0.1') {
        return hostPart;
      }
    }
  } catch (e) {
    // Không làm gián đoạn
  }
  return null;
};

const devHost = getDevHost();

// IP Wi-Fi dự phòng nếu không tự phát hiện được
export const CURRENT_LOCAL_IP = '192.168.100.204';
export const BACKEND_PORT = 9999;

const rawEnvUrl = process.env.EXPO_PUBLIC_API_URL;
const validEnvUrl = rawEnvUrl && !rawEnvUrl.includes('10.64.172.22') ? rawEnvUrl : null;

const getApiBaseUrl = () => {
  // 1. Nền tảng Web
  if (Platform.OS === 'web') {
    return `http://localhost:${BACKEND_PORT}/api`;
  }
  // 2. Nếu dùng Ngrok hoặc domain online (https://)
  if (validEnvUrl && validEnvUrl.startsWith('https://')) {
    return validEnvUrl;
  }
  // 3. Tự động trích xuất IP máy tính từ Expo Go (tự đổi khi đổi Wi-Fi)
  if (devHost) {
    return `http://${devHost}:${BACKEND_PORT}/api`;
  }
  // 4. Nếu có cấu hình trong .env
  if (validEnvUrl) {
    return validEnvUrl;
  }
  // 5. IP dự phòng
  return `http://${CURRENT_LOCAL_IP}:${BACKEND_PORT}/api`;
};

// Tự động điều chỉnh URL theo môi trường
export const API_BASE_URL = getApiBaseUrl();

export const API_FALLBACK_URL = `http://localhost:${BACKEND_PORT}/api`;

// Hotline hỗ trợ hệ thống
export const HOTLINE_NUMBER = '0764220971';
export const HOTLINE_DISPLAY = '0764 220 971';

export const STORAGE_KEYS = {
  TOKEN: '@bcms_token',
  USER: '@bcms_user',
};

export const BOOKING_STATUS = {
  PENDING: 'PENDING',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  CONFIRMED: 'CONFIRMED',
  CHECKED_IN: 'CHECKED_IN',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED',
};

export const BOOKING_STATUS_LABELS = {
  // Enum chuẩn từ MongoDB Mongoose
  PENDING_APPROVAL: { label: 'Chờ duyệt', color: '#F59E0B', bg: '#FEF3C7' },
  PENDING: { label: 'Chờ duyệt', color: '#F59E0B', bg: '#FEF3C7' },
  CONFIRMED: { label: 'Đã xác nhận', color: '#10B981', bg: '#ECFDF5' },
  CHECKED_IN: { label: 'Đang chơi', color: '#3B82F6', bg: '#EFF6FF' },
  COMPLETED: { label: 'Hoàn thành', color: '#64748B', bg: '#F1F5F9' },
  CANCELLED: { label: 'Đã hủy', color: '#EF4444', bg: '#FEF2F2' },
  REJECTED: { label: 'Từ chối', color: '#EF4444', bg: '#FEF2F2' },

  // Tương thích ngược các biến thể cũ
  Pending: { label: 'Chờ duyệt', color: '#F59E0B', bg: '#FEF3C7' },
  Confirmed: { label: 'Đã xác nhận', color: '#10B981', bg: '#ECFDF5' },
  'Checked-in': { label: 'Đang chơi', color: '#3B82F6', bg: '#EFF6FF' },
  Completed: { label: 'Hoàn thành', color: '#64748B', bg: '#F1F5F9' },
  Cancelled: { label: 'Đã hủy', color: '#EF4444', bg: '#FEF2F2' },
  Rejected: { label: 'Từ chối', color: '#EF4444', bg: '#FEF2F2' },
};
