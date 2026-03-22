"use strict"

/* ========================= */
/* Ã‰TATS DU JEU              */
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
    // Stats secondaires â€” rÃ©parties dÃ©terministement mais variÃ©es
    const others = allStats.filter(s => s !== main)
    const chosen = []
    for (let i = 0; i < g.secCount; i++) {
      const seed = playerId.charCodeAt(0) + lvl * 7 + i * 31
      let idx = seed % others.length
      // Ã‰viter de choisir deux fois la mÃªme stat au mÃªme niveau
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
    { name:"Chat Bite (CaC)",      type:"MÃªlÃ©e",    dice:12, stat:"Force",        effect:"Morsure brutale",                                             crit:"DÃ©gÃ¢ts x2" },
    { name:"Le Bibi",              type:"SpÃ©cial",  dice:20, stat:"Chance",       effect:"Bibi attaque avec rage",                                      crit:"Bibi entre en rage, -2 HP mobs pendant 3 tours" },
    { name:"I know Frank (si arc)",type:"Distance", dice:12, stat:"PerspicacitÃ©", effect:"Tir prÃ©cis arc",                                              crit:"DÃ©gÃ¢ts x2 et saignement, -1 HP pendant 2 tours" }
  ],
  ju: [
    { name:"DÃ©pÃªche-toi !!!",  type:"Charme",  dice:12, stat:"PerspicacitÃ©", effect:"L'ennemi cible Ju. AlliÃ©s +1 dÃ©gats",                        crit:"Mobs n'attaquent pas au prochain tour" },
    { name:"Spider Sense",     type:"Analyse", dice:10, stat:"PerspicacitÃ©", effect:"RÃ©vÃ¨le les faiblesses",                                      crit:"Augmente le loot de la victoire" },
    { name:"Petite merde",     type:"Attaque", dice:12, stat:"Force",        effect:"Attaque humiliante. Si utilisÃ© aprÃ¨s Spider sense, dÃ©gÃ¢ts x2", crit:"l'ennemi est humiliÃ©, -1 attaque pendant 2 tours" }
  ],
  elo: [
    { name:"Mains magiques",                  type:"Soin",      dice:12, stat:"Defense", effect:"Restaure HP Ã  soi ou alliÃ©",                                                     crit:"Pv restaurÃ©s x2" },
    { name:"Je vais te raconter une histoire",type:"Sort",      dice:12, stat:"Charme",  effect:"invoque les forces de la nature. DÃ©gats double en forÃªt ou mine",                crit:"L'ennemi est empoisonnÃ©, -2 hp pendant 2 tours" },
    { name:"Je suis jet laguÃ©e",              type:"Invocation",dice:12, stat:"Chance",  effect:"Invoque un familier. D4 dÃ©gats cumulÃ©s, disparait aprÃ¨s 3 tours ou si mort",    crit:"Le familier devient fou, dÃ©gats x2 et attaque tous les mobs" }
  ]
}

/* ========================= */
/* ATTAQUES MOBS             */
/* ========================= */

const mobAttacks = {
  weak: [
    { name:"Attaque",             icon:"?",  dmgMin:5,  dmgMax:10, effect:null,    desc:"Frappe basique",                 hitDC:7 },
    { name:"Embuscade sournoise", icon:"??", dmgMin:8,  dmgMax:15, effect:null,    desc:"Sp?ciale ? une fois par combat", hitDC:14, special:true }
  ],
  medium: [
    { name:"Frappe",              icon:"?",  dmgMin:8,  dmgMax:16, effect:null,    desc:"Attaque normale",                hitDC:8 },
    { name:"Assaut brutal",       icon:"??", dmgMin:12, dmgMax:22, effect:"stun",  desc:"?tourdit la cible",              hitDC:10 },
    { name:"Perc?e meurtri?re",   icon:"??", dmgMin:16, dmgMax:28, effect:null,    desc:"Sp?ciale ? une fois par combat", hitDC:15, special:true }
  ],
  high: [
    { name:"Coup puissant",       icon:"?",  dmgMin:17, dmgMax:28, effect:null,    desc:"Frappe puissante",               hitDC:9 },
    { name:"Attaque de zone",     icon:"??", dmgMin:10, dmgMax:18, effect:"all",   desc:"Touche tous les joueurs",        hitDC:11 },
    { name:"Capacit? sp?ciale",   icon:"?", dmgMin:18, dmgMax:32, effect:"curse", desc:"+1 mal?diction",                 hitDC:12 },
    { name:"Ex?cution funeste",   icon:"?", dmgMin:24, dmgMax:38, effect:null,    desc:"Sp?ciale ? une fois par combat", hitDC:16, special:true }
  ],
  boss: [
    { name:"Frappe d?vastatrice", icon:"??", dmgMin:28, dmgMax:48, effect:null,     desc:"D?g?ts massifs",                  hitDC:10 },
    { name:"Rugissement",         icon:"??", dmgMin:12, dmgMax:22, effect:"debuff", desc:"Force/D?fense -2 pendant 2 tours", hitDC:11 },
    { name:"Pouvoir ultime",      icon:"?", dmgMin:34, dmgMax:58, effect:"all",    desc:"Frappe TOUS les joueurs",         hitDC:13 },
    { name:"Cataclysme",          icon:"?", dmgMin:40, dmgMax:72, effect:null,     desc:"Sp?ciale ? une fois par combat", hitDC:17, special:true }
  ]
}

