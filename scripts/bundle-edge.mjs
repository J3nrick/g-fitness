import fs from 'fs'
import path from 'path'

const root = path.join(process.cwd(), 'supabase', 'functions')
const cors = fs.readFileSync(path.join(root, '_shared', 'cors.ts'), 'utf8')
const gemini = fs.readFileSync(path.join(root, '_shared', 'claude.ts'), 'utf8')

for (const name of ['nutrition-coach', 'routine-generator', 'progress-analysis']) {
  const lines = fs.readFileSync(path.join(root, name, 'index.ts'), 'utf8').split(/\n/)
  const out = [
    'import "jsr:@supabase/functions-js/edge-runtime.d.ts"',
    cors,
    gemini,
  ]
  for (const line of lines) {
    if (line.includes('edge-runtime.d.ts')) continue
    if (line.includes('_shared/cors')) continue
    if (line.includes('_shared/claude')) continue
    out.push(line)
  }
  const content = out.join('\n')
  fs.writeFileSync(path.join(root, name, 'bundle.ts'), content)
  console.log(name, content.length)
}
