import { Vector3, type Scene, type ShadowGenerator } from "@babylonjs/core";
import { Entity } from "../Entity";

export class Player extends Entity
{
    constructor(scene: Scene, shadowGenerator: ShadowGenerator)
    {
        super(scene, shadowGenerator, "/models/soldierProtagonist.glb", 1, 1, "Player");
    }

    async init()
    {        
    }

    update(input: {forward: boolean, backward: boolean, left: boolean, right: boolean})
    {
        if(!this.mesh || !this.aggregate) return;

        const moveDir = new Vector3(0,0,0);
        if(input.forward) moveDir.z += 1;
        if(input.backward) moveDir.z -= 1;
        if(input.left) moveDir.x -= 1;
        if(input.right) moveDir.x += 1;

        const currentVel = this.aggregate?.body.getLinearVelocity();
        this.aggregate?.body.setLinearVelocity(new Vector3(moveDir.x * 5, currentVel ? currentVel.y : 0, moveDir.z * 5));
        if (moveDir.x !== 0 || moveDir.z !== 0) 
        {
            const targetRotation = Math.atan2(moveDir.x, moveDir.z);
            this.mesh.rotationQuaternion = null; // On repasse en mode rotation Euler
            this.mesh.rotation.y = targetRotation;
        }
    }

}