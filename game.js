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

/* ========================= */
/* FIREBASE LISTENERS        */
/* UN SEUL par chemin        */
/* Initialisés après chargement complet (ui.js + combat.js disponibles) */
/* ========================= */

document.addEventListener("DOMContentLoaded", () => {

// Masquer les PNJ immédiatement au chargement
;["storyImage","storyImage2","storyImage3"].forEach(id => {
  const el = document.getElementById(id)
  if (el) { el.style.display = "none"; el.style.opacity = "0" }
})

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
  if (nameEl) nameEl.innerText = data.name.toUpperCase()
  const hpText = document.getElementById("mobHPText")
  if (hpText) hpText.innerText = data.hp + " / " + data.maxHP

  if (isGM) {
    hud.style.display = "block"
    if (lastMobHP !== null && data.hp < lastMobHP) { flashRed(); screenShake() }
    if (data.hp <= 0 && combatActive) { endCombat(); showVictory() }
    lastMobHP = data.hp
  } else {
    // Côté joueur — activer le HUD et le bouton invocations au début du combat
    if (!combatActive && data && data.hp > 0) {
      combatActive = true
      activeMobSlots["mob"] = true
      setTimeout(() => {
        showCombatHUD()
        loadPlayerCombatStats()
        renderAllMobPanels()
        const allyBtn = document.getElementById("playerAllyBtn")
        if (allyBtn && myToken) allyBtn.style.display = "flex"
      }, 500)
    }
    if (data.hp <= 0 && combatActive) endCombat()
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
    img2.src = "images/" + image
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
    img3.src = "images/" + image
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

  const isFirst = firstMapLoad
  if (isFirst) firstMapLoad = false
  currentMap = mapName
  setTimeout(() => updateBifrostBtn(), 100)

  fade.style.transition = "opacity 0.8s ease"; fade.style.opacity = 1; fade.style.pointerEvents = "none"

  setTimeout(() => {
    map.style.backgroundImage = "url('images/" + mapName + "')"
    if (mapName === "MAPMONDE.jpg") { map.style.backgroundSize = "contain"; map.style.backgroundColor = "#0a0a1a" }
    else                            { map.style.backgroundSize = "cover";   map.style.backgroundColor = "" }
    if (isFirst) { calculateMinZoom(); cameraZoom = minZoom; updateCamera() }
    document.querySelectorAll(".token").forEach(t => spawnPortal(t.id))
    if (mapMusic[mapName] && !_state._pendingMapAudio) {
      _musicTransitioning = false; _pendingMusic = null
      if (musicFadeInterval) { clearInterval(musicFadeInterval); musicFadeInterval = null }
      stopAllMusic()
      setTimeout(() => crossfadeMusic("audio/" + mapMusic[mapName]), 200)
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

// ─── shop ───
db.ref("game/shop").on("value", snap => {
  const data = snap.val()
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
  if (!data || !data.active) return
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
  const snd = new Audio(pInfo.file)
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
  if (!data) return
  if (data.state === "intro")  showCurseIntro(data.player)
  if (data.state === "wheel")  showCurseWheelScreen(data.player)
  if (data.state === "result") showCurseResult(data.player, data.result)
})

// ─── runeChallenge ───
db.ref("game/runeChallenge").on("value", snap => {
  const data = snap.val()
  if (!data || !data.active) {
    const overlay = document.getElementById("runeChallengeOverlay")
    if (overlay) overlay.remove()
    updateRuneMenuBtn(false)
    return
  }
  if (gameState !== "GAME" && gameState !== "COMBAT") return
  updateRuneMenuBtn(true)
  const overlay = document.getElementById("runeChallengeOverlay")
  if (overlay) { overlay.remove(); renderRuneChallenge(data) }
  if (isGM && !_state.runeJustOpened) { _state.runeJustOpened = true; renderRuneChallenge(data) }
})

// ─── cemeterySpell ───
db.ref("game/cemeterySpell").on("value", snap => {
  const data = snap.val()
  if (!data || gameState !== "GAME") return
  if (data.active && !data.glipheShown && !isGM) {
    if (!document.getElementById("glipheOverlay")) {
      const g = document.createElement("div"); g.id = "glipheOverlay"
      g.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;z-index:99999990;opacity:0;transition:opacity 1s ease;"
      const im = document.createElement("img"); im.src = "images/gliphe.png"; im.style.cssText = "max-height:70vh;max-width:70vw;object-fit:contain;filter:drop-shadow(0 0 30px purple);"
      g.appendChild(im); document.body.appendChild(g)
      const s2 = new Audio("audio/spell.mp3"); s2.volume = 0.9; s2.play().catch(() => {})
      setTimeout(() => { g.style.opacity = "1" }, 50)
      setTimeout(() => startSpellAura(), 1000)
    }
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
    db.ref("game/cemeterySpell").remove()
    return
  }
  if (data.glipheShown && !data.freed) renderSpellDiceGame(data)
})

// ─── playerDeath ───
db.ref("game/playerDeath").on("value", snap => {
  const data = snap.val()
  if (!data) return
  const pid = data.player
  const tok = document.getElementById(pid)
  if (!tok) return
  deadPlayers[pid] = true
  tok.classList.add("playerDead")
  if (!document.getElementById("skull_" + pid)) {
    const skull = document.createElement("div"); skull.id = "skull_" + pid
    skull.style.cssText = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:36px;z-index:10;animation:skullFloat 2s ease-in-out infinite alternate;"
    skull.innerText = "💀"; tok.appendChild(skull)
  }
  showNotification("💀 " + pid.toUpperCase() + " est tombé !")
  const snd = new Audio("audio/defaite.mp3"); snd.volume = 0.6; snd.play().catch(() => {})
  screenShakeHard()
  if (isGM) {
    if (!document.getElementById("revive_" + pid)) {
      const revBtn = document.createElement("button"); revBtn.id = "revive_" + pid
      revBtn.style.cssText = "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:99999;padding:10px 24px;font-family:'Cinzel Decorative',serif;font-size:13px;background:linear-gradient(rgba(0,80,0,0.8),rgba(0,40,0,0.8));color:#88ff88;border:2px solid rgba(50,180,50,0.6);border-radius:6px;cursor:pointer;letter-spacing:2px;animation:bifrostPulse 1.5s ease-in-out infinite alternate;"
      revBtn.innerText = "✦ Ressusciter " + pid.toUpperCase()
      revBtn.onclick = () => { revivePlayer(pid); revBtn.remove() }
      document.body.appendChild(revBtn)
    }
  }
  db.ref("game/playerDeath").remove()
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

// ─── allyPanelOpen — panel invocations visible par tous ───
db.ref("game/allyPanelOpen").on("value", snap => {
  if (!snap.val() || isGM) return
  // Ouvrir la vue lecture seule chez les joueurs
  const existing = document.getElementById("allyViewerPanel")
  if (snap.val()) {
    if (!existing) openAllyPNJViewer()
  } else {
    if (existing) existing.remove()
  }
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
      crossfadeMusic("audio/" + data.file + ".mp3")
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
    "game/storyImage",
    "game/storyImage2",
    "game/storyImage3",
    "events/aurora"
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
  if (data.game?.storyImage)    ops.push(db.ref("game/storyImage").set(data.game.storyImage))
  else                          ops.push(db.ref("game/storyImage").remove())
  if (data.game?.storyImage2)   ops.push(db.ref("game/storyImage2").set(data.game.storyImage2))
  else                          ops.push(db.ref("game/storyImage2").remove())
  if (data.game?.storyImage3)   ops.push(db.ref("game/storyImage3").set(data.game.storyImage3))
  else                          ops.push(db.ref("game/storyImage3").remove())
  if (data.events?.aurora)      ops.push(db.ref("events/aurora").set(data.events.aurora))
  else                          ops.push(db.ref("events/aurora").remove())

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
  _applyLoadData(data, () => showNotification("✅ Partie chargée"))
}

function loadSave(saveName) {
  const saves = JSON.parse(localStorage.getItem("rpg_saves") || "{}")
  const data  = saves[saveName]
  if (!data) { showNotification("Sauvegarde introuvable"); return }
  _applyLoadData(data, () => {
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
      setTimeout(() => {
        db.ref("game/runeChallenge").once("value", snap => {
          const d = snap.val()
          if (d && d.active && !document.getElementById("playerCodeBtn")) {
            const btn = document.createElement("button"); btn.id = "playerCodeBtn"
            btn.innerText = "ᚱ Runes"
            btn.style.cssText = "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);padding:12px 30px;font-family:'Cinzel',serif;font-size:16px;letter-spacing:3px;background:linear-gradient(#5a3800,#2a1800)!important;color:#c8a050!important;border:2px solid #c8a050!important;border-radius:8px;cursor:pointer;z-index:99999990;white-space:nowrap;animation:powerBtnPulse 2s ease-in-out infinite alternate;"
            btn.onclick = () => { db.ref("game/runeChallenge").once("value", s => { const fd = s.val(); if (fd) toggleRuneOverlay(fd) }) }
            document.body.appendChild(btn)
          }
        })
      }, 500)
      break
    case "COMBAT":
      break
  }
}

function startGame() {
  db.ref("combat/mob").remove(); db.ref("elements").remove(); db.ref("game/shop").remove()
  db.ref("game/highPNJName").remove(); db.ref("game/runeChallenge").remove()
  db.ref("game/cemeterySpell").remove()
  cemeteryEventDone = false
  stopMenuSparks()
  const titleEl = document.getElementById("gameTitle")
  if (titleEl) { titleEl.classList.remove("visible"); titleEl.innerText = "" }
  document.body.focus()
  if (gameStarted) return
  gameStarted = true
  document.getElementById("intro").style.display = "none"
  setGameState(GAME_STATE.INTRO)
  const fade = document.getElementById("fadeScreen"); fade.style.opacity = 1
  const music = document.getElementById("music"); if (music) { music.pause(); music.currentTime = 0 }
  db.ref("game/map").once("value", snapshot => {
    const mapName = snapshot.val(); if (!mapName) return
    const map = document.getElementById("map")
    map.style.backgroundImage = "url('images/" + mapName + "')"
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
  setGameState("GAME")
  const fade = document.getElementById("fadeScreen"); const map = document.getElementById("map")
  fadeOut()
  document.getElementById("camera").style.display      = "block"
  document.getElementById("playerSelect").style.display = "block"
  document.getElementById("diceBar").style.display      = "flex"
  document.getElementById("diceLog").style.display      = "block"
  map.style.backgroundImage = "url('images/taverne.jpg')"; currentMap = "taverne.jpg"
  calculateMinZoom(); cameraZoom = minZoom; cameraX = 0; cameraY = 0; updateCamera()
  setTimeout(() => { fade.style.opacity = 0 }, 500)
  setTimeout(() => { if (mapMusic["taverne.jpg"]) crossfadeMusic("audio/" + mapMusic["taverne.jpg"]) }, 800)
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
    document.getElementById("intro").style.display = "flex"
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
    setTimeout(() => openCharacterSheet(id), 50)
    return
  }
  if (myToken) { showNotification("Personnage déjà choisi"); return }
  document.querySelectorAll(".token").forEach(t => t.classList.remove("selectedPlayer"))
  myToken = document.getElementById(id); window.myToken = myToken
  myToken.classList.add("selectedPlayer")
  showNotification("✨ Votre héros est : " + id.toUpperCase())
  watchFreePoints(id)
  // Réduire le menu en mini badge
  _collapsePlayerMenu(id)
}

function _collapsePlayerMenu(id) {
  const toggle = document.getElementById("playerToggle")
  const menu   = document.getElementById("playerMenu")
  const select = document.getElementById("playerSelect")
  if (!toggle || !select) return

  // Fermer le menu
  if (menu) { menu.classList.remove("open"); menu.style.display = "none" }

  // Réduire le bouton toggle — style direct, pas de classe
  toggle.style.width           = "36px"
  toggle.style.height          = "36px"
  toggle.style.fontSize        = "0px"
  toggle.style.backgroundImage = `url('images/${id}.png')`
  toggle.style.backgroundSize  = "cover"
  toggle.style.backgroundPosition = "center"
  toggle.style.background      = `url('images/${id}.png') center/cover no-repeat`
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
    const docOverlay = document.getElementById("documentOverlay"); if (docOverlay) { hideDocument(); return }
    const runeOverlay = document.getElementById("runeChallengeOverlay"); if (runeOverlay) { runeOverlay.remove(); return }
    const sheet = document.getElementById("characterSheet"); if (sheet && sheet.style.display !== "none" && sheet.style.display !== "") { closeCharacterSheet(); return }
    const shopOverlay = document.getElementById("shopOverlay"); if (shopOverlay) { closeShop(); return }
    const combatHUD = document.getElementById("combatHUD"); if (combatHUD && combatHUD.style.display === "flex") { combatHUD.style.display = "none"; return }
    let anyGMOpen = false
    document.querySelectorAll(".gmSection").forEach(sec => { if (sec.style.display !== "none" && sec.style.display !== "") anyGMOpen = true })
    if (anyGMOpen) { document.querySelectorAll(".gmSection").forEach(sec => { sec.style.display = "none" }); return }
    const playerMenu = document.getElementById("playerMenu"); if (playerMenu && playerMenu.classList.contains("open")) { playerMenu.classList.remove("open"); return }
    if (closeLastPNJ()) return
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