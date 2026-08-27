import { loadData, saveData } from '../../lib/storage.js';
import { loadFeishuConfig } from '../../lib/storage.js';
import { sendFeishuMessage, getFeishuToken } from '../../lib/feishu.js';
import { parseMessage, handleCommand } from '../../lib/commands.js';

async function fetchUserInfo(openId, token) {
  try {
    const res = await fetch(`https://open.feishu.cn/open-apis/contact/v3/users/${openId}?user_id_type=open_id`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const json = await res.json();
    return json.data?.user || null;
  } catch (e) { return null; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const body = req.body;
  const type = body?.header?.event_type;

  if (type === 'url_verification') {
    return res.status(200).json({ challenge: body.challenge });
  }

  if (type !== 'im.message.receive_v1') {
    return res.status(200).json({ ok: true });
  }

  try {
    const msg = body?.event?.message;
    const msgType = msg?.message_type;
    let text = '';
    if (msgType === 'text') {
      const content = JSON.parse(msg.content);
      text = content.text || '';
    } else {
      text = '';
    }

    if (!text) return res.status(200).json({ ok: true });

    const senderId = msg?.sender?.sender_id?.open_id;
    const config = await loadFeishuConfig();

    if (senderId && config.botOpenId && senderId !== config.botOpenId) {
      if (!config.botOpenId) {
        config.botOpenId = senderId;
        const { saveFeishuConfig } = await import('../../lib/storage.js');
        await saveFeishuConfig(config);
      }
    }

    const data = await loadData() || { todos: [], habitData: {}, goals: [], review: { daily: [], weekly: [], monthly: [] } };
    const cmd = parseMessage(text);
    const reply = handleCommand(cmd, data);
    await saveData(data);

    if (senderId) {
      await sendFeishuMessage(senderId, reply);
    }

    res.status(200).json({ ok: true, reply });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
