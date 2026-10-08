import { Link } from "react-router-dom";
import PublicNavbar from "../components/PublicNavbar";

const skills = [
  { name: "Guitar", type: "teach" },
  { name: "Python", type: "learn" },
  { name: "Photography", type: "teach" },
  { name: "Excel", type: "learn" },
  { name: "Public speaking", type: "learn" },
  { name: "Spanish", type: "teach" },
  { name: "Video editing", type: "teach" },
  { name: "Chess", type: "learn" },
  { name: "Yoga", type: "teach" },
  { name: "Web design", type: "learn" },
];

function Home() {
  return (
    <>
      <PublicNavbar />

      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <h1>Teach one thing. Learn another.</h1>
            <p className="hero-lead">
              List what you can teach and what you want to learn, find someone who wants the
              opposite, and trade lessons. No fees, no payments.
            </p>
            <div className="hero-actions">
              <Link to="/register" className="btn btn-lg">Create free account</Link>
              <Link to="/login" className="btn btn-ghost btn-lg">Log in</Link>
            </div>
          </div>

          <div className="hero-visual">
            <div className="swap-demo" aria-hidden="true">
              <div className="person">
                <div className="person-head"><span className="avatar">A</span>Asha</div>
                <div className="person-row">
                  <span className="role">Teaches</span>
                  <span className="chip chip-teach hit-1">Guitar</span>
                </div>
                <div className="person-row">
                  <span className="role">Wants to learn</span>
                  <span className="chip chip-learn hit-2">Python</span>
                </div>
              </div>

              <div className="links">
                <span className="link link-1" />
                <span className="link link-2" />
              </div>

              <div className="person">
                <div className="person-head"><span className="avatar alt">R</span>Ravi</div>
                <div className="person-row">
                  <span className="role">Wants to learn</span>
                  <span className="chip chip-learn hit-1">Guitar</span>
                </div>
                <div className="person-row">
                  <span className="role">Teaches</span>
                  <span className="chip chip-teach hit-2">Python</span>
                </div>
              </div>

              <div className="match-wrap">
                <span className="match-badge">Perfect swap</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="block block-white">
        <div className="wrap">
          <h2 className="block-title">How it works</h2>
          <div className="steps">
            <div className="step">
              <div className="step-num">1</div>
              <h3>List your skills</h3>
              <p>Add what you can teach and what you want to learn.</p>
            </div>
            <div className="step">
              <div className="step-num">2</div>
              <h3>Find a partner</h3>
              <p>Browse other members and send a swap request to someone who has what you need.</p>
            </div>
            <div className="step">
              <div className="step-num">3</div>
              <h3>Swap and rate</h3>
              <p>Trade lessons, then review each other to build your reputation.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="why" className="block">
        <div className="wrap why-grid">
          <h2 className="block-title">Why swap instead of pay?</h2>
          <ul className="why-list">
            <li>
              <h3>Free for everyone</h3>
              <p>Every lesson you receive is paid for with a lesson you give.</p>
            </li>
            <li>
              <h3>Everyone teaches and learns</h3>
              <p>You always trade with someone who knows what it is like to be a beginner.</p>
            </li>
            <li>
              <h3>Ratings you can trust</h3>
              <p>Reviews after every completed swap show who is great to learn from.</p>
            </li>
          </ul>
        </div>
      </section>

      <section className="block block-white">
        <div className="wrap">
          <h2 className="block-title">Skills you can swap</h2>
          <div className="chip-cloud">
            {skills.map((s) => (
              <span key={s.name} className={`chip chip-${s.type}`}>{s.name}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="wrap cta-inner">
          <div>
            <h2>Got something to teach? Someone wants to learn it.</h2>
            <p>Create your account, list a skill, and start your first swap.</p>
          </div>
          <Link to="/register" className="btn btn-amber btn-lg">Create free account</Link>
        </div>
      </section>

      <footer className="site-footer">
        <div className="wrap footer-inner">
          <span>© 2026 Skill Swap</span>
          <span>Built with Spring Boot, React and MySQL</span>
        </div>
      </footer>
    </>
  );
}

export default Home;