import {
    ArcRotateCamera,
    Color3,
    Color4,
    DirectionalLight,
    Engine,
    HemisphericLight,
    ImportMeshAsync,
    MeshBuilder,
    Scene,
    StandardMaterial,
    Vector3,
    type AbstractMesh
} from "@babylonjs/core";
import {
    AdvancedDynamicTexture,
    Button,
    Control,
    Rectangle,
    StackPanel,
    TextBlock
} from "@babylonjs/gui";
import type { LevelDefinition } from "../LevelTypes";
import {
    DEFAULT_PLAYER_CLASS_ID,
    PLAYER_CLASSES,
    type PlayerClass,
    type PlayerClassId
} from "../entities/player/PlayerClass";

export class PlayerClassSelectionScene {
    private static readonly PREVIEW_READY_DELAY_MS = 400;

    public scene: Scene;
    public onClassSelected: (playerClassId: PlayerClassId) => void = () => {};
    public onBackRequested: () => void = () => {};

    private _gui: AdvancedDynamicTexture;
    private _level: LevelDefinition;
    private _selectedClassId: PlayerClassId = DEFAULT_PLAYER_CLASS_ID;
    private _classButtons = new Map<PlayerClassId, Button>();
    private _statsText!: TextBlock;
    private _descriptionText!: TextBlock;
    private _loadingText!: TextBlock;
    private _playButton!: Button;
    private _isPreviewReady = false;
    private _currentPreviewModelPath: string | null = null;
    private _previewLoadVersion = 0;
    private _previewMeshes: AbstractMesh[] = [];
    private _previewRoot: AbstractMesh | null = null;

    constructor(engine: Engine, level: LevelDefinition) {
        this.scene = new Scene(engine);
        this.scene.clearColor = new Color4(0.06, 0.07, 0.09, 1);
        this._level = level;

        const camera = new ArcRotateCamera(
            "classSelectionCam",
            Math.PI / 2,
            Math.PI / 2.45,
            6,
            new Vector3(0, 1, 0),
            this.scene
        );
        camera.attachControl(engine.getRenderingCanvas(), true);
        camera.lowerRadiusLimit = 4;
        camera.upperRadiusLimit = 8;

        const light = new HemisphericLight("classSelectionAmbient", new Vector3(0, 1, 0), this.scene);
        light.intensity = 0.7;

        const keyLight = new DirectionalLight("classSelectionKey", new Vector3(-0.5, -1, 0.6), this.scene);
        keyLight.position = new Vector3(4, 8, -4);
        keyLight.intensity = 0.8;

        this._createPreviewPlatform();

        this._gui = AdvancedDynamicTexture.CreateFullscreenUI("ClassSelectionUI", true, this.scene);
        this._createUI();
        this._selectClass(this._selectedClassId);

        this.scene.onBeforeRenderObservable.add(() => {
            if (this._previewRoot && !this._previewRoot.isDisposed()) {
                this._previewRoot.rotation.y += 0.01;
            }
        });
    }

    private _createPreviewPlatform(): void {
        const platform = MeshBuilder.CreateCylinder(
            "classPreviewPlatform",
            { diameter: 3.2, height: 0.2, tessellation: 48 },
            this.scene
        );
        platform.position.y = -0.05;

        const material = new StandardMaterial("classPreviewPlatformMat", this.scene);
        material.diffuseColor = new Color3(0.18, 0.22, 0.24);
        material.specularColor = new Color3(0.1, 0.1, 0.1);
        platform.material = material;
    }

    private async _loadPlayerPreview(modelPath: string): Promise<void> {
        if (this._currentPreviewModelPath === modelPath && this._isPreviewReady) {
            return;
        }

        const loadVersion = ++this._previewLoadVersion;
        this._currentPreviewModelPath = modelPath;
        this._setPreviewReady(false);

        try {
            const [result] = await Promise.all([
                ImportMeshAsync(modelPath, this.scene),
                this._wait(PlayerClassSelectionScene.PREVIEW_READY_DELAY_MS)
            ]);

            if (loadVersion !== this._previewLoadVersion) {
                result.meshes.forEach((mesh) => mesh.dispose());
                return;
            }

            this._disposePreviewMeshes();

            const root = result.meshes[0];
            root.name = "classSelectionPlayerPreview";
            root.position = new Vector3(0, 0, 0);
            root.scaling.scaleInPlace(1.15);

            result.meshes.forEach((mesh) => {
                mesh.isPickable = false;
            });

            this._previewMeshes = result.meshes;
            this._previewRoot = root;
            this._setPreviewReady(true);
        } catch (error) {
            console.error("Unable to load player preview model", error);
            this._loadingText.text = "Impossible de charger le modele.";
        }
    }

