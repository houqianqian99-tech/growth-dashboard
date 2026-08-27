import { el, h, todayStr, getWeekday, dateStr, formatMinutes } from '../utils/helpers.js';
import { GOAL_CATEGORIES, TIME_BLOCKS } from '../utils/frameworks.js';

const TAG_LABELS = { l: '学习', b: '副业', c: '内容', h: '健康', x: '系统' };

function tagLabel(tag) {
  return TAG_LABELS[tag] || '其他';
}

function lastNDates(n) {
  const days = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(dateStr(d));
  }
  return days;
}

function progressColor(p) {
  if (p === 0) return 'blue';
  if (p < 80) return 'orange';
  return 'green';
}

function reportStats(r) {
  if (!r) return [];
  const out = [];
  if (r.completionRate != null) out.push({ label: '完成率', val: r.completionRate + '%' });
  if (r.habitDays != null) out.push({ label: '习惯天数', val: String(r.habitDays) });
  if (r.learningMinutes != null) out.push({ label: '学习时长', val: formatMinutes(r.learningMinutes) });
  else if (r.learningHours != null) out.push({ label: '学习时长', val: formatMinutes(r.learningHours * 60) });
  if (r.goalCompletion != null) out.push({ label: '目标完成', val: r.goalCompletion + '%' });
  return out;
}

function todoRow(t, onToggle) {
  const row = el('div', 'todo' + (t.done ? ' done' : ''));
  row.appendChild(h('div', 'check'));
  row.appendChild(h('div', 'text', t.text));
  row.appendChild(h('div', 'tag tag-' + (t.tag || 'x'), tagLabel(t.tag)));
  row.addEventListener('click', () => onToggle(t));
  return row;
}

