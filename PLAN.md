# Kế hoạch Triển khai Mobile App Expo Cầu Lông (app_expo_badmintion)

## 1. Mục tiêu
Xây dựng ứng dụng di động dành cho khách hàng (Customer) trên nền tảng **React Native (Expo)** bằng **JavaScript**, kết nối trực tiếp với backend REST API Node.js/Express (`api_express_badminton`) hiện tại, đồng bộ toàn bộ quy trình đặt sân từ Web (`web_react_badmintion`).

## 2. Kiến trúc & Công nghệ
- **Nền tảng**: React Native với Expo SDK mới nhất (dùng JavaScript/JSX).
- **Điều hướng (Navigation)**:
  - `@react-navigation/native` & `@react-navigation/native-stack`: Quản lý RootStack (Auth, MainTabs, BookingDetail).
  - `@react-navigation/bottom-tabs`: Quản lý 4 Tab chính (Trang chủ, Đặt sân, Lịch đặt, Cá nhân).
  - `@expo/vector-icons` (Ionicons): Icon cho Tab bar và màn hình.
- **Quản lý trạng thái & Lưu trữ**:
  - `React Context API` (`AuthContext.jsx`): Lưu trữ phiên đăng nhập và thông tin khách hàng.
  - `@react-native-async-storage/async-storage`: Lưu JWT token và thông tin xác thực trên thiết bị.
- **Giao tiếp API**:
  - `Axios`: Tái sử dụng và đồng bộ hóa các services từ Web (`bookingService`, `authService`, `courtService`).
- **Xử lý ngày giờ**: `dayjs` (đồng bộ định dạng ngày giờ chuẩn với Web và Backend).
- **Design System & Visual Language (Phong cách Thể thao Hiện đại - Minimalist Sport Green)**:
  - **Tone màu chủ đạo**: Xanh lá thể thao / Sân cầu lông (`#10B981`, Accent: `#059669`, Dark Emerald: `#064E3B`).
  - **Bảng màu tối giản (Strict Palette)**:
    - Nền chính (Background): `#F8FAFC` (Slate siêu nhẹ) & thẻ Card trắng tinh khôi `#FFFFFF`.
    - Màu chữ (Typography): Slate trầm `#0F172A` (tiêu đề), Xám trung tính `#64748B` (mô tả, nhãn).
    - Viền & Ngăn cách (Borders): `#E2E8F0` tạo cảm giác thanh thoát, không viền cứng rối mắt.
    - Tinh giản màu sắc: Hạn chế tối đa việc phối nhiều màu lòe loẹt. Dùng các sắc độ của xanh lá cho tương tác, điểm nhấn và thành công; màu trung tính cho nội dung còn lại.
  - **Ngôn ngữ thiết kế (UI/UX Principles)**:
    - **Khoảng trắng thở (Generous Whitespace)**: Bố cục thoáng đãng, các thẻ bo góc hiện đại (`borderRadius: 16` - `20`).
    - **Bóng đổ nhẹ (Subtle Elevation)**: Đổ bóng cực nhẹ tự nhiên, sắc nét và hiện đại.
    - **Nút bấm & Tương tác**: Nút chính bo mềm mại với màu xanh lá chủ đạo nổi bật, hiệu ứng nhấn mượt (`activeOpacity={0.8}`).

## 3. Cấu trúc thư mục chi tiết (Clean Architecture)
```
app_expo_badmintion/
├── assets/                       # Icon, splash, ảnh minh họa sân cầu lông
├── src/
│   ├── api/                      # Axios client & Interceptor gắn JWT Token
│   │   ├── client.js
│   │   └── endpoints.js
│   ├── services/                 # Bê nguyên logic service từ Web
│   │   ├── authService.js
│   │   ├── bookingService.js
│   │   └── courtService.js
│   ├── context/                  # Quản lý Auth toàn ứng dụng
│   │   └── AuthContext.jsx
│   ├── navigation/               # Điều hướng tách biệt rõ ràng
│   │   ├── RootStack.jsx         # Quản lý Stack (Auth + MainTabs + Details)
│   │   └── MainTabs.jsx          # Bottom Tab 4 mục (Home, Booking, MyBookings, Profile)
│   ├── screens/
│   │   ├── home/
│   │   │   └── HomeScreen.jsx
│   │   ├── booking/
│   │   │   ├── BookingScreen.jsx # Màn hình đặt sân đầy đủ 5 bước
│   │   │   └── BookingDetailScreen.jsx
│   │   ├── mybookings/
│   │   │   └── MyBookingsScreen.jsx
│   │   ├── profile/
│   │   │   └── ProfileScreen.jsx
│   │   └── auth/
│   │       ├── LoginScreen.jsx
│   │       └── RegisterScreen.jsx
│   ├── components/               # Components tái sử dụng
│   │   ├── CourtCard.jsx
│   │   ├── TimeSlotPicker.jsx
│   │   ├── PriceSummaryCard.jsx
│   │   └── HeaderBar.jsx
│   └── utils/
│       ├── formatters.js         # Format tiền tệ VND, định dạng ngày giờ
│       └── constants.js
├── app.json                      # Cấu hình Expo
├── App.js                        # App.js tối giản: NavigationContainer + RootStack
└── package.json
```

