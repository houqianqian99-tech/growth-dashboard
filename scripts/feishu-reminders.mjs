const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const OPEN_ID = process.env.FEISHU_BOT_OPEN_ID;
const GIST_ID = process.env.GIST_ID;
const GH_TOKEN = process.env.GH_PAT;

const DATA_GIST_ID = process.env.DATA_GIST_ID || GIST_ID;

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

async function getTenantAccessToken() {
  const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET })
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(`Token error: ${JSON.stringify(json)}`);
  return json.tenant_access_token;
}

async function sendMessage(token, text) {
  const res = await fetch('https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      receive_id: OPEN_ID,
      msg_type: 'text',
      content: JSON.stringify({ text })
    })
  });
  const json = await res.json();
  return json.code === 0;
}

async function getLastSent() {
  if (!GIST_ID || !GH_TOKEN) return {};
  try {
    const r = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      headers: { Authorization: `Bearer ${GH_TOKEN}` }
    });
    const gist = await r.json();
    const content = gist.files?.['reminder-state.json']?.content;
    return content ? JSON.parse(content) : {};
  } catch { return {}; }
}

async function updateLastSent(state) {
  if (!GIST_ID || !GH_TOKEN) return;
  try {
    await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${GH_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: { 'reminder-state.json': { content: JSON.stringify(state, null, 2) } } })
    });
  } catch (e) { console.error('Gist update error:', e.message); }
}

async function loadUserData() {
  try {
    const r = await fetch(`https://api.github.com/gists/${DATA_GIST_ID}`, {
      headers: { Authorization: `Bearer ${GH_TOKEN}` }
    });
    const gist = await r.json();
    const content = gist.files?.['growth-data.json']?.content;
    return content ? JSON.parse(content) : null;
  } catch { return null; }
}

function getDayOfYear(d) {
  const start = new Date(d.getUTCFullYear(), 0, 0);
  const diff = d - start;
  return Math.floor(diff / 86400000);
}

function buildMorningMessage(data, dateStr) {
  const weekly = data?.plans?.weekly;
  const daily = data?.plans?.daily || [];
  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const d = new Date(dateStr + 'T00:00:00Z');
  const dayOfWeek = d.getUTCDay();
  const dayName = dayNames[dayOfWeek];
  const month = d.getUTCMonth() + 1;
  const date = d.getUTCDate();
  const weekdayKey = dayName;

  const quote = QUOTES[getDayOfYear(d) % QUOTES.length];

  let todoList = [];
  if (daily.length > 0) {
    todoList = daily.filter(t => !t.done).map(t => t.text);
  }

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
    if (items.length > 0) {
      daySchedule = items.join('\n');
    }
  }

  let msg = `☀️ 早上好！${month}月${date}日 ${dayName}\n\n${quote}\n\n`;
  msg += '📅 今日安排：\n';
  if (daySchedule) {
    msg += daySchedule + '\n';
  } else {
    msg += '（去周计划页面安排今天的任务吧）\n';
  }

  if (todoList.length > 0) {
    msg += '\n✅ 今日待办：\n';
    todoList.slice(0, 6).forEach((t, i) => {
      msg += `   ${i + 1}. ${t}\n`;
    });
    if (todoList.length > 6) msg += `   ...还有 ${todoList.length - 6} 项\n`;
  }

  if (weekly?.mustDo && weekly.mustDo.filter(Boolean).length > 0) {
    msg += '\n🎯 本周 Must-Do：\n';
    weekly.mustDo.filter(Boolean).forEach((t, i) => {
      msg += `   ${i + 1}. ${t}\n`;
    });
  }

  return msg;
}

