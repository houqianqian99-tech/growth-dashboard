import { el, h, todayStr, dateStr, uid, toast } from '../utils/helpers.js';

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

function ringSvg(completed, total) {
  const r = 32;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? completed / total : 0;
  const offset = circ * (1 - pct);
  return `<svg viewBox="0 0 80 80" style="width:80px;height:80px;">
    <circle cx="40" cy="40" r="${r}" fill="none" stroke="#EEF2F7" stroke-width="8"/>
    <circle cx="40" cy="40" r="${r}" fill="none" stroke="#6BCB77" stroke-width="8"
      stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"
      transform="rotate(-90 40 40)" stroke-linecap="round"
      style="transition:stroke-dashoffset 0.4s;"/>
    <text x="40" y="38" text-anchor="middle" font-size="16" font-weight="700" fill="#1A1B25">${completed}</text>
    <text x="40" y="50" text-anchor="middle" font-size="10" fill="#9CA3AF">/${total}</text>
  </svg>`;
}

export function renderHabits(data, update) {
  const root = el('div', 'page');
  const habits = data.habits || [];
  const today = todayStr();
  const habitData = data.habitData || {};

  const sumCard = el('div', 'card');
  sumCard.appendChild(h('h3', '', '今日习惯完成'));
  const completed = habits.filter(name => {
    const hd = habitData[name] || {};
    return hd[today] === 1;
  }).length;
  const summary = el('div', 'habit-summary');
  const ring = el('div', 'hs-ring');
  ring.innerHTML = ringSvg(completed, habits.length);
  summary.appendChild(ring);
  const info = el('div', 'hs-info');
  info.appendChild(el('div', 'hs-row', `<b>${completed}</b> / ${habits.length} 已完成`));
  const rate = habits.length ? Math.round(completed / habits.length * 100) : 0;
  info.appendChild(el('div', 'hs-row', `完成率 <b>${rate}%</b>`));
  summary.appendChild(info);
  sumCard.appendChild(summary);

  if (habits.length) {
    const list = el('div');
    list.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-top:14px;';
    habits.forEach(name => {
      const hd = habitData[name] || {};
      const done = hd[today] === 1;
      const btn = el('button', 'btn-quick' + (done ? '' : ' btn-secondary'));
      btn.style.cssText = done
        ? 'background:var(--green);color:#fff;border:1px solid var(--green);padding:6px 12px;font-size:12px;border-radius:6px;cursor:pointer;font-family:var(--font);font-weight:600;'
        : 'background:var(--surface-3);color:var(--text-2);border:1px solid var(--border);padding:6px 12px;font-size:12px;border-radius:6px;cursor:pointer;font-family:var(--font);';
      const label = el('span');
      label.textContent = (done ? '✓ ' : '○ ') + name;
      btn.appendChild(label);
      btn.addEventListener('click', () => {
        if (!data.habitData) data.habitData = {};
        if (!data.habitData[name]) data.habitData[name] = {};
        if (data.habitData[name][today]) delete data.habitData[name][today];
        else data.habitData[name][today] = 1;
        update();
      });
      list.appendChild(btn);
    });
    sumCard.appendChild(list);
  } else {
    sumCard.appendChild(el('div', 'empty-hint', '<div class="hint-icon">🌿</div>还没有习惯，下方添加吧'));
  }
  root.appendChild(sumCard);

  const heatCard = el('div', 'card');
  heatCard.appendChild(h('h3', '', '习惯打卡热力图（30天）'));
  if (habits.length) {
    const dates = lastNDates(30);
    const wrap = el('div', 'habit-heatmap');
    const grid = el('div', 'hh-grid');
    habits.forEach(name => {
      const row = el('div', 'hh-row');
      const nameCell = h('div', 'hh-name', name);
      row.appendChild(nameCell);
      const hd = habitData[name] || {};
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
      const delBtn = h('span', 'todo-del', '×');
      delBtn.style.marginLeft = '4px';
      delBtn.title = '删除习惯';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = data.habits.indexOf(name);
        if (idx >= 0) {
          data.habits.splice(idx, 1);
          if (data.habitData && data.habitData[name]) delete data.habitData[name];
          toast('已删除习惯: ' + name, 'success');
          update();
        }
      });
      row.appendChild(delBtn);
      grid.appendChild(row);
    });
    wrap.appendChild(grid);
    const legend = el('div', 'habit-legend');
    legend.appendChild(h('span', '', '少'));
    legend.appendChild(el('span', 'lg l0'));
    legend.appendChild(el('span', 'lg l3'));
    legend.appendChild(h('span', '', '多'));
    wrap.appendChild(legend);
    heatCard.appendChild(wrap);
  } else {
    heatCard.appendChild(el('div', 'empty-hint', '还没有习惯数据'));
  }
  root.appendChild(heatCard);

  const addCard = el('div', 'card');
  addCard.appendChild(h('h3', '', '添加习惯'));
  const addBox = el('div', 'todo-add');
  const inp = el('input');
  inp.style.cssText = 'border:1px solid var(--border);border-radius:6px;padding:6px 8px;font-size:12px;font-family:var(--font);outline:none;color:var(--text);flex:1;';
  inp.placeholder = '输入习惯名称，如：冥想10分钟';
  const addBtn = el('button', 'btn-add', '添加');
  addBtn.addEventListener('click', () => {
    const name = inp.value.trim();
    if (!name) { toast('请输入习惯名称', 'error'); return; }
    if (!data.habits) data.habits = [];
    if (data.habits.includes(name)) { toast('该习惯已存在', 'error'); return; }
    data.habits.push(name);
    inp.value = '';
    toast('已添加习惯: ' + name, 'success');
    update();
  });
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addBtn.click();
  });
  addBox.appendChild(inp);
  addBox.appendChild(addBtn);
  addCard.appendChild(addBox);
  root.appendChild(addCard);

  const tipCard = el('div', 'card');
  tipCard.appendChild(h('h3', '', '习惯叠加法'));
  tipCard.appendChild(el('div', 'ai-suggest', '将新习惯绑定到已有日常行为上，利用<q>触发器</q>自动启动：<br><br><b>刷牙时</b>听英语 → <b>吃完早饭后</b>学会计 → <b>日复盘后</b>练字<br><br>公式：在 [已有习惯] 之后，立刻 [新习惯]。坚持 21 天即可形成自动化。'));
  root.appendChild(tipCard);

  return root;
}
