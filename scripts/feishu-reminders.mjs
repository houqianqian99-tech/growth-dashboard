const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const OPEN_ID = process.env.FEISHU_BOT_OPEN_ID;
const GIST_ID = process.env.GIST_ID;
const GH_TOKEN = process.env.GH_PAT;

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
  const messages = [];

  if (hh === '07' && mm < 30) {
    messages.push({ key: `${todayKey}-morning`, text: '早上好\n今日待办已生成\n打开工作台查看\nhttps://houqianqian99-tech.github.io/growth-dashboard/' });
  }

  if (hh === '09' && mm < 30 && day >= 1 && day <= 5) {
    messages.push({ key: `${todayKey}-accounting`, text: '会计备考时间到\n番茄钟：45min学习 + 10min休息\n加油！' });
  }

  if (hh === '20' && mm < 30) {
    if (day === 0) {
      messages.push({ key: `${todayKey}-weekly-review`, text: '该写周复盘了\n6 个问题帮你总结一周\n1. 本周目标完成率？\n2. 哪个维度进展最好？\n3. 本周最大收获？\n4. 时间花在哪了？\n5. 下周调整什么？\n6. 下周3个must-do？' });
    } else {
      messages.push({ key: `${todayKey}-daily-review`, text: '该写日复盘了\n5 个问题回顾今天\n1. 今天完成了哪些任务？\n2. 哪3件事做得好？\n3. 哪件事没做好？卡在哪？\n4. 明天最重要的一件事？\n5. 今天有什么收获或感恩？' });
    }
    if (date === lastDay) {
      messages.push({ key: `${todayKey}-monthly-review`, text: '今天也是月复盘日\n5 个问题总结本月\n1. 月度目标完成率？\n2. 关键指标追踪\n3. 本月最满意/最遗憾？\n4. 下月调整什么？\n5. 填好下月计划' });
    }
  }

  if (hh === '22' && mm < 30) {
    messages.push({ key: `${todayKey}-habit`, text: '习惯打卡提醒\n还有哪些习惯没打卡？\n打开工作台完成今日打卡\nhttps://houqianqian99-tech.github.io/growth-dashboard/' });
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