export function renderDashboard(data, update) {
  const root = el('div', 'page');
  const today = todayStr();
  const now = new Date();

  const wr = data.automation && data.automation.lastWeeklyReport;
  const mr = data.automation && data.automation.lastMonthlyReport;
  if (wr || mr) {
    const banner = el('div', 'card');
    banner.appendChild(h('h3', '', '智能报告'));
    const grid = el('div', 'grid row2');
    if (wr) {
      const box = el('div');
      box.appendChild(h('h4', '', '本周总结'));
      const stats = reportStats(wr);
      if (stats.length) {
        const sg = el('div', 'stat-grid');
        stats.forEach(s => {
          const sc = el('div', 'stat-card');
          sc.appendChild(h('div', 'sc-num', s.val));
          sc.appendChild(h('div', 'sc-label', s.label));
          sg.appendChild(sc);
        });
        box.appendChild(sg);
      }
      if (wr.summary) box.appendChild(el('div', 'ai-suggest', wr.summary));
      grid.appendChild(box);
    } else {
      grid.appendChild(el('div', 'empty-hint', '暂无周报数据'));
    }
    if (mr) {
      const box = el('div');
      box.appendChild(h('h4', '', '本月总结'));
      const stats = reportStats(mr);
      if (stats.length) {
        const sg = el('div', 'stat-grid');
        stats.forEach(s => {
          const sc = el('div', 'stat-card');
          sc.appendChild(h('div', 'sc-num', s.val));
          sc.appendChild(h('div', 'sc-label', s.label));
          sg.appendChild(sc);
        });
        box.appendChild(sg);
      }
      if (mr.summary) box.appendChild(el('div', 'ai-suggest', mr.summary));
      grid.appendChild(box);
    } else {
      grid.appendChild(el('div', 'empty-hint', '暂无月报数据'));
    }
    banner.appendChild(grid);
    root.appendChild(banner);
  }

  const hero = el('div', 'card');
  const heroTitle = h('h3', '');
  heroTitle.appendChild(h('span', '', `${now.getMonth() + 1}月${now.getDate()}日 星期${getWeekday(now)}`));
  heroTitle.appendChild(h('span', 'more', '今日重点'));
  hero.appendChild(heroTitle);
  const dailyTodos = (data.plans && data.plans.daily) || [];
  const incomplete = dailyTodos.filter(t => !t.done).slice(0, 3);
  if (incomplete.length) {
    const list = el('div', 'todo-list');
    incomplete.forEach(t => {
      list.appendChild(todoRow(t, (todo) => { todo.done = !todo.done; update(); }));
    });
    hero.appendChild(list);
  } else {
    hero.appendChild(el('div', 'empty-hint', '<div class="hint-icon">🎉</div>今日任务已全部完成，休息一下！'));
  }
  root.appendChild(hero);

  const todoCard = el('div', 'card');
  todoCard.appendChild(h('h3', '', '今日时间块待办'));
  if (dailyTodos.length) {
    const tb = el('div', 'time-block');
    TIME_BLOCKS.forEach(block => {
      const row = el('div', 'tb-row');
      row.appendChild(h('div', 'tb-time', block.time));
      row.appendChild(h('div', 'tb-activity', block.activity));
      tb.appendChild(row);
      const tasks = dailyTodos.filter(t => t.timeBlock === block.time);
      if (tasks.length) {
        const wrap = el('div', 'tb-tasks');
        tasks.forEach(t => {
          wrap.appendChild(todoRow(t, (todo) => { todo.done = !todo.done; update(); }));
        });
        tb.appendChild(wrap);
      }
    });
    const noBlock = dailyTodos.filter(t => !t.timeBlock);
    if (noBlock.length) {
      const row = el('div', 'tb-row');
      row.appendChild(h('div', 'tb-time', '其他'));
      row.appendChild(h('div', 'tb-activity', '未分配时间块'));
      tb.appendChild(row);
      const wrap = el('div', 'tb-tasks');
      noBlock.forEach(t => {
        wrap.appendChild(todoRow(t, (todo) => { todo.done = !todo.done; update(); }));
      });
      tb.appendChild(wrap);
    }
    todoCard.appendChild(tb);
  } else {
    todoCard.appendChild(el('div', 'empty-hint', '<div class="hint-icon">📋</div>今日还没有待办，去"计划"页自动生成吧！'));
  }
  root.appendChild(todoCard);

  const goalCard = el('div', 'card');
  goalCard.appendChild(h('h3', '', '年度目标概览'));
  const goals = data.annualGoals || [];
  const catKeys = Object.keys(GOAL_CATEGORIES);
  const goalGrid = el('div');
  goalGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;';
  catKeys.forEach(key => {
    const cat = GOAL_CATEGORIES[key];
    const catGoals = goals.filter(g => g.category === key);
    const avg = catGoals.length ? Math.round(catGoals.reduce((s, g) => s + (g.progress || 0), 0) / catGoals.length) : 0;
    const color = progressColor(avg);
    const box = el('div', 'stat-card');
    box.style.textAlign = 'left';
    const head = el('div');
    head.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:6px;font-size:12px;color:var(--text);';
    head.appendChild(h('span', '', cat.icon));
    head.appendChild(h('span', '', cat.name));
    box.appendChild(head);
    box.appendChild(h('div', 'sc-num', String(catGoals.length)));
    box.appendChild(h('div', 'sc-label', '个目标'));
    const bar = el('div', 'progress');
    const fill = el('div', 'fill ' + color);
    fill.style.width = avg + '%';
    bar.appendChild(fill);
    box.appendChild(bar);
    box.appendChild(h('div', 'sc-label', '平均进度 ' + avg + '%'));
    goalGrid.appendChild(box);
  });
  goalCard.appendChild(goalGrid);
  root.appendChild(goalCard);

  const habitCard = el('div', 'card');
  habitCard.appendChild(h('h3', '', '习惯打卡热力图（30天）'));
  const habits = data.habits || [];
  if (habits.length) {
    const dates = lastNDates(30);
    const wrap = el('div', 'habit-heatmap');
    const grid = el('div', 'hh-grid');
    habits.forEach(name => {
      const row = el('div', 'hh-row');
      row.appendChild(h('div', 'hh-name', name));
      const hd = (data.habitData && data.habitData[name]) || {};
      dates.forEach(d => {
        const checked = hd[d] === 1;
        const cell = el('div', 'hh-cell ' + (checked ? 'l3' : 'l0'));
        cell.title = name + ' ' + d;
        cell.addEventListener('click', () => {
          if (!data.habitData) data.habitData = {};
          if (!data.habitData[name]) data.habitData[name] = {};
          if (data.habitData[name][d]) delete data.habitData[name][d];
          else data.habitData[name][d] = 1;
          update();
        });
        row.appendChild(cell);
      });
      grid.appendChild(row);
    });
    wrap.appendChild(grid);
    const legend = el('div', 'habit-legend');
    legend.appendChild(h('span', '', '少'));
    legend.appendChild(el('span', 'lg l0'));
    legend.appendChild(el('span', 'lg l3'));
    legend.appendChild(h('span', '', '多'));
    wrap.appendChild(legend);
    habitCard.appendChild(wrap);
  } else {
    habitCard.appendChild(el('div', 'empty-hint', '<div class="hint-icon">🌿</div>还没有添加习惯'));
  }
  root.appendChild(habitCard);

  const healthCard = el('div', 'card');
  healthCard.appendChild(h('h3', '', '健康概览（近7天）'));
  const exDates = lastNDates(7);
  const exHabit = '健身/运动30min';
  const exData = (data.habitData && data.habitData[exHabit]) || {};
  const dots = el('div', 'week-dots');
  exDates.forEach(d => {
    const dt = new Date(d);
    const wd = el('div', 'wd' + (exData[d] ? ' done' : ''));
    wd.appendChild(h('div', 'd', '周' + getWeekday(dt)));
    wd.appendChild(h('div', 'n', exData[d] ? '✓' : String(dt.getDate())));
    dots.appendChild(wd);
  });
  healthCard.appendChild(dots);
  const weightLog = (data.health && data.health.weightLog) || [];
  const recent = weightLog.slice(-7);
  if (recent.length) {
    const chartWrap = el('div', 'weight-chart');
    chartWrap.innerHTML = weightSvg(recent);
    healthCard.appendChild(chartWrap);
    const latest = recent[recent.length - 1];
    healthCard.appendChild(h('div', 'sc-label', '最新体重 ' + latest.weight + 'kg'));
  } else {
    healthCard.appendChild(el('div', 'empty-hint', '还没有体重记录'));
  }
  root.appendChild(healthCard);

  return root;
}

