import { createServer } from 'http';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, extname } from 'path';

const PORT = process.env.PORT || 8080;
const ROOT = import.meta.dirname || process.cwd();
const DATA_FILE = join(ROOT, 'data.json');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.svg':'image/svg+xml' };

let feishuConfig = {
  appId: process.env.FEISHU_APP_ID || '',
  appSecret: process.env.FEISHU_APP_SECRET || '',
  botOpenId: process.env.FEISHU_BOT_OPEN_ID || ''
};
let cachedToken = null;
let tokenExpire = 0;
const _serverShownReminders = {};

function loadData() {
  if (existsSync(DATA_FILE)) {
    try { return JSON.parse(readFileSync(DATA_FILE, 'utf-8')); } catch (e) {}
  }
  return null;
}

function saveData(data) {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

async function getFeishuToken() {
  if (!feishuConfig.appId || !feishuConfig.appSecret) return null;
  if (cachedToken && Date.now() < tokenExpire) return cachedToken;
  try {
    const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: feishuConfig.appId, app_secret: feishuConfig.appSecret })
    });
    const json = await res.json();
    if (json.code === 0) {
      cachedToken = json.tenant_access_token;
      tokenExpire = Date.now() + (json.expire - 60) * 1000;
      return cachedToken;
    }
  } catch (e) {}
  return null;
}

async function sendFeishuMessage(openId, text) {
  const token = await getFeishuToken();
  if (!token) return false;
  try {
    const res = await fetch('https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ receive_id: openId, msg_type: 'text', content: JSON.stringify({ text }) })
    });
    const json = await res.json();
    return json.code === 0;
  } catch (e) { return false; }
}

function parseMessage(text) {
  const t = text.trim();
  if (t === '帮助' || t === 'help' || t === '?') return { cmd: 'help' };
  if (t === '待办' || t === '今日待办' || t === 'todo') return { cmd: 'list_todos' };
  if (t === '打卡' || t === '习惯') return { cmd: 'list_habits' };
  if (t === '今日' || t === '总结' || t === 'summary') return { cmd: 'summary' };

  let m;
  if (m = t.match(/^完成\s+(.+)/)) return { cmd: 'done_todo', keyword: m[1].trim() };
  if (m = t.match(/^打卡\s+(.+)/)) return { cmd: 'done_habit', keyword: m[1].trim() };
  if (m = t.match(/^进度\s+(\d+)/)) return { cmd: 'set_progress', value: parseInt(m[1]) };
  if (m = t.match(/^取消完成\s+(.+)/)) return { cmd: 'undo_todo', keyword: m[1].trim() };
  if (m = t.match(/^取消打卡\s+(.+)/)) return { cmd: 'undo_habit', keyword: m[1].trim() };

  return { cmd: 'unknown', text: t };
}

