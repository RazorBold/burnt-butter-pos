import { Suspense, type ReactNode } from "react"

import { PAGE_CONTAINER } from "@/components/app/page-header"
import {
  MasterDataNav,
  MasterDataSidebar,
} from "@/features/master-data/components/master-data-sidebar"
import { cn } from "@/lib/utils"

export default function MasterDataLayout({ children }: { children: ReactNode }) {
  return (
    <div className={cn(PAGE_CONTAINER, "flex flex-col gap-6 lg:flex-row lg:gap-8")}>
      <Suspense fallback={<MasterDataNav pathname={null} />}>
        <MasterDataSidebar />
      </Suspense>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}
