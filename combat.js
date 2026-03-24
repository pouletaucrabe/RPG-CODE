"use strict"

window.__combatOutcomeShowing = false
window.__pendingLocalDefeat = false

/* ========================= */
/* DÉMARRAGE COMBAT          */
/* ========================= */

function _getCombatArenaMap(mob, tier) {
  if (mob === "kraken") return "tourbillon.jpg"
  return tier === "boss" ? "arenefinal.jpg" : "arene.jpg"
}

function _syncCombatStart(mainMob, tier, extraMobs) {
  return db.ref("game/combatState").set({
    active: true,
    mainMob,
    tier,
    extraMobs: extraMobs || [],
    returnMap: currentMap || "taverne.jpg",
    time: Date.now()
  })
}

function _syncCombatEnd() {
  return db.ref("game/combatState").remove()
}

function startCombat(mob, forceTier) {
  if (combatStarting || !isGM) return
  // Balraug uniquement sur sa map
  if (mob === "balraug" && currentMap !== "balraug.jpg") {
    showNotification("⚠ Balraug ne peut être invoqué que dans sa map !")
    return
  }
  // Kraken uniquement sur le Maelstrom
  if (mob === "kraken" && currentMap !== "tourbillon.jpg") {
    showNotification("⚠ Le Kraken ne peut être invoqué que sur le Maelstrom !")
    return
  }
  combatActive = false
  showMobSelectionMenu(mob, forceTier)
}

function showMobSelectionMenu(mainMob, forceTier) {
  _state.pendingMob  = mainMob
  _state.pendingTier = forceTier
  const menu = document.getElementById("mobSelectionMenu")
  if (!menu) return
  ;["mobSlot2Select","mobSlot3Select"].forEach(id => {
    const el = document.getElementById(id)
    if (el) { el.innerText = "— Aucun —"; el.dataset.value = "" }
  })
  ;["mobDropdown_slot2","mobDropdown_slot3"].forEach(id => {
    const dd = document.getElementById(id)
    if (dd) { dd.style.display = "none"; dd.innerHTML = ""; delete dd.dataset.built }
  })
  const sub = document.getElementById("mobMenuSub")
  if (sub) sub.innerText = "Mob principal : " + mainMob.toUpperCase()
  menu.style.display = "flex"
  menu.style.setProperty("background-color", "rgb(8,0,0)", "important")
  setTimeout(() => updateMobPreview(), 50)

  const canvas = document.getElementById("mobMenuBg")
  if (canvas) {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight
    const ctx  = canvas.getContext("2d")
    const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, canvas.width*0.7)
    grad.addColorStop(0, "rgb(60,5,5)"); grad.addColorStop(1, "rgb(5,0,0)")
    ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
}

function launchFromMobMenu() {
  const mob2 = document.getElementById("mobSlot2Select")?.dataset.value || null
  const mob3 = document.getElementById("mobSlot3Select")?.dataset.value || null
  document.getElementById("mobSelectionMenu").style.display = "none"
  _launchCombatWithMobs(_state.pendingMob, _state.pendingTier, [mob2, mob3].filter(Boolean))
}

function _launchCombatWithMobs(mainMob, forceTier, extraMobs) {
  if (combatActive || combatStarting) return
  combatStarting = true; combatActive = true
  setGameState("COMBAT"); currentMob = mainMob
  document.querySelectorAll(".gmSection").forEach(sec => { sec.style.display = "none" })
  document.getElementById("mobD12").style.display = "inline-block"
  document.getElementById("mobD20").style.display = "inline-block"

  const tier = forceTier || (mobStats[mainMob] ? mobStats[mainMob].tier : "weak")

  getPartyLevel(level => {
    const base = mobStats[mainMob] ? mobStats[mainMob].baseHP : 10
    const tierMults  = { weak:1.0,  medium:1.6, high:2.8, boss:5.0  }
    const tierScales = { weak:0.12, medium:0.18, high:0.25, boss:0.35 }
    const tierLvlOff = { weak:-1,   medium:1,   high:3,    boss:8    }
    const mult = tierMults[tier]  || 1.0
    const sc   = tierScales[tier] || 0.12
    // Après lvl 10 : réduire l'écart pour les world boss
    const effLevel = (tier === "boss" && level > 10) ? 10 + (level - 10) * 0.65 : level
    const hp   = Math.round(base * mult * Math.pow(1 + effLevel * sc, 1.6))
    const lvl  = Math.max(1, level + (tierLvlOff[tier] || 0))
    db.ref("combat/mob").set({ name:mainMob, hp, maxHP:hp, lvl, tier })

    _state.pendingExtraMobs = {}
    extraMobs.forEach((mob, i) => {
      const slot = ["mob2","mob3"][i]
      if (!slot || !mob) return
      _state.pendingExtraMobs[slot] = mob
      const tier2 = mobStats[mob] ? mobStats[mob].tier : "weak"
      const base2 = mobStats[mob] ? mobStats[mob].baseHP : 10
      const mult2 = { weak:1.2, medium:2.0, high:3.5, boss:6.0 }[tier2] || 1.2
      const lf2   = { weak:4,   medium:8,   high:14,  boss:30  }[tier2] || 4
      setTimeout(() => {
        getPartyLevel(lv => {
          const hp2  = Math.round(base2 * mult2 + lv * lf2 + Math.floor(lv * lv * 0.5))
          const lvl2 = Math.max(1, lv + ({ weak:-1, medium:1, high:3, boss:8 }[tier2] || 0))
          db.ref("combat/" + slot).set({ name:mob, hp:hp2, maxHP:hp2, lvl:lvl2, tier:tier2, slot })
          activeMobSlots[slot] = true
        })
      }, i * 200)
    })
    _syncCombatStart(mainMob, tier, extraMobs.filter(Boolean))
    combatSequence(mainMob, forceTier)
    combatStarting = false
  })
}

