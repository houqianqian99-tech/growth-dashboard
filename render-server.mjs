import { createServer } from 'http';
import { getBotReply } from './lib/feishu-commands.mjs';

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const OPEN_ID = process.env.FEISHU_BOT_OPEN_ID;
const CHAT_ID = process.env.FEISHU_CHAT_ID;
const PORT = process.env.PORT || 8080;

let token = '', tokenTime = 0;
const state = { processedIds: [], completions: {}, initialized: false };

async function getToken() {
  if (token && Date.now() - tokenTime < 1000 * 60 * 30) return token;
  const r = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET })
  });
  const d = await r.json(); token = d.tenant_access_token; tokenTime = Date.now();
  console.log('Token refreshed'); return token;
}

async function listMessages(t) {
  const r = await fetch(`https://open.feishu.cn/open-apis/im/v1/messages?container_id=${CHAT_ID}&container_id_type=chat&sort_type=ByCreateTimeAsc&page_size=50`, { headers: { Authorization: `Bearer ${t}` } });
  const d = await r.json();
  return d.code === 0 ? (d.data?.items || []) : [];
}

async function sendMessage(t, text) {
  await fetch('https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id', {
    method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ receive_id: OPEN_ID, msg_type: 'text', content: JSON.stringify({ text }) })
  });
}

async function poll() {
  try {
    const t = await getToken();
    const messages = await listMessages(t);
    const userMsgs = messages.filter(m => m.sender?.id_type === 'open_id');

    if (!state.initialized) {
      state.processedIds = userMsgs.map(m => m.message_id);
      state.initialized = true;
      console.log(`Initialized with ${state.processedIds.length} existing messages`);
      return;
    }

    const newMsgs = userMsgs.filter(m => !state.processedIds.includes(m.message_id));
    for (const msg of newMsgs) {
      const content = JSON.parse(msg.body?.content || '{}');
      const text = (content.text || '').trim();
      if (!text) continue;
      state.processedIds.push(msg.message_id);
      console.log(`[${new Date().toISOString()}] "${text}"`);
      const reply = getBotReply(text, state.completions);
      if (reply) { await sendMessage(t, reply); console.log('  -> replied'); }
    }
  } catch (e) { console.error('Poll error:', e.message); }
}

const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', initialized: state.initialized, processed: state.processedIds.length }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Feishu bot is running');
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Starting Feishu poll (10s interval)...');
  setInterval(poll, 10000);
  poll();
});
