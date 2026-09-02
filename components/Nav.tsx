const links = [
  { href: "#identify", label: "افحص قطعتك" },
  { href: "#brands", label: "العلامات" },
  { href: "#explorer", label: "استكشف" },
  { href: "#collection", label: "المجموعة" },
  { href: "#about", label: "من نحن" },
];

export default function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#top" className="flex items-baseline gap-1">
          <span className="font-editorial text-3xl font-semibold text-text">
            دِقّة
          </span>
          <span className="font-data text-[10px] uppercase tracking-[0.2em] text-text-soft">
            diqa
          </span>
        </a>
        <ul className="hidden items-center gap-8 sm:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-sm font-medium text-text-soft transition-colors hover:text-accent"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <a
          href="#identify"
          className="rounded-diqa-sm border border-primary bg-primary px-4 py-2 text-sm font-medium text-bg transition-all hover:scale-105 hover:bg-transparent hover:text-primary sm:inline-block hidden"
        >
          افحص سيارتك
        </a>
      </nav>
    </header>
  );
}
