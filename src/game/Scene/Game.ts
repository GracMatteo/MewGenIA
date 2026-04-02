import {
    Color3,
    DirectionalLight,
    Engine,
    FreeCamera,
    HavokPlugin,
    Mesh,
    MeshBuilder,
    PhysicsAggregate,
    PhysicsMotionType,
    PhysicsShapeType,
    PointerEventTypes,
    RecastJSPlugin,
    Scene,
    ShadowGenerator,
    StandardMaterial,
    Texture,
    TransformNode,
    Vector3
} from "@babylonjs/core";
import { AdvancedDynamicTexture } from "@babylonjs/gui";
import { Action, InputManager } from "../InputManager";
import type { LevelDefinition, LevelId } from "../LevelTypes";
import { LEVEL_IDS } from "../LevelTypes";
import { Player } from "../entities/player/Player";
import { Grenade } from "../objects/weapons/Grenade";

export class GameScene {
    public scene: Scene;
    public player!: Player;

    private _engine: Engine;
    private _havokInstance: any;
    private _recastInstance: any;
    private _level: LevelDefinition;
    private _onReturnToMenu: () => void;

    private _navigationPlugin!: RecastJSPlugin;
    private _crowd: any;
    private _ui!: AdvancedDynamicTexture;
    private _shadowGenerator!: ShadowGenerator;
    private _inputManager: InputManager;
    private _camera!: FreeCamera;
    private _pathLine: Mesh | null = null;
    private _agents: any[] = [];
    private _objects: Object[] = [];

    constructor(
        engine: Engine,
        havokInstance: any,
        recastInstance: any,
        level: LevelDefinition,
        onReturnToMenu: () => void
    ) {
        this._engine = engine;
        this._havokInstance = havokInstance;
        this._recastInstance = recastInstance;
        this._level = level;
        this._onReturnToMenu = onReturnToMenu;

        this.scene = new Scene(this._engine);

        this._initPhysics();
        this._initNavigation();
        this._initCamera();
        this._inputManager = new InputManager(this.scene);
        this._ui = AdvancedDynamicTexture.CreateFullscreenUI(
            "GameUI",
            true,
            this.scene,
            Texture.BILINEAR_SAMPLINGMODE,
            true
        );

        this._setupLights();
        this._setupMenuShortcut();
        this._initLevel(this._level.id);
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

    private async _initLevel(levelId: LevelId): Promise<void> {
        const levelMeshes = this._buildLevel(levelId);

        const grenade = new Grenade(this.scene, this._ui, this._shadowGenerator);
        await grenade.init();
        grenade.mesh!.position.set(5, 1, 5);
        this._objects.push(grenade);


        this.player = new Player(this.scene, this._inputManager, this._shadowGenerator, this._ui);
        this._setupNavMesh(levelMeshes);
        this._setupCrowd();
        this._setupPointerEvents();
        this.scene.onBeforeRenderObservable.add(() => this._updateAgents());
    }

    private _setupMenuShortcut(): void {
        this._inputManager.onActionTriggered(Action.MENU, () => {
            this._onReturnToMenu();
        });
    }

    private _buildLevel(levelId: LevelId): Mesh[] {
        switch (levelId) {
            case LEVEL_IDS.LEVEL_1:
                return this._buildLevel1();
            case LEVEL_IDS.TESTING_GROUND:
                return this._buildTestingGround();
            default:
                throw new Error(`No level builder configured for ${levelId}`);
        }
    }

    private _buildLevel1(): Mesh[] {
        const ground = this._createGround("level1_ground", 200, 200);

        const cube = MeshBuilder.CreateBox("level1_obstacle_cube", { size: 4 }, this.scene);
        cube.position = new Vector3(15, 2, 0);

        const wall = MeshBuilder.CreateBox("level1_wall", { width: 4, height: 4, depth: 18 }, this.scene);
        wall.position = new Vector3(-15, 2, 12);

        return [ground, cube, wall];
    }

    private _buildTestingGround(): Mesh[] {
        const ground = this._createGround("testing_ground", 120, 120);

        const centralBlock = MeshBuilder.CreateBox(
            "testing_central_block",
            { width: 8, height: 3, depth: 8 },
            this.scene
        );
        centralBlock.position = new Vector3(-10, 1.5, 0);

        const ramp = MeshBuilder.CreateBox("testing_ramp", { width: 6, height: 1, depth: 18 }, this.scene);
        ramp.position = new Vector3(18, 0, -8);
        ramp.rotation.z = Math.PI / 10;

        const sideCover = MeshBuilder.CreateBox("testing_side_cover", { width: 5, height: 5, depth: 5 }, this.scene);
        sideCover.position = new Vector3(-20, 2.5, -15);

        return [ground, centralBlock, ramp, sideCover];
    }

    private _createGround(name: string, width: number, height: number): Mesh {
        const ground = MeshBuilder.CreateGround(name, { width, height }, this.scene);
        ground.receiveShadows = true;

        new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0, friction: 0.7 }, this.scene)
            .body.setMotionType(PhysicsMotionType.STATIC);

