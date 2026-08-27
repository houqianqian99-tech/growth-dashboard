import { getBotReply } from '../lib/feishu-commands.mjs';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const APP_ID = process.env.FEISHU_APP_ID || 'cli_aa1aa97db7f9dbb3';
const APP_SECRET = process.env.FEISHU_APP_SECRET || 'uhnwcRjbLQGGmys4Ge29gcHwvgPqTxkY';
const OPEN_ID = process.env.FEISHU_BOT_OPEN_ID || 'ou_5d50cdb150703d7ebc194a26517734bb';
const CHAT_ID = process.env.FEISHU_CHAT_ID || 'oc_9cd0f1c77455f2c60e192e3c1f0abe0e';
const STATE_DIR = '/tmp/feishu-state';
const STATE_FILE = join(STATE_DIR, 'feishu-state.json');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function loadState() {
  try { if (existsSync(STATE_FILE)) return JSON.parse(readFileSync(STATE_FILE, 'utf8')); } catch {}
  return { processedIds: [], completions: {}, initialized: false };
}
function saveState(s) {
  try { if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true }); writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); } catch (e) { console.error(e.message); }
}

let token = '', tokenTime = 0;
async function getToken() {
  if (token && Date.now() - tokenTime < 1000 * 60 * 30) return token;
  const r = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET })
  });
  const d = await r.json(); token = d.tenant_access_token; tokenTime = Date.now(); return token;
}
async function listMessages(t) {
  const r = await fetch(`https://open.feishu.cn/open-apis/im/v1/messages?container_id=${CHAT_ID}&container_id_type=chat&sort_type=ByCreateTimeAsc&page_size=50`, { headers: { Authorization: `Bearer ${t}` } });
  const d = await r.json(); return d.code === 0 ? (d.data?.items || []) : [];
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
    const state = loadState();

    if (!state.initialized) {
      state.processedIds = userMsgs.map(m => m.message_id);
      state.initialized = true;
      saveState(state);
      console.log(`Initialized with ${state.processedIds.length} existing messages`);
      return;
    }

    const newMsgs = userMsgs.filter(m => !state.processedIds.includes(m.message_id));

    for (const msg of newMsgs) {
      const content = JSON.parse(msg.body?.content || '{}');
      const text = (content.text || '').trim();
      if (!text) continue;
      state.processedIds.push(msg.message_id);
      console.log(`[${new Date().toLocaleString('zh-CN')}] "${text}"`);
      const reply = getBotReply(text, state.completions);
      saveState(state);
      if (reply) { await sendMessage(t, reply); console.log('  -> replied'); }
    }
    if (newMsgs.length === 0) return;
    saveState(state);
  } catch (e) { console.error('Poll error:', e.message); }
}

console.log('Feishu local poll started (10s interval)');
console.log('Bot is online! Send messages in Feishu for instant replies.');
setInterval(poll, 10000);
poll();
