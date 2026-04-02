import {Mesh, PhysicsAggregate, PhysicsMotionType, PhysicsShapeType, type Scene, type ShadowGenerator, ActionManager, ExecuteCodeAction, ImportMeshAsync, MeshBuilder } from "@babylonjs/core";
import { Entity } from "../Entity";
import { AdvancedDynamicTexture } from "@babylonjs/gui";
import { Action, type InputManager } from "../../InputManager";
import "@babylonjs/loaders/glTF"; // Assure que le loader GLTF est inclus pour charger les modèles .glb
import { AssetManager } from "../../AssetManager";

export class Player extends Entity
{   
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
        await AssetManager.loadModel(this.modelPath, this.scene);
        const instance = AssetManager.instantiate(this.modelPath, this.scene);

        this.visualMeshes = instance.rootNodes[0].getChildMeshes();
        this.visualMeshes.unshift(instance.rootNodes[0] as any); // ajouter le root

        this.visualMeshes[0].rotation.y = Math.PI

        // Mesh invisible pour la physique ET le picking
        this.mesh = MeshBuilder.CreateCapsule("player_collider", { height: 2, radius: 0.5 }, this.scene);
        this.mesh.isVisible = true;
        this.mesh.visibility = 0; // Rendre le mesh invisible tout en gardant les collisions et le picking actifs
        this.mesh.isPickable = true; // <- le collider gère les clics
        this.mesh.position.y = 1;

        this.scene.registerBeforeRender(() => {
            this.visualMeshes[0].position.copyFrom(this.mesh!.position);
            this.visualMeshes[0].position.y -= 1;
        });

        this.capsuleAggregate = new PhysicsAggregate(this.mesh, PhysicsShapeType.CAPSULE, { mass: 0.1, restitution: 0 }, this.scene);
        this.capsuleAggregate.body.setMotionType(PhysicsMotionType.DYNAMIC);

        this.info = {
            name: "Player",
            description: "This is the player character."
        };

        // Créer l'actionManager sur le collider
        this.mesh.actionManager = new ActionManager(this.scene);

        this.onHoverHighlight();
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

    selected() 
    {
        if (!this.mesh?.actionManager) return;
        
        this.mesh.actionManager.registerAction(
            new ExecuteCodeAction(ActionManager.OnLeftPickTrigger, () => {
                this.isSelected = true;
                this.displayInfo();
                console.log("Player selected");
            })
        );
    }

    disselected(){
        if (this.isSelected) {
            this.isSelected = false;
            console.log("Joueur désélectionné (Touche Echap)");
        }       
    }

}
