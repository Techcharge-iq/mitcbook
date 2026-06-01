# IQBook LAN Server

Run a centralized accounting database on one PC; all other PCs on the same
local network read & write to it from the IQBook app.

## Setup (server / host PC, one time)

```bash
cd server
npm install
npm start
```

You'll see something like:

```
  Local:     http://localhost:4000
  LAN:       http://192.168.1.50:4000
```

Keep that window open. The database file lives in `~/.iqbook/iqbook-lan.db`.

## Setup (each client PC)

1. Open IQBook → **Settings → Network / Multi-user**.
2. Choose **Client (connect to server)**.
3. Paste the **LAN URL** from the host PC (e.g. `http://192.168.1.50:4000`).
4. Click **Test connection**, then **Save**.

The app will now sync with the central database every few seconds and
immediately push your changes to it.

## Concurrency

- SQLite is opened in WAL mode → many readers + one writer, no blocking.
- Each row carries a `version`. If two PCs edit the same record, the
  second save returns **409 Conflict**; the app shows a toast and
  reloads the latest version so nothing is silently overwritten.

## Backup

Just copy `~/.iqbook/iqbook-lan.db` while the server is stopped, or
use the in-app Backup button from any client.

## Firewall

Allow inbound TCP on port **4000** on the host PC. On Windows, the
first run will prompt you — click **Allow access on private networks**.