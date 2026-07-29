import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

/**
 * AdminRoute — hard security guard for all /admin/* routes.
 * Redirects guests to /admin/login, non-Admins to /.
 * Returns HTTP 403 behaviour by blocking access entirely.
 */
const AdminRoute = ({ children }) => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  if (!isAuthenticated || !user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (user.role !== 'Admin') {
    // Non-admin users: redirect to home with 403 indication
    return <Navigate to="/?forbidden=true" replace />;
  }

  return children;
};

export default AdminRoute;
