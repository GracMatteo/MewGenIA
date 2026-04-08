import { Color3, MeshBuilder, PhysicsAggregate, PhysicsMotionType, PhysicsShapeType, Scene, ShadowGenerator, StandardMaterial } from "@babylonjs/core";
import type { AdvancedDynamicTexture } from "@babylonjs/gui";
import { Object } from "../Object";


export class Grenade extends Object {

    SphereAggregate: any;
    isActivated: boolean = false;

    constructor(scene: Scene, uiTexture: AdvancedDynamicTexture, shadowGenerator: ShadowGenerator, modelName : string,) {
        super(modelName, scene, uiTexture, shadowGenerator);
        
    }

    async init(): Promise<void> {
        this.mesh =  MeshBuilder.CreateSphere(this.modelName, { diameter: 0.7 }, this.scene);
        this.mesh.position.y = 15;
        this.mesh.visibility = 0.1;
        
        this.visualMeshes[0] = MeshBuilder.CreateSphere(this.modelName + "Visual", { diameter: 0.5 }, this.scene);
        this.visualMeshes[0].position.copyFrom(this.mesh.position);
        this.visualMeshes[0].isPickable = true;

        const material = new StandardMaterial("grenadeMat", this.scene);
        material.diffuseColor = new Color3(0.2, 0.8, 0.2);
        this.visualMeshes[0].material = material;

        // Le mesh visuel suit le collider
        this.scene.registerBeforeRender(() => {
            this.visualMeshes[0].position.copyFrom(this.mesh!.position);
        });
        
        this.SphereAggregate = new PhysicsAggregate(this.mesh, PhysicsShapeType.SPHERE, { mass: 0.1, restitution: 0.8 }, this.scene);
        this.SphereAggregate.body.setMotionType(PhysicsMotionType.DYNAMIC);

        this.info = {
            name: "Grenade",
            description: "objet explosif à lancer"
        };
        
        this.onHoverHighlight();
    }

    update(_input?: any): void {
        // Logique de mise à jour de la grenade (ex: timer d'explosion)
    }

    fixedUpdate(_input?: any): void {
        // Logique de physique de la grenade (ex: mouvement, collision)

    }
    
}
