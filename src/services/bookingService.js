import client from '../api/client';

export const bookingService = {
  // Lấy danh sách booking của khách hàng
  getMyBookings: async (params = {}) => {
    const res = await client.get('/bookings', { params });
    return res.data;
  },

  // Lấy chi tiết đơn đặt sân theo ID
  getBookingById: async (id) => {
    const res = await client.get(`/bookings/${id}`);
    return res.data;
  },

  // Lấy danh sách sân
  getCourts: async () => {
    const res = await client.get('/bookings/courts');
    return res.data;
  },

  // Lấy danh sách khung giờ hệ thống
  getTimeSlots: async () => {
    const res = await client.get('/bookings/time-slots');
    return res.data;
  },

  // Kiểm tra tình trạng sân và khung giờ theo Ngày
  getCourtAvailability: async (courtId, bookingDate) => {
    const res = await client.get('/bookings/availability', {
      params: { courtId, bookingDate }
    });
    return res.data;
  },

  // Tính giá chi tiết cho từng sân và khung giờ (cao điểm/thấp điểm)
  calculateBookingPrice: async (payload) => {
    const res = await client.post('/bookings/calculate-price', payload);
    return res.data;
  },

  // Kiểm tra và áp dụng mã giảm giá voucher
  validateVoucher: async (voucherCode, orderAmount = 0, context = {}) => {
    const res = await client.post('/bookings/validate-voucher', {
      voucherCode,
      orderAmount,
      ...context
    });
    return res.data;
  },

  // Tạo đơn đặt sân mới
  createBooking: async (bookingData) => {
    const res = await client.post('/bookings', bookingData);
    return res.data;
  },

  // Hủy yêu cầu đặt sân
  cancelBooking: async (id, reason = '') => {
    const res = await client.patch(`/bookings/${id}/status`, {
      status: 'CANCELLED',
      note: reason || 'Khách hàng tự hủy đơn trên mobile',
      cancelReason: reason || 'Khách hàng tự hủy đơn trên mobile'
    });
    return res.data;
  }
};

export default bookingService;
