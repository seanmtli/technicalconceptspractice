import { Category } from './types';

export interface CategoryInfo {
  id: Category;
  label: string;
  color: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'statistics', label: 'Statistics & Probability', color: '#4CAF50' },
  { id: 'machine-learning', label: 'Machine Learning', color: '#2196F3' },
  { id: 'python-pandas', label: 'Python/Pandas', color: '#FF9800' },
  { id: 'sql', label: 'SQL', color: '#9C27B0' },
  { id: 'ab-testing', label: 'A/B Testing', color: '#F44336' },
  { id: 'visualization', label: 'Data Visualization', color: '#00BCD4' },
  { id: 'feature-engineering', label: 'Feature Engineering', color: '#795548' },
  { id: 'llm-fundamentals', label: 'LLM Fundamentals', color: '#E91E63' },
  { id: 'ml-infrastructure', label: 'ML Infrastructure', color: '#607D8B' },
  { id: 'data-platforms', label: 'Data Platforms', color: '#3F51B5' },
  { id: 'fundamentals', label: 'Software Fundamentals', color: '#009688' },
  { id: 'devops', label: 'DevOps & Infrastructure', color: '#FF5722' },
  { id: 'system-design', label: 'System Design', color: '#673AB7' },
  { id: 'ai-agents', label: 'AI Agents & MCP', color: '#FFC107' },
];

export const CATEGORY_MAP: Record<Category, CategoryInfo> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
) as Record<Category, CategoryInfo>;

export const getCategoryLabel = (category: Category): string =>
  CATEGORY_MAP[category]?.label ?? category;

export const getCategoryColor = (category: Category): string =>
  CATEGORY_MAP[category]?.color ?? '#757575';

export const DIFFICULTIES = [
  { id: 'beginner', label: 'Beginner', color: '#4CAF50' },
  { id: 'intermediate', label: 'Intermediate', color: '#FF9800' },
  { id: 'advanced', label: 'Advanced', color: '#F44336' },
] as const;
