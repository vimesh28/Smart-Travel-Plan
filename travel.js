// Graph and Travel Planning System
class TravelPlanner {
    constructor() {
        console.log('TravelPlanner initialized');
        this.locations = new Map(); // Maps location names to coordinates
        this.transportModes = {
            plane: {
                icon: '✈️',
                speedFactor: 1.0,
                baseCost: 0.5, // Cost per km
                color: '#e74c3c',
                lineStyle: {
                    color: '#e74c3c',
                    width: 3,
                    dashes: [5, 5],
                    shadow: true
                }
            },
            train: {
                icon: '🚂',
                speedFactor: 1.2,
                baseCost: 0.2,
                color: '#3498db',
                lineStyle: {
                    color: '#3498db',
                    width: 3,
                    dashes: false,
                    shadow: true
                }
            },
            bus: {
                icon: '🚌',
                speedFactor: 1.4,
                baseCost: 0.1,
                color: '#2ecc71',
                lineStyle: {
                    color: '#2ecc71',
                    width: 3,
                    dashes: [10, 5],
                    shadow: true
                }
            },
            car: {
                icon: '🚗',
                speedFactor: 1.3,
                baseCost: 0.15,
                color: '#f1c40f',
                lineStyle: {
                    color: '#f1c40f',
                    width: 3,
                    dashes: false,
                    shadow: true
                }
            }
        };
        this.graph = new Map(); 
        this.planeRoutes = new Set();
        this.network = null;
        this.optimizationCriteria = 'distance';
        this.trafficData = new Map(); 
        this.weatherData = new Map();
        this.initializeVisualization();
        this.loadLocations();
        this.setupEventListeners();
        this.initializeCharts();
    }

    
    initializeCharts() {
        this.routeChart = new Chart(document.getElementById('routeChart'), {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Distance (km)',
                    data: [],
                    backgroundColor: '#3498db'
                }, {
                    label: 'Time (hours)',
                    data: [],
                    backgroundColor: '#2ecc71'
                }, {
                    label: 'Cost ($)',
                    data: [],
                    backgroundColor: '#e74c3c'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

 
    loadLocations() {
        const locations = {
             'Delhi': { lat: 28.6139, lng: 77.2090 },
             'Mumbai': { lat: 19.0760, lng: 72.8777 },
             'Bangalore': { lat: 12.9716, lng: 77.5946 },
            //  'Hyderabad': { lat: 17.3850, lng: 78.4867 },
             'Chennai': { lat: 13.0827, lng: 80.2707 },
             'Kolkata': { lat: 22.5726, lng: 88.3639 },
             'Ahmedabad': { lat: 23.0225, lng: 72.5714 },
             'Pune': { lat: 18.5204, lng: 73.8567 },
            //  'Jaipur': { lat: 26.9124, lng: 75.7873 },
            //  'Lucknow': { lat: 26.8467, lng: 80.9462 },
            //  'Kanpur': { lat: 26.4499, lng: 80.3319 },
            //  'Nagpur': { lat: 21.1458, lng: 79.0882 },
            //  'Indore': { lat: 22.7196, lng: 75.8577 },
            //  'Bhopal': { lat: 23.2599, lng: 77.4126 },
            //  'Patna': { lat: 25.5941, lng: 85.1376 },
            //  'Ludhiana': { lat: 30.9000, lng: 75.8573 },
            //  'Agra': { lat: 27.1767, lng: 78.0081 },
            //  'Nashik': { lat: 19.9975, lng: 73.7898 },
            //  'Faridabad': { lat: 28.4089, lng: 77.3178 },
            //  'Meerut': { lat: 28.9845, lng: 77.7064 }
    
        };

        for (const [name, coords] of Object.entries(locations)) {
            this.locations.set(name, coords);
            this.graph.set(name, new Set());
        }

        
        for (const [loc1, coords1] of this.locations) {
            for (const [loc2, coords2] of this.locations) {
                if (loc1 !== loc2) {
                    this.graph.get(loc1).add(loc2);
                }
            }
        }

        this.updateLocationsList();
        this.updateLocationSelects();
        this.updateVisualization();
    }

    // Update the location select dropdowns
    updateLocationSelects() {
        const startSelect = document.getElementById('startLocation');
        const endSelect = document.getElementById('endLocation');
        
        // Clear existing options except the first one
        while (startSelect.options.length > 1) startSelect.remove(1);
        while (endSelect.options.length > 1) endSelect.remove(1);
        
        // Add locations to both selects
        this.locations.forEach((_, location) => {
            startSelect.add(new Option(location, location));
            endSelect.add(new Option(location, location));
        });
    }

    // Calculate distance between two points using Haversine formula
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; 
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                 Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
                 Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    toRad(degrees) {
        return degrees * (Math.PI/180);
    }

    // Initialize the visualization using vis.js
    initializeVisualization() {
        console.log('Initializing visualization');
        const container = document.getElementById('graphCanvas');
        if (!container) {
            console.error('Could not find graphCanvas element');
            return;
        }

        const data = {
            nodes: new vis.DataSet([]),
            edges: new vis.DataSet([])
        };
        
        const options = {
            nodes: {
                shape: 'dot',
                size: 25,
                font: { 
                    size: 16,
                    color: '#2d3436',
                    strokeWidth: 2,
                    strokeColor: '#ffffff'
                },
                borderWidth: 2,
                borderWidthSelected: 4,
                color: {
                    background: '#ffffff',
                    border: '#0984e3',
                    highlight: {
                        background: '#ffffff',
                        border: '#0984e3'
                    },
                    hover: {
                        background: '#ffffff',
                        border: '#0984e3'
                    }
                },
                shadow: {
                    enabled: true,
                    color: 'rgba(0,0,0,0.2)',
                    size: 10,
                    x: 5,
                    y: 5
                }
            },
            edges: {
                width: 2,
                arrows: { 
                    to: { 
                        enabled: true,
                        scaleFactor: 0.5
                    }
                },
                font: { 
                    size: 14,
                    align: 'middle',
                    color: '#2d3436',
                    strokeWidth: 2,
                    strokeColor: '#ffffff'
                },
                smooth: {
                    type: 'curvedCW',
                    roundness: 0.2
                },
                shadow: {
                    enabled: true,
                    color: 'rgba(0,0,0,0.2)',
                    size: 10,
                    x: 5,
                    y: 5
                }
            },
            physics: {
                stabilization: false,
                barnesHut: {
                    gravitationalConstant: -80000,
                    springConstant: 0.001,
                    springLength: 200
                }
            },
            interaction: {
                hover: true,
                tooltipDelay: 200
            }
        };
        
        try {
            this.network = new vis.Network(container, data, options);
            console.log('Network visualization created successfully');
        } catch (error) {
            console.error('Error creating network:', error);
        }
    }

    

    // Setup event listeners
    setupEventListeners() {
        console.log('Setting up event listeners');
        const calculateRouteBtn = document.getElementById('calculateRoute');
        if (calculateRouteBtn) {
            calculateRouteBtn.addEventListener('click', () => {
                const start = document.getElementById('startLocation').value;
                const end = document.getElementById('endLocation').value;
                
                if (!start || !end) {
                    alert('Please select both start and end locations');
                    return;
                }
                
                if (start === end) {
                    alert('Start and end locations cannot be the same');
                    return;
                }
                
                this.showRouteDetails(start, end);
            });
        } else {
            console.error('Could not find calculateRoute button');
        }
    }

    // Update the locations list in the UI
    updateLocationsList() {
        console.log('Updating locations list');
        const list = document.getElementById('locations');
        if (!list) {
            console.error('Could not find locations list element');
            return;
        }
        list.innerHTML = '';
        this.locations.forEach((_, location) => {
            const li = document.createElement('li');
            li.textContent = location;
            list.appendChild(li);
        });
    }

    // Update the visualization
    updateVisualization() {
        console.log('Updating visualization');
        if (!this.network) {
            console.error('Network not initialized');
            return;
        }

        const nodes = new vis.DataSet();
        const edges = new vis.DataSet();
        
        this.locations.forEach((coords, location) => {
            nodes.add({
                id: location,
                label: location,
                title: location
            });
        });
        
        for (const [loc1, connections] of this.graph) {
            for (const loc2 of connections) {
                const coords1 = this.locations.get(loc1);
                const coords2 = this.locations.get(loc2);
                const distance = this.calculateDistance(
                    coords1.lat, coords1.lng,
                    coords2.lat, coords2.lng
                );
                
                edges.add({
                    from: loc1,
                    to: loc2,
                    label: `${Math.round(distance)} km`
                });
            }
        }
        
        this.network.setData({ nodes, edges });
        console.log('Visualization updated with:', { nodes: nodes.length, edges: edges.length });
    }

    // Calculate route details for all transport modes
    calculateRouteDetails(start, end) {
        const coords1 = this.locations.get(start);
        const coords2 = this.locations.get(end);
        const directDistance = this.calculateDistance(
            coords1.lat, coords1.lng,
            coords2.lat, coords2.lng
        );

        const routeDetails = {};
        for (const [mode, details] of Object.entries(this.transportModes)) {
            routeDetails[mode] = {
                distance: Math.round(directDistance * details.speedFactor),
                icon: details.icon,
                color: details.color
            };
        }

        return routeDetails;
    }

    // Show route details in the UI
    showRouteDetails(start, end) {
        const routeDetails = this.calculateRouteDetails(start, end);
        
        // Clear previous edges
        this.network.setData({
            nodes: this.network.body.data.nodes,
            edges: new vis.DataSet()
        });

        // Add edges for each transport mode
        const edges = new vis.DataSet();
        for (const [mode, details] of Object.entries(routeDetails)) {
            edges.add({
                from: start,
                to: end,
                label: `${details.icon} ${details.distance} km`,
                ...this.transportModes[mode].lineStyle
            });
        }
        
        this.network.setData({
            nodes: this.network.body.data.nodes,
            edges: edges
        });

        // Display results
        const pathResult = document.getElementById('pathResult');
        const distanceResult = document.getElementById('distanceResult');
        
        // Clear previous results
        pathResult.innerHTML = '';
        distanceResult.innerHTML = '';
        
        // Create header with optimization criteria
        const header = document.createElement('h4');
        header.textContent = `Routes from ${start} to ${end} (${this.optimizationCriteria})`;
        pathResult.appendChild(header);
        
        // Create route details for each mode
        for (const [mode, details] of Object.entries(routeDetails)) {
            const routeDiv = document.createElement('div');
            routeDiv.className = 'route-details';
            
            // Calculate time and cost
            const avgSpeed = {
                plane: 800, // km/h
                train: 120, // km/h
                bus: 80,    // km/h
                car: 100    // km/h
            };
            
            const hours = details.distance / avgSpeed[mode];
            const cost = details.distance * this.transportModes[mode].baseCost;
            
            routeDiv.innerHTML = `
                <div class="transport-mode">
                    <span class="mode-icon">${details.icon}</span>
                    <span class="mode-name">${mode.charAt(0).toUpperCase() + mode.slice(1)}</span>
                    <div class="route-metrics">
                        <div class="metric">
                            <span class="metric-label">Distance:</span>
                            <span class="metric-value">${Math.round(details.distance)} km</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Time:</span>
                            <span class="metric-value">${hours < 1 ? Math.round(hours * 60) + ' min' : Math.round(hours) + ' hrs'}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Cost:</span>
                            <span class="metric-value">$${Math.round(cost * 100) / 100}</span>
                        </div>
                    </div>
                </div>
            `;
            routeDiv.style.borderLeft = `4px solid ${details.color}`;
            pathResult.appendChild(routeDiv);
        }

        // Update the chart with more detailed metrics
        this.updateRouteChart([{ from: start, to: end, mode: 'car' }]);

        // Highlight the selected locations
        this.network.selectNodes([start, end]);
    }

    // Update route comparison chart with more detailed metrics
    updateRouteChart(path) {
        const labels = path.map(segment => `${segment.from} → ${segment.to}`);
        const distances = path.map(segment => {
            const startCoords = this.locations.get(segment.from);
            const endCoords = this.locations.get(segment.to);
            return this.calculateDistance(
                startCoords.lat, startCoords.lng,
                endCoords.lat, endCoords.lng
            );
        });
        
        const times = path.map(segment => {
            const distance = distances[path.indexOf(segment)];
            const avgSpeed = {
                plane: 800,
                train: 120,
                bus: 80,
                car: 100
            }[segment.mode];
            return distance / avgSpeed; // Convert to hours
        });
        
        const costs = path.map(segment => {
            const distance = distances[path.indexOf(segment)];
            return distance * this.transportModes[segment.mode].baseCost;
        });

        // Update chart with new data
        this.routeChart.data.labels = labels;
        this.routeChart.data.datasets = [
            {
                label: 'Distance (km)',
                data: distances,
                backgroundColor: '#3498db',
                borderColor: '#2980b9',
                borderWidth: 1
            },
            {
                label: 'Time (hours)',
                data: times,
                backgroundColor: '#2ecc71',
                borderColor: '#27ae60',
                borderWidth: 1
            },
            {
                label: 'Cost ($)',
                data: costs,
                backgroundColor: '#e74c3c',
                borderColor: '#c0392b',
                borderWidth: 1
            }
        ];
        
        // Update chart options for better visualization
        this.routeChart.options = {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Value'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Route Segments'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.dataset.label.includes('Time')) {
                                label += context.raw.toFixed(2) + ' hours';
                            } else if (context.dataset.label.includes('Cost')) {
                                label += '$' + context.raw.toFixed(2);
                            } else {
                                label += Math.round(context.raw) + ' km';
                            }
                            return label;
                        }
                    }
                }
            }
        };
        
        this.routeChart.update();
    }

    // Add a new location
    addLocation(name, lat, lng) {
        if (this.locations.has(name)) {
            alert('Location already exists!');
            return false;
        }
        this.locations.set(name, { lat, lng });
        this.graph.set(name, new Set());
        
        // Connect to existing locations
        for (const [existingLoc, _] of this.locations) {
            if (existingLoc !== name) {
                this.graph.get(name).add(existingLoc);
                this.graph.get(existingLoc).add(name);
            }
        }
        
        this.updateLocationsList();
        this.updateLocationSelects();
        this.updateVisualization();
        return true;
    }

    // Update optimization criteria
    setOptimizationCriteria(criteria) {
        this.optimizationCriteria = criteria;
        // Recalculate current route if exists
        const startSelect = document.getElementById('startLocation');
        const endSelect = document.getElementById('endLocation');
        if (startSelect.value && endSelect.value) {
            this.calculateRoute(startSelect.value, endSelect.value);
        }
    }

    // Get edge weight based on optimization criteria
    getEdgeWeight(start, end, mode) {
        const startCoords = this.locations.get(start);
        const endCoords = this.locations.get(end);
        const distance = this.calculateDistance(
            startCoords.lat, startCoords.lng,
            endCoords.lat, endCoords.lng
        );

        const trafficFactor = this.trafficData.get(`${start}-${end}`) || 1.0;
        const weatherFactor = this.weatherData.get(`${start}-${end}`) || 1.0;

        switch (this.optimizationCriteria) {
            case 'distance':
                return distance;
            case 'time':
                return distance * this.transportModes[mode].speedFactor * trafficFactor;
            case 'cost':
                return distance * this.transportModes[mode].baseCost;
            default:
                return distance;
        }
    }

    // Calculate route with optimization criteria
    calculateRoute(start, end) {
        const distances = new Map();
        const previous = new Map();
        const unvisited = new Set(this.locations.keys());
        
        // Initialize distances
        for (const location of this.locations.keys()) {
            distances.set(location, Infinity);
        }
        distances.set(start, 0);

        while (unvisited.size > 0) {
            let current = null;
            let minDistance = Infinity;

            // Find unvisited node with minimum distance
            for (const location of unvisited) {
                if (distances.get(location) < minDistance) {
                    minDistance = distances.get(location);
                    current = location;
                }
            }

            if (current === null || current === end) break;
            unvisited.delete(current);

            // Update distances to neighbors
            for (const neighbor of this.graph.get(current)) {
                if (!unvisited.has(neighbor)) continue;

                const modes = this.getAvailableTransportModes(current, neighbor);
                let minWeight = Infinity;
                let bestMode = null;

                for (const mode of modes) {
                    const weight = this.getEdgeWeight(current, neighbor, mode);
                    if (weight < minWeight) {
                        minWeight = weight;
                        bestMode = mode;
                    }
                }

                const newDistance = distances.get(current) + minWeight;
                if (newDistance < distances.get(neighbor)) {
                    distances.set(neighbor, newDistance);
                    previous.set(neighbor, { location: current, mode: bestMode });
                }
            }
        }

        // Reconstruct path
        const path = [];
        let current = end;
        while (current !== start) {
            const prev = previous.get(current);
            if (!prev) break;
            path.unshift({
                from: prev.location,
                to: current,
                mode: prev.mode
            });
            current = prev.location;
        }

        this.showRouteDetails(start, end, path);
        this.updateRouteChart(path);
    }

    // Get available transport modes between two locations
    getAvailableTransportModes(start, end) {
        const modes = ['car', 'bus'];
        const distance = this.calculateDistance(
            this.locations.get(start).lat, this.locations.get(start).lng,
            this.locations.get(end).lat, this.locations.get(end).lng
        );

        // Add train for medium distances
        if (distance > 100) {
            modes.push('train');
        }

        // Add plane for long distances
        if (distance > 500) {
            modes.push('plane');
        }

        return modes;
    }
}

// Initialize the application when the window loads
window.onload = function() {
    console.log('Window loaded, initializing TravelPlanner');
    const travelPlanner = new TravelPlanner();
    
    // Make the addConnection function available globally
    window.addConnection = function() {
        travelPlanner.addConnection();
    };
}; 
