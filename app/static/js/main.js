// main.js - Enhanced version
const App = (function() {
    // Private variables
    let currentCityId = null;
    let currentCityData = null;
    let currentTrafficData = null;
    
    // Public methods
    return {
        // Initialize application
        init: function() {
            console.log("🚀 Initializing enhanced traffic system...");
            
            // Get data from window object
            window.appData = window.appData || {
                cities: {},
                governorates: {}
            };
            
            // Initialize components
            this.initClock();
            this.initForm();
            this.initEventListeners();
            
            // Initialize map after delay
            setTimeout(() => {
                if (typeof TrafficMap !== 'undefined') {
                    TrafficMap.init();
                }
                
                console.log("✅ Application initialized successfully");
            }, 500);
        },
        
        // Initialize real-time clock
        initClock: function() {
            const updateClock = () => {
                const now = new Date();
                const timeString = now.toLocaleTimeString('en-TN', {
                    hour12: false,
                    timeZone: 'Africa/Tunis'
                });
                const dateString = now.toLocaleDateString('en-TN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    timeZone: 'Africa/Tunis'
                });
                
                const clockElement = document.getElementById('realTimeClock');
                if (clockElement) {
                    clockElement.innerHTML = `
                        <div class="clock-time">${timeString}</div>
                        <div class="clock-date">${dateString}</div>
                    `;
                }
                
                // Update footer
                const footerTime = document.getElementById('footerTime');
                if (footerTime) {
                    const shortDate = now.toLocaleDateString('en-TN', { 
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        timeZone: 'Africa/Tunis'
                    });
                    footerTime.textContent = `${shortDate} ${timeString}`;
                }
            };
            
            updateClock();
            setInterval(updateClock, 1000);
        },
        
        // Initialize form
        initForm: function() {
            this.updateFormWithCurrentTime();
        },
        
        // Initialize event listeners
        initEventListeners: function() {
            // Hour slider
            const hourSlider = document.getElementById('hour');
            if (hourSlider) {
                hourSlider.addEventListener('input', (e) => {
                    this.updateHourDisplay(e.target.value);
                });
                this.updateHourDisplay(hourSlider.value);
            }
            
            // City select - with debouncing
            const citySelect = document.getElementById('city');
            if (citySelect) {
                citySelect.addEventListener('change', (e) => {
                    const cityId = e.target.value;
                    if (cityId) {
                        this.handleCitySelection(cityId);
                    } else {
                        this.clearCitySelection();
                    }
                });
            }
            
            // Predict button
            const predictBtn = document.getElementById('predictBtn');
            if (predictBtn) {
                predictBtn.addEventListener('click', () => {
                    this.predictTraffic();
                });
            }
            
            // Quick predict button
            const quickPredictBtn = document.getElementById('quickPredictBtn');
            if (quickPredictBtn) {
                quickPredictBtn.addEventListener('click', () => {
                    this.quickPredict();
                });
            }
            
            // Locate button
            const locateBtn = document.getElementById('locateBtn');
            if (locateBtn) {
                locateBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.locateUser();
                });
            }
            
            // Calculate ETA button
            const etaBtn = document.getElementById('calculateETA');
            if (etaBtn) {
                etaBtn.addEventListener('click', () => {
                    this.calculateETA();
                });
            }
        },
        
        // Update hour display
        updateHourDisplay: function(hourValue) {
            const hourSlider = document.getElementById('hour');
            const hourDisplay = document.getElementById('hourDisplay');
            
            if (!hourSlider || !hourDisplay) return;
            
            const hour = parseInt(hourValue || hourSlider.value);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour % 12 || 12;
            
            // Get appropriate emoji
            let emoji = '🌙';
            if (hour >= 5 && hour < 12) emoji = '🌅';
            else if (hour >= 12 && hour < 17) emoji = '☀️';
            else if (hour >= 17 && hour < 20) emoji = '🌇';
            
            hourDisplay.innerHTML = `${emoji} ${displayHour}:00 ${ampm}`;
            
            // Color coding for rush hours
            if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19)) {
                hourDisplay.style.color = '#dc3545';
                hourDisplay.style.fontWeight = 'bold';
            } else {
                hourDisplay.style.color = '#28a745';
                hourDisplay.style.fontWeight = 'normal';
            }
        },
        
        // Update form with current time
        updateFormWithCurrentTime: function() {
            const now = new Date();
            const currentHour = now.getHours();
            const currentDay = now.getDay(); // 0=Sunday, 6=Saturday
            
            // Convert to our system (0=Monday, 6=Sunday)
            const systemDay = currentDay === 0 ? 6 : currentDay - 1;
            
            // Update hour slider
            const hourSlider = document.getElementById('hour');
            if (hourSlider) {
                hourSlider.value = currentHour;
                this.updateHourDisplay(currentHour);
            }
            
            // Update day selector
            const daySelector = document.getElementById('day');
            if (daySelector) {
                daySelector.value = systemDay;
            }
        },
        
        // Handle city selection
        handleCitySelection: async function(cityId) {
            currentCityId = cityId;
            const city = window.appData?.cities?.[cityId];
            
            if (!city) {
                this.clearCitySelection();
                return;
            }
            
            currentCityData = city;
            
            // Show loading for city data
            Utils.showLoading('Loading city traffic data...');
            
            try {
                // Show city on map with traffic data
                if (typeof TrafficMap !== 'undefined' && TrafficMap.getCityTraffic) {
                    const trafficData = await TrafficMap.getCityTraffic(cityId);
                    
                    if (trafficData) {
                        currentTrafficData = trafficData;
                        this.updateCityInfoDisplay(city, trafficData);
                        Utils.showNotification(`${city.name} traffic data loaded`, 'success');
                    }
                } else {
                    // Fallback: just show basic city info
                    this.updateCityInfoDisplay(city, null);
                }
                
                // Enable ETA button if location available
                const etaBtn = document.getElementById('calculateETA');
                if (etaBtn) {
                    if (TrafficMap.getUserLocation && TrafficMap.getUserLocation()) {
                        etaBtn.disabled = false;
                    } else {
                        etaBtn.disabled = true;
                        etaBtn.title = 'Please detect your location first';
                    }
                }
                
            } catch (error) {
                console.error('Error loading city data:', error);
                this.updateCityInfoDisplay(city, null);
                Utils.showNotification('Could not load detailed traffic data', 'warning');
            } finally {
                Utils.hideLoading();
            }
        },
        
        // Clear city selection
        clearCitySelection: function() {
            currentCityId = null;
            currentCityData = null;
            currentTrafficData = null;
            
            // Hide city info card
            const selectedCityInfo = document.getElementById('selectedCityInfo');
            if (selectedCityInfo) {
                selectedCityInfo.style.display = 'none';
            }
            
            // Clear traffic level
            const trafficLevel = document.getElementById('trafficLevel');
            if (trafficLevel) {
                trafficLevel.textContent = '-';
                trafficLevel.className = 'traffic-level';
            }
            
            // Reset traffic message
            const trafficMessage = document.getElementById('trafficMessage');
            if (trafficMessage) {
                trafficMessage.textContent = 'Select a city to see traffic information';
                trafficMessage.style.color = '';
            }
            
            // Hide ETA display
            const etaDisplay = document.getElementById('etaDisplay');
            if (etaDisplay) {
                etaDisplay.innerHTML = '';
            }
            
            // Disable ETA button
            const etaBtn = document.getElementById('calculateETA');
            if (etaBtn) {
                etaBtn.disabled = true;
            }
            
            // Clear map markers (if TrafficMap available)
            if (typeof TrafficMap !== 'undefined') {
                // Clear selected city marker
                // Note: We don't clear all cities here, just the selected one
            }
        },
        
        // Update city info display
        updateCityInfoDisplay: function(city, trafficData) {
            // Show city info card
            const selectedCityInfo = document.getElementById('selectedCityInfo');
            if (selectedCityInfo) {
                selectedCityInfo.style.display = 'block';
                
                // Update city details
                const cityDetails = document.getElementById('cityDetails');
                if (cityDetails) {
                    let trafficInfo = '';
                    if (trafficData && trafficData.traffic) {
                        const traffic = trafficData.traffic;
                        trafficInfo = `
                            <div style="margin-top:10px;padding:10px;background:${traffic.color}10;border-radius:5px;border-left:4px solid ${traffic.color};">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
                                    <strong style="color:${traffic.color};">${traffic.level_text} Traffic</strong>
                                    <span style="font-size:12px;">${traffic.speed}</span>
                                </div>
                                <div style="font-size:12px;color:#666;">
                                    <div>Condition: ${traffic.congestion}</div>
                                    <div>Extra Time: ${traffic.extra_time}</div>
                                </div>
                            </div>
                        `;
                    }
                    
                    cityDetails.innerHTML = `
                        <div class="city-card">
                            <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:10px;">
                                <h5 style="margin:0;">${city.name}</h5>
                                <span style="font-size:12px;color:#6c757d;background:#f8f9fa;padding:2px 8px;border-radius:10px;">
                                    ${city.governorate || 'Unknown'}
                                </span>
                            </div>
                            <div class="city-info-grid">
                                <div>
                                    <i class="fas fa-users"></i>
                                    <span>Population:</span>
                                </div>
                                <div>${city.population ? city.population.toLocaleString() : 'N/A'}</div>
                                
                                <div>
                                    <i class="fas fa-map-pin"></i>
                                    <span>Coordinates:</span>
                                </div>
                                <div>${city.lat.toFixed(4)}, ${city.lng.toFixed(4)}</div>
                            </div>
                            ${trafficInfo}
                        </div>
                    `;
                }
            }
            
            // Update traffic level badge
            const trafficLevel = document.getElementById('trafficLevel');
            if (trafficLevel && trafficData && trafficData.traffic) {
                const traffic = trafficData.traffic;
                trafficLevel.textContent = traffic.level_text;
                trafficLevel.className = `traffic-level traffic-${traffic.level_text.toLowerCase()}`;
                trafficLevel.innerHTML = `
                    <i class="fas fa-traffic-light"></i> ${traffic.level_text}
                `;
            }
            
            // Update traffic message
            const trafficMessage = document.getElementById('trafficMessage');
            if (trafficMessage && trafficData && trafficData.traffic) {
                const traffic = trafficData.traffic;
                trafficMessage.innerHTML = `
                    <i class="fas fa-info-circle"></i> Current traffic in ${city.name}: 
                    <strong style="color:${traffic.color}">${traffic.level_text}</strong> - 
                    Average speed: ${traffic.speed}
                `;
            }
        },
        
        // Predict traffic
        predictTraffic: async function() {
            if (!currentCityId) {
                Utils.showNotification('Please select a city first', 'warning');
                return;
            }
            
            const hour = parseInt(document.getElementById('hour').value);
            const day = parseInt(document.getElementById('day').value);
            const weather = parseInt(document.getElementById('weather').value);
            
            Utils.showLoading('Predicting traffic patterns...');
            
            try {
                const response = await fetch('/api/traffic-prediction', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ hour, day, city: currentCityId, weather })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    this.updatePredictionResults(data);
                    Utils.showNotification('Traffic prediction updated!', 'success');
                } else {
                    Utils.showNotification(`Prediction failed: ${data.error}`, 'error');
                }
            } catch (error) {
                console.error('Prediction error:', error);
                Utils.showNotification('Failed to get prediction', 'error');
            } finally {
                Utils.hideLoading();
            }
        },
        
        // Update prediction results
        updatePredictionResults: function(data) {
            // Update traffic level
            const trafficLevel = document.getElementById('trafficLevel');
            if (trafficLevel && data.traffic_level) {
                trafficLevel.textContent = data.traffic_level.level;
                trafficLevel.className = `traffic-level traffic-${data.traffic_level.level.toLowerCase()}`;
                trafficLevel.innerHTML = `${data.traffic_level.emoji} ${data.traffic_level.level}`;
            }
            
            // Update traffic message
            const trafficMessage = document.getElementById('trafficMessage');
            if (trafficMessage && data.traffic_level) {
                const cityName = data.city?.name || 'Selected City';
                trafficMessage.innerHTML = `
                    <i class="fas fa-prediction"></i> Predicted traffic for ${hour}:00 - 
                    <strong style="color:${data.traffic_level.color}">${data.traffic_level.level}</strong> conditions
                `;
            }
            
            // Show recommendations if available
            if (data.recommendations && data.recommendations.length > 0) {
                const recommendationsSection = document.getElementById('recommendationsSection');
                const recommendationsList = document.getElementById('recommendationsList');
                
                if (recommendationsSection && recommendationsList) {
                    recommendationsSection.style.display = 'block';
                    recommendationsList.innerHTML = '';
                    
                    data.recommendations.forEach(rec => {
                        const li = document.createElement('li');
                        li.innerHTML = rec;
                        recommendationsList.appendChild(li);
                    });
                }
            }
        },
        
        // Quick predict
        quickPredict: function() {
            this.updateFormWithCurrentTime();
            setTimeout(() => this.predictTraffic(), 100);
        },
        
        // Locate user
        locateUser: function() {
            if (typeof TrafficMap !== 'undefined') {
                TrafficMap.locateUser();
            }
        },
        
        // Calculate ETA
        calculateETA: async function() {
            if (!currentCityId) {
                Utils.showNotification('Please select a city first', 'warning');
                return;
            }
            
            if (typeof TrafficMap !== 'undefined') {
                const result = await TrafficMap.calculateETA(currentCityId);
                
                if (result) {
                    this.updateETADisplay(result);
                    
                    const city = window.appData?.cities?.[currentCityId];
                    if (city) {
                        Utils.showNotification(`ETA to ${city.name}: ${result.eta.total_travel_time}`, 'success');
                    }
                }
            } else {
                Utils.showNotification('Map functionality not available', 'error');
            }
        },
        
        // Update ETA display
        updateETADisplay: function(data) {
            const etaSection = document.getElementById('etaDisplay');
            if (!etaSection) return;
            
            const trafficLevel = data.traffic.level_text ? data.traffic.level_text.toLowerCase() : 'unknown';
            
            etaSection.innerHTML = `
                <div class="eta-card">
                    <div class="eta-header">
                        <i class="fas fa-clock"></i>
                        <h4>Estimated Arrival Time</h4>
                        <span class="traffic-badge traffic-${trafficLevel}">
                            ${data.traffic.level_text} Traffic
                        </span>
                    </div>
                    <div class="eta-content">
                        <div class="eta-row">
                            <div class="eta-label">
                                <i class="fas fa-route"></i>
                                <span>Distance</span>
                            </div>
                            <div class="eta-value">${data.eta.distance_km} km</div>
                        </div>
                        <div class="eta-row">
                            <div class="eta-label">
                                <i class="fas fa-car"></i>
                                <span>Departure</span>
                            </div>
                            <div class="eta-value">${data.eta.departure_time}</div>
                        </div>
                        <div class="eta-row">
                            <div class="eta-label">
                                <i class="fas fa-flag-checkered"></i>
                                <span>Arrival</span>
                            </div>
                            <div class="eta-value arrival-time">${data.eta.arrival_time}</div>
                        </div>
                        <div class="eta-row">
                            <div class="eta-label">
                                <i class="fas fa-hourglass-half"></i>
                                <span>Total Time</span>
                            </div>
                            <div class="eta-value">${data.eta.total_travel_time}</div>
                        </div>
                        <div class="eta-row">
                            <div class="eta-label">
                                <i class="fas fa-traffic-light"></i>
                                <span>Traffic Impact</span>
                            </div>
                            <div class="eta-value traffic-impact">${data.eta.traffic_impact}</div>
                        </div>
                        <div class="eta-row">
                            <div class="eta-label">
                                <i class="fas fa-exclamation-triangle"></i>
                                <span>Delay</span>
                            </div>
                            <div class="eta-value delay">+${data.eta.delay_minutes} min</div>
                        </div>
                    </div>
                    <div class="eta-footer">
                        <small><i class="far fa-clock"></i> Calculated at ${new Date().toLocaleTimeString()}</small>
                    </div>
                </div>
            `;
        },
        
        // Get current city
        getCurrentCity: function() {
            return currentCityData;
        }
    };
})();

// Initialize application
function initApplication() {
    App.init();
}

// Make functions globally available
window.App = App;
window.initApplication = initApplication;