# Buyer Hub

Buyer management for Australian residential sales agencies. Phase 1 runs on
your own machine — there's no login and no hosting yet.

---

## Getting it running

You need [Node.js](https://nodejs.org) 22 or newer. Check with `node --version`.

### 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New project**.
3. Give it a name, click **Generate a password**, and **save that password
   somewhere** — you'll need it in a moment and Supabase won't show it again.
4. Set the region to **Sydney (ap-southeast-2)**.
5. Click **Create new project** and wait about two minutes.

### 2. Get the connection string

1. In your project, click the green **Connect** button at the top.
2. Copy the URI shown under **Connection string**. It looks like this:

   ```
   postgresql://postgres.abcdefghijkl:[YOUR-PASSWORD]@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres
   ```

3. Replace `[YOUR-PASSWORD]` with the password you saved in step 1.

### 3. Put it in the .env.local file

Open `.env.local` in the project folder and paste the connection string between
the quotes:

```
DATABASE_URL="postgresql://postgres.abcdefghijkl:your-real-password@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres"
```

Save the file. This file is git-ignored, so your password never gets committed.

> If `.env.local` isn't there, copy the template: `cp .env.example .env.local`

### 4. Install, set up the database, and start

```bash
npm install     # once
npm run setup   # creates the tables and loads the demo data
npm run dev     # starts the app
```

Open **http://localhost:3000**.

---

## What you should see

The app opens on **Today**. Click **Buyers** in the left menu and you should
see a table of **80 buyers** with a line above it reading "14 need a check in".

Rows show the buyer's name, status, assigned agent, suburbs, budget, finance
and when they were last contacted. Buyers who haven't been contacted in a while
carry a **Check in** flag next to their name.

Today, Pipeline and Properties are placeholders for now — each says which
session builds it.

Make the window narrow (or open it on your phone) and the table becomes stacked
rows with the menu moving to the bottom of the screen.

---

## If something goes wrong

The app tells you what to do on screen. The two most common problems:

- **"The database isn't connected yet"** — `DATABASE_URL` in `.env.local` is
  empty. Go back to step 3, then restart with `npm run dev`.
- **"The database is empty"** — run `npm run setup`.

Free Supabase projects pause after a week of inactivity. If the app can't
connect, open your project at
[supabase.com/dashboard](https://supabase.com/dashboard) to wake it up.

---

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the app at http://localhost:3000 |
| `npm run setup` | Create the tables and load the demo data |
| `npm run db:push` | Create or update the tables only |
| `npm run db:seed` | Reload the demo data (clears first, safe to re-run) |
| `npm run db:studio` | Browse the database in a web UI |
| `npm run typecheck` | Check the code for type errors |
| `npm run test` | Run the tests |
| `npm run lint` | Check code style |

---

## How the project is laid out

```
app/          Screens (Today, Buyers, Pipeline, Properties)
components/   Shared UI pieces
db/           Database schema, connection, and the seed data
lib/          Vocabulary, formatting, and data queries
BRIEF.md      The product brief — the source of truth
CLAUDE.md     Decisions made while building
LATER.md      Ideas parked for after Phase 1
```

All the demo data is fictional. Phone numbers come only from the ranges the
ACMA reserves for fictional use, and emails all use the reserved `example.com`
domain, so nothing here can reach a real person.
