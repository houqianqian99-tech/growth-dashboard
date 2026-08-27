import { el, h, todayStr, monthStr, weekStart, toast } from '../utils/helpers.js';
import { DAILY_QUESTIONS, WEEKLY_QUESTIONS, MONTHLY_QUESTIONS } from '../utils/frameworks.js';

export function renderReview(data, update) {
  const root = el('div', 'page');

  root.appendChild(buildReviewSummary(data));

  const tabs = el('div', 'tabs');
  const tabDaily = el('div', 'tab active', '今日复盘');
  const tabWeekly = el('div', 'tab', '本周复盘');
  const tabMonthly = el('div', 'tab', '本月复盘');
  tabs.appendChild(tabDaily);
  tabs.appendChild(tabWeekly);
  tabs.appendChild(tabMonthly);
  root.appendChild(tabs);

  const paneDaily = el('div', 'tabpane active');
  const paneWeekly = el('div', 'tabpane');
  const paneMonthly = el('div', 'tabpane');

  paneDaily.appendChild(buildDailyPane(data, update));
  paneWeekly.appendChild(buildWeeklyPane(data, update));
  paneMonthly.appendChild(buildMonthlyPane(data, update));

  root.appendChild(paneDaily);
  root.appendChild(paneWeekly);
  root.appendChild(paneMonthly);

  tabDaily.addEventListener('click', () => switchTab(tabs, [tabDaily, tabWeekly, tabMonthly], [paneDaily, paneWeekly, paneMonthly], 0));
  tabWeekly.addEventListener('click', () => switchTab(tabs, [tabDaily, tabWeekly, tabMonthly], [paneDaily, paneWeekly, paneMonthly], 1));
  tabMonthly.addEventListener('click', () => switchTab(tabs, [tabDaily, tabWeekly, tabMonthly], [paneDaily, paneWeekly, paneMonthly], 2));

  return root;
}

function switchTab(tabsEl, tabs, panes, idx) {
  tabs.forEach(t => t.classList.remove('active'));
  panes.forEach(p => p.classList.remove('active'));
  tabs[idx].classList.add('active');
  panes[idx].classList.add('active');
}

function buildDailyPane(data, update) {
  const wrap = el('div');
  const today = todayStr();
  if (!data.review.daily) data.review.daily = [];
  let entry = data.review.daily.find(e => e.date === today);
  if (!entry) {
    entry = { date: today, answers: DAILY_QUESTIONS.map(() => ''), mood: 3, score: 0, aiAnalysis: null };
    data.review.daily.push(entry);
  }
  if (!entry.answers || entry.answers.length < DAILY_QUESTIONS.length) {
    entry.answers = DAILY_QUESTIONS.map((_, i) => (entry.answers && entry.answers[i]) || '');
  }

  const stats = el('div', 'stat-grid');
  const planRate = calcPlanRate(data, today);
  const habitRate = calcHabitRate(data, today);
  stats.appendChild(statCard(planRate + '%', '计划完成率'));
  stats.appendChild(statCard(habitRate + '%', '习惯完成率'));
  stats.appendChild(statCard('★'.repeat(entry.mood || 3), '今日心情'));
  wrap.appendChild(stats);

  const card = el('div', 'card');
  card.appendChild(h('h3', '', '每日五个问题'));
  DAILY_QUESTIONS.forEach((q, i) => {
    const row = el('div', 'form-row');
    row.appendChild(h('label', '', q));
    const ta = el('textarea');
    ta.value = entry.answers[i] || '';
    ta.dataset.idx = i;
    ta.addEventListener('input', () => { entry.answers[i] = ta.value; });
    row.appendChild(ta);
    card.appendChild(row);
  });

  const moodRow = el('div', 'form-row');
  moodRow.appendChild(h('label', '', '今日心情 (1-5)'));
  const moodInput = el('input');
  moodInput.type = 'number';
  moodInput.min = '1';
  moodInput.max = '5';
  moodInput.value = entry.mood || 3;
  moodInput.style.width = '80px';
  moodInput.addEventListener('input', () => { entry.mood = parseInt(moodInput.value) || 3; });
  moodRow.appendChild(moodInput);
  card.appendChild(moodRow);

  const actions = el('div', 'modal-actions');
  actions.style.justifyContent = 'flex-start';
  const saveBtn = el('button', 'btn', '保存');
  saveBtn.addEventListener('click', () => {
    entry.score = planRate;
    toast('复盘已保存', 'success');
    update();
  });
  const aiBtn = el('button', 'btn-secondary', '生成AI分析');
  aiBtn.addEventListener('click', () => {
    entry.aiAnalysis = generateDailyAnalysis(data, entry, planRate, habitRate);
    toast('AI 分析已生成', 'success');
    update();
  });
  const exportBtn = el('button', 'btn-secondary', '导出');
  exportBtn.addEventListener('click', () => exportDaily(entry));
  actions.appendChild(saveBtn);
  actions.appendChild(aiBtn);
  actions.appendChild(exportBtn);
  card.appendChild(actions);

  if (entry.aiAnalysis) {
    card.appendChild(renderAIAnalysis(entry.aiAnalysis));
  }
  wrap.appendChild(card);
  return wrap;
}

