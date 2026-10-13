
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import Navbar from "../components/Navbar";

const PAGE_SIZE = 20;

function Pagination({ page, pageCount, totalElements, onChange }) {
  return (
    <div className="admin-pagination" aria-label="Table pagination">
      <span>{totalElements} results · Page {page + 1} of {Math.max(1, pageCount)}</span>
      <div>
        <button className="btn btn-ghost btn-sm" type="button" onClick={() => onChange(page - 1)} disabled={page <= 0}>Previous</button>
        <button className="btn btn-ghost btn-sm" type="button" onClick={() => onChange(page + 1)} disabled={page + 1 >= pageCount}>Next</button>
      </div>
    </div>
  );
}

function getErrorMessage(error, fallback) {
  const data = error.response?.data;
  if (typeof data === "string") return data;
  return data?.message || data?.detail || fallback;
}

function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState({ content: [], page: 0, size: PAGE_SIZE, totalElements: 0, totalPages: 0 });
  const [skills, setSkills] = useState({ content: [], page: 0, size: PAGE_SIZE, totalElements: 0, totalPages: 0 });
  const [auditLogs, setAuditLogs] = useState({ content: [], page: 0, size: PAGE_SIZE, totalElements: 0, totalPages: 0 });
  const [loading, setLoading] = useState({ stats: true, users: true, skills: true, audit: true });
  const [errors, setErrors] = useState({});
  const [userSearch, setUserSearch] = useState("");
  const [userSearchInput, setUserSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [skillSearch, setSkillSearch] = useState("");
  const [skillSearchInput, setSkillSearchInput] = useState("");
  const [skillCategory, setSkillCategory] = useState("");
  const [skillType, setSkillType] = useState("");
  const [auditAction, setAuditAction] = useState("");
  const [auditEntityType, setAuditEntityType] = useState("");
  const [auditActorId, setAuditActorId] = useState("");
  const [userPage, setUserPage] = useState(0);
  const [skillPage, setSkillPage] = useState(0);
  const [auditPage, setAuditPage] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [busyAction, setBusyAction] = useState("");
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setUserSearch(userSearchInput.trim());
      setUserPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearchInput]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSkillSearch(skillSearchInput.trim());
      setSkillPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [skillSearchInput]);

  useEffect(() => {
    let active = true;
    setLoading({ stats: true, users: true, skills: true, audit: true });
    setErrors({});
    const params = (values) => Object.fromEntries(Object.entries(values).filter(([, value]) => value !== "" && value != null));
    const requests = [
      ["stats", api.get("/admin/stats"), setStats, "Unable to load platform analytics."],
      ["users", api.get("/admin/users/page", { params: params({ page: userPage, size: PAGE_SIZE, search: userSearch, role: roleFilter === "ALL" ? "" : roleFilter }) }), setUsers, "Unable to load users."],
      ["skills", api.get("/admin/skills/page", { params: params({ page: skillPage, size: PAGE_SIZE, search: skillSearch, category: skillCategory, type: skillType }) }), setSkills, "Unable to load skills."],
      ["audit", api.get("/admin/audit-logs", { params: params({ page: auditPage, size: PAGE_SIZE, action: auditAction, entityType: auditEntityType, actorId: auditActorId }) }), setAuditLogs, "Unable to load audit logs."]
    ];

    Promise.allSettled(requests.map(([, request]) => request)).then((results) => {
      if (!active) return;
      results.forEach((result, index) => {
        const [key, , setter, fallback] = requests[index];
        if (result.status === "fulfilled") {
          setter(result.value.data);
          return;
        }
        const error = result.reason;
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login", { replace: true });
        }
        const errorText = error.response?.status === 401
          ? "Your session expired. Please sign in again."
          : error.response?.status === 403
            ? "Access denied. Administrator access is required."
            : getErrorMessage(error, fallback);
        setErrors((current) => ({ ...current, [key]: errorText }));
      });
      setLoading({ stats: false, users: false, skills: false, audit: false });
    });

    return () => { active = false; };
  }, [navigate, refreshKey, userPage, userSearch, roleFilter, skillPage, skillSearch, skillCategory, skillType, auditPage, auditAction, auditEntityType, auditActorId]);

  const runAction = async (key, successMessage, request) => {
    setBusyAction(key);
    setMessage("");
    setActionError("");
    try {
      await request();
      setMessage(successMessage);
      setUserPage(0);
      setSkillPage(0);
      setAuditPage(0);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login", { replace: true });
        setActionError("Your session expired. Please sign in again.");
      } else if (error.response?.status === 403) {
        setActionError("Access denied. Administrator access is required.");
      } else {
        setActionError(getErrorMessage(error, "The admin action could not be completed."));
      }
    } finally {
      setBusyAction("");
    }
  };

  const requestReason = (confirmText, promptText) => {
    if (!window.confirm(confirmText)) return null;
    const reason = window.prompt(promptText);
    if (reason === null) return null;
    if (!reason.trim()) {
      setActionError("A reason is required for this action.");
      return null;
    }
    return reason.trim();
  };

  const changeUserRole = (user) => {
    const role = user.role === "ADMIN" ? "USER" : "ADMIN";
    const reason = requestReason(`Change ${user.name}'s role to ${role}?`, "Enter the reason for this role change:");
    if (reason) runAction(`role-${user.id}`, "User role updated.", () => api.patch(`/admin/users/${user.id}/role`, { role, reason }));
  };

  const changeUserStatus = (user) => {
    const active = !user.active;
    const action = active ? "activate" : "deactivate";
    const reason = requestReason(`Are you sure you want to ${action} ${user.name}'s account?`, `Enter the reason to ${action} this account:`);
    if (reason) runAction(`status-${user.id}`, `Account ${active ? "activated" : "deactivated"}.`, () => api.patch(`/admin/users/${user.id}/status`, { active, reason }));
  };

  const moderateSkill = (skill) => {
    const reason = requestReason(`Moderate and deactivate “${skill.name}”?`, "Enter the reason for moderating this skill:");
    if (reason) runAction(`skill-${skill.id}`, "Skill moderated.", () => api.patch(`/admin/skills/${skill.id}/moderation`, { reason }));
  };

  const visibleUsers = users.content || [];
  const visibleSkills = skills.content || [];
  const visibleAuditLogs = auditLogs.content || [];

  const isLoading = Object.values(loading).some(Boolean);
  const analytics = [
    ["Total users", stats?.totalUsers], ["Active users", stats?.activeUsers],
    ["Total skills", stats?.totalSkills], ["Available skills", stats?.availableSkills],
    ["Swap requests", stats?.totalSwapRequests], ["Pending swaps", stats?.pendingRequests],
    ["Completed swaps", stats?.completedSwaps], ["Scheduled sessions", stats?.scheduledSessions]
  ];

  return (
    <>
      <Navbar />
      <main className="container admin-page">
        <header className="admin-header">
          <div>
            <h1 className="page-title">Admin Dashboard</h1>
            <p className="page-subtitle">Manage users and skills, and review platform activity.</p>
          </div>
          <button className="btn btn-ghost" type="button" onClick={() => { setErrors({}); setLoading({ stats: true, users: true, skills: true, audit: true }); setRefreshKey((key) => key + 1); }} disabled={isLoading || Boolean(busyAction)}>
            {isLoading ? "Refreshing…" : "Refresh data"}
          </button>
        </header>
        {message && <div className="alert" role="status">{message}</div>}
        {actionError && <div className="alert alert-error" role="alert">{actionError}</div>}

        <section aria-labelledby="analytics-title" className="mb">
          <h2 className="admin-section-title" id="analytics-title">Platform analytics</h2>
          {errors.stats && <div className="alert alert-error" role="alert">{errors.stats}</div>}
          {loading.stats ? <p className="empty" aria-live="polite">Loading analytics…</p> : !errors.stats && (
            <div className="grid grid-3">
              {analytics.map(([label, value]) => (
                <article className="card admin-metric" key={label}><h3>{label}</h3><p>{value ?? 0}</p></article>
              ))}
            </div>
          )}
        </section>

        <section className="card mb" aria-labelledby="users-title">
          <h2 className="admin-section-title" id="users-title">User management</h2>
          <div className="toolbar admin-toolbar">
            <input aria-label="Search users by name or email" placeholder="Search name or email" value={userSearchInput} onChange={(event) => setUserSearchInput(event.target.value)} />
            <select aria-label="Filter users by role" value={roleFilter || "ALL"} onChange={(event) => { setRoleFilter(event.target.value); setUserPage(0); }}>
              <option value="ALL">All roles</option><option value="USER">User</option><option value="ADMIN">Admin</option>
            </select>
          </div>
          {errors.users && <div className="alert alert-error" role="alert">{errors.users}</div>}
          {loading.users ? <p className="empty" aria-live="polite">Loading users…</p> : !errors.users && visibleUsers.length === 0 ? <p className="empty">No users match these filters.</p> : !errors.users && (
            <>
              <div className="table-responsive"><table className="admin-table">
                <thead><tr><th scope="col">ID</th><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
                <tbody>{visibleUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td><td>{user.name}</td><td>{user.email}</td>
                    <td><span className={`badge ${user.role === "ADMIN" ? "badge-teach" : "badge-cat"}`}>{user.role}</span></td>
                    <td><span className={`badge ${user.active ? "badge-learn" : "badge-cat"}`}>{user.active ? "Active" : "Deactivated"}</span></td>
                    <td className="admin-row-actions">
                      <button className="btn btn-ghost btn-sm" type="button" onClick={() => changeUserRole(user)} disabled={Boolean(busyAction)}>{busyAction === `role-${user.id}` ? "Saving…" : `Change to ${user.role === "ADMIN" ? "USER" : "ADMIN"}`}</button>
                      <button className={`btn btn-sm ${user.active ? "btn-danger" : "btn-ghost"}`} type="button" onClick={() => changeUserStatus(user)} disabled={Boolean(busyAction)}>{busyAction === `status-${user.id}` ? "Saving…" : user.active ? "Deactivate" : "Activate"}</button>
                    </td>
                  </tr>
                ))}</tbody>
              </table></div>
              <Pagination page={userPage} pageCount={users.totalPages} totalElements={users.totalElements} onChange={setUserPage} />
            </>
          )}
        </section>

        <section className="card mb" aria-labelledby="skills-title">
          <h2 className="admin-section-title" id="skills-title">Skills moderation</h2>
          <div className="toolbar admin-toolbar admin-filter-row">
            <input aria-label="Search skills" placeholder="Search skill, category, or owner" value={skillSearchInput} onChange={(event) => setSkillSearchInput(event.target.value)} />
            <input aria-label="Filter skills by category" placeholder="Category" value={skillCategory} onChange={(event) => { setSkillCategory(event.target.value); setSkillPage(0); }} />
            <select aria-label="Filter skills by type" value={skillType} onChange={(event) => { setSkillType(event.target.value); setSkillPage(0); }}><option value="">All types</option><option value="TEACH">Teach</option><option value="LEARN">Learn</option></select>
          </div>
          {errors.skills && <div className="alert alert-error" role="alert">{errors.skills}</div>}
          {loading.skills ? <p className="empty" aria-live="polite">Loading skills…</p> : !errors.skills && visibleSkills.length === 0 ? <p className="empty">No skills match these filters.</p> : !errors.skills && (
            <>
              <div className="table-responsive"><table className="admin-table">
                <thead><tr><th scope="col">ID</th><th scope="col">Skill</th><th scope="col">Category</th><th scope="col">Type</th><th scope="col">Owner</th><th scope="col">Moderation</th><th scope="col">Action</th></tr></thead>
                <tbody>{visibleSkills.map((skill) => (
                  <tr key={skill.id}>
                    <td>{skill.id}</td><td>{skill.name}</td><td>{skill.category || "—"}</td><td>{skill.type || "—"}</td>
                    <td>{skill.userName} <span className="skill-meta">(ID {skill.userId})</span></td>
                    <td>{skill.active ? <span className="badge badge-learn">Active</span> : <span className="admin-moderated-note">Moderated · {skill.moderatedAt ? new Date(skill.moderatedAt).toLocaleString() : ""}<br />{skill.moderationReason}</span>}</td>
                    <td>{skill.active ? <button className="btn btn-danger btn-sm" type="button" onClick={() => moderateSkill(skill)} disabled={Boolean(busyAction)}>{busyAction === `skill-${skill.id}` ? "Saving…" : "Moderate"}</button> : <span className="skill-meta">Already moderated</span>}</td>
                  </tr>
                ))}</tbody>
              </table></div>
              <Pagination page={skillPage} pageCount={skills.totalPages} totalElements={skills.totalElements} onChange={setSkillPage} />
            </>
          )}
        </section>

        <section className="card mb" aria-labelledby="audit-title">
          <h2 className="admin-section-title" id="audit-title">Admin audit log</h2>
          <div className="toolbar admin-toolbar admin-filter-row">
            <input aria-label="Filter audit logs by action" placeholder="Action" value={auditAction} onChange={(event) => { setAuditAction(event.target.value); setAuditPage(0); }} />
            <select aria-label="Filter audit logs by entity" value={auditEntityType} onChange={(event) => { setAuditEntityType(event.target.value); setAuditPage(0); }}><option value="">All entities</option><option value="USER">User</option><option value="SKILL">Skill</option></select>
            <input aria-label="Filter audit logs by administrator ID" type="number" min="1" placeholder="Administrator ID" value={auditActorId} onChange={(event) => { setAuditActorId(event.target.value); setAuditPage(0); }} />
          </div>
          {errors.audit && <div className="alert alert-error" role="alert">{errors.audit}</div>}
          {loading.audit ? <p className="empty" aria-live="polite">Loading audit log…</p> : !errors.audit && visibleAuditLogs.length === 0 ? <p className="empty">No audit entries match these filters.</p> : !errors.audit && (
            <>
              <div className="table-responsive"><table className="admin-table">
                <thead><tr><th scope="col">Timestamp</th><th scope="col">Administrator</th><th scope="col">Action</th><th scope="col">Affected entity</th><th scope="col">Details / reason</th></tr></thead>
                <tbody>{visibleAuditLogs.map((entry) => (
                  <tr key={entry.id}><td>{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "—"}</td><td>{entry.actorName} <span className="skill-meta">(ID {entry.actorId})</span></td><td>{entry.action}</td><td>{entry.entityType} #{entry.entityId}</td><td>{entry.details || "—"}</td></tr>
                ))}</tbody>
              </table></div>
              <Pagination page={auditPage} pageCount={auditLogs.totalPages} totalElements={auditLogs.totalElements} onChange={setAuditPage} />
            </>
          )}
        </section>
      </main>
    </>
  );
}

export default AdminDashboard;
