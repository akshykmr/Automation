// Linear Step-by-Step Filament Processing Simulator

class LinearFilamentSimulator {
    constructor() {
        // Core Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Animation and timing
        this.clock = new THREE.Clock();
        this.isRunning = false;
        this.isPaused = false;
        this.manualMode = false;
        this.animationSpeed = 1.0;
        this.totalProcessTime = 0;
        this.stationStartTime = 0;
        
        // Process state
        this.currentStationIndex = 0;
        this.trayPosition = new THREE.Vector3(-50, 1.5, 0);
        this.isMovingBetweenStations = false;
        this.movementStartPos = new THREE.Vector3();
        this.movementTargetPos = new THREE.Vector3();
        this.movementProgress = 0;
        this.movementSpeed = 8; // meters per second
        
        // Scene objects
        this.productionLine = new THREE.Group();
        this.tray = null;
        this.bundles = [];
        this.stations = [];
        this.humanOperator = null;
        this.particleSystems = [];
        this.conveyorBelt = null;
        this.stationLabels = [];
        
        // Camera system
        this.cameraPresets = {
            overview: { position: [0, 50, 100], target: [0, 5, 0] },
            loading: { position: [-60, 25, 40], target: [-50, 5, 0] },
            wash: { position: [-10, 30, 50], target: [0, 5, 0] },
            drying: { position: [30, 30, 50], target: [30, 5, 0] },
            output: { position: [70, 25, 40], target: [55, 5, 0] },
            follow: { position: [0, 25, 40], target: [0, 5, 0] }
        };
        this.followMode = false;
        
        // Station definitions with distinct equipment
        this.stationData = [
            {
                id: 1,
                name: "Loading Material",
                position: [-50, 0, 0],
                duration: 10,
                equipment: ["human_operator", "tray_rack", "work_platform", "safety_barriers"],
                colors: { primary: 0x4CAF50, secondary: 0x8BC34A },
                processType: "Loading Material"
            },
            {
                id: 2,
                name: "Jet Spray",
                position: [-35, 0, 0],
                duration: 8,
                equipment: ["enclosed_chamber", "spray_nozzles", "drain_system", "safety_doors", "water_collection"],
                colors: { primary: 0x00BCD4, secondary: 0x4DD0E1 },
                processType: "Jet Spray"
            },
            {
                id: 3,
                name: "Robot",
                position: [-20, 0, 0],
                duration: 7,
                equipment: ["6_axis_robot", "gripper_assembly", "safety_cage", "control_pendant", "vision_system"],
                colors: { primary: 0xFF9800, secondary: 0xFFB74D },
                processType: "Robot"
            },
            {
                id: 4,
                name: "Material Setup",
                position: [-10, 0, 0],
                duration: 2,
                equipment: ["pneumatic_clamps", "proximity_sensors", "air_cylinders", "pressure_gauges"],
                colors: { primary: 0x9C27B0, secondary: 0xBA68C8 },
                processType: "Material Setup"
            },
            {
                id: 5,
                name: "Primary Drying",
                position: [0, 0, 0],
                duration: 8,
                equipment: ["air_knives", "blower_units", "heating_elements", "air_ducts", "temperature_sensors"],
                colors: { primary: 0xFF5722, secondary: 0xFF8A65 },
                processType: "Primary Drying"
            },
            {
                id: 6,
                name: "Moisture Checking",
                position: [15, 0, 0],
                duration: 3,
                equipment: ["sensor_array", "digital_display", "scanning_mechanism", "pass_fail_lights"],
                colors: { primary: 0x795548, secondary: 0xA1887F },
                processType: "Moisture Checking"
            },
            {
                id: 7,
                name: "Oil Spray",
                position: [25, 0, 0],
                duration: 3,
                equipment: ["mist_nozzles", "mixing_chamber", "metering_pumps", "oil_tank", "water_tank"],
                colors: { primary: 0xE91E63, secondary: 0xF06292 },
                processType: "Oil Spray"
            },
            {
                id: 8,
                name: "Secondary Drying",
                position: [35, 0, 0],
                duration: 5,
                equipment: ["ir_panels", "insulated_chamber", "temperature_controls", "low_temp_heaters"],
                colors: { primary: 0xFF6F00, secondary: 0xFFB74D },
                processType: "Secondary Drying"
            },
            {
                id: 9,
                name: "Moisture Checking",
                position: [45, 0, 0],
                duration: 3,
                equipment: ["sensor_array", "digital_display", "scanning_mechanism", "pass_fail_lights"],
                colors: { primary: 0x795548, secondary: 0xA1887F },
                processType: "Moisture Checking"
            },
            {
                id: 10,
                name: "Output",
                position: [55, 0, 0],
                duration: 4,
                equipment: ["unload_robot", "output_trays", "vision_system", "storage_area", "quality_scanner"],
                colors: { primary: 0x607D8B, secondary: 0x90A4AE },
                processType: "Output"
            }
        ];
        
        this.init();
    }

    init() {
        console.log('Initializing Linear Step-by-Step Simulator...');
        
        try {
            this.setupScene();
            this.createLinearProductionLine();
            this.setupLighting();
            this.setupEventListeners();
            this.createStationIndicators();
            
            // Start animation loop first
            this.animate();
            
            setTimeout(() => {
                this.hideLoadingScreen();
                this.addLogEntry('success', 'Linear production line initialized - 10 stations ready');
                this.addLogEntry('info', 'Step-by-step processing system active');
                this.addLogEntry('info', 'Tray positioned at Loading Station - Ready to start');
                this.updateStationDetails(0);
                this.updateProgress();
            }, 2000);
            
        } catch (error) {
            console.error('Initialization failed:', error);
            this.showError('Failed to initialize simulator. Please refresh the page.');
        }
    }

    setupScene() {
        // Scene with industrial atmosphere
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f4f7);
        this.scene.fog = new THREE.Fog(0xf0f4f7, 100, 300);
        
        // Camera setup
        const canvas = document.getElementById('threejs-canvas');
        const container = canvas.parentElement;
        
        this.camera = new THREE.PerspectiveCamera(
            45,
            container.clientWidth / container.clientHeight,
            0.1,
            500
        );
        this.setCameraView('overview');
        
