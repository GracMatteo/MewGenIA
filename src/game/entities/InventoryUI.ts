import { 
    AdvancedDynamicTexture, 
    Rectangle, 
    Control, 
    TextBlock,
    Grid
} from "@babylonjs/gui";
import { Inventory } from "./Inventory";

export class InventoryUI {

    inventory: Inventory;
    uiTexture: AdvancedDynamicTexture;
    isOpen: boolean = false;

    // UI Elements
    private mainWindow!: Rectangle;
    private slotControls: Rectangle[] = []; // Array to keep track of the square slots
    private iconControls: Rectangle[] = [];
    private countControls: TextBlock[] = [];

    constructor(uiTexture: AdvancedDynamicTexture, inventory: Inventory) {
        this.uiTexture = uiTexture;
        this.inventory = inventory;

        this.createUI();
    }

    private createUI() {
        //Create the Main Rectangular Window
        this.mainWindow = new Rectangle("inventoryWindow");
        this.mainWindow.width = "300px";
        this.mainWindow.height = "500px";
        this.mainWindow.background = "rgba(20, 20, 20, 0.8)"; // Semi-transparent dark background
        this.mainWindow.thickness = 2;
        this.mainWindow.color = "#aaaaaa"; // Border color
        this.mainWindow.cornerRadius = 5;
        this.mainWindow.isVisible = false; // Hidden by default
        this.mainWindow.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        this.mainWindow.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        this.uiTexture.addControl(this.mainWindow);

        //Add a Title
        const title = new TextBlock("inventoryTitle", "Inventory");
        title.height = "500px";
        title.color = "white";
        title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        title.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        title.paddingTop = "10px";
        this.mainWindow.addControl(title);

        const slotsGrid = new Grid("inventorySlotsGrid");
        slotsGrid.width = "280px";
        slotsGrid.height = "380px";
        slotsGrid.top = "55px";
        slotsGrid.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        slotsGrid.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        this.mainWindow.addControl(slotsGrid);

        const columns = 4;
        const rows = 5;

        for (let column = 0; column < columns; column++) {
            slotsGrid.addColumnDefinition(1 / columns);
        }

        for (let row = 0; row < rows; row++) {
            slotsGrid.addRowDefinition(1 / rows);
        }

        //Generate the Square Object Slots
        const totalSlots = columns * rows; // You can change this to this.inventory.capacity
        for (let i = 0; i < totalSlots; i++) {
            const slot = new Rectangle(`slot_${i}`);
            slot.width = "62px";
            slot.height = "62px";
            slot.color = "#555555"; // Slot border
            slot.thickness = 2;
            slot.background = "rgba(50, 50, 50, 0.5)";
            
            // Margins to space out the squares
            slot.paddingLeft = "5px";
            slot.paddingRight = "5px";
            slot.paddingTop = "5px";
            slot.paddingBottom = "5px";

            const icon = new Rectangle(`slot_icon_${i}`);
            icon.width = "36px";
            icon.height = "36px";
            icon.thickness = 0;
            icon.background = "#28a745";
            icon.isVisible = false;
            slot.addControl(icon);

            const count = new TextBlock(`slot_count_${i}`, "");
            count.width = "28px";
            count.height = "24px";
            count.color = "white";
            count.fontSize = 18;
            count.fontWeight = "bold";
            count.outlineWidth = 2;
            count.outlineColor = "black";
            count.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
            count.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
            count.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
            count.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
            count.paddingRight = "5px";
            count.paddingBottom = "3px";
            count.isVisible = false;
            slot.addControl(count);
            
            slotsGrid.addControl(slot, Math.floor(i / columns), i % columns);
            this.slotControls.push(slot); // Save reference for the refresh() method
            this.iconControls.push(icon);
            this.countControls.push(count);
        }
    }

    show() {
        if (this.isOpen) return;
        this.isOpen = true;
        this.mainWindow.isVisible = true;
        this.refresh(); // Ensure data is up to date when opened
    }

    hide() {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.mainWindow.isVisible = false;
    }

    toggle() {
        this.isOpen ? this.hide() : this.show();
    }

    refresh() {
        if (!this.isOpen) return;

        const itemCounts = this.getItemCounts();
        
        for (let i = 0; i < this.slotControls.length; i++) {
            const slot = this.slotControls[i];
            const icon = this.iconControls[i];
            const count = this.countControls[i];
            const item = itemCounts[i];
            
            if (slot && icon && count && item) {
                slot.background = "rgba(50, 50, 50, 0.75)";
                icon.isVisible = true;
                count.text = item.count.toString();
                count.isVisible = true;
            } else {
                if (slot) {
                    slot.background = "rgba(50, 50, 50, 0.5)";
                }
                if (icon) {
                    icon.isVisible = false;
                }
                if (count) {
                    count.text = "";
                    count.isVisible = false;
                }
            }
        }
    }

    private getItemCounts(): { itemName: string; count: number }[] {
        const counts = new Map<string, number>();

        this.inventory.getItems().forEach((item) => {
            if (!item.itemName) {
                return;
            }

            counts.set(item.itemName, (counts.get(item.itemName) ?? 0) + 1);
        });

        return Array.from(counts.entries()).map(([itemName, count]) => ({ itemName, count }));
    }

    dispose() {
        // Cleaning up the main window automatically disposes of all its children
        this.mainWindow.dispose();
        this.slotControls = [];
        this.iconControls = [];
        this.countControls = [];
    }
}