/* ========================= */
/* SÉQUENCE COMBAT           */
/* ========================= */

function combatSequence(mob, forceTier) {
  const tierMob = forceTier || (mobStats[mob] ? mobStats[mob].tier : "weak")
  if (mob === "roi" && tierMob === "boss") playRoiIntro(mob, tierMob)
  else _startCombatSequence(mob, tierMob)
}

function playRoiIntro(mob, tierMob) {
  stopAllMusic()
  const intro = document.getElementById("combatIntro"); intro.style.display = "flex"
  const cf    = document.getElementById("combatFilter")
  cf.style.cssText = "display:block;opacity:1;transition:none;background:rgba(120,0,0,0.7);"
  screenShakeHard(); setTimeout(() => screenShakeHard(), 400); setTimeout(() => screenShakeHard(), 800)
  playSound("combatSound", 0.4)

  setTimeout(() => {
    intro.style.display = "none"
    cf.style.opacity = "0.5"; cf.style.background = "rgba(120,0,0,0.5)"
    const box = document.getElementById("storyImage"); const img = document.getElementById("storyImageContent")
    if (box && img) {
      img.src = "images/roi.png"; box.style.opacity = "0"; box.style.left = "50%"
      box.style.transform = "translateX(-50%)"; box.style.right = "auto"; box.style.display = "flex"
      setTimeout(() => { box.style.transition = "opacity 0.8s"; box.style.opacity = "1" }, 50)
    }
    const roiSnd = new Audio("audio/roi.mp3"); roiSnd.volume = 1.0; roiSnd.play().catch(() => {})
    setTimeout(() => {
      let iv = setInterval(() => { if (roiSnd.volume > 0.04) roiSnd.volume = Math.max(0, roiSnd.volume - 0.05); else { roiSnd.pause(); clearInterval(iv) } }, 80)
    }, 15000)
    setTimeout(() => {
      db.ref("game/storyImage").remove()
      if (box) { box.style.transition = "opacity 1s ease"; box.style.opacity = "0" }
      cf.style.transition = "opacity 1s ease"; cf.style.opacity = "0"
    }, 15000)
    setTimeout(() => {
      if (box) { box.style.display = "none"; box.style.opacity = "" }
      cf.style.transition = "none"; cf.style.display = "none"; cf.style.opacity = "1"; cf.style.background = ""
      _startCombatSequence(mob, tierMob)
    }, 16000)
  }, 2000)
}

function _startCombatSequence(mob, tierMob) {
  const keepMapMusic =
    (mob === "kraken" && currentMap === "tourbillon.jpg") ||
    (mob === "balraug" && currentMap === "balraug.jpg")

  if (!keepMapMusic) {
    fadeMusicOut(() => {
      const track = tierMob === "boss"
        ? "audio/worldboss.mp3"
        : tierMob === "high"
        ? "audio/highcombat.mp3"
        : "audio/lowcombat.mp3"
      setTimeout(() => crossfadeMusic(track), 100)
    })
  }

  const intro = document.getElementById("combatIntro"); intro.style.display = "flex"
  const cf    = document.getElementById("combatFilter")
  cf.style.display = "block"; cf.style.opacity = "1"; cf.style.transition = "none"

  if (tierMob === "boss")       { cf.style.background = "rgba(120,0,0,0.7)"; screenShakeHard(); setTimeout(() => screenShakeHard(), 400); setTimeout(() => screenShakeHard(), 800) }
  else if (tierMob === "high")  { cf.style.background = "rgba(80,0,0,0.6)";  screenShakeHard(); setTimeout(() => screenShake(), 500) }
  else                          { cf.style.background = "rgba(60,0,0,0.5)";  screenShake() }
  playSound("combatSound", 0.4)

  setTimeout(() => {
    intro.style.display = "none"
    showMobIntro(mob)

    setTimeout(() => {
      const fade = document.getElementById("fadeScreen")
      fade.style.transition = "opacity 0.8s ease"; fade.style.opacity = "1"

      setTimeout(() => {
        const map = document.getElementById("map")
        map.style.backgroundImage = "url('images/" + _getCombatArenaMap(currentMob, tierMob) + "')"
        fadeToCombat()
        cf.style.display = "none"; cf.style.opacity = "1"
        fade.style.transition = "opacity 1s ease"; fade.style.opacity = "0"

        setTimeout(() => {
          spawnMobToken(mob)
          // Extra mobs
          ;["mob2","mob3"].forEach(slot => {
            if (_state.pendingExtraMobs && _state.pendingExtraMobs[slot]) {
              db.ref("combat/" + slot).once("value", snap => {
                const md = snap.val()
                if (md) { const ex = document.getElementById("mobToken_" + slot); if (ex) ex.remove(); spawnExtraMobToken(md, slot) }
              })
            }
          })

            if (tierMob === "boss") startBossFireEffect()
            const allyBtn = document.getElementById("allyBtn"); if (allyBtn && isGM) allyBtn.style.display = "flex"
            showCombatHUD()
            if (typeof updateThuumButton === "function") updateThuumButton()

          db.ref("combat/mob").once("value", () => {
            activeMobSlots["mob"] = true
            renderAllMobPanels()
            if (isGM) {
              const ap = document.getElementById("addMobPanel")
              if (ap) {
                ap.style.display = "block"
                const btnsDiv = document.getElementById("addMobButtons")
                if (btnsDiv && !btnsDiv.dataset.built) {
                  btnsDiv.dataset.built = "1"
                  ;["gobelins","loup","draugr","garde","bandit","ogre","valkyrie","golem","zombie","zombie2"].forEach(m => {
                    const b = document.createElement("button")
                    b.style.cssText = "padding:3px 8px;font-family:Cinzel,serif;font-size:9px;background:rgba(120,10,10,0.5);color:#ffaaaa;border:1px solid rgba(180,40,40,0.4);border-radius:3px;cursor:pointer;"
                    b.innerText = m; b.onclick = () => addMobToFight(m); btnsDiv.appendChild(b)
                  })
                }
              }
            }
          })

          showGMCombatPanel()
          loadPlayerCombatStats()
          if (isGM) {
            document.getElementById("gmDamagePanel").style.display = "block"
            document.getElementById("gmCombatPanel").style.display = "flex"
          }
        }, 600)
      }, 800)
    }, 2500)
  }, 2000)
}

