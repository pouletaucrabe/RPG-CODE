"use strict"

/* ========================= */
/* FIREBASE INIT             */
/* ========================= */

const firebaseConfig = {
  apiKey:            "AIzaSyCRdh9-vOZn-u-FrVwkCX8uE3jHZ9q9ppY",
  authDomain:        "la-prophetie-des-mouches.firebaseapp.com",
  databaseURL:       "https://la-prophetie-des-mouches-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "la-prophetie-des-mouches",
  storageBucket:     "la-prophetie-des-mouches.firebasestorage.app",
  messagingSenderId: "61052402165",
  appId:             "1:61052402165:web:376cb5aa9a156bc02cc8bc"
}

firebase.initializeApp(firebaseConfig)
firebase.database().goOnline()
const db = firebase.database()

window.groupMadness = 0
window.groupMadnessTier = 0
window.madnessShakeInterval = null
window.currentMadnessLoopId = null
window.worldMapFogTopLeftHidden = false
window.__worldMapFogTopLeftReady = false
window.playerThuumData = {}
window.playerThuumAccessData = {}
window.playerAllyAccessData = null
window.activeRuneChallengeData = null
window.mapLoreBookData = null
window.readLoreBooksData = {}
window.__openedMapLoreBookId = null
window.__shopWasOpen = false
window.__shopInitDone = false
window.__lastShopSoundState = null
window.__lastShopSoundAt = 0

const MAP_LORE_BOOK_MAPS = [
  "taverne.jpg",
  "tavernebrume.png",
  "palaisville.jpg",
  "mairemaison.jpg",
  "marche.jpg",
  "marche1.jpg",
  "interieurmine.jpg"
]

const MAP_LORE_BOOK_IMAGES = ["livre.png", "livre1.png", "livre2.png"]

const MAP_LORE_BOOK_ENTRIES = {
  revenus: {
    id: "revenus",
    text: "Ils sont revenus.\nIls sont revenus.\nIls sont revenus.",
    reward: null
  },
  logique: {
    id: "logique",
    text: "Jour 12 : je suis persuadé que ce lieu a une logique.\nJour 19 : je suis persuadé que cette logique m'échappe.\nJour 23 : je ne suis plus sûr de vouloir comprendre.",
    reward: { stat: "perspi", amount: 1, label: "Intelligence" }
  },
  subtile: {
    id: "subtile",
    text: "Certains apprennent à éviter les coups.\nD'autres apprennent à ne jamais être là quand ils arrivent.\nLa différence est subtile, mais elle sauve des vies.",
    reward: { stat: "defense", amount: 1, label: "Dextérité" }
  },
  danger: {
    id: "danger",
    text: "Si vous lisez ceci, c'est que vous êtes probablement en danger.\nSi vous n'êtes pas en danger, reposez ce livre immédiatement, vous allez l'être.",
    reward: { stat: "curse", amount: 1, label: "Malédiction" }
  }
}

function isMapLoreBookMap(mapName) {
  return MAP_LORE_BOOK_MAPS.includes(mapName)
}

function getMapLoreBookPosition(mapName) {
  const positions = {
    "taverne.jpg":       { left: "20%", bottom: "18%" },
    "tavernebrume.png":  { left: "18%", bottom: "18%" },
    "palaisville.jpg":   { left: "76%", bottom: "16%" },
    "mairemaison.jpg":   { left: "24%", bottom: "20%" },
    "marche.jpg":        { left: "30%", bottom: "16%" },
    "marche1.jpg":       { left: "26%", bottom: "18%" },
    "interieurmine.jpg": { left: "74%", bottom: "15%" }
  }
  return positions[mapName] || { left: "22%", bottom: "18%" }
}

function closeMapLoreBookOverlay() {
  const overlay = document.getElementById("mapLoreBookOverlay")
  if (overlay) overlay.remove()
  window.__openedMapLoreBookId = null
}

function updateMapLoreBookVisibility() {
  const existing = document.getElementById("mapLoreBookToken")
  const data = window.mapLoreBookData
  const shouldShow = !!(
    data &&
    data.active &&
    data.map === currentMap &&
    gameState === "GAME" &&
    !combatActive
  )

  if (!shouldShow) {
    if (existing) existing.remove()
    return
  }

  const mapEl = document.getElementById("map")
  if (!mapEl) return
  const pos = getMapLoreBookPosition(currentMap)
  const token = existing || document.createElement("img")

  if (!existing) {
    token.id = "mapLoreBookToken"
    token.style.position = "absolute"
    token.style.width = "88px"
    token.style.height = "88px"
    token.style.objectFit = "contain"
    token.style.cursor = "pointer"
    token.style.pointerEvents = "auto"
    token.draggable = false
    token.style.zIndex = "58"
    token.style.filter = "drop-shadow(0 10px 16px rgba(0,0,0,0.82))"
    token.style.animation = "bookFloatIdle 2.8s ease-in-out infinite"
    token.onmousedown = e => { e.stopPropagation() }
    token.onclick = e => { e.stopPropagation(); tryOpenMapLoreBook() }
    mapEl.appendChild(token)
  }

  token.src = "images/" + (data.image || "livre.png")
  token.style.left = pos.left
  token.style.bottom = pos.bottom
}

function applyMapLoreBookReward(entry, playerId) {
  if (!entry || !entry.reward || !playerId) return
  const reward = entry.reward
  const path = "characters/" + playerId + "/" + reward.stat
  db.ref(path).once("value", snap => {
    const current = parseInt(snap.val(), 10) || 0
    db.ref(path).set(current + reward.amount)
  })
  showNotification("📖 " + playerId.toUpperCase() + " gagne +" + reward.amount + " " + reward.label)
}

function getLocalPlayerId() {
  if (window.__localPlayerId) return String(window.__localPlayerId).toLowerCase()
  if (myToken && myToken.id) return String(myToken.id).toLowerCase()
  const selectedToken = document.querySelector(".token.selectedPlayer")
  if (selectedToken && selectedToken.id) return String(selectedToken.id).toLowerCase()
  const menuMini = document.getElementById("playerMenuMini")
  if (menuMini && menuMini.dataset && menuMini.dataset.playerId) return String(menuMini.dataset.playerId).toLowerCase()
  const sheet = document.getElementById("characterSheet")
  if (sheet && sheet.dataset && sheet.dataset.playerId) return String(sheet.dataset.playerId).toLowerCase()
  try {
    const stored = localStorage.getItem("rpg_local_player")
    if (stored) return String(stored).toLowerCase()
  } catch (e) {}
  return ""
}

function triggerLocalDefeat(reason) {
  const localId = getLocalPlayerId()
  if (isGM || !localId || window.__combatOutcomeShowing || window.__pendingLocalDefeat) return false
  if (!(combatActive || gameState === "COMBAT" || reason === "playerDeath" || reason === "combatOutcome" || reason === "hp-watch" || reason === "remote-exit-hp")) return false
  window.__pendingLocalDefeat = true
  combatActive = true
  setGameState("COMBAT")
  setTimeout(() => {
    if (!window.__combatOutcomeShowing) showDefeat()
  }, reason === "hp" ? 50 : 80)
  return true
}

function watchLocalPlayerDefeat(playerId) {
  const pid = String(playerId || "").toLowerCase()
  if (!pid) return

  window.__localPlayerId = pid
  try { localStorage.setItem("rpg_local_player", pid) } catch (e) {}

  if (window.__localDefeatRef && window.__localDefeatCb) {
    window.__localDefeatRef.off("value", window.__localDefeatCb)
  }

  const ref = db.ref("characters/" + pid + "/hp")
  const cb = snap => {
    const hp = parseInt(snap.val(), 10) || 0
    if (!isGM && hp <= 0 && (combatActive || gameState === "COMBAT") && !window.__combatOutcomeShowing) {
      triggerLocalDefeat("hp-watch")
    }
  }

  window.__localDefeatRef = ref
  window.__localDefeatCb = cb
  ref.on("value", cb)
}

function showMapLoreBookOverlay(bookData) {
  const entry = MAP_LORE_BOOK_ENTRIES[bookData?.id]
  if (!entry) return
  closeMapLoreBookOverlay()
  playSound("parcheminSound", 0.85)

  const overlay = document.createElement("div")
  overlay.id = "mapLoreBookOverlay"
  overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.58);z-index:9999996;opacity:0;transition:opacity 0.4s ease;"

  const box = document.createElement("div")
  box.style.cssText = "position:relative;width:min(760px,86vw);height:min(640px,84vh);display:flex;align-items:center;justify-content:center;"

  const img = document.createElement("img")
  img.src = "images/livreouvert.png"
  img.style.cssText = "width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 18px 42px rgba(0,0,0,0.9));pointer-events:none;"
  box.appendChild(img)

  const text = document.createElement("div")
  text.style.cssText = "position:absolute;left:18%;top:24%;width:64%;height:46%;display:flex;align-items:center;justify-content:center;text-align:center;white-space:pre-line;font-family:'IM Fell English',serif;font-size:clamp(22px,2vw,34px);line-height:1.45;color:#3c2713;text-shadow:0 1px 0 rgba(255,235,190,0.2);padding:34px 40px;box-sizing:border-box;background:url('images/paper1.png') center/100% 100% no-repeat;"
  text.innerText = entry.text
  box.appendChild(text)

  if (entry.reward) {
    const reward = document.createElement("div")
    reward.style.cssText = "position:absolute;left:20%;bottom:18%;width:60%;text-align:center;font-family:'Cinzel',serif;font-size:clamp(14px,1.2vw,18px);letter-spacing:2px;color:#68451f;"
    reward.innerText = "+1 " + entry.reward.label
    box.appendChild(reward)
  }

  overlay.appendChild(box)
  document.body.appendChild(overlay)
  window.__openedMapLoreBookId = bookData.id
  setTimeout(() => { overlay.style.opacity = "1" }, 30)
}

function tryOpenMapLoreBook() {
  const localPlayerId = getLocalPlayerId()
  if (isGM || !localPlayerId || !window.mapLoreBookData || !window.mapLoreBookData.active) return
  const localBook = window.mapLoreBookData
  db.ref("game/mapLoreBook").transaction(current => {
    if (!current || !current.active || current.id !== localBook.id || current.map !== currentMap) return current
    current.active = false
    current.claimedBy = localPlayerId
    current.claimedAt = Date.now()
    return current
  }, (error, committed, snapshot) => {
    const bookData = snapshot && snapshot.val ? snapshot.val() : null
    if (error || !committed || !bookData || String(bookData.claimedBy).toLowerCase() !== localPlayerId) return
    const entry = MAP_LORE_BOOK_ENTRIES[bookData.id]
    showMapLoreBookOverlay(bookData)
    applyMapLoreBookReward(entry, localPlayerId)
    db.ref("game/readLoreBooks/" + bookData.id).set(true)
    db.ref("game/mapLoreBook").remove()
  }, false)
}

function maybeSpawnMapLoreBook(mapName) {
  if (!isGM) return
  db.ref("game/mapLoreBook").remove()
  if (!isMapLoreBookMap(mapName)) return
  if (Math.random() >= 0.2) return
  db.ref("game/readLoreBooks").once("value", snap => {
    const read = snap.val() || {}
    const pool = Object.values(MAP_LORE_BOOK_ENTRIES).filter(entry => !read[entry.id])
    if (!pool.length) return
    const entry = pool[Math.floor(Math.random() * pool.length)]
    const image = MAP_LORE_BOOK_IMAGES[Math.floor(Math.random() * MAP_LORE_BOOK_IMAGES.length)]
    db.ref("game/mapLoreBook").set({
      id: entry.id,
      image,
      map: mapName,
      active: true,
      time: Date.now()
    })
  })
}
window.usedThuumData = {}
window.__lastThuumUnlockTime = 0
window.__lastThuumCastTime = 0
window.THUUMS = {
  SKRAA: {
    word: "SKRAA",
    words: ["SKRAA", "VORTH", "NAAK"],
    translation: "Fragmentation • Rupture • Dispersion finale",
    description: "Fracasse la cible principale et blesse les ennemis autour.",
    unlockMap: "prebalraug.jpg",
    buttonImage: "images/runeskraa.png",
    combatDamageByRank: rank => ({ main: 8 + rank * 4, splash: 3 + rank * 2 }),
    outsideCombatMessage: "SKRAA retentit hors combat"
  }
}

function getMadnessZoneFactor() {
  const map = (currentMap || "").toLowerCase()
  if (map.includes("foret")) return 1.35
  if (map.includes("portail")) return 1.1
  return 1
}

function isMadnessActiveMap() {
  const map = (currentMap || "").toLowerCase()
  return map.includes("foret") || map.includes("portail")
}

function getMadnessTier(value) {
  if (value >= 100) return 4
  if (value >= 75) return 3
  if (value >= 50) return 2
  if (value >= 25) return 1
  return 0
}

function stopMadnessLoops() {
  ;["madnessLow", "madnessMid", "madnessHigh", "madnessPeak"].forEach(id => {
    const audio = document.getElementById(id)
    if (!audio) return
    audio.volume = 0
    audio.pause()
    audio.currentTime = 0
  })
  window.currentMadnessLoopId = null
}

function clearMadnessResidualEffects() {
  const overlay = document.getElementById("madnessOverlay")
  const cameraEl = document.getElementById("camera")

  if (window.madnessShakeInterval) {
    clearInterval(window.madnessShakeInterval)
    window.madnessShakeInterval = null
  }

  if (overlay) {
    overlay.style.display = "none"
    overlay.style.opacity = "0"
    overlay.style.background = ""
    overlay.classList.remove("active", "pulse")
  }

  if (cameraEl) {
    cameraEl.style.filter = ""
    cameraEl.classList.remove("madnessWarp")
    cameraEl.style.transform = ""
  }
}

function playMadnessLoopForTier(tier, value) {
  if (tier <= 0 || !isMadnessActiveMap() || combatActive || gameState !== "GAME") {
    stopMadnessLoops()
    return
  }

  const audioMap = {
    1: document.getElementById("madnessLow"),
    2: document.getElementById("madnessMid"),
    3: document.getElementById("madnessHigh"),
    4: document.getElementById("madnessPeak")
  }
  const audio = audioMap[tier]
  const targetId = audio ? audio.id : null
  if (!audio) {
    stopMadnessLoops()
    return
  }

  const targetVolume = Math.min(0.85, (0.18 + value / 180) * getMadnessZoneFactor())

  if (window.currentMadnessLoopId === targetId && !audio.paused) {
    audio.volume = targetVolume
    return
  }

  stopMadnessLoops()
  window.currentMadnessLoopId = targetId
  audio.currentTime = 0
  audio.loop = true
  audio.volume = targetVolume
  audio.play().catch(() => {})
}

