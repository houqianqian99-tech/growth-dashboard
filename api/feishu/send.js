import { loadFeishuConfig } from '../../lib/storage.js';
import { sendFeishuMessage } from '../../lib/feishu.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const { message, openId } = req.body || {};
  const config = await loadFeishuConfig();
  const targetId = openId || config.botOpenId;
  if (!targetId) return res.status(400).json({ error: 'no_open_id' });
  const ok = await sendFeishuMessage(targetId, message || '测试消息');
  res.status(ok ? 200 : 500).json({ ok });
}
