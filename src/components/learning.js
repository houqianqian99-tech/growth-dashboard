import {
  $, el, h, todayStr, dateStr, daysUntil, daysInMonth, firstDayOfMonth,
  toast, uid, formatMinutes, weekStart, monthStr, getWeekday, openModal, closeModal
} from '../utils/helpers.js';
import { LEARNING_SUBJECTS, ERROR_TYPES, getNextReviewDate, SUGGESTIONS } from '../utils/frameworks.js';
import { LEARNING_RESOURCES } from '../utils/resources.js';
import { getLearningSuggestions, computeStreak, weekMinutes, monthMinutes, parseChineseDate } from '../utils/ai.js';

const TABS = [
  '学习仪表板', '学习资料', 'B站网课', '学习排期', '错题本', '学习打卡', 'AI建议'
];

const ui = {
  expanded: null,
  tab: {},
  resTag: {},
  cal: null
};

function S(data, subject) { return data.learning[subject]; }

function todayMin(subj) {
  const t = todayStr();
  return (subj.studyCheckins || []).filter(c => c.date === t).reduce((s, c) => s + c.minutes, 0);
}

function addCheckin(subj, minutes, note = '', source = 'manual', courseTitle = '') {
  subj.studyCheckins = subj.studyCheckins || [];
  subj.studyCheckins.push({ id: uid('ci'), date: todayStr(), minutes, note, source, courseTitle });
  subj.totalMinutes = (subj.totalMinutes || 0) + minutes;
}

function ensureLearning(data, subject) {
  if (!data.learning[subject]) {
    data.learning[subject] = { progress: 0, logs: [], totalMinutes: 0, resourceMarks: {}, customResources: [], bilibiliCourses: [], studyCheckins: [], schedules: [], errorBook: [] };
  }
  const sd = data.learning[subject];
  ['studyCheckins', 'schedules', 'errorBook', 'customResources', 'bilibiliCourses', 'logs'].forEach(k => { if (!Array.isArray(sd[k])) sd[k] = []; });
  if (!sd.resourceMarks) sd.resourceMarks = {};
  if (typeof sd.totalMinutes !== 'number') sd.totalMinutes = 0;
  if (typeof sd.progress !== 'number') sd.progress = 0;
  return sd;
}

export function renderLearning(data, update) {
  Object.keys(LEARNING_SUBJECTS).forEach(s => ensureLearning(data, s));
  const wrap = el('div', 'page learning-page');
  const grid = el('div', 'learn-grid');
  Object.keys(LEARNING_SUBJECTS).forEach(subject => {
    grid.appendChild(renderSubjectCard(subject, data, update));
  });
  wrap.appendChild(grid);
  return wrap;
}

function renderSubjectCard(subject, data, update) {
  const sd = S(data, subject);
  const meta = LEARNING_SUBJECTS[subject];
  const expanded = ui.expanded === subject;
  const card = el('div', 'learn-card' + (expanded ? ' expanded' : ''));
  if (expanded) card.style.gridColumn = '1 / -1';

  const head = el('div', 'lc-head');
  head.style.cursor = 'pointer';
  head.appendChild(el('div', 'lc-icon', meta.icon));
  const info = el('div');
  info.style.flex = '1';
  info.appendChild(h('div', 'lc-name', meta.name));
  info.appendChild(h('div', 'lc-time', `今日 ${formatMinutes(todayMin(sd))} · 累计 ${formatMinutes(sd.totalMinutes || 0)}`));
  head.appendChild(info);
  head.appendChild(h('button', 'btn-sm', expanded ? '收起 ▲' : '展开 ▼'));
  head.addEventListener('click', () => {
    ui.expanded = expanded ? null : subject;
    update();
  });
  card.appendChild(head);

  const prog = el('div', 'progress');
  const fill = el('div', 'fill blue');
  fill.style.width = (sd.progress || 0) + '%';
  prog.appendChild(fill);
  card.appendChild(prog);

  if (expanded) {
    const detail = el('div', 'learn-detail');
    detail.appendChild(renderTabs(subject, data, update));
    card.appendChild(detail);
  }
  return card;
}

function renderTabs(subject, data, update) {
  const wrap = el('div');
  const tabBar = el('div', 'tabs');
  const active = ui.tab[subject] || 0;
  TABS.forEach((name, i) => {
    const tab = h('div', 'tab' + (i === active ? ' active' : ''), name);
    tab.addEventListener('click', () => {
      ui.tab[subject] = i;
      tabBar.querySelectorAll('.tab').forEach((node, idx) => node.classList.toggle('active', idx === i));
      pane.innerHTML = '';
      pane.appendChild(renderTabPane(subject, i, data, update));
    });
    tabBar.appendChild(tab);
  });
  wrap.appendChild(tabBar);
  const pane = el('div', 'tabpane active');
  pane.appendChild(renderTabPane(subject, active, data, update));
  wrap.appendChild(pane);
  return wrap;
}

function renderTabPane(subject, idx, data, update) {
  switch (idx) {
    case 0: return tabDashboard(subject, data, update);
    case 1: return tabResources(subject, data, update);
    case 2: return tabBilibili(subject, data, update);
    case 3: return tabSchedule(subject, data, update);
    case 4: return tabErrorBook(subject, data, update);
    case 5: return tabCheckin(subject, data, update);
    case 6: return tabAISuggest(subject, data, update);
    default: return el('div');
  }
}

