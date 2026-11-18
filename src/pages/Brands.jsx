import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Upload, Download } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import DataTable from '../components/DataTable';

export default function Brands() {
  const { isAdmin } = useAuth();
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/brands', {
        params: { page, limit: pageSize, q: q || undefined },
      });
      setList(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, q]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditId(null);
    setName('');
    setDescription('');
    setOpen(true);
  };

  const openEdit = (b) => {
    setEditId(b._id);
    setName(b.name);
    setDescription(b.description || '');
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        if (!isAdmin) return toast.error('Only superadmin can edit');
        await api.put(`/brands/${editId}`, { name, description });
        toast.success('Brand updated');
      } else {
        await api.post('/brands', { name, description });
        toast.success('Brand created');
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  const remove = async (id) => {
    if (!isAdmin) return toast.error('Only superadmin can delete');
    if (!confirm('Delete this brand?')) return;
    try {
      await api.delete(`/brands/${id}`);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const onImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const { data } = await api.post('/brands/import', fd);
      toast.success(data.message);
      if (data.errors?.length) toast.error(data.errors.slice(0, 3).join('\n'));
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      e.target.value = '';
    }
  };

  const applySearch = () => {
    setPage(1);
    setQ(search.trim());
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (b) => <strong>{b.name}</strong>,
    },
    {
      key: 'description',
      label: 'Description',
      render: (b) => b.description || '—',
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (b) => (
        <div className="actions">
          {isAdmin ? (
            <>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(b)}>
                <Pencil size={14} />
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(b._id)}>
                <Trash2 size={14} />
              </button>
            </>
          ) : (
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>Create only</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Brands</h1>
          <p>Create brands once, then optionally attach them to products. Excel import supported.</p>
        </div>
        <div className="actions">
          <a className="btn btn-secondary btn-sm" href="/samples/sample-brands.xlsx" download>
            <Download size={16} /> Sample Excel
          </a>
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
            <Upload size={16} /> Excel import
            <input type="file" accept=".xlsx,.xls,.csv" hidden onChange={onImport} />
          </label>
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> Add brand
          </button>
        </div>
      </div>

      <div className="panel">
        <DataTable
          columns={columns}
          rows={list}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
          search={search}
          onSearchChange={setSearch}
          onSearch={applySearch}
          searchPlaceholder="Search brand name…"
          loading={loading}
          empty="No brands yet"
        />
      </div>

      <Modal open={open} onClose={() => setOpen(false)} as="form" onSubmit={save}>
        <h3 className="modal-head">{editId ? 'Edit brand' : 'Add brand'}</h3>
        <div className="modal-body">
          <div className="form-grid">
            <label className="field full">
              Brand name
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label className="field full">
              Description
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
          </div>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn btn-primary" type="submit">Save</button>
        </div>
      </Modal>
    </div>
  );
}
