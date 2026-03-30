import { 
    Scene, 
    Engine, 
    Color4, 
    Vector3, 
    FreeCamera, 
    HemisphericLight, 
    MeshBuilder 
} from "@babylonjs/core";
import { AdvancedDynamicTexture, Button, TextBlock } from "@babylonjs/gui";

export class MainMenu {
    public scene: Scene;
    private _gui: AdvancedDynamicTexture;

    // Callback pour communiquer avec App.ts
    public onPlayPressed: () => void = () => {};

    constructor(engine: Engine) {
        this.scene = new Scene(engine);
        this.scene.clearColor = new Color4(0.1, 0.1, 0.15, 1);

        // Caméra fixe pour le menu
        const camera = new FreeCamera("menuCam", new Vector3(0, 5, -15), this.scene);
        camera.setTarget(Vector3.Zero());

        const light = new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);
        light.intensity = 0.8;

        // Petit décor de fond (un cube qui tourne)
        const box = MeshBuilder.CreateBox("box", { size: 2 }, this.scene);
        this.scene.onBeforeRenderObservable.add(() => {
            box.rotation.y += 0.01;
        });

        // Interface UI
        this._gui = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, this.scene);
        this._createUI();
    }

    private _createUI(): void {
        const title = new TextBlock();
        title.text = "MEWGENIA";
        title.color = "white";
        title.fontSize = 60;
        title.top = "-100px";
        this._gui.addControl(title);

        const playBtn = Button.CreateSimpleButton("playBtn", "LvL 1");
        playBtn.width = "200px";
        playBtn.height = "60px";
        playBtn.color = "white";
        playBtn.background = "#27ae60";
        playBtn.cornerRadius = 10;
        playBtn.onPointerUpObservable.add(() => this.onPlayPressed());
        
        this._gui.addControl(playBtn);

        const TestingGround = Button.CreateSimpleButton("testingGround", "TESTING GROUND");
        TestingGround.top = "80px";
        TestingGround.left = "0px";
        TestingGround.width = "200px";
        TestingGround.height = "60px";
        TestingGround.color = "white";
        TestingGround.background = "#27ae60";
        TestingGround.cornerRadius = 10;
        TestingGround.onPointerUpObservable.add(() => this.onPlayPressed());
        this._gui.addControl(TestingGround);
       
    }
}