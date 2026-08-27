import { el, h, todayStr, toast, openModal, closeModal, uid } from '../utils/helpers.js';
import { PLATFORMS, SUGGESTIONS } from '../utils/frameworks.js';

const PLAT_KEYS = ['xiaohongshu', 'douyin', 'bilibili', 'podcast'];

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