/* ---------- Tab 0: Dashboard ---------- */
function tabDashboard(subject, data, update) {
  const sd = S(data, subject);
  const wrap = el('div');

  const grid = el('div', 'stat-grid');
  grid.appendChild(statCard(formatMinutes(sd.totalMinutes || 0), '累计学习'));
  grid.appendChild(statCard(formatMinutes(todayMin(sd)), '今日学习'));
  grid.appendChild(statCard(formatMinutes(weekMinutes(sd)), '本周学习'));
  grid.appendChild(statCard(computeStreak(sd.studyCheckins) + ' 天', '连续打卡'));
  wrap.appendChild(grid);

  const progRow = el('div', 'form-row');
  progRow.style.marginBottom = '12px';
  progRow.appendChild(h('label', '', '学习进度（0-100）'));
  const input = document.createElement('input');
  input.type = 'number';
  input.min = '0'; input.max = '100';
  input.value = sd.progress || 0;
  input.style.width = '80px';
  input.style.marginLeft = '8px';
  input.style.padding = '6px 8px';
  input.style.border = '1px solid var(--border)';
  input.style.borderRadius = 'var(--radius-sm)';
  input.addEventListener('change', () => {
    let v = parseInt(input.value, 10);
    if (isNaN(v)) v = 0;
    v = Math.max(0, Math.min(100, v));
    sd.progress = v;
    toast('进度已更新', 'success');
    update();
  });
  progRow.appendChild(input);
  progRow.appendChild(el('div', 'progress', '<div class="fill blue" style="width:' + (sd.progress || 0) + '%"></div>'));
  wrap.appendChild(progRow);

  const qRow = el('div');
  qRow.style.display = 'flex';
  qRow.style.gap = '8px';
  qRow.style.marginBottom = '12px';
  const b30 = h('button', 'btn-quick', '+30min');
  b30.addEventListener('click', () => { addCheckin(sd, 30); toast('已记录 30 分钟', 'success'); update(); });
  const b60 = h('button', 'btn-quick', '+1h');
  b60.addEventListener('click', () => { addCheckin(sd, 60); toast('已记录 1 小时', 'success'); update(); });
  qRow.appendChild(b30);
  qRow.appendChild(b60);
  wrap.appendChild(qRow);

  const res = LEARNING_RESOURCES[subject];
  if (res && res.examInfo) {
    const box = el('div', 'exam-box');
    box.style.cssText = 'background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:12px;';
    const eTitle = h('div', '', '考试信息');
    eTitle.style.fontWeight = '600';
    eTitle.style.marginBottom = '8px';
    box.appendChild(eTitle);
    box.appendChild(h('div', '', '考试时间：' + (res.examInfo.date || '未知')));
    if (res.examInfo.regDate) box.appendChild(h('div', '', '报名时间：' + res.examInfo.regDate));
    const ed = parseChineseDate(res.examInfo.date);
    if (ed) {
      const dd = daysUntil(ed);
      const lbl = dd > 0 ? '距考试约 ' + dd + ' 天' : dd === 0 ? '考试就在今日' : '考试已结束';
      box.appendChild(h('div', '', lbl));
    }
    if (res.examInfo.regUrl) {
      const a = el('a', 'btn-secondary', '前往报名/官网');
      a.href = res.examInfo.regUrl;
      a.target = '_blank';
      a.rel = 'noopener';
      a.style.display = 'inline-block';
      a.style.marginTop = '8px';
      a.style.textDecoration = 'none';
      box.appendChild(a);
    }
    wrap.appendChild(box);
  }
  return wrap;
}

function statCard(num, label) {
  const c = el('div', 'stat-card');
  c.appendChild(h('div', 'sc-num', String(num)));
  c.appendChild(h('div', 'sc-label', label));
  return c;
}

/* ---------- Tab 1: Resources ---------- */
function tabResources(subject, data, update) {
  const sd = S(data, subject);
  const wrap = el('div');

  wrap.appendChild(h('div', 'section-title', '预置资源'));
  const preset = LEARNING_RESOURCES[subject];
  const pList = el('div', 'res-list');
  if (preset && preset.resources && preset.resources.length) {
    preset.resources.forEach(r => pList.appendChild(presetResCard(subject, r, sd, update)));
  } else {
    pList.appendChild(emptyHint('📚', '暂无预置资源'));
  }
  wrap.appendChild(pList);

  wrap.appendChild(h('div', 'section-title', '自上传资料'));
  const addBtn = h('button', 'btn-add', '+ 添加资料');
  addBtn.style.marginBottom = '8px';
  addBtn.addEventListener('click', () => openAddResourceModal(subject, data, update));
  wrap.appendChild(addBtn);

  const allTags = new Set();
  (sd.customResources || []).forEach(r => (r.tags || []).forEach(t => allTags.add(t)));
  const tagBar = el('div');
  tagBar.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;';
  const curTag = ui.resTag[subject];
  const allBtn = h('button', 'btn-sm' + (!curTag ? ' active' : ''), '全部');
  allBtn.addEventListener('click', () => { ui.resTag[subject] = null; update(); });
  tagBar.appendChild(allBtn);
  Array.from(allTags).forEach(t => {
    const b = h('button', 'btn-sm' + (curTag === t ? ' active' : ''), t);
    b.addEventListener('click', () => { ui.resTag[subject] = t; update(); });
    tagBar.appendChild(b);
  });
  wrap.appendChild(tagBar);

  const cList = el('div', 'res-list');
  const items = (sd.customResources || []).filter(r => !curTag || (r.tags || []).includes(curTag));
  if (items.length) {
    items.forEach(r => cList.appendChild(customResCard(subject, r, sd, data, update)));
  } else {
    cList.appendChild(emptyHint('🗒️', sd.customResources.length ? '该标签下无资料' : '暂无自上传资料，点击「添加资料」'));
  }
  wrap.appendChild(cList);
  return wrap;
}

