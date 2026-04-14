import { Link } from "react-router-dom";

const sampleItems = [
  { label: "Savings", value: "INR 24,800" },
  { label: "Spending", value: "INR 8,420" },
  { label: "Goals", value: "4 active" },
  { label: "Streak", value: "12 days" }
];

const previewCards = [
  {
    title: "Primary Card",
    text: "Balanced gradients, cleaner spacing, and a top nav that stays visible while you scroll."
  },
  {
    title: "Scrollable Panel",
    text: "The custom scrollbar is slimmer, themed, and more polished for a premium dashboard feel."
  },
  {
    title: "Navigation",
    text: "A compact top bar keeps the app name, pages, and actions in one place at the top."
  }
];

export default function StylePreviewPage() {
  return (
    <main className="style-preview-page">
      <header className="preview-topbar">
        <div className="preview-brand">
          <div className="preview-mark">PF</div>
          <div>
            <strong>PRIME Finance</strong>
            <span>Preview concept</span>
          </div>
        </div>

        <nav className="preview-nav" aria-label="Preview navigation">
          <Link to="/login">Login</Link>
          <Link to="/signup">Sign Up</Link>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/goals">Goals</Link>
        </nav>

        <Link className="preview-cta" to="/login">
          Open App
        </Link>
      </header>

      <section className="preview-hero">
        <div className="preview-copy">
          <p className="preview-eyebrow">Top navigation + scrollbar style</p>
          <h1>A cleaner dashboard look with a fixed top bar and themed scrollbars.</h1>
          <p>
            This is a visual preview only. It shows the direction I’d apply across the site: a brighter surface,
            stronger hierarchy, and navigation moved to the top so the content feels more modern.
          </p>
        </div>

        <div className="preview-panel preview-scroll-area">
          <div className="preview-stats-grid">
            {sampleItems.map((item) => (
              <article key={item.label} className="preview-stat-card">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>

          <div className="preview-feed">
            {previewCards.map((card) => (
              <article key={card.title} className="preview-feed-card">
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}