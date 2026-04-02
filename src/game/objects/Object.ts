import type { AbstractMesh, PhysicsAggregate, Scene, ShadowGenerator } from "@babylonjs/core";
import { Rectangle, type AdvancedDynamicTexture } from "@babylonjs/gui";

export abstract class Object {
    
    public mesh : AbstractMesh | undefined;
    protected visualMeshes: AbstractMesh[] = [];
    protected aggregate : PhysicsAggregate | undefined;
    protected shadowGenerator : ShadowGenerator;
    protected scene : Scene;
    protected modelPath : string;
    protected modelName : string;

    protected uiTexture: AdvancedDynamicTexture;

    
    constructor(modelName : string ,scene : Scene, uiTexture: AdvancedDynamicTexture, shadowGenerator: ShadowGenerator, modelPath? : string, _scale? : number, _mass? : number ) {
        this.shadowGenerator = shadowGenerator;
        this.scene = scene;
        this.modelName = modelName;
        this.modelPath = modelPath ? modelPath : `/models/${modelName}.glb`;

        this.uiTexture = uiTexture;
    }

    async load()
    {
    }

    abstract init() : Promise<void>;

    abstract update(input?: any) : void;

    abstract fixedUpdate(input?: any) : void;

    displayInfo() {
        const panel = new Rectangle();
        panel.width = "100px";
        panel.height = "50px";
        panel.background = "black";
        panel.alpha = 0.7;
        panel.cornerRadius = 5;
    }

}