function presetResCard(subject, r, sd, update) {
  const card = el('div', 'res-card');
  const icon = r.type === 'official' ? '🔖' : '🆓';
  card.appendChild(el('div', 'rc-icon', icon));
  const info = el('div', 'rc-info');
  info.appendChild(h('div', 'rc-title', r.title));
  if (r.desc) info.appendChild(h('div', 'rc-desc', r.desc));
  card.appendChild(info);
  const badge = el('div', 'rc-badge ' + (r.type === 'official' ? 'official' : 'free'), r.type === 'official' ? '官方' : '免费');
  card.appendChild(badge);
  const actions = el('div', 'rc-actions');
  const openBtn = h('button', 'btn-sm', '打开链接');
  openBtn.addEventListener('click', () => { if (r.url) window.open(r.url, '_blank'); });
  const marked = !!sd.resourceMarks[r.url];
  const markBtn = h('button', 'btn-sm', marked ? '已学 ✓' : '标记已学');
  if (marked) markBtn.style.color = 'var(--green)';
  markBtn.addEventListener('click', () => {
    if (marked) delete sd.resourceMarks[r.url];
    else { sd.resourceMarks[r.url] = true; toast('已标记为已学', 'success'); }
    update();
  });
  actions.appendChild(openBtn);
  actions.appendChild(markBtn);
  card.appendChild(actions);
  return card;
}

function customResCard(subject, r, sd, data, update) {
  const card = el('div', 'res-card');
  const iconMap = { link: '🔗', note: '📝', file: '📎' };
  card.appendChild(el('div', 'rc-icon', iconMap[r.type] || '📎'));
  const info = el('div', 'rc-info');
  info.style.cursor = 'pointer';
  const titleRow = el('div', 'rc-title');
  titleRow.textContent = r.title || '(未命名)';
  if (r.studied) {
    const b = el('span', 'rc-badge free', '已学');
    b.style.marginLeft = '6px';
    titleRow.appendChild(b);
  }
  info.appendChild(titleRow);
  let previewText = '';
  if (r.type === 'note') previewText = (r.content || '').slice(0, 100);
  else if (r.type === 'file') previewText = (r.fileName || '') + (r.fileSize ? ' · ' + formatFileSize(r.fileSize) : '');
  else if (r.type === 'link') previewText = r.url || '';
  if (previewText) info.appendChild(h('div', 'rc-desc', previewText));
  if (r.tags && r.tags.length) {
    const tags = el('div');
    tags.style.cssText = 'margin-top:4px;display:flex;gap:4px;flex-wrap:wrap;';
    r.tags.forEach(t => tags.appendChild(h('span', 'ec-tag knowledge', t)));
    info.appendChild(tags);
  }
  card.appendChild(info);

  info.addEventListener('click', () => {
    if (r.type === 'link' && r.url) { window.open(r.url, '_blank'); return; }
    if (r.type === 'file' && r.content) {
      const a = document.createElement('a');
      a.href = r.content;
      a.download = r.fileName || 'download';
      document.body.appendChild(a); a.click(); a.remove();
      return;
    }
    let detail = info.querySelector('.cr-detail');
    if (detail) { detail.remove(); return; }
    detail = el('div', 'cr-detail');
    detail.style.cssText = 'margin-top:8px;padding:8px;background:var(--surface-3);border-radius:6px;font-size:12px;white-space:pre-wrap;';
    detail.textContent = r.content || '';
    info.appendChild(detail);
  });

  const actions = el('div', 'rc-actions');
  const editBtn = h('button', 'btn-sm', '编辑');
  editBtn.addEventListener('click', (e) => { e.stopPropagation(); openEditResourceModal(subject, r, data, update); });
  const delBtn = h('button', 'btn-sm', '删除');
  delBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    sd.customResources = sd.customResources.filter(x => x.id !== r.id);
    toast('已删除', ''); update();
  });
  const markBtn = h('button', 'btn-sm', r.studied ? '取消已学' : '标记已学');
  markBtn.addEventListener('click', (e) => { e.stopPropagation(); r.studied = !r.studied; update(); });
  const tagBtn = h('button', 'btn-sm', '加标签');
  tagBtn.addEventListener('click', (e) => { e.stopPropagation(); openAddTagModal(subject, r, data, update); });
  actions.appendChild(editBtn); actions.appendChild(markBtn); actions.appendChild(tagBtn); actions.appendChild(delBtn);
  card.appendChild(actions);
  return card;
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / 1048576).toFixed(2) + 'MB';
}

function openAddResourceModal(subject, data, update) {
  const html = `
  <div class="modal">
    <h3>添加资料</h3>
    <div class="form-row">
      <label>类型</label>
      <div style="display:flex;gap:8px;">
        <button class="btn-secondary" data-type="link">链接</button>
        <button class="btn-secondary" data-type="note">笔记</button>
        <button class="btn-secondary" data-type="file">文件</button>
      </div>
    </div>
    <div id="res-form"></div>
  </div>`;
  const overlay = openModal(html, (ov) => {
    const form = $('#res-form', ov);
    let type = 'link';
    const renderForm = () => {
      form.innerHTML = '';
      if (type === 'link') {
        form.innerHTML = `
          <div class="form-row"><label>标题</label><input id="r-title" placeholder="资源标题" /></div>
          <div class="form-row"><label>链接</label><input id="r-url" placeholder="https://" /></div>
          <div class="form-row"><label>备注（可选）</label><textarea id="r-note" placeholder="备注内容"></textarea></div>`;
      } else if (type === 'note') {
        form.innerHTML = `
          <div class="form-row"><label>标题</label><input id="r-title" placeholder="笔记标题" /></div>
          <div class="form-row"><label>内容</label><textarea id="r-content" style="min-height:120px;" placeholder="笔记内容"></textarea></div>`;
      } else {
        form.innerHTML = `
          <div class="form-row"><label>标题</label><input id="r-title" placeholder="文件标题" /></div>
          <div class="form-row"><label>选择文件</label><input type="file" id="r-file" /><div style="font-size:10px;color:var(--text-3);margin-top:4px;">建议小于 2MB，超出可能无法保存</div></div>`;
      }
      const actions = el('div', 'modal-actions');
      const cancel = h('button', 'btn-secondary', '取消');
      cancel.addEventListener('click', () => closeModal(ov));
      const save = h('button', 'btn-add', '保存');
      save.addEventListener('click', () => saveResource(subject, data, update, type, ov, form));
      actions.appendChild(cancel); actions.appendChild(save);
      form.appendChild(actions);
    };
    renderForm();
    ov.querySelectorAll('[data-type]').forEach(b => {
      b.addEventListener('click', () => {
        type = b.dataset.type;
        ov.querySelectorAll('[data-type]').forEach(x => x.style.borderColor = '');
        b.style.borderColor = 'var(--accent)';
        renderForm();
      });
    });
  });
  return overlay;
}

