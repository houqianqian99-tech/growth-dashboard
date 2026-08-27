export function $(sel, root = document) {
  return root.querySelector(sel);
}

export function el(tag, cls = '', html = '') {
  const d = document.createElement(tag);
  if (cls) d.className = cls;
  if (html) d.innerHTML = html;
  return d;
}

export function h(tag, cls, text) {
  const d = document.createElement(tag);
  if (cls) d.className = cls;
  if (text !== undefined) d.textContent = text;
  return d;
}

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dateStr(date) {
  if (typeof date === 'string') return date;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function daysUntil(targetDate) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

export function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

export function firstDayOfMonth(year, month) {
  return new Date(year, month - 1, 1).getDay();
}

export function toast(msg, type = '') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = h('div', 'toast ' + type, msg);
  c.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transition = 'opacity 0.3s';
    setTimeout(() => t.remove(), 300);
  }, 3000);
}

export function uid(prefix = 'id') {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
}

export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function formatMinutes(min) {
  if (min < 60) return min + 'min';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${m}min` : `${h}h`;
}

export function weekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function monthStr(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getWeekday(date = new Date()) {
  return '日一二三四五六'[date.getDay()];
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function openModal(htmlContent, onMount) {
  const root = document.getElementById('modal-root');
  if (!root) return;
  const overlay = el('div', 'modal-overlay');
  overlay.innerHTML = htmlContent;
  root.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));
  const closeBtns = overlay.querySelectorAll('[data-close]');
  closeBtns.forEach(btn => {
    btn.addEventListener('click', () => closeModal(overlay));
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(overlay);
  });
  if (onMount) onMount(overlay);
  return overlay;
}

export function closeModal(overlay) {
  if (typeof overlay === 'string') {
    overlay = document.querySelector('.modal-overlay');
  }
  if (!overlay) return;
  overlay.classList.remove('open');
  setTimeout(() => overlay.remove(), 200);
}
