import { Engine, Scene } from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";
import { MainMenu } from "./game/Scene/MainMenu";
import { GameScene } from "./game/Scene/Game";

class App 
{
    private _canvas: HTMLCanvasElement;
    private _engine: Engine;
    private _scene!: Scene;
    private _havokInstance: any;

    constructor() {
        this._canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
        this._engine = new Engine(this._canvas, true);

        // Lancement du cycle
        this._init();
    }

    private async _init() {
        // Initialiser Havok une seule fois
        this._havokInstance = await HavokPhysics({
            locateFile: () => "HavokPhysics.wasm"
        });

        // Lancer la boucle de rendu globale
        this._engine.runRenderLoop(() => {
            if (this._scene) {
                this._scene.render();
            }
        });

        this._goToMainMenu();

        window.addEventListener("resize", () => this._engine.resize());
    }

    private _goToMainMenu() {
        this._scene?.dispose(); // Nettoie la scène actuelle si elle existe
        
        const menu = new MainMenu(this._engine);
        this._scene = menu.scene;

        menu.onPlayPressed = () => {
            this._goToGame();
        };
    }

    private _goToGame() {
        this._engine.displayLoadingUI();
        
        this._scene?.dispose();
        const game = new GameScene(this._engine, this._havokInstance);
        this._scene = game.scene;
        this._initDebug(this._scene);
        this._engine.hideLoadingUI();
    }

    private _initDebug(scene: Scene): void {
        window.addEventListener("keydown", (event) => {
            // Ctrl + Shift + I (ou juste 'i' selon ta préférence)
            if (event.key === "x") { 
                if (scene.debugLayer.isVisible()) {
                    scene.debugLayer.hide();
                } else {
                    scene.debugLayer.show({
                        embedMode: true, // L'affiche dans le canvas au lieu d'une popup
                    });
                }
            }
            /*
            if (event.key === "Escape") {
                // On vérifie que le joueur existe et qu'il est bien sélectionné
                if (this.player && this.player.isSelected) {
                    this.player.isSelected = false; // Désélectionne le joueur
                    console.log("Joueur désélectionné (Touche Echap)");
                }
            }
            */
        });
    }
}

new App();