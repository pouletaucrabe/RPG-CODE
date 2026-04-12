;(function () {
"use strict"

/* ========================= */
/* CONNEXION WEBSOCKET       */
/* ========================= */

let ws = null
let wsReady = false
let reconnectAttempt = 0
const msgQueue = []

const WS_URL = (location.protocol === "https:" ? "wss://" : "ws://") + location.host

function connect() {
  try { ws = new WebSocket(WS_URL) } catch (e) {
    scheduleReconnect(); return
  }

  ws.addEventListener("open", () => {
    wsReady = true
    reconnectAttempt = 0
    // Flush queued messages
    while (msgQueue.length) ws.send(msgQueue.shift())
    // Re-subscribe to all active subscriptions
    subscriptions.forEach((_, subPath) => {
      wsSendRaw({ type: "subscribe", path: subPath })
    })
    // Re-register onDisconnect handlers
    pendingDisconnects.forEach((action, p) => {
      wsSendRaw({ type: "onDisconnect", action: action.type, path: p, value: action.value })
    })
  })

  ws.addEventListener("message", e => {
    try { handleServerMsg(JSON.parse(e.data)) } catch (err) {}
  })

  ws.addEventListener("close", () => {
    wsReady = false; ws = null
    fireInfoConnected(false)
    scheduleReconnect()
  })

  ws.addEventListener("error", () => { /* close suit */ })
}

function scheduleReconnect() {
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), 30000) + Math.random() * 500
  reconnectAttempt++
  setTimeout(connect, delay)
}

function wsSendRaw(obj) {
  const str = JSON.stringify(obj)
  if (ws && wsReady) ws.send(str)
  else msgQueue.push(str)
}

/* ========================= */
/* CACHE LOCAL               */
/* ========================= */

const localCache = {}

function getAtPath(obj, p) {
  if (!p || p === "") return obj
  const parts = p.split("/").filter(Boolean)
  let cur = obj
  for (const part of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") return null
    cur = cur[part]
  }
  return cur === undefined ? null : cur
}

function setAtPath(obj, p, value) {
  const parts = p.split("/").filter(Boolean)
  if (parts.length === 0) {
    Object.keys(obj).forEach(k => delete obj[k])
    if (value && typeof value === "object") Object.assign(obj, value)
    return
  }
  let cur = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const pt = parts[i]
    if (cur[pt] === null || cur[pt] === undefined || typeof cur[pt] !== "object") cur[pt] = {}
    cur = cur[pt]
  }
  const last = parts[parts.length - 1]
  if (value === null || value === undefined) delete cur[last]
  else cur[last] = value
}

function deepClone(v) {
  if (v === null || v === undefined || typeof v !== "object") return v
  try { return JSON.parse(JSON.stringify(v)) } catch (e) { return v }
}

/* ========================= */
/* SUBSCRIPTIONS             */
/* ========================= */

// Map<path, { value: Set, child_added: Set, child_changed: Set, child_removed: Set, startAt: number|null }>
const subscriptions = new Map()

function getOrCreateSub(path) {
  if (!subscriptions.has(path)) {
    subscriptions.set(path, {
      value: new Set(), child_added: new Set(),
      child_changed: new Set(), child_removed: new Set(),
      startAt: null
    })
  }
  return subscriptions.get(path)
}

function registerSub(path, event, cb, opts) {
  const sub = getOrCreateSub(path)
  if (sub[event]) sub[event].add(cb)
  if (opts && opts.startAt !== undefined) sub.startAt = opts.startAt

  // Subscribe to server
  wsSendRaw({ type: "subscribe", path })

  // Fire immediately with cached value if available
  const cached = getAtPath(localCache, path)
  if (cached !== null && cached !== undefined) {
    if (event === "value") {
      setTimeout(() => { try { cb(makeSnap(path, cached)) } catch (e) {} }, 0)
    } else if (event === "child_added" && typeof cached === "object") {
      setTimeout(() => {
        Object.entries(cached).forEach(([k, v]) => {
          if (sub.startAt !== null && v && typeof v === "object" && v.time < sub.startAt) return
          try { cb(makeSnap(path + "/" + k, v, k)) } catch (e) {}
        })
      }, 0)
    }
  }
  return cb
}

function unregisterSub(path, event, cb) {
  if (!subscriptions.has(path)) return
  const sub = subscriptions.get(path)
  if (event && cb && sub[event]) sub[event].delete(cb)
  else if (!event) subscriptions.delete(path)
  // Clean up if empty
  if (sub.value.size + sub.child_added.size + sub.child_changed.size + sub.child_removed.size === 0) {
    subscriptions.delete(path)
    wsSendRaw({ type: "unsubscribe", path })
  }
}

