import type { Entity } from "../entities/Entity";
import { Object } from "./Object";


export abstract class Collectable extends Object {

    public abstract itemName: string | undefined;
    public abstract iconPath: string | undefined;

    public collect(_player: Entity) : void {
        console.log(`Player collected: ${this.itemName}`);
        this.dispose();
    }


    private dispose() :void {
        this.mesh?.dispose();
        this.visualMeshes.forEach(m => m.dispose());
        this.aggregate?.dispose();
    }


}
