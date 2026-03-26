import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import HavokPhysics from "@babylonjs/havok";
import Recast from "recast-detour";
import { Color3, DirectionalLight, Engine, FreeCamera, HavokPlugin, Mesh, MeshBuilder, PhysicsAggregate, PhysicsMotionType, PhysicsShapeType, PointerEventTypes, RecastJSPlugin, Scene, ShadowGenerator, StandardMaterial, Texture, TransformNode, Vector3 } from "@babylonjs/core";
import { Player } from "./game/entities/player/Player";
import { AdvancedDynamicTexture } from "@babylonjs/gui";


class App {
    
    canvas : HTMLCanvasElement;
    engine: Engine;
    havokInstance: any;
    //recast library(recast-detour) instance for nav mesh
    recastInstance: any;
    //babylonjs plugin for nav mesh generation with the recastInstance
    navigationPlugin: any;
    //
    scene!: Scene;

    shadowGenerator!: ShadowGenerator;

    //camera
    freeCamera!: FreeCamera;

    //UI
    ui! : AdvancedDynamicTexture;


    //test avec le player peut etre faire un array d'entity ou un entity manager
    player! : Player;

    //test pour navMesh
    agents : any[] = [];

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
        this.recastInstance = await (Recast as any).apply(window);
        //create the scene
        this.scene = await this.createScene();

    }

    gameLoop(){
        this.engine.runRenderLoop(() => {
            this.scene.render();
            console.log(this.player.isSelected);
        });
        
    }

    endGame(){
        
    }
    
    async createScene() : Promise<Scene> {
        const scene = new Scene(this.engine);
        //Debug layer
        window.addEventListener("keydown", (event) => {
            if (event.key === "i") {
                ShowInspector(scene);
            }

            if (event.key === "Escape") {
                // On vérifie que le joueur existe et qu'il est bien sélectionné
                if (this.player && this.player.isSelected) {
                    this.player.isSelected = false; // Désélectionne le joueur
                    console.log("Joueur désélectionné (Touche Echap)");
                }
            }
        });
        //havok physics plugin
        const hk = new HavokPlugin(true, this.havokInstance);
        scene.enablePhysics(new Vector3(0, -9.81, 0), hk);

        //nav mesh plugin
        this.navigationPlugin = new RecastJSPlugin(this.recastInstance);

        //ui
        this.ui = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene,Texture.BILINEAR_SAMPLINGMODE,true);

        //camera
        this.freeCamera = new FreeCamera("freeCamera", new Vector3(0, 10, 30), scene);
        this.freeCamera.setTarget(Vector3.Zero());
        this.freeCamera.attachControl(this.canvas, true);

        //light
        let light: DirectionalLight = new DirectionalLight("light", new Vector3(-1, -1, -1), scene);
        light.intensity = 0.7;

        //shadow generator
        this.shadowGenerator = new ShadowGenerator(1024, light);
        
        //ground 
        const ground = this.createGround();
        const player = await this.createPlayer();
        
        const cube = MeshBuilder.CreateBox("cube", { size: 4 }, scene);
        cube.position = new Vector3(10, 2, 0);
        
        const meshs = Mesh.MergeMeshes([ground, cube]);

        //nav mesh pour test
        var navmeshParameters = {
            cs: 0.2,
            ch: 0.2,
            walkableSlopeAngle: 90,
            walkableHeight: 1.0,
            walkableClimb: 1,
            walkableRadius: 2,
            maxEdgeLen: 12.,
            maxSimplificationError: 1.3,
            minRegionArea: 8,
            mergeRegionArea: 20,
            maxVertsPerPoly: 6,
            detailSampleDist: 6,
            detailSampleMaxError: 1,
        };

        //MESH.MergeMeshes
        this.navigationPlugin.createNavMesh([meshs], navmeshParameters);

        var navmeshdebug = this.navigationPlugin.createDebugNavMesh(this.scene);
        navmeshdebug.position = new Vector3(0, 0.01, 0);

        var matdebug = new StandardMaterial('matdebug', this.scene);
        matdebug.diffuseColor = new Color3(0.1, 0.2, 1);
        matdebug.alpha = 0.2;
        navmeshdebug.material = matdebug;

        // crowd
        var crowd = this.navigationPlugin.createCrowd(10, 0.1, scene);
        var i;
        var agentParams = {
            radius: 0.1,
            height: 2,
            maxAcceleration: 99999.0,
            maxSpeed: 6.0,
            collisionQueryRange: 0.5,
            pathOptimizationRange: 0.0,
            separationWeight: 1.0};
            
        for (i = 0; i <1; i++) {
            var width = 0.20;
            //var agentCube = MeshBuilder.CreateBox("cube", { size: width, height: width },this.scene);
            
            var targetCube = MeshBuilder.CreateBox("cube", { size: 0.1, height: 0.1 }, this.scene);
            var matAgent = new StandardMaterial('mat2', this.scene);
            var variation = Math.random();
            matAgent.diffuseColor = new Color3(0.4 + variation * 0.6, 0.3, 1.0 - variation * 0.3);
            
            var randomPos = this.navigationPlugin.getRandomPointAround(new Vector3(-2.0, 0.1, -1.8), 0.5);
            var transform = new TransformNode("transform");
            //agentCube.parent = transform;
            var agentIndex = crowd.addAgent(randomPos, agentParams, transform);
            this.agents.push({idx:agentIndex, trf:transform, mesh:player.mesh, target:targetCube});
        }

        var startingPoint;
        var currentMesh;
        var pathLine: any;
        var getGroundPosition = function () {
            var pickinfo = scene.pick(scene.pointerX, scene.pointerY);
            if (pickinfo.hit) {
                return pickinfo.pickedPoint;
            }

            return null;
        }

        var pointerDown = function (mesh :any,camera : any,crowd : any,canvas : any,navigationPlugin : any) {
                currentMesh = mesh;
                startingPoint = getGroundPosition();
                if (startingPoint) { 
                    var agents = crowd.getAgents();
                    var i;
                    for (i=0;i<agents.length;i++) {
                        var randomPos = navigationPlugin.getRandomPointAround(startingPoint, 1.0);
                        crowd.agentGoto(agents[i], navigationPlugin.getClosestPoint(startingPoint));
                    }
                    var pathPoints = navigationPlugin.computePath(crowd.getAgentPosition(agents[0]), navigationPlugin.getClosestPoint(startingPoint));
                    pathLine = MeshBuilder.CreateDashedLines("ribbon", {points: pathPoints, updatable: true, instance: pathLine}, scene);
                }
        }
    
        scene.onPointerObservable.add((pointerInfo) => {            
            switch (pointerInfo.type) {
                case PointerEventTypes.POINTERDOWN:
                //pour eviter que le click sur le player soit pris en compte pour le déplacement    
                    if(this.player.isSelected && pointerInfo.pickInfo!.pickedMesh == this.player.mesh) {
                        return; // Ignore clicks on the player mesh when it's selected
                    }
                    if(this.player.isSelected && pointerInfo.pickInfo!.hit ) {
                        pointerDown(pointerInfo.pickInfo!.pickedMesh, this.freeCamera, crowd, this.canvas, this.navigationPlugin)
                    }
        
            }        
        });

        scene.onBeforeRenderObservable.add(()=> {
            var agentCount = this.agents.length;
            for(let i = 0;i<agentCount;i++)
            {
                var ag = this.agents[i];
                ag.mesh.position = crowd.getAgentPosition(ag.idx);
                //fais monter le mesh de l'agent pour le sortir du sol
                ag.mesh.position.set(ag.mesh.position.x, ag.mesh.position.y + 1.0, ag.mesh.position.z);
                let vel = crowd.getAgentVelocity(ag.idx);
                crowd.getAgentNextTargetPathToRef(ag.idx, ag.target.position);
                if (vel.length() > 0.2)
                {
                    vel.normalize();
                    var desiredRotation = Math.atan2(vel.x, vel.z);
                    ag.mesh.rotation.y = ag.mesh.rotation.y + (desiredRotation - ag.mesh.rotation.y) * 0.15;
                }
            }
        });

            return scene;
    }

    createGround(){
        //groundOptions
        const groundOptions = { width : 200, height : 200 , receiveShadhows : true};

        const ground = MeshBuilder.CreateGround("ground",groundOptions,this.scene)
        
        const groundMat = new StandardMaterial("groundMat", this.scene);
        //groundMat.diffuseColor = new Color3(0.4, 0.4, 0.4);
        
        ground.material = groundMat;
    
        const groundAggregate = new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0, friction: 0.7, restitution: 0.2 },this.scene);
        groundAggregate.body.setMotionType(PhysicsMotionType.STATIC);
        //console.log(groundAggregate)
        

        return ground;
    }

    async createPlayer(){
        this.player = new Player(this.scene, this.shadowGenerator,this.ui);
        return this.player;
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