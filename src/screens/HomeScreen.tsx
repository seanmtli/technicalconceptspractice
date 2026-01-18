import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import {
  Text,
  Button,
  Card,
  Surface,
  Banner,
  useTheme,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useApp, useCanPractice } from '../context/AppContext';
import {
  getDueCardCount,
  getUserStats,
  startPracticeSession,
  getWeeklyReviewCount,
  getAverageScoreThisWeek,
} from '../services/database';
import { SPACING } from '../constants/theme';
import { HomeStackParamList, UserStats } from '../types';

type HomeScreenNavigationProp = NativeStackNavigationProp<
  HomeStackParamList,
  'Home'
>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

export default function HomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const { state } = useApp();
  const { canPractice, reason } = useCanPractice();

  const [dueCount, setDueCount] = useState(0);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [weeklyReviews, setWeeklyReviews] = useState(0);
  const [weeklyAvgScore, setWeeklyAvgScore] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [due, userStats, weekReviews, weekAvg] = await Promise.all([
        getDueCardCount(),
        getUserStats(),
        getWeeklyReviewCount(),
        getAverageScoreThisWeek(),
      ]);
      setDueCount(due);
      setStats(userStats);
      setWeeklyReviews(weekReviews);
      setWeeklyAvgScore(weekAvg);
    } catch (error) {
      console.error('Failed to load home data:', error);
    }
  }, []);

  // Load data on focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleStartPractice = async () => {
    try {
      const sessionId = await startPracticeSession(10);
      navigation.navigate('Practice', { sessionId });
    } catch (error) {
      console.error('Failed to start practice session:', error);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    >
      {/* API Key Warning Banner */}
      {!state.hasClaudeApiKey && (
        <Banner
          visible
          icon="key"
          actions={[
            {
              label: 'Go to Settings',
              onPress: () => {
                // Navigate to settings tab
              },
            },
          ]}
        >
          API key required. Add your Claude API key in Settings to start
          practicing.
        </Banner>
      )}

      {/* Offline Banner */}
      {!state.isOnline && (
        <Banner visible icon="wifi-off" actions={[]}>
          You're offline. Practice requires an internet connection.
        </Banner>
      )}

      {/* Main Card - Cards Due */}
      <Card style={styles.mainCard} mode="elevated">
        <Card.Content style={styles.mainCardContent}>
          <MaterialCommunityIcons
            name="cards"
            size={48}
            color={theme.colors.primary}
          />
          <Text variant="displaySmall" style={styles.dueCount}>
            {dueCount}
          </Text>
          <Text variant="titleMedium" style={styles.dueLabel}>
            {dueCount === 1 ? 'card due today' : 'cards due today'}
          </Text>
        </Card.Content>
        <Card.Actions style={styles.mainCardActions}>
          <Button
            mode="contained"
            onPress={handleStartPractice}
            disabled={!canPractice || dueCount === 0}
            icon="play"
            style={styles.startButton}
          >
            {dueCount === 0 ? 'No Cards Due' : 'Start Practice'}
          </Button>
        </Card.Actions>
        {!canPractice && reason && (
          <Text variant="bodySmall" style={styles.warningText}>
            {reason}
          </Text>
        )}
      </Card>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <Surface style={styles.statCard} elevation={1}>
          <MaterialCommunityIcons
            name="fire"
            size={28}
            color="#FF9800"
          />
          <Text variant="headlineSmall" style={styles.statValue}>
            {stats?.currentStreak ?? 0}
          </Text>
          <Text variant="bodySmall" style={styles.statLabel}>
            Day Streak
          </Text>
        </Surface>

        <Surface style={styles.statCard} elevation={1}>
          <MaterialCommunityIcons
            name="check-circle"
            size={28}
            color="#4CAF50"
          />
          <Text variant="headlineSmall" style={styles.statValue}>
            {weeklyReviews}
          </Text>
          <Text variant="bodySmall" style={styles.statLabel}>
            This Week
          </Text>
        </Surface>

        <Surface style={styles.statCard} elevation={1}>
          <MaterialCommunityIcons
            name="star"
            size={28}
            color="#2196F3"
          />
          <Text variant="headlineSmall" style={styles.statValue}>
            {weeklyAvgScore > 0 ? weeklyAvgScore.toFixed(1) : '-'}
          </Text>
          <Text variant="bodySmall" style={styles.statLabel}>
            Avg Score
          </Text>
        </Surface>
      </View>

      {/* Info Card */}
      <Card style={styles.infoCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.infoTitle}>
            How it works
          </Text>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons
              name="numeric-1-circle"
              size={24}
              color={theme.colors.primary}
            />
            <Text variant="bodyMedium" style={styles.infoText}>
              Answer questions by typing or recording audio
            </Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons
              name="numeric-2-circle"
              size={24}
              color={theme.colors.primary}
            />
            <Text variant="bodyMedium" style={styles.infoText}>
              AI evaluates your answer and provides feedback
            </Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons
              name="numeric-3-circle"
              size={24}
              color={theme.colors.primary}
            />
            <Text variant="bodyMedium" style={styles.infoText}>
              Cards you struggle with come back sooner
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Total Stats */}
      {stats && stats.totalReviews > 0 && (
        <Card style={styles.totalCard}>
          <Card.Content style={styles.totalContent}>
            <Text variant="bodyMedium">
              Total reviews: <Text style={styles.bold}>{stats.totalReviews}</Text>
            </Text>
            <Text variant="bodyMedium">
              Longest streak: <Text style={styles.bold}>{stats.longestStreak} days</Text>
            </Text>
          </Card.Content>
        </Card>
      )}
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
  mainCard: {
    marginBottom: SPACING.md,
  },
  mainCardContent: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  dueCount: {
    marginTop: SPACING.sm,
    fontWeight: 'bold',
  },
  dueLabel: {
    color: '#666',
  },
  mainCardActions: {
    justifyContent: 'center',
    paddingBottom: SPACING.md,
  },
  startButton: {
    paddingHorizontal: SPACING.lg,
  },
  warningText: {
    textAlign: 'center',
    color: '#999',
    paddingBottom: SPACING.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    marginHorizontal: SPACING.xs,
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  statValue: {
    marginTop: SPACING.xs,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#666',
    marginTop: 2,
  },
  infoCard: {
    marginBottom: SPACING.md,
  },
  infoTitle: {
    marginBottom: SPACING.md,
    fontWeight: '600',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  infoText: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  totalCard: {
    backgroundColor: '#f0f0f0',
  },
  totalContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  bold: {
    fontWeight: 'bold',
  },
});
