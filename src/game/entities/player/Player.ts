import {
    ActionManager,
    Axis,
    ExecuteCodeAction,
    ImportMeshAsync,
    Mesh,
    MeshBuilder,
    PhysicsAggregate,
    PhysicsMotionType,
    PhysicsShapeType,
    Space,
    Vector3,
    type Scene,
    type ShadowGenerator
} from "@babylonjs/core";
import { Entity } from "../Entity";
import { AdvancedDynamicTexture } from "@babylonjs/gui";
import { Action, type InputManager } from "../../InputManager";
import "@babylonjs/loaders/glTF";
import { Inventory } from "../Inventory";
import "@babylonjs/loaders/glTF"; // Assure que le loader GLTF est inclus pour charger les modèles .glb
import { InventoryUI } from "../InventoryUI";

export class Player extends Entity
{
    private static readonly MOVE_STOP_DISTANCE = 0.15;
    private static readonly VISUAL_ROTATION_LERP = 0.10;
    private static readonly VISUAL_ROTATION_OFFSET = 0;

    transform!: Mesh;
    capsuleAggregate: any;
    inputs: InputManager;
    inventory: Inventory;
    inventoryUI: InventoryUI;

    constructor(scene: Scene, inputManager: InputManager, shadowGenerator: ShadowGenerator, uiTexture: AdvancedDynamicTexture)
    {
        super("player", scene, shadowGenerator, uiTexture);
        this.inputs = inputManager;
        this.inventory = new Inventory();
        this.inventoryUI = new InventoryUI(uiTexture, this.inventory);
        this.init();
    }

    async init()
    {
        const result = await ImportMeshAsync("/models/player.glb", this.scene);
        const playerVisualRoot = result.meshes[0];
        playerVisualRoot.name = "playerVisualRoot";
        this.visualMeshes = result.meshes;
        this.visualMeshes.forEach((m) =>
        {
            m.isPickable = true;
        });

        this.mesh = MeshBuilder.CreateCapsule("player_collider", { height: 2, radius: 0.5 }, this.scene);
        this.mesh.isVisible = true;
        this.mesh.visibility = 0.3;
        this.mesh.position.y = 3;
        this.mesh.position.x = 0;

        this.scene.registerBeforeRender(() => {
            if (!this.mesh || this.visualMeshes.length === 0) {
                return;
            }

            const rootMesh = this.visualMeshes[0];
            rootMesh.position.copyFrom(this.mesh.position);
            rootMesh.position.y -= 1;

            const targetRotation = this.mesh.rotation.y + Player.VISUAL_ROTATION_OFFSET;
            const currentForward = rootMesh.getDirection(Axis.Z);
            const currentRotation = Math.atan2(currentForward.x, currentForward.z);
            let diff = targetRotation - currentRotation;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;

            rootMesh.rotate(Axis.Y, diff * Player.VISUAL_ROTATION_LERP, Space.WORLD);
        });

        this.capsuleAggregate = new PhysicsAggregate(
            this.mesh,
            PhysicsShapeType.CAPSULE,
            { mass: 10, restitution: 0, friction: 0.5 },
            this.scene
        );
        this.capsuleAggregate.body.setMotionType(PhysicsMotionType.DYNAMIC);
        this.capsuleAggregate.body.setMassProperties({
            inertia: Vector3.Zero()
        });
        this.capsuleAggregate.body.setAngularDamping(0.95);
        this.capsuleAggregate.body.setAngularVelocity(Vector3.Zero());

        this.info = {
            name: "Player",
            description: "This is the player character."
        };
        this.handleInputs();
        this.displayInventory();
        this.onHoverHighlight();
        this.selected();
    }

    async fixedUpdate()
    {

    }

    showInfo()
    {

    }

    //mieux avec les trigger et les observables de babylon (a voir pour les inputs de manière générale)
    handleInputs()
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
        //console.log("target: position = ", target);
        const direction = target.subtract(currentPosition);
        direction.y = 0;
        //console.log("Direction to target: ", direction);
        const distance = direction.length();
        const currentVelocity = this.capsuleAggregate.body.getLinearVelocity();
        const verticalVelocity = currentVelocity?.y ?? 0;

        if (distance <= Player.MOVE_STOP_DISTANCE) {
            this.capsuleAggregate.body.setLinearVelocity(new Vector3(0, 0, 0));
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

        this.capsuleAggregate.body.setLinearVelocity(new Vector3(0, 0, 0));
    }

    selected() 
    {
        this.mesh!.actionManager!.registerAction(
            new ExecuteCodeAction(ActionManager.OnLeftPickTrigger, () => {
                this.isSelected = true;
                console.log("Player selected = ", this.isSelected);
            })
        );
    }

    disselected()
    {
        if (this.isSelected) {
            this.isSelected = false;
            console.log("Joueur deselectionne");
        }
    }

    displayInventory()
    {
        this.inputs.onActionTriggered(Action.INVENTORY, () => {
            if (!this.isSelected) {
                return;
            }

            this.inventoryUI.toggle();
        });
    }
}
