const USERS = [
  {
    user: process.env.DEV_USERNAME  || 'Lucas',
    pass: process.env.DEV_PASSWORD  || 'Hellen',
  },
  {
    user: process.env.DEV_USERNAME2 || 'Hellen',
    pass: process.env.DEV_PASSWORD2 || 'Lucas',
  },
];

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { username, password } = req.body ?? {};
  const match = USERS.some((u) => u.user === username && u.pass === password);

  if (match) return res.json({ ok: true });
  res.status(401).json({ error: 'Usuário ou senha incorretos.' });
}
