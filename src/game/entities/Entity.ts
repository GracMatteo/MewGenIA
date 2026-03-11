import { AbstractMesh, LoadAssetContainerAsync, PhysicsAggregate, PhysicsShapeType, type Scene, type ShadowGenerator } from "@babylonjs/core";
import type { EntityInfo } from "./EntityInfo";

export abstract class Entity
{
    protected mesh : AbstractMesh | undefined;
    protected aggregate : PhysicsAggregate | undefined;
    protected shadowGenerator : ShadowGenerator;
    protected scene : Scene;
    protected modelPath : string;
    protected modelName : string;

    protected hoverInfo! : EntityInfo;

    constructor(modelName : string ,scene : Scene, shadowGenerator: ShadowGenerator, modelPath? : string, scale? : number, mass? : number )
    {
        this.shadowGenerator = shadowGenerator;
        this.scene = scene;
        this.modelName = modelName;
        this.modelPath = modelPath ? modelPath : `/models/${modelName}.glb`;


    }

    async load()
    {
        
    }
    
    abstract init() : Promise<void>;

    abstract update(input?: any) : void;

    abstract fixedUpdate(input?: any) : void;

    abstract onHoverInfo() : void;

   
}