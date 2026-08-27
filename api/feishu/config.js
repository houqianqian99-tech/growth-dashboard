import { loadFeishuConfig, saveFeishuConfig } from '../../lib/storage.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const config = await loadFeishuConfig();
    res.status(200).json({
      appId: config.appId || '',
      appSecret: config.appSecret ? '***' : '',
      botOpenId: config.botOpenId || '',
      hasConfig: !!(config.appId && config.appSecret)
    });
  } else if (req.method === 'POST') {
    const { appId, appSecret, botOpenId } = req.body || {};
    const ok = await saveFeishuConfig({ appId, appSecret, botOpenId });
    res.status(ok ? 200 : 500).json({ ok });
  } else {
    res.status(405).json({ error: 'method_not_allowed' });
  }
}
