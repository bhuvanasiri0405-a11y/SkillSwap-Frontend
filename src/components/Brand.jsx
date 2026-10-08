import { Link } from "react-router-dom";

function Brand({ light = false, to = "/" }) {
  return (
    <Link to={to} className={`brand ${light ? "brand-light" : ""}`}>
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
      </span>
      Skill Swap
    </Link>
  );
}

export default Brand;