export default function ParentMessagesLoading() {
  return (
    <main className="page communication-room" aria-busy="true" aria-label="Loading Communication Room">
      <div className="communication-loading-block large" />
      <div className="communication-loading-block" />
      <div className="communication-loading-tabs">
        <div />
        <div />
        <div />
      </div>
      <div className="communication-loading-block tall" />
    </main>
  );
}
