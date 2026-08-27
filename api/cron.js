import { checkReminders } from '../lib/reminders.js';

export default async function handler(req, res) {
  const authOk = req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`;
  if (!authOk && process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  try {
    const result = await checkReminders();
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
