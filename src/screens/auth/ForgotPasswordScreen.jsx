import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { THEME } from '../../utils/theme';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { sendOtpEmail } from '../../services/emailService';

export default function ForgotPasswordScreen({ navigation }) {
  const { sendOtp, verifyOtp, resetPassword } = useAuth();

  // 0: Nhập Email, 1: Nhập OTP, 2: Thiết lập mật khẩu mới
  const [currentStep, setCurrentStep] = useState(0);

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [serverOtp, setServerOtp] = useState(''); // Lưu OTP test từ API nếu có

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Đếm ngược gửi lại mã OTP (60s)
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // BƯỚC 1: Xử lý Gửi mã OTP về Email
  const handleSendOtp = async () => {
    if (!email.trim()) {
      setErrorMessage('Vui lòng nhập địa chỉ email tài khoản của bạn.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Định dạng email không hợp lệ.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');

      const res = await sendOtp(email.trim());
      const responseData = res?.data || res;

      if (responseData?.otp) {
        setServerOtp(String(responseData.otp));
        // Gọi gửi email qua EmailJS dùng chung
        try {
          await sendOtpEmail({
            recipientEmail: email.trim(),
            recipientName: responseData.fullName,
            otp: responseData.otp,
            otpExpiry: responseData.otpExpiry,
          });
        } catch (e) {
          console.warn('Gửi qua EmailJS không thành công (có thể offline/rate limit):', e);
        }
      }

      setCountdown(60);
      setCurrentStep(1);
    } catch (err) {
      const msg =
        err.customMessage ||
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Không thể gửi mã OTP. Vui lòng kiểm tra lại email!';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // BƯỚC 2: Xử lý Xác nhận mã OTP
  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setErrorMessage('Vui lòng nhập mã OTP gồm 6 chữ số.');
      return;
    }

    if (otp.trim().length !== 6) {
      setErrorMessage('Mã OTP phải có đúng 6 chữ số.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');

      await verifyOtp({
        email: email.trim(),
        otp: otp.trim(),
      });

      setCurrentStep(2);
    } catch (err) {
      const msg =
        err.customMessage ||
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Mã OTP không hợp lệ hoặc đã hết hạn!';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // BƯỚC 3: Xử lý Đặt lại mật khẩu mới
  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      setErrorMessage('Vui lòng nhập mật khẩu mới.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');

      await resetPassword({
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
        confirmPassword,
      });

      Alert.alert(
        'Thành công',
        'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.',
        [
          {
            text: 'Đăng nhập ngay',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (err) {
      const msg =
        err.customMessage ||
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Không thể đặt lại mật khẩu. Vui lòng thử lại!';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Step Indicator Header */}
        <View style={styles.indicatorContainer}>
          {[
            { step: 0, title: 'Email' },
            { step: 1, title: 'Xác thực OTP' },
            { step: 2, title: 'Mật khẩu mới' },
          ].map((item, index) => {
            const isActive = currentStep === item.step;
            const isCompleted = currentStep > item.step;
            return (
              <React.Fragment key={item.step}>
                <View style={styles.indicatorItem}>
                  <View
                    style={[
                      styles.indicatorCircle,
                      isActive && styles.indicatorCircleActive,
                      isCompleted && styles.indicatorCircleCompleted,
                    ]}
                  >
                    {isCompleted ? (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    ) : (
                      <Text
                        style={[
                          styles.indicatorNumber,
                          (isActive || isCompleted) && styles.indicatorNumberActive,
                        ]}
                      >
                        {item.step + 1}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.indicatorLabel,
                      (isActive || isCompleted) && styles.indicatorLabelActive,
                    ]}
                  >
                    {item.title}
                  </Text>
                </View>
                {index < 2 && (
                  <View
                    style={[
                      styles.indicatorLine,
                      currentStep > index && styles.indicatorLineCompleted,
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* Title Header */}
        <View style={styles.headerBlock}>
          <View style={styles.iconCircle}>
            <Ionicons
              name={
                currentStep === 0
                  ? 'mail-unread-outline'
                  : currentStep === 1
                  ? 'shield-checkmark-outline'
                  : 'key-outline'
              }
              size={36}
              color={THEME.colors.primary}
            />
          </View>
          <Text style={styles.title}>
            {currentStep === 0 && 'Quên Mật Khẩu'}
            {currentStep === 1 && 'Xác Thực Mã OTP'}
            {currentStep === 2 && 'Đặt Lại Mật Khẩu'}
          </Text>
          <Text style={styles.subtitle}>
            {currentStep === 0 && 'Nhập email đã đăng ký để nhận mã OTP khôi phục mật khẩu.'}
            {currentStep === 1 && `Mã xác nhận 6 số đã được gửi tới: ${email}`}
            {currentStep === 2 && 'Thiết lập mật khẩu mới (tối thiểu 6 ký tự) cho tài khoản của bạn.'}
          </Text>
        </View>

        {/* Error Alert Box */}
        {errorMessage ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={THEME.colors.danger} />
            <Text style={styles.errorBoxText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* BƯỚC 0: NHẬP EMAIL */}
        {currentStep === 0 && (
          <View style={styles.formCard}>
            <Input
              label="Địa chỉ Email"
              placeholder="example@gmail.com"
              value={email}
              onChangeText={(txt) => {
                setEmail(txt);
                if (errorMessage) setErrorMessage('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Ionicons name="mail-outline" size={20} color={THEME.colors.textMuted} />}
            />

            <Button
              title="Gửi mã xác nhận OTP"
              onPress={handleSendOtp}
              loading={loading}
              style={styles.submitBtn}
            />
          </View>
        )}

        {/* BƯỚC 1: NHẬP MÃ OTP */}
        {currentStep === 1 && (
          <View style={styles.formCard}>
            {/* Gợi ý OTP khi dev/test */}
            {serverOtp ? (
              <View style={styles.testOtpHint}>
                <Ionicons name="information-circle-outline" size={16} color="#D97706" />
                <Text style={styles.testOtpText}>
                  Mã OTP của bạn: <Text style={{ fontWeight: '800' }}>{serverOtp}</Text>
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setOtp(serverOtp);
                    if (errorMessage) setErrorMessage('');
                  }}
                  style={styles.fillOtpBtn}
                >
                  <Text style={styles.fillOtpBtnText}>Điền nhanh</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <Input
              label="Mã OTP (6 chữ số)"
              placeholder="123456"
              value={otp}
              onChangeText={(txt) => {
                setOtp(txt);
                if (errorMessage) setErrorMessage('');
              }}
              keyboardType="number-pad"
              maxLength={6}
              leftIcon={<Ionicons name="keypad-outline" size={20} color={THEME.colors.textMuted} />}
            />

            <Button
              title="Xác thực mã OTP"
              onPress={handleVerifyOtp}
              loading={loading}
              style={styles.submitBtn}
            />

            {/* Nút gửi lại mã OTP */}
            <View style={styles.resendRow}>
              {countdown > 0 ? (
                <Text style={styles.resendWaitText}>
                  Gửi lại mã sau <Text style={{ fontWeight: '700' }}>{countdown}s</Text>
                </Text>
              ) : (
                <TouchableOpacity onPress={handleSendOtp} disabled={loading}>
                  <Text style={styles.resendLink}>Chưa nhận được mã? Gửi lại OTP</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              onPress={() => {
                setCurrentStep(0);
                setErrorMessage('');
              }}
              style={styles.backStepBtn}
            >
              <Ionicons name="arrow-back-outline" size={16} color={THEME.colors.textSecondary} />
              <Text style={styles.backStepText}>Đổi địa chỉ email khác</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* BƯỚC 2: MẬT KHẨU MỚI */}
        {currentStep === 2 && (
          <View style={styles.formCard}>
            <Input
              label="Mật khẩu mới"
              placeholder="••••••••"
              value={newPassword}
              onChangeText={(txt) => {
                setNewPassword(txt);
                if (errorMessage) setErrorMessage('');
              }}
              secureTextEntry={!showPassword}
              leftIcon={<Ionicons name="lock-closed-outline" size={20} color={THEME.colors.textMuted} />}
              rightIcon={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={THEME.colors.textMuted}
                  />
                </TouchableOpacity>
              }
            />

            <Input
              label="Xác nhận mật khẩu mới"
              placeholder="••••••••"
              value={confirmPassword}
              onChangeText={(txt) => {
                setConfirmPassword(txt);
                if (errorMessage) setErrorMessage('');
              }}
              secureTextEntry={!showConfirmPassword}
              leftIcon={<Ionicons name="shield-checkmark-outline" size={20} color={THEME.colors.textMuted} />}
              rightIcon={
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={THEME.colors.textMuted}
                  />
                </TouchableOpacity>
              }
            />

            <Button
              title="Đặt lại mật khẩu"
              onPress={handleResetPassword}
              loading={loading}
              style={styles.submitBtn}
            />
          </View>
        )}

        {/* Footer: Quay lại Đăng nhập */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Nhớ lại mật khẩu? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>Đăng nhập ngay</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollContent: {
    padding: THEME.spacing.lg,
    paddingBottom: 60,
    flexGrow: 1,
    justifyContent: 'center',
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.spacing.xl,
    paddingHorizontal: THEME.spacing.md,
  },
  indicatorItem: {
    alignItems: 'center',
  },
  indicatorCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  indicatorCircleActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  indicatorCircleCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  indicatorNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  indicatorNumberActive: {
    color: '#FFFFFF',
  },
  indicatorLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  indicatorLabelActive: {
    color: THEME.colors.textPrimary,
  },
  indicatorLine: {
    flex: 1,
    height: 2,
    backgroundColor: THEME.colors.borderLight,
    marginHorizontal: 8,
    marginBottom: 16,
  },
  indicatorLineCompleted: {
    backgroundColor: '#10B981',
  },
  headerBlock: {
    alignItems: 'center',
    marginBottom: THEME.spacing.xl,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: THEME.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.spacing.md,
    borderWidth: 1.5,
    borderColor: THEME.colors.primaryBorder,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
    paddingHorizontal: THEME.spacing.md,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.dangerLight,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: THEME.radius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.lg,
  },
  errorBoxText: {
    color: THEME.colors.danger,
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  formCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.xl,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  testOtpHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: THEME.radius.md,
    marginBottom: THEME.spacing.md,
  },
  testOtpText: {
    fontSize: 12,
    color: '#92400E',
    marginLeft: 6,
    flex: 1,
  },
  fillOtpBtn: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  fillOtpBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  submitBtn: {
    marginTop: THEME.spacing.sm,
  },
  resendRow: {
    alignItems: 'center',
    marginTop: THEME.spacing.md,
  },
  resendWaitText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
  },
  resendLink: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  backStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: THEME.spacing.md,
    paddingVertical: 6,
  },
  backStepText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginLeft: 4,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: THEME.spacing.xl,
  },
  footerText: {
    color: THEME.colors.textSecondary,
    fontSize: 14,
  },
  loginLink: {
    color: THEME.colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
