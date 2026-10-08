import { useEffect, useState } from "react";
import api from "../api/axios";

function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user"));
  const firstName = user?.name?.split(" ")[0];
  const [skills, setSkills] = useState([]);
  const [form, setForm] = useState({ name: "", category: "", type: "TEACH" });
  const [error, setError] = useState("");

  const refresh = async () => {
    try {
      const res = await api.get("/skills/my-skills");
      setSkills(res.data);
    } catch {
      setError("Could not load your skills. Check that the backend is running.");
    }
  };

  useEffect(() => {
    api
      .get("/skills/my-skills")
      .then((res) => setSkills(res.data))
      .catch(() => setError("Could not load your skills. Check that the backend is running."));
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/skills", form);
      setForm({ name: "", category: "", type: "TEACH" });
      refresh();
    } catch {
      setError("Could not add the skill. Try again.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/skills/${id}`);
      refresh();
    } catch {
      setError("Could not delete the skill. Try again.");
    }
  };

  const renderCard = (title, type, badgeClass, cardClass, emptyText) => {
    const list = skills.filter((s) => s.type === type);
    return (
      <div className={`card ${cardClass}`}>
        <h3 className="card-title">
          {title} <span className={`badge ${badgeClass}`}>{list.length}</span>
        </h3>
        {list.length === 0 && <p className="empty">{emptyText}</p>}
        {list.map((s) => (
          <div className="skill-item" key={s.id}>
            <div>
              <div className="skill-name">{s.name}</div>
              <div className="skill-meta">{s.category}</div>
            </div>
            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}>
              Delete
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <h1 className="page-title">Hi {firstName}, what will you swap today?</h1>
      <p className="page-subtitle">Keep your teaching and learning lists up to date so others can find you.</p>

      <div className="card mb">
        <h3 className="card-title">Add a skill</h3>
        {error && <div className="alert alert-error">{error}</div>}
        <form className="skill-form" onSubmit={handleAdd}>
          <div className="form-group">
            <label htmlFor="skill-name">Skill name</label>
            <input id="skill-name" name="name" value={form.name} onChange={handleChange} placeholder="Guitar" required />
          </div>
          <div className="form-group">
            <label htmlFor="skill-category">Category</label>
            <input id="skill-category" name="category" value={form.category} onChange={handleChange} placeholder="Music" required />
          </div>
          <div className="form-group">
            <label htmlFor="skill-type">I want to</label>
            <select id="skill-type" name="type" value={form.type} onChange={handleChange}>
              <option value="TEACH">Teach this</option>
              <option value="LEARN">Learn this</option>
            </select>
          </div>
          <button className="btn" type="submit">Add skill</button>
        </form>
      </div>

      <div className="grid grid-2">
        {renderCard("I can teach", "TEACH", "badge-teach", "card-teach", "Nothing here yet. Add a skill above so others can find you.")}
        {renderCard("I want to learn", "LEARN", "badge-learn", "card-learn", "Nothing here yet. Add what you would love to learn.")}
      </div>
    </div>
  );
}

export default Dashboard;