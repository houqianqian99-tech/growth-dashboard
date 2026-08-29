import { HABIT_LIST, TIME_BLOCKS, MONTHLY_TEMPLATE, WEEKLY_TEMPLATE } from '../utils/frameworks.js';

const STORAGE_KEY = 'growth_dashboard_data';
let _backendAvailable = null;

export function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const data = JSON.parse(raw);
      return migrateData(data);
    } catch (e) {
      console.warn('数据解析失败，使用默认数据');
    }
  }
  return getDefaultData();
}

function migrateData(data) {
  if (!data.annualGoals) return data;
  data.annualGoals.forEach(g => {
    if (g.name === '学写作') g.name = '写作系统';
  });
  const defaults = getDefaultData();
  const defaultMap = {};
  defaults.annualGoals.forEach(g => { defaultMap[g.name] = g; });
  data.annualGoals.forEach(g => {
    const d = defaultMap[g.name];
    if (d) {
      if (g.targetDesc === undefined || g.targetDesc === '') g.targetDesc = d.targetDesc;
      if (g.currentStatus === undefined || g.currentStatus === '未开始' || g.currentStatus === '0粉/0篇' || g.currentStatus === '0粉/0条' || g.currentStatus === '0粉/0个') g.currentStatus = d.currentStatus;
      if (g.name === '小红书运营') { g.targetDesc = d.targetDesc; g.currentStatus = d.currentStatus; g.target = d.target; g.priority = d.priority; }
      if (g.name === '抖音运营') { g.targetDesc = d.targetDesc; g.currentStatus = d.currentStatus; g.progress = d.progress; }
      if (g.name === '播客') { g.targetDesc = d.targetDesc; g.target = d.target; g.priority = d.priority; }
      if (g.name === '健身') { g.targetDesc = d.targetDesc; }
    }
  });
  return data;
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
      { id: 'g1', name: '会计考证', target: '2026-05-16', progress: 0, category: 'A', priority: 'P0', phase: 1, targetDesc: '初级会计双科≥60分及格', currentStatus: '未开始备考' },
      { id: 'g2', name: '英语雅思', target: '2026-12-31', progress: 0, category: 'A', priority: 'P1', phase: 1, targetDesc: '总分6.5+（冲7.0），小分≥6.0', currentStatus: '未模考' },
      { id: 'g3', name: '写作系统', target: '2026-12-31', progress: 0, category: 'A', priority: 'P1', phase: 2, targetDesc: '每日练笔+建立素材库，能独立写爆款文案', currentStatus: '未开始' },
      { id: 'g4', name: '学PS', target: '2027-03-31', progress: 0, category: 'A', priority: 'P2', phase: 3, targetDesc: '掌握基础修图+海报设计', currentStatus: '未开始' },
      { id: 'g5', name: '学剪辑', target: '2027-03-31', progress: 0, category: 'A', priority: 'P2', phase: 3, targetDesc: '能独立剪出Vlog和短视频', currentStatus: '未开始' },
      { id: 'g6', name: '小红书运营', target: '2026-09-28', progress: 0, category: 'B', priority: 'P0', phase: 1, targetDesc: '1个月内1000粉+，每月8篇笔记', currentStatus: '未开始搭建，0粉' },
      { id: 'g7', name: '抖音运营', target: '2026-12-31', progress: 5, category: 'B', priority: 'P1', phase: 2, targetDesc: '1000粉+，每月12条视频', currentStatus: '580粉' },
      { id: 'g8', name: '哔哩哔哩', target: '2027-03-31', progress: 0, category: 'B', priority: 'P2', phase: 3, targetDesc: '500粉+，每月4个视频', currentStatus: '0粉' },
      { id: 'g9', name: '播客', target: '2026-12-31', progress: 0, category: 'B', priority: 'P1', phase: 4, targetDesc: '12月31日前发16期，每周更新', currentStatus: '0期' },
      { id: 'g10', name: '规律作息', target: '2026-10-31', progress: 0, category: 'C', priority: 'P0', phase: 1, targetDesc: '连续30天 7:00前起/23:00前睡', currentStatus: '0天连续' },
      { id: 'g11', name: '健身', target: '2026-12-31', progress: 0, category: 'C', priority: 'P1', phase: 1, targetDesc: '每周6次，体重50kg', currentStatus: '0次/周' },
      { id: 'g12', name: '尽量不点外卖', target: '2026-12-31', progress: 0, category: 'C', priority: 'P1', phase: 1, targetDesc: '每周≤2次外卖', currentStatus: '每周7次' },
      { id: 'g13', name: '读书', target: '2026-12-31', progress: 0, category: 'D', priority: 'P1', phase: 1, targetDesc: '每月2本，全年24本', currentStatus: '0本' },
      { id: 'g14', name: '阅读观影+写观后感', target: '2027-03-31', progress: 0, category: 'D', priority: 'P2', phase: 3, targetDesc: '每月1篇观后感，共6篇', currentStatus: '0篇' },
      { id: 'g15', name: '练字', target: '2026-12-31', progress: 0, category: 'D', priority: 'P2', phase: 2, targetDesc: '每天15分钟，练出整洁字迹', currentStatus: '0天' },
      { id: 'g16', name: '日复盘', target: '2027-05-31', progress: 0, category: 'E', priority: 'P0', phase: 1, targetDesc: '连续30天每天写复盘', currentStatus: '0天连续' },
      { id: 'g17', name: '周复盘+月复盘', target: '2027-05-31', progress: 0, category: 'E', priority: 'P0', phase: 1, targetDesc: '每周1篇+每月1篇，共40篇', currentStatus: '0篇' }
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
      autoWeekly: true,
      autoMonthly: true,
      reminderTimes: { wakeUp: '06:30', review: '20:00', sleep: '22:00' },
      autoReview: true,
      autoWeeklyReport: true,
      autoMonthlyReport: true,
      lastDailyGenDate: '',
      lastWeeklyGenWeek: '',
      lastMonthlyGenMonth: '',
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
