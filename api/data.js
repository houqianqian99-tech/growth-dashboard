import { loadData, saveData } from '../lib/storage.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const data = await loadData();
    res.status(200).json(data || { error: 'no_data' });
  } else if (req.method === 'POST') {
    const data = req.body;
    const ok = await saveData(data);
    res.status(ok ? 200 : 500).json({ ok });
  } else {
    res.status(405).json({ error: 'method_not_allowed' });
  }
}
