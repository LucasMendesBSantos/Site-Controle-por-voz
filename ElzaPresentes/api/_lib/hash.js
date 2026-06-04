export function hashPassword(password) {
  let hash = 0;
  const str = password + '_elza_salt_2024';
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Buffer.from(String(hash)).toString('base64');
}
