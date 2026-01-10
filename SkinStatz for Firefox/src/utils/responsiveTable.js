// ================================================================================================
// RESPONSIVE TABLE UTILITY
// ================================================================================================
// Automatically hides placeholder percentage columns (24h%, 7d%, 30d%) when viewport is narrow
// Ensures critical columns (Item Name, Buy/Sell prices, Status, Actions) remain visible
// ================================================================================================

class ResponsiveTableUtil {
    constructor() {
        this.breakpoint = 1500 // Aggressive threshold - hide columns early to prevent any scrollbar
        this.debounceTimer = null
        this.debounceDelay = 150 // ms
    }

    /**
     * Initialize the responsive table behavior
     */
    init() {
        // Apply initial state
        this.checkAndApply()

        // Listen for window resize
        window.addEventListener('resize', () => this.handleResize())

        // Listen for sidebar toggle
        const sidebarToggle = document.getElementById('sidebar-toggle')
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                // Wait for sidebar animation to complete
                setTimeout(() => this.checkAndApply(), 350)
            })
        }

        // Observer for sidebar class changes
        const sidebar = document.getElementById('nav-sidebar')
        if (sidebar) {
            const observer = new MutationObserver(() => {
                this.checkAndApply()
            })
            observer.observe(sidebar, {
                attributes: true,
                attributeFilter: ['class']
            })
        }
    }

    /**
     * Get available width for main content
     * Accounts for viewport scaler zoom if present
     */
    getAvailableWidth() {
        const viewportWidth = window.innerWidth

        // Get sidebar width
        const sidebar = document.getElementById('nav-sidebar')
        const sidebarWidth = sidebar ? sidebar.offsetWidth : 288

        // Calculate available width
        let availableWidth = viewportWidth - sidebarWidth

        // Account for viewport scaler zoom if it's active
        const mainArea = document.querySelector('.main-area') || document.body
        const computedStyle = window.getComputedStyle(mainArea)
        const zoomValue = computedStyle.zoom || 1

        // If zoom is applied, adjust available width accordingly
        if (zoomValue && zoomValue !== '1' && zoomValue !== 1) {
            const zoom = parseFloat(zoomValue)
            availableWidth = availableWidth / zoom
        }

        return availableWidth
    }

    /**
     * Check if element has horizontal scrollbar or overflow
     */
    hasHorizontalOverflow(element) {
        if (!element) return false
        return element.scrollWidth > element.clientWidth
    }

    /**
     * Check available width and apply/remove hiding class
     * Also checks for actual horizontal overflow to prevent scrollbars
     */
    checkAndApply() {
        const availableWidth = this.getAvailableWidth()

        // Find table containers
        const tradingTable = document.querySelector('.responsive-trading-table')
        const investmentTable = document.querySelector('.responsive-investment-table')

        // Check both available width AND if there's horizontal overflow
        const tables = [tradingTable, investmentTable].filter(t => t)

        if (tables.length === 0) {
            return
        }

        for (const table of tables) {
            // Check current state
            const currentlyHidden = table.classList.contains('hide-percentage-cols')

            // Temporarily show columns to check if overflow occurs
            if (currentlyHidden) {
                table.classList.remove('hide-percentage-cols')
            }

            // Force layout recalculation
            table.offsetHeight

            // Check for overflow
            const hasOverflow = this.hasHorizontalOverflow(table)
            const tooNarrow = availableWidth < this.breakpoint

            // Hide columns if EITHER condition is true:
            // 1. Available width is less than breakpoint
            // 2. Table has horizontal overflow (scrollbar would appear)
            if (tooNarrow || hasOverflow) {
                table.classList.add('hide-percentage-cols')
            } else {
                table.classList.remove('hide-percentage-cols')
            }
        }
    }

    /**
     * Handle window resize with debouncing
     */
    handleResize() {
        // Clear existing timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer)
        }

        // Set new timer
        this.debounceTimer = setTimeout(() => {
            this.checkAndApply()
        }, this.debounceDelay)
    }
}

// Create global instance
window.responsiveTableUtil = new ResponsiveTableUtil()
