import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Versus Engine Dashboard",
  description: "Browse products, build comparisons, and queue renders.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0b0e14] text-[#e6e9ef]">
        <nav className="border-b border-white/10 px-6 py-4 flex items-center gap-6">
          <Link href="/" className="font-semibold tracking-tight">
            Versus Engine
          </Link>
          <Link href="/products" className="text-sm text-white/70 hover:text-white">
            Products
          </Link>
          <Link href="/comparisons" className="text-sm text-white/70 hover:text-white">
            Comparisons
          </Link>
          <Link href="/comparisons/new" className="text-sm text-white/70 hover:text-white">
            Build Comparison
          </Link>
        </nav>
        <main className="px-6 py-8 max-w-6xl mx-auto">{children}</main>
      </body>
    </html>
  );
}
