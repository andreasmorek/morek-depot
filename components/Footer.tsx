export default function Footer() {
  return (
    <footer className="mt-16 border-t border-white/10 pt-6 pb-10 text-sm text-white/70">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4">
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
          <a
            href="/impressum"
            className="transition hover:text-white"
          >
            Impressum
          </a>

          <a
            href="/datenschutz"
            className="transition hover:text-white"
          >
            Datenschutz
          </a>
        </div>

        <p className="max-w-3xl text-center text-xs leading-5 text-white/50">
          Die dargestellten Informationen stellen keine Anlageberatung und keine
          Kauf- oder Verkaufsempfehlung dar. Alle Angaben erfolgen ohne Gewähr.
          Kurs- und Nachrichtendaten stammen teilweise von externen
          Datenanbietern.
        </p>

        <p className="text-center text-xs text-white/40">
          © 2026 Morek 360°
        </p>
      </div>
    </footer>
  );
}