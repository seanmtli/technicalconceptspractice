// Technical definition questions inspired by technically.dev/universe
// Covers Software Fundamentals, DevOps, and enriched existing categories

import { Category, Difficulty, SourceReference } from '../types';

interface TechnicalDefinition {
  prompt: string;
  category: Category;
  difficulty: Difficulty;
  keyConcepts: string[];
  sourceReferences?: SourceReference[];
}

const UNIVERSE_SOURCE: SourceReference = {
  url: 'https://technically.dev/universe',
  title: 'technically.dev Universe',
  accessLevel: 'free',
};

export const TECHNICAL_DEFINITIONS: TechnicalDefinition[] = [
  // ============ FUNDAMENTALS (20 questions) ============

  // API
  {
    prompt: 'What is an API? Explain why APIs are essential for modern software systems.',
    category: 'fundamentals',
    difficulty: 'beginner',
    keyConcepts: [
      'Application Programming Interface',
      'contract between systems',
      'abstraction layer',
      'request/response patterns',
      'decoupling services',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // HTTP
  {
    prompt: 'Explain how HTTP works. What are the key HTTP methods and when would you use each?',
    category: 'fundamentals',
    difficulty: 'beginner',
    keyConcepts: [
      'request/response protocol',
      'GET for reading, POST for creating',
      'PUT/PATCH for updating, DELETE for removing',
      'status codes (2xx success, 4xx client error, 5xx server error)',
      'stateless nature',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Backend vs Frontend
  {
    prompt: 'Compare backend and frontend development. How do they communicate in a typical web application?',
    category: 'fundamentals',
    difficulty: 'beginner',
    keyConcepts: [
      'server-side vs client-side',
      'API communication',
      'data persistence on backend',
      'UI rendering on frontend',
      'security boundary differences',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Cache
  {
    prompt: 'What is caching and why is it important? Explain different caching strategies and their trade-offs.',
    category: 'fundamentals',
    difficulty: 'intermediate',
    keyConcepts: [
      'storing data closer to requester',
      'cache invalidation challenges',
      'TTL (time-to-live)',
      'CDN vs application cache vs database cache',
      'cache-aside vs write-through patterns',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // DNS
  {
    prompt: 'Explain how DNS works. What happens when you type a URL into your browser?',
    category: 'fundamentals',
    difficulty: 'intermediate',
    keyConcepts: [
      'domain name to IP address resolution',
      'hierarchical DNS system',
      'DNS caching at multiple levels',
      'A records, CNAME records',
      'propagation delays',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Authentication
  {
    prompt: 'Explain authentication vs authorization. How do OAuth and JWT work?',
    category: 'fundamentals',
    difficulty: 'intermediate',
    keyConcepts: [
      'authentication = identity verification',
      'authorization = permission checking',
      'OAuth for delegated access',
      'JWT structure (header.payload.signature)',
      'tokens vs sessions trade-offs',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Webhooks
  {
    prompt: 'What are webhooks? Compare webhooks to polling and explain when to use each approach.',
    category: 'fundamentals',
    difficulty: 'intermediate',
    keyConcepts: [
      'push-based notifications',
      'HTTP callbacks',
      'real-time vs periodic updates',
      'webhook security (signatures)',
      'reliability and retry mechanisms',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Cloud Computing
  {
    prompt: 'What is cloud computing? Explain IaaS, PaaS, and SaaS with examples of each.',
    category: 'fundamentals',
    difficulty: 'beginner',
    keyConcepts: [
      'on-demand computing resources',
      'IaaS (EC2, compute instances)',
      'PaaS (Heroku, managed platforms)',
      'SaaS (Slack, end-user applications)',
      'pay-as-you-go model',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Open Source
  {
    prompt: 'What is open source software? Explain different open source licenses and their implications.',
    category: 'fundamentals',
    difficulty: 'beginner',
    keyConcepts: [
      'publicly available source code',
      'permissive vs copyleft licenses',
      'MIT, Apache, GPL differences',
      'community contribution model',
      'commercial use considerations',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Technical Debt
  {
    prompt: 'What is technical debt? How do teams identify, measure, and manage it?',
    category: 'fundamentals',
    difficulty: 'intermediate',
    keyConcepts: [
      'shortcuts that require future rework',
      'intentional vs unintentional debt',
      'interest accumulation over time',
      'code quality metrics',
      'refactoring strategies',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Rate Limiting
  {
    prompt: 'What is rate limiting and why is it important? Describe common rate limiting algorithms.',
    category: 'fundamentals',
    difficulty: 'intermediate',
    keyConcepts: [
      'protecting services from overload',
      'token bucket algorithm',
      'sliding window counters',
      'rate limit headers (X-RateLimit-*)',
      'graceful degradation',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // IP Address
  {
    prompt: 'What is an IP address? Explain IPv4 vs IPv6 and the concept of subnetting.',
    category: 'fundamentals',
    difficulty: 'beginner',
    keyConcepts: [
      'unique network identifier',
      'IPv4 (32-bit) vs IPv6 (128-bit)',
      'public vs private addresses',
      'CIDR notation',
      'NAT (Network Address Translation)',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Server
  {
    prompt: 'What is a server? Explain different types of servers and their roles in a system.',
    category: 'fundamentals',
    difficulty: 'beginner',
    keyConcepts: [
      'computer that provides services',
      'web servers (nginx, Apache)',
      'application servers',
      'database servers',
      'load balancers',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Client
  {
    prompt: 'What is a client in client-server architecture? Explain thin vs thick clients.',
    category: 'fundamentals',
    difficulty: 'beginner',
    keyConcepts: [
      'consumer of server services',
      'thin client (browser-based)',
      'thick client (desktop apps)',
      'mobile clients',
      'API clients',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // REST
  {
    prompt: 'What is REST? Explain RESTful API design principles and constraints.',
    category: 'fundamentals',
    difficulty: 'intermediate',
    keyConcepts: [
      'Representational State Transfer',
      'resource-based URLs',
      'stateless communication',
      'HTTP methods for CRUD operations',
      'HATEOAS principle',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // JSON
  {
    prompt: 'What is JSON? Compare JSON to XML and explain when you would use each.',
    category: 'fundamentals',
    difficulty: 'beginner',
    keyConcepts: [
      'JavaScript Object Notation',
      'lightweight data interchange format',
      'human-readable text',
      'key-value pairs and arrays',
      'language-independent',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Encryption
  {
    prompt: 'What is encryption? Explain symmetric vs asymmetric encryption and their use cases.',
    category: 'fundamentals',
    difficulty: 'intermediate',
    keyConcepts: [
      'converting plaintext to ciphertext',
      'symmetric (AES) - same key',
      'asymmetric (RSA) - public/private keys',
      'HTTPS/TLS encryption',
      'encryption at rest vs in transit',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Latency
  {
    prompt: 'What is latency? How do you measure and optimize latency in distributed systems?',
    category: 'fundamentals',
    difficulty: 'intermediate',
    keyConcepts: [
      'time delay in data transmission',
      'network latency vs processing latency',
      'P50, P95, P99 percentiles',
      'CDNs and edge computing',
      'connection pooling',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Concurrency
  {
    prompt: 'What is concurrency? Explain the difference between concurrency and parallelism.',
    category: 'fundamentals',
    difficulty: 'advanced',
    keyConcepts: [
      'handling multiple tasks simultaneously',
      'concurrency = structure, parallelism = execution',
      'threads vs processes',
      'race conditions and deadlocks',
      'synchronization primitives (mutex, semaphore)',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Idempotency
  {
    prompt: 'What is idempotency? Why is it important for API design and distributed systems?',
    category: 'fundamentals',
    difficulty: 'intermediate',
    keyConcepts: [
      'same operation produces same result',
      'safe to retry without side effects',
      'GET, PUT, DELETE are idempotent',
      'POST is typically not idempotent',
      'idempotency keys for payments',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // ============ DEVOPS (17 questions) ============

  // Docker
  {
    prompt: 'What is Docker? Explain how containerization differs from virtual machines.',
    category: 'devops',
    difficulty: 'beginner',
    keyConcepts: [
      'containers share host OS kernel',
      'VMs include full OS',
      'image layers and caching',
      'Dockerfile defines build steps',
      'resource efficiency vs isolation trade-off',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Kubernetes
  {
    prompt: 'What is Kubernetes and what problems does it solve? Explain pods, services, and deployments.',
    category: 'devops',
    difficulty: 'intermediate',
    keyConcepts: [
      'container orchestration at scale',
      'pods as smallest deployable units',
      'services for stable networking',
      'deployments for rollout management',
      'declarative configuration',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // CI/CD
  {
    prompt: 'Explain CI/CD pipelines. Why are continuous integration and continuous deployment important?',
    category: 'devops',
    difficulty: 'beginner',
    keyConcepts: [
      'CI = automated testing on every commit',
      'CD = automated deployment to environments',
      'fast feedback loops',
      'reduced integration risk',
      'pipeline stages (build, test, deploy)',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Microservices
  {
    prompt: 'What are microservices? Compare microservice architecture to monolithic applications.',
    category: 'devops',
    difficulty: 'intermediate',
    keyConcepts: [
      'small, independently deployable services',
      'bounded contexts',
      'distributed complexity trade-off',
      'service communication patterns',
      'when monolith is better',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Serverless
  {
    prompt: 'What is serverless computing? Explain its benefits, limitations, and common use cases.',
    category: 'devops',
    difficulty: 'intermediate',
    keyConcepts: [
      'cloud provider manages infrastructure',
      'pay per execution',
      'AWS Lambda, Cloud Functions',
      'cold start latency',
      'event-driven architectures',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Git
  {
    prompt: 'Explain Git branching strategies. Compare GitFlow, trunk-based development, and GitHub Flow.',
    category: 'devops',
    difficulty: 'intermediate',
    keyConcepts: [
      'branching for parallel development',
      'GitFlow (feature/develop/release branches)',
      'trunk-based (main branch + short-lived branches)',
      'GitHub Flow (simplified branching)',
      'merge vs rebase strategies',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Pull Requests
  {
    prompt: 'What is a pull request? Describe best practices for code review in a team.',
    category: 'devops',
    difficulty: 'beginner',
    keyConcepts: [
      'request to merge code changes',
      'code review process',
      'automated checks (CI, linting)',
      'constructive feedback practices',
      'approval workflows',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Deployment Strategies
  {
    prompt: 'Compare deployment strategies: blue-green, canary, and rolling deployments.',
    category: 'devops',
    difficulty: 'intermediate',
    keyConcepts: [
      'blue-green (instant switch)',
      'canary (gradual rollout)',
      'rolling (incremental replacement)',
      'rollback capabilities',
      'zero-downtime deployments',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Terminal
  {
    prompt: 'What is the terminal/command line? Explain why developers use it over GUIs.',
    category: 'devops',
    difficulty: 'beginner',
    keyConcepts: [
      'text-based interface to OS',
      'scripting and automation',
      'piping and chaining commands',
      'remote server access',
      'efficiency for repetitive tasks',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // SSH
  {
    prompt: 'What is SSH? Explain how SSH key authentication works and why it is more secure than passwords.',
    category: 'devops',
    difficulty: 'intermediate',
    keyConcepts: [
      'Secure Shell protocol',
      'encrypted remote access',
      'public/private key pairs',
      'ssh-agent for key management',
      'known_hosts for server verification',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Scaling
  {
    prompt: 'Explain horizontal vs vertical scaling. When would you choose each approach?',
    category: 'devops',
    difficulty: 'intermediate',
    keyConcepts: [
      'vertical = bigger machine',
      'horizontal = more machines',
      'load balancing for horizontal scale',
      'stateless services scale better',
      'cost and complexity trade-offs',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Version Control
  {
    prompt: 'What is version control? Explain distributed vs centralized version control systems.',
    category: 'devops',
    difficulty: 'beginner',
    keyConcepts: [
      'tracking changes over time',
      'Git as distributed VCS',
      'SVN as centralized VCS',
      'branching and merging',
      'commit history and blame',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Infrastructure as Code
  {
    prompt: 'What is Infrastructure as Code (IaC)? Compare Terraform, CloudFormation, and Pulumi.',
    category: 'devops',
    difficulty: 'intermediate',
    keyConcepts: [
      'managing infrastructure via code',
      'declarative vs imperative approaches',
      'Terraform (multi-cloud, HCL)',
      'CloudFormation (AWS-specific)',
      'version control and review for infra',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Logging
  {
    prompt: 'Explain the importance of logging in production systems. What makes a good logging strategy?',
    category: 'devops',
    difficulty: 'intermediate',
    keyConcepts: [
      'capturing system behavior',
      'log levels (DEBUG, INFO, WARN, ERROR)',
      'structured logging (JSON)',
      'log aggregation (ELK, Datadog)',
      'correlation IDs for tracing',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Monitoring
  {
    prompt: 'What is application monitoring? Explain the difference between metrics, logs, and traces.',
    category: 'devops',
    difficulty: 'intermediate',
    keyConcepts: [
      'observability pillars',
      'metrics = numerical measurements',
      'logs = event records',
      'traces = request flow across services',
      'alerting and dashboards',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Load Balancer
  {
    prompt: 'What is a load balancer? Explain different load balancing algorithms and their use cases.',
    category: 'devops',
    difficulty: 'intermediate',
    keyConcepts: [
      'distributing traffic across servers',
      'round-robin algorithm',
      'least connections algorithm',
      'health checks',
      'Layer 4 vs Layer 7 load balancing',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Environment Variables
  {
    prompt: 'What are environment variables? How should sensitive configuration be managed in applications?',
    category: 'devops',
    difficulty: 'beginner',
    keyConcepts: [
      'configuration outside code',
      'different values per environment',
      'secrets management (Vault, AWS Secrets)',
      '.env files for local development',
      'never commit secrets to git',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // ============ SQL / DATABASES (8 questions) ============

  // Database Basics
  {
    prompt: 'What is a database? Explain the role of a DBMS and different types of databases.',
    category: 'sql',
    difficulty: 'beginner',
    keyConcepts: [
      'organized collection of data',
      'DBMS manages data access',
      'relational databases (PostgreSQL, MySQL)',
      'document databases (MongoDB)',
      'key-value stores (Redis)',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // SQL Query
  {
    prompt: 'What is a SQL query? Explain the main clauses (SELECT, FROM, WHERE, GROUP BY, ORDER BY).',
    category: 'sql',
    difficulty: 'beginner',
    keyConcepts: [
      'structured query language',
      'SELECT specifies columns',
      'FROM specifies tables',
      'WHERE filters rows',
      'GROUP BY aggregates, ORDER BY sorts',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Schema
  {
    prompt: 'What is a database schema? Explain normalization and when denormalization is appropriate.',
    category: 'sql',
    difficulty: 'intermediate',
    keyConcepts: [
      'structure definition for data',
      'tables, columns, relationships',
      'normalization reduces redundancy',
      'denormalization for read performance',
      'normal forms (1NF, 2NF, 3NF)',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // SQL vs NoSQL
  {
    prompt: 'Compare SQL and NoSQL databases. When would you choose each?',
    category: 'sql',
    difficulty: 'intermediate',
    keyConcepts: [
      'SQL: structured, ACID, relationships',
      'NoSQL: flexible schema, horizontal scale',
      'document stores for varied structures',
      'graph databases for relationships',
      'CAP theorem considerations',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // ORM
  {
    prompt: 'What is an ORM? Explain its benefits and drawbacks compared to raw SQL.',
    category: 'sql',
    difficulty: 'intermediate',
    keyConcepts: [
      'Object-Relational Mapping',
      'maps objects to database tables',
      'reduces boilerplate code',
      'can hide inefficient queries',
      'examples: SQLAlchemy, Prisma, Hibernate',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Database Migration
  {
    prompt: 'What are database migrations? How do teams manage schema changes safely in production?',
    category: 'sql',
    difficulty: 'intermediate',
    keyConcepts: [
      'version-controlled schema changes',
      'up and down migrations',
      'migration tools (Alembic, Flyway)',
      'backward-compatible changes',
      'rolling deployments with migrations',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Indexes
  {
    prompt: 'What is a database index? Explain when to use indexes and their trade-offs.',
    category: 'sql',
    difficulty: 'intermediate',
    keyConcepts: [
      'data structure for faster lookups',
      'B-tree vs hash indexes',
      'speeds up reads, slows writes',
      'composite indexes',
      'covering indexes',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Transactions
  {
    prompt: 'What is a database transaction? Explain ACID properties and isolation levels.',
    category: 'sql',
    difficulty: 'advanced',
    keyConcepts: [
      'atomic unit of work',
      'Atomicity, Consistency, Isolation, Durability',
      'isolation levels (read committed, serializable)',
      'deadlocks and locking',
      'optimistic vs pessimistic locking',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // ============ DATA PLATFORMS (10 questions) ============

  // Data Lake vs Data Warehouse
  {
    prompt: 'Compare data lakes and data warehouses. When would you use each?',
    category: 'data-platforms',
    difficulty: 'intermediate',
    keyConcepts: [
      'structured vs unstructured data',
      'schema-on-read vs schema-on-write',
      'query performance characteristics',
      'cost profiles',
      'modern lakehouse convergence',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // ETL
  {
    prompt: 'What is ETL? Explain the Extract, Transform, Load process and modern alternatives like ELT.',
    category: 'data-platforms',
    difficulty: 'beginner',
    keyConcepts: [
      'Extract from source systems',
      'Transform to target schema',
      'Load into destination',
      'ELT leverages warehouse compute',
      'batch vs streaming',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Kafka
  {
    prompt: 'What is Apache Kafka? Explain its architecture and common use cases.',
    category: 'data-platforms',
    difficulty: 'intermediate',
    keyConcepts: [
      'distributed event streaming platform',
      'topics, partitions, consumer groups',
      'high throughput and durability',
      'event-driven architectures',
      'log compaction',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Reverse ETL
  {
    prompt: 'What is Reverse ETL? Explain why it has become important in modern data stacks.',
    category: 'data-platforms',
    difficulty: 'intermediate',
    keyConcepts: [
      'syncing data from warehouse to tools',
      'operational analytics',
      'activating data in business tools',
      'Census, Hightouch examples',
      'data warehouse as source of truth',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Modern Data Stack
  {
    prompt: 'What is the "Modern Data Stack"? Describe its typical components and architecture.',
    category: 'data-platforms',
    difficulty: 'intermediate',
    keyConcepts: [
      'cloud-native data tools',
      'ingestion (Fivetran, Airbyte)',
      'warehouse (Snowflake, BigQuery)',
      'transformation (dbt)',
      'BI and visualization layer',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Vector Database
  {
    prompt: 'What is a vector database and why has it become important for AI applications?',
    category: 'data-platforms',
    difficulty: 'intermediate',
    keyConcepts: [
      'stores embedding vectors',
      'similarity search (cosine, euclidean)',
      'enables semantic search',
      'RAG architecture component',
      'examples: Pinecone, Weaviate, pgvector',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // GraphQL
  {
    prompt: 'What is GraphQL? Compare it to REST APIs and explain when to use each.',
    category: 'data-platforms',
    difficulty: 'intermediate',
    keyConcepts: [
      'query language for APIs',
      'client specifies exact data needed',
      'single endpoint vs multiple',
      'avoids over/under-fetching',
      'schema and type system',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Data Pipeline
  {
    prompt: 'What is a data pipeline? Explain orchestration tools like Airflow and Dagster.',
    category: 'data-platforms',
    difficulty: 'intermediate',
    keyConcepts: [
      'automated data flow between systems',
      'DAG (Directed Acyclic Graph)',
      'scheduling and dependencies',
      'monitoring and alerting',
      'backfilling and retries',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Data Modeling
  {
    prompt: 'What is data modeling? Explain dimensional modeling and the star schema.',
    category: 'data-platforms',
    difficulty: 'intermediate',
    keyConcepts: [
      'structuring data for analysis',
      'fact tables (measurements)',
      'dimension tables (context)',
      'star vs snowflake schema',
      'slowly changing dimensions',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // dbt
  {
    prompt: 'What is dbt (data build tool)? Explain how it fits into the modern data stack.',
    category: 'data-platforms',
    difficulty: 'intermediate',
    keyConcepts: [
      'SQL-based transformation tool',
      'version-controlled analytics code',
      'testing and documentation',
      'modular SQL with refs',
      'runs inside the warehouse',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // ============ LLM FUNDAMENTALS (6 questions) ============

  // Machine Learning Basics
  {
    prompt: 'What is machine learning? Explain supervised, unsupervised, and reinforcement learning.',
    category: 'llm-fundamentals',
    difficulty: 'beginner',
    keyConcepts: [
      'learning patterns from data',
      'supervised (labeled data)',
      'unsupervised (finding structure)',
      'reinforcement (reward-based)',
      'training vs inference',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // LLM
  {
    prompt: 'What is a Large Language Model (LLM)? Explain how it differs from traditional ML models.',
    category: 'llm-fundamentals',
    difficulty: 'beginner',
    keyConcepts: [
      'neural network trained on text',
      'billions of parameters',
      'transformer architecture',
      'emergent capabilities',
      'general-purpose vs task-specific',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Training
  {
    prompt: 'Explain how neural networks are trained. What are loss functions and backpropagation?',
    category: 'llm-fundamentals',
    difficulty: 'intermediate',
    keyConcepts: [
      'iterative weight adjustment',
      'loss function measures error',
      'backpropagation computes gradients',
      'gradient descent optimization',
      'epochs and batches',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Pre-training
  {
    prompt: 'What is pre-training in LLMs? Explain self-supervised learning and next-token prediction.',
    category: 'llm-fundamentals',
    difficulty: 'intermediate',
    keyConcepts: [
      'learning from unlabeled data',
      'next-token prediction objective',
      'massive compute requirements',
      'foundation model creation',
      'transfer learning basis',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Fine-tuning
  {
    prompt: 'What is fine-tuning? Compare fine-tuning, RLHF, and prompt engineering.',
    category: 'llm-fundamentals',
    difficulty: 'intermediate',
    keyConcepts: [
      'adapting pre-trained model to task',
      'RLHF for alignment',
      'instruction tuning',
      'LoRA and parameter-efficient methods',
      'prompt engineering as alternative',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Embeddings
  {
    prompt: 'What are embeddings in machine learning? How are they used in semantic search and RAG?',
    category: 'llm-fundamentals',
    difficulty: 'intermediate',
    keyConcepts: [
      'dense vector representations',
      'capturing semantic meaning',
      'similarity via distance metrics',
      'word2vec, sentence transformers',
      'retrieval-augmented generation',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // ============ A/B TESTING / ANALYTICS (5 questions) ============

  // Analytics
  {
    prompt: 'What is product analytics? Explain the difference between descriptive, diagnostic, and predictive analytics.',
    category: 'ab-testing',
    difficulty: 'beginner',
    keyConcepts: [
      'measuring user behavior',
      'descriptive (what happened)',
      'diagnostic (why it happened)',
      'predictive (what will happen)',
      'event tracking fundamentals',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Metrics
  {
    prompt: 'What makes a good metric? Explain leading vs lagging indicators and proxy metrics.',
    category: 'ab-testing',
    difficulty: 'intermediate',
    keyConcepts: [
      'measurable, actionable, relevant',
      'leading indicators predict outcomes',
      'lagging indicators confirm results',
      'proxy metrics as approximations',
      'metric hierarchies',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Benchmarking
  {
    prompt: 'What is benchmarking? How do you establish and use benchmarks effectively?',
    category: 'ab-testing',
    difficulty: 'intermediate',
    keyConcepts: [
      'comparing against standards',
      'internal vs external benchmarks',
      'industry benchmarks',
      'establishing baselines',
      'continuous improvement tracking',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Cohort Analysis
  {
    prompt: 'What is cohort analysis? Explain how it helps understand user behavior over time.',
    category: 'ab-testing',
    difficulty: 'intermediate',
    keyConcepts: [
      'grouping users by common characteristic',
      'tracking cohorts over time',
      'retention curves',
      'identifying behavior patterns',
      'comparing feature impact across cohorts',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },

  // Funnel Analysis
  {
    prompt: 'What is funnel analysis? Explain conversion funnels and how to identify drop-off points.',
    category: 'ab-testing',
    difficulty: 'intermediate',
    keyConcepts: [
      'sequential steps toward goal',
      'conversion rates between steps',
      'identifying bottlenecks',
      'funnel visualization',
      'optimizing for conversion',
    ],
    sourceReferences: [UNIVERSE_SOURCE],
  },
];
