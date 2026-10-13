import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

function Browse() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const [skills, setSkills] = useState([]);
  const [mySkills, setMySkills] = useState([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("ALL");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingRequest, setSendingRequest] = useState(null);
  const [selectedReviewUserId, setSelectedReviewUserId] = useState(null);
  const [publicReviews, setPublicReviews] = useState({});
  const [reviewLoadingByUser, setReviewLoadingByUser] = useState({});
  const [reviewErrorsByUser, setReviewErrorsByUser] = useState({});
  const reviewRequests = useRef(new Map());
  const authRedirected = useRef(false);

  const loadUserReviews = async (userId, page = 0, append = false) => {
    const id = Number(userId);
    if (!Number.isSafeInteger(id) || id <= 0) return;
    const requestKey = `${id}:${page}`;
    if (reviewRequests.current.has(requestKey)) return reviewRequests.current.get(requestKey);

    setReviewLoadingByUser((current) => ({ ...current, [id]: true }));
    setReviewErrorsByUser((current) => ({ ...current, [id]: "" }));
    const request = (async () => {
      try {
        const reviewsRequest = api.get(`/reviews/users/${id}`, {
          params: { page, size: 10 }
        });
        const [reviewsResponse, summaryResponse] = await Promise.all([
          reviewsRequest,
          append ? Promise.resolve(null) : api.get(`/reviews/users/${id}/summary`)
        ]);
        const pageData = reviewsResponse.data;
        if (!Array.isArray(pageData?.content)) {
          throw new Error("The reviews response was not in the expected format.");
        }
        setPublicReviews((current) => {
          const previous = current[id];
          return {
            ...current,
            [id]: {
              summary: append ? previous?.summary : summaryResponse.data,
              content: append ? [...(previous?.content || []), ...pageData.content] : pageData.content,
              page: pageData.page,
              totalPages: pageData.totalPages,
              totalElements: pageData.totalElements
            }
          };
        });
      } catch (err) {
        const status = err.response?.status;
        if (status === 401 && !authRedirected.current) {
          authRedirected.current = true;
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login", { replace: true });
        }
        const message = status === 403
          ? "You are not authorized to view these reviews."
          : status === 404
            ? "This user profile could not be found."
            : err.message === "The reviews response was not in the expected format."
              ? err.message
              : "Could not load this user's reviews. Please try again.";
        setReviewErrorsByUser((current) => ({ ...current, [id]: message }));
      } finally {
        reviewRequests.current.delete(requestKey);
        setReviewLoadingByUser((current) => ({ ...current, [id]: false }));
      }
    })();
    reviewRequests.current.set(requestKey, request);
    return request;
  };

  const toggleUserReviews = (userId) => {
    const id = Number(userId);
    if (selectedReviewUserId === id) {
      setSelectedReviewUserId(null);
      return;
    }
    setSelectedReviewUserId(id);
    if (!publicReviews[id] && !reviewLoadingByUser[id]) loadUserReviews(id);
  };

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

                <span>{isMySkill ? "You" : s.ownerName}</span>
              </div>

              <button
                className="btn btn-ghost btn-sm"
                type="button"
                aria-expanded={selectedReviewUserId === Number(s.ownerId)}
                aria-controls={`provider-reviews-${s.ownerId}`}
                onClick={() => toggleUserReviews(s.ownerId)}
              >
                {selectedReviewUserId === Number(s.ownerId) ? "Hide reviews" : "View reviews"}
              </button>

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

      {selectedReviewUserId !== null && (
        <section className="card provider-reviews" id={`provider-reviews-${selectedReviewUserId}`} aria-labelledby="provider-reviews-title">
          <h2 className="card-title" id="provider-reviews-title">
            Reviews for {skills.find((skill) => Number(skill.ownerId) === selectedReviewUserId)?.ownerName || "this provider"}
          </h2>
          {reviewLoadingByUser[selectedReviewUserId] && !publicReviews[selectedReviewUserId] ? (
            <p className="empty" aria-live="polite">Loading reviews…</p>
          ) : reviewErrorsByUser[selectedReviewUserId] ? (
            <div className="alert alert-error" role="alert">
              <p>{reviewErrorsByUser[selectedReviewUserId]}</p>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => loadUserReviews(selectedReviewUserId)}>
                Try again
              </button>
            </div>
          ) : publicReviews[selectedReviewUserId] ? (
            <>
              <div className="review-summary">
                <strong>{Number(publicReviews[selectedReviewUserId].summary?.averageRating || 0).toFixed(1)} / 5</strong>
                <span aria-label={`${Number(publicReviews[selectedReviewUserId].summary?.averageRating || 0).toFixed(1)} out of 5 stars`} className="review-stars">
                  {Array.from({ length: 5 }, (_, index) => (
                    <span key={index} aria-hidden="true">
                      {index < Math.round(Number(publicReviews[selectedReviewUserId].summary?.averageRating || 0)) ? "★" : "☆"}
                    </span>
                  ))}
                </span>
                <span className="skill-meta">
                  {publicReviews[selectedReviewUserId].summary?.totalReviewCount || 0} reviews
                </span>
              </div>

              {publicReviews[selectedReviewUserId].content.length === 0 ? (
                <p className="empty">This user has no reviews yet.</p>
              ) : (
                <div className="public-review-list">
                  {publicReviews[selectedReviewUserId].content.map((review, index) => (
                    <article className="public-review" key={`${review.reviewerDisplayName}-${review.reviewDate}-${index}`}>
                      <div className="public-review-heading">
                        <strong>{review.reviewerDisplayName}</strong>
                        <time dateTime={review.reviewDate} className="skill-meta">
                          {review.reviewDate ? new Date(review.reviewDate).toLocaleDateString() : "Date unavailable"}
                        </time>
                      </div>
                      <div className="review-stars" aria-label={`${review.rating} out of 5 stars`}>
                        {Array.from({ length: 5 }, (_, starIndex) => (
                          <span key={starIndex} aria-hidden="true">{starIndex < Number(review.rating) ? "★" : "☆"}</span>
                        ))}
                        <span className="review-rating-number">{review.rating}/5</span>
                      </div>
                      {review.comment && <p className="public-review-comment">{review.comment}</p>}
                    </article>
                  ))}
                </div>
              )}

              {publicReviews[selectedReviewUserId].page + 1 < publicReviews[selectedReviewUserId].totalPages && (
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => loadUserReviews(selectedReviewUserId, publicReviews[selectedReviewUserId].page + 1, true)}
                  disabled={reviewLoadingByUser[selectedReviewUserId]}
                >
                  {reviewLoadingByUser[selectedReviewUserId] ? "Loading…" : "Load more reviews"}
                </button>
              )}
              {reviewLoadingByUser[selectedReviewUserId] && <p className="skill-meta" aria-live="polite">Loading more reviews…</p>}
            </>
          ) : null}
        </section>
      )}
    </div>
  );
}

export default Browse;
