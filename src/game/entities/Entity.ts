import {
    AbstractMesh,
    ActionManager,
    Color3,
    ExecuteCodeAction,
    MeshBuilder,
    PhysicsAggregate,
    Ray,
    StandardMaterial,
    Vector3,
    type Scene,
    type ShadowGenerator
} from "@babylonjs/core";
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
    private _damageFlashToken = 0;

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

    get maxHp(): number {
        return this.stats?.hp ?? 0;
    }

    get isDead(): boolean {
        return this.maxHp > 0 && this.currentHp <= 0;
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
        if (!this.stats || this.isDead) {
            return;
        }

        this._currentHp = Math.max(0, this.currentHp - Math.max(0, amount));
        console.log(`${this.info.name} took ${amount} damage. HP: ${this._currentHp}/${this.stats.hp}`);
        this.flashDamageFeedback();

        if (this.isDead) {
            this.onDeath();
        }
    }

    protected onDeath(): void {
    }

    public dispose(): void {
        if (this.hoverUIPanel) {
            this.hoverUIPanel.dispose();
        }

        this.aggregate?.dispose();
        this.mesh?.dispose();
        this.visualMeshes.forEach((mesh) => mesh.dispose());
        this.visualMeshes = [];
        this.mesh = undefined;
        this.aggregate = undefined;
    }

    public ownsMesh(candidate?: AbstractMesh | null): boolean {
        if (!candidate) {
            return false;
        }

        return candidate === this.mesh ||
            this.visualMeshes.some((mesh) => candidate === mesh || candidate.isDescendantOf(mesh));
    }

    public getRangedAttackBlockPoint(target: Entity): Vector3 | null {
        if (!this.mesh || !target.mesh) {
            return null;
        }

        const start = this.getProjectileAimPoint();
        const end = target.getProjectileAimPoint();
        const direction = end.subtract(start);
        const distance = direction.length();

        if (distance <= 0.001) {
            return null;
        }

        direction.normalize();
        const ray = new Ray(start, direction, distance);
        const hit = this.scene.pickWithRay(ray, (mesh) => {
            return mesh.isPickable &&
                mesh.isEnabled() &&
                mesh.isVisible &&
                !this.ownsMesh(mesh) &&
                !target.ownsMesh(mesh);
        });

        if (!hit?.hit || !hit.pickedPoint) {
            return null;
        }

        return hit.pickedPoint.clone();
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
        window.setTimeout(() => this.stopHorizontalVelocity(), (duration + 0.08) * 1000);
        return true;
    }

    public stopHorizontalVelocity(): void {
        const body = this.aggregate?.body;
        if (!body) {
            return;
        }

        const currentVelocity = body.getLinearVelocity();
        body.setLinearVelocity(new Vector3(0, currentVelocity?.y ?? 0, 0));
    }

    public playMeleeAttackEffect(targetPosition: Vector3): void {
        const impact = MeshBuilder.CreateTorus(
            `${this.modelName}_melee_impact`,
            { diameter: 1.25, thickness: 0.08, tessellation: 32 },
            this.scene
        );
        impact.position.copyFrom(targetPosition);
        impact.position.y += 0.9;
        impact.rotation.x = Math.PI / 2;
        impact.isPickable = false;

        const material = new StandardMaterial(`${this.modelName}_melee_impact_mat`, this.scene);
        material.diffuseColor = new Color3(1, 0.45, 0.05);
        material.emissiveColor = new Color3(1, 0.25, 0);
        material.alpha = 0.85;
        impact.material = material;

        let frame = 0;
        const maxFrames = 12;
        const animate = () => {
            frame++;
            impact.scaling.scaleInPlace(1.08);
            material.alpha = 0.85 * (1 - frame / maxFrames);

            if (frame < maxFrames) {
                window.requestAnimationFrame(animate);
                return;
            }

            impact.dispose();
            material.dispose();
        };

        animate();
    }

    public playRangedAttackEffect(targetPosition: Vector3, didHit: boolean): void {
        if (!this.mesh) {
            return;
        }

        const start = this.getProjectileAimPoint();
        const end = targetPosition.clone();
        const projectile = MeshBuilder.CreateSphere(
            `${this.modelName}_projectile`,
            { diameter: 0.28, segments: 12 },
            this.scene
        );
        projectile.position.copyFrom(start);
        projectile.isPickable = false;

        const material = new StandardMaterial(`${this.modelName}_projectile_mat`, this.scene);
        material.diffuseColor = didHit ? new Color3(0.2, 0.85, 1) : new Color3(1, 0.9, 0.15);
        material.emissiveColor = material.diffuseColor;
        projectile.material = material;

        const durationMs = 220;
        const startedAt = performance.now();
        const animate = (now: number) => {
            const progress = Math.min(1, (now - startedAt) / durationMs);
            const easedProgress = 1 - Math.pow(1 - progress, 2);
            Vector3.LerpToRef(start, end, easedProgress, projectile.position);

            if (progress < 1) {
                window.requestAnimationFrame(animate);
                return;
            }

            projectile.dispose();
            material.dispose();
        };

        window.requestAnimationFrame(animate);
    }

    public getProjectileAimPoint(): Vector3 {
        return this.mesh!.position.add(new Vector3(0, 0.8, 0));
    }

    public flashDamageFeedback(): void {
        const flashToken = ++this._damageFlashToken;
        let blinkCount = 0;
        const maxBlinkCount = 8;

        const setOverlay = (isVisible: boolean) => {
            this.visualMeshes.forEach((mesh) => {
                mesh.renderOverlay = isVisible;
                mesh.overlayColor = new Color3(1, 0.05, 0.02);
                mesh.overlayAlpha = 0.75;
            });
        };

        const blink = () => {
            if (flashToken !== this._damageFlashToken || this.visualMeshes.length === 0) {
                return;
            }

            blinkCount++;
            setOverlay(blinkCount % 2 === 1);

            if (blinkCount < maxBlinkCount) {
                window.setTimeout(blink, 60);
                return;
            }

            setOverlay(false);
        };

        blink();
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
                `${classLine}HP: ${this.currentHp}/${this.maxHp}\nAttack: ${stats.attack}\nSpeed: ${stats.movementSpeed}\nAccuracy: ${Math.round(stats.accuracy * 100)}%`
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
