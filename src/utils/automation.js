import { todayStr, dateStr, weekStart, monthStr, toast, uid } from './helpers.js';
import { TIME_BLOCKS, LEARNING_SUBJECTS, HABIT_LIST } from './frameworks.js';
import { getErrorBookAnalysis, getLearningSuggestions, getScheduleSuggestions, generateReview as aiGenerateReview } from './ai.js';

const _shownReminders = {};

function sendNotification(title, body) {
  toast(title + (body ? '：' + body : ''), '');
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body: body || '',
        icon: '/manifest.json',
        tag: title,
        requireInteraction: false
      });
    } catch (e) {}
  }
  playAlertSound();
  sendFeishuIfEnabled(title, body);
}

function sendFeishuIfEnabled(title, body) {
  try {
    const data = JSON.parse(localStorage.getItem('growth_dashboard_data') || '{}');
    const fs = data.settings?.feishu;
    if (fs && fs.enabled && fs.botOpenId) {
      fetch('/api/feishu/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openId: fs.botOpenId, text: title + (body ? '\n' + body : '') })
      }).catch(() => {});
    }
  } catch (e) {}
}

function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {}
}

export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

export function generateDailyTodos(data) {
  const today = todayStr();
  if (data.automation.lastDailyGenDate === today) return data;

  const todos = [];

  TIME_BLOCKS.forEach(block => {
    todos.push({
      id: uid('todo'),
      text: block.activity,
      tag: block.tag,
      done: false,
      timeBlock: block.time
    });
  });

  const subjectTimeMap = {
    english: '08:00-09:00',
    accounting: '09:00-12:00',
    writing: '13:30-15:00',
    editing: '13:30-15:00',
    photoshop: '13:30-15:00',
    calligraphy: '13:30-15:00'
  };

  Object.keys(LEARNING_SUBJECTS).forEach(subject => {
    const sub = data.learning[subject];
    if (!sub || !sub.schedules) return;
    sub.schedules.forEach(s => {
      if (s.date === today && !s.completed) {
        todos.push({
          id: uid('todo'),
          text: `${LEARNING_SUBJECTS[subject].name}：${s.title || s.content || '学习任务'}`,
          tag: 'l',
          done: false,
          timeBlock: subjectTimeMap[subject] || '13:30-15:00'
        });
      }
    });
  });

  Object.keys(LEARNING_SUBJECTS).forEach(subject => {
    const sub = data.learning[subject];
    if (!sub || !sub.errorBook) return;
    sub.errorBook.forEach(err => {
      if (err.nextReviewDate && err.nextReviewDate <= today && !err.mastered) {
        const preview = (err.question || err.title || '').slice(0, 20);
        todos.push({
          id: uid('todo'),
          text: `复习错题：${preview}`,
          tag: 'l',
          done: false,
          timeBlock: '20:30-22:00'
        });
      }
    });
  });

  data.plans.daily = todos;
  data.automation.lastDailyGenDate = today;
  return data;
}

export function checkReminders(data) {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const currentTime = `${hh}:${mm}`;
  const today = todayStr();
  const reminderKey = today;

  const hasDailyReview = data.review && data.review.daily &&
    data.review.daily.some(r => r.date === today && r.answers && r.answers.some(a => a && a.trim()));

  if (currentTime >= '20:00' && currentTime < '22:30' && !hasDailyReview && data.automation.autoReview) {
    if (!_shownReminders['daily_' + reminderKey]) {
      _shownReminders['daily_' + reminderKey] = true;
      sendNotification('该写日复盘了', '点击复盘中心，用 5 个问题回顾今天');
    }
  }

  if (currentTime >= '22:00' && currentTime < '23:59') {
    let unchecked = 0;
    HABIT_LIST.forEach(name => {
      const hd = data.habitData && data.habitData[name];
      if (!hd || !hd[today]) unchecked++;
    });
    if (unchecked > 0 && !_shownReminders['habit_' + reminderKey]) {
      _shownReminders['habit_' + reminderKey] = true;
      sendNotification('习惯打卡提醒', `还有 ${unchecked} 项习惯未打卡，快去完成吧`);
    }
  }

  if (now.getDay() === 0 && currentTime >= '20:00' && currentTime < '22:30') {
    const ws = dateStr(weekStart(now));
    const hasWeeklyReview = data.review && data.review.weekly &&
      data.review.weekly.some(r => r.weekStart === ws && r.answers && r.answers.some(a => a && a.trim()));
    if (!hasWeeklyReview && !_shownReminders['weekly_' + ws]) {
      _shownReminders['weekly_' + ws] = true;
      sendNotification('该写周复盘了', '周日是总结一周的好时机，6 个问题帮你复盘');
    }
  }

  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  if (now.getDate() === lastDay && currentTime >= '20:00' && currentTime < '22:30') {
    if (!_shownReminders['monthly_' + monthStr()]) {
      _shownReminders['monthly_' + monthStr()] = true;
      sendNotification('该写月复盘了', '月末总结，规划下月目标');
    }
  }
}

