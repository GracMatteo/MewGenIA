import type { Engine, Scene } from "@babylonjs/core";
import { GameState } from "./GameState";
import { LEVEL_IDS, type LevelDefinition, type LevelId } from "./LevelTypes";
import { GameScene } from "./Scene/Game";
import { MainMenu } from "./Scene/MainMenu";

const LEVEL_CATALOG: LevelDefinition[] = [
    {
        id: LEVEL_IDS.LEVEL_1,
        label: "LvL 1",
        description: "Main playable level"
    },
    {
        id: LEVEL_IDS.TESTING_GROUND,
        label: "TESTING GROUND",
        description: "Sandbox for testing mechanics"
    }
];

export class LevelManager {
    private _engine: Engine;
    private _havokInstance: unknown;
    private _recastInstance: unknown;
    private _currentScene: Scene | null = null;
    private _currentState: typeof GameState[keyof typeof GameState] = GameState.MAIN_MENU;
    private _selectedLevel: LevelId | null = null;

    constructor(engine: Engine, havokInstance: unknown, recastInstance: unknown) {
        this._engine = engine;
        this._havokInstance = havokInstance;
        this._recastInstance = recastInstance;
    }

    public get currentScene(): Scene | null {
        return this._currentScene;
    }

    public get currentState(): typeof GameState[keyof typeof GameState] {
        return this._currentState;
    }

    public get selectedLevel(): LevelId | null {
        return this._selectedLevel;
    }

    public get levels(): LevelDefinition[] {
        return LEVEL_CATALOG;
    }

    public goToMainMenu(): void {
        this._disposeCurrentScene();

        const menu = new MainMenu(this._engine, LEVEL_CATALOG);
        menu.onLevelSelected = (levelId) => {
            this.loadLevel(levelId);
        };

        this._currentScene = menu.scene;
        this._currentState = GameState.MAIN_MENU;
        this._selectedLevel = null;
    }

    public loadLevel(levelId: LevelId): void {
        const selectedLevel = LEVEL_CATALOG.find((level) => level.id === levelId);
        if (!selectedLevel) {
            throw new Error(`Unknown level id: ${levelId}`);
        }

        this._engine.displayLoadingUI();
        try {
            this._disposeCurrentScene();

            const game = new GameScene(
                this._engine,
                this._havokInstance,
                this._recastInstance,
                selectedLevel,
                () => this.goToMainMenu()
            );

            this._currentScene = game.scene;
            this._currentState = GameState.IN_GAME;
            this._selectedLevel = selectedLevel.id;
        } finally {
            this._engine.hideLoadingUI();
        }
    }

    private _disposeCurrentScene(): void {
        this._currentScene?.dispose();
        this._currentScene = null;
    }
}
