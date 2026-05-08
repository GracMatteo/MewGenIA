import {
    Color3,
    Color4,
    MeshBuilder,
    ParticleSystem,
    PhysicsAggregate,
    PhysicsMotionType,
    PhysicsShapeType,
    Scene,
    ShadowGenerator,
    StandardMaterial,
    Texture,
    Vector3
} from "@babylonjs/core";
import type { AdvancedDynamicTexture } from "@babylonjs/gui";
import { Collectable } from "../Collectable";


export class Grenade extends Collectable {
    private static readonly EXPLOSION_DELAY_MS = 5000;
    private static readonly EXPLOSION_PARTICLE_LIFETIME_MS = 900;
    private static readonly PARTICLE_TEXTURE =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lA41nwAAAABJRU5ErkJggg==";

    public itemName: string = "Grenade";
    public iconPath: string = "/icons/grenade.png";

    SphereAggregate: any;
    isActivated: boolean = false;
    private _spawnPosition: Vector3;
    private _explosionTimeoutId: number | undefined;
    private _isDisposed = false;

    constructor(scene: Scene, uiTexture: AdvancedDynamicTexture, shadowGenerator: ShadowGenerator, modelName : string, spawnPosition?: Vector3) {
        super(modelName, scene, uiTexture, shadowGenerator);
        this._spawnPosition = spawnPosition?.clone() ?? new Vector3(0, 15, 0);
        
    }

    async init(): Promise<void> {
        this.mesh =  MeshBuilder.CreateSphere(this.modelName, { diameter: 0.7 }, this.scene);
        this.mesh.position.copyFrom(this._spawnPosition);
        this.mesh.visibility = 0.1;
        
        this.visualMeshes[0] = MeshBuilder.CreateSphere(this.modelName + "Visual", { diameter: 0.5 }, this.scene);
        this.visualMeshes[0].position.copyFrom(this.mesh.position);
        this.visualMeshes[0].isPickable = true;

        const material = new StandardMaterial("grenadeMat", this.scene);
        material.diffuseColor = new Color3(0.2, 0.8, 0.2);
        this.visualMeshes[0].material = material;

        // Le mesh visuel suit le collider
        this.scene.registerBeforeRender(() => {
            if (this._isDisposed || !this.mesh || this.mesh.isDisposed() || !this.visualMeshes[0]) {
                return;
            }

            this.visualMeshes[0].position.copyFrom(this.mesh!.position);
        });
        
        this.SphereAggregate = new PhysicsAggregate(this.mesh, PhysicsShapeType.SPHERE, { mass: 1, restitution: 0.2, friction: 0.2 }, this.scene);
        this.aggregate = this.SphereAggregate;
        this.SphereAggregate.body.setMotionType(PhysicsMotionType.DYNAMIC);

        this.info = {
            name: "Grenade",
            description: "objet explosif à lancer"
        };
        
        this.onHoverHighlight();
    }

    activate(onExploded?: () => void): void {
        if (this.isActivated) {
            return;
        }

        this.isActivated = true;
        this._explosionTimeoutId = window.setTimeout(() => {
            this.explode();
            onExploded?.();
        }, Grenade.EXPLOSION_DELAY_MS);
    }

    explode(): void {
        if (this._isDisposed) {
            return;
        }

        const explosionPosition = this.mesh?.position.clone() ?? this._spawnPosition.clone();
        this._createExplosionParticles(explosionPosition);
        this.disposeFromScene();
    }

    disposeFromScene(): void {
        if (this._isDisposed) {
            return;
        }

        this._isDisposed = true;

        if (this._explosionTimeoutId !== undefined) {
            window.clearTimeout(this._explosionTimeoutId);
            this._explosionTimeoutId = undefined;
        }

        this.mesh?.dispose();
        this.visualMeshes.forEach((mesh) => mesh.dispose());
        this.aggregate?.dispose();
    }

    private _createExplosionParticles(position: Vector3): void {
        const particleSystem = new ParticleSystem(`${this.modelName}_explosion`, 120, this.scene);
        const particleTexture = new Texture(Grenade.PARTICLE_TEXTURE, this.scene);

        particleSystem.particleTexture = particleTexture;
        particleSystem.emitter = position;
        particleSystem.minEmitBox = Vector3.Zero();
        particleSystem.maxEmitBox = Vector3.Zero();

        particleSystem.color1 = new Color4(1, 0.75, 0.2, 1);
        particleSystem.color2 = new Color4(1, 0.25, 0.05, 1);
        particleSystem.colorDead = new Color4(0.05, 0.05, 0.05, 0);

        particleSystem.minSize = 0.25;
        particleSystem.maxSize = 1.1;
        particleSystem.minLifeTime = 0.25;
        particleSystem.maxLifeTime = 0.75;
        particleSystem.manualEmitCount = 90;
        particleSystem.emitRate = 0;
        particleSystem.blendMode = ParticleSystem.BLENDMODE_ONEONE;
        particleSystem.gravity = new Vector3(0, -5, 0);

        particleSystem.direction1 = new Vector3(-4, 1, -4);
        particleSystem.direction2 = new Vector3(4, 6, 4);
        particleSystem.minAngularSpeed = 0;
        particleSystem.maxAngularSpeed = Math.PI;
        particleSystem.minEmitPower = 2;
        particleSystem.maxEmitPower = 7;
        particleSystem.updateSpeed = 0.015;

        particleSystem.start();

        window.setTimeout(() => {
            particleSystem.dispose();
            particleTexture.dispose();
        }, Grenade.EXPLOSION_PARTICLE_LIFETIME_MS);
    }

    update(_input?: any): void {
        // Logique de mise à jour de la grenade (ex: timer d'explosion)
    }

    fixedUpdate(_input?: any): void {
        // Logique de physique de la grenade (ex: mouvement, collision)

    }
    
}
