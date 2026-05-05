import {
    ImportMeshAsync,
    MeshBuilder,
    PhysicsAggregate,
    PhysicsMotionType,
    PhysicsShapeType,
    Vector3,
    type Scene,
    type ShadowGenerator
} from "@babylonjs/core";
import { Entity } from "../Entity";
import type { AdvancedDynamicTexture } from "@babylonjs/gui";
import "@babylonjs/loaders/glTF";
import type { Player } from "../player/Player";
import type { EntityStats } from "../EntityInfo";
import {
    createEnemyBehavior,
    EnemyBehaviorId,
    getRandomEnemyBehaviorId,
    type EnemyBehavior
} from "./ai/EnemyBehavior";

export class AISoldier extends Entity
{
    private static readonly MOVE_STOP_DISTANCE = 0.2;
    private static readonly BASE_STATS: EntityStats = {
        hp: 90,
        attack: 12,
        movementSpeed: 4.8,
        accuracy: 0.65
    };

    capsuleAggregate: any;
    public readonly ready: Promise<void>;
    public readonly behaviorId: EnemyBehaviorId;
    private readonly _behavior: EnemyBehavior;
    private _spawnPosition = Vector3.Zero();

    constructor(
        scene: Scene,
        shadowGenerator: ShadowGenerator,
        uiTexture: AdvancedDynamicTexture,
        behaviorId: EnemyBehaviorId = getRandomEnemyBehaviorId()
    )
    {
        super("ai_soldier", scene, shadowGenerator, uiTexture);
        this.behaviorId = behaviorId;
        this._behavior = createEnemyBehavior(behaviorId);
        this.ready = this.init();

    }
    async init()
    {
        const result = await ImportMeshAsync(this.modelPath, this.scene);
        const modelRoot = result.meshes[0];
        modelRoot.name = "ai_soldier_visual_root";
        modelRoot.rotation.y = Math.PI;
        this.visualMeshes = result.meshes;
        this.visualMeshes.forEach((mesh) => {
            mesh.isPickable = false;
        });

        // Mesh invisible pour la physique
        this.mesh = MeshBuilder.CreateCapsule("ai_soldier_collider", { height: 2, radius: 0.5 }, this.scene);
        this.mesh.isVisible = true;
        this.mesh.visibility = 0; // Rendre le mesh invisible tout en gardant les collisions et le picking actifs
        this.mesh.position.y = 5;
        this.mesh.position.x = 10;
        this._spawnPosition = this.mesh.position.clone();

        // Le mesh visuel suit le collider
        this.scene.registerBeforeRender(() => {
            if (!this.mesh || this.visualMeshes.length === 0) {
                return;
            }

            this.visualMeshes[0].position.copyFrom(this.mesh.position);
            this.visualMeshes[0].position.y -= 1; // offset pour centrer le mesh dans la capsule
            this.visualMeshes[0].rotation.y = this.mesh.rotation.y + Math.PI;
        });

        this.capsuleAggregate = new PhysicsAggregate(this.mesh, PhysicsShapeType.CAPSULE, { mass: 0.1, restitution: 0 }, this.scene);
        this.capsuleAggregate.body.setMotionType(PhysicsMotionType.DYNAMIC);
        this.capsuleAggregate.body.setMassProperties({
            inertia: Vector3.Zero()
        });
        this.capsuleAggregate.body.setAngularDamping(0.95);
        this.capsuleAggregate.body.setAngularVelocity(Vector3.Zero());

        this.info = {
            name : "Enemy",
            description : `This enemy uses the ${this.behaviorId.toLowerCase()} behaviour.`,
            stats: AISoldier.BASE_STATS
        }

        this.onHoverHighlight();
    }
    
    update(target?: Player, deltaSeconds: number = this.scene.getEngine().getDeltaTime() / 1000)
    {
        if (!target || !this.mesh || !target.mesh) {
            this.stopMovement();
            return;
        }

        this._behavior.update({
            enemy: this,
            target,
            deltaSeconds
        });
    }

    fixedUpdate()
    {
    }

    getSpawnPosition(): Vector3 {
        return this._spawnPosition.clone();
    }

    moveToward(target: Vector3, speedMultiplier: number = 1): void
    {
        if (!this.mesh || !this.capsuleAggregate?.body) {
            return;
        }

        const direction = target.subtract(this.mesh.position);
        direction.y = 0;
        const distance = direction.length();
        const currentVelocity = this.capsuleAggregate.body.getLinearVelocity();
        const verticalVelocity = currentVelocity?.y ?? 0;

        if (distance <= AISoldier.MOVE_STOP_DISTANCE) {
            this.capsuleAggregate.body.setLinearVelocity(new Vector3(0, verticalVelocity, 0));
            return;
        }

        direction.normalize();
        const speed = AISoldier.BASE_STATS.movementSpeed * speedMultiplier;
        this.capsuleAggregate.body.setLinearVelocity(
            new Vector3(direction.x * speed, verticalVelocity, direction.z * speed)
        );

        this.mesh.rotation.y += (Math.atan2(direction.x, direction.z) - this.mesh.rotation.y) * 0.15;
    }

    stopMovement(): void
    {
        if (!this.capsuleAggregate?.body) {
            return;
        }

        const currentVelocity = this.capsuleAggregate.body.getLinearVelocity();
        this.capsuleAggregate.body.setLinearVelocity(new Vector3(0, currentVelocity?.y ?? 0, 0));
    }

}
