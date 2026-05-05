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
    Vector3
} from "@babylonjs/core";
import { AdvancedDynamicTexture } from "@babylonjs/gui";
import { Action, InputManager } from "../InputManager";
import type { LevelDefinition, LevelId } from "../LevelTypes";
import { LEVEL_IDS } from "../LevelTypes";
import { Player } from "../entities/player/Player";
import { Grenade } from "../objects/weapons/Grenade";
import "@babylonjs/core/Debug/debugLayer"; // Ajoute la couche de debug à la classe Scene
import "@babylonjs/inspector";
import { AISoldier } from "../entities/enemies/AISoldier";


export class GameScene {
    private static readonly PLAYER_NAV_SPEED = 6;
    private static readonly WAYPOINT_REACHED_DISTANCE = 0.45;
    private static readonly MAX_PATH_SEGMENT_LENGTH = 2;

    public scene: Scene;
    public player!: Player;

    private _engine: Engine;
    private _havokInstance: any;
    private _recastInstance: any;
    private _level: LevelDefinition;
    private _onReturnToMenu: () => void;

    private _navigationPlugin!: RecastJSPlugin;
    private _ui!: AdvancedDynamicTexture;
    private _shadowGenerator!: ShadowGenerator;
    private _inputManager: InputManager;
    private _camera!: FreeCamera;
    private _pathLine: Mesh | null = null;
    private _activePath: Vector3[] = [];
    private _activePathIndex = 0;
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
        //this._ui = AdvancedDynamicTexture.CreateFullscreenUI("GameUI", true, this.scene, Texture.BILINEAR_SAMPLINGMODE, true);
        // 3. Environnement
        //this._createGround("ground", 200, 200);
        
        // 4. Entités
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
        this._camera.keysUp = [90]; // Z
        this._camera.keysDown = [83]; // S
        this._camera.keysLeft = [81]; // Q
        this._camera.keysRight = [68]; // D
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

        let nbGrenades = 10;
        for (let i = 0; i < nbGrenades; i++) {
            const grenade = new Grenade(this.scene, this._ui, this._shadowGenerator,"grenade_" + i);
            await grenade.init();
            grenade.mesh!.position.set(0, 4 + i, 0);
            this._objects.push(grenade);
        }