function buildWeeklyPane(data, update) {
  const wrap = el('div');
  const ws = dateFmt(weekStart(new Date()));
  if (!data.review.weekly) data.review.weekly = [];
  let entry = data.review.weekly.find(e => e.weekStart === ws);
  if (!entry) {
    entry = { weekStart: ws, answers: WEEKLY_QUESTIONS.map(() => ''), aiAnalysis: null };
    data.review.weekly.push(entry);
  }
  if (!entry.answers || entry.answers.length < WEEKLY_QUESTIONS.length) {
    entry.answers = WEEKLY_QUESTIONS.map((_, i) => (entry.answers && entry.answers[i]) || '');
  }

  const card = el('div', 'card');
  card.appendChild(h('h3', '', `本周复盘（${ws} 起）`));
  WEEKLY_QUESTIONS.forEach((q, i) => {
    const row = el('div', 'form-row');
    row.appendChild(h('label', '', q));
    const ta = el('textarea');
    ta.value = entry.answers[i] || '';
    ta.addEventListener('input', () => { entry.answers[i] = ta.value; });
    row.appendChild(ta);
    card.appendChild(row);
  });

  const actions = el('div', 'modal-actions');
  actions.style.justifyContent = 'flex-start';
  const saveBtn = el('button', 'btn', '保存');
  saveBtn.addEventListener('click', () => {
    toast('周复盘已保存', 'success');
    update();
  });
  const aiBtn = el('button', 'btn-secondary', '生成AI分析');
  aiBtn.addEventListener('click', () => {
    entry.aiAnalysis = generateWeeklyAnalysis(data, entry);
    toast('AI 分析已生成', 'success');
    update();
  });
  actions.appendChild(saveBtn);
  actions.appendChild(aiBtn);
  card.appendChild(actions);

  if (entry.aiAnalysis) {
    card.appendChild(renderAIAnalysis(entry.aiAnalysis));
  }
  wrap.appendChild(card);
  return wrap;
}

