// utils.js - Utility functions for Tunisian Traffic Prediction System

const Utils = (function() {
    // Private variables
    let notificationTimeout = null;
    
    // Public methods
    return {
        // Show notification
        showNotification: function(message, type = 'info', duration = 3000) {
            // Clear existing timeout
            if (notificationTimeout) {
                clearTimeout(notificationTimeout);
            }
            
            // Remove existing notifications
            const existingNotifications = document.querySelectorAll('.notification');
            existingNotifications.forEach(n => n.remove());
            
            // Create notification element
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            
            const icons = {
                success: 'fas fa-check-circle',
                error: 'fas fa-exclamation-circle',
                warning: 'fas fa-exclamation-triangle',
                info: 'fas fa-info-circle'
            };
            
            notification.innerHTML = `
                <div class="notification-content">
                    <i class="${icons[type] || 'fas fa-info-circle'}"></i>
                    <div class="notification-text">
                        <div class="notification-message">${message}</div>
                        <div class="notification-time">
                            ${new Date().toLocaleTimeString('en-TN', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                second: '2-digit' 
                            })}
                        </div>
                    </div>
                </div>
            `;
            
            // Add to page
            document.body.appendChild(notification);
            
            // Remove after duration
            notificationTimeout = setTimeout(() => {
                notification.classList.add('notification-hide');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, duration);
        },
        
        // Show loading overlay
        showLoading: function(message = 'Loading...') {
            const overlay = document.getElementById('loadingOverlay');
            const messageEl = document.getElementById('loadingMessage');
            
            if (overlay && messageEl) {
                messageEl.textContent = message;
                overlay.style.display = 'flex';
            }
        },
        
        // Hide loading overlay
        hideLoading: function() {
            const overlay = document.getElementById('loadingOverlay');
            if (overlay) {
                overlay.style.display = 'none';
            }
        },
        
        // Format date
        formatDate: function(date) {
            return date.toLocaleDateString('en-TN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
                timeZone: 'Africa/Tunis'
            });
        },
        
        // Format time
        formatTime: function(date) {
            return date.toLocaleTimeString('en-TN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
                timeZone: 'Africa/Tunis'
            });
        },
        
        // Get day name
        getDayName: function(dayValue) {
            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            return days[dayValue] || 'Unknown';
        },
        
        // Get hour emoji
        getHourEmoji: function(hour) {
            if (hour >= 5 && hour < 12) return '🌅';
            if (hour >= 12 && hour < 17) return '☀️';
            if (hour >= 17 && hour < 20) return '🌇';
            return '🌙';
        },
        
        // Validate form input
        validateForm: function(formData) {
            const errors = [];
            
            if (isNaN(formData.hour) || formData.hour < 0 || formData.hour > 23) {
                errors.push('Hour must be between 0 and 23');
            }
            
            if (isNaN(formData.day) || formData.day < 0 || formData.day > 6) {
                errors.push('Day must be between 0 (Monday) and 6 (Sunday)');
            }
            
            if (isNaN(formData.city) || formData.city < 0 || formData.city > 3) {
                errors.push('City must be between 0 and 3');
            }
            
            if (isNaN(formData.weather) || formData.weather < 0 || formData.weather > 2) {
                errors.push('Weather must be between 0 and 2');
            }
            
            return errors;
        },
        
        // Debounce function
        debounce: function(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },
        
        // Get traffic load percentage
        getTrafficLoad: function(trafficLevel) {
            const loads = {
                0: "10-30%",
                1: "40-70%",
                2: "75-100%"
            };
            return loads[trafficLevel] || "Unknown";
        },
        
        // Get travel advisory
        getTravelAdvisory: function(trafficLevel) {
            const advisories = {
                0: "Normal",
                1: "Caution",
                2: "Warning"
            };
            return advisories[trafficLevel] || "Normal";
        }
    };
})();

// Make utilities globally available
window.Utils = Utils;