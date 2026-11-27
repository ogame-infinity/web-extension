# Storage: `chrome.storage.local` (universe data)

Sources: [`src/ctxcontent/index.js`](../src/ctxcontent/index.js), [`src/ctxcontent/data-helper.js`](../src/ctxcontent/data-helper.js)

This document describes how OGame Infinity stores the per-universe data (players, planets, galaxy diffs) in the extension storage, and how this data is refreshed and cleaned.

[toc]

## Scope

This document only covers `chrome.storage.local`, which is only accessible from the content script (`src/ctxcontent/`). It is shared by the whole extension: all universes use the same storage. The page `localStorage` (`ogk-data`: options, expeditions, side stalk history, PTRE team key...) is a separate storage, not described here.

The page cannot access `chrome.storage`. It reads universe data through the content script, either with the `ogi-players` / `ogi-filter` events (`dataHelper.getPlayer()` / `filter()`) or with the callback bridge (see [service.callbackEvent.md](./service.callbackEvent.md)).

On Chrome, `chrome.storage.local` is limited to 10 MB for the whole extension unless the `unlimitedStorage` permission is declared: the Chrome manifest (`src/manifest.json`) declares it (no install warning on Chrome). Firefox uses the IndexedDB limits (smaller of 10% of the disk or 10 GiB), so the Firefox manifest does not declare it (it would show an install warning there).

## Keys per universe

`<U>` is the universe id taken from the host name, e.g. `s285-fr`.

