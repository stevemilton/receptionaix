import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { colors, typography, radius, shadow } from '../../theme';
import { ScreenBackground } from '../../components/ScreenBackground';

export function ChangePasswordScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function handleChangePassword() {
    // Validate inputs
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert(
        'Success',
        'Your password has been changed successfully',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  }

  const isValid = newPassword.length >= 8 && newPassword === confirmPassword;

  return (
    <ScreenBackground>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <Text style={styles.description}>
            Enter your new password below. Make sure it's at least 8 characters long.
          </Text>

          {/* New Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                <Ionicons
                  name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={colors.secondaryLabel}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm New Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={colors.secondaryLabel}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Password Requirements */}
          <View style={styles.requirements}>
            <Text style={styles.requirementsTitle}>Password Requirements:</Text>
            <View style={styles.requirementRow}>
              <Ionicons
                name={newPassword.length >= 8 ? 'checkmark-circle' : 'ellipse-outline'}
                size={18}
                color={newPassword.length >= 8 ? '#10B981' : '#9CA3AF'}
              />
              <Text
                style={[
                  styles.requirementText,
                  newPassword.length >= 8 && styles.requirementMet,
                ]}
              >
                At least 8 characters
              </Text>
            </View>
            <View style={styles.requirementRow}>
              <Ionicons
                name={
                  newPassword && newPassword === confirmPassword
                    ? 'checkmark-circle'
                    : 'ellipse-outline'
                }
                size={18}
                color={
                  newPassword && newPassword === confirmPassword ? '#10B981' : '#9CA3AF'
                }
              />
              <Text
                style={[
                  styles.requirementText,
                  newPassword && newPassword === confirmPassword && styles.requirementMet,
                ]}
              >
                Passwords match
              </Text>
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            (!isValid || loading) && styles.saveButtonDisabled,
          ]}
          onPress={handleChangePassword}
          disabled={!isValid || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>Change Password</Text>
          )}
        </TouchableOpacity>

        {/* Forgot Password Link */}
        <TouchableOpacity
          style={styles.forgotButton}
          onPress={async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) {
              Alert.alert(
                'Reset Password',
                `Send a password reset email to ${user.email}?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Send',
                    onPress: async () => {
                      const { error } = await supabase.auth.resetPasswordForEmail(
                        user.email!
                      );
                      if (error) {
                        Alert.alert('Error', error.message);
                      } else {
                        Alert.alert(
                          'Email Sent',
                          'Check your email for a password reset link'
                        );
                      }
                    },
                  },
                ]
              );
            }
          }}
        >
          <Text style={styles.forgotButtonText}>
            Forgot your current password? Reset via email
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    backgroundColor: colors.surface,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  description: {
    fontSize: 14,
    color: colors.secondaryLabel,
    marginBottom: 20,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.secondaryLabel,
    marginBottom: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.grouped,
    borderWidth: 1,
    borderColor: colors.separator,
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.label,
  },
  eyeButton: {
    padding: 12,
  },
  requirements: {
    backgroundColor: colors.grouped,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.secondaryLabel,
    marginBottom: 8,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  requirementText: {
    fontSize: 13,
    color: colors.secondaryLabel,
    marginLeft: 8,
  },
  requirementMet: {
    color: colors.success,
  },
  saveButton: {
    backgroundColor: colors.primary,
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '500',
  },
  forgotButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 24,
  },
  forgotButtonText: {
    fontSize: 14,
    color: colors.primary,
  },
});
