"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { MASTER_DATA_SECTIONS } from "@/features/master-data/sections"
import { cn } from "@/lib/utils"

/** Sidebar yang menandai bagian aktif. Membaca URL, jadi dibungkus <Suspense> di layout. */
export function MasterDataSidebar() {
  return <MasterDataNav pathname={usePathname()} />
}

/** Tampilan sidebar; tanpa pathname (fallback Suspense) tidak ada bagian yang ditandai aktif. */
export function MasterDataNav({ pathname }: { pathname: string | null }) {
  return (
    <aside className="lg:w-[208px] lg:shrink-0">
      <p className="hidden text-xl font-bold text-brand-ink lg:block">Master Data</p>
      <nav
        aria-label="Bagian Master Data"
        className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:mt-4 lg:px-0"
      >
        <ul className="flex gap-2 lg:flex-col lg:gap-1">
          {MASTER_DATA_SECTIONS.map((section) => {
            const href = `/master-data/${section.slug}`
            const active = pathname === href
            return (
              <li key={section.slug} className="shrink-0">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center gap-2.5 rounded-lg border border-border px-3 text-sm font-medium whitespace-nowrap text-text-strong transition-colors outline-none hover:bg-nav-active/70 focus-visible:ring-3 focus-visible:ring-ring/50 lg:h-11 lg:border-transparent lg:text-[15px]",
                    active && "border-transparent bg-nav-active font-semibold text-brand-ink",
                  )}
                >
                  <section.icon className="size-[18px] shrink-0 lg:size-5" aria-hidden />
                  {section.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
