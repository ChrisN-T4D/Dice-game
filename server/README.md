# Anatomy API (SQLite)

The anatomy matrix lives in **`db/anatomy.sqlite`**, not in the Vue bundle. The API uses Node’s built-in **`node:sqlite`** (Node **22.5+**).

## Setup

```bash
npm run db:setup
npm run api:dev
```

API: **http://127.0.0.1:3001** (not port 3000)

| URL | What you see |
|-----|----------------|
| http://127.0.0.1:3001/ | Short HTML help page with links |
| http://127.0.0.1:3001/api/health | JSON `{"ok":true,"zoneCount":…}` |
| http://127.0.0.1:3001/api/zones?orientation=female&region=genitalia&limit=5 | JSON list |
| http://localhost:3000/ | **Vue game** (`npm run dev`) |

**Blank page?** You are probably on **port 3000** without going through `/api/…`, or the API is not running. The game UI is not the API. Use **3001** for JSON, or **3000** only with paths like `/api/health` while `api:dev` is running (Vite proxy).

## Vue dev

```bash
# Terminal 1
npm run api:dev

# Terminal 2
npm run dev
```

Then open http://localhost:3000/api/health — proxied to the API.

## Port in use

From repo root (PowerShell):

```powershell
npm run api:stop
```

Or manually:

```powershell
Get-NetTCPConnection -LocalPort 3001 -State Listen |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

If `taskkill` fails, use **`Stop-Process`** (above) or run PowerShell **as Administrator**.

`taskkill` tips:
- Use the **LISTENING** row’s PID (last column), not `CLOSE_WAIT`.
- Example: `taskkill /PID 22344 /F` (no extra spaces in the PID).

Or use another port:

```powershell
$env:ANATOMY_API_PORT=3002
npm run api:dev
```

## Environment

| Variable | Default |
|----------|---------|
| `ANATOMY_API_PORT` | `3001` |
| `ANATOMY_API_HOST` | `127.0.0.1` |
| `ANATOMY_DB_PATH` | `server/db/anatomy.sqlite` |
