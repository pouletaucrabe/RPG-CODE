"use strict"

const http = require("http")
const fs   = require("fs")
const path = require("path")
const { WebSocketServer } = require("ws")

/* ========================= */
/* CONFIG                    */
/* ========================= */

const PORT        = parseInt(process.env.PORT || "3000", 10)
const GM_PASSWORD = process.env.GM_PASSWORD || "maitre"
const STATIC_DIR  = __dirname
const STATE_FILE  = path.join(__dirname, "game-state.json")
const SAVES_DIR   = path.join(__dirname, "saves")

console.log("=".repeat(50))
console.log("  La Prophétie des Mouches — Serveur Local")
console.log("=".repeat(50))
console.log(`  Port        : ${PORT}`)
console.log(`  Mot de passe MJ : "${GM_PASSWORD}"`)
console.log(`  (Change via variable d'env GM_PASSWORD=xxx node server.js)`)
console.log("=".repeat(50) + "\n")

/* ========================= */
/* STATIC FILE SERVING       */
/* ========================= */

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif":  "image/gif",
  ".svg":  "image/svg+xml",
  ".mp3":  "audio/mpeg",
  ".ogg":  "audio/ogg",
  ".wav":  "audio/wav",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
  ".ttf":  "font/ttf",
  ".otf":  "font/otf",
  ".ico":  "image/x-icon"
}

function serveStatic(req, res) {
  let urlPath = req.url.split("?")[0]
  if (urlPath === "/") urlPath = "/index.html"

  // Décoder les caractères spéciaux dans l'URL (%20 → espace, %C3%A9 → é, etc.)
  try { urlPath = decodeURIComponent(urlPath) } catch (e) {}

  // Security: prevent directory traversal
  const filePath = path.normalize(path.join(STATIC_DIR, urlPath))
  if (!filePath.startsWith(STATIC_DIR + path.sep) && filePath !== STATIC_DIR) {
    res.writeHead(403); res.end("Forbidden"); return
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === "ENOENT") { res.writeHead(404); res.end("Not found") }
      else { res.writeHead(500); res.end("Server error") }
      return
    }
    const ext = path.extname(filePath).toLowerCase()
    const ct = MIME[ext] || "application/octet-stream"
    // Add cache headers for static assets (not HTML/JS)
    const headers = { "Content-Type": ct }
    if (ext !== ".html" && ext !== ".js") {
      headers["Cache-Control"] = "public, max-age=86400"
    }
    res.writeHead(200, headers)
    res.end(data)
  })
}

/* ========================= */
/* STATE MANAGEMENT          */
/* ========================= */

function loadStateFromDisk() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, "utf8")
      const parsed = JSON.parse(raw)
      console.log("Etat chargé depuis", STATE_FILE)
      return parsed
    }
  } catch (e) { console.warn("Impossible de charger l'état:", e.message) }
  return {}
}

function loadSavesFromDisk() {
  try {
    if (!fs.existsSync(SAVES_DIR)) fs.mkdirSync(SAVES_DIR, { recursive: true })
    const files = fs.readdirSync(SAVES_DIR).filter(f => f.endsWith(".json"))
    const saves = {}
    for (const f of files) {
      try {
        const name = f.slice(0, -5)
        saves[name] = JSON.parse(fs.readFileSync(path.join(SAVES_DIR, f), "utf8"))
      } catch (e) { console.warn("Sauvegarde corrompue:", f) }
    }
    if (files.length > 0) console.log(`${files.length} sauvegarde(s) chargée(s)`)
    return saves
  } catch (e) { return {} }
}

let state = loadStateFromDisk()
// Saves are stored separately on disk
if (!state._saves) {
  state._saves = loadSavesFromDisk()
}

let persistTimer = null

function schedulePersist() {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(persistState, 2000)
}

function persistState() {
  persistTimer = null
  try {
    // Don't persist _saves in main state file (they have their own files)
    const { _saves, ...mainState } = state
    fs.writeFileSync(STATE_FILE, JSON.stringify(mainState, null, 2), "utf8")
  } catch (e) { console.warn("Erreur persistance état:", e.message) }
}