        // Renderer with enhanced settings
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: canvas,
            antialias: true,
            alpha: false
        });
        
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        this.setupControls();
        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupControls() {
        let isDragging = false;
        let previousMouse = { x: 0, y: 0 };
        const canvas = this.renderer.domElement;
        
        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                isDragging = true;
                previousMouse = { x: e.clientX, y: e.clientY };
            }
        });
        
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            
            if (isDragging && !this.followMode) {
                const deltaMove = {
                    x: e.clientX - previousMouse.x,
                    y: e.clientY - previousMouse.y
                };
                
                const spherical = new THREE.Spherical();
                spherical.setFromVector3(this.camera.position);
                
                spherical.theta -= deltaMove.x * 0.01;
                spherical.phi += deltaMove.y * 0.01;
                spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
                
                this.camera.position.setFromSpherical(spherical);
                this.camera.lookAt(0, 5, 0);
                
                previousMouse = { x: e.clientX, y: e.clientY };
            }
        });
        
        canvas.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        canvas.addEventListener('wheel', (e) => {
            if (!this.followMode) {
                const scale = e.deltaY > 0 ? 1.1 : 0.9;
                this.camera.position.multiplyScalar(scale);
            }
            e.preventDefault();
        });
        
        canvas.addEventListener('click', (e) => this.handleObjectClick(e));
    }

    createLinearProductionLine() {
        this.createFactoryEnvironment();
        this.createLinearConveyor();
        this.createAllStations();
        this.createTrayWithBundles();
        this.createHumanOperator();
        this.scene.add(this.productionLine);
    }

    createFactoryEnvironment() {
        // Factory floor
        const floorGeometry = new THREE.PlaneGeometry(160, 100);
        const floorMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xe8e8e8,
            transparent: false
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.productionLine.add(floor);
        
        // Grid lines for reference
        const gridHelper = new THREE.GridHelper(160, 40, 0xcccccc, 0xdddddd);
        gridHelper.position.y = 0.01;
        this.productionLine.add(gridHelper);
        
        // Factory walls (background)
        const wallGeometry = new THREE.PlaneGeometry(160, 30);
        const wallMaterial = new THREE.MeshLambertMaterial({ color: 0xf5f5f5 });
        const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
        backWall.position.set(0, 15, -50);
        backWall.receiveShadow = true;
        this.productionLine.add(backWall);
    }

    createLinearConveyor() {
        // Main straight conveyor belt - LINEAR ONLY, NO CIRCULAR MOVEMENT
        const conveyorLength = 130;
        const conveyorWidth = 10;
        const conveyorHeight = 1.2;
        
        const conveyorGeometry = new THREE.BoxGeometry(conveyorLength, conveyorHeight, conveyorWidth);
        const conveyorMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
        
        this.conveyorBelt = new THREE.Mesh(conveyorGeometry, conveyorMaterial);
        this.conveyorBelt.position.set(0, 0.6, 0);
        this.conveyorBelt.castShadow = true;
        this.conveyorBelt.receiveShadow = true;
        
        this.productionLine.add(this.conveyorBelt);
        
        // Conveyor support structure
        for (let x = -60; x <= 60; x += 15) {
            const supportGeometry = new THREE.BoxGeometry(2, 10, 2);
            const supportMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
            const support = new THREE.Mesh(supportGeometry, supportMaterial);
            support.position.set(x, -5, 8);
            support.castShadow = true;
            this.productionLine.add(support);
            
            const support2 = new THREE.Mesh(supportGeometry, supportMaterial);
            support2.position.set(x, -5, -8);
            support2.castShadow = true;
            this.productionLine.add(support2);
        }
        
        // Conveyor direction markers (arrows pointing right)
        for (let x = -55; x <= 55; x += 15) {
            const arrowGeometry = new THREE.ConeGeometry(0.8, 3, 4);
            const arrowMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00 });
            const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
            arrow.position.set(x, 1.8, 0);
            arrow.rotation.z = -Math.PI / 2;
            this.productionLine.add(arrow);
        }
    }

    createAllStations() {
        this.stationData.forEach((data, index) => {
            const station = this.createDistinctStation(data, index);
            this.stations.push(station);
            this.productionLine.add(station);
        });
    }

    createDistinctStation(data, index) {
        const stationGroup = new THREE.Group();
        const [x, y, z] = data.position;
        
        // Base platform for all stations
        const platformGeometry = new THREE.BoxGeometry(14, 1.5, 20);
        const platformMaterial = new THREE.MeshLambertMaterial({ 
            color: new THREE.Color(data.colors.primary).multiplyScalar(0.3)
        });
        const platform = new THREE.Mesh(platformGeometry, platformMaterial);
        platform.position.set(0, 2.25, 0);
        platform.castShadow = true;
        platform.receiveShadow = true;
        stationGroup.add(platform);
        
        // Create station-specific equipment
        this.createStationEquipment(stationGroup, data, index);
        
        // Station number sign
        const signGeometry = new THREE.BoxGeometry(4, 3, 0.3);
        const signMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
        const sign = new THREE.Mesh(signGeometry, signMaterial);
        sign.position.set(0, 15, -10);
        stationGroup.add(sign);
        
        // Add station label texture
        this.createStationLabel(stationGroup, data, index);
        
        stationGroup.position.set(x, y, z);
        stationGroup.userData = { ...data, index };
        
        return stationGroup;
    }

    createStationLabel(stationGroup, data, index) {
        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = 512;
        labelCanvas.height = 256;
        const labelContext = labelCanvas.getContext('2d');
        
        // Clear canvas
        labelContext.fillStyle = '#ffffff';
        labelContext.fillRect(0, 0, 512, 256);
        
        // Station number
        labelContext.fillStyle = '#000000';
        labelContext.font = 'bold 48px Arial';
        labelContext.textAlign = 'center';
        labelContext.fillText(`STATION ${index + 1}`, 256, 80);
        
        // Station name
        labelContext.font = 'bold 28px Arial';
        labelContext.fillText(data.name.toUpperCase(), 256, 130);
        
        // Process type
        labelContext.font = '20px Arial';
        labelContext.fillText(data.processType, 256, 160);
        
        // Duration
        labelContext.fillStyle = '#666666';
        labelContext.font = '18px Arial';
        labelContext.fillText(`${data.duration} seconds`, 256, 200);
        
        const labelTexture = new THREE.CanvasTexture(labelCanvas);
        const labelMaterial = new THREE.MeshLambertMaterial({ map: labelTexture });
        const labelGeometry = new THREE.PlaneGeometry(8, 4);
        const label = new THREE.Mesh(labelGeometry, labelMaterial);
        label.position.set(0, 15, -9.8);
        stationGroup.add(label);
    }

    createStationEquipment(stationGroup, data, index) {
        const equipmentColor = data.colors.primary;
        const secondaryColor = data.colors.secondary;
        
        switch (index) {
            case 0: // Loading Station - Human operator area
                this.createLoadingEquipment(stationGroup, equipmentColor);
                break;
            case 1: // Pre-wash Chamber - Spray cleaning
                this.createPreWashEquipment(stationGroup, equipmentColor, secondaryColor);
                break;
            case 2: // Robot Pick Station - Industrial robot
                this.createRobotEquipment(stationGroup, equipmentColor);
                break;
            case 3: // Bundle Fixture - Pneumatic clamps
                this.createFixtureEquipment(stationGroup, equipmentColor);
                break;
            case 4: // Chemical Wash - Large wash chamber
                this.createChemicalWashEquipment(stationGroup, equipmentColor, secondaryColor);
                break;
            case 5: // Primary Drying - Air knives
                this.createDryingEquipment(stationGroup, equipmentColor);
                break;
            case 6: // Moisture Check - Sensor array
                this.createMoistureCheckEquipment(stationGroup, equipmentColor);
                break;
            case 7: // Conditioning Spray - Mist nozzles
                this.createConditioningEquipment(stationGroup, equipmentColor, secondaryColor);
                break;
            case 8: // Secondary Drying - IR panels
                this.createSecondaryDryingEquipment(stationGroup, equipmentColor);
                break;
            case 9: // Output Collection - Unload robot
                this.createOutputEquipment(stationGroup, equipmentColor);
                break;
        }
    }

    createLoadingEquipment(group, color) {
        // Tray storage rack
        const rackGeometry = new THREE.BoxGeometry(10, 10, 4);
        const rackMaterial = new THREE.MeshLambertMaterial({ color });
        const rack = new THREE.Mesh(rackGeometry, rackMaterial);
        rack.position.set(-4, 8, -8);
        rack.castShadow = true;
        group.add(rack);
        
        // Work platform
        const platformGeometry = new THREE.BoxGeometry(8, 0.8, 14);
        const platformMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
        const platform = new THREE.Mesh(platformGeometry, platformMaterial);
        platform.position.set(3, 4, 0);
        platform.castShadow = true;
        group.add(platform);
        
        // Safety barriers
        for (let i = 0; i < 4; i++) {
            const barrierGeometry = new THREE.BoxGeometry(0.3, 4, 3);
            const barrierMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00 });
            const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
            barrier.position.set(7, 6, -6 + i * 4);
            group.add(barrier);
        }
    }

    createPreWashEquipment(group, color, secondaryColor) {
        // Large enclosed chamber
        const chamberGeometry = new THREE.BoxGeometry(10, 12, 10);
        const chamberMaterial = new THREE.MeshLambertMaterial({ 
            color, 
            transparent: true, 
            opacity: 0.6 
        });
        const chamber = new THREE.Mesh(chamberGeometry, chamberMaterial);
        chamber.position.set(0, 9, 0);
        chamber.castShadow = true;
        group.add(chamber);
        
        // Spray nozzles array
        for (let x = -3; x <= 3; x += 2) {
            for (let z = -3; z <= 3; z += 2) {
                const nozzleGeometry = new THREE.CylinderGeometry(0.4, 0.6, 1.5);
                const nozzleMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc });
                const nozzle = new THREE.Mesh(nozzleGeometry, nozzleMaterial);
                nozzle.position.set(x, 14, z);
                group.add(nozzle);
            }
        }
        
        // Drain collection system
        const drainGeometry = new THREE.BoxGeometry(8, 0.8, 8);
        const drainMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
        const drain = new THREE.Mesh(drainGeometry, drainMaterial);
        drain.position.set(0, 3.4, 0);
        group.add(drain);
        
        // Safety doors
        const doorGeometry = new THREE.BoxGeometry(12, 10, 0.5);
        const doorMaterial = new THREE.MeshLambertMaterial({ color: secondaryColor });
        const door1 = new THREE.Mesh(doorGeometry, doorMaterial);
        door1.position.set(0, 9, 5.5);
        group.add(door1);
        
        const door2 = new THREE.Mesh(doorGeometry, doorMaterial);
        door2.position.set(0, 9, -5.5);
        group.add(door2);
    }

    createRobotEquipment(group, color) {
        // Robot base (cylindrical)
        const baseGeometry = new THREE.CylinderGeometry(2.5, 3, 5);
        const baseMaterial = new THREE.MeshLambertMaterial({ color });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.set(-3, 5.5, -8);
        base.castShadow = true;
        group.add(base);
        
        // Robot arm segments
        const arm1Geometry = new THREE.BoxGeometry(2, 8, 2);
        const armMaterial = new THREE.MeshLambertMaterial({ color });
        const arm1 = new THREE.Mesh(arm1Geometry, armMaterial);
        arm1.position.set(-3, 12, -8);
        arm1.castShadow = true;
        group.add(arm1);
        
        const arm2Geometry = new THREE.BoxGeometry(8, 2, 2);
        const arm2 = new THREE.Mesh(arm2Geometry, armMaterial);
        arm2.position.set(1, 15, -8);
        arm2.castShadow = true;
        group.add(arm2);
        
        const arm3Geometry = new THREE.BoxGeometry(2, 6, 2);
        const arm3 = new THREE.Mesh(arm3Geometry, armMaterial);
        arm3.position.set(5, 12, -8);
        arm3.castShadow = true;
        group.add(arm3);
        
        // Gripper assembly
        const gripperGeometry = new THREE.BoxGeometry(1.5, 1.5, 3);
        const gripperMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const gripper = new THREE.Mesh(gripperGeometry, gripperMaterial);
        gripper.position.set(5, 9, -8);
        gripper.castShadow = true;
        group.add(gripper);
        
        // Safety cage
        const cageGeometry = new THREE.BoxGeometry(14, 12, 14);
        const cageMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xffff00, 
            transparent: true, 
            opacity: 0.15,
            wireframe: true
        });
        const cage = new THREE.Mesh(cageGeometry, cageMaterial);
        cage.position.set(0, 9, -4);
        group.add(cage);
    }

    createFixtureEquipment(group, color) {
        // Pneumatic clamps (opposing jaws)
        const clamp1Geometry = new THREE.BoxGeometry(4, 3, 10);
        const clampMaterial = new THREE.MeshLambertMaterial({ color });
        const clamp1 = new THREE.Mesh(clamp1Geometry, clampMaterial);
        clamp1.position.set(-3, 5.5, 0);
        clamp1.castShadow = true;
        group.add(clamp1);
        
        const clamp2 = new THREE.Mesh(clamp1Geometry, clampMaterial);
        clamp2.position.set(3, 5.5, 0);
        clamp2.castShadow = true;
        group.add(clamp2);
        
        // Air cylinders
        const cylinderGeometry = new THREE.CylinderGeometry(0.8, 0.8, 6);
        const cylinderMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
        for (let i = 0; i < 6; i++) {
            const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
            cylinder.position.set(-4 + i * 1.5, 9, -8);
            cylinder.castShadow = true;
            group.add(cylinder);
        }
        
        // Proximity sensors (green LEDs)
        for (let i = 0; i < 8; i++) {
            const sensorGeometry = new THREE.BoxGeometry(0.6, 0.6, 1.2);
            const sensorMaterial = new THREE.MeshLambertMaterial({ 
                color: 0x00ff00,
                emissive: 0x002200
            });
            const sensor = new THREE.Mesh(sensorGeometry, sensorMaterial);
            sensor.position.set(-3.5 + i * 1, 6.5, 6);
            group.add(sensor);
        }
        
        // Pressure gauges
        for (let i = 0; i < 3; i++) {
            const gaugeGeometry = new THREE.CylinderGeometry(1, 1, 0.5);
            const gaugeMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
            const gauge = new THREE.Mesh(gaugeGeometry, gaugeMaterial);
            gauge.position.set(-3 + i * 3, 8, -9);
            gauge.rotation.x = Math.PI / 2;
            group.add(gauge);
        }
    }

    createChemicalWashEquipment(group, color, secondaryColor) {
        // Large stainless steel wash chamber
        const chamberGeometry = new THREE.BoxGeometry(12, 14, 12);
        const chamberMaterial = new THREE.MeshLambertMaterial({ color: 0x316b83 });
        const chamber = new THREE.Mesh(chamberGeometry, chamberMaterial);
        chamber.position.set(0, 10, 0);
        chamber.castShadow = true;
        group.add(chamber);
        
        // Chemical tanks (different colors for different chemicals)
        const tankGeometry = new THREE.CylinderGeometry(2, 2, 8);
        
        // Yellow tank (chemical A)
        const tank1Material = new THREE.MeshLambertMaterial({ color: 0xffd700 });
        const tank1 = new THREE.Mesh(tankGeometry, tank1Material);
        tank1.position.set(-8, 7, -10);
        tank1.castShadow = true;
        group.add(tank1);
        
        // Blue tank (chemical B)
        const tank2Material = new THREE.MeshLambertMaterial({ color: 0x00bcd4 });
        const tank2 = new THREE.Mesh(tankGeometry, tank2Material);
        tank2.position.set(-4, 7, -10);
        tank2.castShadow = true;
        group.add(tank2);
        
        // Red tank (neutralizer)
        const tank3Material = new THREE.MeshLambertMaterial({ color: 0xff4444 });
        const tank3 = new THREE.Mesh(tankGeometry, tank3Material);
        tank3.position.set(0, 7, -10);
        tank3.castShadow = true;
        group.add(tank3);
        
        // Spray manifolds inside chamber
        const manifoldGeometry = new THREE.BoxGeometry(10, 1.5, 1.5);
        const manifoldMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
        for (let i = 0; i < 4; i++) {
            const manifold = new THREE.Mesh(manifoldGeometry, manifoldMaterial);
            manifold.position.set(0, 12 + i * 2, -4 + i * 2);
            group.add(manifold);
        }
        
        // Filtration system
        const filterGeometry = new THREE.BoxGeometry(6, 6, 4);
        const filterMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
        const filter = new THREE.Mesh(filterGeometry, filterMaterial);
        filter.position.set(6, 6, -8);
        filter.castShadow = true;
        group.add(filter);
    }

    createDryingEquipment(group, color) {
        // Air knife assemblies
        const knifeGeometry = new THREE.BoxGeometry(10, 1.5, 0.8);
        const knifeMaterial = new THREE.MeshLambertMaterial({ color });
        for (let i = 0; i < 5; i++) {
            const knife = new THREE.Mesh(knifeGeometry, knifeMaterial);
            knife.position.set(0, 8 + i * 2, -4 + i * 2);
            knife.castShadow = true;
            group.add(knife);
        }
        
        // High-powered blower units
        const blowerGeometry = new THREE.CylinderGeometry(2.5, 2.5, 5);
        const blowerMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
        
        const blower1 = new THREE.Mesh(blowerGeometry, blowerMaterial);
        blower1.position.set(-6, 8, -10);
        blower1.castShadow = true;
        group.add(blower1);
        
        const blower2 = new THREE.Mesh(blowerGeometry, blowerMaterial);
        blower2.position.set(6, 8, -10);
        blower2.castShadow = true;
        group.add(blower2);
        
        // Heating elements (glowing red coils)
        const heaterGeometry = new THREE.BoxGeometry(8, 0.8, 1.5);
        const heaterMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xff2222,
            emissive: 0x440000
        });
        for (let i = 0; i < 4; i++) {
            const heater = new THREE.Mesh(heaterGeometry, heaterMaterial);
            heater.position.set(0, 6 + i * 2.5, 8);
            group.add(heater);
        }
        
        // Air circulation ducts
        const ductGeometry = new THREE.BoxGeometry(12, 2, 2);
        const ductMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
        for (let i = 0; i < 3; i++) {
            const duct = new THREE.Mesh(ductGeometry, ductMaterial);
            duct.position.set(0, 16 + i * 2, 0);
            group.add(duct);
        }
    }

    createMoistureCheckEquipment(group, color) {
        // Sensor array frame
        const frameGeometry = new THREE.BoxGeometry(12, 10, 3);
        const frameMaterial = new THREE.MeshLambertMaterial({ color });
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        frame.position.set(0, 8.5, 0);
        frame.castShadow = true;
        group.add(frame);
        
        // Individual moisture sensors (arranged in grid)
        for (let x = -5; x <= 5; x += 2.5) {
            for (let y = 4; y <= 12; y += 2) {
                const sensorGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.8);
                const sensorMaterial = new THREE.MeshLambertMaterial({ 
                    color: 0x00ff00,
                    emissive: 0x001100
                });
                const sensor = new THREE.Mesh(sensorGeometry, sensorMaterial);
                sensor.position.set(x, y, 2);
                sensor.rotation.x = Math.PI / 2;
                group.add(sensor);
            }
        }
        
        // Digital display panel
        const displayGeometry = new THREE.BoxGeometry(5, 3, 0.8);
        const displayMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
        const display = new THREE.Mesh(displayGeometry, displayMaterial);
        display.position.set(-8, 10, -8);
        group.add(display);
        
        // Scanning mechanism (moves back and forth)
        const scannerGeometry = new THREE.BoxGeometry(14, 1, 2);
        const scannerMaterial = new THREE.MeshLambertMaterial({ color: 0xff6600 });
        const scanner = new THREE.Mesh(scannerGeometry, scannerMaterial);
        scanner.position.set(0, 12, 0);
        scanner.userData = { animate: true };
        group.add(scanner);
    }

    createConditioningEquipment(group, color, secondaryColor) {
        // Mist nozzle housing
        const housingGeometry = new THREE.BoxGeometry(10, 5, 3);
        const housingMaterial = new THREE.MeshLambertMaterial({ color });
        const housing = new THREE.Mesh(housingGeometry, housingMaterial);
        housing.position.set(0, 10, 3);
        housing.castShadow = true;
        group.add(housing);
        
        // Fine mist nozzles
        for (let i = 0; i < 10; i++) {
            const nozzleGeometry = new THREE.ConeGeometry(0.3, 1.5, 8);
            const nozzleMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc });
            const nozzle = new THREE.Mesh(nozzleGeometry, nozzleMaterial);
            nozzle.position.set(-4.5 + i, 8, 4);
            nozzle.rotation.x = Math.PI;
            group.add(nozzle);
        }
        
        // Oil tank (amber colored)
        const oilTankGeometry = new THREE.CylinderGeometry(1.5, 1.5, 6);
        const oilTankMaterial = new THREE.MeshLambertMaterial({ color: 0xffa500 });
        const oilTank = new THREE.Mesh(oilTankGeometry, oilTankMaterial);
        oilTank.position.set(-6, 6, -8);
        oilTank.castShadow = true;
        group.add(oilTank);
        
        // Water tank (clear blue)
        const waterTankMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x87ceeb,
            transparent: true,
            opacity: 0.7
        });
        const waterTank = new THREE.Mesh(oilTankGeometry, waterTankMaterial);
        waterTank.position.set(-2, 6, -8);
        waterTank.castShadow = true;
        group.add(waterTank);
        
        // Mixing chamber
        const mixerGeometry = new THREE.BoxGeometry(4, 4, 4);
        const mixerMaterial = new THREE.MeshLambertMaterial({ color: secondaryColor });
        const mixer = new THREE.Mesh(mixerGeometry, mixerMaterial);
        mixer.position.set(2, 6, -8);
        mixer.castShadow = true;
        group.add(mixer);
        
        // Metering pumps
        for (let i = 0; i < 3; i++) {
            const pumpGeometry = new THREE.BoxGeometry(2, 2, 2);
            const pumpMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
            const pump = new THREE.Mesh(pumpGeometry, pumpMaterial);
            pump.position.set(-4 + i * 2, 4, -6);
            pump.castShadow = true;
            group.add(pump);
        }
    }

    createSecondaryDryingEquipment(group, color) {
        // IR heating panels (different from primary drying)
        const panelGeometry = new THREE.BoxGeometry(10, 8, 0.8);
        const panelMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xff4500,
            emissive: 0x442200
        });
        
        for (let i = 0; i < 4; i++) {
            const panel = new THREE.Mesh(panelGeometry, panelMaterial);
            panel.position.set(0, 8 + i * 2.5, -5 + i * 2.5);
            panel.castShadow = true;
            group.add(panel);
        }
        
        // Insulated chamber walls
        const insulationGeometry = new THREE.BoxGeometry(14, 10, 1.5);
        const insulationMaterial = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
        
        const wall1 = new THREE.Mesh(insulationGeometry, insulationMaterial);
        wall1.position.set(0, 9, 8);
        group.add(wall1);
        
        const wall2 = new THREE.Mesh(insulationGeometry, insulationMaterial);
        wall2.position.set(0, 9, -8);
        group.add(wall2);
        
        // Low-temperature heating elements
        const lowTempGeometry = new THREE.BoxGeometry(8, 1, 2);
        const lowTempMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xff8800,
            emissive: 0x221100
        });
        for (let i = 0; i < 3; i++) {
            const heater = new THREE.Mesh(lowTempGeometry, lowTempMaterial);
            heater.position.set(0, 6 + i * 3, 6);
            group.add(heater);
        }
        
        // Temperature control panel
        const controlGeometry = new THREE.BoxGeometry(3, 4, 1.5);
        const controlMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const control = new THREE.Mesh(controlGeometry, controlMaterial);
        control.position.set(-8, 7, -10);
        group.add(control);
    }

    createOutputEquipment(group, color) {
        // Unload robot (different design from pick robot)
        const robotBaseGeometry = new THREE.CylinderGeometry(2, 2.5, 4);
        const robotBaseMaterial = new THREE.MeshLambertMaterial({ color });
        const robotBase = new THREE.Mesh(robotBaseGeometry, robotBaseMaterial);
        robotBase.position.set(3, 5, -8);
        robotBase.castShadow = true;
        group.add(robotBase);
        
        // Different arm configuration
        const armGeometry = new THREE.BoxGeometry(1.5, 10, 1.5);
        const armMaterial = new THREE.MeshLambertMaterial({ color });
        const arm = new THREE.Mesh(armGeometry, armMaterial);
        arm.position.set(3, 12, -8);
        arm.castShadow = true;
        group.add(arm);
        
        // Output tray collection area
        const collectionGeometry = new THREE.BoxGeometry(10, 3, 14);
        const collectionMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
        const collection = new THREE.Mesh(collectionGeometry, collectionMaterial);
        collection.position.set(-4, 4.5, 0);
        collection.castShadow = true;
        group.add(collection);
        
        // Vision system cameras
        for (let i = 0; i < 4; i++) {
            const cameraGeometry = new THREE.BoxGeometry(1.2, 1.2, 2.5);
            const cameraMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
            const camera = new THREE.Mesh(cameraGeometry, cameraMaterial);
            camera.position.set(-3 + i * 2, 12, 5);
            group.add(camera);
            
            // Camera lenses (white)
            const lensGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2);
            const lensMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
            const lens = new THREE.Mesh(lensGeometry, lensMaterial);
            lens.position.set(-3 + i * 2, 12, 6.2);
            lens.rotation.x = Math.PI / 2;
            group.add(lens);
        }
        
        // Storage area shelving
        const shelfGeometry = new THREE.BoxGeometry(8, 0.8, 10);
        const shelfMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
        for (let i = 0; i < 5; i++) {
            const shelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
            shelf.position.set(8, 4 + i * 2.5, -8);
            shelf.castShadow = true;
            group.add(shelf);
        }
        
        // Quality scanner
        const scannerGeometry = new THREE.BoxGeometry(12, 2, 4);
        const scannerMaterial = new THREE.MeshLambertMaterial({ color: 0x0066cc });
        const scanner = new THREE.Mesh(scannerGeometry, scannerMaterial);
        scanner.position.set(0, 8, 0);
        scanner.castShadow = true;
        group.add(scanner);
    }

    createTrayWithBundles() {
        const trayGroup = new THREE.Group();
        
        // LARGER, MORE VISIBLE TRAY
        const trayGeometry = new THREE.BoxGeometry(8, 0.6, 10);
        const trayMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x4488cc,
            transparent: false
        });
        const trayBase = new THREE.Mesh(trayGeometry, trayMaterial);
        trayBase.castShadow = true;
        trayBase.receiveShadow = true;
        trayGroup.add(trayBase);
        
        // Tray sides for visibility
        const sideGeometry = new THREE.BoxGeometry(8.2, 1, 0.3);
        const sideMaterial = new THREE.MeshLambertMaterial({ color: 0x336699 });
        
        const side1 = new THREE.Mesh(sideGeometry, sideMaterial);
        side1.position.set(0, 0.8, 5.1);
        trayGroup.add(side1);
        
        const side2 = new THREE.Mesh(sideGeometry, sideMaterial);
        side2.position.set(0, 0.8, -5.1);
        trayGroup.add(side2);
        
        const endGeometry = new THREE.BoxGeometry(0.3, 1, 10);
        const end1 = new THREE.Mesh(endGeometry, sideMaterial);
        end1.position.set(4.1, 0.8, 0);
        trayGroup.add(end1);
        
        const end2 = new THREE.Mesh(endGeometry, sideMaterial);
        end2.position.set(-4.1, 0.8, 0);
        trayGroup.add(end2);
        
        // Create 120 bundles (12x10 grid) - VISIBLE BUNDLES
        const bundleColors = [0x8B4513, 0x2F2F2F, 0x654321, 0x808080, 0x654321];
        
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 12; col++) {
                const bundleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1.8);
                const bundleMaterial = new THREE.MeshLambertMaterial({ 
                    color: bundleColors[(row + col) % bundleColors.length]
                });
                const bundle = new THREE.Mesh(bundleGeometry, bundleMaterial);
                
                bundle.position.set(
                    -3.5 + col * 0.6,
                    1.2,
                    -4 + row * 0.8
                );
                bundle.castShadow = true;
                bundle.userData = { bundleId: row * 12 + col };
                
                trayGroup.add(bundle);
                this.bundles.push(bundle);
            }
        }
        
        // Add tray identification number
        const idGeometry = new THREE.BoxGeometry(2, 0.1, 1);
        const idMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
        const id = new THREE.Mesh(idGeometry, idMaterial);
        id.position.set(0, 0.35, 0);
        trayGroup.add(id);
        
        this.tray = trayGroup;
        this.tray.position.copy(this.trayPosition);
        this.tray.userData = {
            type: 'tray',
            name: 'Production Tray #1',
            bundleCount: 120
        };
        this.productionLine.add(this.tray);
    }

    createHumanOperator() {
        const operatorGroup = new THREE.Group();
        
        // Human body (more detailed)
        const bodyGeometry = new THREE.CylinderGeometry(1, 1.2, 5);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x0066cc });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 2.5;
        body.castShadow = true;
        operatorGroup.add(body);
        
        // Head
        const headGeometry = new THREE.SphereGeometry(0.8);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0xfdbcb4 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 6;
        head.castShadow = true;
        operatorGroup.add(head);
        
        // Hard hat (safety equipment)
        const hatGeometry = new THREE.SphereGeometry(0.9);
        const hatMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00 });
        const hat = new THREE.Mesh(hatGeometry, hatMaterial);
        hat.position.y = 6.5;
        hat.scale.y = 0.6;
        hat.castShadow = true;
        operatorGroup.add(hat);
        
        // Safety vest (high visibility)
        const vestGeometry = new THREE.CylinderGeometry(1.1, 1.3, 4);
        const vestMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xff8800,
            emissive: 0x221100
        });
        const vest = new THREE.Mesh(vestGeometry, vestMaterial);
        vest.position.y = 3;
        vest.castShadow = true;
        operatorGroup.add(vest);
        
        // Arms
        const armGeometry = new THREE.CylinderGeometry(0.4, 0.4, 3);
        const armMaterial = new THREE.MeshLambertMaterial({ color: 0xfdbcb4 });
        
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-1.5, 4, 0.5);
        leftArm.rotation.z = Math.PI / 4;
        leftArm.castShadow = true;
        operatorGroup.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(1.5, 4, 0.5);
        rightArm.rotation.z = -Math.PI / 4;
        rightArm.castShadow = true;
        operatorGroup.add(rightArm);
        
        // Legs
        const legGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2.5);
        const legMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.6, -1.25, 0);
        leftLeg.castShadow = true;
        operatorGroup.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.6, -1.25, 0);
        rightLeg.castShadow = true;
        operatorGroup.add(rightLeg);
        
        // Safety boots
        const bootGeometry = new THREE.BoxGeometry(1.2, 0.6, 2);
        const bootMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
        
        const leftBoot = new THREE.Mesh(bootGeometry, bootMaterial);
        leftBoot.position.set(-0.6, -2.3, 0.5);
        leftBoot.castShadow = true;
        operatorGroup.add(leftBoot);
        
        const rightBoot = new THREE.Mesh(bootGeometry, bootMaterial);
        rightBoot.position.set(0.6, -2.3, 0.5);
        rightBoot.castShadow = true;
        operatorGroup.add(rightBoot);
        
        operatorGroup.position.set(-54, 0, -10);
        operatorGroup.userData = {
            type: 'human_operator',
            name: 'Production Line Operator',
            role: 'Tray Loading and Safety Monitor'
        };
        
        this.humanOperator = operatorGroup;
        this.productionLine.add(operatorGroup);
    }

    setupLighting() {
        // Ambient lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        
        // Main directional light (sunlight)
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
        mainLight.position.set(40, 60, 50);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 200;
        mainLight.shadow.camera.left = -100;
        mainLight.shadow.camera.right = 100;
        mainLight.shadow.camera.top = 80;
        mainLight.shadow.camera.bottom = -80;
        this.scene.add(mainLight);
        
        // Factory overhead lighting
        for (let x = -50; x <= 50; x += 25) {
            const light = new THREE.PointLight(0xffffff, 0.5, 50);
            light.position.set(x, 25, 0);
            light.castShadow = true;
            this.scene.add(light);
        }
        
        // Station-specific task lighting
        this.stations.forEach((station, index) => {
            const taskLight = new THREE.SpotLight(0xffffff, 0.8, 40, Math.PI / 8);
            taskLight.position.set(station.position.x, 30, station.position.z + 10);
            taskLight.target.position.copy(station.position);
            taskLight.castShadow = true;
            this.scene.add(taskLight);
            this.scene.add(taskLight.target);
        });
    }

    setupEventListeners() {
        // Process control buttons
        document.getElementById('start-process').addEventListener('click', () => this.startProcess());
        document.getElementById('pause-process').addEventListener('click', () => this.pauseProcess());
        document.getElementById('stop-process').addEventListener('click', () => this.stopProcess());
        document.getElementById('reset-process').addEventListener('click', () => this.resetProcess());
        
        // Manual mode toggle
        document.getElementById('manual-mode').addEventListener('change', (e) => {
            this.manualMode = e.target.checked;
            this.updateStepButtons();
            this.addLogEntry('info', `${this.manualMode ? 'Manual' : 'Automatic'} mode activated`);
        });
        
        // Step controls
        document.getElementById('prev-station').addEventListener('click', () => this.previousStation());
        document.getElementById('next-station').addEventListener('click', () => this.nextStation());
        document.getElementById('complete-station').addEventListener('click', () => this.completeCurrentStation());
        
        // Animation speed control
        document.getElementById('animation-speed').addEventListener('input', (e) => {
            this.animationSpeed = parseFloat(e.target.value);
            document.getElementById('speed-display').textContent = `${this.animationSpeed.toFixed(1)}x`;
            this.addLogEntry('info', `Animation speed set to ${this.animationSpeed.toFixed(1)}x`);
        });
        
        // Camera view buttons
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.getAttribute('data-view');
                this.setCameraView(view);
                
                // Update active button
                document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
        
        // Visual toggles
        document.getElementById('show-human-operator').addEventListener('change', (e) => {
            if (this.humanOperator) {
                this.humanOperator.visible = e.target.checked;
                this.addLogEntry('info', `Human operator ${e.target.checked ? 'shown' : 'hidden'}`);
            }
        });
        
        document.getElementById('show-conveyor-path').addEventListener('change', (e) => {
            if (this.conveyorBelt) {
                this.conveyorBelt.visible = e.target.checked;
                this.addLogEntry('info', `Conveyor path ${e.target.checked ? 'shown' : 'hidden'}`);
            }
        });
        
        document.getElementById('show-particles').addEventListener('change', (e) => {
            this.addLogEntry('info', `Particle effects ${e.target.checked ? 'enabled' : 'disabled'}`);
        });
        
        document.getElementById('show-safety-equipment').addEventListener('change', (e) => {
            this.addLogEntry('info', `Safety equipment ${e.target.checked ? 'shown' : 'hidden'}`);
        });
        
        document.getElementById('show-station-labels').addEventListener('change', (e) => {
            this.stations.forEach(station => {
                station.children.forEach(child => {
                    if (child.material && child.material.map) {
                        child.visible = e.target.checked;
                    }
                });
            });
            this.addLogEntry('info', `Station labels ${e.target.checked ? 'shown' : 'hidden'}`);
        });
        
        // Station indicators click
        document.addEventListener('click', (e) => {
            if (e.target.closest('.station-indicator')) {
                const stationElement = e.target.closest('.station-indicator');
                const stationIndex = parseInt(stationElement.dataset.index);
                if (!isNaN(stationIndex)) {
                    this.showStationDetails(stationIndex);
                }
            }
        });
        
        // Modal controls
        document.getElementById('close-modal').addEventListener('click', () => this.closeModal());
        document.getElementById('station-modal').addEventListener('click', (e) => {
            if (e.target.id === 'station-modal') this.closeModal();
        });
        
        // Clear log
        document.getElementById('clear-log').addEventListener('click', () => this.clearLog());
    }

    createStationIndicators() {
        const container = document.getElementById('stations-grid');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.stationData.forEach((station, index) => {
            const indicator = document.createElement('div');
            indicator.className = 'station-indicator waiting';
            indicator.dataset.index = index;
            
            indicator.innerHTML = `
                <div class="station-dot"></div>
                <div class="station-name">${station.name.split(' ')[0]}</div>
                <div class="station-time">${station.duration}s</div>
            `;
            
            container.appendChild(indicator);
        });
    }

    startProcess() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.isPaused = false;
        this.totalProcessTime = 0;
        this.stationStartTime = 0;
        this.currentStationIndex = 0;
        this.isMovingBetweenStations = false;
        
        // Reset tray to loading position
        this.trayPosition.set(-50, 1.5, 0);
        this.tray.position.copy(this.trayPosition);
        
        this.updateControlButtons();
        this.updateStationIndicators();
        this.updateStationDetails(0);
        
        this.addLogEntry('success', 'PROCESS STARTED - Tray positioned at Loading Station');
        this.addLogEntry('info', 'Beginning step-by-step linear processing of 120 bundles');
        this.addLogEntry('info', `Station 1 (${this.stationData[0].name}) - Processing for ${this.stationData[0].duration} seconds`);
        
        // Start at loading station
        this.setActiveStation(0);
    }

    pauseProcess() {
        if (!this.isRunning) return;
        
        this.isPaused = !this.isPaused;
        this.updateControlButtons();
        this.addLogEntry('info', this.isPaused ? 'Process PAUSED' : 'Process RESUMED');
    }

    stopProcess() {
        this.isRunning = false;
        this.isPaused = false;
        this.currentStationIndex = 0;
        this.isMovingBetweenStations = false;
        
        this.updateControlButtons();
        this.updateStationIndicators();
        this.updateProgress();
        
        this.addLogEntry('warning', 'Process STOPPED - System reset to initial state');
    }

    resetProcess() {
        this.stopProcess();
        this.trayPosition.set(-50, 1.5, 0);
        this.tray.position.copy(this.trayPosition);
        this.totalProcessTime = 0;
        this.clearStationStates();
        this.updateStationDetails(0);
        this.addLogEntry('info', 'System RESET - Ready for new production cycle');
    }

    nextStation() {
        if (this.currentStationIndex < this.stationData.length - 1 && this.manualMode) {
            this.advanceToNextStation();
        }
    }

    previousStation() {
        if (this.currentStationIndex > 0 && this.manualMode && !this.isMovingBetweenStations) {
            this.currentStationIndex--;
            this.moveToStation(this.currentStationIndex);
            this.updateStationIndicators();
            this.updateStationDetails(this.currentStationIndex);
            this.addLogEntry('info', `Manual: Moved back to Station ${this.currentStationIndex + 1}`);
        }
    }

    completeCurrentStation() {
        if (this.isRunning && !this.isMovingBetweenStations && this.manualMode) {
            this.advanceToNextStation();
        }
    }

    advanceToNextStation() {
        if (this.currentStationIndex < this.stationData.length - 1) {
            // Complete current station
            this.completeStation(this.currentStationIndex);
            
            // Move to next station
            this.currentStationIndex++;
            this.moveToStation(this.currentStationIndex);
            
            const nextStation = this.stationData[this.currentStationIndex];
            this.addLogEntry('success', `Station ${this.currentStationIndex} completed`);
            this.addLogEntry('info', `MOVING to Station ${this.currentStationIndex + 1} (${nextStation.name})`);
        } else {
            // Process complete
            this.completeStation(this.currentStationIndex);
            this.isRunning = false;
            this.addLogEntry('success', 'PROCESS COMPLETE - All 10 stations finished!');
            this.addLogEntry('success', '120 bundles successfully processed');
            this.updateControlButtons();
        }
        
        this.updateStationIndicators();
        this.updateProgress();
    }

    moveToStation(stationIndex) {
        const targetStation = this.stationData[stationIndex];
        const targetPosition = new THREE.Vector3(targetStation.position[0], 1.5, 0);
        
        this.isMovingBetweenStations = true;
        this.movementStartPos.copy(this.trayPosition);
        this.movementTargetPos.copy(targetPosition);
        this.movementProgress = 0;
        
        this.setActiveStation(stationIndex);
    }

    setActiveStation(index) {
        this.stationStartTime = this.totalProcessTime;
        this.updateStationDetails(index);
    }

    completeStation(index) {
        const station = this.stationData[index];
        this.addLogEntry('success', `${station.name} COMPLETED - ${station.processType} finished`);
    }

    clearStationStates() {
        // Reset all station visual states
        document.querySelectorAll('.station-indicator').forEach(indicator => {
            indicator.className = 'station-indicator waiting';
        });
    }

    setCameraView(viewName) {
        const preset = this.cameraPresets[viewName];
        if (!preset) return;
        
        if (viewName === 'follow') {
            this.followMode = true;
            this.addLogEntry('info', 'FOLLOW MODE activated - Camera tracking tray movement');
        } else {
            this.followMode = false;
            this.camera.position.set(...preset.position);
            this.camera.lookAt(...preset.target);
            this.addLogEntry('info', `Camera view: ${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`);
        }
    }

    updateControlButtons() {
        document.getElementById('start-process').disabled = this.isRunning;
        document.getElementById('pause-process').disabled = !this.isRunning;
        document.getElementById('stop-process').disabled = !this.isRunning;
        
        const pauseBtn = document.getElementById('pause-process');
        pauseBtn.textContent = this.isPaused ? 'Resume' : 'Pause';
        
        this.updateStepButtons();
    }

    updateStepButtons() {
        const isManualAndRunning = this.manualMode && this.isRunning;
        document.getElementById('prev-station').disabled = !isManualAndRunning || this.currentStationIndex === 0;
        document.getElementById('next-station').disabled = !isManualAndRunning || this.currentStationIndex >= this.stationData.length - 1;
        document.getElementById('complete-station').disabled = !isManualAndRunning || this.isMovingBetweenStations;
    }

    updateStationIndicators() {
        document.querySelectorAll('.station-indicator').forEach((indicator, index) => {
            indicator.className = 'station-indicator';
            
            if (index < this.currentStationIndex) {
                indicator.classList.add('complete');
            } else if (index === this.currentStationIndex && this.isRunning) {
                if (this.isMovingBetweenStations) {
                    indicator.classList.add('waiting');
                } else {
                    indicator.classList.add('active');
                }
            } else {
                indicator.classList.add('waiting');
            }
        });
    }

    updateStationDetails(stationIndex) {
        const station = this.stationData[stationIndex];
        if (!station) return;
        
        document.getElementById('detail-station-name').textContent = station.name;
        document.getElementById('detail-process-type').textContent = station.processType;
        document.getElementById('detail-process-time').textContent = `${station.duration} seconds`;
        
        const statusElement = document.getElementById('detail-status');
        if (this.isRunning && stationIndex === this.currentStationIndex) {
            if (this.isMovingBetweenStations) {
                statusElement.textContent = 'Moving to Station';
                statusElement.className = 'status status--waiting';
            } else {
                statusElement.textContent = 'Processing';
                statusElement.className = 'status status--processing';
            }
        } else if (stationIndex < this.currentStationIndex) {
            statusElement.textContent = 'Complete';
            statusElement.className = 'status status--complete';
        } else {
            statusElement.textContent = 'Waiting';
            statusElement.className = 'status status--idle';
        }
        
        // Update equipment list
        const equipmentList = document.getElementById('equipment-list');
        if (equipmentList) {
            equipmentList.innerHTML = '';
            station.equipment.forEach(equipment => {
                const item = document.createElement('div');
                item.className = 'equipment-item';
                item.textContent = equipment.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                equipmentList.appendChild(item);
            });
        }
    }

    updateProgress() {
        const progress = this.stationData.length > 0 ? 
            ((this.currentStationIndex) / this.stationData.length) * 100 : 0;
        
        const progressFill = document.getElementById('progress-fill');
        if (progressFill) {
            progressFill.style.width = `${Math.min(progress, 100)}%`;
        }
        
        const progressPercent = document.getElementById('progress-percentage');
        if (progressPercent) {
            progressPercent.textContent = `${Math.round(progress)}%`;
        }
        
        const stationCounter = document.getElementById('station-counter');
        if (stationCounter) {
            stationCounter.textContent = this.currentStationIndex + (this.isRunning ? 1 : 0);
        }
    }

    handleObjectClick(event) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.productionLine.children, true);
        
        if (intersects.length > 0) {
            let clickedObject = intersects[0].object;
            
            // Find the station group
            while (clickedObject.parent && !clickedObject.userData.index && clickedObject.parent !== this.scene) {
                clickedObject = clickedObject.parent;
            }
            
            if (clickedObject.userData && clickedObject.userData.index !== undefined) {
                this.showStationDetails(clickedObject.userData.index);
            }
        }
    }

    showStationDetails(stationIndex) {
        const station = this.stationData[stationIndex];
        if (!station) return;
        
        const modal = document.getElementById('station-modal');
        const title = document.getElementById('modal-station-title');
        const content = document.getElementById('modal-station-content');
        
        title.textContent = `${station.name} - Station ${stationIndex + 1}`;
        
        content.innerHTML = `
            <div class="station-detail">
                <div class="detail-section">
                    <h4>Process Information</h4>
                    <div class="detail-item">
                        <span class="detail-label">Process Type:</span>
                        <span>${station.processType}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Processing Time:</span>
                        <span>${station.duration} seconds</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Position:</span>
                        <span>X: ${station.position[0]}m, Z: ${station.position[2]}m</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>Equipment Components</h4>
                    <ul class="equipment-detail-list">
                        ${station.equipment.map(eq => 
                            `<li>${eq.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</li>`
                        ).join('')}
                    </ul>
                </div>
            </div>
        `;
        
        modal.classList.remove('hidden');
        this.addLogEntry('info', `Viewing details for Station ${stationIndex + 1}: ${station.name}`);
    }

    closeModal() {
        document.getElementById('station-modal').classList.add('hidden');
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const delta = this.clock.getDelta();
        if (this.isRunning && !this.isPaused) {
            this.totalProcessTime += delta;
            this.updateSimulation(delta);
        }
        
        this.updateCamera();
        this.updateUI();
        this.renderer.render(this.scene, this.camera);
    }

    updateSimulation(delta) {
        // Handle LINEAR tray movement between stations - NO CIRCULAR MOVEMENT
        if (this.isMovingBetweenStations) {
            this.movementProgress += delta * this.animationSpeed * (this.movementSpeed / 10);
            
            if (this.movementProgress >= 1) {
                // Movement complete - tray has STOPPED at station
                this.movementProgress = 1;
                this.isMovingBetweenStations = false;
                this.trayPosition.copy(this.movementTargetPos);
                this.stationStartTime = this.totalProcessTime;
                
                const currentStation = this.stationData[this.currentStationIndex];
                this.addLogEntry('success', `Tray STOPPED at ${currentStation.name} - Beginning ${currentStation.duration}s process`);
            } else {
                // LINEAR INTERPOLATION - straight line movement only
                this.trayPosition.lerpVectors(this.movementStartPos, this.movementTargetPos, this.movementProgress);
            }
            
            this.tray.position.copy(this.trayPosition);
        }
        
        // Auto-advance in automatic mode - TRAY STOPS AND PROCESSES
        if (!this.manualMode && !this.isMovingBetweenStations && this.isRunning) {
            const currentStation = this.stationData[this.currentStationIndex];
            if (currentStation) {
                const timeInStation = this.totalProcessTime - this.stationStartTime;
                const requiredTime = currentStation.duration / this.animationSpeed;
                
                if (timeInStation >= requiredTime) {
                    // Station processing complete - advance to next
                    this.advanceToNextStation();
                }
            }
        }
        
        // Animate station equipment when processing
        this.animateStationEquipment(delta);
    }

    animateStationEquipment(delta) {
        // Only animate equipment at the CURRENT active station
        if (this.isRunning && !this.isMovingBetweenStations) {
            const activeStation = this.stations[this.currentStationIndex];
            if (activeStation) {
                // Simple animation for active equipment
                activeStation.children.forEach(child => {
                    if (child.userData && child.userData.animate) {
                        child.rotation.y += delta * this.animationSpeed * 2;
                    }
                });
            }
        }
    }

    updateCamera() {
        if (this.followMode && this.tray) {
            const trayPos = this.tray.position;
            const offset = new THREE.Vector3(0, 20, 35);
            this.camera.position.copy(trayPos).add(offset);
            this.camera.lookAt(trayPos.x, trayPos.y + 5, trayPos.z);
        }
    }

    updateUI() {
        // Update current position display
        if (this.isMovingBetweenStations) {
            document.getElementById('tray-position').textContent = 
                `Moving to Station ${this.currentStationIndex + 1}`;
        } else {
            document.getElementById('tray-position').textContent = 
                `Station ${this.currentStationIndex + 1}`;
        }
        
        // Update station timer
        if (this.isRunning && !this.isMovingBetweenStations) {
            const timeInStation = this.totalProcessTime - this.stationStartTime;
            const minutes = Math.floor(timeInStation / 60);
            const seconds = Math.floor(timeInStation % 60);
            document.getElementById('station-timer').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            document.getElementById('station-timer').textContent = '00:00';
        }
        
        // Update current step description
        if (this.isRunning) {
            const currentStation = this.stationData[this.currentStationIndex];
            if (this.isMovingBetweenStations) {
                document.getElementById('current-step').textContent = 'Moving Between Stations';
            } else {
                document.getElementById('current-step').textContent = currentStation.processType;
            }
        }
        
        this.updateProgress();
    }

    addLogEntry(type, message) {
        const log = document.getElementById('process-log');
        if (!log) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.innerHTML = `
            <span class="log-time">${timestamp}</span>
            <span class="log-message">${message}</span>
        `;
        
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;
        
        // Keep log size manageable
        while (log.children.length > 100) {
            log.removeChild(log.firstChild);
        }
    }

    clearLog() {
        const log = document.getElementById('process-log');
        if (log) {
            log.innerHTML = '';
            this.addLogEntry('info', 'Process log cleared');
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
    }

    showError(message) {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.innerHTML = `
                <div class="loading-content">
                    <h2>Error</h2>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="btn btn--primary">Reload Page</button>
                </div>
            `;
        }
    }

    onWindowResize() {
        const container = document.querySelector('.canvas-container');
        if (container && this.camera && this.renderer) {
            this.camera.aspect = container.clientWidth / container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(container.clientWidth, container.clientHeight);
        }
    }
}

// Initialize the simulator when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Linear Step-by-Step Filament Processing Simulator...');
    new LinearFilamentSimulator();
});