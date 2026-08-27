import { el, h, daysUntil, openModal, closeModal, uid, toast } from '../utils/helpers.js';
import { GOAL_CATEGORIES, PHASES } from '../utils/frameworks.js';

function progressColor(p) {
  if (p === 0) return 'blue';
  if (p < 80) return 'orange';
  return 'green';
}

function progressBg(p) {
  const c = progressColor(p);
  if (c === 'green') return 'var(--green)';
  if (c === 'orange') return 'var(--accent2)';
  return 'var(--accent)';
}

function cheerText(p) {
  if (p === 0) return '还没开始，今天迈出第一步吧！';
  if (p < 30) return '已经起步，保持节奏稳步推进。';
  if (p < 60) return '进展不错，继续加油，过半在望！';
  if (p < 80) return '冲刺阶段，不要松懈！';
  if (p < 100) return '即将达成，最后一口气！';
  return '已达成，太棒了！';
}

function phaseLabel(phase) {
  const p = PHASES.find(x => x.id === phase);
  return p ? p.label : 'Phase ' + phase;
}

export function renderGoals(data, update) {
  const root = el('div', 'page');
  const goals = data.annualGoals || [];

  const header = el('div', 'card');
  const h3 = h('h3', '');
  h3.appendChild(h('span', '', '年度目标'));
  const addBtn = el('button', 'btn', '+ 新增目标');
  addBtn.addEventListener('click', () => openGoalModal(null, data, update));
  h3.appendChild(addBtn);
  header.appendChild(h3);
  root.appendChild(header);

  const catKeys = Object.keys(GOAL_CATEGORIES);
  catKeys.forEach(key => {
    const cat = GOAL_CATEGORIES[key];
    const catGoals = goals.filter(g => g.category === key);
    const card = el('div', 'card');
    const title = h('h3', '');
    title.appendChild(h('span', '', `${cat.icon} ${cat.name}`));
    title.appendChild(h('span', 'badge badge-cat badge-cat-' + cat.color, catGoals.length + ' 个目标'));
    card.appendChild(title);
    if (catGoals.length) {
      const grid = el('div', 'goal-cards');
      catGoals.forEach(g => {
        grid.appendChild(goalCardEl(g, data, update));
      });
      card.appendChild(grid);
    } else {
      card.appendChild(el('div', 'empty-hint', '该分类下还没有目标'));
    }
    root.appendChild(card);
  });

  const phaseCard = el('div', 'card');
  phaseCard.appendChild(h('h3', '', '阶段规划'));
  const timeline = el('div', 'phase-timeline');
  PHASES.forEach(p => {
    const item = el('div', 'phase-item' + (p.id === 1 ? ' current' : ''));
    item.appendChild(h('div', 'pi-label', p.label));
    item.appendChild(h('div', 'pi-time', p.time + ' · ' + p.name));
    item.appendChild(h('div', 'pi-goals', p.goals));
    timeline.appendChild(item);
  });
  phaseCard.appendChild(timeline);
  root.appendChild(phaseCard);

  return root;
}

function goalCardEl(g, data, update) {
  const card = el('div', 'goal-card');
  card.appendChild(h('div', 'g-title', g.name));
  const days = daysUntil(g.target);
  const targetText = days >= 0 ? `距 ${g.target} 还有 ${days} 天` : `已于 ${g.target} 到期`;
  card.appendChild(h('div', 'g-value', targetText));
  const bar = el('div', 'g-progress');
  const fill = el('div', 'fill');
  const p = g.progress || 0;
  fill.style.width = p + '%';
  fill.style.background = progressBg(p);
  bar.appendChild(fill);
  card.appendChild(bar);
  const meta = el('div', 'g-meta');
  meta.innerHTML = `<span class="badge badge-${(g.priority || 'P2').toLowerCase()}">${g.priority || 'P2'}</span><span class="badge badge-phase">${phaseLabel(g.phase)}</span>`;
  card.appendChild(meta);
  const cheer = el('div', 'g-cheer');
  cheer.innerHTML = cheerText(p);
  card.appendChild(cheer);
  const actions = el('div', 'g-actions');
  const editBtn = h('span', '', '编辑');
  editBtn.addEventListener('click', () => openGoalModal(g, data, update));
  const delBtn = h('span', '', '删除');
  delBtn.addEventListener('click', () => {
    const idx = data.annualGoals.findIndex(x => x.id === g.id);
    if (idx >= 0) {
      data.annualGoals.splice(idx, 1);
      toast('已删除', 'success');
      update();
    }
  });
  actions.appendChild(editBtn);
  actions.appendChild(delBtn);
  card.appendChild(actions);
  return card;
}

function openGoalModal(goal, data, update) {
  const isEdit = !!goal;
  const g = goal || { id: '', name: '', target: '', progress: 0, category: 'A', priority: 'P1', phase: 1 };
  const catOpts = Object.keys(GOAL_CATEGORIES).map(k =>
    `<option value="${k}">${GOAL_CATEGORIES[k].icon} ${GOAL_CATEGORIES[k].name}</option>`
  ).join('');
  const html = `
    <div class="modal">
      <h3>${isEdit ? '编辑目标' : '新增目标'}</h3>
      <div class="form-row">
        <label>目标名称</label>
        <input id="gm-name" value="${g.name}" placeholder="如：会计考证" />
      </div>
      <div class="form-row">
        <label>目标日期</label>
        <input id="gm-target" type="date" value="${g.target}" />
      </div>
      <div class="form-row">
        <label>进度（0-100）</label>
        <input id="gm-progress" type="number" min="0" max="100" value="${g.progress || 0}" />
      </div>
      <div class="form-row">
        <label>分类</label>
        <select id="gm-category">${catOpts}</select>
      </div>
      <div class="form-row">
        <label>优先级</label>
        <select id="gm-priority">
          <option value="P0">P0 - 最高</option>
          <option value="P1">P1 - 高</option>
          <option value="P2">P2 - 中</option>
        </select>
      </div>
      <div class="form-row">
        <label>阶段</label>
        <select id="gm-phase">
          <option value="1">Phase 1</option>
          <option value="2">Phase 2</option>
          <option value="3">Phase 3</option>
          <option value="4">Phase 4</option>
        </select>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" data-close>取消</button>
        <button class="btn" id="gm-save">保存</button>
      </div>
    </div>`;
  openModal(html, (overlay) => {
    overlay.querySelector('#gm-category').value = g.category;
    overlay.querySelector('#gm-priority').value = g.priority;
    overlay.querySelector('#gm-phase').value = g.phase;
    overlay.querySelector('#gm-save').addEventListener('click', () => {
      const name = overlay.querySelector('#gm-name').value.trim();
      const target = overlay.querySelector('#gm-target').value;
      const progress = Number(overlay.querySelector('#gm-progress').value) || 0;
      const category = overlay.querySelector('#gm-category').value;
      const priority = overlay.querySelector('#gm-priority').value;
      const phase = Number(overlay.querySelector('#gm-phase').value);
      if (!name) { toast('请输入目标名称', 'error'); return; }
      if (!target) { toast('请选择目标日期', 'error'); return; }
      if (isEdit) {
        Object.assign(goal, { name, target, progress, category, priority, phase });
      } else {
        data.annualGoals.push({ id: uid('g'), name, target, progress, category, priority, phase });
      }
      closeModal(overlay);
      toast(isEdit ? '已更新目标' : '已添加目标', 'success');
      update();
    });
  });
}
