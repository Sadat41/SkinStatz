// ================================================================================================
// CS2 TRADING TRACKER - MAIN APPLICATION ENTRY POINT
// ================================================================================================
// Modern modular architecture for professional CS2 skin trading analytics
// Author: CS2 Trading Team
// Last Updated: 2025
// ================================================================================================

// Wait for essential dependencies to load before initializing modules
function waitForDependencies() {
    return new Promise((resolve) => {
        let attempts = 0
        const maxAttempts = 20 // 2 seconds maximum wait (reduced)
        
        const checkDependencies = () => {
            attempts++
            
            // Check if essential dependencies are loaded (store and router will be loaded by our modules)
            const lucideLoaded = window.lucide
            const apexChartsLoaded = window.ApexCharts
            
            console.log(`🔍 Dependency check ${attempts}/${maxAttempts}:`, {
                lucide: !!lucideLoaded,
                apexCharts: !!apexChartsLoaded
            })
            
            // Only require essential dependencies - store/router will be available after module loading
            if (lucideLoaded) {
                console.log('✅ Essential dependencies loaded successfully')
                resolve()
            } else if (attempts >= maxAttempts) {
                console.warn('⚠️ Timeout waiting for dependencies, continuing anyway...')
                resolve() // Continue even if some deps aren't loaded
            } else {
                setTimeout(checkDependencies, 100)
            }
        }
        
        checkDependencies()
    })
}

// Application initialization
class CS2TradingApp {
    constructor() {
        this.currentPage = 'dashboard'
        this.store = null
        this.router = null
        console.log('🚀 CS2 Trading Tracker initializing...')
    }

    async init() {
        try {
            console.log('🚀 Starting CS2 Trading App initialization...')
            
            // Wait for dependencies with better error handling
            await waitForDependencies()
            
            // Check for required global objects with detailed logging
            console.log('🔍 Checking global dependencies...')
            console.log('📊 Available globals:', {
                useAppStore: typeof window.useAppStore,
                CS2Router: typeof window.CS2Router,
                store: typeof window.store,
                router: typeof window.router
            })
            
            // Load our modules via script tags (they should be loaded by now)
            if (window.useAppStore && window.CS2Router) {
                console.log('✅ Global objects found - initializing...')
                
                // Initialize store
                console.log('🏪 Initializing store...')
                this.store = window.useAppStore()
                
                // Initialize router
                console.log('🗺️ Initializing router...')
                this.router = window.CS2Router
                
                // Test store functionality with detailed verification
                if (this.store && typeof this.store.calculateTradingMetrics === 'function') {
                    console.log('✅ Store working correctly')
                    
                    // Test store data
                    try {
                        const testMetrics = this.store.calculateTradingMetrics()
                        console.log('📊 Store data accessible:', {
                            investments: this.store.investments?.length || 0,
                            balance: this.store.accountBalance || 0,
                            metricsCalculated: !!testMetrics
                        })
                    } catch (storeError) {
                        console.warn('⚠️ Store data test failed:', storeError)
                    }
                } else {
                    throw new Error('Store not working properly - missing calculateTradingMetrics function')
                }
                
                // Test router functionality
                if (this.router && typeof this.router.init === 'function') {
                    console.log('✅ Router working correctly')
                } else {
                    throw new Error('Router not working properly - missing init function')
                }
                
                console.log('✅ All modules loaded and verified')
            } else {
                const missing = []
                if (!window.useAppStore) missing.push('useAppStore')
                if (!window.CS2Router) missing.push('CS2Router')
                throw new Error(`Required modules not found in global scope: ${missing.join(', ')}`)
            }
            
            // Load saved data
            console.log('📥 Loading saved data...')
            await this.loadData()
            
            // Initialize routing
            console.log('🗺️ Initializing router system...')
            this.initializeRouter()
            
            // Setup global event listeners
            console.log('🎧 Setting up event listeners...')
            this.setupEventListeners()
            
            // Initialize page components
            console.log('🎨 Initializing UI components...')
            this.initializeComponents()
            
            console.log('🎉 CS2 Trading Tracker initialized successfully!')
            
        } catch (error) {
            console.error('❌ Failed to initialize tracker:', error)
            console.error('📋 Error details:', {
                message: error.message,
                stack: error.stack,
                globals: {
                    useAppStore: typeof window.useAppStore,
                    CS2Router: typeof window.CS2Router,
                    store: typeof window.store,
                    router: typeof window.router
                }
            })
            this.showFallbackInterface()
        }
    }

    async loadData() {
        // Simple data loading - the store handles this automatically
        console.log('📥 Data loading handled by simple store')
        
        // Store already loaded data in its constructor, nothing more needed
        console.log('📊 Current data:', {
            investments: this.store.investments?.length || 0,
            balance: `$${this.store.accountBalance || 0}`,
            page: this.store.currentPage
        })
    }

    initializeRouter() {
        try {
            // Initialize page routing
            if (this.router && this.router.init) {
                this.router.init()
                console.log('🗺️ Router initialized')
                
                // Let the router handle initial navigation based on current hash
                const currentHash = window.location.hash;
                console.log('🔍 Current hash on load:', currentHash || 'none')
                if (!currentHash || currentHash === '#' || currentHash === '#/') {
                    console.log('📄 Loading default dashboard page')
                    window.location.hash = '#/dashboard'
                }
            } else {
                throw new Error('Router not available')
            }
        } catch (error) {
            console.warn('⚠️ Router initialization failed:', error)
            this.setupFallbackNavigation()
        }
    }
    
