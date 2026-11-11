import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    // Master Data belum punya halaman ringkasan; bagian pertama yang jadi adalah Produk & Menu.
    return [{ source: "/master-data", destination: "/master-data/produk-menu", permanent: false }]
  },
  images: {
    // Foto menu/packaging yang di-upload ke Supabase Storage (bucket publik).
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
  experimental: {
    serverActions: {
      // Upload foto lewat Server Action. Vercel membatasi body ±4,5 MB, jadi foto dibatasi 4 MB
      // (lihat MAX_PHOTO_BYTES) dan batas ini sedikit di atasnya untuk field form lainnya.
      bodySizeLimit: "4.4mb",
    },
  },
}

export default nextConfig
