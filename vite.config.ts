import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

function internalPortalResolverPlugin(): Plugin {
  return {
    name: 'internal-portal-resolver',
    resolveId(source, importer) {
      if (importer && importer.includes('InternalPortal.generated.tsx')) {
        if (source.startsWith('./')) {
          const target = path.resolve(__dirname, 'src/components', source.slice(2));
          return this.resolve(target, importer, { skipSelf: true });
        }
        if (source.startsWith('../')) {
          const target = path.resolve(__dirname, 'src', source.slice(3));
          return this.resolve(target, importer, { skipSelf: true });
        }
      }
      return null;
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [internalPortalResolverPlugin(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      esbuildOptions: {
        target: 'es2022',
      },
    },
    build: { 
      outDir: 'dist',
      target: 'es2022'
    },
    esbuild: {
      target: 'es2022'
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
