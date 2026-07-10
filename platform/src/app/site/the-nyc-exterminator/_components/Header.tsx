import Link from "next/link";
import { PHONE } from "@/app/site/the-nyc-exterminator/_lib/seo";
import { getCategories } from "@/app/site/the-nyc-exterminator/_lib/data";
import MegaMenu from "./MegaMenu";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0A0A0A]/80 backdrop-blur-xl">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold tracking-tight text-white">
            The<span className="text-green-500">NYC</span>Exterminator
          </span>
        </Link>

        <MegaMenu
          categories={getCategories()}
          phone={PHONE}
        />
      </div>
    </header>
  );
}