/* ========================= */
/* INTRO MOB                 */
/* ========================= */

function showMobIntro(mob) {
  window.__witchIntroSoundPlaying = false
  const mobs = [mob]
  if (_state.pendingExtraMobs) {
    ;["mob2","mob3"].forEach(slot => { const m = _state.pendingExtraMobs[slot]; if (m) mobs.push(m) })
  }
  const slots   = [{ box:"storyImage", img:"storyImageContent" }, { box:"storyImage2", img:"storyImageContent2" }, { box:"storyImage3", img:"storyImageContent3" }]
  const posMap  = {
    1: [{ left:"50%", transform:"translateX(-50%)", right:"auto" }],
    2: [{ left:"25%", transform:"translateX(-50%)", right:"auto" }, { left:"75%", transform:"translateX(-50%)", right:"auto" }],
    3: [{ left:"20%", transform:"translateX(-50%)", right:"auto" }, { left:"50%", transform:"translateX(-50%)", right:"auto" }, { left:"80%", transform:"translateX(-50%)", right:"auto" }]
  }
  const posSet = posMap[Math.min(mobs.length, 3)]

    mobs.forEach((mobName, i) => {
      if (i >= slots.length) return
      const s = slots[i]; const p = posSet[i]
      const box = document.getElementById(s.box); const img = document.getElementById(s.img)
      if (!box || !img) return
      box.style.left = p.left; box.style.transform = p.transform; box.style.right = p.right || "auto"
      box.style.display = "flex"; box.style.opacity = "1"
      img.src = "images/" + mobName + ".png"
      if (mobName === "witch" && !window.__witchIntroSoundPlaying) {
        window.__witchIntroSoundPlaying = true
        const witchSound = new Audio("audio/witch.mp3")
        witchSound.volume = 0.9
        witchSound.play().catch(() => {})
        setTimeout(() => {
          const fadeIv = setInterval(() => {
            if (witchSound.volume > 0.08) witchSound.volume = Math.max(0, witchSound.volume - 0.09)
            else {
              witchSound.pause()
              window.__witchIntroSoundPlaying = false
              clearInterval(fadeIv)
            }
          }, 100)
        }, 4000)
      }
      const title = document.createElement("div")
      title.innerText = mobName.toUpperCase()
      title.style.cssText = "position:absolute;bottom:10%;left:50%;transform:translateX(-50%);font-family:Cinzel;font-size:clamp(20px,3vw,40px);color:red;text-shadow:0 0 10px red;white-space:nowrap;"
      box.appendChild(title)
    setTimeout(() => {
      box.style.transition = "opacity 1s"; box.style.opacity = "0"
      setTimeout(() => { box.style.display = "none"; if (title.parentNode) title.remove(); box.style.opacity = "1"; box.style.transition = "" }, 1000)
    }, 3000)
  })
}

/* ========================= */
/* ARÈNE                     */
/* ========================= */

function fadeToCombat() {
  const arena     = document.getElementById("combatArena")
  const tokenZone = document.getElementById("combatTokens")
  arena.style.cssText = "display:block;position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:100;"
  tokenZone.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;"

  ;["greg","ju","elo","bibi"].forEach((id, i) => {
    const token = document.getElementById(id)
    if (!token) return
    tokenZone.appendChild(token)
    token.style.transition = "none"; token.style.position = "absolute"; token.style.display = "flex"
    const startX = Math.round((window.innerWidth - 4 * 110) / 2)
      token.style.left   = (startX + i * 110) + "px"
      token.style.top    = Math.round(window.innerHeight * 0.65) + "px"
      token.style.zIndex = "200"; token.style.width = "70px"; token.style.height = "70px"
      token.style.pointerEvents = "auto"
      setTimeout(() => { token.style.transition = "" }, 50)
    })

  const mob = document.getElementById("mobToken")
  if (mob) {
    tokenZone.appendChild(mob)
    mob.style.cssText = "position:absolute;left:650px;top:180px;display:flex;z-index:200;"
  }
}

