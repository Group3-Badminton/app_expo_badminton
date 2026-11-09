import client from '../api/client';

export const notificationService = {
  // Lấy danh sách thông báo của tài khoản hiện tại (Customer)
  getMyNotifications: async (params = {}) => {
    const res = await client.get('/notifications', { params });
    return res.data;
  },

  // Lấy số lượng thông báo chưa đọc
  getUnreadCount: async () => {
    const res = await client.get('/notifications/unread-count');
    return res.data;
  },

  // Đánh dấu 1 thông báo đã đọc
  markAsRead: async (id) => {
    const res = await client.patch(`/notifications/${id}/read`);
    return res.data;
  },

  // Đánh dấu tất cả thông báo đã đọc
  markAllAsRead: async () => {
    const res = await client.patch('/notifications/mark-all-read');
    return res.data;
  },
};

export default notificationService;
