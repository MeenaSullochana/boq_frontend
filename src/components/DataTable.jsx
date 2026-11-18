import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search } from 'lucide-react';

const PAGE_SIZES = [10, 25, 50, 100];

function pageWindow(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
  const sorted = [...set].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push('…');
    out.push(sorted[i]);
  }
  return out;
}

/**
 * Premium list table with search, filters slot, page size, and pagination.
 */
export default function DataTable({
  columns = [],
  rows = [],
  total = 0,
  page = 1,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  search = '',
  onSearchChange,
  onSearch,
  searchPlaceholder = 'Search…',
  filters = null,
  loading = false,
  empty = 'No records found',
  toolbarRight = null,
}) {
  const pages = Math.max(1, Math.ceil((Number(total) || 0) / (Number(pageSize) || 10)));
  const safePage = Math.min(Math.max(1, Number(page) || 1), pages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);
  const windowPages = pageWindow(safePage, pages);

  const submitSearch = (e) => {
    e?.preventDefault?.();
    onSearch?.();
  };

  return (
    <div className="dt">
      <div className="dt-toolbar">
        <form className="dt-search" onSubmit={submitSearch}>
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={searchPlaceholder}
          />
          <button type="submit" className="btn btn-secondary btn-sm">
            Search
          </button>
        </form>
        <div className="dt-filters">
          {filters}
          {toolbarRight}
        </div>
      </div>

      <div className="dt-meta">
        <span>
          Showing <b>{from}</b>–<b>{to}</b> of <b>{total}</b>
        </span>
        <label className="dt-pagesize">
          Rows
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="table-wrap dt-table-wrap">
        <table className="data dt-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={col.align === 'right' ? 'r' : col.align === 'center' ? 'c' : ''}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="empty">Loading…</td>
              </tr>
            ) : rows.length ? (
              rows.map((row, idx) => (
                <tr key={row._id || row.id || idx}>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={col.align === 'right' ? 'r' : col.align === 'center' ? 'c' : ''}
                    >
                      {col.render ? col.render(row, idx) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="empty">{empty}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="dt-pager">
        <div className="dt-pager-btns">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={safePage <= 1 || loading}
            onClick={() => onPageChange?.(1)}
            title="First"
          >
            <ChevronsLeft size={14} />
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={safePage <= 1 || loading}
            onClick={() => onPageChange?.(safePage - 1)}
            title="Previous"
          >
            <ChevronLeft size={14} />
          </button>
          {windowPages.map((p, i) =>
            p === '…' ? (
              <span key={`e-${i}`} className="dt-ellipsis">…</span>
            ) : (
              <button
                key={p}
                type="button"
                className={`btn btn-sm ${p === safePage ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => onPageChange?.(p)}
                disabled={loading}
              >
                {p}
              </button>
            )
          )}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={safePage >= pages || loading}
            onClick={() => onPageChange?.(safePage + 1)}
            title="Next"
          >
            <ChevronRight size={14} />
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={safePage >= pages || loading}
            onClick={() => onPageChange?.(pages)}
            title="Last"
          >
            <ChevronsRight size={14} />
          </button>
        </div>
        <span className="dt-page-label">Page {safePage} / {pages}</span>
      </div>
    </div>
  );
}
