# Hướng dẫn Chạy & Kiểm thử Ứng Dụng Badminton Mobile (Expo React Native)

Dự án ứng dụng di động dành cho khách hàng đặt sân cầu lông trực tuyến, xây dựng trên nền tảng **React Native Expo** bằng ngôn ngữ **JavaScript**, áp dụng phong cách thiết kế **Minimalist Sport Green (Xanh lá thể thao hiện đại, tối giản)**.

---

## 1. Cấu trúc Thư mục Clean Architecture
```
app_expo_badmintion/
├── assets/                       # Icon, splash screen và hình ảnh
├── src/
│   ├── api/
│   │   └── client.js             # Cấu hình Axios Client + Interceptor tự động đính kèm JWT Token
│   ├── services/
│   │   ├── authService.js        # Đăng nhập, đăng ký, cập nhật hồ sơ, đổi mật khẩu
│   │   ├── bookingService.js     # Đặt sân, tính giá tự động, kiểm tra voucher, lấy danh sách vé
│   │   └── courtService.js       # Tra cứu thông tin sân
│   ├── context/
│   │   └── AuthContext.jsx       # Quản lý phiên đăng nhập toàn cục qua AsyncStorage
│   ├── navigation/
│   │   ├── RootStack.jsx         # Quản lý luồng Navigation (Auth + MainTabs + Chi tiết vé)
│   │   └── MainTabs.jsx          # Bottom Tab 4 mục: Trang chủ, Đặt sân, Lịch đặt, Cá nhân
│   ├── screens/
│   │   ├── home/
│   │   │   └── HomeScreen.jsx    # Trang chủ: Banner thể thao, CTA đặt sân, danh sách sân trực quan
│   │   ├── booking/
│   │   │   ├── BookingScreen.jsx # Nghiệp vụ đặt sân 5 bước (kế thừa trọn vẹn từ Web)
│   │   │   └── BookingDetailScreen.jsx # Vé điện tử có mã QR check-in & tính năng hủy đơn
│   │   ├── mybookings/
│   │   │   └── MyBookingsScreen.jsx    # Quản lý danh sách vé & lịch đặt sân (Bộ lọc theo trạng thái)
│   │   ├── profile/
│   │   │   └── ProfileScreen.jsx       # Hồ sơ cá nhân, hotline, thông tin ứng dụng, đăng xuất
│   │   └── auth/
│   │       ├── LoginScreen.jsx         # Đăng nhập bằng Email/Password
│   │       └── RegisterScreen.jsx      # Đăng ký tài khoản khách hàng mới
│   ├── components/               # Các UI components tái sử dụng
│   │   ├── Button.jsx            # Nút bấm chuẩn phong cách xanh lá
│   │   ├── Input.jsx             # Ô nhập liệu có nhãn, icon và hiển thị lỗi
│   │   ├── HeaderBar.jsx         # Thanh tiêu đề phía trên màn hình
│   │   └── StatusBadge.jsx       # Huy hiệu trạng thái đơn đặt sân (Chờ duyệt, Đã đặt,...)
│   └── utils/
│       ├── constants.js          # Địa chỉ API_BASE_URL, khóa lưu trữ Storage, trạng thái đơn
│       ├── formatters.js         # Format tiền tệ VNĐ, định dạng ngày giờ, tính toán thời gian
│       └── theme.js              # Bảng màu chuẩn Minimalist Sport Green & hệ thống spacing
├── App.js                        # File khởi chạy siêu gọn: AuthProvider + NavigationContainer
├── index.js                      # Entry point chuẩn của Expo
├── app.json                      # Cấu hình ứng dụng Expo
└── package.json
```

---

## 2. Hướng dẫn Chạy Ứng Dụng (Local Development)

### Bước 1: Khởi động Backend API Express
Mở terminal tại thư mục `api_express_badminton` và khởi động server:
```bash
npm run dev
# Server lắng nghe tại cổng http://localhost:5000
```

### Bước 2: Cấu hình địa chỉ IP máy chủ trong Mobile App
Mở file `src/utils/constants.js`:
- Nếu bạn chạy trên **Android Emulator**: `http://10.0.2.2:5000/api` (mặc định đã cấu hình sẵn).
- Nếu bạn chạy trên **Thiết bị thật qua Expo Go (quét mã QR)**: Đổi thành IP mạng LAN máy tính của bạn (Ví dụ: `http://192.168.1.15:5000/api`).

### Bước 3: Khởi chạy Expo
Mở terminal tại thư mục `app_expo_badmintion`:
```bash
npm start
```
- Nhấn phím `a` để mở trên Android Emulator.
- Hoặc dùng điện thoại (Android / iOS) cài app **Expo Go** và quét mã QR hiển thị trên terminal.
