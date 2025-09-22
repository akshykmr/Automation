// 3D Industrial Tray Cleaning System - Fixed Version
class IndustrialSimulation {
    constructor() {
        // Core Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.clock = new THREE.Clock();
        
        // Simulation state
        this.isRunning = false;
        this.simulationSpeed = 1.0;
        this.currentStep = 0;
        this.currentTray = null;
        this.components = new Map();
        this.labels = new Map();
        
        // Mouse interaction
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // System data from provided JSON
        this.systemData = {
            "system_components": [
                {
                    "id": "loading_station",
                    "name": "Tray Loading Station",
                    "position": {"x": -20, "y": 0, "z": 0},
                    "color": "#4CAF50",
                    "specs": {
                        "type": "Robotic Arm System",
                        "capacity": "50 trays/hour",
                        "power": "5kW",
                        "status": "Operational"
                    }
                },
                {
                    "id": "water_tank_1",
                    "name": "Primary Water Tank",
                    "position": {"x": -15, "y": 4, "z": -5},
                    "color": "#2196F3",
                    "specs": {
                        "capacity": "2000L",
                        "material": "Stainless Steel",
                        "level": "80%",
                        "status": "Full"
                    }
                },
                {
                    "id": "water_tank_2", 
                    "name": "Secondary Water Tank",
                    "position": {"x": -10, "y": 4, "z": -5},
                    "color": "#2196F3",
                    "specs": {
                        "capacity": "1500L",
                        "material": "Stainless Steel", 
                        "level": "75%",
                        "status": "Full"
                    }
                },
                {
                    "id": "pump_1",
                    "name": "Primary Pump",
                    "position": {"x": -12, "y": 1, "z": -3},
                    "color": "#FF9800",
                    "specs": {
                        "flow_rate": "300L/min",
                        "pressure": "15 bar",
                        "rpm": "2850",
                        "status": "Running"
                    }
                },
                {
                    "id": "pump_2",
                    "name": "Secondary Pump", 
                    "position": {"x": -8, "y": 1, "z": -3},
                    "color": "#FF9800",
                    "specs": {
                        "flow_rate": "250L/min",
                        "pressure": "12 bar",
                        "rpm": "2850", 
                        "status": "Running"
                    }
                },
                {
                    "id": "cleaning_chamber",
                    "name": "Multi-Stage Cleaning Chamber",
                    "position": {"x": -5, "y": 0, "z": 0},
                    "color": "#9C27B0",
                    "specs": {
                        "volume": "8m³",
                        "nozzles": "24 units",
                        "temperature": "65°C",
                        "status": "Active"
                    }
                },
                {
                    "id": "conveyor",
                    "name": "Transport Conveyor",
                    "position": {"x": 5, "y": 0, "z": 0},
                    "color": "#795548", 
                    "specs": {
                        "length": "12m",
                        "speed": "0.5 m/s",
                        "capacity": "200kg/m",
                        "status": "Running"
                    }
                },
                {
                    "id": "oil_chamber",
                    "name": "Oil Application Chamber",
                    "position": {"x": 15, "y": 0, "z": 0},
                    "color": "#E91E63",
                    "specs": {
                        "spray_nozzles": "16 units",
                        "oil_consumption": "50ml/tray",
                        "recovery": "95%",
                        "status": "Active"
                    }
                },
                {
                    "id": "oil_tank_main",
                    "name": "Main Oil Tank",
                    "position": {"x": 18, "y": 4, "z": -5},
                    "color": "#FF5722",
                    "specs": {
                        "capacity": "1000L",
                        "temperature": "40°C",
                        "level": "85%",
                        "status": "Heated"
                    }
                },
                {
                    "id": "drying_system",
                    "name": "Drying System", 
                    "position": {"x": 25, "y": 0, "z": 0},
                    "color": "#FFC107",
                    "specs": {
                        "temperature": "80°C",
                        "air_velocity": "5 m/s",
                        "efficiency": "95%",
                        "status": "Running"
                    }
                },
                {
                    "id": "output_station",
                    "name": "Output Station",
                    "position": {"x": 32, "y": 0, "z": 0},
                    "color": "#8BC34A",
                    "specs": {
                        "capacity": "100 trays",
                        "throughput": "60/hour", 
                        "quality_check": "Vision System",
                        "status": "Collecting"
                    }
                }
            ],
            "process_steps": [
                {"name": "Loading", "duration": 3000, "components": ["loading_station"]},
                {"name": "Cleaning", "duration": 8000, "components": ["cleaning_chamber", "water_tank_1", "water_tank_2", "pump_1", "pump_2"]},
                {"name": "Transport", "duration": 4000, "components": ["conveyor"]},
                {"name": "Oiling", "duration": 5000, "components": ["oil_chamber", "oil_tank_main"]},
                {"name": "Drying", "duration": 10000, "components": ["drying_system"]},
                {"name": "Output", "duration": 2000, "components": ["output_station"]}
            ]
        };
        
        // Start initialization
        this.init();
    }
    
