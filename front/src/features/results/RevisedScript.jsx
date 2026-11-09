export default function RevisedScript({ script }) {
  return (
    <section className="priority-section">
      <div className="subheading">
        <h2>피드백을 반영해 다듬은 대본이에요.</h2>
      </div>
      <pre className="revised-script">{script}</pre>
    </section>
  )
}
