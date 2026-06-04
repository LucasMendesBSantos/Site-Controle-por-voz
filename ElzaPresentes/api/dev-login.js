export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { username, password } = req.body ?? {};
  const validUser = process.env.DEV_USERNAME || 'Lucas';
  const validPass = process.env.DEV_PASSWORD || 'Hellen';

  if (username === validUser && password === validPass) {
    return res.json({ ok: true });
  }

  res.status(401).json({ error: 'Usuário ou senha incorretos.' });
}