function getMobDamage(attack, mobLvl) {
  const factor = 1 + (mobLvl - 1) * 0.15
  const min = Math.round(attack.dmgMin * factor)
  const max = Math.round(attack.dmgMax * factor)
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
  "marche.jpg":          "Place du marchÃ©",
  "foret.jpg":           "ForÃªt enchantÃ©e",
  "arbre.jpg":           "Arbre Monde",
  "castleofevil.jpg":    "The Castle of Evil",
  "cimetiere.jpg":       "CimetiÃ¨re ancien",
  "mine.jpg":            "Mine du vent d'Est",
  "prebalraug.jpg":      "Salle principal",
  "port.jpg":            "La CitÃ© du Nord Brume",
  "portail.jpg":         "Portail de VÃ©ritÃ©",
  "trou.jpg":            "Passage de l'Antre monde",
  "cristaux.jpg":        "Cristal de vÃ©ritÃ©",
  "tourbillon.jpg":      "Le Maelestrom",
  "interieurcastle.jpg": "Salle principale",
  "throne.jpg":          "Throne",
  "bateaunord.png":      "Port de Brume",
  "bifrost.jpg":         "Bifrost",
  "MAPMONDE.jpg":        "MAP MONDE",
  "chasseuraurore.jpg":  "Camp des Chasseurs d'Aurore",
  "tenteaurore.jpg":     "Tente du GÃ©nÃ©ral MÃ©lenchon",
  "antre.jpg":           "L'Antre monde",
  "egout.jpg":           "ðŸŒŠ Ã‰gout de Brume",
  "bateau.jpg":           "Le for sure",
  "bateau1.jpg":         "L'Oregon III",
  "tavernebrume.png":    "Taverne de Brume",
  "armurerie1.jpg":      "Armurerie de Brume",
  "balduregout.jpg":     "Salle secrÃ¨te de Baldur",
  "marche1.jpg":         "Place du MarchÃ© de Brume",
  "mairemaison.jpg":     "ðŸ› Mairie de Rivebois",
  "epouventail.jpg":     "",
  "asgard.jpg":          "âš¡ La citÃ© des dieux Asgard",
  "rivebois.jpg":        "ðŸ˜ Rivebois",
  "ruines.jpg":          "ðŸš Ruines du village du Jarl Baldur",
  "niflheim.jpg":        "ðŸŒŠ CitÃ© engloutie Niflheim",
  "hvergelmir.jpg":      "ðŸŒŠ Source sacrÃ©e Hvergelmir"
}

/* ========================= */
/* SHOP                      */
/* ========================= */

