import { AnimationGroup, Scene, Skeleton } from "@babylonjs/core";
import { AssetManager } from "../../AssetManager";

/**
 * Minimal animation controller for the player.
 * For now, it only handles the walking cycle and toggles it based on movement.
 */
export class PlayerAnimationController {
    private _scene: Scene;
    private _skeleton?: Skeleton;

    private _walk?: AnimationGroup;
    private _current?: AnimationGroup;

    constructor(scene: Scene, skeleton?: Skeleton) {
        this._scene = scene;
        this._skeleton = skeleton;
    }

    async init(): Promise<void> {
        if (!(this._skeleton instanceof Skeleton)) return;

        // Load the shared walking animation and retarget it to the player's skeleton
        const container = await AssetManager.loadModel("/animations/walking.glb", this._scene);
        const sourceGroup = container.animationGroups[0];
        if (!sourceGroup) return;

        this._walk = sourceGroup.clone("player_walk", (oldTarget) => {
            if (!this._skeleton || typeof (oldTarget as any).name !== "string") {
                return oldTarget;
            }

            const targetName = (oldTarget as any).name;
            const bone = this._skeleton.bones.find((b) => b.name === targetName);
            if (bone) return bone;

            // Fallback to a node with the same name in the current scene
            const node = this._scene.getTransformNodeByName(targetName);
            return node ?? oldTarget;
        });

        // Ensure it starts paused
        this._walk.stop();
    }

    setMoving(moving: boolean): void {
        if (!this._walk) return;

        if (moving) {
            if (!this._walk.isPlaying) {
                this._walk.start(true);
            }
            this._current = this._walk;
            return;
        }

        if (this._current === this._walk && this._walk.isPlaying) {
            this._walk.stop();
            this._current = undefined;
        }
    }
}
