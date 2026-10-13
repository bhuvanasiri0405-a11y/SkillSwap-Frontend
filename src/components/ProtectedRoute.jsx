import { Navigate, Outlet } from "react-router-dom";

function ProtectedRoute({ requiredRole }) {
  const token = localStorage.getItem("token");

  if (!token) {
    localStorage.removeItem("user");
    return <Navigate to="/login" replace />;
  }

  let user;
  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