function persistSave(name, data) {
  try {
    if (!fs.existsSync(SAVES_DIR)) fs.mkdirSync(SAVES_DIR, { recursive: true })
    fs.writeFileSync(path.join(SAVES_DIR, name + ".json"), JSON.stringify(data, null, 2), "utf8")
    console.log("Sauvegarde écrite:", name)
  } catch (e) { console.warn("Erreur sauvegarde:", e.message) }
}

function deleteSaveFile(name) {
  try {
    const f = path.join(SAVES_DIR, name + ".json")
    if (fs.existsSync(f)) { fs.unlinkSync(f); console.log("Sauvegarde supprimée:", name) }
  } catch (e) {}
}

/* ========================= */
/* PATH UTILS                */
/* ========================= */

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
    const part = parts[i]
    if (cur[part] === null || cur[part] === undefined || typeof cur[part] !== "object") {
      cur[part] = {}
    }
    cur = cur[part]
  }
  const last = parts[parts.length - 1]
  if (value === null || value === undefined) delete cur[last]
  else cur[last] = value
}

function updateAtPath(obj, p, updates) {
  if (!updates || typeof updates !== "object") return
  const parts = p.split("/").filter(Boolean)
  let cur = obj
  for (const part of parts) {
    if (cur[part] === null || cur[part] === undefined || typeof cur[part] !== "object") {
      cur[part] = {}
    }
    cur = cur[part]
  }
  Object.assign(cur, updates)
}

function removeAtPath(obj, p) {
  setAtPath(obj, p, null)
}

