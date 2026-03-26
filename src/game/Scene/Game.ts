import { 
    Scene, Engine, Vector3, DirectionalLight, ShadowGenerator, 
    MeshBuilder, PhysicsAggregate, PhysicsShapeType, PhysicsMotionType, 
    HavokPlugin, Texture, FreeCamera, StandardMaterial, Color3, 
    Mesh, TransformNode, PointerEventTypes, RecastJSPlugin 
} from "@babylonjs/core";
import { AdvancedDynamicTexture } from "@babylonjs/gui";
import { Player } from "../entities/player/Player";
import { InputManager } from "../InputManager";


export class GameScene {
    public scene: Scene;
    private _engine: Engine;
    private _havokInstance: any;
    private _recastInstance: any;

    // Plugins
    private _navigationPlugin!: RecastJSPlugin;
    private _crowd: any;

    // Éléments de scène
    private _ui!: AdvancedDynamicTexture;
    private _shadowGenerator!: ShadowGenerator;
    private _inputManager: InputManager;
    private _camera!: FreeCamera;

    private _pathLine: Mesh | null = null;

    // Entités
    public player!: Player;
    private _agents: any[] = [];

    constructor(engine: Engine, havokInstance: any, recastInstance: any) {
        this._engine = engine;
        this._havokInstance = havokInstance;
        
        this.scene = new Scene(this._engine);

        this._initPhysics();
        this._initNavigation();
        this._initCamera();
        this._inputManager = new InputManager(this.scene);
        this._ui = AdvancedDynamicTexture.CreateFullscreenUI("GameUI", true, this.scene, Texture.BILINEAR_SAMPLINGMODE, true);

        this._setupLights();
        this._initLevel();
    }

    private _initPhysics(): void {
        const hk = new HavokPlugin(true, this._havokInstance);
        this.scene.enablePhysics(new Vector3(0, -9.81, 0), hk);
        this.scene.collisionsEnabled = true;
    }

    private _initNavigation(): void {
        this._navigationPlugin = new RecastJSPlugin(this._recastInstance);
    }

    private _initCamera(): void {
        this._camera = new FreeCamera("gameCam", new Vector3(0, 10, 30), this.scene);
        this._camera.setTarget(Vector3.Zero());
        this._camera.attachControl(this._engine.getRenderingCanvas(), true);
        this._camera.checkCollisions = true;
    }

    private _setupLights(): void {
        const light = new DirectionalLight("dirLight", new Vector3(-1, -2, -1), this.scene);
        light.position = new Vector3(20, 40, 20);
        light.intensity = 0.7;
        this._shadowGenerator = new ShadowGenerator(1024, light);
    }

    private async _initLevel(): Promise<void> {
        // 1. Création du sol et obstacles
        const ground = this._createGround();
        const cube = MeshBuilder.CreateBox("obstacle_cube", { size: 4 }, this.scene);
        cube.position = new Vector3(10, 2, 0);

        // 2. Création du Player
        this.player = new Player(this.scene, this._inputManager, this._shadowGenerator, this._ui);

        // 3. Génération du NavMesh
        // Note: On merge les meshs statiques pour le calcul du NavMesh
        const staticMesh = Mesh.MergeMeshes([ground, cube]) as Mesh;
        this._setupNavMesh(staticMesh);

        // 4. Setup de la foule (Crowd)
        this._setupCrowd();
        
        // 5. Setup des événements de clic pour le mouvement
        this._setupPointerEvents();

        // 6. Boucle de mise à jour des agents
        this.scene.onBeforeRenderObservable.add(() => this._updateAgents());
    }

