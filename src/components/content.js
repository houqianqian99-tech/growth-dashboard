import { el, h, todayStr, toast, openModal, closeModal, uid } from '../utils/helpers.js';
import { PLATFORMS, SUGGESTIONS } from '../utils/frameworks.js';

const PLAT_KEYS = ['xiaohongshu', 'douyin', 'bilibili', 'podcast'];

const STAGES = [
  { key: 'idea', label: '构思', icon: '💡', color: '#6366f1' },
  { key: 'script', label: '写稿', icon: '✍️', color: '#f59e0b' },
  { key: 'record', label: '录制/拍摄', icon: '🎬', color: '#ef4444' },
  { key: 'edit', label: '后期', icon: '🎞️', color: '#8b5cf6' },
  { key: 'publish', label: '发布', icon: '🚀', color: '#10b981' }
];

const BOOKMARKLET = `javascript:(function(){var tables=document.querySelectorAll('table');if(!tables.length){alert('未找到表格数据');return;}var csv='';tables[0].querySelectorAll('tr').forEach(function(tr){var row=[];tr.querySelectorAll('th,td').forEach(function(cell){row.push(cell.innerText.trim())});csv+=row.join(',')+'\\n'});navigator.clipboard.writeText(csv).then(function(){alert('数据已复制到剪贴板！回到工作台粘贴')})})();`;

