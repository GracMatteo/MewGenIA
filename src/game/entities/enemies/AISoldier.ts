import { ImportMeshAsync, MeshBuilder, PhysicsAggregate, PhysicsMotionType, PhysicsShapeType, Scene, ShadowGenerator } from "@babylonjs/core";
import { Entity } from "../Entity";
import type { AdvancedDynamicTexture } from "@babylonjs/gui";
import { AssetManager } from "../../AssetManager";

export class AISoldier extends Entity
{
    capsuleAggregate: any;

    constructor(scene: Scene,shadowGenerator: ShadowGenerator, uiTexture: AdvancedDynamicTexture)
    {
        super("ai_soldier",scene, shadowGenerator,uiTexture);
        this.init();

    }
    async init()
    {
       await AssetManager.loadModel(this.modelPath, this.scene);
        const instance = AssetManager.instantiate(this.modelPath, this.scene);

        this.visualMeshes = instance.rootNodes[0].getChildMeshes();
        this.visualMeshes.unshift(instance.rootNodes[0] as any); // ajouter le root

        this.visualMeshes[0].rotation.y = Math.PI

        // Mesh invisible pour la physique
        this.mesh = MeshBuilder.CreateCapsule("player_collider", { height: 2, radius: 0.5 }, this.scene);
        this.mesh.isVisible = true;
        this.mesh.visibility = 0; // Rendre le mesh invisible tout en gardant les collisions et le picking actifs
        this.mesh.position.y = 5;
        this.mesh.position.x = 10;

        // Le mesh visuel suit le collider
        this.scene.registerBeforeRender(() => {
            this.visualMeshes[0].position.copyFrom(this.mesh!.position);
            this.visualMeshes[0].position.y -= 1; // offset pour centrer le mesh dans la capsule
        });

        this.capsuleAggregate = new PhysicsAggregate(this.mesh, PhysicsShapeType.CAPSULE, { mass: 0.1, restitution: 0 }, this.scene);
        this.capsuleAggregate.body.setMotionType(PhysicsMotionType.DYNAMIC);

        this.info = {
            name : "Enemy",
            description : "This is the enemy character."
        }

        this.onHoverHighlight();
    }
    
    update()
    {
    }

    fixedUpdate()
    {
    }
    
}