    init() {
        try {
            this.updateLoadingStatus('Checking WebGL support...');
            
            // Check WebGL support first
            if (!this.checkWebGLSupport()) {
                this.showError('WebGL is not supported in your browser. Please use a modern browser like Chrome, Firefox, or Safari.');
                return;
            }
            
            this.updateLoadingStatus('Initializing 3D scene...');
            this.createScene();
            this.createCamera();
            this.createRenderer();
            this.createControls();
            
            this.updateLoadingStatus('Setting up lighting...');
            this.createLighting();
            
            this.updateLoadingStatus('Creating system components...');
            this.createComponents();
            this.createTraySystem();
            
            this.updateLoadingStatus('Setting up controls...');
            this.setupEventListeners();
            
            this.updateLoadingStatus('Starting simulation...');
            this.startAnimation();
            
            // Hide loading screen after everything is ready
            setTimeout(() => {
                this.hideLoadingScreen();
            }, 1000);
            
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Failed to initialize 3D simulation: ' + error.message);
        }
    }
    
    checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return !!gl;
        } catch (e) {
            return false;
        }
    }
    
    updateLoadingStatus(message) {
        const statusEl = document.getElementById('loading-status');
        if (statusEl) {
            statusEl.textContent = message;
        }
    }
    
    showError(message) {
        const errorScreen = document.getElementById('error-screen');
        const errorMessage = document.getElementById('error-message');
        const loadingScreen = document.getElementById('loading-screen');
        
        if (errorMessage) errorMessage.textContent = message;
        if (loadingScreen) loadingScreen.classList.add('hidden');
        if (errorScreen) errorScreen.classList.remove('hidden');
    }
    
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
    }
    
    createScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);
        this.scene.fog = new THREE.Fog(0x1a1a2e, 50, 200);
    }
    
    createCamera() {
        const container = document.getElementById('canvas-container');
        this.camera = new THREE.PerspectiveCamera(
            60,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 20, 35);
        this.camera.lookAt(0, 0, 0);
    }
    
    createRenderer() {
        const canvas = document.getElementById('simulation-canvas');
        const container = canvas.parentElement;
        
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: canvas, 
            antialias: true,
            alpha: false
        });
        
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setClearColor(0x1a1a2e, 1);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }
    
    createControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI * 0.48;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 100;
        this.controls.target.set(5, 0, 0);
    }
    
    createLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        
        // Main directional light
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
        mainLight.position.set(20, 30, 20);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 100;
        mainLight.shadow.camera.left = -50;
        mainLight.shadow.camera.right = 50;
        mainLight.shadow.camera.top = 50;
        mainLight.shadow.camera.bottom = -50;
        this.scene.add(mainLight);
        
        // Secondary lights for atmosphere
        const light2 = new THREE.PointLight(0x00aaff, 0.6, 40);
        light2.position.set(-20, 15, -10);
        this.scene.add(light2);
        
        const light3 = new THREE.PointLight(0xff6600, 0.6, 40);
        light3.position.set(30, 15, 5);
        this.scene.add(light3);
        
        // Ground
        const groundGeometry = new THREE.PlaneGeometry(200, 100);
        const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x2a2a3e });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -1;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }
    
    createComponents() {
        this.systemData.system_components.forEach(componentData => {
            const component = this.createComponent(componentData);
            if (component) {
                this.components.set(componentData.id, {
                    object: component,
                    data: componentData,
                    isActive: false
                });
                this.scene.add(component);
                this.createComponentLabel(componentData, component);
            }
        });
    }
    
    createComponent(data) {
        const group = new THREE.Group();
        group.name = data.id;
        group.userData = data;
        
        const color = new THREE.Color(data.color);
        let geometry, material, mesh;
        
        // Create different components based on type
        if (data.id.includes('tank')) {
            // Cylindrical tanks
            geometry = new THREE.CylinderGeometry(1.5, 1.5, 4, 12);
            material = new THREE.MeshPhongMaterial({ 
                color: color, 
                transparent: true, 
                opacity: 0.8 
            });
            mesh = new THREE.Mesh(geometry, material);
            
            // Add liquid indicator
            const liquidGeometry = new THREE.CylinderGeometry(1.3, 1.3, 3, 12);
            const liquidColor = data.id.includes('oil') ? 0xFFA500 : 0x0099FF;
            const liquidMaterial = new THREE.MeshPhongMaterial({ 
                color: liquidColor, 
                transparent: true, 
                opacity: 0.6 
            });
            const liquid = new THREE.Mesh(liquidGeometry, liquidMaterial);
            liquid.name = 'liquid';
            group.add(liquid);
            
        } else if (data.id.includes('pump')) {
            // Cylindrical pumps
            geometry = new THREE.CylinderGeometry(0.8, 0.8, 1.5, 8);
            material = new THREE.MeshPhongMaterial({ color: color });
            mesh = new THREE.Mesh(geometry, material);
            
            // Add rotating impeller
            const impellerGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.2, 6);
            const impellerMaterial = new THREE.MeshPhongMaterial({ color: 0x444444 });
            const impeller = new THREE.Mesh(impellerGeometry, impellerMaterial);
            impeller.name = 'impeller';
            group.add(impeller);
            
        } else if (data.id.includes('chamber')) {
            // Processing chambers
            geometry = new THREE.BoxGeometry(4, 3, 3);
            material = new THREE.MeshPhongMaterial({ 
                color: color, 
                transparent: true, 
                opacity: 0.7 
            });
            mesh = new THREE.Mesh(geometry, material);
            
            // Add spray nozzles
            for (let i = 0; i < 6; i++) {
                const nozzleGeometry = new THREE.ConeGeometry(0.1, 0.3, 6);
                const nozzleMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 });
                const nozzle = new THREE.Mesh(nozzleGeometry, nozzleMaterial);
                nozzle.position.set(
                    (Math.random() - 0.5) * 3,
                    1.2,
                    (Math.random() - 0.5) * 2.5
                );
                nozzle.name = 'nozzle';
                group.add(nozzle);
            }
            
        } else if (data.id === 'conveyor') {
            // Conveyor system
            geometry = new THREE.BoxGeometry(6, 0.5, 1.5);
            material = new THREE.MeshPhongMaterial({ color: color });
            mesh = new THREE.Mesh(geometry, material);
            
            // Add belt surface
            const beltGeometry = new THREE.BoxGeometry(6, 0.1, 1.3);
            const beltMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
            const belt = new THREE.Mesh(beltGeometry, beltMaterial);
            belt.position.y = 0.3;
            belt.name = 'belt';
            group.add(belt);
            
        } else if (data.id === 'drying_system') {
            // Drying system with fans
            geometry = new THREE.BoxGeometry(3, 3, 3);
            material = new THREE.MeshPhongMaterial({ color: color });
            mesh = new THREE.Mesh(geometry, material);
            
            // Add rotating fan
            const fanGeometry = new THREE.CylinderGeometry(1.2, 1.2, 0.2, 8);
            const fanMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 });
            const fan = new THREE.Mesh(fanGeometry, fanMaterial);
            fan.rotation.x = Math.PI / 2;
            fan.position.z = 1.3;
            fan.name = 'fan';
            group.add(fan);
            
        } else {
            // Default box shape for other components
            geometry = new THREE.BoxGeometry(2.5, 2, 2);
            material = new THREE.MeshPhongMaterial({ color: color });
            mesh = new THREE.Mesh(geometry, material);
        }
        
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        
        // Position the component
        group.position.set(data.position.x, data.position.y, data.position.z);
        
        return group;
    }
    
    createTraySystem() {
        // Create tray with cylindrical items
        const trayGroup = new THREE.Group();
        trayGroup.name = 'tray';
        
        // Tray base
        const trayGeometry = new THREE.BoxGeometry(2, 0.3, 1.5);
        const trayMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 });
        const trayMesh = new THREE.Mesh(trayGeometry, trayMaterial);
        trayMesh.castShadow = true;
        trayGroup.add(trayMesh);
        
        // Add cylindrical items to tray
        const itemColors = [0x88C999, 0x4FC3F7, 0xFFB74D];
        for (let i = 0; i < 6; i++) {
            const itemGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.6, 8);
            const itemMaterial = new THREE.MeshPhongMaterial({ 
                color: itemColors[i % itemColors.length] 
            });
            const item = new THREE.Mesh(itemGeometry, itemMaterial);
            
            const row = Math.floor(i / 3);
            const col = i % 3;
            item.position.set(
                (col - 1) * 0.5,
                0.45,
                (row - 0.5) * 0.6
            );
            item.castShadow = true;
            trayGroup.add(item);
        }
        
        trayGroup.position.set(-20, 1, 0);
        this.currentTray = trayGroup;
        this.scene.add(trayGroup);
    }
    
    createComponentLabel(data, component) {
        const labelEl = document.createElement('div');
        labelEl.className = 'component-label';
        labelEl.textContent = data.name;
        labelEl.onclick = () => this.showComponentDetails(data);
        
        document.getElementById('component-labels').appendChild(labelEl);
        
        this.labels.set(data.id, {
            element: labelEl,
            object: component
        });
    }
    
    updateLabels() {
        const canvas = this.renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        
        this.labels.forEach((label, id) => {
            const vector = new THREE.Vector3();
            label.object.getWorldPosition(vector);
            vector.project(this.camera);
            
            const x = (vector.x * 0.5 + 0.5) * rect.width;
            const y = (vector.y * -0.5 + 0.5) * rect.height;
            
            label.element.style.left = x + 'px';
            label.element.style.top = y + 'px';
            label.element.style.display = vector.z > 1 ? 'none' : 'block';
        });
    }
    
    showComponentDetails(data) {
        const detailsEl = document.getElementById('component-details');
        let html = `<h4>${data.name}</h4>`;
        
        Object.entries(data.specs).forEach(([key, value]) => {
            html += `<div class="component-spec">
                <strong>${key.replace(/_/g, ' ')}:</strong>
                <span>${value}</span>
            </div>`;
        });
        
        detailsEl.innerHTML = html;
    }
    
    setupEventListeners() {
        // Start button
        document.getElementById('start-btn').addEventListener('click', () => {
            this.toggleSimulation();
        });
        
        // Reset button
        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetSimulation();
        });
        
        // Speed slider
        document.getElementById('speed-slider').addEventListener('input', (e) => {
            this.simulationSpeed = parseFloat(e.target.value);
            document.getElementById('speed-value').textContent = `${this.simulationSpeed.toFixed(1)}x`;
        });
        
        // Reset camera
        document.getElementById('reset-camera').addEventListener('click', () => {
            this.resetCamera();
        });
        
        // Retry button for errors
        const retryBtn = document.getElementById('retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                location.reload();
            });
        }
        
        // Window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Mouse interaction
        this.renderer.domElement.addEventListener('click', (event) => this.onMouseClick(event));
    }
    
    toggleSimulation() {
        this.isRunning = !this.isRunning;
        const startBtn = document.getElementById('start-btn');
        const statusDot = document.getElementById('system-status');
        const statusText = document.getElementById('system-status-text');
        
        if (this.isRunning) {
            startBtn.innerHTML = '<span>⏸</span> Pause';
            statusDot.className = 'status-dot active';
            statusText.textContent = 'System Running';
            this.startProcessCycle();
        } else {
            startBtn.innerHTML = '<span>▶</span> Start Simulation';
            statusDot.className = 'status-dot inactive';
            statusText.textContent = 'System Paused';
            this.deactivateAllComponents();
        }
    }
    
    resetSimulation() {
        this.isRunning = false;
        this.currentStep = 0;
        
        // Reset UI
        document.getElementById('start-btn').innerHTML = '<span>▶</span> Start Simulation';
        document.getElementById('system-status').className = 'status-dot';
        document.getElementById('system-status-text').textContent = 'System Ready';
        
        // Reset tray position
        if (this.currentTray) {
            this.currentTray.position.set(-20, 1, 0);
        }
        
        this.deactivateAllComponents();
        this.updateProcessStatus();
    }
    
    resetCamera() {
        this.camera.position.set(0, 20, 35);
        this.controls.target.set(5, 0, 0);
        this.controls.update();
    }
    
    startProcessCycle() {
        if (!this.isRunning) return;
        
        const processStep = this.systemData.process_steps[this.currentStep];
        if (!processStep) {
            // Reset to beginning
            this.currentStep = 0;
            setTimeout(() => this.startProcessCycle(), 1000);
            return;
        }
        
        // Deactivate all components
        this.deactivateAllComponents();
        
        // Activate components for current step
        processStep.components.forEach(componentId => {
            const component = this.components.get(componentId);
            if (component) {
                component.isActive = true;
            }
        });
        
        this.updateProcessStatus();
        this.moveTray();
        
        // Move to next step
        setTimeout(() => {
            if (this.isRunning) {
                this.currentStep = (this.currentStep + 1) % this.systemData.process_steps.length;
                this.startProcessCycle();
            }
        }, processStep.duration / this.simulationSpeed);
    }
    
    moveTray() {
        if (!this.currentTray) return;
        
        const positions = [
            { x: -20, y: 1, z: 0 },  // Loading
            { x: -5, y: 1, z: 0 },   // Cleaning  
            { x: 5, y: 1, z: 0 },    // Transport
            { x: 15, y: 1, z: 0 },   // Oiling
            { x: 25, y: 1, z: 0 },   // Drying
            { x: 32, y: 1, z: 0 }    // Output
        ];
        
        const targetPos = positions[this.currentStep];
        if (targetPos) {
            // Simple linear interpolation for movement
            const startPos = this.currentTray.position.clone();
            const duration = 2000 / this.simulationSpeed;
            const startTime = Date.now();
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                this.currentTray.position.lerpVectors(startPos, new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z), progress);
                
                if (progress < 1 && this.isRunning) {
                    requestAnimationFrame(animate);
                }
            };
            animate();
        }
    }
    
    deactivateAllComponents() {
        this.components.forEach(component => {
            component.isActive = false;
        });
        
        this.labels.forEach(label => {
            label.element.classList.remove('active');
        });
    }
    
    updateProcessStatus() {
        document.querySelectorAll('.process-step').forEach((step, index) => {
            if (index === this.currentStep) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
    }
    
    animateComponents() {
        const time = this.clock.getElapsedTime();
        
        this.components.forEach((component, id) => {
            const obj = component.object;
            const isActive = component.isActive;
            
            // Update label status
            const label = this.labels.get(id);
            if (label) {
                if (isActive) {
                    label.element.classList.add('active');
                } else {
                    label.element.classList.remove('active');
                }
            }
            
            // Component-specific animations
            if (id.includes('pump') && isActive) {
                const impeller = obj.getObjectByName('impeller');
                if (impeller) {
                    impeller.rotation.y += 0.3 * this.simulationSpeed;
                }
            }
            
            if (id === 'conveyor' && isActive) {
                const belt = obj.getObjectByName('belt');
                if (belt) {
                    belt.material.map && (belt.material.map.offset.x += 0.02 * this.simulationSpeed);
                }
            }
            
            if (id === 'drying_system' && isActive) {
                const fan = obj.getObjectByName('fan');
                if (fan) {
                    fan.rotation.z += 0.4 * this.simulationSpeed;
                }
            }
            
            if (id.includes('chamber') && isActive) {
                obj.traverse((child) => {
                    if (child.name === 'nozzle') {
                        child.rotation.x = Math.sin(time * 4) * 0.3;
                    }
                });
            }
            
            if (id.includes('tank') && isActive) {
                const liquid = obj.getObjectByName('liquid');
                if (liquid) {
                    liquid.scale.y = 0.7 + 0.2 * Math.sin(time * 2);
                }
            }
            
            // Add glow effect for active components
            obj.traverse((child) => {
                if (child.isMesh && child.material) {
                    if (isActive) {
                        child.material.emissive.setHex(0x111111);
                    } else {
                        child.material.emissive.setHex(0x000000);
                    }
                }
            });
        });
    }
    
    onMouseClick(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        
        if (intersects.length > 0) {
            let object = intersects[0].object;
            
            // Find the component group
            while (object.parent && !object.userData.id) {
                object = object.parent;
            }
            
            if (object.userData && object.userData.id) {
                this.showComponentDetails(object.userData);
            }
        }
    }
    
    onWindowResize() {
        const container = document.getElementById('canvas-container');
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }
    
    startAnimation() {
        const animate = () => {
            requestAnimationFrame(animate);
            
            this.controls.update();
            this.animateComponents();
            this.updateLabels();
            
            this.renderer.render(this.scene, this.camera);
        };
        
        animate();
    }
}

// Initialize simulation when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if Three.js is loaded
    if (typeof THREE === 'undefined') {
        const errorScreen = document.getElementById('error-screen');
        const errorMessage = document.getElementById('error-message');
        const loadingScreen = document.getElementById('loading-screen');
        
        if (errorMessage) errorMessage.textContent = 'Three.js library failed to load. Please refresh the page.';
        if (loadingScreen) loadingScreen.classList.add('hidden');
        if (errorScreen) errorScreen.classList.remove('hidden');
        return;
    }
    
    // Initialize simulation
    try {
        window.simulation = new IndustrialSimulation();
    } catch (error) {
        console.error('Failed to initialize simulation:', error);
        const errorScreen = document.getElementById('error-screen');
        const errorMessage = document.getElementById('error-message');
        const loadingScreen = document.getElementById('loading-screen');
        
        if (errorMessage) errorMessage.textContent = 'Failed to start simulation: ' + error.message;
        if (loadingScreen) loadingScreen.classList.add('hidden');
        if (errorScreen) errorScreen.classList.remove('hidden');
    }
});