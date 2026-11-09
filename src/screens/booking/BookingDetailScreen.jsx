import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { THEME } from '../../utils/theme';
import { formatCurrency, formatDate } from '../../utils/formatters';
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

  const firstItem = Array.isArray(booking.items) && booking.items.length > 0 ? booking.items[0] : null;
  const courtObj = firstItem?.courtId || booking.courtId || booking.court;
  const rawCourtName = courtObj?.courtName || courtObj?.name || booking.courtName || 'Sân cầu lông';
  const courtName = Array.isArray(booking.items) && booking.items.length > 1
    ? `${rawCourtName} (+${booking.items.length - 1} sân khác)`
    : rawCourtName;

  const bookingCode = booking.bookingCode || booking._id?.slice(-8)?.toUpperCase();
  const dateStr = formatDate(firstItem?.bookingDate || booking.bookingDate || booking.date);
  const sTime = firstItem?.startTime || booking.startTime || '08:00';
  const eTime = firstItem?.endTime || booking.endTime || '10:00';
  const timeStr = `${sTime} - ${eTime}`;
  const totalAmount = booking.finalTotalAmount || booking.totalAmount || 0;
  const canCancel =
    currentStatus === 'PENDING_APPROVAL' ||
    currentStatus === 'CONFIRMED' ||
    currentStatus === 'Pending' ||
    currentStatus === 'Confirmed';

  const handleCancel = () => {
    Alert.alert(
      'Hủy đơn đặt sân',
      'Bạn có chắc chắn muốn hủy đơn đặt sân này không?',
      [
        { text: 'Quay lại', style: 'cancel' },
        {
          text: 'Xác nhận hủy',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelling(true);
              await bookingService.cancelBooking(booking._id, 'Khách yêu cầu hủy qua ứng dụng');
              setCurrentStatus('CANCELLED');
              Alert.alert('Thành công', 'Đơn đặt sân đã được hủy thành công.');
            } catch (err) {
              const msg = err.response?.data?.message || 'Không thể hủy đơn đặt sân vào lúc này.';
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
          <View>
            <Text style={styles.ticketBrand}>VÉ THI ĐẤU CẦU LÔNG</Text>
            <Text style={styles.courtName}>{courtName}</Text>
          </View>
          <StatusBadge status={currentStatus} />
        </View>

        {/* Thông tin mã QR check-in tượng trưng phong cách thẻ tối giản */}
        <View style={styles.qrContainer}>
          <View style={styles.qrPlaceholder}>
            <Ionicons name="qr-code" size={110} color={THEME.colors.textPrimary} />
          </View>
          <Text style={styles.bookingCodeText}>MÃ VÉ: {bookingCode}</Text>
          <Text style={styles.qrInstruction}>
            Đưa mã này cho nhân viên lễ tân tại quầy để check-in sân
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
              <Text style={styles.detailLabel}>NGÀY THI ĐẤU</Text>
              <Text style={styles.detailValue}>{dateStr}</Text>
            </View>
            <View style={styles.colRight}>
              <Text style={styles.detailLabel}>KHUNG GIỜ</Text>
              <Text style={styles.detailValue}>{timeStr}</Text>
            </View>
          </View>

          <View style={[styles.row, { marginTop: 14 }]}>
            <View style={styles.col}>
              <Text style={styles.detailLabel}>NGƯỜI ĐẶT</Text>
              <Text style={styles.detailValue}>
                {booking.customerName || booking.user?.fullName || 'Khách hàng'}
              </Text>
            </View>
            <View style={styles.colRight}>
              <Text style={styles.detailLabel}>SỐ ĐIỆN THOẠI</Text>
              <Text style={styles.detailValue}>
                {booking.customerPhone || booking.user?.phoneNumber || 'N/A'}
              </Text>
            </View>
          </View>

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

      {/* Button Hủy Đơn nếu còn hiệu lực */}
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
    paddingBottom: THEME.spacing.xxl,
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
  qrContainer: {
    alignItems: 'center',
    paddingVertical: THEME.spacing.lg,
    backgroundColor: THEME.colors.surfaceAlt,
  },
  qrPlaceholder: {
    width: 140,
    height: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    ...THEME.shadows.card,
  },
  bookingCodeText: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginTop: 12,
    letterSpacing: 1,
  },
  qrInstruction: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: THEME.spacing.xl,
  },
  perforationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceAlt,
    overflow: 'hidden',
    height: 24,
  },
  perforationHoleLeft: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.colors.background,
    marginLeft: -12,
  },
  perforationLine: {
    flex: 1,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderStyle: 'dashed',
  },
  perforationHoleRight: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.colors.background,
    marginRight: -12,
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
  cancelBtn: {
    marginTop: THEME.spacing.xl,
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