## 4. Các giai đoạn triển khai (Phased Implementation Plan)

### Giai đoạn 1: Khởi tạo và Dọn dẹp Dự án Expo Chuẩn (Setup & Scaffold)
- Dọn dẹp các tệp Webpack / HTML cũ trong `app_expo_badmintion`.
- Khởi tạo Expo project JavaScript chuẩn với `app.json`, `package.json` của Expo.
- Cài đặt các thư viện cần thiết:
  - `@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs`
  - `react-native-screens`, `react-native-safe-area-context`
  - `axios`, `dayjs`, `@react-native-async-storage/async-storage`
  - `@expo/vector-icons`

### Giai đoạn 2: Tầng Dữ liệu, API & Xác thực (Networking & Auth)
- Cấu hình Axios `client.js` kết nối đến địa chỉ API Backend (hỗ trợ localhost / IP LAN để test máy thật và máy ảo).
- Xây dựng `authService.js` và `AuthContext.jsx` lưu JWT token qua `AsyncStorage`.
- Xây dựng các màn hình Authentication: `LoginScreen.jsx`, `RegisterScreen.jsx`.

### Giai đoạn 3: Hệ thống Điều hướng (Navigation System)
- Viết `src/navigation/RootStack.jsx` phân luồng màn hình (Stack các màn hình đăng nhập, màn hình chi tiết đơn và MainTabs).
- Viết `src/navigation/MainTabs.jsx` cấu hình 4 Tab:
  - 🏠 Trang chủ (`HomeScreen`)
  - 🏸 Đặt sân (`BookingScreen`)
  - 📋 Lịch đặt (`MyBookingsScreen`)
  - 👤 Cá nhân (`ProfileScreen`)
- Cấu hình `App.js` tối giản bọc `AuthProvider`, `NavigationContainer`, `RootStack` và `StatusBar`.

### Giai đoạn 4: Màn hình Trang Chủ (`HomeScreen`) & Thông Tin Sân
- Header hiển thị lời chào người dùng, banner ưu đãi sân cầu lông.
- Nút CTA nổi bật "Đặt sân ngay" điều hướng thẳng vào Tab Đặt sân.
- Danh sách các sân cầu lông hiển thị trực quan kèm hình ảnh và giá tham khảo.

### Giai đoạn 5: Màn hình Đặt Sân Cốt Lõi (`BookingScreen`)
- Bê nguyên vẹn nghiệp vụ từ `CustomerBookingPage.jsx` trên Web sang React Native:
  1. **Chọn sân**: Danh sách sân kèm trạng thái khả dụng.
  2. **Chọn ngày & khung giờ**: Bộ chọn thời gian chơi, kiểm tra lịch trống qua `bookingService.getCourtAvailability`.
  3. **Tính tiền tự động**: Gọi `bookingService.calculateBookingPrice` từ backend để tính chính xác giá theo giờ cao điểm / thấp điểm và loại ngày.
  4. **Áp dụng Voucher**: Nhập mã giảm giá và gọi `bookingService.validateVoucher`.
  5. **Xác nhận đặt sân**: Gọi `bookingService.createBooking` và hiển thị thông báo thành công kèm mã đặt sân.

### Giai đoạn 6: Quản lý Đơn Đặt Sân (`MyBookingsScreen`) & Chi Tiết Đơn
- Hiển thị danh sách vé/đơn đặt sân của khách hàng với các bộ lọc trạng thái (Chờ xác nhận, Đã đặt, Đã hủy, Hoàn thành).
- Màn hình `BookingDetailScreen`: Xem chi tiết thông tin sân, giờ chơi, số tiền và mã đơn để nhân viên sân check-in.

### Giai đoạn 7: Màn hình Cá Nhân (`ProfileScreen`) & Kiểm thử toàn diện
- Hiển thị thông tin tài khoản, nút Đăng xuất, Đổi mật khẩu.
- Chạy thử nghiệm toàn bộ luồng trên Expo: Đăng nhập -> Chọn sân -> Đặt sân -> Xem lịch sử đơn -> Đăng xuất.
