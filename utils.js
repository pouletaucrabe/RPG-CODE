"use strict"

/* ========================= */
/* NOTIFICATIONS             */
/* ========================= */

function showNotification(text) {
  const box = document.getElementById("notification")
  box.innerText = text
  box.style.opacity = 1
  setTimeout(() => { box.style.opacity = 0 }, 3000)
}

function addMJLog(text) {
  const log = document.getElementById("mjLogContent")
  if (!log) return
  const entry = document.createElement("div")
  entry.className = "mjEntry"
  entry.innerText = text
  log.prepend(entry)
}

function addDiceLog(player, dice, result) {
  const log = document.getElementById("diceLog")
  if (!log) return
  const entry = document.createElement("div")
  entry.classList.add("logEntry")
  if (player === "MJ") entry.classList.add("logMJ")
  let text = player + " → 🎲 d" + dice + " → " + result
  if (result === dice) { text += " ✨"; entry.classList.add("logCrit") }
  if (result === 1)    { text += " ☠";  entry.classList.add("logFail") }
  entry.innerText = text
  log.prepend(entry)
  addMJLog(text)
  if (log.children.length > 20) log.removeChild(log.lastChild)
}

function showXPMessage(amount) {
  const msg = document.createElement("div")
  msg.innerText = "✨ +" + amount + " XP pour le groupe ✨"
  msg.style.cssText = "position:fixed;left:50%;top:55%;transform:translate(-50%,0);font-family:Cinzel;font-size:40px;color:gold;text-shadow:0 0 10px gold,0 0 20px orange,0 0 40px gold;pointer-events:none;z-index:999999999;opacity:0;transition:all 1s ease;"
  document.body.appendChild(msg)
  setTimeout(() => { msg.style.opacity = "1"; msg.style.transform = "translate(-50%,-40px)" }, 50)
  setTimeout(() => { msg.style.opacity = "0"; msg.style.transform = "translate(-50%,-120px)" }, 2500)
  setTimeout(() => msg.remove(), 3500)
}

function typeWriter(text, element, speed = 60) {
  element.innerHTML = ""
  let i = 0
  function type() {
    if (i < text.length) { element.innerHTML += text.charAt(i); i++; setTimeout(type, speed) }
  }
  type()
}

/* ========================= */
/* EFFETS VISUELS            */
/* ========================= */

function screenShake() {
  const wrapper = document.getElementById("camera")
  if (!wrapper) return
  const intensity = 8, duration = 400, start = Date.now()
  function shake() {
    if (Date.now() - start < duration) {
      const x = (Math.random() - 0.5) * intensity
      const y = (Math.random() - 0.5) * intensity
      wrapper.style.transform = `scale(${cameraZoom}) translate(${cameraX + x}px, ${cameraY + y}px)`
      requestAnimationFrame(shake)
    } else { updateCamera() }
  }
  shake()
}

function screenShakeHard() {
  const camera = document.getElementById("camera")
  if (!camera) return
  let i = 0
  const interval = setInterval(() => {
    camera.style.transform = `scale(${cameraZoom * 1.01}) translate(${cameraX + (Math.random() * 20 - 10)}px, ${cameraY + (Math.random() * 20 - 10)}px)`
    if (++i > 25) { clearInterval(interval); updateCamera() }
  }, 40)
}

function flashGold() {
  const flash = document.createElement("div")
  flash.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:gold;opacity:0.4;pointer-events:none;z-index:4000;"
  document.body.appendChild(flash)
  setTimeout(() => flash.remove(), 150)
}

function flashRed() {
  const flash = document.createElement("div")
  flash.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:red;opacity:0.4;pointer-events:none;z-index:8000;"
  document.body.appendChild(flash)
  setTimeout(() => flash.remove(), 200)
}

function powerExplosion() {
  const exp = document.createElement("div")
  exp.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:400px;height:400px;background:radial-gradient(circle,gold 0%,rgba(255,215,0,0.8) 30%,rgba(255,215,0,0.2) 60%,transparent 80%);border-radius:50%;pointer-events:none;z-index:9000;animation:explodePower 0.8s ease-out;"
  document.body.appendChild(exp)
  setTimeout(() => exp.remove(), 800)
}

function damageEffect(id) {
  const token = document.getElementById(id)
  if (!token) return
  token.classList.add("damageFlash")
  setTimeout(() => token.classList.remove("damageFlash"), 400)
}

