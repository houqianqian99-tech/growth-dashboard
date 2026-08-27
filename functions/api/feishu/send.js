import { loadFeishuConfig } from '../../../../lib/storage.js';
import { sendFeishuMessage } from '../../../../lib/feishu.js';

export async function onRequestPost(context) {
  const { message, openId } = await context.request.json();
  const config = await loadFeishuConfig(context.env);
  const targetId = openId || config.botOpenId;
  if (!targetId) return Response.json({ error: 'no_open_id' }, { status: 400 });
  const ok = await sendFeishuMessage(targetId, message || '测试消息', context.env);
  return Response.json({ ok });
}
