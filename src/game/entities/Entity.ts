import { AbstractMesh, ActionManager, Color3, ExecuteCodeAction, PhysicsAggregate, Vector3, type Scene, type ShadowGenerator } from "@babylonjs/core";
import type { EntityInfo } from "./EntityInfo";
import { Control, Rectangle, TextBlock, type AdvancedDynamicTexture } from "@babylonjs/gui";
import {
    BasicActionId,
    createBasicActionSet,
    type BasicAction,
    type BasicActionContext,
    type BasicActionResult
} from "./actions/BasicAction";

export abstract class Entity
{
    public mesh : AbstractMesh | undefined;
    protected visualMeshes: AbstractMesh[] = [];
    protected aggregate : PhysicsAggregate | undefined;
    protected shadowGenerator : ShadowGenerator;
    protected scene : Scene;
    protected modelPath : string;
    protected modelName : string;

    protected info! : EntityInfo;
    
    protected uiTexture: AdvancedDynamicTexture;
    protected hoverUIPanel!: Rectangle;
    private readonly _basicActions: Record<BasicActionId, BasicAction> = createBasicActionSet();
    private _currentHp: number | null = null;

    public isSelected : boolean = false;

    constructor(modelName : string ,scene : Scene, shadowGenerator: ShadowGenerator, uiTexture: AdvancedDynamicTexture, modelPath? : string, _scale? : number, _mass? : number )
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

    get stats() {
        return this.info?.stats;
    }

    get currentHp(): number {
        return this._currentHp ?? this.stats?.hp ?? 0;
    }

    protected initializeActionState(): void {
        this._currentHp = this.stats?.hp ?? null;
    }

    public getBasicAction(actionId: BasicActionId): BasicAction {
        return this._basicActions[actionId];
    }

    public getBasicActionRadius(actionId: BasicActionId): number {
        return this.getBasicAction(actionId).radius;
    }

    public canPerformBasicAction(
        actionId: BasicActionId,
        context: Omit<BasicActionContext, "actor"> = {}
    ): boolean {
        return this.getBasicAction(actionId).canRun({
            ...context,
            actor: this
        });
    }

    public performBasicAction(
        actionId: BasicActionId,
        context: Omit<BasicActionContext, "actor"> = {}
    ): BasicActionResult {
        return this.getBasicAction(actionId).run({
            ...context,
            actor: this
        });
    }

    public receiveDamage(amount: number): void {
        if (!this.stats) {
            return;
        }

        this._currentHp = Math.max(0, this.currentHp - Math.max(0, amount));
        console.log(`${this.info.name} took ${amount} damage. HP: ${this._currentHp}/${this.stats.hp}`);
    }

    public faceTarget(targetPosition: Vector3): void {
        if (!this.mesh) {
            return;
        }

        const direction = targetPosition.subtract(this.mesh.position);
        direction.y = 0;

        if (direction.lengthSquared() <= 0.001) {
            return;
        }

        direction.normalize();
        this.mesh.rotation.y = Math.atan2(direction.x, direction.z);
    }

    public jumpTo(targetPoint: Vector3, duration: number = 0.45): boolean {
        if (!this.mesh) {
            return false;
        }

        const body = this.aggregate?.body;
        const start = this.mesh.position;
        const target = targetPoint.clone();
        target.y += this.getJumpTargetHeightOffset();
        this.faceTarget(target);

        if (!body) {
            this.mesh.position.copyFrom(target);
            return true;
        }

        const gravity = Math.abs(this.scene.getPhysicsEngine()?.gravity.y ?? -9.81);
        const velocity = new Vector3(
            (target.x - start.x) / duration,
            (target.y - start.y + 0.5 * gravity * duration * duration) / duration,
            (target.z - start.z) / duration
        );

        body.setLinearVelocity(velocity);
        return true;
    }

    protected getJumpTargetHeightOffset(): number {
        return 1;
    }

    //hover entity logique
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
    



    // Hover sur le collider -> outline sur les meshes visuels
    this.mesh!.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
            this.visualMeshes.forEach(m => {
                m.renderOutline = true;
                m.outlineColor = new Color3(0.8, 0.8, 0.8);
            });
        })
    );

    this.mesh!.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
            this.visualMeshes.forEach(m => {
                m.renderOutline = false;
            });
            if (this.hoverUIPanel) {
                this.hoverUIPanel.dispose();
            }
        })
    );}

    //affiche les infos de l'entité dans une UI
    displayInfo()
    {
        //Créer le conteneur principal (le fond de la carte)
        this.hoverUIPanel = new Rectangle("hoverInfoRectv");
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
        nameText.width = "130px";
        nameText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        nameText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        nameText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        nameText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        nameText.top = "15px"; // Espace en haut
        nameText.left = "10px";
        nameText.height = "30px"; // Hauteur fixe pour le titre

        // Créer le texte pour la description
        const descText = new TextBlock("descText", this.info.description);
        descText.color = "white";
        descText.fontSize = 14;
        descText.textWrapping = true; // ESSENTIEL : Retour à la ligne automatique
        descText.width = "130px";
        descText.height = "80px";
        descText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        descText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        descText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        descText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        descText.top = "60px"; // On le place sous le titre
        descText.left = "10px";
        descText.paddingLeft = "10px";
        descText.paddingRight = "10px";

        // Ajouter les textes dans le rectangle, puis le rectangle dans l'UI globale
        this.hoverUIPanel.addControl(nameText);
        this.hoverUIPanel.addControl(descText);

        if (this.info.stats) {
            const stats = this.info.stats;
            const classLine = this.info.playerClass ? `Classe: ${this.info.playerClass}\n` : "";
            const statsText = new TextBlock(
                "statsText",
                `${classLine}HP: ${stats.hp}\nAttack: ${stats.attack}\nSpeed: ${stats.movementSpeed}\nAccuracy: ${Math.round(stats.accuracy * 100)}%`
            );
            statsText.color = "white";
            statsText.fontSize = 14;
            statsText.textWrapping = true;
            statsText.width = "130px";
            statsText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
            statsText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
            statsText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
            statsText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
            statsText.top = "145px";
            statsText.left = "10px";
            statsText.height = "125px";
            statsText.paddingLeft = "15px";
            statsText.paddingRight = "10px";
            this.hoverUIPanel.addControl(statsText);
        }

        this.uiTexture.addControl(this.hoverUIPanel);

        //Pour ajouter le ui a cote du personnage
        const rootMesh = this.visualMeshes[0];
        if (rootMesh) 
        {
            this.hoverUIPanel.linkWithMesh(rootMesh);
            this.hoverUIPanel.linkOffsetX = 150;
            this.hoverUIPanel.linkOffsetY = 50;
        }
    }  

}
