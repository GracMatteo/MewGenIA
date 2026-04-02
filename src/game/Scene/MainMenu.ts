import {
    Color4,
    Engine,
    FreeCamera,
    HemisphericLight,
    MeshBuilder,
    Scene,
    Vector3
} from "@babylonjs/core";
import { AdvancedDynamicTexture, Button, TextBlock } from "@babylonjs/gui";
import type { LevelDefinition, LevelId } from "../LevelTypes";

export class MainMenu {
    public scene: Scene;
    public onLevelSelected: (levelId: LevelId) => void = () => {};

    private _gui: AdvancedDynamicTexture;
    private _levels: LevelDefinition[];
    onPlayPressed: (() => void) | undefined;

    constructor(engine: Engine, levels: LevelDefinition[]) {
        this.scene = new Scene(engine);
        this._levels = levels;
        this.scene.clearColor = new Color4(0.1, 0.1, 0.15, 1);

        const camera = new FreeCamera("menuCam", new Vector3(0, 5, -15), this.scene);
        camera.setTarget(Vector3.Zero());

        const light = new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);
        light.intensity = 0.8;

        const box = MeshBuilder.CreateBox("box", { size: 2 }, this.scene);
        this.scene.onBeforeRenderObservable.add(() => {
            box.rotation.y += 0.01;
        });

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

        this._levels.forEach((level, index) => {
            const button = Button.CreateSimpleButton(`${level.id}Btn`, level.label);
            button.top = `${index * 80}px`;
            button.width = "220px";
            button.height = "60px";
            button.color = "white";
            button.background = "#27ae60";
            button.cornerRadius = 10;
            button.onPointerUpObservable.add(() => this.onLevelSelected(level.id));
            this._gui.addControl(button);
        });
    }
}
