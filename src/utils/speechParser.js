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

const SKIP = new Set(['e', 'de', 'reais', 'real', 'r$', 'r', 'com', 'mais', 'uma', 'um']);

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

/** Extrai um valor numérico de qualquer trecho de texto. */
function extractValue(text) {
  // Tenta dígitos: "25", "25,50", "25.00"
  const numM = text.match(/\b(\d+(?:[.,]\d{1,2})?)\b/);
  if (numM) {
    const v = parseFloat(numM[1].replace(',', '.'));
    if (v > 0) return v;
  }
  // Tenta palavras: "vinte e cinco"
  const v = wordsToNumber(text);
  return v > 0 ? v : null;
}

/** Extrai o item comprado do texto após o verbo. */
function extractItem(afterVerb, clothingTypes) {
  const text = afterVerb.toLowerCase();

  // Prioridade 1: tipo de roupa cadastrado
  for (const t of clothingTypes) {
    if (text.includes(t.toLowerCase())) return t;
  }

  // Prioridade 2: palavra antes de "de" seguida de número
  const m = text.match(/^(?:um[a]?\s+)?([a-záàãâéêíóôõúç]+(?:\s+[a-záàãâéêíóôõúç]+)*?)\s+de\s+\d/);
  if (m) return m[1].trim();

  // Prioridade 3: primeira palavra que não é número nem artigo
  const words = text.split(/\s+/);
  const skip = new Set(['um', 'uma', 'o', 'a', 'de', 'da', 'do']);
  const candidate = words.find((w) => !skip.has(w) && !/^\d/.test(w) && w.length > 2);
  if (candidate) return candidate;

  return null;
}

/**
 * Parseia um comando de voz completo em uma única fala.
 *
 * Compra:    "[nome] comprou [item?] de [valor] reais"
 * Pagamento: "[nome] pagou [valor] reais"
 *
 * "reais" é opcional — o número pode aparecer em qualquer formato.
 * Retorna { name, type, value, item } ou null se não entender.
 */
export function parseFullCommand(text, clothingTypes = []) {
  const s = text.toLowerCase().trim().replace(/\s+/g, ' ');

  // Detecta verbo e divide a frase
  const comprouM = s.match(/^(.+?)\s+comprou\s+(.+)$/);
  const pagouM   = s.match(/^(.+?)\s+pagou\s+(.+)$/);

  if (!comprouM && !pagouM) return null;

  const isCompra       = !!comprouM;
  const [, rawName, afterVerb] = isCompra ? comprouM : pagouM;
  const name = rawName.trim();
  if (!name) return null;

  // Extrai valor numérico de qualquer parte do texto após o verbo
  const value = extractValue(afterVerb);
  if (!value) return null;

  // Extrai item (somente para compras)
  const item = isCompra ? extractItem(afterVerb, clothingTypes) : null;

  return { name, type: isCompra ? 'compra' : 'pagamento', value, item };
}

// Mantido para compatibilidade
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
