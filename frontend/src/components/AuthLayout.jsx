export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <>
      <div className="background-layer"></div>
      <main className="container auth-layout auth-split">
        <section className="auth-hero card">
          <div className="auth-hero-badge">PRIME Finance</div>
          <div className="auth-hero-copy">
            <p className="eyebrow auth-eyebrow">Smart money, calmer decisions</p>
            <h2>Build wealth with a dashboard that feels premium.</h2>
            <p className="auth-hero-text">
              Track savings, control spending, and keep your goals in one place with a polished theme that matches your
              financial flow.
            </p>
          </div>

          <div className="auth-hero-visual" aria-hidden="true">
            <img
              className="auth-hero-visual-photo"
              src="https://images.unsplash.com/photo-1565514020179-026b92b84bb6?auto=format&fit=crop&w=1200&q=80"
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            <div className="floating-card floating-card-left">
              <span>Balance</span>
              <strong>INR 24,800</strong>
            </div>
            <div className="floating-card floating-card-right">
              <span>Goal progress</span>
              <strong>72%</strong>
            </div>
          </div>
        </section>

        <section className="card auth-card solo auth-form-card">
          <div className="auth-card-header">
            <p className="auth-brand-name">PRIME Finance</p>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          {children}
          {footer}
        </section>
      </main>
    </>
  );
}
