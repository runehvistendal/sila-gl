import Link from "next/link"

export default function Footer() {
  return (
    <footer className="bg-foreground border-t border-foreground/10 pt-12 pb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          <div>
            <span className="text-base font-semibold block mb-3 text-primary-foreground">
              Sila.gl
            </span>
            <p className="text-xs leading-relaxed text-primary-foreground/50">
              Grønlands platform for lokale hytter, samsejlads og oplevelser.
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-4 text-primary">Platformer</p>
            <div className="flex flex-col gap-2.5 text-sm text-primary-foreground/60">
              <Link href="/hytter"    className="hover:text-primary-foreground transition-colors">Hytter</Link>
              <Link href="/transport" className="hover:text-primary-foreground transition-colors">Samsejlads & transport</Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-4 text-primary">Om Sila</p>
            <div className="flex flex-col gap-2.5 text-sm text-primary-foreground/60">
              <Link href="/om-os"       className="hover:text-primary-foreground transition-colors">Om os</Link>
              <Link href="/opret-konto" className="hover:text-primary-foreground transition-colors">Bliv udbyder</Link>
              <Link href="/kontakt"     className="hover:text-primary-foreground transition-colors">Kontakt</Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-4 text-primary">Juridisk</p>
            <div className="flex flex-col gap-2.5 text-sm text-primary-foreground/60">
              <Link href="/privatlivspolitik" className="hover:text-primary-foreground transition-colors">Privatlivspolitik</Link>
              <Link href="/vilkaar"           className="hover:text-primary-foreground transition-colors">Vilkår</Link>
              <Link href="/cookies"           className="hover:text-primary-foreground transition-colors">Cookies</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-primary-foreground/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-primary-foreground/30">
            &copy; 2026 Sila.gl — CVR: Dansk
          </p>
          <p className="text-xs text-primary-foreground/30">
            Grønlands første marketplace for lokale oplevelser
          </p>
        </div>
      </div>
    </footer>
  )
}
