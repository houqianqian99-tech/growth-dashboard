import { loadData, saveData, resetData, loadFromBackend, saveFeishuConfig, sendFeishuMessage } from './data/store.js';
import { renderSidebar, renderTopbar } from './components/sidebar.js';
import { renderDashboard } from './components/dashboard.js';
import { renderGoals } from './components/goals.js';
import { renderPlans } from './components/plans.js';
import { renderHabits } from './components/habits.js';
import { renderLearning } from './components/learning.js';
import { renderContent } from './components/content.js';
import { renderHealth } from './components/health.js';
import { renderReading } from './components/reading.js';
import { renderReview } from './components/review.js';
import { renderSettings } from './components/settings.js';
import { generateDailyTodos, checkReminders, generateWeeklyReport, generateMonthlyReport, requestNotificationPermission } from './utils/automation.js';

let state = { data: null, currentPage: 'p1' };
let _topbar = null;

function renderTopbarUpdate() {
  if (_topbar) _topbar.innerHTML = renderTopbar(state.data);
}

async function init() {
  state.data = loadData();
  const remoteData = await loadFromBackend();
  if (remoteData) state.data = remoteData;

  window._growth = { saveFeishuConfig, sendFeishuMessage, requestNotificationPermission };

  requestNotificationPermission();

  if (state.data.automation.autoDaily) {
    generateDailyTodos(state.data);
    saveData(state.data);
  }

  const main = document.getElementById('main');
  _topbar = document.createElement('div');
  _topbar.className = 'topbar';
  main.appendChild(_topbar);

  const content = document.createElement('div');
  content.className = 'content';
  main.appendChild(content);

  function navigate(pageId) {
    state.currentPage = pageId;
    const sidebar = document.getElementById('sidebar');
    sidebar.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === pageId);
    });
    renderPage(content, pageId);
  }

  renderTopbarUpdate();
  renderSidebar(state.currentPage, navigate);
  renderPage(content, state.currentPage);

  window.addEventListener('navigate', (e) => {
    navigate(e.detail);
  });

  window.addEventListener('hashchange', () => {
    const page = window.location.hash.slice(1);
    if (page) navigate(page);
  });

  if (window.location.hash) {
    const page = window.location.hash.slice(1);
    if (page) navigate(page);
  }

  setInterval(() => {
    checkReminders(state.data);
    checkAutoReports(state.data);
    saveData(state.data);
  }, 60000);

  setInterval(() => {
    renderTopbarUpdate();
  }, 30000);

  console.log('个人成长管理工作台已启动');
}

function checkAutoReports(data) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const day = now.getDay();

  if (day === 0 && data.automation.autoWeeklyReport) {
    const lastWeek = data.automation.lastWeeklyReport;
    const thisWeekStart = getWeekStart(now).toISOString().split('T')[0];
    if (!lastWeek || lastWeek.weekStart !== thisWeekStart) {
      data.automation.lastWeeklyReport = generateWeeklyReport(data);
    }
  }

  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  if (now.getDate() === lastDay && data.automation.autoMonthlyReport) {
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (!data.automation.lastMonthlyReport || data.automation.lastMonthlyReport.month !== monthKey) {
      data.automation.lastMonthlyReport = generateMonthlyReport(data);
    }
  }
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function renderPage(content, pageId) {
  content.innerHTML = '';
  let page;
  const update = () => {
    saveData(state.data);
    renderTopbarUpdate();
    renderPage(content, state.currentPage);
  };

  switch (pageId) {
    case 'p1':
      page = renderDashboard(state.data, update);
      break;
    case 'p2':
      page = renderGoals(state.data, update);
      break;
    case 'p3':
      page = renderPlans(state.data, update);
      break;
    case 'p5':
      page = renderLearning(state.data, update);
      break;
    case 'p6':
      page = renderContent(state.data, update);
      break;
    case 'p7':
      page = renderReview(state.data, update);
      break;
    case 'p8':
      page = renderHealth(state.data, update);
      break;
    case 'p9':
      page = renderHabits(state.data, update);
      break;
    case 'p10':
      page = renderReading(state.data, update);
      break;
    case 'p11':
      page = renderSettings(state.data, update);
      break;
    default:
      page = renderDashboard(state.data, update);
  }

  if (page) content.appendChild(page);
  document.getElementById('main').scrollTop = 0;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
