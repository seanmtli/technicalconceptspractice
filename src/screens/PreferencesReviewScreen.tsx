import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Text,
  Card,
  Button,
  Chip,
  SegmentedButtons,
  Surface,
  ActivityIndicator,
} from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

import { useApp } from '../context/AppContext';
import {
  saveUserPreferences,
  clearOnboardingConversation,
} from '../services/database';
import { CATEGORIES, getDifficultyColor } from '../constants/categories';
import { SPACING } from '../constants/theme';
import {
  OnboardingStackParamList,
  Category,
  Difficulty,
  UserPreferences,
} from '../types';

type PreferencesReviewNavigationProp = NativeStackNavigationProp<
  OnboardingStackParamList,
  'PreferencesReview'
>;
type PreferencesReviewRouteProp = RouteProp<OnboardingStackParamList, 'PreferencesReview'>;

interface Props {
  navigation: PreferencesReviewNavigationProp;
  route: PreferencesReviewRouteProp;
}

const ALL_CATEGORIES: Category[] = [
  'statistics',
  'machine-learning',
  'python-pandas',
  'sql',
  'ab-testing',
  'visualization',
  'feature-engineering',
];

const DIFFICULTY_OPTIONS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export default function PreferencesReviewScreen({ navigation, route }: Props) {
  const { suggestions } = route.params;
  const { dispatch } = useApp();

  const [selectedCategories, setSelectedCategories] = useState<Set<Category>>(
    new Set(suggestions.suggestedCategories)
  );
  const [difficulties, setDifficulties] = useState<Record<Category, Difficulty>>(
    suggestions.suggestedDifficulties
  );
  const [isSaving, setIsSaving] = useState(false);

  const toggleCategory = (category: Category) => {
    setSelectedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const setDifficulty = (category: Category, difficulty: Difficulty) => {
    setDifficulties((prev) => ({
      ...prev,
      [category]: difficulty,
    }));
  };

  const handleAccept = useCallback(async () => {
    if (selectedCategories.size === 0) {
      Alert.alert('No Topics Selected', 'Please select at least one topic to practice.');
      return;
    }

    setIsSaving(true);
    try {
      // Build preferences - order categories by their original suggestion order for those selected
      const orderedCategories = suggestions.suggestedCategories.filter((cat) =>
        selectedCategories.has(cat)
      );
      // Add any newly selected categories that weren't in the original suggestions
      ALL_CATEGORIES.forEach((cat) => {
        if (selectedCategories.has(cat) && !orderedCategories.includes(cat)) {
          orderedCategories.push(cat);
        }
      });

      const preferences: UserPreferences = {
        experienceLevel: null,
        currentRole: null,
        technicalBackground: null,
        preferredCategories: orderedCategories,
        preferredDifficulties: difficulties,
        onboardingCompletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveUserPreferences(preferences);
      await clearOnboardingConversation();

      dispatch({
        type: 'SET_ONBOARDING_COMPLETE',
        payload: { completed: true, preferences },
      });
    } catch {
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
      setIsSaving(false);
    }
  }, [selectedCategories, difficulties, suggestions, dispatch]);

  const handleBack = () => {
    navigation.goBack();
  };

  const getCategoryInfo = (categoryId: Category) => {
    return CATEGORIES.find((c) => c.id === categoryId);
  };

  if (isSaving) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Setting up your preferences...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Reasoning Card */}
      <Card style={styles.reasoningCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.reasoningTitle}>
            My Suggestions
          </Text>
          <Text style={styles.reasoningText}>{suggestions.reasoning}</Text>
        </Card.Content>
      </Card>

      {/* Topics Selection */}
      <Surface style={styles.section} elevation={1}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Select Topics to Practice
        </Text>
        <Text variant="bodySmall" style={styles.sectionSubtitle}>
          Tap to toggle. Selected topics will appear more frequently.
        </Text>
        <View style={styles.chipContainer}>
          {ALL_CATEGORIES.map((categoryId) => {
            const info = getCategoryInfo(categoryId);
            const isSelected = selectedCategories.has(categoryId);
            return (
              <Chip
                key={categoryId}
                selected={isSelected}
                onPress={() => toggleCategory(categoryId)}
                style={[
                  styles.categoryChip,
                  isSelected && { backgroundColor: info?.color || '#6200EE' },
                ]}
                textStyle={isSelected ? styles.selectedChipText : undefined}
                showSelectedCheck={false}
              >
                {info?.label || categoryId}
              </Chip>
            );
          })}
        </View>
      </Surface>

      {/* Difficulty Selection */}
      <Surface style={styles.section} elevation={1}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Difficulty Levels
        </Text>
        <Text variant="bodySmall" style={styles.sectionSubtitle}>
          Set the difficulty for each topic.
        </Text>
        {ALL_CATEGORIES.filter((cat) => selectedCategories.has(cat)).map((categoryId) => {
          const info = getCategoryInfo(categoryId);
          return (
            <View key={categoryId} style={styles.difficultyRow}>
              <View style={styles.difficultyLabel}>
                <View
                  style={[styles.categoryDot, { backgroundColor: info?.color || '#666' }]}
                />
                <Text variant="bodyMedium" numberOfLines={1} style={styles.categoryName}>
                  {info?.label || categoryId}
                </Text>
              </View>
              <SegmentedButtons
                value={difficulties[categoryId]}
                onValueChange={(value) => setDifficulty(categoryId, value as Difficulty)}
                buttons={DIFFICULTY_OPTIONS}
                style={styles.segmentedButtons}
                density="small"
              />
            </View>
          );
        })}
        {selectedCategories.size === 0 && (
          <Text style={styles.noTopicsText}>
            Select topics above to configure their difficulty levels.
          </Text>
        )}
      </Surface>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          mode="contained"
          onPress={handleAccept}
          style={styles.acceptButton}
          icon="check"
        >
          Accept & Start Learning
        </Button>
        <Button mode="outlined" onPress={handleBack} style={styles.backButton}>
          Let Me Adjust
        </Button>
      </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: SPACING.md,
    color: '#666',
  },
  reasoningCard: {
    marginBottom: SPACING.md,
    backgroundColor: '#E8F5E9',
  },
  reasoningTitle: {
    color: '#2E7D32',
    marginBottom: SPACING.xs,
  },
  reasoningText: {
    color: '#1B5E20',
    lineHeight: 22,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    color: '#666',
    marginBottom: SPACING.md,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  categoryChip: {
    marginBottom: SPACING.xs,
  },
  selectedChipText: {
    color: '#fff',
  },
  difficultyRow: {
    marginBottom: SPACING.md,
  },
  difficultyLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: SPACING.sm,
  },
  categoryName: {
    flex: 1,
  },
  segmentedButtons: {
    alignSelf: 'stretch',
  },
  noTopicsText: {
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: SPACING.md,
  },
  actions: {
    marginTop: SPACING.md,
  },
  acceptButton: {
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  backButton: {},
});
