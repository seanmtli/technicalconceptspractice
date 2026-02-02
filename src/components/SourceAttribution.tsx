import React from 'react';
import { View, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { SourceReference } from '../types';
import { SPACING } from '../constants/theme';
import { logger } from '../utils/logger';

interface SourceAttributionProps {
  sources: SourceReference[];
  compact?: boolean;
}

export default function SourceAttribution({
  sources,
  compact = false,
}: SourceAttributionProps) {
  if (!sources || sources.length === 0) {
    return null;
  }

  const handlePress = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (error) {
      logger.error('Error opening URL', error);
    }
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <MaterialCommunityIcons name="lightbulb-outline" size={14} color="#666" />
        <Text variant="bodySmall" style={styles.compactText}>
          Inspired by{' '}
          {sources.map((source, index) => (
            <React.Fragment key={index}>
              {index > 0 && ', '}
              <Text
                style={styles.compactLink}
                onPress={() => handlePress(source.url)}
              >
                {source.title}
              </Text>
            </React.Fragment>
          ))}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="lightbulb-outline" size={16} color="#666" />
        <Text variant="labelMedium" style={styles.headerText}>
          Inspired by
        </Text>
      </View>
      {sources.map((source, index) => (
        <TouchableOpacity
          key={index}
          style={styles.sourceItem}
          onPress={() => handlePress(source.url)}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="open-in-new"
            size={14}
            color="#1976D2"
          />
          <Text variant="bodySmall" style={styles.sourceTitle}>
            {source.title}
          </Text>
          {source.accessLevel === 'partial' && (
            <Text variant="labelSmall" style={styles.accessBadge}>
              preview
            </Text>
          )}
        </TouchableOpacity>
      ))}
      <Text variant="labelSmall" style={styles.disclaimer}>
        Content from Technically.dev - technical explainers for software concepts
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: SPACING.sm,
    marginTop: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  headerText: {
    marginLeft: SPACING.xs,
    color: '#666',
    fontWeight: '600',
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.xs,
  },
  sourceTitle: {
    marginLeft: SPACING.xs,
    color: '#1976D2',
    flex: 1,
  },
  accessBadge: {
    backgroundColor: '#E3F2FD',
    color: '#1976D2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    fontSize: 10,
  },
  disclaimer: {
    color: '#999',
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  compactText: {
    marginLeft: SPACING.xs,
    color: '#666',
    flex: 1,
  },
  compactLink: {
    color: '#1976D2',
  },
});
