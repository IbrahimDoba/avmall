import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="px-6 py-5">
        <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl tracking-tight">
          <span className="inline-flex items-center justify-center size-8 rounded-md bg-brand-primary text-brand-primary-fg text-sm font-extrabold">
            av
          </span>
          <span>mall</span>
        </Link>
      </header>
      <main className="flex-1 flex items-start justify-center px-4 pb-12">
        <div className="w-full max-w-md mt-8 lg:mt-16">{children}</div>
      </main>
      <footer className="px-6 py-5 text-xs text-fg-muted text-center">
        © 2026 Avmall Ltd · <Link href="#" className="hover:text-fg">Terms</Link> · <Link href="#" className="hover:text-fg">Privacy</Link>
      </footer>
    </div>
  );
}
