import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const inr = (n) =>
  Number(n || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const load = async () => {
    try {
      const { data } = await api.get('/dashboard/stats');
      setStats(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load dashboard');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const downloadMonth = async () => {
    try {
      const { data } = await api.get('/dashboard/export', { params: { month, year } });
      const rows = data.map((b) => ({
        BillNo: b.billNo,
        Client: b.clientName,
        Location: b.location,
        Total: b.totalWithoutGst,
        Discount: b.discount,
        Date: new Date(b.createdAt).toLocaleDateString('en-IN'),
        CreatedBy: b.createdBy?.name || '',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'BOQ');
      XLSX.writeFile(wb, `boq-${year}-${month}.xlsx`);
      toast.success('Download ready');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Export failed');
    }
  };

  if (!stats) return <div className="panel">Loading dashboard…</div>;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p>Monthly performance, BOQ volume, and studio catalog health.</p>
        </div>
        <div className="actions">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i, 1).toLocaleString('en', { month: 'long' })}
              </option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary" onClick={downloadMonth}>
            <Download size={16} /> Download month
          </button>
        </div>
      </div>

      <div className="grid-stats">
        <div className="stat-card">
          <div className="label">Total BOQ</div>
          <div className="value">{stats.totalBoq}</div>
        </div>
        <div className="stat-card">
          <div className="label">This month</div>
          <div className="value">{stats.monthBoq}</div>
        </div>
        <div className="stat-card">
          <div className="label">Month value</div>
          <div className="value" style={{ fontSize: '1.35rem' }}>{inr(stats.monthRevenue)}</div>
        </div>
        <div className="stat-card">
          <div className="label">{isAdmin ? 'Products' : 'Your role'}</div>
          <div className="value">{isAdmin ? stats.products : 'Staff'}</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">
          <h2>Monthly BOQ value ({new Date().getFullYear()})</h2>
        </div>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.monthlyChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="label" />
              <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v) => inr(v)} />
              <Bar dataKey="total" fill="#E85D04" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">
          <h2>Recent BOQ</h2>
          <Link to="/boq" className="btn btn-secondary btn-sm">View all</Link>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Bill No</th>
                <th>Client</th>
                <th>Location</th>
                <th>Total</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent?.length ? (
                stats.recent.map((b) => (
                  <tr key={b._id}>
                    <td><Link to={`/boq/${b._id}`}>{b.billNo}</Link></td>
                    <td>{b.clientName}</td>
                    <td>{b.location}</td>
                    <td>{inr(b.totalWithoutGst)}</td>
                    <td>{new Date(b.createdAt).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="empty">No bills yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
