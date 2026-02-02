import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, ProgressBar, Surface, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import {
  getUserStats,
  getCategoryStats,
  getTopConceptGaps,
  getRecentSessions,
} from '../services/database';
import { CATEGORIES, getCategoryColor } from '../constants/categories';
import { SPACING } from '../constants/theme';
import { UserStats, CategoryStats, ConceptGap, PracticeSession } from '../types';
import { logger } from '../utils/logger';

export default function ProgressScreen() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [conceptGaps, setConceptGaps] = useState<ConceptGap[]>([]);
  const [recentSessions, setRecentSessions] = useState<PracticeSession[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [userStats, catStats, gaps, sessions] = await Promise.all([
        getUserStats(),
        getCategoryStats(),
        getTopConceptGaps(5),
        getRecentSessions(5),
      ]);
      setStats(userStats);
      setCategoryStats(catStats);
      setConceptGaps(gaps);
      setRecentSessions(sessions);
    } catch (error) {
      logger.error('Failed to load progress data', error);
    }
  }, []);

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

  const totalQuestions = categoryStats.reduce((sum, c) => sum + c.totalQuestions, 0);
  const totalMastered = categoryStats.reduce((sum, c) => sum + c.masteredCount, 0);
  const masteryPercentage = totalQuestions > 0 ? totalMastered / totalQuestions : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Overall Stats */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.cardTitle}>
            Overall Progress
          </Text>
          <View style={styles.overallStats}>
            <Surface style={styles.statBox} elevation={1}>
              <MaterialCommunityIcons name="fire" size={32} color="#FF9800" />
              <Text variant="headlineMedium" style={styles.statValue}>
                {stats?.currentStreak ?? 0}
              </Text>
              <Text variant="bodySmall">Day Streak</Text>
            </Surface>
            <Surface style={styles.statBox} elevation={1}>
              <MaterialCommunityIcons name="check-all" size={32} color="#4CAF50" />
              <Text variant="headlineMedium" style={styles.statValue}>
                {stats?.totalReviews ?? 0}
              </Text>
              <Text variant="bodySmall">Total Reviews</Text>
            </Surface>
            <Surface style={styles.statBox} elevation={1}>
              <MaterialCommunityIcons name="star" size={32} color="#2196F3" />
              <Text variant="headlineMedium" style={styles.statValue}>
                {totalMastered}
              </Text>
              <Text variant="bodySmall">Mastered</Text>
            </Surface>
          </View>
          <View style={styles.masteryRow}>
            <Text variant="bodyMedium">Mastery Progress</Text>
            <Text variant="bodyMedium">
              {Math.round(masteryPercentage * 100)}%
            </Text>
          </View>
          <ProgressBar
            progress={masteryPercentage}
            color="#4CAF50"
            style={styles.progressBar}
          />
        </Card.Content>
      </Card>

      {/* Category Progress */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.cardTitle}>
            By Category
          </Text>
          {categoryStats.map((cat) => {
            const categoryInfo = CATEGORIES.find((c) => c.id === cat.category);
            const progress =
              cat.totalQuestions > 0 ? cat.masteredCount / cat.totalQuestions : 0;
            return (
              <View key={cat.category} style={styles.categoryRow}>
                <View style={styles.categoryHeader}>
                  <Text variant="bodyMedium" style={styles.categoryLabel}>
                    {categoryInfo?.label ?? cat.category}
                  </Text>
                  <Text variant="bodySmall" style={styles.categoryStats}>
                    {cat.masteredCount}/{cat.totalQuestions}
                    {cat.averageScore > 0 && ` • Avg: ${cat.averageScore}`}
                  </Text>
                </View>
                <ProgressBar
                  progress={progress}
                  color={getCategoryColor(cat.category)}
                  style={styles.categoryProgress}
                />
              </View>
            );
          })}
        </Card.Content>
      </Card>

      {/* Concept Gaps */}
      {conceptGaps.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>
              Concepts to Review
            </Text>
            <Text variant="bodySmall" style={styles.subtitle}>
              Concepts you've missed frequently
            </Text>
            {conceptGaps.map((gap) => (
              <View key={gap.concept} style={styles.gapRow}>
                <View style={styles.gapInfo}>
                  <Text variant="bodyMedium">{gap.concept}</Text>
                  <Chip compact style={styles.gapChip}>
                    {gap.missedCount}x missed
                  </Chip>
                </View>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>
              Recent Sessions
            </Text>
            {recentSessions.map((session) => {
              const date = new Date(session.startedAt);
              return (
                <View key={session.id} style={styles.sessionRow}>
                  <Text variant="bodyMedium">
                    {date.toLocaleDateString()}
                  </Text>
                  <Text variant="bodySmall" style={styles.sessionStats}>
                    {session.cardsReviewed} cards • Avg: {session.averageScore.toFixed(1)}
                  </Text>
                </View>
              );
            })}
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
  card: {
    marginBottom: SPACING.md,
  },
  cardTitle: {
    marginBottom: SPACING.md,
  },
  overallStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.md,
    marginHorizontal: SPACING.xs,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  statValue: {
    fontWeight: 'bold',
    marginTop: SPACING.xs,
  },
  masteryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  categoryRow: {
    marginBottom: SPACING.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  categoryLabel: {
    fontWeight: '500',
  },
  categoryStats: {
    color: '#666',
  },
  categoryProgress: {
    height: 6,
    borderRadius: 3,
  },
  subtitle: {
    color: '#666',
    marginBottom: SPACING.md,
  },
  gapRow: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  gapInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gapChip: {
    backgroundColor: '#FFEBEE',
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sessionStats: {
    color: '#666',
  },
});