    private _createGround(): Mesh {
        const ground = MeshBuilder.CreateGround("ground", { width: 200, height: 200 }, this.scene);
        ground.receiveShadows = true;
        
        new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0, friction: 0.7 }, this.scene)
            .body.setMotionType(PhysicsMotionType.STATIC);
            
        return ground;
    }

    private _setupNavMesh(mesh: Mesh): void {
        const navmeshParameters = {
            cs: 0.2, ch: 0.2,
            walkableSlopeAngle: 90,
            walkableHeight: 1.0,
            walkableClimb: 1,
            walkableRadius: 2,
            maxEdgeLen: 12.,
            maxSimplificationError: 1.3,
            minRegionArea: 8,
            mergeRegionArea: 20,
            maxVertsPerPoly: 6,
            detailSampleDist: 6,
            detailSampleMaxError: 1,
        };

        this._navigationPlugin.createNavMesh([mesh], navmeshParameters);
        
        // Debug NavMesh (Optionnel)
        const debugMesh = this._navigationPlugin.createDebugNavMesh(this.scene);
        debugMesh.position.y = 0.01;
        const mat = new StandardMaterial("navMeshDebugMat", this.scene);
        mat.diffuseColor = new Color3(0.1, 0.2, 1);
        mat.alpha = 0.2;
        debugMesh.material = mat;
    }

    private _setupCrowd(): void {
        this._crowd = this._navigationPlugin.createCrowd(10, 0.1, this.scene);
        
        const agentParams = {
            radius: 0.1, height: 2,
            maxAcceleration: 99999.0, maxSpeed: 6.0,
            collisionQueryRange: 0.5, pathOptimizationRange: 0.0,
            separationWeight: 1.0
        };

        const randomPos = this._navigationPlugin.getRandomPointAround(new Vector3(-2, 0.1, -2), 0.5);
        const transform = new TransformNode("agent_transform");
        const agentIndex = this._crowd.addAgent(randomPos, agentParams, transform);

        // On lie le mesh du player à cet agent du crowd
        this._agents.push({
            idx: agentIndex,
            trf: transform,
            mesh: this.player.mesh, // On suppose que Player a une propriété mesh
            target: MeshBuilder.CreateBox("target", { size: 0.1 }, this.scene)
        });
        //console.log(this._agents);
    }

    private _setupPointerEvents(): void {
        this.scene.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
                const pickInfo = pointerInfo.pickInfo;
                //console.log("Pointer down at: ", pickInfo?.pickedPoint);
                if (pickInfo?.hit && this.player.isSelected) {
                    // Si on clique sur le player lui-même, on ne bouge pas
                    if (pickInfo.pickedMesh === this.player.mesh) return;

                    const destination = pickInfo.pickedPoint!;

                    this._createClickFeedback(destination);

                    const agents = this._crowd.getAgents();
                    //console.log('agents: ', agents);
                    for (let i = 0; i < agents.length; i++) {
                        const closestNavPoint = this._navigationPlugin.getClosestPoint(destination);
                        this._crowd.agentGoto(agents[i], closestNavPoint);
                        this._drawPath(this.player.mesh!.position, closestNavPoint);
                    }

                    
                }
            }
        });
    }

    private _drawPath(start: Vector3, end: Vector3): void {
        // Calculer les points du chemin via le NavMesh
        const pathPoints = this._navigationPlugin.computePath(
            this._navigationPlugin.getClosestPoint(start),
            end
        );

        // Si une ligne existe déjà, on la détruit
        if (this._pathLine) {
            this._pathLine.dispose();
        }

        // On crée une nouvelle ligne (ou ligne pointillée)
        if (pathPoints && pathPoints.length > 1) {
            this._pathLine = MeshBuilder.CreateDashedLines("navPathLine", {
                points: pathPoints,
                dashSize: 3,
                gapSize: 1,
                updatable: false
            }, this.scene);

        }
    }

    private _createClickFeedback(position: Vector3): void {
        // 1. Créer un disque plat au point d'impact
        const feedback = MeshBuilder.CreateDisc("clickFeedback", { radius: 0.5 }, this.scene);
        
        // Positionner le disque légèrement au-dessus du sol pour éviter le clignotement (Z-fighting)
        feedback.position = position.clone();
        feedback.position.y += 0.05; 
        feedback.rotation.x = Math.PI / 2; // Le mettre à plat

        // 2. Créer un matériau simple
        const mat = new StandardMaterial("feedbackMat", this.scene);
        mat.diffuseColor = new Color3(1, 1, 1); // Blanc (ou la couleur de votre choix)
        mat.emissiveColor = new Color3(0.5, 0.5, 0.5); // Pour qu'il brille un peu
        mat.alpha = 0.6;
        feedback.material = mat;

        // 3. L'Animation (Scale et Alpha)
        let frame = 0;
        const maxFrames = 30; // Durée de l'animation (environ 0.5s à 60fps)

        const animate = () => {
            frame++;
            const progress = frame / maxFrames;

            // Le cercle s'agrandit
            feedback.scaling.scaleInPlace(1.05);
            
            // Le cercle devient transparent
            mat.alpha = 0.6 * (1 - progress);

            if (frame < maxFrames) {
                requestAnimationFrame(animate);
            } else {
                // Nettoyage complet
                feedback.dispose();
                mat.dispose();
            }
        };

        animate();
    }

    private _updateAgents(): void {
        this._agents.forEach(ag => {

            // Si l'agent n'a pas encore de mesh lié, on lui attribue celui du player (pour le debug)
            if (!ag.mesh && this.player && this.player.mesh) {
                ag.mesh = this.player.mesh;
            }

            if (!ag.mesh) return;

            const agentPos = this._crowd.getAgentPosition(ag.idx);
            
            // Mise à jour position mesh (avec offset Y pour sortir du sol)
            ag.mesh.position.set(agentPos.x, agentPos.y + 1.0, agentPos.z);
            
            // Rotation vers la vélocité
            const vel = this._crowd.getAgentVelocity(ag.idx);
            if (vel.length() > 0.2) {
                vel.normalize();
                const desiredRotation = Math.atan2(vel.x, vel.z);
                ag.mesh.rotation.y = ag.mesh.rotation.y + (desiredRotation - ag.mesh.rotation.y) * 0.15;
            }

            // Si l'agent est presque arrêté, on peut effacer la ligne
            if (vel.length() < 0.1 && this._pathLine) {
                this._pathLine.dispose();
                this._pathLine = null;
            }
        });
    }
}