    private _createUI(): void {
        const title = new TextBlock("classSelectionTitle", `Classe - ${this._level.label}`);
        title.color = "white";
        title.fontSize = 42;
        title.fontWeight = "bold";
        title.height = "70px";
        title.top = "-43%";
        this._gui.addControl(title);

        this._loadingText = new TextBlock("classSelectionLoadingText", "Chargement du modele...");
        this._loadingText.color = "#d8dde2";
        this._loadingText.fontSize = 18;
        this._loadingText.height = "36px";
        this._loadingText.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        this._loadingText.top = "-36px";
        this._gui.addControl(this._loadingText);

        const backButton = Button.CreateSimpleButton("backToLevelsButton", "Retour");
        backButton.width = "120px";
        backButton.height = "44px";
        backButton.color = "white";
        backButton.background = "#343a40";
        backButton.cornerRadius = 6;
        backButton.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        backButton.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        backButton.left = "24px";
        backButton.top = "24px";
        backButton.onPointerUpObservable.add(() => this.onBackRequested());
        this._gui.addControl(backButton);

        const classPanel = new StackPanel("classButtonPanel");
        classPanel.width = "260px";
        classPanel.height = "300px";
        classPanel.spacing = 14;
        classPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        classPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        classPanel.left = "48px";
        this._gui.addControl(classPanel);

        Object.values(PLAYER_CLASSES).forEach((playerClass) => {
            const button = Button.CreateSimpleButton(`${playerClass.id}Button`, playerClass.name);
            button.width = "240px";
            button.height = "64px";
            button.color = "white";
            button.background = "#246b7a";
            button.cornerRadius = 6;
            button.thickness = 2;
            button.onPointerUpObservable.add(() => this._selectClass(playerClass.id));
            classPanel.addControl(button);
            this._classButtons.set(playerClass.id, button);
        });

        const statsPanel = new Rectangle("classStatsPanel");
        statsPanel.width = "320px";
        statsPanel.height = "330px";
        statsPanel.background = "rgba(20, 24, 28, 0.86)";
        statsPanel.color = "#ffffff";
        statsPanel.thickness = 2;
        statsPanel.cornerRadius = 8;
        statsPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        statsPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        statsPanel.left = "-48px";
        this._gui.addControl(statsPanel);

        this._descriptionText = new TextBlock("classDescriptionText", "");
        this._descriptionText.color = "#d8dde2";
        this._descriptionText.fontSize = 16;
        this._descriptionText.textWrapping = true;
        this._descriptionText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        this._descriptionText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        this._descriptionText.top = "24px";
        this._descriptionText.height = "90px";
        this._descriptionText.paddingLeft = "20px";
        this._descriptionText.paddingRight = "20px";
        statsPanel.addControl(this._descriptionText);

        this._statsText = new TextBlock("classStatsText", "");
        this._statsText.color = "white";
        this._statsText.fontSize = 18;
        this._statsText.textWrapping = true;
        this._statsText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        this._statsText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this._statsText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        this._statsText.top = "118px";
        this._statsText.height = "120px";
        this._statsText.paddingLeft = "32px";
        this._statsText.paddingRight = "20px";
        statsPanel.addControl(this._statsText);

        this._playButton = Button.CreateSimpleButton("startSelectedClassButton", "Jouer");
        this._playButton.width = "220px";
        this._playButton.height = "58px";
        this._playButton.color = "white";
        this._playButton.background = "#27ae60";
        this._playButton.cornerRadius = 6;
        this._playButton.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        this._playButton.top = "-24px";
        this._playButton.onPointerUpObservable.add(() => {
            if (this._isPreviewReady) {
                this.onClassSelected(this._selectedClassId);
            }
        });
        statsPanel.addControl(this._playButton);
        this._setPreviewReady(false);
    }

    private _selectClass(playerClassId: PlayerClassId): void {
        this._selectedClassId = playerClassId;
        const playerClass = PLAYER_CLASSES[playerClassId];
        this._updateClassButtons();
        this._updateStats(playerClass);
        this._loadPlayerPreview(playerClass.modelPath);
    }

    private _updateClassButtons(): void {
        this._classButtons.forEach((button, playerClassId) => {
            const isSelected = playerClassId === this._selectedClassId;
            button.background = isSelected ? "#d89b2b" : "#246b7a";
            button.color = isSelected ? "#101418" : "white";
        });
    }

    private _updateStats(playerClass: PlayerClass): void {
        const stats = playerClass.stats;
        this._descriptionText.text = playerClass.description;
        this._statsText.text =
            `HP: ${stats.hp}\n` +
            `Attack: ${stats.attack}\n` +
            `Speed: ${stats.movementSpeed}\n` +
            `Accuracy: ${Math.round(stats.accuracy * 100)}%`;
    }

    private _setPreviewReady(isReady: boolean): void {
        this._isPreviewReady = isReady;
        this._playButton.isEnabled = isReady;
        this._playButton.alpha = isReady ? 1 : 0.45;
        this._loadingText.text = isReady ? "" : "Chargement du modele...";
    }

    private _wait(delayMs: number): Promise<void> {
        return new Promise((resolve) => {
            window.setTimeout(resolve, delayMs);
        });
    }

    private _disposePreviewMeshes(): void {
        this._previewMeshes.forEach((mesh) => mesh.dispose());
        this._previewMeshes = [];
        this._previewRoot = null;
    }
}
