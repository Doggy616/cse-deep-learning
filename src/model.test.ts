import { describe, it, expect } from 'vitest';
import { questions } from './content';
import { detectAnswerConflicts, dueReviews, eligibleForFormal, emptyData, recordAttempt, sameAnswers, type Question } from './model';
import { exportBackup, loadData, parseBackup, saveData } from './storage';
const now = new Date('2026-10-26T08:00:00.000Z');
describe('审核和评分隔离', () => {
  it('所有原创演示都不能进入正式题库', () => {
    for (const q of questions) {
      expect(eligibleForFormal(q)).toBe(false);
      expect(recordAttempt(emptyData(),q,q.answer,now).attempts[0].grading).toBe('demo');
    }
  });
  it('审核身份、日期、选项合法性和未解决冲突任一缺失均阻断正式评分', () => {
    const q: Question = {...questions[0], formal:true, source:{...questions[0].source,kind:'official',reviewStatus:'reviewed',reviewer:'审核员',reviewedAt:now.toISOString()}};
    expect(eligibleForFormal(q)).toBe(true);
    expect(eligibleForFormal({...q,source:{...q.source,reviewStatus:'unverified'}})).toBe(false);
    expect(eligibleForFormal({...q,source:{...q.source,reviewer:''}})).toBe(false);
    expect(eligibleForFormal({...q,source:{...q.source,reviewedAt:'无效'}})).toBe(false);
    expect(eligibleForFormal({...q,answer:['Z']})).toBe(false);
    expect(eligibleForFormal({...q,answer:['A','A']})).toBe(false);
    expect(eligibleForFormal({...q,conflicts:[{id:'c',sourceId:'other',proposedAnswers:['B'],note:'来源答案不同',resolved:false}]})).toBe(false);
  });
  it('来源答案归一后识别冲突，生成待核验记录', () => {
    const conflicts = detectAnswerConflicts(questions[0], [
      {sourceId:'source-a',version:'1',answers:['C','A']},
      {sourceId:'source-b',version:'2',answers:['B']}
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({sourceId:'source-b',proposedAnswers:['B'],resolved:false});
  });
  it('多选题要求完整匹配，不接受重复、漏选和多选', () => {
    expect(sameAnswers(['C','A'],['A','C'])).toBe(true);
    for (const selected of [['A'],['A','B','C'],['A','A']]) expect(sameAnswers(selected,['A','C'])).toBe(false);
    expect(() => recordAttempt(emptyData(),questions[0],[])).toThrow();
    expect(() => recordAttempt(emptyData(),questions[0],['Z'])).toThrow();
  });
});
describe('学习与复习闭环', () => {
  it('错题立即到期；连续答对依次安排1/3/7/14天；再次答错重置', () => {
    let data = recordAttempt(emptyData(),questions[0],['B'],now);
    expect(dueReviews(data,now)).toHaveLength(1);
    for (const days of [1,3,7,14,14]) {
      data = recordAttempt(data,questions[0],['A','C'],now);
      expect(data.reviews).toHaveLength(1);
      expect(Date.parse(data.reviews[0].dueAt)-now.getTime()).toBe(days*86400000);
      expect(dueReviews(data,now)).toHaveLength(0);
    }
    data = recordAttempt(data,questions[0],['B'],now);
    expect(data.reviews[0].streak).toBe(0);
    expect(dueReviews(data,now)).toHaveLength(1);
  });
});
describe('备份边界与 IndexedDB', () => {
  it('真实 IndexedDB 保存、重读和备份导入往返保持学习数据', async () => {
    const data = recordAttempt({...emptyData(),completedTopics:{hazard:now.toISOString()}},questions[0],['A','C'],now);
    await saveData(data);
    expect(await loadData()).toEqual(data);
    expect(parseBackup(exportBackup(data))).toEqual(data);
  });
  it('拒绝伪造分数、正式评分标记、来源、重复记录及复习时间', () => {
    const data = recordAttempt(emptyData(),questions[0],['B'],now);
    const mutations = [
      (d: typeof data) => {d.attempts[0].correct=true;},
      (d: typeof data) => {d.attempts[0].grading='formal';},
      (d: typeof data) => {d.attempts[0].sourceId='fake';},
      (d: typeof data) => {d.attempts.push({...d.attempts[0]});},
      (d: typeof data) => {d.reviews[0].dueAt='2099-01-01T00:00:00.000Z';},
      (d: typeof data) => {d.settings.dailyGoal=999;},
      (d: typeof data) => {d.contentVersion='unknown';}
    ];
    for (const mutation of mutations) { const copy = structuredClone(data); mutation(copy); expect(() => parseBackup(exportBackup(copy))).toThrow(); }
    expect(() => parseBackup('{broken')).toThrow();
    expect(() => parseBackup(JSON.stringify({app:'other',data}))).toThrow();
    expect(() => parseBackup(' '.repeat(10*1024*1024+1))).toThrow('10 MB');
  });
});
