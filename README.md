# MewGenIA

## - Grac Matteo M1 MIAGE
## - Domingues Matthis M1 MIAGE

---

## 1. Démarche personnelle : Pourquoi ce jeu ?
* **Inspirations** : L'inspiration vient du fait d'essayer de faire un jeu avec les mecaniques de baldurs gate et un extraction game.
* **Le choix** : Etant des amateurs de MOBA et de baldurs gate. Nous voulons reussir a refaire certaines mecaniques de jeu et les melangers pour essayer avoir un gameplay dynamique.

## 2. Connexion au thème : L'Intelligence Artificielle

* **Intégration scénaristique ou visuelle** : L'IA est representé dans le monde du jeu avec des personnages robotique, cybernetiques et drones.
* **Mécaniques de jeu** : Le joueur est un personnage qui doit faire face  et survivre a des vagues d'ennemies et s'echaper a un certain point de la map (pas encore implementée).
* **Aspect technique** : Nous avons integré des behaviors basiques d'IA (AGGRESSIVE , FEARFUL , PATROLLER )

## 3. Difficultés rencontrées 

* **Problèmes techniques** : Un des defis technique majeur a été de fusionner 2 moteurs de physics diffrents car l'un prenait le dessus de l'autre dans une configuration classique :
    - **Havok :** pour gerer les colisions , la gravité.
    - **navMesh avec Recast :** gerer le deplacement d'entité avec le click de souris comme sur un RTS ou MOBA.

    Pour pallier a ce probleme nous avons decidé que lorsque le deplacement du du personnage avec le navMesh ce deplace. Cela crée un vecteur de direction en soustrayant avec sa position et la direction du prochain node du navMesh. Puis en donnant ce vecteur au aggragateBody en linearVelocity de l'entité.

---

## 4.Commandes 
* **necessite :**  Un clavier et surtout une **souris**
* **Contrôles :**  
    - **ZQSD** pour le deplacement de la camera. 
    - **espace** recentrer la camera sur le joueur et le suivre
    - **molette de la souris** zoom / de-zoom quand la camera suit le joueur
    - **click molette** + deplacement souris rotation autour du joueur
    - **W** arreter la navigation du joueur
    - **click gauche** deplacement.
    - **I** inventaire
    - **C** jump


## 5.Liens
* **Jeux :** https://mew-gen-ia.vercel.app/
* **youtube :**https://www.youtube.com/@MewGenIA 

