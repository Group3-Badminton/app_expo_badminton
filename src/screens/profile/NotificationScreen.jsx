import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { THEME } from '../../utils/theme';
import { formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import notificationService from '../../services/notificationService';
import Button from '../../components/Button';
import { Ionicons } from '@expo/vector-icons';

export default function NotificationScreen({ navigation }) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setLoading(true);
      const res = await notificationService.getMyNotifications({ limit: 50 });
      const list = Array.isArray(res)
        ? res
        : Array.isArray(res?.data?.items)
        ? res.data.items
        : Array.isArray(res?.items)
        ? res.items
        : Array.isArray(res?.data?.notifications)
        ? res.data.notifications
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.notifications)
        ? res.notifications
        : [];
      setNotifications(list);
    } catch (e) {
      console.warn('Lỗi tải thông báo từ MongoDB:', e);
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleMarkAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (e) {
      console.warn('Lỗi đánh dấu đã đọc:', e);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAll(true);
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      Alert.alert('Thành công', 'Đã đánh dấu tất cả thông báo là đã đọc.');
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể đánh dấu tất cả thông báo vào lúc này.');
    } finally {
      setMarkingAll(false);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'BOOKING_CONFIRMED':
        return { name: 'checkmark-circle', color: '#10B981', bg: '#ECFDF5' };
      case 'BOOKING_CANCELLED':
      case 'BOOKING_REJECTED':
        return { name: 'close-circle', color: '#EF4444', bg: '#FEF2F2' };
      case 'NEW_BOOKING':
      case 'BOOKING_PENDING':
        return { name: 'calendar', color: '#F59E0B', bg: '#FEF3C7' };
      case 'VOUCHER':
      case 'PROMOTION':
        return { name: 'pricetag', color: '#8B5CF6', bg: '#F5F3FF' };
      default:
        return { name: 'notifications', color: THEME.colors.primary, bg: THEME.colors.primaryLight };
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="lock-closed-outline" size={56} color={THEME.colors.textMuted} />
          <Text style={styles.emptyTitle}>Chưa đăng nhập</Text>
          <Text style={styles.emptySubtitle}>
            Vui lòng đăng nhập để xem thông báo cập nhật lịch đặt sân của bạn.
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

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <View style={styles.container}>
      {/* Top Header Bar Action */}
      {unreadCount > 0 ? (
        <View style={styles.topActionBar}>
          <Text style={styles.unreadCountText}>
            Bạn có <Text style={{ fontWeight: '800' }}>{unreadCount}</Text> thông báo chưa đọc
          </Text>
          <TouchableOpacity
            onPress={handleMarkAllAsRead}
            disabled={markingAll}
            style={styles.markAllBtn}
          >
            {markingAll ? (
              <ActivityIndicator size="small" color={THEME.colors.primary} />
            ) : (
              <Text style={styles.markAllText}>Đã đọc tất cả</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Đang tải thông báo từ hệ thống...</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id || String(Math.random())}
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
              <Ionicons name="notifications-off-outline" size={52} color={THEME.colors.textMuted} />
              <Text style={styles.emptyListTitle}>Chưa có thông báo nào</Text>
              <Text style={styles.emptyListSubtitle}>
                Các cập nhật duyệt sân, hủy đơn hoặc ưu đãi sẽ xuất hiện tại đây.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const iconConfig = getNotificationIcon(item.type);
            const dateStr = formatDate(item.createdAt);

            return (
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.itemCard, !item.isRead && styles.itemCardUnread]}
                onPress={() => handleMarkAsRead(item._id)}
              >
                <View style={[styles.iconBox, { backgroundColor: iconConfig.bg }]}>
                  <Ionicons name={iconConfig.name} size={22} color={iconConfig.color} />
                </View>

                <View style={styles.itemContent}>
                  <View style={styles.itemHeaderRow}>
                    <Text style={[styles.itemTitle, !item.isRead && styles.itemTitleUnread]}>
                      {item.title || 'Thông báo hệ thống'}
                    </Text>
                    {!item.isRead ? <View style={styles.unreadDot} /> : null}
                  </View>

                  <Text style={styles.itemMessage} numberOfLines={3}>
                    {item.message}
                  </Text>

                  <Text style={styles.itemTime}>{dateStr}</Text>
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
  topActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.sm + 2,
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  unreadCountText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
  },
  markAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: THEME.colors.textSecondary,
  },
  listContent: {
    padding: THEME.spacing.md,
    flexGrow: 1,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  itemCardUnread: {
    backgroundColor: '#F8FAFC',
    borderColor: '#93C5FD',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: THEME.spacing.md,
  },
  itemContent: {
    flex: 1,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
    flex: 1,
  },
  itemTitleUnread: {
    fontWeight: '800',
    color: '#0F172A',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.primary,
    marginLeft: 6,
  },
  itemMessage: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  itemTime: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 18,
  },
  loginBtn: {
    minWidth: 160,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyListTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginTop: 12,
  },
  emptyListSubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
});
