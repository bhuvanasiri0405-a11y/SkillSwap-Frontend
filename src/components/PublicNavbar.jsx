import { Link } from "react-router-dom";
import Brand from "./Brand";

function PublicNavbar() {
  const loggedIn = Boolean(localStorage.getItem("token"));

  return (
    <header className="site-nav">
      <div className="site-nav-inner">
        <Brand />
        <nav className="site-links">
          <a href="#how" className="hide-sm">How it works</a>
          <a href="#why" className="hide-sm">Why swap</a>
          {loggedIn ? (
            <Link to="/dashboard" className="btn btn-sm">Go to dashboard</Link>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/register" className="btn btn-sm">Get started</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default PublicNavbar;