function spawnMobToken(mob) {
  const tokenZone = document.getElementById("combatTokens")
  const token     = document.getElementById("mobToken")
  const img       = document.getElementById("mobTokenImg")
  if (!token || !img) return

  token.style.pointerEvents = "auto"; token.style.cursor = "grab"
  if (tokenZone) tokenZone.appendChild(token)
  img.src = "images/" + mob + ".png"
  token.style.width = "130px"; token.style.height = "130px"
  img.style.width   = "130px"; img.style.height  = "130px"
  token.style.left  = "600px"; token.style.top   = "180px"
  token.style.display = "flex"; token.style.zIndex = "200"; token.style.position = "absolute"

  const oldName = token.querySelector(".mobNameTag"); if (oldName) oldName.remove()
  const nameTag = document.createElement("div")
  nameTag.className = "mobNameTag"; nameTag.innerText = mob.toUpperCase()
  nameTag.style.cssText = "position:absolute;bottom:-28px;left:50%;transform:translateX(-50%);font-family:Cinzel;font-size:22px;color:red;text-shadow:0 0 10px darkred;white-space:nowrap;"
  token.appendChild(nameTag)

  token.style.opacity = "0"; token.style.transform = "scale(0.1) rotate(-15deg)"; token.style.filter = "brightness(5) saturate(3)"
  const portal = document.createElement("div")
  portal.className = "mobPortal"
  portal.style.cssText = "position:absolute;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(150,0,0,0.95) 0%,rgba(80,0,0,0.6) 50%,transparent 75%);box-shadow:0 0 40px red,0 0 80px darkred;z-index:-1;"
  token.appendChild(portal)

  setTimeout(() => {
    flashRed(); flashRed(); screenShakeHard()
    token.style.transition = "all 0.5s cubic-bezier(0.17,0.67,0.35,1.4)"
    token.style.opacity = "1"; token.style.transform = "scale(1.3) rotate(0deg)"; token.style.filter = "brightness(2) saturate(2)"
    setTimeout(() => { token.style.transition = "all 0.3s ease"; token.style.transform = "scale(1)"; token.style.filter = "brightness(1)"; portal.remove() }, 500)
  }, 100)
}

/* ========================= */
/* VICTOIRE / DÉFAITE        */
/* ========================= */

function showVictory() {
  window.__combatOutcomeShowing = true
  if (isGM) {
    db.ref("game/combatOutcome").set({ type: "victory", time: Date.now() })
    setTimeout(() => db.ref("game/combatOutcome").remove(), 1500)
  }
  playSound("victorySound", 0.45)
  fadeMusicOut(() => {})

  const victory = document.getElementById("victoryScreen")
  victory.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;justify-content:center;align-items:center;z-index:999999999;opacity:0;transition:opacity 0.4s ease;"
  document.body.appendChild(victory)
  setTimeout(() => { victory.style.opacity = "1" }, 20)

  playSound("curseSound")
  screenShakeHard(); powerExplosion(); powerExplosion(); flashGold(); flashGold()
  spawnVictoryParticles()

  setTimeout(() => {
    const vs = document.getElementById("victorySound")
    if (vs) { let iv = setInterval(() => { if (vs.volume > 0.03) vs.volume -= 0.03; else { vs.pause(); vs.volume = 0; clearInterval(iv) } }, 100) }
  }, 5000)
  setTimeout(() => {
    victory.style.display = "none"
    endCombat()
    if (currentMob === "balraug") {
      currentMap = "prairie.jpg"
      if (isGM) db.ref("game/map").set("prairie.jpg")
      returnToMap()
      setTimeout(() => crossfadeMusic(mapMusic["prairie.jpg"]), 800)
    } else if (currentMob === "kraken") {
      currentMap = "niflheim.jpg"
      if (isGM) db.ref("game/map").set("niflheim.jpg")
      returnToMap()
      setTimeout(() => crossfadeMusic(mapMusic["niflheim.jpg"]), 800)
    } else {
      returnToMap()
    }
    setTimeout(() => { window.__combatOutcomeShowing = false }, 300)
  }, 7000)
}

function showDefeat() {
  if (window.__combatOutcomeShowing) return
  window.__combatOutcomeShowing = true
  window.__pendingLocalDefeat = true
  combatActive = true
  setGameState("COMBAT")
  playSound("defeatSound")
  fadeMusicOut(() => {})

  const screen = document.getElementById("defeatScreen")
  screen.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);display:flex;flex-direction:column;justify-content:center;align-items:center;z-index:999999999;opacity:1;"
  document.body.appendChild(screen)
  flashRed(); screenShakeHard()
  setTimeout(() => {
    screen.style.display = "none"
    endCombat()
    returnToMap()
    setTimeout(() => { window.__combatOutcomeShowing = false; window.__pendingLocalDefeat = false }, 300)
  }, 5000)
}

