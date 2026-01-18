import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Chip, Button, Divider } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

import {
  getQuestionById,
  getCardSchedule,
  getReviewsForQuestion,
  deleteQuestion,
} from '../services/database';
import { getNextReviewText, getMasteryLevel } from '../services/spacedRepetition';
import { getCategoryLabel, getCategoryColor, getDifficultyColor } from '../constants/categories';
import { getScoreColor, SPACING } from '../constants/theme';
import { QuestionsStackParamList, Question, CardSchedule, ReviewRecord } from '../types';

type QuestionDetailScreenNavigationProp = NativeStackNavigationProp<
  QuestionsStackParamList,
  'QuestionDetail'
>;
type QuestionDetailScreenRouteProp = RouteProp<
  QuestionsStackParamList,
  'QuestionDetail'
>;

interface Props {
  navigation: QuestionDetailScreenNavigationProp;
  route: QuestionDetailScreenRouteProp;
}

export default function QuestionDetailScreen({ navigation, route }: Props) {
  const { questionId } = route.params;
  const [question, setQuestion] = useState<Question | null>(null);
  const [schedule, setSchedule] = useState<CardSchedule | null>(null);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);

  useEffect(() => {
    async function loadData() {
      const [q, s, r] = await Promise.all([
        getQuestionById(questionId),
        getCardSchedule(questionId),
        getReviewsForQuestion(questionId),
      ]);
      setQuestion(q);
      setSchedule(s);
      setReviews(r);
    }
    loadData();
  }, [questionId]);

  const handleDelete = () => {
    if (!question?.isCustom) return;

    Alert.alert(
      'Delete Question',
      'Are you sure you want to delete this question? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteQuestion(questionId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  if (!question) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Question Card */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.chipRow}>
            <Chip
              style={[styles.chip, { backgroundColor: getCategoryColor(question.category) }]}
              textStyle={{ color: '#fff' }}
            >
              {getCategoryLabel(question.category)}
            </Chip>
            <Chip
              style={[styles.chip, { backgroundColor: getDifficultyColor(question.difficulty) }]}
              textStyle={{ color: '#fff' }}
            >
              {question.difficulty}
            </Chip>
            {question.isCustom && <Chip style={styles.customChip}>Custom</Chip>}
          </View>
          <Text variant="titleLarge" style={styles.questionText}>
            {question.prompt}
          </Text>
        </Card.Content>
      </Card>

      {/* Key Concepts */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Key Concepts
          </Text>
          <View style={styles.conceptsRow}>
            {question.keyConcepts.map((concept, index) => (
              <Chip key={index} style={styles.conceptChip}>
                {concept}
              </Chip>
            ))}
          </View>
        </Card.Content>
      </Card>

      {/* Schedule Info */}
      {schedule && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Spaced Repetition Status
            </Text>
            <View style={styles.scheduleRow}>
              <Text variant="bodyMedium">Status:</Text>
              <Text variant="bodyMedium" style={styles.scheduleValue}>
                {getMasteryLevel(schedule)}
              </Text>
            </View>
            <View style={styles.scheduleRow}>
              <Text variant="bodyMedium">Next Review:</Text>
              <Text variant="bodyMedium" style={styles.scheduleValue}>
                {getNextReviewText(schedule)}
              </Text>
            </View>
            <View style={styles.scheduleRow}>
              <Text variant="bodyMedium">Current Interval:</Text>
              <Text variant="bodyMedium" style={styles.scheduleValue}>
                {schedule.interval} day{schedule.interval !== 1 ? 's' : ''}
              </Text>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Review History */}
      {reviews.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Review History
            </Text>
            {reviews.slice(0, 5).map((review) => (
              <View key={review.id}>
                <View style={styles.reviewRow}>
                  <Text variant="bodySmall" style={styles.reviewDate}>
                    {new Date(review.reviewedAt).toLocaleDateString()}
                  </Text>
                  <Chip
                    compact
                    style={[styles.scoreChip, { backgroundColor: getScoreColor(review.score) }]}
                    textStyle={{ color: '#fff' }}
                  >
                    {review.score}/5
                  </Chip>
                </View>
                <Divider style={styles.divider} />
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Delete Button (for custom questions only) */}
      {question.isCustom && (
        <Button
          mode="outlined"
          onPress={handleDelete}
          style={styles.deleteButton}
          textColor="#F44336"
        >
          Delete Question
        </Button>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginBottom: SPACING.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.sm,
  },
  chip: {
    marginRight: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  customChip: {
    backgroundColor: '#E3F2FD',
    marginBottom: SPACING.xs,
  },
  questionText: {
    lineHeight: 28,
  },
  sectionTitle: {
    marginBottom: SPACING.sm,
    fontWeight: '600',
  },
  conceptsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  conceptChip: {
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
    backgroundColor: '#E8F5E9',
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  scheduleValue: {
    fontWeight: '500',
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  reviewDate: {
    color: '#666',
  },
  scoreChip: {},
  divider: {
    marginVertical: SPACING.xs,
  },
  deleteButton: {
    marginTop: SPACING.md,
    borderColor: '#F44336',
  },
});
