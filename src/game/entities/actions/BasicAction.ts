import { Vector3 } from "@babylonjs/core";
import type { Entity } from "../Entity";

export const BasicActionId = {
    MELEE_ATTACK: "MELEE_ATTACK",
    RANGED_ATTACK: "RANGED_ATTACK",
    JUMP: "JUMP"
} as const;

export type BasicActionId = typeof BasicActionId[keyof typeof BasicActionId];

export interface BasicActionContext {
    actor: Entity;
    target?: Entity;
    targetPoint?: Vector3;
}

export interface BasicActionResult {
    success: boolean;
    damage?: number;
    message?: string;
}

export interface BasicAction {
    readonly id: BasicActionId;
    readonly radius: number;
    canRun(context: BasicActionContext): boolean;
    run(context: BasicActionContext): BasicActionResult;
}

function getPlanarDistance(a: Vector3, b: Vector3): number {
    return Vector3.Distance(new Vector3(a.x, 0, a.z), new Vector3(b.x, 0, b.z));
}

function hasActorReady(context: BasicActionContext): boolean {
    return Boolean(context.actor.mesh);
}

function hasTargetReady(context: BasicActionContext): boolean {
    return Boolean(context.actor.mesh && context.target?.mesh);
}

export class MeleeAttackAction implements BasicAction {
    public readonly id = BasicActionId.MELEE_ATTACK;
    public readonly radius: number;

    constructor(radius: number = 2.2) {
        this.radius = radius;
    }

    canRun(context: BasicActionContext): boolean {
        if (!hasTargetReady(context)) {
            return false;
        }

        return getPlanarDistance(context.actor.mesh!.position, context.target!.mesh!.position) <= this.radius;
    }

    run(context: BasicActionContext): BasicActionResult {
        if (!this.canRun(context)) {
            return { success: false, message: "Melee target is out of range." };
        }

        const damage = Math.max(1, context.actor.stats?.attack ?? 1);
        context.actor.faceTarget(context.target!.mesh!.position);
        context.target!.receiveDamage(damage);

        return { success: true, damage };
    }
}

export class RangedAttackAction implements BasicAction {
    public readonly id = BasicActionId.RANGED_ATTACK;
    public readonly radius: number;

    constructor(radius: number = 18) {
        this.radius = radius;
    }

    canRun(context: BasicActionContext): boolean {
        if (!hasTargetReady(context)) {
            return false;
        }

        return getPlanarDistance(context.actor.mesh!.position, context.target!.mesh!.position) <= this.radius;
    }

    run(context: BasicActionContext): BasicActionResult {
        if (!this.canRun(context)) {
            return { success: false, message: "Ranged target is out of range." };
        }

        const stats = context.actor.stats;
        const accuracy = stats?.accuracy ?? 1;
        context.actor.faceTarget(context.target!.mesh!.position);

        if (Math.random() > accuracy) {
            return { success: true, damage: 0, message: "Ranged attack missed." };
        }

        const damage = Math.max(1, Math.round((stats?.attack ?? 1) * 0.8));
        context.target!.receiveDamage(damage);

        return { success: true, damage };
    }
}

export class JumpAction implements BasicAction {
    public readonly id = BasicActionId.JUMP;
    public readonly radius: number;

    constructor(radius: number = 8) {
        this.radius = radius;
    }

    canRun(context: BasicActionContext): boolean {
        if (!hasActorReady(context) || !context.targetPoint) {
            return false;
        }

        return getPlanarDistance(context.actor.mesh!.position, context.targetPoint) <= this.radius;
    }

    run(context: BasicActionContext): BasicActionResult {
        if (!this.canRun(context)) {
            return { success: false, message: "Jump destination is out of range." };
        }

        const didJump = context.actor.jumpTo(context.targetPoint!);
        return {
            success: didJump,
            message: didJump ? undefined : "Actor could not jump."
        };
    }
}

export function createBasicActionSet(): Record<BasicActionId, BasicAction> {
    return {
        [BasicActionId.MELEE_ATTACK]: new MeleeAttackAction(),
        [BasicActionId.RANGED_ATTACK]: new RangedAttackAction(),
        [BasicActionId.JUMP]: new JumpAction()
    };
}
