import { SUBJECTS, type Provenance, type Topic, type Question } from './model';
const source = (id: string): Provenance => ({ sourceId: id, title: '原创演示 · 注安深学编写', kind: 'original-demo', version: '0.1.0-demo.1', reviewStatus: 'unverified', locator: 'V0.1 内置演示内容；未经权威资料核验' });
export const topics: Topic[] = [
  { id: 'hazard', title: '事故隐患排查治理', summary: '从发现问题到复查销号，建立可追溯的治理闭环。', subjects: [...SUBJECTS], minutes: 8, source: source('demo-hazard'), sections: [
    { title: '01 · 看见隐患，也看见风险', body: '演示情境：巡检人员发现机械传动部位防护罩缺失，人员可能接触运动部件。先识别危险源、暴露人员和可能后果，再记录具体隐患，不能只写“加强管理”。', takeaway: '隐患记录要具体：位置、状态、风险、临时控制措施。' },
    { title: '02 · 排查之后必须治理', body: '对发现的隐患落实责任、措施和完成时限。存在不能确保安全的情形时，应先采取停用、隔离等控制措施，再组织治理，不能以“已登记”代替控制风险。具体法定程序须结合现行规定和实际情形核验。', takeaway: '登记不等于治理，计划不等于风险已消除。' },
    { title: '03 · 复查验证，再闭环', body: '演示治理流程：发现防护罩缺失 → 停用隔离 → 指定责任人修复 → 检查防护有效性 → 形成复查记录 → 符合要求后恢复使用。修复记录和现场验证互相印证。', takeaway: '用证据验证治理效果，再完成闭环；不要仅凭口头承诺销号。' }
  ]},
  { id: 'maintenance', title: '机械设备检维修安全', summary: '识别能量、隔离验证、协同作业，守住恢复运行前的最后一道关。', subjects: [...SUBJECTS], minutes: 10, source: source('demo-maintenance'), sections: [
    { title: '01 · 停机不等于安全', body: '演示情境：输送设备已经按下停止按钮，但电源未隔离，气压仍有残余。停止按钮通常是控制信号，不能代替能量隔离；还需识别电能、压力、重力及其他储存能量。', takeaway: '问自己：设备能否意外启动？残余能量会不会释放？' },
    { title: '02 · 隔离后需要验证', body: '依据设备和单位适用规程，执行能量隔离、锁定与标识，释放或约束残余能量，并采用适当方式确认隔离有效。多人作业应明确个人保护和交接安排，不能仅依赖他人的口头确认。', takeaway: '“做过隔离”和“确认隔离有效”是两个步骤。' },
    { title: '03 · 恢复运行也要闭环', body: '检维修结束后，清点人员与工具、恢复防护、确认作业人员撤离，按规定办理解除隔离和恢复运行手续。发现防护尚未恢复时，应继续控制风险，不能为了赶进度试运转。', takeaway: '完工不是终点；安全确认后才能恢复运行。' }
  ]}
];
export const questions: Question[] = [
  { id: 'hazard-case', topicId: 'hazard', subject: SUBJECTS[1], mode: 'case', type: 'multiple', title: '防护罩缺失后的治理闭环',
    scenario: '班组巡检发现一台正在使用的设备传动部位防护罩缺失。负责人已在台账中登记，但仍要求设备继续运转，并准备凭维修人员口头承诺销号。',
    prompt: '在本演示情境中，哪些处理做法合理？（多选，全部选对才算掌握）',
    options: [
      { id: 'A', text: '先停用并采取适当隔离措施，控制人员接触风险', explanation: '合理。发现不能确保安全的暴露情形，应先控制风险，不能边冒险运行边等待治理。' },
      { id: 'B', text: '已登记台账，可以直接销号', explanation: '不合理。登记是起点，不能证明隐患已经消除。' },
      { id: 'C', text: '明确整改责任与措施，修复后现场复查并留存记录', explanation: '合理。治理需要责任落实，也需要可追溯的效果验证。' },
      { id: 'D', text: '只要口头承诺会修复，就可以恢复使用', explanation: '不合理。口头承诺不能替代现场修复和有效性验证。' }
    ], answer: ['A', 'C'], principle: '发现 → 控制 → 整改 → 验证 → 闭环。演示判断不替代正式法规和现场专业评估。', source: source('demo-hazard-case'), conflicts: [], formal: false },
  { id: 'maintenance-case', topicId: 'maintenance', subject: SUBJECTS[2], mode: 'case', type: 'multiple', title: '已停机，为什么还不能检修？',
    scenario: '输送设备按下停止按钮后，检修人员准备进入危险区域。此时主电源尚未隔离，气动执行机构还可能保有压力。',
    prompt: '进入危险区域前，本演示情境还需要完成哪些措施？（多选）',
    options: [
      { id: 'A', text: '只需安排同事看守停止按钮', explanation: '不合理。看守控制按钮不能替代可靠的能量隔离。' },
      { id: 'B', text: '识别并隔离相关能量，落实锁定与标识等适用措施', explanation: '合理。应针对设备识别能量，按照适用规程实施隔离。' },
      { id: 'C', text: '释放或约束残余能量，并确认隔离有效', explanation: '合理。停机后仍可能存在储能，应处理并验证安全状态。' },
      { id: 'D', text: '趁停机立即进入，缩短作业时间', explanation: '不合理。时间紧迫不能替代安全前提。' }
    ], answer: ['B','C'], principle: '停机 ≠ 能量隔离 ≠ 验证无危险能量。三个环节不能相互替代。', source: source('demo-maintenance-case'), conflicts: [], formal: false },
  { id: 'hazard-variant', topicId: 'hazard', subject: SUBJECTS[0], mode: 'variant', type: 'single', title: '条件反转：修复了，能否立即销号？',
    scenario: '原情境中的防护罩已经修复，但尚未复查防护有效性，也没有复查记录。', reversal: '从“未修复”改为“已修复但未验证”，风险控制的关键转到效果验证。',
    prompt: '下一步最合理的做法是什么？（单选）', options: [
      { id: 'A', text: '看到新防护罩就立即销号', explanation: '不合理。外观修复不能直接证明防护有效。' },
      { id: 'B', text: '组织复查，验证效果并形成记录，符合要求后闭环', explanation: '合理。条件变化没有取消验证环节。' },
      { id: 'C', text: '删除原始隐患记录，避免重复', explanation: '不合理。原始记录有助于追溯治理过程。' }
    ], answer: ['B'], principle: '变化的是治理进度，不变的是验证闭环的要求。此题仅演示分析思路，不作法条原文引用。', source: source('demo-hazard-variant'), conflicts: [], formal: false },
  { id: 'maintenance-variant', topicId: 'maintenance', subject: SUBJECTS[3], mode: 'variant', type: 'single', title: '条件反转：检修完成后的恢复运行',
    scenario: '检修任务已结束，工具已清点，人员已撤离，但设备防护罩尚未装回。生产班组要求立即试运转。', reversal: '从“准备进入检修”改为“检修已完成”，关注点转到恢复运行的前提。',
    prompt: '此时应如何处理？（单选）', options: [
      { id: 'A', text: '人员已撤离，可以直接恢复运行', explanation: '不合理。人员撤离不代表所有恢复条件均已满足。' },
      { id: 'B', text: '先恢复防护并完成安全确认，再按适用程序恢复运行', explanation: '合理。恢复防护是安全确认的重要内容。' },
      { id: 'C', text: '由一人在旁提醒，替代缺失的防护罩', explanation: '不合理。人工提醒不能替代应有的设备防护。' }
    ], answer: ['B'], principle: '检修完成 ≠ 可以立即启动。恢复运行前仍需确认人员、工具、防护与程序。', source: source('demo-maintenance-variant'), conflicts: [], formal: false }
];
