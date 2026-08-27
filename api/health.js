export default async function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    time: new Date().toISOString(),
    kv: !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
  });
}
