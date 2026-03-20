"use strict";

(function () {
  if (window.__RPG_HOTFIX_APPLIED__) return;
  window.__RPG_HOTFIX_APPLIED__ = true;

  function assetPath(folder, file) {
    if (!file) return "";
    if (/^(https?:|data:|blob:|\/)/i.test(file)) return file;
    return file.includes("/") ? file : folder + "/" + file;
  }

  window.resolveAudioPath = function (file) {
    return assetPath("audio", file);
  };

  window.resolveImagePath = function (file) {
    return assetPath("images", file);
  };

  const originalCrossfadeMusic = window.crossfadeMusic;
  window.crossfadeMusic = function (newMusic) {
    return originalCrossfadeMusic(resolveAudioPath(newMusic));
  };

  window.preloadAssets = function () {
    Object.keys(mapMusic).forEach(map => {
      const img = new Image();
      img.src = resolveImagePath(map);
    });

    Object.values(mapMusic).forEach(audio => {
      const a = new Audio();
      a.src = resolveAudioPath(audio);
    });
  };

  window.scanAssets = function () {
    const images = Object.keys(mapMusic).concat([
      "greg.png", "ju.png", "elo.png", "bibi.png",
      "gregsheet.jpg", "yusheet.jpg", "elosheet.jpg", "bibisheet.jpg",
      "paper.png", "paper1.png"
    ]);

    images.forEach(img => {
      const test = new Image();
      test.onerror = () => console.warn("IMAGE MANQUANTE -> " + img);
      test.src = resolveImagePath(img);
    });
  };

  window.spawnMobToken = function (mob) {
    const tokenZone = document.getElementById("combatTokens");
    const token = document.getElementById("mobToken");
    const img = document.getElementById("mobTokenImg");
    if (!token || !img) return;

    token.style.pointerEvents = "auto";
    token.style.cursor = "grab";
    if (tokenZone) tokenZone.appendChild(token);

    img.src = resolveImagePath(mob + ".png");
    token.style.width = "130px";
    token.style.height = "130px";
    img.style.width = "130px";
    img.style.height = "130px";
    token.style.left = "600px";
    token.style.top = "180px";
    token.style.display = "flex";
    token.style.zIndex = "200";
    token.style.position = "absolute";

    const oldName = token.querySelector(".mobNameTag");
    if (oldName) oldName.remove();

    const nameTag = document.createElement("div");
    nameTag.className = "mobNameTag";
    nameTag.innerText = mob.toUpperCase();
    nameTag.style.cssText = "position:absolute;bottom:-28px;left:50%;transform:translateX(-50%);font-family:Cinzel;font-size:22px;color:red;text-shadow:0 0 10px darkred;white-space:nowrap;";
    token.appendChild(nameTag);

    token.style.opacity = "0";
    token.style.transform = "scale(0.1) rotate(-15deg)";
    token.style.filter = "brightness(5) saturate(3)";

    const portal = document.createElement("div");
    portal.className = "mobPortal";
    portal.style.cssText = "position:absolute;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(150,0,0,0.95) 0%,rgba(80,0,0,0.6) 50%,transparent 75%);box-shadow:0 0 40px red,0 0 80px darkred;z-index:-1;";
    token.appendChild(portal);

    setTimeout(() => {
      flashRed();
      flashRed();
      screenShakeHard();
      token.style.transition = "all 0.5s cubic-bezier(0.17,0.67,0.35,1.4)";
      token.style.opacity = "1";
      token.style.transform = "scale(1.3) rotate(0deg)";
      token.style.filter = "brightness(2) saturate(2)";
      setTimeout(() => {
        token.style.transition = "all 0.3s ease";
        token.style.transform = "scale(1)";
        token.style.filter = "brightness(1)";
        portal.remove();
      }, 500);
    }, 100);
  };

  window.showMobIntro = function (mob) {
    const mobs = [mob];
    if (_state.pendingExtraMobs) {
      ["mob2", "mob3"].forEach(slot => {
        const m = _state.pendingExtraMobs[slot];
        if (m) mobs.push(m);
      });
    }

    const slots = [
      { box: "storyImage", img: "storyImageContent" },
      { box: "storyImage2", img: "storyImageContent2" },
      { box: "storyImage3", img: "storyImageContent3" }
    ];

    const posMap = {
      1: [{ left: "50%", transform: "translateX(-50%)", right: "auto" }],
      2: [
        { left: "25%", transform: "translateX(-50%)", right: "auto" },
        { left: "75%", transform: "translateX(-50%)", right: "auto" }
      ],
      3: [
        { left: "20%", transform: "translateX(-50%)", right: "auto" },
        { left: "50%", transform: "translateX(-50%)", right: "auto" },
        { left: "80%", transform: "translateX(-50%)", right: "auto" }
      ]
    };

    const posSet = posMap[Math.min(mobs.length, 3)];

    mobs.forEach((mobName, i) => {
      if (i >= slots.length) return;
      const s = slots[i];
      const p = posSet[i];
      const box = document.getElementById(s.box);
      const img = document.getElementById(s.img);
      if (!box || !img) return;

      box.style.left = p.left;
      box.style.transform = p.transform;
      box.style.right = p.right || "auto";
      box.style.display = "flex";
      box.style.opacity = "1";

      img.src = resolveImagePath(mobName + ".png");

      const title = document.createElement("div");
      title.innerText = mobName.toUpperCase();
      title.style.cssText = "position:absolute;bottom:10%;left:50%;transform:translateX(-50%);font-family:Cinzel;font-size:clamp(20px,3vw,40px);color:red;text-shadow:0 0 10px red;white-space:nowrap;";
      box.appendChild(title);

      setTimeout(() => {
        box.style.transition = "opacity 1s";
        box.style.opacity = "0";
        setTimeout(() => {
          box.style.display = "none";
          if (title.parentNode) title.remove();
          box.style.opacity = "1";
          box.style.transition = "";
        }, 1000);
      }, 3000);
    });
  };

  window.updateMobPreview = function () {
    const preview = document.getElementById("mobPreviewRow");
    if (!preview) return;

    preview.innerHTML = "";
    const slots = [
      { name: _state.pendingMob },
      { name: document.getElementById("mobSlot2Select")?.dataset.value },
      { name: document.getElementById("mobSlot3Select")?.dataset.value }
    ].filter(s => s.name);

    slots.forEach(s => {
      const div = document.createElement("div");
      div.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:4px;";

      const img = document.createElement("img");
      img.src = resolveImagePath(s.name + ".png");
      img.style.cssText = "width:60px;height:60px;object-fit:contain;border-radius:50%;border:2px solid rgb(180,40,40);box-shadow:0 0 10px rgb(150,0,0);";
      img.onerror = () => { img.style.opacity = "0.3"; };
      div.appendChild(img);

      const lbl = document.createElement("div");
      lbl.style.cssText = "font-family:Cinzel,serif;font-size:9px;color:rgb(255,150,150);letter-spacing:1px;";
      lbl.innerText = s.name.toUpperCase();
      div.appendChild(lbl);

      preview.appendChild(div);
    });
  };

  function getCombatArenaMap(mob, tier) {
    if (mob === "kraken") return "tourbillon.jpg";
    return tier === "boss" ? "arenefinal.jpg" : "arene.jpg";
  }

  function syncCombatStart(mainMob, tier, extraMobs) {
    return db.ref("game/combatState").set({
      active: true,
      mainMob,
      tier,
      extraMobs: extraMobs || [],
      returnMap: currentMap || "taverne.jpg",
      time: Date.now()
    });
  }

  function syncCombatEnd() {
    return db.ref("game/combatState").remove();
  }

  window._launchCombatWithMobs = function (mainMob, forceTier, extraMobs) {
    if (combatActive || combatStarting) return;

    combatStarting = true;
    combatActive = true;
    setGameState("COMBAT");
    currentMob = mainMob;
    document.querySelectorAll(".gmSection").forEach(sec => { sec.style.display = "none"; });
    document.getElementById("mobD12").style.display = "inline-block";
    document.getElementById("mobD20").style.display = "inline-block";

    const tier = forceTier || (mobStats[mainMob] ? mobStats[mainMob].tier : "weak");

    getPartyLevel(level => {
      const base = mobStats[mainMob] ? mobStats[mainMob].baseHP : 10;
      const tierMults = { weak: 1.0, medium: 1.6, high: 2.8, boss: 5.0 };
      const tierScales = { weak: 0.12, medium: 0.18, high: 0.25, boss: 0.35 };
      const tierLvlOff = { weak: -1, medium: 1, high: 3, boss: 8 };
      const mult = tierMults[tier] || 1.0;
      const sc = tierScales[tier] || 0.12;
      const effLevel = (tier === "boss" && level > 10) ? 10 + (level - 10) * 0.65 : level;
      const hp = Math.round(base * mult * Math.pow(1 + effLevel * sc, 1.6));
      const lvl = Math.max(1, level + (tierLvlOff[tier] || 0));

      db.ref("combat/mob").set({ name: mainMob, hp, maxHP: hp, lvl, tier });

      _state.pendingExtraMobs = {};
      (extraMobs || []).forEach((mob, i) => {
        const slot = ["mob2", "mob3"][i];
        if (!slot || !mob) return;

        _state.pendingExtraMobs[slot] = mob;
        const tier2 = mobStats[mob] ? mobStats[mob].tier : "weak";
        const base2 = mobStats[mob] ? mobStats[mob].baseHP : 10;
        const mult2 = { weak: 1.2, medium: 2.0, high: 3.5, boss: 6.0 }[tier2] || 1.2;
        const lf2 = { weak: 4, medium: 8, high: 14, boss: 30 }[tier2] || 4;

        setTimeout(() => {
          getPartyLevel(lv => {
            const hp2 = Math.round(base2 * mult2 + lv * lf2 + Math.floor(lv * lv * 0.5));
            const lvl2 = Math.max(1, lv + ({ weak: -1, medium: 1, high: 3, boss: 8 }[tier2] || 0));
            db.ref("combat/" + slot).set({ name: mob, hp: hp2, maxHP: hp2, lvl: lvl2, tier: tier2, slot });
            activeMobSlots[slot] = true;
          });
        }, i * 200);
      });

      syncCombatStart(mainMob, tier, (extraMobs || []).filter(Boolean));
      combatSequence(mainMob, forceTier);
      combatStarting = false;
    });
  };

  window._startCombatSequence = function (mob, tierMob) {
    if (mob !== "kraken" && mob !== "balraug") {
      fadeMusicOut(() => {
        const track = tierMob === "boss"
          ? "worldboss.mp3"
          : tierMob === "high"
          ? "highcombat.mp3"
          : "lowcombat.mp3";
        setTimeout(() => crossfadeMusic(track), 100);
      });
    }

    const intro = document.getElementById("combatIntro");
    intro.style.display = "flex";

    const cf = document.getElementById("combatFilter");
    cf.style.display = "block";
    cf.style.opacity = "1";
    cf.style.transition = "none";

    if (tierMob === "boss") {
      cf.style.background = "rgba(120,0,0,0.7)";
      screenShakeHard();
      setTimeout(() => screenShakeHard(), 400);
      setTimeout(() => screenShakeHard(), 800);
    } else if (tierMob === "high") {
      cf.style.background = "rgba(80,0,0,0.6)";
      screenShakeHard();
      setTimeout(() => screenShake(), 500);
    } else {
      cf.style.background = "rgba(60,0,0,0.5)";
      screenShake();
    }

    playSound("combatSound", 0.4);

    setTimeout(() => {
      intro.style.display = "none";
      showMobIntro(mob);

      setTimeout(() => {
        const fade = document.getElementById("fadeScreen");
        fade.style.transition = "opacity 0.8s ease";
        fade.style.opacity = "1";

        setTimeout(() => {
          const map = document.getElementById("map");
          map.style.backgroundImage = "url('" + resolveImagePath(getCombatArenaMap(currentMob, tierMob)) + "')";

          fadeToCombat();
          cf.style.display = "none";
          cf.style.opacity = "1";
          fade.style.transition = "opacity 1s ease";
          fade.style.opacity = "0";

          setTimeout(() => {
            spawnMobToken(mob);

            ["mob2", "mob3"].forEach(slot => {
              if (_state.pendingExtraMobs && _state.pendingExtraMobs[slot]) {
                db.ref("combat/" + slot).once("value", snap => {
                  const md = snap.val();
                  if (md) {
                    const ex = document.getElementById("mobToken_" + slot);
                    if (ex) ex.remove();
                    spawnExtraMobToken(md, slot);
                  }
                });
              }
            });

            if (tierMob === "boss") startBossFireEffect();

            const allyBtn = document.getElementById("allyBtn");
            if (allyBtn && isGM) allyBtn.style.display = "flex";

            const playerAllyBtn = document.getElementById("playerAllyBtn");
            if (playerAllyBtn && !isGM) playerAllyBtn.style.display = "flex";

            showCombatHUD();

            db.ref("combat/mob").once("value", () => {
              activeMobSlots.mob = true;
              renderAllMobPanels();

              if (isGM) {
                const ap = document.getElementById("addMobPanel");
                if (ap) {
                  ap.style.display = "block";
                  const btnsDiv = document.getElementById("addMobButtons");
                  if (btnsDiv && !btnsDiv.dataset.built) {
                    btnsDiv.dataset.built = "1";
                    ["gobelins", "loup", "draugr", "garde", "bandit", "ogre", "valkyrie", "golem", "zombie", "zombie2"].forEach(m => {
                      const b = document.createElement("button");
                      b.style.cssText = "padding:3px 8px;font-family:Cinzel,serif;font-size:9px;background:rgba(120,10,10,0.5);color:#ffaaaa;border:1px solid rgba(180,40,40,0.4);border-radius:3px;cursor:pointer;";
                      b.innerText = m;
                      b.onclick = () => addMobToFight(m);
                      btnsDiv.appendChild(b);
                    });
                  }
                }
              }
            });

            showGMCombatPanel();
            loadPlayerCombatStats();

            if (isGM) {
              document.getElementById("gmDamagePanel").style.display = "block";
              document.getElementById("gmCombatPanel").style.display = "flex";
            }
          }, 600);
        }, 800);
      }, 2500);
    }, 2000);
  };

  const originalShowTavern = window.showTavern;
  window.showTavern = function () {
    if (window.__REMOTE_COMBAT_ENDING__) {
      window.__REMOTE_COMBAT_ENDING__ = false;
      return returnToMap();
    }
    return originalShowTavern.apply(this, arguments);
  };

  window.endCombat = function () {
    if (!combatActive) return;

    combatActive = false;
    setGameState("GAME");

    const map = document.getElementById("map");
    ["greg", "ju", "elo", "bibi", "mobToken"].forEach(id => {
      const token = document.getElementById(id);
      if (token && map) {
        map.appendChild(token);
        token.style.position = "absolute";
      }
    });

    document.getElementById("gmCombatPanel").style.display = "none";
    document.getElementById("gmDamagePanel").style.display = "none";
    stopBossFireEffect();

    const atkPanel = document.getElementById("mobAttackPanel");
    if (atkPanel) atkPanel.remove();

    activeMobSlots.mob = false;
    activeMobSlots.mob2 = false;
    activeMobSlots.mob3 = false;

    const ap = document.getElementById("addMobPanel");
    if (ap) ap.style.display = "none";

    const allyPanel = document.getElementById("allyPNJPanel");
    if (allyPanel) allyPanel.remove();

    const allyBtn = document.getElementById("allyBtn");
    if (allyBtn) allyBtn.style.display = "none";

    const playerAllyBtn = document.getElementById("playerAllyBtn");
    if (playerAllyBtn) playerAllyBtn.style.display = "none";

    const allyViewer = document.getElementById("allyViewerPanel");
    if (allyViewer) allyViewer.remove();

    const ab = document.getElementById("addMobButtons");
    if (ab) {
      ab.innerHTML = "";
      delete ab.dataset.built;
    }

    const arena = document.getElementById("combatArena");
    arena.style.display = "none";
    arena.style.position = "relative";
    arena.style.width = "";
    arena.style.height = "";

    document.getElementById("combatGrid").style.display = "none";
    document.getElementById("combatFilter").style.display = "none";
    document.getElementById("mobD12").style.display = "none";
    document.getElementById("mobD20").style.display = "none";

    const hud = document.getElementById("combatHUD");
    if (hud) hud.style.display = "none";

    const attackBtn = document.getElementById("playerAttackBtn");
    if (attackBtn) attackBtn.style.display = "none";

    if (isGM) {
      db.ref("combat/mob").remove();
      db.ref("combat/mob2").remove();
      db.ref("combat/mob3").remove();
      db.ref("combat/usedAllies").remove();
      db.ref("game/allyPanelOpen").remove();
      syncCombatEnd();
    } else {
      window.__REMOTE_COMBAT_ENDING__ = true;
    }
  };

  window.returnToMap = function () {
    const fade = document.getElementById("fadeScreen");
    fade.style.transition = "opacity 0.6s ease";
    fade.style.opacity = "1";
    fade.style.pointerEvents = "none";

    setTimeout(() => {
      const map = document.getElementById("map");
      if (currentMap) {
        map.style.backgroundImage = "url('" + resolveImagePath(currentMap) + "')";
      }

      ["greg", "ju", "elo", "bibi", "mobToken"].forEach(id => {
        const token = document.getElementById(id);
        if (token && map) {
          map.appendChild(token);
          token.style.top = "";
          token.style.left = "";
          token.style.transform = "";
          token.style.width = "";
          token.style.height = "";
          token.style.position = "absolute";
          token.style.pointerEvents = "auto";
        }
      });

      const mobToken = document.getElementById("mobToken");
      if (mobToken) mobToken.style.display = "none";

      db.ref("tokens").once("value", snapshot => {
        const data = snapshot.val();
        if (!data) return;
        Object.keys(data).forEach(id => {
          const token = document.getElementById(id);
          if (token && data[id]) {
            token.style.left = data[id].x + "px";
            token.style.top = data[id].y + "px";
          }
        });
      });

      setTimeout(() => {
        fade.style.transition = "opacity 0.8s ease";
        fade.style.opacity = "0";
        fade.style.pointerEvents = "none";
        if (currentMap && mapMusic[currentMap] && currentMob !== "balraug") {
          crossfadeMusic(mapMusic[currentMap]);
        }
      }, 300);
    }, 600);
  };

  function startRemoteCombat(data) {
    if (isGM) return;
    if (!data || !data.active) return;
    if (combatActive && currentMob === data.mainMob) return;

    currentMob = data.mainMob;
    if (data.returnMap) currentMap = data.returnMap;

    combatActive = true;
    combatStarting = false;
    setGameState("COMBAT");

    const fade = document.getElementById("fadeScreen");
    const map = document.getElementById("map");

    fade.style.transition = "opacity 0.5s ease";
    fade.style.opacity = "1";

    setTimeout(() => {
      map.style.backgroundImage = "url('" + resolveImagePath(getCombatArenaMap(data.mainMob, data.tier)) + "')";
      fadeToCombat();
      spawnMobToken(data.mainMob);

      activeMobSlots.mob = true;

      (data.extraMobs || []).forEach((mob, i) => {
        const slot = ["mob2", "mob3"][i];
        if (!slot || !mob) return;

        db.ref("combat/" + slot).once("value", snap => {
          const md = snap.val();
          if (!md) return;
          const ex = document.getElementById("mobToken_" + slot);
          if (ex) ex.remove();
          spawnExtraMobToken(md, slot);
          activeMobSlots[slot] = true;
        });
      });

      renderAllMobPanels();
      loadPlayerCombatStats();
      showCombatHUD();

      const playerAllyBtn = document.getElementById("playerAllyBtn");
      if (playerAllyBtn) playerAllyBtn.style.display = "flex";

      fade.style.opacity = "0";
    }, 500);
  }

  document.addEventListener("DOMContentLoaded", () => {
    db.ref("game/combatState").on("value", snap => {
      const data = snap.val();

      if (!data || !data.active) {
        if (!isGM && combatActive) {
          endCombat();
          returnToMap();
        }
        return;
      }

      if (!isGM) {
        startRemoteCombat(data);
      }
    });
  });
})();
