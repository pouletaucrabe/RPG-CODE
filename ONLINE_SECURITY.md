# Sécurisation en ligne

Le jeu actuel n'est pas réellement sécurisé en ligne tant que le rôle MJ repose seulement sur `isGM` côté client et sur le mot de passe visible dans le code.

## Ce que j'ai préparé

Le fichier [firebase.database.rules.json](/C:/Users/Poulet/Pictures/RPG/RPG CODE/firebase.database.rules.json) contient une base de règles Realtime Database plus stricte, pensée pour ton arborescence actuelle:

- lecture réservée aux utilisateurs connectés,
- écritures globales sensibles réservées au MJ,
- écritures personnage/token limitées au joueur propriétaire ou au MJ,
- bornes simples sur plusieurs champs critiques (`hp`, `curse`, `corruption`, `gold`, etc.).

## Important

Ces règles supposent une vraie authentification Firebase.

Si tu publies ces règles sans auth:

- les joueurs ne pourront plus lire/écrire,
- le jeu semblera cassé,
- ce n'est pas un bug du front, c'est normal.

## Modèle recommandé

Utiliser deux nœuds simples:

- `roles/<uid> = "gm"` ou `"player"`
- `profiles/<uid>/playerId = "greg" | "ju" | "elo" | "bibi"`

Exemple:

```json
{
  "roles": {
    "UID_DU_MJ": "gm",
    "UID_JOUEUR_1": "player"
  },
  "profiles": {
    "UID_JOUEUR_1": {
      "playerId": "greg"
    }
  }
}
```

## Ce que ça protège

- un joueur ne peut plus se mettre MJ juste avec la console,
- un joueur ne peut plus modifier librement `game/*`, `combat/*`, `events/*`, `elements/*`,
- un joueur ne devrait écrire que sur son personnage et son token.

## Ce que ça ne règle pas encore

- le jeu n'utilise pas encore Firebase Auth côté front,
- le choix du personnage n'est pas encore lié à `auth.uid`,
- le mot de passe MJ dans [game.js](/C:/Users/Poulet/Pictures/RPG/RPG CODE/game.js) reste une logique locale.

## Plan sans casser le jeu

1. Activer Firebase Auth, idéalement en anonyme ou email simple.
2. Créer les nœuds `roles` et `profiles` dans la base.
3. Connecter chaque joueur.
4. Faire correspondre `auth.uid` à `profiles/<uid>/playerId`.
5. Publier les règles.
6. Ensuite seulement, retirer la confiance dans `isGM` côté client.

## Mon conseil

La voie la moins risquée pour toi:

- d'abord brancher une connexion anonyme Firebase,
- puis affecter manuellement les rôles et `playerId` dans la base,
- puis activer ces règles,
- puis seulement ensuite remplacer le mot de passe MJ local par un vrai rôle Firebase.
