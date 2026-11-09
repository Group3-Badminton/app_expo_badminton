// Các hằng số dùng chung trong ứng dụng Mobile
// Cổng Backend trong file .env của api_express_badminton là 9999
// IP máy tính hiện tại là 10.10.122.186 để BlueStacks và thiết bị thật kết nối được
export const API_BASE_URL = 'http://10.10.122.186:9999/api';
export const API_FALLBACK_URL = 'http://localhost:9999/api';

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
