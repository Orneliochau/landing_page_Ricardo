// Vercel Serverless Function
// Recebe eventos do site (client-side) e envia-os para a Meta Conversions API
// usando o access token guardado em variáveis de ambiente (nunca exposto no browser).

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const PIXEL_ID = process.env.FB_PIXEL_ID;
  const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;

  if (!PIXEL_ID || !ACCESS_TOKEN) {
    res.status(500).json({ error: 'FB_PIXEL_ID ou FB_ACCESS_TOKEN não configurados nas variáveis de ambiente da Vercel' });
    return;
  }

  try {
    const { eventName, eventId, eventSourceUrl, fbp, fbc } = req.body || {};

    if (!eventName) {
      res.status(400).json({ error: 'eventName em falta' });
      return;
    }

    const forwardedFor = req.headers['x-forwarded-for'];
    const clientIp = forwardedFor ? String(forwardedFor).split(',')[0].trim() : req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const userData = {
      client_ip_address: clientIp,
      client_user_agent: userAgent,
    };
    if (fbp) userData.fbp = fbp;
    if (fbc) userData.fbc = fbc;

    const payload = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          event_source_url: eventSourceUrl,
          action_source: 'website',
          user_data: userData,
        },
      ],
    };

    const fbRes = await fetch(
      `https://graph.facebook.com/v21.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    const fbData = await fbRes.json();

    if (!fbRes.ok) {
      res.status(502).json({ error: 'Erro ao enviar evento para a Meta', details: fbData });
      return;
    }

    res.status(200).json(fbData);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', message: err.message });
  }
}