function updateTokenGlow(id, hp) {
  const token = document.getElementById(id)
  if (!token) return
  token.classList.remove("lowHP", "midHP", "fullHP")
  if (hp > 60)      token.classList.add("fullHP")
  else if (hp > 30) token.classList.add("midHP")
  else              token.classList.add("lowHP")
}

function spawnPortal(tokenID) {
  const token = document.getElementById(tokenID)
  if (!token) return
  const portal = document.createElement("div")
  portal.className = "portalEffect"
  token.appendChild(portal)
  setTimeout(() => portal.remove(), 1500)
}

function spawnVictoryParticles() {
  const box = document.getElementById("storyImage")
  if (!box) return
  for (let i = 0; i < 25; i++) {
    const p = document.createElement("div")
    p.className = "victoryParticle"
    p.style.left = (40 + Math.random() * 20) + "%"
    p.style.top  = (50 + Math.random() * 10) + "%"
    p.style.animationDuration = (1 + Math.random() * 1.5) + "s"
    box.appendChild(p)
    setTimeout(() => p.remove(), 1500)
  }
}

function spawnParticles() {
  const container = document.getElementById("locationParticles")
  for (let i = 0; i < 20; i++) {
    const p = document.createElement("div")
    p.className = "particle"
    p.style.left = Math.random() * 100 + "%"
    p.style.bottom = "0px"
    p.style.animationDuration = (2 + Math.random() * 2) + "s"
    container.appendChild(p)
    setTimeout(() => p.remove(), 4000)
  }
}

function showLevelUpEffect(playerID) {
  const token = document.getElementById(playerID)
  if (!token) return
  const container = document.createElement("div")
  container.className = "levelUpContainer"
  const beam = document.createElement("div")
  beam.className = "levelBeam"
  container.appendChild(beam)
  for (let i = 0; i < 20; i++) {
    const p = document.createElement("div")
    p.className = "levelParticle"
    p.style.left = (Math.random() * 140 - 70) + "px"
    p.style.bottom = "0px"
    p.style.animationDuration = (1 + Math.random()) + "s"
    container.appendChild(p)
  }
  token.appendChild(container)
  setTimeout(() => container.remove(), 2000)
}

function showLevelUpText(player) {
  const msg = document.createElement("div")
  msg.innerText = "⭐ LEVEL UP ⭐"
  msg.style.cssText = "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%) scale(0.5);font-family:Cinzel;font-size:80px;color:gold;text-shadow:0 0 10px gold,0 0 30px orange,0 0 60px gold;pointer-events:none;z-index:999999999;opacity:0;transition:all 0.6s ease;"
  document.body.appendChild(msg)
  setTimeout(() => { msg.style.opacity = "1"; msg.style.transform = "translate(-50%,-50%) scale(1.2)" }, 50)
  setTimeout(() => { msg.style.opacity = "0"; msg.style.transform = "translate(-50%,-50%) scale(1.8)" }, 2000)
  setTimeout(() => msg.remove(), 3000)
}

function shadeColor(color, percent) {
  const num = parseInt(color.replace("#", ""), 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + percent))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent))
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent))
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

/* ========================= */
/* CAMÉRA                    */
/* ========================= */

function calculateMinZoom() {
  const map = document.getElementById("map")
  const zoomX = window.innerWidth  / map.offsetWidth
  const zoomY = window.innerHeight / map.offsetHeight
  minZoom = Math.max(zoomX, zoomY)
}

function clampCamera() {
  const map  = document.getElementById("map")
  const mapW = map.offsetWidth  * cameraZoom
  const mapH = map.offsetHeight * cameraZoom
  const minX = window.innerWidth  - mapW
  const minY = window.innerHeight - mapH
  if (cameraX > 0)    cameraX = 0
  if (cameraY > 0)    cameraY = 0
  if (cameraX < minX) cameraX = minX
  if (cameraY < minY) cameraY = minY
}

function updateCamera() {
  clampCamera()
  document.getElementById("camera").style.transform = `scale(${cameraZoom}) translate(${cameraX}px, ${cameraY}px)`
}

/* ========================= */
/* AUDIO                     */
/* ========================= */

