# Context - Content Commands

Source: `callbackEvents` [service.callbackEvent.js](../src/util/service.callbackEvent.js)

[toc]

## Content Context

Declaration `callbackEvents.contentContextInit(callbackCommandMap)`

```json
{
  "galaxy": {
    "ingestSystem": "IngestGalaxySystemFunction"
  },
  "messages": {
    "expeditionType": "GetExpeditionTypeFunction"
  }
}
```

## Page Context

The commands can be called from the page context using the function.
```ts
callbackEvents.pageContextRequest(
  command, 
  action, 
  ...functionArgs
);
// Returns: Promise<ResponseCallbackEvent>
```

Result: **ResponseCallbackEvent**
- *success*: Indicates if callback execution is success or not.
- *referer*: Unique request identifier.
- *response*: Result of callback execution.

---

### IngestGalaxySystemFunction (galaxy.ingestSystem)

Calls `DataHelper.ingestGalaxySystem()`: updates the OGI stalk diffs (`scannedPlanets`) and, when a PTRE Team Key is given, computes the PTRE galaxy diff.

**Arguments**
- *galaxy*, *system*: displayed system
- *positions*: positions "1".."15" `{ playerId, planetId, moonId }` (-1 when absent)
- *additionnal*: positions "1".."15" `{ playerName, playerRank, playerStatus, previousOwnerId }`
- *ptreKey*: PTRE Team Key (PTRE diff skipped when empty)
- *serverTime*: OGame server time (ms), sent as `timestamp_ig`

**Result**
- PTRE payload keyed by `"g:s:p"` (empty when no diff or no key)

How to call from the page context.
```js
callbackEvents.pageContextRequest(
  "galaxy", "ingestSystem",
  galaxy, system, positions, additionnal, ptreKey, serverTime
)
```

###  GetExpeditionTypeFunction (messages.expeditionType)

**Arguments**
- message:

**Result**
- *type*: 
- *busy*: (deprecated)

How to call from the page context.
```js
callbackEvents.pageContextRequest(
  "messages", "expeditionType", 
  rawMessage
)
```


---

## Notes and considerations

- Page initialization: you must call `pageContextInit()` before using `pageContextRequest` from the page context (see its usage in `src/ogkush.js`).
- Promise behavior: `pageContextRequest` RESOLVES when `success === true` and REJECTS when `success === false` (e.g., unknown command/action or an error during callback execution). It is recommended to use `try/catch` or `.catch(...)`.
- Firefox compatibility: the response is cloned with `cloneInto`; this is transparent to the consumer.
- Arguments: parameters must be cloneable/serializable data.
- Import alias: this document uses the alias `callbackEvents` for illustration purposes. In code you can import it as a namespace `import * as callbackEvents from "../src/util/service.callbackEvent.js";` or via named imports `import { pageContextInit, pageContextRequest } from "../src/util/service.callbackEvent.js"`.

Error-handling example:
```js
try {
  const { response } = await callbackEvents.pageContextRequest(
    "messages", "expeditionType", rawMessage
  );
  console.log(response.type);
} catch (err) {
  console.error("expeditionType failed:", err.response);
}
```
