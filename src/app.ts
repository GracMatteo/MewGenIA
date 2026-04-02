import { Engine } from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";
import Recast from "recast-detour";
import { LevelManager } from "./game/LevelManager";
import "@babylonjs/inspector";

class App {
    private _canvas: HTMLCanvasElement;
    private _engine: Engine;
    private _levelManager!: LevelManager;

    private _havokInstance: any;
    private _recastInstance: any;

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
        this._initDebug();

        window.addEventListener("resize", () => this._engine.resize());
    }

    private _initDebug(): void {
        window.addEventListener("keydown", (event) => {
            const scene = this._levelManager.currentScene;
            if (!scene || event.key !== "v") {
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
