const WORD_TO_NUM = {
  zero: 0,
  um: 1, uma: 1,
  dois: 2, duas: 2,
  três: 3, tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  quatorze: 14, catorze: 14,
  quinze: 15,
  dezesseis: 16,
  dezessete: 17,
  dezoito: 18,
  dezenove: 19,
  vinte: 20,
  trinta: 30,
  quarenta: 40,
  cinquenta: 50,
  sessenta: 60,
  setenta: 70,
  oitenta: 80,
  noventa: 90,
  cem: 100, cento: 100,
  duzentos: 200, duzentas: 200,
  trezentos: 300, trezentas: 300,
  quatrocentos: 400, quatrocentas: 400,
  quinhentos: 500, quinhentas: 500,
  seiscentos: 600, seiscentas: 600,
  setecentos: 700, setecentas: 700,
  oitocentos: 800, oitocentas: 800,
  novecentos: 900, novecentas: 900,
  mil: 1000,
};

const SKIP = new Set(['e', 'de', 'reais', 'real', 'r$', 'r', 'com', 'mais']);

function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function wordsToNumber(text) {
  const words = normalize(text).split(/\s+/).filter((w) => w && !SKIP.has(w));
  let total = 0;
  let current = 0;

  for (const w of words) {
    const val = WORD_TO_NUM[w];
    if (val === undefined) continue;
    if (val === 1000) {
      total += (current === 0 ? 1 : current) * 1000;
      current = 0;
    } else if (val >= 100) {
      current += val;
    } else {
      current += val;
    }
  }

  return total + current;
}

function extractValue(text) {
  const t = text.trim();
  const numMatch = t.match(/^(\d+(?:[.,]\d{1,2})?)$/);
  if (numMatch) {
    const v = parseFloat(numMatch[1].replace(',', '.'));
    return v > 0 ? v : null;
  }
  const v = wordsToNumber(t);
  return v > 0 ? v : null;
}

function matchClothingType(text, clothingTypes) {
  if (!text || !clothingTypes.length) return text || null;
  const lower = text.toLowerCase();
  const exact = clothingTypes.find((t) => t.toLowerCase() === lower);
  if (exact) return exact;
  const partial = clothingTypes.find(
    (t) => lower.includes(t.toLowerCase()) || t.toLowerCase().includes(lower)
  );
  return partial || text;
}

/**
 * Parseia um comando de voz completo numa única fala.
 *
 * Compra:   "[nome] comprou [artigo?] [item] de [valor] reais"
 * Pagamento: "[nome] pagou [valor] reais"
 *
 * Retorna { name, type, value, item } ou null se não entendeu.
 */
export function parseFullCommand(text, clothingTypes = []) {
  const s = text.toLowerCase().trim().replace(/\s+/g, ' ');

  // ── Compra ───────────────────────────────────────────────────
  const comprouMatch = s.match(/^(.+?)\s+comprou\s+(.*?)\s+reais?\.?$/);
  if (comprouMatch) {
    const [, namePart, rest] = comprouMatch;

    // Tenta separar item e valor em "[item] de [valor]"
    const deMatch = rest.match(/^(.*)\s+de\s+(.+)$/); // greedy: último "de"
    if (deMatch) {
      const value = extractValue(deMatch[2]);
      if (value !== null) {
        const rawItem = deMatch[1].trim().replace(/^um[a]?\s+/, '');
        return {
          name: namePart.trim(),
          type: 'compra',
          value,
          item: matchClothingType(rawItem, clothingTypes),
        };
      }
    }

    // Sem item: "comprou 25 reais"
    const value = extractValue(rest);
    if (value !== null) {
      return { name: namePart.trim(), type: 'compra', value, item: null };
    }
  }

  // ── Pagamento ────────────────────────────────────────────────
  const pagouMatch = s.match(/^(.+?)\s+pagou\s+(.+?)\s+reais?\.?$/);
  if (pagouMatch) {
    const value = extractValue(pagouMatch[2]);
    if (value !== null) {
      return { name: pagouMatch[1].trim(), type: 'pagamento', value, item: null };
    }
  }

  return null;
}

// Mantido para compatibilidade com outros usos pontuais
export function parseVoiceCommand(text) {
  const t = text.toLowerCase().trim();
  let type = null;
  if (/\b(comprou|comprar|compra)\b/.test(t)) type = 'compra';
  else if (/\b(pagou|pagar|pagamento|recebeu|receber)\b/.test(t)) type = 'pagamento';
  if (!type) return null;
  const numMatch = t.match(/(\d+(?:[.,]\d{1,2})?)/);
  let value = numMatch
    ? parseFloat(numMatch[1].replace(',', '.'))
    : wordsToNumber(t.replace(/comprou|comprar|compra|pagou|pagar|pagamento|recebeu|receber/, ''));
  if (!value || value <= 0 || isNaN(value)) return null;
  return { type, value };
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatDate(isoString) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(isoString));
}

export function formatCPF(value) {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}
