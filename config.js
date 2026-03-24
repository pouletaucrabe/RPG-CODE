"use strict"

/* ========================= */
/* ÉTATS DU JEU              */
/* ========================= */

const GAME_STATE = {
  MENU:     "MENU",
  INTRO:    "INTRO",
  DIALOGUE: "DIALOGUE",
  GAME:     "GAME",
  COMBAT:   "COMBAT"
}

/* ========================= */
/* STATS JOUEURS             */
/* ========================= */

const playerBaseStats = {
  greg: { force:6, charme:4, perspi:4, chance:4, defense:5, hp:120, poids:100 },
  ju:   { force:4, charme:5, perspi:7, chance:5, defense:4, hp:110, poids:100 },
  elo:  { force:4, charme:7, perspi:5, chance:5, defense:4, hp:110, poids:100 },
  bibi: { force:5, charme:4, perspi:4, chance:6, defense:4, hp:110, poids:100 }
}

const playerMainStat = { greg:"force", ju:"perspi", elo:"charme", bibi:"chance" }

const allStats = ["force","charme","perspi","chance","defense"]

function _getLevelUpGains(lvl) {
  if      (lvl <= 2)  return { main:2, secCount:1, secAmt:1, hp:8  }
  else if (lvl <= 3)  return { main:2, secCount:2, secAmt:1, hp:10 }
  else if (lvl <= 4)  return { main:3, secCount:2, secAmt:1, hp:10 }
  else if (lvl <= 5)  return { main:3, secCount:2, secAmt:2, hp:12 }
  else if (lvl <= 8)  return { main:3, secCount:2, secAmt:2, hp:14 }
  else if (lvl <= 12) return { main:4, secCount:2, secAmt:2, hp:16 }
  else                return { main:5, secCount:2, secAmt:3, hp:18 }
}

function getPlayerStatsAtLevel(playerId, level) {
  const base = playerBaseStats[playerId]
  const main = playerMainStat[playerId]
  if (!base) return null
  const stats = {}
  allStats.forEach(s => { stats[s] = base[s] })
  let hp = base.hp

  for (let lvl = 2; lvl <= level; lvl++) {
    const g = _getLevelUpGains(lvl)
    stats[main] += g.main
    hp += g.hp
    // Stats secondaires — réparties déterministement mais variées
    const others = allStats.filter(s => s !== main)
    const chosen = []
    for (let i = 0; i < g.secCount; i++) {
      const seed = playerId.charCodeAt(0) + lvl * 7 + i * 31
      let idx = seed % others.length
      // Éviter de choisir deux fois la même stat au même niveau
      while (chosen.includes(idx)) idx = (idx + 1) % others.length
      chosen.push(idx)
      stats[others[idx]] += g.secAmt
    }
  }
  stats.hp    = hp
  stats.poids = base.poids + (level - 1) * 2
  return stats
}

function xpForLevel(lvl) {
  let total = 0
  for (let i = 1; i < lvl; i++) total += i * 20
  return total
}

/* ========================= */
/* STATS MOBS                */
/* ========================= */

const mobStats = {
  gobelins:          { tier:"weak",   baseHP:20  },
  loup:              { tier:"weak",   baseHP:48  },
  draugr:            { tier:"weak",   baseHP:56  },
  fantome:           { tier:"weak",   baseHP:20  },
  vampire:           { tier:"weak",   baseHP:32  },
  witch:             { tier:"weak",   baseHP:24  },
  garde:             { tier:"weak",   baseHP:56  },
  bandit:            { tier:"weak",   baseHP:24  },
  ogre:              { tier:"medium", baseHP:48  },
  dragon:            { tier:"medium", baseHP:70  },
  liquorice:         { tier:"medium", baseHP:56  },
  valkyrie:          { tier:"medium", baseHP:60  },
  golem:             { tier:"high",   baseHP:100 },
  pretre:            { tier:"high",   baseHP:80  },
  balraug:           { tier:"boss",   baseHP:180 },
  fenrir:            { tier:"high",   baseHP:100 },
  jormungand:        { tier:"boss",   baseHP:360 },
  kraken:            { tier:"boss",   baseHP:390 },
  nhiddog:           { tier:"boss",   baseHP:330 },
  roi:               { tier:"boss",   baseHP:450 },
  tavernier:         { tier:"weak",   baseHP:20  },
  soulard:           { tier:"weak",   baseHP:16  },
  serveuse:          { tier:"weak",   baseHP:18  },
  marchand:          { tier:"weak",   baseHP:44  },
  forgeron:          { tier:"medium", baseHP:60  },
  forgeron1:         { tier:"medium", baseHP:56  },
  voyantepnj:        { tier:"medium", baseHP:44  },
  "garde baldur":    { tier:"medium", baseHP:32  },
  "child baldur":    { tier:"weak",   baseHP:15  },
  pnj1:              { tier:"weak",   baseHP:24  },
  pnj2:              { tier:"weak",   baseHP:24  },
  oldmessager:       { tier:"weak",   baseHP:20  },
  maire:             { tier:"high",   baseHP:90  },
  generalmelenchon:  { tier:"high",   baseHP:120 },
  "jarl baldur":     { tier:"high",   baseHP:55  },
  marchand2:         { tier:"weak",   baseHP:22  },
  gardedunord:       { tier:"medium", baseHP:60  },
  garde2:            { tier:"medium", baseHP:56  },
  conseillerroinord: { tier:"high",   baseHP:90  },
  intendantbrume:    { tier:"high",   baseHP:100 },
  zombie:            { tier:"high",   baseHP:120 },
  zombie2:           { tier:"high",   baseHP:110 },
  troll:             { tier:"medium", baseHP:80  },
  cyclope:           { tier:"medium", baseHP:85  },
  serpentgeant:      { tier:"high",   baseHP:130 },
  hydre:             { tier:"boss",   baseHP:450 },
  basilic:           { tier:"boss",   baseHP:400 },
  odin:              { tier:"boss",   baseHP:600 },
  thor:              { tier:"boss",   baseHP:550 },
  freya:             { tier:"boss",   baseHP:480 },
  heimdall:          { tier:"boss",   baseHP:520 },
  "ELO PION":        { tier:"weak",   baseHP:28  },
  "ju pion":         { tier:"weak",   baseHP:28  },
  "greg pion":       { tier:"weak",   baseHP:32  }
}

