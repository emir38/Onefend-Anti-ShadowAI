import { defineConfig } from 'vite';
import webExtension from 'vite-plugin-web-extension';
import path from 'path';
import fs from 'fs';

// Read original manifest
const manifest = JSON.parse(fs.readFileSync('./manifest.json', 'utf-8'));

export default defineConfig(() => {
    const isFirefox = process.env.TARGET_BROWSER === 'firefox';

    if (isFirefox) {
        // Firefox: use background scripts instead of service_worker
        if (manifest.background && manifest.background.service_worker) {
            manifest.background = {
                scripts: [manifest.background.service_worker],
                type: 'module'
            };
        }
    }

    return {
        plugins: [
            webExtension({
                manifest: () => manifest,
                additionalInputs: [
                    'src/pages/onboarding.html',
                    'src/pages/blocked.html',
                    'src/pages/blocked.ts',
                    'src/content/index.ts'
                ],
                watchFilePaths: ['src/**/*'],
            }),
        ],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        build: {
            outDir: 'dist',
            emptyOutDir: true,
            minify: 'terser',
            terserOptions: {
                compress: {
                    drop_console: false,
                    pure_funcs: ['console.log', 'console.debug'],  // Strip log/debug, keep error/warn
                    drop_debugger: true,
                    passes: 2,              // Multiple compression passes
                    dead_code: true,
                    conditionals: true,
                    evaluate: true,
                    unused: true,
                },
                mangle: {
                    toplevel: true,         // Mangle top-level names
                    properties: {
                        regex: /^_/,        // Mangle private properties (prefixed with _)
                    },
                },
                format: {
                    comments: false,        // Strip all comments
                    ascii_only: true,
                },
            },
        },
    };
});
