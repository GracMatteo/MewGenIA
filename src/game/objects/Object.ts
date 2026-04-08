import { ActionManager, Color3, ExecuteCodeAction, type AbstractMesh, type PhysicsAggregate, type Scene, type ShadowGenerator } from "@babylonjs/core";
import { Control, Rectangle, TextBlock, type AdvancedDynamicTexture } from "@babylonjs/gui";
import type { ObjectInfo } from "./ObjectInfo";

export abstract class Object {
    
    public mesh : AbstractMesh | undefined;
    protected visualMeshes: AbstractMesh[] = [];
    protected aggregate : PhysicsAggregate | undefined;
    protected shadowGenerator : ShadowGenerator;
    protected scene : Scene;
    protected modelPath : string;
    protected modelName : string;

    protected uiTexture: AdvancedDynamicTexture;
    protected hoverUIPanel!: Rectangle;

    protected info! : ObjectInfo;
    
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

    onHoverHighlight(){
            if (this.visualMeshes.length === 0) {
                console.warn("Visual meshes not loaded yet");
                return;
            }
    
            if(!this.mesh) console.warn("Mesh not loaded yet");
                this.mesh!.actionManager = new ActionManager(this.scene);
                this.mesh!.actionManager.registerAction(
                    new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
                        this.mesh!.renderOutline = true;
                        this.mesh!.outlineColor = new Color3(0.8,0.8, 0.8); //gris clair
                        this.displayInfo(); 
                    }));
            
                this.mesh!.actionManager.registerAction(
                    new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
                    this.mesh!.renderOutline = false;
                    if(this.hoverUIPanel){
                        this.hoverUIPanel.dispose();
                    }
                    
            }));
    }

    displayInfo() {
        const panel = new Rectangle();
        panel.width = "100px";
        panel.height = "50px";
        panel.background = "black";
        panel.alpha = 0.7;
        panel.cornerRadius = 5;

         // Créer le texte pour le nom (Titre)
        const nameText = new TextBlock("nameText", this.info.name);
        nameText.color = "#FFD700"; // Doré
        nameText.fontSize = 22;
        nameText.fontWeight = "bold";
        nameText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        nameText.top = "15px"; // Espace en haut
        nameText.height = "30px"; // Hauteur fixe pour le titre

        this.hoverUIPanel.addControl(nameText);
        this.uiTexture.addControl(this.hoverUIPanel);

        const rootMesh = this.visualMeshes[0];
        if (rootMesh) 
        {
            this.hoverUIPanel.linkWithMesh(rootMesh);
            this.hoverUIPanel.linkOffsetX = 150;
            this.hoverUIPanel.linkOffsetY = 50;
        }
    }

}