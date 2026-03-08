import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, MeshBuilder, Color3, StandardMaterial, MirrorTexture, Texture, ShadowGenerator, DirectionalLight, PhysicsAggregate, PhysicsShapeType, HavokPlugin, LoadAssetContainerAsync, AssetContainer, PhysicsMotionType} from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";
import "@babylonjs/loaders/glTF";
import { Player } from "./game/entities/player/Player";
import "@babylonjs/core/Debug/debugLayer"; // Import nécessaire pour la couche de debug
import "@babylonjs/inspector";
let engine: Engine;
let inputStates = {
    forward: false,
    backward: false,
    left: false,
    right: false,
};
const setupPhysics = async () => {
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
    if (!canvas) {
        console.error("Canvas element not found!");
        return;
    }

    engine = new Engine(canvas, true);
    const scene = new Scene(engine);

    // 1. Initialiser Havok
    try {
        // Charger le WASM depuis le dossier public
        const response = await fetch('/HavokPhysics.wasm');
        const wasmBuffer = await response.arrayBuffer();
        const havokInstance = await HavokPhysics({ wasmBinary: wasmBuffer });
        const hk = new HavokPlugin(true, havokInstance);
        scene.enablePhysics(new Vector3(0, -9.81, 0), hk);
        console.log("Havok physics initialized successfully!");
    } catch (err) {
        console.error("Failed to initialize Havok physics:", err);
    }
    
    //ajouter l'inspector avec la touche "i"
    window.addEventListener("keydown", (event) => {
        if (event.key === "i") {
            ShowInspector(scene);
        }
    });

    // Gestion des ombres et réception

    // 2. Setup Caméra
    const camera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 15, Vector3.Zero(), scene);
    camera.position = new Vector3(0, 5, -20);
    camera.attachControl(canvas, true);

    // 3. Setup Lumières & Ombres
    const sunlight = new DirectionalLight("sunlight", new Vector3(-1, -2, -1), scene);
    sunlight.intensity = 0.5;
    sunlight.position = new Vector3(20, 40, 20);
    
    const shadowGenerator = new ShadowGenerator(1024, sunlight);

    
    new HemisphericLight("light", new Vector3(1, 1, 1), scene);

    // 4. Créer le Sol (Immobile)
    const floor = MeshBuilder.CreateGround("ground", { width: 50, height: 50 }, scene);
    floor.position.y = 0;
    floor.receiveShadows = true;
    
    const floorMaterial = new StandardMaterial("floorMaterial", scene);
    floorMaterial.diffuseColor = new Color3(0.8, 0.8, 0.8);
    floorMaterial.diffuseTexture = new Texture("/sol_pierre.png");
    floorMaterial.diffuseTexture.wrapV = 1;
    floorMaterial.diffuseTexture.wrapU = 1;
    floor.material = floorMaterial;
    
    // Rendre le sol physique (masse 0 = objet statique)
    const physicsGround = new PhysicsAggregate(floor, PhysicsShapeType.BOX, { mass: 0, friction: 0.5 }, scene);
    physicsGround.body.setMotionType(PhysicsMotionType.STATIC);
    const player = new Player(scene, shadowGenerator);
    player.load();

    // 8. Gérer les entrées clavier
    // 6. Boucle de rendu
    engine.runRenderLoop(() => {
        scene.render();
        player.update(inputStates);
    });

};

// Attendre que le DOM soit prêt
document.addEventListener("DOMContentLoaded", () => {
    setupPhysics().catch((err) => {
        console.error("Error initializing physics:", err);
    });
});

// 7. Gérer le redimensionnement de la fenêtre
window.addEventListener("resize", () => {
    if (engine) {
        engine.resize();
    }
});

function ShowInspector(scene: Scene) {
    scene.debugLayer.show({
        embedMode: true,
    });
}
