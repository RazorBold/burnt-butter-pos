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
import { TemplateEditor } from "@/features/templates/components/template-editor"
import { getTemplateSources, listTemplates } from "@/features/templates/queries"
import { requirePageAccess } from "@/lib/auth"
import { formatWaktuDibuat } from "@/lib/format"

export const metadata: Metadata = { title: "Pengaturan" }

export default function PengaturanPage() {
  return (
    <div className="space-y-6">
      <SectionCard>
        <Suspense fallback={<SectionCardSkeleton rows={4} />}>
          <SettingsSection />
        </Suspense>
      </SectionCard>
      <Suspense
        fallback={
          <SectionCard>
            <SectionCardSkeleton rows={8} />
          </SectionCard>
        }
      >
        <TemplatesSection />
      </Suspense>
    </div>
  )
}

function savedText(updatedAt: Date | null, byName: string | null) {
  return updatedAt
    ? `Terakhir diubah ${formatWaktuDibuat(updatedAt)}${byName ? ` oleh ${byName}` : ""}.`
    : null
}

async function SettingsSection() {
  // Hanya Owner (lihat SUBSECTION_ACCESS).
  await requirePageAccess("/master-data/pengaturan")
  const settings = await getStoreSettings()

  return (
    <>
      <SectionCardHeader
        icon={Settings}
        title="Pengaturan"
        description="Profil toko yang dipakai di pesanan dan pengiriman."
      />
      <StoreSettingsForm
        settings={settings}
        lastSaved={savedText(settings.updatedAt, settings.updatedByName)}
      />
    </>
  )
}

async function TemplatesSection() {
  await requirePageAccess("/master-data/pengaturan")
  const [templates, { menus, shippingLines }] = await Promise.all([
    listTemplates(),
    getTemplateSources(),
  ])
  return (
    <TemplateEditor
      templates={templates.map((template) => ({
        key: template.key,
        body: template.body,
        custom: template.custom,
        lastSaved: savedText(template.updatedAt, template.updatedByName),
      }))}
      menus={menus}
      shippingLines={shippingLines}
    />
  )
}
