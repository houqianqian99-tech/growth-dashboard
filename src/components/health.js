import { el, h, todayStr, monthStr, toast, openModal, closeModal, weekStart } from '../utils/helpers.js';
import { SUGGESTIONS } from '../utils/frameworks.js';

export function renderHealth(data, update) {
  const root = el('div', 'page');
  const grid = el('div', 'health-grid');

  grid.appendChild(buildFitnessCard(data, update));
  grid.appendChild(buildSleepCard(data, update));
  grid.appendChild(buildTakeoutCard(data, update));

  root.appendChild(grid);
  root.appendChild(buildAISuggest());

  return root;
}

function buildFitnessCard(data, update) {
  const card = el('div', 'card');
  const head = h('h3', '', '健身');
  const addBtn = el('button', 'btn btn-sm', '记录体重');
  addBtn.addEventListener('click', () => openWeightModal(data, update));
  head.appendChild(addBtn);
  card.appendChild(head);

  const log = data.health.weightLog || [];
  const recent = log.slice(-14);

  if (recent.length) {
    card.appendChild(h('div', 'muted', `近期体重 ${recent[recent.length - 1].weight} kg`));
    card.appendChild(buildWeightChart(recent));
  } else {
    card.appendChild(emptyHint('还没有体重记录，点击记录开始'));
  }

  const ws = weekStart(new Date());
  card.appendChild(h('h4', '', '本周运动'));
  const dots = el('div', 'week-dots');
  for (let i = 0; i < 7; i++) {
    const d = new Date(ws);
    d.setDate(ws.getDate() + i);
    const ds = dateFmt(d);
    const hasWeight = log.some(e => e.date === ds);
    const dot = el('div', 'wd' + (hasWeight ? ' done' : ''));
    dot.appendChild(h('div', 'd', '日一二三四五六'[d.getDay()]));
    dot.appendChild(h('div', 'n', String(d.getDate())));
    dots.appendChild(dot);
  }
  card.appendChild(dots);

  return card;
}

function buildWeightChart(entries) {
  const wrap = el('div', 'weight-chart');
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 300 120');
  svg.setAttribute('preserveAspectRatio', 'none');

  const weights = entries.map(e => Number(e.weight));
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;
  const pad = 10;
  const w = 300;
  const h = 120;
  const innerH = h - pad * 2;

  if (entries.length > 1) {
    const points = entries.map((e, i) => {
      const x = pad + (i / (entries.length - 1)) * (w - pad * 2);
      const y = pad + innerH - ((Number(e.weight) - min) / range) * innerH;
      return `${x},${y}`;
    }).join(' ');

    const area = document.createElementNS(svgNS, 'polygon');
    const firstX = pad;
    const lastX = pad + (w - pad * 2);
    const baseY = h - pad;
    const pts = `${firstX},${baseY} ${points} ${lastX},${baseY}`;
    area.setAttribute('points', pts);
    area.setAttribute('fill', 'rgba(74,144,217,0.12)');
    svg.appendChild(area);

    const line = document.createElementNS(svgNS, 'polyline');
    line.setAttribute('points', points);
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', 'var(--accent)');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-linejoin', 'round');
    line.setAttribute('stroke-linecap', 'round');
    svg.appendChild(line);
  }

  entries.forEach((e, i) => {
    const x = entries.length > 1
      ? pad + (i / (entries.length - 1)) * (w - pad * 2)
      : w / 2;
    const y = pad + innerH - ((Number(e.weight) - min) / range) * innerH;
    const c = document.createElementNS(svgNS, 'circle');
    c.setAttribute('cx', x);
    c.setAttribute('cy', y);
    c.setAttribute('r', 2.5);
    c.setAttribute('fill', 'var(--accent)');
    svg.appendChild(c);
  });

  wrap.appendChild(svg);
  return wrap;
}

