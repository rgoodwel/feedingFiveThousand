import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'share-image-url',
      transformIndexHtml(html) {
        const host = process.env.VERCEL_ENV === 'production'
          ? process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
          : process.env.VERCEL_URL
        if (!host) return html
        const imageUrl = new URL('/icon-512.png', `https://${host}`).href.replaceAll('&', '&amp;')
        return html.replaceAll('content="/icon-512.png"', `content="${imageUrl}"`)
      },
    },
  ],
})
