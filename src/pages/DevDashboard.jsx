import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { formatCurrency } from '../utils/speechParser';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                     'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const PURPLE = '#7c3aed';
const PURPLE_LIGHT = '#a78bfa';

function tooltipCurrency({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      <p className="chart-tooltip-val">{formatCurrency(payload[0].value)}</p>
      <p className="chart-tooltip-count">{payload[0].payload.count} venda{payload[0].payload.count !== 1 ? 's' : ''}</p>
    </div>
  );
}

export default function DevDashboard({ customers }) {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Todas as compras (não pagamentos)
  const purchases = useMemo(
    () => customers.flatMap((c) => c.transactions.filter((tx) => tx.type === 'compra')),
    [customers]
  );

  // ── Vendas por mês (últimos 12 meses) ────────────────────────
  const monthData = useMemo(() => {
    const map = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      map[key] = { month: MONTH_NAMES[d.getMonth()], total: 0, count: 0, year: d.getFullYear(), mIdx: d.getMonth() };
    }
    purchases.forEach((tx) => {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (map[key]) { map[key].total += tx.value; map[key].count++; }
    });
    return Object.values(map);
  }, [purchases]);

  // ── Vendas por dia do mês selecionado ────────────────────────
  const dayData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1, label: String(i + 1), total: 0, count: 0,
    }));
    purchases
      .filter((tx) => {
        const d = new Date(tx.date);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      })
      .forEach((tx) => {
        const day = new Date(tx.date).getDate();
        days[day - 1].total += tx.value;
        days[day - 1].count++;
      });
    return days;
  }, [purchases, selectedMonth, selectedYear]);

  // Meses disponíveis (últimos 12) para o seletor
  const availableMonths = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      return { label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`, month: d.getMonth(), year: d.getFullYear() };
    }).reverse();
  }, []);

  const totalMonth   = dayData.reduce((s, d) => s + d.total, 0);
  const totalYear    = monthData.reduce((s, d) => s + d.total, 0);
  const bestMonth    = [...monthData].sort((a, b) => b.total - a.total)[0];
  const bestDay      = [...dayData].sort((a, b) => b.total - a.total)[0];

  return (
    <div className="dev-dashboard">

      {/* ── Resumo ────────────────────────────────────────────── */}
      <div className="dash-kpi-row">
        <div className="dash-kpi">
          <span className="dash-kpi-value">{formatCurrency(totalYear)}</span>
          <span className="dash-kpi-label">Vendas nos últimos 12 meses</span>
        </div>
        <div className="dash-kpi">
          <span className="dash-kpi-value">{formatCurrency(totalMonth)}</span>
          <span className="dash-kpi-label">Vendas em {MONTH_NAMES[selectedMonth]}/{selectedYear}</span>
        </div>
        {bestMonth && bestMonth.total > 0 && (
          <div className="dash-kpi highlight">
            <span className="dash-kpi-value">{bestMonth.month}</span>
            <span className="dash-kpi-label">Mês com mais vendas</span>
          </div>
        )}
        {bestDay && bestDay.total > 0 && (
          <div className="dash-kpi highlight">
            <span className="dash-kpi-value">Dia {bestDay.day}</span>
            <span className="dash-kpi-label">Dia com mais vendas ({MONTH_NAMES[selectedMonth]})</span>
          </div>
        )}
      </div>

      {/* ── Vendas por mês ───────────────────────────────────── */}
      <div className="dash-chart-card">
        <h3 className="dash-chart-title">📅 Vendas por mês (últimos 12 meses)</h3>
        {monthData.every((d) => d.total === 0) ? (
          <p className="dash-empty">Nenhuma venda registrada nesse período.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `R$${v}`} tick={{ fontSize: 11 }} width={56} />
              <Tooltip content={tooltipCurrency} />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {monthData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.mIdx === now.getMonth() && entry.year === now.getFullYear()
                      ? PURPLE : PURPLE_LIGHT}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Vendas por dia ───────────────────────────────────── */}
      <div className="dash-chart-card">
        <div className="dash-chart-header">
          <h3 className="dash-chart-title">📆 Vendas por dia do mês</h3>
          <select
            className="dash-month-select"
            value={`${selectedYear}-${selectedMonth}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split('-').map(Number);
              setSelectedYear(y); setSelectedMonth(m);
            }}
          >
            {availableMonths.map((m) => (
              <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        {dayData.every((d) => d.total === 0) ? (
          <p className="dash-empty">Nenhuma venda em {MONTH_NAMES[selectedMonth]}/{selectedYear}.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dayData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={1} />
              <YAxis tickFormatter={(v) => `R$${v}`} tick={{ fontSize: 11 }} width={56} />
              <Tooltip content={tooltipCurrency} />
              <Bar dataKey="total" fill={PURPLE} radius={[4, 4, 0, 0]}>
                {dayData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.day === now.getDate() && selectedMonth === now.getMonth() && selectedYear === now.getFullYear()
                      ? PURPLE : PURPLE_LIGHT}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