const shopItemsArmurerie = [
  { id:"epee",         name:"Ã‰pÃ©e",             img:"epee.png",         category:"arme",   basePrix:60,  baseStats:"Force +2",        scaling:8  },
  { id:"arc",          name:"Arc",              img:"arc.png",          category:"arme",   basePrix:70,  baseStats:"PrÃ©cision +2",    scaling:8  },
  { id:"masse",        name:"Masse",            img:"masse.png",        category:"arme",   basePrix:65,  baseStats:"Force +3",        scaling:9  },
  { id:"baton",        name:"BÃ¢ton",            img:"baton.png",        category:"arme",   basePrix:55,  baseStats:"Magie +2",        scaling:7  },
  { id:"bouclier",     name:"Bouclier",         img:"bouclier.png",     category:"arme",   basePrix:70,  baseStats:"DÃ©fense +3",      scaling:8  },
  { id:"fleches",      name:"FlÃ¨ches (x10)",    img:"fleche.png",       category:"arme",   basePrix:25,  baseStats:"Munitions",       scaling:3  },
  { id:"armleg",       name:"Armure LÃ©gÃ¨re",    img:"armurelegere.png", category:"armure", basePrix:90,  baseStats:"DÃ©fense +2",      scaling:10 },
  { id:"armlour",      name:"Armure Lourde",    img:"armurelourde.png", category:"armure", basePrix:150, baseStats:"DÃ©fense +5",      scaling:15 },
  { id:"anneauforce",  name:"Anneau de Force",  img:"anneau1.png",      category:"armure", basePrix:120, baseStats:"Force +2",        scaling:12 },
  { id:"anneaucharme", name:"Anneau de Charme", img:"anneau2.png",      category:"armure", basePrix:120, baseStats:"Charme +2",       scaling:12 },
  { id:"anneauperspi", name:"Anneau de Perspic.",img:"anneau1.png",     category:"armure", basePrix:120, baseStats:"PerspicacitÃ© +2", scaling:12 },
  { id:"anneauchance", name:"Anneau de Chance", img:"anneau2.png",      category:"armure", basePrix:120, baseStats:"Chance +2",       scaling:12 },
  { id:"anneaudef",    name:"Anneau de DÃ©fense",img:"anneau1.png",      category:"armure", basePrix:120, baseStats:"DÃ©fense +2",      scaling:12 }
]

const shopItems = [
  { id:"sort",       name:"Parchemin Sort",  img:"sort.png",      category:"magie",   basePrix:100, baseStats:"Sort unique",  scaling:12 },
  { id:"anneaumagic",name:"Anneau Mystique", img:"anneau1.png",   category:"magie",   basePrix:130, baseStats:"Magie +3",     scaling:13 },
  { id:"potion",     name:"Potion de Vie",   img:"potionvie.png", category:"consomm", basePrix:50,  baseStats:"Vie +30",      scaling:5  },
  { id:"potionres",  name:"Potion de RÃ©s.",  img:"potionres.png", category:"consomm", basePrix:300, baseStats:"RÃ©surrection", scaling:20 },
  { id:"lanterne",   name:"Lanterne",        img:"lanterne.png",  category:"util",    basePrix:30,  baseStats:"Vision nuit",  scaling:2  },
  { id:"torche",     name:"Torche",          img:"torche.png",    category:"util",    basePrix:15,  baseStats:"Ã‰clairage",    scaling:1  },
  { id:"corde",      name:"Corde/Grappin",   img:"corde.png",     category:"util",    basePrix:25,  baseStats:"UtilitÃ©",      scaling:2  },
  { id:"selle",      name:"Selle de Bibi",   img:"bag.png",       category:"util",    basePrix:80,  baseStats:"Poids +",      scaling:5  },
  { id:"pioche",     name:"Pioche",          img:"pioche.png",    category:"util",    basePrix:40,  baseStats:"Minage",       scaling:3  },
  { id:"amulette",   name:"Amulette SacrÃ©e", img:"anneau2.png",   category:"util",    basePrix:150, baseStats:"Curse -1",     scaling:10 },
  { id:"pierresoin", name:"Pierre de Soin",  img:"sort.png",      category:"util",    basePrix:120, baseStats:"+5 HP/tour",   scaling:8  }
]

