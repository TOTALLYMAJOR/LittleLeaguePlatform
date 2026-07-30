export default function ParentHomeLoading() {
  return (
    <main className="page parent-weekly-dashboard" aria-busy="true" aria-label="Loading Family Home">
      <section className="parent-weekly-player">
        <div className="communication-loading-block" />
        <div className="communication-loading-tabs">
          <div />
          <div />
          <div />
        </div>
      </section>
      <div className="communication-loading-block" />
      <div className="communication-loading-block tall" />
      <div className="communication-loading-block" />
    </main>
  );
}