function openWeightModal(data, update) {
  const modalHtml = `
    <div class="modal">
      <h3>记录体重</h3>
      <div class="form-row">
        <label>日期</label>
        <input type="date" id="w-date" value="${todayStr()}" />
      </div>
      <div class="form-row">
        <label>体重 (kg)</label>
        <input type="number" id="w-weight" step="0.1" min="0" placeholder="如 65.5" />
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" data-close>取消</button>
        <button class="btn" id="w-save">保存</button>
      </div>
    </div>
  `;
  const overlay = openModal(modalHtml, (ov) => {
    ov.querySelector('#w-save').addEventListener('click', () => {
      const date = ov.querySelector('#w-date').value || todayStr();
      const weight = parseFloat(ov.querySelector('#w-weight').value);
      if (!weight || weight <= 0) {
        toast('请输入有效体重', 'error');
        return;
      }
      if (!data.health.weightLog) data.health.weightLog = [];
      const existing = data.health.weightLog.findIndex(e => e.date === date);
      if (existing >= 0) {
        data.health.weightLog[existing].weight = weight;
      } else {
        data.health.weightLog.push({ date, weight });
      }
      toast('体重已记录', 'success');
      closeModal(overlay);
      update();
    });
  });
}

function buildSleepCard(data, update) {
  const card = el('div', 'card');
  const head = h('h3', '', '作息');
  const addBtn = el('button', 'btn btn-sm', '记录睡眠');
  addBtn.addEventListener('click', () => openSleepModal(data, update));
  head.appendChild(addBtn);
  card.appendChild(head);

  const log = data.health.sleepLog || [];
  const ws = weekStart(new Date());
  const weekLog = log.filter(e => e.date >= dateFmt(ws));

  if (weekLog.length) {
    const avgDur = weekLog.reduce((sum, e) => sum + calcSleepHours(e), 0) / weekLog.length;
    const avgQ = weekLog.reduce((sum, e) => sum + (e.quality || 3), 0) / weekLog.length;
    card.appendChild(h('div', 'muted', `本周平均睡眠 ${avgDur.toFixed(1)}h · 质量 ${avgQ.toFixed(1)}/5`));

    const list = el('div');
    list.style.marginTop = '8px';
    weekLog.slice().reverse().forEach(e => {
      const hours = calcSleepHours(e);
      const stars = '★'.repeat(e.quality || 3) + '☆'.repeat(5 - (e.quality || 3));
      list.appendChild(h('div', 'rw-sub', `${e.date} · ${e.bedtime}-${e.wakeTime} · ${hours.toFixed(1)}h · ${stars}`));
    });
    card.appendChild(list);
  } else {
    card.appendChild(emptyHint('本周还没有睡眠记录'));
  }

  return card;
}

function calcSleepHours(e) {
  if (!e.bedtime || !e.wakeTime) return 0;
  const [bh, bm] = e.bedtime.split(':').map(Number);
  const [wh, wm] = e.wakeTime.split(':').map(Number);
  let mins = (wh * 60 + wm) - (bh * 60 + bm);
  if (mins < 0) mins += 24 * 60;
  return mins / 60;
}

function openSleepModal(data, update) {
  const modalHtml = `
    <div class="modal">
      <h3>记录睡眠</h3>
      <div class="form-row">
        <label>日期</label>
        <input type="date" id="s-date" value="${todayStr()}" />
      </div>
      <div class="form-row">
        <label>入睡时间</label>
        <input type="time" id="s-bedtime" value="22:30" />
      </div>
      <div class="form-row">
        <label>起床时间</label>
        <input type="time" id="s-waketime" value="06:30" />
      </div>
      <div class="form-row">
        <label>睡眠质量 (1-5)</label>
        <input type="number" id="s-quality" value="3" min="1" max="5" />
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" data-close>取消</button>
        <button class="btn" id="s-save">保存</button>
      </div>
    </div>
  `;
  const overlay = openModal(modalHtml, (ov) => {
    ov.querySelector('#s-save').addEventListener('click', () => {
      const date = ov.querySelector('#s-date').value || todayStr();
      const bedtime = ov.querySelector('#s-bedtime').value;
      const wakeTime = ov.querySelector('#s-waketime').value;
      const quality = parseInt(ov.querySelector('#s-quality').value) || 3;
      if (!bedtime || !wakeTime) {
        toast('请填写入睡和起床时间', 'error');
        return;
      }
      if (!data.health.sleepLog) data.health.sleepLog = [];
      const existing = data.health.sleepLog.findIndex(e => e.date === date);
      const entry = { date, bedtime, wakeTime, quality };
      if (existing >= 0) {
        data.health.sleepLog[existing] = entry;
      } else {
        data.health.sleepLog.push(entry);
      }
      toast('睡眠已记录', 'success');
      closeModal(overlay);
      update();
    });
  });
}

