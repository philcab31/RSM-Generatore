import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <meta httpEquiv="refresh" content="0; url=/dashboard/" />
      <Link className="text-sm font-medium underline" href="/dashboard/">
        Ouvrir le dashboard
      </Link>
    </main>
  );
}
