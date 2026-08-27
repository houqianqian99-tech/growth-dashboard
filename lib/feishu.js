import { loadFeishuConfig } from './storage.js';

let cachedToken = null;
let tokenExpire = 0;

async function getFeishuToken() {
  const config = await loadFeishuConfig();
  if (!config.appId || !config.appSecret) return null;
  if (cachedToken && Date.now() < tokenExpire) return cachedToken;
  try {
    const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: config.appId, app_secret: config.appSecret })
    });
    const json = await res.json();
    if (json.code === 0) {
      cachedToken = json.tenant_access_token;
      tokenExpire = Date.now() + (json.expire - 60) * 1000;
      return cachedToken;
    }
  } catch (e) {}
  return null;
}

export async function sendFeishuMessage(openId, text) {
  const token = await getFeishuToken();
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

export { getFeishuToken };
