import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { THEME } from '../utils/theme';

import MainTabs from './MainTabs';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import BookingDetailScreen from '../screens/booking/BookingDetailScreen';
import NotificationScreen from '../screens/profile/NotificationScreen';

const Stack = createNativeStackNavigator();

export default function RootStack() {
  return (
    <Stack.Navigator
      initialRouteName="Main"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: THEME.colors.background },
        animation: 'slide_from_right',
      }}
    >
      {/* 4 Bottom Tabs Chính */}
      <Stack.Screen name="Main" component={MainTabs} />

      {/* Chi tiết đơn đặt sân */}
      <Stack.Screen
        name="BookingDetail"
        component={BookingDetailScreen}
        options={{
          headerShown: true,
          title: 'Chi tiết đặt sân',
          headerTintColor: THEME.colors.textPrimary,
          headerStyle: { backgroundColor: THEME.colors.surface },
          headerShadowVisible: false,
        }}
      />

      {/* Authentication Screens */}
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          headerShown: true,
          title: 'Đăng nhập',
          headerTintColor: THEME.colors.textPrimary,
          headerStyle: { backgroundColor: THEME.colors.surface },
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          headerShown: true,
          title: 'Đăng ký tài khoản',
          headerTintColor: THEME.colors.textPrimary,
          headerStyle: { backgroundColor: THEME.colors.surface },
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{
          headerShown: true,
          title: 'Quên mật khẩu',
          headerTintColor: THEME.colors.textPrimary,
          headerStyle: { backgroundColor: THEME.colors.surface },
          headerShadowVisible: false,
        }}
      />
      {/* Thông báo khách hàng */}
      <Stack.Screen
        name="Notification"
        component={NotificationScreen}
        options={{
          headerShown: true,
          title: 'Thông báo',
          headerTintColor: THEME.colors.textPrimary,
          headerStyle: { backgroundColor: THEME.colors.surface },
          headerShadowVisible: false,
        }}
      />
    </Stack.Navigator>
  );
}