function playMadnessHit() {
  const hit = document.getElementById("whisperHit")
  if (!hit || combatActive || gameState !== "GAME") return
  hit.currentTime = 0
  hit.volume = Math.min(0.95, 0.45 * getMadnessZoneFactor())
  hit.play().catch(() => {})
}

function updateWorldMapFogTopLeft() {
  const fog = document.getElementById("worldMapFogTopLeft")
  if (!fog) return
  const shouldShow = currentMap === "MAPMONDE.jpg" && !window.worldMapFogTopLeftHidden && gameState === "GAME"
  fog.style.transition = "opacity 0.5s ease"
  fog.style.filter = "drop-shadow(0 0 18px rgba(0,0,0,0.55))"
  fog.style.display = shouldShow ? "block" : "none"
  fog.style.opacity = shouldShow ? "0.98" : "0"
}

function toggleWorldMapFogTopLeft() {
  if (!isGM) return
  db.ref("game/worldMapFogTopLeftHidden").set(!window.worldMapFogTopLeftHidden)
}

function revealWorldMapFogTopLeft() {
  const fog = document.getElementById("worldMapFogTopLeft")
  if (!fog || currentMap !== "MAPMONDE.jpg" || gameState !== "GAME") return
  fog.style.display = "block"
  fog.style.opacity = "0.98"
  fog.style.transition = "opacity 2s ease, filter 2s ease, transform 0.18s ease"
  fog.style.filter = "brightness(1.4) drop-shadow(0 0 26px rgba(255,220,160,0.55))"
  fog.style.transform = "scale(1.03)"
  const revealSnd = new Audio("audio/pow.mp3")
  revealSnd.volume = 0.85
  revealSnd.play().catch(() => {})
  screenShakeHard()
  setTimeout(() => screenShake(), 180)
  requestAnimationFrame(() => {
    fog.style.opacity = "0"
    fog.style.filter = "brightness(1.05) drop-shadow(0 0 10px rgba(255,220,160,0.18))"
    fog.style.transform = "scale(1)"
  })
  setTimeout(() => {
    fog.style.display = "none"
    fog.style.transition = "opacity 0.5s ease"
    fog.style.filter = "drop-shadow(0 0 18px rgba(0,0,0,0.55))"
    fog.style.transform = ""
  }, 2050)
}

function startMadnessShake(tier) {
  if (window.madnessShakeInterval) {
    clearInterval(window.madnessShakeInterval)
    window.madnessShakeInterval = null
  }
  if (tier < 2) return

  const interval = tier >= 4 ? 2200 : tier === 3 ? 3400 : 5200
  window.madnessShakeInterval = setInterval(() => {
    if (combatActive || gameState !== "GAME") return
    if (tier >= 4) screenShakeHard()
    else screenShake()
  }, interval)
}

function updateMadnessVisibility() {
  const gauge = document.getElementById("madnessGauge")
  const overlay = document.getElementById("madnessOverlay")
  if (!gauge || !overlay) return

  const visible = gameState === "GAME" && !combatActive && isMadnessActiveMap()
  gauge.style.display = visible ? "flex" : "none"
  overlay.style.display = visible ? "block" : "none"

  if (!visible) {
    stopMadnessLoops()
    clearMadnessResidualEffects()
  }
  else playMadnessLoopForTier(window.groupMadnessTier, window.groupMadness)
}

function resetMadnessPresentation() {
  const gauge = document.getElementById("madnessGauge")
  stopMadnessLoops()
  if (gauge) gauge.style.display = "none"
  clearMadnessResidualEffects()
}

function updateMadnessUI(value) {
  const gauge = document.getElementById("madnessGauge")
  const fill = document.getElementById("madnessGaugeFill")
  const glow = document.getElementById("madnessGaugeGlow")
  const label = document.getElementById("madnessGaugeValue")
  const mjValues = document.querySelectorAll("#madnessMJValue")
  const overlay = document.getElementById("madnessOverlay")
  const cameraEl = document.getElementById("camera")
  if (!gauge || !fill || !glow || !label || !overlay) return

  if (!isMadnessActiveMap()) {
    gauge.style.display = "none"
    stopMadnessLoops()
    clearMadnessResidualEffects()
    mjValues.forEach(el => { el.innerText = Math.max(0, Math.min(100, value)) + " / 100" })
    return
  }

  const pct = Math.max(0, Math.min(100, value))
  const tier = getMadnessTier(pct)
  const zoneFactor = getMadnessZoneFactor()

  gauge.classList.remove("tier-0", "tier-1", "tier-2", "tier-3", "tier-4")
  gauge.classList.add("tier-" + tier)
  fill.style.width = pct + "%"
  glow.style.width = pct + "%"
  label.innerText = pct + " / 100"
  mjValues.forEach(el => { el.innerText = pct + " / 100" })

  overlay.classList.toggle("active", pct > 0)
  overlay.classList.toggle("pulse", tier >= 2)
  overlay.style.opacity = pct <= 0 ? "0" : String(Math.min(0.82, (pct / 140) * zoneFactor))
  if (cameraEl) {
    const blur = pct >= 75 ? 1.6 : pct >= 50 ? 1.1 : pct >= 25 ? 0.5 : 0
    const brightness = pct >= 75 ? 0.82 : pct >= 50 ? 0.9 : pct >= 25 ? 0.96 : 1
    cameraEl.style.filter = combatActive ? "" : `blur(${blur}px) brightness(${brightness}) saturate(${1 + pct / 250})`
    if (pct >= 75 && gameState === "GAME" && !combatActive) {
      cameraEl.classList.add("madnessWarp")
      setTimeout(() => cameraEl.classList.remove("madnessWarp"), 350)
    }
  }

  if (tier >= 4) {
    overlay.style.background = "radial-gradient(circle at 50% 50%, rgba(150,20,20,0.14) 0%, rgba(50,0,0,0.24) 42%, rgba(0,0,0,0.64) 100%)"
  } else if (tier >= 2) {
    overlay.style.background = "radial-gradient(circle at 50% 50%, rgba(110,30,20,0.1) 0%, rgba(24,0,0,0.16) 48%, rgba(0,0,0,0.48) 100%)"
  } else {
    overlay.style.background = "radial-gradient(circle at 50% 50%, rgba(90,40,20,0.06) 0%, rgba(12,0,0,0.12) 48%, rgba(0,0,0,0.38) 100%)"
  }

  if (tier !== window.groupMadnessTier) {
    if (tier > 0) playMadnessHit()
    window.groupMadnessTier = tier
  }

  playMadnessLoopForTier(tier, pct)
  startMadnessShake(tier)
  updateMadnessVisibility()
}

function setGroupMadness(value) {
  if (!isGM) return
  const clamped = Math.max(0, Math.min(100, value))
  db.ref("game/groupMadness").set(clamped)
}

function changeGroupMadness(delta) {
  if (!isGM) return
  db.ref("game/groupMadness").once("value", snap => {
    const current = parseInt(snap.val(), 10) || 0
    setGroupMadness(current + delta)
  })
}

function resetGroupMadness() {
  setGroupMadness(0)
}

function ensureMadnessGMButton() {}

function getMyThuumWords() {
  if (!myToken || !window.playerThuumData) return {}
  const exact = window.playerThuumData[myToken.id]
  if (exact) return exact

  const loose = (typeof getObjectValueLoose === "function")
    ? getObjectValueLoose(window.playerThuumData, myToken.id)
    : null
  return loose || {}
}

function getThuumDef(word) {
  return (window.THUUMS && window.THUUMS[word]) || null
}

function getUnlockedThuumWords() {
  const words = getMyThuumWords()
  return Object.keys(words).filter(word => {
    const data = words[word]
    return !!getThuumDef(word) && !!(data && data.unlocked)
  })
}

function getPrimaryThuumWord() {
  const unlocked = getUnlockedThuumWords()
  return unlocked.length ? unlocked[0] : null
}

function hasUnlockedThuum(word) {
  const words = getMyThuumWords()
  return !!(words[word] && words[word].unlocked)
}

function isThuumUsedThisCombat(word) {
  if (!myToken || !window.usedThuumData) return false
  if (window.usedThuumData[myToken.id] && window.usedThuumData[myToken.id][word]) return true

  const wanted = String(myToken.id || "").toLowerCase()
  const key = Object.keys(window.usedThuumData).find(k => String(k).toLowerCase() === wanted)
  return !!(key && window.usedThuumData[key] && window.usedThuumData[key][word])
}

function hasThuumUseAccess(word) {
  if (!myToken || !window.playerThuumAccessData) return false
  if (window.playerThuumAccessData[myToken.id] && window.playerThuumAccessData[myToken.id][word] && window.playerThuumAccessData[myToken.id][word].allowed) return true

  const wanted = String(myToken.id || "").toLowerCase()
  const key = Object.keys(window.playerThuumAccessData).find(k => String(k).toLowerCase() === wanted)
  return !!(key && window.playerThuumAccessData[key] && window.playerThuumAccessData[key][word] && window.playerThuumAccessData[key][word].allowed)
}

function hasPlayerAllyAccess() {
  return !!window.playerAllyAccessData
}

function hasActiveRuneChallenge() {
  const data = window.activeRuneChallengeData
  return !!(data && data.active)
}

function getAvailablePlayerPowerTabs() {
  const tabs = []
  if (hasPlayerAllyAccess()) tabs.push("ally")
  if (getUnlockedThuumWords().length) tabs.push("thuum")
  if (hasActiveRuneChallenge()) tabs.push("runes")
  return tabs
}

function getDefaultPlayerPowerTab() {
  const tabs = getAvailablePlayerPowerTabs()
  if (!tabs.length) return ""
  if (tabs.includes("thuum")) return "thuum"
  if (tabs.includes("ally")) return "ally"
  return tabs[0]
}

function closePlayerPowersPanel() {
  const panel = document.getElementById("playerThuumPanel")
  if (!panel) return
  panel.style.display = "none"
  panel.innerHTML = ""
  delete panel.dataset.activeTab
}

function updateThuumButton() {
  const btn = document.getElementById("playerThuumBtn")
  if (!btn) return
  const unlockedWords = getUnlockedThuumWords()
  const activeWord = getPrimaryThuumWord()
  const activeDef = activeWord ? getThuumDef(activeWord) : null
  const img = btn.querySelector("img")

  const hasAnyPower = !isGM && !!myToken && getAvailablePlayerPowerTabs().length > 0
  if (!hasAnyPower) {
    btn.style.display = "none"
    btn.disabled = false
    btn.dataset.word = ""
    if (img) img.removeAttribute("src")
    closePlayerPowersPanel()
    return
  }

  btn.dataset.word = activeWord || ""
  if (img) img.src = (activeDef && activeDef.buttonImage) ? activeDef.buttonImage : "images/runeskraa.png"
  btn.style.display = "block"
  btn.disabled = false
  if (activeWord && !combatActive) {
    const allowedOutside = hasThuumUseAccess(activeWord)
    btn.title = allowedOutside ? activeWord + " autorise par le MJ hors combat" : activeWord + " disponible en combat ou avec autorisation MJ"
  } else if (activeWord) {
    const used = isThuumUsedThisCombat(activeWord)
    btn.title = used ? activeWord + " deja utilise pour ce combat" : activeWord + " pret a etre lance"
  } else if (hasPlayerAllyAccess()) {
    btn.title = "Pouvoirs : invocation autorisee"
  } else {
    btn.title = "Pouvoirs : runes"
  }
  renderPlayerPowersPanel()
}

function getThuumEntryState(word) {
  if (combatActive) {
    return isThuumUsedThisCombat(word) ? "Deja utilise pour ce combat" : "Utilisable en combat"
  }
  return hasThuumUseAccess(word) ? "Autorise par le MJ hors combat" : "Hors combat : autorisation MJ requise"
}

function canUseThuumNow(word) {
  if (!hasUnlockedThuum(word)) return false
  if (combatActive) return !isThuumUsedThisCombat(word)
  return hasThuumUseAccess(word)
}

function renderPlayerThuumEntries(panel) {
  const unlocked = getUnlockedThuumWords()
  if (!unlocked.length) {
    const empty = document.createElement("div")
    empty.className = "playerThuumEntryState"
    empty.style.padding = "10px 0"
    empty.innerText = "Aucun Thu'um appris."
    panel.appendChild(empty)
    return
  }

  unlocked.forEach(word => {
    const def = getThuumDef(word)
    if (!def) return

    const entry = document.createElement("button")
    entry.className = "playerThuumEntry"
    entry.disabled = !canUseThuumNow(word)
    entry.onclick = () => usePlayerThuum(word)

    const img = document.createElement("img")
    img.src = def.buttonImage || "images/runeskraa.png"
    img.alt = word
    entry.appendChild(img)

    const text = document.createElement("div")
    text.className = "playerThuumEntryText"

    const name = document.createElement("div")
    name.className = "playerThuumEntryName"
    name.innerText = word
    text.appendChild(name)

    const words = document.createElement("div")
    words.className = "playerThuumEntryWords"
    words.innerText = (def.words || [word]).join(" • ")
    text.appendChild(words)

    const translation = document.createElement("div")
    translation.className = "playerThuumEntryState"
    translation.style.color = "#d8c28a"
    translation.style.fontStyle = "italic"
    translation.style.opacity = "0.92"
    translation.innerText = def.translation || def.description || ""
    if (translation.innerText) text.appendChild(translation)

    const state = document.createElement("div")
    state.className = "playerThuumEntryState"
    state.innerText = getThuumEntryState(word)
    text.appendChild(state)

    entry.appendChild(text)
    panel.appendChild(entry)
  })
}

