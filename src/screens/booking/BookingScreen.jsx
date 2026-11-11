import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import dayjs from 'dayjs';
import { THEME } from '../../utils/theme';
import { formatCurrency, parseTimeToMinutes, formatMinutesToTime } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import bookingService from '../../services/bookingService';
import Button from '../../components/Button';
import HeaderBar from '../../components/HeaderBar';
import { Ionicons } from '@expo/vector-icons';

// Danh sách mốc giờ làm tròn 15 phút: 00', 15', 30', 45' từ 06:00 đến 23:00
const ALL_15MIN_SLOTS = [];
for (let h = 6; h <= 23; h++) {
  const hh = h < 10 ? `0${h}` : `${h}`;
  ALL_15MIN_SLOTS.push(`${hh}:00`);
  if (h < 23) {
    ALL_15MIN_SLOTS.push(`${hh}:15`);
    ALL_15MIN_SLOTS.push(`${hh}:30`);
    ALL_15MIN_SLOTS.push(`${hh}:45`);
  }
}

// Hàm lấy mốc giờ bắt đầu hợp lệ sớm nhất (lớn hơn hiện tại nếu là hôm nay)
const getInitialStartTimeForDate = (dateStr) => {
  const isToday = dayjs(dateStr).isSame(dayjs(), 'day');
  if (!isToday) return '08:00';

  const now = dayjs();
  const nowMin = now.hour() * 60 + now.minute();
  // Khách cần ít nhất 5 phút chuẩn bị
  const validSlot = ALL_15MIN_SLOTS.find((t) => {
    const min = parseTimeToMinutes(t);
    return min >= nowMin + 5 && min <= 22 * 60; // Phải còn ít nhất 1 tiếng trước khi đóng cửa (23:00)
  });
  return validSlot || '22:00';
};

