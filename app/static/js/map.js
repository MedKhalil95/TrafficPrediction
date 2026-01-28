// map.js - Map functionality for Tunisian Traffic Prediction System

// Map module
const TrafficMap = (function() {
    // Private variables
    let map = null;
    let mapInitialized = false;
    let userLocation = null;
    let userMarker = null;
    let userIcon = null; // native Leaflet icon for user location
    let currentTrafficMarker = null;
    let cityMarkers = [];
    
    // Tunisian cities data
    const tunisiaCities = {
        0: { name: "Tunis", lat: 36.8065, lng: 10.1815, zoom: 12 },
        1: { name: "Ariana", lat: 36.8625, lng: 10.1956, zoom: 12 },
        2: { name: "Sfax", lat: 34.7406, lng: 10.7603, zoom: 12 },
        3: { name: "Sousse", lat: 35.8254, lng: 10.6360, zoom: 12 }
    };
    
    // Traffic colors
    const trafficColors = {
        0: '#28a745', // Green for low traffic
        1: '#ffc107', // Yellow for medium traffic
        2: '#dc3545'  // Red for high traffic
    };
    
    // Public methods
    return {
        // Initialize map
        init: function() {
            console.log("🌍 Initializing map...");
            
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
                
                // Add tiles
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors',
                    maxZoom: 18,
                    minZoom: 6
                }).addTo(map);
                
                // Add scale
                L.control.scale({ imperial: false }).addTo(map);
                
                // Create native Leaflet icon for user location (uses an SVG placed in static/img)
                // Served by Flask at /static/...
                userIcon = L.icon({
                    iconUrl: '/static/img/user-location.svg',
                    iconSize: [40, 40],
                    iconAnchor: [20, 40],
                    popupAnchor: [0, -42],
                    className: 'user-location-marker'
                });
                
                // Add location control
                this.addLocationControl();
                
                // Add legend
                this.addLegend();
                
                mapInitialized = true;
                console.log("✅ Map initialized successfully");
                
            } catch (error) {
                console.error("❌ Error initializing map:", error);
                Utils.showNotification("Error loading map. Please refresh the page.", "error");
            }
        },
        
        // Add location control
        addLocationControl: function() {
            if (!map) return;
            
            const locateControl = L.control({ position: 'topleft' });
            
            locateControl.onAdd = function(map) {
                const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
                div.innerHTML = `
                    <a href="#" title="Locate me" style="display: block; padding: 8px; text-align: center;">
                        <i class="fas fa-location-crosshairs" style="color: #007bff; font-size: 16px;"></i>
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
        },
        
        // Add legend
        addLegend: function() {
            if (!map) return;
            
            const legend = L.control({ position: 'bottomright' });
            
            legend.onAdd = function(map) {
                const div = L.DomUtil.create('div', 'info legend map-legend');
                div.innerHTML = `
                    <div class="legend-title">Traffic Legend</div>
                    <div class="legend-items">
                        <div class="legend-item">
                            <span class="legend-color" style="background: #28a745;"></span>
                            <span>Low Traffic</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-color" style="background: #ffc107;"></span>
                            <span>Medium Traffic</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-color" style="background: #dc3545;"></span>
                            <span>High Traffic</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-color" style="background: #007bff;"></span>
                            <span>Your Location</span>
                        </div>
                    </div>
                `;
                return div;
            };
            
            legend.addTo(map);
        },
        
        // Locate user
        locateUser: function() {
            console.log("📍 Locating user...");
            
            if (typeof App.updateLocationStatus === 'function') {
                App.updateLocationStatus('Detecting your location...', 'info');
            }
            
            if (!navigator.geolocation) {
                if (typeof App.updateLocationStatus === 'function') {
                    App.updateLocationStatus('Geolocation not supported by browser', 'error');
                }
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                // Success callback
                (position) => {
                    userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    };
                    
                    console.log("✅ Location found:", userLocation);
                    
                    if (typeof App.updateLocationStatus === 'function') {
                        App.updateLocationStatus('Location detected successfully', 'success');
                    }
                    
                    this.zoomToUserLocation();
                    this.findNearestCity();
                },
                // Error callback
                (error) => {
                    console.error("❌ Geolocation error:", error);
                    let message = 'Location detection failed. ';
                    
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            message += 'Please enable location permissions.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            message += 'Location information unavailable.';
                            break;
                        case error.TIMEOUT:
                            message += 'Location request timed out.';
                            break;
                        default:
                            message += 'Unknown error.';
                    }
                    
                    if (typeof App.updateLocationStatus === 'function') {
                        App.updateLocationStatus(message, 'error');
                    }
                    
                    // Default to Tunis
                    userLocation = { lat: 36.8065, lng: 10.1815 };
                    this.zoomToUserLocation();
                },
                // Options
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        },
        
        // Zoom to user location
        zoomToUserLocation: function() {
            if (!userLocation || !map) return;
            
            // Remove old marker
            if (userMarker) {
                map.removeLayer(userMarker);
            }
            
            // Use native Leaflet icon (userIcon) for sharper rendering
            userMarker = L.marker([userLocation.lat, userLocation.lng], {
                icon: userIcon || undefined
            }).addTo(map);
            
            // Add popup
            userMarker.bindPopup(`
                <div style="padding: 12px; min-width: 200px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <i class="fas fa-location-dot" style="color: #007bff; font-size: 16px;"></i>
                        <strong style="color: #2c3e50;">Your Location</strong>
                    </div>
                    <div style="font-size: 12px; color: #6c757d;">
                        <div>Latitude: ${userLocation.lat.toFixed(6)}</div>
                        <div>Longitude: ${userLocation.lng.toFixed(6)}</div>
                        ${userLocation.accuracy ? `<div>Accuracy: ±${Math.round(userLocation.accuracy)} meters</div>` : ''}
                    </div>
                </div>
            `).openPopup();
            
            // Zoom to location
            const zoomLevel = userLocation.accuracy > 1000 ? 11 : 14;
            map.setView([userLocation.lat, userLocation.lng], zoomLevel);
        },
        
        // Find nearest Tunisian city
        findNearestCity: function() {
            if (!userLocation) return null;
            
            let nearestCity = null;
            let minDistance = Infinity;
            
            Object.entries(tunisiaCities).forEach(([id, city]) => {
                const distance = this.calculateDistance(userLocation.lat, userLocation.lng, city.lat, city.lng);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestCity = { id: parseInt(id), ...city };
                }
            });
            
            if (nearestCity) {
                console.log(`📍 Nearest city: ${nearestCity.name} (${minDistance.toFixed(1)} km)`);
                return nearestCity;
            }
            
            return null;
        },
        
        // Calculate distance between coordinates
        calculateDistance: function(lat1, lon1, lat2, lon2) {
            const R = 6371; // Earth radius in km
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                      Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c;
        },
        
        // Update traffic marker on map
        updateTrafficMarker: function(cityId, trafficLevel) {
            if (!map) return;
            
            const city = tunisiaCities[cityId];
            if (!city) return;
            
            // Remove old marker
            if (currentTrafficMarker) {
                map.removeLayer(currentTrafficMarker);
            }
            
            // Create traffic prediction marker
            const trafficIcons = {
                0: L.divIcon({
                    html: `
                        <div style="
                            background-color: #28a745;
                            width: 30px;
                            height: 30px;
                            border-radius: 50%;
                            border: 3px solid white;
                            box-shadow: 0 0 10px rgba(40,167,69,0.5);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        ">
                            <i class="fas fa-check" style="color: white; font-size: 12px;"></i>
                        </div>
                    `,
                    iconSize: [30, 30],
                    iconAnchor: [15, 15],
                    className: 'traffic-marker'
                }),
                1: L.divIcon({
                    html: `
                        <div style="
                            background-color: #ffc107;
                            width: 35px;
                            height: 35px;
                            border-radius: 50%;
                            border: 3px solid white;
                            box-shadow: 0 0 10px rgba(255,193,7,0.5);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        ">
                            <i class="fas fa-exclamation" style="color: #856404; font-size: 14px;"></i>
                        </div>
                    `,
                    iconSize: [35, 35],
                    iconAnchor: [17.5, 17.5],
                    className: 'traffic-marker'
                }),
                2: L.divIcon({
                    html: `
                        <div style="
                            background-color: #dc3545;
                            width: 40px;
                            height: 40px;
                            border-radius: 50%;
                            border: 3px solid white;
                            box-shadow: 0 0 15px rgba(220,53,69,0.6);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            animation: pulse 2s infinite;
                        ">
                            <i class="fas fa-exclamation-triangle" style="color: white; font-size: 16px;"></i>
                        </div>
                    `,
                    iconSize: [40, 40],
                    iconAnchor: [20, 20],
                    className: 'traffic-marker traffic-high'
                })
            };
            
            currentTrafficMarker = L.marker([city.lat, city.lng], {
                icon: trafficIcons[trafficLevel] || trafficIcons[0]
            }).addTo(map);
            
            // Add popup
            const trafficLabels = { 0: 'Low', 1: 'Medium', 2: 'High' };
            const trafficMessages = {
                0: 'Traffic is flowing smoothly',
                1: 'Moderate traffic expected',
                2: 'Heavy traffic detected'
            };
            
            currentTrafficMarker.bindPopup(`
                <div style="padding: 15px; min-width: 220px;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                        <div style="
                            background: ${trafficColors[trafficLevel]};
                            width: 20px;
                            height: 20px;
                            border-radius: 50%;
                            border: 2px solid white;
                            box-shadow: 0 0 5px ${trafficColors[trafficLevel]};
                        "></div>
                        <strong style="color: #2c3e50; font-size: 16px;">${city.name} Traffic</strong>
                    </div>
                    <div style="margin-bottom: 10px;">
                        <div style="font-weight: 600; color: ${trafficColors[trafficLevel]};">
                            ${trafficLabels[trafficLevel] || 'Unknown'} Traffic
                        </div>
                        <div style="font-size: 13px; color: #6c757d;">
                            ${trafficMessages[trafficLevel] || 'No traffic data available'}
                        </div>
                    </div>
                    <div style="font-size: 12px; color: #adb5bd; border-top: 1px solid #e9ecef; padding-top: 8px;">
                        <i class="far fa-clock"></i> Updated: ${new Date().toLocaleTimeString()}
                    </div>
                </div>
            `).openPopup();
            
            // Center map on the predicted city
            map.setView([city.lat, city.lng], city.zoom || 12);
        },
        
        // Zoom to Tunisia view
        zoomToTunisia: function() {
            if (map) {
                map.setView([34.0, 9.0], 7);
                Utils.showNotification('Map view reset to Tunisia', 'info');
            }
        },
        
        // Get city data
        getCityData: function(cityId) {
            return tunisiaCities[cityId];
        },
        
        // Get all cities
        getAllCities: function() {
            return tunisiaCities;
        },
        
        // Get traffic colors
        getTrafficColors: function() {
            return trafficColors;
        },
        
        // Check if map is initialized
        isInitialized: function() {
            return mapInitialized;
        }
    };
})();

// Make map functions globally available
window.TrafficMap = TrafficMap;