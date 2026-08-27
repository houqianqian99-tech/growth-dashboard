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
  const card = el('div', 'card');
  card.appendChild(h('h3', '', '月度计划'));

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

  return card;
}

function weeklyPane(data, update) {
  const w = data.plans.weekly;
  const card = el('div', 'card');
  card.appendChild(h('h3', '', '周计划'));

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
    const inp = planInput(val, `Must-Do ${i + 1}`);
    inp.style.marginBottom = '6px';
    inp.addEventListener('input', () => { w.mustDo[i] = inp.value; });
    mustBox.appendChild(inp);
  });
  card.appendChild(mustBox);

  const saveBtn = el('button', 'btn', '保存周计划');
  saveBtn.addEventListener('click', () => { update(); toast('周计划已保存', 'success'); });
  card.appendChild(saveBtn);

  return card;
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
