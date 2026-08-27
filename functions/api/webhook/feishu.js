import { loadData, saveData, loadFeishuConfig, saveFeishuConfig } from '../../../../lib/storage.js';
import { sendFeishuMessage } from '../../../../lib/feishu.js';
import { parseMessage, handleCommand } from '../../../../lib/commands.js';

export async function onRequestPost(context) {
  const body = await context.request.json();
  const type = body?.header?.event_type;

  if (type === 'url_verification') {
    return Response.json({ challenge: body.challenge });
  }

  if (type !== 'im.message.receive_v1') {
    return Response.json({ ok: true });
  }

  try {
    const msg = body?.event?.message;
    let text = '';
    if (msg?.message_type === 'text') {
      text = JSON.parse(msg.content).text || '';
    }
    if (!text) return Response.json({ ok: true });

    const senderId = msg?.sender?.sender_id?.open_id;
    const config = await loadFeishuConfig(context.env);

    if (senderId && !config.botOpenId) {
      config.botOpenId = senderId;
      await saveFeishuConfig(config, context.env);
    }

    const data = await loadData(context.env) || {
      todos: [], habitData: {}, goals: [],
      review: { daily: [], weekly: [], monthly: [] }
    };

    const cmd = parseMessage(text);
    const reply = handleCommand(cmd, data);
    await saveData(data, context.env);

    if (senderId) {
      await sendFeishuMessage(senderId, reply, context.env);
    }

    return Response.json({ ok: true, reply });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
