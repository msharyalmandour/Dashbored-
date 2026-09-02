const COLUMNS = [
  {
    title: "Discover",
    links: ["Featured Cars", "Brands", "Categories", "Compare"],
  },
  {
    title: "Experience",
    links: ["Personality Quiz", "Discover by Feeling", "Stories"],
  },
  {
    title: "Company",
    links: ["About Velocità", "Careers", "Press", "Contact"],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-line-soft bg-bg-2/40">
      <div className="mx-auto max-w-[1400px] px-6 py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2 16 L7 7 L17 7 L22 16 L19 16 L17 12 L7 12 L5 16 Z" fill="var(--accent)" />
              </svg>
              <span className="font-display text-lg text-text">VELOCITÀ</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-text-soft">
              The digital destination for people who don&rsquo;t just drive cars — they feel them.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="font-data text-[11px] uppercase tracking-[0.2em] text-text-faint">{col.title}</p>
              <ul className="mt-4 flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#top" className="text-sm text-text-soft transition-colors hover:text-accent">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-line-soft pt-8 text-xs text-text-faint sm:flex-row">
          <span>© {new Date().getFullYear()} Velocità. All rights reserved.</span>
          <span>Concept platform — vehicle imagery is illustrative, not photographic.</span>
        </div>
      </div>
    </footer>
  );
}
