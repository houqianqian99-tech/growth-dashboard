const DATA_KEY = 'growth-data';
const CONFIG_KEY = 'feishu-config';

export async function loadData(env) {
  const kv = env?.GROWTH_KV;
  if (!kv) return null;
  try {
    const val = await kv.get(DATA_KEY);
    if (val) return JSON.parse(val);
  } catch (e) {}
  return null;
}

export async function saveData(data, env) {
  const kv = env?.GROWTH_KV;
  if (!kv) return false;
  try {
    await kv.put(DATA_KEY, JSON.stringify(data));
    return true;
  } catch (e) { return false; }
}

export async function loadFeishuConfig(env) {
  const kv = env?.GROWTH_KV;
  if (kv) {
    try {
      const val = await kv.get(CONFIG_KEY);
      if (val) return JSON.parse(val);
    } catch (e) {}
  }
  return {
    appId: env?.FEISHU_APP_ID || '',
    appSecret: env?.FEISHU_APP_SECRET || '',
    botOpenId: env?.FEISHU_BOT_OPEN_ID || ''
  };
}

export async function saveFeishuConfig(config, env) {
  const kv = env?.GROWTH_KV;
  if (!kv) return false;
  try {
    await kv.put(CONFIG_KEY, JSON.stringify(config));
    return true;
  } catch (e) { return false; }
}
