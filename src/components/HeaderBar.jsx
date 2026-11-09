import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { THEME } from '../utils/theme';
import { Ionicons } from '@expo/vector-icons';

export const HeaderBar = ({ title, subtitle, rightAction, onRightPress, rightIcon }) => {
  return (
    <View style={styles.container}>
      <View style={styles.titleWrapper}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {rightAction || (rightIcon && onRightPress) ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onRightPress}
          style={styles.actionButton}
        >
          {rightIcon ? <Ionicons name={rightIcon} size={22} color={THEME.colors.textPrimary} /> : rightAction}
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    paddingBottom: THEME.spacing.sm,
    backgroundColor: THEME.colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWrapper: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...THEME.shadows.card,
  },
});

export default HeaderBar;
