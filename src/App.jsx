import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Categories from './pages/Categories';
import Brands from './pages/Brands';
import Products from './pages/Products';
import BoqList from './pages/BoqList';
import BoqForm from './pages/BoqForm';
import BoqView from './pages/BoqView';
import Users from './pages/Users';

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="boot-screen">Loading Orange Interior…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="categories" element={<Categories />} />
        <Route path="brands" element={<Brands />} />
        <Route path="products" element={<Products />} />
        <Route path="boq" element={<BoqList />} />
        <Route path="boq/new" element={<BoqForm />} />
        <Route path="boq/:id" element={<BoqView />} />
        <Route
          path="boq/:id/edit"
          element={
            <PrivateRoute roles={['superadmin']}>
              <BoqForm />
            </PrivateRoute>
          }
        />
        <Route
          path="users"
          element={
            <PrivateRoute roles={['superadmin']}>
              <Users />
            </PrivateRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
