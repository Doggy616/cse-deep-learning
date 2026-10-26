import { CONTENT_VERSION, emptyData, recordAttempt, type LearningData } from './model';
import { questions, topics } from './content';
const DB_NAME = 'zhuan-deep-learning';
let connection: Promise<IDBDatabase> | undefined;
function database(): Promise<IDBDatabase> {
  if (!connection) connection = new Promise((resolve,reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('state');
    request.onsuccess = () => { const db = request.result; db.onversionchange = () => { db.close(); connection = undefined; }; resolve(db); };
    request.onerror = () => { connection = undefined; reject(request.error); };
    request.onblocked = () => { connection = undefined; reject(new Error('数据库升级受其他页面阻塞，请关闭其他标签页后重试')); };
  });
  return connection;
}
export async function loadData(): Promise<LearningData> {
  const db = await database();
  return new Promise((resolve,reject) => {
    const tx = db.transaction('state','readonly');
    const request = tx.objectStore('state').get('learning');
    tx.oncomplete = () => { try { resolve(request.result ? validateData(request.result) : emptyData()); } catch (error) { reject(error); } };
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('读取已中断'));
  });
}
export async function saveData(data: LearningData): Promise<void> {
  const db = await database();
  return new Promise((resolve,reject) => {
    const tx = db.transaction('state','readwrite');
    tx.objectStore('state').put(data,'learning');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('保存已中断'));
  });
}
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const validDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v));
function fail(): never { throw new Error('备份格式无效、内容版本不兼容或记录不一致。仅支持本版本导出的学习记录，不能导入题库。'); }
// Whitelist and reconstruct every field; never trust imported answers, scores or review schedules.
export function validateData(value: unknown): LearningData {
  if (!isObject(value) || value.schemaVersion !== 1 || value.contentVersion !== CONTENT_VERSION || !isObject(value.completedTopics) || !Array.isArray(value.attempts) || value.attempts.length > 50000 || !Array.isArray(value.reviews) || !isObject(value.settings)) return fail();
  const { dailyGoal, largeText } = value.settings;
  if (typeof dailyGoal !== 'number' || !Number.isInteger(dailyGoal) || dailyGoal < 1 || dailyGoal > 30 || typeof largeText !== 'boolean') return fail();
  let data = emptyData();
  for (const [id, date] of Object.entries(value.completedTopics)) {
    if (!topics.some(t => t.id === id) || !validDate(date)) return fail();
    data.completedTopics[id] = date;
  }
  const ids = new Set<string>();
  let previousTime = -Infinity;
  for (const a of value.attempts) {
    if (!isObject(a) || typeof a.id !== 'string' || !a.id || a.id.length > 100 || ids.has(a.id) || !validDate(a.createdAt) || !Array.isArray(a.selected) || !a.selected.every((x: unknown) => typeof x === 'string')) return fail();
    const q = questions.find(q => q.id === a.questionId);
    const time = Date.parse(a.createdAt);
    if (!q || a.questionVersion !== q.source.version || a.sourceId !== q.source.sourceId || time < previousTime) return fail();
    previousTime = time; ids.add(a.id);
    try { data = recordAttempt(data, q, a.selected as string[], new Date(a.createdAt)); } catch { return fail(); }
    const rebuilt = data.attempts[data.attempts.length - 1];
    if (rebuilt.correct !== a.correct || rebuilt.grading !== a.grading) return fail();
    rebuilt.id = a.id;
  }
  if (JSON.stringify([...data.reviews].sort((a,b) => a.questionId.localeCompare(b.questionId))) !== JSON.stringify([...value.reviews].map(r => {
    if (!isObject(r) || typeof r.questionId !== 'string' || !validDate(r.dueAt) || typeof r.streak !== 'number') return fail();
    return {questionId: r.questionId, dueAt: r.dueAt, streak: r.streak};
  }).sort((a,b) => a.questionId.localeCompare(b.questionId)))) return fail();
  data.settings = { dailyGoal, largeText };
  return data;
}
export function exportBackup(data: LearningData): string {
  return JSON.stringify({ app: '注安深度学习系统', exportedAt: new Date().toISOString(), data }, null, 2);
}
export function parseBackup(text: string): LearningData {
  if (new Blob([text]).size > 10 * 1024 * 1024) throw new Error('文件超过 10 MB 上限');
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('不是有效的 JSON 备份文件'); }
  if (!isObject(value) || value.app !== '注安深度学习系统') return fail();
  return validateData(value.data);
}
