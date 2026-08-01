import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
    root: "./src",
    server: {
        port: 1420,
        strictPort: true,
        watch: {
            // 3. tell vite to ignore watching `src-tauri`
            ignored: ["**/src-tauri/**"],
        },
    },
    build: {
        outDir: "../dist",
        emptyOutDir: true,
        target: "esnext",
        rollupOptions: {
            input: {
                main: "src/index.html",
                hitl: "src/hitl.html"
            }
        }
    },
});