/* ========================= */
/* ATTAQUES JOUEURS          */
/* ========================= */

const attacks = {
  greg: [
    { name:"Chat Bite (CaC)",      type:"Mêlée",    dice:12, stat:"Force",        effect:"Morsure brutale",                                             crit:"Dégâts x2" },
    { name:"Le Bibi",              type:"Spécial",  dice:20, stat:"Chance",       effect:"Bibi attaque avec rage",                                      crit:"Bibi entre en rage, -2 HP mobs pendant 3 tours" },
    { name:"I know Frank (si arc)",type:"Distance", dice:12, stat:"Perspicacité", effect:"Tir précis arc",                                              crit:"Dégâts x2 et saignement, -1 HP pendant 2 tours" }
  ],
  ju: [
    { name:"Dépêche-toi !!!",  type:"Charme",  dice:12, stat:"Perspicacité", effect:"L'ennemi cible Ju. Alliés +1 dégats",                        crit:"Mobs n'attaquent pas au prochain tour" },
    { name:"Spider Sense",     type:"Analyse", dice:10, stat:"Perspicacité", effect:"Révèle les faiblesses",                                      crit:"Augmente le loot de la victoire" },
    { name:"Petite merde",     type:"Attaque", dice:12, stat:"Force",        effect:"Attaque humiliante. Si utilisé après Spider sense, dégâts x2", crit:"l'ennemi est humilié, -1 attaque pendant 2 tours" }
  ],
  elo: [
    { name:"Mains magiques",                  type:"Soin",      dice:12, stat:"Defense", effect:"Restaure HP à soi ou allié",                                                     crit:"Pv restaurés x2" },
    { name:"Je vais te raconter une histoire",type:"Sort",      dice:12, stat:"Charme",  effect:"invoque les forces de la nature. Dégats double en forêt ou mine",                crit:"L'ennemi est empoisonné, -2 hp pendant 2 tours" },
    { name:"Je suis jet laguée",              type:"Invocation",dice:12, stat:"Chance",  effect:"Invoque un familier. D4 dégats cumulés, disparait après 3 tours ou si mort",    crit:"Le familier devient fou, dégats x2 et attaque tous les mobs" }
  ]
}

/* ========================= */
/* ATTAQUES MOBS             */
/* ========================= */

const mobAttacks = {
  weak: [
    { name:"Attaque",        icon:"⚔",  dmgMin:3,  dmgMax:8,  effect:null,    desc:"Frappe basique" }
  ],
  medium: [
    { name:"Frappe",         icon:"⚔",  dmgMin:5,  dmgMax:12, effect:null,    desc:"Attaque normale" },
    { name:"Assaut brutal",  icon:"💢", dmgMin:8,  dmgMax:18, effect:"stun",  desc:"Étourdit la cible" }
  ],
  high: [
    { name:"Coup puissant",    icon:"⚔",  dmgMin:10, dmgMax:20, effect:null,    desc:"Frappe puissante" },
    { name:"Attaque de zone",  icon:"🌀", dmgMin:6,  dmgMax:12, effect:"all",   desc:"Touche tous les joueurs" },
    { name:"Capacité spéciale",icon:"✨", dmgMin:12, dmgMax:25, effect:"curse", desc:"+1 malédiction" }
  ],
  boss: [
    { name:"Frappe dévastatrice",icon:"💥", dmgMin:20, dmgMax:40, effect:null,    desc:"Dégâts massifs" },
    { name:"Rugissement",        icon:"😤", dmgMin:8,  dmgMax:15, effect:"debuff",desc:"Force/Défense -2 pendant 2 tours" },
    { name:"Pouvoir ultime",     icon:"⚡", dmgMin:25, dmgMax:50, effect:"all",   desc:"Frappe TOUS les joueurs" }
  ]
}

