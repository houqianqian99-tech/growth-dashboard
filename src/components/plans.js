import { el, h, uid, toast } from '../utils/helpers.js';
import { GOAL_CATEGORIES, TIME_BLOCKS } from '../utils/frameworks.js';

const TAG_LABELS = { l: '学习', b: '副业', c: '内容', h: '健康', x: '系统' };
const INPUT_STYLE = 'width:100%;border:1px solid var(--border);border-radius:6px;padding:7px 10px;font-size:13px;font-family:var(--font);outline:none;color:var(--text);background:var(--surface);box-sizing:border-box;';

function planLabel(text) {
  const l = el('label');
  l.style.cssText = 'display:block;font-size:12px;color:var(--text-2);margin-bottom:4px;font-weight:600;';
  l.textContent = text;
  return l;
}

function planInput(value, placeholder) {
  const i = el('input');
  i.style.cssText = INPUT_STYLE;
  i.value = value || '';
  if (placeholder) i.placeholder = placeholder;
  return i;
}

export function renderPlans(data, update) {
  const root = el('div', 'page');

  const tabsBar = el('div', 'tabs');
  const tabDefs = [
    { label: '月计划', render: () => monthlyPane(data, update) },
    { label: '周计划', render: () => weeklyPane(data, update) },
    { label: '日待办', render: () => dailyPane(data, update) }
  ];
  const tabEls = [];
  const paneEls = [];
  tabDefs.forEach((td, i) => {
    const tab = h('div', 'tab' + (i === 0 ? ' active' : ''), td.label);
    const pane = el('div', 'tabpane' + (i === 0 ? ' active' : ''));
    pane.appendChild(td.render());
    tab.addEventListener('click', () => {
      tabEls.forEach(t => t.classList.remove('active'));
      paneEls.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      pane.classList.add('active');
    });
    tabEls.push(tab);
    paneEls.push(pane);
    tabsBar.appendChild(tab);
  });
  root.appendChild(tabsBar);
  paneEls.forEach(p => root.appendChild(p));

  return root;
}