function buildTakeoutCard(data, update) {
  const card = el('div', 'card');
  card.appendChild(h('h3', '', '外卖'));

  const log = data.health.takeoutLog || [];
  const today = todayStr();
  const todayEntry = log.find(e => e.date === today);

  const checkWrap = el('div');
  checkWrap.style.marginBottom = '12px';
  checkWrap.appendChild(h('div', 'rw-sub', '今天点外卖了吗？'));
  const btnRow = el('div');
  btnRow.style.display = 'flex';
  btnRow.style.gap = '8px';
  btnRow.style.marginTop = '6px';

  const noBtn = el('button', 'btn btn-sm', '没有');
  noBtn.addEventListener('click', () => {
    const idx = log.findIndex(e => e.date === today);
    if (idx >= 0) log.splice(idx, 1);
    else log.push({ date: today, hadTakeout: false, reason: '' });
    toast('已记录：今天没点外卖', 'success');
    update();
  });
  const yesBtn = el('button', 'btn btn-sm', '点了');
  yesBtn.addEventListener('click', () => openTakeoutReasonModal(data, today, update));
  btnRow.appendChild(noBtn);
  btnRow.appendChild(yesBtn);
  checkWrap.appendChild(btnRow);
  card.appendChild(checkWrap);

  const m = monthStr(new Date());
  const monthLog = log.filter(e => e.date.startsWith(m));
  const takeoutDays = monthLog.filter(e => e.hadTakeout).length;
  const noTakeoutDays = monthLog.length - takeoutDays;
  card.appendChild(h('div', 'muted', `本月外卖 ${takeoutDays} 次 · 未点 ${noTakeoutDays} 天`));

  let streak = 0;
  const sorted = log.slice().sort((a, b) => a.date < b.date ? 1 : -1);
  for (const e of sorted) {
    if (e.date > today) continue;
    if (!e.hadTakeout) streak++;
    else break;
  }
  card.appendChild(h('div', 'muted', `连续未点外卖 ${streak} 天`));

  if (monthLog.length) {
    const barWrap = el('div');
    barWrap.style.marginTop = '10px';
    barWrap.appendChild(h('div', 'rw-sub', '本月分布'));
    const bar = el('div', 'progress');
    bar.style.height = '14px';
    bar.style.borderRadius = '7px';
    const fill = el('div', 'fill orange');
    const pct = monthLog.length ? (takeoutDays / monthLog.length) * 100 : 0;
    fill.style.width = pct + '%';
    fill.style.height = '100%';
    bar.appendChild(fill);
    barWrap.appendChild(bar);
    barWrap.appendChild(h('div', 'rw-sub', `外卖 ${takeoutDays} / 未点 ${noTakeoutDays}`));
    card.appendChild(barWrap);
  }

  return card;
}

function openTakeoutReasonModal(data, date, update) {
  const modalHtml = `
    <div class="modal">
      <h3>记录外卖</h3>
      <div class="form-row">
        <label>今天点外卖的原因</label>
        <textarea id="t-reason" placeholder="如：太忙没时间做饭、想吃某家店…"></textarea>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" data-close>取消</button>
        <button class="btn" id="t-save">保存</button>
      </div>
    </div>
  `;
  const overlay = openModal(modalHtml, (ov) => {
    ov.querySelector('#t-save').addEventListener('click', () => {
      const reason = ov.querySelector('#t-reason').value.trim();
      if (!data.health.takeoutLog) data.health.takeoutLog = [];
      const existing = data.health.takeoutLog.findIndex(e => e.date === date);
      const entry = { date, hadTakeout: true, reason };
      if (existing >= 0) {
        data.health.takeoutLog[existing] = entry;
      } else {
        data.health.takeoutLog.push(entry);
      }
      toast('已记录外卖', 'success');
      closeModal(overlay);
      update();
    });
  });
}

function buildAISuggest() {
  const card = el('div', 'card');
  card.appendChild(h('h3', '', 'AI 健康建议'));
  const box = el('div', 'ai-suggest');
  SUGGESTIONS.health.forEach(s => {
    const line = el('div');
    line.style.marginBottom = '6px';
    line.innerHTML = `<b>${s.label}</b>：${s.detail}`;
    box.appendChild(line);
  });
  card.appendChild(box);
  return card;
}

function emptyHint(text) {
  const hint = el('div', 'empty-hint');
  hint.appendChild(h('div', 'hint-icon', '📊'));
  hint.appendChild(h('div', '', text));
  return hint;
}

function dateFmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