function saveResource(subject, data, update, type, overlay, form) {
  const sd = S(data, subject);
  const title = ($('#r-title', form) || {}).value || '';
  if (type === 'link') {
    const url = ($('#r-url', form) || {}).value || '';
    const note = ($('#r-note', form) || {}).value || '';
    if (!url) { toast('请填写链接', 'error'); return; }
    sd.customResources.push({ id: uid('res'), type: 'link', title: title || url, url, content: note, tags: [], createdAt: todayStr() });
  } else if (type === 'note') {
    const content = ($('#r-content', form) || {}).value || '';
    if (!content) { toast('请填写笔记内容', 'error'); return; }
    sd.customResources.push({ id: uid('res'), type: 'note', title: title || '笔记', content, tags: [], createdAt: todayStr() });
  } else if (type === 'file') {
    const fileInput = $('#r-file', form);
    if (!fileInput || !fileInput.files[0]) { toast('请选择文件', 'error'); return; }
    const file = fileInput.files[0];
    if (file.size > 2 * 1024 * 1024) { toast('文件超过 2MB，无法保存', 'error'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      sd.customResources.push({ id: uid('res'), type: 'file', title: title || file.name, fileName: file.name, fileSize: file.size, content: reader.result, tags: [], createdAt: todayStr() });
      toast('文件已保存', 'success');
      closeModal(overlay); update();
    };
    reader.onerror = () => toast('文件读取失败', 'error');
    reader.readAsDataURL(file);
    return;
  }
  toast('已添加资料', 'success');
  closeModal(overlay); update();
}

function openEditResourceModal(subject, r, data, update) {
  const isNote = r.type === 'note';
  const html = `
  <div class="modal">
    <h3>编辑资料</h3>
    <div class="form-row"><label>标题</label><input id="r-title" value="${escapeAttr(r.title || '')}" /></div>
    ${r.type === 'link' ? `<div class="form-row"><label>链接</label><input id="r-url" value="${escapeAttr(r.url || '')}" /></div><div class="form-row"><label>备注</label><textarea id="r-note">${escapeHtml(r.content || '')}</textarea></div>` : ''}
    ${isNote ? `<div class="form-row"><label>内容</label><textarea id="r-content" style="min-height:120px;">${escapeHtml(r.content || '')}</textarea></div>` : ''}
    <div class="modal-actions">
      <button class="btn-secondary" data-close>取消</button>
      <button class="btn-add" id="r-save">保存</button>
    </div>
  </div>`;
  openModal(html, (ov) => {
    $('#r-save', ov).addEventListener('click', () => {
      r.title = ($('#r-title', ov) || {}).value || r.title;
      if (r.type === 'link') { r.url = ($('#r-url', ov) || {}).value || r.url; r.content = ($('#r-note', ov) || {}).value || ''; }
      if (r.type === 'note') { r.content = ($('#r-content', ov) || {}).value || r.content; }
      toast('已更新', 'success'); closeModal(ov); update();
    });
  });
}

function openAddTagModal(subject, r, data, update) {
  const html = `
  <div class="modal">
    <h3>添加标签</h3>
    <div class="form-row"><label>标签名</label><input id="tag-input" placeholder="输入标签" /></div>
    ${r.tags && r.tags.length ? `<div style="font-size:12px;margin-bottom:8px;">现有：${r.tags.map(escapeHtml).join('、')}</div>` : ''}
    <div class="modal-actions">
      <button class="btn-secondary" data-close>取消</button>
      <button class="btn-add" id="tag-save">添加</button>
    </div>
  </div>`;
  openModal(html, (ov) => {
    $('#tag-save', ov).addEventListener('click', () => {
      const v = ($('#tag-input', ov) || {}).value.trim();
      if (!v) { toast('请输入标签', 'error'); return; }
      r.tags = r.tags || [];
      if (!r.tags.includes(v)) r.tags.push(v);
      toast('标签已添加', 'success'); closeModal(ov); update();
    });
  });
}

function escapeAttr(s) { return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
function escapeHtml(s) { return String(s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m])); }

/* ---------- Tab 2: Bilibili ---------- */
function tabBilibili(subject, data, update) {
  const sd = S(data, subject);
  const wrap = el('div');
  const addBtn = h('button', 'btn-add', '+ 添加网课');
  addBtn.style.marginBottom = '10px';
  addBtn.addEventListener('click', () => openAddCourseModal(subject, data, update));
  wrap.appendChild(addBtn);

  const list = el('div', 'course-list');
  if (!sd.bilibiliCourses.length) {
    list.appendChild(emptyHint('📺', '暂无网课，添加 B 站视频链接开始跟学'));
  } else {
    sd.bilibiliCourses.forEach(c => list.appendChild(courseCard(subject, c, sd, data, update)));
  }
  wrap.appendChild(list);
  return wrap;
}

