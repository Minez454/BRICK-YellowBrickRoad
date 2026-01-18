// Geolocation Service for YellowBrickRoad
class GeolocationService {
    constructor() {
        this.currentPosition = null;
        this.watchId = null;
        this.isTracking = false;
        this.callbacks = [];
        this.errorCallbacks = [];
        this.lastKnownPosition = null;
        this.accuracyThreshold = 100; // meters
        
        // Load cached position
        this.loadCachedPosition();
    }
    
    // Get current position once
    async getCurrentPosition(options = {}) {
        const defaultOptions = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by this browser'));
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.currentPosition = position;
                    this.lastKnownPosition = position;
                    this.cachePosition(position);
                    resolve(position);
                },
                (error) => {
                    this.handleGeolocationError(error);
                    reject(error);
                },
                finalOptions
            );
        });
    }
    
    // Start continuous position tracking
    startTracking(options = {}) {
        if (this.isTracking) {
            return;
        }
        
        const defaultOptions = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000 // 1 minute
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                this.currentPosition = position;
                this.lastKnownPosition = position;
                this.cachePosition(position);
                this.notifyCallbacks(position);
            },
            (error) => {
                this.handleGeolocationError(error);
                this.notifyErrorCallbacks(error);
            },
            finalOptions
        );
        
        this.isTracking = true;
    }
    
    // Stop position tracking
    stopTracking() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
            this.isTracking = false;
        }
    }
    
    // Add position update callback
    onPositionUpdate(callback) {
        this.callbacks.push(callback);
        
        // Immediately call with current position if available
        if (this.currentPosition) {
            callback(this.currentPosition);
        }
    }
    
    // Remove position update callback
    removePositionCallback(callback) {
        const index = this.callbacks.indexOf(callback);
        if (index > -1) {
            this.callbacks.splice(index, 1);
        }
    }
    
    // Add error callback
    onError(callback) {
        this.errorCallbacks.push(callback);
    }
    
    // Remove error callback
    removeErrorCallback(callback) {
        const index = this.errorCallbacks.indexOf(callback);
        if (index > -1) {
            this.errorCallbacks.splice(index, 1);
        }
    }
    
    // Notify all position callbacks
    notifyCallbacks(position) {
        this.callbacks.forEach(callback => {
            try {
                callback(position);
            } catch (error) {
                console.error('Error in position callback:', error);
            }
        });
    }
    
    // Notify all error callbacks
    notifyErrorCallbacks(error) {
        this.errorCallbacks.forEach(callback => {
            try {
                callback(error);
            } catch (err) {
                console.error('Error in error callback:', err);
            }
        });
    }
    
    // Handle geolocation errors
    handleGeolocationError(error) {
        let message = 'Unknown geolocation error';
        
        switch (error.code) {
            case error.PERMISSION_DENIED:
                message = 'Location access denied. Please enable location services.';
                break;
            case error.POSITION_UNAVAILABLE:
                message = 'Location information is unavailable.';
                break;
            case error.TIMEOUT:
                message = 'Location request timed out.';
                break;
        }
        
        console.error('Geolocation error:', message, error);
        
        // Show user-friendly notification
        if ('serviceWorker' in navigator && 'showNotification' in ServiceWorkerRegistration.prototype) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification('Location Error', {
                    body: message,
                    icon: '/icons/icon-192x192.png',
                    tag: 'location-error'
                });
            });
        }
    }
    
    // Cache position in localStorage
    cachePosition(position) {
        const cacheData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
            timestampCached: Date.now()
        };
        
        try {
            localStorage.setItem('yellowbrickroad_lastPosition', JSON.stringify(cacheData));
        } catch (error) {
            console.error('Failed to cache position:', error);
        }
    }
    
    // Load cached position from localStorage
    loadCachedPosition() {
        try {
            const cached = localStorage.getItem('yellowbrickroad_lastPosition');
            if (cached) {
                const cacheData = JSON.parse(cached);
                
                // Check if cache is recent (less than 1 hour old)
                const cacheAge = Date.now() - cacheData.timestampCached;
                if (cacheAge < 3600000) { // 1 hour
                    this.lastKnownPosition = {
                        coords: {
                            latitude: cacheData.latitude,
                            longitude: cacheData.longitude,
                            accuracy: cacheData.accuracy
                        },
                        timestamp: cacheData.timestamp
                    };
                }
            }
        } catch (error) {
            console.error('Failed to load cached position:', error);
        }
    }
    
    // Calculate distance between two points (Haversine formula)
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;
        
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        
        return R * c; // Distance in meters
    }
    
    // Check if position is accurate enough
    isPositionAccurate(position) {
        return position.coords.accuracy <= this.accuracyThreshold;
    }
    
    // Get address from coordinates (reverse geocoding)
    async reverseGeocode(latitude, longitude) {
        try {
            // Use Nominatim (OpenStreetMap) for free reverse geocoding
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
                {
                    headers: {
                        'User-Agent': 'YellowBrickRoad/1.0'
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error('Reverse geocoding failed');
            }
            
            const data = await response.json();
            return {
                address: data.display_name,
                components: data.address,
                latitude: parseFloat(data.lat),
                longitude: parseFloat(data.lon)
            };
        } catch (error) {
            console.error('Reverse geocoding error:', error);
            return null;
        }
    }
    
    // Find nearby resources based on current location
    async findNearbyResources(type = null, radius = 5000) {
        if (!this.currentPosition && !this.lastKnownPosition) {
            throw new Error('No position available');
        }
        
        const position = this.currentPosition || this.lastKnownPosition;
        const { latitude, longitude } = position.coords;
        
        try {
            let url = `/api/survival-map/nearby?lat=${latitude}&lng=${longitude}&radius=${radius}`;
            if (type) {
                url += `&type=${type}`;
            }
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to fetch nearby resources');
            }
            
            const resources = await response.json();
            
            // Add distance to each resource
            return resources.map(resource => ({
                ...resource,
                distance: this.calculateDistance(
                    latitude, longitude,
                    resource.location.coordinates.lat,
                    resource.location.coordinates.lng
                )
            })).sort((a, b) => a.distance - b.distance);
            
        } catch (error) {
            console.error('Error finding nearby resources:', error);
            throw error;
        }
    }
    
    // Get current location as formatted string
    async getCurrentLocationString() {
        if (!this.currentPosition && !this.lastKnownPosition) {
            return 'Location unknown';
        }
        
        const position = this.currentPosition || this.lastKnownPosition;
        const { latitude, longitude } = position.coords;
        
        try {
            const addressData = await this.reverseGeocode(latitude, longitude);
            if (addressData) {
                return addressData.address;
            }
        } catch (error) {
            console.error('Error getting address:', error);
        }
        
        return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
    
    // Check if user is within a geofence
    isWithinGeofence(latitude, longitude, geofence) {
        const distance = this.calculateDistance(
            latitude, longitude,
            geofence.latitude,
            geofence.longitude
        );
        
        return distance <= geofence.radius;
    }
    
    // Create geofence and check when user enters/exits
    createGeofence(geofence, onEnter, onExit) {
        const checkGeofence = () => {
            if (this.currentPosition || this.lastKnownPosition) {
                const position = this.currentPosition || this.lastKnownPosition;
                const { latitude, longitude } = position.coords;
                
                const isInside = this.isWithinGeofence(latitude, longitude, geofence);
                const wasInside = geofence.isInside || false;
                
                if (isInside && !wasInside) {
                    // User entered geofence
                    geofence.isInside = true;
                    if (onEnter) onEnter(geofence);
                } else if (!isInside && wasInside) {
                    // User exited geofence
                    geofence.isInside = false;
                    if (onExit) onExit(geofence);
                }
            }
        };
        
        // Check immediately
        checkGeofence();
        
        // Check on position updates
        this.onPositionUpdate(checkGeofence);
        
        return geofence;
    }
    
    // Get location permission status
    async getLocationPermission() {
        if (!navigator.permissions) {
            return 'unknown';
        }
        
        try {
            const permission = await navigator.permissions.query({ name: 'geolocation' });
            return permission.state;
        } catch (error) {
            console.error('Error getting location permission:', error);
            return 'unknown';
        }
    }
    
    // Request location permission
    async requestLocationPermission() {
        try {
            await this.getCurrentPosition();
            return 'granted';
        } catch (error) {
            if (error.code === error.PERMISSION_DENIED) {
                return 'denied';
            }
            return 'prompt';
        }
    }
}

// Export for use in other modules
window.GeolocationService = GeolocationService;

// Initialize global geolocation service
window.geoService = new GeolocationService();
