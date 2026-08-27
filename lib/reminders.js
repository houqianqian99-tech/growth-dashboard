import { loadFeishuConfig, loadData } from './storage.js';
import { sendFeishuMessage } from './feishu.js';

const HABIT_LIST = ['22:30前入睡','6:30起床','健身/运动30min','不点外卖','英语学习1h','会计备考2h+','读书30min','小红书/抖音内容产出','练字20min','日复盘完成','自己做饭'];
const _shownReminders = {};

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function weekStartStr() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  now.setDate(diff);
  return now.toISOString().split('T')[0];
}

export async function checkReminders() {
  const config = await loadFeishuConfig();
  if (!config.appId || !config.botOpenId) return { sent: false, reason: 'no_config' };

  const data = await loadData();
  if (!data || !data.automation) return { sent: false, reason: 'no_data' };

  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const currentTime = `${hh}:${mm}`;
  const today = todayStr();
  const day = now.getDay();
  let sent = false;

  const hasDailyReview = data.review?.daily?.some(r => r.date === today && r.answers?.some(a => a?.trim()));

  if (currentTime >= '20:00' && currentTime < '22:30' && !hasDailyReview && data.automation.autoReview) {
    const key = 'daily_' + today;
    if (!_shownReminders[key]) {
      _shownReminders[key] = true;
      await sendFeishuMessage(config.botOpenId, '该写日复盘了\n用 5 个问题回顾今天\n发送「待办」查看今日完成情况');
      sent = true;
    }
  }

  if (currentTime >= '22:00' && currentTime < '23:59') {
    let unchecked = 0;
    HABIT_LIST.forEach(name => {
      const hd = data.habitData?.[name];
      if (!hd || !hd[today]) unchecked++;
    });
    if (unchecked > 0) {
      const key = 'habit_' + today;
      if (!_shownReminders[key]) {
        _shownReminders[key] = true;
        await sendFeishuMessage(config.botOpenId, `习惯打卡提醒\n还有 ${unchecked} 项习惯未打卡\n发送「打卡」查看未打卡列表`);
        sent = true;
      }
    }
  }

  if (day === 0 && currentTime >= '20:00' && currentTime < '22:30') {
    const ws = weekStartStr();
    const hasWeeklyReview = data.review?.weekly?.some(r => r.weekStart === ws && r.answers?.some(a => a?.trim()));
    if (!hasWeeklyReview) {
      const key = 'weekly_' + ws;
      if (!_shownReminders[key]) {
        _shownReminders[key] = true;
        await sendFeishuMessage(config.botOpenId, '该写周复盘了\n6 个问题帮你总结一周');
        sent = true;
      }
    }
  }

  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  if (now.getDate() === lastDay && currentTime >= '20:00' && currentTime < '22:30') {
    const mKey = now.toISOString().slice(0, 7);
    const key = 'monthly_' + mKey;
    if (!_shownReminders[key]) {
      _shownReminders[key] = true;
      await sendFeishuMessage(config.botOpenId, '该写月复盘了\n月末总结，规划下月目标');
      sent = true;
    }
  }

  return { sent, time: currentTime };
}
