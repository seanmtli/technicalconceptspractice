/**
 * All LLM prompts. Placeholders use {name} and are filled with fillPrompt().
 * The drill evaluation prompt is ported from the original app; its two load-bearing
 * ideas are the concept-anchored 1-5 rubric and feedback length proportional to errors.
 */

export function fillPrompt(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, key) => values[key] ?? m);
}

export const DRILL_EVALUATION_PROMPT = `You are a strict but fair technical interviewer evaluating a candidate's explanation of a technical concept. Grade rigorously as if in a technical interview.

## Question
{question}

## Key Concepts Expected
The answer MUST cover these concepts:
{keyConcepts}

## Candidate's Answer (may be a voice transcript — ignore filler words and transcription artifacts)
{userAnswer}

## Reference Articles (use to ground your feedback; recommend the relevant ones)
{sources}

## Your Task
Evaluate strictly and provide feedback with LENGTH PROPORTIONAL TO ERRORS:
- If the answer is excellent (score 5): Keep feedback brief (1-2 sentences)
- If the answer has gaps (score 3-4): Moderate feedback explaining what's missing
- If the answer is weak (score 1-2): Detailed feedback with thorough explanations of correct concepts

Respond in this exact JSON format:
{
  "score": <1-5>,
  "whatWasCoveredWell": "<specific points explained correctly - be brief if few>",
  "whatWasMissing": "<list each missing/incorrect concept specifically>",
  "missedConcepts": ["<concept1>", "<concept2>"],
  "modelAnswer": "<complete model answer - length proportional to how much was missed>",
  "fullFeedback": "<corrective feedback - brief for good answers, detailed for weak ones>",
  "goDeeper": [{"title": "<article title>", "url": "<article url>"}]
}

Scoring Guide (STRICT):
- 5: All key concepts covered accurately AND explained clearly with proper terminology
- 4: All key concepts mentioned but explanation lacks depth or precision
- 3: Core concept understood but 1-2 key concepts missing or incorrect
- 2: Partial understanding, multiple key concepts missing or confused
- 1: Fundamental misunderstanding or mostly incorrect

The "missedConcepts" array should contain concepts from the expected list that were missing or incorrect. If the answer is excellent, this should be an empty array.
"goDeeper" must only contain articles from the Reference Articles list above that are relevant to what the candidate should study next; empty array if none listed or none relevant.

Be direct about errors. Don't soften criticism. The goal is real understanding, not comfort.
Write all feedback as plain text — no markdown, no asterisks, no headers.`;

export const CONTEXTUAL_EVALUATION_PROMPT = `You are a senior engineer evaluating how well a candidate reasons about the RELATIONSHIP between technical concepts, or applies them to a scenario. There is no single right answer — grade the quality of reasoning.

## Question
{question}

## Concepts In Play
{keyConcepts}

## Candidate's Answer (may be a voice transcript — ignore filler words and transcription artifacts)
{userAnswer}

## Reference Articles (use to ground your feedback; recommend the relevant ones)
{sources}

## Your Task
Grade on three dimensions, then give feedback with LENGTH PROPORTIONAL TO ERRORS (brief for strong answers, thorough for weak ones):
1. Accuracy — is the stated relationship/application technically correct?
2. Tradeoff awareness — do they see costs, limits, and alternatives, not just benefits?
3. Practical grounding — do they connect it to how things work in practice?

Respond in this exact JSON format:
{
  "score": <1-5>,
  "whatWasCoveredWell": "<strongest parts of their reasoning>",
  "whatWasMissing": "<gaps in accuracy, tradeoffs, or practical grounding>",
  "missedConcepts": ["<concept they misunderstood or ignored>"],
  "modelAnswer": "<how a senior engineer would answer - length proportional to how much was missed>",
  "fullFeedback": "<corrective coaching - brief for good answers, detailed for weak ones>",
  "goDeeper": [{"title": "<article title>", "url": "<article url>"}]
}

Scoring Guide:
- 5: Accurate, tradeoff-aware, practically grounded — a strong senior answer
- 4: Accurate and mostly complete but shallow on tradeoffs or practice
- 3: Core relationship right but reasoning is one-sided or vague
- 2: Partially right with significant confusion
- 1: Fundamental misunderstanding of how the concepts relate

"goDeeper" must only contain articles from the Reference Articles list above; empty array if none listed or none relevant.

Be direct. The goal is real understanding, not comfort.
Write all feedback as plain text — no markdown, no asterisks, no headers.`;

export const CONTEXTUAL_GENERATION_PROMPT = `You are an expert technical educator. Create ONE practice question that connects concepts the learner is weak on, or applies them to a realistic scenario.

## Learner's weak concepts (most-missed first)
{weakConcepts}

## Recently practiced concepts
{recentConcepts}

Write a question in one of these two shapes:
- Relational: "How does X relate to Y?" (e.g. "How does Docker relate to containerization?")
- Applied/scenario: "How would you think about X in situation Y?" (e.g. "How do you think about the ROI of an AI agent?")

Pick 2-3 concepts from the lists above, favoring the weak ones. The question should be answerable in a 1-3 minute spoken explanation.

Respond in this exact JSON format:
{
  "prompt": "<the question>",
  "keyConcepts": ["<concept1>", "<concept2>"],
  "category": "<one of: {categories}>"
}`;

export const SOURCE_SUMMARY_PROMPT = `Summarize this technical article for a study-source index.

## Article: {title}
{body}

Respond in this exact JSON format:
{
  "summary": "<2-3 sentences: what the article explains and its key takeaway>",
  "concepts": ["<3-8 lowercase concept tags>"]
}

For the concept tags, prefer tags from this vocabulary when they fit (add free-form tags only when nothing fits):
{vocabulary}`;
