import { el, h, todayStr, formatMinutes, toast, openModal, closeModal, uid } from '../utils/helpers.js';

export function renderReading(data, update) {
  const root = el('div', 'page');

  const current = data.reading.current || [];
  const finished = data.reading.finished || [];

  const stats = el('div', 'stat-grid');
  const booksDone = finished.filter(i => i.type === 'book').length;
  const moviesDone = finished.filter(i => i.type === 'movie').length;
  stats.appendChild(statCard(formatMinutes(data.reading.monthlyMinutes || 0), '本月阅读时长'));
  stats.appendChild(statCard(String(booksDone), '读完本书'));
  stats.appendChild(statCard(String(moviesDone), '看完部影'));
  stats.appendChild(statCard(String(current.length + finished.length), '总记录数'));
  root.appendChild(stats);

  const currentCard = el('div', 'card');
  const curHead = h('h3', '', '正在阅读 / 观看');
  const addBtn = el('button', 'btn btn-sm', '添加');
  addBtn.addEventListener('click', () => openAddItemModal(data, update));
  curHead.appendChild(addBtn);
  currentCard.appendChild(curHead);

  if (!current.length) {
    currentCard.appendChild(emptyHint('还没有在读书籍或观看的影片'));
  } else {
    const section = el('div', 'rw-section');
    current.forEach(item => {
      section.appendChild(buildCurrentItem(item, data, update));
    });
    currentCard.appendChild(section);
  }
  root.appendChild(currentCard);

  const finishedCard = el('div', 'card');
  finishedCard.appendChild(h('h3', '', '已完成'));
  if (!finished.length) {
    finishedCard.appendChild(emptyHint('还没有完成的项目'));
  } else {
    const section = el('div', 'rw-section');
    finished.slice().reverse().forEach(item => {
      section.appendChild(buildFinishedItem(item));
    });
    finishedCard.appendChild(section);
  }
  root.appendChild(finishedCard);

  return root;
}

function statCard(num, label) {
  const card = el('div', 'stat-card');
  card.appendChild(h('div', 'sc-num', num));
  card.appendChild(h('div', 'sc-label', label));
  return card;
}

function buildCurrentItem(item, data, update) {
  const wrap = el('div', 'rw-item');
  const icon = item.type === 'movie' ? '🎬' : '📖';
  wrap.appendChild(h('div', 'rw-cover', icon));

  const main = el('div', 'rw-main');
  main.appendChild(h('div', 'rw-title', item.title || '无标题'));
  const sub = [];
  if (item.author) sub.push(item.author);
  if (item.startDate) sub.push(`开始 ${item.startDate}`);
  sub.push(`进度 ${item.progress || 0}%`);
  main.appendChild(h('div', 'rw-sub', sub.join(' · ')));

  const bar = el('div', 'progress');
  const fill = el('div', 'fill blue');
  fill.style.width = (item.progress || 0) + '%';
  bar.appendChild(fill);
  main.appendChild(bar);

  const actions = el('div');
  actions.style.marginTop = '8px';
  actions.style.display = 'flex';
  actions.style.gap = '6px';

  const updateBtn = el('button', 'btn-sm', '更新进度');
  updateBtn.addEventListener('click', () => openProgressModal(item, data, update));
  const doneBtn = el('button', 'btn-sm', '完成');
  doneBtn.addEventListener('click', () => openFinishModal(item, data, update));
  actions.appendChild(updateBtn);
  actions.appendChild(doneBtn);
  main.appendChild(actions);

  wrap.appendChild(main);
  return wrap;
}

function buildFinishedItem(item) {
  const wrap = el('div', 'rw-item');
  wrap.style.cursor = 'pointer';
  const icon = item.type === 'movie' ? '🎬' : '📖';
  wrap.appendChild(h('div', 'rw-cover', icon));

  const main = el('div', 'rw-main');
  main.appendChild(h('div', 'rw-title', item.title || '无标题'));
  const stars = '★'.repeat(item.rating || 0) + '☆'.repeat(5 - (item.rating || 0));
  const sub = [];
  if (item.author) sub.push(item.author);
  sub.push(stars);
  if (item.finishDate) sub.push(`完成 ${item.finishDate}`);
  main.appendChild(h('div', 'rw-sub', sub.join(' · ')));

  if (item.review) {
    const reviewEl = h('div', 'rw-sub', item.review);
    reviewEl.style.overflow = 'hidden';
    reviewEl.style.textOverflow = 'ellipsis';
    reviewEl.style.whiteSpace = 'nowrap';
    main.appendChild(reviewEl);
    wrap.addEventListener('click', () => {
      reviewEl.style.whiteSpace = reviewEl.style.whiteSpace === 'nowrap' ? 'normal' : 'nowrap';
      reviewEl.style.textOverflow = reviewEl.style.whiteSpace === 'nowrap' ? 'ellipsis' : 'clip';
    });
  }

  wrap.appendChild(main);
  return wrap;
}

