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

function getDayOfYear(d) {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / 86400000);
}

function buildMorningMessage(data) {
  const now = new Date();
  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const dayOfWeek = now.getDay();
  const dayName = dayNames[dayOfWeek];
  const month = now.getMonth() + 1;
  const date = now.getDate();
  const quote = QUOTES[getDayOfYear(now) % QUOTES.length];
  const weekdayKey = dayName;

  const weekly = data?.plans?.weekly;
  const daily = data?.plans?.daily || [];
  const todos = daily.filter(t => !t.done);

  let daySchedule = '';
  if (weekly?.schedule && weekly.schedule[weekdayKey]) {
    const s = weekly.schedule[weekdayKey];
    const dims = [
      { key: 'A', label: '💼 硬技能' },
      { key: 'B', label: '🎨 运营' },
      { key: 'C', label: '💪 健康' },
      { key: 'D', label: '📖 素养' },
      { key: 'E', label: '🔄 系统' }
    ];
    const items = [];
    dims.forEach(dim => {
      if (s[dim.key] && s[dim.key].trim()) {
        items.push(`${dim.label}：${s[dim.key]}`);
      }
    });
    if (items.length > 0) daySchedule = items.join('\n');
  }

  let msg = `☀️ 早上好！${month}月${date}日 ${dayName}\n\n${quote}\n\n`;
  msg += '📅 今日安排：\n';
  if (daySchedule) {
    msg += daySchedule + '\n';
  } else {
    msg += '（打开工作台安排今天的任务吧）\n';
  }

  if (todos.length > 0) {
    msg += '\n✅ 今日待办：\n';
    todos.slice(0, 6).forEach((t, i) => {
      msg += `   ${i + 1}. ${t.text}\n`;
    });
    if (todos.length > 6) msg += `   ...还有 ${todos.length - 6} 项\n`;
  }

  if (weekly?.mustDo && weekly.mustDo.filter(Boolean).length > 0) {
    msg += '\n🎯 本周 Must-Do：\n';
    weekly.mustDo.filter(Boolean).forEach((t, i) => {
      msg += `   ${i + 1}. ${t}\n`;
    });
  }

  return msg;
}

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

  if (currentTime >= '07:00' && currentTime < '07:30' && data.automation.autoDaily) {
    const key = 'morning_' + today;
    if (!_serverShownReminders[key]) {
      _serverShownReminders[key] = true;
      const text = buildMorningMessage(data);
      await sendFeishuMessage(feishuConfig.botOpenId, text);
    }
  }

  if (currentTime >= '09:00' && currentTime < '09:30' && day >= 1 && day <= 5) {
    const key = 'accounting_' + today;
    if (!_serverShownReminders[key]) {
      _serverShownReminders[key] = true;
      await sendFeishuMessage(feishuConfig.botOpenId, '💼 会计备考时间到\n番茄钟：45min学习 + 10min休息\n今天也是进步的一天，加油！');
    }
  }

  const hasDailyReview = data.review && data.review.daily &&
    data.review.daily.some(r => r.date === today && r.answers && r.answers.some(a => a && a.trim()));

  if (currentTime >= '20:00' && currentTime < '20:30' && !hasDailyReview && data.automation.autoReview) {
    if (day === 0) {
      const key = 'weekly_' + today;
      if (!_serverShownReminders[key]) {
        _serverShownReminders[key] = true;
        await sendFeishuMessage(feishuConfig.botOpenId, '📝 该写周复盘了\n\n6 个问题帮你总结一周：\n1. 本周目标完成率多少？\n2. 哪个维度进展最好？哪个最差？\n3. 本周最大收获是什么？\n4. 时间花在哪里了？和计划偏差大吗？\n5. 下周需要调整什么？\n6. 下周的3个must-do是什么？\n\n打开工作台 → 复盘中心 开始写');
      }
    } else {
      const key = 'daily_' + today;
      if (!_serverShownReminders[key]) {
        _serverShownReminders[key] = true;
        await sendFeishuMessage(feishuConfig.botOpenId, '📝 该写日复盘了\n\n5 个问题回顾今天：\n1. 今天完成了哪些任务？\n2. 哪3件事做得好？为什么好？\n3. 哪件事没做完/没做好？卡在哪里？\n4. 明天最重要的一件事是什么？\n5. 今天有什么收获或感恩？\n\n打开工作台 → 复盘中心 开始写');
      }
    }

    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    if (now.getDate() === lastDay) {
      const mKey = now.toISOString().slice(0, 7);
      const key = 'monthly_' + mKey;
      if (!_serverShownReminders[key]) {
        _serverShownReminders[key] = true;
        await sendFeishuMessage(feishuConfig.botOpenId, '📊 今天也是月复盘日\n\n5 个问题总结本月：\n1. 月度目标完成率多少？哪些达标？\n2. 关键指标追踪（粉丝/读书/健身/复盘）\n3. 本月最满意/最遗憾的一件事？\n4. 下月需要新增/减少/调整哪些目标？\n5. 填好下月的月计划\n\n打开工作台 → 复盘中心 → 月复盘');
      }
    }
  }

  if (currentTime >= '22:00' && currentTime < '22:30') {
    const habits = data.habits || [];
    const habitData = data.habitData || {};
    const unchecked = habits.filter(h => !habitData[h.name] || !habitData[h.name][today]);
    const key = 'habit_' + today;
    if (!_serverShownReminders[key]) {
      _serverShownReminders[key] = true;
      let text = '🌙 睡前打卡提醒\n\n';
      if (unchecked.length > 0) {
        text += `还有 ${unchecked.length} 项习惯未打卡：\n`;
        unchecked.slice(0, 8).forEach(h => { text += `   ⬜ ${h.name}\n`; });
      } else {
        text += '🎉 今天所有习惯都已打卡！\n';
      }
      text += '\n打开工作台完成打卡，早点休息～';
      await sendFeishuMessage(feishuConfig.botOpenId, text);
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
