import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Text,
  Card,
  Button,
  TextInput,
  SegmentedButtons,
  ActivityIndicator,
  Chip,
} from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { generateQuestions, ClaudeApiError } from '../services/claudeApi';
import { addQuestion } from '../services/database';
import { CATEGORIES, getCategoryColor } from '../constants/categories';
import { SPACING } from '../constants/theme';
import { QuestionsStackParamList, GeneratedQuestion, Category, Difficulty } from '../types';
import { getSuggestedSubTopics } from '../services/knowledgeEnhancer';

type GenerateQuestionsScreenNavigationProp = NativeStackNavigationProp<
  QuestionsStackParamList,
  'GenerateQuestions'
>;

interface Props {
  navigation: GenerateQuestionsScreenNavigationProp;
}

export default function GenerateQuestionsScreen({ navigation }: Props) {
  const [category, setCategory] = useState<Category>('statistics');
  const [difficulty, setDifficulty] = useState<Difficulty>('intermediate');
  const [subTopic, setSubTopic] = useState('');
  const [count, setCount] = useState('3');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedQuestions([]);

    try {
      const questions = await generateQuestions(
        CATEGORIES.find((c) => c.id === category)?.label ?? category,
        difficulty,
        subTopic || null,
        parseInt(count, 10) || 3,
        category // Pass category ID for knowledge enhancement
      );
      setGeneratedQuestions(questions);
    } catch (error) {
      Alert.alert(
        'Generation Failed',
        error instanceof ClaudeApiError ? error.message : 'Failed to generate questions'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Get suggested sub-topics for the selected category
  const suggestedTopics = getSuggestedSubTopics(category);

  const handleSaveAll = async () => {
    if (generatedQuestions.length === 0) return;

    setIsSaving(true);
    try {
      for (const q of generatedQuestions) {
        await addQuestion({
          prompt: q.prompt,
          category,
          difficulty: q.difficulty,
          keyConcepts: q.keyConcepts,
          isCustom: true,
        });
      }
      Alert.alert('Success', `${generatedQuestions.length} questions added to your bank!`);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save questions');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveQuestion = (index: number) => {
    setGeneratedQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Configuration Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.label}>
            Category
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {CATEGORIES.map((cat) => (
              <Chip
                key={cat.id}
                selected={category === cat.id}
                onPress={() => setCategory(cat.id)}
                style={[
                  styles.categoryChip,
                  category === cat.id && { backgroundColor: getCategoryColor(cat.id) },
                ]}
                textStyle={category === cat.id ? { color: '#fff' } : undefined}
              >
                {cat.label}
              </Chip>
            ))}
          </ScrollView>

          <Text variant="titleMedium" style={styles.label}>
            Difficulty
          </Text>
          <SegmentedButtons
            value={difficulty}
            onValueChange={(v) => setDifficulty(v as Difficulty)}
            buttons={[
              { value: 'beginner', label: 'Beginner' },
              { value: 'intermediate', label: 'Intermediate' },
              { value: 'advanced', label: 'Advanced' },
            ]}
            style={styles.segmented}
          />

          <Text variant="titleMedium" style={styles.label}>
            Sub-topic (optional)
          </Text>
          <TextInput
            mode="outlined"
            value={subTopic}
            onChangeText={setSubTopic}
            placeholder="e.g., decision trees, p-values"
            style={styles.input}
          />
          {suggestedTopics.length > 0 && (
            <View style={styles.suggestedContainer}>
              <Text variant="labelSmall" style={styles.suggestedLabel}>
                Suggested topics:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {suggestedTopics.slice(0, 5).map((topic, index) => (
                  <Chip
                    key={index}
                    compact
                    onPress={() => setSubTopic(topic)}
                    style={styles.suggestedChip}
                  >
                    {topic}
                  </Chip>
                ))}
              </ScrollView>
            </View>
          )}

          <Text variant="titleMedium" style={styles.label}>
            Number of Questions
          </Text>
          <SegmentedButtons
            value={count}
            onValueChange={setCount}
            buttons={[
              { value: '1', label: '1' },
              { value: '2', label: '2' },
              { value: '3', label: '3' },
              { value: '4', label: '4' },
              { value: '5', label: '5' },
            ]}
            style={styles.segmented}
          />

          <Button
            mode="contained"
            onPress={handleGenerate}
            loading={isGenerating}
            disabled={isGenerating}
            style={styles.generateButton}
          >
            {isGenerating ? 'Generating...' : 'Generate Questions'}
          </Button>
        </Card.Content>
      </Card>

      {/* Loading */}
      {isGenerating && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Generating questions...</Text>
        </View>
      )}

      {/* Generated Questions Preview */}
      {generatedQuestions.length > 0 && (
        <>
          <Text variant="titleLarge" style={styles.previewTitle}>
            Preview ({generatedQuestions.length} questions)
          </Text>

          {generatedQuestions.map((q, index) => (
            <Card key={index} style={styles.previewCard}>
              <Card.Content>
                <Text variant="bodyLarge" style={styles.questionText}>
                  {q.prompt}
                </Text>
                <View style={styles.conceptsRow}>
                  {q.keyConcepts.map((concept, i) => (
                    <Chip key={i} compact style={styles.conceptChip}>
                      {concept}
                    </Chip>
                  ))}
                </View>
              </Card.Content>
              <Card.Actions>
                <Button onPress={() => handleRemoveQuestion(index)}>Remove</Button>
              </Card.Actions>
            </Card>
          ))}

          <Button
            mode="contained"
            onPress={handleSaveAll}
            loading={isSaving}
            disabled={isSaving}
            style={styles.saveButton}
          >
            Save All Questions
          </Button>
        </>
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
  label: {
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  chipScroll: {
    marginBottom: SPACING.sm,
  },
  categoryChip: {
    marginRight: SPACING.sm,
  },
  segmented: {
    marginBottom: SPACING.sm,
  },
  input: {
    marginBottom: SPACING.xs,
  },
  suggestedContainer: {
    marginBottom: SPACING.sm,
  },
  suggestedLabel: {
    color: '#666',
    marginBottom: SPACING.xs,
  },
  suggestedChip: {
    marginRight: SPACING.xs,
    backgroundColor: '#E3F2FD',
  },
  generateButton: {
    marginTop: SPACING.md,
  },
  loadingContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    color: '#666',
  },
  previewTitle: {
    marginBottom: SPACING.md,
  },
  previewCard: {
    marginBottom: SPACING.md,
  },
  questionText: {
    marginBottom: SPACING.sm,
    lineHeight: 24,
  },
  conceptsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  conceptChip: {
    marginRight: SPACING.xs,
    marginBottom: SPACING.xs,
    backgroundColor: '#E8F5E9',
  },
  saveButton: {
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
});