function openAddItemModal(data, update) {
  const modalHtml = `
    <div class="modal">
      <h3>添加阅读 / 观影</h3>
      <div class="form-row">
        <label>类型</label>
        <select id="r-type">
          <option value="book">书籍</option>
          <option value="movie">电影</option>
        </select>
      </div>
      <div class="form-row">
        <label>标题</label>
        <input type="text" id="r-title" placeholder="书名 / 电影名" />
      </div>
      <div class="form-row">
        <label>作者 / 导演</label>
        <input type="text" id="r-author" placeholder="可选" />
      </div>
      <div class="form-row">
        <label>初始进度 (%)</label>
        <input type="range" id="r-progress" min="0" max="100" value="0" />
        <span id="r-progress-val">0%</span>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" data-close>取消</button>
        <button class="btn" id="r-save">保存</button>
      </div>
    </div>
  `;
  const overlay = openModal(modalHtml, (ov) => {
    const slider = ov.querySelector('#r-progress');
    const valEl = ov.querySelector('#r-progress-val');
    slider.addEventListener('input', () => { valEl.textContent = slider.value + '%'; });
    ov.querySelector('#r-save').addEventListener('click', () => {
      const title = ov.querySelector('#r-title').value.trim();
      if (!title) {
        toast('请输入标题', 'error');
        return;
      }
      const item = {
        id: uid('read'),
        type: ov.querySelector('#r-type').value,
        title,
        author: ov.querySelector('#r-author').value.trim(),
        progress: parseInt(slider.value) || 0,
        startDate: todayStr()
      };
      if (!data.reading.current) data.reading.current = [];
      data.reading.current.push(item);
      toast('已添加', 'success');
      closeModal(overlay);
      update();
    });
  });
}

function openProgressModal(item, data, update) {
  const modalHtml = `
    <div class="modal">
      <h3>更新进度 - ${item.title}</h3>
      <div class="form-row">
        <label>进度</label>
        <input type="range" id="p-progress" min="0" max="100" value="${item.progress || 0}" />
        <span id="p-progress-val">${item.progress || 0}%</span>
      </div>
      <div class="form-row">
        <label>本次阅读时长 (分钟)</label>
        <input type="number" id="p-minutes" min="0" value="0" />
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" data-close>取消</button>
        <button class="btn" id="p-save">保存</button>
      </div>
    </div>
  `;
  const overlay = openModal(modalHtml, (ov) => {
    const slider = ov.querySelector('#p-progress');
    const valEl = ov.querySelector('#p-progress-val');
    slider.addEventListener('input', () => { valEl.textContent = slider.value + '%'; });
    ov.querySelector('#p-save').addEventListener('click', () => {
      item.progress = parseInt(slider.value) || 0;
      const mins = parseInt(ov.querySelector('#p-minutes').value) || 0;
      if (mins > 0) {
        data.reading.monthlyMinutes = (data.reading.monthlyMinutes || 0) + mins;
      }
      toast('进度已更新', 'success');
      closeModal(overlay);
      update();
    });
  });
}

function openFinishModal(item, data, update) {
  const modalHtml = `
    <div class="modal">
      <h3>完成 - ${item.title}</h3>
      <div class="form-row">
        <label>评分 (1-5)</label>
        <input type="number" id="f-rating" min="1" max="5" value="4" />
      </div>
      <div class="form-row">
        <label>书评 / 观后感</label>
        <textarea id="f-review" placeholder="写下你的感受…"></textarea>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" data-close>取消</button>
        <button class="btn" id="f-save">完成</button>
      </div>
    </div>
  `;
  const overlay = openModal(modalHtml, (ov) => {
    ov.querySelector('#f-save').addEventListener('click', () => {
      const rating = parseInt(ov.querySelector('#f-rating').value) || 4;
      const review = ov.querySelector('#f-review').value.trim();
      const finishedItem = {
        id: item.id,
        type: item.type,
        title: item.title,
        author: item.author || '',
        rating: Math.max(1, Math.min(5, rating)),
        review,
        finishDate: todayStr()
      };
      if (!data.reading.finished) data.reading.finished = [];
      data.reading.finished.push(finishedItem);
      const idx = data.reading.current.findIndex(i => i.id === item.id);
      if (idx >= 0) data.reading.current.splice(idx, 1);
      toast('已标记完成', 'success');
      closeModal(overlay);
      update();
    });
  });
}

function emptyHint(text) {
  const hint = el('div', 'empty-hint');
  hint.appendChild(h('div', 'hint-icon', '📚'));
  hint.appendChild(h('div', '', text));
  return hint;
}
