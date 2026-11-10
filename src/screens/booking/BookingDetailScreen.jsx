import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import dayjs from 'dayjs';
import { THEME } from '../../utils/theme';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { HOTLINE_NUMBER, HOTLINE_DISPLAY } from '../../utils/constants';
import StatusBadge from '../../components/StatusBadge';
import Button from '../../components/Button';
import bookingService from '../../services/bookingService';
import { Ionicons } from '@expo/vector-icons';

export default function BookingDetailScreen({ route, navigation }) {
  const { booking } = route.params || {};
  const [cancelling, setCancelling] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(booking?.status || 'PENDING_APPROVAL');

  if (!booking) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Không tìm thấy thông tin đơn đặt sân.</Text>
      </View>
    );
  }

  const items = Array.isArray(booking.items) && booking.items.length > 0 ? booking.items : [];
  const firstItem = items.length > 0 ? items[0] : null;
  const courtObj = firstItem?.courtId || booking.courtId || booking.court;
  const rawCourtName = courtObj?.courtName || courtObj?.name || booking.courtName || 'Sân cầu lông';
  const courtName = items.length > 1
    ? `${rawCourtName} (+${items.length - 1} sân khác)`
    : rawCourtName;

  const bookingCode = booking.bookingCode || booking._id?.slice(-8)?.toUpperCase();
  const rawDate = firstItem?.bookingDate || booking.bookingDate || booking.date;
  const dateStr = formatDate(rawDate);
  const sTime = firstItem?.startTime || booking.startTime || '08:00';
  const eTime = firstItem?.endTime || booking.endTime || '10:00';
  const timeStr = `${sTime} - ${eTime}`;
  const totalAmount = booking.finalTotalAmount || booking.totalAmount || 0;

  const isCheckedIn = currentStatus === 'CHECKED_IN' || currentStatus === 'Checked-in';
  const isCompleted = currentStatus === 'COMPLETED' || currentStatus === 'Completed';
  const isCancelled = currentStatus === 'CANCELLED' || currentStatus === 'Cancelled';
  const isRejected = currentStatus === 'REJECTED' || currentStatus === 'Rejected';

  // Khách được phép hủy khi ở trạng thái Chờ duyệt (PENDING_APPROVAL) hoặc Đã xác nhận (CONFIRMED)
  // Khi Admin đã "Nhận sân" (CHECKED_IN) hoặc đơn đã Hoàn thành / Đã hủy -> KHÔNG CHO HỦY!
  const canCancel =
    !isCheckedIn &&
    !isCompleted &&
    !isCancelled &&
    !isRejected &&
    (currentStatus === 'PENDING_APPROVAL' ||
      currentStatus === 'CONFIRMED' ||
      currentStatus === 'PENDING' ||
      currentStatus === 'Pending' ||
      currentStatus === 'Confirmed');

  // Tính toán thời gian đếm ngược đến giờ vào sân
  const [countdownText, setCountdownText] = useState('');
  const [countdownType, setCountdownType] = useState('upcoming'); // 'in_progress' | 'upcoming' | 'ended' | 'cancelled' | 'completed'

  const computeCountdown = useCallback(() => {
    if (['CANCELLED', 'REJECTED', 'Cancelled', 'Rejected'].includes(currentStatus)) {
      setCountdownText('Đơn đặt sân này đã bị hủy hoặc từ chối.');
      setCountdownType('cancelled');
      return;
    }

    if (['COMPLETED', 'Completed'].includes(currentStatus)) {
      setCountdownText('Trận đấu đã hoàn thành. Cảm ơn bạn đã thi đấu!');
      setCountdownType('completed');
      return;
    }

    const dateFormatted = rawDate ? dayjs(rawDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
    const startDateTime = dayjs(`${dateFormatted} ${sTime}`);
    const endDateTime = dayjs(`${dateFormatted} ${eTime}`);
    const now = dayjs();

    if (now.isAfter(endDateTime)) {
      setCountdownText('⏱ Khung giờ thi đấu đã kết thúc.');
      setCountdownType('ended');
      return;
    }

    if (currentStatus === 'CHECKED_IN' || (now.isAfter(startDateTime) && now.isBefore(endDateTime))) {
      const remainingMinutes = endDateTime.diff(now, 'minute');
      setCountdownText(`🏸 Đang trong giờ thi đấu! Còn ${remainingMinutes} phút nữa.`);
      setCountdownType('in_progress');
      return;
    }

    // Trường hợp chưa tới giờ bắt đầu
    const isToday = dayjs(dateFormatted).isSame(now, 'day');
    const diffMinutes = startDateTime.diff(now, 'minute');

    if (isToday) {
      if (diffMinutes <= 0) {
        setCountdownText('⏰ Đã đến giờ vào sân! Vui lòng tới quầy lễ tân check-in.');
        setCountdownType('in_progress');
      } else if (diffMinutes <= 60) {
        setCountdownText(`Còn ${diffMinutes} phút nữa đến giờ vào sân`);
        setCountdownType('upcoming');
      } else {
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        setCountdownText(`Còn ${hours} giờ ${mins > 0 ? `${mins} phút ` : ''}nữa đến giờ vào sân`);
        setCountdownType('upcoming');
      }
    } else {
      const diffDays = dayjs(dateFormatted).diff(now.startOf('day'), 'day');
      if (diffDays === 1) {
        setCountdownText(`Lịch thi đấu vào ngày mai lúc ${sTime}`);
      } else {
        setCountdownText(`Còn ${diffDays} ngày nữa đến giờ thi đấu (${dateStr} lúc ${sTime})`);
      }
      setCountdownType('upcoming');
    }
  }, [currentStatus, rawDate, sTime, eTime, dateStr]);

  useEffect(() => {
    computeCountdown();
    const interval = setInterval(computeCountdown, 30000);
    return () => clearInterval(interval);
  }, [computeCountdown]);

  // Thao tác 1 chạm: Gọi hotline
  const handleCallHotline = () => {
    Linking.openURL(`tel:${HOTLINE_NUMBER}`).catch(() => {
      Alert.alert('Lỗi', 'Không thể khởi động trình quay số điện thoại trên thiết bị này.');
    });
  };

  // Thao tác 1 chạm: Mở bản đồ chỉ đường đến Đại học FPT Cần Thơ
  const handleOpenMap = () => {
    const destination = encodeURIComponent('Đại học FPT Cần Thơ');
    const url = Platform.select({
      ios: `maps:0,0?q=${destination}`,
      android: `geo:0,0?q=${destination}`,
      default: `https://www.google.com/maps/search/?api=1&query=${destination}`,
    });
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${destination}`);
    });
  };

  const handleCancel = () => {
    Alert.alert(
      'Hủy đơn đặt sân',
      'Bạn có chắc chắn muốn hủy đơn đặt sân này không? Hành động này không thể hoàn tác.',
      [
        { text: 'Quay lại', style: 'cancel' },
        {
          text: 'Xác nhận hủy',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelling(true);
              await bookingService.cancelBooking(booking._id);
              setCurrentStatus('CANCELLED');
              Alert.alert('Thành công', 'Đơn đặt sân đã được hủy thành công.');
            } catch (err) {
              const msg =
                err.response?.data?.message ||
                err.response?.data?.error ||
                err.message ||
                'Không thể hủy đơn đặt sân vào lúc này.';
              Alert.alert('Lỗi', msg);
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Thẻ Vé Điện Tử (Digital Ticket Pass) */}
      <View style={styles.ticketCard}>
        {/* Top Ticket Header */}
        <View style={styles.ticketHeader}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.ticketBrand}>VÉ THI ĐẤU CẦU LÔNG</Text>
            <Text style={styles.courtName}>{courtName}</Text>
          </View>
          <StatusBadge status={currentStatus} />
        </View>

        {/* WIDGET ĐỒNG HỒ ĐẾM NGƯỢC GIỜ VÀO SÂN */}
        <View
          style={[
            styles.countdownWidget,
            countdownType === 'in_progress' && styles.countdownWidgetActive,
            countdownType === 'cancelled' && styles.countdownWidgetCancelled,
            countdownType === 'ended' && styles.countdownWidgetEnded,
          ]}
        >
          <Ionicons
            name={
              countdownType === 'in_progress'
                ? 'flame'
                : countdownType === 'cancelled'
                ? 'close-circle-outline'
                : countdownType === 'completed'
                ? 'checkmark-circle-outline'
                : 'hourglass-outline'
            }
            size={18}
            color={
              countdownType === 'in_progress'
                ? '#10B981'
                : countdownType === 'cancelled'
                ? '#EF4444'
                : countdownType === 'completed'
                ? '#64748B'
                : '#D97706'
            }
            style={{ marginRight: 8 }}
          />
          <Text
            style={[
              styles.countdownText,
              countdownType === 'in_progress' && styles.countdownTextActive,
              countdownType === 'cancelled' && styles.countdownTextCancelled,
              countdownType === 'ended' && styles.countdownTextEnded,
            ]}
          >
            {countdownText}
          </Text>
        </View>

        {/* Đường cắt vé (Ticket Perforation) */}
        <View style={styles.perforationRow}>
          <View style={styles.perforationHoleLeft} />
          <View style={styles.perforationLine} />
          <View style={styles.perforationHoleRight} />
        </View>

        {/* Chi tiết lịch & giá vé */}
        <View style={styles.ticketDetails}>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.detailLabel}>MÃ VÉ ĐẶT SÂN</Text>
              <Text style={[styles.detailValue, styles.bookingCodeValue]}>{bookingCode}</Text>
            </View>
            <View style={styles.colRight}>
              <Text style={styles.detailLabel}>NGÀY THI ĐẤU</Text>
              <Text style={styles.detailValue}>{dateStr}</Text>
            </View>
          </View>

          <View style={[styles.row, { marginTop: 14 }]}>
            <View style={styles.col}>
              <Text style={styles.detailLabel}>KHUNG GIỜ</Text>
              <Text style={styles.detailValue}>{timeStr}</Text>
            </View>
            <View style={styles.colRight}>
              <Text style={styles.detailLabel}>NGƯỜI ĐẶT</Text>
              <Text style={styles.detailValue}>
                {booking.customerName || booking.user?.fullName || 'Khách hàng'}
              </Text>
            </View>
          </View>

          <View style={[styles.row, { marginTop: 14 }]}>
            <View style={styles.col}>
              <Text style={styles.detailLabel}>SỐ ĐIỆN THOẠI</Text>
              <Text style={styles.detailValue}>
                {booking.customerPhone || booking.user?.phoneNumber || 'N/A'}
              </Text>
            </View>
          </View>

          {/* Nếu đơn có nhiều sân/item con */}
          {items.length > 1 ? (
            <View style={styles.multiItemsBlock}>
              <Text style={styles.detailLabel}>DANH SÁCH SÂN ĐÃ ĐẶT ({items.length})</Text>
              {items.map((it, idx) => {
                const subCourt = it.courtId?.courtName || it.courtId?.name || it.courtName || `Sân ${idx + 1}`;
                return (
                  <View key={it._id || idx} style={styles.subItemRow}>
                    <Text style={styles.subItemName}>• {subCourt}</Text>
                    <Text style={styles.subItemTime}>{it.startTime} - {it.endTime}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}

          {booking.note ? (
            <View style={{ marginTop: 14 }}>
              <Text style={styles.detailLabel}>GHI CHÚ</Text>
              <Text style={styles.noteText}>{booking.note}</Text>
            </View>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.totalLabel}>TỔNG TIỀN VÉ</Text>
            <Text style={styles.totalValue}>{formatCurrency(totalAmount)}</Text>
          </View>
        </View>
      </View>

      {/* Cụm Tiện Ích Thao Tác Nhanh (Gọi Hotline & Chỉ đường Google Maps) */}
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity
          style={styles.quickActionBtn}
          onPress={handleOpenMap}
          activeOpacity={0.8}
        >
          <View style={[styles.quickActionIconBox, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="navigate-outline" size={20} color={THEME.colors.primary} />
          </View>
          <View style={styles.quickActionContent}>
            <Text style={styles.quickActionTitle}>Chỉ đường đến sân</Text>
            <Text style={styles.quickActionSubtitle}>Đại học FPT Cần Thơ</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={THEME.colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionBtn}
          onPress={handleCallHotline}
          activeOpacity={0.8}
        >
          <View style={[styles.quickActionIconBox, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="call-outline" size={20} color="#D97706" />
          </View>
          <View style={styles.quickActionContent}>
            <Text style={styles.quickActionTitle}>Hotline hỗ trợ</Text>
            <Text style={styles.quickActionSubtitle}>{HOTLINE_DISPLAY} (Gọi ngay)</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={THEME.colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Thông báo nếu sân đã được admin nhận (Check-in) */}
      {isCheckedIn ? (
        <View style={styles.checkedInNoticeBox}>
          <Ionicons name="shield-checkmark" size={18} color="#2563EB" style={{ marginRight: 8 }} />
          <Text style={styles.checkedInNoticeText}>
            Sân đã được nhận (Đang trong ca chơi). Đơn đặt sân không thể hủy.
          </Text>
        </View>
      ) : null}

      {/* Button Hủy Đơn nếu chưa nhận sân (PENDING_APPROVAL hoặc CONFIRMED) */}
      {canCancel ? (
        <Button
          title="Hủy đơn đặt sân này"
          variant="outline"
          onPress={handleCancel}
          loading={cancelling}
          style={styles.cancelBtn}
          textStyle={{ color: THEME.colors.danger }}
        />
      ) : null}
    </ScrollView>
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
  ticketCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.xl,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    overflow: 'hidden',
    ...THEME.shadows.card,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: THEME.spacing.xl,
    backgroundColor: THEME.colors.surface,
  },
  ticketBrand: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
    letterSpacing: 0.5,
  },
  courtName: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginTop: 4,
  },
  countdownWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    paddingVertical: 10,
    paddingHorizontal: THEME.spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#FDE68A',
  },
  countdownWidgetActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  countdownWidgetCancelled: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  countdownWidgetEnded: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  countdownText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
  },
  countdownTextActive: {
    color: '#047857',
  },
  countdownTextCancelled: {
    color: '#DC2626',
  },
  countdownTextEnded: {
    color: '#64748B',
  },
  bookingCodeValue: {
    color: THEME.colors.primary,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  perforationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    overflow: 'hidden',
    height: 20,
    marginVertical: 4,
  },
  perforationHoleLeft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: THEME.colors.background,
    marginLeft: -10,
  },
  perforationLine: {
    flex: 1,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderStyle: 'dashed',
  },
  perforationHoleRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: THEME.colors.background,
    marginRight: -10,
  },
  ticketDetails: {
    padding: THEME.spacing.xl,
    backgroundColor: THEME.colors.surface,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  col: {
    flex: 1,
  },
  colRight: {
    alignItems: 'flex-end',
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginTop: 2,
  },
  multiItemsBlock: {
    marginTop: 14,
    backgroundColor: THEME.colors.surfaceAlt,
    padding: 10,
    borderRadius: THEME.radius.md,
  },
  subItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  subItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  subItemTime: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  noteText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.borderLight,
    marginVertical: THEME.spacing.lg,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.primaryDark,
  },
  quickActionsContainer: {
    marginTop: THEME.spacing.lg,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.xl,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  quickActionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
  checkedInNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.md,
    marginTop: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  checkedInNoticeText: {
    color: '#1E40AF',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  cancelBtn: {
    marginTop: THEME.spacing.lg,
    borderColor: THEME.colors.danger,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.xl,
  },
  errorText: {
    fontSize: 15,
    color: THEME.colors.textSecondary,
  },
});
