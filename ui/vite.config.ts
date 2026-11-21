import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig(() => {
  const isGitHubPages = process.env.GITHUB_PAGES === 'true'

  return {
    plugins: [react(), tailwindcss()],
    base: isGitHubPages ? '/reversi/' : '/',
  }
})