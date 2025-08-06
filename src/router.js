// ================================================================================================
// CS2 TRADING TRACKER - CLIENT-SIDE ROUTING SYSTEM
// ================================================================================================
// Modern SPA routing for seamless navigation between trading modules
// ================================================================================================

// Page.js router available globally via CDN
console.log('🔍 Checking Page.js availability:', {
    windowPage: !!window.page,
    pageType: typeof window.page
})

const router = window.page || (() => {
    // Fallback router if page.js fails to load
    console.warn('⚠️ Page.js not found, using fallback router')
    return {
        start: () => console.log('📄 Using fallback router'),
        on: () => {},
        show: (path) => console.log('📄 Navigate to:', path)
    }
})()
// Simple store will be available globally

class CS2Router {
    constructor() {
        this.store = null // Will be set when store is available
        this.currentPage = 'dashboard'
        this.pages = {}
        this.initialized = false
    }
    
    initStore() {
        if (window.useAppStore && !this.store) {
            this.store = window.useAppStore()
            console.log('🗺️ Router connected to simple store')
        }
    }

    init() {
        if (this.initialized) return
        
        // Initialize store connection
        this.initStore()
        
        // Try simple hash-based routing instead of Page.js
        console.log('🗺️ Using simple hash router instead of Page.js')
        
        // Handle hash changes
        const handleHashChange = () => {
            const hash = window.location.hash
            console.log('🗺️ Hash changed to:', hash)
            
            if (hash === '' || hash === '#' || hash === '#/') {
                console.log('🗺️ Empty hash - showing dashboard')
                this.showPage('dashboard')
            } else if (hash === '#/dashboard') {
                console.log('🗺️ Dashboard hash - showing dashboard')
                this.showPage('dashboard')
            } else if (hash === '#/trading') {
                console.log('🗺️ Trading hash - showing trading')
                this.showPage('trading')
            } else if (hash === '#/investments') {
                console.log('🗺️ Investments hash - showing investments')
                this.showPage('investments')
            } else if (hash === '#/cases') {
                console.log('🗺️ Cases hash - showing cases')
                this.showPage('cases')
            } else if (hash === '#/inventory') {
                console.log('🗺️ Inventory hash - showing inventory')
                this.showPage('inventory')
            } else if (hash === '#/skin-explorer') {
                console.log('🗺️ Skin Explorer hash - showing skin-explorer')
                this.showPage('skin-explorer')
            } else if (hash === '#/profile') {
                console.log('🗺️ Profile hash - showing profile')
                this.showPage('profile')
            } else if (hash === '#/analytics') {
                console.log('🗺️ Analytics hash - showing analytics')
                this.showPage('analytics')
            } else {
                console.log('🗺️ Unknown hash:', hash, '- showing dashboard')
                this.showPage('dashboard')
            }
        }
        
        // Listen for hash changes
        window.addEventListener('hashchange', handleHashChange)
        
        // Handle initial hash
        handleHashChange()
        
        this.initialized = true
        console.log('🗺️ Simple hash router initialized')
    }

    async showPage(pageName, params = {}) {
        try {
            console.log(`🗺️ Router showPage called: ${pageName}`)
            
            // Ensure store is connected
            this.initStore()
            
            // Update store if available
            if (this.store) {
                this.store.setCurrentPage(pageName)
                console.log(`✅ Store updated with current page: ${pageName}`)
            } else {
                console.warn('⚠️ Store not available in router')
            }
            
            // Show loading state
            this.showLoadingState()
            
            // Load page module if not already loaded
            if (!this.pages[pageName]) {
                console.log(`📦 Loading page module: ${pageName}`)
                await this.loadPageModule(pageName)
            }
            
            // Show the requested page
            await this.displayPage(pageName, params)
            
            // Update navigation state
            this.updateNavigation(pageName)
            
            console.log(`✅ Successfully showed page: ${pageName}`)
            
        } catch (error) {
            console.error(`❌ Failed to show page ${pageName}:`, error)
            console.error('Error details:', error.stack)
            this.showErrorPage(error)
        }
    }

    hideAllPages() {
        const pages = [
            'dashboard-content',
            'trading-content', 
            'investments-content',
            'cases-content',
            'inventory-content',
            'skin-explorer-content',
            'profile-content',
            'analytics-content'
        ]
        
        pages.forEach(pageId => {
            const element = document.getElementById(pageId)
            if (element) {
                element.style.display = 'none'
                element.classList.remove('active')
            }
        })
    }

    showLoadingState() {
        const mainContent = document.getElementById('main-content')
        if (mainContent) {
            mainContent.classList.add('loading')
        }
    }