| Key | Content | Written by | Read by |
|---|---|---|---|
| `<U>` | Public API snapshot: `players`, `names`, `topScore`, `lastUpdate`, `lastPlayersUpdate`, `lastPlanetsUpdate` (copy of the `DataHelper` object without the keys stored elsewhere, see [Page load sequence](#page-load-sequence)) | `processData()` in `index.js`, only when `refreshPublicApiData()` actually reloaded the API data | `main()` in `index.js` (`Object.assign` into the `DataHelper`) |
| `ogi-scanned-<U>` | JSON **string** `{ scannedPlanets, scannedPlayers }` | `DataHelper.saveData()` | `DataHelper.init()` |
| `ogi-galaxy-<U>` | JSON **string** `{ galaxyStorage, lastGalaxyUpdateTS }` (PTRE only) | `DataHelper.flushGalaxyStorage()` | `DataHelper.init()` |

`<U>-universe-data-information` and `<U>-expirations` can be written by `getUniverseData()` (`helpers/universe.data.js`), but this helper is currently not called, so these keys do not exist in practice.

Extension-wide key (not tied to a universe): `ogi-storage-cleanup` = `{ lastRun }` (ms), the last run of the [daily purge](#daily-purge-of-unplayed-universes).

## Page load sequence

1. `main()` reads `<U>` and copies it into a new `DataHelper` (`Object.assign`). If this fails, the **whole** `chrome.storage.local` is cleared (all universes).
2. `processData()` calls `init()`, which reads `ogi-scanned-<U>` and `ogi-galaxy-<U>`. These dedicated keys are the **only source of truth** for `scannedPlanets`, `scannedPlayers`, `galaxyStorage` and `lastGalaxyUpdateTS`. Until `init()` completes, `scannedPlanets` / `scannedPlayers` are empty objects (set by the constructor), so `getPlayer()` already works with the API planets only.
3. `refreshPublicApiData()` refreshes the public API data (see below).
4. With a PTRE team key, `rebuildGalaxyStorage()` rebuilds `galaxyStorage` when a newer API snapshot is available.
5. Only if `refreshPublicApiData()` actually reloaded the API data (`lastUpdate` changed), the `DataHelper` is saved back into `<U>`, without the keys stored elsewhere (`galaxyStorage`, `lastGalaxyUpdateTS`, `scannedPlanets`, `scannedPlayers`) and the runtime fields (`_galaxyFlushTimer`, `_lastFlushError`, `_galaxySnapshot`). Otherwise the stored copy is already up to date and is not rewritten.

## `players`: public API snapshot

`players` holds **every player of the universe with all their planets**, as described by the OGame public API. It is stored in `<U>`.

```js
// chrome.storage.local["s285-fr"]
{
  "players": {
    "102345": {
      "id": 102345,
      "name": "Bob",
      "status": "",                      // "i", "I", "v", "a"...
      "alliance": "[ABC] Alliance ABC",  // built from the alliance id
      "points":   { "score": 1250000, "position": 42 },
      "economy":  { "score": 800000,  "position": 51 },
      "research": { "score": 300000,  "position": 60 },
      "military": { "score": 150000,  "position": 80, "ships": 1234 },
      // ...other highscore types
      "planets": [                       // sorted by coords
        { "id": 33612345, "player": 102345, "name": "Homeworld", "coords": "1:100:8",  "moon": 33612399 },
        { "id": 33612400, "player": 102345, "name": "Colony",    "coords": "1:105:12", "moon": 0 }
      ]
    }
  },
  "names": { "Bob": 102345 },            // name -> id
  "topScore": 98765432,
  "lastUpdate": "2026-11-23T10:15:00.000Z"
}
```

- `planets[].id` is the planet id from `universe.xml` (same value as `data-planet-id` in the galaxy view). The lowest id of a player is used as their homeworld (`ogl-main` in the stalk lists, `main` flag in the PTRE activities).
- `planets[].moon` is the moon id, `0` when there is no moon.

### Update

`players` is only written by `DataHelper.refreshPublicApiData()`, which **rebuilds it entirely** from `players.xml`, `universe.xml`, `alliances.xml` and the highscores. Nothing else modifies it: the galaxy view only reads it.

`refreshPublicApiData()` runs on page load when the previous update is older than 30 minutes. The XML files go through the browser HTTP cache (`cache: "default"`); `universe.xml` (planets and moons) only changes about once a week.

## `scannedPlanets` / `scannedPlayers`: galaxy diffs

`scannedPlanets` only holds the **differences** between what was seen in the galaxy view and the `players` snapshot. They fill the gap until the next weekly API snapshot. Stored in `ogi-scanned-<U>`.

```js
// JSON.parse(chrome.storage.local["ogi-scanned-s285-fr"])
{
  "scannedPlanets": {
    "102345": {                 // player id
      "3:50:7":   false,        // planet seen without moon, unknown to the API
      "1:105:12": 33699999,     // planet seen with this moon, the API has another / no moon
      "1:100:8":  null          // planet gone (empty position or taken by another player)
    }
  },
  "scannedPlayers": { "102345": "Bob" }    // player id -> name seen in the galaxy view
}
```

| Value | Meaning | Display |
|---|---|---|
| moon id (number) | planet seen with this moon | green (`ogl-scan`) |
| `false` | planet seen without moon | green (`ogl-scan`) |
| `null` | the player no longer owns these coords | red (`ogl-deleted`) |

### Update from the galaxy view

Each displayed system goes through:

```
page: processGalaxySystem()            reads the 15 positions from the DOM
  -> bridge galaxy.ingestSystem
content: DataHelper.ingestGalaxySystem()
           |- updateScannedPlanets()    OGI stalk diffs, always runs, then saveData()
           |- diffPtreGalaxySystem()    PTRE galaxy diff, only with a team key
```

`updateScannedPlanets()`, for each position:

- Occupied position, any player:
  - `scannedPlayers[playerId]` is set to the displayed name when missing.
  - If `players` already lists this planet with the same moon (the `known` test; the API uses `0` for "no moon", the galaxy view `-1`), any older `scannedPlanets` entry for these coords is **removed**.
  - Otherwise `scannedPlanets[playerId][coords]` is set to the moon id or `false`.
- `previousOwnerId` (sent by the page): a player shown in a stalk list who no longer owns the coords. `scannedPlanets[previousOwnerId][coords]` is set to `null`.

The whole `ogi-scanned-<U>` key is saved after each system.

### Update from the API: prune

Right after `players` is rebuilt, `refreshPublicApiData()` calls `pruneScannedPlanets()`, which removes the entries the API now agrees with, then saves `ogi-scanned-<U>` if something changed:

| Entry | Removed when |
|---|---|
| moon id / `false` | `players` lists the planet with the same moon |
| `null` | `players` no longer lists these coords for that player (or the player is no longer in the API) |
| player | no entry left |

Entries still ahead of the API are kept and will be removed by a later snapshot, or when the galaxy view confirms the API again.

`refreshPublicApiData()` also resets `scannedPlayers` to `{}`.

### Display: `getPlayer()`

`DataHelper.getPlayer(id)` merges both structures on every call; nothing is persisted:

1. Start from a copy of `players[id].planets`.
2. For each `scannedPlanets[id]` entry, remove the API planet at the same coords (if any) and append `{ coords, moon, scanned: true }` (`deleted: true` when the value is `null`).
3. `scannedPlayers[id]`, when set, overrides the API name.

Scanned entries only contain `coords` and `moon`: the API `id` and `name` of a replaced planet are not kept.

## `galaxyStorage`: PTRE galaxy snapshot

Only used with a PTRE team key. Stored in `ogi-galaxy-<U>`.

```js
{
  "galaxyStorage": {
    "1": {                       // galaxy
      "100": {                   // system: always 15 positions
        "1": { "playerId": -1, "planetId": -1, "moonId": -1 },
        "8": { "playerId": 102345, "planetId": 33612345, "moonId": 33612399 }
        // ...
      }
    }
  },
  "lastGalaxyUpdateTS": 1763500000   // universe.xml timestamp (Unix seconds)
}
```

- `rebuildGalaxyStorage()` rebuilds the whole snapshot from `universe.xml` when its timestamp is newer than `lastGalaxyUpdateTS`.
- `diffPtreGalaxySystem()` compares the displayed system with the stored one, returns the changed positions to the page (sent to PTRE) and stores the new system snapshot (debounced write, 2 s).

### Settings → PTRE

The PTRE settings show the galaxy storage through the callback bridge (`ptre.*` actions in `index.js`):

- **Current universe** (`ptre.galaxyInfo`): last API update (`lastGalaxyUpdateTS`), systems count and size of `ogi-galaxy-<U>`.
- **All universes** (`ptre.galaxyInfoAll`): total size of every `ogi-galaxy-*` key. "Details" unfolds a table (universe / last update / systems / size) with a Delete button per universe (`ptre.galaxyDelete`, no confirmation). Only the `ogi-galaxy-<universe>` key is removed; `<U>` and `ogi-scanned-<U>` are kept.

Sizes are the length of the stored JSON string: Chrome counts about 17% more in its quota (see [Known limitations](#known-limitations)).

Deleting the current universe (Delete button or settings reset "API data (players, planets, PTRE galaxy)") also cancels the pending debounced write, otherwise it would write the key back 2 s later.

## Daily purge of unplayed universes

Source: [`src/ctxcontent/services/storage.cleanup.js`](../src/ctxcontent/services/storage.cleanup.js), scheduled by `main()` in `index.js`.

- **When**: 3 minutes after a page load, on any universe, at most once a day. The last run is stored in `ogi-storage-cleanup` (shared by all universes and tabs, written before the purge so concurrent tabs skip it).
- **What**: every **other** universe whose `<U>.lastUpdate` is older than **8 days**, or missing / unreadable (orphan keys). `lastUpdate` is refreshed by `refreshPublicApiData()` whenever the universe is played, so it is the "last played" date. The current universe is never purged.
- **Removed keys**: `<U>`, `ogi-scanned-<U>`, `ogi-galaxy-<U>`, `<U>-expirations`, `<U>-universe-data-information`. All keys of a universe are kept or removed together.
- **Next visit**: `<U>` is rebuilt from the API, `ogi-galaxy-<U>` too with a PTRE team key. The lost `ogi-scanned-<U>` diffs are covered by the weekly API snapshot by then.

Purged universes are logged in the console (`Purged universes not played for 8+ days: ...`).

## Cleanup summary

| Data | Automatic | Manual |
|---|---|---|
| `players` (`<U>`) | Rebuilt by `refreshPublicApiData()`; whole universe purged after 8 days unplayed | Settings reset "API data (players, planets, PTRE galaxy)" (`storage.resetUniverseApi`): removes every key of the current universe (`<U>`, `ogi-galaxy-<U>`, `<U>-*`) except `ogi-scanned-<U>`, then the page reload downloads the API files again, bypassing the browser cache (`ogi-api-reload` flag in `sessionStorage`), and rebuilds the PTRE galaxy |
| `scannedPlanets` | `pruneScannedPlanets()` after each API refresh; entry removed when the galaxy view confirms the API; whole universe purged after 8 days unplayed | Settings reset "Planet changes seen in galaxy" (`ogi-clear` → `clearData()`, the API data is not downloaded again), current universe only |
| `scannedPlayers` | Reset by every `refreshPublicApiData()` | Settings reset "Planet changes seen in galaxy" |
| `galaxyStorage` | Rebuilt on each new API snapshot; whole universe purged after 8 days unplayed | Settings → PTRE: Delete button per universe (any universe, rebuilt at the next API refresh); settings reset "API data (players, planets, PTRE galaxy)", current universe only (rebuilt right away) |
| Everything (all universes) | `chrome.storage.local.clear()` if `<U>` cannot be loaded in `main()` | none |

A universe that is no longer played (closed or merged universe) loses all its keys 8 days after the last visit, through the [daily purge](#daily-purge-of-unplayed-universes). The page `localStorage` (`ogk-data`) of that universe cannot be cleaned from another universe.

## Console logs

Every operation on `<U>`, `ogi-scanned-<U>` and `ogi-galaxy-<U>` (load, public API refresh, write, settings resets, PTRE galaxy rebuild / delete, daily purge) is logged by a single logger, `universeStorage` (`src/ctxcontent/services/storage.logger.js`): type `universeStorage` in the console filter. Messages about `ogi-galaxy-<U>` only start with `[galaxyStoragePTRE]`. Debug-level lines (skips, load) are hidden by default in Chrome ("Verbose" level). The galaxy view ingestion (normal gameplay) is not logged.

## Known limitations

- `<U>` is a copy of the whole `DataHelper` object minus the excluded keys: it also contains runtime fields (`universe`, `loading`, `_ptreDebugLogs`) that are not needed.
- `lastUpdate`, `lastPlayersUpdate` and `lastPlanetsUpdate` are always set together by `refreshPublicApiData()` and hold the same value.
- `galaxyStorage` is only rebuilt when the API data was reloaded on the current page load: a PTRE team key added less than 30 minutes after the last API refresh only gets the systems visited in the galaxy view until the next refresh.
- `ogi-scanned-<U>` and `ogi-galaxy-<U>` store a JSON string instead of an object: Chrome serializes it a second time and counts the escaped quotes in the quota (about +17%).
- A scanned entry replacing an API planet loses its `id`: if it is the homeworld, the next lowest id is shown as homeworld.
- `filter()` loops over `this.scanned`, which does not exist, and the name lookup in `scannedPlayers` in `getPlayer()` never matches.