        return ground;
    }

    private _setupNavMesh(meshes: Mesh[]): void {
        const navmeshParameters = {
            cs: 0.2,
            ch: 0.2,
            walkableSlopeAngle: 90,
            walkableHeight: 1.0,
            walkableClimb: 1,
            walkableRadius: 3,
            maxEdgeLen: 12.0,
            maxSimplificationError: 1.3,
            minRegionArea: 8,
            mergeRegionArea: 20,
            maxVertsPerPoly: 6,
            detailSampleDist: 6,
            detailSampleMaxError: 1
        };

        this._navigationPlugin.createNavMesh(meshes, navmeshParameters);

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
            radius: 0.1,
            height: 2,
            maxAcceleration: 99999.0,
            maxSpeed: 6.0,
            collisionQueryRange: 0.5,
            pathOptimizationRange: 0.0,
            separationWeight: 1.0
        };

        const randomPos = this._navigationPlugin.getRandomPointAround(new Vector3(-2, 0.1, -2), 0.5);
        const transform = new TransformNode("agent_transform");
        const agentIndex = this._crowd.addAgent(randomPos, agentParams, transform);

        this._agents.push({
            idx: agentIndex,
            trf: transform,
            mesh: this.player.mesh,
            target: MeshBuilder.CreateBox("target", { size: 0.1 }, this.scene)
        });
    }

    private _setupPointerEvents(): void {
        this.scene.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.type !== PointerEventTypes.POINTERDOWN || pointerInfo.event.button !== 0) {
                return;
            }

            const pickInfo = pointerInfo.pickInfo;
            if (!pickInfo?.hit || !this.player.isSelected) {
                return;
            }

            if (pickInfo.pickedMesh === this.player.mesh) {
                return;
            }

            const destination = pickInfo.pickedPoint!;
            this._createClickFeedback(destination);

            const agents = this._crowd.getAgents();
            for (let i = 0; i < agents.length; i++) {
                const closestNavPoint = this._navigationPlugin.getClosestPoint(destination);
                this._crowd.agentGoto(agents[i], closestNavPoint);
                this._drawPath(this.player.mesh!.position, closestNavPoint);
            }
        });
    }

    private _drawPath(start: Vector3, end: Vector3): void {
        const pathPoints = this._navigationPlugin.computePath(
            this._navigationPlugin.getClosestPoint(start),
            end
        );

        if (this._pathLine) {
            this._pathLine.dispose();
        }

        if (pathPoints && pathPoints.length > 1) {
            this._pathLine = MeshBuilder.CreateDashedLines(
                "navPathLine",
                {
                    points: pathPoints,
                    dashSize: 3,
                    gapSize: 1,
                    updatable: false
                },
                this.scene
            );
        }
    }

    private _createClickFeedback(position: Vector3): void {
        const feedback = MeshBuilder.CreateDisc("clickFeedback", { radius: 0.5 }, this.scene);

        feedback.position = position.clone();
        feedback.position.y += 0.05;
        feedback.rotation.x = Math.PI / 2;

        const mat = new StandardMaterial("feedbackMat", this.scene);
        mat.diffuseColor = new Color3(1, 1, 1);
        mat.emissiveColor = new Color3(0.5, 0.5, 0.5);
        mat.alpha = 0.6;
        feedback.material = mat;

        let frame = 0;
        const maxFrames = 30;

        const animate = () => {
            frame++;
            const progress = frame / maxFrames;

            feedback.scaling.scaleInPlace(1.05);
            mat.alpha = 0.6 * (1 - progress);

            if (frame < maxFrames) {
                requestAnimationFrame(animate);
            } else {
                feedback.dispose();
                mat.dispose();
            }
        };

        animate();
    }

    private _updateAgents(): void {
        this._agents.forEach((ag) => {
            if (!ag.mesh && this.player && this.player.mesh) {
                ag.mesh = this.player.mesh;
            }

            if (!ag.mesh) {
                return;
            }

            const agentPos = this._crowd.getAgentPosition(ag.idx);
            const physicsTarget = new Vector3(agentPos.x, ag.mesh.position.y, agentPos.z);
            this.player.moveToward(physicsTarget, 6);

            const vel = this._crowd.getAgentVelocity(ag.idx);
            if (vel.length() > 0.2) {
                vel.normalize();
                const desiredRotation = Math.atan2(vel.x, vel.z);
                ag.mesh.rotation.y = ag.mesh.rotation.y + (desiredRotation - ag.mesh.rotation.y) * 0.15;
            } else {
                this.player.stopMovement();
            }

            if (vel.length() < 0.1 && this._pathLine) {
                this._pathLine.dispose();
                this._pathLine = null;
            }
        });
    }
}