function renderPlayerAllyEntry(panel) {
  const access = window.playerAllyAccessData
  if (!access) return

  let granted = null
  if (typeof ALLY_PNJS !== "undefined") {
    ALLY_PNJS.forEach(pnj => {
      pnj.actions.forEach(action => {
        if (action.id === access.actionId) granted = { pnj, action }
      })
    })
  }

  if (!granted) {
    const empty = document.createElement("div")
    empty.className = "playerThuumEntryState"
    empty.style.padding = "10px 0"
    empty.innerText = "Invocation introuvable."
    panel.appendChild(empty)
    return
  }

  const entry = document.createElement("button")
  entry.className = "playerThuumEntry"
  entry.onclick = () => {
    if (typeof triggerAllyAction === "function") triggerAllyAction(granted.pnj, granted.action)
  }

  const img = document.createElement("img")
  img.src = "images/" + granted.pnj.image
  img.alt = granted.pnj.name
  entry.appendChild(img)

  const text = document.createElement("div")
  text.className = "playerThuumEntryText"

  const name = document.createElement("div")
  name.className = "playerThuumEntryName"
  name.innerText = granted.action.label
  text.appendChild(name)

  const words = document.createElement("div")
  words.className = "playerThuumEntryWords"
  words.innerText = granted.pnj.name
  text.appendChild(words)

  const desc = document.createElement("div")
  desc.className = "playerThuumEntryState"
  desc.style.color = "#d8c28a"
  desc.innerText = granted.action.desc
  text.appendChild(desc)

  const state = document.createElement("div")
  state.className = "playerThuumEntryState"
  state.innerText = "Autorisée par le MJ"
  text.appendChild(state)

  entry.appendChild(text)
  panel.appendChild(entry)
}

function renderPlayerRuneEntry(panel) {
  const data = window.activeRuneChallengeData
  if (!data || !data.active) return

  const entry = document.createElement("button")
  entry.className = "playerThuumEntry"
  entry.onclick = () => toggleRuneOverlay(data)

  const icon = document.createElement("div")
  icon.style.cssText = "width:58px;height:58px;display:flex;align-items:center;justify-content:center;font-family:'Cinzel Decorative','Cinzel',serif;font-size:28px;color:#c8a050;"
  icon.innerText = "ᚱ"
  entry.appendChild(icon)

  const text = document.createElement("div")
  text.className = "playerThuumEntryText"

  const name = document.createElement("div")
  name.className = "playerThuumEntryName"
  name.innerText = "Runes"
  text.appendChild(name)

  const words = document.createElement("div")
  words.className = "playerThuumEntryWords"
  words.innerText = "Défi runique actif"
  text.appendChild(words)

  const state = document.createElement("div")
  state.className = "playerThuumEntryState"
  state.innerText = "Ouvrir le jeu de runes"
  text.appendChild(state)

  entry.appendChild(text)
  panel.appendChild(entry)
}

function renderPlayerPowersPanel() {
  const panel = document.getElementById("playerThuumPanel")
  if (!panel || panel.style.display === "none") return
  panel.innerHTML = ""
  const tabs = getAvailablePlayerPowerTabs()
  if (!tabs.length) {
    panel.style.display = "none"
    return
  }

  const title = document.createElement("div")
  title.id = "playerThuumPanelTitle"
  title.innerText = "Pouvoirs"
  panel.appendChild(title)

  const tabRow = document.createElement("div")
  tabRow.style.cssText = "display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;"
  panel.appendChild(tabRow)

  const content = document.createElement("div")
  content.id = "playerPowerPanelContent"
  panel.appendChild(content)

  const activeTab = tabs.includes(panel.dataset.activeTab) ? panel.dataset.activeTab : getDefaultPlayerPowerTab()
  panel.dataset.activeTab = activeTab

  function paintTab(tab) {
    content.innerHTML = ""
    panel.dataset.activeTab = tab
    Array.from(tabRow.children).forEach(btn => {
      btn.style.background = btn.dataset.tab === tab ? "rgba(190,150,72,0.22)" : "rgba(18,14,10,0.65)"
      btn.style.borderColor = btn.dataset.tab === tab ? "rgba(205,170,92,0.8)" : "rgba(120,92,44,0.38)"
      btn.style.color = btn.dataset.tab === tab ? "#f6e2a8" : "#d5c39a"
    })

    if (tab === "ally") renderPlayerAllyEntry(content)
    else if (tab === "thuum") renderPlayerThuumEntries(content)
    else if (tab === "runes") renderPlayerRuneEntry(content)
  }

  tabs.forEach(tab => {
    const btn = document.createElement("button")
    btn.dataset.tab = tab
    btn.style.cssText = "padding:6px 12px;font-family:'Cinzel',serif;font-size:12px;letter-spacing:1px;border:1px solid rgba(120,92,44,0.38);border-radius:999px;background:rgba(18,14,10,0.65);color:#d5c39a;cursor:pointer;"
    btn.innerText = tab === "ally" ? "Invoc" : tab === "thuum" ? "Thu'um" : "Runes"
    btn.onclick = () => paintTab(tab)
    tabRow.appendChild(btn)
  })

  paintTab(activeTab)
}

function togglePlayerThuumPanel() {
  const panel = document.getElementById("playerThuumPanel")
  if (!panel) return
  if (panel.style.display === "block") {
    closePlayerPowersPanel()
    return
  }
  panel.style.display = "block"
  renderPlayerPowersPanel()
}

function showThuumUnlockCinematic(data) {
    const screen = document.getElementById("thuumUnlockScreen")
    const image = document.getElementById("thuumUnlockImage")
    const title = document.getElementById("thuumUnlockTitle")
    const words = document.getElementById("thuumUnlockWords")
    const player = document.getElementById("thuumUnlockPlayer")
    if (!screen || !title || !words || !player) return

    const def = getThuumDef(data.word)
    if (image) image.src = "images/thuum.png"
    title.innerText = "Nouveau Cri de Mouches appris : " + data.word
    words.innerText = (data.words && data.words.length ? data.words.join(" • ") : ((def && def.words) ? def.words.join(" • ") : data.word))
    player.innerText = data.playerId ? ("Porteur choisi : " + data.playerId.toUpperCase()) : ""
  if (myToken && data.playerId && String(myToken.id).toLowerCase() === String(data.playerId).toLowerCase()) {
    showNotification((data.word || "Cri") + " est maintenant a vous")
  }

  const snd = document.getElementById("thuumSound")
  if (snd) {
    snd.currentTime = 0
    snd.volume = 0.85
    snd.play().catch(() => {})
  }

  screen.style.display = "flex"
  requestAnimationFrame(() => screen.classList.add("active"))
  flashGold()
  flashGold()
  screenShakeHard()

  setTimeout(() => {
    screen.classList.remove("active")
    setTimeout(() => { screen.style.display = "none" }, 600)
  }, 4200)
}

function playThuumCastEffect(data) {
  const snd = document.getElementById("criSound")
  if (snd) {
    snd.currentTime = 0
    snd.volume = 0.85
    snd.play().catch(() => {})
  }
  const flash = document.createElement("div")
  flash.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:999999998;background:radial-gradient(circle at center,rgba(190,220,255,0.85) 0%,rgba(120,180,255,0.42) 22%,rgba(255,255,255,0.22) 38%,rgba(170,0,0,0.18) 68%,rgba(0,0,0,0) 100%);opacity:0;mix-blend-mode:screen;transition:opacity 0.08s ease;"
  document.body.appendChild(flash)
  requestAnimationFrame(() => { flash.style.opacity = "1" })
  setTimeout(() => {
    flash.style.transition = "opacity 0.55s ease"
    flash.style.opacity = "0"
  }, 110)
  setTimeout(() => flash.remove(), 760)

  flashRed()
  setTimeout(() => flashRed(), 90)
  screenShakeHard()
  setTimeout(() => screenShake(), 180)
  const casterId = String(data.playerId || "").toLowerCase()
  if (casterId) {
    const casterToken = Array.from(document.querySelectorAll(".token")).find(t => String(t.id || "").toLowerCase() === casterId)
    if (casterToken) {
      let flame = casterToken.querySelector(".thuumBlueFlame")
      if (!flame) {
        flame = document.createElement("div")
        flame.className = "thuumBlueFlame"
        flame.style.cssText = "position:absolute;left:50%;bottom:14px;transform:translateX(-50%);width:84px;height:118px;border-radius:50% 50% 42% 42%;background:radial-gradient(ellipse at 50% 82%, rgba(180,245,255,0.92) 0%, rgba(88,205,255,0.8) 18%, rgba(45,126,255,0.64) 46%, rgba(24,62,170,0.18) 70%, transparent 100%);mix-blend-mode:screen;filter:blur(6px);opacity:0;"
        casterToken.appendChild(flame)
      }
      casterToken.classList.remove("thuumCaster")
      void casterToken.offsetWidth
      casterToken.classList.add("thuumCaster")
      setTimeout(() => {
        casterToken.classList.remove("thuumCaster")
        if (flame) flame.style.opacity = "0"
      }, 1700)
    }
  }
  showNotification("ᚦ " + (data.word || "SKRAA") + " - " + (data.playerId || "").toUpperCase())
}

function grantThuumToPlayer(playerId, word) {
  if (!isGM) return
  const def = getThuumDef(word)
  if (!def) return
  if (currentMap !== def.unlockMap) {
    showNotification(word + " ne peut etre revele que sur " + def.unlockMap)
    return
  }

  db.ref("game/playerThuum/" + playerId + "/" + word).once("value", snap => {
    const existing = snap.val()
    if (existing && existing.unlocked) {
      showNotification(word + " deja appris par " + playerId.toUpperCase())
      return
    }

    db.ref("game/playerThuum/" + playerId + "/" + word).set({
      unlocked: true,
      rank: 1,
      words: def.words || [word],
      time: Date.now()
    }).then(() => {
      db.ref("game/thuumUnlockEvent").set({
        playerId,
        word,
        words: def.words || [word],
        time: Date.now()
      })
      setTimeout(() => db.ref("game/thuumUnlockEvent").remove(), 2000)
      showNotification("SKRAA donne a " + playerId.toUpperCase())
    })
  })
}

function grantThuumUseToPlayer(playerId, word) {
  if (!isGM) return
  db.ref("game/playerThuumAccess/" + playerId + "/" + word).set({
    allowed: true,
    time: Date.now()
  }).then(() => {
    showNotification(word + " autorise hors combat pour " + playerId.toUpperCase())
  })
}

function usePlayerThuum(forcedWord) {
  if (!myToken) return
  const activeWord = forcedWord || getPrimaryThuumWord()
  const def = activeWord ? getThuumDef(activeWord) : null
  if (!activeWord || !def || !hasUnlockedThuum(activeWord)) return
  if (combatActive && isThuumUsedThisCombat(activeWord)) {
    showNotification(activeWord + " est deja utilise pour ce combat")
    return
  }

  const playerId = myToken.id
  if (!combatActive) {
    if (!hasThuumUseAccess(activeWord)) {
      showNotification("Le MJ doit autoriser " + activeWord + " hors combat")
      return
    }
    db.ref("game/playerThuumAccess/" + playerId + "/" + activeWord).remove()
    db.ref("game/thuumCast").set({
      playerId,
      word: activeWord,
      time: Date.now(),
      outsideCombat: true
    })
    setTimeout(() => db.ref("game/thuumCast").remove(), 1500)
    showNotification(def.outsideCombatMessage || (activeWord + " retentit hors combat"))
    closePlayerPowersPanel()
    updateThuumButton()
    return
  }

  db.ref("combat/usedThuum/" + playerId + "/" + activeWord).set(true)
  db.ref("game/thuumCast").set({
    playerId,
    word: activeWord,
    time: Date.now(),
    outsideCombat: false
  })
  setTimeout(() => db.ref("game/thuumCast").remove(), 1500)

  const rank = ((getMyThuumWords()[activeWord] || {}).rank || 1)
  const damage = def.combatDamageByRank ? def.combatDamageByRank(rank) : { main: 8 + rank * 4, splash: 3 + rank * 2 }
  const mainDmg = damage.main
  const splash = damage.splash

  db.ref("combat/mob").once("value", snap => {
    const mob = snap.val()
    if (mob) db.ref("combat/mob/hp").set(Math.max(1, (mob.hp || 0) - mainDmg))
  })

  ;["mob2", "mob3"].forEach(slot => {
    db.ref("combat/" + slot).once("value", snap => {
      const mob = snap.val()
      if (mob) db.ref("combat/" + slot + "/hp").set(Math.max(1, (mob.hp || 0) - splash))
    })
  })

  closePlayerPowersPanel()
  updateThuumButton()
}

/* ========================= */
/* FIREBASE LISTENERS        */
/* UN SEUL par chemin        */
/* Initialisés après chargement complet (ui.js + combat.js disponibles) */
/* ========================= */

