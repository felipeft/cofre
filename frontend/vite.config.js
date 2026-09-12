import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const loadedEnv = loadEnv(mode, __dirname, '')
  const appMode = process.env.VITE_APP_MODE || loadedEnv.VITE_APP_MODE || 'production'
  const isDemo = appMode === 'demo'

  if (!['production', 'demo'].includes(appMode)) {
    throw new Error(`VITE_APP_MODE inválido: "${appMode}". Use "production" ou "demo".`)
  }
  if (isDemo && (process.env.VITE_API_URL || loadedEnv.VITE_API_URL)) {
    throw new Error('O build Demo não aceita VITE_API_URL. Remova a variável para garantir o isolamento da produção.')
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: [
        {
          find: '@cofre-api-client',
          replacement: path.resolve(__dirname, isDemo ? './src/demo/apiClient.js' : './src/api/client.js'),
        },
        {
          find: '@cofre-fonts',
          replacement: path.resolve(__dirname, isDemo ? './src/styles/fonts.demo.css' : './src/styles/fonts.production.css'),
        },
        { find: '@', replacement: path.resolve(__dirname, './src') },
      ],
    },
    server: {
      proxy: isDemo ? undefined : {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (requestPath) => requestPath.replace(/^\/api/, ''),
        },
      },
    },
  }
})
