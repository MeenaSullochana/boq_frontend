import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Eye, Trash2, FileDown } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const inr = (n) =>
  Number(n || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export default function BoqList() {
  const { isAdmin } = useAuth();
  const [data, setData] = useState({ items: [], total: 0 });
  const [q, setQ] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const load = async () => {
    try {
      const { data: res } = await api.get('/boq', {
        params: {
          q: q || undefined,
          month: month || undefined,
          year: year || undefined,
          limit: 50,
        },
      });
      setData(res);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load BOQ');
    }
  };

  useEffect(() => {
    load();
  }, []);

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

      <div className="filters">
        <input placeholder="Search client / bill no" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="">All months</option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(2000, i, 1).toLocaleString('en', { month: 'long' })}
            </option>
          ))}
        </select>
        <select value={year} onChange={(e) => setYear(e.target.value)}>
          {[2024, 2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <button className="btn btn-secondary" onClick={load}>Filter</button>
      </div>

      <div className="panel">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Bill No</th>
                <th>Client</th>
                <th>Location</th>
                <th>Total</th>
                <th>Created</th>
                {isAdmin && <th>By</th>}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((b) => (
                <tr key={b._id}>
                  <td><strong>{b.billNo}</strong></td>
                  <td>{b.clientName}</td>
                  <td>{b.location}</td>
                  <td>{inr(b.totalWithoutGst)}</td>
                  <td>{new Date(b.createdAt).toLocaleDateString('en-IN')}</td>
                  {isAdmin && <td>{b.createdBy?.name || '—'}</td>}
                  <td>
                    <div className="actions">
                      <Link className="btn btn-secondary btn-sm" to={`/boq/${b._id}`}>
                        <Eye size={14} />
                      </Link>
                      <button className="btn btn-secondary btn-sm" onClick={() => download(b._id, 'pdf')}>
                        PDF
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => download(b._id, 'excel')}>
                        <FileDown size={14} />
                      </button>
                      {isAdmin && (
                        <>
                          <Link className="btn btn-secondary btn-sm" to={`/boq/${b._id}/edit`}>Edit</Link>
                          <button className="btn btn-danger btn-sm" onClick={() => remove(b._id)}>
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!data.items.length && (
                <tr><td colSpan={isAdmin ? 7 : 6} className="empty">No BOQ bills found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
