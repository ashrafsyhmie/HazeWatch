import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="joy-footer">
      <div>
        <p className="joy-footer-title">HazeWatch</p>
        <p>Air quality close to home, with the wider region in view.</p>
      </div>
      <nav aria-label="Footer">
        <Link href="/stations">Stations</Link>
        <Link href="/history">Monthly data</Link>
        <Link href="/methodology">Sources &amp; method</Link>
      </nav>
    </footer>
  );
}
