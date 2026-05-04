export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-end p-4 sm:p-5">
      <p className="pointer-events-auto max-w-[min(100%,20rem)] text-right text-[11px] leading-relaxed text-white/45 sm:text-xs">
        © {year} Jessica Luo ·{" "}
        <a
          href="mailto:thejessluo@gmail.com"
          className="text-white/55 underline decoration-white/25 underline-offset-2 transition-colors hover:text-white/85"
        >
          thejessluo@gmail.com
        </a>
      </p>
    </footer>
  );
}
