import dayjs from 'dayjs';

/**
 * Định dạng tiền tệ Việt Nam (VNĐ)
 * @param {number} amount
 * @returns {string} ví dụ: "150.000 đ"
 */
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 đ';
  return `${Number(amount).toLocaleString('vi-VN')} đ`;
};

/**
 * Định dạng ngày chuẩn: DD/MM/YYYY
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return dayjs(dateStr).format('DD/MM/YYYY');
};

/**
 * Định dạng giờ chuẩn: HH:mm
 */
export const formatTime = (timeStr) => {
  if (!timeStr) return '';
  return timeStr;
};

/**
 * Chuyển đổi giờ HH:mm sang số phút tính từ 00:00
 */
export const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/**
 * Chuyển số phút sang chuỗi giờ HH:mm
 */
export const formatMinutesToTime = (totalMinutes) => {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Tính khung giờ hợp lệ mặc định (tránh quá khứ nếu chọn ngày hôm nay)
 */
export const getDefaultTimesForDate = (targetDate = dayjs()) => {
  const isToday = dayjs(targetDate).isSame(dayjs(), 'day');
  if (!isToday) {
    return { startTime: '08:00', endTime: '10:00' };
  }
  const now = dayjs();
  const currentH = now.hour();
  const currentM = now.minute();

  let nextStartH = currentM > 0 ? currentH + 1 : currentH;
  if (nextStartH < 8) nextStartH = 8;
  if (nextStartH >= 22) {
    return { startTime: '21:00', endTime: '22:00' };
  }
  const nextEndH = Math.min(23, nextStartH + 2);
  return {
    startTime: `${String(nextStartH).padStart(2, '0')}:00`,
    endTime: `${String(nextEndH).padStart(2, '0')}:00`
  };
};
