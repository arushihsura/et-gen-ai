import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <section className="panel-grid">
      <article className="panel panel-span">
        <h2>Page Not Found</h2>
        <p>The page you requested does not exist.</p>
        <Link to="/">Go back to dashboard</Link>
      </article>
    </section>
  );
}