async function main() {
  if (!APP_ID || !APP_SECRET || !OPEN_ID) {
    console.log('Missing Feishu credentials, skipping.');
    return;
  }

  const now = new Date();
  const beijing = new Date(now.getTime() + 8 * 3600 * 1000);
  const hh = String(beijing.getUTCHours()).padStart(2, '0');
  const mm = String(beijing.getUTCMinutes()).padStart(2, '0');
  const day = beijing.getUTCDay();
  const date = beijing.getUTCDate();
  const month = beijing.getUTCMonth();
  const lastDay = new Date(beijing.getUTCFullYear(), month + 1, 0).getUTCDate();
  const todayKey = beijing.toISOString().split('T')[0];

  console.log(`Beijing time: ${hh}:${mm}, day=${day}, date=${date}/${month+1}, lastDay=${lastDay}`);

  const token = await getTenantAccessToken();
  const lastSent = await getLastSent();
  const userData = await loadUserData();
  const messages = [];

  if (hh === '07' && mm < 30) {
    const morningText = buildMorningMessage(userData, todayKey);
    messages.push({ key: `${todayKey}-morning`, text: morningText });
  }

  if (hh === '09' && mm < 30 && day >= 1 && day <= 5) {
    messages.push({ key: `${todayKey}-accounting`, text: '💼 会计备考时间到\n番茄钟：45min学习 + 10min休息\n今天也是进步的一天，加油！' });
  }

  if (hh === '20' && mm < 30) {
    if (day === 0) {
      messages.push({ key: `${todayKey}-weekly-review`, text: '📝 该写周复盘了\n\n6 个问题帮你总结一周：\n1. 本周目标完成率多少？\n2. 哪个维度进展最好？哪个最差？\n3. 本周最大收获是什么？\n4. 时间花在哪里了？和计划偏差大吗？\n5. 下周需要调整什么？\n6. 下周的3个must-do是什么？\n\n打开工作台 → 复盘中心 开始写' });
    } else {
      messages.push({ key: `${todayKey}-daily-review`, text: '📝 该写日复盘了\n\n5 个问题回顾今天：\n1. 今天完成了哪些任务？\n2. 哪3件事做得好？为什么好？\n3. 哪件事没做完/没做好？卡在哪里？\n4. 明天最重要的一件事是什么？\n5. 今天有什么收获或感恩？\n\n打开工作台 → 复盘中心 开始写' });
    }
    if (date === lastDay) {
      messages.push({ key: `${todayKey}-monthly-review`, text: '📊 今天也是月复盘日\n\n5 个问题总结本月：\n1. 月度目标完成率多少？哪些达标？\n2. 关键指标追踪（粉丝/读书/健身/复盘）\n3. 本月最满意/最遗憾的一件事？\n4. 下月需要新增/减少/调整哪些目标？\n5. 填好下月的月计划\n\n打开工作台 → 复盘中心 → 月复盘' });
    }
  }

  if (hh === '22' && mm < 30) {
    const habits = userData?.habits || [];
    const habitData = userData?.habitData || {};
    const unchecked = habits.filter(h => !habitData[h.name] || !habitData[h.name][todayKey]);
    let habitText = '🌙 睡前打卡提醒\n\n';
    if (unchecked.length > 0) {
      habitText += `还有 ${unchecked.length} 项习惯未打卡：\n`;
      unchecked.slice(0, 8).forEach(h => { habitText += `   ⬜ ${h.name}\n`; });
    } else {
      habitText += '🎉 今天所有习惯都已打卡！\n';
    }
    habitText += '\n打开工作台完成打卡，早点休息～';
    messages.push({ key: `${todayKey}-habit`, text: habitText });
  }

  const toSend = messages.filter(m => !lastSent[m.key]);
  if (toSend.length === 0) {
    console.log('No new reminders to send (already sent or no scheduled time).');
    return;
  }

  for (const msg of toSend) {
    await sendMessage(token, msg.text);
    lastSent[msg.key] = new Date().toISOString();
    console.log(`Sent: ${msg.key}`);
  }

  const cleaned = {};
  for (const [k, v] of Object.entries(lastSent)) {
    if (k.startsWith(todayKey) || k.startsWith(todayKey.slice(0, 8))) {
      cleaned[k] = v;
    }
  }
  await updateLastSent(cleaned);
  console.log(`Done. Sent ${toSend.length} reminder(s).`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
