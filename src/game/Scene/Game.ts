import {
    AbstractMesh,
    Color3,
    DirectionalLight,
    Engine,
    FreeCamera,
    HavokPlugin,
    ImportMeshAsync,
    KeyboardEventTypes,
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
import { AdvancedDynamicTexture, Button, Control, Rectangle, StackPanel, TextBlock } from "@babylonjs/gui";
import { Action, InputManager } from "../InputManager";
import type { LevelDefinition, LevelId } from "../LevelTypes";
import { LEVEL_IDS } from "../LevelTypes";
import { Player } from "../entities/player/Player";
import { Grenade } from "../objects/weapons/Grenade";
import "@babylonjs/core/Debug/debugLayer"; // Ajoute la couche de debug à la classe Scene
import "@babylonjs/inspector";
import { AISoldier } from "../entities/enemies/AISoldier";
import type { EnemyBehaviorId } from "../entities/enemies/ai/EnemyBehavior";
import type { PlayerClassId } from "../entities/player/PlayerClass";
import { Collectable } from "../objects/Collectable";
import type { Object as GameObject } from "../objects/Object";
import { BasicActionId } from "../entities/actions/BasicAction";


export class GameScene {
    private static readonly WAYPOINT_REACHED_DISTANCE = 0.45;
    private static readonly MAX_PATH_SEGMENT_LENGTH = 2;
    private static readonly ISOMETRIC_CAMERA_OFFSET = new Vector3(-14, 18, -14);
    private static readonly CAMERA_FREE_KEYS = new Set(["KeyZ", "KeyS", "KeyD"]);
    private static readonly CAMERA_MIN_HORIZONTAL_DISTANCE = 8;
    private static readonly CAMERA_MAX_HORIZONTAL_DISTANCE = 45;
    private static readonly CAMERA_ZOOM_STEP = 2;
    private static readonly CAMERA_ORBIT_SPEED = 0.01;
    private static readonly JUMP_COOLDOWN_SECONDS = 2.5;
    private static readonly EXTRACTION_RADIUS = 4;
    private static readonly EXTRACTION_HOLD_SECONDS = 5;
    private static readonly CAMERA_ELEVATION_RATIO =
        GameScene.ISOMETRIC_CAMERA_OFFSET.y /
        Math.hypot(GameScene.ISOMETRIC_CAMERA_OFFSET.x, GameScene.ISOMETRIC_CAMERA_OFFSET.z);
    private static readonly GRENADE_COUNT = 10;
    private static readonly GRENADE_PICKUP_DISTANCE = 1.2;
    private static readonly GRENADE_SPAWN_HEIGHT = 2;
    private static readonly GRENADE_MIN_SPAWN_SPACING = 5;
    private static readonly GRENADE_MAX_SPAWN_ATTEMPTS = 50;
    private static readonly GRENADE_THROW_SPEED = 16;
    private static readonly GRENADE_THROW_UP_SPEED = 5;
    private static readonly GRENADE_THROW_FORWARD_OFFSET = 1.2;
    private static readonly GRENADE_THROW_HEIGHT_OFFSET = 1.2;

    public scene: Scene;
    public player!: Player;

    private _engine: Engine;
    private _havokInstance: any;
    private _recastInstance: any;
    private _level: LevelDefinition;
    private _playerClassId: PlayerClassId;
    private _onReturnToMenu: () => void;

    private _navigationPlugin!: RecastJSPlugin;
    private _ui!: AdvancedDynamicTexture;
    private _shadowGenerator!: ShadowGenerator;
    private _inputManager: InputManager;
    private _camera!: FreeCamera;
    private _isCameraFollowingPlayer = false;
    private _isCameraOrbitingPlayer = false;
    private _cameraFollowYaw = Math.atan2(
        GameScene.ISOMETRIC_CAMERA_OFFSET.x,
        GameScene.ISOMETRIC_CAMERA_OFFSET.z
    );
    private _cameraFollowHorizontalDistance = Math.hypot(
        GameScene.ISOMETRIC_CAMERA_OFFSET.x,
        GameScene.ISOMETRIC_CAMERA_OFFSET.z
    );
    private _pathLine: Mesh | null = null;
    private _activePath: Vector3[] = [];
    private _activePathIndex = 0;
    private _objects: GameObject[] = [];
    private _jumpTargetingActive = false;
    private _jumpCooldownRemaining = 0;
    private _jumpRadiusMesh: Mesh | null = null;
    private _isGameOver = false;
    private _hasWon = false;
    private _gameOverPanel: Rectangle | null = null;
    private _victoryPanel: Rectangle | null = null;
    private _playerHealthText: TextBlock | null = null;
    private _extractionText: TextBlock | null = null;
    private _extractionPoint: Vector3 | null = null;
    private _extractionMesh: Mesh | null = null;
    private _extractionHoldSeconds = 0;
    //private _objects: Object[] = [];
    private _enemies: AISoldier[] = [];
    public readonly ready: Promise<void>;

    constructor(
        engine: Engine,
        havokInstance: any,
        recastInstance: any,
        level: LevelDefinition,
        playerClassId: PlayerClassId,
        onReturnToMenu: () => void
    ) {
        this._engine = engine;
        this._havokInstance = havokInstance;
        this._recastInstance = recastInstance;
        this._level = level;
        this._playerClassId = playerClassId;
        this._onReturnToMenu = onReturnToMenu;

        this.scene = new Scene(this._engine);

        this._initPhysics();
        this._initNavigation();
        this._initCamera();
        this._setupLights();
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
        this._setupMenuShortcut();
        this._setupCameraShortcuts();
        this.ready = this._initLevel(this._level.id);
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
        this._camera.keysLeft = [37]; // ArrowLeft
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

        this._setupNavMesh(await levelMeshes);
        await this._createPlayer();
        this._createExtractionPoint(levelId);
        this._createPlayerHealthHud();
        this._createExtractionHud();
        await Promise.all([
            this._createGrenades(),
            this._createEnemy()
        ]);

        // 4. Setup de la foule (Crowd)
        //this._setupCrowd();
        this._setupPointerEvents();
        this.scene.onBeforeRenderObservable.add(() => this._updatePlayerNavigation());
        this.scene.onBeforeRenderObservable.add(() => this._updateJumpCooldown());
        this.scene.onBeforeRenderObservable.add(() => this._updateJumpRadius());
        this.scene.onBeforeRenderObservable.add(() => this._updateEnemies());
        this.scene.onBeforeRenderObservable.add(() => this._updateCombatState());
        this.scene.onBeforeRenderObservable.add(() => this._updatePlayerHealthHud());
        this.scene.onBeforeRenderObservable.add(() => this._updateExtractionState());
        this.scene.onBeforeRenderObservable.add(() => this._updateExtractionHud());
        this.scene.onBeforeRenderObservable.add(() => this._updateCollectables());
        this.scene.onBeforeRenderObservable.add(() => this._updateCameraFollow());
    }

    private async _createGrenades(): Promise<void> {
        const spawnPositions: Vector3[] = [];

        for (let i = 0; i < GameScene.GRENADE_COUNT; i++) {
            const spawnPosition = this._getRandomGrenadeSpawnPosition(spawnPositions);
            const grenade = new Grenade(this.scene, this._ui, this._shadowGenerator,"grenade_" + i, spawnPosition);
            await grenade.init();
            spawnPositions.push(spawnPosition);
            this._objects.push(grenade);
        }
    }

    private _getRandomGrenadeSpawnPosition(existingPositions: Vector3[]): Vector3 {
        const halfExtent = this._getLevelSpawnHalfExtent();

        for (let attempt = 0; attempt < GameScene.GRENADE_MAX_SPAWN_ATTEMPTS; attempt++) {
            const randomPoint = new Vector3(
                this._randomBetween(-halfExtent, halfExtent),
                0,
                this._randomBetween(-halfExtent, halfExtent)
            );
            const navPoint = this._navigationPlugin.getClosestPoint(randomPoint);

            if (this._isSpawnPositionFarEnough(navPoint, existingPositions)) {
                navPoint.y += GameScene.GRENADE_SPAWN_HEIGHT;
                return navPoint;
            }
        }

        const fallbackPosition = this._navigationPlugin.getClosestPoint(Vector3.Zero());
        fallbackPosition.y += GameScene.GRENADE_SPAWN_HEIGHT + existingPositions.length;
        return fallbackPosition;
    }

    private _getLevelSpawnHalfExtent(): number {
        switch (this._level.id) {
            case LEVEL_IDS.LEVEL_1:
                return 90;
            case LEVEL_IDS.TESTING_GROUND:
                return 55;
            default:
                return 50;
        }
    }

    private _isSpawnPositionFarEnough(position: Vector3, existingPositions: Vector3[]): boolean {
        return existingPositions.every((existingPosition) => {
            const planarDistance = Vector3.Distance(
                new Vector3(position.x, 0, position.z),
                new Vector3(existingPosition.x, 0, existingPosition.z)
            );

            return planarDistance >= GameScene.GRENADE_MIN_SPAWN_SPACING;
        });
    }

    private _randomBetween(min: number, max: number): number {
        return min + Math.random() * (max - min);
    }

    private _setupMenuShortcut(): void {
        this._inputManager.onActionTriggered(Action.MENU, () => {
            this._clearPath();
            this._setJumpTargeting(false);
            this._onReturnToMenu();
        });

        this._inputManager.onActionTriggered(Action.STOPNAV, () => {
            this._clearPath();
            this._setJumpTargeting(false);
            this.player?.stopMovement();
            this.player?.disselected();
        });

        this._inputManager.onActionTriggered(Action.THROW_GRENADE, () => {
            void this._throwGrenade();
        });

        this._inputManager.onActionTriggered(Action.JUMP, () => {
            if (this._isGameOver || this._hasWon || !this.player?.isSelected || this.player.isDead) {
                return;
            }

            if (!this._canPlayerJump()) {
                this._setJumpTargeting(false);
                return;
            }

            this._clearPath();
            this.player.stopMovement();
            this._setJumpTargeting(!this._jumpTargetingActive);
        });
    }

    private async _throwGrenade(): Promise<void> {
        if (!this.player?.mesh || !this.player.inventory.hasItem("Grenade")) {
            return;
        }

        this.player.inventory.removeItem("Grenade");
        this.player.inventoryUI.refresh();

        const throwDirection = this._getMouseThrowDirection();

        const spawnPosition = this.player.mesh.position
            .add(throwDirection.scale(GameScene.GRENADE_THROW_FORWARD_OFFSET))
            .add(new Vector3(0, GameScene.GRENADE_THROW_HEIGHT_OFFSET, 0));
        const grenade = new Grenade(
            this.scene,
            this._ui,
            this._shadowGenerator,
            `thrown_grenade_${Date.now()}`,
            spawnPosition
        );

        await grenade.init();
        grenade.activate(() => {
            this._objects = this._objects.filter((object) => object !== grenade);
        });
        grenade.SphereAggregate.body.setLinearVelocity(
            throwDirection
                .scale(GameScene.GRENADE_THROW_SPEED)
                .add(new Vector3(0, GameScene.GRENADE_THROW_UP_SPEED, 0))
        );
        this._objects.push(grenade);
    }

    private _getMouseThrowDirection(): Vector3 {
        const playerMesh = this.player.mesh;

        if (!playerMesh) {
            return Vector3.Forward();
        }

        const fallbackDirection = new Vector3(
            Math.sin(playerMesh.rotation.y),
            0,
            Math.cos(playerMesh.rotation.y)
        ).normalize();
        const pickInfo = this.scene.pick(
            this.scene.pointerX,
            this.scene.pointerY,
            (mesh) => mesh.isPickable && mesh !== playerMesh && !mesh.name.startsWith("player"),
            false,
            this._camera
        );

        if (!pickInfo?.hit || !pickInfo.pickedPoint) {
            return fallbackDirection;
        }

        const throwDirection = pickInfo.pickedPoint.subtract(playerMesh.position);
        throwDirection.y = 0;

        if (throwDirection.lengthSquared() < 0.001) {
            return fallbackDirection;
        }

        return throwDirection.normalize();
    }

    private _setupCameraShortcuts(): void {
        this._inputManager.onActionTriggered(Action.PLAYER_CAMERA, (kbInfo) => {
            kbInfo.event.preventDefault();
            this._isCameraFollowingPlayer = true;
            this._updateCameraFollow();
        });

        this.scene.onKeyboardObservable.add((kbInfo) => {
            if (kbInfo.type !== KeyboardEventTypes.KEYDOWN) {
                return;
            }

            const code = kbInfo.event.code;

            if (GameScene.CAMERA_FREE_KEYS.has(code)) {
                this._isCameraFollowingPlayer = false;
            }
        });

        this.scene.onPointerObservable.add((pointerInfo) => {
            const event = pointerInfo.event;

            if (pointerInfo.type === PointerEventTypes.POINTERUP && event.button === 1) {
                this._isCameraOrbitingPlayer = false;
                return;
            }

            if (!this._isCameraFollowingPlayer) {
                return;
            }

            if (pointerInfo.type === PointerEventTypes.POINTERWHEEL) {
                event.preventDefault();
                const deltaY = (event as unknown as { deltaY: number }).deltaY;
                const zoomDirection = Math.sign(deltaY);

                if (zoomDirection !== 0) {
                    this._cameraFollowHorizontalDistance = this._clamp(
                        this._cameraFollowHorizontalDistance + zoomDirection * GameScene.CAMERA_ZOOM_STEP,
                        GameScene.CAMERA_MIN_HORIZONTAL_DISTANCE,
                        GameScene.CAMERA_MAX_HORIZONTAL_DISTANCE
                    );
                    this._updateCameraFollow();
                }

                return;
            }

            if (pointerInfo.type === PointerEventTypes.POINTERDOWN && event.button === 1) {
                event.preventDefault();
                this._isCameraOrbitingPlayer = true;
                return;
            }

            if (pointerInfo.type === PointerEventTypes.POINTERMOVE && this._isCameraOrbitingPlayer) {
                event.preventDefault();
                this._cameraFollowYaw -= event.movementX * GameScene.CAMERA_ORBIT_SPEED;
                this._updateCameraFollow();
            }
        });
    }

    private _updateCameraFollow(): void {
        if (!this._isCameraFollowingPlayer || !this.player?.mesh) {
            return;
        }

        const playerPosition = this.player.mesh.position;
        const cameraOffset = new Vector3(
            Math.sin(this._cameraFollowYaw) * this._cameraFollowHorizontalDistance,
            this._cameraFollowHorizontalDistance * GameScene.CAMERA_ELEVATION_RATIO,
            Math.cos(this._cameraFollowYaw) * this._cameraFollowHorizontalDistance
        );

        this._camera.position.copyFrom(playerPosition.add(cameraOffset));
        this._camera.setTarget(playerPosition);
    }

    private _clamp(value: number, min: number, max: number): number {
        return Math.min(Math.max(value, min), max);
    }

    private async _buildLevel(levelId: LevelId): Promise<Mesh[]> {
        switch (levelId) {
            case LEVEL_IDS.LEVEL_1:
                return await this._buildLevel1();
            case LEVEL_IDS.LEVEL_2:
                return this._buildLevel2();
            case LEVEL_IDS.LEVEL_3:
                return this._buildLevel3();
            case LEVEL_IDS.TESTING_GROUND:
                return this._buildTestingGround();
            default:
                throw new Error(`No level builder configured for ${levelId}`);
        }
    }

    private async _buildLevel1(): Promise<Mesh[]> 
    {
        const result = await ImportMeshAsync(`/models/apartment1.glb`, this.scene);
        result.meshes.forEach((mesh) => {
            mesh.receiveShadows = true;
        });
        const glbRoot = result.meshes[0];
        glbRoot.scaling = new Vector3(100, 100, 100);
        glbRoot.position = new Vector3(0, -30, 0);
        
        const glbMeshes = result.meshes as Mesh[];

        const ground = this._createGround("level1_ground", 200, 200);


        const building1 = MeshBuilder.CreateBox("level1_building_1", { width: 12, height: 8, depth: 12 }, this.scene);
        building1.position = new Vector3(-12, 4, -12);

        const building2 = MeshBuilder.CreateBox("level1_building_2", { width: 12, height: 8, depth: 12 }, this.scene);
        building2.position = new Vector3(12, 4, 12);

        const wall = MeshBuilder.CreateBox("level1_wall", { width: 4, height: 4, depth: 18 }, this.scene);
        wall.position = new Vector3(-15, 2, 12);

        return [ground, building1, building2, ...glbMeshes];
    }

    private _buildLevel2(): Mesh[] 
    {
        const ground = this._createGround("level2_ground", 200, 200);
        const wallA = MeshBuilder.CreateBox("level2_wall_a", { width: 4, height: 4, depth: 18 }, this.scene);
        wallA.position = new Vector3(0, 2, 12);
        const wallB = MeshBuilder.CreateBox("level2_wall_b", { width: 4, height: 4, depth: 18 }, this.scene);
        wallB.position = new Vector3(0, 2, -12);

        return [ground, wallA, wallB];
    }

    private _buildLevel3(): Mesh[] {
        const ground = this._createGround("level3_ground", 200, 200);
        const obstacle = MeshBuilder.CreateBox("level3_obstacle", { size: 4 }, this.scene);
        obstacle.position = new Vector3(0, 2, 0);

        return [ground, obstacle];
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
            if (this._isGameOver || this._hasWon || pointerInfo.type !== PointerEventTypes.POINTERDOWN || pointerInfo.event.button !== 0) {
                return;
            }

            const pickInfo = pointerInfo.pickInfo;
            if (!pickInfo?.hit || !this.player.isSelected) {
                return;
            }

            if (this._jumpTargetingActive) {
                this._tryPlayerJump(pickInfo.pickedPoint!);
                return;
            }

            const pickedEnemy = this._getEnemyFromPickedMesh(pickInfo.pickedMesh);
            if (pickedEnemy) {
                this._tryPlayerAttack(pickedEnemy, pickInfo.pickedPoint ?? pickedEnemy.mesh?.position);
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

    private _setJumpTargeting(isActive: boolean): void {
        if (isActive && !this._canPlayerJump()) {
            isActive = false;
        }

        this._jumpTargetingActive = isActive;

        if (!isActive) {
            this._clearJumpRadius();
            return;
        }

        this._drawJumpRadius();
    }

    private _drawJumpRadius(): void {
        this._clearJumpRadius();

        if (!this.player?.mesh) {
            return;
        }

        const radius = this.player.getBasicActionRadius(BasicActionId.JUMP);
        const radiusMesh = MeshBuilder.CreateDisc(
            "jumpRadius",
            { radius, tessellation: 96 },
            this.scene
        );
        radiusMesh.rotation.x = Math.PI / 2;
        radiusMesh.position.copyFrom(this.player.mesh.position);
        radiusMesh.position.y = Math.max(0.04, this.player.mesh.position.y - 0.96);
        radiusMesh.isPickable = false;

        const material = new StandardMaterial("jumpRadiusMat", this.scene);
        material.diffuseColor = new Color3(0.2, 0.85, 1);
        material.emissiveColor = new Color3(0.05, 0.25, 0.35);
        material.alpha = 0.22;
        material.backFaceCulling = false;
        radiusMesh.material = material;

        this._jumpRadiusMesh = radiusMesh;
    }

    private _canPlayerJump(): boolean {
        return this._jumpCooldownRemaining <= 0;
    }

    private _updateJumpCooldown(): void {
        if (this._jumpCooldownRemaining <= 0) {
            return;
        }

        const deltaSeconds = this.scene.getEngine().getDeltaTime() / 1000;
        this._jumpCooldownRemaining = Math.max(0, this._jumpCooldownRemaining - deltaSeconds);
    }

    private _clearJumpRadius(): void {
        if (this._jumpRadiusMesh?.material) {
            this._jumpRadiusMesh.material.dispose();
        }

        this._jumpRadiusMesh?.dispose();
        this._jumpRadiusMesh = null;
    }

    private _tryPlayerJump(destination: Vector3): void {
        if (!this._canPlayerJump()) {
            this._createClickFeedback(destination, new Color3(1, 0.2, 0.15));
            this._setJumpTargeting(false);
            return;
        }

        const result = this.player.performBasicAction(BasicActionId.JUMP, {
            targetPoint: destination
        });

        if (!result.success) {
            this._createClickFeedback(destination, new Color3(1, 0.2, 0.15));
            return;
        }

        this._clearPath();
        this._jumpCooldownRemaining = GameScene.JUMP_COOLDOWN_SECONDS;
        this._createClickFeedback(destination, new Color3(0.2, 0.85, 1));
        this._setJumpTargeting(false);
    }

    private _getEnemyFromPickedMesh(pickedMesh?: AbstractMesh | null): AISoldier | null {
        if (!pickedMesh) {
            return null;
        }

        return this._enemies.find((enemy) => !enemy.isDead && enemy.ownsMesh(pickedMesh)) ?? null;
    }

    private _tryPlayerAttack(enemy: AISoldier, feedbackPosition?: Vector3): void {
        if (this._isGameOver || this._hasWon || !this.player?.mesh || this.player.isDead || !enemy.mesh) {
            return;
        }

        const hitPosition = feedbackPosition?.clone() ?? enemy.mesh.position.clone();
        this._clearPath();
        this.player.stopMovement();

        const actionId = this.player.canPerformBasicAction(BasicActionId.MELEE_ATTACK, { target: enemy })
            ? BasicActionId.MELEE_ATTACK
            : BasicActionId.RANGED_ATTACK;

        const result = this.player.performBasicAction(actionId, { target: enemy });
        if (!result.success) {
            this._createClickFeedback(hitPosition, new Color3(1, 0.2, 0.15));
            return;
        }

        const feedbackColor = enemy.isDead
            ? new Color3(0.2, 0.85, 0.25)
            : result.damage && result.damage > 0
                ? new Color3(1, 0.55, 0.15)
                : new Color3(1, 0.9, 0.2);

        this._createClickFeedback(hitPosition, feedbackColor);
        this._removeDeadEnemies();
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

    private _createClickFeedback(position: Vector3, color: Color3 = new Color3(1, 1, 1)): void {
        const feedback = MeshBuilder.CreateDisc("clickFeedback", { radius: 0.5 }, this.scene);

        feedback.position = position.clone();
        feedback.position.y += 0.05;
        feedback.rotation.x = Math.PI / 2;

        const mat = new StandardMaterial("feedbackMat", this.scene);
        mat.diffuseColor = color;
        mat.emissiveColor = color.scale(0.5);
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

    private _createExtractionPoint(levelId: LevelId): void {
        this._extractionPoint = this._getExtractionPointForLevel(levelId);

        const extractionMesh = MeshBuilder.CreateCylinder(
            "extractionZone",
            {
                diameter: GameScene.EXTRACTION_RADIUS * 2,
                height: 0.08,
                tessellation: 96
            },
            this.scene
        );
        extractionMesh.position.copyFrom(this._extractionPoint);
        extractionMesh.position.y = 0.06;
        extractionMesh.isPickable = false;

        const material = new StandardMaterial("extractionZoneMat", this.scene);
        material.diffuseColor = new Color3(0.15, 0.95, 0.45);
        material.emissiveColor = new Color3(0.02, 0.35, 0.12);
        material.alpha = 0.35;
        material.backFaceCulling = false;
        extractionMesh.material = material;

        const ring = MeshBuilder.CreateTorus(
            "extractionZoneRing",
            {
                diameter: GameScene.EXTRACTION_RADIUS * 2,
                thickness: 0.12,
                tessellation: 96
            },
            this.scene
        );
        ring.position.copyFrom(extractionMesh.position);
        ring.position.y += 0.08;
        ring.isPickable = false;
        ring.material = material;

        this._extractionMesh = extractionMesh;
    }

    private _getExtractionPointForLevel(levelId: LevelId): Vector3 {
        switch (levelId) {
            case LEVEL_IDS.LEVEL_1:
                return new Vector3(28, 0.06, 28);
            case LEVEL_IDS.LEVEL_2:
                return new Vector3(0, 0.06, -34);
            case LEVEL_IDS.LEVEL_3:
                return new Vector3(24, 0.06, 24);
            case LEVEL_IDS.TESTING_GROUND:
                return new Vector3(32, 0.06, 32);
            default:
                return new Vector3(28, 0.06, 28);
        }
    }

    private _createExtractionHud(): void {
        const panel = new Rectangle("extractionHud");
        panel.width = "280px";
        panel.height = "48px";
        panel.thickness = 1;
        panel.cornerRadius = 6;
        panel.color = "#ffffff";
        panel.background = "rgba(10, 10, 10, 0.65)";
        panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        panel.top = "18px";

        this._extractionText = new TextBlock("extractionText", "");
        this._extractionText.color = "white";
        this._extractionText.fontSize = 16;
        this._extractionText.fontWeight = "bold";
        panel.addControl(this._extractionText);

        this._ui.addControl(panel);
        this._updateExtractionHud();
    }

    private _createPlayerHealthHud(): void {
        const panel = new Rectangle("playerHealthHud");
        panel.width = "180px";
        panel.height = "48px";
        panel.thickness = 1;
        panel.cornerRadius = 6;
        panel.color = "#ffffff";
        panel.background = "rgba(10, 10, 10, 0.65)";
        panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        panel.left = "18px";
        panel.top = "18px";

        this._playerHealthText = new TextBlock("playerHealthText", "");
        this._playerHealthText.color = "white";
        this._playerHealthText.fontSize = 18;
        this._playerHealthText.fontWeight = "bold";
        panel.addControl(this._playerHealthText);

        this._ui.addControl(panel);
        this._updatePlayerHealthHud();
    }

    private _updatePlayerHealthHud(): void {
        if (!this._playerHealthText || !this.player) {
            return;
        }

        this._playerHealthText.text = `HP: ${this.player.currentHp}/${this.player.maxHp}`;
        this._playerHealthText.color = this.player.currentHp <= this.player.maxHp * 0.3 ? "#ff6b5f" : "white";
    }

    private _updateExtractionState(): void {
        if (
            this._isGameOver ||
            this._hasWon ||
            !this.player?.mesh ||
            this.player.isDead ||
            !this._extractionPoint
        ) {
            return;
        }

        const deltaSeconds = this.scene.getEngine().getDeltaTime() / 1000;
        const distanceToExtraction = Vector3.Distance(
            new Vector3(this.player.mesh.position.x, 0, this.player.mesh.position.z),
            new Vector3(this._extractionPoint.x, 0, this._extractionPoint.z)
        );
        const isInsideExtraction = distanceToExtraction <= GameScene.EXTRACTION_RADIUS;

        this._extractionHoldSeconds = isInsideExtraction
            ? Math.min(GameScene.EXTRACTION_HOLD_SECONDS, this._extractionHoldSeconds + deltaSeconds)
            : 0;

        if (this._extractionMesh) {
            const pulse = 1 + Math.sin(performance.now() * 0.006) * 0.04;
            this._extractionMesh.scaling.set(pulse, 1, pulse);
        }

        if (this._extractionHoldSeconds >= GameScene.EXTRACTION_HOLD_SECONDS) {
            this._completeExtraction();
        }
    }

    private _updateExtractionHud(): void {
        if (!this._extractionText) {
            return;
        }

        if (this._hasWon) {
            this._extractionText.text = "Extraction reussie";
            this._extractionText.color = "#64ff8a";
            return;
        }

        if (this._isGameOver || this.player?.isDead) {
            this._extractionText.text = "";
            return;
        }

        const remainingSeconds = Math.max(0, GameScene.EXTRACTION_HOLD_SECONDS - this._extractionHoldSeconds);
        this._extractionText.text = this._extractionHoldSeconds > 0
            ? `Extraction: ${remainingSeconds.toFixed(1)}s`
            : "Rejoindre la zone d'extraction";
        this._extractionText.color = this._extractionHoldSeconds > 0 ? "#64ff8a" : "white";
    }

    private _completeExtraction(): void {
        if (this._hasWon) {
            return;
        }

        this._hasWon = true;
        this._clearPath();
        this._setJumpTargeting(false);
        this.player.stopMovement();
        this._enemies.forEach((enemy) => enemy.stopMovement());
        this._showVictoryScreen();
    }

    private _removeDeadEnemies(): void {
        this._enemies = this._enemies.filter((enemy) => !enemy.isDead);
    }

    private _updateCombatState(): void {
        this._removeDeadEnemies();

        if (this._isGameOver || this._hasWon || !this.player?.isDead) {
            return;
        }

        this._isGameOver = true;
        this._clearPath();
        this._setJumpTargeting(false);
        this.player.stopMovement();
        this._enemies.forEach((enemy) => enemy.stopMovement());
        this._showGameOverScreen();
    }

    private _showVictoryScreen(): void {
        if (this._victoryPanel) {
            return;
        }

        const overlay = new Rectangle("victoryOverlay");
        overlay.width = "100%";
        overlay.height = "100%";
        overlay.thickness = 0;
        overlay.background = "rgba(0, 0, 0, 0.72)";

        const content = new StackPanel("victoryContent");
        content.width = "380px";
        content.height = "230px";
        content.spacing = 18;
        content.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        content.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;

        const title = new TextBlock("victoryTitle", "VICTOIRE");
        title.height = "70px";
        title.color = "#64ff8a";
        title.fontSize = 48;
        title.fontWeight = "bold";
        content.addControl(title);

        const subtitle = new TextBlock("victorySubtitle", "Extraction terminee");
        subtitle.height = "34px";
        subtitle.color = "white";
        subtitle.fontSize = 20;
        content.addControl(subtitle);

        const menuButton = Button.CreateSimpleButton("victoryMenuButton", "Retour menu");
        menuButton.width = "190px";
        menuButton.height = "50px";
        menuButton.color = "white";
        menuButton.background = "#256d3a";
        menuButton.cornerRadius = 6;
        menuButton.onPointerUpObservable.add(() => this._onReturnToMenu());
        content.addControl(menuButton);

        overlay.addControl(content);
        this._ui.addControl(overlay);
        this._victoryPanel = overlay;
    }

    private _showGameOverScreen(): void {
        if (this._gameOverPanel) {
            return;
        }

        const overlay = new Rectangle("gameOverOverlay");
        overlay.width = "100%";
        overlay.height = "100%";
        overlay.thickness = 0;
        overlay.background = "rgba(0, 0, 0, 0.78)";

        const content = new StackPanel("gameOverContent");
        content.width = "360px";
        content.height = "230px";
        content.spacing = 18;
        content.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        content.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;

        const title = new TextBlock("gameOverTitle", "GAME OVER");
        title.height = "70px";
        title.color = "#ff6b5f";
        title.fontSize = 46;
        title.fontWeight = "bold";
        content.addControl(title);

        const subtitle = new TextBlock("gameOverSubtitle", "Vous etes mort");
        subtitle.height = "34px";
        subtitle.color = "white";
        subtitle.fontSize = 20;
        content.addControl(subtitle);

        const menuButton = Button.CreateSimpleButton("gameOverMenuButton", "Retour menu");
        menuButton.width = "190px";
        menuButton.height = "50px";
        menuButton.color = "white";
        menuButton.background = "#343a40";
        menuButton.cornerRadius = 6;
        menuButton.onPointerUpObservable.add(() => this._onReturnToMenu());
        content.addControl(menuButton);

        overlay.addControl(content);
        this._ui.addControl(overlay);
        this._gameOverPanel = overlay;
    }

    private _clearPath(): void {
        this._activePath = [];
        this._activePathIndex = 0;
        this._pathLine?.dispose();
        this._pathLine = null;
    }

    private _updatePlayerNavigation(): void {
        if (this._isGameOver || this._hasWon || !this.player?.mesh || this.player.isDead || this._activePathIndex >= this._activePath.length) {
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

            this.player.moveToward(physicsTarget);

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

    private _updateJumpRadius(): void {
        if (!this._jumpRadiusMesh || !this.player?.mesh) {
            return;
        }

        this._jumpRadiusMesh.position.x = this.player.mesh.position.x;
        this._jumpRadiusMesh.position.y = Math.max(0.04, this.player.mesh.position.y - 0.96);
        this._jumpRadiusMesh.position.z = this.player.mesh.position.z;
    }

    private _updateEnemies(): void {
        if (this._isGameOver || this._hasWon || !this.player?.mesh || this.player.isDead) {
            this._enemies.forEach((enemy) => enemy.stopMovement());
            return;
        }

        const deltaSeconds = this.scene.getEngine().getDeltaTime() / 1000;
        this._enemies.forEach((enemy) => {
            if (!enemy.isDead) {
                enemy.update(this.player, deltaSeconds);
            }
        });
    }

    private _updateCollectables(): void {
        if (!this.player?.mesh) {
            return;
        }

        for (let i = this._objects.length - 1; i >= 0; i--) {
            const object = this._objects[i];

            if (!(object instanceof Collectable) || !object.mesh) {
                continue;
            }

            if (object instanceof Grenade && object.isActivated) {
                continue;
            }

            const distanceToPlayer = Vector3.Distance(this.player.mesh.position, object.mesh.position);

            if (distanceToPlayer > GameScene.GRENADE_PICKUP_DISTANCE) {
                continue;
            }

            this.player.inventory.addItem(object);
            this.player.inventoryUI.refresh();
            object.collect(this.player);
            this._objects.splice(i, 1);
        }
    }

    private async _createPlayer(): Promise<void> 
    {
        console.log("Creating player...");
        this.player = new Player(
            this.scene,
            this._inputManager,
            this._shadowGenerator,
            this._ui,
            this._playerClassId
        );
        await this.player.ready;
    }

    private async _createEnemy(behaviorId?: EnemyBehaviorId): Promise<void> {
        console.log("Creating enemy...");
        const enemy = new AISoldier(this.scene, this._shadowGenerator, this._ui, behaviorId);
        await enemy.ready;
        this._enemies.push(enemy);
    }


}
