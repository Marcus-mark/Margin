import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

// ── Dev middleware: proxy /api/* to Vercel handlers ───────────────────────────

function devApiPlugin(): Plugin {
  return {
    name: 'dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/explain', async (
        req: IncomingMessage & { body?: unknown },
        res: ServerResponse,
      ) => {
        // Collect body
        const chunks: Buffer[] = []
        await new Promise<void>((resolve, reject) => {
          req.on('data', (c: Buffer) => chunks.push(c))
          req.on('end', resolve)
          req.on('error', reject)
        })
        try {
          req.body = JSON.parse(Buffer.concat(chunks).toString('utf-8'))
        } catch {
          req.body = {}
        }

        // Patch response with Vercel-compatible helpers
        type PatchedRes = typeof res & { status(c: number): PatchedRes; json(d: unknown): void }
        const r = res as PatchedRes
        r.status = (code: number) => { res.statusCode = code; return r }
        r.json   = (data: unknown) => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(data))
        }

        // Compile + run the Vercel handler through Vite's module system
        const mod = await server.ssrLoadModule('/api/explain.ts')
        await (mod.default as (req: unknown, res: unknown) => Promise<void>)(req, r)
      })
    },
  }
}

// ── Config ────────────────────────────────────────────────────────────────────

export default defineConfig({
  plugins: [react(), tailwindcss(), devApiPlugin()],
})
