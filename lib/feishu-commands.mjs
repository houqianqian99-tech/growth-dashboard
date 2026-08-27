const TIME_BLOCKS = [
  { time: '06:30-07:30', activity: '起床+拉伸+简易健身', tags: ['健康'] },
  { time: '07:30-08:00', activity: '自己做早餐+听播客', tags: ['健康'] },
  { time: '08:00-09:00', activity: '英语精学（单词+阅读+口语）', tags: ['英语'] },
  { time: '09:00-12:00', activity: '会计备考（番茄钟）', tags: ['会计'] },
  { time: '12:00-13:30', activity: '午餐+午休', tags: ['健康'] },
  { time: '13:30-15:00', activity: '技能学习轮换（PS/剪辑/写作/练字）', tags: ['技能'] },
  { time: '15:00-17:00', activity: '内容创作（选题→拍摄→编辑→发布）', tags: ['创作'] },
  { time: '17:00-18:00', activity: '读书（纸质书）', tags: ['读书'] },
  { time: '18:00-19:00', activity: '晚餐+散步', tags: ['健康'] },
  { time: '19:00-20:00', activity: '练字/观影+写观后感', tags: ['习惯'] },
  { time: '20:00-20:30', activity: '日复盘（5个问题）', tags: ['复盘'] },
  { time: '20:30-22:00', activity: '自由时间', tags: ['自由'] },
  { time: '22:00-22:30', activity: '洗漱+准备明天', tags: ['健康'] },
  { time: '22:30', activity: '睡觉', tags: ['健康'] }
];

const HABITS = [
  '22:30前入睡', '6:30起床', '健身/运动30min', '不点外卖',
  '英语学习1h', '会计备考2h+', '读书30min', '小红书/抖音内容产出',
  '练字20min', '日复盘完成', '自己做饭'
];

function todayKey() {
  const d = new Date();
  d.setHours(d.getHours() + 8);
  return d.toISOString().split('T')[0];
}

function matchKeyword(keyword, items) {
  const k = keyword.toLowerCase();
  return items.filter(item => {
    const text = (typeof item === 'string' ? item : item.activity).toLowerCase();
    return text.includes(k) || k.includes(text);
  });
}

export function getBotReply(text, completions) {
  const tk = todayKey();
  if (!completions[tk]) completions[tk] = { tasks: [], habits: [] };

  if (text === '待办' || text === 'todo') {
    let lines = ['📋 今日待办（时间块）\n'];
    for (const block of TIME_BLOCKS) {
      const done = completions[tk].tasks.some(t => block.activity.includes(t));
      lines.push(`${done ? '✅' : '⬜'} ${block.time} ${block.activity}`);
    }
    return lines.join('\n');
  }

  if (text.startsWith('完成')) {
    const keyword = text.slice(2).trim();
    if (!keyword) return '用法：完成 关键词\n例如：完成 英语';
    const matched = matchKeyword(keyword, TIME_BLOCKS);
    if (matched.length === 0) return `没找到包含"${keyword}"的待办`;
    for (const m of matched) {
      if (!completions[tk].tasks.includes(m.activity)) completions[tk].tasks.push(m.activity);
    }
    return `✅ 已勾选 ${matched.length} 项：\n${matched.map(m => m.time + ' ' + m.activity).join('\n')}`;
  }

  if (text.startsWith('打卡')) {
    const keyword = text.slice(2).trim();
    if (!keyword) return '用法：打卡 关键词\n例如：打卡 健身';
    const matched = matchKeyword(keyword, HABITS);
    if (matched.length === 0) return `没找到包含"${keyword}"的习惯`;
    for (const m of matched) {
      if (!completions[tk].habits.includes(m)) completions[tk].habits.push(m);
    }
    return `✅ 已打卡 ${matched.length} 项：\n${matched.join('\n')}`;
  }

  if (text === '今日') {
    const c = completions[tk];
    const totalTasks = TIME_BLOCKS.length;
    const doneTasks = c.tasks.length;
    const totalHabits = HABITS.length;
    const doneHabits = c.habits.length;
    let lines = [
      `📊 今日完成情况`,
      `待办：${doneTasks}/${totalTasks}（${Math.round(doneTasks/totalTasks*100)}%）`,
      `习惯：${doneHabits}/${totalHabits}（${Math.round(doneHabits/totalHabits*100)}%）`,
      ''
    ];
    if (c.tasks.length) { lines.push('✅ 已完成待办：'); lines.push(c.tasks.join('\n')); lines.push(''); }
    if (c.habits.length) { lines.push('✅ 已打卡习惯：'); lines.push(c.habits.join('\n')); }
    return lines.join('\n');
  }

  if (text === '帮助' || text === 'help') {
    return `🤖 成长工作台指令\n• 待办 — 查看今日待办\n• 完成 关键词 — 勾选待办（如：完成 英语）\n• 打卡 关键词 — 打卡习惯（如：打卡 健身）\n• 今日 — 查看完成情况\n• 帮助 — 查看所有指令`;
  }

  return `收到消息：${text}\n\n输入"帮助"查看可用指令`;
}
