import { Category, Difficulty } from '../types';

interface SeedQuestion {
  prompt: string;
  category: Category;
  difficulty: Difficulty;
  keyConcepts: string[];
}

export const SEED_QUESTIONS: SeedQuestion[] = [
  // ============ Statistics & Probability (6 questions) ============
  {
    prompt:
      'Explain the difference between population and sample. Why do we use samples in statistics?',
    category: 'statistics',
    difficulty: 'beginner',
    keyConcepts: [
      'population definition',
      'sample definition',
      'practical constraints',
      'inference from sample to population',
    ],
  },
  {
    prompt:
      'What is the Central Limit Theorem and why is it important for data science?',
    category: 'statistics',
    difficulty: 'beginner',
    keyConcepts: [
      'sample means distribution',
      'normal distribution approximation',
      'sample size requirements',
      'practical applications in hypothesis testing',
    ],
  },
  {
    prompt:
      'Explain Type I and Type II errors. How do they relate to precision and recall?',
    category: 'statistics',
    difficulty: 'intermediate',
    keyConcepts: [
      'false positives (Type I)',
      'false negatives (Type II)',
      'trade-offs between error types',
      'threshold selection impact',
    ],
  },
  {
    prompt:
      'What is the difference between correlation and causation? Give an example of a spurious correlation.',
    category: 'statistics',
    difficulty: 'intermediate',
    keyConcepts: [
      'correlation coefficient interpretation',
      'confounding variables',
      'experimental design for causation',
      'spurious correlation examples',
    ],
  },
  {
    prompt:
      'Explain Bayesian vs Frequentist approaches to probability. When would you choose one over the other?',
    category: 'statistics',
    difficulty: 'advanced',
    keyConcepts: [
      'prior beliefs and updating',
      'confidence intervals vs credible intervals',
      'use cases for each approach',
      'computational considerations',
    ],
  },
  {
    prompt:
      "What is Simpson's Paradox? Describe a real-world scenario where it could mislead analysis.",
    category: 'statistics',
    difficulty: 'advanced',
    keyConcepts: [
      'aggregation bias',
      'confounding variables',
      'stratified analysis importance',
      'real-world examples',
    ],
  },

  // ============ Machine Learning Algorithms (6 questions) ============
  {
    prompt:
      'Explain the difference between supervised and unsupervised learning. Give two examples of each.',
    category: 'machine-learning',
    difficulty: 'beginner',
    keyConcepts: [
      'labeled vs unlabeled data',
      'prediction vs pattern discovery',
      'classification and regression examples',
      'clustering and dimensionality reduction examples',
    ],
  },
  {
    prompt: 'What is overfitting and how can you detect and prevent it?',
    category: 'machine-learning',
    difficulty: 'beginner',
    keyConcepts: [
      'training vs test error gap',
      'generalization failure',
      'regularization techniques',
      'cross-validation',
      'early stopping',
    ],
  },
  {
    prompt:
      'Explain how a Random Forest works and why it often outperforms a single Decision Tree.',
    category: 'machine-learning',
    difficulty: 'intermediate',
    keyConcepts: [
      'ensemble methods',
      'bagging (bootstrap aggregating)',
      'feature randomness',
      'variance reduction',
      'prediction aggregation',
    ],
  },
  {
    prompt:
      'What is regularization? Compare L1 (Lasso) and L2 (Ridge) regularization.',
    category: 'machine-learning',
    difficulty: 'intermediate',
    keyConcepts: [
      'penalty terms in loss function',
      'feature selection (L1 sparsity)',
      'coefficient shrinkage',
      'when to use L1 vs L2',
    ],
  },
  {
    prompt:
      'Explain the bias-variance tradeoff. How does model complexity affect each?',
    category: 'machine-learning',
    difficulty: 'advanced',
    keyConcepts: [
      'bias definition and sources',
      'variance definition and sources',
      'underfitting vs overfitting',
      'optimal model complexity',
    ],
  },
  {
    prompt:
      'How do gradient boosting algorithms (XGBoost, LightGBM) differ from Random Forests?',
    category: 'machine-learning',
    difficulty: 'advanced',
    keyConcepts: [
      'sequential vs parallel tree building',
      'residual/gradient learning',
      'learning rate impact',
      'regularization differences',
    ],
  },

  // ============ Python/Pandas (5 questions) ============
  {
    prompt:
      'Explain the difference between a Python list and a NumPy array. When would you use each?',
    category: 'python-pandas',
    difficulty: 'beginner',
    keyConcepts: [
      'homogeneous types in NumPy',
      'vectorized operations',
      'memory efficiency',
      'broadcasting',
    ],
  },
  {
    prompt: 'What is the difference between .loc and .iloc in Pandas?',
    category: 'python-pandas',
    difficulty: 'beginner',
    keyConcepts: [
      'label-based indexing (.loc)',
      'position-based indexing (.iloc)',
      'slicing behavior differences',
      'common use cases',
    ],
  },
  {
    prompt:
      'Explain how groupby works in Pandas. What is the split-apply-combine pattern?',
    category: 'python-pandas',
    difficulty: 'intermediate',
    keyConcepts: [
      'splitting data by groups',
      'aggregation functions',
      'transformation vs aggregation',
      'multiple column grouping',
    ],
  },
  {
    prompt:
      'What are the different ways to handle missing data in Pandas? What are the trade-offs?',
    category: 'python-pandas',
    difficulty: 'intermediate',
    keyConcepts: [
      'dropna options',
      'fillna strategies',
      'interpolation methods',
      'imputation trade-offs',
      'data loss considerations',
    ],
  },
  {
    prompt:
      'Explain method chaining in Pandas. What are its benefits and potential drawbacks?',
    category: 'python-pandas',
    difficulty: 'advanced',
    keyConcepts: [
      'functional programming style',
      'readability improvements',
      '.pipe() for custom functions',
      'memory considerations',
      'debugging challenges',
    ],
  },

  // ============ SQL (5 questions) ============
  {
    prompt: 'Explain the difference between WHERE and HAVING clauses in SQL.',
    category: 'sql',
    difficulty: 'beginner',
    keyConcepts: [
      'row-level filtering (WHERE)',
      'aggregate filtering (HAVING)',
      'execution order',
      'GROUP BY requirement for HAVING',
    ],
  },
  {
    prompt:
      'What are the different types of JOINs in SQL? Give an example use case for each.',
    category: 'sql',
    difficulty: 'beginner',
    keyConcepts: [
      'INNER JOIN',
      'LEFT/RIGHT OUTER JOIN',
      'FULL OUTER JOIN',
      'NULL handling in joins',
      'use case examples',
    ],
  },
  {
    prompt:
      'Explain window functions in SQL. How do they differ from GROUP BY aggregations?',
    category: 'sql',
    difficulty: 'intermediate',
    keyConcepts: [
      'OVER clause syntax',
      'PARTITION BY vs GROUP BY',
      'ORDER BY within windows',
      'running calculations',
      'row preservation',
    ],
  },
  {
    prompt:
      'What is a Common Table Expression (CTE) and why would you use it?',
    category: 'sql',
    difficulty: 'intermediate',
    keyConcepts: [
      'WITH clause syntax',
      'query readability',
      'recursive CTEs',
      'query organization',
      'reusability within query',
    ],
  },
  {
    prompt:
      'Explain query optimization strategies in SQL. How would you debug a slow query?',
    category: 'sql',
    difficulty: 'advanced',
    keyConcepts: [
      'EXPLAIN/EXPLAIN ANALYZE',
      'index usage and creation',
      'JOIN order optimization',
      'selectivity considerations',
      'avoiding SELECT *',
    ],
  },

  // ============ A/B Testing & Experimentation (4 questions) ============
  {
    prompt:
      'What is an A/B test and what are the key components needed to run one?',
    category: 'ab-testing',
    difficulty: 'beginner',
    keyConcepts: [
      'control and treatment groups',
      'hypothesis formulation',
      'sample size determination',
      'randomization',
      'success metric definition',
    ],
  },
  {
    prompt:
      'Explain statistical significance and p-values in the context of A/B testing.',
    category: 'ab-testing',
    difficulty: 'intermediate',
    keyConcepts: [
      'null hypothesis',
      'p-value interpretation',
      'significance threshold (alpha)',
      'Type I error relationship',
    ],
  },
  {
    prompt: 'What is statistical power and how does sample size affect it?',
    category: 'ab-testing',
    difficulty: 'intermediate',
    keyConcepts: [
      'power definition (1 - beta)',
      'effect size relationship',
      'sample size calculation',
      'Type II error trade-off',
    ],
  },
  {
    prompt:
      'What are the risks of peeking at A/B test results early? How can you mitigate them?',
    category: 'ab-testing',
    difficulty: 'advanced',
    keyConcepts: [
      'multiple testing problem',
      'inflated false positive rate',
      'sequential testing methods',
      'correction methods (Bonferroni, etc.)',
    ],
  },

  // ============ Data Visualization (4 questions) ============
  {
    prompt:
      'When would you use a bar chart vs a histogram? What does each visualize?',
    category: 'visualization',
    difficulty: 'beginner',
    keyConcepts: [
      'categorical vs continuous data',
      'frequency distribution',
      'binning in histograms',
      'comparison purposes',
    ],
  },
  {
    prompt:
      'Explain the principles of effective data visualization. What makes a chart misleading?',
    category: 'visualization',
    difficulty: 'intermediate',
    keyConcepts: [
      'appropriate chart selection',
      'axis scaling and truncation',
      'data-ink ratio',
      'colorblind accessibility',
      'context and labeling',
    ],
  },
  {
    prompt:
      'When would you use a box plot vs a violin plot? What information does each convey?',
    category: 'visualization',
    difficulty: 'intermediate',
    keyConcepts: [
      'quartiles and median (box plot)',
      'distribution shape (violin)',
      'outlier visualization',
      'density information',
    ],
  },
  {
    prompt:
      'How do you choose the right visualization for high-dimensional data?',
    category: 'visualization',
    difficulty: 'advanced',
    keyConcepts: [
      'dimensionality reduction (PCA, t-SNE)',
      'parallel coordinates',
      'small multiples',
      'interactive exploration',
    ],
  },

  // ============ Feature Engineering (4 questions) ============
  {
    prompt:
      'What is feature engineering and why is it important in machine learning?',
    category: 'feature-engineering',
    difficulty: 'beginner',
    keyConcepts: [
      'raw data transformation',
      'domain knowledge incorporation',
      'model performance impact',
      'limits of automated feature learning',
    ],
  },
  {
    prompt: 'Explain different approaches to encoding categorical variables.',
    category: 'feature-engineering',
    difficulty: 'intermediate',
    keyConcepts: [
      'one-hot encoding',
      'label/ordinal encoding',
      'target encoding',
      'high cardinality handling',
    ],
  },
  {
    prompt:
      'What is feature scaling and when is it necessary? Compare standardization and normalization.',
    category: 'feature-engineering',
    difficulty: 'intermediate',
    keyConcepts: [
      'scale-sensitive algorithms',
      'gradient descent convergence',
      'distance-based methods',
      'standardization (z-score)',
      'normalization (min-max)',
    ],
  },
  {
    prompt: 'How do you handle date/time features for machine learning models?',
    category: 'feature-engineering',
    difficulty: 'advanced',
    keyConcepts: [
      'cyclical encoding (sin/cos)',
      'lag features',
      'rolling statistics',
      'seasonality extraction',
      'time series decomposition',
    ],
  },
];
