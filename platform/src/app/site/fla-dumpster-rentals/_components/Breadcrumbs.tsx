// @ts-nocheck
import Link from "next/link";
import { getBreadcrumbSchema } from "@/app/site/fla-dumpster-rentals/_lib/seo";

interface BreadcrumbItem {
  name: string;
  url: string;
}

export default function Breadcrumbs({
  items,
  dark = false,
}: {
  items: BreadcrumbItem[];
  dark?: boolean;
}) {
  const allItems = [{ name: "Home", url: "/" }, ...items];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getBreadcrumbSchema(allItems)),
        }}
      />
      <nav
        aria-label="Breadcrumb"
        className={`text-sm ${dark ? "text-zinc-400" : "text-zinc-500"}`}
      >
        <ol className="flex flex-wrap items-center gap-1">
          {allItems.map((item, i) => (
            <li key={item.url} className="flex items-center gap-1">
              {i > 0 && (
                <span className={dark ? "text-zinc-600" : "text-zinc-300"}>
                  /
                </span>
              )}
              {i < allItems.length - 1 ? (
                <Link
                  href={item.url}
                  className={
                    dark
                      ? "hover:text-orange-400 text-zinc-400"
                      : "hover:text-blue-600"
                  }
                >
                  {item.name}
                </Link>
              ) : (
                <span
                  className={`font-medium ${dark ? "text-white" : "text-zinc-900"}`}
                >
                  {item.name}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