function courseCard(subject, c, sd, data, update) {
  const card = el('div', 'course-card');
  const cover = el('div', 'cc-cover');
  if (c.coverUrl) {
    const img = document.createElement('img');
    img.src = c.coverUrl; img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:6px;';
    cover.appendChild(img);
  } else {
    cover.textContent = '📺';
  }
  card.appendChild(cover);
  const info = el('div', 'cc-info');
  info.appendChild(h('div', 'cc-title', c.title || c.bvid || '未命名课程'));
  const prog = el('div', 'cc-progress progress');
  const pct = c.totalEpisodes ? Math.min(100, (c.watchedEpisodes / c.totalEpisodes) * 100) : 0;
  const fill = el('div', 'fill green');
  fill.style.width = pct + '%';
  prog.appendChild(fill);
  info.appendChild(prog);
  info.appendChild(h('div', '', `已学 ${c.watchedEpisodes || 0} / ${c.totalEpisodes || 1} 集` + (c.completed ? ' · 已完成' : '')));
  const btns = el('div');
  btns.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;';
  const watch = h('button', 'btn-sm', '继续观看');
  watch.addEventListener('click', () => { if (c.url) window.open(c.url, '_blank'); });
  const rec = h('button', 'btn-sm', '记录时长');
  rec.addEventListener('click', () => openCourseDurationModal(subject, c, sd, update));
  const upd = h('button', 'btn-sm', '更新进度');
  upd.addEventListener('click', () => openUpdateProgressModal(subject, c, sd, update));
  const done = h('button', 'btn-sm', c.completed ? '取消完成' : '标记完成');
  done.addEventListener('click', () => {
    c.completed = !c.completed;
    if (c.completed) c.watchedEpisodes = c.totalEpisodes;
    toast(c.completed ? '已标记完成' : '已取消完成', ''); update();
  });
  const del = h('button', 'btn-sm', '删除');
  del.style.color = 'var(--red)';
  del.addEventListener('click', () => { sd.bilibiliCourses = sd.bilibiliCourses.filter(x => x.id !== c.id); toast('已删除', ''); update(); });
  btns.appendChild(watch); btns.appendChild(rec); btns.appendChild(upd); btns.appendChild(done); btns.appendChild(del);
  info.appendChild(btns);
  card.appendChild(info);
  return card;
}

