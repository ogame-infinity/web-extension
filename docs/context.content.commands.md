# Context - Content Commands

Source: `callbackEvents` [service.callbackEvent.js](../src/util/service.callbackEvent.js)

[toc]

## Content Context

Declaration `callbackEvents.contentContextInit(callbackCommandMap)`

```json
{
  ptre: {
    galaxy: "PtreGalaxyScannerFunction"
  },
  messages: {
    expeditionType: "GetExpeditionTypeFunction"
  },
}
```

## Page Context

The commands can be called from the page context using the function.
```ts
callbackEvents.pageContextRequest(
  command, 
  action, 
  ...functionArgs
): Promise<ResponseCallbackEvent>;
```

Result: **ResponseCallbackEvent**
- *success*: Indicates if callback execution is success or not.
- *referer*: Unique request identifier.
- *response*: Result of callback execution.

---

### PtreGalaxyScannerFunction (ptre.galaxy)

**Arguments**
- *changes*: 
- *ptreKey*: PTRE Team Key
- *serverTime*:  

How to call from the page context.
```js
callbackEvents.pageContextRequest(
  "ptre", "galaxy", 
  changes, ptreKey, serverTime
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
