import { expect, type Page } from "@playwright/test"

/**
 * Halaman yang tidak boleh dibuka role ini mengarah ke Dashboard dengan toast "akses ditolak".
 * ?akses=ditolak langsung dibersihkan dari URL oleh AccessDeniedToast, jadi yang dicek toast-nya.
 */
export async function expectAccessDenied(page: Page) {
  await expect(page.getByText("Halaman itu tidak tersedia untuk role kamu.")).toBeVisible()
  await expect(page).toHaveURL(/\/dashboard(\?|$)/)
}