export default function BookingScreen({ route, navigation }) {
  const { user, isAuthenticated } = useAuth();
  const initialCourtId = route.params?.initialCourtId;

  // Dữ liệu sân & trạng thái tải
  const [courts, setCourts] = useState([]);
  const [loadingCourts, setLoadingCourts] = useState(true);

  // Bước 1: Chọn Sân (Hỗ trợ chọn nhiều sân thi đấu cùng lúc)
  const [selectedCourtIds, setSelectedCourtIds] = useState(initialCourtId ? [initialCourtId] : []);
  const selectedCourts = useMemo(() => {
    return (Array.isArray(courts) ? courts : []).filter((c) => selectedCourtIds.includes(c._id));
  }, [courts, selectedCourtIds]);
  const selectedCourtId = selectedCourtIds[0] || null;

  const handleToggleCourt = (courtId) => {
    setSelectedCourtIds((prev) => {
      if (prev.includes(courtId)) {
        if (prev.length === 1) {
          Alert.alert('Thông báo', 'Bạn cần chọn ít nhất 1 sân thi đấu trong đơn đặt!');
          return prev;
        }
        return prev.filter((id) => id !== courtId);
      } else {
        return [...prev, courtId];
      }
    });
  };

  // Bước 2: Chọn Ngày
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));

  // Bước 3: Khung Giờ (Làm tròn 15 phút, tối thiểu 1 tiếng)
  const [startTime, setStartTime] = useState(() => getInitialStartTimeForDate(dayjs().format('YYYY-MM-DD')));
  const [endTime, setEndTime] = useState(() => {
    const s = getInitialStartTimeForDate(dayjs().format('YYYY-MM-DD'));
    return formatMinutesToTime(Math.min(23 * 60, parseTimeToMinutes(s) + 60));
  });
  // Modal chọn giờ: 'START' hoặc 'END' hoặc null
  const [pickerModalType, setPickerModalType] = useState(null);
  const [tempHour, setTempHour] = useState('08');
  const [tempMinute, setTempMinute] = useState('00');

  const openTimePicker = (type) => {
    const currentVal = type === 'START' ? startTime : endTime;
    const [h, m] = currentVal.split(':');
    setTempHour(h || '08');
    setTempMinute(m || '00');
    setPickerModalType(type);
  };

  const handleConfirmPickerTime = () => {
    const pickedTime = `${tempHour}:${tempMinute}`;
    if (pickerModalType === 'START') {
      handleStartTimeChange(pickedTime);
    } else if (pickerModalType === 'END') {
      const sMin = parseTimeToMinutes(startTime);
      const eMin = parseTimeToMinutes(pickedTime);
      if (eMin < sMin + 60) {
        Alert.alert('Khung giờ không hợp lệ', 'Giờ kết thúc phải sau giờ bắt đầu ít nhất 1 tiếng (60 phút)!');
        return;
      }
      setEndTime(pickedTime);
    }
    setPickerModalType(null);
  };

  const setPickerNow = () => {
    const now = dayjs();
    const h = String(now.hour()).padStart(2, '0');
    const m = now.minute();
    const roundedM = m < 15 ? '15' : m < 30 ? '30' : m < 45 ? '45' : '00';
    const finalH = roundedM === '00' && m >= 45 ? String(Math.min(23, Number(h) + 1)).padStart(2, '0') : h;
    setTempHour(finalH);
    setTempMinute(roundedM);
  };
  // Kiểm tra một giờ bất kỳ có bị kín/trùng lịch đã đặt hay không
  const isHourBooked = useCallback((hourStr) => {
    const h = Number(hourStr);
    const hStartMin = h * 60;
    const hEndMin = (h + 1) * 60;
    return bookedRanges.some((r) => {
      const bStart = parseTimeToMinutes(r.startTime);
      const bEnd = parseTimeToMinutes(r.endTime);
      return Math.max(hStartMin, bStart) < Math.min(hEndMin, bEnd);
    });
  }, [bookedRanges]);

  // Kiểm tra một mốc thời gian cụ thể (giờ + phút) có bị trùng lịch đã đặt hay không
  const isTimeSlotBooked = useCallback((hourStr, minuteStr) => {
    const min = Number(hourStr) * 60 + Number(minuteStr);
    return bookedRanges.some((r) => {
      const bStart = parseTimeToMinutes(r.startTime);
      const bEnd = parseTimeToMinutes(r.endTime);
      if (pickerModalType === 'END') {
        return min > bStart && min <= bEnd;
      }
      return min >= bStart && min < bEnd;
    });
  }, [bookedRanges, pickerModalType]);


  // Tình trạng lịch đã đặt của các sân trong ngày (Chống đặt trùng)
  const [bookedRanges, setBookedRanges] = useState([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  // Bước 4: Ghi chú
  const [note, setNote] = useState('');

  // Bước 5: Voucher & Khuyến mãi (Đồng bộ chuẩn Web & Backend)
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [manualVoucherInput, setManualVoucherInput] = useState('');
  const [validatingManualVoucher, setValidatingManualVoucher] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherError, setVoucherError] = useState('');

  // Bước 6: Tính giá từ Backend API (Ủy quyền 100% cho Server tính toán)
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [priceData, setPriceData] = useState({
    totalBasePrice: 0,
    discount: 0,
    finalTotalAmount: 0,
    courtBreakdowns: [],
  });

  // Tiến trình đặt đơn
  const [submitting, setSubmitting] = useState(false);

  // 1. Tải danh sách sân
  const fetchCourts = useCallback(async () => {
    try {
      setLoadingCourts(true);
      const data = await bookingService.getCourts();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.data?.courts)
        ? data.data.courts
        : [];
      setCourts(list);
      if (list.length > 0) {
        setSelectedCourtIds((prev) => (prev.length > 0 ? prev : [initialCourtId || list[0]._id]));
      }
    } catch (e) {
      console.warn('Lỗi tải danh sách sân booking:', e);
    } finally {
      setLoadingCourts(false);
    }
  }, [initialCourtId]);

  useEffect(() => {
    fetchCourts();
  }, [fetchCourts]);

  // Cập nhật selectedCourtIds nếu có truyền qua route
  useEffect(() => {
    if (route.params?.initialCourtId) {
      setSelectedCourtIds([route.params.initialCourtId]);
    }
  }, [route.params?.initialCourtId]);

  // 2. Tải tình trạng khung giờ đã đặt của các sân theo ngày (Kiểm tra lịch trùng)
  const fetchAvailability = useCallback(async () => {
    if (selectedCourtIds.length === 0 || !selectedDate) return;
    try {
      setLoadingAvailability(true);
      const responses = await Promise.all(
        selectedCourtIds.map((cId) =>
          bookingService.getCourtAvailability(cId, selectedDate).catch(() => null)
        )
      );
      const allRanges = [];
      responses.forEach((res, index) => {
        const ranges = res?.data?.bookedRanges || [];
        const cId = selectedCourtIds[index];
        ranges.forEach((r) => {
          allRanges.push({ ...r, courtId: cId });
        });
      });
      setBookedRanges(allRanges);
    } catch (e) {
      console.warn('Lỗi tải tình trạng lịch đặt sân:', e);
      setBookedRanges([]);
    } finally {
      setLoadingAvailability(false);
    }
  }, [selectedCourtIds, selectedDate]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // Khi đổi ngày: tự động điều chỉnh giờ bắt đầu và kết thúc tránh quá khứ
  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
    const newStart = getInitialStartTimeForDate(newDate);
    setStartTime(newStart);
    setEndTime(formatMinutesToTime(Math.min(23 * 60, parseTimeToMinutes(newStart) + 60)));
  };

  // Khi đổi giờ bắt đầu: tự động đảm bảo giờ kết thúc cách tối thiểu 1 tiếng (60 phút)
  const handleStartTimeChange = (newStartTime) => {
    setStartTime(newStartTime);
    const sMin = parseTimeToMinutes(newStartTime);
    const eMin = parseTimeToMinutes(endTime);
    if (eMin < sMin + 60) {
      const adjustedEnd = formatMinutesToTime(Math.min(23 * 60, sMin + 60));
      setEndTime(adjustedEnd);
    }
  };

  // Kiểm tra xung đột (trùng giờ) giữa khoảng đang chọn với các đơn đã đặt của từng sân
  const conflictedCourtNames = useMemo(() => {
    if (!startTime || !endTime || bookedRanges.length === 0) return [];
    const sMin = parseTimeToMinutes(startTime);
    const eMin = parseTimeToMinutes(endTime);
    const conflictCourtIds = new Set();
    bookedRanges.forEach((range) => {
      const bStart = parseTimeToMinutes(range.startTime);
      const bEnd = parseTimeToMinutes(range.endTime);
      if (sMin < bEnd && eMin > bStart) {
        conflictCourtIds.add(range.courtId);
      }
    });
    return courts
      .filter((c) => conflictCourtIds.has(c._id))
      .map((c) => c.courtName || c.name || `Sân ${c.courtNumber}`);
  }, [startTime, endTime, bookedRanges, courts]);

  const isConflictWithBooked = conflictedCourtNames.length > 0;

  // 3. Tính toán tiền tự động từ Backend API chuẩn xác (Single Source of Truth)
  const calculatePrice = useCallback(async () => {
    if (selectedCourts.length === 0 || !startTime || !endTime) return;

    const sMin = parseTimeToMinutes(startTime);
    const eMin = parseTimeToMinutes(endTime);
    if (eMin - sMin < 60) return; // Chưa đủ 1 tiếng tối thiểu

    try {
      setLoadingPrice(true);
      const courtOrders = selectedCourts.map((c) => ({
        courtId: c._id,
        bookingDate: selectedDate,
        startTime,
        endTime,
      }));
      const payload = {
        bookingDate: selectedDate,
        courtOrders,
        courtIds: selectedCourts.map((c) => c._id),
        courtId: selectedCourts[0]?._id,
        startTime,
        endTime,
        voucherCode: appliedVoucher ? (appliedVoucher.code || appliedVoucher.voucherCode) : undefined,
      };

      const res = await bookingService.calculateBookingPrice(payload);
      const data = res?.data || res;
      if (data) {
        setPriceData({
          totalBasePrice: data.totalBasePrice || 0,
          discount: data.discount || 0,
          finalTotalAmount: data.finalTotalAmount || 0,
          courtBreakdowns: data.courtBreakdowns || [],
        });
      }
    } catch (err) {
      console.warn('Lỗi tính giá chi tiết từ Backend:', err);
    } finally {
      setLoadingPrice(false);
    }
  }, [selectedCourts, selectedDate, startTime, endTime, appliedVoucher]);

  useEffect(() => {
    calculatePrice();
  }, [calculatePrice]);

  // 4. Mở Modal và lấy danh sách Voucher khả dụng cho đơn hàng
  const handleOpenVoucherModal = async () => {
    setVoucherModalOpen(true);
    setLoadingVouchers(true);
    setVoucherError('');
    try {
      const courtTypes = selectedCourts.map((c) => (c.courtType || 'STANDARD').toUpperCase());
      const res = await bookingService.getAvailableVouchers({
        orderAmount: priceData.totalBasePrice,
        courtBreakdowns: priceData.courtBreakdowns || [],
        courtTypes,
      });
      if (res.success && Array.isArray(res.data)) {
        setAvailableVouchers(res.data);
      } else if (Array.isArray(res)) {
        setAvailableVouchers(res);
      } else {
        setAvailableVouchers([]);
      }
    } catch (e) {
      console.warn('Không thể tải danh sách voucher:', e);
      setAvailableVouchers([]);
    } finally {
      setLoadingVouchers(false);
    }
  };

  // Chọn voucher từ danh sách
  const handleSelectVoucher = (voucher) => {
    const code = voucher.code || voucher.voucherCode;
    setAppliedVoucher({
      ...voucher,
      code,
    });
    setVoucherModalOpen(false);
    Alert.alert('Thành công', `Đã áp dụng mã giảm giá ${code}!`);
  };

  // Áp dụng mã Voucher nhập tay
  const handleApplyManualVoucher = async () => {
    if (!manualVoucherInput.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập mã voucher!');
      return;
    }
    const cleanCode = manualVoucherInput.trim().toUpperCase();
    try {
      setValidatingManualVoucher(true);
      setVoucherError('');
      const courtTypes = selectedCourts.map((c) => (c.courtType || 'STANDARD').toUpperCase());
      const res = await bookingService.validateVoucher(cleanCode, priceData.totalBasePrice, {
        courtBreakdowns: priceData.courtBreakdowns || [],
        courtTypes,
      });
      const data = res.data || res;
      setAppliedVoucher({
        ...data,
        code: data.voucherCode || data.code || cleanCode,
      });
      setManualVoucherInput('');
      setVoucherModalOpen(false);
      Alert.alert('Thành công', `Đã áp dụng mã giảm giá ${cleanCode}!`);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Mã giảm giá không hợp lệ hoặc không đủ điều kiện!';
      setVoucherError(msg);
    } finally {
      setValidatingManualVoucher(false);
    }
  };

  // Xóa mã giảm giá đang áp dụng
  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setManualVoucherInput('');
    setVoucherError('');
  };

  // 5. Thực hiện tạo đơn đặt sân (có xử lý Race Condition khi voucher hết hạn hoặc hết lượt)
  const executeCreateBooking = async (targetVoucherCode) => {
    setSubmitting(true);
    try {
      const courtOrders = selectedCourts.map((c) => ({
        courtId: c._id,
        startTime,
        endTime,
      }));

      const bookingPayload = {
        bookingDate: selectedDate,
        courtOrders,
        courtIds: selectedCourts.map((c) => c._id),
        courtId: selectedCourts[0]?._id,
        startTime,
        endTime,
        note: note.trim(),
        voucherCode: targetVoucherCode,
        paymentMethod: 'CASH',
        customerPhone: user?.phoneNumber || user?.phone,
        customerName: user?.fullName || user?.name,
      };

      const result = await bookingService.createBooking(bookingPayload);
      const created = result.data || result;

      Alert.alert(
        'Đặt sân thành công 🎉',
        `Mã đơn đặt: ${created.bookingCode || created._id || 'Đã ghi nhận'}\nSố lượng: ${selectedCourts.length} sân\nVui lòng đến sân đúng giờ để nhận sân!`,
        [
          {
            text: 'Xem đơn của tôi',
            onPress: () => navigation.navigate('MyBookings'),
          },
          {
            text: 'Về trang chủ',
            onPress: () => navigation.navigate('Home'),
          },
        ]
      );
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Không thể đặt sân. Có thể khung giờ này đã có người đặt, vui lòng chọn khung giờ khác!';

      // Bắt ngoại lệ Race Condition khi mã giảm giá vừa hết lượt hoặc không còn hiệu lực
      const isVoucherErr =
        targetVoucherCode &&
        /voucher|mã giảm giá|hết lượt|lượt dùng|không hợp lệ/i.test(msg);

      if (isVoucherErr) {
        Alert.alert(
          'Mã giảm giá không khả dụng',
          `Mã "${targetVoucherCode}" vừa hết lượt sử dụng hoặc không còn hiệu lực.\nBạn có muốn tiếp tục đặt sân với giá gốc (${formatCurrency(priceData.totalBasePrice)}) không?`,
          [
            {
              text: 'Chọn mã khác',
              style: 'cancel',
              onPress: () => {
                setAppliedVoucher(null);
                handleOpenVoucherModal();
              },
            },
            {
              text: 'Đặt với giá gốc',
              onPress: () => {
                setAppliedVoucher(null);
                executeCreateBooking(undefined);
              },
            },
          ]
        );
      } else {
        Alert.alert('Không thể đặt sân', msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Yêu cầu đăng nhập',
        'Vui lòng đăng nhập tài khoản để hoàn tất đặt sân.',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Đăng nhập', onPress: () => navigation.navigate('Login') },
        ]
      );
      return;
    }

    if (selectedCourts.length === 0) {
      Alert.alert('Thông báo', 'Vui lòng chọn ít nhất 1 sân trước khi đặt.');
      return;
    }

    const sMin = parseTimeToMinutes(startTime);
    const eMin = parseTimeToMinutes(endTime);

    // RÀNG BUỘC 1: Không được đặt giờ trong quá khứ
    const isToday = dayjs(selectedDate).isSame(dayjs(), 'day');
    if (isToday) {
      const nowMin = dayjs().hour() * 60 + dayjs().minute();
      if (sMin <= nowMin) {
        Alert.alert(
          'Giờ không hợp lệ',
          'Thời gian bắt đầu phải lớn hơn thời gian hiện tại! Không thể đặt sân trong quá khứ.'
        );
        return;
      }
    }

    // RÀNG BUỘC 2: Tối thiểu 1 tiếng (60 phút)
    if (eMin - sMin < 60) {
      Alert.alert(
        'Thời gian không đủ',
        'Khung giờ thuê sân tối thiểu là 1 tiếng (60 phút). Vui lòng điều chỉnh lại giờ kết thúc.'
      );
      return;
    }

    // RÀNG BUỘC 3: Không được đặt trùng lịch
    if (isConflictWithBooked) {
      Alert.alert(
        'Sân đã có người đặt',
        `Khung giờ ${startTime} - ${endTime} trên sân (${conflictedCourtNames.join(', ')}) đã bị trùng lịch với đơn đặt trước. Vui lòng chọn khung giờ khác!`
      );
      return;
    }

    const targetCode = appliedVoucher ? (appliedVoucher.code || appliedVoucher.voucherCode) : undefined;
    await executeCreateBooking(targetCode);
  };

  // 7 ngày tiếp theo để chọn
  const upcomingDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = dayjs().add(i, 'day');
      return {
        dateStr: d.format('YYYY-MM-DD'),
        dayName: i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : `Thứ ${d.day() + 1 === 1 ? 'CN' : d.day() + 1}`,
        dayNum: d.format('DD/MM'),
      };
    });
  }, []);

  // Lọc các mốc startTime: nếu là hôm nay, loại bỏ các mốc trong quá khứ
  const availableStartSlots = useMemo(() => {
    const isToday = dayjs(selectedDate).isSame(dayjs(), 'day');
    const nowMin = dayjs().hour() * 60 + dayjs().minute();
    // Giờ bắt đầu trễ nhất là 22:00 để đảm bảo tối thiểu 1 tiếng trước 23:00
    return ALL_15MIN_SLOTS.filter((t) => {
      const min = parseTimeToMinutes(t);
      if (min > 22 * 60) return false;
      if (isToday && min <= nowMin) return false; // Không chọn giờ quá khứ
      return true;
    });
  }, [selectedDate]);

  // Lọc các mốc endTime: phải lớn hơn startTime tối thiểu 60 phút
  const availableEndSlots = useMemo(() => {
    const sMin = parseTimeToMinutes(startTime);
    return ALL_15MIN_SLOTS.filter((t) => {
      const min = parseTimeToMinutes(t);
      return min >= sMin + 60; // Tối thiểu 1 tiếng
    });
  }, [startTime]);

  const selectedCourt = courts.find((c) => c._id === selectedCourtId);
  const durationHours = (parseTimeToMinutes(endTime) - parseTimeToMinutes(startTime)) / 60;

  return (
    <View style={styles.container}>
      <HeaderBar title="Đặt sân online" subtitle="Chọn sân, khung giờ và hoàn tất đặt chỗ" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Bước 1: Chọn Sân Cầu Lông (Hỗ trợ đặt nhiều sân cùng lúc) */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.sectionTitle}>Chọn sân thi đấu</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.colors.primaryDark }}>
                Đã chọn: {selectedCourts.length} sân
              </Text>
            </View>
          </View>

          {loadingCourts ? (
            <ActivityIndicator size="small" color={THEME.colors.primary} style={{ marginVertical: 12 }} />
          ) : courts.length === 0 ? (
            <View style={{ padding: 16, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Ionicons name="alert-circle-outline" size={28} color="#EF4444" />
              <Text style={{ fontSize: 13, color: '#64748B', marginTop: 6, textAlign: 'center' }}>
                Không thể tải danh sách sân. Vui lòng kiểm tra kết nối Backend!
              </Text>
              <TouchableOpacity
                onPress={fetchCourts}
                style={{ marginTop: 10, paddingVertical: 6, paddingHorizontal: 14, backgroundColor: THEME.colors.primary, borderRadius: 6 }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>Tải lại</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.courtScroll}>
              {(Array.isArray(courts) ? courts : []).map((court) => {
                const isSelected = selectedCourtIds.includes(court._id);
                const courtName = court.courtName || court.name || `Sân ${court.courtNumber}`;
                const rawType = (court.courtType || court.type || 'STANDARD').toUpperCase();
                const isVip = rawType.includes('VIP');
                const defaultPrice = isVip ? 130000 : rawType.includes('PREMIUM') ? 160000 : 80000;
                const price = court.pricePerHour || court.basePrice || defaultPrice;
                const isInactive = court.status === 'INACTIVE' || court.status === 'Inactive' || court.operationalStatus === 'MAINTENANCE';
                return (
                  <TouchableOpacity
                    key={court._id}
                    activeOpacity={isInactive ? 1 : 0.8}
                    disabled={isInactive}
                    style={[styles.courtSelectCard, isSelected && styles.courtSelectCardActive, isInactive && { opacity: 0.55, backgroundColor: '#F3F4F6' }]}
                    onPress={() => handleToggleCourt(court._id)}
                  >
                    <View style={[styles.courtIconCircle, isSelected && styles.courtIconCircleActive, !isSelected && isVip && { backgroundColor: '#FEF3C7' }]}>
                      <Ionicons
                        name={isSelected ? 'checkbox' : isVip ? 'sparkles' : 'tennisball'}
                        size={18}
                        color={isSelected ? '#FFFFFF' : isVip ? '#B45309' : THEME.colors.primary}
                      />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={[styles.courtSelectName, isSelected && styles.courtSelectNameActive]}>
                        {courtName}
                      </Text>
                      {isVip && (
                        <View style={{ backgroundColor: isSelected ? '#FFFFFF' : '#FEF3C7', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 }}>
                          <Text style={{ fontSize: 9, fontWeight: '700', color: isSelected ? THEME.colors.primaryDark : '#B45309' }}>VIP</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.courtSelectPrice, isSelected && styles.courtSelectPriceActive]}>
                      {isInactive ? (court.operationalStatus === 'MAINTENANCE' ? 'Đang bảo trì' : 'Tạm đóng') : `${formatCurrency(price)}/h`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Bước 2: Chọn Ngày Chơi */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>2</Text>
            </View>
            <Text style={styles.sectionTitle}>Chọn ngày chơi</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
            {upcomingDays.map((day) => {
              const isSelected = selectedDate === day.dateStr;
              return (
                <TouchableOpacity
                  key={day.dateStr}
                  activeOpacity={0.8}
                  style={[styles.dateCard, isSelected && styles.dateCardActive]}
                  onPress={() => handleDateChange(day.dateStr)}
                >
                  <Text style={[styles.dateDayName, isSelected && styles.dateDayNameActive]}>
                    {day.dayName}
                  </Text>
                  <Text style={[styles.dateDayNum, isSelected && styles.dateDayNumActive]}>
                    {day.dayNum}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Bước 3: Chọn Khung Giờ Bắt Đầu & Kết Thúc */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>3</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Khung giờ thuê sân (Tối thiểu 1 tiếng)</Text>
              <Text style={styles.sectionSubtitle}>
                Các mốc giờ làm tròn 15 phút (:00, :15, :30, :45)
              </Text>
            </View>
          </View>

          {/* Cảnh báo nếu khung giờ đang chọn bị trùng với lịch đã đặt */}
          {isConflictWithBooked ? (
            <View style={styles.conflictWarningBox}>
              <Ionicons name="warning-outline" size={20} color={THEME.colors.danger} />
              <Text style={styles.conflictWarningText}>
                Khung giờ {startTime} - {endTime} đã có người đặt trước trên sân này. Vui lòng chọn khung giờ khác!
              </Text>
            </View>
          ) : null}

          {/* Hiển thị các lịch đã đặt trước để khách dễ né */}
          {bookedRanges.length > 0 ? (
            <View style={styles.bookedBadgeContainer}>
              <Text style={styles.bookedBadgeHeader}>Lịch sân đã có người đặt hôm nay:</Text>
              <View style={styles.bookedChipsWrap}>
                {bookedRanges.map((r, idx) => (
                  <View key={`booked-${idx}`} style={styles.bookedChip}>
                    <Ionicons name="lock-closed" size={12} color="#DC2626" />
                    <Text style={styles.bookedChipText}>{r.startTime} - {r.endTime}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.timeSelectorCard}>
            {/* Cụm input chọn giờ phong cách Ant Design TimePicker */}
            <View style={styles.timePickerRow}>
              <View style={styles.timePickerCol}>
                <Text style={styles.timeFieldLabel}>Giờ bắt đầu:</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.timeInputBox}
                  onPress={() => openTimePicker('START')}
                >
                  <Text style={styles.timeInputValue}>{startTime}</Text>
                  <Ionicons name="time-outline" size={18} color="#059669" />
                </TouchableOpacity>
              </View>

              <View style={styles.timePickerCol}>
                <Text style={styles.timeFieldLabel}>Giờ kết thúc:</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.timeInputBox}
                  onPress={() => openTimePicker('END')}
                >
                  <Text style={styles.timeInputValue}>{endTime}</Text>
                  <Ionicons name="time-outline" size={18} color="#059669" />
                </TouchableOpacity>
              </View>
            </View>

          </View>
        </View>

        {/* Bước 4: Mã Giảm Giá Voucher (Đồng bộ Web & Backend) */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>4</Text>
            </View>
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.sectionTitle}>Mã giảm giá (Voucher)</Text>
              <TouchableOpacity onPress={handleOpenVoucherModal} style={styles.viewVouchersLink}>
                <Ionicons name="pricetags-outline" size={15} color={THEME.colors.primary} />
                <Text style={styles.viewVouchersLinkText}>Chọn ưu đãi</Text>
              </TouchableOpacity>
            </View>
          </View>

          {appliedVoucher ? (
            <View style={styles.appliedVoucherBox}>
              <View style={styles.appliedVoucherInfo}>
                <Ionicons name="pricetag" size={18} color={THEME.colors.primary} />
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.appliedVoucherCode}>{appliedVoucher.code || appliedVoucher.voucherCode}</Text>
                  {appliedVoucher.name || appliedVoucher.voucherName ? (
                    <Text style={styles.appliedVoucherName} numberOfLines={1}>
                      {appliedVoucher.name || appliedVoucher.voucherName}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={styles.appliedVoucherValue}>
                  -{formatCurrency(priceData.discount)}
                </Text>
                <TouchableOpacity onPress={handleRemoveVoucher} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={22} color={THEME.colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.selectVoucherBtn} onPress={handleOpenVoucherModal}>
              <View style={styles.selectVoucherBtnLeft}>
                <View style={styles.voucherIconCircle}>
                  <Ionicons name="ticket-outline" size={20} color={THEME.colors.primary} />
                </View>
                <View>
                  <Text style={styles.selectVoucherTitle}>Chọn hoặc nhập mã giảm giá</Text>
                  <Text style={styles.selectVoucherSubtitle}>Tiết kiệm chi phí khi đặt sân online</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          )}

          {voucherError ? (
            <Text style={styles.voucherErrorText}>{voucherError}</Text>
          ) : null}
        </View>

        {/* Bước 5: Ghi Chú */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ghi chú cho sân</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Ví dụ: Cần mượn thêm vợt, lấy bóng thi đấu..."
            placeholderTextColor={THEME.colors.textMuted}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Thẻ Tổng Kết Chi Phí */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryHeader}>Chi tiết thanh toán</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Số lượng sân:</Text>
            <Text style={styles.summaryValue}>
              {selectedCourts.length} sân ({selectedCourts.map((c) => c.courtName || c.name || `Sân ${c.courtNumber}`).join(', ')})
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Thời lượng thuê sân:</Text>
            <Text style={styles.summaryValue}>{durationHours} tiếng ({startTime} - {endTime})</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tiền thuê sân:</Text>
            {loadingPrice ? (
              <ActivityIndicator size="small" color={THEME.colors.primary} />
            ) : (
              <Text style={styles.summaryValue}>{formatCurrency(priceData.totalBasePrice)}</Text>
            )}
          </View>

          {priceData.discount > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Giảm giá voucher:</Text>
              <Text style={[styles.summaryValue, { color: THEME.colors.primary }]}>
                -{formatCurrency(priceData.discount)}
              </Text>
            </View>
          ) : null}

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Tổng thanh toán:</Text>
            {loadingPrice ? (
              <ActivityIndicator size="small" color={THEME.colors.primary} />
            ) : (
              <Text style={styles.totalValue}>{formatCurrency(priceData.finalTotalAmount)}</Text>
            )}
          </View>

          <Text style={styles.paymentMethodNotice}>
            💳 Thanh toán: Trả tại quầy sân bằng Tiền mặt hoặc Chuyển khoản khi check-in.
          </Text>

          <Button
            title={isConflictWithBooked ? 'Khung giờ đã có người đặt' : 'Xác nhận đặt sân'}
            onPress={handleConfirmBooking}
            loading={submitting}
            disabled={isConflictWithBooked || loadingPrice}
            style={[styles.confirmBtn, isConflictWithBooked && styles.confirmBtnDisabled]}
          />
        </View>
      </ScrollView>
      {/* Modal chọn khung giờ dạng 2 cột Giờ và Phút phong cách Ant Design */}
      <Modal
        visible={pickerModalType !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerModalType(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.timePickerModalCard}>
            <View style={styles.timePickerModalHeader}>
              <View>
                <Text style={styles.timePickerModalTitle}>
                  {pickerModalType === 'START' ? 'Chọn giờ bắt đầu' : 'Chọn giờ kết thúc'}
                </Text>
                <Text style={styles.timePickerModalSubtitle}>Đang chọn: {tempHour}:{tempMinute}</Text>
                {bookedRanges.length > 0 && (
                  <Text style={{ fontSize: 11, color: '#DC2626', marginTop: 3, fontWeight: '500' }}>
                    ● Màu đỏ: Giờ/mốc đã có khách đặt
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setPickerModalType(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* 2 cột Giờ và Phút */}
            <View style={styles.pickerColumnsContainer}>
              {/* Cột 1: GIỜ (05h -> 23h) */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerColumnLabel}>Giờ</Text>
                <ScrollView style={styles.pickerScrollList} showsVerticalScrollIndicator>
                  {Array.from({ length: 19 }, (_, i) => String(i + 5).padStart(2, '0')).map((h) => {
                    const isHourSelected = tempHour === h;
                    const isBooked = isHourBooked(h);
                    return (
                      <TouchableOpacity
                        key={`h-${h}`}
                        style={[
                          styles.pickerItem,
                          isBooked && styles.pickerItemBooked,
                          isHourSelected && styles.pickerItemActive,
                        ]}
                        onPress={() => setTempHour(h)}
                      >
                        <Text
                          style={[
                            styles.pickerItemText,
                            isBooked && styles.pickerItemTextBooked,
                            isHourSelected && styles.pickerItemTextActive,
                          ]}
                        >
                          {h} {isBooked ? '●' : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Cột 2: PHÚT (00, 15, 30, 45) */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerColumnLabel}>Phút</Text>
                <ScrollView style={styles.pickerScrollList} showsVerticalScrollIndicator>
                  {['00', '15', '30', '45'].map((m) => {
                    const isMinuteSelected = tempMinute === m;
                    const isBooked = isTimeSlotBooked(tempHour, m);
                    return (
                      <TouchableOpacity
                        key={`m-${m}`}
                        style={[
                          styles.pickerItem,
                          isBooked && styles.pickerItemBooked,
                          isMinuteSelected && styles.pickerItemActive,
                        ]}
                        onPress={() => setTempMinute(m)}
                      >
                        <Text
                          style={[
                            styles.pickerItemText,
                            isBooked && styles.pickerItemTextBooked,
                            isMinuteSelected && styles.pickerItemTextActive,
                          ]}
                        >
                          {m} {isBooked ? '●' : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            {/* Footer hành động: Nút Now và Nút Xác nhận */}
            <View style={styles.pickerModalFooter}>
              <TouchableOpacity style={styles.pickerNowBtn} onPress={setPickerNow}>
                <Text style={styles.pickerNowText}>Now</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={styles.pickerCancelBtn}
                  onPress={() => setPickerModalType(null)}
                >
                  <Text style={styles.pickerCancelText}>Đóng</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.pickerConfirmBtn}
                  onPress={handleConfirmPickerTime}
                >
                  <Text style={styles.pickerConfirmText}>Xác nhận</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Chọn Voucher / Mã Giảm Giá */}
      <Modal
        visible={voucherModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setVoucherModalOpen(false)}
      >
        <View style={styles.voucherModalOverlay}>
          <View style={styles.voucherModalCard}>
            <View style={styles.voucherModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.voucherModalTitle}>Khuyến mãi & Mã giảm giá</Text>
                <Text style={styles.voucherModalSubtitle}>
                  Áp dụng cho đơn hàng {formatCurrency(priceData.totalBasePrice)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setVoucherModalOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Input nhập mã thủ công */}
            <View style={styles.manualInputContainer}>
              <TextInput
                style={styles.manualVoucherInput}
                placeholder="Nhập mã ưu đãi (VD: SUMMER20)"
                placeholderTextColor={THEME.colors.textMuted}
                value={manualVoucherInput}
                onChangeText={(text) => {
                  setManualVoucherInput(text);
                  if (voucherError) setVoucherError('');
                }}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={[
                  styles.manualApplyBtn,
                  (!manualVoucherInput.trim() || validatingManualVoucher) && styles.manualApplyBtnDisabled,
                ]}
                onPress={handleApplyManualVoucher}
                disabled={!manualVoucherInput.trim() || validatingManualVoucher}
              >
                {validatingManualVoucher ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.manualApplyBtnText}>Áp dụng</Text>
                )}
              </TouchableOpacity>
            </View>

            {voucherError ? (
              <Text style={styles.modalVoucherErrorText}>{voucherError}</Text>
            ) : null}

            <View style={styles.voucherSectionTitleRow}>
              <Text style={styles.voucherSectionTitle}>Mã ưu đãi phù hợp</Text>
              <Text style={styles.voucherCountBadge}>
                {availableVouchers.filter((v) => v.isEligible).length} khả dụng
              </Text>
            </View>

            {loadingVouchers ? (
              <View style={styles.voucherLoadingBox}>
                <ActivityIndicator size="small" color={THEME.colors.primary} />
                <Text style={styles.voucherLoadingText}>Đang kiểm tra mã giảm giá phù hợp...</Text>
              </View>
            ) : availableVouchers.length === 0 ? (
              <View style={styles.voucherEmptyBox}>
                <Ionicons name="gift-outline" size={44} color="#CBD5E1" />
                <Text style={styles.voucherEmptyText}>
                  Hiện chưa có mã giảm giá nào áp dụng cho đơn đặt này.
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.voucherListScroll} showsVerticalScrollIndicator={false}>
                {availableVouchers.map((v) => {
                  const currentCode = appliedVoucher?.code || appliedVoucher?.voucherCode;
                  const vCode = v.code || v.voucherCode;
                  const isCurrent = currentCode === vCode;
                  const discountStr =
                    v.discountType === 'PERCENTAGE'
                      ? `Giảm ${v.discountValue}%`
                      : `Giảm ${formatCurrency(v.discountValue)}`;
                  const maxDiscountStr =
                    (v.maxDiscountAmount > 0 || v.maxDiscount > 0)
                      ? ` (Tối đa ${formatCurrency(v.maxDiscountAmount || v.maxDiscount)})`
                      : '';
                  const minOrder = v.minInvoiceAmount || v.minOrderAmount || 0;

                  return (
                    <View
                      key={v._id || vCode}
                      style={[
                        styles.voucherCardItem,
                        isCurrent && styles.voucherCardItemCurrent,
                        !v.isEligible && styles.voucherCardItemDisabled,
                      ]}
                    >
                      <View style={styles.voucherCardLeft}>
                        <View style={styles.voucherTagRow}>
                          <View
                            style={[
                              styles.voucherCodeBadge,
                              !v.isEligible && styles.voucherCodeBadgeDisabled,
                              isCurrent && styles.voucherCodeBadgeCurrent,
                            ]}
                          >
                            <Text
                              style={[
                                styles.voucherCodeBadgeText,
                                isCurrent && styles.voucherCodeBadgeTextCurrent,
                              ]}
                            >
                              {vCode}
                            </Text>
                          </View>
                          <Text style={styles.voucherItemName} numberOfLines={1}>
                            {v.name || v.voucherName || 'Ưu đãi đặt sân'}
                          </Text>
                        </View>

                        <Text style={styles.voucherDiscountValue}>
                          {discountStr} {maxDiscountStr}
                        </Text>

                        {v.description ? (
                          <Text style={styles.voucherItemDesc} numberOfLines={2}>
                            {v.description}
                          </Text>
                        ) : null}

                        {minOrder > 0 && (
                          <Text style={styles.voucherConditionText}>
                            Đơn tối thiểu: {formatCurrency(minOrder)}
                          </Text>
                        )}

                        {v.applicableCourtTypes && !v.applicableCourtTypes.includes('ALL') && (
                          <Text style={styles.voucherCourtTypesText}>
                            Áp dụng: {v.applicableCourtTypes.join(', ')}
                          </Text>
                        )}

                        {!v.isEligible && v.ineligibleReason && (
                          <Text style={styles.voucherIneligibleReason}>
                            ⚠️ {v.ineligibleReason}
                          </Text>
                        )}
                      </View>

                      <View style={styles.voucherCardRight}>
                        {isCurrent ? (
                          <View style={styles.currentBadge}>
                            <Ionicons name="checkmark-circle" size={14} color="#059669" />
                            <Text style={styles.currentBadgeText}>Đang dùng</Text>
                          </View>
                        ) : v.isEligible ? (
                          <TouchableOpacity
                            style={styles.applyVoucherBtn}
                            onPress={() => handleSelectVoucher(v)}
                          >
                            <Text style={styles.applyVoucherBtnText}>Áp dụng</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.disabledVoucherBtn}>
                            <Text style={styles.disabledVoucherBtnText}>Chưa đủ ĐK</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            <View style={styles.voucherModalFooter}>
              <TouchableOpacity
                style={styles.closeModalBottomBtn}
                onPress={() => setVoucherModalOpen(false)}
              >
                <Text style={styles.closeModalBottomBtnText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollContent: {
    padding: THEME.spacing.lg,
    paddingBottom: 110,
  },
  section: {
    marginBottom: THEME.spacing.xl,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: THEME.spacing.sm,
  },
  stepBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  conflictWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
  },
  conflictWarningText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  bookedBadgeContainer: {
    backgroundColor: THEME.colors.surfaceAlt,
    padding: THEME.spacing.md,
    borderRadius: THEME.radius.md,
    marginBottom: THEME.spacing.md,
  },
  bookedBadgeHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    marginBottom: 6,
  },
  bookedChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  bookedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.radius.sm,
    marginRight: 6,
    marginBottom: 4,
  },
  bookedChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
    marginLeft: 4,
  },
  courtScroll: {
    paddingBottom: 4,
  },
  courtSelectCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.md,
    marginRight: THEME.spacing.md,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    minWidth: 130,
    alignItems: 'center',
    ...THEME.shadows.card,
  },
  courtSelectCardActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primaryLight,
  },
  courtIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  courtIconCircleActive: {
    backgroundColor: THEME.colors.primary,
  },
  courtSelectName: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  courtSelectNameActive: {
    color: THEME.colors.primaryDark,
  },
  courtSelectPrice: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 4,
  },
  courtSelectPriceActive: {
    color: THEME.colors.primaryDark,
    fontWeight: '600',
  },
  dateScroll: {
    paddingBottom: 4,
  },
  dateCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.lg,
    paddingVertical: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.lg,
    marginRight: THEME.spacing.sm,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    minWidth: 90,
    ...THEME.shadows.card,
  },
  dateCardActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  dateDayName: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  dateDayNameActive: {
    color: '#FFFFFF',
  },
  dateDayNum: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginTop: 4,
  },
  dateDayNumActive: {
    color: '#FFFFFF',
  },
  timeSelectorCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  timeSelectRow: {
    marginVertical: 4,
  },
  timeSelectBlock: {
    flex: 1,
  },
  timeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeSelectLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  timeSelectedValue: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primaryDark,
  },
  timeChipScroll: {
    paddingBottom: 4,
  },
  timeChip: {
    backgroundColor: THEME.colors.surfaceAlt,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.radius.md,
    marginRight: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  timeChipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  timeChipBooked: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  timeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  timeChipTextActive: {
    color: '#FFFFFF',
  },
  timeChipTextBooked: {
    color: '#DC2626',
    textDecorationLine: 'line-through',
  },
  timeSelectDivider: {
    height: 1,
    backgroundColor: THEME.colors.borderLight,
    marginVertical: THEME.spacing.md,
  },
  voucherInputRow: {
    flexDirection: 'row',
  },
  voucherInput: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.lg,
    paddingHorizontal: THEME.spacing.md,
    fontSize: 14,
    color: THEME.colors.textPrimary,
    height: 48,
  },
  applyBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: THEME.spacing.lg,
    borderRadius: THEME.radius.lg,
    marginLeft: THEME.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    height: 48,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  viewVouchersLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  viewVouchersLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  appliedVoucherBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.colors.primaryLight,
    padding: THEME.spacing.md,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.primaryBorder,
  },
  appliedVoucherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appliedVoucherCode: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.primaryDark,
  },
  appliedVoucherName: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    maxWidth: 160,
  },
  appliedVoucherValue: {
    fontSize: 13,
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  selectVoucherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.lg,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 12,
  },
  selectVoucherBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  voucherIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectVoucherTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  selectVoucherSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  voucherErrorText: {
    fontSize: 12,
    color: THEME.colors.danger,
    marginTop: 6,
    marginLeft: 2,
  },
  voucherModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  voucherModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    padding: 20,
    ...THEME.shadows.card,
  },
  voucherModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  voucherModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  voucherModalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  manualInputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  manualVoucherInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: '#0F172A',
  },
  manualApplyBtn: {
    backgroundColor: THEME.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
    height: 44,
  },
  manualApplyBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  manualApplyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  modalVoucherErrorText: {
    fontSize: 12,
    color: THEME.colors.danger,
    marginTop: 6,
  },
  voucherSectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  voucherSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  voucherCountBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  voucherLoadingBox: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voucherLoadingText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 10,
  },
  voucherEmptyBox: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voucherEmptyText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 240,
  },
  voucherListScroll: {
    maxHeight: 320,
  },
  voucherCardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  voucherCardItemCurrent: {
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  voucherCardItemDisabled: {
    opacity: 0.65,
    backgroundColor: '#FAFAFA',
  },
  voucherCardLeft: {
    flex: 1,
    marginRight: 10,
  },
  voucherCardRight: {
    alignItems: 'flex-end',
  },
  voucherTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  voucherCodeBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  voucherCodeBadgeCurrent: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  voucherCodeBadgeDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  voucherCodeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  voucherCodeBadgeTextCurrent: {
    color: '#FFFFFF',
  },
  voucherItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  voucherDiscountValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
    marginTop: 2,
  },
  voucherItemDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  voucherConditionText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  voucherCourtTypesText: {
    fontSize: 11,
    color: '#6366F1',
    marginTop: 2,
  },
  voucherIneligibleReason: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
    marginTop: 4,
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  currentBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  applyVoucherBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  applyVoucherBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  disabledVoucherBtn: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  disabledVoucherBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  voucherModalFooter: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  closeModalBottomBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeModalBottomBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  noteInput: {
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.md,
    fontSize: 14,
    color: THEME.colors.textPrimary,
    marginTop: 8,
    minHeight: 60,
  },
  summaryCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.xl,
    padding: THEME.spacing.xl,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginTop: THEME.spacing.sm,
    ...THEME.shadows.card,
  },
  summaryHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: THEME.spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
  },
  summaryLabel: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: THEME.colors.borderLight,
    marginVertical: THEME.spacing.md,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.primaryDark,
  },
  paymentMethodNotice: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    backgroundColor: THEME.colors.surfaceAlt,
    padding: THEME.spacing.sm,
    borderRadius: THEME.radius.md,
    marginTop: THEME.spacing.md,
    lineHeight: 16,
  },
  confirmBtn: {
    marginTop: THEME.spacing.lg,
  },
  confirmBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  timePickerRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  timePickerCol: {
    flex: 1,
  },
  timeFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    marginBottom: 6,
  },
  timeInputBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#059669',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  timeInputValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  timePickerModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 320,
    padding: 16,
    ...THEME.shadows.card,
  },
  timePickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 10,
    marginBottom: 12,
  },
  timePickerModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  timePickerModalSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  pickerColumnsContainer: {
    flexDirection: 'row',
    gap: 12,
    height: 220,
  },
  pickerColumn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
  pickerColumnLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
    paddingVertical: 6,
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  pickerScrollList: {
    flex: 1,
    padding: 4,
  },
  pickerItem: {
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 4,
  },
  pickerItemActive: {
    backgroundColor: '#059669',
  },
  pickerItemBooked: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  pickerItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  pickerItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  pickerItemTextBooked: {
    color: '#DC2626',
    fontWeight: '700',
    textDecorationLine: 'line-through',
  },
  pickerModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  pickerNowBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  pickerNowText: {
    color: '#059669',
    fontWeight: '700',
    fontSize: 14,
  },
  pickerCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  pickerCancelText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 13,
  },
  pickerConfirmBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#059669',
  },
  pickerConfirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
