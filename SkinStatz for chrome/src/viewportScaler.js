// ================================================================================================
// VIEWPORT SCALER - AUTOMATIC RESPONSIVE SCALING SYSTEM
// ================================================================================================
// Automatically scales the entire application based on viewport size
// Ensures consistent layout across all monitor sizes (13", 27", 32", etc.)
// ================================================================================================

class ViewportScaler {
    constructor() {
        // Reference width: Optimized for 27-inch fullscreen (1920px width)
        // Adjust this if your 27-inch monitor uses a different resolution
        this.referenceWidth = 1920
        this.referenceHeight = 1080

        // Minimum and maximum scale limits to prevent extreme scaling
        this.minScale = 0.5  // 50% minimum
        this.maxScale = 1.5  // 150% maximum

        // The main container to scale
        this.targetElement = null

        // Debounce timer for resize events
        this.resizeTimer = null
    }

    /**
     * Initialize the scaler and create UI elements
     */
    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup())
        } else {
            this.setup()
        }
    }

    /**
     * Setup the scaler
     */
    setup() {
        // Find the main container element
        this.targetElement = document.querySelector('.main-area') || document.body

        if (!this.targetElement) {
            return
        }

        // Apply initial scaling
        this.applyScale()

        // Listen for window resize events
        window.addEventListener('resize', () => this.handleResize())

        // Listen for orientation change on mobile
        window.addEventListener('orientationchange', () => this.applyScale())

        // Listen for sidebar toggle events
        const sidebarToggle = document.getElementById('sidebar-toggle')
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                // Wait for sidebar animation to complete (300ms)
                setTimeout(() => this.applyScale(), 350)
            })
        }

        // Observer for sidebar class changes (collapsed/expanded)
        const sidebarElement = document.getElementById('nav-sidebar')
        if (sidebarElement) {
            const observer = new MutationObserver(() => {
                this.applyScale()
            })
            observer.observe(sidebarElement, { attributes: true, attributeFilter: ['class'] })
        }
    }

    /**
     * Calculate the appropriate scale factor based on viewport size
     */
    calculateScale() {
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        // Account for sidebar width (collapsed: 80px, expanded: 288px)
        const sidebarElement = document.getElementById('nav-sidebar')
        const sidebarWidth = sidebarElement ? sidebarElement.offsetWidth : 288

        // Available width for main content (subtract sidebar)
        const availableWidth = viewportWidth - sidebarWidth

        // The table needs at least 1400px, so calculate required width
        const requiredContentWidth = 1400

        // Calculate scale to fit the content
        let scaleX = availableWidth / requiredContentWidth

        // Calculate scale based on height
        let scaleY = viewportHeight / this.referenceHeight

        // Use the smaller scale to ensure everything fits
        let scale = Math.min(scaleX, scaleY)

        // Apply a safety margin (reduce by 5% to add padding)
        scale = scale * 0.95

        // Clamp the scale within min/max bounds
        scale = Math.max(this.minScale, Math.min(this.maxScale, scale))

        return scale
    }

    /**
     * Apply the scaling transformation
     */
    applyScale() {
        const scale = this.calculateScale()

        // Apply the scale transformation to the target element
        if (this.targetElement) {
            // Use CSS zoom for simpler implementation (works well for browser extensions)
            this.targetElement.style.zoom = scale
        }
    }

    /**
     * Handle window resize with debouncing
     */
    handleResize() {
        // Clear existing timer
        if (this.resizeTimer) {
            clearTimeout(this.resizeTimer)
        }

        // Set new timer to debounce resize events
        this.resizeTimer = setTimeout(() => {
            this.applyScale()
        }, 150) // Wait 150ms after resize stops
    }

    /**
     * Manually set a specific zoom level (useful for user controls)
     */
    setZoom(zoomPercentage) {
        const scale = zoomPercentage / 100
        const clampedScale = Math.max(this.minScale, Math.min(this.maxScale, scale))

        if (this.targetElement) {
            this.targetElement.style.zoom = clampedScale
        }
    }

    /**
     * Reset zoom to 100%
     */
    resetZoom() {
        if (this.targetElement) {
            this.targetElement.style.zoom = 1
        }
    }

    /**
     * Enable automatic scaling
     */
    enable() {
        this.applyScale()
    }

    /**
     * Disable automatic scaling
     */
    disable() {
        this.resetZoom()
    }
}

// Create global instance
window.viewportScaler = new ViewportScaler()

// Auto-initialize when script loads
window.viewportScaler.init()