const mobSpecialAnimations = {
  bloodmoon: { accent:"#d14b6a", glow:"rgba(209,75,106,0.55)", bg:"radial-gradient(circle at center,rgba(90,0,20,0.92) 0%,rgba(20,0,8,0.98) 70%)" },
  howl:      { accent:"#89d1ff", glow:"rgba(90,170,255,0.52)", bg:"radial-gradient(circle at center,rgba(10,30,50,0.92) 0%,rgba(3,8,18,0.98) 72%)" },
  spectral:  { accent:"#c8f6ff", glow:"rgba(130,240,255,0.5)", bg:"radial-gradient(circle at center,rgba(8,42,46,0.94) 0%,rgba(2,10,12,0.98) 74%)" },
  venom:     { accent:"#8cff75", glow:"rgba(120,255,90,0.48)", bg:"radial-gradient(circle at center,rgba(18,56,8,0.92) 0%,rgba(6,14,4,0.98) 72%)" },
  arcane:    { accent:"#d7a8ff", glow:"rgba(181,120,255,0.55)", bg:"radial-gradient(circle at center,rgba(44,18,70,0.94) 0%,rgba(10,4,18,0.98) 72%)" },
  fire:      { accent:"#ff9b57", glow:"rgba(255,120,50,0.58)", bg:"radial-gradient(circle at center,rgba(82,20,0,0.94) 0%,rgba(18,4,0,0.98) 74%)" },
  storm:     { accent:"#9ad6ff", glow:"rgba(110,190,255,0.54)", bg:"radial-gradient(circle at center,rgba(16,34,76,0.94) 0%,rgba(4,8,18,0.98) 72%)" },
  stone:     { accent:"#d0c2a6", glow:"rgba(180,160,120,0.45)", bg:"radial-gradient(circle at center,rgba(48,38,22,0.94) 0%,rgba(14,10,6,0.98) 72%)" },
  abyss:     { accent:"#6ce2d9", glow:"rgba(50,220,210,0.5)", bg:"radial-gradient(circle at center,rgba(0,44,56,0.94) 0%,rgba(0,8,12,0.99) 74%)" },
  divine:    { accent:"#ffe08a", glow:"rgba(255,214,120,0.52)", bg:"radial-gradient(circle at center,rgba(90,62,12,0.94) 0%,rgba(20,12,2,0.98) 72%)" },
  royal:     { accent:"#ffcf7f", glow:"rgba(255,170,70,0.55)", bg:"radial-gradient(circle at center,rgba(80,28,8,0.94) 0%,rgba(20,4,0,0.98) 74%)" },
  tavern:    { accent:"#ffd9a0", glow:"rgba(255,210,150,0.45)", bg:"radial-gradient(circle at center,rgba(90,48,12,0.94) 0%,rgba(20,10,2,0.98) 74%)" }
}

