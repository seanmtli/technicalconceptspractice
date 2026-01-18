import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  Text,
  Button,
  Card,
  TextInput,
  ActivityIndicator,
  Chip,
  Surface,
  IconButton,
} from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

import { useSessionTimer } from '../hooks/useSessionTimer';
import { evaluateAnswer, ClaudeApiError } from '../services/claudeApi';
import {
  getDueCards,
  getQuestionById,
  addReviewRecord,
  updateCardSchedule,
  updateConceptGaps,
  endPracticeSession,
} from '../services/database';
import { calculateNextReview } from '../services/spacedRepetition';
import {
  startRecording,
  stopRecording,
  cancelRecording,
  isRecording,
  formatDuration,
  getRecordingDuration,
} from '../services/audioRecorder';
import { transcribeAudio } from '../services/transcription';
import { deleteRecording } from '../services/audioRecorder';
import { getCategoryLabel, getDifficultyColor } from '../constants/categories';
import { getScoreColor, getScoreLabel, SPACING, TIMER_WARNING_THRESHOLD } from '../constants/theme';
import {
  HomeStackParamList,
  PracticeState,
  Question,
  AIEvaluationResponse,
  CardSchedule,
} from '../types';

type PracticeScreenNavigationProp = NativeStackNavigationProp<
  HomeStackParamList,
  'Practice'
>;
type PracticeScreenRouteProp = RouteProp<HomeStackParamList, 'Practice'>;

interface Props {
  navigation: PracticeScreenNavigationProp;
  route: PracticeScreenRouteProp;
}

