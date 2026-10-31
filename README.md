# G! — Tara. Train. Fuel. Grow.

Filipino-first fitness companion: workouts, meals, streaks and an AI coach.
React 19 + Vite + Tailwind, Supabase for auth/data/Edge Functions, **Claude (`claude-opus-5-5`)** for all AI.

## AI features (Claude)

| Feature | Edge Function | What Claude does |
|---|---|---|
| G! Coach chat | `ai-chat` | Coaching chat grounded in your logged data |
| Meal scan | `meal-scan` | Vision: identifies foods in a photo + estimates macros |
| Meal plan | `nutrition-coach` | Suggests Filipino meals that fit remaining macros |
| Routine builder | `routine-generator` | Builds a weekly training split |
| Progress report | `progress-analysis` | 30/60/90-day review with a score |

Shared helper: `supabase/functions/_shared/claude.ts`.

### Setup

1. Set the Edge secret (production path — key stays server-side):
   ```bash
   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   ```
2. Redeploy functions: `npx supabase functions deploy ai-chat meal-scan nutrition-coach routine-generator progress-analysis`
3. Local/demo only: `VITE_ANTHROPIC_API_KEY` in `.env.local` enables a browser fallback when the Edge Function is unreachable. Never ship this in a public build — it exposes the key.

## Dev

```bash
npm install
npm run dev
```

`.env.local` needs `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; `VITE_AUTH_BYPASS=true` runs demo mode.
