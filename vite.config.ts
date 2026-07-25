import { readdirSync, readFileSync } from "node:fs"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

const host = process.env.TAURI_DEV_HOST

const WASM_DIR = "node_modules/pdfjs-dist/wasm/"
const WASM_ROUTE = "/pdfjs-wasm/"

// pdf.js fetches these by URL at runtime, so the bundler cannot see them.
const pdfjsWasm = (): Plugin => {
  const files: string[] = readdirSync(WASM_DIR)

  return {
    name: "pdfjs-wasm",

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split("?")[0]
        if (!path?.startsWith(WASM_ROUTE)) return next()

        const name = path.slice(WASM_ROUTE.length)
        if (!files.includes(name)) return next()

        res.setHeader(
          "Content-Type",
          name.endsWith(".wasm") ? "application/wasm" : "text/javascript"
        )
        res.end(readFileSync(WASM_DIR + name))
      })
    },

    generateBundle() {
      for (const name of files) {
        this.emitFile({
          type: "asset",
          fileName: `pdfjs-wasm/${name}`,
          source: readFileSync(WASM_DIR + name),
        })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), pdfjsWasm()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: [
        "**/src-tauri/**",
        "**/build-dir/**",
        "**/.flatpak-builder/**",
        "**/repo/**",
      ],
    },
  },
}))
