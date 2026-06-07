export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { username, password } = req.body ?? {};
  const validUser = process.env.ADMIN_USERNAME || 'Elza';
  const validPass = process.env.ADMIN_PASSWORD || '021129';

  if (username === validUser && password === validPass) {
    return res.json({ ok: true });
  }

  res.status(401).json({ error: 'Usuário ou senha incorretos.' });
}
