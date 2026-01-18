// Push Notification Service for YellowBrickRoad
class PushNotificationService {
    constructor() {
        this.isSupported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
        this.subscription = null;
        this.isSubscribed = false;
        this.publicKey = this.urlBase64ToUint8Array(process.env.VAPID_PUBLIC_KEY || 'BDd3hOLtKxKQlKqGqdNqD-5n1v2QaXfXhNvY9l7a8kK9mNqLqKqGqdNqD5n1v2QaXfXh');
    }
    
    // Initialize the push notification service
    async initialize() {
        if (!this.isSupported) {
            console.warn('Push notifications are not supported');
            return false;
        }
        
        try {
            // Register service worker
            const registration = await navigator.serviceWorker.ready;
            
            // Check existing subscription
            this.subscription = await registration.pushManager.getSubscription();
            this.isSubscribed = this.subscription !== null;
            
            if (this.isSubscribed) {
                console.log('Already subscribed to push notifications');
                await this.sendSubscriptionToServer(this.subscription);
            }
            
            return true;
        } catch (error) {
            console.error('Failed to initialize push notifications:', error);
            return false;
        }
    }
    
    // Request permission and subscribe
    async subscribe() {
        if (!this.isSupported) {
            throw new Error('Push notifications are not supported');
        }
        
        try {
            // Request notification permission
            const permission = await Notification.requestPermission();
            
            if (permission !== 'granted') {
                throw new Error('Notification permission denied');
            }
            
            // Get service worker registration
            const registration = await navigator.serviceWorker.ready;
            
            // Subscribe to push notifications
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.publicKey
            });
            
            this.subscription = subscription;
            this.isSubscribed = true;
            
            // Send subscription to server
            await this.sendSubscriptionToServer(subscription);
            