function buildMonthlyPane(data, update) {
  const wrap = el('div');
  const m = monthStr(new Date());
  if (!data.review.monthly) data.review.monthly = [];
  let entry = data.review.monthly.find(e => e.month === m);
  if (!entry) {
    entry = { month: m, answers: MONTHLY_QUESTIONS.map(() => ''), aiAnalysis: null };
    data.review.monthly.push(entry);
  }
  if (!entry.answers || entry.answers.length < MONTHLY_QUESTIONS.length) {
    entry.answers = MONTHLY_QUESTIONS.map((_, i) => (entry.answers && entry.answers[i]) || '');
  }

  const stats = el('div', 'stat-grid');
  const booksDone = (data.reading.finished || []).filter(i => (i.finishDate || '').startsWith(m) && i.type === 'book').length;
  const postsCount = countMonthPosts(data, m);
  const fitnessDays = countMonthFitness(data, m);
  const reviewDays = (data.review.daily || []).filter(e => e.date && e.date.startsWith(m) && e.answers && e.answers.some(a => a)).length;
  stats.appendChild(statCard(String(booksDone), '本月读书'));
  stats.appendChild(statCard(String(postsCount), '本月内容'));
  stats.appendChild(statCard(String(fitnessDays), '本月健身天'));
  stats.appendChild(statCard(String(reviewDays), '本月复盘天'));
  wrap.appendChild(stats);

  const card = el('div', 'card');
  card.appendChild(h('h3', '', `本月复盘（${m}）`));
  MONTHLY_QUESTIONS.forEach((q, i) => {
    const row = el('div', 'form-row');
    row.appendChild(h('label', '', q));
    const ta = el('textarea');
    ta.value = entry.answers[i] || '';
    ta.addEventListener('input', () => { entry.answers[i] = ta.value; });
    row.appendChild(ta);
    card.appendChild(row);
  });

  const actions = el('div', 'modal-actions');
  actions.style.justifyContent = 'flex-start';
  const saveBtn = el('button', 'btn', '保存');
  saveBtn.addEventListener('click', () => {
    toast('月复盘已保存', 'success');
    update();
  });
  const aiBtn = el('button', 'btn-secondary', '生成AI分析');
  aiBtn.addEventListener('click', () => {
    entry.aiAnalysis = generateMonthlyAnalysis(data, entry, { booksDone, postsCount, fitnessDays, reviewDays });
    toast('AI 分析已生成', 'success');
    update();
  });
  actions.appendChild(saveBtn);
  actions.appendChild(aiBtn);
  card.appendChild(actions);

  if (entry.aiAnalysis) {
    card.appendChild(renderAIAnalysis(entry.aiAnalysis));
  }
  wrap.appendChild(card);

  if (data.automation.lastMonthlyReport) {
    const reportCard = el('div', 'card');
    reportCard.appendChild(h('h3', '', '自动月报'));
    const box = el('div', 'ai-suggest');
    box.style.whiteSpace = 'pre-wrap';
    box.textContent = typeof data.automation.lastMonthlyReport === 'string'
      ? data.automation.lastMonthlyReport
      : JSON.stringify(data.automation.lastMonthlyReport, null, 2);
    reportCard.appendChild(box);
    wrap.appendChild(reportCard);
  }

  return wrap;
}

function buildReviewSummary(data) {
  const card = el('div', 'card');
  card.appendChild(h('h3', '', '复盘汇总'));

  const m = monthStr(new Date());
  const dailyReviews = (data.review.daily || []).filter(r => r.date && r.date.startsWith(m));
  const filledDaily = dailyReviews.filter(r => r.answers && r.answers.some(a => a && a.trim()));
  const today = todayStr();
  const todayReview = (data.review.daily || []).find(r => r.date === today);
  const ws = dateFmt(weekStart(new Date()));
  const weekReview = (data.review.weekly || []).find(r => r.weekStart === ws);

  const stats = el('div', 'stat-grid');
  stats.appendChild(makeStat(String(filledDaily.length), '本月复盘天数'));
  const avgMood = filledDaily.length > 0
    ? (filledDaily.reduce((s, r) => s + (r.mood || 3), 0) / filledDaily.length).toFixed(1)
    : '—';
  stats.appendChild(makeStat(avgMood, '平均心情'));
  const completionAvg = filledDaily.length > 0
    ? Math.round(filledDaily.reduce((s, r) => s + (r.aiAnalysis ? r.aiAnalysis.completionRate || 0 : r.score || 0), 0) / filledDaily.length) + '%'
    : '—';
  stats.appendChild(makeStat(completionAvg, '平均完成率'));
  stats.appendChild(makeStat(todayReview && todayReview.answers && todayReview.answers.some(a => a && a.trim()) ? '已完成' : '未完成', '今日复盘'));
  card.appendChild(stats);

  if (todayReview && todayReview.aiAnalysis) {
    const box = el('div', 'ai-suggest');
    box.appendChild(h('b', '', '今日 AI 建议'));
    box.appendChild(h('div', '', todayReview.aiAnalysis.suggestion || ''));
    card.appendChild(box);
  }

  if (data.automation.lastWeeklyReport) {
    const wr = data.automation.lastWeeklyReport;
    const box = el('div', 'ai-suggest');
    box.style.marginTop = '8px';
    box.appendChild(h('b', '', '本周简报'));
    box.appendChild(h('div', '', `完成率 ${wr.completion}% · 习惯 ${wr.habitDays} 天 · 学习 ${wr.learningHours}h · 内容 ${wr.contentPosts} 篇`));
    if (wr.suggestions) box.appendChild(h('div', '', wr.suggestions));
    card.appendChild(box);
  }

  if (!todayReview || !todayReview.answers || !todayReview.answers.some(a => a && a.trim())) {
    const hint = el('div', 'ai-suggest');
    hint.style.background = 'var(--accent2-light)';
    hint.style.borderLeftColor = 'var(--accent2)';
    hint.appendChild(h('b', '', '今日还未复盘'));
    hint.appendChild(h('div', '', '每天 20:00 自动提醒，填完 5 个问题后点击「生成AI分析」获取建议'));
    card.appendChild(hint);
  }

  return card;
}

