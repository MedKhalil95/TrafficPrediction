// main.js - Main application logic for Tunisian Traffic Prediction System

const App = (function() {
    // Private variables
    let tunisiaCities = {};
    let currentPrediction = null;
    
    // Public methods
    return {
        // Initialize application
        init: function() {
            console.log("🚀 Initializing application...");
            
            // Get data from window object
            tunisiaCities = window.appData?.cities || {};
            
            // Initialize components
            this.initClock();
            this.initForm();
            this.initEventListeners();
            
            // Initialize map after delay
            setTimeout(() => {
                if (typeof TrafficMap !== 'undefined') {
                    TrafficMap.init();
                }
                
                // Check system status
                this.checkSystemStatus();
                
                // Auto-refresh status every 5 minutes
                setInterval(() => this.checkSystemStatus(), 300000);
                
                console.log("✅ Application initialized successfully");
            }, 500);
        },
        
        // Initialize real-time clock
        initClock: function() {
            const updateClock = () => {
                const now = new Date();
                
                // Update clock display
                const clockElement = document.getElementById('realTimeClock');
                if (clockElement) {
                    clockElement.innerHTML = `
                        <div class="clock-time">${Utils.formatTime(now)}</div>
                        <div class="clock-date">${Utils.formatDate(now)}</div>
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
                    const shortTime = Utils.formatTime(now);
                    footerTime.textContent = `Last updated: ${shortDate} ${shortTime}`;
                }
            };
            
            // Initial update
            updateClock();
            
            // Update every second
            setInterval(updateClock, 1000);
        },
        
        // Initialize form
        initForm: function() {
            // Set current time in form
            this.updateFormWithCurrentTime();
            
            // Initialize city hotspots
            this.updateCityHotspots();
        },
        
        // Initialize event listeners
        initEventListeners: function() {
            // Hour slider change
            const hourSlider = document.getElementById('hour');
            if (hourSlider) {
                hourSlider.addEventListener('input', (e) => {
                    this.updateHourDisplay(e.target.value);
                });
            }
            
            // City select change
            const citySelect = document.getElementById('city');
            if (citySelect) {
                citySelect.addEventListener('change', () => {
                    this.updateCityHotspots();
                });
            }
            
            // Auto-submit on parameter changes
            const debouncedSubmit = Utils.debounce(() => this.submitForm(), 1000);
            
            if (hourSlider) hourSlider.addEventListener('change', debouncedSubmit);
            if (citySelect) citySelect.addEventListener('change', debouncedSubmit);
            
            const daySelect = document.getElementById('day');
            const weatherSelect = document.getElementById('weather');
            
            if (daySelect) daySelect.addEventListener('change', debouncedSubmit);
            if (weatherSelect) weatherSelect.addEventListener('change', debouncedSubmit);
        },
        
        // Update hour display
        updateHourDisplay: function(hour) {
            const hourDisplay = document.getElementById('hourDisplay');
            if (!hourDisplay) return;
            
            hour = parseInt(hour);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour % 12 || 12;
            const emoji = Utils.getHourEmoji(hour);
            
            hourDisplay.innerHTML = `${emoji} ${displayHour}:00 ${ampm}`;
            hourDisplay.style.color = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18) 
                ? '#dc3545' : '#28a745';
        },
        
        // Update city hotspots
        updateCityHotspots: function() {
            const cityId = document.getElementById('city').value;
            const city = tunisiaCities[cityId];
            const hotspotsDiv = document.getElementById('cityHotspots');
            
            if (city && hotspotsDiv) {
                hotspotsDiv.innerHTML = '';
                city.hotspots.forEach(hotspot => {
                    const tag = document.createElement('span');
                    tag.className = 'hotspot-tag';
                    tag.innerHTML = `<i class="fas fa-traffic-light"></i> ${hotspot}`;
                    hotspotsDiv.appendChild(tag);
                });
                
                // Update city name in results
                document.getElementById('cityName').textContent = city.name;
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
            const hourDisplay = document.getElementById('hourDisplay');
            if (hourSlider && hourDisplay) {
                hourSlider.value = currentHour;
                this.updateHourDisplay(currentHour);
            }
            
            // Update day selector
            const daySelector = document.getElementById('day');
            if (daySelector) {
                daySelector.value = systemDay;
            }
            
            // Update prediction time display
            this.updatePredictionTimeDisplay(currentHour, systemDay);
        },
        
        // Update prediction time display
        updatePredictionTimeDisplay: function(hour, day) {
            const predictionTimeElement = document.getElementById('predictionTime');
            if (!predictionTimeElement) return;
            
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour % 12 || 12;
            const dayName = Utils.getDayName(day);
            
            predictionTimeElement.textContent = `${displayHour}:00 ${ampm} - ${dayName}`;
        },
        
        // Submit form for prediction
        submitForm: async function() {
            // Get form data
            const formData = {
                hour: parseInt(document.getElementById('hour').value),
                day: parseInt(document.getElementById('day').value),
                city: parseInt(document.getElementById('city').value),
                weather: parseInt(document.getElementById('weather').value)
            };
            
            // Validate form
            const errors = Utils.validateForm(formData);
            if (errors.length > 0) {
                Utils.showNotification(errors[0], 'error');
                return;
            }
            
            // Update UI immediately
            const cityName = tunisiaCities[formData.city]?.name || 'Unknown';
            document.getElementById('cityName').textContent = cityName;
            
            const ampm = formData.hour >= 12 ? 'PM' : 'AM';
            const displayHour = formData.hour % 12 || 12;
            const dayName = Utils.getDayName(formData.day);
            document.getElementById('predictionTime').textContent = `${displayHour}:00 ${ampm} - ${dayName}`;
            
            // Show loading
            const submitBtn = document.getElementById('submitBtn');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Predicting...';
            submitBtn.disabled = true;
            
            Utils.showLoading('Analyzing traffic patterns...');
            
            try {
                // Send prediction request
                const response = await fetch('/api/traffic-prediction', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Update prediction results
                    this.updatePredictionResults(data);
                    currentPrediction = data;
                    
                    // Show success notification
                    Utils.showNotification(`✅ Traffic prediction successful! Level: ${data.traffic_level.level}`, 'success');
                } else {
                    // Use fallback prediction
                    const fallbackData = this.getFallbackPrediction(formData);
                    this.updatePredictionResults(fallbackData);
                    currentPrediction = fallbackData;
                    Utils.showNotification('⚠️ Using estimated prediction', 'warning');
                }
            } catch (error) {
                console.error('Error:', error);
                // Use fallback prediction
                const fallbackData = this.getFallbackPrediction(formData);
                this.updatePredictionResults(fallbackData);
                currentPrediction = fallbackData;
                Utils.showNotification('ℹ️ Using offline prediction', 'info');
            } finally {
                // Reset button
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                
                // Hide loading overlay
                Utils.hideLoading();
            }
        },
        
        // Update prediction results display
        updatePredictionResults: function(data) {
            console.log("Updating prediction results:", data);
            
            // Update traffic level
            const trafficElement = document.getElementById('trafficLevel');
            if (trafficElement && data.traffic_level) {
                const level = data.traffic_level.level.toLowerCase();
                trafficElement.textContent = data.traffic_level.level;
                trafficElement.className = 'traffic-level ' + level;
                
                // Add appropriate icon
                const icons = { low: '✅', medium: '⚠️', high: '🚨' };
                trafficElement.innerHTML = `${icons[level] || '📊'} ${data.traffic_level.level}`;
            }
            
            // Update traffic message
            const messageElement = document.getElementById('trafficMessage');
            if (messageElement && data.traffic_level) {
                messageElement.textContent = data.traffic_level.message;
                messageElement.style.color = data.traffic_level.color;
            }
            
            // Update city name (if not already set)
            const cityNameElement = document.getElementById('cityName');
            if (cityNameElement && data.city) {
                cityNameElement.textContent = data.city.name;
            }
            
            // Update traffic load
            const trafficLoadElement = document.getElementById('trafficLoad');
            if (trafficLoadElement) {
                trafficLoadElement.textContent = Utils.getTrafficLoad(data.prediction);
            }
            
            // Update advisory
            const advisoryElement = document.getElementById('advisory');
            if (advisoryElement) {
                advisoryElement.textContent = Utils.getTravelAdvisory(data.prediction);
                advisoryElement.style.color = data.traffic_level?.color || '#28a745';
            }
            
            // Update recommendations
            const recommendationsList = document.getElementById('recommendationsList');
            if (recommendationsList && data.recommendations) {
                recommendationsList.innerHTML = '';
                data.recommendations.forEach(rec => {
                    const li = document.createElement('li');
                    li.textContent = rec;
                    recommendationsList.appendChild(li);
                });
            }
            
            // Update map with traffic marker
            if (data.city && typeof TrafficMap !== 'undefined') {
                TrafficMap.updateTrafficMarker(data.city.id || formData.city, data.prediction);
            }
        },
        
        // Fallback prediction logic
        getFallbackPrediction: function(formData) {
            const { hour, day, city, weather } = formData;
            
            // Calculate traffic score
            let score = 0;
            
            // Time factor
            if (hour >= 7 && hour <= 9) score += 2;
            if (hour >= 16 && hour <= 19) score += 2.5;
            if (hour >= 12 && hour <= 14) score += 1;
            
            // Day factor
            if (day === 4) score += 1;
            if (day >= 5) score -= 0.5;
            
            // City factor
            if (city === 0) score += 1;
            if (city === 1) score += 0.5;
            
            // Weather factor
            if (weather === 1) score += 1;
            if (weather === 2) score += 0.5;
            
            // Determine traffic level
            let prediction, level;
            if (score >= 3.5) {
                prediction = 2;
                level = "High";
            } else if (score >= 1.5) {
                prediction = 1;
                level = "Medium";
            } else {
                prediction = 0;
                level = "Low";
            }
            
            // Get city info
            const cityInfo = tunisiaCities[city] || tunisiaCities[0];
            
            // Generate recommendations
            const recommendations = [];
            if (prediction === 2) {
                recommendations.push("🚗 Consider using public transportation");
                recommendations.push("⏰ Allow extra travel time");
                if (hour >= 7 && hour <= 9) recommendations.push("🕒 Avoid morning rush hours if possible");
            } else if (prediction === 1) {
                recommendations.push("🚘 Normal travel time expected");
                recommendations.push("📱 Check real-time traffic updates");
            } else {
                recommendations.push("✅ Smooth driving conditions");
                recommendations.push("⏱️ Normal travel time");
            }
            
            return {
                prediction: prediction,
                traffic_level: {
                    level: level,
                    color: prediction === 0 ? '#28a745' : prediction === 1 ? '#ffc107' : '#dc3545',
                    message: prediction === 0 ? 'Traffic is light' : 
                             prediction === 1 ? 'Moderate traffic expected' : 
                             'Heavy traffic - consider alternate routes'
                },
                city: cityInfo,
                recommendations: recommendations
            };
        },
        
        // Quick predict using current time
        quickPredict: function() {
            Utils.showLoading('Predicting traffic for current time...');
            
            try {
                // Update form with current time
                this.updateFormWithCurrentTime();
                
                // Submit the form
                this.submitForm();
                
                Utils.hideLoading();
            } catch (error) {
                Utils.hideLoading();
                Utils.showNotification('Error making prediction', 'error');
            }
        },
        
        // Update location status
        updateLocationStatus: function(status, type = 'info') {
            const statusEl = document.getElementById('locationStatus');
            if (!statusEl) return;
            
            const icons = {
                success: 'fas fa-check-circle',
                error: 'fas fa-exclamation-circle',
                warning: 'fas fa-exclamation-triangle',
                info: 'fas fa-spinner fa-spin'
            };
            
            statusEl.innerHTML = `
                <i class="${icons[type] || 'fas fa-info-circle'}"></i> ${status}
            `;
        },
        
        // Locate user
        locateUser: function() {
            if (typeof TrafficMap !== 'undefined') {
                TrafficMap.locateUser();
            }
        },
        
        // Check system status
        checkSystemStatus: async function() {
            try {
                const response = await fetch('/api/system-status');
                const data = await response.json();
                
                if (data.success) {
                    // Update status displays
                    const lastUpdate = data.status.last_update;
                    if (lastUpdate && lastUpdate !== 'Never') {
                        const date = new Date(lastUpdate);
                        document.getElementById('lastUpdateTime').textContent = 
                            `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
                    } else {
                        document.getElementById('lastUpdateTime').textContent = 'Never';
                    }
                    
                    document.getElementById('nextUpdateTime').textContent = 
                        data.status.next_update || 'Unknown';
                    
                    document.getElementById('dataRecords').textContent = 
                        data.status.dataset_size?.toLocaleString() || '0';
                    
                    // Update model status with better styling
                    const modelStatus = document.getElementById('modelStatus');
                    if (data.files?.model?.exists) {
                        modelStatus.className = 'status-value status-ok';
                        modelStatus.innerHTML = '<i class="fas fa-check-circle"></i> Active';
                    } else {
                        modelStatus.className = 'status-value status-warning';
                        modelStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Fallback';
                    }
                    
                    Utils.showNotification('System status updated successfully', 'success');
                }
            } catch (error) {
                console.error('Error checking system status:', error);
                Utils.showNotification('Failed to check system status', 'error');
            }
        },
        
        // Force update
        forceUpdate: async function() {
            const btn = event.target;
            const originalText = btn.innerHTML;
            
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            btn.disabled = true;
            
            try {
                const response = await fetch('/api/force-update', { method: 'POST' });
                const data = await response.json();
                
                if (data.success) {
                    Utils.showNotification('✅ Data update completed successfully!', 'success');
                    this.checkSystemStatus();
                } else {
                    Utils.showNotification('❌ Update failed: ' + data.error, 'error');
                }
            } catch (error) {
                Utils.showNotification('❌ Update failed: ' + error.message, 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        },
        
        // Zoom to Tunisia view
        zoomToTunisia: function() {
            if (typeof TrafficMap !== 'undefined') {
                TrafficMap.zoomToTunisia();
            }
        },
        
        // Get current prediction
        getCurrentPrediction: function() {
            return currentPrediction;
        }
    };
})();

// Initialize application
function initApplication() {
    App.init();
}

// Make app functions globally available
window.App = App;
window.initApplication = initApplication;
window.submitForm = () => App.submitForm();
window.quickPredict = () => App.quickPredict();
window.locateUser = () => App.locateUser();
window.checkSystemStatus = () => App.checkSystemStatus();
window.forceUpdate = () => App.forceUpdate();
window.zoomToTunisia = () => App.zoomToTunisia();
window.updateCityHotspots = () => App.updateCityHotspots();