    setupFallbackNavigation() {
        console.log('⚠️ Using fallback navigation system')
        
        // Simple hash-based navigation fallback
        const showDashboard = () => {
            const mainContent = document.getElementById('main-content')
            if (mainContent) {
                mainContent.innerHTML = `
                    <div class="text-center py-20">
                        <h1 class="text-3xl font-bold gradient-text mb-4">CS2 Trading Dashboard</h1>
                        <p class="text-gray-400 mb-8">System is running in fallback mode</p>
                        <div class="glass-card rounded-xl p-6 max-w-md mx-auto">
                            <h3 class="text-lg font-semibold text-white mb-3">Troubleshooting:</h3>
                            <ul class="text-left text-gray-300 space-y-2 mb-4">
                                <li>• Check browser console for errors</li>
                                <li>• Verify all local files are loaded</li>
                                <li>• Try refreshing the page</li>
                            </ul>
                            <button onclick="location.reload()" class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg mb-2">
                                Reload Page
                            </button>
                            <button onclick="window.location.href='tracker.html'" class="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg">
                                Use Original Tracker
                            </button>
                        </div>
                    </div>
                `
            }
        }
        
        // Set up navigation event listeners
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault()
                const page = item.getAttribute('data-page')
                if (page === 'dashboard') {
                    showDashboard()
                }
            })
        })
        
        // Show dashboard by default
        showDashboard()
    }

    setupEventListeners() {
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault()
                        router.navigate('/dashboard')
                        break
                    case '2':
                        e.preventDefault()
                        router.navigate('/trading')
                        break
                    case '3':
                        e.preventDefault()
                        router.navigate('/investments')
                        break
                    case '4':
                        e.preventDefault()
                        router.navigate('/cases')
                        break
                    case '5':
                        e.preventDefault()
                        router.navigate('/analytics')
                        break
                }
            }
        })

        // Auto-save is handled by the store itself, no need for manual subscription

        console.log('🎧 Event listeners setup complete')
    }

    initializeComponents() {
        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons()
        }

        // Initialize Notyf notifications with enhanced configuration
        if (typeof Notyf !== 'undefined') {
            window.notyf = new Notyf({
                duration: 4000,
                position: { x: 'right', y: 'top' },
                dismissible: true,
                ripple: true,
                types: [
                    {
                        type: 'success',
                        background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                        icon: {
                            className: 'notyf__icon--success',
                            tagName: 'span'
                        }
                    },
                    {
                        type: 'error',
                        background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                        icon: {
                            className: 'notyf__icon--error',
                            tagName: 'span'
                        }
                    }
                ]
            })
            console.log('🔔 Enhanced notifications initialized')
        }

        // Initialize tooltips and other UI components
        this.initializeTooltips()
        
        console.log('🎨 Components initialized')
    }

    initializeTooltips() {
        // Simple tooltip system
        document.querySelectorAll('[title]').forEach(element => {
            element.addEventListener('mouseenter', (e) => {
                // Could add custom tooltip implementation here
            })
        })
    }
    
    showFallbackInterface() {
        const mainContent = document.getElementById('main-content')
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="text-center py-20">
                    <div class="text-yellow-400 text-6xl mb-4">⚠️</div>
                    <h1 class="text-3xl font-bold text-yellow-400 mb-4">Loading Error</h1>
                    <p class="text-gray-400 mb-8">Some dependencies failed to load properly</p>
                    <div class="glass-card rounded-xl p-6 max-w-md mx-auto">
                        <h3 class="text-lg font-semibold text-white mb-3">Troubleshooting:</h3>
                        <ul class="text-left text-gray-300 space-y-2 mb-4">
                            <li>• Check your internet connection</li>
                            <li>• Try refreshing the page</li>
                            <li>• Check browser console for errors</li>
                            <li>• Try using the original tracker.html</li>
                        </ul>
                        <div class="space-y-2">
                            <button onclick="location.reload()" 
                                    class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                                Reload Page
                            </button>
                            <button onclick="window.location.href='tracker.html'" 
                                    class="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg">
                                Use Original Tracker
                            </button>
                        </div>
                    </div>
                </div>
            `
        }
        
        // Still try to initialize basic functionality if possible
        this.setupFallbackNavigation()
    }
}

// Initialize app immediately when module loads (since DOM is already ready when this executes)
console.log('🔧 Main.js executing - initializing app...')

const app = new CS2TradingApp()

// Add timeout protection for app initialization
const initTimeout = setTimeout(() => {
    console.error('❌ App initialization timeout!')
    app.showFallbackInterface()
}, 8000) // 8 second timeout for app init

app.init().then(() => {
    clearTimeout(initTimeout)
    console.log('✅ App initialization completed successfully')
}).catch((error) => {
    clearTimeout(initTimeout)
    console.error('❌ App initialization failed:', error)
    app.showFallbackInterface()
})

// Make app globally available for debugging
window.CS2Tracker = app

// Make key functions globally available for onclick handlers
window.quickSell = (investmentId) => {
    if (app.store) {
        app.store.quickSell(investmentId)
    }
}

window.editCaseDrop = (caseDropId) => {
    console.log('Edit case drop:', caseDropId)
    // Could implement case drop editing modal
}

window.deleteCaseDrop = (caseDropId) => {
    if (confirm('Are you sure you want to delete this case drop?')) {
        if (app.store) {
            app.store.deleteCaseDrop(caseDropId)
            // Refresh the page or specific component
            window.location.reload()
        }
    }
}

// Make pages available globally for onclick handlers  
window.investmentsPage = null

// Main app class is now available globally as window.CS2Tracker
console.log('✅ CS2 Trading App main module loaded')