function endCombat() {
  if (!combatActive) return
  combatActive = false
  setGameState("GAME")

  const map = document.getElementById("map")
  ;["greg","ju","elo","bibi","mobToken"].forEach(id => {
    const token = document.getElementById(id)
    if (token && map) { map.appendChild(token); token.style.position = "absolute" }
  })

  document.getElementById("gmCombatPanel").style.display  = "none"
  document.getElementById("gmDamagePanel").style.display  = "none"
  stopBossFireEffect()

  const atkPanel = document.getElementById("mobAttackPanel"); if (atkPanel) atkPanel.remove()
  ;["mob2","mob3"].forEach(s => { activeMobSlots[s] = false })
  activeMobSlots["mob"] = false

  const ap = document.getElementById("addMobPanel"); if (ap) ap.style.display = "none"
  const allyPanel = document.getElementById("allyPNJPanel"); if (allyPanel) allyPanel.remove()
  const allyBtn = document.getElementById("allyBtn"); if (allyBtn) allyBtn.style.display = "none"
  const playerAllyBtn = document.getElementById("playerAllyBtn"); if (playerAllyBtn) playerAllyBtn.style.display = "none"
  const allyViewer = document.getElementById("allyViewerPanel"); if (allyViewer) allyViewer.remove()
  const ab = document.getElementById("addMobButtons"); if (ab) { ab.innerHTML = ""; delete ab.dataset.built }

  const arena = document.getElementById("combatArena")
  arena.style.display = "none"; arena.style.position = "relative"; arena.style.width = ""; arena.style.height = ""
  document.getElementById("combatGrid").style.display   = "none"
  document.getElementById("combatFilter").style.display = "none"
  document.getElementById("mobD12").style.display       = "none"
  document.getElementById("mobD20").style.display       = "none"

  const hud = document.getElementById("combatHUD"); if (hud) hud.style.display = "none"
  const attackBtn = document.getElementById("playerAttackBtn"); if (attackBtn) attackBtn.style.display = "none"
  const thuumBtn = document.getElementById("playerThuumBtn"); if (thuumBtn) thuumBtn.style.display = "none"
  if (typeof closePlayerThuumPanel === "function") closePlayerThuumPanel()
  if (isGM) {
    db.ref("combat/mob").remove()
    ;["mob2","mob3"].forEach(s => db.ref("combat/" + s).remove())
    db.ref("combat/usedAllies").remove()
    db.ref("combat/usedThuum").remove()
    db.ref("game/allyPanelOpen").remove()
    db.ref("game/playerAllyAccess").remove()
    _syncCombatEnd()
  }
  setTimeout(() => { if (typeof updateThuumButton === "function") updateThuumButton() }, 80)
}

function returnToMap() {
  const fade = document.getElementById("fadeScreen")
  fade.style.transition = "opacity 0.6s ease"; fade.style.opacity = "1"; fade.style.pointerEvents = "none"

  setTimeout(() => {
    const map = document.getElementById("map")
    if (currentMap) map.style.backgroundImage = "url('images/" + currentMap + "')"

    ;["greg","ju","elo","bibi","mobToken"].forEach(id => {
      const token = document.getElementById(id)
      if (token && map) {
        map.appendChild(token)
        token.style.top = ""; token.style.left = ""; token.style.transform = ""
        token.style.width = ""; token.style.height = ""; token.style.position = "absolute"; token.style.pointerEvents = "auto"
      }
    })

    const mobToken = document.getElementById("mobToken"); if (mobToken) mobToken.style.display = "none"

    db.ref("tokens").once("value", snapshot => {
      const data = snapshot.val(); if (!data) return
      Object.keys(data).forEach(id => {
        const token = document.getElementById(id)
        if (token && data[id]) { token.style.left = data[id].x + "px"; token.style.top = data[id].y + "px" }
      })
    })

    setTimeout(() => {
      fade.style.transition = "opacity 0.8s ease"; fade.style.opacity = "0"; fade.style.pointerEvents = "none"
      // Balraug — musique déjà en cours, ne pas relancer
      if (currentMap && mapMusic[currentMap]) crossfadeMusic(mapMusic[currentMap])
      if (typeof updateThuumButton === "function") updateThuumButton()
    }, 300)
  }, 600)
}

/* ========================= */
/* FEU BOSS                  */
/* ========================= */

function startBossFireEffect() {
  const existing = document.getElementById("bossFireOverlay"); if (existing) existing.remove()
  const overlay  = document.createElement("div"); overlay.id = "bossFireOverlay"
  overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:4999;opacity:0;transition:opacity 1.5s ease;"
  overlay.style.background = [
    "radial-gradient(ellipse at bottom,rgba(255,80,0,0.6) 0%,transparent 55%)",
    "radial-gradient(ellipse at bottom left,rgba(255,50,0,0.5) 0%,transparent 45%)",
    "radial-gradient(ellipse at bottom right,rgba(255,50,0,0.5) 0%,transparent 45%)"
  ].join(",")

  for (let i = 0; i < 40; i++) {
    const spark = document.createElement("div")
    const zone  = Math.random()
    let x, startY
    if (zone < 0.4)      { x = Math.random()*100; startY = 85+Math.random()*15 }
    else if (zone < 0.7) { x = Math.random()*12;  startY = 40+Math.random()*60 }
    else                 { x = 88+Math.random()*12; startY = 40+Math.random()*60 }
    const w = 4+Math.random()*10, h = 10+Math.random()*20
    spark.style.cssText = `position:absolute;width:${w}px;height:${h}px;border-radius:50% 50% 20% 20%;background:linear-gradient(to top,transparent,#ff6600,${Math.random()>0.5?"#ffcc00":"#ff3300"});left:${x}%;top:${startY}%;animation:bossFireSpark ${1+Math.random()*2.5}s ease-in infinite;animation-delay:${Math.random()*2}s;filter:blur(${Math.random()*2}px);`
    overlay.appendChild(spark)
  }

  const vignette = document.createElement("div")
  vignette.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;box-shadow:inset 0 0 80px rgba(200,30,0,0.5);animation:bossVignettePulse 1.5s ease-in-out infinite alternate;"
  overlay.appendChild(vignette)
  document.body.appendChild(overlay)
  setTimeout(() => { overlay.style.opacity = "1" }, 50)
}