function weightSvg(entries) {
  if (!entries.length) return '';
  const w = 300, hh = 110, pad = 16;
  if (entries.length === 1) {
    return `<svg viewBox="0 0 ${w} ${hh}"><circle cx="${w / 2}" cy="${hh / 2}" r="4" fill="#4A90D9"/><text x="${w / 2}" y="${hh / 2 - 10}" text-anchor="middle" font-size="11" fill="#4A5568">${entries[0].weight}kg</text></svg>`;
  }
  const weights = entries.map(e => Number(e.weight));
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = (max - min) || 1;
  const stepX = (w - pad * 2) / (entries.length - 1);
  const pts = entries.map((e, i) => {
    const x = pad + i * stepX;
    const y = hh - pad - ((Number(e.weight) - min) / range) * (hh - pad * 2);
    return [x, y];
  });
  const poly = pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const circles = pts.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" fill="#4A90D9"/>`).join('');
  const labels = entries.map((e, i) => {
    const x = (pad + i * stepX).toFixed(1);
    const y = (hh - pad - ((Number(e.weight) - min) / range) * (hh - pad * 2) - 6).toFixed(1);
    return `<text x="${x}" y="${y}" text-anchor="middle" font-size="9" fill="#9CA3AF">${e.weight}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${w} ${hh}"><polyline points="${poly}" fill="none" stroke="#4A90D9" stroke-width="2"/>${circles}${labels}</svg>`;
}