document.addEventListener("DOMContentLoaded", () => {
window.__introClickLockUntil = 0
  
// Masquer les PNJ immédiatement au chargement
;["storyImage","storyImage2","storyImage3"].forEach(id => {
  const el = document.getElementById(id)
  if (el) { el.style.display = "none"; el.style.opacity = "0" }
})

const madnessGauge = document.getElementById("madnessGauge")
if (madnessGauge) madnessGauge.style.display = "none"
resetMadnessPresentation()
if (typeof resetAuroraPresentation === "function") resetAuroraPresentation()

// ─── combat/mob — listener unique fusionné ───
db.ref("combat/mob").on("value", snap => {
  const data = snap.val()

  // Barre HP panneau MJ
  const topBar  = document.getElementById("mobHPBarTop")
  const topText = document.getElementById("mobHPTopText")
  if (topBar && topText && data) {
    const pct = Math.max(0, (data.hp / data.maxHP) * 100)
    topBar.style.width = pct + "%"
    topText.innerText  = data.name.toUpperCase() + "  " + data.hp + " / " + data.maxHP + "  (Niv " + (data.lvl || "?") + ")"
    topBar.style.background = pct > 60 ? "linear-gradient(90deg,#3cff6b,#0b8a3a)" : pct > 30 ? "linear-gradient(90deg,#ffb347,#ff7b00)" : "linear-gradient(90deg,#ff4040,#8b0000)"
  }

  const hud = document.getElementById("mobHUD")
  if (!combatActive || !data) {
    if (hud) hud.style.display = "none"
    const token = document.getElementById("mobToken")
    if (token) token.style.display = "none"
    return
  }

  // Token HUD (barre au-dessus du token)
  const tokenBar  = document.getElementById("mobTokenHPBar")
  const tokenText = document.getElementById("mobTokenHPText")
  if (tokenBar && tokenText) {
    const pct = (data.hp / data.maxHP) * 100
    tokenBar.style.width = pct + "%"
    tokenText.innerText  = data.hp + " / " + data.maxHP
  }

  const nameEl = document.getElementById("mobName")
  if (nameEl) nameEl.innerText = data.name.toUpperCase() + "  •  NIV " + (data.lvl || "?")
  const hpText = document.getElementById("mobHPText")
  if (hpText) hpText.innerText = "HP " + data.hp + " / " + data.maxHP

    if (isGM) {
      hud.style.display = "block"
      if (lastMobHP !== null && data.hp < lastMobHP) { flashRed(); screenShake() }
      if (data.hp <= 0 && combatActive && !window.__combatOutcomeShowing) { showVictory() }
      lastMobHP = data.hp
    } else {
      if (combatActive) {
        hud.style.display = "block"
        activeMobSlots["mob"] = true
      }
      if (data.hp <= 0 && combatActive && !window.__combatOutcomeShowing) {
        showVictory()
      }
    }
})

// ─── diceRoll ───
db.ref("diceRoll").on("child_added", snap => {
  const roll = snap.val()
  if (!roll || !roll.player || !roll.dice || !roll.result) return
  if (roll.time && roll.time < gameStartTime) return
  showDiceAnimation(roll.player, roll.dice, roll.result)
})

// ─── storyImage slots ───
db.ref("game/storyImage").on("value", snap => {
  const image = snap.val()
  // Masquer le PNJ sur tous les écrans sauf GAME et COMBAT
  const box = document.getElementById("storyImage")
  if (gameState !== "GAME" && gameState !== "COMBAT") {
    if (box) { box.style.display = "none"; box.style.opacity = "0" }
    document.querySelectorAll("[id^='pnjNameTag']").forEach(t => t.remove())
    return
  }
  if (image) showStoryImage(image)
  else       hideStoryImage()
})

db.ref("game/storyImage2").on("value", snap => {
  const image = snap.val()
  const box2  = document.getElementById("storyImage2")
  const img2  = document.getElementById("storyImageContent2")
  if (!box2 || !img2) return
  if (gameState !== "GAME" && gameState !== "COMBAT") { box2.style.display="none"; box2.style.opacity="0"; return }
  if (image) {
    img2.src = (typeof resolvePNJImageSrc === "function") ? resolvePNJImageSrc(image) : (/^(https?:|data:|blob:|\/|images\/)/i.test(String(image || "")) ? String(image || "") : "images/" + image)
    box2.style.opacity = "0"; box2.style.left = "0"; box2.style.right = "auto"; box2.style.transform = ""; box2.style.display = "flex"
    if (!pnjSlotOrder.includes(2)) pnjSlotOrder.push(2)
    updatePNJPositions()
    setTimeout(() => { box2.style.opacity = "1" }, 60)
  } else {
    box2.style.opacity = "0"
    setTimeout(() => { box2.style.display = "none"; pnjSlotOrder = pnjSlotOrder.filter(s => s !== 2); updatePNJPositions() }, 500)
  }
})

db.ref("game/storyImage3").on("value", snap => {
  const image = snap.val()
  const box3  = document.getElementById("storyImage3")
  const img3  = document.getElementById("storyImageContent3")
  if (!box3 || !img3) return
  if (gameState !== "GAME" && gameState !== "COMBAT") { box3.style.display="none"; box3.style.opacity="0"; return }
  if (image) {
    img3.src = (typeof resolvePNJImageSrc === "function") ? resolvePNJImageSrc(image) : (/^(https?:|data:|blob:|\/|images\/)/i.test(String(image || "")) ? String(image || "") : "images/" + image)
    box3.style.opacity = "0"; box3.style.right = "0"; box3.style.left = "auto"; box3.style.transform = ""; box3.style.display = "flex"
    if (!pnjSlotOrder.includes(3)) pnjSlotOrder.push(3)
    updatePNJPositions()
    setTimeout(() => { box3.style.opacity = "1" }, 60)
  } else {
    box3.style.opacity = "0"
    setTimeout(() => { box3.style.display = "none"; pnjSlotOrder = pnjSlotOrder.filter(s => s !== 3); updatePNJPositions() }, 500)
  }
})

// ─── tokens ───
db.ref("tokens").on("child_added",   updateTokenFromDB)
db.ref("tokens").on("child_changed", updateTokenFromDB)

// ─── characters ───
db.ref("characters").on("child_added",   watchCharacter)
db.ref("characters").on("child_changed", watchCharacter)

// ─── map ───
db.ref("game/map").on("value", snap => {
  const mapName = snap.val()
  if (!mapName) return
  if (gameState !== GAME_STATE.GAME && gameState !== GAME_STATE.COMBAT) return

  const map  = document.getElementById("map")
  const fade = document.getElementById("fadeScreen")
  if (parseFloat(fade.style.opacity) >= 1) return

  const previousMap = currentMap
  const isFirst = firstMapLoad
  if (isFirst) firstMapLoad = false
  currentMap = mapName
  if (previousMap && previousMap !== mapName) closeMapLoreBookOverlay()
  if (typeof stopBifrostFlashSound === "function") stopBifrostFlashSound()
  updateMadnessUI(window.groupMadness || 0)
  updateWorldMapFogTopLeft()
  updateMapLoreBookVisibility()
  setTimeout(() => updateBifrostBtn(), 100)

  fade.style.transition = "opacity 0.8s ease"; fade.style.opacity = 1; fade.style.pointerEvents = "none"

  setTimeout(() => {
    map.style.backgroundImage = "url('images/" + mapName + "')"
    if (mapName === "MAPMONDE.jpg") { map.style.backgroundSize = "contain"; map.style.backgroundColor = "#0a0a1a" }
    else                            { map.style.backgroundSize = "cover";   map.style.backgroundColor = "" }
    updateWorldMapFogTopLeft()
    updateMapLoreBookVisibility()
    if (isFirst) { calculateMinZoom(); cameraZoom = minZoom; updateCamera() }
    document.querySelectorAll(".token").forEach(t => spawnPortal(t.id))
    if (mapMusic[mapName] && !_state._pendingMapAudio) {
      const shouldKeepAuroraMusic = auroraActive && mapName !== "bifrost.jpg"
      const wantedMusic = /^(https?:|data:|blob:|\/|audio\/)/i.test(mapMusic[mapName]) ? mapMusic[mapName] : "audio/" + mapMusic[mapName]
      const activeMusic = currentMusic === "A" ? document.getElementById("musicA") : document.getElementById("musicB")
      const activeName = activeMusic && activeMusic.src ? decodeURIComponent(activeMusic.src.replace(/.*\//, "").replace(/%20/g, " ")) : ""
      const wantedName = wantedMusic.replace(/.*\//, "").replace(/%20/g, " ")

      if (!shouldKeepAuroraMusic && !(activeName === wantedName && activeMusic && !activeMusic.paused && activeMusic.volume > 0.05)) {
        _musicTransitioning = false; _pendingMusic = null
        if (musicFadeInterval) { clearInterval(musicFadeInterval); musicFadeInterval = null }
        if (auroraActive && mapName === "bifrost.jpg") {
          const aurora = document.getElementById("auroraMusic")
          if (aurora) {
            aurora.pause()
            aurora.currentTime = 0
            aurora.volume = 0
          }
        }
        stopAllMusic()
        setTimeout(() => crossfadeMusic(mapMusic[mapName]), 200)
      }
    }
  }, 800)

  setTimeout(() => {
    fade.style.transition = "opacity 1s ease"; fade.style.opacity = 0; fade.style.pointerEvents = "none"
    setTimeout(() => document.body.focus(), 100)
  }, 1200)

  setTimeout(() => {
    if (mapNames[mapName]) showLocation(mapNames[mapName])
    if (isGM && !auroraActive && Math.random() < 0.03) triggerAurora()
    if (isGM && mapName === "cimetiere.jpg" && !cemeteryEventDone) setTimeout(() => triggerCemeteryEvent(), 1500)
  }, 2200)
})

// ─── groupMadness — jauge folie du groupe ───
db.ref("game/groupMadness").on("value", snap => {
  const value = Math.max(0, Math.min(100, parseInt(snap.val(), 10) || 0))
  window.groupMadness = value
  updateMadnessUI(value)
})

db.ref("game/worldMapFogTopLeftHidden").on("value", snap => {
  const prevHidden = !!window.worldMapFogTopLeftHidden
  const nextHidden = !!snap.val()
  window.worldMapFogTopLeftHidden = nextHidden
  if (window.__worldMapFogTopLeftReady && !prevHidden && nextHidden) {
    revealWorldMapFogTopLeft()
  }
  window.__worldMapFogTopLeftReady = true
  updateWorldMapFogTopLeft()
})

db.ref("game/readLoreBooks").on("value", snap => {
  window.readLoreBooksData = snap.val() || {}
})

db.ref("game/mapLoreBook").on("value", snap => {
  window.mapLoreBookData = snap.val()
  updateMapLoreBookVisibility()
})

// ─── shop ───
db.ref("game/shop").on("value", snap => {
  const data = snap.val()
  const isOpen = !!(data && data.open)
  if (!window.__shopInitDone) {
    window.__shopWasOpen = isOpen
    window.__shopInitDone = true
  } else if (window.__shopWasOpen !== isOpen) {
    const now = Date.now()
    if (window.__lastShopSoundState !== isOpen || (now - window.__lastShopSoundAt) > 700) {
      const snd = new Audio("audio/clic.mp3")
      snd.volume = 0.8
      snd.play().catch(() => {})
      window.__lastShopSoundState = isOpen
      window.__lastShopSoundAt = now
    }
    window.__shopWasOpen = isOpen
  }
  const existing = document.getElementById("shopOverlay")
  if (existing) existing.remove()
  if (!data || !data.open) return
  if (gameState !== "GAME" && gameState !== "COMBAT") return
  renderShop(data.partyLvl, data.type || "marche")
})

// ─── highPNJName ───
db.ref("game/highPNJName").on("value", snap => {
  const data = snap.val()
  if (!data || !data.name) return
  if (gameState !== "GAME" && gameState !== "COMBAT") return
  showHighPNJScroll(data.name)
})

// ─── aurora ───
db.ref("events/aurora").on("value", snap => {
  const data = snap.val()
  if (!data || !data.active) {
    if (auroraActive || document.getElementById("auroraOverlay")) {
      showAuroraEndSequence()
    }
    return
  }
  if (!gameStarted || gameState === GAME_STATE.MENU) return
  showAuroraEvent()
})

// ─── bifrostFlash ───
db.ref("game/bifrostFlash").on("value", snap => {
  if (!snap.val()) return
  doBifrostFlash()
  db.ref("game/bifrostFlash").remove()
})

// ─── odinVision ───
db.ref("game/odinVision").on("value", snap => {
  const data = snap.val()
  if (!data) return
  showOdinVision(data.msg)
})

// ─── powerSound ───
db.ref("game/powerSound").on("value", snap => {
  const data = snap.val()
  if (!data) return
  const pInfo = playerPowerSounds[data.player]
  if (!pInfo) return
  const snd = new Audio((typeof resolveAudioPath === "function") ? resolveAudioPath(pInfo.file) : (/^(https?:|data:|blob:|\/|audio\/)/i.test(String(pInfo.file || "")) ? String(pInfo.file || "") : "audio/" + pInfo.file))
  snd.volume = 0; snd.play().catch(() => {})
  const inIv = setInterval(() => { if (snd.volume < 0.85) snd.volume = Math.min(0.85, snd.volume + 0.06); else clearInterval(inIv) }, 80)
  if (pInfo.fadeAt) {
    setTimeout(() => {
      const outIv = setInterval(() => { if (snd.volume > 0.01) snd.volume = Math.max(0, snd.volume - 0.06); else { snd.pause(); clearInterval(outIv) } }, 80)
    }, pInfo.fadeAt)
  }
  db.ref("game/powerSound").remove()
})

// ─── mobAttackEvent ───
db.ref("game/mobAttackEvent").on("value", snap => {
  const data = snap.val()
  if (!data) return
  const notif = document.createElement("div")
  notif.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:99999999;text-align:center;pointer-events:none;background:rgba(0,0,0,0.85);border:2px solid rgba(220,40,40,0.7);border-radius:12px;padding:24px 40px;box-shadow:0 0 40px rgba(200,0,0,0.5);opacity:0;transition:opacity 0.3s ease;"
  notif.innerHTML = `<div style="font-size:48px;margin-bottom:8px;">${data.icon}</div>${data.mobName ? `<div style="font-family:Cinzel,serif;font-size:12px;color:#ff8888;letter-spacing:2px;margin-bottom:4px;">${data.mobName}</div>` : ""}<div style="font-family:'Cinzel Decorative',serif;font-size:22px;color:#ff4444;text-shadow:0 0 20px red;letter-spacing:3px;margin-bottom:10px;">${data.attackName}</div><div style="font-family:Cinzel,serif;font-size:18px;color:#ffaaaa;">→ <span style="color:#fff;font-weight:bold;">${data.target}</span></div><div style="font-family:Cinzel,serif;font-size:28px;color:#ff3333;font-weight:bold;text-shadow:0 0 10px red;margin-top:6px;">-${data.dmg} HP</div>`
  document.body.appendChild(notif)
  setTimeout(() => { notif.style.opacity = "1" }, 30)
  setTimeout(() => {
    notif.style.opacity = "0"
    setTimeout(() => { if (notif.parentNode) notif.remove() }, 500)
    db.ref("game/mobAttackEvent").remove()
  }, 2800)
  screenShakeHard()
  playSound("critSound", 0.6)
})

// ─── curse/wheel ───
db.ref("curse/wheel").on("value", snap => {
  const data = snap.val()
  if (!data) {
    window.__curseWheelTriggeredFor = null
    return
  }
  if (data.state === "intro")  showCurseIntro(data.player)
  if (data.state === "wheel")  showCurseWheelScreen(data.player)
  if (data.state === "result") showCurseResult(data.player, data.result)
})

function cleanupRuneChallengeUI() {
  const overlay = document.getElementById("runeChallengeOverlay")
  if (overlay) overlay.remove()
  const playerBtn = document.getElementById("playerCodeBtn")
  if (playerBtn) playerBtn.remove()
  window.activeRuneChallengeData = null
  _state.runeJustOpened = false
}

// ─── runeChallenge ───
db.ref("game/runeChallenge").on("value", snap => {
  const data = snap.val()
  window.activeRuneChallengeData = data || null
  if (!data || !data.active) {
    cleanupRuneChallengeUI()
    updateRuneMenuBtn(false)
    updateThuumButton()
    return
  }
  if (gameState !== "GAME" && gameState !== "COMBAT") return
  updateRuneMenuBtn(true)
  const overlay = document.getElementById("runeChallengeOverlay")
  if (overlay) overlay.remove()
  renderRuneChallenge(data)
  if (isGM && !_state.runeJustOpened) _state.runeJustOpened = true
  updateThuumButton()
})

function ensureCemeteryGlyphIntro() {
  let g = document.getElementById("glipheOverlay")
  if (!g) {
    g = document.createElement("div")
    g.id = "glipheOverlay"
    g.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;z-index:99999990;opacity:0;transition:opacity 1s ease;"
    const im = document.createElement("img")
    im.src = (typeof resolveImagePath === "function") ? resolveImagePath("gliphe.png") : "images/gliphe.png"
    im.style.cssText = "max-height:70vh;max-width:70vw;object-fit:contain;filter:drop-shadow(0 0 30px purple);"
    g.appendChild(im)
    document.body.appendChild(g)
    const s2 = new Audio((typeof resolveAudioPath === "function") ? resolveAudioPath("spell.mp3") : "audio/spell.mp3")
    s2.volume = 0.9
    s2.play().catch(() => {})
  }
  setTimeout(() => { g.style.opacity = "1" }, 50)
  setTimeout(() => {
    if (typeof startSpellAura === "function") startSpellAura()
  }, 1000)
}

// ─── cemeterySpell ───
db.ref("game/cemeterySpell").on("value", snap => {
  const data = snap.val()
  if (!data) return
  if (gameState !== "GAME") return

  if (data.active && !data.glipheShown) {
    ensureCemeteryGlyphIntro()
    return
  }

  if (data.glipheShown) {
    const g = document.getElementById("glipheOverlay")
    if (g) { g.style.opacity = "0"; setTimeout(() => { if (g.parentNode) g.remove() }, 800) }
  }

  if (data.freed) {
    const mg = document.getElementById("spellMiniGame")
    if (mg) { mg.style.opacity = "0"; setTimeout(() => { if (mg.parentNode) mg.remove() }, 800) }
    if (!data.failedByZombie) showSpellFreed()
    if (isGM) db.ref("game/cemeterySpell").remove()
    return
  }

  if (data.glipheShown && !data.freed) renderSpellDiceGame(data)
})

// ─── playerDeath ───
db.ref("game/playerDeath").on("value", snap => {
  const data = snap.val()
  if (!data) return
  const pid = data.player
  deadPlayers[pid] = true
  const tok = Array.from(document.querySelectorAll(".token")).find(t => String(t.id || "").toLowerCase() === String(pid || "").toLowerCase())
  if (tok) {
    tok.classList.add("playerDead")
    if (!document.getElementById("skull_" + pid)) {
      const skull = document.createElement("div"); skull.id = "skull_" + pid
      skull.style.cssText = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:36px;z-index:10;animation:skullFloat 2s ease-in-out infinite alternate;"
      skull.innerText = "💀"; tok.appendChild(skull)
    }
  }
  showNotification("💀 " + pid.toUpperCase() + " est tombé !")
  const snd = new Audio("audio/defaite.mp3"); snd.volume = 0.6; snd.play().catch(() => {})
  screenShakeHard()
  if (!isGM && getLocalPlayerId() === String(pid || "").toLowerCase()) triggerLocalDefeat("playerDeath")
  if (isGM) {
      db.ref("game/combatOutcome").set({ type: "defeat", player: pid, time: Date.now() })
      setTimeout(() => db.ref("game/combatOutcome").remove(), 6500)
      if (!document.getElementById("revive_" + pid)) {
        const revBtn = document.createElement("button"); revBtn.id = "revive_" + pid
      revBtn.style.cssText = "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:99999;padding:10px 24px;font-family:'Cinzel Decorative',serif;font-size:13px;background:linear-gradient(rgba(0,80,0,0.8),rgba(0,40,0,0.8));color:#88ff88;border:2px solid rgba(50,180,50,0.6);border-radius:6px;cursor:pointer;letter-spacing:2px;animation:bifrostPulse 1.5s ease-in-out infinite alternate;"
      revBtn.innerText = "✦ Ressusciter " + pid.toUpperCase()
      revBtn.onclick = () => { revivePlayer(pid); revBtn.remove() }
      document.body.appendChild(revBtn)
    }
  }
  if (isGM) setTimeout(() => db.ref("game/playerDeath").remove(), 1200)
  })

// ─── combatOutcome — victoire/défaite fiable côté joueurs ───
db.ref("game/combatOutcome").on("value", snap => {
  if (isGM) return
  const data = snap.val()
  if (!data || window.__combatOutcomeShowing) return

  if (data.type === "victory" && (combatActive || gameState === "COMBAT")) {
    showVictory()
    return
  }

  if (data.type === "defeat") {
    const localId = getLocalPlayerId()
    if (!localId) return
    if (data.player && String(data.player).toLowerCase() !== localId) return
    triggerLocalDefeat("combatOutcome")
  }
})

// ─── playerRevive ───
db.ref("game/playerRevive").on("value", snap => {
  const data = snap.val()
  if (!data) return
  const pid = data.player
  const tok = document.getElementById(pid)
  if (tok) {
    tok.classList.remove("playerDead")
    const skull = document.getElementById("skull_" + pid)
    if (skull) { skull.style.transition = "opacity 0.5s"; skull.style.opacity = "0"; setTimeout(() => skull.remove(), 500) }
  }
  deadPlayers[pid] = false
  const revBtn = document.getElementById("revive_" + pid)
  if (revBtn) revBtn.remove()
  db.ref("game/playerRevive").remove()
})

// ─── mob2 et mob3 ───
;["mob2", "mob3"].forEach(slot => {
  db.ref("combat/" + slot).on("value", snap => {
    const data = snap.val()
    activeMobSlots[slot] = !!data
    const existing = document.getElementById("mobToken_" + slot)
    if (existing) existing.remove()
    if (data && (gameState === "COMBAT" || gameState === "GAME")) {
      spawnExtraMobToken(data, slot)
      renderAllMobPanels()
    }
  })
})

// ─── elements ───
db.ref("elements").on("child_added", snap => {
  const data = snap.val()
  if (data && (gameState === "GAME" || gameState === "COMBAT")) renderMapElement(data)
})
db.ref("elements").on("child_changed", snap => {
  const data = snap.val(); if (!data) return
  const el = document.getElementById("elem_" + data.id)
  if (el) { el.style.left = data.x + "px"; el.style.top = data.y + "px" }
})
db.ref("elements").on("child_removed", snap => {
  const el = document.getElementById("elem_" + snap.key)
  if (el) { el.style.transition = "opacity 0.4s"; el.style.opacity = "0"; setTimeout(() => el.remove(), 400) }
})

// ─── wantedPosters ───
db.ref("game/wantedPosters").on("value", snap => {
  const list = document.getElementById("wantedList")
  if (!list || !isGM) return
  list.innerHTML = ""
  const data = snap.val(); if (!data) return
  Object.values(data).forEach(p => renderWantedPoster(p))
})

// ─── wantedOpen ───
db.ref("game/wantedOpen").on("value", snap => {
  const data = snap.val()
  if (!data || !data.poster) return
  showWantedOverlay(data.poster)
  if (isGM) {
    setTimeout(() => db.ref("game/wantedOpen").remove(), 1200)
  }
})

// ─── simonState ───
db.ref("game/simonState").on("value", snap => {
  const simon = snap.val(); if (!simon || gameState !== "GAME") return
  db.ref("game/cemeterySpell").once("value", s => {
    const spell = s.val()
    if (!spell || !spell.glipheShown || spell.freed) return
    showSimonGame(spell, simon)
  })
})

// ─── document — indices / notes ───
db.ref("game/document").on("value", snap => {
  _renderDocument(snap.val())
})

// ─── playerAllyAccess — bouton invocations donné par le MJ ───
db.ref("game/playerAllyAccess").on("value", snap => {
  if (isGM) return
  const data = snap.val()
  window.playerAllyAccessData = data || null
  const btn = document.getElementById("playerAllyBtn")
  const existing = document.getElementById("allyViewerPanel")

  if (btn) btn.style.display = "none"
  if (!data && existing) existing.remove()
  updateThuumButton()
})

// ─── playerThuum — cris débloqués ───
db.ref("game/playerThuum").on("value", snap => {
  window.playerThuumData = snap.val() || {}
  updateThuumButton()
  setTimeout(updateThuumButton, 150)
})

db.ref("game/playerThuumAccess").on("value", snap => {
  window.playerThuumAccessData = snap.val() || {}
  updateThuumButton()
})

// ─── usedThuum — cooldown par combat ───
db.ref("combat/usedThuum").on("value", snap => {
  window.usedThuumData = snap.val() || {}
  updateThuumButton()
  setTimeout(updateThuumButton, 150)
})

// ─── thuumUnlockEvent — découverte globale ───
db.ref("game/thuumUnlockEvent").on("value", snap => {
  const data = snap.val()
  if (!data || !data.time) return
  if (data.time <= window.__lastThuumUnlockTime) return
  window.__lastThuumUnlockTime = data.time
  showThuumUnlockCinematic(data)
  setTimeout(updateThuumButton, 250)
  setTimeout(updateThuumButton, 1200)
})

// ─── thuumCast — utilisation globale ───
db.ref("game/thuumCast").on("value", snap => {
  const data = snap.val()
  if (!data || !data.time) return
  if (data.time <= window.__lastThuumCastTime) return
  window.__lastThuumCastTime = data.time
  playThuumCastEffect(data)
})

// ─── allyAction — PNJ allié en combat ───
db.ref("game/allyAction").on("value", snap => {
  const data = snap.val()
  if (!data) return
  showAllyActionResult(data)
})

// ─── mapAudio — musique spécifique à la map ───
db.ref("game/mapAudio").on("value", snap => {
  const data = snap.val()
  if (!data || !data.file) return
  // Attendre que le fade de map soit terminé (1.4s) puis jouer
  setTimeout(() => {
    _musicTransitioning = false; _pendingMusic = null
    if (musicFadeInterval) { clearInterval(musicFadeInterval); musicFadeInterval = null }
    stopAllMusic()
    setTimeout(() => {
      crossfadeMusic("" + data.file + ".mp3")
      _state._pendingMapAudio = false
    }, 300)
  }, 1400)
  db.ref("game/mapAudio").remove()
})

}) // fin DOMContentLoaded

/* ========================= */
/* TOKENS                    */
/* ========================= */

function getMaxHP(playerId, level) {
  const s = getPlayerStatsAtLevel(playerId, level || 1)
  return s ? s.hp : 100
}

function updateTokenFromDB(snapshot) {
  const id   = snapshot.key
  const data = snapshot.val()
  if (!data) return
  if (myToken && id === myToken.id) return
  const token = document.getElementById(id)
  if (!token) return
  const currentX = parseInt(token.style.left) || 0
  const currentY = parseInt(token.style.top)  || 0
  if (currentX === data.x && currentY === data.y) return
  token.style.left = data.x + "px"
  token.style.top  = data.y + "px"
  updateTokenStats(id)
  if (data.hp !== undefined) {
    if (id === "greg" && data.hp < 50) showBibiSpeech("Miiii !")
    db.ref("characters/" + id + "/lvl").once("value", lvlSnap => {
      const lvl   = parseInt(lvlSnap.val()) || 1
      const maxHP = getMaxHP(id, lvl)
      const bar   = document.getElementById("hp_" + id)
      if (bar) bar.style.width = Math.max(0, Math.min(100, (data.hp / maxHP) * 100)) + "%"
    })
    updateTokenGlow(id, data.hp)
    if (lastHP[id] !== undefined && data.hp < lastHP[id]) damageEffect(id)
    lastHP[id] = data.hp
  }
}

function updateTokenStats(id) {
  const stats = document.getElementById("stats_" + id)
  if (!stats) return
  db.ref("characters/" + id).once("value", snapshot => {
    const data = snapshot.val(); if (!data) return
    const hp         = data.hp || 0
    const curse      = data.curse || 0
    const corruption = data.corruption || 0
    const lvl        = data.lvl || 1

    // Calcul du poids inventaire
    let weight = 0
    if (data.inventaire) {
      data.inventaire.split("\n").forEach(line => {
        const wm = line.match(/\(([^)]+)\)/); if (!wm) return
        const value = parseFloat(wm[1].replace(/[kg\s]/gi, "").replace(",", "."))
        if (isNaN(value)) return
        const qm = line.match(/x(\d+)/i)
        weight += value * (qm ? parseInt(qm[1]) : 1)
      })
    }

    const token     = document.getElementById(id)
    const maxWeight = data.poids || 100
    if (token) {
      token.classList.toggle("overweight", weight >= maxWeight)
      if ((data.curse || 0) >= 8) { token.classList.add("cursed");    startBloodEffect(token) }
      else                        { token.classList.remove("cursed"); stopBloodEffect(token)  }
    }

    const maxHP   = getMaxHP(id, lvl)
    const hpColor = hp > maxHP * 0.6 ? "#3cff6b" : hp > maxHP * 0.3 ? "#ffb347" : "#ff4040"
    let curseIcons = "", powerIcon = ""
    if (id !== "bibi") {
      for (let i = 0; i < curse; i++) curseIcons += "☠"
      powerIcon = corruption >= 10 ? "✨" : ""
    }

    stats.innerHTML = `
      <div class="powerText">⭐ Niv ${lvl}</div>
      <div class="hpText" style="color:${hpColor}">❤️ ${hp}/${maxHP}</div>
      ${weight > 0 ? `<div class="weightText">🎒 ${weight}</div>` : ""}
      ${curseIcons ? `<div class="curseText">${curseIcons}</div>` : ""}
      ${powerIcon  ? `<div class="powerText">${powerIcon}</div>` : ""}
    `

    const bar = document.getElementById("hp_" + id)
    if (bar) bar.style.width = Math.max(0, Math.min(100, (hp / maxHP) * 100)) + "%"
    updateTokenGlow(id, hp)
  })
}

function updateTokenHP() {
  if (!myToken) return
  const hp = parseInt(document.getElementById("hp").value) || 0
  db.ref("characters/" + myToken.id + "/lvl").once("value", lvlSnap => {
    const lvl   = parseInt(lvlSnap.val()) || 1
    const maxHP = getMaxHP(id, lvl)
    const pct   = Math.max(0, Math.min(100, (hp / maxHP) * 100))
    const bar   = document.getElementById("hp_" + myToken.id)
    if (bar) bar.style.width = pct + "%"
    const token = document.getElementById(myToken.id)
    token.classList.remove("lowHP", "midHP", "fullHP")
    if (pct > 60)      token.classList.add("fullHP")
    else if (pct > 30) token.classList.add("midHP")
    else               token.classList.add("lowHP")
  })
  db.ref("characters/" + myToken.id + "/hp").set(hp)
  updateTokenStats(myToken.id)
}

/* ========================= */
/* PERSONNAGES                */
/* ========================= */

function watchCharacter(snapshot) {
  const playerID = snapshot.key
  const data     = snapshot.val()
  if (!data) return

  updateTokenStats(playerID)
  updateGMStats(playerID, data)

  const xp         = parseInt(data.xp)        || 0
  const lvl        = parseInt(data.lvl)        || 1
  const hp         = parseInt(data.hp)         || 0
  const corruption = parseInt(data.corruption) || 0

  const maxHP = 100 + (lvl - 1) * 8
  const bar   = document.getElementById("hp_" + playerID)
  if (bar) bar.style.width = Math.max(0, Math.min(100, (hp / maxHP) * 100)) + "%"
  updateTokenGlow(playerID, hp)

  const token = document.getElementById(playerID)
  if (token) {
    if (corruption >= 10) {
      token.classList.add("powerReady")
      if (myToken && myToken.id === playerID && !powerModeActive) activatePowerMode(playerID)
    } else {
      token.classList.remove("powerReady", "powerFull")
      powerModeActive = false
      const p1 = document.getElementById("power1Sound")
      if (p1 && myToken && myToken.id === playerID) { p1.pause(); p1.currentTime = 0 }
    }
    const curseVal = parseInt(data.curse) || 0
    if (curseVal >= 8) { token.classList.add("cursed");    startBloodEffect(token) }
    else               { token.classList.remove("cursed"); stopBloodEffect(token)  }
  }

  const localId = getLocalPlayerId()
  const localCurse = parseInt(data.curse) || 0
  if (
    !isGM &&
    localId &&
    String(playerID).toLowerCase() === localId &&
    localCurse >= 8 &&
    !window.__curseWheelTriggeredFor
  ) {
    window.__curseWheelTriggeredFor = localId
    triggerCurseWheel(playerID)
  } else if (
    localId &&
    String(playerID).toLowerCase() === localId &&
    localCurse < 8 &&
    window.__curseWheelTriggeredFor === localId
  ) {
    window.__curseWheelTriggeredFor = null
  }

  // Level up
  const previousLevel = lastLevel[playerID] !== undefined ? lastLevel[playerID] : (lvl - 1)
  let newLevel = 1
  while (xp >= xpForLevel(newLevel + 1)) newLevel++

  if (newLevel > lvl) {
    const computed     = getPlayerStatsAtLevel(playerID, newLevel)
    const prevComputed = getPlayerStatsAtLevel(playerID, lvl)
    const updateData   = { lvl: newLevel }
    if (computed && prevComputed) {
      allStats.forEach(s => {
        updateData[s] = (parseInt(data[s]) || 0) + (computed[s] - prevComputed[s])
      })
      updateData.hp    = computed.hp
      updateData.poids = computed.poids
    } else {
      updateData.hp = getMaxHP(playerId, newLevel)
    }
    db.ref("characters/" + playerID).update(updateData)

    if (newLevel > previousLevel && !pendingLevelUp["_shown_" + playerID + "_" + newLevel]) {
      pendingLevelUp["_shown_" + playerID + "_" + newLevel] = true
      const sheet = document.getElementById("characterSheet")
      if (sheet && sheet.style.display === "block") pendingLevelUp[playerID] = true
      else triggerLevelUp(playerID)
    }

    // Sync Bibi si Greg
    if (playerID === "greg") {
      const bibiC    = getPlayerStatsAtLevel("bibi", newLevel)
      const bibiPrev = getPlayerStatsAtLevel("bibi", lvl)
      const bibiUp   = { lvl: newLevel }
      if (bibiC && bibiPrev) {
        allStats.forEach(s => { bibiUp[s] = (parseInt((_state.bibiData || {})[s]) || bibiC[s] - (bibiC[s] - bibiPrev[s])) + (bibiC[s] - bibiPrev[s]) })
        bibiUp.hp = bibiC.hp; bibiUp.poids = bibiC.poids
      } else { bibiUp.hp = getMaxHP('bibi', newLevel) }
      db.ref("characters/bibi").update(bibiUp)
    }
  }
  lastLevel[playerID] = lvl
}

function triggerLevelUp(playerID) {
  showNotification("✨ " + playerID.toUpperCase() + " LEVEL UP !")
  addMJLog("⭐ " + playerID.toUpperCase() + " LEVEL UP")
  showLevelUpEffect(playerID)
  showLevelUpText(playerID)
  playSound("levelUpSound")
  // Donner 2 points libres à distribuer
  db.ref("characters/" + playerID + "/freePoints").once("value", snap => {
    const current = parseInt(snap.val()) || 0
    db.ref("characters/" + playerID + "/freePoints").set(current + 2)
  })
}

function updateGMStats(playerID, data) {
  const box = document.getElementById("gmStats_" + playerID)
  if (!box) return
  let curseIcons = ""
  for (let i = 0; i < (data.curse || 0); i++) curseIcons += "☠"
  box.innerHTML = `<div class="gmMiniHPText">❤️ ${data.hp || 0}</div><div class="gmMiniCurse">${curseIcons}</div><div class="gmMiniPower">${(data.corruption || 0) >= 10 ? "✨" : ""}</div>`
}

function getPartyLevel(callback) {
  const players = ["greg", "ju", "elo"]
  let total = 0, count = 0
  players.forEach(p => {
    db.ref("characters/" + p + "/lvl").once("value", snap => {
      total += parseInt(snap.val()) || 1
      if (++count === players.length) callback(Math.round(total / players.length))
    })
  })
}

function revivePlayer(playerId) {
  deadPlayers[playerId] = false
  db.ref("characters/" + playerId + "/hp").set(1)
  const tok = document.getElementById(playerId)
  if (tok) {
    tok.classList.remove("playerDead")
    const skull = document.getElementById("skull_" + playerId)
    if (skull) skull.remove()
  }
  showNotification("💫 " + playerId.toUpperCase() + " revient à la vie !")
  db.ref("game/playerRevive").set({ player: playerId, time: Date.now() })
}

/* ========================= */
/* MAP                       */
/* ========================= */

function changeMap(mapName, customAudio) {
  if (!isGM) return
  _musicTransitioning = false; _pendingMusic = null
  if (musicFadeInterval) { clearInterval(musicFadeInterval); musicFadeInterval = null }
  maybeSpawnMapLoreBook(mapName)
  // Un seul set — pas de set(null) puis set(valeur)
  db.ref("game/map").set(mapName)
  // Audio spécifique à la map si fourni
  if (customAudio) {
    _state._pendingMapAudio = true
    db.ref("game/mapAudio").set({ file: customAudio, time: Date.now() })
  } else {
    _state._pendingMapAudio = false
  }
  document.querySelectorAll(".gmSection").forEach(sec => { sec.style.display = "none" })
}

/* ========================= */
/* XP                        */
/* ========================= */

function giveXP(amount) {
  if (!isGM) return
  ;["greg", "ju", "elo"].forEach(player => {
    db.ref("characters/" + player + "/xp").once("value", snap => {
      db.ref("characters/" + player + "/xp").set((parseInt(snap.val()) || 0) + amount)
    })
  })
  showXPMessage(amount)
  addMJLog("⭐ MJ donne " + amount + " XP au groupe")
  setTimeout(syncBibiLevel, 1000)
}

function syncBibiLevel() {
  db.ref("characters/greg/lvl").once("value", snap => {
    const gregLvl = parseInt(snap.val()) || 1
    db.ref("characters/bibi/lvl").once("value", snap2 => {
      const bibiLvl = parseInt(snap2.val()) || 1
      if (bibiLvl !== gregLvl) {
        db.ref("characters/bibi").update({ lvl: gregLvl, hp: getMaxHP('bibi', gregLvl) })
        addMJLog("🐶 Bibi passe niveau " + gregLvl)
      }
    })
  })
}

/* ========================= */
/* SAUVEGARDE                */
/* ========================= */

function saveGame() {
  if (!isGM) return
  const saveName = prompt("Nom de la sauvegarde :", "Partie " + new Date().toLocaleDateString("fr-FR"))
  if (!saveName) return

  // Toutes les clés nécessaires pour une reprise complète
  const keys = [
    "characters",
    "tokens",
    "elements",
    "game/map",
    "game/wantedPosters",
    "game/runeChallenge",
    "game/mapLoreBook",
    "game/readLoreBooks",
    "game/storyImage",
    "game/storyImage2",
    "game/storyImage3"
  ]

  const data = { _saveName: saveName, _saveDate: new Date().toLocaleString("fr-FR") }
  let pending = keys.length

  keys.forEach(key => {
    db.ref(key).once("value", snap => {
      const val = snap.val()
      if (val !== null) {
        const parts = key.split("/")
        if (parts.length === 1) {
          data[key] = val
        } else {
          if (!data[parts[0]]) data[parts[0]] = {}
          data[parts[0]][parts[1]] = val
        }
      }
      pending--
      if (pending === 0) {
        try {
          const saves = JSON.parse(localStorage.getItem("rpg_saves") || "{}")
          saves[saveName] = data
          localStorage.setItem("rpg_saves", JSON.stringify(saves))
          localStorage.setItem("rpg_save",  JSON.stringify(data))
          showNotification("💾 Sauvegardé : " + saveName)
          addMJLog("💾 Sauvegarde : " + saveName)
        } catch(e) {
          showNotification("⚠ Sauvegarde trop volumineuse !")
          console.error("Save error:", e)
        }
      }
    })
  })
}

function _applyLoadData(data, callback) {
  const ops = []

  // Écriture directe sur chaque ref — pas de update() depuis la racine avec des slashes
  if (data.characters)          ops.push(db.ref("characters").set(data.characters))
  if (data.tokens)              ops.push(db.ref("tokens").set(data.tokens))
  if (data.elements)            ops.push(db.ref("elements").set(data.elements))
  else                          ops.push(db.ref("elements").remove())
  if (data.game?.map)           ops.push(db.ref("game/map").set(data.game.map))
  if (data.game?.wantedPosters) ops.push(db.ref("game/wantedPosters").set(data.game.wantedPosters))
  else                          ops.push(db.ref("game/wantedPosters").remove())
  if (data.game?.runeChallenge) ops.push(db.ref("game/runeChallenge").set(data.game.runeChallenge))
  else                          ops.push(db.ref("game/runeChallenge").remove())
  if (data.game?.mapLoreBook)   ops.push(db.ref("game/mapLoreBook").set(data.game.mapLoreBook))
  else                          ops.push(db.ref("game/mapLoreBook").remove())
  if (data.game?.readLoreBooks) ops.push(db.ref("game/readLoreBooks").set(data.game.readLoreBooks))
  else                          ops.push(db.ref("game/readLoreBooks").remove())
  if (data.game?.storyImage)    ops.push(db.ref("game/storyImage").set(data.game.storyImage))
  else                          ops.push(db.ref("game/storyImage").remove())
  if (data.game?.storyImage2)   ops.push(db.ref("game/storyImage2").set(data.game.storyImage2))
  else                          ops.push(db.ref("game/storyImage2").remove())
  if (data.game?.storyImage3)   ops.push(db.ref("game/storyImage3").set(data.game.storyImage3))
  else                          ops.push(db.ref("game/storyImage3").remove())
  ops.push(db.ref("events/aurora").remove())

  // Nettoyage
  ops.push(db.ref("combat").remove())
  ops.push(db.ref("game/shop").remove())
  ops.push(db.ref("game/cemeterySpell").remove())
  ops.push(db.ref("curse/wheel").remove())
  ops.push(db.ref("game/bifrostFlash").remove())
  ops.push(db.ref("game/mobAttackEvent").remove())

  Promise.all(ops).then(callback).catch(e => {
    console.error("Load error:", e)
    showNotification("⚠ Erreur au chargement")
  })
}

function loadGame() {
  const save = localStorage.getItem("rpg_save")
  if (!save) { showNotification("Aucune sauvegarde"); return }
  let data
  try { data = JSON.parse(save) } catch(e) { showNotification("Sauvegarde corrompue"); return }
  if (!data.characters && !data.tokens) { showNotification("Sauvegarde vide"); return }
  _applyLoadData(data, () => {
    resetMadnessPresentation()
    if (typeof resetAuroraPresentation === "function") resetAuroraPresentation()
    db.ref("events/aurora").remove()
    updateMadnessVisibility()
    updateThuumButton()
    showNotification("✅ Partie chargée")
  })
}

function loadSave(saveName) {
  const saves = JSON.parse(localStorage.getItem("rpg_saves") || "{}")
  const data  = saves[saveName]
  if (!data) { showNotification("Sauvegarde introuvable"); return }
  _applyLoadData(data, () => {
    resetMadnessPresentation()
    if (typeof resetAuroraPresentation === "function") resetAuroraPresentation()
    updateMadnessVisibility()
    updateThuumButton()
    const panel = document.getElementById("savePanel"); if (panel) panel.remove()
    showNotification("✅ Partie chargée : " + saveName)
    addMJLog("📂 Chargement : " + saveName)
  })
}

function deleteSave(saveName) {
  if (!confirm("Supprimer cette sauvegarde ?")) return
  const saves = JSON.parse(localStorage.getItem("rpg_saves") || "{}")
  delete saves[saveName]
  localStorage.setItem("rpg_saves", JSON.stringify(saves))
  showSaveMenu()
}

function newGame() {
  const music = document.getElementById("music")
  if (music) { music.pause(); music.currentTime = 0 }
  if (!confirm("Commencer une nouvelle partie ?")) return
  gameStarted = false; window.isNewGame = true
  const initChars = {}
  ;["greg", "ju", "elo", "bibi"].forEach(pid => {
    const s = getPlayerStatsAtLevel(pid, 1)
    initChars[pid] = { lvl:1, xp:0, hp:s.hp, poids:s.poids, force:s.force, charme:s.charme, perspi:s.perspi, chance:s.chance, defense:s.defense, curse:0, corruption:0, inventaire:"", notes:"" }
  })
    db.ref("characters").set(initChars)
    db.ref("tokens").set({ greg:{x:200,y:300}, ju:{x:300,y:300}, elo:{x:400,y:300}, bibi:{x:600,y:300} })
    db.ref("game/map").set("taverne.jpg")
    db.ref("game/groupMadness").set(0)
    db.ref("game/worldMapFogTopLeftHidden").set(false)
    resetMadnessPresentation()
    if (typeof resetAuroraPresentation === "function") resetAuroraPresentation()
    db.ref("events/aurora").remove()
    db.ref("diceRoll").remove()
  db.ref("game/storyImage").set(null)
  showNotification("🆕 Nouvelle partie créée")
  setGameState("MENU")
  startIntro()
}

function resetAllPlayerStats() {
  if (!isGM) { showNotification("MJ seulement"); return }
  ;["greg", "ju", "elo", "bibi"].forEach(pid => {
    db.ref("characters/" + pid + "/lvl").once("value", snap => {
      const lvl      = snap.val() || 1
      const computed = getPlayerStatsAtLevel(pid, lvl)
      if (!computed) return
      const update = { lvl, hp: computed.hp, poids: computed.poids }
      allStats.forEach(s => { update[s] = computed[s] })
      db.ref("characters/" + pid).update(update)
      showNotification("✓ Stats " + pid + " réinitialisées (lvl " + lvl + ")")
    })
  })
}

/* ========================= */
/* DICE                      */
/* ========================= */

function rollDice(max) {
  let playerName
  if (isGM) { playerName = "MJ" }
  else {
    if (!myToken) { showNotification("Choisissez un personnage !"); return }
    playerName = myToken.id
  }
  const result = Math.floor(Math.random() * max) + 1
  db.ref("diceRoll").push({ player: playerName, dice: max, result, time: Date.now(), sender: playerName })
}

function gmRoll(max) {
  if (!isGM) return
  const result = Math.floor(Math.random() * max) + 1
  db.ref("diceRoll").push({ player: "MJ", dice: max, result, time: Date.now(), sender: "MJ" })
}

function mobRoll(max) {
  if (!isGM || !combatActive) return
  const result = Math.floor(Math.random() * max) + 1
  db.ref("diceRoll").push({ player: "MOB", dice: max, result, time: Date.now(), sender: "MJ" })
}

function showDiceAnimation(playerName, max, final) {
  const resultBox = document.getElementById("diceResult")
  resultBox.style.display = "none"; resultBox.offsetHeight; resultBox.style.display = "block"
  resultBox.classList.remove("crit", "fail", "mjRoll")
  resultBox.innerHTML = "🎲 " + playerName + " lance un d" + max + "..."
  resultBox.style.opacity = 1
  let current = 0
  setTimeout(() => {
    const animation = setInterval(() => {
      const random = Math.floor(Math.random() * max) + 1
      resultBox.innerHTML = '<div class="diceNumber">' + random + '</div>'
      resultBox.style.transform = "translate(-50%,-50%) rotate(" + (Math.random() * 20 - 10) + "deg) scale(" + (1 + Math.random() * 0.2) + ")"
      if (++current >= 20) {
        clearInterval(animation)
        resultBox.style.transform = "translate(-50%,-50%) rotate(0deg) scale(1.2)"
        resultBox.innerHTML = '<div class="diceNumber">' + final + '</div>'
        addDiceLog(playerName, max, final)
        if (playerName === "MJ") { resultBox.classList.add("mjRoll"); flashGold(); screenShake() }
        if (final === max) {
          resultBox.classList.add("crit"); playSound("critSound"); screenShake(); flashGold()
          tryRuneEventOnDice()
          if (playerName !== "MJ" && playerName !== "MOB") {
            db.ref("characters/" + playerName + "/corruption").once("value", snap => {
              db.ref("characters/" + playerName + "/corruption").set(Math.min(10, (parseInt(snap.val()) || 0) + 1))
              showNotification("✨ " + playerName.toUpperCase() + " gagne 1 point de Pouvoir !")
            })
          }
        }
        if (final === 1) {
          resultBox.classList.add("fail"); playSound("failSound"); screenShakeHard(); flashRed()
          tryRuneEventOnDice()
          if (playerName !== "MJ" && playerName !== "MOB") {
            db.ref("characters/" + playerName + "/curse").once("value", snap => {
              db.ref("characters/" + playerName + "/curse").set(Math.min(8, (parseInt(snap.val()) || 0) + 1))
              showNotification("☠ " + playerName.toUpperCase() + " gagne 1 point de Malédiction !")
            })
          }
        }
        setTimeout(() => { resultBox.style.opacity = 0; resultBox.style.display = "none"; resultBox.style.transform = "translate(-50%,-50%)" }, 4000)
      }
    }, 60)
  }, 2500)
}

function rollStat(stat) {
  const sheet = document.getElementById("characterSheet")
  if (sheet && sheet.style.display === "block") return
  if (!myToken) return
  const field = document.getElementById(stat); if (!field) return
  const statValue = parseInt(field.value) || 0
  const dice = Math.floor(Math.random() * 20) + 1
  showDiceAnimation(myToken.id, 20, dice + statValue)
}

/* ========================= */
/* GAME STATE                */
/* ========================= */

  function setGameState(state) {
    gameState = state
  console.log("Game State →", state)
  if (state !== "GAME" && state !== "COMBAT" && typeof cleanupRuneChallengeUI === "function") cleanupRuneChallengeUI()
  switch (state) {
    case "MENU":
      document.getElementById("intro").style.display    = "flex"
      document.getElementById("camera").style.display   = "none"
      document.getElementById("playerSelect").style.display = "none"
      startMenuSparks()
      break
    case "INTRO":
      document.getElementById("intro").style.display  = "flex"
      document.getElementById("camera").style.display = "none"
      ;["storyImage","storyImage2","storyImage3"].forEach(id => { const el=document.getElementById(id); if(el) { el.style.display="none"; el.style.opacity="0" } })
      document.querySelectorAll("[id^='pnjNameTag']").forEach(t => t.remove())
      break
    case "DIALOGUE":
      document.getElementById("dialogueBox").style.display = "flex"
      document.getElementById("intro").style.display       = "none"
      break
    case "GAME":
      document.getElementById("camera").style.display      = "block"
      document.getElementById("playerSelect").style.display = "block"
      setTimeout(updateThuumButton, 500)
      break
      case "COMBAT":
        break
    }
    if (state !== "GAME") closeMapLoreBookOverlay()
    setTimeout(updateMadnessVisibility, 30)
    setTimeout(updateThuumButton, 30)
    setTimeout(updateMapLoreBookVisibility, 30)
  }

function hideIntroLayers() {
  const start = document.getElementById("startScreen")
  const intro = document.getElementById("intro")
  const introBox = document.getElementById("introBox")

  if (start) {
    start.style.display = "none"
    start.style.opacity = "0"
    start.style.pointerEvents = "none"
    start.style.visibility = "hidden"
  }

  if (intro) {
    intro.style.display = "none"
    intro.style.opacity = "0"
    intro.style.pointerEvents = "none"
    intro.style.visibility = "hidden"
    intro.style.zIndex = "-1"
  }
  if (introBox) {
    introBox.style.display = ""
    introBox.style.opacity = ""
    introBox.style.visibility = ""
    introBox.style.pointerEvents = ""
  }
}

function showIntroLayer() {
  const intro = document.getElementById("intro")
  const introBox = document.getElementById("introBox")
  if (!intro) return
  intro.style.display = "flex"
  intro.style.opacity = "1"
  intro.style.pointerEvents = "auto"
  intro.style.visibility = "visible"
  intro.style.zIndex = "15"
  if (introBox) {
    introBox.style.display = "flex"
    introBox.style.opacity = "1"
    introBox.style.visibility = "visible"
    introBox.style.pointerEvents = "auto"
  }
}

function startGame() {
        db.ref("combat/mob").remove(); db.ref("combat/mob2").remove(); db.ref("combat/mob3").remove(); db.ref("combat/usedAllies").remove()
        db.ref("combat/usedThuum").remove()
        db.ref("game/combatState").remove(); db.ref("game/combatOutcome").remove(); db.ref("game/playerAllyAccess").remove(); db.ref("game/playerThuum").remove(); db.ref("game/playerThuumAccess").remove(); db.ref("game/thuumCast").remove(); db.ref("game/thuumUnlockEvent").remove()
      db.ref("game/worldMapFogTopLeftHidden").set(false)
      db.ref("game/mapLoreBook").remove(); db.ref("game/readLoreBooks").remove()
      db.ref("events/aurora").remove()
      db.ref("elements").remove(); db.ref("game/shop").remove()
  db.ref("game/highPNJName").remove(); db.ref("game/runeChallenge").remove()
  db.ref("game/cemeterySpell").remove()
  cemeteryEventDone = false
    combatActive = false
    combatStarting = false
    window.__localPlayerId = ""
    try { localStorage.removeItem("rpg_local_player") } catch (e) {}
    if (window.__localDefeatRef && window.__localDefeatCb) {
      window.__localDefeatRef.off("value", window.__localDefeatCb)
      window.__localDefeatRef = null
      window.__localDefeatCb = null
    }
    window.__combatOutcomeShowing = false
    window.__pendingLocalDefeat = false
    window.playerThuumData = {}
    window.playerThuumAccessData = {}
    window.usedThuumData = {}
    window.mapLoreBookData = null
    window.readLoreBooksData = {}
    closeMapLoreBookOverlay()
    window.__shopWasOpen = false
    window.__shopInitDone = false
    window.__lastShopSoundState = null
    window.__lastShopSoundAt = 0
    if (window.__combatStatsRef && window.__combatStatsCb) {
      window.__combatStatsRef.off("value", window.__combatStatsCb)
      window.__combatStatsRef = null
      window.__combatStatsCb = null
    }
    resetMadnessPresentation()
    if (typeof resetAuroraPresentation === "function") resetAuroraPresentation()
    updateMadnessVisibility()
    const playerAllyBtn = document.getElementById("playerAllyBtn")
    if (playerAllyBtn) playerAllyBtn.style.display = "none"
    const playerThuumBtn = document.getElementById("playerThuumBtn")
    if (playerThuumBtn) playerThuumBtn.style.display = "none"
  stopMenuSparks()
  const titleEl = document.getElementById("gameTitle")
  if (titleEl) { titleEl.classList.remove("visible"); titleEl.innerText = "" }
  document.body.focus()
  if (gameStarted) return
  gameStarted = true
  hideIntroLayers()
  setGameState(GAME_STATE.INTRO)
  const fade = document.getElementById("fadeScreen"); fade.style.opacity = 1
  const music = document.getElementById("music"); if (music) { music.pause(); music.currentTime = 0 }
  db.ref("game/map").once("value", snapshot => {
    const mapName = snapshot.val(); if (!mapName) return
    const map = document.getElementById("map")
    map.style.backgroundImage = "url('" + mapName + "')"
    calculateMinZoom(); cameraZoom = minZoom; cameraX = 0; cameraY = 0; updateCamera()
  })
  setTimeout(() => {
    if (window.isNewGame) { window.isNewGame = false; playOpeningCinematic(startDialogue) }
    else showTavern()
  }, 1500)
}

function fadeOut() {
  const fade = document.getElementById("fadeScreen"); if (!fade) return; fade.style.opacity = 0
}

function showTavern() {
  hideIntroLayers()
  setGameState("GAME")
  const fade = document.getElementById("fadeScreen"); const map = document.getElementById("map")
  fadeOut()
  document.getElementById("camera").style.display      = "block"
  document.getElementById("playerSelect").style.display = "block"
  document.getElementById("diceBar").style.display      = "flex"
  document.getElementById("diceLog").style.display      = "block"
  if (isGM) maybeSpawnMapLoreBook("taverne.jpg")
  map.style.backgroundImage = "url('images/taverne.jpg')"; currentMap = "taverne.jpg"
  calculateMinZoom(); cameraZoom = minZoom; cameraX = 0; cameraY = 0; updateCamera()
  setTimeout(() => { fade.style.opacity = 0 }, 500)
  setTimeout(() => { if (mapMusic["taverne.jpg"]) crossfadeMusic(mapMusic["taverne.jpg"]) }, 800)
}

function startIntro() {
  startMenuSparks()
  stopAllMusic()
  preloadAssets()
  setGameState("INTRO")
  setTimeout(animateGameTitle, 2000)
  const start = document.getElementById("startScreen")
  start.classList.add("fadeOut")
  setTimeout(() => {
    start.style.display = "none"
    start.style.pointerEvents = "none"
    start.style.visibility = "hidden"
    showIntroLayer()
    const music = document.getElementById("music"); music.volume = 0; music.play().catch(() => {})
    let v = 0
    const fade = setInterval(() => { if (v < 0.8) { v += 0.05; music.volume = v } else clearInterval(fade) }, 200)
  }, 2000)
}

function animateGameTitle() {
  const titleEl = document.getElementById("gameTitle"); if (!titleEl) return
  titleEl.innerText = "La Prophétie des Mouches"
  titleEl.classList.remove("visible")
  setTimeout(() => titleEl.classList.add("visible"), 50)
}

function startDialogue() {
  hideIntroLayers()
  setGameState("DIALOGUE")
  index = 0
  document.getElementById("dialogueBox").style.display = "flex"
  showDialogue()
  dialogueLock = true; setTimeout(() => { dialogueLock = false }, 300)
}

function showDialogue() {
  const d = dialogue[index]
  document.getElementById("dialoguePortrait").src = d.portrait
  document.getElementById("dialogueText").innerHTML = d.text
}

document.addEventListener("click", e => {
  if (gameState !== "DIALOGUE") return
  if (e.target.tagName === "BUTTON" || e.target.closest("button")) return
  index++
  if (index < dialogue.length) showDialogue()
  else { document.getElementById("dialogueBox").style.display = "none"; showTavern() }
})

/* ========================= */
/* GM                        */
/* ========================= */

function requestGM() {
  const password = prompt("Mot de passe MJ")
  if (password && password.toLowerCase().trim() === "mouches") activateGM()
  else showNotification("Accès refusé")
}

function activateGM() {
    isGM = true
    document.getElementById("gmBar").style.display     = "flex"
    document.getElementById("mjRollBtn").style.display = "inline-block"
    document.getElementById("mjLog").style.display     = "block"
    document.getElementById("gmSaveBar").style.display = "block"
      ensureMadnessGMButton()
      updateThuumButton()
    showNotification("🎲 Mode MJ activé")
    }

function toggleGMSection(id) {
  const section = document.getElementById(id); if (!section) return
  const isOpen  = section.style.display === "block"
  document.querySelectorAll(".gmSection").forEach(sec => { sec.style.display = "none" })
  if (!isOpen) section.style.display = "block"
}

function toggleCategory(id, button) {
  const cat     = document.getElementById(id)
  if (!cat) return
  const opening = cat.style.display !== "block"

  // Trouve le panel parent (gmSection ou pnjTabContent)
  const parent = button.closest(".gmSection, .pnjTabContent")

  // Ferme tous les sous-menus du même panel parent seulement
  const scope = parent || document
  scope.querySelectorAll(".mapCategory").forEach(c => {
    if (c !== cat) {
      c.style.display = "none"
      c.style.maxHeight = ""
    }
  })
  scope.querySelectorAll(".mapCategoryButton").forEach(btn => {
    if (btn !== button) { btn.classList.remove("active"); const a = btn.querySelector(".arrow"); if (a) a.classList.remove("open") }
  })

  // Ouvre/ferme la cible avec animation
  if (opening) {
    cat.style.display = "block"
    cat.style.maxHeight = "0px"
    cat.style.overflow  = "hidden"
    cat.style.transition = "max-height 0.25s ease"
    requestAnimationFrame(() => { cat.style.maxHeight = cat.scrollHeight + "px" })
    button.classList.add("active")
    const arrow = button.querySelector(".arrow"); if (arrow) arrow.classList.add("open")
  } else {
    cat.style.transition = "max-height 0.2s ease"
    cat.style.maxHeight  = "0px"
    setTimeout(() => { cat.style.display = "none"; cat.style.maxHeight = "" }, 200)
    button.classList.remove("active")
    const arrow = button.querySelector(".arrow"); if (arrow) arrow.classList.remove("open")
  }
}

function openPNJTab(id, el) {
  if (window.event) window.event.stopPropagation()
  document.querySelectorAll(".pnjTabContent").forEach(tab => { tab.style.display = "none"; tab.classList.remove("active") })
  document.querySelectorAll(".pnjTab").forEach(tab => tab.classList.remove("active"))
  const target = document.getElementById(id)
  if (target) { target.style.display = "block"; target.classList.add("active") }
  el.classList.add("active")
}

function choosePlayer(id) {
  if (isGM) {
    myToken = document.getElementById(id); window.myToken = myToken
    selected = null; _state.tokenDragging = false; _state.tokenDragStart = null
    document.querySelectorAll(".token").forEach(t => t.classList.remove("selectedPlayer", "gmSelected"))
    if (myToken) myToken.classList.add("selectedPlayer")
    showNotification("🎭 MJ joue : " + id.toUpperCase())
    watchLocalPlayerDefeat(id)
    updateThuumButton()
    _collapsePlayerMenu(id)
    setTimeout(() => openCharacterSheet(id), 50)
    return
  }
  if (myToken) { showNotification("Personnage déjà choisi"); return }
  document.querySelectorAll(".token").forEach(t => t.classList.remove("selectedPlayer"))
  myToken = document.getElementById(id); window.myToken = myToken
  myToken.classList.add("selectedPlayer")
  showNotification("✨ Votre héros est : " + id.toUpperCase())
  watchLocalPlayerDefeat(id)
  updateThuumButton()
  watchFreePoints(id)
  // Réduire le menu en mini badge
  _collapsePlayerMenu(id)
}

function _collapsePlayerMenu(id) {
  const toggle = document.getElementById("playerToggle")
  const menu   = document.getElementById("playerMenu")
  const select = document.getElementById("playerSelect")
  if (!toggle || !select) return
  const tokenImage = "images/" + id + ".png"

  // Fermer le menu
  if (menu) { menu.classList.remove("open"); menu.style.display = "none" }
  select.classList.add("collapsed")

  // Réduire le bouton toggle — style direct, pas de classe
  toggle.style.width           = "36px"
  toggle.style.height          = "36px"
  toggle.style.fontSize        = "0px"
  toggle.style.backgroundImage = `url('${tokenImage}')`
  toggle.style.backgroundSize  = "cover"
  toggle.style.backgroundPosition = "center"
  toggle.style.background      = `url('${tokenImage}') center/cover no-repeat`
  toggle.style.boxShadow       = "0 0 0 2px #1e5a66, 0 0 0 3px #d4a835"
  toggle.innerText = ""
  toggle.title     = id.toUpperCase()

  // Repositionner en haut à droite tout petit
  select.style.top   = "8px"
  select.style.right = "8px"

  // Rouvrir le menu au clic si besoin
  toggle.onclick = () => {
    if (menu.style.display === "none") {
      menu.style.display = "block"
      menu.classList.add("open")
    } else {
      menu.classList.remove("open")
      menu.style.display = "none"
    }
  }
}

function togglePlayerMenu() {
  document.getElementById("playerMenu").classList.toggle("open")
}

/* ========================= */
/* DRAG TOKENS               */
/* ========================= */

document.querySelectorAll(".token").forEach(token => {
  token.addEventListener("contextmenu", e => {
    e.preventDefault()
    if (isGM) { openCharacterSheet(token.id); return }
    if (myToken && token.id === myToken.id) openCharacterSheet()
  })
  token.addEventListener("mousedown", e => {
    if (e.target.closest("#playerSelect") || e.target.closest("button")) return
    const now = Date.now()
    if (now - lastClickTime < 300) {
      if (isGM && token.id !== "mobToken") openCharacterSheet(token.id)
      else if (myToken && (token.id === myToken.id || token.id === "bibi")) openCharacterSheet(token.id)
    }
    lastClickTime = now
    if (isGM) {
      document.querySelectorAll(".token").forEach(t => t.classList.remove("gmSelected"))
      token.classList.add("gmSelected"); selected = token; lastX = selected.offsetLeft
      _state.tokenDragStart = { x: e.clientX, y: e.clientY }; _state.tokenDragging = false
      e.preventDefault(); return
    }
    if (token.id === "bibi") { selected = token; lastX = selected.offsetLeft; bibiMoved = true; tryBark(); e.preventDefault(); return }
    if (!myToken || token.id !== myToken.id) return
    selected = token; lastX = selected.offsetLeft; e.preventDefault()
  })
})

document.addEventListener("mousemove", e => {
  if (!selected) return
  if (_state.tokenDragStart && !_state.tokenDragging) {
    if (Math.abs(e.clientX - _state.tokenDragStart.x) < 5 && Math.abs(e.clientY - _state.tokenDragStart.y) < 5) return
    _state.tokenDragging = true
  }
  if (!isGM && (!myToken || (selected.id !== myToken.id && selected.id !== "bibi"))) return
  const map  = document.getElementById("map"); const rect = map.getBoundingClientRect()
  const gx   = Math.floor((e.clientX - rect.left) / grid) * grid
  const gy   = Math.floor((e.clientY - rect.top)  / grid) * grid
  if (gx < lastX) selected.classList.add("faceLeft")
  if (gx > lastX) selected.classList.remove("faceLeft")
  lastX = gx; selected.style.left = gx + "px"; selected.style.top = gy + "px"
  const now = Date.now()
  if (now - lastSend > sendDelay && (gx !== lastSentX || gy !== lastSentY)) {
    if (!selected._fbSlot) db.ref("tokens/" + selected.id).update({ x: gx, y: gy })
    lastSentX = gx; lastSentY = gy; lastSend = now
  }
  if (selected.id === "greg") {
    const bibi = document.getElementById("bibi")
    if (bibi) { bibi.style.left = (gx + 80) + "px"; bibi.style.top = gy + "px"; db.ref("tokens/bibi").update({ x: gx + 80, y: gy }); tryBark() }
  }
})

document.addEventListener("mouseup", () => {
  if (bibiMoved) { tryBark(); bibiMoved = false }
  _state.tokenDragging = false; _state.tokenDragStart = null; selected = null
})

/* ========================= */
/* CAMÉRA DRAG & ZOOM        */
/* ========================= */

document.addEventListener("mousedown", e => {
  if (!isGM) return
  if (e.target.closest("button") || e.target.closest("input") ||
      e.target.closest("#playerSelect") || e.target.closest("#gmBar") ||
      e.target.closest(".gmSection") || e.target.closest("#diceBar") ||
      e.target.closest("#characterSheet") || e.target.closest("#shopOverlay") ||
      e.target.closest("#spellMiniGame") || e.target.closest("#runeChallengeOverlay") ||
      e.target.closest("#mobSelectionMenu") || e.target.closest("#wantedEditor")) return
  if (e.button === 0 && !e.target.closest(".token")) {
    cameraDragging = true; cameraStartX = e.clientX - cameraX; cameraStartY = e.clientY - cameraY
    document.body.style.cursor = "grabbing"
  }
})

document.addEventListener("mousemove", e => {
  if (!cameraDragging) return
  cameraX = e.clientX - cameraStartX; cameraY = e.clientY - cameraStartY
  clampCamera(); updateCamera()
})

document.addEventListener("mouseup", () => { cameraDragging = false; document.body.style.cursor = "default" })

document.addEventListener("wheel", e => {
  if (!isGM) return
  let target = e.target
  while (target && target !== document.body) {
    const style = window.getComputedStyle(target)
    if ((style.overflowY === "auto" || style.overflowY === "scroll") && target.scrollHeight > target.clientHeight) return
    if (target.id === "gmBar" || target.classList.contains("gmSection") || target.classList.contains("mapCategory") ||
        target.classList.contains("pnjTabContent") || target.id === "diceLog" || target.id === "mjLog") return
    target = target.parentElement
  }
  e.preventDefault()
  cameraZoom = Math.max(minZoom, Math.min(2, cameraZoom + (e.deltaY < 0 ? 0.1 : -0.1)))
  updateCamera()
}, { passive: false })

document.addEventListener("contextmenu", e => { if (isGM) e.preventDefault() })

/* ========================= */
/* TOUCHES CLAVIER           */
/* ========================= */

document.addEventListener("keydown", e => {
  const key    = e.key.toLowerCase()
  const active = document.activeElement
  if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
    if (key !== "j" && key !== "b" && key !== "escape") return
    active.blur(); document.body.focus()
  }

  if (key === "escape") {
    const docOverlay = document.getElementById("documentOverlay"); if (docOverlay && isGM) { hideDocument(); return }
    const loreOverlay = document.getElementById("mapLoreBookOverlay"); if (loreOverlay) { closeMapLoreBookOverlay(); return }
    const runeOverlay = document.getElementById("runeChallengeOverlay"); if (runeOverlay) { runeOverlay.remove(); _state.runeJustOpened = false; return }
    const sheet = document.getElementById("characterSheet"); if (sheet && sheet.style.display !== "none" && sheet.style.display !== "") { closeCharacterSheet(); return }
    const shopOverlay = document.getElementById("shopOverlay"); if (shopOverlay && isGM) { closeShop(); return }
    const powersPanel = document.getElementById("playerThuumPanel"); if (powersPanel && powersPanel.style.display === "block") { closePlayerPowersPanel(); return }
    const combatHUD = document.getElementById("combatHUD"); if (combatHUD && combatHUD.style.display === "flex") { combatHUD.style.display = "none"; return }
    let anyGMOpen = false
    document.querySelectorAll(".gmSection").forEach(sec => { if (sec.style.display !== "none" && sec.style.display !== "") anyGMOpen = true })
    if (anyGMOpen) { document.querySelectorAll(".gmSection").forEach(sec => { sec.style.display = "none" }); return }
    const playerMenu = document.getElementById("playerMenu"); if (playerMenu && playerMenu.classList.contains("open")) { playerMenu.classList.remove("open"); return }
    if (isGM && closeLastPNJ()) return
    return
  }

  if (isGM) {
    if (key === "m") { toggleGMSection("mapMenu"); return }
    if (key === "r") { toggleGMSection("pnjMenu"); return }
    if (key === "p") { toggleGMSection("gmCharacters"); return }
    if (key === "x") { toggleGMSection("xpMenu"); return }
    if (key === "e") { toggleGMSection("elementsMenu"); return }
    if (key === "t") { toggleGMSection("mobMenu2"); return }
    if (key === "a" && combatActive) { openAllyPNJPanel(); return }
    if (key === "s" && !e.ctrlKey) { showSaveMenu(); return }
    if (key === "?") { toggleGMShortcutHelp(); return }
  }

  if (key === "b") {
    const sheet = document.getElementById("characterSheet")
    if (sheet && sheet.style.display === "block") closeCharacterSheet()
    else openCharacterSheet("bibi")
    return
  }

  if (key === "j") {
    const sheet = document.getElementById("characterSheet")
    if (sheet && sheet.style.display === "block") { closeCharacterSheet(); return }
    if (isGM) {
      if (selected) openCharacterSheet(selected.id)
      else if (currentSheetPlayer) openCharacterSheet(currentSheetPlayer)
      else openCharacterSheet("greg")
      return
    }
    if (myToken) { openCharacterSheet(); return }
    showNotification("Choisissez un personnage 🎭")
  }
})
