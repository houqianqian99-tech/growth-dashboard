import lark from '@larksuiteoapi/node-sdk';
import { getBotReply } from '../lib/feishu-commands.mjs';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const APP_ID = process.env.FEISHU_APP_ID || 'cli_aa1aa97db7f9dbb3';
const APP_SECRET = process.env.FEISHU_APP_SECRET || 'uhnwcRjbLQGGmys4Ge29gcHwvgPqTxkY';
const OPEN_ID = process.env.FEISHU_BOT_OPEN_ID || 'ou_5d50cdb150703d7ebc194a26517734bb';

const STATE_DIR = join(process.env.HOME || '', '.trae/data');
const STATE_FILE = join(STATE_DIR, 'feishu-state.json');

function loadState() {
  try {
    if (existsSync(STATE_FILE)) return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  } catch {}
  return { lastMessageId: '', completions: {} };
}

function saveState(state) {
  try {
    if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) { console.error('Save state error:', e.message); }
}

const client = new lark.Client({ appId: APP_ID, appSecret: APP_SECRET });

async function sendReply(openId, text) {
  try {
    await client.im.message.create({
      params: { receive_id_type: 'open_id' },
      data: {
        receive_id: openId,
        msg_type: 'text',
        content: JSON.stringify({ text }),
      },
    });
    console.log('Reply sent:', text.slice(0, 50));
  } catch (e) {
    console.error('Send reply error:', e.message);
  }
}

console.log('Feishu bot starting (long connection mode)...');
console.log('App ID:', APP_ID);

const wsClient = new lark.WSClient({ appId: APP_ID, appSecret: APP_SECRET });

await wsClient.start({
  eventDispatcher: new lark.EventDispatcher({}).register({
    'im.message.receive_v1': async (data) => {
      try {
        const msg = data.message;
        const senderId = data.sender?.sender_id?.open_id;
        const content = JSON.parse(msg?.content || '{}');
        const text = (content.text || '').trim();

        if (!text || !senderId) return;
        console.log(`[${new Date().toLocaleString('zh-CN')}] Received: "${text}"`);

        const state = loadState();
        const reply = getBotReply(text, state.completions);
        saveState(state);

        if (reply) {
          await sendReply(senderId, reply);
        }
      } catch (e) {
        console.error('Process message error:', e.message);
      }
    },
  }),
});

console.log('Feishu bot is online! Send messages in Feishu to get instant replies.');
console.log('Press Ctrl+C to stop.');
