# 🏮 Nightfall Partners

A two-player co-op adventure game for couples. One partner is the **Pathfinder** (sees the daylight layer), the other is the **Seer** (sees the shadow layer). Each room can only be solved by *talking to each other*.

## How it works
- Sign up, create a **Bond** with an invite code, and your partner joins it
- Play missions ("Nights") together — each on their own device, synced in realtime
- Every room has asymmetric clues: describe what only you can see, decide together
- Choices, codes, and timed sync moments score your teamwork
- Score converts to **points** — spend them at the Quartermaster on weapons, utilities, and charms

## Stack
- React + Vite frontend
- Supabase: Auth, Postgres (RLS), Realtime sync
- Vercel hosting via GitHub Actions CI/CD
- Paychangu checkout (premium gear) — coming online in Phase 4

## Nights
1. The Lantern in the Dark — *playable now*
2. The Whispering Bridge
3. The Hollow Chapel
4. The Midnight Market
5. The Descent

## Development
```bash
npm install
cp .env.example .env  # fill in your Supabase keys
npm run dev
```
