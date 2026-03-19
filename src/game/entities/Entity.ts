import { AbstractMesh, ActionManager, Color3, ExecuteCodeAction, PhysicsAggregate, type Scene, type ShadowGenerator } from "@babylonjs/core";
import type { EntityInfo } from "./EntityInfo";
import { Control, Rectangle, TextBlock, type AdvancedDynamicTexture } from "@babylonjs/gui";

export abstract class Entity
{
    protected mesh : AbstractMesh | undefined;
    protected aggregate : PhysicsAggregate | undefined;
    protected shadowGenerator : ShadowGenerator;
    protected scene : Scene;
    protected modelPath : string;
    protected modelName : string;

    protected info! : EntityInfo;
    
    protected uiTexture: AdvancedDynamicTexture;
    protected hoverUIPanel!: Rectangle;

    constructor(modelName : string ,scene : Scene, shadowGenerator: ShadowGenerator, uiTexture: AdvancedDynamicTexture, modelPath? : string, scale? : number, mass? : number )
    {
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

    //hover entity logique
    onHoverHighlight(){
        if(!this.mesh) console.warn("Mesh not loaded yet");
            this.mesh!.actionManager = new ActionManager(this.scene);
            this.mesh!.actionManager.registerAction(
                new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
                    this.mesh!.renderOutline = true;
                    this.mesh!.outlineColor = new Color3(0.8,0.8, 0.8); //gris clair
                }));
        
            this.mesh!.actionManager.registerAction(
                new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
                this.mesh!.renderOutline = false;
                if(this.hoverUIPanel){
                    this.hoverUIPanel.dispose();
                }
                
        }));
    }

    //affiche les infos de l'entité dans une UI
    displayInfo(){
        //Créer le conteneur principal (le fond de la carte)
        this.hoverUIPanel = new Rectangle("hoverInfoRect");
        this.hoverUIPanel.width = "150px";
        this.hoverUIPanel.height = "300px";
        this.hoverUIPanel.background = "rgba(30, 30, 30, 0.8)"; // Fond sombre semi-transparent
        this.hoverUIPanel.color = "#ffffff"; // Couleur de la bordure
        this.hoverUIPanel.thickness = 2;
        this.hoverUIPanel.cornerRadius = 8; // Bords arrondis

        // Positionnement (ex: en bas à droite de l'écran)
        this.hoverUIPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        this.hoverUIPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        this.hoverUIPanel.top = "-20px"; // Marge par rapport au bord
        this.hoverUIPanel.left = "-20px";

        // Créer le texte pour le nom (Titre)
        const nameText = new TextBlock("nameText", this.info.name);
        nameText.color = "#FFD700"; // Doré
        nameText.fontSize = 22;
        nameText.fontWeight = "bold";
        nameText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        nameText.top = "15px"; // Espace en haut
        nameText.height = "30px"; // Hauteur fixe pour le titre

        // Créer le texte pour la description
        const descText = new TextBlock("descText", this.info.description);
        descText.color = "white";
        descText.fontSize = 14;
        descText.textWrapping = true; // ESSENTIEL : Retour à la ligne automatique
        descText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        descText.top = "60px"; // On le place sous le titre
        descText.paddingLeft = "10px";
        descText.paddingRight = "10px";

        // Ajouter les textes dans le rectangle, puis le rectangle dans l'UI globale
        this.hoverUIPanel.addControl(nameText);
        this.hoverUIPanel.addControl(descText);
        this.uiTexture.addControl(this.hoverUIPanel);

        //Pour ajouter le ui a cote du personnage
        if(this.mesh){
            this.hoverUIPanel.linkWithMesh(this.mesh);
            this.hoverUIPanel.linkOffsetX = 150;
            this.hoverUIPanel.linkOffsetY = 50;
        }
    }  

}