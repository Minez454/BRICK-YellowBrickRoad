// YellowBrickRoad Interactive Pitch Application
class PitchApp {
    constructor() {
        this.currentSlide = 1;
        this.totalSlides = 7;
        this.isFullscreen = false;
        this.isAutoPlaying = false;
        this.autoPlayInterval = null;
        this.liveData = {
            usersHelped: 15234,
            agenciesConnected: 127,
            hoursSaved: 45678,
            documentsSecured: 8934,
            meetingsConducted: 2341
        };
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.startLiveUpdates();
        this.initializeAnimations();
        this.loadRealData();
    }

    setupEventListeners() {
        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Touch/swipe support
        this.setupTouchNavigation();
        
        // Navigation dots
        document.querySelectorAll('.nav-dot').forEach((dot, index) => {
            dot.addEventListener('click', () => this.goToSlide(index + 1));
        });

        // Fullscreen toggle
        document.addEventListener('dblclick', () => this.toggleFullscreen());
        
        // Visibility change to pause/resume auto-play
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseAutoPlay();
            } else {
                this.resumeAutoPlay();
            }
        });
    }

    handleKeyPress(e) {
        switch(e.key) {
            case 'ArrowRight':
            case ' ':
                this.nextSlide();
                break;
            case 'ArrowLeft':
                this.previousSlide();
                break;
            case 'Home':
                this.goToSlide(1);
                break;
            case 'End':
                this.goToSlide(this.totalSlides);
                break;
            case 'f':
            case 'F':
                this.toggleFullscreen();
                break;
            case 'p':
            case 'P':
                this.toggleAutoPlay();
                break;
            case 'Escape':
                this.exitPresentation();
                break;
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
                this.goToSlide(parseInt(e.key));
                break;
        }
    }

    setupTouchNavigation() {
        let touchStartX = 0;
        let touchStartY = 0;

        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        });

        document.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].screenX;
            const touchEndY = e.changedTouches[0].screenY;
            
            const deltaX = touchStartX - touchEndX;
            const deltaY = touchStartY - touchEndY;
            
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (deltaX > 50) {
                    this.previousSlide();
                } else if (deltaX < -50) {
                    this.nextSlide();
                }
            }
        });
    }

    goToSlide(slideNumber) {
        if (slideNumber < 1 || slideNumber > this.totalSlides) return;
        
        // Hide current slide with animation
        const currentSlideElement = document.getElementById(`slide-${this.currentSlide}`);
        currentSlideElement.style.opacity = '0';
        currentSlideElement.style.transform = 'translateX(-100px)';
        
        setTimeout(() => {
            currentSlideElement.style.display = 'none';
            
            // Show new slide with animation
            const newSlideElement = document.getElementById(`slide-${slideNumber}`);
            newSlideElement.style.display = 'flex';
            newSlideElement.style.opacity = '0';
            newSlideElement.style.transform = 'translateX(100px)';
            
            setTimeout(() => {
                newSlideElement.style.opacity = '1';
                newSlideElement.style.transform = 'translateX(0)';
                this.updateNavigation(slideNumber);
                this.onSlideChange(slideNumber);
            }, 50);
            
            this.currentSlide = slideNumber;
        }, 300);
    }

    nextSlide() {
        if (this.currentSlide < this.totalSlides) {
            this.goToSlide(this.currentSlide + 1);
        }
    }

    previousSlide() {
        if (this.currentSlide > 1) {
            this.goToSlide(this.currentSlide - 1);
        }
    }

    updateNavigation(slideNumber) {
        document.querySelectorAll('.nav-dot').forEach((dot, index) => {
            dot.classList.toggle('active', index + 1 === slideNumber);
        });
        
        // Update slide number
        document.querySelectorAll('.slide-number').forEach(el => {
            el.textContent = `${slideNumber}/${this.totalSlides}`;
        });
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => {
                this.isFullscreen = true;
                this.showNotification('Fullscreen mode activated', 'info');
            });
        } else {
            document.exitFullscreen().then(() => {
                this.isFullscreen = false;
                this.showNotification('Fullscreen mode deactivated', 'info');
            });
        }
    }

    toggleAutoPlay() {
        if (this.isAutoPlaying) {
            this.pauseAutoPlay();
        } else {
            this.startAutoPlay();
        }
    }

    startAutoPlay() {
        this.isAutoPlaying = true;
        this.showNotification('Auto-play started', 'info');
        
        this.autoPlayInterval = setInterval(() => {
            this.nextSlide();
        }, 8000); // 8 seconds per slide
    }

    pauseAutoPlay() {
        this.isAutoPlaying = false;
        this.showNotification('Auto-play paused', 'info');
        
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
        }
    }

    exitPresentation() {
        if (confirm('Are you sure you want to exit the presentation?')) {
            window.location.href = '../demo/index.html';
        }
    }

    startLiveUpdates() {
        // Simulate live data updates
        setInterval(() => {
            this.updateLiveMetrics();
        }, 3000); // Update every 3 seconds
        
        // Simulate real-time notifications
        setInterval(() => {
            this.showRandomNotification();
        }, 15000); // Every 15 seconds
    }

    updateLiveMetrics() {
        // Update users helped
        const usersElement = document.querySelector('.live-users');
        if (usersElement) {
            this.liveData.usersHelped += Math.floor(Math.random() * 3);
            this.animateNumber(usersElement, this.liveData.usersHelped);
        }

        // Update agencies connected
        const agenciesElement = document.querySelector('.live-agencies');
        if (agenciesElement) {
            if (Math.random() > 0.7) { // 30% chance
                this.liveData.agenciesConnected += 1;
                this.animateNumber(agenciesElement, this.liveData.agenciesConnected);
                this.showNotification('New agency connected!', 'success');
            }
        }

        // Update hours saved
        const hoursElement = document.querySelector('.live-hours');
        if (hoursElement) {
            this.liveData.hoursSaved += Math.floor(Math.random() * 5);
            this.animateNumber(hoursElement, this.liveData.hoursSaved);
        }

        // Update documents secured
        const docsElement = document.querySelector('.live-docs');
        if (docsElement) {
            if (Math.random() > 0.8) { // 20% chance
                this.liveData.documentsSecured += 1;
                this.animateNumber(docsElement, this.liveData.documentsSecured);
                this.showNotification('Document secured in vault!', 'success');
            }
        }
    }

    animateNumber(element, targetValue) {
        const startValue = parseInt(element.textContent.replace(/,/g, ''));
        const duration = 1000;
        const startTime = Date.now();

        const animate = () => {
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const currentValue = Math.floor(startValue + (targetValue - startValue) * progress);
            element.textContent = currentValue.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    showRandomNotification() {
        const notifications = [
            { message: 'New user completed budgeting workbook!', type: 'success' },
            { message: 'Shelter bed just became available!', type: 'info' },
            { message: 'Agency meeting scheduled for tomorrow', type: 'info' },
            { message: 'Document verification completed', type: 'success' },
            { message: 'Resource map updated with new locations', type: 'info' },
            { message: 'Health check-in completed successfully', type: 'success' },
            { message: 'Zoom meeting in progress', type: 'info' }
        ];

        const notification = notifications[Math.floor(Math.random() * notifications.length)];
        this.showNotification(notification.message, notification.type);
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `live-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.remove()" class="notification-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            max-width: 300px;
            animation: slideInRight 0.3s ease-out;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
        `;

        // Add to page
        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            info: 'fa-info-circle',
            warning: 'fa-exclamation-triangle'
        };
        return icons[type] || icons.info;
    }

    initializeAnimations() {
        // Add CSS animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            .live-notification {
                animation: slideInRight 0.3s ease-out;
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .notification-close {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                cursor: pointer;
                margin-left: auto;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .notification-close:hover {
                background: rgba(255, 255, 255, 0.3);
            }
            
            .nav-dot {
                transition: all 0.3s ease;
            }
            
            .nav-dot.active {
                transform: scale(1.3);
            }
            
            .slide-number {
                transition: all 0.3s ease;
            }
        `;
        document.head.appendChild(style);
    }

    loadRealData() {
        // Simulate loading real data from backend
        setTimeout(() => {
            this.showNotification('Connected to live data stream', 'success');
        }, 2000);
    }

    onSlideChange(slideNumber) {
        // Trigger specific actions based on slide
        switch(slideNumber) {
            case 1: // Title slide
                this.showNotification('Welcome to YellowBrickRoad', 'info');
                break;
            case 2: // Problem slide
                this.showNotification('Loading latest homelessness statistics', 'info');
                break;
            case 3: // Solution slide
                this.showNotification('BRICK AI Guide ready for assessment', 'success');
                break;
            case 4: // Features slide
                this.showNotification('All systems operational', 'success');
                break;
            case 5: // Impact slide
                this.showNotification('Impact metrics updated in real-time', 'info');
                break;
            case 6: // Technology slide
                this.showNotification('System health: All green', 'success');
                break;
            case 7: // CTA slide
                this.showNotification('Ready to transform lives together!', 'success');
                break;
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.pitchApp = new PitchApp();
});

// Global functions for onclick handlers
window.goToSlide = (slideNumber) => {
    if (window.pitchApp) {
        window.pitchApp.goToSlide(slideNumber);
    }
};

window.toggleAutoPlay = () => {
    if (window.pitchApp) {
        window.pitchApp.toggleAutoPlay();
    }
};
