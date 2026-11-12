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
} from 'react-native';
import { THEME } from '../../utils/theme';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { sendOtpEmail } from '../../services/emailService';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen({ navigation }) {
  const { register, verifyOtp } = useAuth();
  const [currentStep, setCurrentStep] = useState(0); // 0: Form đăng ký, 1: Xác thực OTP
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Đếm ngược gửi lại mã OTP (60s)
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const submitRegisterAndSendOtp = async () => {
    const cleanEmail = email.trim();
    const res = await register({
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      email: cleanEmail,
      password,
      role: 'Customer',
    });

    const responseData = res?.data || res;
    if (!responseData?.otp) {
      throw new Error('Không nhận được mã OTP từ máy chủ.');
    }

    // Gửi email thật qua EmailJS REST API giống luồng Web
    await sendOtpEmail({
      recipientEmail: cleanEmail,
      recipientName: responseData.fullName || fullName.trim(),
      otp: responseData.otp,
      otpExpiry: responseData.otpExpiry,
    });
  };

  const handleRegister = async () => {
    if (!fullName.trim() || !phoneNumber.trim() || !email.trim() || !password.trim()) {
      setErrorMessage('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Mật khẩu tối thiểu phải từ 6 ký tự.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      await submitRegisterAndSendOtp();

      setCountdown(60);
      // Chuyển sang Bước 2: Nhập mã OTP kích hoạt tài khoản
      setCurrentStep(1);
      Alert.alert(
        'Đã gửi mã OTP',
        `Mã OTP kích hoạt gồm 6 chữ số đã được gửi tới ${email.trim()}. Vui lòng kiểm tra hộp thư (kể cả mục Spam).`
      );
    } catch (err) {
      const msg =
        err.customMessage ||
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Đăng ký tài khoản không thành công. Vui lòng thử lại.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || loading) return;

    try {
      setLoading(true);
      setErrorMessage('');
      await submitRegisterAndSendOtp();
      setCountdown(60);
      Alert.alert(
        'Đã gửi lại mã OTP',
        `Mã OTP mới đã được gửi tới ${email.trim()}. Vui lòng kiểm tra email.`
      );
    } catch (err) {
      const msg =
        err.customMessage ||
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Không thể gửi lại mã OTP. Vui lòng thử lại.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setErrorMessage('Vui lòng nhập mã OTP gồm 6 chữ số.');
      return;
    }

    if (otp.trim().length !== 6) {
      setErrorMessage('Mã OTP phải gồm đúng 6 chữ số.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      await verifyOtp({
        email: email.trim(),
        otp: otp.trim(),
      });

      Alert.alert(
        'Kích hoạt thành công',
        'Tài khoản của bạn đã được kích hoạt thành công! Hãy đăng nhập để trải nghiệm đặt sân.',
        [{ text: 'Đăng nhập ngay', onPress: () => navigation.navigate('Login') }]
      );
    } catch (err) {
      const msg =
        err.customMessage ||
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Mã OTP không chính xác hoặc đã hết hạn!';
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
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            {currentStep === 0 ? 'Tạo tài khoản mới' : 'Xác thực kích hoạt'}
          </Text>
          <Text style={styles.subtitle}>
            {currentStep === 0
              ? 'Trở thành thành viên để nhận ưu đãi và đặt sân dễ dàng'
              : `Nhập mã xác thực 6 số gửi đến: ${email}`}
          </Text>
        </View>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={THEME.colors.danger} />
            <Text style={styles.errorBoxText}>{errorMessage}</Text>
          </View>
        ) : null}

        {currentStep === 0 ? (
          <View style={styles.formCard}>
            <Input
              label="Họ và tên *"
              placeholder="Nguyễn Văn A"
              value={fullName}
              onChangeText={(txt) => {
                setFullName(txt);
                if (errorMessage) setErrorMessage('');
              }}
              leftIcon={
                <Ionicons name="person-outline" size={20} color={THEME.colors.textMuted} />
              }
            />

            <Input
              label="Số điện thoại *"
              placeholder="0912345678"
              value={phoneNumber}
              onChangeText={(txt) => {
                setPhoneNumber(txt);
                if (errorMessage) setErrorMessage('');
              }}
              keyboardType="phone-pad"
              leftIcon={
                <Ionicons name="call-outline" size={20} color={THEME.colors.textMuted} />
              }
            />

            <Input
              label="Email *"
              placeholder="example@gmail.com"
              value={email}
              onChangeText={(txt) => {
                setEmail(txt);
                if (errorMessage) setErrorMessage('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={
                <Ionicons name="mail-outline" size={20} color={THEME.colors.textMuted} />
              }
            />

            <Input
              label="Mật khẩu *"
              placeholder="Tối thiểu 6 ký tự"
              value={password}
              onChangeText={(txt) => {
                setPassword(txt);
                if (errorMessage) setErrorMessage('');
              }}
              secureTextEntry={!showPassword}
              leftIcon={
                <Ionicons name="lock-closed-outline" size={20} color={THEME.colors.textMuted} />
              }
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
              label="Xác nhận mật khẩu *"
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChangeText={(txt) => {
                setConfirmPassword(txt);
                if (errorMessage) setErrorMessage('');
              }}
              secureTextEntry={!showPassword}
              leftIcon={
                <Ionicons name="shield-checkmark-outline" size={20} color={THEME.colors.textMuted} />
              }
            />

            <Button
              title="Đăng ký tài khoản"
              onPress={handleRegister}
              loading={loading}
              style={styles.submitBtn}
            />
          </View>
        ) : (
          <View style={styles.formCard}>
            <Input
              label="Mã xác thực OTP (6 chữ số) *"
              placeholder="••••••"
              value={otp}
              onChangeText={(txt) => {
                setOtp(txt);
                if (errorMessage) setErrorMessage('');
              }}
              keyboardType="number-pad"
              maxLength={6}
              leftIcon={
                <Ionicons name="shield-checkmark-outline" size={20} color={THEME.colors.textMuted} />
              }
            />

            <Button
              title="Xác thực & Kích hoạt tài khoản"
              onPress={handleVerifyOtp}
              loading={loading}
              style={styles.submitBtn}
            />

            <View style={styles.resendRow}>
              {countdown > 0 ? (
                <Text style={styles.resendWaitText}>
                  Gửi lại mã sau <Text style={{ fontWeight: '700' }}>{countdown}s</Text>
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResendOtp} disabled={loading}>
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
              <Text style={styles.backStepText}>Sửa lại thông tin đăng ký</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Đã có tài khoản? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>Đăng nhập</Text>
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
    paddingTop: THEME.spacing.sm,
    flexGrow: 1,
  },
  header: {
    marginBottom: THEME.spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginTop: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.dangerLight,
    padding: THEME.spacing.md,
    borderRadius: THEME.radius.md,
    marginBottom: THEME.spacing.md,
  },
  errorBoxText: {
    color: THEME.colors.danger,
    fontSize: 13,
    marginLeft: THEME.spacing.sm,
    flex: 1,
  },
  formCard: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.xl,
    borderRadius: THEME.radius.xl,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  submitBtn: {
    marginTop: THEME.spacing.sm,
  },
  otpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: THEME.spacing.md,
    borderRadius: THEME.radius.lg,
    marginBottom: THEME.spacing.lg,
  },
  otpBannerTextWrap: {
    marginLeft: THEME.spacing.md,
    flex: 1,
  },
  otpBannerTitle: {
    fontSize: 13,
    color: '#065F46',
    fontWeight: '700',
  },
  otpBannerHint: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
    lineHeight: 17,
  },
  otpBannerCode: {
    fontSize: 20,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 2,
    marginTop: 2,
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
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  backStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: THEME.spacing.md,
    paddingVertical: THEME.spacing.xs,
  },
  backStepText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginLeft: 6,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: THEME.spacing.xl,
    marginBottom: THEME.spacing.lg,
  },
  footerText: {
    color: THEME.colors.textSecondary,
    fontSize: 14,
  },
  loginLink: {
    color: THEME.colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
});