function openAddCourseModal(subject, data, update) {
  const html = `
  <div class="modal">
    <h3>添加 B 站网课</h3>
    <div class="form-row"><label>B站视频链接</label><input id="c-url" placeholder="https://www.bilibili.com/video/BVxxxxxx" /></div>
    <div class="form-row"><label>课程名称</label><input id="c-title" placeholder="课程名称" /></div>
    <div class="form-row"><label>总集数</label><input id="c-eps" type="number" min="1" value="1" /></div>
    <div class="form-row"><label>备注（可选）</label><textarea id="c-note"></textarea></div>
    <div class="modal-actions">
      <button class="btn-secondary" data-close>取消</button>
      <button class="btn-add" id="c-save">添加</button>
    </div>
  </div>`;
  openModal(html, (ov) => {
    $('#c-save', ov).addEventListener('click', () => {
      const url = ($('#c-url', ov) || {}).value.trim();
      const title = ($('#c-title', ov) || {}).value.trim();
      const eps = parseInt(($('#c-eps', ov) || {}).value, 10) || 1;
      if (!url) { toast('请填写链接', 'error'); return; }
      const m = url.match(/BV[a-zA-Z0-9]+/);
      const bvid = m ? m[0] : '';
      const sd = S(data, subject);
      const course = { id: uid('course'), url, bvid, title: title || bvid || url, subject, totalEpisodes: eps, watchedEpisodes: 0, completed: false, coverUrl: '' };
      sd.bilibiliCourses.push(course);
      toast('已添加网课', 'success');
      closeModal(ov); update();
      if (bvid) {
        fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`)
          .then(r => r.json())
          .then(j => {
            if (j && j.data && (j.data.title || j.data.pic)) {
              if (j.data.title && course.title === bvid) course.title = j.data.title;
              if (j.data.pic) course.coverUrl = j.data.pic.startsWith('//') ? 'https:' + j.data.pic : j.data.pic;
              saveAndRefresh(data, update);
            }
          }).catch(() => {});
      }
    });
  });
}

function openCourseDurationModal(subject, c, sd, update) {
  const html = `
  <div class="modal">
    <h3>记录学习时长 - ${escapeHtml(c.title || '')}</h3>
    <div class="form-row"><label>学习时长（分钟）</label><input id="d-min" type="number" min="1" value="30" /></div>
    <div class="modal-actions">
      <button class="btn-secondary" data-close>取消</button>
      <button class="btn-add" id="d-save">记录</button>
    </div>
  </div>`;
  openModal(html, (ov) => {
    $('#d-save', ov).addEventListener('click', () => {
      const min = parseInt(($('#d-min', ov) || {}).value, 10);
      if (!min || min <= 0) { toast('请输入有效时长', 'error'); return; }
      addCheckin(sd, min, '', 'bilibili', c.title || '');
      toast('已记录 ' + formatMinutes(min), 'success');
      closeModal(ov); update();
    });
  });
}

function openUpdateProgressModal(subject, c, sd, update) {
  const html = `
  <div class="modal">
    <h3>更新进度 - ${escapeHtml(c.title || '')}</h3>
    <div class="form-row"><label>已看集数</label><input id="p-eps" type="number" min="0" max="${c.totalEpisodes || 999}" value="${c.watchedEpisodes || 0}" /></div>
    <div class="modal-actions">
      <button class="btn-secondary" data-close>取消</button>
      <button class="btn-add" id="p-save">更新</button>
    </div>
  </div>`;
  openModal(html, (ov) => {
    $('#p-save', ov).addEventListener('click', () => {
      let eps = parseInt(($('#p-eps', ov) || {}).value, 10);
      if (isNaN(eps) || eps < 0) eps = 0;
      eps = Math.min(eps, c.totalEpisodes || eps);
      c.watchedEpisodes = eps;
      c.completed = c.totalEpisodes > 0 && eps >= c.totalEpisodes;
      toast('进度已更新', 'success');
      closeModal(ov); update();
    });
  });
}

/* ---------- Tab 3: Schedule ---------- */
function tabSchedule(subject, data, update) {
  const sd = S(data, subject);
  const now = new Date();
  if (!ui.cal) ui.cal = { y: now.getFullYear(), m: now.getMonth() };
  let { y, m } = ui.cal;
  const wrap = el('div');

  const nav = el('div');
  nav.style.cssText = 'display:flex;align-items:center;gap:12px;margin-bottom:10px;';
  const prev = h('button', 'btn-sm', '◀');
  prev.addEventListener('click', () => { ui.cal.m--; if (ui.cal.m < 0) { ui.cal.m = 11; ui.cal.y--; } update(); });
  const next = h('button', 'btn-sm', '▶');
  next.addEventListener('click', () => { ui.cal.m++; if (ui.cal.m > 11) { ui.cal.m = 0; ui.cal.y++; } update(); });
  const title = h('span', '', `${y}年${m + 1}月`);
  title.style.fontWeight = '600';
  const todayBtn = h('button', 'btn-sm', '今天');
  todayBtn.addEventListener('click', () => { const t = new Date(); ui.cal = { y: t.getFullYear(), m: t.getMonth() }; update(); });
  nav.appendChild(prev); nav.appendChild(title); nav.appendChild(next); nav.appendChild(todayBtn);
  wrap.appendChild(nav);

  const cal = el('div', 'sched-cal');
  ['日', '一', '二', '三', '四', '五', '六'].forEach(d => {
    const hd = el('div', 'sc-date');
    hd.style.cssText = 'text-align:center;font-size:11px;color:var(--text-3);padding:4px 0;';
    hd.textContent = d;
    cal.appendChild(hd);
  });
  const first = firstDayOfMonth(y, m + 1);
  const days = daysInMonth(y, m + 1);
  const today = todayStr();
  for (let i = 0; i < first; i++) cal.appendChild(el('div', 'sched-cell'));
  for (let d = 1; d <= days; d++) {
    const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const cell = el('div', 'sched-cell' + (ds === today ? ' today' : ''));
    cell.appendChild(h('div', 'sc-date', String(d)));
    const items = (sd.schedules || []).filter(s => s.date === ds);
    if (items.length) {
      const box = el('div', 'sc-items');
      items.slice(0, 3).forEach(s => box.appendChild(el('div', 'sc-item', (s.completed ? '✓ ' : '') + escapeHtml(s.content || ''))));
      cell.appendChild(box);
    }
    cell.addEventListener('click', () => openScheduleModal(subject, ds, sd, update));
    cal.appendChild(cell);
  }
  wrap.appendChild(cal);

  wrap.appendChild(h('div', 'section-title', '本周排期'));
  const ws = weekStart();
  const we = new Date(ws); we.setDate(we.getDate() + 7);
  const weekItems = (sd.schedules || []).filter(s => {
    const sd2 = new Date(s.date);
    return sd2 >= ws && sd2 < we;
  }).sort((a, b) => a.date < b.date ? -1 : 1);
  const wList = el('div');
  if (!weekItems.length) {
    wList.appendChild(emptyHint('📅', '本周暂无排期'));
  } else {
    weekItems.forEach(s => wList.appendChild(scheduleItem(subject, s, sd, update)));
  }
  wrap.appendChild(wList);
  return wrap;
}

function scheduleItem(subject, s, sd, update) {
  const row = el('div', 'rw-item');
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = !!s.completed;
  cb.style.marginRight = '8px';
  cb.addEventListener('change', () => { s.completed = cb.checked; update(); });
  row.appendChild(cb);
  const main = el('div', 'rw-main');
  main.appendChild(h('div', 'rw-title', `${s.date}（周${getWeekday(new Date(s.date))}） · ${s.duration || ''}h`));
  main.appendChild(h('div', 'rw-sub', s.content || ''));
  const del = h('button', 'btn-sm', '删除');
  del.style.color = 'var(--red)';
  del.addEventListener('click', () => { sd.schedules = sd.schedules.filter(x => x.id !== s.id); update(); });
  main.appendChild(del);
  row.appendChild(main);
  return row;
}

function openScheduleModal(subject, date, sd, update) {
  const html = `
  <div class="modal">
    <h3>添加排期 - ${date}</h3>
    <div class="form-row"><label>学习内容</label><input id="s-content" placeholder="学习内容" /></div>
    <div class="form-row"><label>时长（小时）</label><input id="s-dur" type="number" min="0.5" step="0.5" value="1" /></div>
    <div class="modal-actions">
      <button class="btn-secondary" data-close>取消</button>
      <button class="btn-add" id="s-save">添加</button>
    </div>
  </div>`;
  openModal(html, (ov) => {
    $('#s-save', ov).addEventListener('click', () => {
      const content = ($('#s-content', ov) || {}).value.trim();
      const dur = parseFloat(($('#s-dur', ov) || {}).value) || 1;
      if (!content) { toast('请填写内容', 'error'); return; }
      sd.schedules.push({ id: uid('sched'), date, content, duration: dur, completed: false });
      toast('排期已添加', 'success'); closeModal(ov); update();
    });
  });
}

/* ---------- Tab 4: Error Book ---------- */
function tabErrorBook(subject, data, update) {
  const sd = S(data, subject);
  const wrap = el('div');
  const errors = sd.errorBook || [];
  const mastered = errors.filter(e => e.mastered).length;
  const due = errors.filter(e => !e.mastered && e.nextReviewDate && e.nextReviewDate <= todayStr()).length;

  const grid = el('div', 'stat-grid');
  grid.appendChild(statCard(errors.length, '错题总数'));
  grid.appendChild(statCard(mastered, '已掌握'));
  grid.appendChild(statCard(due, '待复习'));
  grid.appendChild(statCard(errors.length - mastered - due, '复习中'));
  wrap.appendChild(grid);

  const addBtn = h('button', 'btn-add', '+ 添加错题');
  addBtn.style.marginBottom = '10px';
  addBtn.addEventListener('click', () => openAddErrorModal(subject, data, update));
  wrap.appendChild(addBtn);

  const list = el('div', 'err-list');
  if (!errors.length) {
    list.appendChild(emptyHint('📝', '暂无错题，添加错题开始查漏补缺'));
  } else {
    errors.slice().sort((a, b) => (b.addDate || '').localeCompare(a.addDate || '')).forEach(e => list.appendChild(errorCard(subject, e, sd, data, update)));
  }
  wrap.appendChild(list);
  return wrap;
}

function errorCard(subject, e, sd, data, update) {
  const card = el('div', 'err-card' + (e.mastered ? ' mastered' : ''));
  card.appendChild(h('div', 'ec-preview', (e.question || '').slice(0, 50) + ((e.question || '').length > 50 ? '...' : '')));
  const tags = el('div', 'ec-tags');
  tags.appendChild(el('div', 'ec-tag type', e.errorType || '其他'));
  if (e.knowledgeTag) tags.appendChild(h('div', 'ec-tag knowledge', e.knowledgeTag));
  tags.appendChild(el('div', 'ec-tag', e.addDate || ''));
  card.appendChild(tags);

  const detail = el('div', 'ec-detail');
  detail.style.cssText = 'margin-top:8px;display:none;font-size:12px;color:var(--text-2);';
  detail.innerHTML = `
    <div style="margin-bottom:4px;"><b>题干：</b>${escapeHtml(e.question || '')}</div>
    <div style="margin-bottom:4px;"><b>我的答案：</b>${escapeHtml(e.myAnswer || '')}</div>
    <div style="margin-bottom:4px;"><b>正确答案：</b>${escapeHtml(e.correctAnswer || '')}</div>
    <div style="margin-bottom:4px;"><b>解析：</b>${escapeHtml(e.analysis || '无')}</div>
    <div style="margin-bottom:6px;"><b>复习：</b>第 ${e.reviewCount || 0} 次 · 下次 ${e.nextReviewDate || '未定'}</div>`;
  const btns = el('div');
  btns.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';
  const master = h('button', 'btn-sm', e.mastered ? '取消掌握' : '标记已掌握');
  master.addEventListener('click', (ev) => {
    ev.stopPropagation();
    e.mastered = !e.mastered;
    if (e.mastered) toast('已标记掌握', 'success');
    update();
  });
  const review = h('button', 'btn-sm', '仍需复习');
  review.addEventListener('click', (ev) => {
    ev.stopPropagation();
    e.mastered = false;
    e.reviewCount = 0;
    e.nextReviewDate = getNextReviewDate(todayStr(), 0);
    toast('已重置复习周期', ''); update();
  });
  const edit = h('button', 'btn-sm', '编辑');
  edit.addEventListener('click', (ev) => { ev.stopPropagation(); openEditErrorModal(subject, e, data, update); });
  const del = h('button', 'btn-sm', '删除');
  del.style.color = 'var(--red)';
  del.addEventListener('click', (ev) => { ev.stopPropagation(); sd.errorBook = sd.errorBook.filter(x => x.id !== e.id); toast('已删除', ''); update(); });
  btns.appendChild(master); btns.appendChild(review); btns.appendChild(edit); btns.appendChild(del);
  detail.appendChild(btns);
  card.appendChild(detail);

  card.addEventListener('click', () => { detail.style.display = detail.style.display === 'none' ? 'block' : 'none'; });
  return card;
}

function openAddErrorModal(subject, data, update) {
  const html = `
  <div class="modal">
    <h3>添加错题</h3>
    <div class="form-row"><label>题干</label><textarea id="e-q" placeholder="题目内容"></textarea></div>
    <div class="form-row"><label>自己的答案</label><input id="e-ma" placeholder="你的答案" /></div>
    <div class="form-row"><label>正确答案</label><input id="e-ca" placeholder="正确答案" /></div>
    <div class="form-row"><label>错误类型</label><select id="e-type">${ERROR_TYPES.map(t => `<option>${t}</option>`).join('')}</select></div>
    <div class="form-row"><label>知识点标签</label><input id="e-tag" placeholder="知识点" /></div>
    <div class="form-row"><label>解析笔记（可选）</label><textarea id="e-ana" placeholder="解析"></textarea></div>
    <div class="modal-actions">
      <button class="btn-secondary" data-close>取消</button>
      <button class="btn-add" id="e-save">添加</button>
    </div>
  </div>`;
  openModal(html, (ov) => {
    $('#e-save', ov).addEventListener('click', () => {
      const q = ($('#e-q', ov) || {}).value.trim();
      if (!q) { toast('请填写题干', 'error'); return; }
      const sd = S(data, subject);
      const addDate = todayStr();
      sd.errorBook.push({
        id: uid('err'),
        question: q,
        myAnswer: ($('#e-ma', ov) || {}).value.trim(),
        correctAnswer: ($('#e-ca', ov) || {}).value.trim(),
        errorType: ($('#e-type', ov) || {}).value,
        knowledgeTag: ($('#e-tag', ov) || {}).value.trim(),
        analysis: ($('#e-ana', ov) || {}).value.trim(),
        mastered: false,
        addDate,
        nextReviewDate: getNextReviewDate(addDate, 0),
        reviewCount: 0
      });
      toast('错题已添加', 'success'); closeModal(ov); update();
    });
  });
}

function openEditErrorModal(subject, e, data, update) {
  const html = `
  <div class="modal">
    <h3>编辑错题</h3>
    <div class="form-row"><label>题干</label><textarea id="e-q">${escapeHtml(e.question || '')}</textarea></div>
    <div class="form-row"><label>自己的答案</label><input id="e-ma" value="${escapeAttr(e.myAnswer || '')}" /></div>
    <div class="form-row"><label>正确答案</label><input id="e-ca" value="${escapeAttr(e.correctAnswer || '')}" /></div>
    <div class="form-row"><label>错误类型</label><select id="e-type">${ERROR_TYPES.map(t => `<option ${t === e.errorType ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
    <div class="form-row"><label>知识点标签</label><input id="e-tag" value="${escapeAttr(e.knowledgeTag || '')}" /></div>
    <div class="form-row"><label>解析笔记</label><textarea id="e-ana">${escapeHtml(e.analysis || '')}</textarea></div>
    <div class="modal-actions">
      <button class="btn-secondary" data-close>取消</button>
      <button class="btn-add" id="e-save">保存</button>
    </div>
  </div>`;
  openModal(html, (ov) => {
    $('#e-save', ov).addEventListener('click', () => {
      e.question = ($('#e-q', ov) || {}).value.trim();
      e.myAnswer = ($('#e-ma', ov) || {}).value.trim();
      e.correctAnswer = ($('#e-ca', ov) || {}).value.trim();
      e.errorType = ($('#e-type', ov) || {}).value;
      e.knowledgeTag = ($('#e-tag', ov) || {}).value.trim();
      e.analysis = ($('#e-ana', ov) || {}).value.trim();
      toast('已更新', 'success'); closeModal(ov); update();
    });
  });
}

/* ---------- Tab 5: Check-in ---------- */
function tabCheckin(subject, data, update) {
  const sd = S(data, subject);
  const wrap = el('div');
  const today = todayStr();
  const todays = (sd.studyCheckins || []).filter(c => c.date === today);

  wrap.appendChild(h('div', 'section-title', '今日打卡'));
  const qRow = el('div');
  qRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;';
  const b30 = h('button', 'btn-quick', '+30min');
  b30.addEventListener('click', () => { addCheckin(sd, 30); toast('已打卡 30min', 'success'); update(); });
  const b60 = h('button', 'btn-quick', '+1h');
  b60.addEventListener('click', () => { addCheckin(sd, 60); toast('已打卡 1h', 'success'); update(); });
  qRow.appendChild(b30); qRow.appendChild(b60);
  wrap.appendChild(qRow);

  const customForm = el('div');
  customForm.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;';
  const minInput = document.createElement('input');
  minInput.type = 'number'; minInput.min = '1'; minInput.placeholder = '分钟';
  minInput.style.cssText = 'width:90px;padding:6px 8px;border:1px solid var(--border);border-radius:var(--radius-sm);';
  const noteInput = document.createElement('input');
  noteInput.placeholder = '备注（可选）';
  noteInput.style.cssText = 'flex:1;min-width:120px;padding:6px 8px;border:1px solid var(--border);border-radius:var(--radius-sm);';
  const submit = h('button', 'btn-add', '打卡');
  submit.addEventListener('click', () => {
    const min = parseInt(minInput.value, 10);
    if (!min || min <= 0) { toast('请输入分钟数', 'error'); return; }
    addCheckin(sd, min, noteInput.value.trim());
    toast('已打卡 ' + formatMinutes(min), 'success'); update();
  });
  customForm.appendChild(minInput); customForm.appendChild(noteInput); customForm.appendChild(submit);
  wrap.appendChild(customForm);

  const tList = el('div', 'res-list');
  if (!todays.length) {
    tList.appendChild(emptyHint('⏰', '今日还未打卡'));
  } else {
    todays.forEach(c => tList.appendChild(checkinRow(c)));
  }
  wrap.appendChild(tList);

  const wGrid = el('div', 'stat-grid');
  wGrid.appendChild(statCard(formatMinutes(weekMinutes(sd)), '本周'));
  wGrid.appendChild(statCard(formatMinutes(monthMinutes(sd)), '本月'));
  wGrid.appendChild(statCard(formatMinutes(sd.totalMinutes || 0), '累计'));
  wGrid.appendChild(statCard(computeStreak(sd.studyCheckins) + ' 天', '连续'));
  wrap.appendChild(wGrid);

  wrap.appendChild(h('div', 'section-title', '打卡历史'));
  const grouped = {};
  (sd.studyCheckins || []).slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).forEach(c => {
    (grouped[c.date] = grouped[c.date] || []).push(c);
  });
  const hist = el('div');
  const dates = Object.keys(grouped).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
  if (!dates.length) {
    hist.appendChild(emptyHint('📭', '暂无打卡记录'));
  } else {
    dates.slice(0, 30).forEach(d => {
      const items = grouped[d];
      const sum = items.reduce((s, c) => s + c.minutes, 0);
      const block = el('div');
      block.style.cssText = 'padding:8px 0;border-bottom:1px solid var(--border);';
      block.appendChild(h('div', '', `${d}（周${getWeekday(new Date(d))}） · 合计 ${formatMinutes(sum)}`)).style.fontSize = '12px';
      block.lastChild.style.fontWeight = '600';
      block.lastChild.style.color = 'var(--text-2)';
      items.forEach(c => block.appendChild(checkinRow(c)));
      hist.appendChild(block);
    });
  }
  wrap.appendChild(hist);
  return wrap;
}

function checkinRow(c) {
  const row = el('div', 'rw-item');
  const sourceTag = c.source === 'bilibili' ? 'B站' : '手动';
  row.appendChild(h('div', 'rw-main', `${formatMinutes(c.minutes)} · ${sourceTag}${c.courseTitle ? ' · ' + c.courseTitle : ''}${c.note ? ' · ' + c.note : ''}`));
  return row;
}

/* ---------- Tab 6: AI Suggestions ---------- */
function tabAISuggest(subject, data, update) {
  const wrap = el('div');
  let suggestions = [];
  try { suggestions = getLearningSuggestions(data, subject) || []; } catch (e) { suggestions = []; }
  if (!suggestions.length) {
    wrap.appendChild(emptyHint('🤖', '暂无建议，开始学习后将生成个性化建议'));
    return wrap;
  }
  suggestions.forEach(s => {
    const box = el('div', 'ai-suggest');
    if (typeof s === 'string') {
      box.textContent = s;
    } else {
      box.innerHTML = `<b>${escapeHtml(s.label || '')}</b>：${escapeHtml(s.detail || '')}`;
    }
    wrap.appendChild(box);
  });
  const refresh = h('button', 'btn-secondary', '刷新建议');
  refresh.style.marginTop = '8px';
  refresh.addEventListener('click', () => update());
  wrap.appendChild(refresh);
  return wrap;
}

/* ---------- shared ---------- */
function emptyHint(icon, text) {
  const d = el('div', 'empty-hint');
  d.appendChild(h('div', 'hint-icon', icon));
  d.appendChild(h('div', '', text));
  return d;
}

function saveAndRefresh(data, update) {
  try { update(); } catch (e) {}
}
