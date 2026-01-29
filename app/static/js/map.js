// map.js - Enhanced version
const TrafficMap = (function() {
    // Private variables
    let map = null;
    let mapInitialized = false;
    let userLocation = null;
    let userMarker = null;
    let currentTrafficMarker = null;
    let routeLayer = null;
    let destinationMarker = null;
    let cityMarkers = {}; // Store city markers by ID
    let allCitiesLayer = null; // Layer for all city markers
    let showAllCities = false; // Control whether to show all cities
    
    // Traffic colors
    const trafficColors = {
        0: '#28a745', // Green for low traffic
        1: '#ffc107', // Yellow for medium traffic
        2: '#dc3545'  // Red for high traffic
    };
    
    // Traffic icons with different sizes
    const trafficIcons = {
        small: {
            0: L.divIcon({
                html: `<div style="background:#28a745;width:25px;height:25px;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;">
                    <i class="fas fa-check" style="color:white;font-size:10px;"></i></div>`,
                iconSize: [25, 25],
                iconAnchor: [12.5, 12.5]
            }),
            1: L.divIcon({
                html: `<div style="background:#ffc107;width:30px;height:30px;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;">
                    <i class="fas fa-exclamation" style="color:#856404;font-size:12px;"></i></div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            }),
            2: L.divIcon({
                html: `<div style="background:#dc3545;width:35px;height:35px;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;">
                    <i class="fas fa-exclamation-triangle" style="color:white;font-size:14px;"></i></div>`,
                iconSize: [35, 35],
                iconAnchor: [17.5, 17.5]
            })
        },
        large: {
            0: L.divIcon({
                html: `<div style="background:#28a745;width:45px;height:45px;border-radius:50%;border:3px solid white;box-shadow:0 2px 10px rgba(40,167,69,0.3);display:flex;align-items:center;justify-content:center;">
                    <i class="fas fa-check" style="color:white;font-size:18px;"></i></div>`,
                iconSize: [45, 45],
                iconAnchor: [22.5, 22.5]
            }),
            1: L.divIcon({
                html: `<div style="background:#ffc107;width:50px;height:50px;border-radius:50%;border:3px solid white;box-shadow:0 2px 10px rgba(255,193,7,0.3);display:flex;align-items:center;justify-content:center;">
                    <i class="fas fa-exclamation" style="color:#856404;font-size:20px;"></i></div>`,
                iconSize: [50, 50],
                iconAnchor: [25, 25]
            }),
            2: L.divIcon({
                html: `<div style="background:#dc3545;width:55px;height:55px;border-radius:50%;border:3px solid white;box-shadow:0 2px 15px rgba(220,53,69,0.4);display:flex;align-items:center;justify-content:center;animation:pulse 1.5s infinite;">
                    <i class="fas fa-exclamation-triangle" style="color:white;font-size:22px;"></i></div>`,
                iconSize: [55, 55],
                iconAnchor: [27.5, 27.5]
            })
        }
    };
    
    // Public methods
    return {
        // Initialize map
        init: function() {
            console.log("🌍 Initializing enhanced traffic map...");
            
            if (mapInitialized) {
                console.log("⚠️ Map already initialized");
                return;
            }
            
            const mapContainer = document.getElementById('tunisiaMap');
            if (!mapContainer) {
                console.error("❌ Map container not found");
                return;
            }
            
            // Clear container
            if (mapContainer._leaflet_id) {
                mapContainer.innerHTML = '';
            }
            
            try {
                // Create map
                map = L.map('tunisiaMap', {
                    center: [34.0, 9.0],
                    zoom: 7,
                    zoomControl: true,
                    attributionControl: false
                });
                
                // Add OpenStreetMap tiles
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors',
                    maxZoom: 18,
                    minZoom: 6
                }).addTo(map);
                
                // Add scale
                L.control.scale({ imperial: false }).addTo(map);
                
                // Add custom controls
                this.addCustomControls();
                
                // Add legend (initially hidden)
                this.addLegend();
                
                // Add CSS for animations
                this.addMapStyles();
                
                mapInitialized = true;
                console.log("✅ Enhanced map initialized successfully");
                
            } catch (error) {
                console.error("❌ Error initializing map:", error);
                Utils.showNotification("Error loading map", "error");
            }
        },
        
        // Add custom controls
        addCustomControls: function() {
            if (!map) return;
            
            // Location control
            const locateControl = L.control({ position: 'topleft' });
            locateControl.onAdd = function(map) {
                const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
                div.innerHTML = `
                    <a href="#" title="Locate Me" style="display:block;padding:8px;text-align:center;border-radius:4px;background:white;">
                        <i class="fas fa-location-crosshairs" style="color:#007bff;font-size:16px;"></i>
                    </a>
                `;
                L.DomEvent.on(div, 'click', function(e) {
                    L.DomEvent.stopPropagation(e);
                    L.DomEvent.preventDefault(e);
                    TrafficMap.locateUser();
                });
                return div;
            };
            locateControl.addTo(map);
            
            // Toggle cities control
            const toggleControl = L.control({ position: 'topleft' });
            toggleControl.onAdd = function(map) {
                const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
                div.innerHTML = `
                    <a href="#" title="Show/Hide Cities" style="display:block;padding:8px;text-align:center;border-radius:4px;background:white;">
                        <i class="fas fa-city" style="color:#6c757d;font-size:16px;"></i>
                    </a>
                `;
                L.DomEvent.on(div, 'click', function(e) {
                    L.DomEvent.stopPropagation(e);
                    L.DomEvent.preventDefault(e);
                    TrafficMap.toggleAllCities();
                });
                return div;
            };
            toggleControl.addTo(map);
        },
        
        // Add legend
        addLegend: function() {
            if (!map) return;
            
            const legend = L.control({ position: 'bottomright' });
            legend.onAdd = function(map) {
                const div = L.DomUtil.create('div', 'info legend map-legend');
                div.style.cssText = 'background:white;padding:10px;border-radius:5px;box-shadow:0 2px 5px rgba(0,0,0,0.2);font-size:12px;';
                div.innerHTML = `
                    <div style="font-weight:bold;margin-bottom:5px;color:#2c3e50;">
                        <i class="fas fa-key"></i> Traffic Levels
                    </div>
                    <div style="display:flex;flex-direction:column;gap:3px;">
                        <div style="display:flex;align-items:center;gap:5px;">
                            <div style="width:12px;height:12px;border-radius:50%;background:#28a745;border:1px solid white;"></div>
                            <span>Low Traffic</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:5px;">
                            <div style="width:12px;height:12px;border-radius:50%;background:#ffc107;border:1px solid white;"></div>
                            <span>Medium Traffic</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:5px;">
                            <div style="width:12px;height:12px;border-radius:50%;background:#dc3545;border:1px solid white;"></div>
                            <span>High Traffic</span>
                        </div>
                    </div>
                `;
                return div;
            };
            legend.addTo(map);
        },
        
        // Add CSS styles
        addMapStyles: function() {
            const style = document.createElement('style');
            style.textContent = `
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.1); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .city-marker { cursor: pointer; }
                .selected-city-marker { z-index: 1000 !important; }
            `;
            document.head.appendChild(style);
        },
        
        // Toggle all cities visibility
        toggleAllCities: function() {
            showAllCities = !showAllCities;
            
            if (showAllCities) {
                this.showAllCitiesOnMap();
                Utils.showNotification('Showing all Tunisian cities', 'info');
            } else {
                this.hideAllCities();
                Utils.showNotification('Hiding all cities', 'info');
            }
        },
        
        // Show all cities on map
        showAllCitiesOnMap: async function() {
            if (!map) return;
            
            // Hide previous layer
            this.hideAllCities();
            
            const cities = window.appData?.cities || {};
            const markers = [];
            
            for (const [cityId, city] of Object.entries(cities)) {
                // Get traffic data for this city
                try {
                    const response = await fetch(`/api/traffic-for-city/${cityId}`);
                    const data = await response.json();
                    
                    if (data.success) {
                        const trafficLevel = data.traffic.level;
                        const marker = L.marker([city.lat, city.lng], {
                            icon: trafficIcons.small[trafficLevel],
                            title: city.name
                        }).addTo(map);
                        
                        marker.bindPopup(`
                            <div style="min-width:200px;">
                                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                                    <div style="width:12px;height:12px;border-radius:50%;background:${data.traffic.color}"></div>
                                    <strong style="color:#2c3e50;">${city.name}</strong>
                                </div>
                                <div style="font-size:12px;color:#6c757d;">
                                    <div><i class="fas fa-traffic-light"></i> ${data.traffic.level_text}</div>
                                    <div><i class="fas fa-tachometer-alt"></i> ${data.traffic.speed}</div>
                                    <div><i class="fas fa-clock"></i> ${data.traffic.congestion}</div>
                                    <div><i class="fas fa-landmark"></i> ${city.governorate || 'Unknown'}</div>
                                </div>
                            </div>
                        `);
                        
                        markers.push(marker);
                        cityMarkers[cityId] = marker;
                    }
                } catch (error) {
                    console.error(`Error fetching traffic for city ${cityId}:`, error);
                }
            }
            
            // Create layer group
            allCitiesLayer = L.layerGroup(markers).addTo(map);
        },
        
        // Hide all cities
        hideAllCities: function() {
            if (allCitiesLayer) {
                map.removeLayer(allCitiesLayer);
                allCitiesLayer = null;
            }
            
            // Clear city markers cache
            cityMarkers = {};
        },
        
        // Show traffic for specific city (when selected)
        showCityTraffic: async function(cityId) {
            if (!map) return;
            
            // Clear previous selected city marker
            if (currentTrafficMarker) {
                map.removeLayer(currentTrafficMarker);
                currentTrafficMarker = null;
            }
            
            const city = window.appData?.cities?.[cityId];
            if (!city) {
                Utils.showNotification('City not found', 'error');
                return;
            }
            
            try {
                // Fetch traffic data for this city
                const response = await fetch(`/api/traffic-for-city/${cityId}`);
                const data = await response.json();
                
                if (data.success) {
                    const trafficLevel = data.traffic.level;
                    
                    // Create large marker for selected city
                    currentTrafficMarker = L.marker([city.lat, city.lng], {
                        icon: trafficIcons.large[trafficLevel],
                        title: `${city.name} - ${data.traffic.level_text} Traffic`,
                        className: 'selected-city-marker'
                    }).addTo(map);
                    
                    // Add detailed popup
                    currentTrafficMarker.bindPopup(`
                        <div style="min-width:250px;">
                            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #e9ecef;">
                                <div style="width:16px;height:16px;border-radius:50%;background:${data.traffic.color};border:2px solid white;"></div>
                                <strong style="color:#2c3e50;font-size:16px;">${city.name}</strong>
                                <span style="margin-left:auto;padding:3px 8px;border-radius:12px;background:${data.traffic.color};color:white;font-size:11px;font-weight:bold;">
                                    ${data.traffic.level_text}
                                </span>
                            </div>
                            <div style="font-size:13px;color:#495057;">
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
                                    <div>
                                        <div style="font-size:11px;color:#6c757d;">Governorate</div>
                                        <div><i class="fas fa-landmark"></i> ${city.governorate || 'Unknown'}</div>
                                    </div>
                                    <div>
                                        <div style="font-size:11px;color:#6c757d;">Population</div>
                                        <div><i class="fas fa-users"></i> ${city.population ? city.population.toLocaleString() : 'N/A'}</div>
                                    </div>
                                </div>
                                <div style="background:#f8f9fa;padding:10px;border-radius:5px;margin-bottom:12px;">
                                    <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
                                        <span><i class="fas fa-tachometer-alt"></i> Average Speed:</span>
                                        <strong style="color:${data.traffic.color}">${data.traffic.speed}</strong>
                                    </div>
                                    <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
                                        <span><i class="fas fa-clock"></i> Current Condition:</span>
                                        <strong>${data.traffic.congestion}</strong>
                                    </div>
                                    <div style="display:flex;justify-content:space-between;">
                                        <span><i class="fas fa-hourglass-half"></i> Extra Time:</span>
                                        <strong>${data.traffic.extra_time}</strong>
                                    </div>
                                </div>
                                <div style="font-size:11px;color:#adb5bd;text-align:center;">
                                    <i class="far fa-clock"></i> Updated: ${new Date().toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    `).openPopup();
                    
                    // Center map on the selected city
                    map.setView([city.lat, city.lng], 12);
                    
                    return data;
                } else {
                    Utils.showNotification(`Could not get traffic data: ${data.error}`, 'error');
                    return null;
                }
                
            } catch (error) {
                console.error('Error showing city traffic:', error);
                Utils.showNotification('Failed to load traffic data', 'error');
                return null;
            }
        },
        
        // Locate user
        locateUser: function() {
            console.log("📍 Locating user...");
            
            if (!navigator.geolocation) {
                Utils.showNotification('Geolocation not supported', 'error');
                return;
            }
            
            Utils.showLoading('Detecting your location...');
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    };
                    
                    console.log("✅ Location found:", userLocation);
                    
                    this.updateUserLocationMarker();
                    Utils.showNotification('Location detected successfully!', 'success');
                    
                    // Enable ETA button
                    const etaBtn = document.getElementById('calculateETA');
                    if (etaBtn) {
                        etaBtn.disabled = false;
                        etaBtn.innerHTML = '<i class="fas fa-route"></i> Calculate ETA';
                    }
                    
                    Utils.hideLoading();
                },
                (error) => {
                    console.error("❌ Geolocation error:", error);
                    
                    let message = 'Could not detect location. ';
                    if (error.code === error.PERMISSION_DENIED) {
                        message += 'Please enable location permissions.';
                    } else {
                        message += 'Using Tunis as default.';
                        userLocation = { lat: 36.8065, lng: 10.1815 };
                        this.updateUserLocationMarker();
                    }
                    
                    Utils.showNotification(message, 'warning');
                    Utils.hideLoading();
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        },
        
        // Update user location marker
        updateUserLocationMarker: function() {
            if (!userLocation || !map) return;
            
            // Remove old marker
            if (userMarker) {
                map.removeLayer(userMarker);
            }
            
            // Create user icon
            const userIcon = L.divIcon({
                html: `
                    <div style="
                        background-color: #007bff;
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        border: 3px solid white;
                        box-shadow: 0 2px 10px rgba(0,123,255,0.3);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">
                        <i class="fas fa-user" style="color: white; font-size: 16px;"></i>
                    </div>
                `,
                iconSize: [40, 40],
                iconAnchor: [20, 40],
                className: 'user-marker'
            });
            
            // Add marker to map
            userMarker = L.marker([userLocation.lat, userLocation.lng], {
                icon: userIcon,
                title: 'Your Location'
            }).addTo(map);
            
            userMarker.bindPopup(`
                <div style="min-width:200px;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                        <i class="fas fa-user-circle" style="color:#007bff;font-size:16px;"></i>
                        <strong style="color:#2c3e50;">Your Location</strong>
                    </div>
                    <div style="font-size:12px;color:#6c757d;">
                        <div><i class="fas fa-map-pin"></i> Lat: ${userLocation.lat.toFixed(6)}</div>
                        <div><i class="fas fa-map-pin"></i> Lng: ${userLocation.lng.toFixed(6)}</div>
                        ${userLocation.accuracy ? `<div><i class="fas fa-crosshairs"></i> Accuracy: ±${Math.round(userLocation.accuracy)}m</div>` : ''}
                        <div><i class="far fa-clock"></i> ${new Date().toLocaleTimeString()}</div>
                    </div>
                </div>
            `);
            
            // Zoom to location
            map.setView([userLocation.lat, userLocation.lng], 13);
        },
        
        // Calculate ETA
        calculateETA: async function(cityId) {
            if (!userLocation) {
                Utils.showNotification('Please detect your location first', 'warning');
                return null;
            }
            
            const city = window.appData?.cities?.[cityId];
            if (!city) {
                Utils.showNotification('City not found', 'error');
                return null;
            }
            
            Utils.showLoading('Calculating route with traffic conditions...');
            
            try {
                const hour = parseInt(document.getElementById('hour').value) || new Date().getHours();
                const day = parseInt(document.getElementById('day').value) || new Date().getDay();
                const dayIndex = day === 0 ? 6 : day - 1;
                const weather = parseInt(document.getElementById('weather').value) || 0;
                
                const response = await fetch('/api/calculate-eta', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        origin: userLocation,
                        city_id: parseInt(cityId),
                        hour: hour,
                        day: dayIndex,
                        weather: weather
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Draw route on map
                    this.drawRoute(data.route, data.city);
                    
                    Utils.showNotification(`ETA: ${data.eta.total_travel_time}`, 'success');
                    return data;
                } else {
                    Utils.showNotification(`ETA calculation failed: ${data.error}`, 'error');
                    return null;
                }
                
            } catch (error) {
                console.error('ETA calculation error:', error);
                Utils.showNotification('Failed to calculate ETA', 'error');
                return null;
            } finally {
                Utils.hideLoading();
            }
        },
        
        // Draw route on map
        drawRoute: function(routeData, city) {
            if (!map) return;
            
            // Clear previous route
            this.clearRoute();
            
            // Draw route line if coordinates available
            if (routeData.coordinates && routeData.coordinates.length > 0) {
                routeLayer = L.polyline(routeData.coordinates, {
                    color: '#007bff',
                    weight: 5,
                    opacity: 0.7,
                    lineCap: 'round'
                }).addTo(map);
                
                // Add destination marker
                destinationMarker = L.marker([city.lat, city.lng], {
                    icon: L.divIcon({
                        html: `
                            <div style="
                                background-color: #6f42c1;
                                width: 40px;
                                height: 40px;
                                border-radius: 50%;
                                border: 3px solid white;
                                box-shadow: 0 2px 10px rgba(111,66,193,0.3);
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            ">
                                <i class="fas fa-flag-checkered" style="color: white; font-size: 16px;"></i>
                            </div>
                        `,
                        iconSize: [40, 40],
                        iconAnchor: [20, 40]
                    }),
                    title: `Destination: ${city.name}`
                }).addTo(map);
                
                destinationMarker.bindPopup(`
                    <div style="min-width:200px;">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                            <i class="fas fa-flag-checkered" style="color:#6f42c1;font-size:16px;"></i>
                            <strong style="color:#2c3e50;">Destination</strong>
                        </div>
                        <div style="font-size:12px;color:#6c757d;">
                            <div><strong>${city.name}</strong></div>
                            <div>${city.governorate || 'Unknown'} Governorate</div>
                            <div style="margin-top:8px;padding-top:8px;border-top:1px solid #e9ecef;">
                                <div><i class="fas fa-road"></i> Distance: ${routeData.distance?.text || 'Calculating...'}</div>
                                <div><i class="fas fa-clock"></i> Travel Time: ${routeData.adjusted_duration?.text || 'Calculating...'}</div>
                            </div>
                        </div>
                    </div>
                `);
                
                // Fit bounds to show entire route
                const bounds = L.latLngBounds(routeData.coordinates);
                if (userMarker) bounds.extend(userMarker.getLatLng());
                map.fitBounds(bounds.pad(0.1));
            }
        },
        
        // Clear route
        clearRoute: function() {
            if (routeLayer) {
                map.removeLayer(routeLayer);
                routeLayer = null;
            }
            if (destinationMarker) {
                map.removeLayer(destinationMarker);
                destinationMarker = null;
            }
        },
        
        // Zoom to Tunisia
        zoomToTunisia: function() {
            if (map) {
                map.setView([34.0, 9.0], 7);
                Utils.showNotification('Map view reset to Tunisia', 'info');
            }
        },
        
        // Get user location
        getUserLocation: function() {
            return userLocation;
        },
        
        // Get traffic for city (public method)
        getCityTraffic: function(cityId) {
            return this.showCityTraffic(cityId);
        }
    };
})();

window.TrafficMap = TrafficMap;