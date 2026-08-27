import { HABIT_LIST, TIME_BLOCKS, MONTHLY_TEMPLATE, WEEKLY_TEMPLATE } from '../utils/frameworks.js';

const STORAGE_KEY = 'growth_dashboard_data';
let _backendAvailable = null;

export function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.warn('数据解析失败，使用默认数据');
    }
  }
  return getDefaultData();
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('保存失败:', e);
  }
  syncToBackend(data);
  return true;
}

export async function loadFromBackend() {
  try {
    const res = await fetch('/api/data');
    if (!res.ok) return null;
    const data = await res.json();
    if (data && Object.keys(data).length > 0) {
      _backendAvailable = true;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data;
    }
  } catch (e) {
    _backendAvailable = false;
  }
  return null;
}

export async function syncToBackend(data) {
  if (_backendAvailable === false) return;
  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    _backendAvailable = res.ok;
  } catch (e) {
    _backendAvailable = false;
  }
}

export async function saveFeishuConfig(config) {
  try {
    await fetch('/api/feishu/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return true;
  } catch (e) { return false; }
}

export async function sendFeishuMessage(openId, text) {
  try {
    const res = await fetch('/api/feishu/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ openId, text })
    });
    const json = await res.json();
    return json.ok;
  } catch (e) { return false; }
}

export function resetData() {
  const defaults = getDefaultData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  return defaults;
}

function getDefaultData() {
  return {
    annualGoals: [
      { id: 'g1', name: '会计考证', target: '2026-05-16', progress: 0, category: 'A', priority: 'P0', phase: 1 },
      { id: 'g2', name: '英语雅思', target: '2026-12-31', progress: 0, category: 'A', priority: 'P1', phase: 1 },
      { id: 'g3', name: '学写作', target: '2026-12-31', progress: 0, category: 'A', priority: 'P1', phase: 2 },
      { id: 'g4', name: '学PS', target: '2027-03-31', progress: 0, category: 'A', priority: 'P2', phase: 3 },
      { id: 'g5', name: '学剪辑', target: '2027-03-31', progress: 0, category: 'A', priority: 'P2', phase: 3 },
      { id: 'g6', name: '小红书运营', target: '2026-12-31', progress: 0, category: 'B', priority: 'P1', phase: 1 },
      { id: 'g7', name: '抖音运营', target: '2026-12-31', progress: 0, category: 'B', priority: 'P1', phase: 2 },
      { id: 'g8', name: '哔哩哔哩', target: '2027-03-31', progress: 0, category: 'B', priority: 'P2', phase: 3 },
      { id: 'g9', name: '播客', target: '2027-05-31', progress: 0, category: 'B', priority: 'P2', phase: 4 },
      { id: 'g10', name: '规律作息', target: '2026-10-31', progress: 0, category: 'C', priority: 'P0', phase: 1 },
      { id: 'g11', name: '健身', target: '2026-12-31', progress: 0, category: 'C', priority: 'P1', phase: 1 },
      { id: 'g12', name: '尽量不点外卖', target: '2026-12-31', progress: 0, category: 'C', priority: 'P1', phase: 1 },
      { id: 'g13', name: '读书', target: '2026-12-31', progress: 0, category: 'D', priority: 'P1', phase: 1 },
      { id: 'g14', name: '阅读观影+写观后感', target: '2027-03-31', progress: 0, category: 'D', priority: 'P2', phase: 3 },
      { id: 'g15', name: '练字', target: '2026-12-31', progress: 0, category: 'D', priority: 'P2', phase: 2 },
      { id: 'g16', name: '日复盘', target: '2027-05-31', progress: 0, category: 'E', priority: 'P0', phase: 1 },
      { id: 'g17', name: '周复盘+月复盘', target: '2027-05-31', progress: 0, category: 'E', priority: 'P0', phase: 1 }
    ],
    plans: {
      monthly: JSON.parse(JSON.stringify(MONTHLY_TEMPLATE)),
      weekly: JSON.parse(JSON.stringify(WEEKLY_TEMPLATE)),
      daily: []
    },
    habits: [...HABIT_LIST],
    habitData: {},
    learning: {
      english:    { progress: 0, logs: [], totalMinutes: 0, resourceMarks: {}, customResources: [], bilibiliCourses: [], studyCheckins: [], schedules: [], errorBook: [] },
      accounting: { progress: 0, logs: [], totalMinutes: 0, resourceMarks: {}, customResources: [], bilibiliCourses: [], studyCheckins: [], schedules: [], errorBook: [] },
      writing:    { progress: 0, logs: [], totalMinutes: 0, resourceMarks: {}, customResources: [], bilibiliCourses: [], studyCheckins: [], schedules: [], errorBook: [] },
      editing:    { progress: 0, logs: [], totalMinutes: 0, resourceMarks: {}, customResources: [], bilibiliCourses: [], studyCheckins: [], schedules: [], errorBook: [] },
      photoshop:  { progress: 0, logs: [], totalMinutes: 0, resourceMarks: {}, customResources: [], bilibiliCourses: [], studyCheckins: [], schedules: [], errorBook: [] },
      calligraphy:{ progress: 0, logs: [], totalMinutes: 0, resourceMarks: {}, customResources: [], bilibiliCourses: [], studyCheckins: [], schedules: [], errorBook: [] }
    },
    content: {
      xiaohongshu: { followers: 0, posts: [], importedData: null },
      douyin:      { followers: 0, posts: [], importedData: null },
      podcast:      { episodes: [], importedData: null },
      bilibili:     { followers: 0, posts: [], importedData: null },
      creations: []
    },
    health: {
      weightLog: [],
      sleepLog: [],
      takeoutLog: []
    },
    reading: {
      current: [],
      finished: [],
      monthlyMinutes: 0
    },
    review: {
      daily: [],
      weekly: [],
      monthly: []
    },
    automation: {
      autoDaily: true,
      reminderTimes: { wakeUp: '06:30', review: '20:00', sleep: '22:00' },
      autoReview: true,
      autoWeeklyReport: true,
      autoMonthlyReport: true,
      lastDailyGenDate: '',
      lastWeeklyReport: null,
      lastMonthlyReport: null
    },
    settings: {
      theme: 'light',
      feishu: {
        appId: '',
        appSecret: '',
        botOpenId: '',
        enabled: false
      }
    }
  };
}