const mobSpecialAttacks = {
  gobelins: { name:"Vol de mollets", icon:"🗡", dmgMin:7, dmgMax:12, effect:null, animation:"tavern", flavor:"Les gobelins se jettent en escadrille sur les tibias." },
  loup: { name:"Hurlement de meute", icon:"🐺", dmgMin:8, dmgMax:14, effect:null, animation:"howl", flavor:"Un hurlement glacial annonce la morsure coordonnée." },
  draugr: { name:"WHAAAAAA", icon:"🪦", dmgMin:10, dmgMax:17, effect:"curse", animation:"spectral", flavor:"Le draugr hurle comme si la tombe venait de lui voler sa caution." },
  fantome: { name:"Traversée du linceul", icon:"👻", dmgMin:8, dmgMax:13, effect:null, animation:"spectral", flavor:"Le froid passe à travers l'armure et les excuses." },
  vampire: { name:"Bella, where the hall have you been loca", icon:"🩸", dmgMin:12, dmgMax:20, effect:"curse", animation:"bloodmoon", flavor:"Le vampire scintille d'un charisme absolument interdit par la morale." },
  witch: { name:"Défier la gravité", icon:"🧪", dmgMin:11, dmgMax:18, effect:"curse", animation:"arcane", flavor:"La sorcière décide que la physique est un avis, pas une règle." },
  garde: { name:"J'ai pris une flèche dans le genou", icon:"🛡", dmgMin:10, dmgMax:16, effect:null, animation:"stone", flavor:"Le garde raconte encore son histoire, mais avec beaucoup plus d'impact." },
  bandit: { name:"Embuscade sale", icon:"🪓", dmgMin:8, dmgMax:15, effect:null, animation:"tavern", flavor:"Un coup bas, mal annoncé, mais très appliqué." },
  ogre: { name:"It's all ogre now", icon:"🌳", dmgMin:14, dmgMax:22, effect:null, animation:"stone", flavor:"L'ogre prononce sa catchphrase et tout le monde regrette d'être venu." },
  dragon: { name:"Fournaise royale", icon:"🐉", dmgMin:16, dmgMax:26, effect:"all", animation:"fire", flavor:"Un cône de flammes transforme l'air en punition." },
  liquorice: { name:"Réglisse cosmique", icon:"🍬", dmgMin:12, dmgMax:18, effect:null, animation:"arcane", flavor:"Une douceur démoniaque dont le goût reste une semaine dans l'âme." },
  valkyrie: { name:"Sentence d'Asgard", icon:"🪽", dmgMin:14, dmgMax:22, effect:null, animation:"divine", flavor:"La lance descend comme un verdict déjà signé." },
  golem: { name:"Écrasement tectonique", icon:"🪨", dmgMin:15, dmgMax:24, effect:null, animation:"stone", flavor:"Le sol oublie sa fonction de sol." },
  pretre: { name:"Mon cierge est allumé, la cire prête à couler", icon:"📿", dmgMin:16, dmgMax:24, effect:"curse", animation:"divine", flavor:"Le sermon dérape immédiatement vers quelque chose de très peu canonique." },
  fenrir: { name:"Mâchoire du crépuscule", icon:"🌘", dmgMin:16, dmgMax:25, effect:null, animation:"howl", flavor:"Fenrir choisit une cible comme on choisit la fin du monde." },
  zombie: { name:"Marche des morceaux", icon:"🧟", dmgMin:13, dmgMax:20, effect:null, animation:"venom", flavor:"Chaque membre participe, même sans coordination centrale." },
  zombie2: { name:"Morsure recyclée", icon:"☣", dmgMin:13, dmgMax:19, effect:"curse", animation:"venom", flavor:"Rien n'est frais, tout est offensant." },
  troll: { name:"Pont cassé", icon:"🪵", dmgMin:12, dmgMax:18, effect:null, animation:"stone", flavor:"Le troll frappe comme si la route lui appartenait." },
  cyclope: { name:"Regard du mal calibré", icon:"👁", dmgMin:13, dmgMax:20, effect:null, animation:"stone", flavor:"Un seul œil, mais une très mauvaise intention." },
  serpentgeant: { name:"Constriction abyssale", icon:"🐍", dmgMin:15, dmgMax:24, effect:null, animation:"abyss", flavor:"Le serpent décide que respirer est devenu optionnel." },
  balraug: { name:"You shall not pass", icon:"🔥", dmgMin:25, dmgMax:38, effect:"all", animation:"fire", flavor:"Le Balraug bloque le passage avec une autorité tout à fait litigieuse." },
  jormungand: { name:"Marée du monde", icon:"🌊", dmgMin:24, dmgMax:36, effect:"all", animation:"abyss", flavor:"La mer intérieure de Jormungand déborde sur tout le groupe." },
  kraken: { name:"Tentacule d'inventaire", icon:"🐙", dmgMin:23, dmgMax:35, effect:"all", animation:"abyss", flavor:"Le Kraken fouille vos poches avec une implication gênante." },
  nhiddog: { name:"Griffe des racines", icon:"🕳", dmgMin:21, dmgMax:33, effect:"all", animation:"abyss", flavor:"Les racines du monde mordent à travers lui." },
  hydre: { name:"Conseil de têtes", icon:"🐍", dmgMin:24, dmgMax:38, effect:"all", animation:"venom", flavor:"Personne n'est d'accord, sauf sur le fait de vous dévorer." },
  basilic: { name:"Œil qui fige", icon:"🗿", dmgMin:22, dmgMax:34, effect:null, animation:"venom", flavor:"Le regard pèse comme une pierre vivante." },
  roi: { name:"Impôt terminal", icon:"👑", dmgMin:26, dmgMax:40, effect:"all", animation:"royal", flavor:"Le roi prélève directement en points de vie." },
  odin: { name:"Décret du borgne", icon:"🜂", dmgMin:28, dmgMax:42, effect:"all", animation:"divine", flavor:"Une sentence divine, cosmique, et très peu négociable." },
  thor: { name:"Procès-verbal de Mjolnir", icon:"⚡", dmgMin:27, dmgMax:41, effect:"all", animation:"storm", flavor:"Le tonnerre signe son nom sur tout le groupe." },
  freya: { name:"Grâce qui blesse", icon:"🌺", dmgMin:24, dmgMax:36, effect:null, animation:"divine", flavor:"Une beauté si parfaite qu'elle devient offensive." },
  heimdall: { name:"Alarme du pont", icon:"🌈", dmgMin:24, dmgMax:37, effect:"all", animation:"storm", flavor:"Heimdall sonne la fin avant même qu'elle commence." },
  tavernier: { name:"Tournée générale de baffes", icon:"🍺", dmgMin:7, dmgMax:12, effect:null, animation:"tavern", flavor:"Le tavernier sert chaud, vite, et avec l'avant-bras." },
  soulard: { name:"Chanson de fin de tonneau", icon:"🍷", dmgMin:6, dmgMax:10, effect:null, animation:"tavern", flavor:"Le rythme est faux mais le coup porte." },
  serveuse: { name:"Plateau orbital", icon:"🍽", dmgMin:7, dmgMax:11, effect:null, animation:"tavern", flavor:"Un service express directement à la mâchoire." },
  marchand: { name:"Offre non remboursable", icon:"💰", dmgMin:8, dmgMax:13, effect:null, animation:"royal", flavor:"Le marchand facture désormais à l'unité de douleur." },
  marchand2: { name:"Promotion létale", icon:"🪙", dmgMin:8, dmgMax:13, effect:null, animation:"royal", flavor:"Deux achetés, trois bleus offerts." },
  forgeron: { name:"Enclume du destin", icon:"🔨", dmgMin:12, dmgMax:19, effect:null, animation:"fire", flavor:"Chaque frappe résonne jusque dans la colonne vertébrale." },
  forgeron1: { name:"Reprise à chaud", icon:"⚒", dmgMin:11, dmgMax:18, effect:null, animation:"fire", flavor:"Le métal n'est pas le seul à plier." },
  maire: { name:"Discours d'urgence", icon:"📜", dmgMin:14, dmgMax:22, effect:null, animation:"royal", flavor:"Une allocution si longue qu'elle devient contondante." },
  generalmelenchon: { name:"MAIS QUI ELLE EST CELLE LA", icon:"📣", dmgMin:18, dmgMax:27, effect:"all", animation:"royal", flavor:"Le général interpelle la réalité elle-même et la réalité prend des dégâts." }
}

function _getFallbackMobSpecialAttack(mobName, mobTier) {
  const label = String(mobName || "créature").toUpperCase()
  if (mobTier === "boss") return { name:"Cataclysme de " + label, icon:"☄", dmgMin:22, dmgMax:36, effect:"all", animation:"abyss", flavor:"Le boss décide que la nuance n'est plus nécessaire." }
  if (mobTier === "high") return { name:"Signature maudite", icon:"✦", dmgMin:14, dmgMax:24, effect:"curse", animation:"arcane", flavor:"Une technique personnelle visiblement interdite dans plusieurs royaumes." }
  if (mobTier === "medium") return { name:"Montée en pression", icon:"💢", dmgMin:10, dmgMax:17, effect:null, animation:"stone", flavor:"Le combat prend soudain un ton bien moins raisonnable." }
  return { name:"Sale surprise", icon:"🗡", dmgMin:7, dmgMax:12, effect:null, animation:"tavern", flavor:"Petit gabarit, mauvaises idées." }
}

