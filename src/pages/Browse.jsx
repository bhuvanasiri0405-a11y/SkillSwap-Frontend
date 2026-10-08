import { useEffect, useState } from "react";
import api from "../api/axios";

function Browse() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [skills, setSkills] = useState([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("ALL");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/skills")
      .then((res) => setSkills(res.data))
      .catch(() => setError("Could not load skills. Check that the backend is running."))
      .finally(() => setLoading(false));
  }, []);

  const q = search.toLowerCase();
  const filtered = skills.filter((s) => {
    const matchesType = type === "ALL" || s.type === type;
    const matchesSearch =
      s.name.toLowerCase().includes(q) ||
      (s.category || "").toLowerCase().includes(q) ||
      s.ownerName.toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  return (
    <div>
      <h1 className="page-title">Browse skills</h1>
      <p className="page-subtitle">Find people who teach what you want to learn.</p>

      <div className="toolbar">
        <input
          aria-label="Search skills"
          placeholder="Search by skill, category or person"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select aria-label="Filter by type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="ALL">All skills</option>
          <option value="TEACH">Can teach</option>
          <option value="LEARN">Wants to learn</option>
        </select>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p className="empty">Loading skills...</p>}
      {!loading && !error && filtered.length === 0 && (
        <p className="empty">No skills match your search. Try a different word or filter.</p>
      )}

      <div className="grid grid-3">
        {filtered.map((s) => (
          <div
            className={`card skill-card ${s.type === "TEACH" ? "card-teach" : "card-learn"}`}
            key={s.id}
          >
            <h4>{s.name}</h4>
            <div>
              <span className={`badge ${s.type === "TEACH" ? "badge-teach" : "badge-learn"}`}>
                {s.type === "TEACH" ? "Teaches" : "Wants to learn"}
              </span>
              <span className="badge badge-cat">{s.category}</span>
            </div>
            <div className="owner">
              <span className="avatar">{s.ownerName?.[0]?.toUpperCase()}</span>
              {s.ownerName === user?.name ? "You" : s.ownerName}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Browse;