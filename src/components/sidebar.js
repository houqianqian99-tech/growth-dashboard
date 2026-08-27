import { daysUntil, getWeekday } from '../utils/helpers.js';

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

  let countdownsHtml = '';
  const goals = (data.annualGoals || []).filter(g => g.priority === 'P0').slice(0, 3);
  goals.forEach(g => {
    const targetDate = g.deadline || g.targetDate || g.endDate;
    if (!targetDate) {
      countdownsHtml += `<div class="cd"><span>${g.name}</span><strong>无截止日</strong></div>`;
      return;
    }
    const days = daysUntil(targetDate);
    const warnClass = days < 30 ? ' warn' : '';
    countdownsHtml += `<div class="cd${warnClass}"><span>${g.name}</span><strong>${days}天</strong></div>`;
  });

  if (goals.length === 0) {
    countdownsHtml = '<div class="cd"><span>暂无P0目标</span><strong>-</strong></div>';
  }

  return `
    <div class="date">
      <strong>${year}年${month}月${day}日 ${weekday}</strong>
      <span class="status-badge"><span class="dot-live"></span>自动化运行中</span>
    </div>
    <div class="countdowns">
      ${countdownsHtml}
    </div>
  `;
}