function generateKey() {
  return "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

/* ========================= */
/* SAVE PATH HELPERS         */
/* ========================= */

function isSavePath(p) {
  return p === "saves" || (p && p.startsWith("saves/"))
}

function getSaveName(p) {
  const parts = p.split("/")
  return parts[1] || null
}

function getSaveValue(p) {
  if (p === "saves") return state._saves || {}
  const name = getSaveName(p)
  if (!name) return null
  return (state._saves || {})[name] || null
}

/* ========================= */
/* CLIENT MANAGEMENT         */
/* ========================= */

const clients = new Map()
let clientIdCounter = 0

/* ========================= */
/* BROADCAST                 */
/* ========================= */

function send(ws, msg) {
  try {
    if (ws.readyState === 1) ws.send(JSON.stringify(msg))
  } catch (e) {}
}

function broadcastValue(changedPath, value) {
  clients.forEach((info, ws) => {
    if (ws.readyState !== 1) return
    info.subscriptions.forEach(subPath => {
      if (changedPath === subPath) {
        // Exact match
        send(ws, { type: "value", path: changedPath, value })
      } else if (changedPath.startsWith(subPath + "/")) {
        // Changed path is under subscription: send changed path value
        send(ws, { type: "value", path: changedPath, value })
      } else if (subPath.startsWith(changedPath + "/")) {
        // Subscription is under changed path: send subscription's own value
        const subValue = isSavePath(subPath) ? getSaveValue(subPath) : getAtPath(state, subPath)
        send(ws, { type: "value", path: subPath, value: subValue === undefined ? null : subValue })
      }
    })
  })
}

function broadcastChildAdded(parentPath, key, value) {
  clients.forEach((info, ws) => {
    if (ws.readyState !== 1) return
    if (info.subscriptions.has(parentPath)) {
      send(ws, { type: "child_added", path: parentPath, key, value })
    }
  })
}

/* ========================= */
/* AUTH                      */
/* ========================= */

function handleAuth(ws, info, msg) {
  if (msg.role === "gm") {
    if (msg.password === GM_PASSWORD) {
      info.role = "gm"
      info.playerId = null
      send(ws, { type: "auth_ok", role: "gm" })
      console.log(`Client ${info.id}: MJ connecté`)
    } else {
      send(ws, { type: "auth_error", message: "Mot de passe MJ incorrect" })
      console.log(`Client ${info.id}: tentative MJ échouée`)
    }
  } else if (msg.role === "player") {
    info.role = "player"
    info.playerId = msg.playerId
    send(ws, { type: "auth_ok", role: "player", playerId: msg.playerId })
    console.log(`Client ${info.id}: joueur connecté (${msg.playerId})`)
  } else if (msg.role === "logout") {
    info.role = null
    info.playerId = null
    send(ws, { type: "auth_ok", role: null })
    console.log(`Client ${info.id}: déconnexion`)
  }
}

/* ========================= */
/* TRANSACTIONS              */
/* ========================= */

// Les transactions sont traitées en parallèle (pas de queue globale).
// Le serveur Node.js est mono-thread donc les écritures sont sérialisées
// naturellement — pas de race condition réelle pour un jeu à 5 joueurs.
const pendingTxns = new Map() // id → { ws, msg, timeout }

function startTxn(ws, msg) {
  const current = getAtPath(state, msg.path)
  send(ws, { type: "transaction_request", id: msg.id, path: msg.path, current })
  const timeout = setTimeout(() => {
    pendingTxns.delete(msg.id)
    console.warn("Transaction timeout:", msg.path)
  }, 5000)
  pendingTxns.set(msg.id, { ws, msg, timeout })
}

/* ========================= */
/* QUERY                     */
/* ========================= */

function applyQuery(obj, query) {
  if (!obj || typeof obj !== "object") return obj
  const entries = Object.entries(obj)
  const field = query.orderByChild
  entries.sort((a, b) => {
    const va = a[1] && typeof a[1] === "object" ? (a[1]["_saveDateMs"] ?? a[1][field] ?? 0) : 0
    const vb = b[1] && typeof b[1] === "object" ? (b[1]["_saveDateMs"] ?? b[1][field] ?? 0) : 0
    if (va < vb) return -1; if (va > vb) return 1; return 0
  })
  if (query.limitToLast) return Object.fromEntries(entries.slice(-query.limitToLast))
  if (query.limitToFirst) return Object.fromEntries(entries.slice(0, query.limitToFirst))
  return Object.fromEntries(entries)
}

/* ========================= */
/* MESSAGE HANDLING          */
/* ========================= */

function handleMessage(ws, info, msg) {
  switch (msg.type) {

    case "auth":
      handleAuth(ws, info, msg)
      break

    case "set": {
      const value = msg.value === undefined ? null : msg.value
      if (isSavePath(msg.path)) {
        if (msg.path === "saves") {
          // Replace all saves
          if (value && typeof value === "object") {
            state._saves = value
            Object.entries(value).forEach(([name, data]) => persistSave(name, data))
          }
        } else {
          const name = getSaveName(msg.path)
          if (name) {
            if (!state._saves) state._saves = {}
            if (value === null) {
              delete state._saves[name]
              deleteSaveFile(name)
            } else {
              // Inject _saveDateMs for reliable sorting
              if (value && typeof value === "object") value._saveDateMs = Date.now()
              state._saves[name] = value
              persistSave(name, value)
            }
          }
        }
        broadcastValue(msg.path, value)
      } else {
        setAtPath(state, msg.path, value)
        broadcastValue(msg.path, value)
        schedulePersist()
      }
      if (msg.id) send(ws, { type: "write_ack", id: msg.id })
      break
    }

    case "update": {
      if (!isSavePath(msg.path)) {
        updateAtPath(state, msg.path, msg.value)
        const updated = getAtPath(state, msg.path)
        broadcastValue(msg.path, updated)
        schedulePersist()
      }
      if (msg.id) send(ws, { type: "write_ack", id: msg.id })
      break
    }

    case "remove": {
      if (isSavePath(msg.path)) {
        if (msg.path !== "saves") {
          const name = getSaveName(msg.path)
          if (name && state._saves) {
            delete state._saves[name]
            deleteSaveFile(name)
          }
        }
      } else {
        removeAtPath(state, msg.path)
        schedulePersist()
      }
      broadcastValue(msg.path, null)
      if (msg.id) send(ws, { type: "write_ack", id: msg.id })
      break
    }

    case "push": {
      const key = msg.key || generateKey()
      const childPath = msg.path + "/" + key
      setAtPath(state, childPath, msg.value)
      // Broadcast child_added to subscribers of parent, and value for exact path
      broadcastChildAdded(msg.path, key, msg.value)
      broadcastValue(childPath, msg.value)
      if (msg.id) send(ws, { type: "push_result", id: msg.id, key })
      // Cap sessionLog at 200 entries
      if (msg.path === "game/sessionLog") {
        const log = getAtPath(state, "game/sessionLog")
        if (log && typeof log === "object") {
          const keys = Object.keys(log).sort()
          if (keys.length > 200) {
            keys.slice(0, keys.length - 200).forEach(k => { delete log[k] })
          }
        }
      }
      schedulePersist()
      break
    }

    case "transaction": {
      startTxn(ws, msg)
      break
    }

    case "transaction_result": {
      const pending = pendingTxns.get(msg.id)
      if (!pending) break
      clearTimeout(pending.timeout)
      pendingTxns.delete(msg.id)
      if (msg.value !== undefined && msg.value !== null) {
        setAtPath(state, pending.msg.path, msg.value)
        broadcastValue(pending.msg.path, msg.value)
        schedulePersist()
      }
      if (msg.id) send(ws, { type: "write_ack", id: msg.id })
      break
    }

    case "once": {
      let value
      if (isSavePath(msg.path)) {
        value = getSaveValue(msg.path)
      } else {
        value = getAtPath(state, msg.path)
      }
      if (msg.query && value) value = applyQuery(value, msg.query)
      send(ws, { type: "once_result", id: msg.id, value: value === undefined ? null : value })
      break
    }

    case "subscribe": {
      info.subscriptions.add(msg.path)
      // Send current value immediately
      let value
      if (isSavePath(msg.path)) {
        value = getSaveValue(msg.path)
      } else {
        value = getAtPath(state, msg.path)
      }
      send(ws, { type: "value", path: msg.path, value: value === undefined ? null : value })
      break
    }

    case "unsubscribe":
      info.subscriptions.delete(msg.path)
      break

    case "onDisconnect":
      info.disconnectHandlers.set(msg.path, { type: msg.action, value: msg.value })
      break

    case "onDisconnect_cancel":
      info.disconnectHandlers.delete(msg.path)
      break

    case "ping":
      send(ws, { type: "pong" })
      break
  }
}

/* ========================= */
/* SERVER SETUP              */
/* ========================= */

if (!fs.existsSync(SAVES_DIR)) fs.mkdirSync(SAVES_DIR, { recursive: true })

const server = http.createServer(serveStatic)
const wss = new WebSocketServer({ server })

wss.on("connection", (ws) => {
  const id = ++clientIdCounter
  const info = {
    id,
    role: null,
    playerId: null,
    subscriptions: new Set(),
    disconnectHandlers: new Map()
  }
  clients.set(ws, info)
  console.log(`Client ${id} connecté (${clients.size} total)`)

  // Signal connection
  send(ws, { type: "connected", value: true })

  ws.on("message", raw => {
    try {
      handleMessage(ws, info, JSON.parse(raw))
    } catch (e) { console.error("Message invalide:", e.message) }
  })

  ws.on("close", () => {
    // Execute onDisconnect handlers
    info.disconnectHandlers.forEach((action, p) => {
      if (action.type === "remove") {
        removeAtPath(state, p)
        broadcastValue(p, null)
      } else if (action.type === "set") {
        setAtPath(state, p, action.value)
        broadcastValue(p, action.value)
      }
    })
    clients.delete(ws)
    console.log(`Client ${id} déconnecté (${clients.size} restant)`)
    schedulePersist()
  })

  ws.on("error", err => { console.warn(`Client ${id} erreur WS:`, err.message) })
})

server.listen(PORT, () => {
  console.log(`\nServeur démarré : http://localhost:${PORT}\n`)
})
