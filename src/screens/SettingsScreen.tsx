import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Text,
  Card,
  Button,
  List,
  Divider,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { SPACING } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { clearAllSecureData } from '../services/storage';

export default function SettingsScreen() {
  const { dispatch } = useApp();
  // Placeholder user data - replace with actual auth state
  const [userEmail] = useState('user@example.com');

  const handleChangePassword = () => {
    Alert.alert(
      'Change Password',
      'A password reset link will be sent to your email.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Link',
          onPress: () => {
            // TODO: Integrate with auth provider
            Alert.alert('Success', 'Password reset link sent to your email.');
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllSecureData();
              dispatch({ type: 'SET_AUTHENTICATED', payload: false });
            } catch {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Account */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="account-circle" size={24} color="#6200EE" />
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Account
            </Text>
          </View>

          <List.Item
            title="Email"
            description={userEmail}
            left={(props) => <List.Icon {...props} icon="email" />}
          />
        </Card.Content>
      </Card>

      {/* Security */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="shield-lock" size={24} color="#4CAF50" />
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Security
            </Text>
          </View>

          <List.Item
            title="Change Password"
            description="Update your account password"
            left={(props) => <List.Icon {...props} icon="lock-reset" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleChangePassword}
          />
          <Divider />
          <List.Item
            title="Sign Out"
            description="Sign out of your account"
            left={(props) => <List.Icon {...props} icon="logout" color="#F44336" />}
            onPress={handleSignOut}
          />
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  card: {
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  sectionTitle: {
    marginLeft: SPACING.sm,
  },
});
