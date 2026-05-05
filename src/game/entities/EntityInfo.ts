export interface EntityStats {
    hp: number;
    attack: number;
    movementSpeed: number;
    accuracy: number;
}

export interface EntityInfo {
    name : string;
    description : string;
    playerClass?: string;
    stats?: EntityStats;
}
