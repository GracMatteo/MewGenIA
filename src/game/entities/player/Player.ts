import { MeshBuilder,Mesh, PhysicsAggregate, PhysicsMotionType, PhysicsShapeType, Vector3, type Scene, type ShadowGenerator, ActionManager, ExecuteCodeAction, Color3 } from "@babylonjs/core";
import { Entity } from "../Entity";
import { AdvancedDynamicTexture, Control, Rectangle, TextBlock } from "@babylonjs/gui";

export class Player extends Entity
{   
    transform! : Mesh;
    capsuleAggregate: any;
    
    constructor(scene: Scene, shadowGenerator: ShadowGenerator, uiTexture: AdvancedDynamicTexture)
    {
        super("player",scene, shadowGenerator,uiTexture);

        this.init();
    }

    async init()
    {   
        this.mesh = MeshBuilder.CreateCapsule("player_mesh", { height: 2, radius: 0.5 }, this.scene);
        this.mesh.position.y = 5;
        
        /*
        this.transform = MeshBuilder.CreateBox("player_transform", { height: 2, width: 1, depth: 1 }, this.scene);
        this.transform.visibility = 0.2;
        this.transform.position = new Vector3(this.mesh.position.x, this.mesh.position.y + 1, this.mesh.position.z);
        */
        this.capsuleAggregate = new PhysicsAggregate(this.mesh, PhysicsShapeType.CAPSULE, { mass: 0.1, restitution:0}, this.scene);
        this.capsuleAggregate.body.setMotionType(PhysicsMotionType.STATIC);

        this.info = {
            name : "Player",
            description : "This is the player character."
        }

        this.onHoverHighlight();
        this.showInfo();
    }

    async fixedUpdate()
    {

    }

    showInfo()
    {
        if(!this.mesh) console.warn("Mesh not loaded yet");
        this.mesh!.actionManager!.registerAction(
            new ExecuteCodeAction(ActionManager.OnLeftPickTrigger, () => {
                this.displayInfo();
                //console.log(this.info);
            }));
    }
    

    update()
    {
        
    }

}