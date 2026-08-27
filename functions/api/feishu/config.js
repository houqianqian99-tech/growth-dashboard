import { loadFeishuConfig, saveFeishuConfig } from '../../../../lib/storage.js';

export async function onRequestGet(context) {
  const config = await loadFeishuConfig(context.env);
  return Response.json({
    appId: config.appId || '',
    appSecret: config.appSecret ? '***' : '',
    botOpenId: config.botOpenId || '',
    hasConfig: !!(config.appId && config.appSecret)
  });
}

export async function onRequestPost(context) {
  const { appId, appSecret, botOpenId } = await context.request.json();
  const ok = await saveFeishuConfig({ appId, appSecret, botOpenId }, context.env);
  return Response.json({ ok });
}
