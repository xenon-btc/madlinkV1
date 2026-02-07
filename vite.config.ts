import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 // 5 MiB
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'MadlinK - Gestion Fibre Optique',
        short_name: 'MadlinK',
        description: 'Application de gestion d\'interventions fibre optique',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    host: true,
    port: 3004,
    strictPort: false,
    hmr: {
      clientPort: 443,
      path: 'hmr-ws'
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    target: 'es2015',
    rollupOptions: {
      input: {
        main: './index.html'
      },
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage', 'firebase/analytics'],
          'chart-vendor': ['chart.js', 'react-chartjs-2', 'chartjs-plugin-datalabels'],
          'ui-vendor': ['lucide-react', 'date-fns'],
          'utils-vendor': ['zustand', 'xlsx', 'jspdf', 'html2pdf.js', 'html2canvas'],
          // App chunks
          'auth': ['src/pages/Auth.tsx', 'src/pages/Landing.tsx', 'src/store/auth.ts'],
          'dashboard': ['src/pages/Dashboard.tsx', 'src/components/DashboardCard.tsx', 'src/components/RevenueChart.tsx'],
          'interventions': ['src/pages/Interventions.tsx', 'src/pages/InterventionTypes.tsx', 'src/pages/InterventionSearch.tsx', 'src/pages/InterventionVerification.tsx'],
          'reports': ['src/pages/Reports.tsx', 'src/pages/Expenses.tsx', 'src/pages/Invoice.tsx'],
          'settings': ['src/pages/Settings.tsx', 'src/pages/Contact.tsx', 'src/pages/Subscription.tsx', 'src/pages/Subscription2.tsx']
        }
      }
    }
  }
});