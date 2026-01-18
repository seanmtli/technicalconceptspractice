import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import {
  Text,
  Card,
  TextInput,
  Button,
  List,
  Divider,
  Switch,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useApp } from '../context/AppContext';
import {
  getApiKey,
  setApiKey,
  deleteApiKey,
  getWhisperApiKey,
  setWhisperApiKey,
  deleteWhisperApiKey,
  maskApiKey,
} from '../services/storage';
import { testConnection, resetClient } from '../services/claudeApi';
import { resetAllProgress, getQuestionCount } from '../services/database';
import { SPACING } from '../constants/theme';

export default function SettingsScreen() {
  const { state, refreshApiKeyStatus } = useApp();

  // Claude API Key
  const [claudeKey, setClaudeKey] = useState('');
  const [claudeKeyMasked, setClaudeKeyMasked] = useState('');
  const [isTestingClaude, setIsTestingClaude] = useState(false);
  const [isSavingClaude, setIsSavingClaude] = useState(false);

  // Whisper API Key
  const [whisperKey, setWhisperKey] = useState('');
  const [whisperKeyMasked, setWhisperKeyMasked] = useState('');
  const [isSavingWhisper, setIsSavingWhisper] = useState(false);

  // Stats
  const [questionCount, setQuestionCount] = useState(0);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const [claude, whisper, qCount] = await Promise.all([
      getApiKey(),
      getWhisperApiKey(),
      getQuestionCount(),
    ]);

    if (claude) {
      setClaudeKeyMasked(maskApiKey(claude));
    }
    if (whisper) {
      setWhisperKeyMasked(maskApiKey(whisper));
    }
    setQuestionCount(qCount);
  };

  // Claude API Key handlers
  const handleSaveClaudeKey = async () => {
    if (!claudeKey.trim()) {
      Alert.alert('Error', 'Please enter an API key');
      return;
    }

    setIsSavingClaude(true);
    try {
      await setApiKey(claudeKey);
      resetClient();
      setClaudeKeyMasked(maskApiKey(claudeKey));
      setClaudeKey('');
      await refreshApiKeyStatus();
      Alert.alert('Success', 'Claude API key saved');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsSavingClaude(false);
    }
  };

  const handleTestClaudeKey = async () => {
    setIsTestingClaude(true);
    try {
      const success = await testConnection();
      if (success) {
        Alert.alert('Success', 'API key is valid and working!');
      } else {
        Alert.alert('Failed', 'Could not connect. Check your API key.');
      }
    } catch {
      Alert.alert('Failed', 'Could not connect. Check your API key.');
    } finally {
      setIsTestingClaude(false);
    }
  };

  const handleDeleteClaudeKey = async () => {
    Alert.alert(
      'Delete API Key',
      'Are you sure you want to remove your Claude API key?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteApiKey();
            resetClient();
            setClaudeKeyMasked('');
            await refreshApiKeyStatus();
          },
        },
      ]
    );
  };

  // Whisper API Key handlers
  const handleSaveWhisperKey = async () => {
    if (!whisperKey.trim()) {
      Alert.alert('Error', 'Please enter an API key');
      return;
    }

    setIsSavingWhisper(true);
    try {
      await setWhisperApiKey(whisperKey);
      setWhisperKeyMasked(maskApiKey(whisperKey));
      setWhisperKey('');
      await refreshApiKeyStatus();
      Alert.alert('Success', 'Whisper API key saved');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsSavingWhisper(false);
    }
  };

  const handleDeleteWhisperKey = async () => {
    Alert.alert(
      'Delete API Key',
      'Are you sure you want to remove your Whisper API key?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteWhisperApiKey();
            setWhisperKeyMasked('');
            await refreshApiKeyStatus();
          },
        },
      ]
    );
  };

  // Reset progress
  const handleResetProgress = () => {
    Alert.alert(
      'Reset All Progress',
      'This will delete all your review history, streaks, and reset all cards to due now. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetAllProgress();
            Alert.alert('Done', 'All progress has been reset');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Claude API Key */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="key" size={24} color="#6200EE" />
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Claude API Key
            </Text>
          </View>
          <Text variant="bodySmall" style={styles.description}>
            Required for answer evaluation
          </Text>

          {claudeKeyMasked ? (
            <View style={styles.keyDisplay}>
              <Text variant="bodyMedium" style={styles.maskedKey}>
                {claudeKeyMasked}
              </Text>
              <View style={styles.keyActions}>
                <Button
                  mode="outlined"
                  onPress={handleTestClaudeKey}
                  loading={isTestingClaude}
                  compact
                >
                  Test
                </Button>
                <Button
                  mode="outlined"
                  onPress={handleDeleteClaudeKey}
                  textColor="#F44336"
                  compact
                >
                  Remove
                </Button>
              </View>
            </View>
          ) : (
            <>
              <TextInput
                mode="outlined"
                value={claudeKey}
                onChangeText={setClaudeKey}
                placeholder="sk-ant-..."
                secureTextEntry
                style={styles.input}
              />
              <Button
                mode="contained"
                onPress={handleSaveClaudeKey}
                loading={isSavingClaude}
                disabled={!claudeKey.trim()}
                style={styles.saveButton}
              >
                Save Key
              </Button>
            </>
          )}

          <Button
            mode="text"
            onPress={() => Linking.openURL('https://console.anthropic.com/')}
            icon="open-in-new"
            compact
          >
            Get API key from Anthropic
          </Button>
        </Card.Content>
      </Card>

      {/* Whisper API Key */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="microphone" size={24} color="#FF9800" />
            <Text variant="titleLarge" style={styles.sectionTitle}>
              OpenAI Whisper API Key
            </Text>
          </View>
          <Text variant="bodySmall" style={styles.description}>
            Optional - for voice answer transcription
          </Text>

          {whisperKeyMasked ? (
            <View style={styles.keyDisplay}>
              <Text variant="bodyMedium" style={styles.maskedKey}>
                {whisperKeyMasked}
              </Text>
              <Button
                mode="outlined"
                onPress={handleDeleteWhisperKey}
                textColor="#F44336"
                compact
              >
                Remove
              </Button>
            </View>
          ) : (
            <>
              <TextInput
                mode="outlined"
                value={whisperKey}
                onChangeText={setWhisperKey}
                placeholder="sk-..."
                secureTextEntry
                style={styles.input}
              />
              <Button
                mode="contained"
                onPress={handleSaveWhisperKey}
                loading={isSavingWhisper}
                disabled={!whisperKey.trim()}
                style={styles.saveButton}
              >
                Save Key
              </Button>
            </>
          )}

          <Button
            mode="text"
            onPress={() => Linking.openURL('https://platform.openai.com/')}
            icon="open-in-new"
            compact
          >
            Get API key from OpenAI
          </Button>
        </Card.Content>
      </Card>

      {/* Data Management */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="database" size={24} color="#4CAF50" />
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Data
            </Text>
          </View>

          <List.Item
            title="Total Questions"
            description={`${questionCount} questions in your bank`}
            left={(props) => <List.Icon {...props} icon="cards" />}
          />
          <Divider />
          <List.Item
            title="Reset All Progress"
            description="Clear review history and reset spaced repetition"
            left={(props) => <List.Icon {...props} icon="refresh" color="#F44336" />}
            onPress={handleResetProgress}
          />
        </Card.Content>
      </Card>

      {/* About */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="information" size={24} color="#2196F3" />
            <Text variant="titleLarge" style={styles.sectionTitle}>
              About
            </Text>
          </View>
          <Text variant="bodyMedium" style={styles.aboutText}>
            Data Practice App helps you master data science concepts through
            spaced repetition and AI-powered feedback.
          </Text>
          <Text variant="bodySmall" style={styles.version}>
            Version 1.0.0
          </Text>
        </Card.Content>
      </Card>
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  sectionTitle: {
    marginLeft: SPACING.sm,
  },
  description: {
    color: '#666',
    marginBottom: SPACING.md,
  },
  input: {
    marginBottom: SPACING.sm,
  },
  saveButton: {
    marginBottom: SPACING.sm,
  },
  keyDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0f0f0',
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.sm,
  },
  maskedKey: {
    fontFamily: 'monospace',
  },
  keyActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  aboutText: {
    marginBottom: SPACING.sm,
    lineHeight: 22,
  },
  version: {
    color: '#999',
  },
});