    hideLoadingState() {
        const mainContent = document.getElementById('main-content')
        if (mainContent) {
            mainContent.classList.remove('loading')
        }
    }

    async loadPageModule(pageName) {
        try {
            switch (pageName) {
                case 'dashboard':
                    // Load the actual Dashboard module
                    console.log('📦 Loading Dashboard module...')
                    const { DashboardPage } = await import('./pages/Dashboard/Dashboard.js')
                    this.pages.dashboard = new DashboardPage()
                    break
                    
                case 'trading':
                    // Load the actual Trading module
                    console.log('📦 Loading Trading module...')
                    const { TradingPage } = await import('./pages/Trading/Trading.js')
                    this.pages.trading = new TradingPage()
                    break
                    
                case 'investments':
                    // Load the actual Investments module
                    console.log('📦 Loading Investments module...')
                    const { InvestmentsPage } = await import('./pages/Investments/Investments.js')
                    this.pages.investments = new InvestmentsPage()
                    break
                    
                case 'cases':
                    // Load actual Cases page
                    console.log('📦 Loading Cases page...')
                    const { CasesPage } = await import('./pages/Cases/Cases.js')
                    this.pages.cases = new CasesPage()
                    break

                case 'inventory':
                    // Load Inventory page
                    console.log('📦 Loading Inventory page...')
                    const { InventoryPage } = await import('./pages/Inventory/Inventory.js')
                    this.pages.inventory = new InventoryPage()
                    break

                case 'skin-explorer':
                    // Load Skin Explorer page
                    console.log('📦 Loading Skin Explorer page...')
                    const { SkinExplorerPage } = await import('./pages/SkinExplorer/SkinExplorer.js')
                    this.pages['skin-explorer'] = new SkinExplorerPage()
                    break

                case 'profile':
                    // Load Profile page
                    console.log('📦 Loading Profile page...')
                    const { ProfilePage } = await import('./pages/Profile/Profile.js')
                    this.pages.profile = new ProfilePage()
                    break
                    
                case 'analytics':
                    // Placeholder for analytics
                    console.log('📦 Loading Analytics placeholder...')
                    this.pages.analytics = {
                        render: (container) => {
                            container.innerHTML = this.getPlaceholderHTML('Advanced Analytics', 'Market intelligence features coming soon...')
                        }
                    }
                    break
                    
                default:
                    throw new Error(`Unknown page: ${pageName}`)
            }
            
            console.log(`📦 Loaded module: ${pageName}`)
            
        } catch (error) {
            console.error(`❌ Failed to load module ${pageName}:`, error)
            console.error('Module loading error details:', error.stack)
            // Fallback to placeholder on module load error
            this.pages[pageName] = {
                render: (container) => {
                    container.innerHTML = this.getErrorPlaceholderHTML(pageName, error)
                }
            }
        }
    }

    getPlaceholderHTML(title, description) {
        return `
            <div class="text-center py-20">
                <div class="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                    <i data-lucide="construction" class="w-12 h-12 text-white"></i>
                </div>
                <h1 class="text-3xl font-bold gradient-text mb-4">${title}</h1>
                <p class="text-gray-400 text-lg mb-8">${description}</p>
                <div class="glass-card rounded-xl p-6 max-w-md mx-auto">
                    <h3 class="text-lg font-semibold text-white mb-3">What's Coming:</h3>
                    <ul class="text-left text-gray-300 space-y-2">
                        <li class="flex items-center gap-2">
                            <i data-lucide="check" class="w-4 h-4 text-green-400"></i>
                            Professional interface design
                        </li>
                        <li class="flex items-center gap-2">
                            <i data-lucide="check" class="w-4 h-4 text-green-400"></i>
                            Advanced analytics and charts
                        </li>
                        <li class="flex items-center gap-2">
                            <i data-lucide="check" class="w-4 h-4 text-green-400"></i>
                            Real-time data integration
                        </li>
                        <li class="flex items-center gap-2">
                            <i data-lucide="check" class="w-4 h-4 text-green-400"></i>
                            CS2-specific optimizations
                        </li>
                    </ul>
                </div>
                <div class="mt-8">
                    <button onclick="window.location.hash = '/dashboard'" 
                            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition font-semibold">
                        <i data-lucide="arrow-left" class="w-4 h-4 inline mr-2"></i>
                        Back to Dashboard
                    </button>
                </div>
            </div>
        `
    }

