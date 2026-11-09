import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BOOKING_STATUS_LABELS } from '../utils/constants';
import { THEME } from '../utils/theme';

export const StatusBadge = ({ status }) => {
  const config = BOOKING_STATUS_LABELS[status] || {
    label: status || 'Chưa xác định',
    color: THEME.colors.textSecondary,
    bg: THEME.colors.surfaceAlt,
  };

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.sm + 2,
    paddingVertical: THEME.spacing.xs,
    borderRadius: THEME.radius.full,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default StatusBadge;