const categoryLabels = {
  arme:"âš” Armes", armure:"ðŸ›¡ Armures", magie:"âœ¨ Magie", consomm:"ðŸ§ª Consommables", util:"ðŸ”§ Utilitaires"
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
/* MALÃ‰DICTION               */
/* ========================= */

const curseWheelChoices = [
  { label:"-40% Vie",      icon:"ðŸ’€", color:"#8b0000", description:"Votre vie est rÃ©duite de 40%" },
  { label:"Stat -4",       icon:"â¬‡",  color:"#4a0080", description:"Votre stat principale perd 4 points" },
  { label:"Critiques Only",icon:"âš”",  color:"#800040", description:"Au prochain combat, seuls les critiques comptent" },
  { label:"Perd un objet", icon:"ðŸŽ’", color:"#603000", description:"Vous perdez le dernier objet de votre inventaire" }
]

/* ========================= */
/* RUNES                     */
/* ========================= */

const runeAlphabet = {
  "A":"áš¨","B":"á›’","C":"áš²","D":"á›ž","E":"á›–","F":"áš ","G":"áš·","H":"ášº",
  "I":"á›","J":"á›ƒ","K":"áš²","L":"á›š","M":"á›—","N":"áš¾","O":"á›Ÿ","P":"á›ˆ",
  "Q":"áš²","R":"áš±","S":"á›Š","T":"á›","U":"áš¢","V":"áš¢","W":"áš¹","X":"á›‰",
  "Y":"á›ƒ","Z":"á›‰",
  "a":"áš¨","b":"á›’","c":"áš²","d":"á›ž","e":"á›–","f":"áš ","g":"áš·","h":"ášº",
  "i":"á›","j":"á›ƒ","k":"áš²","l":"á›š","m":"á›—","n":"áš¾","o":"á›Ÿ","p":"á›ˆ",
  "q":"áš²","r":"áš±","s":"á›Š","t":"á›","u":"áš¢","v":"áš¢","w":"áš¹","x":"á›‰",
  "y":"á›ƒ","z":"á›‰",
  "Ã©":"á›–","Ã¨":"á›–","Ãª":"á›–","Ã ":"áš¨","Ã¢":"áš¨","Ã´":"á›Ÿ","Ã®":"á›","Ã»":"áš¢","Ã§":"áš²",
  "Ã‰":"á›–","Ãˆ":"á›–","Ã€":"áš¨"
}

const runeHints = [
  { id:"hint1", runes:"áš¨=A  á›š=L  á›–=E  áš¢=U", desc:"Fragment I"    },
  { id:"hint2", runes:"á›=I  á›–=E  áš±=R  á›Š=S", desc:"Fragment II"   },
  { id:"hint3", runes:"á›ž=D  á›–=E  áš¨=A  á›Ÿ=O", desc:"Fragment III"  },
  { id:"hint4", runes:"á›’=B  áš±=R  áš¨=A  áš¢=V", desc:"Fragment IV"   },
  { id:"hint5", runes:"á›=T  áš±=R  á›=I  áš¾=N", desc:"Fragment V"    },
  { id:"hint6", runes:"á›Ÿ=O  á›ž=D  á›=I  áš¾=N", desc:"Fragment VI"   },
  { id:"hint7", runes:"áš¹=W  á›Š=S  á›Ÿ=O  á›—=M", desc:"Fragment VII"  },
  { id:"hint8", runes:"áš·=G  áš¨=A  á›ˆ=P",       desc:"Fragment VIII" }
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
  "Odin vous voit. Son Å“il unique suit votre route depuis Asgard.",
  "Le PÃ¨re de Tous vous accorde son soutien. Portez-le dignement.",
  "Vos noms sont gravÃ©s dans le bois d'Yggdrasil.",
  "Les corbeaux ont rapportÃ© vos actes. Odin est satisfait.",
  "La sagesse d'Odin guide vos pas. Ne faiblissez pas.",
  "Le Tout-Puissant a entendu vos priÃ¨res. Il rÃ©pond.",
  "Odin lÃ¨ve son sceptre en votre honneur. Valhalla vous observe.",
  "Le dieu borgne sourit. Votre chemin est juste.",
  "Munin se souvient de vous. Huginn vous accompagne.",
  "Par la volontÃ© d'Odin, les runes vous livrent leurs secrets."
]

/* ========================= */
/* Ã‰VÃ‰NEMENT RUNE PNJ        */
/* ========================= */

const runeEventDialogues = [
  "Ho, tant que j'y pense... j'ai trouvÃ© Ã§a, peut-Ãªtre que Ã§a peut vous Ãªtre utile.",
  "Curieux... j'ai entendu dire que les anciens utilisaient ce symbole.",
  "Psst ! Gardez Ã§a pour vous, mais j'ai vu cette marque gravÃ©e sur un vieux mur.",
  "Je ne sais pas si Ã§a vaut quelque chose, mais tenez... j'ai trouvÃ© Ã§a ce matin.",
  "Les bardes chantent parfois ce signe... peut-Ãªtre que Ã§a vous dira quelque chose ?",
  "Mon grand-pÃ¨re m'avait montrÃ© Ã§a. Je ne l'ai jamais compris, mais vous peut-Ãªtre ?",
  "Ã‰trange coÃ¯ncidence que vous soyez lÃ ... j'ai quelque chose pour vous.",
  "Je ne suis pas sÃ»r de ce que Ã§a signifie, mais Ã§a semblait important."
]

/* ========================= */
/* SORT CIMETIÃˆRE            */
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
  { portrait:"tavernier.png", text:"RÃ©veillez-vous Ã©trangers !" },
  { portrait:"tavernier.png", text:"Vous Ãªtes restÃ©s inconscients toute la nuit..." },
  { portrait:"serveuse.png",  text:"Bienvenue Ã  Rivebois." }
]

