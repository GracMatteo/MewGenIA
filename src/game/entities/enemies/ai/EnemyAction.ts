import { Vector3 } from "@babylonjs/core";
import type { Player } from "../../player/Player";

export const EnemyActionId = {
    CHASE_TARGET: "CHASE_TARGET",
    FLEE_TARGET: "FLEE_TARGET",
    IDLE: "IDLE",
    PATROL: "PATROL"
} as const;

export type EnemyActionId = typeof EnemyActionId[keyof typeof EnemyActionId];

export interface EnemyAgent {
    mesh?: { position: Vector3; rotation: Vector3 };
    moveToward(target: Vector3, speedMultiplier?: number): void;
    stopMovement(): void;
    getSpawnPosition(): Vector3;
}

export interface EnemyActionContext {
    enemy: EnemyAgent;
    target: Player;
    deltaSeconds: number;
}

export interface EnemyAction {
    readonly id: EnemyActionId;
    canRun(context: EnemyActionContext): boolean;
    run(context: EnemyActionContext): void;
}

function getPlanarDistance(a: Vector3, b: Vector3): number {
    return Vector3.Distance(new Vector3(a.x, 0, a.z), new Vector3(b.x, 0, b.z));
}

function hasReadyMeshes(context: EnemyActionContext): boolean {
    return Boolean(context.enemy.mesh && context.target.mesh);
}

export class ChaseTargetAction implements EnemyAction {
    public readonly id = EnemyActionId.CHASE_TARGET;
    private readonly _minDistance: number;
    private readonly _maxDistance: number;
    private readonly _speedMultiplier: number;

    constructor(
        minDistance: number = 1.8,
        maxDistance: number = 30,
        speedMultiplier: number = 1
    ) {
        this._minDistance = minDistance;
        this._maxDistance = maxDistance;
        this._speedMultiplier = speedMultiplier;
    }

    canRun(context: EnemyActionContext): boolean {
        if (!hasReadyMeshes(context)) {
            return false;
        }

        const distance = getPlanarDistance(context.enemy.mesh!.position, context.target.mesh!.position);
        return distance > this._minDistance && distance <= this._maxDistance;
    }

    run(context: EnemyActionContext): void {
        context.enemy.moveToward(context.target.mesh!.position, this._speedMultiplier);
    }
}

export class FleeTargetAction implements EnemyAction {
    public readonly id = EnemyActionId.FLEE_TARGET;
    private readonly _dangerDistance: number;
    private readonly _fleeDistance: number;
    private readonly _speedMultiplier: number;

    constructor(
        dangerDistance: number = 9,
        fleeDistance: number = 7,
        speedMultiplier: number = 1.2
    ) {
        this._dangerDistance = dangerDistance;
        this._fleeDistance = fleeDistance;
        this._speedMultiplier = speedMultiplier;
    }

    canRun(context: EnemyActionContext): boolean {
        if (!hasReadyMeshes(context)) {
            return false;
        }

        return getPlanarDistance(context.enemy.mesh!.position, context.target.mesh!.position) <= this._dangerDistance;
    }

    run(context: EnemyActionContext): void {
        const enemyPosition = context.enemy.mesh!.position;
        const targetPosition = context.target.mesh!.position;
        const fleeDirection = enemyPosition.subtract(targetPosition);
        fleeDirection.y = 0;

        if (fleeDirection.lengthSquared() <= 0.001) {
            fleeDirection.copyFromFloats(1, 0, 0);
        }

        fleeDirection.normalize();
        context.enemy.moveToward(enemyPosition.add(fleeDirection.scale(this._fleeDistance)), this._speedMultiplier);
    }
}

export class IdleAction implements EnemyAction {
    public readonly id = EnemyActionId.IDLE;

    canRun(): boolean {
        return true;
    }

    run(context: EnemyActionContext): void {
        context.enemy.stopMovement();
    }
}

export class PatrolAroundSpawnAction implements EnemyAction {
    public readonly id = EnemyActionId.PATROL;
    private _currentTarget: Vector3 | null = null;
    private _timeBeforeNewTarget = 0;
    private readonly _radius: number;
    private readonly _targetReachedDistance: number;
    private readonly _speedMultiplier: number;

    constructor(
        radius: number = 8,
        targetReachedDistance: number = 0.7,
        speedMultiplier: number = 0.75
    ) {
        this._radius = radius;
        this._targetReachedDistance = targetReachedDistance;
        this._speedMultiplier = speedMultiplier;
    }

    canRun(context: EnemyActionContext): boolean {
        return Boolean(context.enemy.mesh);
    }

    run(context: EnemyActionContext): void {
        const enemyPosition = context.enemy.mesh!.position;
        this._timeBeforeNewTarget -= context.deltaSeconds;

        if (
            !this._currentTarget ||
            this._timeBeforeNewTarget <= 0 ||
            getPlanarDistance(enemyPosition, this._currentTarget) <= this._targetReachedDistance
        ) {
            this._currentTarget = this._pickPatrolTarget(context.enemy.getSpawnPosition(), enemyPosition.y);
            this._timeBeforeNewTarget = 2.5 + Math.random() * 2.5;
        }

        context.enemy.moveToward(this._currentTarget, this._speedMultiplier);
    }

    private _pickPatrolTarget(spawnPosition: Vector3, currentY: number): Vector3 {
        const angle = Math.random() * Math.PI * 2;
        const distance = this._radius * (0.35 + Math.random() * 0.65);

        return new Vector3(
            spawnPosition.x + Math.cos(angle) * distance,
            currentY,
            spawnPosition.z + Math.sin(angle) * distance
        );
    }
}
