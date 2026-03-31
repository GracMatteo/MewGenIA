# Scene Manager Refactor Explanation

## Goal

The goal of this refactor was to make scene and level switching easier from the main menu.

Before the change:

- `app.ts` directly controlled the menu and game transitions
- both menu buttons called the same callback
- there was only one gameplay scene flow
- `LevelManager.ts` existed but was empty

After the change:

- scene navigation is handled by a dedicated `LevelManager`
- the menu can choose a specific level
- one reusable `GameScene` can load different level layouts
- the player can return to the main menu with `Escape`

## What Changed

### 1. `src/game/LevelTypes.ts`

This file was added to centralize level-related types.

It contains:

- `LEVEL_IDS`
- `LevelId`
- `LevelDefinition`

Why this helps:

- level ids are now stable and shared everywhere
- the menu, manager, and gameplay scene all use the same identifiers
- adding a new level is easier and safer

Current level ids:

- `level1`
- `testingGround`

### 2. `src/game/LevelManager.ts`

This is the new center of scene flow.

Responsibilities:

- store the current Babylon scene
- store the current game state
- store the selected level id
- build the main menu
- load the selected gameplay level
- dispose the previous scene before switching

Main methods:

- `goToMainMenu()`
- `loadLevel(levelId)`

What it does:

- creates `MainMenu`
- listens to the selected level from the menu
- creates `GameScene` with the chosen level definition
- passes a callback to `GameScene` so gameplay can return to menu

This removes hardcoded navigation logic from `app.ts`.

### 3. `src/app.ts`

`app.ts` was simplified.

It now only:

- creates the Babylon `Engine`
- initializes Havok and Recast once
- creates the `LevelManager`
- starts the render loop
- asks the manager to open the main menu
- keeps the Babylon debug toggle on `x`

Why this is better:

- `app.ts` is now focused on bootstrapping
- scene transition logic is no longer mixed into startup code
- future scene additions will not require more transition methods here

### 4. `src/game/Scene/MainMenu.ts`

The menu now reports an explicit level selection.

Before:

- it exposed `onPlayPressed: () => void`
- both buttons triggered the same action

Now:

- it exposes `onLevelSelected: (levelId: LevelId) => void`
- buttons are created from the level catalog
- each button sends its own level id

Why this is better:

- the menu is now data-driven
- buttons are connected to actual level ids
- adding a new level can be done by extending the catalog

### 5. `src/game/Scene/Game.ts`

`GameScene` was refactored so it can build different level layouts.

Constructor changes:

- it now receives a `LevelDefinition`
- it now receives an `onReturnToMenu` callback

New behavior:

- `GameScene` checks which level was selected
- it builds the proper geometry using dedicated methods
- pressing `Escape` triggers the return callback

New internal structure:

- `_initLevel(levelId)`
- `_buildLevel(levelId)`
- `_buildLevel1()`
- `_buildTestingGround()`
- `_setupMenuShortcut()`

Important detail:

- shared systems were kept in one place:
  - physics
  - navmesh
  - crowd
  - camera
  - UI
  - lighting
  - click-to-move

That means the scene stays reusable, and only the level layout changes.

### 6. Minor TypeScript cleanup

To make the project build cleanly, I also fixed a few existing TypeScript issues:

- unused constructor parameters in `src/game/entities/Entity.ts`
- unused Babylon imports in `src/game/entities/player/Player.ts`

These changes were not part of the scene-manager feature itself, but they were necessary to get a successful build.

## Scene Flow Now

The flow is now:

1. `app.ts` starts the engine and creates `LevelManager`
2. `LevelManager.goToMainMenu()` creates the menu scene
3. the user clicks `LvL 1` or `TESTING GROUND`
4. `MainMenu` sends the selected `levelId`
5. `LevelManager.loadLevel(levelId)` disposes the menu scene
6. `LevelManager` creates `GameScene` with that level
7. `GameScene` builds the chosen layout
8. pressing `Escape` calls back into `LevelManager.goToMainMenu()`

## Why This Design Is Useful

This structure makes the project easier to grow.

Benefits:

- cleaner separation between startup, navigation, and gameplay
- easier to add more levels later
- less duplicated logic
- easier menu-to-level wiring
- safer scene disposal when switching

If you add a new level later, the main work is:

1. add a new id in `LevelTypes.ts`
2. add a new entry in the level catalog in `LevelManager.ts`
3. add a new builder method in `Game.ts`

## Verification

After these changes, the project was verified with:

```bash
npm run build
```

The build passed successfully.