/* ========================= */
/* PNJ ALLIÃ‰S EN COMBAT      */
/* ========================= */

const ALLY_PNJS = [
  {
    id:      "odin",
    name:    "Odin",
    image:   "odin.png",
    role:    "PÃ¨re de tous les dieux",
    color:   "#8866ff",
    lore:    "Le Tout-PÃ¨re voit tout, sait tout. Sa lance Gungnir ne manque jamais sa cible.",
    actions: [
      {
        id:       "odin_gungnir",
        label:    "Lancer de Gungnir",
        type:     "damage",
        icon:     "âš¡",
        desc:     "Odin jette sa lance sacrÃ©e. D20 Ã— 25 dÃ©gÃ¢ts. Critique 18-20 : dÃ©gÃ¢ts Ã— 4.",
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
        icon:     "ðŸ¦…",
        desc:     "Huginn et Muninn rÃ©vÃ¨lent les failles. D20 : sur 10+, le mob subit -15 Ã  toutes ses actions.",
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
        icon:     "ðŸ”¨",
        desc:     "Thor abat Mjolnir. D20 Ã— 30 dÃ©gÃ¢ts. Sur 15+ : frappe tous les mobs en mÃªme temps.",
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
    role:    "DÃ©esse de l'amour et de la guerre",
    color:   "#ff88cc",
    lore:    "MaÃ®tresse de la seiÃ°r, elle choisit la moitiÃ© des guerriers tombÃ©s.",
    actions: [
      {
        id:       "freya_valkyrie",
        label:    "GrÃ¢ce des Valkyries",
        type:     "heal",
        icon:     "âœ¦",
        desc:     "Freya bÃ©nit un hÃ©ros. D20 Ã— 20 HP restaurÃ©s. Critique 20 : rÃ©surrection complÃ¨te.",
        dice:     20,
        healMult: 20,
        dialogue: "Les Valkyries veillent sur vous.",
      },
      {
        id:       "freya_seidr",
        label:    "SeiÃ°r de guerre",
        type:     "damage",
        icon:     "ðŸŒ™",
        desc:     "Freya tisse un sort dÃ©vastateur. D20 Ã— 20 dÃ©gÃ¢ts. Sur 1 : retour de flamme.",
        dice:     20,
        dmgBase:  180,
        dmgBonus: 20,
        dialogue: "La magie ancienne vous consume.",
      }
    ]
  },
  {
    id:      "witch",
    name:    "La SorciÃ¨re",
    image:   "witch.png",
    role:    "Gardienne des secrets oubliÃ©s",
    color:   "#44ffaa",
    lore:    "Nul ne connaÃ®t son vrai nom. Elle existe depuis avant les dieux.",
    actions: [
      {
        id:       "witch_hex",
        label:    "MalÃ©diction ancienne",
        type:     "malus",
        icon:     "ðŸŒ‘",
        desc:     "Elle maudit l'ennemi en son cÅ“ur. D20 : sur 10+, le mob perd tout avantage ce combat.",
        dice:     20,
        threshold: 10,
        dialogue: "Tu portes dÃ©sormais mon sceau.",
      },
      {
        id:       "witch_elixir",
        label:    "Ã‰lixir de puissance",
        type:     "buff",
        icon:     "âš—",
        desc:     "Elle tend un Ã©lixir Ã  un hÃ©ros. D20 Ã— 10 ajoutÃ©s Ã  sa stat principale.",
        dice:     20,
        buffMult: 10,
        dialogue: "Buvez. Ne posez pas de questions.",
      }
    ]
  }
]