function getMobSpecialAttack(mobName, mobTier) {
  const key = String(mobName || "").toLowerCase()
  const attack = mobSpecialAttacks[key] || _getFallbackMobSpecialAttack(mobName, mobTier)
  return attack ? { ...attack, special:true, oncePerCombat:true } : null
}

function getMobAnimationStyle(animationKey) {
  return mobSpecialAnimations[animationKey] || mobSpecialAnimations.arcane
}

function getMobDamageRange(attack, mobLvl, mobTier = "weak") {
  const levelFactor = 1 + Math.max(0, mobLvl - 1) * 0.21
  const tierFactor = { weak:1.1, medium:1.18, high:1.3, boss:1.45 }[mobTier] || 1.12
  const specialFactor = attack && attack.special ? 1.2 : 1
  const factor = levelFactor * tierFactor * specialFactor
  return {
    min: Math.round(attack.dmgMin * factor),
    max: Math.round(attack.dmgMax * factor)
  }
}

function getMobDamage(attack, mobLvl, mobTier = "weak") {
  const range = getMobDamageRange(attack, mobLvl, mobTier)
  const min = range.min
  const max = range.max
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/* ========================= */
/* MAPS & MUSIQUES           */
/* ========================= */

const mapMusic = {
  "taverne.jpg":         "ambiancetaverne.mp3",
  "village1.jpg":        "marche.mp3",
  "armurerie.jpg":       "armurerie.mp3",
  "marche.jpg":          "marche.mp3",
  "voyante.jpg":         "voyante.mp3",
  "foret.jpg":           "foret.mp3",
  "arbre.jpg":           "arbre.mp3",
  "castleofevil.jpg":    "castleofevil.mp3",
  "cimetiere.jpg":       "cimetiere.mp3",
  "mine.jpg":            "mine.mp3",
  "port.jpg":            "port.mp3",
  "bateaunord.png":      "port.mp3",
  "neige.jpg":           "neige.mp3",
  "bifrost.jpg":         "bifrost.mp3",
  "MAPMONDE.jpg":        "prairie.mp3",
  "prairie.jpg":         "prairie.mp3",
  "chasseuraurore.jpg":  "chasseuraurore.mp3",
  "tenteaurore.jpg":     "tente.mp3",
  "bateau1.jpg":         "chasseuraurore.mp3",
  "antre.jpg":           "antre.mp3",
  "portail.jpg":         "foret.mp3",
  "tourbillon.jpg":      "tourbillon.mp3",
  "trou.jpg":            "trou.mp3",
  "cristaux.jpg":        "cristaux.mp3",
  "interieurmine.jpg":   "mine.mp3",
  "prebalraug.jpg":      "mine.mp3",
  "throne.jpg":          "throne.mp3",
  "interieurcastle.jpg": "castleofevil.mp3",
  "egout.jpg":           "egout.mp3",
  "tavernebrume.png":    "ambiancetaverne.mp3",
  "armurerie1.jpg":      "brumeinside.mp3",  // Armurerie de Brume
  "balduregout.jpg":     "egout.mp3",
  "marche1.jpg":         "port.mp3",
  "palaisville.jpg":     "brumeinside.mp3",
  "mairemaison.jpg":     "mairemaison.mp3",
  "epouventail.jpg":     "marche.mp3",
  "asgard.jpg":          "asgard.mp3",
  "rivebois.jpg":        "marche.mp3",
  "ruines.jpg":          "ruines.mp3",
  "niflheim.jpg":        "niflheim.mp3",
  "hvergelmir.jpg":      "niflheim.mp3"
}

const mapNames = {
  "taverne.jpg":         "La Taverne",
  "village1.jpg":        "Village Rivebois",
  "armurerie.jpg":       "Forge de Rivebois",
  "voyante.jpg":         "Apothicaire",
  "marche.jpg":          "Place du marché",
  "foret.jpg":           "Forêt enchantée",
  "arbre.jpg":           "Arbre Monde",
  "castleofevil.jpg":    "The Castle of Evil",
  "cimetiere.jpg":       "Cimetière ancien",
  "mine.jpg":            "Mine du vent d'Est",
  "prebalraug.jpg":      "Salle principal",
  "port.jpg":            "La Cité du Nord Brume",
  "portail.jpg":         "Portail de Vérité",
  "trou.jpg":            "Passage de l'Antre monde",
  "cristaux.jpg":        "Cristal de vérité",
  "tourbillon.jpg":      "Le Maelestrom",
  "interieurcastle.jpg": "Salle principale",
  "throne.jpg":          "Throne",
  "bateaunord.png":      "Port de Brume",
  "bifrost.jpg":         "Bifrost",
  "MAPMONDE.jpg":        "MAP MONDE",
  "chasseuraurore.jpg":  "Camp des Chasseurs d'Aurore",
  "tenteaurore.jpg":     "Tente du Général Mélenchon",
  "antre.jpg":           "L'Antre monde",
  "egout.jpg":           "🌊 Égout de Brume",
  "bateau.jpg":           "Le for sure",
  "bateau1.jpg":         "L'Oregon III",
  "tavernebrume.png":    "Taverne de Brume",
  "armurerie1.jpg":      "Armurerie de Brume",
  "balduregout.jpg":     "Salle secrète de Baldur",
  "marche1.jpg":         "Place du Marché de Brume",
  "mairemaison.jpg":     "🏛 Mairie de Rivebois",
  "epouventail.jpg":     "",
  "asgard.jpg":          "⚡ La cité des dieux Asgard",
  "rivebois.jpg":        "🏘 Rivebois",
  "ruines.jpg":          "🏚 Ruines du village du Jarl Baldur",
  "niflheim.jpg":        "🌊 Cité engloutie Niflheim",
  "hvergelmir.jpg":      "🌊 Source sacrée Hvergelmir"
}

/* ========================= */
/* SHOP                      */
/* ========================= */

const shopItemsArmurerie = [
  { id:"epee",         name:"Épée",             img:"epee.png",         category:"arme",   basePrix:60,  baseStats:"Force +2",        scaling:8  },
  { id:"arc",          name:"Arc",              img:"arc.png",          category:"arme",   basePrix:70,  baseStats:"Précision +2",    scaling:8  },
  { id:"masse",        name:"Masse",            img:"masse.png",        category:"arme",   basePrix:65,  baseStats:"Force +3",        scaling:9  },
  { id:"baton",        name:"Bâton",            img:"baton.png",        category:"arme",   basePrix:55,  baseStats:"Magie +2",        scaling:7  },
  { id:"bouclier",     name:"Bouclier",         img:"bouclier.png",     category:"arme",   basePrix:70,  baseStats:"Défense +3",      scaling:8  },
  { id:"fleches",      name:"Flèches (x10)",    img:"fleche.png",       category:"arme",   basePrix:25,  baseStats:"Munitions",       scaling:3  },
  { id:"armleg",       name:"Armure Légère",    img:"armurelegere.png", category:"armure", basePrix:90,  baseStats:"Défense +2",      scaling:10 },
  { id:"armlour",      name:"Armure Lourde",    img:"armurelourde.png", category:"armure", basePrix:150, baseStats:"Défense +5",      scaling:15 },
  { id:"anneauforce",  name:"Anneau de Force",  img:"anneau1.png",      category:"armure", basePrix:120, baseStats:"Force +2",        scaling:12 },
  { id:"anneaucharme", name:"Anneau de Charme", img:"anneau2.png",      category:"armure", basePrix:120, baseStats:"Charme +2",       scaling:12 },
  { id:"anneauperspi", name:"Anneau de Perspic.",img:"anneau1.png",     category:"armure", basePrix:120, baseStats:"Perspicacité +2", scaling:12 },
  { id:"anneauchance", name:"Anneau de Chance", img:"anneau2.png",      category:"armure", basePrix:120, baseStats:"Chance +2",       scaling:12 },
  { id:"anneaudef",    name:"Anneau de Défense",img:"anneau1.png",      category:"armure", basePrix:120, baseStats:"Défense +2",      scaling:12 }
]

const shopItems = [
  { id:"sort",       name:"Parchemin Sort",  img:"sort.png",      category:"magie",   basePrix:100, baseStats:"Sort unique",  scaling:12 },
  { id:"anneaumagic",name:"Anneau Mystique", img:"anneau1.png",   category:"magie",   basePrix:130, baseStats:"Magie +3",     scaling:13 },
  { id:"potion",     name:"Potion de Vie",   img:"potionvie.png", category:"consomm", basePrix:50,  baseStats:"Vie +30",      scaling:5  },
  { id:"potionres",  name:"Potion de Rés.",  img:"potionres.png", category:"consomm", basePrix:300, baseStats:"Résurrection", scaling:20 },
  { id:"lanterne",   name:"Lanterne",        img:"lanterne.png",  category:"util",    basePrix:30,  baseStats:"Vision nuit",  scaling:2  },
  { id:"torche",     name:"Torche",          img:"torche.png",    category:"util",    basePrix:15,  baseStats:"Éclairage",    scaling:1  },
  { id:"corde",      name:"Corde/Grappin",   img:"corde.png",     category:"util",    basePrix:25,  baseStats:"Utilité",      scaling:2  },
  { id:"selle",      name:"Selle de Bibi",   img:"bag.png",       category:"util",    basePrix:80,  baseStats:"Poids +",      scaling:5  },
  { id:"pioche",     name:"Pioche",          img:"pioche.png",    category:"util",    basePrix:40,  baseStats:"Minage",       scaling:3  },
  { id:"amulette",   name:"Amulette Sacrée", img:"anneau2.png",   category:"util",    basePrix:150, baseStats:"Curse -1",     scaling:10 },
  { id:"pierresoin", name:"Pierre de Soin",  img:"sort.png",      category:"util",    basePrix:120, baseStats:"+5 HP/tour",   scaling:8  }
]

const categoryLabels = {
  arme:"⚔ Armes", armure:"🛡 Armures", magie:"✨ Magie", consomm:"🧪 Consommables", util:"🔧 Utilitaires"
}

function getShopPrice(item, partyLvl) {
  return Math.round(item.basePrix + item.scaling * (partyLvl - 1))
}

function getShopStats(item, partyLvl) {
  const lvl = partyLvl || 1
  if (item.id === "selle")      return "Poids Bibi +" + (5 + lvl * 3) + " kg"
  if (item.id === "amulette")   return "Curse -" + Math.min(3, 1 + Math.floor(lvl / 3))
  if (item.id === "pierresoin") return "+" + (5 + Math.floor(lvl / 2)) + " HP/tour"
  if (item.scaling === 0)       return item.baseStats
  const match = item.baseStats.match(/(\d+)/)
  if (!match) return item.baseStats
  const scaled = parseInt(match[1]) + Math.floor(item.scaling * (lvl - 1) * 0.5)
  return item.baseStats.replace(match[1], scaled)
}

/* ========================= */
/* WANTED                    */
/* ========================= */

const WANTED_REWARDS = {
  weak:  [50, 100, 150],
  medium:[200, 350, 500],
  high:  [600, 900, 1200],
  boss:  [2000, 3500, 5000]
}

const WANTED_MOBS = [
  "gobelins","loup","ogre","dragon","bandit","garde","valkyrie","liquorice",
  "vampire","witch","pretre","fantome","draugr","zombie","zombie2","golem",
  "balraug","fenrir","jormungand","kraken","nhiddog","roi"
]

/* ========================= */
/* MALÉDICTION               */
/* ========================= */

const curseWheelChoices = [
  { label:"-40% Vie",      icon:"💀", color:"#8b0000", description:"Votre vie est réduite de 40%" },
  { label:"Stat -4",       icon:"⬇",  color:"#4a0080", description:"Votre stat principale perd 4 points" },
  { label:"Critiques Only",icon:"⚔",  color:"#800040", description:"Au prochain combat, seuls les critiques comptent" },
  { label:"Perd un objet", icon:"🎒", color:"#603000", description:"Vous perdez le dernier objet de votre inventaire" }
]

/* ========================= */
/* RUNES                     */
/* ========================= */

const runeAlphabet = {
  "A":"ᚨ","B":"ᛒ","C":"ᚲ","D":"ᛞ","E":"ᛖ","F":"ᚠ","G":"ᚷ","H":"ᚺ",
  "I":"ᛁ","J":"ᛃ","K":"ᚲ","L":"ᛚ","M":"ᛗ","N":"ᚾ","O":"ᛟ","P":"ᛈ",
  "Q":"ᚲ","R":"ᚱ","S":"ᛊ","T":"ᛏ","U":"ᚢ","V":"ᚢ","W":"ᚹ","X":"ᛉ",
  "Y":"ᛃ","Z":"ᛉ",
  "a":"ᚨ","b":"ᛒ","c":"ᚲ","d":"ᛞ","e":"ᛖ","f":"ᚠ","g":"ᚷ","h":"ᚺ",
  "i":"ᛁ","j":"ᛃ","k":"ᚲ","l":"ᛚ","m":"ᛗ","n":"ᚾ","o":"ᛟ","p":"ᛈ",
  "q":"ᚲ","r":"ᚱ","s":"ᛊ","t":"ᛏ","u":"ᚢ","v":"ᚢ","w":"ᚹ","x":"ᛉ",
  "y":"ᛃ","z":"ᛉ",
  "é":"ᛖ","è":"ᛖ","ê":"ᛖ","à":"ᚨ","â":"ᚨ","ô":"ᛟ","î":"ᛁ","û":"ᚢ","ç":"ᚲ",
  "É":"ᛖ","È":"ᛖ","À":"ᚨ"
}

const runeHints = [
  { id:"hint1", runes:"ᚨ=A  ᛚ=L  ᛖ=E  ᚢ=U", desc:"Fragment I"    },
  { id:"hint2", runes:"ᛁ=I  ᛖ=E  ᚱ=R  ᛊ=S", desc:"Fragment II"   },
  { id:"hint3", runes:"ᛞ=D  ᛖ=E  ᚨ=A  ᛟ=O", desc:"Fragment III"  },
  { id:"hint4", runes:"ᛒ=B  ᚱ=R  ᚨ=A  ᚢ=V", desc:"Fragment IV"   },
  { id:"hint5", runes:"ᛏ=T  ᚱ=R  ᛁ=I  ᚾ=N", desc:"Fragment V"    },
  { id:"hint6", runes:"ᛟ=O  ᛞ=D  ᛁ=I  ᚾ=N", desc:"Fragment VI"   },
  { id:"hint7", runes:"ᚹ=W  ᛊ=S  ᛟ=O  ᛗ=M", desc:"Fragment VII"  },
  { id:"hint8", runes:"ᚷ=G  ᚨ=A  ᛈ=P",       desc:"Fragment VIII" }
]

const secretMessage = "A la lueur des aurores, les braves trinquent avec Odin au sommet de l'Arbre."
const secretAnswer  = "a la lueur des aurores les braves trinquent avec odin au sommet de larbre"

/* ========================= */
/* POUVOIR                   */
/* ========================= */

const playerPowerSounds = {
  greg: { file:"gregpower.mp3", fadeAt:3000 },
  ju:   { file:"jupower.mp3",   fadeAt:null  },
  elo:  { file:"elopower.mp3",  fadeAt:5000  },
  bibi: { file:"power.mp3",     fadeAt:null  }
}

/* ========================= */
/* VISION ODIN               */
/* ========================= */

const ODIN_VISIONS = [
  "Odin vous voit. Son œil unique suit votre route depuis Asgard.",
  "Le Père de Tous vous accorde son soutien. Portez-le dignement.",
  "Vos noms sont gravés dans le bois d'Yggdrasil.",
  "Les corbeaux ont rapporté vos actes. Odin est satisfait.",
  "La sagesse d'Odin guide vos pas. Ne faiblissez pas.",
  "Le Tout-Puissant a entendu vos prières. Il répond.",
  "Odin lève son sceptre en votre honneur. Valhalla vous observe.",
  "Le dieu borgne sourit. Votre chemin est juste.",
  "Munin se souvient de vous. Huginn vous accompagne.",
  "Par la volonté d'Odin, les runes vous livrent leurs secrets."
]

/* ========================= */
/* ÉVÉNEMENT RUNE PNJ        */
/* ========================= */

const runeEventDialogues = [
  "Ho, tant que j'y pense... j'ai trouvé ça, peut-être que ça peut vous être utile.",
  "Curieux... j'ai entendu dire que les anciens utilisaient ce symbole.",
  "Psst ! Gardez ça pour vous, mais j'ai vu cette marque gravée sur un vieux mur.",
  "Je ne sais pas si ça vaut quelque chose, mais tenez... j'ai trouvé ça ce matin.",
  "Les bardes chantent parfois ce signe... peut-être que ça vous dira quelque chose ?",
  "Mon grand-père m'avait montré ça. Je ne l'ai jamais compris, mais vous peut-être ?",
  "Étrange coïncidence que vous soyez là... j'ai quelque chose pour vous.",
  "Je ne suis pas sûr de ce que ça signifie, mais ça semblait important."
]

/* ========================= */
/* SORT CIMETIÈRE            */
/* ========================= */

const SPELL_PLAYERS   = ["greg","ju","elo"]
const SPELL_MAX_TRIES = 3

/* ========================= */
/* MULTI-MOBS                */
/* ========================= */

const MOB_SLOTS = ["mob","mob2","mob3"]

/* ========================= */
/* DIALOGUE INTRO            */
/* ========================= */

const dialogue = [
  { portrait:"tavernier.png", text:"Réveillez-vous étrangers !" },
  { portrait:"tavernier.png", text:"Vous êtes restés inconscients toute la nuit..." },
  { portrait:"serveuse.png",  text:"Bienvenue à Rivebois." }
]

/* ========================= */
/* PNJ ALLIÉS EN COMBAT      */
/* ========================= */

const ALLY_PNJS = [
  {
    id:      "odin",
    name:    "Odin",
    image:   "odin.png",
    role:    "Père de tous les dieux",
    color:   "#8866ff",
    lore:    "Le Tout-Père voit tout, sait tout. Sa lance Gungnir ne manque jamais sa cible.",
    actions: [
      {
        id:       "odin_gungnir",
        label:    "Lancer de Gungnir",
        type:     "damage",
        icon:     "⚡",
        desc:     "Odin jette sa lance sacrée. D20 × 25 dégâts. Critique 18-20 : dégâts × 4.",
        dice:     20,
        dmgBase:  200,
        dmgBonus: 25,
        critMin:  18,
        critMult: 4,
        dialogue: "Gungnir frappe vrai.",
      },
      {
        id:       "odin_ravens",
        label:    "Vision des corbeaux",
        type:     "malus",
        icon:     "🦅",
        desc:     "Huginn et Muninn révèlent les failles. D20 : sur 10+, le mob subit -15 à toutes ses actions.",
        dice:     20,
        threshold: 10,
        dialogue: "Mes corbeaux ont tout vu.",
      }
    ]
  },
  {
    id:      "thor",
    name:    "Thor",
    image:   "thor.png",
    role:    "Dieu du tonnerre",
    color:   "#ffaa00",
    lore:    "Fils d'Odin, gardien de Midgard. Mjolnir revient toujours dans sa main.",
    actions: [
      {
        id:       "thor_mjolnir",
        label:    "Mjolnir",
        type:     "damage",
        icon:     "🔨",
        desc:     "Thor abat Mjolnir. D20 × 30 dégâts. Sur 15+ : frappe tous les mobs en même temps.",
        dice:     20,
        dmgBase:  250,
        dmgBonus: 30,
        chainMin: 15,
        dialogue: "Par le tonnerre.",
      }
    ]
  },
  {
    id:      "freya",
    name:    "Freya",
    image:   "freya.png",
    role:    "Déesse de l'amour et de la guerre",
    color:   "#ff88cc",
    lore:    "Maîtresse de la seiðr, elle choisit la moitié des guerriers tombés.",
    actions: [
      {
        id:       "freya_valkyrie",
        label:    "Grâce des Valkyries",
        type:     "heal",
        icon:     "✦",
        desc:     "Freya bénit un héros. D20 × 20 HP restaurés. Critique 20 : résurrection complète.",
        dice:     20,
        healMult: 20,
        dialogue: "Les Valkyries veillent sur vous.",
      },
      {
        id:       "freya_seidr",
        label:    "Seiðr de guerre",
        type:     "damage",
        icon:     "🌙",
        desc:     "Freya tisse un sort dévastateur. D20 × 20 dégâts. Sur 1 : retour de flamme.",
        dice:     20,
        dmgBase:  180,
        dmgBonus: 20,
        dialogue: "La magie ancienne vous consume.",
      }
    ]
  },
  {
    id:      "witch",
    name:    "La Sorcière",
    image:   "witch.png",
    role:    "Gardienne des secrets oubliés",
    color:   "#44ffaa",
    lore:    "Nul ne connaît son vrai nom. Elle existe depuis avant les dieux.",
    actions: [
      {
        id:       "witch_hex",
        label:    "Malédiction ancienne",
        type:     "malus",
        icon:     "🌑",
        desc:     "Elle maudit l'ennemi en son cœur. D20 : sur 10+, le mob perd tout avantage ce combat.",
        dice:     20,
        threshold: 10,
        dialogue: "Tu portes désormais mon sceau.",
      },
      {
        id:       "witch_elixir",
        label:    "Élixir de puissance",
        type:     "buff",
        icon:     "⚗",
        desc:     "Elle tend un élixir à un héros. D20 × 10 ajoutés à sa stat principale.",
        dice:     20,
        buffMult: 10,
        dialogue: "Buvez. Ne posez pas de questions.",
      }
    ]
  }
]