function monthlyPane(data, update) {
  const m = data.plans.monthly;
  const wrap = el('div');
  const card = el('div', 'card');
  const title = h('h3', '');
  title.appendChild(h('span', '', '月度计划'));

  const genBtn = el('button', 'btn-quick', '从年度目标生成');
  genBtn.addEventListener('click', () => {
    const goals = data.annualGoals || [];
    const now = new Date();
    const month = now.getMonth() + 1;
    const phaseGoals = goals.filter(g => {
      const p = g.phase || 1;
      if (month <= 4) return p === 1;
      if (month <= 8) return p <= 2;
      if (month <= 10) return p <= 3;
      return true;
    });
    const p0 = phaseGoals.filter(g => g.priority === 'P0').map(g => g.name);
    const p1 = phaseGoals.filter(g => g.priority === 'P1').map(g => g.name);
    m.top3 = [p0[0] || p1[0] || '', p0[1] || p1[1] || '', p0[2] || p1[2] || ''].filter(Boolean);
    const dims = ['A', 'B', 'C', 'D', 'E'];
    dims.forEach((d, i) => {
      const dimGoals = goals.filter(g => g.category === d);
      if (m.goals && m.goals[i]) {
        m.goals[i].target = dimGoals.map(g => g.name).join('、') || '';
        m.goals[i].metric = dimGoals.map(g => `${g.name}${g.progress}%`).join('；') || '';
      }
    });
    const monthNames = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
    m.theme = `${monthNames[month - 1]}：${p0.concat(p1).slice(0, 3).join(' + ')} 重点突破`;
    toast('月计划已从年度目标自动生成', 'success');
    update();
  });
  title.appendChild(genBtn);

  const aiBtn = el('button', 'btn-quick', 'AI 分解手写内容');
  aiBtn.style.marginLeft = '6px';
  aiBtn.addEventListener('click', () => {
    const goals = data.annualGoals || [];
    const top3Text = (m.top3 || []).filter(Boolean).join('，');
    const themeText = m.theme || '';
    if (!top3Text && !themeText) {
      toast('请先填写本月主题或 Top 3 目标', 'error');
      return;
    }
    const dims = ['A', 'B', 'C', 'D', 'E'];
    dims.forEach((d, i) => {
      const dimGoals = goals.filter(g => g.category === d);
      const matched = [];
      m.top3.forEach(t => {
        if (!t) return;
        const found = goals.find(g => g.name === t || t.includes(g.name) || g.name.includes(t));
        if (found && found.category === d) matched.push(found);
      });
      const autoFill = matched.length ? matched : dimGoals.slice(0, 2);
      if (m.goals && m.goals[i]) {
        m.goals[i].target = autoFill.map(g => g.name).join('、') || dimGoals.map(g => g.name).join('、') || '';
        m.goals[i].metric = autoFill.map(g => `${g.name}（当前${g.progress || 0}%）`).join('；') || '';
      }
    });
    if (m.keyMetrics) {
      const hasFitness = goals.some(g => g.name.includes('健身') || g.name.includes('作息'));
      const hasContent = goals.some(g => g.category === 'B');
      const hasReview = goals.some(g => g.name.includes('复盘'));
      const hasBook = goals.some(g => g.name.includes('读书') || g.name.includes('阅读'));
      m.keyMetrics.books = m.keyMetrics.books || 1;
      m.keyMetrics.posts = m.keyMetrics.posts || 4;
      m.keyMetrics.fitness = m.keyMetrics.fitness || 8;
      m.keyMetrics.review = m.keyMetrics.review || 30;
    }
    toast('已根据手写主题分解五维度目标和指标', 'success');
    update();
  });
  title.appendChild(aiBtn);
  card.appendChild(title);

  const themeBox = el('div');
  themeBox.style.cssText = 'margin-bottom:14px;';
  themeBox.appendChild(planLabel('本月主题'));
  const themeInput = planInput(m.theme, '如：打好会计基础，英语突破阅读');
  themeInput.addEventListener('input', () => { m.theme = themeInput.value; });
  themeBox.appendChild(themeInput);
  card.appendChild(themeBox);

  const top3Box = el('div');
  top3Box.style.cssText = 'margin-bottom:14px;';
  top3Box.appendChild(planLabel('Top 3 重点目标'));
  (m.top3 || []).forEach((val, i) => {
    const inp = planInput(val, `重点 ${i + 1}`);
    inp.style.marginBottom = '6px';
    inp.addEventListener('input', () => { m.top3[i] = inp.value; });
    top3Box.appendChild(inp);
  });
  card.appendChild(top3Box);

  const dimBox = el('div');
  dimBox.style.cssText = 'margin-bottom:14px;';
  dimBox.appendChild(planLabel('五维度目标'));
  const dims = ['A', 'B', 'C', 'D', 'E'];
  (m.goals || []).forEach((row, i) => {
    const dim = dims[i] || dims[0];
    const cat = GOAL_CATEGORIES[dim];
    const r = el('div');
    r.style.cssText = 'display:grid;grid-template-columns:90px 1fr 1fr;gap:8px;margin-bottom:8px;align-items:center;';
    const lbl = el('div');
    lbl.style.cssText = 'font-size:12px;color:var(--text-2);';
    lbl.textContent = `${cat.icon} ${cat.name}`;
    r.appendChild(lbl);
    const targetInp = planInput(row.target, '目标');
    targetInp.addEventListener('input', () => { m.goals[i].target = targetInp.value; });
    r.appendChild(targetInp);
    const metricInp = planInput(row.metric, '衡量指标');
    metricInp.addEventListener('input', () => { m.goals[i].metric = metricInp.value; });
    r.appendChild(metricInp);
    dimBox.appendChild(r);
  });
  card.appendChild(dimBox);

  const metricsBox = el('div');
  metricsBox.style.cssText = 'margin-bottom:14px;';
  metricsBox.appendChild(planLabel('关键指标'));
  const sg = el('div', 'stat-grid');
  const km = m.keyMetrics || {};
  const metricDefs = [
    { key: 'books', label: '读书(本)' },
    { key: 'posts', label: '内容(篇)' },
    { key: 'fitness', label: '健身(次)' },
    { key: 'review', label: '复盘(天)' }
  ];
  metricDefs.forEach(md => {
    const sc = el('div', 'stat-card');
    sc.appendChild(h('div', 'sc-label', md.label));
    const inp = planInput(km[md.key], '0');
    inp.style.cssText = 'width:60px;text-align:center;font-size:20px;font-weight:700;color:var(--accent);border:none;border-bottom:2px solid var(--border);border-radius:0;margin:6px auto 0;';
    inp.setAttribute('type', 'number');
    inp.addEventListener('input', () => { m.keyMetrics[md.key] = Number(inp.value) || 0; });
    sc.appendChild(inp);
    sc.style.textAlign = 'center';
    sg.appendChild(sc);
  });
  metricsBox.appendChild(sg);
  card.appendChild(metricsBox);

  const saveBtn = el('button', 'btn', '保存月计划');
  saveBtn.addEventListener('click', () => { update(); toast('月计划已保存', 'success'); });
  card.appendChild(saveBtn);

  wrap.appendChild(card);
  wrap.appendChild(buildMonthCalendar(data, update));

  return wrap;
}

