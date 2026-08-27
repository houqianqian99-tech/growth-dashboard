import { loadData, saveData } from '../../../lib/storage.js';

export async function onRequestGet(context) {
  const data = await loadData(context.env);
  return Response.json(data || { error: 'no_data' });
}

export async function onRequestPost(context) {
  const data = await context.request.json();
  const ok = await saveData(data, context.env);
  return Response.json({ ok });
}
