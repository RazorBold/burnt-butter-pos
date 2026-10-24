import { Settings } from "lucide-react"
import type { Metadata } from "next"
import { Suspense } from "react"

import {
  SectionCard,
  SectionCardHeader,
  SectionCardSkeleton,
} from "@/features/master-data/components/section-card"
import { StoreSettingsForm } from "@/features/settings/components/store-settings-form"
import { getStoreSettings } from "@/features/settings/queries"
import { requirePageAccess } from "@/lib/auth"
import { formatWaktuDibuat } from "@/lib/format"

export const metadata: Metadata = { title: "Pengaturan" }

export default function PengaturanPage() {
  return (
    <SectionCard>
      <Suspense fallback={<SectionCardSkeleton rows={4} />}>
        <SettingsSection />
      </Suspense>
    </SectionCard>
  )
}

async function SettingsSection() {
  // Hanya Admin (lihat SUBSECTION_ACCESS).
  await requirePageAccess("/master-data/pengaturan")
  const settings = await getStoreSettings()
  const lastSaved = settings.updatedAt
    ? `Terakhir diubah ${formatWaktuDibuat(settings.updatedAt)}${
        settings.updatedByName ? ` oleh ${settings.updatedByName}` : ""
      }.`
    : null

  return (
    <>
      <SectionCardHeader
        icon={Settings}
        title="Pengaturan"
        description="Profil toko yang dipakai di pesanan dan pengiriman."
      />
      <StoreSettingsForm settings={settings} lastSaved={lastSaved} />
    </>
  )
}
