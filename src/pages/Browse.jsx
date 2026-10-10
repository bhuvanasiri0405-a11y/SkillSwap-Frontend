import { useEffect, useState } from "react";
import api from "../api/axios";

function Browse() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [skills, setSkills] = useState([]);
  const [mySkills, setMySkills] = useState([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("ALL");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingRequest, setSendingRequest] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get("/skills"),
      api.get("/skills/my-skills")
    ])
      .then(([skillsRes, mySkillsRes]) => {
        setSkills(skillsRes.data);
        setMySkills(mySkillsRes.data);
      })
      .catch(() => {
        setError("Could not load skills. Check that the backend is running.");
      })
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

  const myTeachSkills = mySkills.filter(
    (skill) => skill.type === "TEACH"
  );

  const myUserId = mySkills[0]?.ownerId;

  const handleRequestSwap = async (requestedSkill) => {
    setError("");
    setSuccess("");

    if (!myUserId) {
      setError("Could not identify your user account.");
      return;
    }

    if (myTeachSkills.length === 0) {
      setError("Please add a skill you can teach before requesting a swap.");
      return;
    }

    const offeredSkill = myTeachSkills[0];

    if (requestedSkill.ownerId === myUserId) {
      setError("You cannot request a swap with yourself.");
      return;
    }

    try {
      setSendingRequest(requestedSkill.id);

      await api.post("/swaps", null, {
        params: {
          senderId: myUserId,
          receiverId: requestedSkill.ownerId,
          offeredSkillId: offeredSkill.id,
          requestedSkillId: requestedSkill.id
        }
      });

      setSuccess(
        `Swap request sent to ${requestedSkill.ownerName} for ${requestedSkill.name}.`
      );
    } catch (err) {
      const message = err.response?.data;

      setError(
        typeof message === "string"
          ? message
          : "Could not send the swap request."
      );
    } finally {
      setSendingRequest(null);
    }
  };

  return (
    <div>
      <h1 className="page-title">Browse skills</h1>

      <p className="page-subtitle">
        Find people who teach what you want to learn.
      </p>

      <div className="toolbar">
        <input
          aria-label="Search skills"
          placeholder="Search by skill, category or person"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          aria-label="Filter by type"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="ALL">All skills</option>
          <option value="TEACH">Can teach</option>
          <option value="LEARN">Wants to learn</option>
        </select>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="alert">
          {success}
        </div>
      )}

      {loading && (
        <p className="empty">
          Loading skills...
        </p>
      )}

      {!loading && !error && filtered.length === 0 && (
        <p className="empty">
          No skills match your search. Try a different word or filter.
        </p>
      )}

      <div className="grid grid-3">
        {filtered.map((s) => {
          const isMySkill = s.ownerId === myUserId;
          const canRequest =
            s.type === "TEACH" && !isMySkill;

          return (
            <div
              className={`card skill-card ${
                s.type === "TEACH"
                  ? "card-teach"
                  : "card-learn"
              }`}
              key={s.id}
            >
              <h4>{s.name}</h4>

              <div>
                <span
                  className={`badge ${
                    s.type === "TEACH"
                      ? "badge-teach"
                      : "badge-learn"
                  }`}
                >
                  {s.type === "TEACH"
                    ? "Teaches"
                    : "Wants to learn"}
                </span>

                <span className="badge badge-cat">
                  {s.category}
                </span>
              </div>

              <div className="owner">
                <span className="avatar">
                  {s.ownerName?.[0]?.toUpperCase()}
                </span>

                {isMySkill ? "You" : s.ownerName}
              </div>

              {canRequest && (
                <button
                  className="btn"
                  type="button"
                  onClick={() => handleRequestSwap(s)}
                  disabled={sendingRequest === s.id}
                >
                  {sendingRequest === s.id
                    ? "Sending..."
                    : "Request Swap"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Browse;