            console.log('Successfully subscribed to push notifications');
            return subscription;
            
        } catch (error) {
            console.error('Failed to subscribe to push notifications:', error);
            throw error;
        }
    }
    
    // Unsubscribe from push notifications
    async unsubscribe() {
        if (!this.subscription) {
            return true;
        }
        
        try {
            await this.subscription.unsubscribe();
            this.subscription = null;
            this.isSubscribed = false;
            
            // Remove subscription from server
            await this.removeSubscriptionFromServer();
            
            console.log('Successfully unsubscribed from push notifications');
            return true;
            
        } catch (error) {
            console.error('Failed to unsubscribe from push notifications:', error);
            return false;
        }
    }
    
    // Send subscription to server
    async sendSubscriptionToServer(subscription) {
        try {
            const response = await fetch('/api/notifications/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    subscription: subscription,
                    userAgent: navigator.userAgent,
                    platform: this.getPlatform()
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to send subscription to server');
            }
            
            console.log('Subscription sent to server');
        } catch (error) {
            console.error('Error sending subscription to server:', error);
        }
    }
    
    // Remove subscription from server
    async removeSubscriptionFromServer() {
        try {
            const response = await fetch('/api/notifications/unsubscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    subscription: this.subscription
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to remove subscription from server');
            }
            
            console.log('Subscription removed from server');
        } catch (error) {
            console.error('Error removing subscription from server:', error);
        }
    }
    
    // Get current subscription status
    getSubscriptionStatus() {
        return {
            isSupported: this.isSupported,
            isSubscribed: this.isSubscribed,
            subscription: this.subscription,
            permission: Notification.permission
        };
    }
    
    // Schedule local notification (for offline use)
    async scheduleLocalNotification(title, options, delay = 0) {
        if (!this.isSupported || Notification.permission !== 'granted') {
            return false;
        }
        
        try {
            if (delay > 0) {
                setTimeout(() => {
                    this.showLocalNotification(title, options);
                }, delay);
            } else {
                this.showLocalNotification(title, options);
            }
            return true;
        } catch (error) {
            console.error('Error scheduling local notification:', error);
            return false;
        }
    }
    
    // Show local notification immediately
    async showLocalNotification(title, options = {}) {
        if (!this.isSupported || Notification.permission !== 'granted') {
            return false;
        }
        
        try {
            const notification = new Notification(title, {
                icon: '/icons/icon-192x192.png',
                badge: '/icons/badge-72x72.png',
                vibrate: [100, 50, 100],
                ...options
            });
            
            // Auto-close after 5 seconds
            setTimeout(() => {
                notification.close();
            }, 5000);
            
            return notification;
        } catch (error) {
            console.error('Error showing local notification:', error);
            return false;
        }
    }
    
    // Schedule medication reminder
    async scheduleMedicationReminder(medication, time) {
        const title = `Medication Reminder: ${medication.name}`;
        const options = {
            body: `Time to take ${medication.dosage} of ${medication.name}`,
            tag: `medication-${medication.id}`,
            requireInteraction: true,
            actions: [
                {
                    action: 'taken',
                    title: 'Taken ✓'
                },
                {
                    action: 'snooze',
                    title: 'Snooze'
                },
                {
                    action: 'skip',
                    title: 'Skip'
                }
            ],
            data: {
                type: 'medication',
                medicationId: medication.id,
                time: time
            }
        };
        
        return this.scheduleLocalNotification(title, options);
    }
    
    // Schedule appointment reminder
    async scheduleAppointmentReminder(appointment, hoursBefore = 24) {
        const reminderTime = new Date(appointment.dateTime);
        reminderTime.setHours(reminderTime.getHours() - hoursBefore);
        
        const delay = reminderTime - new Date();
        
        if (delay <= 0) {
            return false; // Already past the reminder time
        }
        
        const title = `Appointment Reminder: ${appointment.title}`;
        const options = {
            body: `Your ${appointment.type} appointment is in ${hoursBefore} hours`,
            tag: `appointment-${appointment.id}`,
            requireInteraction: true,
            actions: [
                {
                    action: 'confirm',
                    title: 'Confirm Attendance'
                },
                {
                    action: 'directions',
                    title: 'Get Directions'
                }
            ],
            data: {
                type: 'appointment',
                appointmentId: appointment.id,
                location: appointment.location
            }
        };
        
        return this.scheduleLocalNotification(title, options, delay);
    }
    
    // Schedule court date reminder
    async scheduleCourtDateReminder(courtDate, daysBefore = 7) {
        const reminderTime = new Date(courtDate.date);
        reminderTime.setDate(reminderTime.getDate() - daysBefore);
        
        const delay = reminderTime - new Date();
        
        if (delay <= 0) {
            return false;
        }
        
        const title = `Court Date Reminder: ${courtDate.caseNumber}`;
        const options = {
            body: `Your court date is in ${daysBefore} days - ${courtDate.courthouse.name}`,
            tag: `court-${courtDate.id}`,
            requireInteraction: true,
            urgency: 'high',
            actions: [
                {
                    action: 'directions',
                    title: 'Get Directions'
                },
                {
                    action: 'documents',
                    title: 'View Documents'
                }
            ],
            data: {
                type: 'court',
                courtDateId: courtDate.id,
                courthouse: courtDate.courthouse
            }
        };
        
        return this.scheduleLocalNotification(title, options, delay);
    }
    
    // Send bed availability alert
    async sendBedAvailabilityAlert(agency, bedsAvailable) {
        const title = `🛏️ Bed Available: ${agency.name}`;
        const options = {
            body: `${bedsAvailable} bed(s) now available at ${agency.name}. First come, first served!`,
            tag: `bed-${agency.id}`,
            urgency: 'high',
            requireInteraction: true,
            actions: [
                {
                    action: 'directions',
                    title: 'Get Directions'
                },
                {
                    action: 'call',
                    title: 'Call Now'
                }
            ],
            data: {
                type: 'bed-availability',
                agencyId: agency.id,
                agencyName: agency.name,
                phone: agency.contact.phone,
                address: agency.contact.address
            }
        };
        
        return this.showLocalNotification(title, options);
    }
    
    // Send pop-up service alert
    async sendPopUpServiceAlert(service) {
        const title = `📍 Pop-up Service: ${service.name}`;
        const options = {
            body: `${service.type} service available now at ${service.location.name}`,
            tag: `popup-${service.id}`,
            actions: [
                {
                    action: 'directions',
                    title: 'Get Directions'
                },
                {
                    action: 'details',
                    title: 'View Details'
                }
            ],
            data: {
                type: 'popup-service',
                serviceId: service.id,
                location: service.location
            }
        };
        
        return this.showLocalNotification(title, options);
    }
    
    // Send workbook completion notification
    async sendWorkbookCompletionNotification(workbook) {
        const title = `🎉 Workbook Completed: ${workbook.title}`;
        const options = {
            body: `Congratulations! You completed ${workbook.title} with a score of ${workbook.progress.overallScore}%`,
            tag: `workbook-${workbook.id}`,
            actions: [
                {
                    action: 'certificate',
                    title: 'View Certificate'
                },
                {
                    action: 'share',
                    title: 'Share Progress'
                }
            ],
            data: {
                type: 'workbook-completion',
                workbookId: workbook.id,
                score: workbook.progress.overallScore
            }
        };
        
        return this.showLocalNotification(title, options);
    }
    
    // Handle notification click
    async handleNotificationClick(event) {
        const notification = event.notification;
        const action = event.action;
        const data = notification.data;
        
        notification.close();
        
        if (!data) {
            // Default action - open app
            clients.openWindow('/');
            return;
        }
        
        switch (data.type) {
            case 'medication':
                await this.handleMedicationAction(action, data);
                break;
            case 'appointment':
                await this.handleAppointmentAction(action, data);
                break;
            case 'court':
                await this.handleCourtAction(action, data);
                break;
            case 'bed-availability':
                await this.handleBedAction(action, data);
                break;
            case 'popup-service':
                await this.handlePopupAction(action, data);
                break;
            case 'workbook-completion':
                await this.handleWorkbookAction(action, data);
                break;
            default:
                clients.openWindow('/');
        }
    }
    
    // Handle medication notification actions
    async handleMedicationAction(action, data) {
        switch (action) {
            case 'taken':
                await fetch(`/api/health-legal/medications/${data.medicationId}/adherence`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify({ taken: true, time: new Date() })
                });
                break;
            case 'snooze':
                // Schedule reminder for 15 minutes later
                setTimeout(() => {
                    this.scheduleLocalNotification('Medication Reminder', {
                        body: 'Snoozed medication reminder',
                        tag: `medication-${data.medicationId}-snooze`
                    });
                }, 15 * 60 * 1000);
                break;
        }
    }
    
    // Handle appointment notification actions
    async handleAppointmentAction(action, data) {
        switch (action) {
            case 'confirm':
                await fetch(`/api/health-legal/appointments/${data.appointmentId}/confirm`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    }
                });
                break;
            case 'directions':
                if (data.location && data.location.address) {
                    window.open(`https://maps.google.com/?q=${encodeURIComponent(data.location.address)}`, '_blank');
                }
                break;
        }
    }
    
    // Handle court date notification actions
    async handleCourtAction(action, data) {
        switch (action) {
            case 'directions':
                if (data.courthouse && data.courthouse.address) {
                    window.open(`https://maps.google.com/?q=${encodeURIComponent(data.courthouse.address)}`, '_blank');
                }
                break;
            case 'documents':
                window.open('/vault', '_blank');
                break;
        }
    }
    
    // Handle bed availability notification actions
    async handleBedAction(action, data) {
        switch (action) {
            case 'directions':
                if (data.address) {
                    window.open(`https://maps.google.com/?q=${encodeURIComponent(data.address)}`, '_blank');
                }
                break;
            case 'call':
                if (data.phone) {
                    window.open(`tel:${data.phone}`);
                }
                break;
        }
    }
    
    // Handle pop-up service notification actions
    async handlePopupAction(action, data) {
        switch (action) {
            case 'directions':
                if (data.location && data.location.address) {
                    window.open(`https://maps.google.com/?q=${encodeURIComponent(data.location.address)}`, '_blank');
                }
                break;
            case 'details':
                window.open(`/map?service=${data.serviceId}`, '_blank');
                break;
        }
    }
    
    // Handle workbook completion notification actions
    async handleWorkbookAction(action, data) {
        switch (action) {
            case 'certificate':
                window.open(`/workbooks/${data.workbookId}/certificate`, '_blank');
                break;
            case 'share':
                window.open(`/workbooks/${data.workbookId}/share`, '_blank');
                break;
        }
    }
    
    // Get platform information
    getPlatform() {
        const userAgent = navigator.userAgent;
        
        if (/iPhone|iPad|iPod/.test(userAgent)) {
            return 'ios';
        } else if (/Android/.test(userAgent)) {
            return 'android';
        } else if (/Windows/.test(userAgent)) {
            return 'windows';
        } else if (/Mac/.test(userAgent)) {
            return 'macos';
        } else if (/Linux/.test(userAgent)) {
            return 'linux';
        }
        
        return 'unknown';
    }
    
    // Convert VAPID public key from base64 to Uint8Array
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        
        return outputArray;
    }
}

// Export for use in other modules
window.PushNotificationService = PushNotificationService;

// Initialize global push notification service
window.pushNotificationService = new PushNotificationService();
