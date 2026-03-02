import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig, loadEnv } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import { tamaguiPlugin } from '@tamagui/vite-plugin'
import viteReact from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const convexUrl =
    env.VITE_CONVEX_URL || 'https://lovely-spider-509.convex.cloud'

  return {
    server: {
      port: 3000,
    },
    define: {
      'import.meta.env.VITE_CONVEX_URL': JSON.stringify(convexUrl),
    },
    plugins: [
      tamaguiPlugin({
        config: './tamagui.config.ts',
        disableExtraction: true,
      }),
      tsConfigPaths({
        projects: ['./tsconfig.json'],
      }),
      tanstackStart(),
      viteReact(),
    ],
  }
})