/* ========================= */
/* SNAPSHOT                  */
/* ========================= */

function makeSnap(path, value, keyOverride) {
  const key = keyOverride !== undefined
    ? keyOverride
    : (path ? path.split("/").filter(Boolean).pop() || "" : "")
  return {
    val()    { return value === undefined ? null : value },
    key,
    exists() { return value !== null && value !== undefined },
    forEach(fn) {
      if (!value || typeof value !== "object") return
      for (const [k, v] of Object.entries(value)) {
        if (fn(makeSnap(path + "/" + k, v, k)) === true) break
      }
    }
  }
}

/* ========================= */
/* FAN-OUT                   */
/* ========================= */

function fireCallbacks(changedPath, oldValue, newValue) {
  subscriptions.forEach((sub, subPath) => {
    const hasAny = sub.value.size + sub.child_added.size + sub.child_changed.size + sub.child_removed.size
    if (!hasAny) return

    if (subPath === changedPath) {
      // Exact match → fire value callbacks
      sub.value.forEach(cb => { try { cb(makeSnap(changedPath, newValue)) } catch (e) {} })

    } else if (changedPath.startsWith(subPath + "/")) {
      // Changed path is UNDER the subscription (subPath is ancestor)

      // Fire value with full subtree
      if (sub.value.size) {
        const subtree = getAtPath(localCache, subPath)
        sub.value.forEach(cb => { try { cb(makeSnap(subPath, subtree)) } catch (e) {} })
      }

      // If changed path is a DIRECT child of subPath → fire child events
      const rest = changedPath.slice(subPath.length + 1)
      if (!rest.includes("/")) {
        const key = rest
        if (newValue === null || newValue === undefined) {
          sub.child_removed.forEach(cb => { try { cb(makeSnap(changedPath, null, key)) } catch (e) {} })
        } else if (oldValue === null || oldValue === undefined) {
          const startAt = sub.startAt
          if (startAt === null || !newValue || typeof newValue !== "object" || !("time" in newValue) || newValue.time >= startAt) {
            sub.child_added.forEach(cb => { try { cb(makeSnap(changedPath, newValue, key)) } catch (e) {} })
          }
        } else {
          sub.child_changed.forEach(cb => { try { cb(makeSnap(changedPath, newValue, key)) } catch (e) {} })
        }
      }

    } else if (subPath.startsWith(changedPath + "/")) {
      // Subscription is UNDER the changed path
      if (sub.value.size) {
        const val = getAtPath(localCache, subPath)
        sub.value.forEach(cb => { try { cb(makeSnap(subPath, val)) } catch (e) {} })
      }
    }
  })
}

/* ========================= */
/* .info/connected           */
/* ========================= */

function fireInfoConnected(val) {
  const sub = subscriptions.get(".info/connected")
  if (sub && sub.value.size) {
    const snap = makeSnap(".info/connected", val)
    sub.value.forEach(cb => { try { cb(snap) } catch (e) {} })
  }
}

/* ========================= */
/* MESSAGES SERVEUR          */
/* ========================= */

const pendingOnce  = new Map()       // id → { path, resolve, cb }
const pendingWrites = new Map()      // id → resolve
const pendingTxns  = new Map()       // id → { fn }
const pendingTxnOk = new Map()       // id → resolve
const pendingPush  = new Map()       // id → resolveKey
const pendingDisconnects = new Map() // path → { type, value }

let msgId = 0
function nextId() { return "m" + (++msgId) }

