import type { Collectable } from "../objects/Collectable";



export class Inventory {
    private items: Map<string, Collectable> = new Map();
    



    addItem(item: Collectable): void {
        if (this.items.has(item.itemName)) {
            console.warn(`Item ${item.itemName} is already in the inventory.`);
            return;
        }
        this.items.set(item.itemName, item);
        console.log(`Added ${item.itemName} to inventory.`);
    }

    removeItem(itemName: string): void {
        if (!this.items.has(itemName)) {
            console.warn(`Item ${itemName} not found in inventory.`);
            return;
        }
        this.items.delete(itemName);
        console.log(`Removed ${itemName} from inventory.`);
    }

    hasItem(itemName: string): boolean {
        return this.items.has(itemName);
    }

    
}