export default function PracticeScreen({ navigation, route }: Props) {
  const { sessionId } = route.params;

  // State
  const [practiceState, setPracticeState] = useState<PracticeState>({
    status: 'loading',
  });
  const [answerText, setAnswerText] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [cardsReviewed, setCardsReviewed] = useState(0);
  const [scores, setScores] = useState<number[]>([]);

  // Timer
  const timer = useSessionTimer(10);

  // Recording duration updater
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (practiceState.status === 'recording') {
      interval = setInterval(() => {
        setRecordingDuration(getRecordingDuration());
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [practiceState.status]);

  // Load next question
  const loadNextQuestion = useCallback(async () => {
    setPracticeState({ status: 'loading' });
    try {
      const dueCards = await getDueCards();
      if (dueCards.length === 0) {
        setPracticeState({ status: 'no_cards' });
        return;
      }

      const question = await getQuestionById(dueCards[0].questionId);
      if (!question) {
        setPracticeState({ status: 'no_cards' });
        return;
      }

      setPracticeState({ status: 'answering', question });
      setAnswerText('');
      timer.resume();
    } catch (error) {
      setPracticeState({
        status: 'error',
        error: 'Failed to load question',
        retryable: true,
      });
    }
  }, [timer]);

  // Initial load
  useEffect(() => {
    loadNextQuestion();
    timer.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle timer expiration
  useEffect(() => {
    if (timer.isExpired && practiceState.status !== 'session_complete') {
      handleSessionEnd();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.isExpired]);

  // Calculate average score
  const averageScore =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : 0;

  // Handle session end
  const handleSessionEnd = async () => {
    setPracticeState({ status: 'session_complete' });
    timer.pause();
    await endPracticeSession(sessionId, cardsReviewed, averageScore, true);
    navigation.replace('SessionComplete', {
      sessionId,
      cardsReviewed,
      avgScore: averageScore,
    });
  };

  // Submit text answer
  const handleTextSubmit = async () => {
    if (practiceState.status !== 'answering') return;
    if (!answerText.trim()) {
      Alert.alert('Empty Answer', 'Please write an answer before submitting.');
      return;
    }

    timer.pause();
    const question = practiceState.question;
    setPracticeState({ status: 'processing', question, step: 'evaluating' });

    try {
      const feedback = await evaluateAnswer(
        question.prompt,
        answerText,
        question.keyConcepts
      );

      await saveReview(question, answerText, 'text', feedback);

      setCardsReviewed((prev) => prev + 1);
      setScores((prev) => [...prev, feedback.score]);
      setPracticeState({ status: 'feedback', question, feedback });
    } catch (error: any) {
      const isRetryable = error instanceof ClaudeApiError && error.retryable;
      setPracticeState({
        status: 'error',
        error: error.message || 'Evaluation failed',
        retryable: isRetryable,
      });
    }
  };

  // Handle audio recording
  const handleStartRecording = async () => {
    if (practiceState.status !== 'answering') return;
    try {
      await startRecording();
      setPracticeState({ status: 'recording', question: practiceState.question });
      setRecordingDuration(0);
    } catch (error: any) {
      Alert.alert('Recording Error', error.message);
    }
  };

  const handleStopRecording = async () => {
    if (practiceState.status !== 'recording') return;

    timer.pause();
    const question = practiceState.question;
    setPracticeState({ status: 'processing', question, step: 'transcribing' });

    try {
      const { uri } = await stopRecording();
      const transcription = await transcribeAudio(uri);
      await deleteRecording(uri);

      setPracticeState({ status: 'processing', question, step: 'evaluating' });

      const feedback = await evaluateAnswer(
        question.prompt,
        transcription,
        question.keyConcepts
      );

      await saveReview(question, transcription, 'audio', feedback);

      setCardsReviewed((prev) => prev + 1);
      setScores((prev) => [...prev, feedback.score]);
      setPracticeState({ status: 'feedback', question, feedback });
    } catch (error: any) {
      setPracticeState({
        status: 'error',
        error: error.message || 'Processing failed',
        retryable: true,
      });
    }
  };

  const handleCancelRecording = async () => {
    await cancelRecording();
    if (practiceState.status === 'recording') {
      setPracticeState({ status: 'answering', question: practiceState.question });
    }
  };

  // Save review to database
  const saveReview = async (
    question: Question,
    answer: string,
    answerType: 'text' | 'audio',
    feedback: AIEvaluationResponse
  ) => {
    const now = new Date().toISOString();

    // Save review record
    await addReviewRecord({
      questionId: question.id,
      userAnswer: answer,
      answerType,
      score: feedback.score,
      aiFeedback: feedback.fullFeedback,
      whatWasCoveredWell: feedback.whatWasCoveredWell,
      whatWasMissing: feedback.whatWasMissing,
      missedConcepts: feedback.missedConcepts,
      modelAnswer: feedback.modelAnswer,
      reviewedAt: now,
    });

    // Update spaced repetition schedule
    const currentSchedule: CardSchedule = {
      questionId: question.id,
      nextReviewDate: now,
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
    };
    const newSchedule = calculateNextReview(feedback.score, currentSchedule);
    await updateCardSchedule(newSchedule);

    // Update concept gaps
    if (feedback.missedConcepts && feedback.missedConcepts.length > 0) {
      await updateConceptGaps(
        feedback.missedConcepts,
        question.id,
        question.category
      );
    }
  };

  // Render based on state
  const renderContent = () => {
    switch (practiceState.status) {
      case 'loading':
        return (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>Loading question...</Text>
          </View>
        );

      case 'no_cards':
        return (
          <View style={styles.centerContainer}>
            <Text variant="headlineSmall">All caught up!</Text>
            <Text style={styles.subText}>No cards due right now.</Text>
            <Button
              mode="contained"
              onPress={() => navigation.goBack()}
              style={styles.actionButton}
            >
              Back to Home
            </Button>
          </View>
        );

      case 'answering':
        return renderAnsweringState(practiceState.question);

      case 'recording':
        return renderRecordingState(practiceState.question);

      case 'processing':
        return (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>
              {practiceState.step === 'transcribing'
                ? 'Transcribing audio...'
                : 'Evaluating answer...'}
            </Text>
          </View>
        );

      case 'feedback':
        return renderFeedbackState(practiceState.question, practiceState.feedback);

      case 'session_complete':
        return (
          <View style={styles.centerContainer}>
            <Text variant="headlineSmall">Session Complete!</Text>
          </View>
        );

      case 'error':
        return (
          <View style={styles.centerContainer}>
            <Text variant="headlineSmall" style={styles.errorText}>
              Error
            </Text>
            <Text style={styles.subText}>{practiceState.error}</Text>
            {practiceState.retryable && (
              <Button
                mode="contained"
                onPress={loadNextQuestion}
                style={styles.actionButton}
              >
                Try Again
              </Button>
            )}
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={styles.actionButton}
            >
              Back to Home
            </Button>
          </View>
        );

      default:
        return null;
    }
  };

  const renderAnsweringState = (question: Question) => (
    <ScrollView style={styles.scrollContainer}>
      {/* Question Card */}
      <Card style={styles.questionCard}>
        <Card.Content>
          <View style={styles.chipRow}>
            <Chip style={styles.categoryChip}>
              {getCategoryLabel(question.category)}
            </Chip>
            <Chip
              style={[
                styles.difficultyChip,
                { backgroundColor: getDifficultyColor(question.difficulty) },
              ]}
              textStyle={{ color: '#fff' }}
            >
              {question.difficulty}
            </Chip>
          </View>
          <Text variant="titleLarge" style={styles.questionText}>
            {question.prompt}
          </Text>
        </Card.Content>
      </Card>

      {/* Answer Input */}
      <Card style={styles.answerCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.answerLabel}>
            Your Answer
          </Text>
          <TextInput
            mode="outlined"
            multiline
            numberOfLines={8}
            value={answerText}
            onChangeText={setAnswerText}
            placeholder="Type your explanation here..."
            style={styles.textInput}
          />
          <View style={styles.buttonRow}>
            <Button
              mode="contained"
              onPress={handleTextSubmit}
              disabled={!answerText.trim()}
              style={styles.submitButton}
            >
              Submit Answer
            </Button>
            <IconButton
              icon="microphone"
              mode="contained"
              onPress={handleStartRecording}
              style={styles.micButton}
            />
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );

  const renderRecordingState = (question: Question) => (
    <View style={styles.recordingContainer}>
      <Card style={styles.questionCard}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.questionText}>
            {question.prompt}
          </Text>
        </Card.Content>
      </Card>

      <Surface style={styles.recordingSurface} elevation={2}>
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text variant="headlineMedium">{formatDuration(recordingDuration)}</Text>
        </View>
        <Text style={styles.recordingText}>Recording your answer...</Text>
        <View style={styles.recordingButtons}>
          <Button mode="outlined" onPress={handleCancelRecording}>
            Cancel
          </Button>
          <Button mode="contained" onPress={handleStopRecording}>
            Stop & Submit
          </Button>
        </View>
      </Surface>
    </View>
  );

  const renderFeedbackState = (question: Question, feedback: AIEvaluationResponse) => (
    <ScrollView style={styles.scrollContainer}>
      {/* Score Card */}
      <Card
        style={[
          styles.scoreCard,
          { backgroundColor: getScoreColor(feedback.score) },
        ]}
      >
        <Card.Content style={styles.scoreContent}>
          <Text variant="displaySmall" style={styles.scoreNumber}>
            {feedback.score}/5
          </Text>
          <Text variant="titleMedium" style={styles.scoreLabel}>
            {getScoreLabel(feedback.score)}
          </Text>
        </Card.Content>
      </Card>

      {/* Feedback Card */}
      <Card style={styles.feedbackCard}>
        <Card.Content>
          {feedback.whatWasCoveredWell && (
            <View style={styles.feedbackSection}>
              <Text variant="titleMedium" style={styles.feedbackTitle}>
                What You Got Right
              </Text>
              <Text>{feedback.whatWasCoveredWell}</Text>
            </View>
          )}

          {feedback.whatWasMissing && (
            <View style={styles.feedbackSection}>
              <Text variant="titleMedium" style={[styles.feedbackTitle, styles.missingTitle]}>
                What Was Missing
              </Text>
              <Text>{feedback.whatWasMissing}</Text>
            </View>
          )}

          <View style={styles.feedbackSection}>
            <Text variant="titleMedium" style={styles.feedbackTitle}>
              Model Answer
            </Text>
            <Text>{feedback.modelAnswer}</Text>
          </View>
        </Card.Content>
      </Card>

      {/* Next Button */}
      <Button
        mode="contained"
        onPress={loadNextQuestion}
        style={styles.nextButton}
        icon="arrow-right"
      >
        Next Question
      </Button>

      <Button
        mode="outlined"
        onPress={handleSessionEnd}
        style={styles.endButton}
      >
        End Session
      </Button>
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Timer Header */}
      <Surface style={styles.timerBar} elevation={1}>
        <View style={styles.timerContent}>
          <Text
            style={[
              styles.timerText,
              timer.timeRemaining <= TIMER_WARNING_THRESHOLD && styles.timerWarning,
            ]}
          >
            {timer.formattedTime}
          </Text>
          <Text style={styles.progressText}>
            {cardsReviewed} reviewed
            {scores.length > 0 && ` • Avg: ${averageScore}`}
          </Text>
        </View>
      </Surface>

      {renderContent()}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  timerBar: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: '#fff',
  },
  timerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  timerWarning: {
    color: '#F44336',
  },
  progressText: {
    color: '#666',
  },
  scrollContainer: {
    flex: 1,
    padding: SPACING.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  loadingText: {
    marginTop: SPACING.md,
    color: '#666',
  },
  subText: {
    marginTop: SPACING.sm,
    color: '#666',
    textAlign: 'center',
  },
  errorText: {
    color: '#F44336',
  },
  actionButton: {
    marginTop: SPACING.md,
  },
  questionCard: {
    marginBottom: SPACING.md,
  },
  chipRow: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  categoryChip: {
    marginRight: SPACING.sm,
  },
  difficultyChip: {},
  questionText: {
    marginTop: SPACING.sm,
    lineHeight: 28,
  },
  answerCard: {
    marginBottom: SPACING.md,
  },
  answerLabel: {
    marginBottom: SPACING.sm,
  },
  textInput: {
    minHeight: 150,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  submitButton: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  micButton: {
    backgroundColor: '#6200EE',
  },
  recordingContainer: {
    flex: 1,
    padding: SPACING.md,
  },
  recordingSurface: {
    flex: 1,
    borderRadius: 12,
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginTop: SPACING.md,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F44336',
    marginRight: SPACING.sm,
  },
  recordingText: {
    color: '#666',
    marginBottom: SPACING.lg,
  },
  recordingButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  scoreCard: {
    marginBottom: SPACING.md,
  },
  scoreContent: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  scoreNumber: {
    color: '#fff',
    fontWeight: 'bold',
  },
  scoreLabel: {
    color: '#fff',
  },
  feedbackCard: {
    marginBottom: SPACING.md,
  },
  feedbackSection: {
    marginBottom: SPACING.md,
  },
  feedbackTitle: {
    color: '#4CAF50',
    marginBottom: SPACING.xs,
  },
  missingTitle: {
    color: '#F44336',
  },
  nextButton: {
    marginBottom: SPACING.sm,
  },
  endButton: {
    marginBottom: SPACING.lg,
  },
});
