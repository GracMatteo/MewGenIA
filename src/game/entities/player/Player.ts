import {
    ActionManager,
    ExecuteCodeAction,
    ImportMeshAsync,
    Mesh,
    MeshBuilder,
    PhysicsAggregate,
    PhysicsMotionType,
    PhysicsShapeType,
    Vector3,
    type Scene,
    type ShadowGenerator
} from "@babylonjs/core";
import { Entity } from "../Entity";
import { AdvancedDynamicTexture } from "@babylonjs/gui";
import { Action, type InputManager } from "../../InputManager";
import "@babylonjs/loaders/glTF"; // Assure que le loader GLTF est inclus pour charger les modèles .glb

export class Player extends Entity
{   
    private static readonly MOVE_STOP_DISTANCE = 0.35;

    transform! : Mesh;
    capsuleAggregate: any;
    inputs: InputManager;
    
    constructor(scene: Scene,inputManager: InputManager,shadowGenerator: ShadowGenerator, uiTexture: AdvancedDynamicTexture)
    {
        super("player",scene, shadowGenerator,uiTexture);
        this.inputs = inputManager;
        this.init();

        this.scene.onBeforeRenderObservable.add(() => {
            this._handleInputs();
        });
    }

    async init()
    {   
        const result = await ImportMeshAsync("/models/player.glb", this.scene);
        this.visualMeshes = result.meshes;
        this.visualMeshes.forEach(m => 
        {
            m.isPickable = true;
        });
        this.visualMeshes[0].rotation.y = Math.PI;

        // Mesh invisible pour la physique
        this.mesh = MeshBuilder.CreateCapsule("player_collider", { height: 2, radius: 0.5 }, this.scene);
        this.mesh.isVisible = true;
        this.mesh.visibility = 0.3;
        this.mesh.position.y = 1; // pour que le bas du collider soit au sol

        // Le mesh visuel suit le collider
        this.scene.registerBeforeRender(() => {
            this.visualMeshes[0].position.copyFrom(this.mesh!.position);
            this.visualMeshes[0].position.y -= 1; // offset pour centrer le mesh dans la capsule
        });

        this.capsuleAggregate = new PhysicsAggregate(this.mesh, PhysicsShapeType.CAPSULE, { mass: 1, restitution: 0 }, this.scene);
        this.capsuleAggregate.body.setMotionType(PhysicsMotionType.DYNAMIC);
        //this.capsuleAggregate.body.setCollisionCallbackEnabled(true);

        this.info = {
            name : "Player",
            description : "This is the player character."
        }

        this.onHoverHighlight();
        //this.showInfo();
        this.selected();
    }

    async fixedUpdate()
    {

    }

    showInfo()
    {
       
    }
    
    private _handleInputs()
    {
        if (this.inputs.isActionActive(Action.ZOOM_IN)) 
        {
            console.log("Zooming in");
        }
        if (this.inputs.isActionActive(Action.ZOOM_OUT))
        {
            console.log("Zooming out");
        }
        if (this.inputs.isActionActive(Action.MENU))
        {
            console.log("Menu opened");
        }
        if (this.inputs.isActionActive(Action.INVENTORY))
        {
            console.log("Inventory opened");
        }
        if (this.inputs.isActionActive(Action.INTERACT))
        {
            console.log("Interacting");
        }
        if (this.inputs.isActionActive(Action.MOVE))
        {
            console.log("Moving");
        }
        if (this.inputs.isActionActive(Action.STOPNAV))
        {
            console.log("Stopping navigation");
            this.disselected();
        }
    }

    update()
    {
        
    }

    moveToward(target: Vector3, speed: number): void
    {
        if (!this.mesh || !this.capsuleAggregate?.body) {
            return;
        }

        const currentPosition = this.mesh.position;
        const direction = target.subtract(currentPosition);
        direction.y = 0;

        const distance = direction.length();
        const currentVelocity = this.capsuleAggregate.body.getLinearVelocity();
        const verticalVelocity = currentVelocity?.y ?? 0;

        if (distance <= Player.MOVE_STOP_DISTANCE) {
            this.capsuleAggregate.body.setLinearVelocity(new Vector3(0, verticalVelocity, 0));
            return;
        }

        direction.normalize();
        this.capsuleAggregate.body.setLinearVelocity(
            new Vector3(direction.x * speed, verticalVelocity, direction.z * speed)
        );
    }

    stopMovement(): void
    {
        if (!this.capsuleAggregate?.body) {
            return;
        }

        const currentVelocity = this.capsuleAggregate.body.getLinearVelocity();
        this.capsuleAggregate.body.setLinearVelocity(new Vector3(0, currentVelocity?.y ?? 0, 0));
    }

    selected()
    {
        this.mesh!.actionManager!.registerAction(
                new ExecuteCodeAction(ActionManager.OnLeftPickTrigger, () => {
                    this.isSelected = true;
                    console.log("Player selected = " , this.isSelected);
        }));
    }

    disselected(){
        if (this.isSelected) {
            this.isSelected = false;
            console.log("Joueur désélectionné (Touche Echap)");
        }       
    }

}