    getErrorPlaceholderHTML(pageName, error) {
        return `
            <div class="text-center py-20">
                <div class="text-red-400 text-6xl mb-4">⚠️</div>
                <h1 class="text-3xl font-bold text-red-400 mb-4">Module Load Error</h1>
                <p class="text-gray-400 text-lg mb-4">Failed to load ${pageName} module</p>
                <div class="glass-card rounded-xl p-6 max-w-md mx-auto">
                    <h3 class="text-lg font-semibold text-white mb-3">Error Details:</h3>
                    <p class="text-gray-300 text-sm mb-4">${error.message}</p>
                    <div class="space-y-2">
                        <button onclick="location.reload()" 
                                class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                            Reload and Try Again
                        </button>
                        <button onclick="window.location.hash = '#/dashboard'" 
                                class="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg">
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        `
    }


    async displayPage(pageName, params) {
        console.log(`📄 Displaying page: ${pageName}`)
        
        const mainContent = document.getElementById('main-content')
        if (!mainContent) {
            console.error('❌ main-content element not found')
            return
        }
        
        // Clear initial loading indicator if it exists
        const initialLoading = document.getElementById('initial-loading')
        if (initialLoading) {
            initialLoading.style.display = 'none'
        }
        
        // Clear all existing content from main-content
        mainContent.innerHTML = ''
        
        // Create page container
        const pageElement = document.createElement('div')
        pageElement.id = `${pageName}-content`
        pageElement.className = 'page-content active'
        
        // Initialize the page
        if (this.pages[pageName] && typeof this.pages[pageName].render === 'function') {
            console.log(`✅ Rendering ${pageName} page`)
            await this.pages[pageName].render(pageElement, params)
        } else {
            console.warn(`⚠️ No render function for page: ${pageName}`)
            pageElement.innerHTML = `<div class="text-center py-20"><h1>Page not found: ${pageName}</h1></div>`
        }
        
        // Add page to main content
        mainContent.appendChild(pageElement)
        
        // Hide loading state
        this.hideLoadingState()
        
        // Update page title and navigation
        this.updatePageTitle(pageName)
        
        // Initialize Lucide icons after content is rendered
        if (typeof lucide !== 'undefined') {
            lucide.createIcons()
        }
        
        console.log(`✅ Page ${pageName} displayed successfully`)
    }

    updateNavigation(pageName) {
        // Update active navigation item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active')
        })
        
        const activeNavItem = document.querySelector(`[data-page="${pageName}"]`)
        if (activeNavItem) {
            activeNavItem.classList.add('active')
        }
    }

    updatePageTitle(pageName) {
        const titles = {
            dashboard: 'CS2 Trading Dashboard',
            trading: 'Trading Performance',
            investments: 'Long Term Investments',
            cases: 'Track Weekly Drops',
            inventory: 'Inventory Management',
            'skin-explorer': 'Skin Explorer',
            profile: 'User Profile',
            analytics: 'Advanced Analytics'
        }
        
        document.title = `${titles[pageName] || 'Dashboard'} | SkinStatz`
    }

    showErrorPage(error) {
        const errorHtml = `
            <div class="error-page glass-card rounded-2xl p-8 text-center">
                <div class="text-red-400 text-6xl mb-4">⚠️</div>
                <h2 class="text-2xl font-bold text-red-400 mb-4">Page Load Error</h2>
                <p class="text-gray-300 mb-6">${error.message}</p>
                <button onclick="window.location.reload()" 
                        class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
                    Reload Page
                </button>
            </div>
        `
        
        const mainContent = document.getElementById('main-content')
        if (mainContent) {
            mainContent.innerHTML = errorHtml
        }
        
        this.hideLoadingState()
    }

    navigate(path) {
        console.log(`🗺️ Manual navigate called: ${path}`)
        // Simple hash navigation
        window.location.hash = '#' + path
    }

    getCurrentPage() {
        return this.currentPage
    }

    // Navigation helper methods
    goToDashboard() { this.navigate('/dashboard') }
    goToTrading(tab = 'holdings') { this.navigate(`/trading/${tab}`) }
    goToInvestments(category = null) { 
        this.navigate(category ? `/investments/${category}` : '/investments') 
    }
    goToCases() { this.navigate('/cases') }
    goToAnalytics() { this.navigate('/analytics') }
}

// Create singleton instance
const cs2Router = new CS2Router()

// Make router globally available for script tag loading
window.CS2Router = cs2Router

// Also make router class available for manual instantiation if needed
window.CS2RouterClass = CS2Router

// Make router instance immediately available
window.router = cs2Router

console.log('🗺️ CS2 Router initialized and available globally')
console.log('🔍 Available global router objects:', {
    CS2Router: typeof window.CS2Router,
    CS2RouterClass: typeof window.CS2RouterClass,
    router: typeof window.router
})