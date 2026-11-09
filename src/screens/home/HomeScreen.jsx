import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { THEME } from '../../utils/theme';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import bookingService from '../../services/bookingService';
import notificationService from '../../services/notificationService';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen({ navigation }) {
  const { user, isAuthenticated } = useAuth();
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
      <View style={styles.header}>
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

        {/* Feature Highlights Grid */}
        <View style={styles.featuresRow}>
          <View style={styles.featureItem}>
            <View style={[styles.featureIconBox, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="time-outline" size={20} color={THEME.colors.primary} />
            </View>
            <Text style={styles.featureTitle}>Giữ chỗ tức thì</Text>
            <Text style={styles.featureDesc}>Xác nhận trong 1 phút</Text>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="pricetag-outline" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.featureTitle}>Ưu đãi Voucher</Text>
            <Text style={styles.featureDesc}>Giảm giá giờ thấp điểm</Text>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIconBox, { backgroundColor: '#F5F3FF' }]}>
              <Ionicons name="qr-code-outline" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.featureTitle}>Check-in QR</Text>
            <Text style={styles.featureDesc}>Tiện lợi tại quầy sân</Text>
          </View>
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
            const courtName = court.name || `Sân ${court.courtNumber || index + 1}`;
            const courtType = court.type || 'Sân tiêu chuẩn';
            const price = court.pricePerHour || court.basePrice || 80000;
            const isAvailable = court.status !== 'Maintenance' && court.status !== 'Inactive';

            return (
              <View key={court._id || index} style={styles.courtCard}>
                <View style={styles.courtHeader}>
                  <View style={styles.courtBadgeCircle}>
                    <Ionicons name="tennisball" size={20} color={THEME.colors.primary} />
                  </View>
                  <View style={styles.courtInfo}>
                    <Text style={styles.courtName}>{courtName}</Text>
                    <Text style={styles.courtType}>{courtType}</Text>
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
                      {isAvailable ? 'Sẵn sàng' : 'Bảo trì'}
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
    paddingBottom: THEME.spacing.xxl,
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
