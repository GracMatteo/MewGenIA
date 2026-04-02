import { Engine, Scene } from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";
import Recast from "recast-detour";
import { LevelManager } from "./game/LevelManager";
import { MainMenu } from "./game/Scene/MainMenu";
import { GameScene } from "./game/Scene/Game";
import { AssetManager } from "./game/AssetManager";

class App {
    private _canvas: HTMLCanvasElement;
    private _engine: Engine;
    private _levelManager!: LevelManager;

    private _havokInstance: any;
    private _recastInstance: any;
    private _scene: any;

    constructor() {
        this._canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
        this._engine = new Engine(this._canvas, true);
        this._init();
    }

    private async _init() {
        const [havok, recast] = await Promise.all([
            HavokPhysics({
                locateFile: () => "HavokPhysics.wasm"
            }),
            (Recast as any).apply(window)
        ]);

        this._havokInstance = havok;
        this._recastInstance = recast;

        this._levelManager = new LevelManager(
            this._engine,
            this._havokInstance,
            this._recastInstance
        );

        this._engine.runRenderLoop(() => {
            this._levelManager.currentScene?.render();
        });

        this._levelManager.goToMainMenu();
        window.addEventListener("resize", () => this._engine.resize());
    }


    private _initDebug(scene: Scene, gameInstance: GameScene): void {
        window.addEventListener("keydown", (event) => {
            const scene = this._levelManager.currentScene;
            if (!scene || event.key !== "x") {
                return;
            }

            if (scene.debugLayer.isVisible()) {
                scene.debugLayer.hide();
            } else {
                scene.debugLayer.show({
                    embedMode: true
                });
            }
        });
    }
}

new App();
