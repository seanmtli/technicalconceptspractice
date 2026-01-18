import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Card, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

import { getScoreColor } from '../constants/theme';
import { SPACING } from '../constants/theme';
import { HomeStackParamList } from '../types';

type SessionCompleteScreenNavigationProp = NativeStackNavigationProp<
  HomeStackParamList,
  'SessionComplete'
>;
type SessionCompleteScreenRouteProp = RouteProp<
  HomeStackParamList,
  'SessionComplete'
>;

interface Props {
  navigation: SessionCompleteScreenNavigationProp;
  route: SessionCompleteScreenRouteProp;
}

export default function SessionCompleteScreen({ navigation, route }: Props) {
  const { cardsReviewed, avgScore } = route.params;

  const getScoreEmoji = (score: number) => {
    if (score >= 4.5) return '🌟';
    if (score >= 4) return '👏';
    if (score >= 3) return '👍';
    if (score >= 2) return '💪';
    return '📚';
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content style={styles.content}>
          <MaterialCommunityIcons
            name="check-circle"
            size={80}
            color="#4CAF50"
          />
          <Text variant="headlineMedium" style={styles.title}>
            Session Complete!
          </Text>

          <View style={styles.statsRow}>
            <Surface style={styles.statCard} elevation={1}>
              <Text variant="displaySmall" style={styles.statValue}>
                {cardsReviewed}
              </Text>
              <Text variant="bodyMedium" style={styles.statLabel}>
                Cards Reviewed
              </Text>
            </Surface>

            <Surface
              style={[
                styles.statCard,
                { backgroundColor: avgScore > 0 ? getScoreColor(avgScore) : '#f5f5f5' },
              ]}
              elevation={1}
            >
              <Text
                variant="displaySmall"
                style={[styles.statValue, avgScore > 0 && { color: '#fff' }]}
              >
                {avgScore > 0 ? avgScore.toFixed(1) : '-'}
              </Text>
              <Text
                variant="bodyMedium"
                style={[styles.statLabel, avgScore > 0 && { color: '#fff' }]}
              >
                Avg Score
              </Text>
            </Surface>
          </View>

          {avgScore > 0 && (
            <Text variant="headlineSmall" style={styles.emoji}>
              {getScoreEmoji(avgScore)}
            </Text>
          )}

          {cardsReviewed === 0 ? (
            <Text style={styles.message}>
              No cards reviewed this session. Try again later!
            </Text>
          ) : avgScore >= 4 ? (
            <Text style={styles.message}>
              Excellent work! You're mastering these concepts.
            </Text>
          ) : avgScore >= 3 ? (
            <Text style={styles.message}>
              Good progress! Keep practicing to improve.
            </Text>
          ) : (
            <Text style={styles.message}>
              Keep at it! The cards you struggled with will come back sooner.
            </Text>
          )}
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={() => navigation.popToTop()}
        style={styles.button}
        icon="home"
      >
        Back to Home
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.md,
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  card: {
    marginBottom: SPACING.lg,
  },
  content: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  title: {
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  statCard: {
    marginHorizontal: SPACING.sm,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  statValue: {
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#666',
    marginTop: SPACING.xs,
  },
  emoji: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  message: {
    textAlign: 'center',
    color: '#666',
    paddingHorizontal: SPACING.lg,
  },
  button: {
    marginTop: SPACING.md,
  },
});