function crossfadeMusic(newMusic) {
  if (auroraActive && newMusic !== "aurore.mp3") return

  const musicA = document.getElementById("musicA")
  const musicB = document.getElementById("musicB")
  if (!musicA || !musicB) return

  const active    = currentMusic === "A" ? musicA : musicB
  const activeSrc = active.src ? decodeURIComponent(active.src.replace(/.*\//, "").replace(/%20/g," ")) : ""
  const newSrc    = newMusic.replace(/.*\//, "").replace(/%20/g," ")

  // Même musique déjà en cours — ne pas interrompre
  if (activeSrc === newSrc && !active.paused && active.volume > 0.3) return

  // Annuler toute transition en cours
  if (musicFadeInterval) { clearInterval(musicFadeInterval); musicFadeInterval = null }
  _musicTransitioning = false
  _pendingMusic = null
  const mA = document.getElementById("musicA")
  const mB = document.getElementById("musicB")
  if (mA && mA !== active) { mA.pause(); mA.volume = 0 }
  if (mB && mB !== active) { mB.pause(); mB.volume = 0 }
  _musicTransitioning = true

  const next = currentMusic === "A" ? musicB : musicA
  next.pause(); next.volume = 0

  const fadeOutIv = setInterval(() => {
    if (active.volume > 0.06) {
      active.volume = Math.max(0, active.volume - 0.1)
    } else {
      active.pause(); active.volume = 0
      clearInterval(fadeOutIv)
      next.src = newMusic
      next.loop = false  // On gère la boucle manuellement pour le fade
      next.volume = 0; next.currentTime = 0
      next.play().catch(() => {})

      // Boucle avec fade — quand le son approche de la fin, on fade out/in
      next.onended = null
      next._loopFadeSetup = true
      next.addEventListener("timeupdate", function _loopFade() {
        if (!next._loopFadeSetup) { next.removeEventListener("timeupdate", _loopFade); return }
        if (next.duration && next.currentTime > next.duration - 3 && !next._fading) {
          next._fading = true
          // Fade out progressif sur les 3 dernières secondes
          const fadeIv = setInterval(() => {
            if (next.volume > 0.05) {
              next.volume = Math.max(0, next.volume - 0.04)
            } else {
              clearInterval(fadeIv)
              next.currentTime = 0; next.volume = 0
              next._fading = false
              next.play().catch(() => {})
              // Fade in
              const fi = setInterval(() => {
                if (next.volume < 0.8) next.volume = Math.min(0.8, next.volume + 0.05)
                else clearInterval(fi)
              }, 100)
            }
          }, 80)
        }
      })

      musicFadeInterval = setInterval(() => {
        if (next.volume < 0.8) {
          next.volume = Math.min(0.8, next.volume + 0.05)
        } else {
          clearInterval(musicFadeInterval); musicFadeInterval = null
          currentMusic = currentMusic === "A" ? "B" : "A"
          _musicTransitioning = false
          if (_pendingMusic) { const pm = _pendingMusic; _pendingMusic = null; crossfadeMusic(pm) }
        }
      }, 150)
    }
  }, 60)
}

function stopAllMusic() {
  if (musicFadeInterval) { clearInterval(musicFadeInterval); musicFadeInterval = null }
  const mA = document.getElementById("musicA")
  const mB = document.getElementById("musicB")
  if (mA) { mA.pause(); mA.volume = 0 }
  if (mB) { mB.pause(); mB.volume = 0 }
  // Couper aussi les musiques spéciales hors système
  ;["sortPrisonMusic", "auroraMusic", "forsureMusic"].forEach(id => {
    const el = document.getElementById(id)
    if (el && !el.paused) { el.pause(); el.volume = 0 }
  })
  _musicTransitioning = false
  _pendingMusic = null
  currentMusic = "A"
}

function stopSpecialMusic(id) {
  const el = document.getElementById(id)
  if (!el) return
  if (el.paused) return
  const iv = setInterval(() => {
    if (el.volume > 0.04) el.volume = Math.max(0, el.volume - 0.04)
    else { el.pause(); el.volume = 0; clearInterval(iv) }
  }, 80)
}

function fadeMusicOut(callback) {
  const mA = document.getElementById("musicA")
  const mB = document.getElementById("musicB")
  let done = 0
  function fadeOne(m) {
    if (!m) { done++; if (done === 2 && callback) callback(); return }
    const iv = setInterval(() => {
      if (m.volume > 0.05) m.volume -= 0.05
      else { m.pause(); m.volume = 0; clearInterval(iv); done++; if (done === 2 && callback) callback() }
    }, 150)
  }
  fadeOne(mA); fadeOne(mB)
}

function playSound(id, volume = 0.8) {
  const snd = document.getElementById(id)
  if (!snd) return
  snd.currentTime = 0
  snd.volume = volume
  snd.play().catch(() => {})
}

/* ========================= */
/* SANG / MALÉDICTION        */
/* ========================= */

function startBloodEffect(token) {
  if (!token || bloodIntervals[token.id]) return
  bloodIntervals[token.id] = setInterval(() => {
    if (!token.classList.contains("cursed")) { stopBloodEffect(token); return }
    spawnBloodDrop(token)
  }, 400 + Math.random() * 300)
}

function stopBloodEffect(token) {
  if (!token) return
  if (bloodIntervals[token.id]) { clearInterval(bloodIntervals[token.id]); delete bloodIntervals[token.id] }
  token.querySelectorAll(".bloodDrop, .bloodTrail").forEach(el => el.remove())
}

function spawnBloodDrop(token) {
  const angle  = (Math.random() * 180) + 10
  const rad    = angle * Math.PI / 180
  const radius = 36
  const cx     = 50 + Math.cos(rad) * radius
  const cy     = 50 + Math.sin(rad) * radius

  const trail = document.createElement("div")
  trail.className = "bloodTrail"
  trail.style.left = cx + "%"; trail.style.top = cy + "%"
  trail.style.height = (4 + Math.random() * 8) + "px"
  trail.style.width  = (2 + Math.random() * 2) + "px"
  trail.style.animationDuration = (1.5 + Math.random()) + "s"
  token.appendChild(trail)

  const drop = document.createElement("div")
  drop.className = "bloodDrop"
  drop.style.left  = (cx - 1.5) + "%"; drop.style.top = cy + "%"
  drop.style.width = (3 + Math.random() * 3) + "px"
  drop.style.animationDuration = (1.2 + Math.random() * 0.8) + "s"
  token.appendChild(drop)

  const dur = parseFloat(drop.style.animationDuration) * 1000
  setTimeout(() => { drop.remove(); trail.remove() }, dur + 100)
}

/* ========================= */
/* BIBI                      */
/* ========================= */

function tryBark() {
  const now = Date.now()
  if (now - lastBarkTime < barkCooldown) return
  if (Math.floor(Math.random() * 10) !== 0) return
  lastBarkTime = now
  const bark = document.getElementById("bark")
  if (bark) { bark.currentTime = 0; bark.volume = 0.35; bark.play().catch(() => {}) }
  const barks = ["Wouf !", "Rrr !", "Snif !", "Miii !"]
  showBibiSpeech(barks[Math.floor(Math.random() * barks.length)])
}

function showBibiSpeech(text) {
  addMJLog("🐶 Bibi : " + text)
  const bibi = document.getElementById("bibi")
  if (!bibi) return
  const bubble = document.createElement("div")
  bubble.className = "speechBubble"
  bubble.innerText = text
  bibi.appendChild(bubble)
  setTimeout(() => bubble.remove(), 3000)
}

/* ========================= */
/* DRAG UTILITAIRE           */
/* ========================= */

function makeDraggable(element) {
  let isDragging = false, offsetX = 0, offsetY = 0
  element.addEventListener("mousedown", e => {
    isDragging = true
    offsetX = e.clientX - element.offsetLeft
    offsetY = e.clientY - element.offsetTop
    element.style.position = "fixed"
    element.style.zIndex   = 9999999
  })
  document.addEventListener("mousemove", e => {
    if (!isDragging) return
    element.style.left = (e.clientX - offsetX) + "px"
    element.style.top  = (e.clientY - offsetY) + "px"
  })
  document.addEventListener("mouseup", () => { isDragging = false })
}

/* ========================= */
/* MENU ÉTINCELLES           */
/* ========================= */

let menuSparkInterval = null

function spawnMenuSparks() {
  const count = 3 + Math.floor(Math.random() * 3)
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const spark = document.createElement("div")
      spark.className = "menuSpark"
      spark.style.left = (Math.random() * 96) + "%"
      spark.style.top  = (Math.random() * 96) + "%"
      spark.style.animationDuration = (0.8 + Math.random() * 0.7) + "s"
      const angle = Math.random() * Math.PI * 2
      spark.style.setProperty("--dx", Math.cos(angle).toFixed(2))
      spark.style.setProperty("--dy", Math.sin(angle).toFixed(2))
      const size = (3 + Math.random() * 5).toFixed(1) + "px"
      spark.style.width = size; spark.style.height = size
      const colors = ["gold","#fff8c0","#ffd700","#ffcc44","#ffe88a","white","#ffaa00"]
      const c = colors[Math.floor(Math.random() * colors.length)]
      spark.style.background = c
      spark.style.boxShadow  = "0 0 6px " + c + ", 0 0 12px gold, 0 0 20px orange"
      document.body.appendChild(spark)
      setTimeout(() => spark.remove(), 1500)
    }, i * 120)
  }
}

