import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  TextInput,
  IconButton,
  ActivityIndicator,
  Button,
  Surface,
} from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import ChatBubble from '../components/ChatBubble';
import { useApp } from '../context/AppContext';
import {
  continueOnboardingConversation,
  getInitialGreeting,
  extractPreferencesFromConversation,
  isReadyForSuggestions,
  cleanResponseForDisplay,
  OnboardingApiError,
} from '../services/onboardingApi';
import {
  getOnboardingConversation,
  saveOnboardingConversation,
  saveUserPreferences,
  getDefaultPreferences,
} from '../services/database';
import { OnboardingStackParamList, OnboardingMessage } from '../types';
import { SPACING } from '../constants/theme';

type OnboardingChatNavigationProp = NativeStackNavigationProp<
  OnboardingStackParamList,
  'OnboardingChat'
>;

interface Props {
  navigation: OnboardingChatNavigationProp;
}

export default function OnboardingChatScreen({ navigation }: Props) {
  const { state, dispatch } = useApp();
  const [messages, setMessages] = useState<OnboardingMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Load existing conversation or start new one
  useEffect(() => {
    loadOrStartConversation();
  }, []);

  const loadOrStartConversation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check for existing conversation
      const existingMessages = await getOnboardingConversation();

      if (existingMessages.length > 0) {
        // Resume existing conversation
        setMessages(existingMessages);
      } else {
        // Start new conversation with greeting
        const greeting = await getInitialGreeting();
        const cleanedGreeting = cleanResponseForDisplay(greeting);
        const initialMessages: OnboardingMessage[] = [
          { role: 'assistant', content: cleanedGreeting },
        ];
        setMessages(initialMessages);
        await saveOnboardingConversation(initialMessages);
      }
    } catch (err: any) {
      if (err instanceof OnboardingApiError) {
        setError(err.message);
      } else {
        setError('Failed to start conversation. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || isSending) return;

    const userMessage = inputText.trim();
    setInputText('');
    setIsSending(true);
    setError(null);

    // Add user message immediately
    const updatedMessages: OnboardingMessage[] = [
      ...messages,
      { role: 'user', content: userMessage },
    ];
    setMessages(updatedMessages);

    try {
      // Get assistant response
      const response = await continueOnboardingConversation(messages, userMessage);
      const cleanedResponse = cleanResponseForDisplay(response);

      // Add assistant response
      const finalMessages: OnboardingMessage[] = [
        ...updatedMessages,
        { role: 'assistant', content: cleanedResponse },
      ];
      setMessages(finalMessages);
      await saveOnboardingConversation(finalMessages);

      // Check if ready for suggestions
      if (isReadyForSuggestions(response)) {
        // Extract preferences and navigate
        setTimeout(async () => {
          try {
            const suggestions = await extractPreferencesFromConversation(finalMessages);
            navigation.navigate('PreferencesReview', { suggestions });
          } catch {
            // If extraction fails, still navigate with defaults
            navigation.navigate('PreferencesReview', {
              suggestions: {
                reasoning: 'Based on your responses, here are balanced recommendations.',
                suggestedCategories: ['statistics', 'python-pandas', 'sql', 'machine-learning'],
                suggestedDifficulties: {
                  'statistics': 'intermediate',
                  'machine-learning': 'intermediate',
                  'python-pandas': 'intermediate',
                  'sql': 'intermediate',
                  'ab-testing': 'intermediate',
                  'visualization': 'intermediate',
                  'feature-engineering': 'intermediate',
                  'llm-fundamentals': 'intermediate',
                  'ml-infrastructure': 'intermediate',
                  'data-platforms': 'intermediate',
                  'fundamentals': 'beginner',
                  'devops': 'intermediate',
                },
              },
            });
          }
        }, 1500);
      }
    } catch (err: any) {
      // Remove the user message if API call failed
      setMessages(messages);
      setError(err.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  }, [inputText, messages, isSending, navigation]);

  const handleSkip = useCallback(async () => {
    Alert.alert(
      'Skip Onboarding',
      'This will set up the app with default settings. You can update your preferences later in Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          onPress: async () => {
            const defaultPrefs = getDefaultPreferences();
            await saveUserPreferences(defaultPrefs);
            dispatch({
              type: 'SET_ONBOARDING_COMPLETE',
              payload: { completed: true, preferences: defaultPrefs },
            });
          },
        },
      ]
    );
  }, [dispatch]);

  // Set up navigation header
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Button mode="text" onPress={handleSkip} compact>
          Skip
        </Button>
      ),
    });
  }, [navigation, handleSkip]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Starting conversation...</Text>
      </View>
    );
  }

  if (error && messages.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text variant="headlineSmall" style={styles.errorTitle}>
          Setup Error
        </Text>
        <Text style={styles.errorText}>{error}</Text>
        <Button mode="contained" onPress={loadOrStartConversation} style={styles.retryButton}>
          Retry
        </Button>
        <Button mode="outlined" onPress={handleSkip}>
          Skip and Use Defaults
        </Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Welcome Header */}
      <Surface style={styles.header} elevation={1}>
        <Text variant="titleMedium" style={styles.headerTitle}>
          Let's personalize your learning
        </Text>
        <Text variant="bodySmall" style={styles.headerSubtitle}>
          Answer a few questions to customize your experience
        </Text>
      </Surface>

      {/* Chat Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map((msg, index) => (
          <ChatBubble key={index} role={msg.role} content={msg.content} />
        ))}
        {isSending && (
          <View style={styles.typingIndicator}>
            <ActivityIndicator size="small" />
            <Text style={styles.typingText}>Thinking...</Text>
          </View>
        )}
      </ScrollView>

      {/* Error Banner */}
      {error && messages.length > 0 && (
        <Surface style={styles.errorBanner} elevation={2}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </Surface>
      )}

      {/* Input Area */}
      <Surface style={styles.inputContainer} elevation={2}>
        <TextInput
          mode="outlined"
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type your response..."
          style={styles.input}
          multiline
          maxLength={500}
          disabled={isSending}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <IconButton
          icon="send"
          mode="contained"
          onPress={handleSend}
          disabled={!inputText.trim() || isSending}
          style={styles.sendButton}
        />
      </Surface>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: SPACING.md,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: '#fff',
  },
  errorTitle: {
    color: '#F44336',
    marginBottom: SPACING.sm,
  },
  errorText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: SPACING.lg,
  },
  retryButton: {
    marginBottom: SPACING.sm,
  },
  header: {
    padding: SPACING.md,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#333',
  },
  headerSubtitle: {
    color: '#666',
    marginTop: SPACING.xs,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: SPACING.md,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  typingText: {
    marginLeft: SPACING.sm,
    color: '#666',
    fontStyle: 'italic',
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  errorBannerText: {
    color: '#C62828',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: SPACING.sm,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    maxHeight: 100,
    marginRight: SPACING.sm,
  },
  sendButton: {
    marginBottom: 6,
  },
});
