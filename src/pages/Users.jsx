import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import api from '../api';
import Modal from '../components/Modal';

const empty = { name: '', email: '', password: '', role: 'staff', phone: '' };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data } = await api.get('/users');
    setUsers(data);
  };

  useEffect(() => {
    load().catch((e) => toast.error(e.response?.data?.message || 'Failed'));
  }, []);

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

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Users</h1>
          <p>Superadmin manages staff accounts for BOQ creation.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>
          <Plus size={16} /> Add user
        </button>
      </div>

      <div className="panel">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td><span className="badge">{u.role}</span></td>
                  <td>{u.phone || '—'}</td>
                  <td>{u.isActive ? 'Active' : 'Inactive'}</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(u._id)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
          <button className="btn btn-primary">Create</button>
        </div>
      </Modal>
    </div>
  );
}