function makeStat(num, label) {
  const c = el('div', 'stat-card');
  c.appendChild(h('div', 'sc-num', num));
  c.appendChild(h('div', 'sc-label', label));
  return c;
}

function statCard(num, label) {
  const card = el('div', 'stat-card');
  card.appendChild(h('div', 'sc-num', num));
  card.appendChild(h('div', 'sc-label', label));
  return card;
}

function calcPlanRate(data, date) {
  const todos = (data.plans && data.plans.daily) || [];
  const todayTodos = todos.filter(t => (!t.date || t.date === date));
  if (!todayTodos.length) return 0;
  const done = todayTodos.filter(t => t.done).length;
  return Math.round((done / todayTodos.length) * 100);
}

function calcHabitRate(data, date) {
  const hd = data.habitData || {};
  const dayData = hd[date];
  if (!dayData) return 0;
  let total = 0, done = 0;
  if (Array.isArray(dayData)) {
    total = dayData.length;
    done = dayData.filter(v => v === true || v >= 1).length;
  } else if (typeof dayData === 'object') {
    const vals = Object.values(dayData);
    total = vals.length;
    done = vals.filter(v => v === true || v >= 1).length;
  }
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

function generateDailyAnalysis(data, entry, planRate, habitRate) {
  const highlights = [];
  const improvements = [];
  highlights.push(`计划完成率 ${planRate}%`);
  highlights.push(`习惯完成率 ${habitRate}%`);

  const todos = (data.plans && data.plans.daily) || [];
  const todayTodos = todos.filter(t => (!t.date || t.date === entry.date));
  const doneTodos = todayTodos.filter(t => t.done);
  const undoneTodos = todayTodos.filter(t => !t.done);
  if (doneTodos.length) highlights.push(`完成 ${doneTodos.length} 项待办`);
  if (undoneTodos.length) {
    improvements.push(`未完成 ${undoneTodos.length} 项待办`);
    undoneTodos.slice(0, 3).forEach(t => improvements.push(`· ${t.text || '未命名任务'}`));
  }

  const hd = data.habitData || {};
  const dayData = hd[entry.date];
  if (dayData) {
    const habits = data.habits || [];
    let missed = [];
    if (Array.isArray(dayData)) {
      dayData.forEach((v, i) => { if (!(v === true || v >= 1) && habits[i]) missed.push(habits[i]); });
    } else if (typeof dayData === 'object') {
      Object.entries(dayData).forEach(([k, v]) => { if (!(v === true || v >= 1)) missed.push(k); });
    }
    if (missed.length) {
      improvements.push(`未完成习惯 ${missed.length} 个`);
      missed.slice(0, 3).forEach(m => improvements.push(`· ${m}`));
    }
  }

  let suggestion = '';
  if (planRate >= 80 && habitRate >= 80) {
    suggestion = '今天表现非常棒！保持了高完成率，继续保持节奏。明天可以适当挑战更高目标。';
  } else if (planRate >= 50) {
    suggestion = '完成率尚可，但有提升空间。建议复盘未完成的任务，调整优先级或预估时间。';
  } else {
    suggestion = '今天完成率偏低，建议检查任务量是否过大，或是否有时间被浪费。明天聚焦最重要的 1-2 件事。';
  }

  return { completionRate: planRate, habitRate, highlights, improvements, suggestion };
}

function generateWeeklyAnalysis(data, entry) {
  const daily = (data.review.daily || []).filter(d => d.date >= entry.weekStart);
  const avgMood = daily.length ? (daily.reduce((s, d) => s + (d.mood || 3), 0) / daily.length) : 0;
  const reviewDays = daily.filter(d => d.answers && d.answers.some(a => a)).length;
  const highlights = [];
  const improvements = [];
  highlights.push(`本周完成复盘 ${reviewDays} 天`);
  highlights.push(`平均心情 ${avgMood.toFixed(1)}/5`);
  if (reviewDays < 7) improvements.push(`有 ${7 - reviewDays} 天未写复盘`);

  const suggestion = reviewDays >= 5
    ? '本周复盘坚持得很好，保持每日反思的习惯是成长的关键。'
    : `本周仅完成 ${reviewDays} 天复盘，建议设定固定时间提醒，养成习惯。`;

  return { completionRate: Math.round(reviewDays / 7 * 100), habitRate: 0, highlights, improvements, suggestion };
}

function generateMonthlyAnalysis(data, entry, metrics) {
  const highlights = [];
  const improvements = [];
  highlights.push(`读书 ${metrics.booksDone} 本`);
  highlights.push(`内容产出 ${metrics.postsCount} 篇`);
  highlights.push(`健身 ${metrics.fitnessDays} 天`);
  highlights.push(`复盘 ${metrics.reviewDays} 天`);

  if (metrics.booksDone < 1) improvements.push('本月未完成读书，建议每天安排 30 分钟阅读时间');
  if (metrics.postsCount < 4) improvements.push('内容产出偏少，建议每周至少 1 篇');
  if (metrics.fitnessDays < 12) improvements.push('健身天数不足，建议每周至少 3 次');
  if (metrics.reviewDays < 20) improvements.push('复盘天数不足，建议坚持每日复盘');

  const suggestion = improvements.length
    ? '本月有提升空间，重点关注上述不足项，下月针对性改进。'
    : '本月各维度表现优秀，下月可以适当提升目标难度。';

  return { completionRate: 0, habitRate: 0, highlights, improvements, suggestion };
}

function renderAIAnalysis(ai) {
  const box = el('div', 'ai-suggest');
  if (ai.completionRate !== undefined) {
    box.appendChild(h('div', '', `计划完成率 ${ai.completionRate}% · 习惯完成率 ${ai.habitRate}%`));
  }
  if (ai.highlights && ai.highlights.length) {
    box.appendChild(h('div', '', '✅ 亮点'));
    ai.highlights.forEach(hl => box.appendChild(h('div', '', '· ' + hl)));
  }
  if (ai.improvements && ai.improvements.length) {
    box.appendChild(h('div', '', '⚠️ 待改进'));
    ai.improvements.forEach(im => box.appendChild(h('div', '', '· ' + im)));
  }
  if (ai.suggestion) {
    const tip = el('div');
    tip.style.marginTop = '6px';
    tip.innerHTML = `<b>建议：</b>${ai.suggestion}`;
    box.appendChild(tip);
  }
  return box;
}

function exportDaily(entry) {
  let text = `每日复盘 - ${entry.date}\n${'='.repeat(30)}\n\n`;
  DAILY_QUESTIONS.forEach((q, i) => {
    text += `${i + 1}. ${q}\n${entry.answers[i] || '(未填写)'}\n\n`;
  });
  text += `心情：${'★'.repeat(entry.mood || 3)}${'☆'.repeat(5 - (entry.mood || 3))}\n`;
  if (entry.aiAnalysis) {
    text += `\nAI 分析：\n${entry.aiAnalysis.suggestion || ''}\n`;
  }
  downloadFile(`复盘_${entry.date}.txt`, text);
}

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = el('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('已导出', 'success');
}

function countMonthPosts(data, m) {
  let count = 0;
  const content = data.content || {};
  Object.values(content).forEach(pd => {
    const items = pd.posts || pd.episodes || [];
    count += items.filter(p => (p.date || '').startsWith(m)).length;
  });
  return count;
}

function countMonthFitness(data, m) {
  const set = new Set();
  (data.health.weightLog || []).forEach(e => { if ((e.date || '').startsWith(m)) set.add(e.date); });
  (data.health.sleepLog || []).forEach(e => { if ((e.date || '').startsWith(m)) set.add(e.date); });
  return set.size;
}

function dateFmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
