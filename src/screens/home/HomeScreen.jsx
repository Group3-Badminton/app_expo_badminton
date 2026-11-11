import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import dayjs from 'dayjs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../../utils/theme';
import { formatCurrency } from '../../utils/formatters';
import { HOTLINE_NUMBER, HOTLINE_DISPLAY } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import bookingService from '../../services/bookingService';
import notificationService from '../../services/notificationService';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen({ navigation }) {
  const { user, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const safeTopPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 30) : 0
  ) + 16;

  const [courts, setCourts] = useState([]);
  const [referencePrices, setReferencePrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [todayBooking, setTodayBooking] = useState(null);

  // Lấy đơn thi đấu hôm nay của khách hàng
  const fetchTodayBooking = useCallback(async () => {
    if (!isAuthenticated) {
      setTodayBooking(null);
      return;
    }
    try {
      const res = await bookingService.getMyBookings();
      const list = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.bookings)
        ? res.data.bookings
        : Array.isArray(res?.bookings)
        ? res.bookings
        : [];

      const today = dayjs().format('YYYY-MM-DD');

      // Tìm đơn trong ngày hôm nay ở trạng thái CONFIRMED hoặc CHECKED_IN
      const match = list.find((b) => {
        if (!b) return false;
        const st = b.status;
        const isConfirmedOrPlaying =
          st === 'CONFIRMED' || st === 'Confirmed' || st === 'CHECKED_IN' || st === 'Checked-in';
        if (!isConfirmedOrPlaying) return false;

        const firstItem = Array.isArray(b.items) && b.items.length > 0 ? b.items[0] : null;
        const rawDate = firstItem?.bookingDate || b.bookingDate || b.date;
        if (!rawDate) return false;
        return dayjs(rawDate).format('YYYY-MM-DD') === today;
      });

      setTodayBooking(match || null);
    } catch (e) {
      // Bỏ qua lỗi ngầm
    }
  }, [isAuthenticated]);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationService.getUnreadCount();
      const count = res?.data?.unreadCount || res?.unreadCount || 0;
      setUnreadNotifications(count);
    } catch (e) {
      // Bỏ qua lỗi ngầm nếu không có token
    }
  }, [isAuthenticated]);

  const fetchCourts = useCallback(async () => {
    try {
      const data = await bookingService.getCourts();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.data?.courts)
        ? data.data.courts
        : [];
      setCourts(list);
    } catch (e) {
      console.warn('Lỗi khi tải danh sách sân:', e);
      setCourts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
      fetchTodayBooking();
    }, [fetchUnreadCount, fetchTodayBooking])
  );

  useEffect(() => {
    fetchCourts();
  }, [fetchCourts]);

  // Tải bảng giá tham khảo thực tế từ backend theo từng sân (Đồng bộ chuẩn DB PriceRule)
  useEffect(() => {
    const fetchReferencePrices = async () => {
      if (!Array.isArray(courts) || courts.length === 0) return;
      try {
        const todayStr = dayjs().format('YYYY-MM-DD');
        const courtOrders = courts.map((c) => ({
          courtId: c._id,
          startTime: '08:00',
          endTime: '09:00',
        }));
        const res = await bookingService.calculateBookingPrice({
          courtOrders,
          bookingDate: todayStr,
        });
        const breakdowns = res?.data?.courtBreakdowns || res?.courtBreakdowns || [];
        if (Array.isArray(breakdowns)) {
          const map = {};
          breakdowns.forEach((cb) => {
            if (cb.courtId) {
              map[cb.courtId] = cb.totalAmount;
            }
          });
          setReferencePrices(map);
        }
      } catch (err) {
        console.warn('Lỗi tải bảng giá tham khảo từ backend:', err);
      }
    };
    fetchReferencePrices();
  }, [courts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCourts();
    fetchUnreadCount();
    fetchTodayBooking();
  };

  // Thao tác 1 chạm: Gọi hotline
  const handleCallHotline = () => {
    Linking.openURL(`tel:${HOTLINE_NUMBER}`).catch(() => {
      Alert.alert('Lỗi', 'Không thể khởi động trình gọi điện thoại trên thiết bị này.');
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

  const getUpcomingCourtName = (b) => {
    if (!b) return 'Sân cầu lông';
    const firstItem = Array.isArray(b.items) && b.items.length > 0 ? b.items[0] : null;
    const court = firstItem?.courtId || b.courtId || b.court;
    return court?.courtName || court?.name || b.courtName || 'Sân 1';
  };

  const getUpcomingTime = (b) => {
    if (!b) return '';
    const firstItem = Array.isArray(b.items) && b.items.length > 0 ? b.items[0] : null;
    const s = firstItem?.startTime || b.startTime || '08:00';
    const e = firstItem?.endTime || b.endTime || '10:00';
    return `${s} - ${e}`;
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: safeTopPadding }]}>
        <View>
          <Text style={styles.greeting}>Xin chào 👋</Text>
          <Text style={styles.userName}>
            {user?.fullName || user?.name || 'Khách thể thao'}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => navigation.navigate('Notification')}
          >
            <Ionicons name="notifications-outline" size={24} color={THEME.colors.textPrimary} />
            {unreadNotifications > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => navigation.navigate('Profile')}
          >
            <Ionicons name="person-circle" size={38} color={THEME.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[THEME.colors.primary]}
          />
        }
      >
        {/* THẺ NHẮC NHỞ LỊCH ĐẤU HÔM NAY (UPCOMING MATCH BANNER) */}
        {todayBooking ? (
          <TouchableOpacity
            style={styles.upcomingMatchCard}
            activeOpacity={0.88}
            onPress={() => navigation.navigate('BookingDetail', { booking: todayBooking })}
          >
            <View style={styles.upcomingTopRow}>
              <View style={styles.upcomingBadge}>
                <View style={styles.pulsingDot} />
                <Text style={styles.upcomingBadgeText}>LỊCH THI ĐẤU HÔM NAY</Text>
              </View>
              <View style={styles.viewTicketBtn}>
                <Text style={styles.viewTicketText}>Xem vé</Text>
                <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
              </View>
            </View>

            <Text style={styles.upcomingMatchTitle}>
              🏸 Hôm nay bạn có lịch: {getUpcomingCourtName(todayBooking)} ({getUpcomingTime(todayBooking)})
            </Text>
            <Text style={styles.upcomingMatchSubtitle}>
              Mã vé: {todayBooking.bookingCode || todayBooking._id?.slice(-8)?.toUpperCase()} • Chúc bạn có trận đấu vui vẻ!
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Hero Banner Thể Thao Hiện Đại */}
        <View style={styles.heroBanner}>
          <View style={styles.heroBadge}>
            <Ionicons name="flash" size={14} color="#FFFFFF" />
            <Text style={styles.heroBadgeText}>Sân chuẩn quốc tế</Text>
          </View>
          <Text style={styles.heroTitle}>Sẵn sàng cho trận đấu hôm nay?</Text>
          <Text style={styles.heroSubtitle}>
            Đặt sân trực tuyến nhanh chóng, hệ thống chiếu sáng chuẩn và sàn thảm cao cấp.
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.heroCtaBtn}
            onPress={() => navigation.navigate('Booking')}
          >
            <Text style={styles.heroCtaText}>Đặt sân ngay</Text>
            <Ionicons name="arrow-forward" size={18} color={THEME.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Tiện Ích Sân: Hotline & Chỉ đường Google Maps */}
        <View style={styles.contactBarCard}>
          <TouchableOpacity
            style={styles.contactBarItem}
            activeOpacity={0.75}
            onPress={handleOpenMap}
          >
            <View style={[styles.contactIconCircle, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="location" size={18} color={THEME.colors.primary} />
            </View>
            <View style={styles.contactItemContent}>
              <Text style={styles.contactItemTitle}>Đại học FPT Cần Thơ</Text>
              <Text style={styles.contactItemSubtitle}>Chỉ đường Google Maps</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={THEME.colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.contactDivider} />

          <TouchableOpacity
            style={styles.contactBarItem}
            activeOpacity={0.75}
            onPress={handleCallHotline}
          >
            <View style={[styles.contactIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="call" size={18} color="#D97706" />
            </View>
            <View style={styles.contactItemContent}>
              <Text style={styles.contactItemTitle}>Hotline: {HOTLINE_DISPLAY}</Text>
              <Text style={styles.contactItemSubtitle}>Hỗ trợ & giải đáp thắc mắc</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Danh sách Sân cầu lông */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Danh sách sân cầu lông</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Booking')}>
            <Text style={styles.viewAllText}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={THEME.colors.primary} />
            <Text style={styles.loadingText}>Đang tải danh sách sân...</Text>
          </View>
        ) : courts.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="basketball-outline" size={44} color={THEME.colors.textMuted} />
            <Text style={styles.emptyText}>Hiện chưa có dữ liệu sân.</Text>
          </View>
        ) : (
          (Array.isArray(courts) ? courts : []).map((court, index) => {
            const courtName = court.courtName || court.name || `Sân ${court.courtNumber || index + 1}`;
            const rawType = (court.courtType || court.type || 'STANDARD').toUpperCase();
            const isVip = rawType.includes('VIP');
            const isPremium = rawType.includes('PREMIUM') || rawType.includes('THI ĐẤU');
            const courtType = isVip ? 'Sân VIP' : isPremium ? 'Sân Thi Đấu' : 'Sân tiêu chuẩn';
            const price = referencePrices[court._id] || court.pricePerHour || court.basePrice;
            const isInactive = court.status === 'INACTIVE' || court.status === 'Inactive' || court.operationalStatus === 'MAINTENANCE';
            const isAvailable = !isInactive;
            const statusLabel = court.operationalStatus === 'MAINTENANCE' ? 'Bảo trì' : !isAvailable ? 'Tạm đóng' : 'Sẵn sàng';

            return (
              <View key={court._id || index} style={styles.courtCard}>
                <View style={styles.courtHeader}>
                  <View style={[styles.courtBadgeCircle, isVip && styles.courtBadgeVip, isPremium && styles.courtBadgePremium]}>
                    <Ionicons
                      name={isVip ? 'sparkles' : isPremium ? 'trophy' : 'tennisball'}
                      size={20}
                      color={isVip ? '#B45309' : isPremium ? '#7E22CE' : THEME.colors.primary}
                    />
                  </View>
                  <View style={styles.courtInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.courtName}>{courtName}</Text>
                      {isVip && (
                        <View style={styles.vipTag}>
                          <Text style={styles.vipTagText}>VIP</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.courtType, isVip && styles.courtTypeVip]}>{courtType}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: isAvailable ? THEME.colors.primaryLight : '#FEE2E2' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: isAvailable ? THEME.colors.primary : THEME.colors.danger },
                      ]}
                    >
                      {statusLabel}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.courtFooter}>
                  <View>
                    <Text style={styles.priceLabel}>Giá tham khảo</Text>
                    <Text style={styles.priceValue}>{price ? `${formatCurrency(price)}/h` : 'Tính theo giờ'}</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.bookBtn,
                      !isAvailable && styles.bookBtnDisabled,
                    ]}
                    disabled={!isAvailable}
                    onPress={() => navigation.navigate('Booking', { initialCourtId: court._id })}
                  >
                    <Text style={styles.bookBtnText}>Chọn sân</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.xl,
    paddingBottom: THEME.spacing.md,
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderLight,
  },
  greeting: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    letterSpacing: -0.3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notifBtn: {
    padding: 6,
    marginRight: 6,
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  profileBtn: {
    padding: 2, 
  },
  scrollContent: {
    padding: THEME.spacing.lg,
    paddingBottom: 110,
  },
  upcomingMatchCard: {
    backgroundColor: '#064E3B',
    borderRadius: THEME.radius.xl,
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.lg,
    borderWidth: 1.5,
    borderColor: '#059669',
    ...THEME.shadows.card,
  },
  upcomingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  upcomingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radius.full,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34D399',
    marginRight: 6,
  },
  upcomingBadgeText: {
    color: '#ECFDF5',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  viewTicketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radius.full,
  },
  viewTicketText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginRight: 4,
  },
  upcomingMatchTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  upcomingMatchSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
  },
  contactBarCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.xl,
    padding: THEME.spacing.sm,
    marginBottom: THEME.spacing.xl,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  contactBarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: THEME.spacing.sm,
  },
  contactIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactItemContent: {
    flex: 1,
  },
  contactItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  contactItemSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
  contactDivider: {
    height: 1,
    backgroundColor: THEME.colors.borderLight,
    marginHorizontal: THEME.spacing.sm,
  },
  heroBanner: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.radius.xl,
    padding: THEME.spacing.xl,
    marginBottom: THEME.spacing.xl,
    ...THEME.shadows.button,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: THEME.spacing.sm + 2,
    paddingVertical: THEME.spacing.xs,
    borderRadius: THEME.radius.full,
    alignSelf: 'flex-start',
    marginBottom: THEME.spacing.md,
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 8,
    lineHeight: 18,
  },
  heroCtaBtn: {
    marginTop: THEME.spacing.lg,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: THEME.spacing.lg,
    borderRadius: THEME.radius.lg,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroCtaText: {
    color: THEME.colors.primary,
    fontWeight: '700',
    fontSize: 14,
    marginRight: 6,
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.xl,
  },
  featureItem: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.radius.lg,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  featureIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  featureTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    textAlign: 'center',
  },
  featureDesc: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  viewAllText: {
    fontSize: 13,
    color: THEME.colors.primary,
    fontWeight: '600',
  },
  courtCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  courtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courtBadgeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: THEME.spacing.md,
  },
  courtInfo: {
    flex: 1,
  },
  courtName: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  courtType: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radius.full,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    backgroundColor: THEME.colors.borderLight,
    marginVertical: THEME.spacing.md,
  },
  courtFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.primaryDark,
  },
  courtBadgeVip: {
    backgroundColor: '#FEF3C7',
  },
  courtBadgePremium: {
    backgroundColor: '#F3E8FF',
  },
  vipTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  vipTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  courtTypeVip: {
    color: '#D97706',
    fontWeight: '600',
  },
  bookBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.radius.md,
  },
  bookBtnDisabled: {
    backgroundColor: THEME.colors.border,
  },
  bookBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  loadingBox: {
    padding: THEME.spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: THEME.spacing.sm,
    fontSize: 13,
    color: THEME.colors.textSecondary,
  },
  emptyBox: {
    padding: THEME.spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: THEME.spacing.sm,
    fontSize: 14,
    color: THEME.colors.textSecondary,
  },
});
