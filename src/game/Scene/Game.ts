import { 
    Scene, 
    Engine, 
    Vector3, 
    DirectionalLight, 
    ShadowGenerator, 
    MeshBuilder, 
    PhysicsAggregate, 
    PhysicsShapeType, 
    PhysicsMotionType, 
    HavokPlugin,
    Texture,
    FreeCamera
} from "@babylonjs/core";
import { AdvancedDynamicTexture } from "@babylonjs/gui";
import { Player } from "../entities/player/Player";
import "@babylonjs/core/Debug/debugLayer"; // Ajoute la couche de debug à la classe Scene
import "@babylonjs/inspector";
//import { InputManager } from "../InputManager";

export class GameScene {
    public scene: Scene;
    private _engine: Engine;
    private _havokInstance: any;
    private _ui: AdvancedDynamicTexture;
    private _shadowGenerator!: ShadowGenerator;
    //private _inputManager: InputManager;

    constructor(engine: Engine, havokInstance: any) {
        this._engine = engine;
        this._havokInstance = havokInstance;
        this.scene = new Scene(this._engine);

        // 1. Physique
        const hk = new HavokPlugin(true, this._havokInstance);
        this.scene.enablePhysics(new Vector3(0, -9.81, 0), hk);

        const camera = new FreeCamera("menuCam", new Vector3(0, 5, -15), this.scene);
        camera.setTarget(Vector3.Zero());
        camera.attachControl(this._engine.getRenderingCanvas(), true);

        // 2. Inputs & UI
        // this._inputManager = new InputManager(this.scene);
        this._ui = AdvancedDynamicTexture.CreateFullscreenUI("GameUI", true, this.scene, Texture.BILINEAR_SAMPLINGMODE, true);

        // 3. Environnement
        this._setupLights();
        this._createGround();
        
        // 4. Entités
        this._createPlayer();
    }

    private _setupLights(): void {
        const light = new DirectionalLight("dirLight", new Vector3(-1, -2, -1), this.scene);
        light.position = new Vector3(20, 40, 20);
        light.intensity = 0.7;
        this._shadowGenerator = new ShadowGenerator(1024, light);
    }

    private _createGround(): void {
        const ground = MeshBuilder.CreateGround("ground", { width: 200, height: 200 }, this.scene);
        ground.receiveShadows = true;

        const aggregate = new PhysicsAggregate(
            ground, 
            PhysicsShapeType.BOX, 
            { mass: 0, friction: 0.7 }, 
            this.scene
        );
        aggregate.body.setMotionType(PhysicsMotionType.STATIC);
    }

    private async _createPlayer(): Promise<void> {
        // Ton ancienne logique de création du joueur
        new Player(this.scene, this._shadowGenerator, this._ui);
    }
}