// AssetManager.ts
import { AssetContainer, LoadAssetContainerAsync, type Scene } from "@babylonjs/core";

export class AssetManager {
    private static cache: Map<string, AssetContainer> = new Map();

    static async loadModel(path: string, scene: Scene): Promise<AssetContainer> {
        if (this.cache.has(path)) {
            return this.cache.get(path)!;
        }

        const container = await LoadAssetContainerAsync(path, scene);
        this.cache.set(path, container);
        return container;
    }

    static instantiate(path: string, scene: Scene) {
        const container = this.cache.get(path);
        if (!container) throw new Error(`Model ${path} not loaded yet`);
        return container.instantiateModelsToScene();
    }
}