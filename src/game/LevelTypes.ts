export const LEVEL_IDS = {
    LEVEL_1: "level1",
    TESTING_GROUND: "testingGround"
} as const;

export type LevelId = typeof LEVEL_IDS[keyof typeof LEVEL_IDS];

export interface LevelDefinition {
    id: LevelId;
    label: string;
    description?: string;
}