function handleServerMsg(msg) {
  switch (msg.type) {

    case "connected":
      if (msg.value) {
        window.__authReady = true
        if (!window.__authUid) window.__authUid = "ws_" + Math.random().toString(36).slice(2, 8)
        authStateCbs.forEach(cb => { try { cb({ uid: window.__authUid }) } catch (e) {} })
      }
      fireInfoConnected(!!msg.value)
      break

    case "value": {
      const oldVal = deepClone(getAtPath(localCache, msg.path))
      setAtPath(localCache, msg.path, msg.value)
      fireCallbacks(msg.path, oldVal, msg.value)
      break
    }

    case "child_added": {
      const childPath = msg.path + "/" + msg.key
      setAtPath(localCache, childPath, msg.value)
      const sub = subscriptions.get(msg.path)
      if (sub) {
        if (sub.startAt !== null && msg.value && typeof msg.value === "object" && "time" in msg.value && msg.value.time < sub.startAt) break
        sub.child_added.forEach(cb => { try { cb(makeSnap(childPath, msg.value, msg.key)) } catch (e) {} })
      }
      break
    }

    case "child_changed": {
      const childPath = msg.path + "/" + msg.key
      setAtPath(localCache, childPath, msg.value)
      const sub = subscriptions.get(msg.path)
      if (sub) sub.child_changed.forEach(cb => { try { cb(makeSnap(childPath, msg.value, msg.key)) } catch (e) {} })
      break
    }

    case "child_removed": {
      const childPath = msg.path + "/" + msg.key
      setAtPath(localCache, childPath, null)
      const sub = subscriptions.get(msg.path)
      if (sub) sub.child_removed.forEach(cb => { try { cb(makeSnap(childPath, null, msg.key)) } catch (e) {} })
      break
    }

    case "once_result": {
      const p = pendingOnce.get(msg.id)
      if (!p) break
      pendingOnce.delete(msg.id)
      const snap = makeSnap(p.path, msg.value)
      if (p.cb) { try { p.cb(snap) } catch (e) {} }
      p.resolve(snap)
      break
    }

    case "transaction_request": {
      const t = pendingTxns.get(msg.id)
      if (!t) break
      let newVal
      try { newVal = t.fn(msg.current) } catch (e) { newVal = msg.current }
      wsSendRaw({ type: "transaction_result", id: msg.id, value: newVal })
      break
    }

    case "write_ack": {
      const r = pendingWrites.get(msg.id)
      if (r) { r(); pendingWrites.delete(msg.id) }
      const tr = pendingTxnOk.get(msg.id)
      if (tr) { tr(); pendingTxnOk.delete(msg.id) }
      break
    }

    case "push_result": {
      const r = pendingPush.get(msg.id)
      if (r) { r(msg.key); pendingPush.delete(msg.id) }
      break
    }

    case "auth_ok":
      onAuthOk(msg)
      break

    case "auth_error":
      onAuthError(msg)
      break
  }
}

/* ========================= */
/* AUTH                      */
/* ========================= */

const authStateCbs = []

function onAuthOk(msg) {
  window.__authRole = msg.role || null
  window.__authPlayerId = msg.playerId || null
  window.__gmAuthBusy = false

  if (msg.role === "gm") {
    if (typeof showGMAuthMessage === "function") showGMAuthMessage("Connexion MJ réussie !")
    if (typeof closeGMAuthModal === "function") setTimeout(() => closeGMAuthModal(), 800)
    if (typeof activateGM === "function") setTimeout(() => activateGM(true), 50)
    if (typeof showNotification === "function") showNotification("Connexion MJ réussie")
  } else if (msg.role === "player" && msg.playerId) {
    if (typeof updatePlayerAuthMenuState === "function") updatePlayerAuthMenuState()
    if (typeof tryAutoSelectAuthenticatedPlayer === "function") {
      setTimeout(() => tryAutoSelectAuthenticatedPlayer(), 60)
    }
  } else if (!msg.role) {
    authStateCbs.forEach(cb => { try { cb(null) } catch (e) {} })
  }
  if (typeof updateIntroLogoutBtn === "function") updateIntroLogoutBtn()
}

function onAuthError(msg) {
  if (typeof showGMAuthMessage === "function") showGMAuthMessage(msg.message || "Erreur d'authentification", true)
  window.__gmAuthBusy = false
}

/* ========================= */
/* makeRef                   */
/* ========================= */

