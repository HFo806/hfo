export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { title, details, color } = req.body;
  if (!title || !details) {
    return res.status(400).json({ success: false, message: 'Missing title or details' });
  }

  const host = req.headers.host || '';
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const siteUrl = `${protocol}://${host}`;

  const TG_TOKEN = process.env.HFO_TG_TOKEN;
  const TG_CHAT_ID = process.env.HFO_TG_CHAT_ID;
  const DISCORD_WEBHOOK = process.env.HFO_DISCORD_WEBHOOK;

  const dispatchPromises = [];

  // إرسال الإشعار إلى تيليجرام
  if (TG_TOKEN && TG_CHAT_ID) {
    const tgText = `🛡️ <b>تحالف HFO [Server #806]</b>\n━━━━━━━━━━━━━━\n📌 <b>${title}</b>\n\n${details}\n\n🔗 <b>رابط المركز:</b> ${siteUrl}\n✍️ <i>806 Abo S3D - HFo</i>`;
    dispatchPromises.push(
      fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TG_CHAT_ID,
          text: tgText,
          parse_mode: 'HTML'
        })
      }).catch(err => console.error('Telegram dispatch error:', err))
    );
  }

  // إرسال الإشعار إلى ديسكورد
  if (DISCORD_WEBHOOK) {
    dispatchPromises.push(
      fetch(DISCORD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'HFO #806 Command Center',
          content: '📢 **تنبيه جديد من مركز القيادة** @everyone',
          embeds: [{
            title: `🛡️ ${title}`,
            description: `${details}\n\n🔗 **[فتح مركز القيادة](${siteUrl})**`,
            color: color || 0xf59e0b,
            footer: { text: '806 Abo S3D - HFo • Server #806' },
            timestamp: new Date().toISOString()
          }]
        })
      }).catch(err => console.error('Discord dispatch error:', err))
    );
  }

  try {
    await Promise.all(dispatchPromises);
    return res.status(200).json({ success: true, message: 'All alerts dispatched successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}