export function renderContent(data, update) {
  const root = el('div', 'page');
  let selectedPlatform = null;
  let collectorPlatform = null;

  const overviewCard = el('div', 'card');
  overviewCard.appendChild(h('h3', '', '平台数据概览'));
  const platGrid = el('div', 'plat-grid');
  PLAT_KEYS.forEach(key => {
    platGrid.appendChild(buildPlatformCard(data, key, () => {
      selectedPlatform = selectedPlatform === key ? null : key;
      renderDetailSection();
    }));
  });
  overviewCard.appendChild(platGrid);
  root.appendChild(overviewCard);

  const detailHost = el('div');
  root.appendChild(detailHost);

  root.appendChild(buildCreationPipeline(data, update));

  const wizardCard = el('div', 'card');
  wizardCard.appendChild(h('h3', '', '半自动数据采集'));
  const wizardHost = el('div');
  wizardCard.appendChild(wizardHost);
  root.appendChild(wizardCard);

  root.appendChild(buildAISuggest());

  function buildPlatformCard(data, key, onClick) {
    const plat = PLATFORMS[key];
    const pd = data.content[key];
    const isPodcast = key === 'podcast';
    const itemCount = isPodcast ? (pd.episodes ? pd.episodes.length : 0) : (pd.posts ? pd.posts.length : 0);
    const card = el('div', 'plat-card');
    card.style.cursor = 'pointer';
    const head = el('div', 'pc-head');
    const iconBox = el('div', 'pc-icon', plat.icon);
    iconBox.style.background = 'var(--accent-light)';
    head.appendChild(iconBox);
    const info = el('div');
    info.appendChild(h('div', 'pc-name', plat.name));
    const statText = isPodcast ? `${itemCount} 期内容` : `${pd.followers || 0} 粉丝 · ${itemCount} 篇`;
    info.appendChild(h('div', 'pc-stat', statText));
    head.appendChild(info);
    card.appendChild(head);
    const syncText = pd.importedData ? `最后同步 ${pd.importedData.importedAt}` : '暂未同步数据';
    card.appendChild(h('div', 'pc-stat', syncText));
    card.addEventListener('click', onClick);
    return card;
  }

  function renderDetailSection() {
    detailHost.innerHTML = '';
    if (!selectedPlatform) return;
    const key = selectedPlatform;
    const plat = PLATFORMS[key];
    const pd = data.content[key];
    const isPodcast = key === 'podcast';
    const items = isPodcast ? (pd.episodes || []) : (pd.posts || []);

    const card = el('div', 'card');
    const head = h('h3', '', `${plat.icon} ${plat.name} 内容管理`);
    const addBtn = el('button', 'btn btn-sm', isPodcast ? '添加期数' : '添加内容');
    addBtn.addEventListener('click', () => openAddItemModal(data, key, isPodcast, update));
    head.appendChild(addBtn);
    card.appendChild(head);

    if (!items.length) {
      card.appendChild(emptyHint(isPodcast ? '还没有期数记录' : '还没有内容记录'));
    } else {
      const list = el('div');
      items.slice().reverse().forEach(item => {
        const row = el('div', 'rw-item');
        row.appendChild(h('div', 'rw-cover', plat.icon));
        const main = el('div', 'rw-main');
        main.appendChild(h('div', 'rw-title', item.title || '无标题'));
        const metrics = [];
        if (item.date) metrics.push(item.date);
        if (item.views !== undefined) metrics.push(`浏览 ${item.views}`);
        if (item.likes !== undefined) metrics.push(`赞 ${item.likes}`);
        if (item.comments !== undefined) metrics.push(`评论 ${item.comments}`);
        main.appendChild(h('div', 'rw-sub', metrics.join(' · ')));
        if (item.notes) main.appendChild(h('div', 'rw-sub', item.notes));
        row.appendChild(main);
        list.appendChild(row);
      });
      card.appendChild(list);
    }
    detailHost.appendChild(card);
  }

  function renderWizard() {
    wizardHost.innerHTML = '';
    const selector = el('div', 'collector-platforms');
    PLAT_KEYS.forEach(key => {
      const plat = PLATFORMS[key];
      const cpCard = el('div', 'cp-card');
      if (collectorPlatform === key) cpCard.classList.add('active');
      cpCard.appendChild(h('div', 'cp-icon', plat.icon));
      cpCard.appendChild(h('div', 'cp-name', plat.name));
      cpCard.addEventListener('click', () => {
        collectorPlatform = collectorPlatform === key ? null : key;
        renderWizard();
      });
      selector.appendChild(cpCard);
    });
    wizardHost.appendChild(selector);

    if (!collectorPlatform) {
      const hint = el('div', 'empty-hint');
      hint.appendChild(h('div', 'hint-icon', '🔄'));
      hint.appendChild(h('div', '', '选择一个平台开始半自动数据采集'));
      wizardHost.appendChild(hint);
      return;
    }

    const plat = PLATFORMS[collectorPlatform];
    const pd = data.content[collectorPlatform];
    const stepsWrap = el('div', 'cw-steps');

    stepsWrap.appendChild(buildStep(1, '登录平台',
      plat.creatorUrl ? `打开 ${plat.name} 创作者后台登录账号` : '该平台暂无创作者后台链接',
      plat.creatorUrl ? buildOpenLink('打开登录页', plat.creatorUrl) : null,
      !!plat.creatorUrl
    ));

    stepsWrap.appendChild(buildStep(2, '导航到数据页',
      plat.dataUrl ? '进入数据统计页面查看内容数据' : '该平台暂无数据页链接',
      plat.dataUrl ? buildOpenLink('打开数据页', plat.dataUrl) : null,
      !!plat.dataUrl
    ));

    const codeBody = el('div', 'cw-body');
    codeBody.appendChild(h('div', 'cw-title', '使用书签小工具'));
    codeBody.appendChild(h('div', 'cw-desc', '在数据页打开后，运行下方书签代码提取表格数据到剪贴板'));
    const codeBox = el('textarea');
    codeBox.value = BOOKMARKLET;
    codeBox.readOnly = true;
    styleTextarea(codeBox, '60px');
    codeBody.appendChild(codeBox);
    const copyBtn = el('button', 'btn btn-secondary', '复制代码');
    copyBtn.style.marginTop = '6px';
    copyBtn.addEventListener('click', () => {
      codeBox.select();
      try {
        document.execCommand('copy');
        toast('书签代码已复制', 'success');
      } catch (e) {
        toast('复制失败，请手动选择复制', 'error');
      }
    });
    codeBody.appendChild(copyBtn);
    const s3 = el('div', 'cw-step');
    s3.appendChild(numBox(3));
    s3.appendChild(codeBody);
    s3.classList.add('done');
    stepsWrap.appendChild(s3);

    const pasteBody = el('div', 'cw-body');
    pasteBody.appendChild(h('div', 'cw-title', '粘贴数据'));
    pasteBody.appendChild(h('div', 'cw-desc', '将剪贴板中的 CSV 数据粘贴到下方，解析后保存'));
    const pasteBox = el('textarea');
    pasteBox.placeholder = '在此粘贴 CSV 数据（每行一条记录，逗号分隔）';
    styleTextarea(pasteBox, '90px');
    pasteBox.style.fontSize = '11px';
    pasteBox.style.fontFamily = 'monospace';
    pasteBody.appendChild(pasteBox);
    const parseBtn = el('button', 'btn', '解析并保存');
    parseBtn.style.marginTop = '6px';
    parseBtn.addEventListener('click', () => {
      const raw = pasteBox.value.trim();
      if (!raw) {
        toast('请先粘贴数据', 'error');
        return;
      }
      const lines = raw.split(/\r?\n/).filter(l => l.trim());
      if (!lines.length) {
        toast('未解析到有效数据', 'error');
        return;
      }
      const headers = lines[0].split(',').map(s => s.trim());
      const rows = lines.slice(1).map(line => line.split(',').map(s => s.trim()));
      pd.importedData = { headers, rows, importedAt: todayStr(), source: 'collector' };
      toast(`${plat.name} 数据已保存（${rows.length} 条）`, 'success');
      update();
    });
    pasteBody.appendChild(parseBtn);
    const s4 = el('div', 'cw-step');
    s4.appendChild(numBox(4));
    s4.appendChild(pasteBody);
    if (pd.importedData) s4.classList.add('done');
    stepsWrap.appendChild(s4);

    wizardHost.appendChild(stepsWrap);

    if (pd.importedData) {
      wizardHost.appendChild(buildImportedTable(pd.importedData));
    }
  }

  function buildStep(num, title, desc, actionEl, done) {
    const step = el('div', 'cw-step');
    if (done) step.classList.add('done');
    step.appendChild(numBox(num));
    const body = el('div', 'cw-body');
    body.appendChild(h('div', 'cw-title', title));
    body.appendChild(h('div', 'cw-desc', desc));
    if (actionEl) {
      actionEl.style.marginTop = '6px';
      body.appendChild(actionEl);
    }
    step.appendChild(body);
    return step;
  }

  function buildOpenLink(label, url) {
    const link = el('a', 'btn btn-secondary', label);
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener';
    return link;
  }

  function numBox(n) {
    return h('div', 'cw-num', String(n));
  }

  function styleTextarea(ta, height) {
    ta.style.width = '100%';
    ta.style.height = height;
    ta.style.fontSize = '10px';
    ta.style.fontFamily = 'monospace';
    ta.style.border = '1px solid var(--border)';
    ta.style.borderRadius = '6px';
    ta.style.padding = '6px';
    ta.style.marginTop = '6px';
    ta.style.resize = 'vertical';
  }

  function buildImportedTable(imp) {
    const wrap = el('div');
    wrap.style.marginTop = '12px';
    wrap.appendChild(h('h4', '', `已导入数据（${imp.rows.length} 条，${imp.importedAt} 同步）`));
    if (!imp.rows.length) {
      wrap.appendChild(h('div', 'muted', '无数据行'));
      return wrap;
    }
    const tableWrap = el('div');
    tableWrap.style.overflowX = 'auto';
    const table = el('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '11px';
    const thead = el('thead');
    const tr = el('tr');
    imp.headers.forEach(header => {
      const th = el('th', '', header);
      th.style.border = '1px solid var(--border)';
      th.style.padding = '4px 6px';
      th.style.textAlign = 'left';
      th.style.background = 'var(--surface-2)';
      tr.appendChild(th);
    });
    thead.appendChild(tr);
    table.appendChild(thead);
    const tbody = el('tbody');
    imp.rows.slice(0, 50).forEach(row => {
      const r = el('tr');
      imp.headers.forEach((_, i) => {
        const td = el('td', '', row[i] !== undefined ? row[i] : '');
        td.style.border = '1px solid var(--border)';
        td.style.padding = '4px 6px';
        r.appendChild(td);
      });
      tbody.appendChild(r);
    });
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    wrap.appendChild(tableWrap);
    return wrap;
  }

  function emptyHint(text) {
    const hint = el('div', 'empty-hint');
    hint.appendChild(h('div', 'hint-icon', '📝'));
    hint.appendChild(h('div', '', text));
    return hint;
  }

  renderWizard();

  return root;
}

function buildCreationPipeline(data, update) {
  if (!data.content.creations) data.content.creations = [];
  const creations = data.content.creations;

  const card = el('div', 'card');
  const head = h('h3', '', '内容创作工作流');
  const addBtn = el('button', 'btn btn-sm', '+ 新建内容');
  addBtn.addEventListener('click', () => openCreationModal(data, null, update));
  head.appendChild(addBtn);
  card.appendChild(head);

  const desc = h('div', 'muted', '管理每期内容的创作流程：构思 → 写稿 → 录制/拍摄 → 后期 → 发布。支持飞书文档链接导入稿件。');
  desc.style.marginBottom = '12px';
  card.appendChild(desc);

  if (!creations.length) {
    const hint = el('div', 'empty-hint');
    hint.appendChild(h('div', 'hint-icon', '🎬'));
    hint.appendChild(h('div', '', '还没有创作内容，点击「新建内容」开始'));
    card.appendChild(hint);
    return card;
  }

  const cols = el('div');
  cols.style.display = 'flex';
  cols.style.gap = '12px';
  cols.style.overflowX = 'auto';
  cols.style.paddingBottom = '8px';

  STAGES.forEach(stage => {
    const col = el('div');
    col.style.minWidth = '200px';
    col.style.flex = '1';
    const colHead = el('div');
    colHead.style.display = 'flex';
    colHead.style.alignItems = 'center';
    colHead.style.gap = '6px';
    colHead.style.marginBottom = '8px';
    colHead.style.padding = '6px 8px';
    colHead.style.borderRadius = '6px';
    colHead.style.background = stage.color + '15';
    colHead.appendChild(h('span', '', stage.icon));
    colHead.appendChild(h('span', '', stage.label));
    const count = creations.filter(c => (c.stage || 'idea') === stage.key).length;
    colHead.appendChild(h('span', '', `(${count})`));
    col.appendChild(colHead);

    const items = creations.filter(c => (c.stage || 'idea') === stage.key);
    if (!items.length) {
      const empty = h('div', 'muted', '—');
      empty.style.textAlign = 'center';
      empty.style.padding = '12px 0';
      col.appendChild(empty);
    } else {
      items.forEach(item => {
        const itemCard = buildCreationCard(item, data, update);
        col.appendChild(itemCard);
      });
    }
    cols.appendChild(col);
  });

  card.appendChild(cols);
  return card;
}

function buildCreationCard(item, data, update) {
  const plat = PLATFORMS[item.platform] || { icon: '📝', name: '未分类' };
  const card = el('div');
  card.style.border = '1px solid var(--border)';
  card.style.borderRadius = '8px';
  card.style.padding = '8px';
  card.style.marginBottom = '8px';
  card.style.cursor = 'pointer';
  card.style.background = 'var(--surface)';

  card.addEventListener('click', () => openCreationModal(data, item, update));

  card.appendChild(h('div', '', `${plat.icon} ${item.title || '无标题'}`));
  if (item.feishuDocUrl) {
    const link = h('div', '', '📄 飞书稿件');
    link.style.fontSize = '11px';
    link.style.color = 'var(--accent)';
    card.appendChild(link);
  }
  if (item.script) {
    const preview = h('div', 'muted', item.script.substring(0, 50) + (item.script.length > 50 ? '...' : ''));
    preview.style.fontSize = '11px';
    preview.style.marginTop = '4px';
    card.appendChild(preview);
  }
  return card;
}

function openCreationModal(data, existing, update) {
  if (!data.content.creations) data.content.creations = [];
  const isEdit = !!existing;
  const item = existing || {
    id: uid('creation'),
    title: '',
    platform: 'podcast',
    stage: 'idea',
    feishuDocUrl: '',
    feishuDocTitle: '',
    script: '',
    recordNotes: '',
    publishDate: '',
    createdAt: todayStr()
  };

  const stageOptions = STAGES.map(s => `<option value="${s.key}" ${item.stage === s.key ? 'selected' : ''}>${s.icon} ${s.label}</option>`).join('');
  const platOptions = PLAT_KEYS.map(k => `<option value="${k}" ${item.platform === k ? 'selected' : ''}>${PLATFORMS[k].icon} ${PLATFORMS[k].name}</option>`).join('');

  const modalHtml = `
    <div class="modal" style="max-width:640px">
      <h3>${isEdit ? '编辑内容' : '新建内容'}</h3>
      <div class="form-row">
        <label>标题 *</label>
        <input type="text" id="cr-title" value="${item.title || ''}" placeholder="如：第3期播客-会计备考经验分享" />
      </div>
      <div class="form-row" style="display:flex;gap:12px">
        <div style="flex:1">
          <label>平台</label>
          <select id="cr-platform">${platOptions}</select>
        </div>
        <div style="flex:1">
          <label>当前阶段</label>
          <select id="cr-stage">${stageOptions}</select>
        </div>
      </div>
      <div class="form-row">
        <label>飞书文档链接</label>
        <div style="display:flex;gap:6px">
          <input type="text" id="cr-feishu-url" value="${item.feishuDocUrl || ''}" placeholder="粘贴飞书文档链接" style="flex:1" />
          <input type="text" id="cr-feishu-title" value="${item.feishuDocTitle || ''}" placeholder="文档标题" style="flex:1" />
        </div>
        ${item.feishuDocUrl ? `<a href="${item.feishuDocUrl}" target="_blank" rel="noopener" class="btn btn-secondary" style="margin-top:6px;display:inline-block;font-size:12px">📄 在飞书打开</a>` : ''}
      </div>
      <div class="form-row">
        <label>稿件内容（可直接在此写稿）</label>
        <textarea id="cr-script" placeholder="在此输入稿件内容，或在飞书写完稿后粘贴链接" style="height:200px;font-size:13px;line-height:1.6">${item.script || ''}</textarea>
      </div>
      <div class="form-row">
        <label>录制/拍摄笔记</label>
        <textarea id="cr-notes" placeholder="录制时的备注、修改、注意事项" style="height:60px">${item.recordNotes || ''}</textarea>
      </div>
      <div class="form-row">
        <label>计划发布日期</label>
        <input type="date" id="cr-publish-date" value="${item.publishDate || ''}" />
      </div>
      <div class="modal-actions">
        ${isEdit ? '<button class="btn-secondary" id="cr-delete" style="float:left;color:#ef4444">删除</button>' : ''}
        <button class="btn-secondary" data-close>取消</button>
        <button class="btn" id="cr-save">保存</button>
      </div>
    </div>
  `;
  const overlay = openModal(modalHtml, (ov) => {
    ov.querySelector('#cr-save').addEventListener('click', () => {
      const title = ov.querySelector('#cr-title').value.trim();
      if (!title) { toast('请输入标题', 'error'); return; }
      item.title = title;
      item.platform = ov.querySelector('#cr-platform').value;
      item.stage = ov.querySelector('#cr-stage').value;
      item.feishuDocUrl = ov.querySelector('#cr-feishu-url').value.trim();
      item.feishuDocTitle = ov.querySelector('#cr-feishu-title').value.trim();
      item.script = ov.querySelector('#cr-script').value;
      item.recordNotes = ov.querySelector('#cr-notes').value.trim();
      item.publishDate = ov.querySelector('#cr-publish-date').value;
      item.updatedAt = todayStr();
      if (!isEdit) data.content.creations.push(item);
      toast(isEdit ? '内容已更新' : '内容已创建', 'success');
      closeModal(overlay);
      update();
    });
    if (isEdit) {
      ov.querySelector('#cr-delete').addEventListener('click', () => {
        const idx = data.content.creations.findIndex(c => c.id === item.id);
        if (idx >= 0) {
          data.content.creations.splice(idx, 1);
          toast('内容已删除', 'success');
          closeModal(overlay);
          update();
        }
      });
    }
  });
}

function buildAISuggest() {
  const card = el('div', 'card');
  card.appendChild(h('h3', '', '内容创作建议'));
  const box = el('div', 'ai-suggest');
  SUGGESTIONS.content.forEach(s => {
    const line = el('div');
    line.style.marginBottom = '6px';
    line.innerHTML = `<b>${s.label}</b>：${s.detail}`;
    box.appendChild(line);
  });
  card.appendChild(box);
  return card;
}

function openAddItemModal(data, key, isPodcast, update) {
  const plat = PLATFORMS[key];
  const pd = data.content[key];
  const modalHtml = `
    <div class="modal">
      <h3>${plat.icon} 添加${isPodcast ? '期数' : '内容'}</h3>
      <div class="form-row">
        <label>标题</label>
        <input type="text" id="m-title" placeholder="输入标题" />
      </div>
      <div class="form-row">
        <label>日期</label>
        <input type="date" id="m-date" value="${todayStr()}" />
      </div>
      <div class="form-row">
        <label>浏览量</label>
        <input type="number" id="m-views" placeholder="0" min="0" />
      </div>
      <div class="form-row">
        <label>点赞数</label>
        <input type="number" id="m-likes" placeholder="0" min="0" />
      </div>
      <div class="form-row">
        <label>评论数</label>
        <input type="number" id="m-comments" placeholder="0" min="0" />
      </div>
      <div class="form-row">
        <label>备注</label>
        <textarea id="m-notes" placeholder="可选备注"></textarea>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" data-close>取消</button>
        <button class="btn" id="m-save">保存</button>
      </div>
    </div>
  `;
  const overlay = openModal(modalHtml, (ov) => {
    ov.querySelector('#m-save').addEventListener('click', () => {
      const title = ov.querySelector('#m-title').value.trim();
      if (!title) {
        toast('请输入标题', 'error');
        return;
      }
      const item = {
        id: uid('post'),
        title,
        date: ov.querySelector('#m-date').value || todayStr(),
        views: parseInt(ov.querySelector('#m-views').value) || 0,
        likes: parseInt(ov.querySelector('#m-likes').value) || 0,
        comments: parseInt(ov.querySelector('#m-comments').value) || 0,
        notes: ov.querySelector('#m-notes').value.trim()
      };
      if (isPodcast) {
        if (!pd.episodes) pd.episodes = [];
        pd.episodes.push(item);
      } else {
        if (!pd.posts) pd.posts = [];
        pd.posts.push(item);
      }
      toast('内容已添加', 'success');
      closeModal(overlay);
      update();
    });
  });
}
