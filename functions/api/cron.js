import { checkReminders } from '../../../lib/reminders.js';

export async function onRequestGet(context) {
  if (context.env?.CRON_SECRET) {
    const auth = context.request.headers.get('authorization');
    if (auth !== `Bearer ${context.env.CRON_SECRET}`) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }
  }
  try {
    const result = await checkReminders(context.env);
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
