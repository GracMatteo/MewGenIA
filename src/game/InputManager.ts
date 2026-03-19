import { KeyboardEventTypes, Observer, type KeyboardInfo, type Scene } from "@babylonjs/core";

export const Action = {
    ZOOM_IN: "ZOOM_IN",
    ZOOM_OUT: "ZOOM_OUT",
    MENU: "MENU",
    INVENTORY: "INVENTORY",
    INTERACT: "INTERACT"
} as const;

export type Action = typeof Action[keyof typeof Action];

export class InputManager {
    private _inputMap: { [keyCode: string]: boolean } = {};
    private _scene: Scene; 
    
    public actionMapping: Record<Action, string[]> = {
        [Action.ZOOM_IN]: ["KeyW", "ArrowUp"],
        [Action.ZOOM_OUT]: ["KeyS", "ArrowDown"],
        [Action.MENU]: ["Escape"],
        [Action.INVENTORY]: ["KeyI", "KeyE"],
        [Action.INTERACT]: ["Space", "Enter"]
    };

    constructor(scene: Scene) {
        this._scene = scene;
        this._initObservers();
    }

    private _initObservers(): void {
        // Le type ici est KeyboardInfo
        this._scene.onKeyboardObservable.add((kbInfo: KeyboardInfo) => {
            const code = kbInfo.event.code;

            switch (kbInfo.type) {
                case KeyboardEventTypes.KEYDOWN:
                    this._inputMap[code] = true;
                    break;
                case KeyboardEventTypes.KEYUP:
                    this._inputMap[code] = false;
                    break;
            }
        });
    }

    public isActionActive(action: Action): boolean {
        const keys = this.actionMapping[action];
        return keys ? keys.some(key => this._inputMap[key]) : false;
    }

    /**
     * Utilise KeyboardInfo pour le type de retour de l'observable
     */
    public onActionTriggered(action: Action, callback: () => void): Observer<KeyboardInfo> {
        return this._scene.onKeyboardObservable.add((kbInfo: KeyboardInfo) => {
            if (kbInfo.type === KeyboardEventTypes.KEYDOWN) {
                const keys = this.actionMapping[action];
                if (keys?.includes(kbInfo.event.code)) {
                    callback();
                }
            }
        });
    }
}