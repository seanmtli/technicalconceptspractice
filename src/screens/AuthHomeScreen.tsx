import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AuthStackParamList } from '../types';
import { theme, SPACING } from '../constants/theme';

type AuthHomeScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'AuthHome'>;
};

interface FeatureItemProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  text: string;
}

function FeatureItem({ icon, text }: FeatureItemProps) {
  return (
    <View style={styles.featureItem}>
      <MaterialCommunityIcons
        name={icon}
        size={24}
        color={theme.colors.primary}
        style={styles.featureIcon}
      />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

export default function AuthHomeScreen({ navigation }: AuthHomeScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Branding */}
        <View style={styles.brandingSection}>
          <MaterialCommunityIcons
            name="brain"
            size={80}
            color={theme.colors.primary}
          />
          <Text variant="headlineLarge" style={styles.title}>
            Data Practice
          </Text>
          <Text variant="bodyLarge" style={styles.tagline}>
            Think through technical concepts,{'\n'}don't just memorize them
          </Text>
        </View>

        {/* Feature Highlights */}
        <View style={styles.featuresSection}>
          <FeatureItem
            icon="comment-text-outline"
            text="Explain concepts in your own words"
          />
          <FeatureItem
            icon="robot-outline"
            text="AI-powered feedback on your answers"
          />
          <FeatureItem
            icon="lightbulb-outline"
            text="Apply knowledge, don't memorize syntax"
          />
        </View>

        {/* Buttons */}
        <View style={styles.buttonSection}>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('SignUp')}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Sign Up
          </Button>
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('Login')}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Log In
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    justifyContent: 'space-between',
  },
  brandingSection: {
    alignItems: 'center',
    marginTop: SPACING.xl * 2,
  },
  title: {
    marginTop: SPACING.md,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  tagline: {
    marginTop: SPACING.sm,
    textAlign: 'center',
    color: '#666',
  },
  featuresSection: {
    paddingVertical: SPACING.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  featureIcon: {
    marginRight: SPACING.md,
  },
  featureText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  buttonSection: {
    marginBottom: SPACING.xl,
  },
  button: {
    marginBottom: SPACING.md,
  },
  buttonContent: {
    paddingVertical: SPACING.sm,
  },
});
