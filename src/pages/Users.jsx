import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import api from '../api';
import Modal from '../components/Modal';
import DataTable from '../components/DataTable';

const empty = { name: '', email: '', password: '', role: 'staff', phone: '' };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users', {
        params: {
          page,
          limit: pageSize,
          q: q || undefined,
          role: role || undefined,
        },
      });
      setUsers(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, q, role]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', form);
      toast.success('User created');
      setOpen(false);
      setForm(empty);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete user?')) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const applySearch = () => {
    setPage(1);
    setQ(search.trim());
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    {
      key: 'role',
      label: 'Role',
      render: (u) => <span className="badge">{u.role}</span>,
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (u) => u.phone || '—',
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (u) => (u.isActive ? 'Active' : 'Inactive'),
    },
    {
      key: 'actions',
      label: '',
      render: (u) => (
        <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(u._id)}>
          <Trash2 size={14} />
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Users</h1>
          <p>Superadmin manages staff accounts for BOQ creation.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
          <Plus size={16} /> Add user
        </button>
      </div>

      <div className="panel">
        <DataTable
          columns={columns}
          rows={users}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
          search={search}
          onSearchChange={setSearch}
          onSearch={applySearch}
          searchPlaceholder="Search name, email, phone…"
          loading={loading}
          empty="No users found"
          filters={(
            <select
              value={role}
              onChange={(e) => { setRole(e.target.value); setPage(1); }}
            >
              <option value="">All roles</option>
              <option value="staff">Staff</option>
              <option value="superadmin">Superadmin</option>
            </select>
          )}
        />
      </div>

      <Modal open={open} onClose={() => setOpen(false)} as="form" onSubmit={save}>
        <h3 className="modal-head">Add user</h3>
        <div className="modal-body">
          <div className="form-grid">
            <label className="field">
              Name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label className="field">
              Email
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </label>
            <label className="field">
              Password
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </label>
            <label className="field">
              Role
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="staff">Staff</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </label>
            <label className="field full">
              Phone
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
          </div>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn btn-primary" type="submit">Create</button>
        </div>
      </Modal>
    </div>
  );
}
