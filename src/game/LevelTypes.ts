export const LEVEL_IDS = {
    LEVEL_1: "level1",
    LEVEL_2: "level2",
    LEVEL_3: "level3",
    TESTING_GROUND: "testingGround"
} as const;

export type LevelId = typeof LEVEL_IDS[keyof typeof LEVEL_IDS];

export interface LevelDefinition {
    id: LevelId;
    label: string;
    description?: string;
}
