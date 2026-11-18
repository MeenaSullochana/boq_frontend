import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Eye, Trash2, FileDown } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import DataTable from '../components/DataTable';

const inr = (n) =>
  Number(n || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export default function BoqList() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/boq', {
        params: {
          page,
          limit: pageSize,
          q: q || undefined,
          month: month || undefined,
          year: year || undefined,
        },
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load BOQ');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, q, month, year]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (id) => {
    if (!isAdmin) return;
    if (!confirm('Delete this BOQ?')) return;
    try {
      await api.delete(`/boq/${id}`);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const download = async (id, type) => {
    try {
      const res = await api.get(`/boq/${id}/${type}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `boq-${id}.${type === 'pdf' ? 'pdf' : 'xlsx'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  };

  const applySearch = () => {
    setPage(1);
    setQ(search.trim());
  };

  const columns = [
    {
      key: 'billNo',
      label: 'Bill No',
      render: (b) => <strong>{b.billNo}</strong>,
    },
    { key: 'clientName', label: 'Client' },
    { key: 'location', label: 'Location' },
    {
      key: 'total',
      label: 'Total',
      align: 'right',
      render: (b) => inr(b.totalWithoutGst),
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (b) => new Date(b.createdAt).toLocaleDateString('en-IN'),
    },
    ...(isAdmin
      ? [{
          key: 'createdBy',
          label: 'By',
          render: (b) => b.createdBy?.name || '—',
        }]
      : []),
    {
      key: 'actions',
      label: 'Actions',
      render: (b) => (
        <div className="actions">
          <Link className="btn btn-secondary btn-sm" to={`/boq/${b._id}`}>
            <Eye size={14} />
          </Link>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => download(b._id, 'pdf')}>
            PDF
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => download(b._id, 'excel')}>
            <FileDown size={14} />
          </button>
          {isAdmin && (
            <>
              <Link className="btn btn-secondary btn-sm" to={`/boq/${b._id}/edit`}>Edit</Link>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(b._id)}>
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>BOQ Bills</h1>
          <p>Create quotations, filter by month, and export PDF / Excel.</p>
        </div>
        <Link to="/boq/new" className="btn btn-primary">
          <Plus size={16} /> Create BOQ
        </Link>
      </div>

      <div className="panel">
        <DataTable
          columns={columns}
          rows={items}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
          search={search}
          onSearchChange={setSearch}
          onSearch={applySearch}
          searchPlaceholder="Search client / bill no / location…"
          loading={loading}
          empty="No BOQ bills found"
          filters={(
            <>
              <select
                value={month}
                onChange={(e) => { setMonth(e.target.value); setPage(1); }}
              >
                <option value="">All months</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i, 1).toLocaleString('en', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => { setYear(e.target.value); setPage(1); }}
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </>
          )}
        />
      </div>
    </div>
  );
}
