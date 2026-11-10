import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { THEME } from '../../utils/theme';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';
import HeaderBar from '../../components/HeaderBar';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen({ navigation }) {
  const { user, isAuthenticated, logout, updateUser } = useAuth();
  const [profile, setProfile] = useState(user);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal Sửa Hồ Sơ
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [editError, setEditError] = useState('');

  // 1. Tải thông tin hồ sơ thật từ MongoDB
  const fetchProfile = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await authService.getCurrentUser();
      const userData = res?.data || res;
      if (userData) {
        setProfile(userData);
        updateUser(userData);
      }
    } catch (e) {
      console.warn('Lỗi tải thông tin user từ MongoDB:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, updateUser]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
    }
  }, [isAuthenticated, fetchProfile]);

  // Đồng bộ thông tin khi user trong AuthContext thay đổi
  useEffect(() => {
    if (user) {
      setProfile(user);
    }
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  // Mở modal sửa thông tin
  const handleOpenEdit = () => {
    setEditFullName(profile?.fullName || user?.fullName || '');
    setEditPhone(profile?.phone || profile?.phoneNumber || user?.phone || '');
    setEditError('');
    setEditModalVisible(true);
  };

  // Lưu thông tin chỉnh sửa vào MongoDB
  const handleSaveProfile = async () => {
    if (!editFullName.trim()) {
      setEditError('Vui lòng nhập họ và tên.');
      return;
    }
    if (!editPhone.trim()) {
      setEditError('Vui lòng nhập số điện thoại.');
      return;
    }

    try {
      setSavingProfile(true);
      setEditError('');
      const res = await authService.updateProfile({
        fullName: editFullName.trim(),
        phone: editPhone.trim(),
      });
      const updated = res?.data || res;
      setProfile((prev) => ({ ...prev, ...updated }));
      updateUser(updated);
      setEditModalVisible(false);
      Alert.alert('Thành công', 'Thông tin hồ sơ đã được cập nhật thành công vào hệ thống!');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Không thể cập nhật hồ sơ vào lúc này.';
      setEditError(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const currentUser = profile || user;

  return (
    <View style={styles.container}>
      <HeaderBar title="Tài khoản cá nhân" subtitle="Quản lý hồ sơ và dữ liệu hệ thống" />

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
        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={36} color={THEME.colors.primary} />
          </View>

          {isAuthenticated ? (
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {currentUser?.fullName || currentUser?.name || 'Khách hàng BCMS'}
              </Text>
              <Text style={styles.userPhone}>
                {currentUser?.phone || currentUser?.phoneNumber || 'Chưa cập nhật số điện thoại'}
              </Text>
              <Text style={styles.userEmail}>{currentUser?.email || 'N/A'}</Text>

              <View style={styles.badgeRow}>
                <View style={styles.roleBadge}>
                  <Ionicons name="shield-checkmark" size={12} color={THEME.colors.primary} />
                  <Text style={styles.roleText}>{currentUser?.role || 'CUSTOMER'}</Text>
                </View>

                <View style={[styles.statusBadgeWrap, { backgroundColor: currentUser?.status === 'ACTIVE' ? '#ECFDF5' : '#FEF2F2' }]}>
                  <View style={[styles.statusDot, { backgroundColor: currentUser?.status === 'ACTIVE' ? '#10B981' : '#EF4444' }]} />
                  <Text style={[styles.statusText, { color: currentUser?.status === 'ACTIVE' ? '#047857' : '#DC2626' }]}>
                    {currentUser?.status === 'ACTIVE' ? 'Hoạt động' : currentUser?.status || 'Chờ duyệt'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.editProfileBtn}
                onPress={handleOpenEdit}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={16} color={THEME.colors.primary} />
                <Text style={styles.editProfileText}>Chỉnh sửa thông tin</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.userInfo}>
              <Text style={styles.userName}>Chưa đăng nhập</Text>
              <Text style={styles.userEmail}>Đăng nhập để lưu và quản lý đơn đặt sân</Text>
              
              <View style={styles.authButtonGroup}>
                <TouchableOpacity
                  style={styles.loginBtnPrimary}
                  onPress={() => navigation.navigate('Login')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="log-in-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.loginBtnText}>Đăng nhập</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.registerBtnOutline}
                  onPress={() => navigation.navigate('Register')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="person-add-outline" size={18} color={THEME.colors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.registerBtnText}>Đăng ký</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Cụm Tiện Ích Dịch Vụ */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Dịch vụ của bạn</Text>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('MyBookings')}
          >
            <View style={[styles.menuIconBox, { backgroundColor: THEME.colors.primaryLight }]}>
              <Ionicons name="receipt-outline" size={20} color={THEME.colors.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Lịch sử đặt sân</Text>
              <Text style={styles.menuSubtitle}>Xem các vé đã đặt và mã check-in từ MongoDB</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Notification')}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="notifications-outline" size={20} color="#D97706" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Thông báo của tôi</Text>
              <Text style={styles.menuSubtitle}>Cập nhật duyệt đơn, hủy đơn & khuyến mãi</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Booking')}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Đặt sân mới</Text>
              <Text style={styles.menuSubtitle}>Chọn sân và khung giờ trực tuyến</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Nút Đăng xuất */}
        {isAuthenticated ? (
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={THEME.colors.danger} />
            <Text style={styles.logoutText}>Đăng xuất tài khoản</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {/* MODAL CHỈNH SỬA THÔNG TIN CÁ NHÂN */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chỉnh sửa hồ sơ</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {editError ? (
              <View style={styles.modalErrorBox}>
                <Ionicons name="alert-circle" size={16} color={THEME.colors.danger} />
                <Text style={styles.modalErrorText}>{editError}</Text>
              </View>
            ) : null}

            <Input
              label="Họ và tên *"
              placeholder="Nhập họ và tên mới"
              value={editFullName}
              onChangeText={(txt) => {
                setEditFullName(txt);
                if (editError) setEditError('');
              }}
              leftIcon={<Ionicons name="person-outline" size={18} color={THEME.colors.textMuted} />}
            />

            <Input
              label="Số điện thoại *"
              placeholder="0912345678"
              value={editPhone}
              onChangeText={(txt) => {
                setEditPhone(txt);
                if (editError) setEditError('');
              }}
              keyboardType="phone-pad"
              leftIcon={<Ionicons name="call-outline" size={18} color={THEME.colors.textMuted} />}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Hủy bỏ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Lưu thay đổi</Text>
                )}
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
  profileCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.xl,
    padding: THEME.spacing.xl,
    alignItems: 'center',
    marginBottom: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: THEME.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.colors.primaryBorder,
    marginBottom: THEME.spacing.md,
  },
  userInfo: {
    alignItems: 'center',
    width: '100%',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  userPhone: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  userEmail: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radius.full,
    marginRight: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.primaryDark,
    marginLeft: 4,
  },
  statusBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.primary,
    marginLeft: 6,
  },
  authBtn: {
    marginTop: THEME.spacing.md,
    width: 200,
    height: 44,
  },
  authButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: THEME.spacing.lg,
    width: '100%',
    paddingHorizontal: THEME.spacing.xs,
  },
  loginBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primary,
    paddingVertical: 12,
    borderRadius: THEME.radius.lg,
    ...THEME.shadows.card,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  registerBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.surface,
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
    paddingVertical: 11,
    borderRadius: THEME.radius.lg,
  },
  registerBtnText: {
    color: THEME.colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.xl,
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: THEME.spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: THEME.spacing.sm,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: THEME.spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  menuSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: THEME.colors.borderLight,
    marginVertical: THEME.spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: THEME.spacing.xs + 2,
  },
  infoLabel: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.dangerLight,
    borderRadius: THEME.radius.lg,
    paddingVertical: 14,
    marginTop: THEME.spacing.sm,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.danger,
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: THEME.spacing.xl,
  },
  modalCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.xl,
    padding: THEME.spacing.xl,
    ...THEME.shadows.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  modalErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.dangerLight,
    padding: THEME.spacing.sm,
    borderRadius: THEME.radius.md,
    marginBottom: THEME.spacing.md,
  },
  modalErrorText: {
    color: THEME.colors.danger,
    fontSize: 12,
    marginLeft: 6,
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: THEME.spacing.lg,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: THEME.radius.lg,
    marginRight: 8,
  },
  cancelBtnText: {
    color: THEME.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: THEME.radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
