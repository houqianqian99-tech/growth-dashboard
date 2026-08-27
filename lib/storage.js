const KV_URL = process.env.KV_REST_API_URL || '';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || '';
const DATA_KEY = 'growth-data';
const CONFIG_KEY = 'feishu-config';

export async function loadData() {
  if (!KV_URL || !KV_TOKEN) return null;
  try {
    const res = await fetch(`${KV_URL}/get/${DATA_KEY}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    });
    const json = await res.json();
    if (json.result) return JSON.parse(json.result);
  } catch (e) {}
  return null;
}

export async function saveData(data) {
  if (!KV_URL || !KV_TOKEN) return false;
  try {
    const res = await fetch(`${KV_URL}/set/${DATA_KEY}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.ok;
  } catch (e) { return false; }
}

export async function loadFeishuConfig() {
  if (!KV_URL || !KV_TOKEN) return null;
  try {
    const res = await fetch(`${KV_URL}/get/${CONFIG_KEY}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    });
    const json = await res.json();
    if (json.result) return JSON.parse(json.result);
  } catch (e) {}
  return { appId: process.env.FEISHU_APP_ID || '', appSecret: process.env.FEISHU_APP_SECRET || '', botOpenId: process.env.FEISHU_BOT_OPEN_ID || '' };
}

export async function saveFeishuConfig(config) {
  if (!KV_URL || !KV_TOKEN) return false;
  try {
    const res = await fetch(`${KV_URL}/set/${CONFIG_KEY}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return res.ok;
  } catch (e) { return false; }
}
