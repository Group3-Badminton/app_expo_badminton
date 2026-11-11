import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { THEME } from '../../utils/theme';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import bookingService from '../../services/bookingService';
import StatusBadge from '../../components/StatusBadge';
import HeaderBar from '../../components/HeaderBar';
import Button from '../../components/Button';
import { Ionicons } from '@expo/vector-icons';

const TABS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
  { key: 'CONFIRMED', label: 'Đã xác nhận' },
  { key: 'CHECKED_IN', label: 'Đang chơi' },
  { key: 'COMPLETED', label: 'Hoàn thành' },
  { key: 'CANCELLED', label: 'Đã hủy' },
];

export default function MyBookingsScreen({ navigation }) {
  const { user, isAuthenticated } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('ALL');

  const fetchBookings = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setLoading(true);
      const res = await bookingService.getMyBookings();
      let list = [];
      if (Array.isArray(res)) {
        list = res;
      } else if (Array.isArray(res?.data)) {
        list = res.data;
      } else if (Array.isArray(res?.data?.bookings)) {
        list = res.data.bookings;
      } else if (Array.isArray(res?.bookings)) {
        list = res.bookings;
      }
      setBookings(list);
    } catch (e) {
      console.warn('Lỗi khi tải lịch sử booking:', e);
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const safeBookings = Array.isArray(bookings) ? bookings : [];

  const filteredBookings = safeBookings.filter((b) => {
    if (!b) return false;
    if (selectedTab === 'ALL') return true;
    if (selectedTab === 'PENDING_APPROVAL') {
      return b.status === 'PENDING_APPROVAL' || b.status === 'PENDING' || b.status === 'Pending';
    }
    if (selectedTab === 'CONFIRMED') {
      return b.status === 'CONFIRMED' || b.status === 'Confirmed';
    }
    if (selectedTab === 'CHECKED_IN') {
      return b.status === 'CHECKED_IN' || b.status === 'Checked-in';
    }
    if (selectedTab === 'COMPLETED') {
      return b.status === 'COMPLETED' || b.status === 'Completed';
    }
    if (selectedTab === 'CANCELLED') {
      return b.status === 'CANCELLED' || b.status === 'Cancelled' || b.status === 'REJECTED' || b.status === 'Rejected';
    }
    return b.status === selectedTab;
  });

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <HeaderBar
          title="Lịch đặt sân"
          subtitle="Quản lý và tra cứu vé đặt sân"
          showBack={true}
          onBack={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Home');
            }
          }}
        />
        <View style={styles.emptyContainer}>
          <Ionicons name="lock-closed-outline" size={56} color={THEME.colors.textMuted} />
          <Text style={styles.emptyTitle}>Chưa đăng nhập</Text>
          <Text style={styles.emptySubtitle}>
            Vui lòng đăng nhập để xem danh sách vé và lịch đặt sân của bạn.
          </Text>
          <Button
            title="Đăng nhập ngay"
            onPress={() => navigation.navigate('Login')}
            style={styles.loginBtn}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <HeaderBar
        title="Lịch đặt sân"
        subtitle="Quản lý vé và mã check-in tại sân"
        showBack={true}
        onBack={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('Home');
          }
        }}
        rightIcon="refresh"
        onRightPress={fetchBookings}
      />

      {/* Tabs Filter (Hỗ trợ cuộn ngang mượt mà, không bị tràn màn hình) */}
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScrollContent}
        >
          {TABS.map((tab) => {
            const isSelected = selectedTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                activeOpacity={0.8}
                style={[styles.tabButton, isSelected && styles.tabButtonActive]}
                onPress={() => setSelectedTab(tab.key)}
              >
                <Text style={[styles.tabText, isSelected && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Đang tải lịch đặt sân...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item._id || item.bookingCode || String(Math.random())}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[THEME.colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Ionicons name="calendar-outline" size={48} color={THEME.colors.textMuted} />
              <Text style={styles.emptyListTitle}>Chưa có đơn đặt nào</Text>
              <Text style={styles.emptyListSubtitle}>
                Bạn chưa có đơn đặt sân nào trong mục này.
              </Text>
              <Button
                title="Đặt sân ngay"
                onPress={() => navigation.navigate('Booking')}
                style={styles.emptyCtaBtn}
              />
            </View>
          }
          renderItem={({ item }) => {
            const firstItem = Array.isArray(item.items) && item.items.length > 0 ? item.items[0] : null;
            const courtObj = firstItem?.courtId || item.courtId || item.court;
            const rawCourtName = courtObj?.courtName || courtObj?.name || item.courtName || 'Sân cầu lông';
            const courtName = Array.isArray(item.items) && item.items.length > 1
              ? `${rawCourtName} (+${item.items.length - 1} sân)`
              : rawCourtName;

            const bDate = firstItem?.bookingDate || item.bookingDate || item.date;
            const bookingDate = formatDate(bDate);
            const sTime = firstItem?.startTime || item.startTime || '08:00';
            const eTime = firstItem?.endTime || item.endTime || '10:00';
            const timeSlot = `${sTime} - ${eTime}`;
            const totalAmount = item.finalTotalAmount || item.totalAmount || 0;

            return (
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.card}
                onPress={() => navigation.navigate('BookingDetail', { booking: item })}
              >
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.courtName}>{courtName}</Text>
                    <Text style={styles.bookingCode}>
                      Mã: {item.bookingCode || item._id?.slice(-6)?.toUpperCase()}
                    </Text>
                  </View>
                  <StatusBadge status={item.status} />
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardDetails}>
                  <View style={styles.detailItem}>
                    <Ionicons name="calendar-clear-outline" size={16} color={THEME.colors.textSecondary} />
                    <Text style={styles.detailText}>{bookingDate}</Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Ionicons name="time-outline" size={16} color={THEME.colors.textSecondary} />
                    <Text style={styles.detailText}>{timeSlot}</Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.totalPriceLabel}>Tổng thanh toán</Text>
                      {item.discount > 0 ? (
                        <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, borderWidth: 1, borderColor: '#A7F3D0' }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#059669' }}>
                            Đã giảm {formatCurrency(item.discount)}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.totalPriceValue}>{formatCurrency(totalAmount)}</Text>
                  </View>
                  <View style={styles.arrowIcon}>
                    <Text style={styles.viewDetailText}>Xem vé</Text>
                    <Ionicons name="chevron-forward" size={16} color={THEME.colors.primary} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  tabsContainer: {
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderLight,
  },
  tabsScrollContent: {
    flexDirection: 'row',
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.sm,
  },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: THEME.radius.full,
    marginRight: 8,
    backgroundColor: THEME.colors.surfaceAlt,
  },
  tabButtonActive: {
    backgroundColor: THEME.colors.primaryLight,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  tabTextActive: {
    color: THEME.colors.primaryDark,
  },
  listContent: {
    padding: THEME.spacing.lg,
    paddingBottom: 110,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.xl,
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  courtName: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  bookingCode: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: THEME.colors.borderLight,
    marginVertical: THEME.spacing.md,
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginLeft: 6,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  totalPriceLabel: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  totalPriceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.primaryDark,
  },
  arrowIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.primary,
    marginRight: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.xxl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginTop: THEME.spacing.md,
  },
  emptySubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: THEME.spacing.xl,
  },
  loginBtn: {
    width: 160,
  },
  emptyList: {
    padding: THEME.spacing.xxl,
    alignItems: 'center',
  },
  emptyListTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginTop: THEME.spacing.md,
  },
  emptyListSubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: THEME.spacing.lg,
  },
  emptyCtaBtn: {
    width: 150,
  },
  loadingContainer: {
    padding: THEME.spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: THEME.spacing.sm,
    fontSize: 13,
    color: THEME.colors.textSecondary,
  },
});