function stopBossFireEffect() {
  const overlay = document.getElementById("bossFireOverlay"); if (!overlay) return
  overlay.style.transition = "opacity 1.5s ease"; overlay.style.opacity = "0"
  setTimeout(() => overlay.remove(), 1500)
}

/* ========================= */
/* CINÉMATIQUE INTRO         */
/* ========================= */

function playOpeningCinematic(callback) {
  const screen = document.createElement("div"); screen.id = "openingCinematic"
  screen.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:#000;z-index:999999999;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:1;"
  document.body.appendChild(screen)

  const tremb = new Audio("audio/tremblement.mp3"); tremb.volume = 0.8; tremb.play().catch(() => {})
  setTimeout(() => { let iv = setInterval(() => { if (tremb.volume>0.05) tremb.volume-=0.05; else { tremb.pause(); clearInterval(iv) } }, 100) }, 5500)

  let shakeCount = 0
  const shakeIv = setInterval(() => {
    shakeCount++
    screen.style.transform = `translate(${(Math.random()-0.5)*8}px,${(Math.random()-0.5)*8}px)`
    if (shakeCount > 30) { clearInterval(shakeIv); screen.style.transform = "" }
  }, 80)

  const showCinText = (text, duration) => {
    const old = screen.querySelector(".cinText")
    if (old) { old.style.opacity = "0"; setTimeout(() => { if (old.parentNode) old.remove() }, 1000) }
    const el = document.createElement("div"); el.className = "cinText"
    el.style.cssText = "font-family:'IM Fell English',serif;font-size:24px;color:#c8a050;text-shadow:0 0 20px rgba(200,160,50,0.6);text-align:center;letter-spacing:3px;line-height:1.8;max-width:600px;padding:0 40px;opacity:0;transition:opacity 1.5s ease;white-space:pre-line;"
    el.innerText = text; screen.appendChild(el)
    setTimeout(() => { el.style.opacity = "1" }, 50)
    setTimeout(() => { el.style.opacity = "0"; setTimeout(() => { if (el.parentNode) el.remove() }, 1500) }, duration)
  }

  setTimeout(() => {
    const flashDelays = [0,100,220,400,600]
    flashDelays.forEach(delay => {
      setTimeout(() => {
        const flash = document.createElement("div")
        flash.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;background:white;opacity:0;pointer-events:none;z-index:10;"
        screen.appendChild(flash)
        requestAnimationFrame(() => {
          flash.style.transition = "opacity 0.05s"; flash.style.opacity = "1"
          setTimeout(() => { flash.style.transition = "opacity 0.1s"; flash.style.opacity = "0"; setTimeout(() => flash.remove(), 150) }, 50)
        })
      }, delay)
    })

    setTimeout(() => {
      ;["fart.mp3","cribibi.mp3","ah.mp3"].forEach((s, i) => {
        setTimeout(() => {
          const snd = new Audio("audio/" + s); snd.volume = 0; snd.play().catch(() => {})
          let inIv = setInterval(() => { if (snd.volume<0.55) snd.volume=Math.min(0.55,snd.volume+0.04); else clearInterval(inIv) }, 80)
          setTimeout(() => { let outIv = setInterval(() => { if (snd.volume>0.03) snd.volume=Math.max(0,snd.volume-0.04); else { snd.pause(); clearInterval(outIv) } }, 100) }, 3000)
        }, i * 200)
      })
      const gb = new Audio("audio/grisebarbe.mp3"); gb.volume = 0; gb.play().catch(() => {})
      let gbIn = setInterval(() => { if (gb.volume<0.7) gb.volume=Math.min(0.7,gb.volume+0.03); else clearInterval(gbIn) }, 100)
      setTimeout(() => { let gbOut = setInterval(() => { if (gb.volume>0.02) gb.volume-=0.03; else { gb.pause(); clearInterval(gbOut) } }, 100) }, 27000)
    }, 100)
  }, 6000)

  setTimeout(() => showCinText("… alors, dans le lointain,\non entendra la fréquence sacrée.", 4000), 11000)
  setTimeout(() => showCinText("… et les héros viendraient offrir\nune nouvelle ère de paix.", 4000), 16000)
  setTimeout(() => {
    const old = screen.querySelector(".cinText"); if (old) { old.style.opacity = "0"; setTimeout(() => { if (old.parentNode) old.remove() }, 1000) }
    const wrapper = document.createElement("div"); wrapper.className = "cinText"
    wrapper.style.cssText = "display:flex;flex-direction:column;align-items:center;max-width:680px;padding:0 50px;opacity:0;transition:opacity 1.5s ease;"
    const t = document.createElement("div"); t.style.cssText = "font-family:'Cinzel Decorative','Cinzel',serif;font-size:18px;letter-spacing:5px;color:#c8a050;text-shadow:0 0 15px gold;text-align:center;margin-bottom:14px;"; t.innerText = "Prophétie des Enfants de Mouches"; wrapper.appendChild(t)
    const v = document.createElement("div"); v.style.cssText = "font-family:'IM Fell English',serif;font-size:15px;color:rgba(200,160,50,0.8);line-height:2;text-align:center;font-style:italic;"; v.innerText = "— Livre I, Verset 1 —"; wrapper.appendChild(v)
    screen.appendChild(wrapper); setTimeout(() => { wrapper.style.opacity = "1" }, 50)
    const prop = new Audio("audio/prophetie.mp3"); prop.volume = 0; prop.play().catch(() => {})
    let pIv = setInterval(() => { if (prop.volume<0.8) prop.volume=Math.min(0.8,prop.volume+0.04); else clearInterval(pIv) }, 100)
  }, 21000)

  setTimeout(() => {
    screen.style.transition = "opacity 2s ease"; screen.style.opacity = "0"
    setTimeout(() => { screen.remove(); if (callback) callback() }, 2000)
  }, 27000)
}

