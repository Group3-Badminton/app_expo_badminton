// Theme hệ thống - Phong cách Thể thao Hiện đại Tối giản (Minimalist Sport Green)
export const THEME = {
  colors: {
    // Tone màu chủ đạo Xanh lá thể thao
    primary: '#10B981',       // Emerald Green năng động
    primaryDark: '#059669',   // Nhấn đậm khi tương tác
    primaryDeep: '#064E3B',   // Xanh thẫm cho badge hoặc icon
    primaryLight: '#ECFDF5',  // Xanh phớt cho nền badge / card active
    primaryBorder: '#A7F3D0', // Viền xanh nhạt

    // Tone màu trung tính tối giản
    background: '#F8FAFC',    // Nền chính Slate siêu nhẹ, êm mắt
    surface: '#FFFFFF',       // Bề mặt Card trắng tinh
    surfaceAlt: '#F1F5F9',    // Nền phụ
    
    // Màu chữ & Typography
    textPrimary: '#0F172A',   // Đen Slate thanh lịch cho tiêu đề
    textSecondary: '#64748B', // Xám trung tính cho mô tả, nhãn
    textMuted: '#94A3B8',     // Xám nhạt cho placeholder, icon mờ
    textInverse: '#FFFFFF',   // Chữ trắng trên nền primary
    
    // Viền & Ngăn cách
    border: '#E2E8F0',        // Viền thanh thoát siêu mảnh
    borderLight: '#F1F5F9',

    // Trạng thái (hạn chế màu, chỉ dùng khi cần thiết)
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    dangerLight: '#FEF2F2',
  },
  
  // Khoảng cách bố cục (Spacings)
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  
  // Độ bo góc (Border Radius) hiện đại
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },

  // Đổ bóng nhẹ tự nhiên (Subtle Elevation)
  shadows: {
    card: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 2,
    },
    button: {
      shadowColor: '#10B981',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 3,
    },
  }
};

export default THEME;
