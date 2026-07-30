export default function ParentHomeLoading() {
  return (
    <section
      className="page parent-weekly-dashboard"
      aria-busy="true"
      aria-labelledby="parent-home-loading-title"
      role="status"
    >
      <h1 className="sr-only" id="parent-home-loading-title">Loading Family Home</h1>
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
    </section>
  );
}