/* ========================= */
/* DROP MOB DIFFICULTÉ       */
/* ========================= */

function openMobDiff(mobId, event) {
  if (!isGM) return
  event.stopPropagation(); _state.mobDiffPending = mobId
  const popup  = document.getElementById("mobDiffPopup")
  const nameEl = document.getElementById("mobDiffName")
  if (!popup) return

  const bossMobs = ["balraug","fenrir","jormungand","kraken","nhiddog","roi","odin","thor","freya"]
  const noWeak   = ["golem","pretre","zombie","zombie2","maire","intendantbrume","conseillerroinord","generalmelenchon","jarl baldur","garde baldur"]

  popup.querySelectorAll("button").forEach(btn => {
    const match = btn.getAttribute("onclick")?.match(/launchMobDiff\('(\w+)'\)/)
    const tier  = match?.[1]; if (!tier) return
    if (bossMobs.includes(mobId))    btn.style.display = tier === "boss" ? "block" : "none"
    else if (noWeak.includes(mobId)) btn.style.display = tier === "weak" ? "none"  : "block"
    else                             btn.style.display = "block"
  })

  nameEl.innerText = mobId.toUpperCase()
  let x = event.clientX, y = event.clientY
  if (x + 150 > window.innerWidth)  x = window.innerWidth  - 160
  if (y + 160 > window.innerHeight) y = window.innerHeight - 170
  popup.style.left = x + "px"; popup.style.top = y + "px"; popup.style.display = "block"
  setTimeout(() => document.addEventListener("mousedown", closeMobDiffOnce), 10)
}

function closeMobDiffOnce(e) {
  const popup = document.getElementById("mobDiffPopup")
  if (popup && !popup.contains(e.target)) { popup.style.display = "none"; document.removeEventListener("mousedown", closeMobDiffOnce) }
}

function launchMobDiff(tier) {
  const popup = document.getElementById("mobDiffPopup"); if (popup) popup.style.display = "none"
  document.removeEventListener("mousedown", closeMobDiffOnce)
  if (_state.mobDiffPending) startCombat(_state.mobDiffPending, tier)
  _state.mobDiffPending = null
}

/* ========================= */
/* DROPDOWN MENU MOB         */
/* ========================= */

const MOB_SELECT_LIST = ["gobelins","loup","draugr","garde","bandit","ogre","valkyrie","golem","zombie","zombie2","witch","fantome","vampire","dragon","fenrir","balraug","jormungand","kraken"]

function toggleMobDropdown(slot, triggerEl) {
  const dd = document.getElementById("mobDropdown_" + slot); if (!dd) return
  if (dd.style.display !== "none") { dd.style.display = "none"; return }
  if (!dd.dataset.built) {
    dd.dataset.built = "1"
    const none = document.createElement("div"); none.style.cssText = "padding:5px 10px;font-family:Cinzel,serif;font-size:11px;color:rgb(180,100,100);cursor:pointer;"; none.innerText = "— Aucun —"; none.onmousedown = e => { e.stopPropagation(); selectMobOption(slot, "", "— Aucun —") }; dd.appendChild(none)
    MOB_SELECT_LIST.forEach(m => {
      const item = document.createElement("div"); item.style.cssText = "padding:5px 10px;font-family:Cinzel,serif;font-size:11px;color:rgb(255,180,180);cursor:pointer;"; item.innerText = m.charAt(0).toUpperCase() + m.slice(1)
      item.onmousedown = e => { e.stopPropagation(); selectMobOption(slot, m, item.innerText) }; item.onmouseenter = () => item.style.background = "rgb(60,10,10)"; item.onmouseleave = () => item.style.background = ""; dd.appendChild(item)
    })
  }
  const rect = triggerEl.getBoundingClientRect()
  dd.style.position = "fixed"; dd.style.top = (rect.bottom+4)+"px"; dd.style.left = rect.left+"px"; dd.style.width = rect.width+"px"; dd.style.display = "block"
}

