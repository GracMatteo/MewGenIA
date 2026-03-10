import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import HavokPhysics from "@babylonjs/havok";
import { DirectionalLight, Engine, FreeCamera, HavokPlugin, MeshBuilder, PhysicsAggregate, PhysicsMotionType, PhysicsShapeType, Scene, ShadowGenerator, Vector3 } from "@babylonjs/core";
import { Player } from "./game/entities/player/Player";

class App {
    
    canvas : HTMLCanvasElement;
    engine: Engine;
    havokInstance: any;
    scene!: Scene;

    shadowGenerator!: ShadowGenerator;

    //camera
    freeCamera!: FreeCamera;

    inputStates : {};

    constructor(){
        this.canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

        this.inputStates = {};

        this.engine = new Engine(this.canvas, true);
    }

    async start(){
        await this.initGame();
        this.gameLoop();
    }

    async initGame(){
        this.havokInstance = await this.getInitializedHavok();
        
        //create the scene
        this.scene = this.createScene();

    }

    gameLoop(){
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });
    }

    endGame(){
        
    }
    
    createScene() : Scene {
        const scene = new Scene(this.engine);
        //Debug layer
        window.addEventListener("keydown", (event) => {
            if (event.key === "i") {
                ShowInspector(scene);
            }
        });
        //havok physics plugin
        const hk = new HavokPlugin(true, this.havokInstance);
        scene.enablePhysics(new Vector3(0, -9.81, 0), hk);

        //camera
        this.freeCamera = new FreeCamera("freeCamera", new Vector3(0, 10, -20), scene);
        this.freeCamera.setTarget(Vector3.Zero());
        this.freeCamera.attachControl(this.canvas, true);

        //light
        let light: DirectionalLight = new DirectionalLight("light", new Vector3(-1, -1, -1), scene);
        light.intensity = 0.7;

        //shadow generator
        this.shadowGenerator = new ShadowGenerator(1024, light);
        
        //ground 
        this.createGround(scene);
        this.createPlayer();
        return scene;
    }

    createGround(scene : Scene){
        //groundOptions
        const groundOptions = { width : 200, height : 200 , receiveShadhows : true};

        const ground = MeshBuilder.CreateGround("ground",groundOptions,this.scene)
        
        const groundAggregate = new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0, friction: 0.7, restitution: 0.2 },scene);
        groundAggregate.body.setMotionType(PhysicsMotionType.STATIC);
        console.log(groundAggregate)
        

        return ground;
    }

    async createPlayer(){
        const player = new Player(this.scene, this.shadowGenerator);
    }

    private async getInitializedHavok() {
        // locates the wasm file copied during build process
        const havok = await HavokPhysics({
            locateFile: (file) => {
                return "HavokPhysics.wasm"
            }
        });
        return havok;
    }
}

function ShowInspector(scene: Scene) {
    scene.debugLayer.show({
        embedMode: true,
    });
}



const gameEngine = new App();
gameEngine.start();