function startMenuSparks() {
  if (menuSparkInterval) clearInterval(menuSparkInterval)
  menuSparkInterval = setInterval(spawnMenuSparks, 350)
}

function stopMenuSparks() {
  if (menuSparkInterval) { clearInterval(menuSparkInterval); menuSparkInterval = null }
  document.querySelectorAll(".menuSpark").forEach(s => s.remove())
}

/* ========================= */
/* BANDEROLE LIEU            */
/* ========================= */

function showLocation(name) {
  const banner = document.getElementById("locationBanner")
  const paper  = document.getElementById("locationPaper")
  const text   = document.getElementById("locationText")
  const sound  = document.getElementById("parcheminSound")
  if (!banner || !paper || !text) return

  banner.style.display = "flex"
  banner.classList.add("visible")
  banner.style.opacity = "1"
  paper.style.width    = "540px"; paper.style.height    = "360px"
  paper.style.minWidth = "540px"; paper.style.minHeight = "360px"
  paper.classList.remove("open"); text.classList.remove("show"); text.innerHTML = ""

  spawnParticles()
  if (sound) { sound.currentTime = 0; sound.play().catch(() => {}) }
  setTimeout(() => paper.classList.add("open"), 200)
  setTimeout(() => { text.classList.add("show"); typeWriter(name, text, 70) }, 800)
  setTimeout(() => {
    banner.style.opacity = "0"
    setTimeout(() => { banner.style.display = "none"; banner.classList.remove("visible") }, 1000)
    paper.classList.remove("open")
  }, 5000)
}

