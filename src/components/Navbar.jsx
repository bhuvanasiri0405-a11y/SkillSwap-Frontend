import { NavLink, useNavigate } from "react-router-dom";
import Brand from "./Brand";

function Navbar() {
  const navigate = useNavigate();
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    localStorage.removeItem("user");
  }
  const initial = user?.name?.[0]?.toUpperCase() || "?";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <header className="site-nav">
      <div className="site-nav-inner">
        <Brand to="/dashboard" />
        <nav className="site-links">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/browse">Browse</NavLink>
          {user?.role === "ADMIN" && <NavLink to="/admin">Admin</NavLink>}
          <span className="nav-avatar" title={user?.name}>{initial}</span>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Log out</button>
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
