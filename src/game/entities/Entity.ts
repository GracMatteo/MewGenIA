import { AbstractMesh, LoadAssetContainerAsync, PhysicsAggregate, PhysicsShapeType, type Scene, type ShadowGenerator } from "@babylonjs/core";

export abstract class Entity
{
    protected mesh : AbstractMesh | undefined;
    protected aggregate : PhysicsAggregate | undefined;
    protected shadowGenerator : ShadowGenerator;
    protected scene : Scene;
    protected modelPath : string;
    protected modelName : string;

    constructor(scene : Scene, shadowGenerator: ShadowGenerator, modelPath : string, scale : number, mass : number, modelName : string)
    {
        this.shadowGenerator = shadowGenerator;
        this.scene = scene;
        this.modelName = modelName;
        this.modelPath = modelPath;

    }

    async load()
    {
        const container = await LoadAssetContainerAsync(this.modelPath, this.scene);
        container.addAllToScene();
        this.mesh = container.meshes[0];
        this.mesh.scaling.setAll(1);
        this.mesh.position.y = 5;

        container.meshes.forEach(m => {
            m.receiveShadows = true;
            this.shadowGenerator.addShadowCaster(m);
        });

        this.setupPhysics();
    }

    protected setupPhysics()
    {
        if(!this.mesh) return;
        this.aggregate = new PhysicsAggregate(this.mesh, PhysicsShapeType.CAPSULE, { mass: 1, restitution: 0.1, friction: 0.5 }, this.scene);
        
    }

    abstract update(input?: any) : void;
}