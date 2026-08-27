import { loadFeishuConfig } from './storage.js';

export async function getFeishuToken(env) {
  const config = await loadFeishuConfig(env);
  if (!config.appId || !config.appSecret) return null;
  try {
    const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: config.appId, app_secret: config.appSecret })
    });
    const json = await res.json();
    if (json.code === 0) return json.tenant_access_token;
  } catch (e) {}
  return null;
}

export async function sendFeishuMessage(openId, text, env) {
  const token = await getFeishuToken(env);
  if (!token) return false;
  try {
    const res = await fetch('https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ receive_id: openId, msg_type: 'text', content: JSON.stringify({ text }) })
    });
    const json = await res.json();
    return json.code === 0;
  } catch (e) { return false; }
}
