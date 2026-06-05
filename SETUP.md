# Scribe — Setup Guide

## Services needed (all have free tiers, no upgrade required)

| Service | What it does | Sign up |
|---|---|---|
| **Neon** | Postgres database | neon.tech |
| **Clerk** | Auth (sign in / sign up) | clerk.com |
| **UploadThing** | Image/screenshot uploads | uploadthing.com |
| **Anthropic** | AI content generation | console.anthropic.com |

---

## 1. Neon (Database)

1. Create a project at neon.tech
2. Go to **Dashboard → Connection string** and copy the URL
3. Run the DB migration locally (once):

```bash
# Fill DATABASE_URL in .env.local first, then:
npx drizzle-kit push
```

---

## 2. Clerk (Auth)

1. Create an application at clerk.com
2. Go to **API Keys** and copy:
   - Publishable key → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - Secret key → `CLERK_SECRET_KEY`

---

## 3. UploadThing (File uploads)

1. Create an app at uploadthing.com
2. Go to **API Keys** and copy the token → `UPLOADTHING_TOKEN`

---

## 4. Fill in `.env.local`

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

DATABASE_URL=postgresql://...@...neon.tech/neondb?sslmode=require

UPLOADTHING_TOKEN=...

ANTHROPIC_API_KEY=sk-ant-...
```

---

## 5. Run locally

```bash
npx drizzle-kit push   # create tables in Neon (run once)
npm run dev
```

---

## 6. Deploy to Vercel

```bash
npx vercel
```

Add all 7 env vars in Vercel project settings → redeploy.