function weeklyPane(data, update) {
  const w = data.plans.weekly;
  const wrap = el('div');
  const card = el('div', 'card');
  const title = h('h3', '');
  title.appendChild(h('span', '', '周计划'));

  const genBtn = el('button', 'btn-quick', '从月计划生成');
  genBtn.addEventListener('click', () => {
    const m = data.plans.monthly;
    const goals = data.annualGoals || [];
    const top3 = (m.top3 || []).filter(Boolean);

    const matchedGoals = top3.map(t => goals.find(g => g.name === t || t.includes(g.name) || g.name.includes(t))).filter(Boolean);
    const primaryGoals = matchedGoals.length ? matchedGoals : goals.filter(g => g.priority === 'P0').slice(0, 3);

    w.theme = top3.length ? `本周：${top3.join(' + ')} 专项推进` : (m.theme || '本周：按月计划推进');

    const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const sched = {};
    dayNames.forEach(d => { sched[d] = { A: '', B: '', C: '', D: '', E: '' }; });

    const goalA = goals.find(g => g.name === '会计考证');
    const goalB = goals.find(g => g.name === '小红书运营');
    const goalEng = goals.find(g => g.name === '英语雅思');
    const goalFit = goals.find(g => g.name === '健身');
    const goalSleep = goals.find(g => g.name === '规律作息');
    const goalRead = goals.find(g => g.name === '读书');
    const goalReview = goals.find(g => g.name === '日复盘');
    const goalCall = goals.find(g => g.name === '练字');
    const goalPod = goals.find(g => g.name === '播客');
    const goalTakeout = goals.find(g => g.name === '尽量不点外卖');
    const goalDy = goals.find(g => g.name === '抖音运营');

    const isPrimaryA = primaryGoals.some(g => g.name === '会计考证');
    const isPrimaryXhs = primaryGoals.some(g => g.name === '小红书运营');
    const isPrimaryPod = primaryGoals.some(g => g.name === '播客');
    const isPrimaryDy = primaryGoals.some(g => g.name === '抖音运营');
    const isPrimaryEng = primaryGoals.some(g => g.name === '英语雅思');

    if (isPrimaryA || goalA) {
      sched['周一']['A'] = '会计：经济法基础 第一章精学';
      sched['周二']['A'] = '会计：经济法基础 第一章习题';
      sched['周三']['A'] = '会计：经济法基础 第二章';
      sched['周四']['A'] = '会计：初级会计实务 第一章';
      sched['周五']['A'] = '会计：错题回顾+章节测试';
      sched['周六']['A'] = '会计：本周总结+薄弱点攻坚';
    }

    const bGoals = primaryGoals.filter(g => g.category === 'B');
    if (bGoals.length === 0) {
      if (goalB) bGoals.push(goalB);
      else if (goalPod) bGoals.push(goalPod);
      else if (goalDy) bGoals.push(goalDy);
    }

    const xhsTasksNew = ['账号搭建+主页装修', '选题库建立+拍摄第1篇', '修图+文案+发布第1篇', '数据复盘+评论区互动', '选题+拍摄第2篇', '发布第2篇+涨粉互动'];
    const xhsTasks = ['选题+拍摄', '修图+文案', '发布+互动', '数据复盘', '选题+拍摄第2篇', '发布+涨粉'];
    const podTasks = ['选题+大纲', '写稿+素材整理', '录制', '后期剪辑', '发布+宣传', '下期选题+复盘'];
    const dyTasks = ['选题+脚本', '拍摄+剪辑', '发布+互动', '数据复盘', '拍摄第2条', '发布+涨粉'];

    const getBTasks = (g) => {
      if (g.name.includes('小红书')) {
        return (g.currentStatus && g.currentStatus.includes('未开始')) ? xhsTasksNew : xhsTasks;
      }
      if (g.name.includes('播客')) return podTasks;
      if (g.name.includes('抖音')) return dyTasks;
      return xhsTasks;
    };

    const bDayMap = {
      '周一': 0, '周二': 1, '周三': 2, '周四': 3, '周五': 4, '周六': 5
    };

    if (bGoals.length === 1) {
      const g = bGoals[0];
      const tasks = getBTasks(g);
      Object.keys(bDayMap).forEach(day => {
        sched[day]['B'] = `${g.name}：${tasks[bDayMap[day]]}`;
      });
    } else if (bGoals.length >= 2) {
      const g1 = bGoals[0];
      const g2 = bGoals[1];
      const t1 = getBTasks(g1);
      const t2 = getBTasks(g2);
      sched['周一']['B'] = `${g1.name}：${t1[0]}`;
      sched['周二']['B'] = `${g2.name}：${t2[0]}`;
      sched['周三']['B'] = `${g1.name}：${t1[2]}`;
      sched['周四']['B'] = `${g2.name}：${t2[2]}`;
      sched['周五']['B'] = `${g1.name}：${t1[4]}`;
      sched['周六']['B'] = `${g2.name}：${t2[5]}`;
    }

    if (isPrimaryEng || goalEng) {
      const engTasks = isPrimaryEng
        ? ['听力Part1精听', '阅读精读+词汇', '写作小作文', '口语Part1练习']
        : ['听力30min', '阅读+词汇', '写作小作文', '听力+阅读'];
      sched['周二']['A'] = sched['周二']['A'] ? sched['周二']['A'] + ' / ' + engTasks[0] : '雅思：' + engTasks[0];
      sched['周四']['A'] = sched['周四']['A'] ? sched['周四']['A'] + ' / ' + engTasks[1] : '雅思：' + engTasks[1];
      sched['周六']['A'] = sched['周六']['A'] ? sched['周六']['A'] + ' / ' + engTasks[2] : '雅思：' + engTasks[2];
    }

    dayNames.forEach((day, i) => {
      const isWeekday = i < 5;
      if (isWeekday) {
        if (goalSleep) sched[day]['C'] = sched[day]['C'] || '7:00前起/23:00前睡';
        if (goalFit && (i === 0 || i === 2 || i === 4)) {
          sched[day]['C'] = (sched[day]['C'] ? sched[day]['C'] + ' + ' : '') + '健身：力量40min';
        } else if (goalFit && (i === 1 || i === 3)) {
          sched[day]['C'] = (sched[day]['C'] ? sched[day]['C'] + ' + ' : '') + '健身：有氧30min';
        }
        if (goalTakeout) sched[day]['C'] = sched[day]['C'] + ' / 不点外卖';
      }
      if (isWeekday && goalRead) {
        sched[day]['D'] = sched[day]['D'] || '读书30min';
      }
      if (isWeekday && goalCall) {
        sched[day]['D'] = (sched[day]['D'] ? sched[day]['D'] + ' + ' : '') + '练字15min';
      }
      if (isWeekday && goalReview) {
        sched[day]['E'] = sched[day]['E'] || '日复盘（睡前10min）';
      }
    });

    sched['周六']['D'] = sched['周六']['D'] || (goalRead ? '读书1小时' : '');
    if (goalTakeout) sched['周六']['C'] = (sched['周六']['C'] ? sched['周六']['C'] + ' + ' : '') + '外卖控制';
    sched['周日']['E'] = '周复盘+下周计划+休整';

    if (w.schedule) {
      Object.keys(sched).forEach(day => {
        if (!w.schedule[day]) w.schedule[day] = { A: '', B: '', C: '', D: '', E: '' };
        Object.keys(sched[day]).forEach(dim => {
          w.schedule[day][dim] = sched[day][dim];
        });
      });
    }

    if (w.mustDo) {
      w.mustDo = [
        top3[0] || (primaryGoals[0]?.name || ''),
        top3[1] || (primaryGoals[1]?.name || ''),
        top3[2] || (primaryGoals[2]?.name || '')
      ];
    }
    toast('周计划已从月计划Top3+年度目标智能生成', 'success');
    update();
  });
  title.appendChild(genBtn);

  const aiBtn = el('button', 'btn-quick', 'AI 分解手写主题');
  aiBtn.style.marginLeft = '6px';
  aiBtn.addEventListener('click', () => {
    const themeText = w.theme || '';
    if (!themeText) {
      toast('请先填写本周主题', 'error');
      return;
    }
    const goals = data.annualGoals || [];
    const keywords = themeText.replace(/本周[：:]/, '').split(/[，,、+]/).map(s => s.trim()).filter(Boolean);
    const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

    const keywordDim = {
      '会计': 'A', '英语': 'A', '雅思': 'A', '写作': 'A', 'PS': 'A', '剪辑': 'A',
      '小红书': 'B', '抖音': 'B', '哔哩': 'B', '视频': 'B', '播客': 'B', '内容': 'B', '运营': 'B',
      '健身': 'C', '运动': 'C', '作息': 'C', '外卖': 'C',
      '读书': 'D', '阅读': 'D', '观影': 'D', '练字': 'D',
      '复盘': 'E', '计划': 'E', '整理': 'E'
    };

    const keywordTasks = {
      '会计': ['经济法基础 第一章精学', '经济法基础 第一章习题', '经济法基础 第二章', '初级会计实务 第一章', '错题回顾+章节测试', '本周总结+薄弱点'],
      '英语': ['听力Part1精听', '阅读精读+词汇', '写作小作文', '口语Part1练习', '听力Part2', '写作大作文'],
      '雅思': ['听力Part1精听', '阅读精读+词汇', '写作小作文', '口语Part1练习', '听力Part2', '写作大作文'],
      '小红书': ['账号搭建+主页装修', '选题+拍摄第1篇', '修图+文案+发布', '数据复盘+互动', '选题+拍摄第2篇', '发布第2篇+涨粉'],
      '抖音': ['选题+脚本', '拍摄+剪辑', '发布+评论区互动', '数据复盘+选题', '拍摄第2条', '发布+涨粉互动'],
      '播客': ['选题+大纲', '写稿+素材整理', '录制', '后期剪辑', '发布+宣传', '下期选题'],
      '健身': ['力量训练40min', '有氧30min', '力量训练40min', '有氧30min', '力量训练40min', '拉伸放松'],
      '读书': ['读书30min', '读书30min', '读书30min', '读书30min', '读书30min', '读书1小时'],
      '写作': ['练笔500字', '素材收集', '练笔500字', '模仿爆款拆解', '练笔800字', '本周文章整理'],
      '复盘': ['日复盘', '日复盘', '日复盘', '日复盘', '日复盘', '周复盘']
    };

    const sched = {};
    dayNames.forEach(d => { sched[d] = { A: '', B: '', C: '', D: '', E: '' }; });

    keywords.forEach(kw => {
      let matched = false;
      for (const [key, dim] of Object.entries(keywordDim)) {
        if (kw.toLowerCase().includes(key.toLowerCase())) {
          const tasks = keywordTasks[key] || [];
          const dayIdx = dayNames.indexOf(dayNames.find(d => !sched[d][dim]) || dayNames[0]);
          const usedDays = [];
          tasks.forEach((task, i) => {
            const day = dayNames[i % 7];
            if (!usedDays.includes(day)) {
              sched[day][dim] = sched[day][dim] ? sched[day][dim] + ' + ' + task : `${kw.split(/[：:]/)[0]}：${task}`;
              usedDays.push(day);
            }
          });
          matched = true;
          break;
        }
      }
      if (!matched) {
        const day = dayNames.find(d => !sched[d]['A']) || dayNames[0];
        sched[day]['A'] = kw;
      }
    });

    const goalSleep = goals.find(g => g.name === '规律作息');
    const goalFit = goals.find(g => g.name === '健身');
    const goalRead = goals.find(g => g.name === '读书');
    const goalCall = goals.find(g => g.name === '练字');
    const goalReview = goals.find(g => g.name === '日复盘');
    const goalTakeout = goals.find(g => g.name === '尽量不点外卖');

    dayNames.forEach((day, i) => {
      const isWeekday = i < 5;
      if (isWeekday) {
        if (goalSleep && !sched[day]['C']) sched[day]['C'] = '7:00前起/23:00前睡';
        if (goalFit && !sched[day]['C'].includes('健身')) {
          const fitTask = (i === 0 || i === 2 || i === 4) ? '力量40min' : '有氧30min';
          sched[day]['C'] = sched[day]['C'] ? sched[day]['C'] + ' + 健身' + fitTask : '健身' + fitTask;
        }
        if (goalTakeout) sched[day]['C'] = sched[day]['C'] ? sched[day]['C'] + ' / 不点外卖' : '不点外卖';
        if (goalRead && !sched[day]['D']) sched[day]['D'] = '读书30min';
        if (goalCall && !sched[day]['D'].includes('练字')) sched[day]['D'] = sched[day]['D'] ? sched[day]['D'] + ' + 练字15min' : '练字15min';
        if (goalReview && !sched[day]['E']) sched[day]['E'] = '日复盘（睡前10min）';
      }
    });

    sched['周日']['E'] = sched['周日']['E'] || '周复盘+下周计划+休整';

    if (w.schedule) {
      Object.keys(sched).forEach(day => {
        if (!w.schedule[day]) w.schedule[day] = { A: '', B: '', C: '', D: '', E: '' };
        Object.keys(sched[day]).forEach(dim => {
          w.schedule[day][dim] = sched[day][dim];
        });
      });
    }
    if (w.mustDo) {
      w.mustDo = [keywords[0] || '', keywords[1] || '', keywords[2] || ''];
    }
    toast('已根据手写主题智能分解到每日具体任务', 'success');
    update();
  });
  title.appendChild(aiBtn);
  card.appendChild(title);

  const themeBox = el('div');
  themeBox.style.cssText = 'margin-bottom:14px;';
  themeBox.appendChild(planLabel('本周主题'));
  const themeInput = planInput(w.theme, '如：会计第一章 + 英语精读启动');
  themeInput.addEventListener('input', () => { w.theme = themeInput.value; });
  themeBox.appendChild(themeInput);
  card.appendChild(themeBox);

  const schedBox = el('div');
  schedBox.style.cssText = 'margin-bottom:14px;';
  schedBox.appendChild(planLabel('每日维度安排'));
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const dims = ['A', 'B', 'C', 'D', 'E'];
  const tbl = el('table');
  tbl.style.cssText = 'width:100%;border-collapse:collapse;';
  const thead = el('thead');
  const headRow = el('tr');
  headRow.appendChild(el('th', '', '<span style="font-size:11px;color:var(--text-3);"></span>'));
  dims.forEach(d => {
    const th = el('th', '', `<span style="font-size:11px;color:var(--text-2);">${GOAL_CATEGORIES[d].icon} ${d}</span>`);
    th.style.cssText = 'padding:6px 4px;text-align:center;';
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  tbl.appendChild(thead);
  const tbody = el('tbody');
  days.forEach(day => {
    const tr = el('tr');
    const dayCell = el('th', '', `<span style="font-size:12px;color:var(--text);font-weight:600;">${day}</span>`);
    dayCell.style.cssText = 'padding:6px 4px;text-align:center;width:50px;';
    tr.appendChild(dayCell);
    dims.forEach(d => {
      const td = el('td');
      td.style.cssText = 'padding:3px;';
      const inp = planInput((w.schedule[day] && w.schedule[day][d]) || '', '');
      inp.style.padding = '5px 6px';
      inp.style.fontSize = '11px';
      inp.addEventListener('input', () => {
        if (!w.schedule[day]) w.schedule[day] = { A: '', B: '', C: '', D: '', E: '' };
        w.schedule[day][d] = inp.value;
      });
      td.appendChild(inp);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  tbl.appendChild(tbody);
  schedBox.appendChild(tbl);
  card.appendChild(schedBox);

  const mustBox = el('div');
  mustBox.style.cssText = 'margin-bottom:14px;';
  mustBox.appendChild(planLabel('本周 Must-Do'));
  (w.mustDo || []).forEach((val, i) => {
    const v = typeof val === 'string' ? val : (val && val.text) || '';
    const inp = planInput(v, `Must-Do ${i + 1}`);
    inp.style.marginBottom = '6px';
    inp.addEventListener('input', () => { w.mustDo[i] = inp.value; });
    mustBox.appendChild(inp);
  });
  card.appendChild(mustBox);

  const saveBtn = el('button', 'btn', '保存周计划');
  saveBtn.addEventListener('click', () => { update(); toast('周计划已保存', 'success'); });
  card.appendChild(saveBtn);

  wrap.appendChild(card);
  wrap.appendChild(buildWeeklyKanban(data, update));

  return wrap;
}

function autoGenerateDaily(data) {
  const existing = {};
  (data.plans.daily || []).forEach(t => {
    if (t.timeBlock) existing[t.timeBlock + '|' + t.text] = t.done;
  });
  const custom = (data.plans.daily || []).filter(t => !t.timeBlock);
  const generated = TIME_BLOCKS.map(b => ({
    id: uid('t'),
    text: b.activity,
    tag: b.tag,
    done: existing[b.time + '|' + b.activity] || false,
    timeBlock: b.time,
    goalId: ''
  }));
  data.plans.daily = generated.concat(custom);
}

function dailyPane(data, update) {
  const card = el('div', 'card');
  const title = h('h3', '');
  title.appendChild(h('span', '', '今日待办'));
  const genBtn = el('button', 'btn-quick', '自动生成今日待办');
  genBtn.addEventListener('click', () => {
    autoGenerateDaily(data);
    toast('已生成今日待办', 'success');
    update();
  });
  title.appendChild(genBtn);
  card.appendChild(title);

  const daily = (data.plans && data.plans.daily) || [];
  if (daily.length) {
    const tb = el('div', 'time-block');
    TIME_BLOCKS.forEach(block => {
      const row = el('div', 'tb-row');
      row.appendChild(h('div', 'tb-time', block.time));
      row.appendChild(h('div', 'tb-activity', block.activity));
      tb.appendChild(row);
      const tasks = daily.filter(t => t.timeBlock === block.time);
      if (tasks.length) {
        const wrap = el('div', 'tb-tasks');
        tasks.forEach(t => {
          wrap.appendChild(dailyTodoRow(t, data, update));
        });
        tb.appendChild(wrap);
      }
    });
    const noBlock = daily.filter(t => !t.timeBlock);
    if (noBlock.length) {
      const row = el('div', 'tb-row');
      row.appendChild(h('div', 'tb-time', '其他'));
      row.appendChild(h('div', 'tb-activity', '自定义任务'));
      tb.appendChild(row);
      const wrap = el('div', 'tb-tasks');
      noBlock.forEach(t => {
        wrap.appendChild(dailyTodoRow(t, data, update));
      });
      tb.appendChild(wrap);
    }
    card.appendChild(tb);
  } else {
    card.appendChild(el('div', 'empty-hint', '<div class="hint-icon">📋</div>今日还没有待办，点击上方按钮自动生成'));
  }

  const addBox = el('div', 'todo-add');
  const tagSel = el('select');
  tagSel.style.cssText = 'width:auto;border:1px solid var(--border);border-radius:6px;padding:6px 8px;font-size:12px;font-family:var(--font);outline:none;color:var(--text);background:var(--surface);';
  Object.keys(TAG_LABELS).forEach(k => {
    const opt = el('option', '', '');
    opt.value = k;
    opt.textContent = TAG_LABELS[k];
    tagSel.appendChild(opt);
  });
  const textInp = el('input');
  textInp.style.cssText = 'flex:1;border:1px solid var(--border);border-radius:6px;padding:6px 8px;font-size:12px;font-family:var(--font);outline:none;color:var(--text);';
  textInp.placeholder = '添加新待办...';
  const addBtn = el('button', 'btn-add', '添加');
  addBtn.addEventListener('click', () => {
    const text = textInp.value.trim();
    if (!text) { toast('请输入待办内容', 'error'); return; }
    if (!data.plans.daily) data.plans.daily = [];
    data.plans.daily.push({
      id: uid('t'),
      text,
      tag: tagSel.value,
      done: false,
      timeBlock: '',
      goalId: ''
    });
    textInp.value = '';
    update();
  });
  textInp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addBtn.click();
  });
  addBox.appendChild(tagSel);
  addBox.appendChild(textInp);
  addBox.appendChild(addBtn);
  card.appendChild(addBox);

  return card;
}

function dailyTodoRow(t, data, update) {
  const row = el('div', 'todo' + (t.done ? ' done' : ''));
  row.appendChild(h('div', 'check'));
  row.appendChild(h('div', 'text', t.text));
  row.appendChild(h('div', 'tag tag-' + (t.tag || 'x'), TAG_LABELS[t.tag] || '其他'));
  row.addEventListener('click', (e) => {
    if (e.target.classList.contains('todo-del')) return;
    t.done = !t.done;
    update();
  });
  const del = h('span', 'todo-del', '×');
  del.addEventListener('click', (e) => {
    e.stopPropagation();
    const idx = data.plans.daily.findIndex(x => x.id === t.id);
    if (idx >= 0) {
      data.plans.daily.splice(idx, 1);
      update();
    }
  });
  row.appendChild(del);
  return row;
}

function buildMonthCalendar(data, update) {
  const m = data.plans.monthly;
  if (!m.calendarTasks) m.calendarTasks = [];

  const card = el('div', 'card');
  const title = h('h3', '', '月历任务');
  card.appendChild(title);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();
  const monthNames = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];

  const hdr = el('div');
  hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;';
  hdr.appendChild(h('span', '', `${year}年 ${monthNames[month]}`));
  card.appendChild(hdr);

  const calBox = el('div');
  const weekHeader = ['一','二','三','四','五','六','日'];
  const headRow = el('div');
  headRow.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:6px;';
  weekHeader.forEach(d => {
    const c = el('div');
    c.style.cssText = 'text-align:center;font-size:12px;color:var(--text-2);font-weight:600;padding:4px;';
    c.textContent = d;
    headRow.appendChild(c);
  });
  calBox.appendChild(headRow);

  const grid = el('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:4px;';

  for (let i = 0; i < offset; i++) {
    const empty = el('div');
    empty.style.cssText = 'min-height:70px;border-radius:6px;background:var(--bg);';
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const cell = el('div');
    const isToday = d === today;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayTasks = m.calendarTasks.filter(t => t.date === dateStr);
    cell.style.cssText = `min-height:70px;border-radius:6px;padding:4px;border:1px solid ${isToday ? 'var(--accent)' : 'var(--border)'};background:${isToday ? 'var(--accent-bg, rgba(59,130,246,0.06))' : 'var(--surface)'};position:relative;cursor:pointer;overflow-y:auto;`;

    const dateLabel = el('div');
    dateLabel.style.cssText = `font-size:11px;font-weight:700;color:${isToday ? 'var(--accent)' : 'var(--text-2)'};margin-bottom:2px;`;
    dateLabel.textContent = d;
    cell.appendChild(dateLabel);

    dayTasks.forEach(t => {
      const tag = el('div');
      const colors = { A: '#3b82f6', B: '#f59e0b', C: '#10b981', D: '#8b5cf6', E: '#ef4444' };
      tag.style.cssText = `font-size:10px;padding:2px 4px;border-radius:3px;margin-bottom:2px;background:${colors[t.dim] || '#6b7280'}20;color:${colors[t.dim] || '#6b7280'};cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
      tag.textContent = t.text;
      tag.title = t.text;
      tag.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`删除任务「${t.text}」？`)) {
          const idx = m.calendarTasks.findIndex(x => x.id === t.id);
          if (idx >= 0) m.calendarTasks.splice(idx, 1);
          update();
        }
      });
      cell.appendChild(tag);
    });

    cell.addEventListener('click', () => {
      const text = prompt(`在 ${dateStr} 添加任务：\n（输入任务内容，可选维度前缀如 A: B: C: D: E:）`, '');
      if (text && text.trim()) {
        let dim = 'A';
        const trimmed = text.trim();
        const dimMatch = trimmed.match(/^([A-Ea-e])[:：]/);
        if (dimMatch) {
          dim = dimMatch[1].toUpperCase();
        }
        const taskText = dimMatch ? trimmed.replace(/^([A-Ea-e])[:：]\s*/, '') : trimmed;
        m.calendarTasks.push({
          id: uid('ct'),
          date: dateStr,
          text: taskText,
          dim
        });
        update();
      }
    });

    grid.appendChild(cell);
  }

  calBox.appendChild(grid);
  card.appendChild(calBox);

  const hint = el('div');
  hint.style.cssText = 'font-size:11px;color:var(--text-3);margin-top:8px;';
  hint.textContent = '点击日期添加任务，点击任务可删除。维度前缀：A硬技能 B运营 C健康 D素养 E系统';
  card.appendChild(hint);

  return card;
}

function buildWeeklyKanban(data, update) {
  const w = data.plans.weekly;
  const card = el('div', 'card');
  const title = h('h3', '', '周计划看板');
  card.appendChild(title);

  const dims = [
    { key: 'A', label: '硬技能', icon: '💼', color: '#3b82f6' },
    { key: 'B', label: '运营', icon: '🎨', color: '#f59e0b' },
    { key: 'C', label: '健康', icon: '💪', color: '#10b981' },
    { key: 'D', label: '素养', icon: '📖', color: '#8b5cf6' },
    { key: 'E', label: '系统', icon: '🔄', color: '#ef4444' }
  ];
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  const cols = el('div');
  cols.style.cssText = 'display:grid;grid-template-columns:repeat(5,1fr);gap:10px;overflow-x:auto;';

  dims.forEach(dim => {
    const col = el('div');
    col.style.cssText = `min-width:140px;border-radius:8px;background:var(--bg);padding:8px;border-top:3px solid ${dim.color};`;

    const colHead = el('div');
    colHead.style.cssText = 'font-size:12px;font-weight:700;margin-bottom:8px;color:var(--text);';
    colHead.innerHTML = `${dim.icon} ${dim.label}`;
    col.appendChild(colHead);

    days.forEach(day => {
      const val = (w.schedule[day] && w.schedule[day][dim.key]) || '';
      const dayBox = el('div');
      dayBox.style.cssText = `margin-bottom:6px;padding:6px 8px;border-radius:5px;background:var(--surface);border:1px solid var(--border);font-size:11px;min-height:32px;`;

      const dayLabel = el('div');
      dayLabel.style.cssText = 'font-size:10px;color:var(--text-3);margin-bottom:3px;';
      dayLabel.textContent = day;
      dayBox.appendChild(dayLabel);

      const taskText = el('div');
      taskText.style.cssText = 'color:var(--text);word-break:break-all;line-height:1.4;';
      taskText.textContent = val || '—';
      if (!val) taskText.style.color = 'var(--text-3)';
      dayBox.appendChild(taskText);

      dayBox.addEventListener('click', () => {
        const newVal = prompt(`${day} / ${dim.label}`, val);
        if (newVal !== null) {
          if (!w.schedule[day]) w.schedule[day] = { A: '', B: '', C: '', D: '', E: '' };
          w.schedule[day][dim.key] = newVal;
          update();
        }
      });

      col.appendChild(dayBox);
    });

    cols.appendChild(col);
  });

  card.appendChild(cols);

  const hint = el('div');
  hint.style.cssText = 'font-size:11px;color:var(--text-3);margin-top:8px;';
  hint.textContent = '点击任意格子可编辑任务内容';
  card.appendChild(hint);

  return card;
}
