import Brand from "./Brand";

function AuthLayout({ title, subtitle, footer, children }) {
  return (
    <div className="auth-page">
      <aside className="auth-side">
        <Brand light />
        <div>
          <h2 className="auth-tagline">Trade what you know for what you want.</h2>
          <p className="auth-tagline-sub">Teach a skill, learn a skill. No fees, just a fair swap.</p>
        </div>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-mobile-brand">
            <Brand />
          </div>
          <h1>{title}</h1>
          <p className="subtitle">{subtitle}</p>
          {children}
          <p className="auth-footer">{footer}</p>
        </div>
      </main>
    </div>
  );
}

export default AuthLayout;