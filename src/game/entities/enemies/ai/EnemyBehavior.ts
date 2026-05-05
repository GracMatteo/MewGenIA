import type { EnemyAction, EnemyActionContext } from "./EnemyAction";
import {
    ChaseTargetAction,
    FleeTargetAction,
    IdleAction,
    PatrolAroundSpawnAction
} from "./EnemyAction";

export const EnemyBehaviorId = {
    AGGRESSIVE: "AGGRESSIVE",
    FEARFUL: "FEARFUL",
    PATROLLER: "PATROLLER"
} as const;

export type EnemyBehaviorId = typeof EnemyBehaviorId[keyof typeof EnemyBehaviorId];

export interface EnemyBehavior {
    readonly id: EnemyBehaviorId;
    update(context: EnemyActionContext): void;
}

class ActionSequenceBehavior implements EnemyBehavior {
    public readonly id: EnemyBehaviorId;
    private readonly _actions: EnemyAction[];

    constructor(
        id: EnemyBehaviorId,
        actions: EnemyAction[]
    ) {
        this.id = id;
        this._actions = actions;
    }

    update(context: EnemyActionContext): void {
        const action = this._actions.find((candidate) => candidate.canRun(context));

        if (action) {
            action.run(context);
        }
    }
}

export function createEnemyBehavior(behaviorId: EnemyBehaviorId): EnemyBehavior {
    switch (behaviorId) {
        case EnemyBehaviorId.AGGRESSIVE:
            return new ActionSequenceBehavior(behaviorId, [
                new ChaseTargetAction(1.8, 40, 1.05),
                new IdleAction()
            ]);
        case EnemyBehaviorId.FEARFUL:
            return new ActionSequenceBehavior(behaviorId, [
                new FleeTargetAction(12, 8, 1.25),
                new PatrolAroundSpawnAction(10, 0.7, 0.65),
                new IdleAction()
            ]);
        case EnemyBehaviorId.PATROLLER:
            return new ActionSequenceBehavior(behaviorId, [
                new ChaseTargetAction(2, 10, 0.9),
                new PatrolAroundSpawnAction(12, 0.7, 0.75),
                new IdleAction()
            ]);
        default:
            return new ActionSequenceBehavior(EnemyBehaviorId.PATROLLER, [
                new PatrolAroundSpawnAction(),
                new IdleAction()
            ]);
    }
}

export function getRandomEnemyBehaviorId(): EnemyBehaviorId {
    const behaviorIds = Object.values(EnemyBehaviorId);
    return behaviorIds[Math.floor(Math.random() * behaviorIds.length)];
}
