import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../../utils/theme';
import { formatCurrency } from '../../utils/formatters';
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

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

  useEffect(() => {
    fetchCourts();
    fetchUnreadCount();
  }, [fetchCourts, fetchUnreadCount]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCourts();
    fetchUnreadCount();
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
            const defaultPrice = isVip ? 130000 : isPremium ? 160000 : 80000;
            const price = court.pricePerHour || court.basePrice || defaultPrice;
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
                    <Text style={styles.priceValue}>{formatCurrency(price)}/h</Text>
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
