export function onRequestGet(context) {
  return Response.json({
    status: 'ok',
    time: new Date().toISOString(),
    kv: !!context.env?.GROWTH_KV
  });
}
