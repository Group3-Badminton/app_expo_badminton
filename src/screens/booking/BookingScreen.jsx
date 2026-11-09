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

  // Bước 1: Chọn Sân
  const [selectedCourtId, setSelectedCourtId] = useState(initialCourtId || null);

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


  // Tình trạng lịch đã đặt của sân trong ngày (Chống đặt trùng)
  const [bookedRanges, setBookedRanges] = useState([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  // Bước 4: Ghi chú
  const [note, setNote] = useState('');

  // Bước 5: Voucher
  const [voucherCode, setVoucherCode] = useState('');
  const [validatingVoucher, setValidatingVoucher] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherError, setVoucherError] = useState('');

  // Bước 6: Tính giá từ Backend API
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [priceData, setPriceData] = useState({
    totalBasePrice: 0,
    discount: 0,
    finalTotalAmount: 0,
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
      if (list.length > 0 && !selectedCourtId) {
        setSelectedCourtId(initialCourtId || list[0]._id);
      }
    } catch (e) {
      console.warn('Lỗi tải danh sách sân booking:', e);
    } finally {
      setLoadingCourts(false);
    }
  }, [initialCourtId, selectedCourtId]);

  useEffect(() => {
    fetchCourts();
  }, [fetchCourts]);

  // Cập nhật selectedCourtId nếu có truyền qua route
  useEffect(() => {
    if (route.params?.initialCourtId) {
      setSelectedCourtId(route.params.initialCourtId);
    }
  }, [route.params?.initialCourtId]);

  // 2. Tải tình trạng khung giờ đã đặt của sân theo ngày (Kiểm tra lịch trùng)
  const fetchAvailability = useCallback(async () => {
    if (!selectedCourtId || !selectedDate) return;
    try {
      setLoadingAvailability(true);
      const res = await bookingService.getCourtAvailability(selectedCourtId, selectedDate);
      const ranges = res?.data?.bookedRanges || [];
      setBookedRanges(ranges);
    } catch (e) {
      console.warn('Lỗi tải tình trạng lịch đặt sân:', e);
      setBookedRanges([]);
    } finally {
      setLoadingAvailability(false);
    }
  }, [selectedCourtId, selectedDate]);

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

  // Kiểm tra xung đột (trùng giờ) giữa khoảng đang chọn với các đơn đã đặt
  const isConflictWithBooked = useMemo(() => {
    if (!startTime || !endTime || bookedRanges.length === 0) return false;
    const sMin = parseTimeToMinutes(startTime);
    const eMin = parseTimeToMinutes(endTime);
    return bookedRanges.some((range) => {
      const bStart = parseTimeToMinutes(range.startTime);
      const bEnd = parseTimeToMinutes(range.endTime);
      return sMin < bEnd && eMin > bStart;
    });
  }, [startTime, endTime, bookedRanges]);

  // 3. Tính toán tiền tự động từ Backend API chuẩn xác
  const calculatePrice = useCallback(async () => {
    if (!selectedCourtId || !startTime || !endTime) return;

    const sMin = parseTimeToMinutes(startTime);
    const eMin = parseTimeToMinutes(endTime);
    if (eMin - sMin < 60) return; // Chưa đủ 1 tiếng tối thiểu

    try {
      setLoadingPrice(true);
      // Gửi cả courtId, startTime, endTime và mảng courtOrders chuẩn theo Backend
      const payload = {
        bookingDate: selectedDate,
        courtId: selectedCourtId,
        courtIds: [selectedCourtId],
        startTime,
        endTime,
        courtOrders: [
          {
            courtId: selectedCourtId,
            bookingDate: selectedDate,
            startTime,
            endTime,
          },
        ],
        voucherCode: appliedVoucher?.code || undefined,
      };

      const res = await bookingService.calculateBookingPrice(payload);
      const data = res?.data || res;
      if (data) {
        setPriceData({
          totalBasePrice: data.totalBasePrice || 0,
          discount: data.discount || 0,
          finalTotalAmount: data.finalTotalAmount || 0,
        });
      }
    } catch (err) {
      // Fallback tính giá cơ bản nếu API tính tiền gặp ngoại lệ
      const selectedCourt = courts.find((c) => c._id === selectedCourtId);
      const rawType = (selectedCourt?.courtType || selectedCourt?.type || 'STANDARD').toUpperCase();
      const defaultPrice = rawType.includes('VIP') ? 130000 : rawType.includes('PREMIUM') ? 160000 : 80000;
      const baseHourly = selectedCourt?.pricePerHour || selectedCourt?.basePrice || defaultPrice;
      const hours = (eMin - sMin) / 60;
      const total = Math.round(hours * baseHourly);
      const discount = appliedVoucher
        ? appliedVoucher.discountType === 'Percentage'
          ? Math.round((total * appliedVoucher.discountValue) / 100)
          : appliedVoucher.discountValue
        : 0;
      setPriceData({
        totalBasePrice: total,
        discount: discount,
        finalTotalAmount: Math.max(0, total - discount),
      });
    } finally {
      setLoadingPrice(false);
    }
  }, [selectedCourtId, selectedDate, startTime, endTime, appliedVoucher, courts]);

  useEffect(() => {
    calculatePrice();
  }, [calculatePrice]);

  // 4. Áp dụng mã Voucher
  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) return;

    try {
      setValidatingVoucher(true);
      setVoucherError('');
      const res = await bookingService.validateVoucher(
        voucherCode.trim().toUpperCase(),
        priceData.totalBasePrice
      );

      const voucher = res.data || res.voucher || {
        code: voucherCode.trim().toUpperCase(),
        discountValue: res.discountValue || 20000,
        discountType: res.discountType || 'FixedAmount',
      };

      setAppliedVoucher(voucher);
      Alert.alert('Thành công', `Đã áp dụng mã giảm giá ${voucher.code}`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Mã giảm giá không hợp lệ hoặc đã hết lượt dùng.';
      setVoucherError(msg);
      setAppliedVoucher(null);
    } finally {
      setValidatingVoucher(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode('');
    setVoucherError('');
  };

  // 5. Xác nhận đặt sân
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

    if (!selectedCourtId) {
      Alert.alert('Thông báo', 'Vui lòng chọn sân trước khi đặt.');
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
        `Khung giờ ${startTime} - ${endTime} trên sân này đã bị trùng lịch với đơn đặt trước. Vui lòng chọn khung giờ khác!`
      );
      return;
    }

    try {
      setSubmitting(true);
      const bookingPayload = {
        bookingDate: selectedDate,
        courtId: selectedCourtId,
        courtIds: [selectedCourtId],
        startTime,
        endTime,
        note: note.trim(),
        voucherCode: appliedVoucher?.code || undefined,
        paymentMethod: 'CASH',
        customerPhone: user?.phoneNumber || user?.phone,
        customerName: user?.fullName || user?.name,
      };

      const result = await bookingService.createBooking(bookingPayload);
      const created = result.data || result;

      Alert.alert(
        'Đặt sân thành công 🎉',
        `Mã đơn đặt: ${created.bookingCode || created._id || 'Đã ghi nhận'}\nVui lòng đến sân đúng giờ để check-in!`,
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
      Alert.alert('Không thể đặt sân', msg);
    } finally {
      setSubmitting(false);
    }
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
        {/* Bước 1: Chọn Sân Cầu Lông */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
            <Text style={styles.sectionTitle}>Chọn sân thi đấu</Text>
          </View>

          {loadingCourts ? (
            <ActivityIndicator size="small" color={THEME.colors.primary} style={{ marginVertical: 12 }} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.courtScroll}>
              {(Array.isArray(courts) ? courts : []).map((court) => {
                const isSelected = selectedCourtId === court._id;
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
                    onPress={() => setSelectedCourtId(court._id)}
                  >
                    <View style={[styles.courtIconCircle, isSelected && styles.courtIconCircleActive, !isSelected && isVip && { backgroundColor: '#FEF3C7' }]}>
                      <Ionicons
                        name={isVip ? 'sparkles' : 'tennisball'}
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

        {/* Bước 4: Mã Giảm Giá Voucher */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>4</Text>
            </View>
            <Text style={styles.sectionTitle}>Mã giảm giá (Voucher)</Text>
          </View>

          {appliedVoucher ? (
            <View style={styles.appliedVoucherBox}>
              <View style={styles.appliedVoucherInfo}>
                <Ionicons name="pricetag" size={18} color={THEME.colors.primary} />
                <Text style={styles.appliedVoucherCode}>{appliedVoucher.code}</Text>
                <Text style={styles.appliedVoucherValue}>
                  - {formatCurrency(priceData.discount)}
                </Text>
              </View>
              <TouchableOpacity onPress={handleRemoveVoucher}>
                <Ionicons name="close-circle" size={22} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.voucherInputRow}>
              <TextInput
                style={styles.voucherInput}
                placeholder="Nhập mã voucher (ví dụ: SUMMER20)"
                placeholderTextColor={THEME.colors.textMuted}
                value={voucherCode}
                onChangeText={(txt) => {
                  setVoucherCode(txt);
                  if (voucherError) setVoucherError('');
                }}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={handleApplyVoucher}
                disabled={validatingVoucher}
              >
                {validatingVoucher ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.applyBtnText}>Áp dụng</Text>
                )}
              </TouchableOpacity>
            </View>
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
    marginLeft: 6,
    marginRight: 10,
  },
  appliedVoucherValue: {
    fontSize: 13,
    color: THEME.colors.primary,
    fontWeight: '600',
  },
  voucherErrorText: {
    fontSize: 12,
    color: THEME.colors.danger,
    marginTop: 6,
    marginLeft: 2,
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
