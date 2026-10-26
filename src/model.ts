export const SUBJECTS = ['安全生产法律法规', '安全生产管理', '安全生产技术基础', '安全生产专业实务'] as const;
export type Subject = typeof SUBJECTS[number];
export type ReviewStatus = 'unverified' | 'reviewed' | 'rejected';
export interface Provenance {
  sourceId: string;
  title: string;
  kind: 'original-demo' | 'markdown' | 'official';
  version: string;
  reviewStatus: ReviewStatus;
  reviewer?: string;
  reviewedAt?: string;
  locator?: string;
}
export interface AnswerConflict {
  id: string;
  sourceId: string;
  proposedAnswers: string[];
  note: string;
  resolved: boolean;
}
export interface Topic {
  id: string; title: string; summary: string; subjects: Subject[];
  minutes: number; source: Provenance;
  sections: { title: string; body: string; takeaway: string }[];
}
export interface Question {
  id: string; topicId: string; subject: Subject;
  mode: 'case' | 'variant'; type: 'single' | 'multiple';
  title: string; scenario: string; prompt: string;
  options: { id: string; text: string; explanation: string }[];
  answer: string[]; principle: string; source: Provenance;
  conflicts: AnswerConflict[];
  formal: boolean;
  reversal?: string;
}
export interface Attempt {
  id: string; questionId: string; selected: string[]; correct: boolean;
  createdAt: string; questionVersion: string; sourceId: string;
  grading: 'demo' | 'formal' | 'practice';
}
export interface ReviewItem { questionId: string; dueAt: string; streak: number }
export interface Settings { dailyGoal: number; largeText: boolean }
export interface LearningData {
  schemaVersion: 1;
  contentVersion: string;
  completedTopics: Record<string, string>;
  attempts: Attempt[];
  reviews: ReviewItem[];
  settings: Settings;
}
export const CONTENT_VERSION = '0.1.0-demo.1';
export function emptyData(): LearningData {
  return { schemaVersion: 1, contentVersion: CONTENT_VERSION, completedTopics: {}, attempts: [], reviews: [], settings: { dailyGoal: 5, largeText: false } };
}
// Formal scoring is denied by default. Original demos never enter the formal bank.
export function eligibleForFormal(q: Question): boolean {
  return q.formal && q.source.kind !== 'original-demo' && q.source.reviewStatus === 'reviewed'
    && Boolean(q.source.reviewer?.trim()) && Boolean(q.source.reviewedAt && Number.isFinite(Date.parse(q.source.reviewedAt)))
    && q.conflicts.every(c => c.resolved) && q.answer.length > 0
    && new Set(q.answer).size === q.answer.length
    && (q.type === 'multiple' || q.answer.length === 1)
    && q.answer.every(a => q.options.some(o => o.id === a));
}
export function sameAnswers(a: string[], b: string[]): boolean {
  return a.length === b.length && new Set(a).size === a.length && [...a].sort().join('|') === [...b].sort().join('|');
}
export function recordAttempt(data: LearningData, q: Question, selected: string[], now = new Date()): LearningData {
  if (!selected.length || new Set(selected).size !== selected.length || selected.some(s => !q.options.some(o => o.id === s)) || (q.type === 'single' && selected.length !== 1)) throw new Error('请选择有效选项');
  const correct = sameAnswers(selected, q.answer);
  const old = data.reviews.find(r => r.questionId === q.id);
  const streak = correct ? Math.min((old?.streak ?? 0) + 1, 4) : 0;
  const delayDays = correct ? [1, 1, 3, 7, 14][streak] : 0;
  const dueAt = new Date(now.getTime() + delayDays * 86400000).toISOString();
  const grading: Attempt['grading'] = eligibleForFormal(q) ? 'formal' : q.source.kind === 'original-demo' ? 'demo' : 'practice';
  return { ...data,
    attempts: [...data.attempts, { id: crypto.randomUUID(), questionId: q.id, selected: [...selected], correct, createdAt: now.toISOString(), questionVersion: q.source.version, sourceId: q.source.sourceId, grading }],
    reviews: [...data.reviews.filter(r => r.questionId !== q.id), { questionId: q.id, dueAt, streak }]
  };
}
export function dueReviews(data: LearningData, now = new Date()): ReviewItem[] {
  return data.reviews.filter(r => Date.parse(r.dueAt) <= now.getTime()).sort((a,b) => a.dueAt.localeCompare(b.dueAt));
}

export interface AnswerClaim { sourceId: string; version: string; answers: string[] }
// Compare normalized answer sets when future Markdown sources are curated.
// A detected disagreement must be explicitly resolved by a reviewer.
export function detectAnswerConflicts(question: Question, claims: AnswerClaim[]): AnswerConflict[] {
  return claims.filter(claim => !sameAnswers(claim.answers, question.answer)).map((claim, index) => ({
    id: `${question.id}-conflict-${index}`, sourceId: claim.sourceId,
    proposedAnswers: [...claim.answers],
    note: `来源版本 ${claim.version} 的答案与当前参考答案不同，需人工核验`, resolved: false
  }));
}
