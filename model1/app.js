// 3D Cosmetics QC Line Simulator - Main Application
class QCLineSimulator {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.animationId = null;
        
        // Simulation state
        this.isPaused = false;
        this.simulationSpeed = 1.0;
        this.soundEnabled = true;
        this.emergencyStop = false;
        
        // Data structures
        this.belts = new Map();
        this.items = new Map();
        this.sensors = new Map();
        this.bins = new Map();
        this.profiles = new Map();
        this.alarms = [];
        this.statistics = {
            totalItems: 0,
            okCount: 0,
            redCount: 0,
            greenCount: 0,
            yellowCount: 0
        };
        
        // Demo scenarios
        this.scenarios = {
            spikeHeight: false,
            softnessDrift: false,
            wrongProduct: false
        };
        
        // Trends data
        this.trendsData = {
            labels: [],
            heightData: [],
            softnessData: []
        };
        
        // Configuration
        this.config = {
            noiseSettings: {
                height_sigma_mm: 0.2,
                softness_sigma_N: 0.1
            },
            sensorLatency: 50,
            defectRates: {
                overHeight: 0.02,
                underHeight: 0.03,
                softnessNail: 0.03
            }
        };
        
        this.init();
    }
    
    init() {
        this.initData();
        this.initScene();
        this.initUI();
        this.initChart();
        this.start();
    }
    
    initData() {
        // Initialize product profiles
        const profilesData = [
            {
                name: "Brush-64",
                diameter_mm: 64,
                target_height_mm: 45,
                height_tol_mm: 1.0,
                softness_range_N: [2.0, 3.5]
            },
            {
                name: "Brush-95",
                diameter_mm: 95,
                target_height_mm: 50,
                height_tol_mm: 1.0,
                softness_range_N: [2.2, 3.2]
            },
            {
                name: "Brush-121",
                diameter_mm: 121,
                target_height_mm: 55,
                height_tol_mm: 1.0,
                softness_range_N: [2.5, 3.0]
            }
        ];
        
        profilesData.forEach(profile => {
            this.profiles.set(profile.name, profile);
        });
        
        // Initialize belts
        const beltsData = [
            {
                id: "B1",
                name: "Belt 1 (64mm)",
                speed_mps: 0.3,
                spawn_per_min: 18,
                profile: "Brush-64",
                position: { x: -2, y: 0, z: -1 },
                enabled: false
            },
            {
                id: "B2", 
                name: "Belt 2 (95mm)",
                speed_mps: 0.25,
                spawn_per_min: 14,
                profile: "Brush-95",
                position: { x: -2, y: 0, z: 0 },
                enabled: false
            },
            {
                id: "B3",
                name: "Belt 3 (121mm)", 
                speed_mps: 0.35,
                spawn_per_min: 22,
                profile: "Brush-121",
                position: { x: -2, y: 0, z: 1 },
                enabled: false
            }
        ];
        
        beltsData.forEach(belt => {
            this.belts.set(belt.id, {
                ...belt,
                lastSpawn: 0,
                items: [],
                counters: { ok: 0, red: 0, green: 0, yellow: 0 }
            });
        });
        
        // Initialize bins
        const binsData = [
            { id: "OK_BIN", name: "OK Bin", color: "#ffffff", position: { x: 3, y: 0, z: 0 } },
            { id: "RED_BIN", name: "Under-Height/Size", color: "#ff4444", position: { x: 2.5, y: 0, z: -1 } },
            { id: "GREEN_BIN", name: "Over-Height", color: "#44ff44", position: { x: 2.5, y: 0, z: 0 } },
            { id: "YELLOW_BIN", name: "Softness Fail", color: "#ffff44", position: { x: 2.5, y: 0, z: 1 } }
        ];
        
        binsData.forEach(bin => {
            this.bins.set(bin.id, { ...bin, items: [], fillLevel: 0 });
        });
    }
    
    initScene() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(2, 3, 4);
        this.camera.lookAt(0, 0, 0);
        
        // Create renderer
        const canvas = document.getElementById('three-canvas');
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Create controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2;
        
        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        // Create factory floor
        const floorGeometry = new THREE.PlaneGeometry(10, 6);
        const floorMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x333333,
            transparent: true,
            opacity: 0.8
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        
        // Create conveyor belts
        this.createConveyorBelts();
        
        // Create sensors
        this.createSensors();
        
        // Create bins
        this.createBins();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    createConveyorBelts() {
        this.belts.forEach((belt, beltId) => {
            // Create belt geometry
            const beltGeometry = new THREE.BoxGeometry(6, 0.1, 0.4);
            const beltMaterial = new THREE.MeshLambertMaterial({ 
                color: beltId === 'B1' ? 0x0066cc : beltId === 'B2' ? 0x006600 : 0xcc6600
            });
            const beltMesh = new THREE.Mesh(beltGeometry, beltMaterial);
            beltMesh.position.set(belt.position.x + 1, belt.position.y, belt.position.z);
            beltMesh.receiveShadow = true;
            this.scene.add(beltMesh);
            
            // Store belt mesh reference
            belt.mesh = beltMesh;
            
            // Create belt supports
            for (let i = -2; i <= 4; i += 1) {
                const supportGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.3);
                const supportMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
                const support = new THREE.Mesh(supportGeometry, supportMaterial);
                support.position.set(belt.position.x + i, -0.15, belt.position.z);
                this.scene.add(support);
            }
        });
    }
    
    createSensors() {
        const sensorPositions = [
            { id: "S_SOFT_1", type: "softness", beltId: "B1", position: { x: 0, y: 0.5, z: -1 } },
            { id: "S_HEIGHT_1", type: "height", beltId: "B1", position: { x: 0.5, y: 0.5, z: -1 } },
            { id: "S_SIZE_1", type: "size", beltId: "B1", position: { x: 1, y: 0.5, z: -1 } },
            { id: "S_SOFT_2", type: "softness", beltId: "B2", position: { x: 0, y: 0.5, z: 0 } },
            { id: "S_HEIGHT_2", type: "height", beltId: "B2", position: { x: 0.5, y: 0.5, z: 0 } },
            { id: "S_SIZE_2", type: "size", beltId: "B2", position: { x: 1, y: 0.5, z: 0 } },
            { id: "S_SOFT_3", type: "softness", beltId: "B3", position: { x: 0, y: 0.5, z: 1 } },
            { id: "S_HEIGHT_3", type: "height", beltId: "B3", position: { x: 0.5, y: 0.5, z: 1 } },
            { id: "S_SIZE_3", type: "size", beltId: "B3", position: { x: 1, y: 0.5, z: 1 } }
        ];
        
        sensorPositions.forEach(sensorData => {
            // Create sensor housing
            const housingGeometry = new THREE.BoxGeometry(0.1, 0.3, 0.1);
            const housingMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
            const housing = new THREE.Mesh(housingGeometry, housingMaterial);
            housing.position.set(sensorData.position.x, sensorData.position.y, sensorData.position.z);
            this.scene.add(housing);
            
            // Create laser line for sensors
            if (sensorData.type === 'height') {
                const laserGeometry = new THREE.PlaneGeometry(0.02, 0.6);
                const laserMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0xff0000, 
                    transparent: true, 
                    opacity: 0.7,
                    side: THREE.DoubleSide
                });
                const laser = new THREE.Mesh(laserGeometry, laserMaterial);
                laser.position.set(sensorData.position.x, 0.2, sensorData.position.z);
                laser.rotation.y = Math.PI / 2;
                this.scene.add(laser);
                
                this.sensors.set(sensorData.id, {
                    ...sensorData,
                    housing,
                    laser,
                    active: false,
                    lastReading: 0
                });
            } else {
                this.sensors.set(sensorData.id, {
                    ...sensorData,
                    housing,
                    active: false,
                    lastReading: 0
                });
            }
        });
    }
    
    createBins() {
        this.bins.forEach((bin, binId) => {
            // Create bin geometry
            const binGeometry = new THREE.BoxGeometry(0.4, 0.6, 0.4);
            const binMaterial = new THREE.MeshLambertMaterial({ 
                color: bin.color,
                transparent: true,
                opacity: 0.3
            });
            const binMesh = new THREE.Mesh(binGeometry, binMaterial);
            binMesh.position.set(bin.position.x, 0.3, bin.position.z);
            this.scene.add(binMesh);
            
            // Create bin outline
            const outlineGeometry = new THREE.EdgesGeometry(binGeometry);
            const outlineMaterial = new THREE.LineBasicMaterial({ color: bin.color });
            const outline = new THREE.LineSegments(outlineGeometry, outlineMaterial);
            outline.position.copy(binMesh.position);
            this.scene.add(outline);
            
            // Create bin label
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 256;
            canvas.height = 64;
            context.fillStyle = bin.color;
            context.font = 'bold 20px Arial';
            context.textAlign = 'center';
            context.fillText(bin.name, 128, 40);
            
            const texture = new THREE.CanvasTexture(canvas);
            const labelMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
            const labelGeometry = new THREE.PlaneGeometry(0.8, 0.2);
            const label = new THREE.Mesh(labelGeometry, labelMaterial);
            label.position.set(bin.position.x, 0.8, bin.position.z);
            this.scene.add(label);
            
            bin.mesh = binMesh;
            bin.outline = outline;
            bin.label = label;
        });
    }
    
    createBrushItem(beltId, profile) {
        const belt = this.belts.get(beltId);
        if (!belt || !belt.enabled) return null;
        
        const item = {
            id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            beltId: beltId,
            profile: profile.name,
            diameter_mm: profile.diameter_mm,
            target_height_mm: profile.target_height_mm,
            measured_height_mm: this.simulateHeight(profile.target_height_mm),
            softness_N: this.simulateSoftness(profile.softness_range_N),
            status: 'PROCESSING',
            bucket: null,
            position: { x: belt.position.x - 2.5, y: 0.2, z: belt.position.z },
            velocity: belt.speed_mps,
            timestampIn: Date.now(),
            sensorReadings: []
        };
        
        // Apply demo scenarios
        if (this.scenarios.spikeHeight) {
            item.measured_height_mm += (Math.random() - 0.5) * 4; // ±2mm variation
        }
        if (this.scenarios.softnessDrift) {
            item.softness_N += 0.5; // Drift higher
        }
        if (this.scenarios.wrongProduct) {
            // Randomly assign wrong diameter
            const wrongDiameters = [44, 51, 57, 70, 76, 83, 89, 102, 108, 114, 127, 133, 142, 152];
            item.diameter_mm = wrongDiameters[Math.floor(Math.random() * wrongDiameters.length)];
        }
        
        // Create 3D mesh
        const brushGroup = new THREE.Group();
        
        // Base cylinder
        const baseGeometry = new THREE.CylinderGeometry(
            profile.diameter_mm * 0.001, // Convert mm to scene units
            profile.diameter_mm * 0.001,
            0.1
        );
        const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.castShadow = true;
        brushGroup.add(base);
        
        // Bristles
        const bristleGeometry = new THREE.CylinderGeometry(
            profile.diameter_mm * 0.0008,
            profile.diameter_mm * 0.0008,
            item.measured_height_mm * 0.01 // Convert mm to scene units
        );
        const bristleMaterial = new THREE.MeshLambertMaterial({ 
            color: new THREE.Color().setHSL(Math.random() * 0.1 + 0.1, 0.8, 0.6)
        });
        const bristles = new THREE.Mesh(bristleGeometry, bristleMaterial);
        bristles.position.y = item.measured_height_mm * 0.005 + 0.05;
        bristles.castShadow = true;
        brushGroup.add(bristles);
        
        brushGroup.position.set(item.position.x, item.position.y, item.position.z);
        this.scene.add(brushGroup);
        
        item.mesh = brushGroup;
        this.items.set(item.id, item);
        belt.items.push(item.id);
        
        return item;
    }
    
    simulateHeight(targetHeight) {
        const noise = this.gaussianRandom() * this.config.noiseSettings.height_sigma_mm;
        let variation = 0;
        
        // Add process variation
        if (Math.random() < this.config.defectRates.overHeight) {
            variation = Math.random() * 2 + 1; // 1-3mm over
        } else if (Math.random() < this.config.defectRates.underHeight) {
            variation = -(Math.random() * 2 + 1); // 1-3mm under
        } else {
            variation = (Math.random() - 0.5) * 1.6; // ±0.8mm normal variation
        }
        
        return targetHeight + variation + noise;
    }
    
    simulateSoftness(softnessRange) {
        const [min, max] = softnessRange;
        const target = (min + max) / 2;
        const noise = this.gaussianRandom() * this.config.noiseSettings.softness_sigma_N;
        
        let variation = 0;
        if (Math.random() < this.config.defectRates.softnessNail) {
            // Softness fail - outside range
            variation = Math.random() < 0.5 ? 
                -(target - min + 0.5) : // Too soft
                (max - target + 0.5);   // Too hard
        } else {
            variation = (Math.random() - 0.5) * 0.6; // ±0.3N normal variation
        }
        
        return Math.max(0, target + variation + noise);
    }
    
    gaussianRandom() {
        // Box-Muller transform for Gaussian distribution
        let u = 0, v = 0;
        while(u === 0) u = Math.random();
        while(v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }
    
    evaluateQC(item) {
        const profile = this.profiles.get(item.profile);
        if (!profile) return { status: 'ERROR', bucket: 'RED_BIN', reason: 'Unknown profile' };
        
        // Step 1: Softness check
        const [minSoftness, maxSoftness] = profile.softness_range_N;
        if (item.softness_N < minSoftness || item.softness_N > maxSoftness) {
            return {
                status: 'SOFT_FAIL',
                bucket: 'YELLOW_BIN',
                reason: `Softness ${item.softness_N.toFixed(2)}N outside range [${minSoftness}-${maxSoftness}]N`
            };
        }
        
        // Step 2: Height check
        const heightDiff = item.measured_height_mm - profile.target_height_mm;
        if (Math.abs(heightDiff) >= profile.height_tol_mm) {
            if (heightDiff >= profile.height_tol_mm) {
                return {
                    status: 'OVER_HEIGHT',
                    bucket: 'GREEN_BIN',
                    reason: `Height ${item.measured_height_mm.toFixed(1)}mm over target by ${heightDiff.toFixed(1)}mm`
                };
            } else {
                return {
                    status: 'UNDER_HEIGHT',
                    bucket: 'RED_BIN',
                    reason: `Height ${item.measured_height_mm.toFixed(1)}mm under target by ${Math.abs(heightDiff).toFixed(1)}mm`
                };
            }
        }
        
        // Step 3: Size/diameter check
        if (Math.abs(item.diameter_mm - profile.diameter_mm) > 1) {
            return {
                status: 'SIZE_DOWN',
                bucket: 'RED_BIN',
                reason: `Diameter ${item.diameter_mm}mm doesn't match profile ${profile.diameter_mm}mm`
            };
        }
        
        return {
            status: 'OK',
            bucket: 'OK_BIN',
            reason: 'All parameters within specification'
        };
    }
    
    processItem(item) {
        if (item.status !== 'PROCESSING') return;
        
        // Check if item has passed all sensors
        const belt = this.belts.get(item.beltId);
        const requiredSensors = [`S_SOFT_${item.beltId.slice(-1)}`, `S_HEIGHT_${item.beltId.slice(-1)}`, `S_SIZE_${item.beltId.slice(-1)}`];
        const completedSensors = item.sensorReadings.map(r => r.sensorId);
        
        if (requiredSensors.every(s => completedSensors.includes(s))) {
            const qcResult = this.evaluateQC(item);
            item.status = qcResult.status;
            item.bucket = qcResult.bucket;
            item.qcReason = qcResult.reason;
            
            // Update counters
            if (qcResult.status === 'OK') {
                belt.counters.ok++;
                this.statistics.okCount++;
            } else if (qcResult.bucket === 'RED_BIN') {
                belt.counters.red++;
                this.statistics.redCount++;
            } else if (qcResult.bucket === 'GREEN_BIN') {
                belt.counters.green++;
                this.statistics.greenCount++;
            } else if (qcResult.bucket === 'YELLOW_BIN') {
                belt.counters.yellow++;
                this.statistics.yellowCount++;
            }
            
            this.statistics.totalItems++;
            
            // Create alarm if not OK
            if (qcResult.status !== 'OK') {
                this.createAlarm(item, qcResult);
            }
            
            // Trigger diverter gate (visual effect)
            this.triggerDiverter(item);
        }
    }
    
    createAlarm(item, qcResult) {
        const alarm = {
            id: `alarm_${Date.now()}`,
            timestamp: new Date(),
            beltId: item.beltId,
            itemId: item.id,
            type: qcResult.status,
            message: `${item.beltId}: ${qcResult.reason}`,
            severity: qcResult.bucket === 'YELLOW_BIN' ? 'yellow' : 
                     qcResult.bucket === 'GREEN_BIN' ? 'green' : 'red'
        };
        
        this.alarms.unshift(alarm);
        
        // Keep only last 20 alarms
        if (this.alarms.length > 20) {
            this.alarms = this.alarms.slice(0, 20);
        }
        
        // Play sound if enabled
        if (this.soundEnabled) {
            this.playBuzzer();
        }
        
        // Flash belt status light
        this.flashBeltLight(item.beltId, alarm.severity);
    }
    
    triggerDiverter(item) {
        // Visual effect for diverter gate
        const diverterGeometry = new THREE.BoxGeometry(0.05, 0.1, 0.3);
        const diverterMaterial = new THREE.MeshLambertMaterial({ color: 0xff6600 });
        const diverter = new THREE.Mesh(diverterGeometry, diverterMaterial);
        
        const belt = this.belts.get(item.beltId);
        diverter.position.set(1.8, 0.15, belt.position.z);
        this.scene.add(diverter);
        
        // Animate diverter
        const startRotation = 0;
        const endRotation = item.bucket === 'OK_BIN' ? 0 : Math.PI / 4;
        const duration = 500;
        const startTime = Date.now();
        
        const animateDiverter = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            diverter.rotation.z = startRotation + (endRotation - startRotation) * progress;
            
            if (progress < 1) {
                requestAnimationFrame(animateDiverter);
            } else {
                setTimeout(() => {
                    this.scene.remove(diverter);
                }, 1000);
            }
        };
        
        animateDiverter();
    }
    
    playBuzzer() {
        const buzzer = document.getElementById('buzzerSound');
        if (buzzer) {
            buzzer.currentTime = 0;
            buzzer.play().catch(() => {}); // Ignore audio play failures
            setTimeout(() => buzzer.pause(), 500);
        }
    }
    
    flashBeltLight(beltId, severity) {
        const light = document.getElementById(`light-${beltId}`);
        if (light) {
            light.className = `status-light alarm-${severity}`;
            setTimeout(() => {
                light.className = 'status-light';
            }, 3000);
        }
    }
    
    updateItems(deltaTime) {
        this.items.forEach((item, itemId) => {
            if (item.status === 'COMPLETED') return;
            
            // Move item along belt
            item.position.x += item.velocity * deltaTime * this.simulationSpeed;
            
            if (item.mesh) {
                item.mesh.position.x = item.position.x;
            }
            
            // Check sensor interactions
            this.checkSensorInteractions(item);
            
            // Process QC if ready
            this.processItem(item);
            
            // Move to bin if processed and reached end
            if (item.status !== 'PROCESSING' && item.position.x > 2.0) {
                this.moveItemToBin(item);
            }
            
            // Remove items that have moved too far
            if (item.position.x > 4) {
                this.removeItem(itemId);
            }
        });
    }
    
    checkSensorInteractions(item) {
        this.sensors.forEach((sensor, sensorId) => {
            if (sensor.beltId !== item.beltId) return;
            
            const sensorX = sensor.position.x;
            const itemX = item.position.x;
            const tolerance = 0.1;
            
            // Check if item is at sensor position
            if (Math.abs(itemX - sensorX) < tolerance) {
                // Check if already recorded reading for this sensor
                const existingReading = item.sensorReadings.find(r => r.sensorId === sensorId);
                if (!existingReading) {
                    // Record sensor reading
                    let value;
                    switch (sensor.type) {
                        case 'softness':
                            value = item.softness_N;
                            break;
                        case 'height':
                            value = item.measured_height_mm;
                            // Flash laser
                            if (sensor.laser) {
                                sensor.laser.material.opacity = 1.0;
                                setTimeout(() => {
                                    if (sensor.laser) sensor.laser.material.opacity = 0.7;
                                }, 100);
                            }
                            break;
                        case 'size':
                            value = item.diameter_mm;
                            break;
                    }
                    
                    item.sensorReadings.push({
                        sensorId: sensorId,
                        timestamp: Date.now(),
                        value: value,
                        type: sensor.type
                    });
                    
                    sensor.lastReading = value;
                }
            }
        });
    }
    
    moveItemToBin(item) {
        const bin = this.bins.get(item.bucket);
        if (bin && item.mesh) {
            // Animate item moving to bin
            const targetPos = {
                x: bin.position.x,
                y: bin.position.y + bin.fillLevel * 0.1,
                z: bin.position.z + (Math.random() - 0.5) * 0.2
            };
            
            const startPos = { ...item.mesh.position };
            const duration = 1000;
            const startTime = Date.now();
            
            const animateTobin = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
                
                if (item.mesh) {
                    item.mesh.position.x = startPos.x + (targetPos.x - startPos.x) * easeProgress;
                    item.mesh.position.y = startPos.y + (targetPos.y - startPos.y) * easeProgress;
                    item.mesh.position.z = startPos.z + (targetPos.z - startPos.z) * easeProgress;
                    
                    // Scale down as it enters bin
                    const scale = 1 - (progress * 0.5);
                    item.mesh.scale.setScalar(scale);
                }
                
                if (progress < 1) {
                    requestAnimationFrame(animateTobin);
                } else {
                    bin.items.push(item.id);
                    bin.fillLevel++;
                    item.status = 'COMPLETED';
                }
            };
            
            animateTobin();
        }
    }
    
    removeItem(itemId) {
        const item = this.items.get(itemId);
        if (item) {
            if (item.mesh) {
                this.scene.remove(item.mesh);
            }
            
            // Remove from belt items array
            const belt = this.belts.get(item.beltId);
            if (belt) {
                const index = belt.items.indexOf(itemId);
                if (index > -1) {
                    belt.items.splice(index, 1);
                }
            }
            
            this.items.delete(itemId);
        }
    }
    
    spawnItems(deltaTime) {
        const now = Date.now();
        
        this.belts.forEach((belt, beltId) => {
            if (!belt.enabled || this.emergencyStop) return;
            
            const spawnInterval = (60 / belt.spawn_per_min) * 1000; // Convert to milliseconds
            
            if (now - belt.lastSpawn > spawnInterval) {
                const profile = this.profiles.get(belt.profile);
                if (profile) {
                    this.createBrushItem(beltId, profile);
                    belt.lastSpawn = now;
                }
            }
        });
    }
    
    updateTrends() {
        const now = new Date();
        this.trendsData.labels.push(now.toLocaleTimeString());
        
        // Calculate average height and softness from recent items
        const recentItems = Array.from(this.items.values()).slice(-10);
        const avgHeight = recentItems.length > 0 ? 
            recentItems.reduce((sum, item) => sum + item.measured_height_mm, 0) / recentItems.length : 0;
        const avgSoftness = recentItems.length > 0 ?
            recentItems.reduce((sum, item) => sum + item.softness_N, 0) / recentItems.length : 0;
        
        this.trendsData.heightData.push(avgHeight);
        this.trendsData.softnessData.push(avgSoftness);
        
        // Keep only last 50 points (5 minutes at 6 points per minute)
        if (this.trendsData.labels.length > 50) {
            this.trendsData.labels.shift();
            this.trendsData.heightData.shift();
            this.trendsData.softnessData.shift();
        }
    }
    
    initUI() {
        // Belt controls
        document.querySelectorAll('.belt-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const beltId = e.target.dataset.belt;
                this.toggleBelt(beltId);
            });
        });
        
        // Speed sliders
        document.querySelectorAll('.speed-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const beltId = e.target.dataset.belt;
                const speed = parseFloat(e.target.value);
                this.setBeltSpeed(beltId, speed);
            });
        });
        
        // Profile selectors
        document.querySelectorAll('.profile-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const beltId = e.target.dataset.belt;
                const profile = e.target.value;
                this.setBeltProfile(beltId, profile);
            });
        });
        
        // Emergency stop
        document.getElementById('emergencyStop').addEventListener('click', () => {
            this.toggleEmergencyStop();
        });
        
        // Scene controls
        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.togglePause();
        });
        
        document.getElementById('resetViewBtn').addEventListener('click', () => {
            this.resetCameraView();
        });
        
        // Sound toggle
        document.getElementById('soundToggle').addEventListener('change', (e) => {
            this.soundEnabled = e.target.checked;
        });
        
        // Scenario buttons
        document.getElementById('spikeHeight').addEventListener('click', () => {
            this.toggleScenario('spikeHeight');
        });
        
        document.getElementById('softnessDrift').addEventListener('click', () => {
            this.toggleScenario('softnessDrift');
        });
        
        document.getElementById('wrongProduct').addEventListener('click', () => {
            this.toggleScenario('wrongProduct');
        });
        
        document.getElementById('resetScenarios').addEventListener('click', () => {
            this.resetScenarios();
        });
        
        // Clear alarms
        document.getElementById('clearAlarms').addEventListener('click', () => {
            this.clearAlarms();
        });
        
        // Export CSV
        document.getElementById('exportCsv').addEventListener('click', () => {
            this.exportCSV();
        });
        
        // Configuration tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchConfigTab(e.target.dataset.tab);
            });
        });
        
        // Configuration forms
        this.initConfigurationUI();
    }
    
    initConfigurationUI() {
        // Profile selector
        const profileSelector = document.getElementById('profileSelector');
        profileSelector.addEventListener('change', (e) => {
            this.loadProfileForEdit(e.target.value);
        });
        
        // Save profile
        document.getElementById('saveProfile').addEventListener('click', () => {
            this.saveProfileChanges();
        });
        
        // Save sensor settings
        document.getElementById('saveSensorSettings').addEventListener('click', () => {
            this.saveSensorSettings();
        });
        
        // Reset config
        document.getElementById('resetConfig').addEventListener('click', () => {
            this.resetConfiguration();
        });
        
        // Load initial profile
        this.loadProfileForEdit('Brush-64');
    }
    
    initChart() {
        const ctx = document.getElementById('trendsChart').getContext('2d');
        this.trendsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.trendsData.labels,
                datasets: [{
                    label: 'Height (mm)',
                    data: this.trendsData.heightData,
                    borderColor: '#1FB8CD',
                    backgroundColor: 'rgba(31, 184, 205, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y'
                }, {
                    label: 'Softness (N)',
                    data: this.trendsData.softnessData,
                    borderColor: '#FFC185',
                    backgroundColor: 'rgba(255, 193, 133, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: true, text: 'Height (mm)' }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: { display: true, text: 'Softness (N)' },
                        grid: { drawOnChartArea: false }
                    }
                },
                plugins: {
                    legend: { position: 'top' }
                },
                animation: { duration: 0 }
            }
        });
    }
    
    toggleBelt(beltId) {
        const belt = this.belts.get(beltId);
        const btn = document.querySelector(`[data-belt="${beltId}"].belt-toggle`);
        const light = document.getElementById(`light-${beltId}`);
        
        if (belt && btn && light) {
            belt.enabled = !belt.enabled;
            
            if (belt.enabled) {
                btn.textContent = '⏸️ Stop';
                btn.classList.add('running');
                light.classList.add('active');
            } else {
                btn.textContent = '▶️ Start';
                btn.classList.remove('running');
                light.classList.remove('active');
            }
        }
    }
    
    setBeltSpeed(beltId, speed) {
        const belt = this.belts.get(beltId);
        const speedDisplay = document.getElementById(`speed-${beltId}`);
        
        if (belt && speedDisplay) {
            belt.speed_mps = speed;
            speedDisplay.textContent = speed.toFixed(2);
            
            // Update velocity of existing items on this belt
            this.items.forEach(item => {
                if (item.beltId === beltId) {
                    item.velocity = speed;
                }
            });
        }
    }
    
    setBeltProfile(beltId, profileName) {
        const belt = this.belts.get(beltId);
        if (belt) {
            belt.profile = profileName;
        }
    }
    
    toggleEmergencyStop() {
        this.emergencyStop = !this.emergencyStop;
        const btn = document.getElementById('emergencyStop');
        
        if (this.emergencyStop) {
            btn.textContent = '🔄 Reset';
            btn.style.background = '#ff6600';
            
            // Stop all belts
            this.belts.forEach((belt, beltId) => {
                if (belt.enabled) {
                    belt.wasRunning = true;
                    this.toggleBelt(beltId);
                }
            });
        } else {
            btn.textContent = '🚨 E-Stop';
            btn.style.background = '';
            
            // Restart previously running belts
            this.belts.forEach((belt, beltId) => {
                if (belt.wasRunning) {
                    this.toggleBelt(beltId);
                    belt.wasRunning = false;
                }
            });
        }
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        const btn = document.getElementById('pauseBtn');
        btn.textContent = this.isPaused ? '▶️ Resume' : '⏸️ Pause';
    }
    
    resetCameraView() {
        this.camera.position.set(2, 3, 4);
        this.camera.lookAt(0, 0, 0);
        this.controls.reset();
    }
    
    toggleScenario(scenarioName) {
        this.scenarios[scenarioName] = !this.scenarios[scenarioName];
        const btn = document.getElementById(scenarioName);
        
        if (this.scenarios[scenarioName]) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }
    
    resetScenarios() {
        Object.keys(this.scenarios).forEach(key => {
            this.scenarios[key] = false;
            const btn = document.getElementById(key);
            if (btn) btn.classList.remove('active');
        });
    }
    
    clearAlarms() {
        this.alarms = [];
        this.updateAlarmsDisplay();
    }
    
    exportCSV() {
        const items = Array.from(this.items.values());
        if (items.length === 0) return;
        
        const headers = ['ID', 'Belt', 'Profile', 'Diameter (mm)', 'Target Height (mm)', 'Measured Height (mm)', 'Softness (N)', 'Status', 'Bucket', 'Reason', 'Timestamp'];
        const rows = items.map(item => [
            item.id,
            item.beltId,
            item.profile,
            item.diameter_mm,
            item.target_height_mm,
            item.measured_height_mm.toFixed(2),
            item.softness_N.toFixed(2),
            item.status,
            item.bucket || '',
            item.qcReason || '',
            new Date(item.timestampIn).toISOString()
        ]);
        
        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `qc_data_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
    
    switchConfigTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }
    
    loadProfileForEdit(profileName) {
        const profile = this.profiles.get(profileName);
        if (profile) {
            document.getElementById('profileDiameter').value = profile.diameter_mm;
            document.getElementById('profileHeight').value = profile.target_height_mm;
            document.getElementById('profileTolerance').value = profile.height_tol_mm;
            document.getElementById('profileSoftnessMin').value = profile.softness_range_N[0];
            document.getElementById('profileSoftnessMax').value = profile.softness_range_N[1];
        }
    }
    
    saveProfileChanges() {
        const profileName = document.getElementById('profileSelector').value;
        const profile = this.profiles.get(profileName);
        
        if (profile) {
            profile.diameter_mm = parseFloat(document.getElementById('profileDiameter').value);
            profile.target_height_mm = parseFloat(document.getElementById('profileHeight').value);
            profile.height_tol_mm = parseFloat(document.getElementById('profileTolerance').value);
            profile.softness_range_N[0] = parseFloat(document.getElementById('profileSoftnessMin').value);
            profile.softness_range_N[1] = parseFloat(document.getElementById('profileSoftnessMax').value);
            
            this.profiles.set(profileName, profile);
            
            // Show feedback
            const saveBtn = document.getElementById('saveProfile');
            const originalText = saveBtn.textContent;
            saveBtn.textContent = '✅ Saved!';
            setTimeout(() => {
                saveBtn.textContent = originalText;
            }, 2000);
        }
    }
    
    saveSensorSettings() {
        this.config.noiseSettings.height_sigma_mm = parseFloat(document.getElementById('heightNoise').value);
        this.config.noiseSettings.softness_sigma_N = parseFloat(document.getElementById('softnessNoise').value);
        this.config.sensorLatency = parseInt(document.getElementById('sensorLatency').value);
        
        // Show feedback
        const saveBtn = document.getElementById('saveSensorSettings');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = '✅ Saved!';
        setTimeout(() => {
            saveBtn.textContent = originalText;
        }, 2000);
    }
    
    resetConfiguration() {
        // Reset to defaults
        this.config.noiseSettings.height_sigma_mm = 0.2;
        this.config.noiseSettings.softness_sigma_N = 0.1;
        this.config.sensorLatency = 50;
        
        document.getElementById('heightNoise').value = 0.2;
        document.getElementById('softnessNoise').value = 0.1;
        document.getElementById('sensorLatency').value = 50;
        
        // Reset profiles to defaults
        this.initData();
        this.loadProfileForEdit('Brush-64');
    }
    
    updateUI() {
        // Update status bar
        document.getElementById('totalItems').textContent = this.statistics.totalItems;
        const okRate = this.statistics.totalItems > 0 ? 
            ((this.statistics.okCount / this.statistics.totalItems) * 100).toFixed(1) : '0';
        document.getElementById('okRate').textContent = `${okRate}%`;
        document.getElementById('activeAlarms').textContent = this.alarms.length;
        
        // Update belt counters
        this.belts.forEach((belt, beltId) => {
            document.getElementById(`ok-${beltId}`).textContent = belt.counters.ok;
            document.getElementById(`red-${beltId}`).textContent = belt.counters.red;
            document.getElementById(`green-${beltId}`).textContent = belt.counters.green;
            document.getElementById(`yellow-${beltId}`).textContent = belt.counters.yellow;
        });
        
        // Update alarms display
        this.updateAlarmsDisplay();
        
        // Update trends chart
        if (this.trendsChart) {
            this.trendsChart.data.labels = [...this.trendsData.labels];
            this.trendsChart.data.datasets[0].data = [...this.trendsData.heightData];
            this.trendsChart.data.datasets[1].data = [...this.trendsData.softnessData];
            this.trendsChart.update('none');
        }
    }
    
    updateAlarmsDisplay() {
        const alarmsList = document.getElementById('alarmsList');
        
        if (this.alarms.length === 0) {
            alarmsList.innerHTML = '<div class="no-alarms">No active alarms</div>';
        } else {
            alarmsList.innerHTML = this.alarms.map(alarm => `
                <div class="alarm-item ${alarm.severity}">
                    <div class="alarm-message">${alarm.message}</div>
                    <div class="alarm-time">${alarm.timestamp.toLocaleTimeString()}</div>
                </div>
            `).join('');
        }
    }
    
    onWindowResize() {
        const canvas = document.getElementById('three-canvas');
        this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    }
    
    start() {
        let lastTime = Date.now();
        let fpsCounter = 0;
        let lastFpsUpdate = Date.now();
        
        const animate = () => {
            if (!this.isPaused) {
                const currentTime = Date.now();
                const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
                lastTime = currentTime;
                
                // Update simulation
                this.spawnItems(deltaTime);
                this.updateItems(deltaTime);
                
                // Update trends every 10 seconds
                if (currentTime % 10000 < 16) {
                    this.updateTrends();
                }
                
                // Update UI every 100ms
                if (currentTime % 100 < 16) {
                    this.updateUI();
                }
                
                // Update FPS counter
                fpsCounter++;
                if (currentTime - lastFpsUpdate > 1000) {
                    document.getElementById('fpsCounter').textContent = `FPS: ${fpsCounter}`;
                    fpsCounter = 0;
                    lastFpsUpdate = currentTime;
                }
            }
            
            // Update camera controls
            this.controls.update();
            
            // Render scene
            this.renderer.render(this.scene, this.camera);
            
            this.animationId = requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
}

// Initialize the simulator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.qcSimulator = new QCLineSimulator();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.qcSimulator) {
        window.qcSimulator.stop();
    }
});