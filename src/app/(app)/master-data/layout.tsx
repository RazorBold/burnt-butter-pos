import { Suspense, type ReactNode } from "react"

import { PAGE_CONTAINER } from "@/components/app/page-header"
import {
  MasterDataNav,
  MasterDataSidebar,
} from "@/features/master-data/components/master-data-sidebar"
import { getCurrentUser } from "@/lib/auth"
import { cn } from "@/lib/utils"

export default function MasterDataLayout({ children }: { children: ReactNode }) {
  return (
    <div className={cn(PAGE_CONTAINER, "flex flex-col gap-6 lg:flex-row lg:gap-8")}>
      <Suspense fallback={<MasterDataNav pathname={null} role={null} />}>
        <Sidebar />
      </Suspense>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}

/** Membaca sesi untuk menyaring menu sesuai role, jadi berada di dalam Suspense. */
async function Sidebar() {
  const user = await getCurrentUser()
  return <MasterDataSidebar role={user?.role ?? null} />
}
