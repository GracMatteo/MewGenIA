import type { Collectable } from "../objects/Collectable";



export class Inventory {
    
    private items: Collectable[] = [];
    

    addItem(item: Collectable): void {
        this.items.push(item);
        console.log(`Added ${item.itemName!} to inventory.`);
    }

    getItem(itemName: string): Collectable | undefined {
        return this.items.find(item => item.itemName === itemName);
    }

    getItems(): Collectable[] {
        return [...this.items];
    }

    removeItem(itemName: string): Collectable | undefined {
        const itemIndex = this.items.findIndex(item => item.itemName === itemName);

        if (itemIndex === -1) {
            console.warn(`Item ${itemName} not found in inventory.`);
            return;
        }

        const [removedItem] = this.items.splice(itemIndex, 1);
        console.log(`Removed ${itemName} from inventory.`);
        return removedItem;
    }

    hasItem(itemName: string): boolean {
        return this.items.some(item => item.itemName === itemName);
    }

    
}
