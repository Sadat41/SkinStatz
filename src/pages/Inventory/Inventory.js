// ================================================================================================
// CS2 TRADING TRACKER - INVENTORY PAGE
// ================================================================================================
// Inventory management and skin tracking with detailed analytics
// ================================================================================================

import { useAppStore } from '../../store.js'

export class InventoryPage {
    constructor() {
        // Store the useAppStore function, not a snapshot of state
        this.useAppStore = useAppStore
        
        // Create a method to get fresh store state
        this.getStore = () => this.useAppStore()
    }

    render(container, params = {}) {
        container.innerHTML = `
            <div class="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
                <div class="text-center max-w-2xl mx-auto">
                    <!-- Icon -->
                    <div class="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg">
                        <i data-lucide="package-2" class="w-12 h-12 text-white"></i>
                    </div>
                    
                    <!-- Title -->
                    <h1 class="text-4xl font-bold gradient-text mb-4">Inventory Dashboard</h1>
                    
                    <!-- Description -->
                    <p class="text-gray-400 text-lg mb-8 leading-relaxed">
                        Advanced inventory management with real-time skin tracking, value analytics, and portfolio insights.
                    </p>
                    
                    <!-- What's Coming Section -->
                    <div class="glass-card rounded-xl p-8 mb-8 text-left">
                        <h3 class="text-xl font-semibold text-white mb-6 text-center">What's Coming:</h3>
                        <div class="space-y-4">
                            <div class="flex items-center space-x-3">
                                <div class="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                    <i data-lucide="check" class="w-3 h-3 text-white"></i>
                                </div>
                                <span class="text-gray-300">Real-time inventory sync with Steam</span>
                            </div>
                            <div class="flex items-center space-x-3">
                                <div class="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                    <i data-lucide="check" class="w-3 h-3 text-white"></i>
                                </div>
                                <span class="text-gray-300">Automatic skin value tracking</span>
                            </div>
                            <div class="flex items-center space-x-3">
                                <div class="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                    <i data-lucide="check" class="w-3 h-3 text-white"></i>
                                </div>
                                <span class="text-gray-300">Portfolio performance analytics</span>
                            </div>
                            <div class="flex items-center space-x-3">
                                <div class="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                    <i data-lucide="check" class="w-3 h-3 text-white"></i>
                                </div>
                                <span class="text-gray-300">Advanced filtering and sorting</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Back to Dashboard Button -->
                    <button onclick="window.location.hash = '#/dashboard'" 
                            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2 mx-auto">
                        <i data-lucide="arrow-left" class="w-4 h-4"></i>
                        <span>Back to Dashboard</span>
                    </button>
                </div>
            </div>
        `
        
        // Call mount method after rendering
        this.mount()
    }

    mount() {
        // Initialize Lucide icons for this page
        if (typeof lucide !== 'undefined') {
            lucide.createIcons()
        }

        console.log('📦 Inventory page mounted')
    }

    unmount() {
        console.log('📦 Inventory page unmounted')
    }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { InventoryPage }
} else if (typeof window !== 'undefined') {
    window.InventoryPage = InventoryPage
}