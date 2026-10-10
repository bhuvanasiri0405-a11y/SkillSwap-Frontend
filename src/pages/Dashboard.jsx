import { useEffect, useState } from "react";
import api from "../api/axios";

function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user"));
  const firstName = user?.name?.split(" ")[0];

  const [skills, setSkills] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);

  const [reviewingRequest, setReviewingRequest] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const [form, setForm] = useState({
    name: "",
    category: "",
    type: "TEACH"
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const refresh = async () => {
    try {
      const [skillsRes, sentRes, receivedRes] = await Promise.all([
        api.get("/skills/my-skills"),
        api.get("/swaps/sent"),
        api.get("/swaps/received")
      ]);

      setSkills(skillsRes.data);
      setSentRequests(sentRes.data);
      setReceivedRequests(receivedRes.data);
    } catch {
      setError(
        "Could not load your dashboard data. Check that the backend is running."
      );
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
      await api.put(`/swaps/${id}/accept`);
      await refresh();
    } catch {
      setError("Could not accept the swap request. Try again.");
    }
  };

  const handleReject = async (id) => {
    setError("");
    setSuccess("");

    try {
      await api.put(`/swaps/${id}/reject`);
      await refresh();
    } catch {
      setError("Could not reject the swap request. Try again.");
    }
  };

  const handleComplete = async (id) => {
    setError("");
    setSuccess("");

    try {
      await api.put(`/swaps/${id}/complete`);
      await refresh();
    } catch {
      setError("Could not complete the swap. Try again.");
    }
  };

  const handleStartReview = (request, revieweeId, revieweeName) => {
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
    } catch (err) {
      const message = err.response?.data;

      setError(
        typeof message === "string"
          ? message
          : "Could not submit the review. Try again."
      );
    }
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
            </div>

            {request.status === "COMPLETED" ? (
              <button
                className="btn btn-sm"
                onClick={() =>
                  handleStartReview(
                    request,
                    request.receiverId,
                    request.receiverName
                  )
                }
              >
                Review
              </button>
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
              <button
                className="btn btn-sm"
                onClick={() => handleComplete(request.id)}
              >
                Complete
              </button>
            ) : request.status === "COMPLETED" ? (
              <button
                className="btn btn-sm"
                onClick={() =>
                  handleStartReview(
                    request,
                    request.senderId,
                    request.senderName
                  )
                }
              >
                Review
              </button>
            ) : (
              <span className="badge badge-cat">
                {request.status}
              </span>
            )}
          </div>
        ))}
      </div>

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