/* ========================= */
/* CHARGEMENT ASSETS         */
/* ========================= */

function preloadAssets() {
  Object.keys(mapMusic).forEach(map => { const img = new Image(); img.src = "" + map })
  Object.values(mapMusic).forEach(aud => { const a = new Audio(); a.src = aud })
}

function scanAssets() {
  const images = Object.keys(mapMusic).concat([
    "greg.png","ju.png","elo.png","bibi.png",
    "gregsheet.jpg","yusheet.jpg","elosheet.jpg","bibisheet.jpg",
    "paper.png","paper1.png"
  ])
  images.forEach(img => {
    const test = new Image()
    test.onerror = () => console.warn("❌ IMAGE MANQUANTE → " + img)
    test.src = "" + img
  })
}

/* ========================= */
/* VOLUME SLIDER             */
/* ========================= */

document.addEventListener("DOMContentLoaded", () => {
  const slider = document.getElementById("volumeSlider")
  if (slider) {
    slider.addEventListener("input", () => {
      const volume = parseFloat(slider.value)
      document.querySelectorAll("audio").forEach(s => { s.volume = volume })
    })
  }

  // Fiche — scroll sans interférence caméra
  const sheet = document.getElementById("characterSheet")
  if (sheet) {
    sheet.addEventListener("wheel",     e => e.stopPropagation(), { passive: true })
    sheet.addEventListener("touchmove", e => e.stopPropagation(), { passive: true })
  }

  // Fiche — autosave sur changement
  document.querySelectorAll(".sheetField").forEach(field => {
    field.addEventListener("input", () => { autoSaveCharacter(); updateWeightBar() })
  })

  // Stats combat — autosave
  document.querySelectorAll("#playerCombatPanel input").forEach(field => {
    field.addEventListener("input", () => saveCombatStats())
  })

  // Dégâts mob — Entrée pour appliquer
  const input = document.getElementById("mobDamageInput")
  if (input) {
    input.addEventListener("keydown", e => {
      if (e.key !== "Enter") return
      const damage = parseInt(input.value)
      if (isNaN(damage) || damage <= 0) return
      db.ref("combat/mob").once("value", snapshot => {
        const mob = snapshot.val(); if (!mob) return
        db.ref("combat/mob/hp").set(Math.max(0, mob.hp - damage))
      })
      input.value = ""
    })
  }

  // Focus body pour keydown
  document.addEventListener("click", e => {
    if (e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") document.body.focus()
  })
  document.addEventListener("mouseup", e => {
    if (e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
      setTimeout(() => document.body.focus(), 0)
    }
  })
})