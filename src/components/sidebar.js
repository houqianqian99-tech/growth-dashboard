import { getWeekday } from '../utils/helpers.js';

const NAV_GROUPS = [
  { title: '总控', items: [{ id: 'p1', icon: '📊', label: '仪表盘' }] },
  { title: '目标与计划', items: [
    { id: 'p2', icon: '🎯', label: '年度目标' },
    { id: 'p3', icon: '📋', label: '月周日计划' },
    { id: 'p9', icon: '✅', label: '习惯打卡' }
  ]},
  { title: '成长', items: [
    { id: 'p5', icon: '📚', label: '学习中心' },
    { id: 'p6', icon: '📱', label: '内容运营' },
    { id: 'p10', icon: '📖', label: '阅读观影' }
  ]},
  { title: '健康生活', items: [
    { id: 'p8', icon: '💪', label: '健康管理' }
  ]},
  { title: '复盘', items: [
    { id: 'p7', icon: '🔄', label: '复盘中心' }
  ]},
  { title: '设置', items: [
    { id: 'p11', icon: '⚙️', label: '系统设置' }
  ]}
];

const QUOTES = [
  '日拱一卒，功不唐捐',
  '今日事今日毕',
  '种一棵树最好的时间是十年前，其次是现在',
  '不积跬步无以至千里',
  '自律给我自由',
  '每天进步一点点',
  '行动是治愈焦虑的良药',
  '把简单的事做到极致',
  '光想不做，一切都是零',
  '复盘是为了更好地前进',
  '坚持比天赋更重要',
  '完成比完美更重要',
  '小步快跑，迭代优化',
  '今天的努力是明天的底气',
  '可控的事尽力，不可控的事释然',
  '与其焦虑不如行动',
  '习惯成自然，自然成命运',
  '每天前进一小步，人生前进一大步',
  '把时间花在进步上，而不是焦虑上',
  '今天的你比昨天的你更好就够了',
  '做难事必有所得',
  '执行力是拉开差距的关键',
  '先完成再完美',
  '慢慢来，比较快',
  '保持节奏感比冲刺更重要',
  '一个人走得快，一群人走得远',
  '可以慢但不能停',
  '方向对了就不怕路远',
  '把每一天当作第一天来过',
  '持续做正确的事，时间会给你答案'
];

export function renderSidebar(activePage, navigate) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  let navHtml = '<nav class="nav">';
  NAV_GROUPS.forEach(group => {
    navHtml += `<div class="nav-group-title">${group.title}</div>`;
    group.items.forEach(item => {
      const active = item.id === activePage ? ' active' : '';
      navHtml += `<div class="nav-item${active}" data-page="${item.id}"><span class="ico">${item.icon}</span><span>${item.label}</span></div>`;
    });
  });
  navHtml += '</nav>';

  sidebar.innerHTML = `
    <div class="sidebar-header">
      <div class="logo"><span class="dot"></span>个人成长管理工作台</div>
      <div class="slogan">目标 · 计划 · 复盘</div>
    </div>
    ${navHtml}
  `;

  sidebar.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      navigate(item.dataset.page);
    });
  });
}

export function renderTopbar(data) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const weekday = '星期' + getWeekday(now);

  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  const quote = QUOTES[dayOfYear % QUOTES.length];

  const dailyTodos = (data.plans && data.plans.daily) || [];
  const incomplete = dailyTodos.filter(t => !t.done);
  const top3 = incomplete.slice(0, 3);

  let rightHtml = '';
  if (top3.length) {
    rightHtml = top3.map(t => `<div class="cd"><span>${t.timeBlock || ''} ${t.text}</span><strong class="urgent-tag">待办</strong></div>`).join('');
  } else {
    rightHtml = `<div class="cd quote"><span>${quote}</span></div>`;
  }

  return `
    <div class="date">
      <strong>${year}年${month}月${day}日 ${weekday}</strong>
      <span class="status-badge"><span class="dot-live"></span>自动化运行中</span>
    </div>
    <div class="countdowns">
      ${rightHtml}
    </div>
  `;
}
