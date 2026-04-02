import { Engine, Scene } from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";
import Recast from "recast-detour"; // Import de Recast
import { MainMenu } from "./game/Scene/MainMenu";
import { GameScene } from "./game/Scene/Game";
import { AssetManager } from "./game/AssetManager";

class App {
    private _canvas: HTMLCanvasElement;
    private _engine: Engine;
    private _scene!: Scene;
    
    // Instances des moteurs externes
    private _havokInstance: any;
    private _recastInstance: any;

    constructor() {
        this._canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
        this._engine = new Engine(this._canvas, true);

        // Lancement du cycle d'initialisation
        this._init();
    }

    private async _init() {
        // 1. Initialiser les bibliothèques WASM en parallèle
        // On attend que Havok et Recast soient prêts avant de continuer
        const [havok, recast] = await Promise.all([
            HavokPhysics({
                locateFile: () => "HavokPhysics.wasm"
            }),
            (Recast as any).apply(window) // Initialisation spécifique à recast-detour
        ]);

        this._havokInstance = havok;
        this._recastInstance = recast;

        // 2. Lancer la boucle de rendu globale
        this._engine.runRenderLoop(() => {
            if (this._scene) {
                this._scene.render();
            }
        });

        // 3. Aller au menu principal
        this._goToMainMenu();

        window.addEventListener("resize", () => this._engine.resize());
    }

    private _goToMainMenu() {
        this._scene?.dispose(); // Nettoie la scène actuelle
        
        const menu = new MainMenu(this._engine);
        this._scene = menu.scene;

        menu.onPlayPressed = () => {
            this._goToGame();
        };
    }

    private async _goToGame() {
        this._engine.displayLoadingUI();
        this._scene?.dispose();
        // On passe havokInstance ET recastInstance à la GameScene
        const game = new GameScene(
            this._engine, 
            this._havokInstance, 
            this._recastInstance
        );
        
        this._scene = game.scene;
        this._initDebug(this._scene, game); // On passe l'instance game pour le debug du player
        await Promise.all(
        [
            AssetManager.loadModel("/models/player.glb",this._scene),
            AssetManager.loadModel("/models/ai_soldier.glb", this._scene),
        ]);
        this._engine.hideLoadingUI();
    }

    private _initDebug(scene: Scene, gameInstance: GameScene): void {
        window.addEventListener("keydown", (event) => {
            // 'x' pour l'inspecteur Babylon
            if (event.key === "x") { 
                if (scene.debugLayer.isVisible()) {
                    scene.debugLayer.hide();
                } else {
                    scene.debugLayer.show({
                        embedMode: true,
                    });
                }
            }

            
        });
    }
}

new App();