import client from '../api/client';

export const courtService = {
  // Lấy toàn bộ danh sách sân kèm trạng thái và bảng giá tham khảo
  getAllCourts: async () => {
    const res = await client.get('/courts');
    return res.data;
  },

  // Lấy chi tiết sân
  getCourtById: async (id) => {
    const res = await client.get(`/courts/${id}`);
    return res.data;
  }
};

export default courtService;