function selectMobOption(slot, value, label) {
  const num     = slot.replace("slot", "")
  const trigger = document.getElementById("mobSlot" + num + "Select")
  if (trigger) { trigger.innerText = label; trigger.dataset.value = value }
  const dd = document.getElementById("mobDropdown_" + slot); if (dd) dd.style.display = "none"
  updateMobPreview()
}

function updateMobPreview() {
  const preview = document.getElementById("mobPreviewRow"); if (!preview) return; preview.innerHTML = ""
  const slots = [
    { name: _state.pendingMob },
    { name: document.getElementById("mobSlot2Select")?.dataset.value },
    { name: document.getElementById("mobSlot3Select")?.dataset.value }
  ].filter(s => s.name)

  slots.forEach(s => {
    const div = document.createElement("div"); div.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:4px;"
    const img = document.createElement("img"); img.src = "images/" + s.name + ".png"; img.style.cssText = "width:60px;height:60px;object-fit:contain;border-radius:50%;border:2px solid rgb(180,40,40);box-shadow:0 0 10px rgb(150,0,0);"; img.onerror = () => img.style.opacity = "0.3"; div.appendChild(img)
    const lbl = document.createElement("div"); lbl.style.cssText = "font-family:Cinzel,serif;font-size:9px;color:rgb(255,150,150);letter-spacing:1px;"; lbl.innerText = s.name.toUpperCase(); div.appendChild(lbl)
    preview.appendChild(div)
  })
}

function _startRemoteCombat(data) {
  if (isGM || !data || !data.active) return
  if (!gameStarted) return
  if (gameState !== "GAME" && gameState !== "COMBAT") return
  if (combatActive && currentMob === data.mainMob) return

  currentMob = data.mainMob
  if (data.returnMap) currentMap = data.returnMap

  _state.pendingExtraMobs = {}
  ;(data.extraMobs || []).forEach((mob, i) => {
    const slot = ["mob2","mob3"][i]
    if (!slot || !mob) return
    _state.pendingExtraMobs[slot] = mob
  })

  combatActive = true
  combatStarting = false
  setGameState("COMBAT")
  combatSequence(data.mainMob, data.tier)
  setTimeout(() => { if (typeof updateThuumButton === "function") updateThuumButton() }, 250)
}

function _playRemoteCombatExit() {
  if (isGM) return
  if (window.__combatOutcomeShowing || window.__pendingLocalDefeat) return
  const localId = typeof getLocalPlayerId === "function"
    ? getLocalPlayerId()
    : (myToken ? String(myToken.id || "").toLowerCase() : "")

  const proceedExit = () => {
    const fade = document.getElementById("fadeScreen")
    if (fade) {
      fade.style.transition = "opacity 0.6s ease"
      fade.style.opacity = "1"
      fade.style.pointerEvents = "none"
    }

    setTimeout(() => {
      endCombat()
      returnToMap()
    }, 450)
  }

  if (!localId) {
    proceedExit()
    return
  }

  db.ref("characters/" + localId + "/hp").once("value", snap => {
    const hp = parseInt(snap.val(), 10) || 0
    if (hp <= 0) {
      if (typeof triggerLocalDefeat === "function") triggerLocalDefeat("remote-exit-hp")
      else showDefeat()
      return
    }
    proceedExit()
  })
}

function _resolveRemoteCombatEnd(attempt = 0) {
  if (isGM) return
  if (window.__combatOutcomeShowing || window.__pendingLocalDefeat) return
  const maxAttempts = 6

  db.ref("game/combatOutcome").once("value", outcomeSnap => {
    const outcome = outcomeSnap.val()

    if (window.__combatOutcomeShowing || window.__pendingLocalDefeat) return

    if (outcome && outcome.type === "defeat") {
      const localId = typeof getLocalPlayerId === "function"
        ? getLocalPlayerId()
        : (myToken ? String(myToken.id || "").toLowerCase() : "")
      const targetId = String(outcome.player || "").toLowerCase()
      if (targetId && localId && targetId === localId) {
        if (typeof triggerLocalDefeat === "function") triggerLocalDefeat("combatStateClose")
        else {
          window.__pendingLocalDefeat = true
          showDefeat()
        }
        return
      }
      _playRemoteCombatExit()
      return
    }

    if (outcome && outcome.type === "victory") {
      _playRemoteCombatExit()
      return
    }

    if (attempt < maxAttempts) {
      setTimeout(() => _resolveRemoteCombatEnd(attempt + 1), 180)
      return
    }

    _playRemoteCombatExit()
  })
}

document.addEventListener("DOMContentLoaded", () => {
  db.ref("game/combatState").on("value", snap => {
    const data = snap.val()

    if (!gameStarted) return
    if (gameState !== "GAME" && gameState !== "COMBAT" && gameState !== "DIALOGUE") return

    if (!data || !data.active) {
      if (!isGM && (window.__combatOutcomeShowing || window.__pendingLocalDefeat)) return
      if (!isGM && (combatActive || gameState === "COMBAT" || window.__combatOutcomeShowing || window.__pendingLocalDefeat)) {
        _resolveRemoteCombatEnd()
      }
      return
    }

    if (!isGM) _startRemoteCombat(data)
  })
})