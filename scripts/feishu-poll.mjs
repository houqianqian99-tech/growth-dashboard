import { getBotReply } from '../lib/feishu-commands.mjs';

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const OPEN_ID = process.env.FEISHU_BOT_OPEN_ID;
const CHAT_ID = process.env.FEISHU_CHAT_ID;
const GIST_ID = process.env.GIST_ID;
const GH_TOKEN = process.env.GH_PAT;

async function getToken() {
  const r = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET })
  });
  const d = await r.json();
  return d.tenant_access_token;
}

async function getGist() {
  const r = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    headers: { Authorization: `Bearer ${GH_TOKEN}` }
  });
  return r.json();
}

async function updateGist(state) {
  await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${GH_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: { 'state.json': { content: JSON.stringify(state, null, 2) } } })
  });
}

async function listMessages(token, startTime) {
  const url = `https://open.feishu.cn/open-apis/im/v1/messages?container_id=${CHAT_ID}&container_id_type=chat&sort_type=ByCreateTimeAsc&page_size=50` + (startTime ? `&start_time=${startTime}` : '');
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const d = await r.json();
  if (d.code !== 0) { console.log('List error:', d.code, d.msg); return []; }
  return d.data?.items || [];
}

async function sendMessage(token, text) {
  await fetch('https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      receive_id: OPEN_ID,
      msg_type: 'text',
      content: JSON.stringify({ text })
    })
  });
}

async function main() {
  console.log('Feishu message poll started at', new Date().toISOString());

  const token = await getToken();
  const gist = await getGist();
  let state;
  try {
    state = JSON.parse(gist.files['state.json'].content);
  } catch { state = { lastMessageId: '', completions: {} }; }

  const lastId = state.lastMessageId;
  const messages = await listMessages(token);

  const userMessages = messages.filter(m => m.sender?.id_type === 'open_id');
  const newMessages = lastId
    ? userMessages.slice(userMessages.findIndex(m => m.message_id === lastId) + 1)
    : userMessages;

  console.log(`Found ${newMessages.length} new messages`);

  for (const msg of newMessages) {
    const content = JSON.parse(msg.body?.content || '{}');
    const text = (content.text || '').trim();
    if (!text) continue;

    console.log(`Processing: "${text}"`);
    const reply = getBotReply(text, state.completions);
    if (reply) {
      await sendMessage(token, reply);
      console.log('Reply sent');
    }
    state.lastMessageId = msg.message_id;
  }

  await updateGist(state);
  console.log('State updated');
}

main().catch(e => { console.error(e); process.exit(1); });