export function generateWeeklyReport(data) {
  const ws = weekStart();
  const wsStr = dateStr(ws);
  const weStr = dateStr(new Date(ws.getTime() + 6 * 86400000));

  const weekTodos = (data.plans.daily || []).filter(t => {
    return true;
  });
  const doneCount = weekTodos.filter(t => t.done).length;
  const completion = weekTodos.length > 0 ? Math.round(doneCount / weekTodos.length * 100) : 0;

  let habitDays = 0;
  HABIT_LIST.forEach(name => {
    const hd = data.habitData && data.habitData[name];
    if (!hd) return;
    for (let i = 0; i < 7; i++) {
      const d = new Date(ws.getTime() + i * 86400000);
      const ds = dateStr(d);
      if (hd[ds]) { habitDays++; break; }
    }
  });

  let learningMinutes = 0;
  Object.keys(LEARNING_SUBJECTS).forEach(subject => {
    const sub = data.learning[subject];
    if (!sub || !sub.studyCheckins) return;
    sub.studyCheckins.forEach(c => {
      if (c.date >= wsStr && c.date <= weStr) {
        learningMinutes += (c.minutes || 0);
      }
    });
  });

  let contentPosts = 0;
  if (data.content) {
    Object.keys(data.content).forEach(platform => {
      const plat = data.content[platform];
      if (!plat || !plat.posts) return;
      plat.posts.forEach(p => {
        if (p.date >= wsStr && p.date <= weStr) contentPosts++;
      });
    });
  }

  let weightChange = 0;
  if (data.health && data.health.weightLog && data.health.weightLog.length > 0) {
    const weekWeights = data.health.weightLog
      .filter(w => w.date >= wsStr && w.date <= weStr)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (weekWeights.length >= 2) {
      weightChange = (weekWeights[weekWeights.length - 1].weight - weekWeights[0].weight).toFixed(1);
    }
  }

  let suggestions = '';
  try {
    const subAnalysis = Object.keys(LEARNING_SUBJECTS).map(s => {
      const analysis = getErrorBookAnalysis((data.learning[s] && data.learning[s].errorBook) || []);
      return `${LEARNING_SUBJECTS[s].name}：${analysis.suggestion}`;
    });
    const learnSuggest = getLearningSuggestions('english');
    const learnTip = learnSuggest.length > 0 ? `建议：${learnSuggest[0].label}——${learnSuggest[0].detail}` : '';
    suggestions = [
      `本周任务完成率${completion}%`,
      `习惯打卡${habitDays}天`,
      `学习时长${Math.round(learningMinutes / 60 * 10) / 10}h`,
      ...subAnalysis,
      learnTip
    ].filter(Boolean).join('；');
  } catch (e) {
    suggestions = `本周任务完成率${completion}%，习惯打卡${habitDays}天`;
  }

  return {
    weekStart: wsStr,
    completion,
    habitDays,
    learningHours: Math.round(learningMinutes / 60 * 10) / 10,
    contentPosts,
    weightChange: Number(weightChange),
    suggestions
  };
}

export function generateMonthlyReport(data) {
  const month = monthStr();
  const monthPrefix = month + '-';

  let goalCompletion = 0;
  if (data.annualGoals && data.annualGoals.length > 0) {
    const completed = data.annualGoals.filter(g => g.progress >= 100).length;
    goalCompletion = Math.round(completed / data.annualGoals.length * 100);
  }

  const keyMetrics = { books: 0, posts: 0, fitness: 0, review: 0 };

  if (data.reading && data.reading.finished) {
    keyMetrics.books = data.reading.finished.filter(b => b.date && b.date.startsWith(month)).length;
  }

  if (data.content) {
    Object.keys(data.content).forEach(platform => {
      const plat = data.content[platform];
      if (!plat || !plat.posts) return;
      keyMetrics.posts += plat.posts.filter(p => p.date && p.date.startsWith(month)).length;
    });
  }

  if (data.habitData) {
    let fitnessDays = 0;
    const fitnessHabit = data.habitData['健身/运动30min'];
    if (fitnessHabit) {
      Object.keys(fitnessHabit).forEach(d => {
        if (d.startsWith(monthPrefix) && fitnessHabit[d]) fitnessDays++;
      });
    }
    keyMetrics.fitness = fitnessDays;
  }

  if (data.review && data.review.daily) {
    keyMetrics.review = data.review.daily.filter(r => r.date && r.date.startsWith(monthPrefix)).length;
  }

  let learningMinutes = 0;
  Object.keys(LEARNING_SUBJECTS).forEach(subject => {
    const sub = data.learning[subject];
    if (!sub || !sub.studyCheckins) return;
    sub.studyCheckins.forEach(c => {
      if (c.date && c.date.startsWith(monthPrefix)) {
        learningMinutes += (c.minutes || 0);
      }
    });
  });

  let suggestions = '';
  try {
    const scheduleSuggest = getScheduleSuggestions(data, 'accounting');
    suggestions = `本月目标完成率${goalCompletion}%，学习时长${Math.round(learningMinutes / 60 * 10) / 10}h，读书${keyMetrics.books}本，内容产出${keyMetrics.posts}篇，健身${keyMetrics.fitness}天，复盘${keyMetrics.review}天；${scheduleSuggest}`;
  } catch (e) {
    suggestions = `本月目标完成率${goalCompletion}%，学习时长${Math.round(learningMinutes / 60 * 10) / 10}h`;
  }

  return {
    month,
    goalCompletion,
    keyMetrics,
    learningHours: Math.round(learningMinutes / 60 * 10) / 10,
    suggestions
  };
}

export function generateReview(data) {
  return aiGenerateReview(data);
}