function handleCommand(cmd, data) {
  const today = new Date().toISOString().split('T')[0];
  switch (cmd.cmd) {
    case 'help':
      return '可用指令：\n待办 — 查看今日待办\n打卡 — 查看未打卡习惯\n完成 [关键词] — 勾选待办\n打卡 [关键词] — 打卡习惯\n进度 [数字] — 更新当前目标进度\n取消完成 [关键词] — 取消勾选\n取消打卡 [关键词] — 取消打卡\n今日 — 今日总结';

    case 'list_todos': {
      const todos = data.todos.filter(t => t.date === today);
      if (todos.length === 0) return '今日暂无待办';
      const pending = todos.filter(t => !t.done);
      const done = todos.filter(t => t.done);
      let msg = `今日待办（${done.length}/${todos.length}）：\n`;
      pending.forEach((t, i) => { msg += `\n${i+1}. ⬜ ${t.text}`; });
      done.forEach((t, i) => { msg += `\n   ✅ ${t.text}`; });
      return msg;
    }

    case 'list_habits': {
      const habits = data.habitData || {};
      const habitList = ['22:30前入睡','6:30起床','健身/运动30min','不点外卖','英语学习1h','会计备考2h+','读书30min','小红书/抖音内容产出','练字20min','日复盘完成','自己做饭'];
      const unchecked = habitList.filter(h => !habits[h] || !habits[h][today]);
      const checked = habitList.filter(h => habits[h] && habits[h][today]);
      if (unchecked.length === 0) return `全部 ${habitList.length} 项习惯已打卡！`;
      let msg = `未打卡（${unchecked.length}项）：\n`;
      unchecked.forEach((h, i) => { msg += `\n${i+1}. ⬜ ${h}`; });
      if (checked.length > 0) msg += `\n\n已打卡 ${checked.length} 项`;
      return msg;
    }

    case 'done_todo': {
      const todos = data.todos.filter(t => t.date === today);
      const match = todos.find(t => !t.done && t.text.includes(cmd.keyword));
      if (match) {
        match.done = true;
        return `✅ 已完成：${match.text}`;
      }
      const doneMatch = todos.find(t => t.done && t.text.includes(cmd.keyword));
      if (doneMatch) return `该项已完成：${doneMatch.text}`;
      return `未找到包含「${cmd.keyword}」的待办，发送「待办」查看列表`;
    }

    case 'done_habit': {
      const habitList = ['22:30前入睡','6:30起床','健身/运动30min','不点外卖','英语学习1h','会计备考2h+','读书30min','小红书/抖音内容产出','练字20min','日复盘完成','自己做饭'];
      const match = habitList.find(h => h.includes(cmd.keyword) || cmd.keyword.includes(h.split('/')[0]));
      if (match) {
        if (!data.habitData) data.habitData = {};
        if (!data.habitData[match]) data.habitData[match] = {};
        data.habitData[match][today] = true;
        return `✅ 已打卡：${match}`;
      }
      return `未找到包含「${cmd.keyword}」的习惯，发送「打卡」查看列表`;
    }

    case 'undo_todo': {
      const todos = data.todos.filter(t => t.date === today);
      const match = todos.find(t => t.done && t.text.includes(cmd.keyword));
      if (match) {
        match.done = false;
        return `↩️ 已取消：${match.text}`;
      }
      return `未找到已完成的「${cmd.keyword}」`;
    }

    case 'undo_habit': {
      const habitList = ['22:30前入睡','6:30起床','健身/运动30min','不点外卖','英语学习1h','会计备考2h+','读书30min','小红书/抖音内容产出','练字20min','日复盘完成','自己做饭'];
      const match = habitList.find(h => h.includes(cmd.keyword) || cmd.keyword.includes(h.split('/')[0]));
      if (match && data.habitData && data.habitData[match]) {
        data.habitData[match][today] = false;
        return `↩️ 已取消打卡：${match}`;
      }
      return `未找到已打卡的「${cmd.keyword}」`;
    }

    case 'set_progress': {
      const goals = (data.goals || []).filter(g => g.priority === 'P0');
      if (goals.length === 0) {
        const all = data.goals || [];
        if (all.length > 0) {
          all[0].progress = cmd.value;
          return `📊 已更新「${all[0].name}」进度为 ${cmd.value}%`;
        }
        return '暂无目标可更新';
      }
      goals[0].progress = cmd.value;
      return `📊 已更新「${goals[0].name}」进度为 ${cmd.value}%`;
    }

    case 'summary': {
      const todos = data.todos.filter(t => t.date === today);
      const done = todos.filter(t => t.done);
      const habitList = ['22:30前入睡','6:30起床','健身/运动30min','不点外卖','英语学习1h','会计备考2h+','读书30min','小红书/抖音内容产出','练字20min','日复盘完成','自己做饭'];
      const habits = data.habitData || {};
      const habitDone = habitList.filter(h => habits[h] && habits[h][today]).length;
      let msg = `📊 今日总结\n待办：${done.length}/${todos.length}\n习惯：${habitDone}/${habitList.length}`;
      const todayReview = (data.review?.daily || []).find(r => r.date === today);
      msg += `\n复盘：${todayReview && todayReview.answers?.some(a => a?.trim()) ? '已完成' : '未完成'}`;
      return msg;
    }

    default:
      return `未识别指令「${cmd.text}」，发送「帮助」查看可用指令`;
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
    return res.end();
  }

  if (path === '/api/data' && req.method === 'GET') {
    const data = loadData();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify(data || {}));
  }

  if (path === '/api/data' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        saveData(data);
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (path === '/api/feishu/config' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        feishuConfig = JSON.parse(body);
        cachedToken = null;
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
  }

  if (path === '/api/feishu/send' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const { openId, text } = JSON.parse(body);
        const ok = await sendFeishuMessage(openId, text);
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (path === '/webhook/feishu' && (req.method === 'POST' || req.method === 'GET')) {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      try {
        const event = JSON.parse(body);

        if (event.type === 'url_verification' || event.challenge) {
          return res.end(JSON.stringify({ challenge: event.challenge }));
        }

        if (event.header && event.header.event_type === 'im.message.receive_v1') {
          const msgContent = JSON.parse(event.event.message.content);
          const text = msgContent.text || '';
          const senderOpenId = event.event.sender.sender_id.open_id;

          const data = loadData();
          if (!data) return res.end(JSON.stringify({ ok: true }));

          const cmd = parseMessage(text);
          const reply = handleCommand(cmd, data);

          if (cmd.cmd !== 'help' && cmd.cmd !== 'unknown' && cmd.cmd !== 'list_todos' && cmd.cmd !== 'list_habits' && cmd.cmd !== 'summary') {
            saveData(data);
          }

          if (feishuConfig.botOpenId && senderOpenId) {
            await sendFeishuMessage(senderOpenId, reply);
          }

          return res.end(JSON.stringify({ ok: true }));
        }

        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  let filePath = join(ROOT, path === '/' ? 'index.html' : path);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); return res.end('Forbidden');
  }
  const ext = extname(filePath);
  try {
    const content = readFileSync(filePath);
    const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream' };
    if (ext === '.js' || ext === '.css' || ext === '.json') {
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    }
    res.writeHead(200, headers);
    res.end(content);
  } catch (e) {
    res.writeHead(404); res.end('Not found');
  }
});

