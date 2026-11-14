import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { assetUrl } from '../api';

const inr = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function ProductPicker({ products = [], onSelect, placeholder = 'Select product to add…' }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) =>
      [p.name, p.specification, p.brand, p.category?.name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    );
  }, [products, q]);

  return (
    <div className="product-picker" ref={wrapRef}>
      <button type="button" className="product-picker-trigger" onClick={() => setOpen((v) => !v)}>
        <span>{placeholder}</span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="product-picker-menu">
          <div className="product-picker-search">
            <Search size={14} />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products…"
            />
          </div>
          <div className="product-picker-list">
            {filtered.map((p) => (
              <button
                type="button"
                key={p._id}
                className="product-picker-item"
                onClick={() => {
                  onSelect?.(p._id);
                  setOpen(false);
                  setQ('');
                }}
              >
                {p.image ? (
                  <img src={assetUrl(p.image)} alt="" />
                ) : (
                  <div className="product-picker-ph">OI</div>
                )}
                <div className="product-picker-meta">
                  <strong>{p.name}</strong>
                  <span>
                    ₹ {inr(p.rate)} · {p.category?.name || 'Uncategorized'}
                    {p.brand ? ` · ${p.brand}` : ''}
                  </span>
                </div>
              </button>
            ))}
            {!filtered.length && <div className="product-picker-empty">No products found</div>}
          </div>
        </div>
      )}
    </div>
  );
}
