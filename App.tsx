import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PaperProvider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AppProvider, useApp } from './src/context/AppContext';
import { theme } from './src/constants/theme';
import { RootTabParamList, HomeStackParamList, QuestionsStackParamList } from './src/types';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import PracticeScreen from './src/screens/PracticeScreen';
import SessionCompleteScreen from './src/screens/SessionCompleteScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import QuestionBankScreen from './src/screens/QuestionBankScreen';
import QuestionDetailScreen from './src/screens/QuestionDetailScreen';
import GenerateQuestionsScreen from './src/screens/GenerateQuestionsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Create navigators
const Tab = createBottomTabNavigator<RootTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const QuestionsStack = createNativeStackNavigator<QuestionsStackParamList>();

// Home Stack Navigator
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Data Practice' }}
      />
      <HomeStack.Screen
        name="Practice"
        component={PracticeScreen}
        options={{
          title: 'Practice',
          headerBackVisible: false, // Prevent accidental back during practice
        }}
      />
      <HomeStack.Screen
        name="SessionComplete"
        component={SessionCompleteScreen}
        options={{
          title: 'Session Complete',
          headerBackVisible: false,
        }}
      />
    </HomeStack.Navigator>
  );
}

// Questions Stack Navigator
function QuestionsStackNavigator() {
  return (
    <QuestionsStack.Navigator>
      <QuestionsStack.Screen
        name="QuestionBank"
        component={QuestionBankScreen}
        options={{ title: 'Question Bank' }}
      />
      <QuestionsStack.Screen
        name="QuestionDetail"
        component={QuestionDetailScreen}
        options={{ title: 'Question' }}
      />
      <QuestionsStack.Screen
        name="GenerateQuestions"
        component={GenerateQuestionsScreen}
        options={{ title: 'Generate Questions' }}
      />
    </QuestionsStack.Navigator>
  );
}

// Main Tab Navigator
function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof MaterialCommunityIcons.glyphMap;

          switch (route.name) {
            case 'HomeTab':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'ProgressTab':
              iconName = focused ? 'chart-bar' : 'chart-bar';
              break;
            case 'QuestionsTab':
              iconName = focused ? 'cards' : 'cards-outline';
              break;
            case 'SettingsTab':
              iconName = focused ? 'cog' : 'cog-outline';
              break;
            default:
              iconName = 'help';
          }

          return (
            <MaterialCommunityIcons name={iconName} size={size} color={color} />
          );
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        name="ProgressTab"
        component={ProgressScreen}
        options={{ title: 'Progress' }}
      />
      <Tab.Screen
        name="QuestionsTab"
        component={QuestionsStackNavigator}
        options={{ title: 'Questions' }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

// Loading screen while app initializes
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}

// App content with initialization check
function AppContent() {
  const { state } = useApp();

  if (!state.isInitialized) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <MainNavigator />
    </NavigationContainer>
  );
}

// Root component
export default function App() {
  return (
    <PaperProvider theme={theme}>
      <AppProvider>
        <StatusBar style="auto" />
        <AppContent />
      </AppProvider>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
