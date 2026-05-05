import { 
    AdvancedDynamicTexture, 
    Rectangle, 
    Control, 
    TextBlock 
} from "@babylonjs/gui";
import { Inventory } from "./Inventory";

export class InventoryUI {

    inventory: Inventory;
    uiTexture: AdvancedDynamicTexture;
    isOpen: boolean = false;

    // UI Elements
    private mainWindow!: Rectangle;
    private slotControls: Rectangle[] = []; // Array to keep track of the square slots

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
        title.height = "40px";
        title.color = "white";
        title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        title.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        title.paddingTop = "10px";
        this.mainWindow.addControl(title);

        // 3. Create the WrapPanel to hold the squares
        //this.slotsPanel = new WrapPanel();
        //this.slotsPanel.width = "360px"; // Slightly smaller than main window to act as padding
        //this.slotsPanel.paddingTop = "50px"; // Push down below the title
        //this.mainWindow.addControl(this.slotsPanel);

        //Generate the Square Object Slots
        const totalSlots = 20; // You can change this to this.inventory.capacity
        for (let i = 0; i < totalSlots; i++) {
            const slot = new Rectangle(`slot_${i}`);
            slot.width = "70px";
            slot.height = "70px";
            slot.color = "#555555"; // Slot border
            slot.thickness = 2;
            slot.background = "rgba(50, 50, 50, 0.5)";
            
            // Margins to space out the squares
            slot.paddingLeft = "5px";
            slot.paddingRight = "5px";
            slot.paddingTop = "5px";
            slot.paddingBottom = "5px";
            
            //this.slotsPanel.addControl(slot);
            this.slotControls.push(slot); // Save reference for the refresh() method
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

        // Example logic for updating the visual state of the squares
        // You would tie this to whatever data structure your Inventory class uses
        
        /*
        const items = this.inventory.getItems(); 
        
        for (let i = 0; i < this.slotControls.length; i++) {
            const slot = this.slotControls[i];
            
            if (items[i]) {
                // Slot is full: Change color, add an Image control inside the slot, etc.
                slot.background = "rgba(100, 200, 100, 0.8)"; // Greenish for occupied
            } else {
                // Slot is empty: Reset to default
                slot.background = "rgba(50, 50, 50, 0.5)";
            }
        }
        */
    }

    dispose() {
        // Cleaning up the main window automatically disposes of all its children
        this.mainWindow.dispose();
        this.slotControls = [];
    }
}