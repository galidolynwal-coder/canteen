import { useCallback, useState } from 'react';

export function Page({ title, subtitle, children }) {
  return (
    <section className="page">
      <div className="page-title">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function Panel({ title, children }) {
  return <section className="panel"><h3>{title}</h3>{children}</section>;
}

export function StatsGrid({ cards }) {
  return (
    <div className="stats-grid">
      {cards.map(([label, value]) => <InfoCard key={label} title={label} value={value} />)}
    </div>
  );
}

export function InfoCard({ title, value }) {
  return <div className="info-card"><span>{title}</span><strong>{value}</strong></div>;
}

export function Toolbar({ query, setQuery, children, placeholder = 'Search', type = 'search' }) {
  return (
    <div className="toolbar">
      <input type={type} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} />
      {children}
    </div>
  );
}

export function CrudForm({ title, onSubmit, children }) {
  return <form className="crud-form" onSubmit={onSubmit}><h3>{title}</h3>{children}</form>;
}

export function Actions({ onEdit, onDelete }) {
  return (
    <div className="actions">
      <button onClick={onEdit}>Edit</button>
      <button className="danger" onClick={onDelete}>Delete</button>
    </div>
  );
}

export function SimpleTable({ headers, rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{headers.map((item) => <th key={item}>{item}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}
        </tbody>
      </table>
      {!rows.length ? <EmptyState text="No records found." /> : null}
    </div>
  );
}

export function EmptyState({ text }) {
  return <div className="empty-state">{text}</div>;
}

export function BarChart({ data, formatValue }) {
  const max = Math.max(...data.map((item) => item.total), 1);
  return (
    <div className="bar-chart">
      {data.map((item) => (
        <div className="bar-item" key={item.shift}>
          <span>{item.shift}</span>
          <div><i style={{ width: `${Math.max((item.total / max) * 100, 4)}%` }} /></div>
          <strong>{formatValue ? formatValue(item.total) : item.total}</strong>
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState('');

  const notify = useCallback((message) => {
    setToast(message);
    window.clearTimeout(window.__canteenToast);
    window.__canteenToast = window.setTimeout(() => setToast(''), 2600);
  }, []);

  return { toast, notify };
}
