import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { questions, topics } from './content';
import { CONTENT_VERSION, SUBJECTS, dueReviews, eligibleForFormal, emptyData, recordAttempt, type LearningData, type Question, type Subject } from './model';
import { exportBackup, loadData, parseBackup, saveData } from './storage';
import './styles.css';
type Page = 'home' | 'courses' | 'cases' | 'variants' | 'review' | 'settings';
const nav: { id: Page; icon: string; label: string }[] = [
  { id: 'home', icon: '⌂', label: '学习首页' }, { id: 'courses', icon: '▤', label: '专题课程' },
  { id: 'cases', icon: '◎', label: '综合题训练' }, { id: 'variants', icon: '⇄', label: '条件反转' },
  { id: 'review', icon: '↻', label: '精准复习' }, { id: 'settings', icon: '⚙', label: '数据与设置' }
];
const dateLabel = (date: string) => new Date(date).toLocaleString('zh-CN');
function Tag({children}: {children: ReactNode}) { return <span className="tag">{children}</span>; }
function Quiz({ q, onSubmit, busy, onCourse }: { q: Question; onSubmit: (q: Question, answer: string[]) => Promise<boolean>; busy: boolean; onCourse: () => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const correct = [...selected].sort().join() === [...q.answer].sort().join();
  async function submit() { if (await onSubmit(q, selected)) setSubmitted(true); }
  return <article className="panel quiz">
    <div className="eyebrow">{q.subject} · {q.type === 'multiple' ? '多项选择' : '单项选择'}</div>
    <h2>{q.title}</h2><p className="scenario">{q.scenario}</p>
    {q.reversal && <div className="reversal"><strong>变化的条件</strong><p>{q.reversal}</p></div>}
    <fieldset disabled={submitted || busy}><legend>{q.prompt}</legend>
      {q.options.map(o => <label key={o.id} className={`option ${selected.includes(o.id) ? 'selected' : ''}`}>
        <input type={q.type === 'multiple' ? 'checkbox' : 'radio'} name={q.id} value={o.id} checked={selected.includes(o.id)} onChange={() => setSelected(q.type === 'single' ? [o.id] : selected.includes(o.id) ? selected.filter(s => s !== o.id) : [...selected, o.id])}/>
        <span className="option-letter">{o.id}</span><span>{o.text}</span>
      </label>)}
    </fieldset>
    {!submitted ? <button className="primary" disabled={!selected.length || busy} onClick={submit}>{busy ? '正在保存…' : '提交并查看解析'}</button> : <section className="analysis" aria-live="polite">
      <h3>{correct ? '✓ 演示作答正确' : '再想一步，巩固关键条件'}</h3>
      <p>你的选择：{selected.join('、')}　参考答案：{q.answer.join('、')}</p>
      <p>{q.principle}</p>
      <h4>逐项解析</h4>{q.options.map(o => <p key={o.id}><strong>{o.id} · {q.answer.includes(o.id) ? '应选' : '不选'}</strong>　{o.explanation}</p>)}
      <p className="muted">{correct ? '已安排间隔复习，可在精准复习中查看。' : '已加入待复习，建议先回看课程，再练习。'} 本次仅记录演示掌握情况，不计入正式成绩。</p>
      <div className="actions"><button onClick={onCourse}>回看关联课程</button><button onClick={() => {setSelected([]); setSubmitted(false);}}>再练一次</button></div>
    </section>}
    <details className="source"><summary>内容来源与审核信息</summary><p>{q.source.title} · 版本 {q.source.version}</p><p>来源编号：{q.source.sourceId}；审核状态：未经核验；答案冲突：{q.conflicts.length === 0 ? '暂无已登记冲突（不代表已核验）' : '存在待处理条目'}；正式评分：{eligibleForFormal(q) ? '可用' : '禁止进入'}。</p><p>{q.source.locator}</p></details>
  </article>;
}
function PwaStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const { offlineReady: [ready], needRefresh: [refresh], updateServiceWorker } = useRegisterSW();
  const [install, setInstall] = useState<(Event & {prompt: () => Promise<void>; userChoice: Promise<{outcome: string}>}) | null>(null);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    const capture = (e: Event) => { e.preventDefault(); setInstall(e as typeof install); };
    const installed = () => setInstall(null);
    window.addEventListener('online', update); window.addEventListener('offline', update); window.addEventListener('beforeinstallprompt',capture); window.addEventListener('appinstalled',installed);
    return () => { window.removeEventListener('online',update); window.removeEventListener('offline',update); window.removeEventListener('beforeinstallprompt',capture); window.removeEventListener('appinstalled',installed); };
  }, []);
  return <div className="pwa-status"><span className="status-dot"/>{!online ? '当前离线' : ready ? '离线资源已就绪' : '本机学习 · 无需账号'}{refresh && <button onClick={() => updateServiceWorker(true)}>有新版本，更新应用</button>}{install && <button onClick={async () => { await install.prompt(); await install.userChoice; setInstall(null); }}>安装到设备</button>}</div>;
}
export default function App() {
  const [data, setData] = useState<LearningData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState<Page>('home');
  const [subject, setSubject] = useState<Subject | ''>('');
  const [topicId, setTopicId] = useState('');
  const [activeQuestion, setActiveQuestion] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [imported, setImported] = useState<LearningData | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const lock = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const hydrate = () => { setLoadError(''); loadData().then(setData).catch(() => setLoadError('无法读取本机学习数据库。请确认浏览器允许 IndexedDB，退出隐私模式，或关闭其他旧版标签页后重试。为保护现有记录，暂不写入数据。')); };
  useEffect(hydrate, []);
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 60000); return () => clearInterval(timer); }, []);
  useEffect(() => { heading.current?.focus(); }, [page]);
  async function persist(next: LearningData): Promise<boolean> {
    if (lock.current) return false;
    lock.current = true; setSaving(true); setError(''); setMessage('');
    try { await saveData(next); setData(next); setClock(Date.now()); return true; }
    catch { setError('保存失败：本机存储可能不可用或空间不足。此次修改未保存，请先导出已有记录，再检查浏览器存储设置。'); return false; }
    finally { lock.current = false; setSaving(false); }
  }
  function go(next: Page, q = '') { setPage(next); setActiveQuestion(q); setTopicId(''); setMessage(''); setError(''); }
  if (!data) return <main className="loading"><h1>注安深度学习系统 V0.1</h1>{loadError ? <><p role="alert">{loadError}</p><button onClick={hydrate}>重试读取</button></> : <p role="status">正在读取本机学习记录…</p>}</main>;
  const due = dueReviews(data, new Date(clock));
  const visibleQuestions = questions.filter(q => q.mode === (page === 'variants' ? 'variant' : 'case') && (!subject || q.subject === subject));
  const currentTopic = topics.find(t => t.id === topicId);
  const q = questions.find(q => q.id === activeQuestion);
  const today = new Date(clock).toLocaleDateString('zh-CN');
  const todayCount = data.attempts.filter(a => new Date(a.createdAt).toLocaleDateString('zh-CN') === today).length;
  const demoCorrect = data.attempts.filter(a => a.correct).length;
  async function answer(question: Question, selected: string[]) { return persist(recordAttempt(data!,question,selected)); }
  function showCourse(id: string) { setPage('courses'); setTopicId(id); setActiveQuestion(''); }
  function download() {
    const blob = new Blob([exportBackup(data!)], {type:'application/json'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `注安学习备份-${new Date().toISOString().slice(0,10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('已生成备份文件，请在浏览器下载记录中确认保存成功。');
  }
  return <div className={`app ${data.settings.largeText ? 'large-text' : ''}`}>
    <a className="skip-link" href="#main">跳到主要内容</a>
    <aside className="sidebar"><div className="brand"><div className="brand-mark">安</div><div><strong>注安深学</strong><small>DEEP LEARNING · V0.1</small></div></div>
      <div className="nav-caption">我的学习空间</div><nav aria-label="主导航">{nav.map(n => <button key={n.id} className={page === n.id ? 'nav-active' : ''} aria-current={page === n.id ? 'page' : undefined} onClick={() => go(n.id)}><span aria-hidden="true">{n.icon}</span>{n.label}{n.id === 'review' && due.length > 0 && <b>{due.length}</b>}</button>)}</nav>
      <div className="sidebar-note"><span>循序渐进，理解比记忆更深一步。</span><p>所有学习数据保存在当前浏览器<br/>建议定期导出备份</p></div>
    </aside>
    <div className="workspace"><header className="topbar"><span>中级注册安全工程师 / 学习工作台</span><PwaStatus/></header>
    <main id="main" className="main"><div className="page-heading"><div><div className="eyebrow">LEARN · UNDERSTAND · APPLY</div><h1 ref={heading} tabIndex={-1}>{nav.find(n => n.id === page)?.label}</h1></div><Tag>原创演示 · V0.1</Tag></div>
    <p className="demo-notice">当前为原创演示内容，未经权威资料核验，不是真题或正式评分依据。两组专题用于体验学习闭环，尚未导入你的 16 份资料。</p>
    {error && <p className="alert" role="alert">{error}</p>}{message && <p className="success" role="status">{message}</p>}
    {page === 'home' && <>
      <section className="hero"><div><div className="eyebrow">把知识学懂，把安全想透</div><h2>每一次理解，<br/>都向掌握更近一步。</h2><p>从专题出发，串联综合题、条件反转与精准复习。<br/>今天，也从一个小目标开始。</p><button className="light-button" onClick={() => go(due.length ? 'review' : 'courses')}>{due.length ? '开始今日复习' : '开始专题学习'} <span aria-hidden="true">↗</span></button></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="book">安<span>理解 · 应用 · 内化</span></div><span className="art-star">✦</span></div></section>
      <div className="stats"><div><span>今日练习 / 目标 {data.settings.dailyGoal}</span><strong>{todayCount}<small> 次</small></strong><progress aria-label="今日练习进度" value={Math.min(todayCount,data.settings.dailyGoal)} max={data.settings.dailyGoal}/></div><div><span>已学专题</span><strong>{Object.keys(data.completedTopics).length}<small> / {topics.length}</small></strong><p>按“标记已学”统计</p></div><div><span>到期复习</span><strong>{due.length}<small> 题</small></strong><p>错题即刻复习，答对后间隔重现</p></div></div>
      <div className="section-heading"><h2>四科知识入口</h2><span>同一专题，建立不同视角</span></div><div className="subjects">{SUBJECTS.map((s,i) => <button key={s} className="subject-card" onClick={() => {setSubject(s); go('courses');}}><span className={`subject-icon color-${i}`} aria-hidden="true">{['§','▦','⚒','▧'][i]}</span><small>科目 0{i+1}</small><h3>{s}</h3><p>{['理解责任与制度边界','串联管理与治理闭环','看懂原理与技术措施','把知识用在案例分析'][i]}</p><span className="card-link">查看演示专题 ↗</span></button>)}</div>
      <div className="section-heading"><h2>从一个专题开始</h2><button className="text-button" onClick={() => {setSubject(''); go('courses');}}>全部专题 →</button></div><div className="topic-grid">{topics.map((t,i) => <article className="panel topic-card" key={t.id}><div className="topic-number">0{i+1}</div><Tag>原创演示</Tag><h3>{t.title}</h3><p>{t.summary}</p><div className="topic-footer"><small>{t.minutes} 分钟 · {t.sections.length} 节深度课程</small><button onClick={() => showCourse(t.id)}>进入学习 →</button></div></article>)}</div>
    </>}
    {(page === 'courses' || page === 'cases' || page === 'variants') && <div className="filter"><label htmlFor="subject">学科视角</label><select id="subject" value={subject} onChange={e => {setSubject(e.target.value as Subject | ''); setActiveQuestion(''); setTopicId('');}}><option value="">全部四科</option>{SUBJECTS.map(s => <option key={s}>{s}</option>)}</select><span>演示专题跨科关联；题目按主要考点归科。</span></div>}
    {page === 'courses' && (currentTopic ? <article className="panel course"><button className="text-button" onClick={() => setTopicId('')}>← 返回专题列表</button><div className="eyebrow">原创演示 · 约 {currentTopic.minutes} 分钟</div><h2>{currentTopic.title}</h2><p>{currentTopic.summary}</p>{currentTopic.sections.map(s => <section key={s.title}><h3>{s.title}</h3><p>{s.body}</p><div className="takeaway"><strong>记住这个关键点</strong><p>{s.takeaway}</p></div></section>)}<p className="muted">来源：{currentTopic.source.title} · {currentTopic.source.version} · 未经核验</p><div className="actions"><button className="primary" disabled={saving || Boolean(data.completedTopics[currentTopic.id])} onClick={async () => { if (await persist({...data,completedTopics:{...data.completedTopics,[currentTopic.id]:new Date().toISOString()}})) setMessage('已保存学习进度。接下来通过综合题检验理解。'); }}>{data.completedTopics[currentTopic.id] ? '✓ 已学完此专题' : '标记已学完'}</button><button onClick={() => {setSubject(''); go('cases', `${currentTopic.id}-case`);}}>进入关联综合题 →</button><button onClick={() => {setSubject(''); go('variants', `${currentTopic.id}-variant`);}}>进入条件反转 →</button></div></article> : <><p>先理解知识，再进入情境。每个专题包含课程、综合题与条件反转训练。</p><div className="topic-grid">{topics.filter(t => !subject || t.subjects.includes(subject)).map(t => <article className="panel topic-card" key={t.id}><Tag>{data.completedTopics[t.id] ? '已学完' : '待学习'}</Tag><h2>{t.title}</h2><p>{t.summary}</p><small>原创演示 · {t.minutes} 分钟 · 未经核验</small><button className="primary" onClick={() => setTopicId(t.id)}>打开深度课程</button></article>)}</div></>)}
    {(page === 'cases' || page === 'variants') && <><div className="section-intro"><p>{page === 'variants' ? '只改变一个条件，重新判断哪些结论仍然成立。' : '阅读情境，选择措施，再逐项核对判断依据。多选题不设部分得分。'}</p><Tag>仅演示练习 · 正式题库 0 题</Tag></div>{q ? <><button className="text-button back" onClick={() => setActiveQuestion('')}>← 返回题目列表</button><Quiz key={q.id} q={q} busy={saving} onSubmit={answer} onCourse={() => showCourse(q.topicId)}/></> : <div className="question-list">{visibleQuestions.map((item,i) => <button key={item.id} className="panel question-card" onClick={() => setActiveQuestion(item.id)}><span className="question-index">0{i+1}</span><div><Tag>原创演示 · {item.type === 'multiple' ? '多选' : '单选'}</Tag><h2>{item.title}</h2><p>{item.subject} · {topics.find(t => t.id === item.topicId)?.title}</p></div><span aria-hidden="true">→</span></button>)}{!visibleQuestions.length && <div className="panel empty"><h2>该科目暂未提供此类演示题</h2><p>可切换到全部四科体验已有训练；后续资料须先整理、审核，才能进入正式题库。</p><button onClick={() => setSubject('')}>查看全部演示题</button></div>}</div>}</>}
    {page === 'review' && <><div className="stats"><div><span>累计演示练习</span><strong>{data.attempts.length}<small> 次</small></strong></div><div><span>演示答对 / 作答</span><strong>{demoCorrect}<small> / {data.attempts.length}</small></strong></div><div><span>正式成绩</span><strong>—</strong><p>没有经过核验的正式题目</p></div></div><div className="section-heading"><h2>精准复习</h2><span>答错立即重练 · 答对依次间隔 1 / 3 / 7 / 14 天</span></div>{q ? <><button className="text-button back" onClick={() => setActiveQuestion('')}>← 返回复习队列</button><Quiz key={q.id} q={q} busy={saving} onSubmit={answer} onCourse={() => showCourse(q.topicId)}/></> : <div className="panel">{due.length ? due.map(r => <div className="review-row" key={r.questionId}><div><h3>{questions.find(q => q.id === r.questionId)?.title}</h3><small>到期：{dateLabel(r.dueAt)} · 连续答对 {r.streak} 次</small></div><button onClick={() => setActiveQuestion(r.questionId)}>立即复习</button></div>) : <div className="empty"><h3>当前没有到期复习</h3><p>{data.reviews.length ? '已安排的题目会在到期后显示。你也可以在训练页主动练习。' : '完成一次训练后，这里会自动安排复习。'}</p><button onClick={() => {setSubject(''); go('cases');}}>去做综合题</button></div>}{data.reviews.some(r => Date.parse(r.dueAt) > clock) && <details><summary>查看后续复习安排</summary>{data.reviews.filter(r => Date.parse(r.dueAt) > clock).map(r => <p key={r.questionId}>{questions.find(q => q.id === r.questionId)?.title} · {dateLabel(r.dueAt)}</p>)}</details>}</div>}
      <div className="section-heading"><h2>最近学习记录</h2><span>显示最近 20 次作答</span></div><div className="panel">{!data.attempts.length ? <p className="muted">还没有作答记录。从一次小练习开始吧。</p> : <ol className="history">{data.attempts.slice(-20).reverse().map(a => <li key={a.id}><span className={a.correct ? 'result-correct' : 'result-wrong'}>{a.correct ? '答对' : '待巩固'}</span><div><strong>{questions.find(q => q.id === a.questionId)?.title}</strong><small>{dateLabel(a.createdAt)} · 选择 {a.selected.join('、')} · 原创演示</small></div></li>)}</ol>}</div>
    </>}
    {page === 'settings' && <div className="settings-grid"><section className="panel"><h2>学习设置</h2><label className="setting-row" htmlFor="daily">每日练习目标<select id="daily" value={data.settings.dailyGoal} disabled={saving} onChange={e => persist({...data,settings:{...data.settings,dailyGoal:Number(e.target.value)}})}>{Array.from(new Set([3,5,10,15,30,data.settings.dailyGoal])).sort((a,b)=>a-b).map(n => <option key={n} value={n}>{n} 次</option>)}</select></label><label className="setting-row">大字阅读<input type="checkbox" checked={data.settings.largeText} disabled={saving} onChange={e => persist({...data,settings:{...data.settings,largeText:e.target.checked}})}/></label><p className="muted">设置自动保存在当前浏览器，无需注册账号。</p></section>
      <section className="panel"><h2>数据导出与导入</h2><p>备份包含课程进度、作答、复习安排和设置。仅保存到你的设备，不会上传。</p><div className="actions"><button className="primary" onClick={download}>导出学习备份</button><button disabled={saving} onClick={() => fileInput.current?.click()}>选择备份文件</button></div><input ref={fileInput} type="file" accept="application/json,.json" aria-label="导入学习备份" className="file-input" onChange={async e => { const file = e.target.files?.[0]; e.target.value = ''; if (!file) return; setError(''); setImported(null); try { if (file.size > 10*1024*1024) throw new Error('文件超过 10 MB 上限'); setImported(parseBackup(await file.text())); } catch (err) { setError(err instanceof Error ? err.message : '读取文件失败'); } }}/>
      {imported && <div className="import-confirm"><h3>备份校验通过，尚未导入</h3><p>包含 {Object.keys(imported.completedTopics).length} 个已学专题、{imported.attempts.length} 次作答。导入将替换本机全部学习数据，建议先导出当前备份。</p><div className="actions"><button disabled={saving} className="primary" onClick={async () => {if (await persist(imported)) {setImported(null); setMessage('备份已导入，复习安排已重新校验。');}}}>确认替换并导入</button><button disabled={saving} onClick={() => setImported(null)}>取消导入</button></div></div>}
      <p className="muted">仅接受本内容版本的 JSON 备份（≤10 MB）。不会导入题库、Markdown、脚本或外部答案。不同设备、浏览器之间需手动导出和导入。</p></section>
      <section className="panel"><h2>离线与安装</h2><ol className="instructions"><li>首次联网打开生产版本，等待离线资源准备完成。</li><li>安卓 Chrome / Edge：打开浏览器菜单，选择“安装应用”或“添加到主屏幕”。</li><li>Windows Chrome / Edge：使用地址栏的安装按钮，或浏览器菜单中的应用安装功能。</li><li>安装不是离线学习的前提。缓存完成后，课程和训练均可离线使用。</li></ol><p className="muted">需要 HTTPS 或 localhost；开发模式不启用离线缓存。浏览器清理站点数据、卸载或隐私模式可能删除记录。请定期备份。</p></section>
      <section className="panel"><h2>内容与审核边界</h2><p>内容版本：{CONTENT_VERSION}。当前只有 2 个原创演示专题和 4 道演示题，不覆盖完整考纲，不提供考试通过承诺。</p><p>已预留来源编号、资料定位、版本、审核人、审核时间与答案冲突记录。原创演示、未经核验或冲突未解决的题目，不能进入正式评分题库。</p><p>后续 16 份 Markdown 资料尚未导入。资料接入、人工核验及冲突处理工作台属于后续版本。</p></section>
      <section className="panel danger-zone"><h2>清空本机学习数据</h2><p>只影响当前浏览器。操作后无法自动恢复，请先备份。</p>{confirmReset ? <div className="actions"><button className="danger" disabled={saving} onClick={async () => {if (await persist(emptyData())) {setConfirmReset(false); setImported(null); setMessage('本机学习数据已清空。');}}}>确认清空所有学习记录</button><button disabled={saving} onClick={() => setConfirmReset(false)}>取消</button></div> : <button className="danger" onClick={() => setConfirmReset(true)}>清空数据…</button>}</section>
    </div>}
    <footer>注安深度学习系统 V0.1 · 原创演示 · 本地优先 · 请结合现行法律法规与权威教材学习</footer>
    </main></div>
  </div>;
}