const HABIT_LIST = ['22:30前入睡','6:30起床','健身/运动30min','不点外卖','英语学习1h','会计备考2h+','读书30min','小红书/抖音内容产出','练字20min','日复盘完成','自己做饭'];

async function checkServerReminders() {
  if (!feishuConfig.appId || !feishuConfig.appSecret || !feishuConfig.botOpenId) return;

  const data = loadData();
  if (!data || !data.automation) return;

  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const currentTime = `${hh}:${mm}`;
  const today = now.toISOString().split('T')[0];
  const day = now.getDay();

  const hasDailyReview = data.review && data.review.daily &&
    data.review.daily.some(r => r.date === today && r.answers && r.answers.some(a => a && a.trim()));

  if (currentTime >= '20:00' && currentTime < '22:30' && !hasDailyReview && data.automation.autoReview) {
    const key = 'daily_' + today;
    if (!_serverShownReminders[key]) {
      _serverShownReminders[key] = true;
      await sendFeishuMessage(feishuConfig.botOpenId, '该写日复盘了\n点击复盘中心，用 5 个问题回顾今天\n发送「待办」查看今日完成情况');
    }
  }

  if (currentTime >= '22:00' && currentTime < '23:59') {
    let unchecked = 0;
    HABIT_LIST.forEach(name => {
      const hd = data.habitData && data.habitData[name];
      if (!hd || !hd[today]) unchecked++;
    });
    if (unchecked > 0) {
      const key = 'habit_' + today;
      if (!_serverShownReminders[key]) {
        _serverShownReminders[key] = true;
        await sendFeishuMessage(feishuConfig.botOpenId, `习惯打卡提醒\n还有 ${unchecked} 项习惯未打卡，快去完成吧\n发送「打卡」查看未打卡列表`);
      }
    }
  }

  if (day === 0 && currentTime >= '20:00' && currentTime < '22:30') {
    const ws = new Date(now);
    const diff = ws.getDate() - ws.getDay() + (ws.getDay() === 0 ? -6 : 1);
    ws.setDate(diff);
    const weekStart = ws.toISOString().split('T')[0];
    const hasWeeklyReview = data.review && data.review.weekly &&
      data.review.weekly.some(r => r.weekStart === weekStart && r.answers && r.answers.some(a => a && a.trim()));
    if (!hasWeeklyReview) {
      const key = 'weekly_' + weekStart;
      if (!_serverShownReminders[key]) {
        _serverShownReminders[key] = true;
        await sendFeishuMessage(feishuConfig.botOpenId, '该写周复盘了\n周日是总结一周的好时机，6 个问题帮你复盘');
      }
    }
  }

  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  if (now.getDate() === lastDay && currentTime >= '20:00' && currentTime < '22:30') {
    const mKey = now.toISOString().slice(0, 7);
    const key = 'monthly_' + mKey;
    if (!_serverShownReminders[key]) {
      _serverShownReminders[key] = true;
      await sendFeishuMessage(feishuConfig.botOpenId, '该写月复盘了\n月末总结，规划下月目标');
    }
  }
}

server.listen(PORT, () => {
  console.log(`成长工作台运行中：http://localhost:${PORT}`);
  console.log(`飞书回调地址：${process.env.RENDER_EXTERNAL_URL || 'http://localhost:' + PORT}/webhook/feishu`);
  if (feishuConfig.appId) {
    console.log('飞书提醒已启用，服务端定时检查每分钟运行');
    setInterval(checkServerReminders, 60000);
  } else {
    console.log('飞书未配置，请在设置页面填写或设置环境变量 FEISHU_APP_ID / FEISHU_APP_SECRET / FEISHU_BOT_OPEN_ID');
  }
});
