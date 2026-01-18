import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import {
  Text,
  Card,
  Chip,
  Searchbar,
  FAB,
  SegmentedButtons,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { getAllQuestions } from '../services/database';
import { CATEGORIES, getCategoryColor, getDifficultyColor } from '../constants/categories';
import { SPACING } from '../constants/theme';
import { QuestionsStackParamList, Question, Category, Difficulty } from '../types';

type QuestionBankScreenNavigationProp = NativeStackNavigationProp<
  QuestionsStackParamList,
  'QuestionBank'
>;

interface Props {
  navigation: QuestionBankScreenNavigationProp;
}

export default function QuestionBankScreen({ navigation }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | 'all'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadQuestions = useCallback(async () => {
    try {
      const allQuestions = await getAllQuestions();
      setQuestions(allQuestions);
    } catch (error) {
      console.error('Failed to load questions:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadQuestions();
    }, [loadQuestions])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadQuestions();
    setIsRefreshing(false);
  };

  // Filter questions
  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      searchQuery === '' ||
      q.prompt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || q.category === selectedCategory;
    const matchesDifficulty =
      selectedDifficulty === 'all' || q.difficulty === selectedDifficulty;
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const renderQuestion = ({ item }: { item: Question }) => {
    const categoryInfo = CATEGORIES.find((c) => c.id === item.category);
    return (
      <Card
        style={styles.questionCard}
        onPress={() => navigation.navigate('QuestionDetail', { questionId: item.id })}
      >
        <Card.Content>
          <View style={styles.chipRow}>
            <Chip
              compact
              style={[styles.categoryChip, { backgroundColor: getCategoryColor(item.category) }]}
              textStyle={{ color: '#fff', fontSize: 10 }}
            >
              {categoryInfo?.label ?? item.category}
            </Chip>
            <Chip
              compact
              style={[styles.difficultyChip, { backgroundColor: getDifficultyColor(item.difficulty) }]}
              textStyle={{ color: '#fff', fontSize: 10 }}
            >
              {item.difficulty}
            </Chip>
            {item.isCustom && (
              <Chip compact style={styles.customChip} textStyle={{ fontSize: 10 }}>
                Custom
              </Chip>
            )}
          </View>
          <Text variant="bodyMedium" numberOfLines={3} style={styles.questionText}>
            {item.prompt}
          </Text>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search */}
      <Searchbar
        placeholder="Search questions..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      {/* Difficulty Filter */}
      <SegmentedButtons
        value={selectedDifficulty}
        onValueChange={(value) => setSelectedDifficulty(value as Difficulty | 'all')}
        buttons={[
          { value: 'all', label: 'All' },
          { value: 'beginner', label: 'Beginner' },
          { value: 'intermediate', label: 'Intermediate' },
          { value: 'advanced', label: 'Advanced' },
        ]}
        style={styles.segmentedButtons}
      />

      {/* Category Filter */}
      <FlatList
        horizontal
        data={[{ id: 'all', label: 'All' }, ...CATEGORIES]}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        style={styles.categoryFilter}
        renderItem={({ item }) => (
          <Chip
            selected={selectedCategory === item.id}
            onPress={() => setSelectedCategory(item.id as Category | 'all')}
            style={styles.filterChip}
          >
            {item.label}
          </Chip>
        )}
      />

      {/* Questions List */}
      <FlatList
        data={filteredQuestions}
        keyExtractor={(item) => item.id}
        renderItem={renderQuestion}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              No questions found
            </Text>
          </View>
        }
      />

      {/* FAB for generating questions */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('GenerateQuestions')}
        label="Generate"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchbar: {
    margin: SPACING.md,
    marginBottom: SPACING.sm,
  },
  segmentedButtons: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  categoryFilter: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    maxHeight: 48,
  },
  filterChip: {
    marginRight: SPACING.sm,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  questionCard: {
    marginBottom: SPACING.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.xs,
  },
  categoryChip: {
    marginRight: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  difficultyChip: {
    marginRight: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  customChip: {
    backgroundColor: '#E3F2FD',
    marginBottom: SPACING.xs,
  },
  questionText: {
    lineHeight: 20,
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
  },
  fab: {
    position: 'absolute',
    margin: SPACING.md,
    right: 0,
    bottom: 0,
  },
});