function makeRef(path) {
  return {
    path,

    set(value) {
      // Intercept profiles/*/playerId → auth player
      if (path.startsWith("profiles/") && path.endsWith("/playerId")) {
        wsSendRaw({ type: "auth", role: "player", playerId: value })
        return Promise.resolve()
      }
      const id = nextId()
      return new Promise(resolve => {
        pendingWrites.set(id, resolve)
        wsSendRaw({ type: "set", path, value: value === undefined ? null : value, id })
      })
    },

    update(value) {
      const id = nextId()
      return new Promise(resolve => {
        pendingWrites.set(id, resolve)
        wsSendRaw({ type: "update", path, value, id })
      })
    },

    remove() {
      const id = nextId()
      return new Promise(resolve => {
        pendingWrites.set(id, resolve)
        wsSendRaw({ type: "remove", path, id })
      })
    },

    on(event, cb) {
      return registerSub(path, event, cb)
    },

    off(event, cb) {
      unregisterSub(path, event, cb)
    },

    once(event, cb) {
      if (path === ".info/connected") {
        const snap = makeSnap(path, wsReady)
        if (cb) { try { cb(snap) } catch (e) {} }
        return Promise.resolve(snap)
      }
      const id = nextId()
      return new Promise(resolve => {
        pendingOnce.set(id, { path, resolve, cb: cb || null })
        wsSendRaw({ type: "once", path, id })
      })
    },

    transaction(fn) {
      const id = nextId()
      return new Promise((resolve) => {
        pendingTxns.set(id, { fn })
        pendingTxnOk.set(id, () => {
          resolve({ committed: true, snapshot: makeSnap(path, getAtPath(localCache, path)) })
        })
        wsSendRaw({ type: "transaction", path, id })
      })
    },

    onDisconnect() {
      return {
        remove() {
          pendingDisconnects.set(path, { type: "remove" })
          wsSendRaw({ type: "onDisconnect", action: "remove", path })
        },
        set(v) {
          pendingDisconnects.set(path, { type: "set", value: v })
          wsSendRaw({ type: "onDisconnect", action: "set", path, value: v })
        },
        cancel() {
          pendingDisconnects.delete(path)
          wsSendRaw({ type: "onDisconnect_cancel", path })
        }
      }
    },

    push(value) {
      // Generate local key immediately (Firebase convention)
      const key = "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
      const id = nextId()
      wsSendRaw({ type: "push", path, value, id, key })
      let resolveKey
      new Promise(r => { resolveKey = r })  // eslint-disable-line no-new
      pendingPush.set(id, k => resolveKey && resolveKey(k))
      const childRef = makeRef(path + "/" + key)
      childRef.key = key
      return childRef
    },

    orderByChild(child) {
      const parentPath = path
      return {
        limitToLast(n) {
          return {
            once(event, cb) {
              const id = nextId()
              return new Promise(resolve => {
                pendingOnce.set(id, { path: parentPath, resolve, cb: cb || null })
                wsSendRaw({ type: "once", path: parentPath, id, query: { orderByChild: child, limitToLast: n } })
              })
            },
            on(event, cb) {
              return registerSub(parentPath, event, cb)
            }
          }
        },
        startAt(val) {
          return {
            on(event, cb) {
              return registerSub(parentPath, event, cb, { startAt: val })
            }
          }
        },
        limitToFirst(n) {
          return {
            once(event, cb) {
              const id = nextId()
              return new Promise(resolve => {
                pendingOnce.set(id, { path: parentPath, resolve, cb: cb || null })
                wsSendRaw({ type: "once", path: parentPath, id, query: { orderByChild: child, limitToFirst: n } })
              })
            }
          }
        }
      }
    }
  }
}

/* ========================= */
/* AUTH OBJECT               */
/* ========================= */

const authObj = {
  currentUser: null,

  onAuthStateChanged(cb) {
    authStateCbs.push(cb)
    if (wsReady && window.__authUid) {
      setTimeout(() => { try { cb({ uid: window.__authUid }) } catch (e) {} }, 0)
    }
  },

  signInAnonymously() {
    return Promise.resolve({ user: { uid: window.__authUid || "anon" } })
  },

  // We use email="gm" as the signal for GM login
  signInWithEmailAndPassword(email, password) {
    if (email === "gm" || (window.__gmAuthEmail && email === window.__gmAuthEmail)) {
      wsSendRaw({ type: "auth", role: "gm", password })
    }
    return Promise.resolve({ user: { uid: window.__authUid || "user" } })
  },

  createUserWithEmailAndPassword() {
    return Promise.resolve({ user: { uid: window.__authUid || "user" } })
  },

  signOut() {
    wsSendRaw({ type: "auth", role: "logout" })
    window.__authRole = null
    window.__authPlayerId = null
    authStateCbs.forEach(cb => { try { cb(null) } catch (e) {} })
    return Promise.resolve()
  }
}

/* ========================= */
/* GLOBALES firebase + db    */
/* ========================= */

const dbInstance = {
  goOnline() { /* connect() already called at load */ },
  ref(p) { return makeRef(p || "") }
}

window.firebase = {
  initializeApp() { return {} },
  database() { return dbInstance },
  auth() { return authObj }
}

/* ========================= */
/* DÉMARRAGE                 */
/* ========================= */

connect()

})()