        //this.player = new Player(this.scene, this._inputManager, this._shadowGenerator, this._ui);
        //this.player.mesh!.position.set(0,10,0);
        this._setupNavMesh(levelMeshes);
        this._createPlayer()
        this._createEnemy();
        // 4. Setup de la foule (Crowd)
        //this._setupCrowd();
        this._setupPointerEvents();
        this.scene.onBeforeRenderObservable.add(() => this._updatePlayerNavigation());
    }

    private _setupMenuShortcut(): void {
        this._inputManager.onActionTriggered(Action.MENU, () => {
            this._clearPath();
            this._onReturnToMenu();
        });

        this._inputManager.onActionTriggered(Action.STOPNAV, () => {
            this._clearPath();
            this.player?.stopMovement();
            this.player?.disselected();
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
        const testMeshes: Mesh[] = [ground];

        const registerStaticMesh = (mesh: Mesh, shape: PhysicsShapeType = PhysicsShapeType.BOX): Mesh => {
            this._makeStaticCollider(mesh, shape);
            testMeshes.push(mesh);
            return mesh;
        };


        const longRamp = MeshBuilder.CreateBox(
            "testing_long_ramp",
            { width: 10, height: 1.2, depth: 18 },
            this.scene
        );
        longRamp.position = new Vector3(16, 0, -10);
        longRamp.rotation.z = Math.PI / 8;
        registerStaticMesh(longRamp);

        const steepRamp = MeshBuilder.CreateBox(
            "testing_steep_ramp",
            { width: 8, height: 1.2, depth: 12 },
            this.scene
        );
        steepRamp.position = new Vector3(28, 2.8, 10);
        steepRamp.rotation.z = Math.PI / 5;
        registerStaticMesh(steepRamp);

        for (let i = 0; i < 5; i++) {
            const stair = MeshBuilder.CreateBox(
                `testing_stair_${i}`,
                { width: 6, height: 1, depth: 3 },
                this.scene
            );
            stair.position = new Vector3(-24 + i * 3, 0.5 + i, 18);
            registerStaticMesh(stair);
        }

        const tunnelLeft = MeshBuilder.CreateBox(
            "testing_tunnel_left",
            { width: 2, height: 4, depth: 10 },
            this.scene
        );
        tunnelLeft.position = new Vector3(-24, 2, -18);
        registerStaticMesh(tunnelLeft);

        const tunnelRight = MeshBuilder.CreateBox(
            "testing_tunnel_right",
            { width: 2, height: 4, depth: 10 },
            this.scene
        );
        tunnelRight.position = new Vector3(-16, 2, -18);
        registerStaticMesh(tunnelRight);

        const tunnelRoof = MeshBuilder.CreateBox(
            "testing_tunnel_roof",
            { width: 10, height: 1.5, depth: 10 },
            this.scene
        );
        tunnelRoof.position = new Vector3(-20, 4.75, -18);
        registerStaticMesh(tunnelRoof);

        const sideWallA = MeshBuilder.CreateBox(
            "testing_side_wall_a",
            { width: 3, height: 4, depth: 20 },
            this.scene
        );
        sideWallA.position = new Vector3(-36, 2, 0);
        registerStaticMesh(sideWallA);

        const sideWallB = MeshBuilder.CreateBox(
            "testing_side_wall_b",
            { width: 3, height: 4, depth: 20 },
            this.scene
        );
        sideWallB.position = new Vector3(36, 2, 0);
        registerStaticMesh(sideWallB);

        const diagonalWall = MeshBuilder.CreateBox(
            "testing_diagonal_wall",
            { width: 3, height: 4, depth: 22 },
            this.scene
        );
        diagonalWall.position = new Vector3(6, 2, 26);
        diagonalWall.rotation.y = Math.PI / 4;
        registerStaticMesh(diagonalWall);

        const crossBlockA = MeshBuilder.CreateBox(
            "testing_cross_block_a",
            { width: 5, height: 5, depth: 5 },
            this.scene
        );
        crossBlockA.position = new Vector3(-6, 2.5, -30);
        registerStaticMesh(crossBlockA);

        const crossBlockB = MeshBuilder.CreateBox(
            "testing_cross_block_b",
            { width: 5, height: 7, depth: 5 },
            this.scene
        );
        crossBlockB.position = new Vector3(6, 3.5, -30);
        registerStaticMesh(crossBlockB);

        const narrowPillar = MeshBuilder.CreateCylinder(
            "testing_narrow_pillar",
            { diameter: 2.5, height: 8, tessellation: 18 },
            this.scene
        );
        narrowPillar.position = new Vector3(22, 4, 24);
        registerStaticMesh(narrowPillar, PhysicsShapeType.CYLINDER);

        const widePillar = MeshBuilder.CreateCylinder(
            "testing_wide_pillar",
            { diameter: 5, height: 5, tessellation: 18 },
            this.scene
        );
        widePillar.position = new Vector3(-28, 2.5, 28);
        registerStaticMesh(widePillar, PhysicsShapeType.CYLINDER);

        const lowBridge = MeshBuilder.CreateBox(
            "testing_low_bridge",
            { width: 14, height: 1.5, depth: 6 },
            this.scene
        );
        lowBridge.position = new Vector3(0, 3.5, 36);
        registerStaticMesh(lowBridge);

        const bridgeSupportLeft = MeshBuilder.CreateBox(
            "testing_bridge_support_left",
            { width: 2, height: 5, depth: 2 },
            this.scene
        );
        bridgeSupportLeft.position = new Vector3(-5, 2.5, 36);
        registerStaticMesh(bridgeSupportLeft);

        const bridgeSupportRight = MeshBuilder.CreateBox(
            "testing_bridge_support_right",
            { width: 2, height: 5, depth: 2 },
            this.scene
        );
        bridgeSupportRight.position = new Vector3(5, 2.5, 36);
        registerStaticMesh(bridgeSupportRight);

        const wedge = MeshBuilder.CreateBox(
            "testing_wedge",
            { width: 6, height: 1, depth: 10 },
            this.scene
        );
        wedge.position = new Vector3(30, 0.9, -28);
        wedge.rotation.x = Math.PI / 9;
        registerStaticMesh(wedge);

        return testMeshes;
    }

    private _createGround(name: string, width: number, height: number): Mesh {
        const ground = MeshBuilder.CreateGround(name, { width, height }, this.scene);
        ground.receiveShadows = true;

        new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0, friction: 0.7 }, this.scene)
            .body.setMotionType(PhysicsMotionType.STATIC);

        return ground;
    }

    private _makeStaticCollider(mesh: Mesh, shape: PhysicsShapeType = PhysicsShapeType.BOX): void {
    mesh.computeWorldMatrix(true);

    const aggregate = new PhysicsAggregate(
        mesh,
        shape,
        { mass: 0, friction: 0.8, restitution: 0 },
        this.scene
    );

    aggregate.body.setMotionType(PhysicsMotionType.STATIC);
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
            const rawPath = this._navigationPlugin.computePath(
                this._navigationPlugin.getClosestPoint(this.player.mesh!.position),
                this._navigationPlugin.getClosestPoint(destination)
            );
            const segmentedPath = this._segmentPath(rawPath);

            if (segmentedPath.length > 1) {
                this._activePath = segmentedPath;
                this._activePathIndex = 1;
                this._drawPath(segmentedPath);
            } else {
                this._clearPath();
                this.player.stopMovement();
            }
        });
    }

    private _segmentPath(pathPoints: Vector3[]): Vector3[] {
        if (!pathPoints || pathPoints.length === 0) {
            return [];
        }

        const segmentedPath: Vector3[] = [pathPoints[0].clone()];

        for (let i = 1; i < pathPoints.length; i++) {
            const segmentStart = pathPoints[i - 1];
            const segmentEnd = pathPoints[i];
            const segmentLength = Vector3.Distance(segmentStart, segmentEnd);

            if (segmentLength === 0) {
                continue;
            }

            const stepCount = Math.max(
                1,
                Math.ceil(segmentLength / GameScene.MAX_PATH_SEGMENT_LENGTH)
            );

            for (let step = 1; step <= stepCount; step++) {
                segmentedPath.push(Vector3.Lerp(segmentStart, segmentEnd, step / stepCount));
            }
        }

        return segmentedPath;
    }

    private _drawPath(pathPoints: Vector3[]): void {
        this._pathLine?.dispose();
        this._pathLine = null;

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

    private _clearPath(): void {
        this._activePath = [];
        this._activePathIndex = 0;
        this._pathLine?.dispose();
        this._pathLine = null;
    }

    private _updatePlayerNavigation(): void {
        if (!this.player?.mesh || this._activePathIndex >= this._activePath.length) {
            return;
        }

        while (this._activePathIndex < this._activePath.length) {
            const waypoint = this._activePath[this._activePathIndex];
            const physicsTarget = new Vector3(
                waypoint.x,
                this.player.mesh.position.y,
                waypoint.z
            );
            const planarDistance = Vector3.Distance(
                new Vector3(this.player.mesh.position.x, 0, this.player.mesh.position.z),
                new Vector3(physicsTarget.x, 0, physicsTarget.z)
            );

            if (planarDistance <= GameScene.WAYPOINT_REACHED_DISTANCE) {
                this._activePathIndex++;
                continue;
            }

            this.player.moveToward(physicsTarget, GameScene.PLAYER_NAV_SPEED);

            const direction = physicsTarget.subtract(this.player.mesh.position);
            direction.y = 0;
            if (direction.lengthSquared() > 0.001) {
                direction.normalize();
                const desiredRotation = Math.atan2(direction.x, direction.z);
                this.player.mesh.rotation.y +=
                    (desiredRotation - this.player.mesh.rotation.y) * 0.15;
            }

            return;
        }

        this.player.stopMovement();
        this._clearPath();
    }

    private async _createPlayer(): Promise<void> 
    {
        console.log("Creating player...");
        this.player = new Player(this.scene, this._inputManager, this._shadowGenerator, this._ui);
    }

    private async _createEnemy(): Promise<void> {
        console.log("Creating enemy...");
        new AISoldier(this.scene, this._shadowGenerator, this._ui);
    }


}
