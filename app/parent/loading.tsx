export default function ParentHomeLoading() {
  return (
    <main className="parent-weekly-dashboard" aria-busy="true" aria-label="Loading Family Home">
      <section className="parent-weekly-card parent-weekly-loading-card">
        <div className="parent-weekly-loading-line wide" />
        <div className="parent-weekly-loading-line" />
      </section>
      <section className="parent-weekly-card parent-weekly-loading-passport">
        <div className="parent-weekly-loading-line wide" />
        <div className="parent-weekly-loading-line short" />
        <div className="parent-weekly-loading-actions">
          <span />
          <span />
          <span />
        </div>
      </section>
      <section className="parent-weekly-card parent-weekly-loading-card">
        <div className="parent-weekly-loading-line" />
        <div className="parent-weekly-loading-line short" />
      </section>
    </main>
  );
}
