import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const firstName = user?.name?.split(" ")[0];

  const [skills, setSkills] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [editingSessionSwap, setEditingSessionSwap] = useState(null);
  const [sessionForm, setSessionForm] = useState({
    sessionDate: "",
    sessionTime: "",
    googleMeetUrl: ""
  });
  const [savingSession, setSavingSession] = useState(false);
  const [completingSwapId, setCompletingSwapId] = useState(null);

  const [reviewingRequest, setReviewingRequest] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewStatusBySwapId, setReviewStatusBySwapId] = useState({});
  const [reviewStatusLoading, setReviewStatusLoading] = useState({});
  const [reviewStatusErrors, setReviewStatusErrors] = useState({});
  const reviewStatusCache = useRef(new Map());
  const reviewStatusRequests = useRef(new Map());
  const authRedirected = useRef(false);

  const [form, setForm] = useState({
    name: "",
    category: "",
    type: "TEACH"
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadReviewStatus = async (swapRequestId, force = false) => {
    const id = Number(swapRequestId);
    if (!Number.isSafeInteger(id) || id <= 0) return null;

    if (force && reviewStatusRequests.current.has(id)) {
      await reviewStatusRequests.current.get(id);
    }
    if (force) reviewStatusCache.current.delete(id);
    if (!force && reviewStatusCache.current.has(id)) {
      return reviewStatusCache.current.get(id);
    }
    if (reviewStatusRequests.current.has(id)) {
      return reviewStatusRequests.current.get(id);
    }

    setReviewStatusLoading((current) => ({ ...current, [id]: true }));
    setReviewStatusErrors((current) => ({ ...current, [id]: "" }));
    const request = api.get(`/reviews/swaps/${id}/status`)
      .then((response) => {
        const status = response.data;
        if (
          Number(status?.swapRequestId) !== id ||
          typeof status?.reviewed !== "boolean" ||
          typeof status?.canReview !== "boolean"
        ) {
          throw new Error("The review status response did not match this swap.");
        }
        reviewStatusCache.current.set(id, status);
        setReviewStatusBySwapId((current) => ({ ...current, [id]: status }));
        return status;
      })
      .catch((err) => {
        const statusCode = err.response?.status;
        if (statusCode === 401 && !authRedirected.current) {
          authRedirected.current = true;
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login", { replace: true });
        }
        const message = statusCode === 403
          ? "You are not authorized to view this review status."
          : err.message === "The review status response did not match this swap."
            ? err.message
            : err.response?.data?.message || "Could not load review status. Please try again.";
        setReviewStatusErrors((current) => ({ ...current, [id]: message }));
        return null;
      })
      .finally(() => {
        reviewStatusRequests.current.delete(id);
        setReviewStatusLoading((current) => ({ ...current, [id]: false }));
      });
    reviewStatusRequests.current.set(id, request);
    return request;
  };

  const refresh = async () => {
    setSessionsLoading(true);
    try {
      const [skillsRes, sentRes, receivedRes, sessionsRes] = await Promise.all([
        api.get("/skills/my-skills"),
        api.get("/swaps/sent"),
        api.get("/swaps/received"),
        api.get("/sessions")
      ]);

      setSkills(skillsRes.data);
      setSentRequests(sentRes.data);
      setReceivedRequests(receivedRes.data);
      setSessions(sessionsRes.data);
      const completedIds = [...new Set(
        [...sentRes.data, ...receivedRes.data]
          .filter((request) => request.status === "COMPLETED")
          .map((request) => Number(request.id))
          .filter((id) => Number.isSafeInteger(id) && id > 0)
      )];
      await Promise.all(completedIds.map((id) => loadReviewStatus(id)));
    } catch {
      setError(
        "Could not load dashboard or session data. Check that the backend is running."
      );
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await api.post("/skills", form);

      setForm({
        name: "",
        category: "",
        type: "TEACH"
      });

      await refresh();
    } catch {
      setError("Could not add the skill. Try again.");
    }
  };

  const handleAccept = async (id) => {
    setError("");
    setSuccess("");

    try {
      const response = await api.put(`/swaps/${id}/accept`);
      updateSwapStatus(response.data);
      await refresh();
    } catch {
      setError("Could not accept the swap request. Try again.");
    }
  };

  const handleReject = async (id) => {
    setError("");
    setSuccess("");

    try {
      const response = await api.put(`/swaps/${id}/reject`);
      updateSwapStatus(response.data);
      await refresh();
    } catch {
      setError("Could not reject the swap request. Try again.");
    }
  };

  const handleComplete = async (id) => {
    setError("");
    setSuccess("");

    try {
      setCompletingSwapId(id);
      const response = await api.put(`/swaps/${id}/complete`);
      updateSwapStatus(response.data);
      await refresh();
      setSuccess("Swap marked as completed.");
    } catch {
      setError("Could not complete the swap. Try again.");
    } finally {
      setCompletingSwapId(null);
    }
  };

  const updateSwapStatus = (updatedRequest) => {
    const replaceRequest = (requests) =>
      requests.map((request) =>
        request.id === updatedRequest.id ? { ...request, ...updatedRequest } : request
      );
    setSentRequests(replaceRequest);
    setReceivedRequests(replaceRequest);
  };

  const sessionForSwap = (request) =>
    sessions.find((item) => item.swapRequestId === request.id);

  const canEditSession = (request) => {
    const session = sessionForSwap(request);
    return !sessionsLoading && (
      session?.status === "SCHEDULED" || (request.status === "ACCEPTED" && !session)
    );
  };

  const openSessionForm = (request) => {
    const session = sessions.find((item) => item.swapRequestId === request.id);
    setEditingSessionSwap(request);
    setSessionForm({
      sessionDate: session?.sessionDate || "",
      sessionTime: session?.sessionTime?.slice(0, 5) || "",
      googleMeetUrl: session?.googleMeetUrl || ""
    });
    setError("");
    setSuccess("");
  };

  const handleSaveSession = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const meetUrlPattern = /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}(\?.*)?$/;
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    if (!sessionForm.sessionDate || sessionForm.sessionDate <= todayString) {
      setError("Choose a future date for the session.");
      return;
    }
    if (!sessionForm.sessionTime) {
      setError("Choose a session time.");
      return;
    }
    if (!meetUrlPattern.test(sessionForm.googleMeetUrl.trim())) {
      setError("Enter a valid HTTPS Google Meet link, such as https://meet.google.com/abc-defg-hij.");
      return;
    }

    const existingSession = sessionForSwap(editingSessionSwap);
    const payload = {
      sessionDate: sessionForm.sessionDate,
      sessionTime: sessionForm.sessionTime,
      googleMeetUrl: sessionForm.googleMeetUrl.trim()
    };

    try {
      setSavingSession(true);
      let response;
      if (existingSession) {
        response = await api.put(`/sessions/${existingSession.id}`, payload);
      } else {
        response = await api.post(`/sessions/swaps/${editingSessionSwap.id}`, payload);
      }
      setSessions((current) => [
        ...current.filter((item) => item.id !== response.data.id),
        response.data
      ]);
      setEditingSessionSwap(null);
      setSuccess("Session saved successfully.");
      await refresh();
    } catch (err) {
      const message = err.response?.data;
      setError(
        typeof message === "string"
          ? message
          : message?.detail || message?.message || "Could not save the session. Please try again."
      );
    } finally {
      setSavingSession(false);
    }
  };

  const renderSessionInfo = (request) => {
    const session = sessionForSwap(request);
    if (!session) {
      return sessionsLoading ? (
        <div className="session-info skill-meta" aria-live="polite">Loading session…</div>
      ) : null;
    }

    return (
      <div className="session-info">
        <div className="skill-meta">
          Session: {session.sessionDate} at {session.sessionTime?.slice(0, 5)}
          <span className="badge badge-cat">{session.status}</span>
        </div>
        {session.googleMeetUrl && /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}(\?.*)?$/.test(session.googleMeetUrl) && (
          <a
            className="btn btn-sm session-join"
            href={session.googleMeetUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Join Google Meet
          </a>
        )}
      </div>
    );
  };

  const handleStartReview = (request, revieweeId, revieweeName) => {
    const status = reviewStatusBySwapId[request.id];
    if (Number(status?.swapRequestId) !== Number(request.id) || status?.canReview !== true || status?.reviewed === true) {
      setError("This swap is not currently available for review.");
      return;
    }
    setReviewingRequest({
      ...request,
      revieweeId,
      revieweeName
    });

    setRating(5);
    setComment("");
    setError("");
    setSuccess("");
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();

    if (!reviewingRequest) {
      return;
    }

    if (!reviewingRequest.revieweeId) {
      setError("Could not identify the person you are reviewing.");
      return;
    }

    const reviewStatus = reviewStatusBySwapId[reviewingRequest.id];
    if (
      Number(reviewStatus?.swapRequestId) !== Number(reviewingRequest.id) ||
      reviewStatus?.canReview !== true || reviewStatus?.reviewed === true
    ) {
      setError("This swap is not currently available for review.");
      setReviewingRequest(null);
      return;
    }

    try {
      await api.post("/reviews", {
        swapRequestId: reviewingRequest.id,
        revieweeId: reviewingRequest.revieweeId,
        rating: rating,
        comment: comment
      });

      setReviewingRequest(null);
      setRating(5);
      setComment("");
      setError("");
      setSuccess("Review submitted successfully.");
      await loadReviewStatus(reviewingRequest.id, true);
    } catch (err) {
      const message = err.response?.data;

      setError(
        typeof message === "string"
          ? message
          : "Could not submit the review. Try again."
      );
    }
  };

  const renderReviewAction = (request, revieweeId, revieweeName) => {
    const status = reviewStatusBySwapId[request.id];
    if (reviewStatusLoading[request.id] || !status && !reviewStatusErrors[request.id]) {
      return <span className="skill-meta" aria-live="polite">Checking review status…</span>;
    }
    if (reviewStatusErrors[request.id]) {
      return <span className="skill-meta" role="alert">{reviewStatusErrors[request.id]}</span>;
    }
    if (Number(status?.swapRequestId) !== Number(request.id)) return null;
    if (status.reviewed) return <span className="badge badge-learn">Reviewed</span>;
    if (status.canReview === true) {
      return (
        <button className="btn btn-sm" onClick={() => handleStartReview(request, revieweeId, revieweeName)}>
          Review
        </button>
      );
    }
    return <span className="skill-meta">Review unavailable</span>;
  };

  const handleDelete = async (id) => {
    setError("");
    setSuccess("");

    try {
      await api.delete(`/skills/${id}`);
      await refresh();
    } catch {
      setError("Could not delete the skill. Try again.");
    }
  };

  const renderCard = (
    title,
    type,
    badgeClass,
    cardClass,
    emptyText
  ) => {
    const list = skills.filter((s) => s.type === type);

    return (
      <div className={`card ${cardClass}`}>
        <h3 className="card-title">
          {title}{" "}
          <span className={`badge ${badgeClass}`}>
            {list.length}
          </span>
        </h3>

        {list.length === 0 && (
          <p className="empty">{emptyText}</p>
        )}

        {list.map((s) => (
          <div className="skill-item" key={s.id}>
            <div>
              <div className="skill-name">{s.name}</div>
              <div className="skill-meta">{s.category}</div>
            </div>

            <button
              className="btn btn-danger btn-sm"
              onClick={() => handleDelete(s.id)}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <h1 className="page-title">
        Hi {firstName}, what will you swap today?
      </h1>

      <p className="page-subtitle">
        Keep your teaching and learning lists up to date so others can find you.
      </p>

      {/* Messages */}
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

      {/* Add Skill */}
      <div className="card mb">
        <h3 className="card-title">Add a skill</h3>

        <form className="skill-form" onSubmit={handleAdd}>
          <div className="form-group">
            <label htmlFor="skill-name">Skill name</label>

            <input
              id="skill-name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Guitar"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="skill-category">Category</label>

            <input
              id="skill-category"
              name="category"
              value={form.category}
              onChange={handleChange}
              placeholder="Music"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="skill-type">I want to</label>

            <select
              id="skill-type"
              name="type"
              value={form.type}
              onChange={handleChange}
            >
              <option value="TEACH">Teach this</option>
              <option value="LEARN">Learn this</option>
            </select>
          </div>

          <button className="btn" type="submit">
            Add skill
          </button>
        </form>
      </div>

      {/* My Skills */}
      <div className="grid grid-2">
        {renderCard(
          "I can teach",
          "TEACH",
          "badge-teach",
          "card-teach",
          "Nothing here yet. Add a skill above so others can find you."
        )}

        {renderCard(
          "I want to learn",
          "LEARN",
          "badge-learn",
          "card-learn",
          "Nothing here yet. Add what you would love to learn."
        )}
      </div>

      {/* Sent Requests */}
      <div className="card mb">
        <h3 className="card-title">
          Sent Requests{" "}
          <span className="badge badge-cat">
            {sentRequests.length}
          </span>
        </h3>

        {sentRequests.length === 0 && (
          <p className="empty">
            You haven't sent any swap requests yet.
          </p>
        )}

        {sentRequests.map((request) => (
          <div className="skill-item" key={request.id}>
            <div>
              <div className="skill-name">
                {request.offeredSkillName} →{" "}
                {request.requestedSkillName}
              </div>

              <div className="skill-meta">
                To: {request.receiverName}
              </div>
              {renderSessionInfo(request)}
            </div>

            {request.status === "COMPLETED" ? (
              <div className="swap-actions">
                {renderReviewAction(request, request.receiverId, request.receiverName)}
                {canEditSession(request) && (
                  <button className="btn btn-ghost btn-sm" onClick={() => openSessionForm(request)}>
                    Update Session
                  </button>
                )}
              </div>
            ) : request.status === "ACCEPTED" ? (
              <div className="swap-actions">
                {canEditSession(request) && (
                  <button className="btn btn-sm" onClick={() => openSessionForm(request)}>
                    {sessionForSwap(request) ? "Update Session" : "Schedule Session"}
                  </button>
                )}
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleComplete(request.id)}
                  disabled={completingSwapId === request.id}
                >
                  {completingSwapId === request.id ? "Completing…" : "Complete"}
                </button>
              </div>
            ) : (
              <span className="badge badge-cat">
                {request.status}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Received Requests */}
      <div className="card mb">
        <h3 className="card-title">
          Received Requests{" "}
          <span className="badge badge-cat">
            {receivedRequests.length}
          </span>
        </h3>

        {receivedRequests.length === 0 && (
          <p className="empty">
            You haven't received any swap requests yet.
          </p>
        )}

        {receivedRequests.map((request) => (
          <div className="skill-item" key={request.id}>
            <div>
              <div className="skill-name">
                {request.offeredSkillName} →{" "}
                {request.requestedSkillName}
              </div>

              <div className="skill-meta">
                From: {request.senderName}
              </div>
              {renderSessionInfo(request)}
            </div>

            {request.status === "PENDING" ? (
              <div>
                <button
                  className="btn btn-sm"
                  onClick={() => handleAccept(request.id)}
                >
                  Accept
                </button>

                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleReject(request.id)}
                >
                  Reject
                </button>
              </div>
            ) : request.status === "ACCEPTED" ? (
              <div className="swap-actions">
                {canEditSession(request) && (
                  <button className="btn btn-sm" onClick={() => openSessionForm(request)}>
                    {sessionForSwap(request) ? "Update Session" : "Schedule Session"}
                  </button>
                )}
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleComplete(request.id)}
                >
                  Complete
                </button>
              </div>
            ) : request.status === "COMPLETED" ? (
              <div className="swap-actions">
                {renderReviewAction(request, request.senderId, request.senderName)}
                {canEditSession(request) && (
                  <button className="btn btn-ghost btn-sm" onClick={() => openSessionForm(request)}>
                    Update Session
                  </button>
                )}
              </div>
            ) : (
              <span className="badge badge-cat">
                {request.status}
              </span>
            )}
          </div>
        ))}
      </div>

      {editingSessionSwap && (
        <section className="card mb" aria-labelledby="session-form-title">
          <h3 className="card-title" id="session-form-title">
            {sessions.some((session) => session.swapRequestId === editingSessionSwap.id)
              ? "Update session"
              : "Schedule a session"}
          </h3>
          <p className="page-subtitle">
            For {editingSessionSwap.offeredSkillName} and {editingSessionSwap.requestedSkillName}
          </p>
          <form onSubmit={handleSaveSession}>
            <div className="session-form-grid">
              <div className="form-group">
                <label htmlFor="session-date">Date</label>
                <input
                  id="session-date"
                  type="date"
                  min={(() => {
                    const now = new Date();
                    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
                  })()}
                  value={sessionForm.sessionDate}
                  onChange={(event) => setSessionForm({ ...sessionForm, sessionDate: event.target.value })}
                  required
                  disabled={savingSession}
                />
              </div>
              <div className="form-group">
                <label htmlFor="session-time">Time</label>
                <input
                  id="session-time"
                  type="time"
                  value={sessionForm.sessionTime}
                  onChange={(event) => setSessionForm({ ...sessionForm, sessionTime: event.target.value })}
                  required
                  disabled={savingSession}
                />
              </div>
              <div className="form-group session-url-field">
                <label htmlFor="google-meet-url">Google Meet URL</label>
                <input
                  id="google-meet-url"
                  type="url"
                  inputMode="url"
                  placeholder="https://meet.google.com/abc-defg-hij"
                  value={sessionForm.googleMeetUrl}
                  onChange={(event) => setSessionForm({ ...sessionForm, googleMeetUrl: event.target.value })}
                  required
                  disabled={savingSession}
                />
              </div>
            </div>
            <div className="swap-actions">
              <button className="btn" type="submit" disabled={savingSession}>
                {savingSession ? "Saving…" : "Save session"}
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setEditingSessionSwap(null)}
                disabled={savingSession}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Review Form */}
      {reviewingRequest && (
        <div className="card mb">
          <h3 className="card-title">
            Write a Review
          </h3>

          <p>
            Reviewing:{" "}
            <strong>{reviewingRequest.revieweeName}</strong>
          </p>

          <form onSubmit={handleSubmitReview}>
            <div className="form-group">
              <label htmlFor="rating">
                Rating
              </label>

              <select
                id="rating"
                value={rating}
                onChange={(e) =>
                  setRating(Number(e.target.value))
                }
              >
                <option value="5">
                  5 - Excellent
                </option>

                <option value="4">
                  4 - Very Good
                </option>

                <option value="3">
                  3 - Good
                </option>

                <option value="2">
                  2 - Fair
                </option>

                <option value="1">
                  1 - Poor
                </option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="comment">
                Comment
              </label>

              <textarea
                id="comment"
                value={comment}
                onChange={(e) =>
                  setComment(e.target.value)
                }
                placeholder="How was your learning experience?"
                rows="4"
              />
            </div>

            <button
              className="btn"
              type="submit"
            >
              Submit Review
            </button>

            <button
              className="btn btn-danger"
              type="button"
              onClick={() => {
                setReviewingRequest(null);
                setError("");
              }}
            >
              Cancel
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
