# Technical Concepts Practice

A mobile app for technical professionals to stay sharp on concepts and improve their ability to explain complex ideas clearly.

## Why This App?

Being able to clearly explain technical concepts is a crucial skill—whether you're in interviews, mentoring others, or just solidifying your own understanding. This app uses **active recall** and **spaced repetition** to help you practice explaining concepts in your own words, with AI-powered feedback to identify gaps in your understanding.

## How It Works

1. **See a concept prompt** - e.g., "Explain the bias-variance tradeoff"
2. **Explain it** - Type or speak your answer as if teaching someone
3. **Get feedback** - AI evaluates your explanation, highlighting what you covered well and what you missed
4. **Spaced repetition** - Concepts you struggle with come back sooner; mastered ones appear less frequently

## Features

- **10-minute practice sessions** - Short, focused practice that fits into your day
- **Voice or text input** - Speak your answer or type it out
- **Strict AI grading** - No hand-holding; get honest feedback on gaps in your explanations
- **Concept gap tracking** - See which concepts you consistently miss across questions
- **7 categories** - Statistics, Machine Learning, Python/Pandas, SQL, A/B Testing, Data Visualization, Feature Engineering
- **34 starter questions** - Pre-loaded question bank to get you started
- **Generate new questions** - Use AI to create questions on specific topics

## Tech Stack

- React Native + Expo
- TypeScript
- SQLite (local storage)
- Claude API (answer evaluation)
- OpenAI Whisper API (voice transcription)

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI
- iOS Simulator (Mac) or Android Emulator, or Expo Go on your phone

### Installation

```bash
# Clone the repo
git clone https://github.com/seanmtli/technicalconceptspractice.git
cd technicalconceptspractice

# Install dependencies
npm install

# Start the app
npx expo start
```

### API Keys

You'll need to add your own API keys in the app's Settings screen:

1. **Claude API Key** (required) - Get one at [console.anthropic.com](https://console.anthropic.com)
2. **OpenAI API Key** (optional, for voice input) - Get one at [platform.openai.com](https://platform.openai.com)

## Usage

1. Open the app and go to **Settings** to add your Claude API key
2. Return to **Home** and tap **Start Practice**
3. Read the question and type/record your explanation
4. Review the AI feedback and learn from gaps
5. Continue until the 10-minute session ends or you've reviewed all due cards

## License

MIT
