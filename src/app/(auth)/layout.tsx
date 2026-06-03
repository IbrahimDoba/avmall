import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="px-6 py-5">
        <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl tracking-tight">
          <Image src="/brand/monogram.png" alt="Avmall" width={32} height={32} className="rounded-md" />
          <span>Avmall</span>
        </Link>
      </header>
      <main className="flex-1 flex items-start justify-center px-4 pb-12">
        <div className="w-full max-w-md mt-8 lg:mt-16">{children}</div>
      </main>
      <footer className="px-6 py-5 text-xs text-fg-muted text-center">
        © 2026 Avmall Ltd · <Link href="/terms" className="hover:text-fg">Terms</Link> · <Link href="/privacy" className="hover:text-fg">Privacy</Link>
      </footer>
    </div>
  );
}
