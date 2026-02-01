import { Category, CategoryInfo } from '../types';

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'statistics',
    label: 'Statistics & Probability',
    color: '#4CAF50',
    icon: 'chart-bar',
  },
  {
    id: 'machine-learning',
    label: 'Machine Learning',
    color: '#2196F3',
    icon: 'robot',
  },
  {
    id: 'python-pandas',
    label: 'Python/Pandas',
    color: '#FF9800',
    icon: 'language-python',
  },
  {
    id: 'sql',
    label: 'SQL',
    color: '#9C27B0',
    icon: 'database',
  },
  {
    id: 'ab-testing',
    label: 'A/B Testing',
    color: '#F44336',
    icon: 'ab-testing',
  },
  {
    id: 'visualization',
    label: 'Data Visualization',
    color: '#00BCD4',
    icon: 'chart-line',
  },
  {
    id: 'feature-engineering',
    label: 'Feature Engineering',
    color: '#795548',
    icon: 'cog',
  },
  {
    id: 'llm-fundamentals',
    label: 'LLM Fundamentals',
    color: '#E91E63',
    icon: 'brain',
  },
  {
    id: 'ml-infrastructure',
    label: 'ML Infrastructure',
    color: '#607D8B',
    icon: 'server',
  },
  {
    id: 'data-platforms',
    label: 'Data Platforms',
    color: '#3F51B5',
    icon: 'database-cog',
  },
  {
    id: 'fundamentals',
    label: 'Software Fundamentals',
    color: '#009688',
    icon: 'code-braces',
  },
  {
    id: 'devops',
    label: 'DevOps & Infrastructure',
    color: '#FF5722',
    icon: 'cogs',
  },
];

export const CATEGORY_MAP: Record<Category, CategoryInfo> = CATEGORIES.reduce(
  (acc, cat) => {
    acc[cat.id] = cat;
    return acc;
  },
  {} as Record<Category, CategoryInfo>
);

export const getCategoryLabel = (category: Category): string => {
  return CATEGORY_MAP[category]?.label ?? category;
};

export const getCategoryColor = (category: Category): string => {
  return CATEGORY_MAP[category]?.color ?? '#757575';
};

export const DIFFICULTIES = [
  { id: 'beginner', label: 'Beginner', color: '#4CAF50' },
  { id: 'intermediate', label: 'Intermediate', color: '#FF9800' },
  { id: 'advanced', label: 'Advanced', color: '#F44336' },
] as const;

export const getDifficultyColor = (difficulty: string): string => {
  const diff = DIFFICULTIES.find((d) => d.id === difficulty);
  return diff?.color ?? '#757575';
};
