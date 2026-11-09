import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { THEME } from '../utils/theme';

export const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  error,
  leftIcon,
  rightIcon,
  multiline = false,
  numberOfLines = 1,
  style,
}) => {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputWrapper, error && styles.inputWrapperError, multiline && styles.inputWrapperMultiline]}>
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={THEME.colors.textMuted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          style={[styles.input, style]}
        />
        {rightIcon ? <View style={styles.rightIcon}>{rightIcon}</View> : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: THEME.spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME.colors.textPrimary,
    marginBottom: THEME.spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.lg,
    paddingHorizontal: THEME.spacing.md,
    minHeight: 50,
  },
  inputWrapperMultiline: {
    minHeight: 80,
    alignItems: 'flex-start',
    paddingVertical: THEME.spacing.sm,
  },
  inputWrapperError: {
    borderColor: THEME.colors.danger,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: THEME.colors.textPrimary,
    paddingVertical: 0,
  },
  leftIcon: {
    marginRight: THEME.spacing.sm,
  },
  rightIcon: {
    marginLeft: THEME.spacing.sm,
  },
  errorText: {
    fontSize: 12,
    color: THEME.colors.danger,
    marginTop: 4,
    marginLeft: 2,
  },
});

export default Input;
