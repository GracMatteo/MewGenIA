export type PlayerClassId = "soldier" | "scout" | "guardian";

export interface PlayerStats {
    hp: number;
    attack: number;
    movementSpeed: number;
    accuracy: number;
}

export interface PlayerClass {
    id: PlayerClassId;
    name: string;
    description: string;
    modelPath: string;
    stats: PlayerStats;
}

export const PLAYER_CLASSES: Record<PlayerClassId, PlayerClass> = {
    soldier: {
        id: "soldier",
        name: "Cyborg",
        description: "When man and machine merge, you get the cyborg. A balanced class with decent durability, attack power, and accuracy. Not the fastest, but reliable in combat.",
        modelPath: "/models/player.glb",
        stats: {
            hp: 120,
            attack: 18,
            movementSpeed: 6,
            accuracy: 0.75
        }
    },
    scout: {
        id: "scout",
        name: "Soldier",
        description: "The strength of mankind, instinctive and versatile, but less durable and precise than the other classes.",
        modelPath: "/models/player.glb",
        stats: {
            hp: 85,
            attack: 14,
            movementSpeed: 8,
            accuracy: 0.9
        }
    },
    guardian: {
        id: "guardian",
        name: "Terminator",
        description: "A heavily armored class, slow but with high durability and powerful attacks. Less accurate due to its bulk.",
        modelPath: "/models/player.glb",
        stats: {
            hp: 170,
            attack: 24,
            movementSpeed: 4.5,
            accuracy: 0.6
        }
    }
};

export const DEFAULT_PLAYER_CLASS_ID: PlayerClassId = "soldier";

export function getPlayerClass(playerClassId: PlayerClassId): PlayerClass {
    return PLAYER_CLASSES[playerClassId];
}
