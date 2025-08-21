// ================================================================================================
// CS2 TRADING TRACKER - CASE DROPS PAGE
// ================================================================================================
// Case Drop Analytics with hierarchical year/month/week organization
// Enhanced with features from the old tracker implementation
// Supports Wednesday-to-Tuesday week cycles, hierarchical navigation, and comprehensive analytics
// ================================================================================================

import { useAppStore } from '../../store.js'
import { priceService } from '../../services/PriceService.js'

export class CasesPage {
    constructor() {
        // Store the useAppStore function, not a snapshot of state
        this.useAppStore = useAppStore
        
        // Create a method to get fresh store state
        this.getStore = () => this.useAppStore()
        
        // Ensure formatNumber method is available (fallback if needed)
        const currentStore = this.getStore()
        if (!currentStore.formatNumber) {
            // Add formatNumber to the initial store if missing
            this.formatNumber = (num, decimals = 2) => {
                if (typeof num !== 'number') return '0.00'
                return num.toLocaleString('en-US', {
                    minimumFractionDigits: decimals,
                    maximumFractionDigits: decimals
                })
            }
        } else {
            this.formatNumber = currentStore.formatNumber
        }
        
        this.currentYear = null
        this.currentMonth = null
        this.currentWeek = null
        this.editingCaseDrop = null
        this.pendingDeleteId = null
        
        // Chart colors from old tracker
        this.chartColors = {
            primary: '#667eea',
            success: '#22c55e',
            danger: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6',
            secondary: '#8b5cf6'
        }
        
        // Chart instances
        this.charts = {
            weeklyDistribution: null
        }
    }

    async render(container, params = {}) {
        try {
            const state = this.getStore()
            const caseDropStats = this.calculateCaseDropStats(state)
            
            container.innerHTML = this.getHTML(caseDropStats, state)
            
            // Setup event listeners
            this.setupEventListeners()
            
            // Initialize UI state - delay to ensure DOM is ready
            setTimeout(() => {
                console.log('🔄 Initializing UI state...')
                const initState = this.getStore()
                this.renderYearTabs()
                this.initializeYearMonthWeek()
                
                // Re-setup event listeners after DOM is fully ready
                this.setupEventListenersDelayed()
            }, 100)
            
            // Initialize charts if Chart.js is available
            this.initializeCharts()
            
            // Set default date in the form
            this.setDefaultDropDate()
            
            // Fetch prices for all case drops
            this.fetchAllCaseDropPrices().catch(error => {
                console.error('Initial price fetching failed:', error)
            })
            
            // Force update header stats after initial render  
            setTimeout(() => {
                const state = this.getStore()
                const stats = this.calculateCaseDropStats(state)
                this.updateHeaderStats(stats)
                console.log('🔄 Forced header stats update on page load')
                
                // Fix any corrupted dates on page load
                this.fixCorruptedDates()
            }, 1000)
            
            
            // Initialize icons
            if (typeof lucide !== 'undefined') {
                lucide.createIcons()
            }
            
            console.log('📦 Case Drops page rendered with enhanced features')
            
        } catch (error) {
            console.error('❌ Failed to render case drops page:', error)
            container.innerHTML = this.getErrorHTML(error)
        }
    }

    calculateCaseDropStats(state) {
        // Calculate comprehensive case drop statistics
        const caseDrops = state.caseDrops || []
        const years = state.years || []
        
        const totalCases = caseDrops.length
        const totalValue = caseDrops.reduce((sum, drop) => sum + (drop.price || 0), 0)
        const avgValue = totalCases > 0 ? totalValue / totalCases : 0
        
        // Weekly statistics for current selection
        const currentWeekStats = this.getCurrentWeekStats()
        
        // Account distribution
        const accountStats = this.calculateAccountStats(caseDrops)
        
        // Recent activity (last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000))
        const recentCases = caseDrops.filter(drop => {
            const dateStr = drop.dropDate || drop.date
            if (!dateStr) return false
            const isoDate = this.convertFormattedToISODate(dateStr)
            const dropDate = new Date(isoDate)
            return dropDate >= thirtyDaysAgo
        })
        
        // This week's activity - use the same logic as Week Summary
        const thisWeekStats = this.getCurrentWeekStats()
        const thisWeekCases = thisWeekStats.caseDrops || []
        
        console.log('📊 This week calculation (using getCurrentWeekStats):', {
            currentWeek: this.currentWeek,
            thisWeekCount: thisWeekCases.length,
            totalCases: caseDrops.length,
            thisWeekStats: thisWeekStats
        })
        
        return {
            totalCases,
            totalValue,
            avgValue,
            years,
            caseDrops,
            currentWeekStats,
            accountStats,
            recentActivity: {
                cases: recentCases.length,
                value: recentCases.reduce((sum, drop) => sum + (drop.price || 0), 0)
            },
            thisWeekActivity: {
                cases: thisWeekCases.length,
                value: thisWeekCases.reduce((sum, drop) => sum + (drop.price || 0), 0)
            }
        }
    }

    getHTML(stats, state) {
        console.log('📊 getHTML called with stats:', {
            totalCases: stats.totalCases,
            thisWeekCases: stats.thisWeekActivity?.cases,
            recentActivityCases: stats.recentActivity?.cases
        })
        
        return `
            <!-- Track Weekly Drops Card -->
            <section class="bg-gray-900 border border-gray-700 p-4 mb-6">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-6">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                                <i data-lucide="package" class="w-5 h-5 text-white"></i>
                            </div>
                            <h2 class="text-white font-semibold text-lg">Track Weekly Drops</h2>
                            <span class="bg-gradient-to-r from-green-500 to-blue-600 text-white text-xs px-2 py-1 rounded-full">
                                Live Tracking
                            </span>
                        </div>
                        
                        <!-- Summary Metrics -->
                        <div class="flex items-center gap-6 text-sm">
                            <div class="flex items-center gap-2">
                                <span class="text-gray-400">Total Drops:</span>
                                <span class="text-white font-semibold" id="header-total-drops">${stats.totalCases || 0}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="text-gray-400">Total Value:</span>
                                <span class="text-green-400 font-semibold" id="header-total-value">$${this.formatNumber(stats.totalValue || 0)}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="text-gray-400">This Week:</span>
                                <span class="text-blue-400 font-semibold" id="header-weekly-count">${stats.thisWeekActivity?.cases || 0}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-3">
                        <div class="flex items-center gap-2">
                            <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span class="text-green-400 text-sm font-medium">Active</span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Main Navigation Tabs -->
            <div class="flex items-center px-6 mb-6">
                <button id="overview-tab" class="trading-tab active flex-1 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition flex items-center justify-center gap-2 rounded-l-lg">
                    <i data-lucide="grid-3x3" class="w-4 h-4"></i>
                    Overview
                </button>
                <button id="analytics-tab" class="trading-tab flex-1 px-6 py-3 text-sm font-semibold text-gray-300 bg-gray-800 hover:bg-gray-700 transition flex items-center justify-center gap-2 rounded-r-lg">
                    <i data-lucide="bar-chart-3" class="w-4 h-4"></i>
                    Analytics
                </button>
            </div>

            <!-- Overview Tab Content -->
            <div id="overview-content" class="tab-content">

            <!-- Time Navigation -->
            <div class="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-6" style="position: relative; z-index: 1;">
                <div class="flex items-center justify-between mb-6">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                            <i data-lucide="calendar" class="w-4 h-4 text-white"></i>
                        </div>
                        <h3 class="text-lg font-semibold text-gray-100">Time Navigation</h3>
                    </div>
                    <button id="add-new-year-btn" class="group relative bg-gray-900 hover:bg-gradient-to-r hover:from-green-500 hover:to-emerald-600 text-gray-300 hover:text-white px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 text-sm font-medium overflow-hidden">
                        <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 p-0.5">
                            <div class="w-full h-full bg-gray-900 rounded-xl group-hover:bg-transparent transition-colors duration-300"></div>
                        </div>
                        <i data-lucide="plus" class="w-4 h-4 relative z-10"></i>
                        <span class="relative z-10">Add New Year</span>
                    </button>
                </div>
                
                <!-- Year Selector -->
                <div class="mb-6" id="year-selector-container">
                    <div class="flex items-center space-x-4 mb-3">
                        <div class="flex items-center gap-2 text-sm">
                            <i data-lucide="calendar-days" class="w-4 h-4 text-gray-400"></i>
                            <span class="text-gray-300 font-medium">Year:</span>
                        </div>
                        <div class="flex space-x-2" id="year-tabs">
                            <!-- Year tabs will be populated here -->
                        </div>
                    </div>
                </div>

                <!-- Month Selector -->
                <div class="mb-6 hidden relative" id="month-selector-container">
                    <div class="flex items-center space-x-4 mb-3">
                        <div class="flex items-center gap-2 text-sm">
                            <i data-lucide="calendar-range" class="w-4 h-4 text-gray-400"></i>
                            <span class="text-gray-300 font-medium">Month:</span>
                        </div>
                        <div class="relative inline-block">
                            <button id="month-dropdown-btn" class="bg-gray-700 border border-gray-600 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition font-medium flex items-center gap-2 min-w-[140px] justify-between">
                                <span id="selected-month-text">Select Month</span>
                                <i data-lucide="chevron-down" class="w-4 h-4"></i>
                            </button>
                            <div id="month-dropdown-menu" class="hidden bg-gray-800 border border-gray-600 rounded-lg shadow-xl w-40 max-h-64 overflow-y-auto absolute top-full left-0 mt-1" style="z-index: 999999 !important;">
                                <!-- Month options will be populated here -->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Week Selector -->
                <div class="hidden" id="week-selector-container">
                    <div class="flex items-center space-x-4 mb-3">
                        <div class="flex items-center gap-2 text-sm">
                            <i data-lucide="calendar-check" class="w-4 h-4 text-gray-400"></i>
                            <span class="text-gray-300 font-medium">Week:</span>
                        </div>
                        <div class="flex space-x-2 overflow-x-auto" id="week-tabs">
                            <!-- Week tabs will be populated here -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- Add Case Drop Form -->
            <div class="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-6" id="case-drop-form-container">
                <div class="flex items-center gap-3 mb-6">
                    <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                        <i data-lucide="plus" class="w-4 h-4 text-white"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold text-gray-100">Add New Drop</h3>
                        <p class="text-gray-500 text-sm">Track your CS2 drops with precision</p>
                    </div>
                </div>
                
                <form id="case-drop-form">
                    <!-- First Row - Case Details -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <!-- Item Name -->
                        <div class="group">
                            <label class="block text-gray-300 text-sm font-medium mb-3 flex items-center gap-2">
                                <i data-lucide="package" class="w-4 h-4 text-blue-400"></i>
                                Item Name
                            </label>
                            <div class="relative">
                                <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 p-0.5 opacity-50 group-focus-within:opacity-100 transition-opacity duration-200">
                                    <div class="w-full h-full bg-gray-900 rounded-xl"></div>
                                </div>
                                <input type="text" id="case-name" placeholder="AK-47 | Redline (FT)" 
                                    class="relative z-10 w-full bg-transparent text-white px-4 py-3 rounded-xl focus:outline-none transition-colors duration-200" required>
                            </div>
                        </div>
                        
                        <!-- Account -->
                        <div class="group">
                            <label class="block text-gray-300 text-sm font-medium mb-3 flex items-center gap-2">
                                <i data-lucide="user" class="w-4 h-4 text-purple-400"></i>
                                Account
                            </label>
                            <div class="relative">
                                <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 p-0.5 opacity-50 group-focus-within:opacity-100 transition-opacity duration-200">
                                    <div class="w-full h-full bg-gray-900 rounded-xl"></div>
                                </div>
                                <input type="text" id="case-account" placeholder="e.g., Main" 
                                        class="relative z-10 w-full bg-transparent text-white px-4 py-3 rounded-xl focus:outline-none transition-colors duration-200" required>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Second Row - Transaction Details -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <!-- Drop Date -->
                        <div class="group">
                            <label class="block text-gray-300 text-sm font-medium mb-3 flex items-center gap-2">
                                <i data-lucide="calendar" class="w-5 h-5 text-green-300"></i>
                                Drop Date
                            </label>
                            <div class="relative">
                                <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 p-0.5 opacity-50 group-focus-within:opacity-100 transition-opacity duration-200">
                                    <div class="w-full h-full bg-gray-900 rounded-xl"></div>
                                </div>
                                <div class="flex items-center gap-2 relative z-10">
                                    <input type="text" id="drop-date" placeholder="dd/mm/yyyy" value="${this.getTodayFormatted()}"
                                            class="flex-1 bg-transparent text-white px-4 py-3 rounded-xl focus:outline-none transition-colors duration-200" required>
                                    <input type="date" id="drop-date-picker" value="${this.getTodayISO()}"
                                            class="absolute opacity-0 pointer-events-none" tabindex="-1">
                                    <button type="button" onclick="document.getElementById('drop-date-picker').showPicker(); event.preventDefault();"
                                            class="p-2 text-gray-400 hover:text-white transition-colors duration-200" title="Open calendar">
                                        <i data-lucide="calendar" class="w-4 h-4"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Price -->
                        <div class="group">
                            <label class="block text-gray-300 text-sm font-medium mb-3 flex items-center gap-2">
                                <i data-lucide="dollar-sign" class="w-4 h-4 text-orange-400"></i>
                                Price
                            </label>
                            <div class="relative">
                                <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 p-0.5 opacity-50 group-focus-within:opacity-100 transition-opacity duration-200">
                                    <div class="w-full h-full bg-gray-900 rounded-xl"></div>
                                </div>
                                <span class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 z-20">$</span>
                                <input type="number" id="case-price" placeholder="0.00" step="0.01" min="0"
                                       class="relative z-10 w-full bg-transparent text-white pl-8 pr-20 py-3 rounded-xl focus:outline-none transition-colors duration-200">
                                <span class="absolute right-4 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 z-20">Market Price</span>
                            </div>
                        </div>
                    </div>
                </form>
                
                <div class="mt-6 flex justify-center">
                    <button id="add-case-drop-btn" class="group relative bg-gray-900 hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-600 text-gray-300 hover:text-white font-semibold py-3 px-8 rounded-xl transition-all duration-300 flex items-center gap-2 min-w-[180px] justify-center overflow-hidden border border-gray-700 hover:border-transparent">
                        <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 p-0.5">
                            <div class="w-full h-full bg-gray-900 rounded-xl group-hover:bg-transparent transition-colors duration-300"></div>
                        </div>
                        <i data-lucide="plus" class="w-4 h-4 relative z-10"></i>
                        <span class="relative z-10">Add Drop</span>
                    </button>
                </div>
            </div>

            <!-- Current Week Summary -->
            <div class="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-6 hidden" id="week-summary-container">
                <div class="flex items-center gap-3 mb-6">
                    <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg">
                        <i data-lucide="trending-up" class="w-4 h-4 text-white"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold text-gray-100">Week Summary</h3>
                        <p class="text-gray-500 text-sm">Weekly performance metrics</p>
                    </div>
                </div>
                
                <!-- Week Metrics Grid -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div class="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
                        <div class="flex items-center justify-between mb-2">
                            <i data-lucide="package" class="w-5 h-5 text-blue-400"></i>
                            <span class="text-xs text-blue-300 bg-blue-900/20 px-2 py-1 rounded-full">Total</span>
                        </div>
                        <div class="text-2xl font-bold text-white mb-1" id="week-total-cases">0</div>
                        <div class="text-sm text-gray-400">Drops</div>
                    </div>
                    
                    <div class="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
                        <div class="flex items-center justify-between mb-2">
                            <i data-lucide="dollar-sign" class="w-5 h-5 text-green-400"></i>
                            <span class="text-xs text-green-300 bg-green-900/20 px-2 py-1 rounded-full">Value</span>
                        </div>
                        <div class="text-2xl font-bold text-green-400 mb-1" id="week-total-value">$0.00</div>
                        <div class="text-sm text-gray-400">Total Value</div>
                    </div>
                    
                    <div class="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
                        <div class="flex items-center justify-between mb-2">
                            <i data-lucide="bar-chart" class="w-5 h-5 text-purple-400"></i>
                            <span class="text-xs text-purple-300 bg-purple-900/20 px-2 py-1 rounded-full">Average</span>
                        </div>
                        <div class="text-2xl font-bold text-purple-400 mb-1" id="week-avg-value">$0.00</div>
                        <div class="text-sm text-gray-400">Avg Value</div>
                    </div>
                    
                    <div class="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
                        <div class="flex items-center justify-between mb-2">
                            <i data-lucide="calendar" class="w-5 h-5 text-orange-400"></i>
                            <span class="text-xs text-orange-300 bg-orange-900/20 px-2 py-1 rounded-full">Period</span>
                        </div>
                        <div class="text-lg font-bold text-orange-400 mb-1" id="week-period">No Week Selected</div>
                        <div class="text-sm text-gray-400">Week Period</div>
                    </div>
                </div>
                
                <div id="week-content">
                    <!-- Week content will be populated here -->
                </div>
            </div>

            <!-- Case Drops History Card -->
            <section class="bg-gray-900 border border-gray-700 rounded-2xl p-6 mb-6">
                <div class="flex items-center justify-between mb-6">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                            <i data-lucide="history" class="w-4 h-4 text-white"></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-semibold text-white">Item Drop History</h3>
                            <p class="text-gray-400 text-sm">All tracked Drops</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <button id="export-cases-csv-btn" class="group relative bg-gray-900 hover:bg-gradient-to-r hover:from-gray-500 hover:to-slate-600 text-gray-300 hover:text-white px-3 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 overflow-hidden">
                            <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-gray-500 to-slate-600 p-0.5">
                                <div class="w-full h-full bg-gray-900 rounded-xl group-hover:bg-transparent transition-colors duration-300"></div>
                            </div>
                            <i data-lucide="download" class="w-4 h-4 relative z-10"></i>
                            <span class="relative z-10">CSV</span>
                        </button>
                        <button id="export-cases-excel-btn" class="group relative bg-gray-900 hover:bg-gradient-to-r hover:from-green-500 hover:to-emerald-600 text-gray-300 hover:text-white px-3 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 overflow-hidden">
                            <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 p-0.5">
                                <div class="w-full h-full bg-gray-900 rounded-xl group-hover:bg-transparent transition-colors duration-300"></div>
                            </div>
                            <i data-lucide="file-spreadsheet" class="w-4 h-4 relative z-10"></i>
                            <span class="relative z-10">Excel</span>
                        </button>
                        <button id="import-cases-csv-btn" class="group relative bg-gray-900 hover:bg-gradient-to-r hover:from-blue-500 hover:to-blue-600 text-gray-300 hover:text-white px-3 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 overflow-hidden">
                            <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 p-0.5">
                                <div class="w-full h-full bg-gray-900 rounded-xl group-hover:bg-transparent transition-colors duration-300"></div>
                            </div>
                            <i data-lucide="upload" class="w-4 h-4 relative z-10"></i>
                            <span class="relative z-10">Import</span>
                        </button>
                        <button id="clear-cases-btn" class="group relative bg-gray-900 hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 text-gray-300 hover:text-white px-3 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 overflow-hidden">
                            <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-red-500 to-red-600 p-0.5">
                                <div class="w-full h-full bg-gray-900 rounded-xl group-hover:bg-transparent transition-colors duration-300"></div>
                            </div>
                            <i data-lucide="trash-2" class="w-4 h-4 relative z-10"></i>
                            <span class="relative z-10">Clear</span>
                        </button>
                    </div>
                </div>

                <div id="case-drops-content">
                    ${this.getFilteredCaseDropsTableHTML(stats, state)}
                </div>
            </section>
            </div>

            <!-- Analytics Tab Content -->
            <div id="analytics-content" class="tab-content hidden">
                <!-- Analytics Overview Section -->
                <div class="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-6">
                    <div class="flex items-center gap-3 mb-6">
                        <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                            <i data-lucide="bar-chart-3" class="w-4 h-4 text-white"></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-semibold text-gray-100">Analytics Overview</h3>
                            <p class="text-gray-500 text-sm">Performance metrics and statistics</p>
                        </div>
                    </div>

                    <!-- Case Drop Overview Statistics -->
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div class="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
                            <div class="flex items-center justify-between mb-2">
                                <i data-lucide="package" class="w-5 h-5 text-blue-400"></i>
                                <span class="text-xs text-blue-300 bg-blue-900/20 px-2 py-1 rounded-full">Total</span>
                            </div>
                            <div id="analytics-total-cases" class="text-2xl font-bold text-white mb-1">${stats.totalCases}</div>
                            <div class="text-sm text-gray-400">Item Drops</div>
                        </div>

                        <div class="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
                            <div class="flex items-center justify-between mb-2">
                                <i data-lucide="dollar-sign" class="w-5 h-5 text-green-400"></i>
                                <span class="text-xs text-green-300 bg-green-900/20 px-2 py-1 rounded-full">Value</span>
                            </div>
                            <div id="analytics-total-value" class="text-2xl font-bold text-green-400 mb-1">$${this.formatNumber(stats.totalValue)}</div>
                            <div class="text-sm text-gray-400">Total Value</div>
                        </div>

                        <div class="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
                            <div class="flex items-center justify-between mb-2">
                                <i data-lucide="bar-chart" class="w-5 h-5 text-purple-400"></i>
                                <span class="text-xs text-purple-300 bg-purple-900/20 px-2 py-1 rounded-full">Average</span>
                            </div>
                            <div id="analytics-avg-value" class="text-2xl font-bold text-purple-400 mb-1">$${this.formatNumber(stats.avgValue)}</div>
                            <div class="text-sm text-gray-400">Avg Value</div>
                        </div>

                        <div class="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
                            <div class="flex items-center justify-between mb-2">
                                <i data-lucide="activity" class="w-5 h-5 text-orange-400"></i>
                                <span class="text-xs text-orange-300 bg-orange-900/20 px-2 py-1 rounded-full">Recent</span>
                            </div>
                            <div id="analytics-recent-cases" class="text-2xl font-bold text-orange-400 mb-1">${stats.recentActivity.cases}</div>
                            <div class="text-sm text-gray-400">Last 30 Days</div>
                        </div>
                    </div>
                </div>
                
                <!-- Charts and Analytics Section -->
                <div class="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-6">
                    <div class="flex items-center gap-3 mb-6">
                        <div class="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                            <i data-lucide="trending-up" class="w-4 h-4 text-white"></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-semibold text-gray-100">Data Visualization</h3>
                            <p class="text-gray-500 text-sm">Charts and distribution analysis</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div class="bg-gray-900 border border-gray-700 rounded-xl p-4">
                            <h4 class="text-md font-medium text-white mb-4 flex items-center gap-2">
                                <i data-lucide="calendar" class="w-4 h-4 text-blue-400"></i>
                                Weekly Distribution
                            </h4>
                            <div class="chart-container">
                                <canvas id="weeklyDistributionChart" class="w-full h-64"></canvas>
                            </div>
                        </div>
                        <div class="bg-gray-900 border border-gray-700 rounded-xl p-4">
                            <h4 class="text-md font-medium text-white mb-4 flex items-center gap-2">
                                <i data-lucide="users" class="w-4 h-4 text-green-400"></i>
                                Account Statistics
                            </h4>
                            <div style="max-height: 300px;" class="overflow-y-auto">
                                <div id="account-stats-content">
                                    ${this.getAccountStatsHTML(stats.accountStats, state)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Additional Analytics Section -->
                <div class="bg-gray-900 border border-gray-700 rounded-xl p-6">
                    <div class="flex items-center gap-3 mb-6">
                        <div class="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center shadow-lg">
                            <i data-lucide="pie-chart" class="w-4 h-4 text-white"></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-semibold text-gray-100">Advanced Analytics</h3>
                            <p class="text-gray-500 text-sm">Detailed trends and performance metrics</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div class="bg-gray-900 border border-gray-700 rounded-xl p-4">
                            <h4 class="text-md font-medium text-white mb-4 flex items-center gap-2">
                                <i data-lucide="trending-up" class="w-4 h-4 text-orange-400"></i>
                                Monthly Trends
                            </h4>
                            <div class="chart-container">
                                <canvas id="monthlyTrendsChart" class="w-full h-48"></canvas>
                            </div>
                        </div>
                        <div class="bg-gray-900 border border-gray-700 rounded-xl p-4">
                            <h4 class="text-md font-medium text-white mb-4 flex items-center gap-2">
                                <i data-lucide="bar-chart-2" class="w-4 h-4 text-purple-400"></i>
                                Price Distribution
                            </h4>
                            <div class="chart-container">
                                <canvas id="priceDistributionChart" class="w-full h-48"></canvas>
                            </div>
                        </div>
                        <div class="bg-gray-900 border border-gray-700 rounded-xl p-4">
                            <h4 class="text-md font-medium text-white mb-4 flex items-center gap-2">
                                <i data-lucide="target" class="w-4 h-4 text-green-400"></i>
                                Performance Metrics
                            </h4>
                            <div id="performance-metrics" class="space-y-3">
                                <div class="flex justify-between items-center">
                                    <span class="text-gray-300">Total Items</span>
                                    <span class="text-blue-400 font-semibold">${stats.totalCases || 0}</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-gray-300">Average Value</span>
                                    <span class="text-green-400 font-semibold">$${stats.avgValue || '0.00'}</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-gray-300">Total Value</span>
                                    <span class="text-purple-400 font-semibold">$${stats.totalValue || '0.00'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Add New Year Modal -->
            <div id="add-year-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50">
                <div class="glass-card rounded-2xl p-6 max-w-md w-full mx-4">
                    <h3 class="text-xl font-bold gradient-text mb-4">Add New Year</h3>
                    <form id="add-year-form">
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-2">Year</label>
                                <input type="number" id="new-year-input" placeholder="2025" min="2020" max="2050" class="input-field w-full px-3 py-2 rounded-lg text-white outline-none" required>
                            </div>
                            <div class="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-3">
                                <div class="flex items-start gap-2">
                                    <i data-lucide="alert-triangle" class="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0"></i>
                                    <div class="text-sm text-yellow-200">This will auto-generate all 12 months and ~52 weeks</div>
                                </div>
                            </div>
                            <div class="bg-blue-900/20 border border-blue-600/30 rounded-lg p-3">
                                <div class="flex items-start gap-2">
                                    <i data-lucide="calendar" class="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0"></i>
                                    <div class="text-sm text-blue-200">Weeks run Wednesday to Tuesday</div>
                                </div>
                            </div>
                        </div>
                        <div class="flex space-x-4 mt-6">
                            <button type="submit" class="bg-green-600 hover:bg-green-700 flex-1 text-white font-semibold py-2 px-4 rounded-lg transition">
                                Create Year
                            </button>
                            <button type="button" id="cancel-add-year" class="bg-gray-600 hover:bg-gray-700 flex-1 text-white font-semibold py-2 px-4 rounded-lg transition">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Edit Case Drop Modal -->
            <div id="editCaseDropModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 hidden flex items-center justify-center p-4">
                <div class="glass-card rounded-2xl p-6 w-full max-w-md">
                    <div class="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-t-2xl -m-6 mb-6">
                        <h3 class="text-2xl font-bold text-white">Edit Case Drop</h3>
                        <p class="text-blue-100 text-sm">Update your case drop details</p>
                    </div>
                    <form id="editCaseDropForm">
                        <div class="space-y-4">
                            <!-- Item Name -->
                            <div class="group">
                                <label class="block text-sm font-semibold text-gray-300 mb-2 group-focus-within:text-blue-400 transition-colors">
                                    <i data-lucide="package" class="w-4 h-4 inline mr-2"></i>
                                    Item Name
                                </label>
                                <input type="text" id="editCaseItemName" 
                                       class="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200" 
                                       placeholder="Enter case name" required>
                            </div>
                            
                            <!-- Drop Date -->
                            <div class="group">
                                <label class="block text-sm font-semibold text-gray-300 mb-2 group-focus-within:text-blue-400 transition-colors">
                                    <i data-lucide="calendar" class="w-4 h-4 inline mr-2"></i>
                                    Drop Date
                                </label>
                                <div class="relative">
                                    <input type="text" id="editCaseDropDate" 
                                           placeholder="dd/mm/yyyy" pattern="\\d{2}/\\d{2}/\\d{4}"
                                           class="w-full px-4 py-3 pr-12 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200" 
                                           required>
                                    <input type="date" id="editCaseDropDatePicker"
                                           class="absolute opacity-0 pointer-events-none" tabindex="-1">
                                    <button type="button" onclick="document.getElementById('editCaseDropDatePicker').showPicker(); event.preventDefault();"
                                            class="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-white transition-colors duration-200" title="Open calendar">
                                        <i data-lucide="calendar" class="w-4 h-4"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Price -->
                            <div class="group">
                                <label class="block text-sm font-semibold text-gray-300 mb-2 group-focus-within:text-blue-400 transition-colors">
                                    <i data-lucide="dollar-sign" class="w-4 h-4 inline mr-2"></i>
                                    Price ($)
                                </label>
                                <input type="number" id="editCasePrice" step="0.01" min="0"
                                       class="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200" 
                                       placeholder="0.00" required>
                            </div>
                            
                            <!-- Account -->
                            <div class="group">
                                <label class="block text-sm font-semibold text-gray-300 mb-2 group-focus-within:text-blue-400 transition-colors">
                                    <i data-lucide="user" class="w-4 h-4 inline mr-2"></i>
                                    Account
                                </label>
                                <input type="text" id="editCaseAccount" 
                                       class="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200" 
                                       placeholder="Enter account name" required>
                            </div>
                        </div>
                        
                        <div class="flex space-x-4 mt-6">
                            <button type="button" id="cancelEditCaseDrop" class="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-xl font-medium transition-all duration-200">
                                Cancel
                            </button>
                            <button type="submit" class="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-3 rounded-xl font-medium transition-all duration-200">
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Delete Case Drop Confirmation Modal -->
            <div id="deleteCaseDropModal" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center" style="display: none;">
                <div class="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 scale-95">
                    <!-- Modal Header -->
                    <div class="bg-gradient-to-r from-red-600 to-pink-600 rounded-t-2xl p-6">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                                <i data-lucide="trash-2" class="w-6 h-6 text-white"></i>
                            </div>
                            <div>
                                <h3 class="text-2xl font-bold text-white">Delete Case Drop</h3>
                                <p class="text-red-100 text-sm">Permanently remove this case drop</p>
                            </div>
                        </div>
                    </div>

                    <!-- Modal Body -->
                    <div class="p-6">
                        <div class="text-center mb-6">
                            <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <i data-lucide="alert-triangle" class="w-8 h-8 text-red-600"></i>
                            </div>
                            
                            <p class="text-gray-300 mb-2 text-lg">
                                Are you sure you want to delete
                            </p>
                            <p class="text-white font-bold text-xl mb-4">
                                "<span id="deleteCaseDropName"></span>"?
                            </p>

                            <!-- Warning Box -->
                            <div class="bg-red-900/20 border border-red-700/50 rounded-lg p-4 mb-6">
                                <div class="flex items-center gap-2 text-red-400">
                                    <i data-lucide="alert-triangle" class="w-4 h-4 flex-shrink-0"></i>
                                    <span class="font-medium">Warning: This action cannot be undone</span>
                                </div>
                            </div>
                        </div>

                        <!-- Action Buttons -->
                        <div class="flex space-x-4">
                            <button id="cancelDeleteCaseDrop" type="button" class="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2">
                                <i data-lucide="x" class="w-4 h-4"></i>
                                Cancel
                            </button>
                            <button id="confirmDeleteCaseDrop" type="button" class="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                                Delete Case Drop
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        `
    }

    getFilteredCaseDropsTableHTML(stats, state) {
        let filteredCaseDrops = stats.caseDrops || []
        let emptyMessage = ''
        
        // Filter by selected time period
        if (this.currentWeek) {
            // Most specific: filter by week
            filteredCaseDrops = filteredCaseDrops.filter(caseDrop => caseDrop.weekId === this.currentWeek)
            emptyMessage = 'week'
        } else if (this.currentMonth !== null && this.currentYear) {
            // Medium specific: filter by month and year
            filteredCaseDrops = filteredCaseDrops.filter(caseDrop => {
                if (!caseDrop.dropDate) return false
                const [day, month, year] = caseDrop.dropDate.split('/').map(num => parseInt(num, 10))
                return year === this.currentYear && (month - 1) === this.currentMonth
            })
            emptyMessage = 'month'
        } else if (this.currentYear) {
            // Least specific: filter by year only
            filteredCaseDrops = filteredCaseDrops.filter(caseDrop => {
                if (!caseDrop.dropDate) return false
                const [day, month, year] = caseDrop.dropDate.split('/').map(num => parseInt(num, 10))
                return year === this.currentYear
            })
            emptyMessage = 'year'
        }
        
        // Return appropriate content
        if (filteredCaseDrops.length > 0) {
            return this.getCaseDropsTableHTML(filteredCaseDrops, state)
        } else if (emptyMessage) {
            return this.getEmptyPeriodStateHTML(emptyMessage)
        } else {
            return this.getEmptyStateHTML()
        }
    }

    getCaseDropsTableHTML(caseDrops, state) {
        return `
            <div class="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden w-full">
                <!-- Table Header -->
                <div class="p-4 border-b border-gray-700 bg-gray-800/50">
                    <div class="flex items-center gap-12 text-gray-400 text-sm font-medium w-full">
                        <div class="flex items-center justify-center w-12 flex-shrink-0">
                            <span class="px-2 py-1 rounded text-xs font-medium bg-gray-800 text-gray-400 border border-gray-600">#</span>
                        </div>
                        <div class="flex items-center gap-2 w-16 flex-shrink-0">
                            <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                            <span class="text-blue-400">Image</span>
                        </div>
                        <div class="flex-1 flex items-center gap-2">
                            <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                            </svg>
                            <span class="text-purple-400">Item Name</span>
                        </div>
                        <div class="text-green-400 w-20 flex-shrink-0">Price</div>
                        <div class="text-orange-400 w-24 flex-shrink-0">Drop Date</div>
                        <div class="text-cyan-400 w-20 flex-shrink-0">Account</div>
                        <div class="text-emerald-400 w-24 flex-shrink-0 text-center">Status</div>
                        <div class="text-gray-400 w-20 flex-shrink-0 text-center">Actions</div>
                    </div>
                </div>
                
                <!-- Table Body -->
                <div class="divide-y divide-gray-700">
                    ${caseDrops.map((caseDrop, index) => `
                        <div class="group hover:bg-gray-800/50 transition-all duration-300">
                            <div class="flex items-center gap-12 p-3 w-full">
                                <!-- Row Number -->
                                <div class="flex items-center justify-center w-12 flex-shrink-0">
                                    <div class="w-8 h-8 bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600 rounded-lg flex items-center justify-center text-gray-300 text-sm font-bold">
                                        ${index + 1}
                                    </div>
                                </div>
                                
                                <!-- Image -->
                                <div class="flex items-center justify-center w-16 flex-shrink-0">
                                    <div class="w-12 h-12 bg-gray-800/30 border-2 border-dashed border-gray-600/50 rounded-lg flex items-center justify-center group-hover:bg-gray-700/30 transition-all duration-300">
                                        <i data-lucide="image" class="w-4 h-4 text-gray-500 group-hover:text-gray-400 transition-colors duration-300"></i>
                                    </div>
                                </div>
                                
                                <!-- Item Name - flex-1 for more space -->
                                <div class="flex-1 relative flex items-center gap-3 p-2 rounded-lg transition-all duration-500 group-hover:bg-slate-800/30 mr-2">
                                    <!-- Accent Bar with Animation -->
                                    <div class="relative">
                                        <div class="w-1 h-12 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full transition-all duration-500 group-hover:h-14 group-hover:w-1.5 group-hover:shadow-lg group-hover:shadow-purple-500/50"></div>
                                        <div class="absolute inset-0 w-1 h-12 bg-gradient-to-b from-blue-400 to-purple-500 rounded-full opacity-0 group-hover:opacity-60 transition-all duration-500 animate-pulse"></div>
                                    </div>
                                    
                                    <!-- Item Content -->
                                    <div class="flex-1 min-w-0 space-y-2">
                                        <!-- Item Name -->
                                        <div class="relative">
                                            <div class="text-white font-bold text-base leading-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent group-hover:from-blue-100 group-hover:to-purple-200 transition-all duration-500">
                                                ${this.escapeHtml(caseDrop.caseName || 'Unknown Item')}
                                            </div>
                                            
                                            <!-- Floating Sparkles -->
                                            <div class="absolute -top-1 -right-2 w-1 h-1 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping animation-delay-200"></div>
                                            <div class="absolute top-1 -left-1 w-0.5 h-0.5 bg-purple-400 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping animation-delay-500"></div>
                                        </div>
                                        
                                        <!-- Compact Price Badge Container -->
                                        <div class="relative">
                                            <div class="inline-flex flex-col gap-1 px-3 py-1.5 bg-gray-800/60 border border-gray-600/50 rounded-lg" id="price-badge-${caseDrop.id}">
                                                <!-- CSFloat Price -->
                                                <div class="flex items-center gap-1.5">
                                                    <div class="w-1.5 h-1.5 ${caseDrop.csfloatPrice ? 'bg-cyan-400' : 'bg-gray-500 animate-pulse'} rounded-full"></div>
                                                    <span class="text-cyan-300 text-xs font-medium">CSFloat</span>
                                                    <span class="text-cyan-100 text-xs font-bold" id="csfloat-price-${caseDrop.id}">
                                                        ${caseDrop.csfloatPrice ? '$' + this.formatNumber(caseDrop.csfloatPrice) : 'Loading...'}
                                                    </span>
                                                </div>
                                                
                                                <!-- Buff163 Price -->
                                                <div class="flex items-center gap-1.5">
                                                    <div class="w-1.5 h-1.5 ${caseDrop.buff163Price ? 'bg-emerald-400' : 'bg-gray-500 animate-pulse'} rounded-full"></div>
                                                    <span class="text-emerald-300 text-xs font-medium">Buff163</span>
                                                    <span class="text-emerald-100 text-xs font-bold" id="buff163-price-${caseDrop.id}">
                                                        ${caseDrop.buff163Price ? '$' + this.formatNumber(caseDrop.buff163Price) : 'Loading...'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Price -->
                                <div class="text-green-400 font-semibold text-sm truncate w-20 flex-shrink-0">
                                    $${this.formatNumber(caseDrop.price || 0)}
                                </div>
                                
                                <!-- Drop Date -->
                                <div class="text-orange-400 font-medium text-sm truncate w-24 flex-shrink-0">
                                    ${this.formatDropDate(caseDrop.dropDate)}
                                </div>
                                
                                <!-- Account -->
                                <div class="text-cyan-400 font-medium text-sm truncate w-20 flex-shrink-0">
                                    ${this.escapeHtml(caseDrop.account || 'N/A')}
                                </div>
                                
                                <!-- Status -->
                                <div class="w-24 flex-shrink-0 flex justify-center">
                                    <span class="px-2 py-1 rounded-full text-xs font-medium bg-blue-900 text-blue-400 border border-gray-600">
                                        Received
                                    </span>
                                </div>
                                
                                <!-- Actions -->
                                <div class="w-20 flex-shrink-0 flex gap-1 justify-center">
                                    <button data-action="edit" data-id="${caseDrop.id}"
                                            class="text-blue-400 hover:text-blue-300 transition-all duration-200 p-1 rounded hover:bg-blue-900/20 case-action-btn" title="Edit Case Drop">
                                        <i data-lucide="edit" class="w-4 h-4"></i>
                                    </button>
                                    <button data-action="remove" data-id="${caseDrop.id}"
                                            class="text-red-400 hover:text-red-300 transition-all duration-200 p-1 rounded hover:bg-red-900/20 case-action-btn" title="Delete Case Drop">
                                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `
    }

    getEmptyStateHTML() {
        return `
            <div class="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
                <div class="p-8 text-center text-gray-400">
                    <i data-lucide="inbox" class="w-12 h-12 mx-auto mb-4"></i>
                    <p class="text-lg mb-2">No case drops yet</p>
                    <p class="text-sm">Start by selecting a year, month, and week above to add case drops</p>
                </div>
            </div>
        `
    }

    getEmptyWeekStateHTML() {
        const currentWeek = this.getCurrentWeek()
        const weekName = currentWeek ? currentWeek.name : 'this week'
        const weekPeriod = currentWeek && currentWeek.startDate && currentWeek.endDate ? 
            `${this.formatDateSafely(currentWeek.startDate)} - ${this.formatDateSafely(currentWeek.endDate)}` : ''
        
        return `
            <div class="text-center py-12 text-gray-400">
                <svg class="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                </svg>
                <h3 class="text-lg font-medium text-gray-400 mb-2">No case drops for ${weekName}</h3>
                <p class="text-gray-500 mb-4">${weekPeriod ? `Period: ${weekPeriod}` : ''}</p>
                <p class="text-gray-500 mb-4">Click "+ Add Drop" to add cases for this week.</p>
            </div>
        `
    }

    getEmptyPeriodStateHTML(period) {
        let title = ''
        let subtitle = ''
        let suggestion = ''
        
        if (period === 'week') {
            const currentWeek = this.getCurrentWeek()
            const weekName = currentWeek ? currentWeek.name : 'this week'
            const weekPeriod = currentWeek && currentWeek.startDate && currentWeek.endDate ? 
                `${this.formatDateSafely(currentWeek.startDate)} - ${this.formatDateSafely(currentWeek.endDate)}` : ''
            title = `No case drops for ${weekName}`
            subtitle = weekPeriod ? `Period: ${weekPeriod}` : ''
            suggestion = 'Click "+ Add Drop" to add cases for this week.'
        } else if (period === 'month') {
            const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December']
            const monthName = months[this.currentMonth] || 'this month'
            title = `No case drops for ${monthName} ${this.currentYear}`
            subtitle = 'Select a specific week or add case drops for this month'
            suggestion = 'Click "+ Add Drop" to add cases for this month.'
        } else if (period === 'year') {
            title = `No case drops for ${this.currentYear}`
            subtitle = 'Select a specific month and week or add case drops for this year'
            suggestion = 'Click "+ Add Drop" to add cases for this year.'
        }
        
        return `
            <div class="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
                <div class="p-8 text-center text-gray-400">
                    <i data-lucide="calendar-x" class="w-12 h-12 mx-auto mb-4"></i>
                    <p class="text-lg mb-2">${title}</p>
                    ${subtitle ? `<p class="text-sm text-gray-500 mb-2">${subtitle}</p>` : ''}
                    <p class="text-sm">${suggestion}</p>
                </div>
            </div>
        `
    }

    setupEventListeners() {
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            // Add new year button
            const addYearBtn = document.getElementById('add-new-year-btn')
            if (addYearBtn) {
                addYearBtn.addEventListener('click', () => {
                    console.log('➕ Add New Year button clicked')
                    this.showAddYearModal()
                })
            }
        }, 50)

        // Date picker synchronization setup
        setTimeout(() => {
            this.setupDatePickerSync('drop-date', 'drop-date-picker')
        }, 50)

        // Export and Import buttons - use setTimeout to ensure DOM is ready
        setTimeout(() => {
            const exportCsvBtn = document.getElementById('export-cases-csv-btn')
            if (exportCsvBtn) {
                exportCsvBtn.addEventListener('click', () => {
                    console.log('📤 Export CSV button clicked')
                    this.exportCasesCSV()
                })
                console.log('✅ Export CSV button event listener attached')
            }
            
            const exportExcelBtn = document.getElementById('export-cases-excel-btn')
            if (exportExcelBtn) {
                exportExcelBtn.addEventListener('click', () => {
                    console.log('📤 Export Excel button clicked')
                    this.exportCasesExcel()
                })
                console.log('✅ Export Excel button event listener attached')
            }
            
            const importCsvBtn = document.getElementById('import-cases-csv-btn')
            if (importCsvBtn) {
                importCsvBtn.addEventListener('click', () => {
                    console.log('📥 Import CSV button clicked')
                    this.importCasesCSV()
                })
                console.log('✅ Import CSV button event listener attached')
            }

            const clearCasesBtn = document.getElementById('clear-cases-btn')
            if (clearCasesBtn) {
                clearCasesBtn.addEventListener('click', () => {
                    console.log('🗑️ Clear Cases button clicked')
                    this.clearAllCases()
                })
                console.log('✅ Clear Cases button event listener attached')
            } else {
                console.log('❌ Clear Cases button not found in DOM')
            }
        }, 100)

        // Add case drop button - use setTimeout to ensure DOM is ready
        setTimeout(() => {
            const addCaseBtn = document.getElementById('add-case-drop-btn')
            if (addCaseBtn) {
                addCaseBtn.addEventListener('click', (e) => {
                    console.log('➕ Add Case Drop button clicked')
                    e.preventDefault()
                    this.showCaseDropForm()
                })
                console.log('✅ Add Case Drop button event listener attached')
            } else {
                console.error('❌ Add Case Drop button not found in DOM')
            }
        }, 100)

        // Save case drop button - use setTimeout to ensure DOM is ready
        setTimeout(() => {
            const saveCaseBtn = document.getElementById('add-case-drop-btn')
            if (saveCaseBtn) {
                saveCaseBtn.addEventListener('click', (e) => {
                    console.log('💾 Save Case Drop button clicked')
                    e.preventDefault()
                    this.saveCaseDrop()
                })
                console.log('✅ Save Case Drop button event listener attached')
            } else {
                console.error('❌ Save Case Drop button not found in DOM')
            }
        }, 100)

        
        // Edit case drop form
        const editForm = document.getElementById('editCaseDropForm')
        if (editForm) {
            editForm.addEventListener('submit', (e) => {
                e.preventDefault()
                this.saveCaseDropEdit()
            })
        }

        const cancelEditBtn = document.getElementById('cancelEditCaseDrop')
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => this.closeCaseDropEditModal())
        }
        
        // Add Year modal - use event delegation since modal is rendered dynamically
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'add-year-form') {
                e.preventDefault()
                this.handleAddYearSubmit(e)
            }
        })
        
        document.addEventListener('click', (e) => {
            if (e.target.id === 'cancel-add-year') {
                e.preventDefault()
                this.closeAddYearModal()
            }
            
            // Handle year delete button clicks
            if (e.target.classList.contains('year-delete-btn')) {
                e.preventDefault()
                e.stopPropagation()
                const year = parseInt(e.target.dataset.year)
                this.confirmDeleteYear(year)
            }
        })

        // Case action buttons (edit/remove) - use event delegation
        document.addEventListener('click', (e) => {
            // Check if clicked element or its parent is a case action button
            const button = e.target.closest('.case-action-btn')
            if (button) {
                const action = button.dataset.action
                const id = button.dataset.id
                this.handleCaseDropAction(action, id)
            }
            
            // Cancel edit button - event delegation
            if (e.target.id === 'cancelEditCaseDrop') {
                console.log('❌ Cancel edit button clicked (via delegation)')
                e.preventDefault()
                this.closeCaseDropEditModal()
                return
            }
            
            // Add Case Drop button - event delegation as backup
            if (e.target.id === 'add-case-drop-btn') {
                console.log('➕ Add Case Drop button clicked (via delegation)')
                e.preventDefault()
                this.showCaseDropForm()
            }
            
            // Save Case Drop button - event delegation as backup
            if (e.target.id === 'add-case-drop-btn') {
                console.log('💾 Save Case Drop button clicked (via delegation)')
                e.preventDefault()
                this.saveCaseDrop()
            }
            
            // Import button has direct event listener, no delegation needed
            
            // Tab switching
            if (e.target.id === 'overview-tab') {
                console.log('📊 Overview tab clicked')
                this.switchToTab('overview')
            }
            
            if (e.target.id === 'analytics-tab') {
                console.log('📈 Analytics tab clicked')
                this.switchToTab('analytics')
            }
        })
    }

    setupEventListenersDelayed() {
        // Additional event listener setup after DOM is ready
        setTimeout(() => {
            const addYearBtn = document.getElementById('add-new-year-btn')
            if (addYearBtn && !addYearBtn.hasAttribute('data-listener-added')) {
                addYearBtn.addEventListener('click', () => {
                    console.log('➕ Add New Year button clicked (delayed setup)')
                    this.showAddYearModal()
                })
                addYearBtn.setAttribute('data-listener-added', 'true')
            }

            // Setup edit modal event listeners with delay
            const editForm = document.getElementById('editCaseDropForm')
            if (editForm && !editForm.hasAttribute('data-listener-added')) {
                editForm.addEventListener('submit', (e) => {
                    e.preventDefault()
                    this.saveCaseDropEdit()
                })
                editForm.setAttribute('data-listener-added', 'true')
            }

            const cancelEditBtn = document.getElementById('cancelEditCaseDrop')
            if (cancelEditBtn && !cancelEditBtn.hasAttribute('data-listener-added')) {
                cancelEditBtn.addEventListener('click', () => {
                    console.log('❌ Cancel edit button clicked')
                    this.closeCaseDropEditModal()
                })
                cancelEditBtn.setAttribute('data-listener-added', 'true')
            }

            // Setup delete modal event listeners
            const cancelDeleteBtn = document.getElementById('cancelDeleteCaseDrop')
            if (cancelDeleteBtn && !cancelDeleteBtn.hasAttribute('data-listener-added')) {
                cancelDeleteBtn.addEventListener('click', () => {
                    console.log('❌ Cancel delete button clicked')
                    this.hideDeleteModal(true)
                })
                cancelDeleteBtn.setAttribute('data-listener-added', 'true')
            }

            const confirmDeleteBtn = document.getElementById('confirmDeleteCaseDrop')
            if (confirmDeleteBtn && !confirmDeleteBtn.hasAttribute('data-listener-added')) {
                confirmDeleteBtn.addEventListener('click', () => {
                    console.log('✅ Confirm delete button clicked')
                    this.executeDelete()
                })
                confirmDeleteBtn.setAttribute('data-listener-added', 'true')
            }

            // Click outside modal to close
            const deleteModal = document.getElementById('deleteCaseDropModal')
            if (deleteModal && !deleteModal.hasAttribute('data-listener-added')) {
                deleteModal.addEventListener('click', (e) => {
                    if (e.target === deleteModal) {
                        this.hideDeleteModal(true)
                    }
                })
                deleteModal.setAttribute('data-listener-added', 'true')
            }

            // Setup edit modal date picker synchronization
            this.setupDatePickerSync('editCaseDropDate', 'editCaseDropDatePicker')
        }, 200)
    }

    renderYearTabs() {
        // Get fresh store state
        const state = this.getStore()
        const years = state.years || []
        const yearTabsContainer = document.getElementById('year-tabs')
        
        if (!yearTabsContainer) {
            console.warn('❌ Year tabs container not found')
            return
        }

        // Add or remove overflow-x-auto class based on number of years
        if (years.length > 3) {
            // Only add horizontal scroll if there are many years
            yearTabsContainer.classList.add('overflow-x-auto')
        } else {
            // Remove horizontal scroll for few years to avoid unnecessary scrollbar
            yearTabsContainer.classList.remove('overflow-x-auto')
        }

        if (years.length === 0) {
            console.warn('⚠️ No years data available')
            yearTabsContainer.innerHTML = `
                <div class="text-gray-500 text-sm">No years available. Add a new year to get started.</div>
            `
            return
        }

        yearTabsContainer.innerHTML = years.map(year => `
            <div class="relative year-tab-container group">
                <button class="year-tab ${year.year === this.currentYear ? 'bg-blue-600' : 'bg-gray-700'} hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition font-semibold relative" 
                        data-year="${year.year}">
                    ${year.year}
                </button>
                <button class="year-delete-btn absolute -top-1 -right-1 w-5 h-5 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs font-bold z-10" 
                        data-year="${year.year}" 
                        title="Delete year ${year.year}">
                    ×
                </button>
            </div>
        `).join('')

        // Add event listeners for year tabs
        document.querySelectorAll('.year-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.selectYear(parseInt(e.target.dataset.year))
            })
        })

        // Add event listeners for year delete buttons
        document.querySelectorAll('.year-delete-btn').forEach(deleteBtn => {
            deleteBtn.addEventListener('click', (e) => {
                e.preventDefault()
                e.stopPropagation()
                const year = parseInt(e.target.dataset.year)
                console.log('🗑️ Year delete button clicked for year:', year)
                this.confirmDeleteYear(year)
            })
        })
    }

    initializeYearMonthWeek() {
        const state = this.getStore()
        console.log('🔄 initializeYearMonthWeek called with state:', {
            yearsCount: state?.years?.length || 0,
            years: state?.years?.map(y => y.year) || []
        })
        
        if (state && state.years && state.years.length > 0) {
            // Fix any existing case drop week assignments before initializing UI
            console.log('🔧 Running fixExistingCaseDropAssignments...')
            this.fixExistingCaseDropAssignments()
            
            // Check state after fix
            const stateAfterFix = this.getStore()
            console.log('📊 State after fixExistingCaseDropAssignments:', {
                yearsCount: stateAfterFix?.years?.length || 0,
                years: stateAfterFix?.years?.map(y => y.year) || []
            })
            
            // Auto-select current week based on today's date
            this.autoSelectCurrentWeek()
        } else {
            // If no years exist, still try to auto-select current week (will create year)
            console.log('📅 No years found, auto-selecting current week (will create year)')
            this.autoSelectCurrentWeek()
        }
    }

    selectYear(year) {
        this.currentYear = year
        
        // Update year tab active state
        document.querySelectorAll('.year-tab').forEach(tab => {
            tab.classList.remove('bg-blue-600')
            tab.classList.add('bg-gray-700')
        })
        
        const activeTab = document.querySelector(`[data-year="${year}"]`)
        if (activeTab) {
            activeTab.classList.remove('bg-gray-700')
            activeTab.classList.add('bg-blue-600')
        }

        // Reset month and week selection
        this.currentMonth = null
        this.currentWeek = null

        // Show month selector
        this.renderMonthTabs(year)
        
        const monthContainer = document.getElementById('month-selector-container')
        if (monthContainer) monthContainer.classList.remove('hidden')
        
        // Hide week selector until month is selected
        const weekContainer = document.getElementById('week-selector-container')
        if (weekContainer) weekContainer.classList.add('hidden')
        
        const summaryContainer = document.getElementById('week-summary-container')
        if (summaryContainer) summaryContainer.classList.add('hidden')
        
        // Add button remains visible - user gets guidance when clicking
        
        // Refresh case drops display when year changes (will show all since no week selected)
        this.refreshCaseDropsDisplay()
        
        console.log(`📅 Selected year: ${year}`)
    }

    renderMonthTabs(year) {
        const monthDropdownMenu = document.getElementById('month-dropdown-menu')
        const selectedMonthText = document.getElementById('selected-month-text')
        const monthDropdownBtn = document.getElementById('month-dropdown-btn')
        
        if (!monthDropdownMenu || !selectedMonthText || !monthDropdownBtn) return

        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ]

        // Update dropdown options
        monthDropdownMenu.innerHTML = months.map((month, index) => `
            <div class="dropdown-option px-3 py-2 hover:bg-gray-700 cursor-pointer text-white text-sm border-b border-gray-700 last:border-b-0 ${index === this.currentMonth ? 'bg-blue-600' : ''}" 
                 data-month="${index}">
                ${month}
            </div>
        `).join('')

        // Update selected text
        selectedMonthText.textContent = this.currentMonth !== null ? months[this.currentMonth] : 'Select Month'

        // Remove existing event listeners to prevent duplicates
        const existingBtn = document.getElementById('month-dropdown-btn')
        if (existingBtn) {
            existingBtn.replaceWith(existingBtn.cloneNode(true))
        }
        
        // Re-get the button after cloning
        const newMonthDropdownBtn = document.getElementById('month-dropdown-btn')
        
        // Add dropdown toggle functionality
        if (newMonthDropdownBtn) {
            newMonthDropdownBtn.addEventListener('click', (e) => {
                e.stopPropagation()
                e.preventDefault()
                
                // Close dropdown if open, open if closed
                const isHidden = monthDropdownMenu.classList.contains('hidden')
                
                // Close any other open dropdowns first
                document.querySelectorAll('[id*="dropdown-menu"]').forEach(menu => {
                    if (menu !== monthDropdownMenu) {
                        menu.classList.add('hidden')
                    }
                })
                
                if (isHidden) {
                    monthDropdownMenu.classList.remove('hidden')
                    console.log('🔽 Month dropdown opened')
                } else {
                    monthDropdownMenu.classList.add('hidden')
                    console.log('🔼 Month dropdown closed')
                }
            })
        }

        // Add event listeners for month options
        document.querySelectorAll('.dropdown-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation()
                console.log('📅 Month selected:', e.target.dataset.month)
                this.selectMonth(parseInt(e.target.dataset.month))
                monthDropdownMenu.classList.add('hidden')
            })
        })
        
        // Add global click handler to close dropdown when clicking outside
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                const monthDropdownMenu = document.getElementById('month-dropdown-menu')
                const monthDropdownBtn = document.getElementById('month-dropdown-btn')
                
                if (monthDropdownMenu && monthDropdownBtn) {
                    if (!monthDropdownBtn.contains(e.target) && !monthDropdownMenu.contains(e.target)) {
                        monthDropdownMenu.classList.add('hidden')
                    }
                }
            })
        }, 100)
    }

    selectMonth(month) {
        this.currentMonth = parseInt(month)
        
        // Update dropdown selection
        const selectedMonthText = document.getElementById('selected-month-text')
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ]
        
        if (selectedMonthText) {
            selectedMonthText.textContent = months[month]
        }
        
        // Update dropdown options styling
        document.querySelectorAll('.dropdown-option').forEach(option => {
            option.classList.remove('bg-blue-600')
            if (parseInt(option.dataset.month) === parseInt(month)) {
                option.classList.add('bg-blue-600')
            }
        })

        // Reset week selection
        this.currentWeek = null

        // Show week selector
        this.renderWeekTabs(this.currentYear, month)
        
        const weekContainer = document.getElementById('week-selector-container')
        if (weekContainer) weekContainer.classList.remove('hidden')
        
        // Hide week summary until week is selected
        const summaryContainer = document.getElementById('week-summary-container')
        if (summaryContainer) summaryContainer.classList.add('hidden')
        
        // Add button remains visible - user gets guidance when clicking
        
        // Refresh case drops display when month changes (will show all since no week selected)
        this.refreshCaseDropsDisplay()
        
        console.log(`📅 Selected month: ${month} (${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][month]})`)
    }

    renderWeekTabs(year, month) {
        const weekTabsContainer = document.getElementById('week-tabs')
        if (!weekTabsContainer) return

        const state = this.getStore()
        const yearData = state.years.find(y => y.year === year)
        
        if (!yearData || !yearData.months || !yearData.months[month]) {
            // Ensure year structure exists in store instead of generating temporary weeks
            console.log(`⚠️ Year structure missing for ${year}, creating it...`)
            this.getStore().addYear(year)
            
            // Get the fresh year data after creation
            const refreshedState = this.getStore()
            const refreshedYearData = refreshedState.years.find(y => y.year === year)
            
            if (!refreshedYearData || !refreshedYearData.months || !refreshedYearData.months[month]) {
                console.error(`❌ Failed to create year structure for ${year}`)
                weekTabsContainer.innerHTML = '<p class="text-gray-400">Failed to load weeks</p>'
                return
            }
            
            // Use the properly created week structure
            const monthData = refreshedYearData.months[month]
            const weeks = monthData.weeks || []
            
            weekTabsContainer.innerHTML = weeks.map(week => `
                <div class="relative week-tab-container">
                    <button class="week-tab px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition text-sm font-semibold" 
                            data-week-id="${week.id}" title="${week.startDate} - ${week.endDate}">
                        ${week.name || `Week ${week.week || 1}`}
                    </button>
                </div>
            `).join('')
        } else {
            // Use existing week structure
            const monthData = yearData.months[month]
            const weeks = monthData.weeks || []
            
            weekTabsContainer.innerHTML = weeks.map(week => `
                <div class="relative week-tab-container">
                    <button class="week-tab ${week.id === this.currentWeek ? 'bg-blue-600' : 'bg-gray-700'} hover:bg-gray-600 text-white px-3 py-2 rounded-lg transition text-sm font-semibold" 
                            data-week-id="${week.id}" title="${week.startDate} - ${week.endDate}">
                        ${week.name || `Week ${week.week || 1}`}
                    </button>
                </div>
            `).join('')
        }

        // Add event listeners for week tabs
        document.querySelectorAll('.week-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.selectWeek(e.target.dataset.weekId)
            })
        })
    }

    selectWeek(weekId) {
        this.currentWeek = weekId
        
        // Update week tab active state
        document.querySelectorAll('.week-tab').forEach(tab => {
            tab.classList.remove('bg-blue-600')
            tab.classList.add('bg-gray-700')
        })
        
        const activeTab = document.querySelector(`[data-week-id="${weekId}"]`)
        if (activeTab) {
            activeTab.classList.remove('bg-gray-700')
            activeTab.classList.add('bg-blue-600')
        }

        // Debug: Check case drops matching this weekId
        const state = this.getStore()
        const matchingDrops = (state.caseDrops || []).filter(drop => drop.weekId === weekId)
        
        console.log(`📅 Week selected - Debug info:`, {
            selectedWeekId: weekId,
            currentYear: this.currentYear,
            currentMonth: this.currentMonth,
            matchingDropsCount: matchingDrops.length,
            matchingDrops: matchingDrops.map(drop => ({
                name: drop.caseName,
                date: drop.dropDate,
                weekId: drop.weekId
            })),
            allDrops: (state.caseDrops || []).map(drop => ({
                name: drop.caseName,
                date: drop.dropDate,
                weekId: drop.weekId
            }))
        })

        // Show week summary and enable form
        this.renderCurrentWeek()
        
        // Refresh the main case drops table to show only current week's entries
        this.refreshCaseDropsDisplay()
        
        // Update the default date in the form to match selected week
        this.setDefaultDropDate()
        
        const summaryContainer = document.getElementById('week-summary-container')
        if (summaryContainer) summaryContainer.classList.remove('hidden')
        
        console.log(`📅 Selected week: ${weekId}`)
    }

    enableCaseDropForm() {
        // Form is now available for adding case drops
        console.log(`📅 Selected time period: Year ${this.currentYear}, Month ${this.currentMonth}, Week ${this.currentWeek}`)
    }

    showCaseDropForm() {
        console.log('🔄 showCaseDropForm called - form is now always visible')
        console.log('📊 Current state:', {
            year: this.currentYear,
            month: this.currentMonth,
            week: this.currentWeek
        })
        
        // Since form is always visible, just set the default date
        this.setDefaultDropDate()
        
        // Focus on the case name field for better UX
        const caseNameField = document.getElementById('case-name')
        if (caseNameField) {
            caseNameField.focus()
        }
    }
    
    setDefaultDropDate() {
        const dropDateElement = document.getElementById('drop-date')
        if (!dropDateElement) return
        
        // Set default date to today or current week start date
        let defaultDate = this.getTodayFormatted()
        
        const currentWeek = this.getCurrentWeek()
        if (currentWeek && currentWeek.startDate) {
            // Set to week start date if current date is not in week range
            const today = new Date()
            const weekStart = new Date(currentWeek.startDate)
            const weekEnd = new Date(currentWeek.endDate)
            
            if (today < weekStart || today > weekEnd) {
                defaultDate = this.formatDate(currentWeek.startDate)
            }
        }
        
        dropDateElement.value = defaultDate
        
        console.log(`📅 Default date set to: ${defaultDate}`)
    }

    clearCaseDropForm() {
        document.getElementById('case-drop-form').reset()
    }

    saveCaseDrop() {
        console.log('💾 saveCaseDrop method called')
        const caseDropData = this.getCaseDropFormData()
        console.log('📝 Form data collected:', caseDropData)
        
        if (!caseDropData) {
            console.error('❌ Failed to get form data')
            this.showNotification('Error: Could not read form data', 'error')
            return
        }
        
        if (!this.validateCaseDropForm(caseDropData)) {
            console.log('❌ Form validation failed')
            return
        }

        // Normalize the date format first
        const normalizedDate = this.normalizeDateFormat(caseDropData.dropDate)

        // Check if the drop date falls within the current week (show warning but allow)
        const currentWeek = this.getCurrentWeek()
        if (currentWeek && currentWeek.startDate && currentWeek.endDate && !this.isDateInWeek(normalizedDate, currentWeek)) {
            const weekStart = this.formatDateSafely(currentWeek.startDate)
            const weekEnd = this.formatDateSafely(currentWeek.endDate)
            this.showNotification(
                `Note: Drop date is outside ${currentWeek.name} (${weekStart} - ${weekEnd}). Case will be organized into the appropriate week.`, 
                'warning'
            )
            // Continue with adding the case drop instead of returning
        }

        // Parse date info for debugging and year creation
        const [day, month, year] = normalizedDate.split('/').map(num => parseInt(num, 10))
        console.log(`📅 Processing date ${normalizedDate}: day=${day}, month=${month}, year=${year}`)
        
        // Ensure year structure exists before finding week
        const state = this.getStore()
        let yearExists = state.years.find(y => y.year === year)
        if (!yearExists) {
            console.log(`📅 Auto-creating year ${year} for date ${normalizedDate}`)
            state.addYear(year)
            this.showNotification(`Created year ${year} structure for your case drop`, 'success')
        }
        
        // Find the correct week for the drop date
        let weekInfo = this.findWeekForDate(normalizedDate)
        if (!weekInfo) {
            console.error(`❌ Failed to find week for date ${normalizedDate} even after creating year structure`)
            this.showNotification(`Failed to create week structure for ${caseDropData.dropDate}. Please try again.`, 'error')
            return
        }
        
        console.log(`✅ Found week info:`, weekInfo)

        const caseDrop = {
            id: this.generateUniqueId(),
            caseName: caseDropData.caseName,
            dropDate: caseDropData.dropDate,
            price: caseDropData.casePrice,
            account: caseDropData.caseAccount,
            weekId: weekInfo.weekId,
            year: weekInfo.year,
            month: weekInfo.month,
            dateAdded: new Date().toISOString()
        }

        // Add to store
        this.getStore().addCaseDrop(caseDrop)
        
        // Clear form and refresh display
        this.clearCaseDropForm()
        this.renderCurrentWeek()
        this.refreshCaseDropsDisplay()
        this.refreshAnalytics() // Update analytics after adding new case drop
        
        // Fetch prices for the newly added case drop
        this.fetchPricesForCaseDrop(caseDrop).catch(error => {
            console.error('Failed to fetch prices for new case drop:', error)
        })
        
        const weekStart = weekInfo.week.startDate ? this.formatDateSafely(weekInfo.week.startDate) : 'N/A'
        const weekEnd = weekInfo.week.endDate ? this.formatDateSafely(weekInfo.week.endDate) : 'N/A'
        
        console.log(`📝 Case drop added:`, {
            caseName: caseDropData.caseName,
            dropDate: caseDropData.dropDate,
            weekId: caseDrop.weekId,
            weekName: weekInfo.week.name,
            currentWeek: this.currentWeek,
            currentMonth: this.currentMonth,
            currentYear: this.currentYear
        })
        
        this.showNotification(`Added "${caseDropData.caseName}" to ${weekInfo.week.name || `Week ${weekInfo.week.week || 1}`} (${weekStart} - ${weekEnd})`, 'success')
    }

    refreshCaseDropsDisplay() {
        const state = this.getStore()
        const stats = this.calculateCaseDropStats(state)
        
        // Update the case drops content with filtered data
        const contentContainer = document.getElementById('case-drops-content')
        if (contentContainer) {
            contentContainer.innerHTML = this.getFilteredCaseDropsTableHTML(stats, state)
            
            // Re-initialize icons after dynamic content update
            if (typeof lucide !== 'undefined') {
                lucide.createIcons()
            }
        }
        
        // Also update the header statistics
        this.updateHeaderStats(stats)
    }

    updateHeaderStats(stats) {
        console.log('📊 Updating header stats:', {
            totalCases: stats.totalCases,
            totalValue: stats.totalValue,
            thisWeekCases: stats.thisWeekActivity?.cases
        })
        
        // Update header elements
        const totalDropsEl = document.getElementById('header-total-drops')
        if (totalDropsEl) totalDropsEl.textContent = stats.totalCases || 0
        
        const totalValueEl = document.getElementById('header-total-value')
        if (totalValueEl) totalValueEl.textContent = `$${this.formatNumber(stats.totalValue || 0)}`
        
        const weeklyCountEl = document.getElementById('header-weekly-count')
        if (weeklyCountEl) weeklyCountEl.textContent = stats.thisWeekActivity?.cases || 0
    }
    
    updateStatisticsCards() {
        const state = this.getStore()
        const stats = this.calculateCaseDropStats(state)
        
        console.log('📊 Updating statistics cards with fresh data:', stats)
        
        // Statistics are now handled by the Week Summary section in the Overview tab
        // No need to create duplicate cards here
    }

    showAddYearModal() {
        console.log('📅 showAddYearModal called')
        
        // Show the custom modal
        const modal = document.getElementById('add-year-modal')
        if (modal) {
            modal.classList.remove('hidden')
            
            // Set default year to next year
            const currentYear = new Date().getFullYear()
            const nextYear = currentYear + 1
            const yearInput = document.getElementById('new-year-input')
            if (yearInput) {
                yearInput.value = nextYear
                yearInput.focus()
                yearInput.select()
            }
        }
    }
    
    closeAddYearModal() {
        const modal = document.getElementById('add-year-modal')
        if (modal) {
            modal.classList.add('hidden')
            
            // Clear the input
            const yearInput = document.getElementById('new-year-input')
            if (yearInput) {
                yearInput.value = ''
            }
        }
    }
    
    handleAddYearSubmit(event) {
        event.preventDefault()
        
        const yearInput = document.getElementById('new-year-input')
        const year = yearInput ? yearInput.value.trim() : ''
        
        console.log('📅 User entered year:', year)
        
        if (!year || isNaN(year) || year.length !== 4) {
            this.showNotification('Please enter a valid 4-digit year', 'error')
            return
        }
        
        const yearNum = parseInt(year)
        
        if (yearNum < 2020 || yearNum > 2050) {
            this.showNotification('Please enter a year between 2020 and 2050', 'error')
            return
        }
        
        // Check if year already exists
        const state = this.getStore()
        const existingYear = state.years.find(y => y.year === yearNum)
        if (existingYear) {
            this.showNotification(`Year ${year} already exists`, 'warning')
            return
        }
        
        // Add year with proper structure
        this.addYearWithWeeks(yearNum)
        this.closeAddYearModal()
        this.showNotification(`Year ${year} added with 52 weeks successfully`, 'success')
    }
    
    confirmDeleteYear(year) {
        console.log('🗑️ confirmDeleteYear called for year:', year)
        const yearToDelete = parseInt(year)
        
        // Check if year has case drops
        const state = this.getStore()
        const caseDropsInYear = state.caseDrops.filter(caseDrop => {
            if (!caseDrop.dropDate) return false
            const [day, month, yearValue] = caseDrop.dropDate.split('/').map(num => parseInt(num, 10))
            return yearValue === yearToDelete
        })
        
        let message = `Are you sure you want to delete year ${year}?`
        if (caseDropsInYear.length > 0) {
            message += `\n\nThis will also delete ${caseDropsInYear.length} case drop(s) from this year.`
        }
        
        console.log(`📊 Found ${caseDropsInYear.length} case drops in year ${yearToDelete}`)
        
        if (confirm(message)) {
            console.log('✅ User confirmed deletion')
            this.deleteYear(yearToDelete)
        } else {
            console.log('❌ User cancelled deletion')
        }
    }
    
    deleteYear(year) {
        console.log('🗑️ deleteYear called for year:', year)
        
        try {
            const currentState = this.getStore()
            
            // Get case drops that will be deleted for logging
            const caseDropsToDelete = currentState.caseDrops.filter(caseDrop => {
                if (!caseDrop.dropDate) return false
                const [day, month, yearValue] = caseDrop.dropDate.split('/').map(num => parseInt(num, 10))
                return yearValue === year
            })
            
            // Use the store's deleteYear method
            this.getStore().deleteYear(year)
            
            // Reset current selections if the deleted year was selected
            if (this.currentYear === year) {
                this.currentYear = null
                this.currentMonth = null
                this.currentWeek = null
                
                // Hide month/week selectors
                const monthContainer = document.getElementById('month-selector-container')
                if (monthContainer) monthContainer.classList.add('hidden')
                
                const weekContainer = document.getElementById('week-selector-container')
                if (weekContainer) weekContainer.classList.add('hidden')
                
                const summaryContainer = document.getElementById('week-summary-container')
                if (summaryContainer) summaryContainer.classList.add('hidden')
                
                const addBtn = document.getElementById('add-case-drop-btn')
                if (addBtn) addBtn.classList.add('hidden')
            }
            
            // Force UI update after store change
            this.forceUIUpdate()
            
            console.log('✅ Year deletion completed successfully')
            this.showNotification(`Year ${year} deleted successfully`, 'success')
            
        } catch (error) {
            console.error('❌ Failed to delete year:', error)
            this.showNotification(`Failed to delete year: ${error.message}`, 'error')
        }
    }

    clearAllCases() {
        const state = this.getStore()
        const caseDrops = state.caseDrops || []
        
        if (caseDrops.length === 0) {
            this.showNotification('No case drops to clear', 'info')
            return
        }

        // Show confirmation dialog
        const confirmed = confirm(
            `Are you sure you want to delete all ${caseDrops.length} case drops?\n\n` +
            `This action cannot be undone.`
        )
        
        if (!confirmed) {
            console.log('🚫 Clear cases operation cancelled by user')
            return
        }

        try {
            // Clear all case drops by setting an empty array and saving to localStorage
            const emptyData = {
                years: state.years, // Keep year structure
                caseDrops: [] // Clear all case drops
            }
            
            // Save to localStorage
            localStorage.setItem('caseDropsHierarchical', JSON.stringify(emptyData))
            
            // Update state directly (since there's no clearAllCaseDrops method)
            state.caseDrops.length = 0 // Clear the array in place
            
            console.log(`🗑️ Cleared ${caseDrops.length} case drops`)
            this.showNotification(`Successfully cleared ${caseDrops.length} case drops`, 'success')
            
            // Comprehensive UI refresh
            this.renderCurrentWeek()
            this.refreshCaseDropsDisplay() 
            this.refreshAnalytics() // Update analytics/stats
            this.initializeCharts()
            this.forceUIUpdate('clear-all-cases') // Force complete UI update
            
        } catch (error) {
            console.error('❌ Error clearing case drops:', error)
            this.showNotification('Failed to clear case drops', 'error')
        }
    }

    exportCasesCSV() {
        const state = this.getStore()
        const caseDrops = state.caseDrops || []
        
        if (caseDrops.length === 0) {
            this.showNotification('No case drops to export', 'warning')
            return
        }
        
        const csvHeaders = ['Case Name', 'Drop Date', 'Price ($)', 'Account', 'Year', 'Month', 'Week', 'Date Added']
        const csvRows = caseDrops.map(drop => [
            drop.caseName || '',
            drop.dropDate || '',
            drop.price || 0,
            drop.account || '',
            drop.year || '',
            drop.month !== null ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][drop.month] || '' : '',
            drop.weekId || '',
            drop.dateAdded ? this.formatDateSafely(drop.dateAdded.split('T')[0]) : ''
        ])
        
        const csvContent = [csvHeaders, ...csvRows].map(row => 
            row.map(field => {
                const str = String(field)
                const escaped = str.split('"').join('""')
                return `"${escaped}"`
            }).join(',')
        ).join('\n')
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `cs2-case-drops-${this.getTodayFormatted().replace(/\//g, '-')}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
        this.showNotification(`Exported ${caseDrops.length} case drops to CSV`, 'success')
    }
    
    exportCasesExcel() {
        // Check if XLSX library is available
        if (typeof XLSX === 'undefined') {
            this.showNotification('Excel export not available - XLSX library not loaded', 'error')
            return
        }
        
        const state = this.getStore()
        const caseDrops = state.caseDrops || []
        
        if (caseDrops.length === 0) {
            this.showNotification('No case drops to export', 'warning')
            return
        }
        
        const wsData = [
            ['Case Name', 'Drop Date', 'Price ($)', 'Account', 'Year', 'Month', 'Week', 'Date Added'],
            ...caseDrops.map(drop => [
                drop.caseName || '',
                drop.dropDate || '',
                drop.price || 0,
                drop.account || '',
                drop.year || '',
                drop.month !== null ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][drop.month] || '' : '',
                drop.weekId || '',
                drop.dateAdded ? this.formatDateSafely(drop.dateAdded.split('T')[0]) : ''
            ])
        ]
        
        const ws = XLSX.utils.aoa_to_sheet(wsData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Case Drops')
        
        XLSX.writeFile(wb, `cs2-case-drops-${this.getTodayFormatted().replace(/\//g, '-')}.xlsx`)
        
        this.showNotification(`Exported ${caseDrops.length} case drops to Excel`, 'success')
    }

    importCasesCSV() {
        // Create a file input element
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.csv'
        input.style.display = 'none'
        
        input.addEventListener('change', (e) => {
            const file = e.target.files[0]
            if (!file) return
            
            const reader = new FileReader()
            reader.onload = (event) => {
                try {
                    const csv = event.target.result
                    const lines = csv.split('\n').filter(line => line.trim())
                    
                    if (lines.length < 2) {
                        this.showNotification('CSV file must contain at least a header and one data row', 'error')
                        return
                    }
                    
                    // Parse CSV headers
                    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
                    const expectedHeaders = ['Case Name', 'Drop Date', 'Price', 'Account']
                    
                    // More flexible header validation - normalize for comparison
                    const normalizeHeader = (header) => header.toLowerCase().replace(/[^a-z]/g, '')
                    const normalizedHeaders = headers.map(normalizeHeader)
                    const normalizedExpected = expectedHeaders.map(normalizeHeader)
                    
                    const hasRequiredHeaders = normalizedExpected.every(expected => 
                        normalizedHeaders.some(header => header.includes(expected) || expected.includes(header))
                    )
                    
                    if (!hasRequiredHeaders) {
                        this.showNotification(`CSV must contain headers like: ${expectedHeaders.join(', ')}. Found: ${headers.join(', ')}`, 'error')
                        return
                    }
                    
                    // Create column mapping
                    const getColumnIndex = (searchTerm) => {
                        const normalized = normalizeHeader(searchTerm)
                        return normalizedHeaders.findIndex(header => 
                            header.includes(normalized) || normalized.includes(header)
                        )
                    }
                    
                    const columnMap = {
                        caseName: getColumnIndex('casename'),
                        dropDate: getColumnIndex('dropdate'),
                        price: getColumnIndex('price'),
                        account: getColumnIndex('account')
                    }
                    
                    // Parse data rows
                    const importedCases = []
                    const errors = []
                    
                    for (let i = 1; i < lines.length; i++) {
                        const line = lines[i].trim()
                        if (!line) continue
                        
                        const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
                        
                        if (values.length < headers.length) {
                            errors.push(`Row ${i + 1}: Insufficient columns`)
                            continue
                        }
                        
                        try {
                            const caseDrop = {
                                caseName: values[columnMap.caseName] || '',
                                dropDate: values[columnMap.dropDate] || '',
                                price: parseFloat(values[columnMap.price]) || 0,
                                account: values[columnMap.account] || '',
                                dateAdded: new Date().toISOString()
                            }
                            
                            // Validate required fields
                            if (!caseDrop.caseName || !caseDrop.dropDate || !caseDrop.account) {
                                errors.push(`Row ${i + 1}: Missing required fields`)
                                continue
                            }
                            
                            // Validate date format
                            const isoDate = this.convertFormattedToISODate(caseDrop.dropDate)
                            const date = new Date(isoDate)
                            if (isNaN(date.getTime())) {
                                errors.push(`Row ${i + 1}: Invalid date format`)
                                continue
                            }
                            
                            importedCases.push(caseDrop)
                        } catch (error) {
                            errors.push(`Row ${i + 1}: ${error.message}`)
                        }
                    }
                    
                    if (importedCases.length === 0) {
                        this.showNotification('No valid case drops found in CSV', 'error')
                        if (errors.length > 0) {
                            console.error('Import errors:', errors)
                        }
                        return
                    }
                    
                    // Add cases to store using the proper store method
                    const state = this.getStore()
                    
                    // Use the store's bulk add method to properly update state and trigger reactivity
                    state.addMultipleCaseDrops(importedCases)
                    
                    // Show success message
                    let message = `Successfully imported ${importedCases.length} case drops`
                    if (errors.length > 0) {
                        message += ` (${errors.length} rows had errors)`
                        console.warn('Import errors:', errors)
                    }
                    
                    this.showNotification(message, 'success')
                    
                    // Comprehensive UI refresh after import
                    this.renderCurrentWeek()
                    this.refreshCaseDropsDisplay() 
                    this.refreshAnalytics() // Update analytics/stats
                    this.initializeCharts()
                    this.forceUIUpdate('csv-import') // Force complete UI update
                    
                    // Fetch prices for imported items
                    importedCases.forEach(caseDrop => {
                        this.fetchPricesForCaseDrop(caseDrop).catch(error => {
                            console.error(`Failed to fetch prices for imported item ${caseDrop.caseName}:`, error)
                        })
                    })
                    
                } catch (error) {
                    console.error('CSV import error:', error)
                    this.showNotification(`Failed to import CSV: ${error.message}`, 'error')
                }
            }
            
            reader.readAsText(file)
        })
        
        // Trigger file selection
        document.body.appendChild(input)
        input.click()
        document.body.removeChild(input)
    }

    showNotification(message, type = 'info') {
        if (window.notyf) {
            if (type === 'success') {
                window.notyf.success(message)
            } else if (type === 'error') {
                window.notyf.error(message)
            } else if (type === 'warning') {
                window.notyf.open({ type: 'warning', message })
            } else {
                window.notyf.open({ type, message })
            }
        } else {
            console.log(`${type.toUpperCase()}: ${message}`)
        }
    }

    getErrorHTML(error) {
        return `
            <div class="text-center py-20">
                <div class="text-red-400 text-6xl mb-4 font-bold">!</div>
                <h2 class="text-2xl font-bold text-red-400 mb-4">Case Drops Page Error</h2>
                <p class="text-gray-300 mb-6">${error.message}</p>
                <button onclick="window.location.reload()" 
                        class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
                    Reload Page
                </button>
            </div>
        `
    }

    // ============================================================================================
    // AUTO-SELECTION METHODS
    // ============================================================================================

    /**
     * Automatically selects the current week based on today's date
     */
    autoSelectCurrentWeek() {
        const today = new Date()
        const currentYear = today.getFullYear()
        const currentMonth = today.getMonth()
        const currentDay = today.getDate()
        
        console.log('🕐 Auto-selecting current week for:', {
            date: today.toLocaleDateString(),
            year: currentYear,
            month: currentMonth,
            day: currentDay
        })
        
        // Find or create the current year
        const state = this.getStore()
        let yearExists = state.years.find(y => y.year === currentYear)
        
        if (!yearExists) {
            console.log('📅 Current year not found, creating:', currentYear)
            this.getStore().addYear(currentYear)
            // Refresh state after adding year
            setTimeout(() => {
                this.continueAutoSelection(currentYear, currentMonth, currentDay)
            }, 100)
        } else {
            this.continueAutoSelection(currentYear, currentMonth, currentDay)
        }
    }
    
    /**
     * Continues auto-selection after ensuring year exists
     */
    continueAutoSelection(year, month, day) {
        console.log('🔄 Continuing auto-selection with year/month/day:', year, month, day)
        
        // Select the year
        this.selectYear(year)
        
        // Small delay to ensure year selection is processed
        setTimeout(() => {
            // Select the month
            this.selectMonth(month)
            
            // Another small delay for month selection
            setTimeout(() => {
                // Determine which week the current day falls into
                const weekNumber = this.getWeekNumberForDay(day)
                const weekId = `${year}-${month}-w${weekNumber}`
                
                console.log('📅 Auto-selecting week:', {
                    weekNumber,
                    weekId,
                    day
                })
                
                // Select the week
                this.selectWeek(weekId)
            }, 50)
        }, 50)
    }
    
    /**
     * Determines which week number a day falls into
     * Week 1: days 1-7, Week 2: days 8-14, Week 3: days 15-21, Week 4: days 22-28, Week 5: days 29-31
     */
    getWeekNumberForDay(day) {
        if (day <= 7) return 1
        if (day <= 14) return 2
        if (day <= 21) return 3
        if (day <= 28) return 4
        return 5 // days 29-31
    }


    // ============================================================================================
    // UTILITY METHODS
    // ============================================================================================

    /**
     * Safely formats date strings without timezone issues
     * @param {string} dateString - ISO date string like '2025-08-01'
     * @returns {string} - Formatted date like '01/08/2025' (dd/mm/yyyy)
     */
    formatDateSafely(dateString) {
        if (!dateString) return 'N/A'
        
        // Parse the ISO date string as local date to avoid timezone shifts
        const parts = dateString.split('-')
        if (parts.length !== 3) return dateString
        
        const year = parseInt(parts[0])
        const month = parseInt(parts[1])
        const day = parseInt(parts[2])
        
        // Return in dd/mm/yyyy format strictly
        return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`
    }

    /**
     * Format drop date for display - handles both dd/mm/yyyy and yyyy-mm-dd formats
     * @param {string} dateString - Date string in various formats
     * @returns {string} - Formatted date like '01/08/2025' (dd/mm/yyyy)
     */
    formatDropDate(dateString) {
        if (!dateString) return 'N/A'
        
        // Check if it's already in dd/mm/yyyy format
        if (dateString.includes('/')) {
            const parts = dateString.split('/')
            if (parts.length === 3) {
                // Ensure proper padding
                const day = parts[0].padStart(2, '0')
                const month = parts[1].padStart(2, '0')
                const year = parts[2]
                return `${day}/${month}/${year}`
            }
        }
        
        // Check if it's in yyyy-mm-dd format
        if (dateString.includes('-')) {
            const parts = dateString.split('-')
            if (parts.length === 3) {
                const year = parseInt(parts[0])
                const month = parseInt(parts[1])
                const day = parseInt(parts[2])
                return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`
            }
        }
        
        // Fallback: return as is
        return dateString
    }

    /**
     * Generates a unique ID for case drops
     */
    generateUniqueId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9)
    }

    /**
     * Setup date picker synchronization between text input and hidden date picker
     */
    setupDatePickerSync(textInputId, datePickerId) {
        setTimeout(() => {
            const textInput = document.getElementById(textInputId)
            const datePicker = document.getElementById(datePickerId)
            
            if (textInput && datePicker) {
                // When date picker changes, update text input
                datePicker.addEventListener('change', () => {
                    if (datePicker.value) {
                        textInput.value = this.convertISOToFormattedDate(datePicker.value)
                    }
                })
                
                // When text input changes, update date picker
                textInput.addEventListener('blur', () => {
                    const isoDate = this.convertFormattedToISODate(textInput.value)
                    if (isoDate) {
                        datePicker.value = isoDate
                    }
                })
            }
        }, 100)
    }

    /**
     * Escapes HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div')
        div.textContent = text
        return div.innerHTML
    }

    /**
     * Gets case drop form data
     */
    getCaseDropFormData() {
        const caseNameEl = document.getElementById('case-name')
        const dropDateEl = document.getElementById('drop-date')
        const casePriceEl = document.getElementById('case-price')
        const caseAccountEl = document.getElementById('case-account')
        
        if (!caseNameEl || !dropDateEl || !casePriceEl || !caseAccountEl) {
            console.error('❌ Some form elements not found!')
            return null
        }
        
        const formData = {
            caseName: caseNameEl.value.trim(),
            dropDate: dropDateEl.value.trim(),
            casePrice: parseFloat(casePriceEl.value),
            caseAccount: caseAccountEl.value.trim()
        }
        
        console.log('📋 Form data retrieved:', formData)
        return formData
    }

    /**
     * Validates case drop form data
     */
    validateCaseDropForm(caseDropData) {
        if (!caseDropData.caseName || !caseDropData.dropDate || 
            !caseDropData.casePrice || caseDropData.casePrice <= 0 || 
            !caseDropData.caseAccount) {
            this.showNotification('Please fill in all required fields with valid values', 'error')
            return false
        }

        // Validate date format
        if (!this.isValidDate(caseDropData.dropDate)) {
            this.showNotification('Please enter drop date in dd/mm/yyyy format', 'error')
            return false
        }

        return true
    }

    /**
     * Clears the case drop form
     */
    clearCaseDropForm() {
        const elements = ['case-name', 'case-price', 'case-account']
        elements.forEach(id => {
            const element = document.getElementById(id)
            if (element) element.value = ''
        })
        
        const dropDateElement = document.getElementById('drop-date')
        if (dropDateElement) {
            dropDateElement.value = this.getTodayFormatted()
        }
    }

    // ============================================================================================
    // WEEK MANAGEMENT METHODS
    // ============================================================================================

    /**
     * Gets current week object
     */
    getCurrentWeek() {
        if (!this.currentYear || this.currentMonth === null || !this.currentWeek) return null
        
        const state = this.getStore()
        const yearData = state.years.find(y => y.year === this.currentYear)
        if (!yearData) return null
        
        // Search all months for the current week ID
        for (const month of yearData.months) {
            const week = month.weeks.find(w => w.id === this.currentWeek)
            if (week) return week
        }
        
        return null
    }

    /**
     * Generates weeks for a specific month (simple 7-day periods)
     * Week 1: Days 1-7, Week 2: Days 8-14, Week 3: Days 15-21, etc.
     */
    generateWeeksForMonth(year, month) {
        const weeks = []
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const daysInMonth = lastDay.getDate()
        
        let weekNum = 1
        let startDay = 1
        
        while (startDay <= daysInMonth) {
            let endDay = Math.min(startDay + 6, daysInMonth) // 7 days per week, or end of month
            
            const weekStart = new Date(year, month, startDay)
            const weekEnd = new Date(year, month, endDay)
            
            // Calculate date range for display
            const startStr = weekStart.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
            const endStr = weekEnd.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
            
            weeks.push({
                id: `${year}-${month}-w${weekNum}`,
                week: weekNum,
                name: `Week ${weekNum}`,
                startDate: weekStart.toISOString().split('T')[0],
                endDate: weekEnd.toISOString().split('T')[0],
                displayRange: `${startStr} - ${endStr}`
            })
            
            weekNum++
            startDay += 7 // Move to next week
        }
        
        return weeks
    }

    /**
     * Checks if date falls within a week
     */
    isDateInWeek(dateString, week) {
        console.log(`🔍 Checking if date ${dateString} is in week:`, {
            weekId: week.id,
            weekName: week.name,
            startDate: week.startDate,
            endDate: week.endDate,
            hasStartDate: !!week.startDate,
            hasEndDate: !!week.endDate
        })
        
        if (!week.startDate || !week.endDate) {
            console.log(`⚠️ Week ${week.name || 'unknown'} has no date range, allowing match`)
            return true // Allow if no date range set
        }
        
        // Convert dd/mm/yyyy to Date objects
        const parseDate = (dateStr) => {
            // If it's already in dd/mm/yyyy format
            if (dateStr.includes('/')) {
                const [day, month, year] = dateStr.split('/')
                return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
            }
            // If it's in ISO format, convert it
            const date = new Date(dateStr)
            return date
        }
        
        const dropDateObj = parseDate(dateString)
        const weekStart = parseDate(week.startDate)
        const weekEnd = parseDate(week.endDate)
        
        // Set time to midnight to ensure proper date comparison
        dropDateObj.setHours(0, 0, 0, 0)
        weekStart.setHours(0, 0, 0, 0)
        weekEnd.setHours(0, 0, 0, 0)
        
        return dropDateObj >= weekStart && dropDateObj <= weekEnd
    }

    /**
     * Finds the correct week for a given date
     */
    findWeekForDate(dateString) {
        // Parse dd/mm/yyyy format
        const [day, month, year] = dateString.split('/').map(num => parseInt(num, 10))
        const dropDate = new Date(year, month - 1, day) // month is 0-indexed in JavaScript
        const jsMonth = month - 1 // JavaScript months are 0-indexed
        
        console.log(`🔍 Finding week for date: ${dateString} (Year: ${year}, Month: ${month}, JSMonth: ${jsMonth}, Day: ${day})`)
        
        const state = this.getStore()
        const yearData = state.years.find(y => y.year === year)
        if (!yearData) {
            console.log(`❌ Year ${year} not found in store`)
            return null
        }
        
        const monthData = yearData.months.find(m => m.month === jsMonth)
        if (!monthData) {
            console.log(`❌ Month ${jsMonth} (${month}) not found in year ${year}`)
            return null
        }
        
        console.log(`📅 Checking ${monthData.weeks.length} weeks in ${monthData.name} ${year}`)
        
        // Find the week that contains this date
        for (const week of monthData.weeks) {
            console.log(`🔍 Checking week ${week.name || `Week ${week.week || 1}`} (${week.startDate} to ${week.endDate})`)
            if (this.isDateInWeek(dateString, week)) {
                console.log(`✅ Found matching week: ${week.name || `Week ${week.week || 1}`} (${week.id})`)
                return {
                    weekId: week.id,
                    year: year,
                    month: jsMonth,
                    week: week
                }
            }
        }
        
        console.log(`❌ No matching week found for date ${dateString}`)
        return null
    }

    /**
     * Fixes existing case drop week assignments (migration function)
     */
    fixExistingCaseDropAssignments() {
        const state = this.getStore()
        const caseDrops = state.caseDrops || []
        let fixedCount = 0
        
        // First, ensure all weeks have proper names
        this.fixWeekNames(state)
        
        caseDrops.forEach(caseDrop => {
            if (caseDrop.dropDate && !caseDrop.weekId) {
                // Only fix case drops that are missing weekId
                const normalizedDate = this.normalizeDateFormat(caseDrop.dropDate)
                
                // Try to find existing week
                let correctWeekInfo = this.findWeekForDate(normalizedDate)
                
                // If week doesn't exist, create the year structure
                if (!correctWeekInfo) {
                    const [day, month, year] = normalizedDate.split('/').map(num => parseInt(num, 10))
                    console.log(`📅 Auto-creating year ${year} for fixing case drop assignment: ${normalizedDate}`)
                    state.addYear(year)
                    
                    // Try again after creating year
                    correctWeekInfo = this.findWeekForDate(normalizedDate)
                }
                
                if (correctWeekInfo) {
                    // Update the case drop with correct week assignment
                    state.updateCaseDrop(caseDrop.id, {
                        weekId: correctWeekInfo.weekId,
                        year: correctWeekInfo.year,
                        month: correctWeekInfo.month
                    })
                    fixedCount++
                    console.log(`🔧 Fixed case drop "${caseDrop.caseName}" assignment to ${correctWeekInfo.weekId}`)
                } else {
                    console.warn(`⚠️ Could not find or create week for case drop: ${caseDrop.caseName} (${normalizedDate})`)
                }
            }
        })
        
        if (fixedCount > 0) {
            console.log(`📅 Fixed ${fixedCount} case drop week assignments`)
            this.showNotification(`Fixed ${fixedCount} case drop week assignments`, 'info')
            this.renderCurrentWeek()
            this.refreshCaseDropsDisplay()
        }
        
        return fixedCount
    }

    /**
     * Ensures all weeks have proper names
     */
    fixWeekNames(state) {
        let nameFixedCount = 0
        
        state.years.forEach(yearData => {
            yearData.months.forEach(monthData => {
                monthData.weeks.forEach((week, index) => {
                    if (!week.name) {
                        // Assign proper name based on week number or index
                        const weekNumber = week.week || (index + 1)
                        week.name = `Week ${weekNumber}`
                        nameFixedCount++
                        console.log(`🔧 Fixed week name for ${yearData.year}-${monthData.name}: ${week.name}`)
                    }
                })
            })
        })
        
        if (nameFixedCount > 0) {
            console.log(`🔧 Fixed ${nameFixedCount} week names`)
        }
    }

    /**
     * Switches between Overview and Analytics tabs
     */
    switchToTab(tabName) {
        // Update button states to match Investments page style
        const overviewTab = document.getElementById('overview-tab')
        const analyticsTab = document.getElementById('analytics-tab')
        
        // Reset button styles
        if (overviewTab) {
            overviewTab.className = 'trading-tab flex-1 px-6 py-3 text-sm font-semibold text-gray-300 bg-gray-800 hover:bg-gray-700 transition flex items-center justify-center gap-2 rounded-l-lg'
        }
        if (analyticsTab) {
            analyticsTab.className = 'trading-tab flex-1 px-6 py-3 text-sm font-semibold text-gray-300 bg-gray-800 hover:bg-gray-700 transition flex items-center justify-center gap-2 rounded-r-lg'
        }
        
        // Hide all tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden')
        })
        
        // Show selected tab
        if (tabName === 'overview') {
            if (overviewTab) {
                overviewTab.className = 'trading-tab active flex-1 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-600 border-r border-gray-600 hover:from-blue-600 hover:to-purple-700 transition flex items-center justify-center gap-2 rounded-l-lg'
            }
            
            const overviewContent = document.getElementById('overview-content')
            if (overviewContent) {
                overviewContent.classList.remove('hidden')
            }
        } else if (tabName === 'analytics') {
            if (analyticsTab) {
                analyticsTab.className = 'trading-tab active flex-1 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition flex items-center justify-center gap-2 rounded-r-lg'
            }
            
            const analyticsContent = document.getElementById('analytics-content')
            if (analyticsContent) {
                analyticsContent.classList.remove('hidden')
            }
            
            // Refresh analytics when switching to Analytics tab
            this.refreshAnalytics()
        }
    }
    
    /**
     * Refreshes analytics content
     */
    refreshAnalytics() {
        const state = this.getStore()
        const stats = this.calculateCaseDropStats(state)
        
        // Update main Analytics Overview metric cards
        this.updateAnalyticsOverviewCards(stats)
        
        // Update header statistics
        this.updateHeaderStats(stats)
        
        // Update account statistics content
        const accountStatsContent = document.getElementById('account-stats-content')
        if (accountStatsContent) {
            accountStatsContent.innerHTML = this.getAccountStatsHTML(stats.accountStats, state)
        }
        
        // Update performance metrics
        const performanceMetrics = document.getElementById('performance-metrics')
        if (performanceMetrics) {
            performanceMetrics.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="text-gray-300">Total Drops</span>
                    <span class="text-blue-400 font-semibold">${stats.totalCases || 0}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-gray-300">Average Value</span>
                    <span class="text-green-400 font-semibold">$${this.formatNumber(stats.avgValue || 0)}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-gray-300">Total Value</span>
                    <span class="text-purple-400 font-semibold">$${this.formatNumber(stats.totalValue || 0)}</span>
                </div>
            `
        }
        
        // Reinitialize charts if needed
        this.initializeCharts()
    }

    /**
     * Updates the main Analytics Overview metric cards
     */
    updateAnalyticsOverviewCards(stats) {
        // Update total cases
        const totalCasesEl = document.getElementById('analytics-total-cases')
        if (totalCasesEl) totalCasesEl.textContent = stats.totalCases || 0

        // Update total value
        const totalValueEl = document.getElementById('analytics-total-value')
        if (totalValueEl) totalValueEl.textContent = `$${this.formatNumber(stats.totalValue || 0)}`

        // Update average value
        const avgValueEl = document.getElementById('analytics-avg-value')
        if (avgValueEl) avgValueEl.textContent = `$${this.formatNumber(stats.avgValue || 0)}`

        // Update recent cases (30 days)
        const recentCasesEl = document.getElementById('analytics-recent-cases')
        if (recentCasesEl) recentCasesEl.textContent = stats.recentActivity?.cases || 0

        console.log('📊 Updated Analytics Overview cards:', {
            totalCases: stats.totalCases || 0,
            totalValue: this.formatNumber(stats.totalValue || 0),
            avgValue: this.formatNumber(stats.avgValue || 0),
            recentCases: stats.recentActivity?.cases || 0
        })
    }

    // ============================================================================================
    // MISSING METHODS
    // ============================================================================================

    /**
     * Gets current week statistics
     */
    getCurrentWeekStats() {
        const currentWeekCaseDrops = this.getCurrentWeekCaseDrops()
        const totalCases = currentWeekCaseDrops.length
        const totalValue = currentWeekCaseDrops.reduce((sum, drop) => sum + (drop.price || 0), 0)
        const avgValue = totalCases > 0 ? totalValue / totalCases : 0
        
        return {
            totalCases,
            totalValue,
            avgValue,
            caseDrops: currentWeekCaseDrops
        }
    }

    /**
     * Gets case drops for current week
     */
    getCurrentWeekCaseDrops() {
        if (!this.currentWeek) return []
        
        const state = this.getStore()
        const caseDrops = state.caseDrops || []
        
        return caseDrops.filter(caseDrop => caseDrop.weekId === this.currentWeek)
    }

    /**
     * Calculate account statistics
     */
    calculateAccountStats(caseDrops) {
        const accountMap = {}
        
        caseDrops.forEach(drop => {
            const account = drop.account || 'Unknown'
            if (!accountMap[account]) {
                accountMap[account] = { cases: 0, value: 0 }
            }
            accountMap[account].cases++
            accountMap[account].value += drop.price || 0
        })
        
        return Object.entries(accountMap).map(([account, stats]) => ({
            account,
            ...stats
        }))
    }

    /**
     * Shows the case drop form (removed duplicate)
     */

    /**
     * Hides the case drop form
     */
    hideCaseDropForm() {
        const formContainer = document.getElementById('case-drop-form-container')
        if (formContainer) formContainer.classList.add('hidden')
        this.clearCaseDropForm()
    }

    /**
     * Gets account statistics HTML
     */
    getAccountStatsHTML(accountStats, state) {
        if (!accountStats || accountStats.length === 0) {
            return '<div class="text-gray-400 text-center py-4">No account data available</div>'
        }
        
        return accountStats.map(stat => `
            <div class="flex items-center justify-between py-2 border-b border-gray-700">
                <div class="font-medium text-white">${this.escapeHtml(stat.account)}</div>
                <div class="text-right">
                    <div class="text-green-400 font-semibold">$${this.formatNumber(stat.value)}</div>
                    <div class="text-xs text-gray-400">${stat.cases} items</div>
                </div>
            </div>
        `).join('')
    }

    // ============================================================================================
    // CASE DROP EDITING AND MANAGEMENT
    // ============================================================================================

    /**
     * Handles case drop action buttons
     */
    handleCaseDropAction(action, id) {
        console.log(`🎯 Handling case drop action: ${action} for ID: ${id}`)
        
        switch (action) {
            case 'edit':
                this.editCaseDrop(id)
                break
            case 'remove':
                this.removeCaseDrop(id)
                break
            default:
                console.error('❌ Unknown case drop action:', action)
                this.showNotification('Unknown action', 'error')
        }
    }

    /**
     * Opens edit modal for case drop
     */
    editCaseDrop(id) {
        console.log('🔧 Edit case drop clicked for ID:', id)
        const state = this.getStore()
        const caseDrop = state.caseDrops.find(drop => drop.id === id)
        
        if (!caseDrop) {
            console.error('Case drop not found with ID:', id)
            this.showNotification('Case drop not found', 'error')
            return
        }

        this.editingCaseDrop = caseDrop
        
        // Populate edit form
        document.getElementById('editCaseItemName').value = caseDrop.caseName || ''
        document.getElementById('editCasePrice').value = caseDrop.price || ''
        document.getElementById('editCaseAccount').value = caseDrop.account || ''

        // Handle date formatting properly
        const dateInput = document.getElementById('editCaseDropDate')
        const datePicker = document.getElementById('editCaseDropDatePicker')
        
        if (caseDrop.dropDate) {
            // Check if the stored date is in ISO format (yyyy-mm-dd) or dd/mm/yyyy format
            let formattedDate = caseDrop.dropDate
            let isoDate = null
            
            if (caseDrop.dropDate.includes('-') && caseDrop.dropDate.length === 10) {
                // It's in ISO format, convert to dd/mm/yyyy
                isoDate = caseDrop.dropDate
                formattedDate = this.convertISOToFormattedDate(caseDrop.dropDate)
            } else if (caseDrop.dropDate.includes('/')) {
                // It's already in dd/mm/yyyy format
                formattedDate = caseDrop.dropDate
                isoDate = this.convertFormattedToISODate(caseDrop.dropDate)
            }
            
            // Set the text input to dd/mm/yyyy format
            dateInput.value = formattedDate
            
            // Set the hidden date picker to ISO format if available
            if (datePicker && isoDate) {
                datePicker.value = isoDate
            }
        }

        // Show modal
        const modal = document.getElementById('editCaseDropModal')
        if (modal) modal.classList.remove('hidden')
        
        console.log('✅ Edit case drop modal opened for:', caseDrop.caseName)
    }

    /**
     * Saves case drop edit changes
     */
    saveCaseDropEdit() {
        if (!this.editingCaseDrop) {
            this.showNotification('No case drop selected for editing', 'error')
            return
        }

        const editData = {
            caseName: document.getElementById('editCaseItemName').value.trim(),
            dropDate: document.getElementById('editCaseDropDate').value.trim(),
            price: parseFloat(document.getElementById('editCasePrice').value),
            account: document.getElementById('editCaseAccount').value.trim()
        }
        
        if (!editData.caseName || !editData.dropDate || 
            !editData.price || editData.price <= 0 || 
            !editData.account) {
            this.showNotification('Please fill in all required fields with valid values', 'error')
            return
        }

        // Validate date format
        if (!this.isValidDate(editData.dropDate)) {
            this.showNotification('Please enter drop date in dd/mm/yyyy format', 'error')
            return
        }

        // Check if the case name has changed to trigger price fetching
        const nameChanged = this.editingCaseDrop.caseName !== editData.caseName
        
        // Update in store
        this.getStore().updateCaseDrop(this.editingCaseDrop.id, editData)
        
        // If the case name changed, fetch new prices
        if (nameChanged) {
            const updatedCaseDrop = this.getStore().caseDrops.find(drop => drop.id === this.editingCaseDrop.id)
            if (updatedCaseDrop) {
                this.fetchPricesForCaseDrop(updatedCaseDrop).catch(error => {
                    console.error('Failed to fetch prices for updated case drop:', error)
                })
            }
        }
        
        this.closeCaseDropEditModal()
        this.renderCurrentWeek()
        this.refreshCaseDropsDisplay()
        this.refreshAnalytics()
        this.showNotification(`Updated "${editData.caseName}" successfully`, 'success')
    }

    /**
     * Closes case drop edit modal
     */
    closeCaseDropEditModal() {
        const modal = document.getElementById('editCaseDropModal')
        if (modal) modal.classList.add('hidden')
        this.editingCaseDrop = null
    }

    /**
     * Removes case drop
     */
    removeCaseDrop(id) {
        console.log('🗑️ Remove case drop clicked for ID:', id)
        const state = this.getStore()
        const caseDrop = state.caseDrops.find(drop => drop.id === id)
        
        if (!caseDrop) {
            console.error('Case drop not found with ID:', id)
            this.showNotification('Case drop not found', 'error')
            return
        }

        // Store the ID for deletion and show modal
        this.pendingDeleteId = id
        document.getElementById('deleteCaseDropName').textContent = caseDrop.caseName
        this.showDeleteModal()
    }

    /**
     * Shows delete confirmation modal
     */
    showDeleteModal() {
        const modal = document.getElementById('deleteCaseDropModal')
        modal.style.display = 'flex'
        const modalContent = modal.querySelector('.bg-gray-900')
        modalContent.classList.remove('scale-95')
        modalContent.classList.add('scale-100')
    }

    /**
     * Hides delete confirmation modal
     */
    hideDeleteModal(instant = false) {
        const modal = document.getElementById('deleteCaseDropModal')
        const modalContent = modal.querySelector('.bg-gray-900')
        
        if (instant) {
            // Instant close for cancel actions
            modal.style.display = 'none'
            this.pendingDeleteId = null
        } else {
            // Animate out for successful actions
            modalContent.classList.remove('scale-100')
            modalContent.classList.add('scale-95')
            
            // Hide after animation
            setTimeout(() => {
                modal.style.display = 'none'
                this.pendingDeleteId = null
            }, 200)
        }
    }

    /**
     * Executes the case drop deletion
     */
    executeDelete() {
        if (this.pendingDeleteId) {
            const state = this.getStore()
            const caseDrop = state.caseDrops.find(drop => drop.id === this.pendingDeleteId)
            const caseDropName = caseDrop ? caseDrop.caseName : 'Unknown'
            
            this.getStore().deleteCaseDrop(this.pendingDeleteId)
            this.renderCurrentWeek()
            this.refreshCaseDropsDisplay()
            this.refreshAnalytics() // Update analytics after deleting case drop
            this.showNotification(`Removed "${caseDropName}" from case drops`, 'success')
            console.log('✅ Case drop removed:', caseDropName)
            this.hideDeleteModal()
        }
    }

    /**
     * Renders current week content
     */
    renderCurrentWeek() {
        const weekContent = document.getElementById('week-content')
        if (!weekContent) return
        
        const currentWeek = this.getCurrentWeek()
        const currentWeekCaseDrops = this.getCurrentWeekCaseDrops()
        
        if (!currentWeek) {
            weekContent.innerHTML = '<p class="text-gray-400">No week selected</p>'
            return
        }
        
        // Update week summary cards with calculated data
        this.updateWeekSummaryCards(currentWeek, currentWeekCaseDrops)
        
        // Always generate the week content, even if there are no case drops (will show 0 values)
        weekContent.innerHTML = this.generateWeekContent(currentWeek, currentWeekCaseDrops)
    }

    /**
     * Updates week summary cards with current data
     */
    updateWeekSummaryCards(currentWeek, currentWeekCaseDrops) {
        const totalCases = currentWeekCaseDrops.length
        const totalValue = currentWeekCaseDrops.reduce((sum, drop) => sum + (drop.price || 0), 0)
        const avgValue = totalCases > 0 ? totalValue / totalCases : 0
        
        // Fix timezone issues by parsing dates correctly
        const weekStart = currentWeek.startDate ? this.formatDateSafely(currentWeek.startDate) : 'N/A'
        const weekEnd = currentWeek.endDate ? this.formatDateSafely(currentWeek.endDate) : 'N/A'
        
        console.log(`📊 Updating week summary cards:`, {
            currentWeekId: currentWeek?.id,
            totalCases,
            totalValue,
            avgValue,
            weekStart,
            weekEnd,
            caseDrops: currentWeekCaseDrops.map(drop => ({ name: drop.caseName, weekId: drop.weekId }))
        })
        
        // Update DOM elements
        const totalCasesEl = document.getElementById('week-total-cases')
        const totalValueEl = document.getElementById('week-total-value')
        const avgValueEl = document.getElementById('week-avg-value')
        const weekPeriodEl = document.getElementById('week-period')
        
        if (totalCasesEl) totalCasesEl.textContent = totalCases
        if (totalValueEl) totalValueEl.textContent = `$${this.formatNumber(totalValue)}`
        if (avgValueEl) avgValueEl.textContent = `$${this.formatNumber(avgValue)}`
        if (weekPeriodEl) weekPeriodEl.textContent = `${weekStart} - ${weekEnd}`
        
        console.log(`📊 Week summary cards updated - DOM elements found:`, {
            totalCasesEl: !!totalCasesEl,
            totalValueEl: !!totalValueEl,
            avgValueEl: !!avgValueEl,
            weekPeriodEl: !!weekPeriodEl
        })
        
        console.log('📊 Updated week summary cards:', {
            totalCases,
            totalValue: this.formatNumber(totalValue),
            avgValue: this.formatNumber(avgValue),
            period: `${weekStart} - ${weekEnd}`
        })
    }

    /**
     * Generates week content HTML
     */
    generateWeekContent(currentWeek, currentWeekCaseDrops) {
        const state = this.getStore()
        const totalCases = currentWeekCaseDrops.length
        const totalValue = currentWeekCaseDrops.reduce((sum, drop) => sum + (drop.price || 0), 0)
        const avgValue = totalCases > 0 ? totalValue / totalCases : 0
        
        // Fix timezone issues by parsing dates correctly
        const weekStart = currentWeek.startDate ? this.formatDateSafely(currentWeek.startDate) : 'N/A'
        const weekEnd = currentWeek.endDate ? this.formatDateSafely(currentWeek.endDate) : 'N/A'
        
        return `
            ${totalCases === 0 ? `
            <div class="text-center py-4">
                <div class="flex items-center justify-center gap-2 text-gray-400 mb-2">
                    <i data-lucide="info" class="w-4 h-4"></i>
                    <span class="text-sm">No case drops for this week yet</span>
                </div>
                <p class="text-gray-500 text-xs">Add your first case drop using the form above</p>
            </div>
            ` : ``}
        `
    }

    /**
     * Adds year with proper week structure
     */
    addYearWithWeeks(year) {
        console.log('📅 Adding year with weeks:', year)
        
        // Log state before adding
        const beforeState = this.getStore()
        console.log('📊 State before addYear:', {
            yearsCount: beforeState.years?.length || 0,
            years: beforeState.years?.map(y => y.year) || []
        })
        
        // Add the year
        this.getStore().addYear(year)
        
        // Log state immediately after adding
        const afterState = this.getStore()
        console.log('📊 State immediately after addYear:', {
            yearsCount: afterState.years?.length || 0,
            years: afterState.years?.map(y => y.year) || []
        })
        
        // Check localStorage to see if it was saved correctly
        const savedData = JSON.parse(localStorage.getItem('caseDropsHierarchical') || '{}')
        console.log('💾 LocalStorage after addYear:', {
            yearsCount: savedData.years?.length || 0,
            years: savedData.years?.map(y => y.year) || []
        })
        
        // Force UI update after store change
        this.forceUIUpdate()
        
        // Double-check state after UI update
        setTimeout(() => {
            const finalState = this.getStore()
            console.log('📊 Final state after UI update:', {
                yearsCount: finalState.years?.length || 0,
                years: finalState.years?.map(y => y.year) || []
            })
        }, 100)
    }
    
    /**
     * Forces a complete UI update after store changes
     */
    forceUIUpdate() {
        console.log('🔄 Forcing UI update...')
        
        // Try immediate update first
        this.performUIUpdate('immediate')
        
        // Also try with small delays to catch any async state updates
        setTimeout(() => this.performUIUpdate('50ms delay'), 50)
        setTimeout(() => this.performUIUpdate('100ms delay'), 100)
        setTimeout(() => this.performUIUpdate('200ms delay'), 200)
    }
    
    performUIUpdate(context) {
        try {
            console.log(`🔄 Performing UI update (${context})...`)
            
            // Get fresh store state
            const freshState = this.getStore()
            console.log(`📊 Store state (${context}):`, {
                yearsCount: freshState?.years?.length || 0,
                caseDropsCount: freshState?.caseDrops?.length || 0,
                years: freshState?.years?.map(y => y.year) || []
            })
            
            // Re-render year tabs with fresh store data
            this.renderYearTabs()
            
            // Re-render case drops table
            this.refreshCaseDropsDisplay()
            
            // Update statistics cards
            this.updateStatisticsCards()
            
            // Update analytics if needed
            this.refreshAnalytics()
            
            // Re-initialize icons if needed
            if (typeof lucide !== 'undefined') {
                lucide.createIcons()
            }
            
            console.log(`✅ UI update completed (${context})`)
        } catch (error) {
            console.error(`❌ Error during UI update (${context}):`, error)
        }
    }

    /**
     * Initializes basic chart functionality
     */
    initializeCharts() {
        console.log('📊 Initializing charts...')
        
        // Wait for DOM elements to be ready
        setTimeout(() => {
            try {
                this.createWeeklyDistributionChart()
                this.createMonthlyTrendsChart()
                this.createPriceDistributionChart()
                console.log('✅ Charts initialized successfully')
            } catch (error) {
                console.error('❌ Failed to initialize charts:', error)
            }
        }, 500)
    }

    createWeeklyDistributionChart() {
        const canvas = document.getElementById('weeklyDistributionChart')
        if (!canvas) {
            // Silently return if chart element not found (not on Cases page)
            return
        }

        // Get current state and calculate weekly data
        const state = this.getStore()
        const caseDrops = state.caseDrops || []
        
        // Calculate weekly distribution data
        const weeklyData = this.calculateWeeklyDistribution(caseDrops)
        
        // Import Chart.js dynamically or use ApexCharts
        this.loadChartLibrary().then(() => {
            const ctx = canvas.getContext('2d')
            
            if (this.charts.weeklyDistribution) {
                this.charts.weeklyDistribution.destroy()
            }
            
            this.charts.weeklyDistribution = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: weeklyData.labels,
                    datasets: [{
                        label: 'Items per Week',
                        data: weeklyData.values,
                        backgroundColor: 'rgba(59, 130, 246, 0.8)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: '#d1d5db' }
                        },
                        tooltip: {
                            callbacks: {
                                title: function(context) {
                                    const index = context[0].dataIndex
                                    return `${weeklyData.monthInfo[index]} ${weeklyData.labels[index].replace(' ' + weeklyData.monthInfo[index].substring(0,3), '')}`
                                },
                                label: function(context) {
                                    return `${context.dataset.label}: ${context.parsed.y}`
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { 
                                color: '#9ca3af',
                                stepSize: 1 // Show whole numbers only
                            },
                            grid: { color: 'rgba(107, 114, 128, 0.3)' }
                        },
                        x: {
                            ticks: { 
                                color: function(context) {
                                    // Highlight Week 1 labels (ones that contain month names) - dynamic detection
                                    const label = weeklyData.labels[context.tick.value]
                                    if (label && label.includes('Week 1 ')) {
                                        return '#60a5fa' // Bright blue for Week 1 with month
                                    }
                                    return '#9ca3af' // Default gray
                                },
                                font: function(context) {
                                    const label = weeklyData.labels[context.tick.value]
                                    if (label && label.includes('Week 1 ')) {
                                        return {
                                            weight: 'bold' // Bold for Week 1 with month
                                        }
                                    }
                                    return {
                                        weight: 'normal'
                                    }
                                },
                                maxRotation: 45,
                                minRotation: 0
                            },
                            grid: { color: 'rgba(107, 114, 128, 0.3)' }
                        }
                    }
                }
            })
        }).catch(error => {
            console.error('Failed to load chart library for weekly distribution:', error)
            this.showChartFallback(canvas, 'Weekly Distribution', weeklyData)
        })
    }

    createMonthlyTrendsChart() {
        const canvas = document.getElementById('monthlyTrendsChart')
        if (!canvas) {
            // Silently return if chart element not found (not on Cases page)
            return
        }

        const state = this.getStore()
        const caseDrops = state.caseDrops || []
        
        const monthlyData = this.calculateMonthlyTrends(caseDrops)
        
        this.loadChartLibrary().then(() => {
            const ctx = canvas.getContext('2d')
            
            if (this.charts.monthlyTrends) {
                this.charts.monthlyTrends.destroy()
            }
            
            this.charts.monthlyTrends = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: monthlyData.labels,
                    datasets: [{
                        label: 'Monthly Drops',
                        data: monthlyData.values,
                        borderColor: 'rgba(251, 146, 60, 1)',
                        backgroundColor: 'rgba(251, 146, 60, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: '#d1d5db' }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { color: '#9ca3af' },
                            grid: { color: 'rgba(107, 114, 128, 0.3)' }
                        },
                        x: {
                            ticks: { color: '#9ca3af' },
                            grid: { color: 'rgba(107, 114, 128, 0.3)' }
                        }
                    }
                }
            })
        }).catch(error => {
            console.error('Failed to load chart library for monthly trends:', error)
            this.showChartFallback(canvas, 'Monthly Trends', monthlyData)
        })
    }

    createPriceDistributionChart() {
        const canvas = document.getElementById('priceDistributionChart')
        if (!canvas) {
            // Silently return if chart element not found (not on Cases page)
            return
        }

        const state = this.getStore()
        const caseDrops = state.caseDrops || []
        
        const priceData = this.calculatePriceDistribution(caseDrops)
        
        this.loadChartLibrary().then(() => {
            const ctx = canvas.getContext('2d')
            
            if (this.charts.priceDistribution) {
                this.charts.priceDistribution.destroy()
            }
            
            this.charts.priceDistribution = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: priceData.labels,
                    datasets: [{
                        data: priceData.values,
                        backgroundColor: [
                            'rgba(139, 92, 246, 0.8)',
                            'rgba(59, 130, 246, 0.8)',
                            'rgba(34, 197, 94, 0.8)',
                            'rgba(245, 158, 11, 0.8)',
                            'rgba(239, 68, 68, 0.8)'
                        ],
                        borderWidth: 2,
                        borderColor: '#1f2937'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { 
                                color: '#d1d5db',
                                padding: 15
                            }
                        }
                    }
                }
            })
        }).catch(error => {
            console.error('Failed to load chart library for price distribution:', error)
            this.showChartFallback(canvas, 'Price Distribution', priceData)
        })
    }

    async loadChartLibrary() {
        if (typeof Chart !== 'undefined') {
            return Promise.resolve()
        }
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script')
            script.src = chrome.runtime.getURL('src/libs/chart.umd.js')
            script.onload = () => {
                console.log('✅ Chart.js loaded successfully')
                resolve()
            }
            script.onerror = () => reject(new Error('Failed to load Chart.js'))
            document.head.appendChild(script)
        })
    }

    calculateWeeklyDistribution(caseDrops) {
        const state = this.getStore()
        const weeklyCount = {}
        
        // Get current date info
        const now = new Date()
        const currentYear = now.getFullYear()
        const currentMonth = now.getMonth() // 0-based
        
        // Generate last 6 months of weeks (including current month)
        const weeksToShow = []
        
        for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
            const targetDate = new Date(currentYear, currentMonth - monthOffset, 1)
            const targetYear = targetDate.getFullYear()
            const targetMonth = targetDate.getMonth()
            
            // Find corresponding data in your structure
            const yearData = state.years.find(y => y.year === targetYear)
            if (yearData) {
                const monthData = yearData.months.find(m => m.month === targetMonth)
                if (monthData) {
                    monthData.weeks.forEach(weekData => {
                        // Ensure weekData has a name property, fallback to "Week X" format
                        const weekName = weekData.name || `Week ${weekData.week || 1}`
                        const weekLabel = `${monthData.name} ${weekName}`
                        weeksToShow.push({
                            label: weekLabel,
                            id: weekData.id,
                            year: targetYear,
                            month: targetMonth,
                            week: weekData.week || (weekName ? parseInt(weekName.replace('Week ', '')) : 1)
                        })
                        weeklyCount[weekLabel] = 0 // Initialize with 0
                    })
                }
            }
        }
        
        // Count case drops by their assigned weekId
        caseDrops.forEach(caseDrop => {
            if (!caseDrop.weekId) {
                console.warn('⚠️ Case drop missing weekId:', caseDrop)
                return
            }
            
            // Find the week info for this weekId
            let weekLabel = null
            state.years.forEach(yearData => {
                yearData.months.forEach(monthData => {
                    const week = monthData.weeks.find(w => w.id === caseDrop.weekId)
                    if (week) {
                        weekLabel = `${monthData.name} ${week.name || `Week ${week.week || 1}`}`
                    }
                })
            })
            
            if (weekLabel && weeklyCount.hasOwnProperty(weekLabel)) {
                weeklyCount[weekLabel]++
                
                console.log('📊 Case drop assigned to week:', {
                    itemName: caseDrop.caseName || caseDrop.itemName,
                    weekId: caseDrop.weekId,
                    weekLabel: weekLabel,
                    dropDate: caseDrop.dropDate
                })
            }
        })
        
        // Sort weeks chronologically and create final arrays
        const sortedWeeks = weeksToShow.sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year
            if (a.month !== b.month) return a.month - b.month
            return a.week - b.week
        })
        
        // Create labels - only show month on Week 1 of each month
        const labels = sortedWeeks.map((w, index) => {
            const parts = w.label.split(' ') // "March Week 1" -> ["March", "Week", "1"] 
            const weekNumber = parts[2] // "1", "2", "3", etc.
            const monthName = parts[0]
            const shortMonth = monthName.substring(0, 3) // "March" -> "Mar"
            
            // Only show month on Week 1 of each month
            if (weekNumber === "1") {
                return `Week ${weekNumber} ${shortMonth}`
            } else {
                return `Week ${weekNumber}`
            }
        })
        const values = sortedWeeks.map(w => weeklyCount[w.label] || 0)
        const monthInfo = sortedWeeks.map(w => w.label.split(' ')[0]) // Extract month names
        
        console.log('📊 Final weekly distribution (6 months):', {
            labels: labels,
            values: values,
            monthInfo: monthInfo,
            totalWeeks: labels.length
        })
        
        return {
            labels: labels,
            values: values,
            monthInfo: monthInfo, // Pass month info for tooltips
            fullLabels: sortedWeeks.map(w => w.label) // Keep full labels for reference
        }
    }

    calculateMonthlyTrends(caseDrops) {
        
        const monthlyCount = {}
        const now = new Date()
        
        // Generate last 6 months
        for (let i = 5; i >= 0; i--) {
            const month = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const monthKey = month.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
            monthlyCount[monthKey] = 0
        }
        
        // Count cases per month - use correct date field
        caseDrops.forEach(caseDrop => {
            const dateStr = caseDrop.dropDate || caseDrop.date || caseDrop.dateAdded
            if (!dateStr) return
            
            const isoDate = this.convertFormattedToISODate(dateStr)
            const dropDate = new Date(isoDate)
            if (isNaN(dropDate.getTime())) return
            
            const monthKey = dropDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
            
            if (monthlyCount.hasOwnProperty(monthKey)) {
                monthlyCount[monthKey]++
            }
        })
        
        console.log('📊 Monthly trends:', monthlyCount)
        
        return {
            labels: Object.keys(monthlyCount),
            values: Object.values(monthlyCount)
        }
    }

    calculatePriceDistribution(caseDrops) {
        
        const priceRanges = {
            '$0-10': 0,
            '$10-50': 0,
            '$50-100': 0,
            '$100-500': 0,
            '$500+': 0
        }
        
        caseDrops.forEach(caseDrop => {
            // Try multiple possible price field names
            const value = parseFloat(caseDrop.price || caseDrop.value || caseDrop.amount || 0)
            
            if (value <= 10) priceRanges['$0-10']++
            else if (value <= 50) priceRanges['$10-50']++
            else if (value <= 100) priceRanges['$50-100']++
            else if (value <= 500) priceRanges['$100-500']++
            else priceRanges['$500+']++
        })
        
        console.log('📊 Price distribution:', priceRanges)
        
        return {
            labels: Object.keys(priceRanges),
            values: Object.values(priceRanges)
        }
    }

    showChartFallback(canvas, title, data) {
        const container = canvas.parentElement
        container.innerHTML = `
            <div class="flex items-center justify-center h-48 bg-gray-800 rounded-lg">
                <div class="text-center">
                    <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mx-auto mb-3 flex items-center justify-center">
                        <i data-lucide="bar-chart-3" class="w-6 h-6 text-white"></i>
                    </div>
                    <h4 class="text-white font-medium mb-1">${title}</h4>
                    <p class="text-gray-400 text-sm">Chart loading...</p>
                    ${data && data.values ? `
                        <div class="mt-3 text-xs text-gray-500">
                            Data points: ${data.values.reduce((a, b) => a + b, 0)}
                        </div>
                    ` : ''}
                </div>
            </div>
        `
        
        // Re-initialize icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons()
        }
    }

    /**
     * Check if prices have expired (older than 7 days)
     */
    arePricesExpired(caseDrop) {
        if (!caseDrop.pricesFetched || !caseDrop.pricesFetchedTimestamp) {
            return true // No prices fetched yet or no timestamp
        }
        
        const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
        const now = Date.now()
        const timeDiff = now - caseDrop.pricesFetchedTimestamp
        
        return timeDiff > sevenDaysInMs
    }

    /**
     * Fetch prices for all case drops
     */
    async fetchAllCaseDropPrices() {
        console.log('💰 Starting price fetch for all case drops...')
        const state = this.getStore()
        const caseDrops = state.caseDrops || []
        
        const itemsToFetch = caseDrops.filter(caseDrop => caseDrop.caseName && this.arePricesExpired(caseDrop))
        console.log(`💰 Found ${itemsToFetch.length} items needing price fetch`)
        
        if (itemsToFetch.length === 0) {
            console.log('✅ No items need price fetching')
            return
        }
        
        // Use Promise.allSettled for concurrent fetching (PriceService handles caching/rate limiting)
        const pricePromises = itemsToFetch.map(caseDrop => this.fetchPricesForCaseDrop(caseDrop))
        
        const results = await Promise.allSettled(pricePromises)
        
        const successful = results.filter(result => result.status === 'fulfilled').length
        const failed = results.filter(result => result.status === 'rejected').length
        
        console.log(`✅ Price fetching completed: ${successful} successful, ${failed} failed`)
        
        if (failed > 0) {
            console.warn('⚠️ Some price fetches failed, you may need to refresh or use the refresh prices button')
        }
    }

    /**
     * Fetch prices for a specific case drop using PriceService
     */
    async fetchPricesForCaseDrop(caseDrop) {
        console.log(`💰 Fetching prices for: ${caseDrop.caseName}`)
        
        try {
            // Use the centralized PriceService (same as investments)
            const prices = await priceService.getItemPrices(caseDrop.caseName)
            
            // Update the case drop object in store using the proper store method
            const state = this.getStore()
            const existingCaseDrop = state.caseDrops.find(cd => cd.id === caseDrop.id)
            
            if (existingCaseDrop) {
                // Use the store's updateCaseDrop method to ensure persistence
                state.updateCaseDrop(caseDrop.id, {
                    csfloatPrice: prices.csfloatPrice,
                    buff163Price: prices.buffPrice,
                    pricesFetched: true,
                    pricesFetchedTimestamp: Date.now()
                })
                
                // Update the UI immediately
                this.updatePriceDisplay(caseDrop.id, prices.csfloatPrice, prices.buffPrice)
                
                console.log(`✅ Updated prices for ${caseDrop.caseName}: CSFloat $${prices.csfloatPrice}, Buff163 $${prices.buffPrice}`)
            }
            
        } catch (error) {
            console.error(`❌ Failed to fetch prices for ${caseDrop.caseName}:`, error)
            this.updatePriceDisplay(caseDrop.id, null, null)
        }
    }


    /**
     * Initialize price cache
     */
    initializePriceCache() {
        if (!this.priceCache) {
            this.priceCache = new Map()
        }
    }

    /**
     * Get price from cache
     */
    getPriceFromCache(cacheKey) {
        this.initializePriceCache()
        const cached = this.priceCache.get(cacheKey)
        
        if (cached && cached.timestamp > Date.now() - (5 * 60 * 1000)) { // 5 minutes cache
            return cached.price
        }
        
        return null
    }

    /**
     * Cache price data
     */
    cachePriceData(cacheKey, price) {
        this.initializePriceCache()
        this.priceCache.set(cacheKey, {
            price: price,
            timestamp: Date.now()
        })
    }

    /**
     * Enhanced mock price database with comprehensive CS2 item prices
     */
    getMockPriceDatabase() {
        return {
            // Cases - Current Market Prices (January 2025)
            'Dreams & Nightmares Case': { csfloat: 1.60, buff163: 1.44 },
            'Recoil Case': { csfloat: 0.85, buff163: 0.78 },
            'Kilowatt Case': { csfloat: 0.65, buff163: 0.59 },
            'Revolution Case': { csfloat: 0.45, buff163: 0.42 },
            'Fracture Case': { csfloat: 0.55, buff163: 0.51 },
            'Snakebite Case': { csfloat: 0.25, buff163: 0.23 },
            'Operation Riptide Case': { csfloat: 0.35, buff163: 0.32 },
            'Operation Broken Fang Case': { csfloat: 0.40, buff163: 0.37 },
            'Shattered Web Case': { csfloat: 0.30, buff163: 0.28 },
            'CS20 Case': { csfloat: 0.38, buff163: 0.35 },
            'Prisma Case': { csfloat: 0.42, buff163: 0.39 },
            'Prisma 2 Case': { csfloat: 0.28, buff163: 0.26 },
            'Danger Zone Case': { csfloat: 0.22, buff163: 0.20 },
            'Horizon Case': { csfloat: 0.48, buff163: 0.44 },
            'Clutch Case': { csfloat: 0.32, buff163: 0.29 },
            'Gamma Case': { csfloat: 0.85, buff163: 0.78 },
            'Gamma 2 Case': { csfloat: 0.55, buff163: 0.51 },
            'Glove Case': { csfloat: 2.20, buff163: 2.05 },
            'Spectrum Case': { csfloat: 0.68, buff163: 0.63 },
            'Spectrum 2 Case': { csfloat: 0.38, buff163: 0.35 },
            'Operation Hydra Case': { csfloat: 1.85, buff163: 1.72 },
            'Chroma Case': { csfloat: 1.25, buff163: 1.18 },
            'Chroma 2 Case': { csfloat: 0.88, buff163: 0.82 },
            'Chroma 3 Case': { csfloat: 0.52, buff163: 0.48 },
            'Falchion Case': { csfloat: 0.95, buff163: 0.89 },
            'Shadow Case': { csfloat: 0.75, buff163: 0.70 },
            'Revolver Case': { csfloat: 0.18, buff163: 0.16 },
            'Operation Wildfire Case': { csfloat: 1.15, buff163: 1.08 },
            'Operation Phoenix Case': { csfloat: 1.45, buff163: 1.35 },
            'Huntsman Case': { csfloat: 1.75, buff163: 1.65 },
            'Operation Breakout Case': { csfloat: 0.95, buff163: 0.89 },
            'eSports 2013 Case': { csfloat: 12.50, buff163: 11.80 },
            'eSports 2014 Summer Case': { csfloat: 8.20, buff163: 7.85 },
            'CS:GO Weapon Case': { csfloat: 25.00, buff163: 23.50 },
            'CS:GO Weapon Case 2': { csfloat: 18.50, buff163: 17.25 },
            'CS:GO Weapon Case 3': { csfloat: 15.80, buff163: 14.90 },
            
            // Sticker Capsules
            'Antwerp 2022 Legends Capsule': { csfloat: 3.20, buff163: 2.95 },
            'Antwerp 2022 Challengers Capsule': { csfloat: 2.80, buff163: 2.55 },
            'Stockholm 2021 Legends Capsule': { csfloat: 4.15, buff163: 3.85 },
            'Stockholm 2021 Challengers Capsule': { csfloat: 3.65, buff163: 3.40 },
            'Berlin 2019 Major Capsule': { csfloat: 8.50, buff163: 7.95 },
            'Katowice 2019 Major Capsule': { csfloat: 12.20, buff163: 11.45 },
            
            // Popular Rifles
            'AK-47 | Redline (Field-Tested)': { csfloat: 25.50, buff163: 23.80 },
            'AK-47 | Vulcan (Factory New)': { csfloat: 185.00, buff163: 172.00 },
            'AK-47 | Fire Serpent (Field-Tested)': { csfloat: 850.00, buff163: 795.00 },
            'AK-47 | Asiimov (Field-Tested)': { csfloat: 95.00, buff163: 88.50 },
            'M4A4 | Howl (Field-Tested)': { csfloat: 2800.00, buff163: 2650.00 },
            'M4A1-S | Knight (Factory New)': { csfloat: 380.00, buff163: 355.00 },
            'M4A1-S | Icarus Fell (Factory New)': { csfloat: 125.00, buff163: 118.00 },
            'AWP | Dragon Lore (Factory New)': { csfloat: 4800.00, buff163: 4650.00 },
            'AWP | Medusa (Field-Tested)': { csfloat: 1200.00, buff163: 1125.00 },
            'AWP | Asiimov (Field-Tested)': { csfloat: 125.00, buff163: 118.00 },
            'AWP | Lightning Strike (Factory New)': { csfloat: 485.00, buff163: 455.00 },
            
            // Knives
            'Karambit | Doppler (Factory New)': { csfloat: 850.00, buff163: 820.00 },
            'Butterfly Knife | Fade (Factory New)': { csfloat: 1200.00, buff163: 1150.00 },
            'Bayonet | Tiger Tooth (Factory New)': { csfloat: 450.00, buff163: 425.00 },
            '★ Karambit | Crimson Web (Minimal Wear)': { csfloat: 2500.00, buff163: 2350.00 },
            '★ M9 Bayonet | Doppler (Factory New)': { csfloat: 650.00, buff163: 620.00 },
            '★ Butterfly Knife | Doppler (Factory New)': { csfloat: 950.00, buff163: 895.00 },
            '★ Gut Knife | Doppler (Factory New)': { csfloat: 185.00, buff163: 175.00 },
            '★ Flip Knife | Doppler (Factory New)': { csfloat: 320.00, buff163: 295.00 },
            
            // Gloves
            '★ Driver Gloves | Crimson Weave (Field-Tested)': { csfloat: 380.00, buff163: 365.00 },
            '★ Sport Gloves | Hedge Maze (Field-Tested)': { csfloat: 420.00, buff163: 395.00 },
            '★ Specialist Gloves | Crimson Kimono (Field-Tested)': { csfloat: 850.00, buff163: 795.00 },
            '★ Hand Wraps | Cobalt Skulls (Field-Tested)': { csfloat: 285.00, buff163: 265.00 }
        }
    }

    /**
     * Get simulated market price with realistic variation
     */
    getSimulatedPrice(itemName) {
        const priceDb = this.getMockPriceDatabase()
        const basePrice = priceDb[itemName]
        
        if (!basePrice) {
            // Generate realistic prices for unknown items based on category
            return this.generateRealisticPriceForUnknownItem(itemName)
        }
        
        // Add small random variation to simulate market fluctuations (±2-5%)
        const variationPercent = (Math.random() - 0.5) * 0.08 // ±4% max
        
        return {
            csfloat: Math.round((basePrice.csfloat * (1 + variationPercent)) * 100) / 100,
            buff163: Math.round((basePrice.buff163 * (1 + variationPercent)) * 100) / 100
        }
    }

    /**
     * Generate realistic prices for unknown items based on naming patterns
     */
    generateRealisticPriceForUnknownItem(itemName) {
        const name = itemName.toLowerCase()
        
        // Case detection and pricing
        if (name.includes('case')) {
            if (name.includes('operation') || name.includes('major') || name.includes('championship')) {
                return { csfloat: 0.50 + Math.random() * 2.0, buff163: 0.45 + Math.random() * 1.8 }
            }
            return { csfloat: 0.20 + Math.random() * 0.8, buff163: 0.18 + Math.random() * 0.7 }
        }
        
        // Knife detection and pricing
        if (name.includes('★') || name.includes('knife') || name.includes('bayonet') || name.includes('karambit')) {
            const basePrice = 200 + Math.random() * 800
            return { csfloat: basePrice, buff163: basePrice * 0.92 }
        }
        
        // Glove detection and pricing
        if (name.includes('gloves') || name.includes('wraps')) {
            const basePrice = 150 + Math.random() * 400
            return { csfloat: basePrice, buff163: basePrice * 0.94 }
        }
        
        // High-tier weapons
        if (name.includes('dragon lore') || name.includes('howl') || name.includes('fire serpent')) {
            const basePrice = 1000 + Math.random() * 3000
            return { csfloat: basePrice, buff163: basePrice * 0.90 }
        }
        
        // Regular weapon skins
        const basePrice = 5 + Math.random() * 150
        return { csfloat: basePrice, buff163: basePrice * 0.93 }
    }

    /**
     * Update price display in the UI using PriceService formatting
     */
    updatePriceDisplay(caseDropId, csfloatPrice, buff163Price) {
        const csfloatEl = document.getElementById(`csfloat-price-${caseDropId}`)
        const buff163El = document.getElementById(`buff163-price-${caseDropId}`)
        const badgeEl = document.getElementById(`price-badge-${caseDropId}`)
        
        if (csfloatEl) {
            if (csfloatPrice && csfloatPrice > 0) {
                csfloatEl.textContent = `$${priceService.formatPrice(csfloatPrice)}`
                csfloatEl.classList.add('text-cyan-100')
                csfloatEl.classList.remove('text-gray-500')
            } else {
                csfloatEl.innerHTML = '<span class="text-gray-500">N/A</span>'
            }
        }
        
        if (buff163El) {
            if (buff163Price && buff163Price > 0) {
                buff163El.textContent = `$${priceService.formatPrice(buff163Price)}`
                buff163El.classList.add('text-emerald-100')
                buff163El.classList.remove('text-gray-500')
            } else {
                buff163El.innerHTML = '<span class="text-gray-500">N/A</span>'
            }
        }
        
        // Update indicator dots
        if (badgeEl) {
            const csfloatDot = badgeEl.querySelector('.w-1\\.5.h-1\\.5:first-of-type')
            const buff163Dot = badgeEl.querySelector('.w-1\\.5.h-1\\.5:last-of-type')
            
            if (csfloatDot) {
                csfloatDot.className = (csfloatPrice && csfloatPrice > 0) ? 'w-1.5 h-1.5 bg-cyan-400 rounded-full' : 'w-1.5 h-1.5 bg-red-400 rounded-full'
            }
            
            if (buff163Dot) {
                buff163Dot.className = (buff163Price && buff163Price > 0) ? 'w-1.5 h-1.5 bg-emerald-400 rounded-full' : 'w-1.5 h-1.5 bg-red-400 rounded-full'
            }
        }
    }

    /**
     * Refresh prices for all items using PriceService
     */
    async refreshAllPrices() {
        const state = this.getStore()
        const caseDrops = state.caseDrops || []
        
        console.log('🔄 Refreshing all prices...')
        
        // Reset fetched status and clear PriceService cache to force refetch
        caseDrops.forEach(caseDrop => {
            if (caseDrop.caseName) {
                caseDrop.pricesFetched = false
            }
        })
        
        // Clear the PriceService cache to ensure fresh data
        priceService.priceDataCache = null
        priceService.priceCacheTimestamp = null
        
        // Use concurrent fetching
        const pricePromises = caseDrops
            .filter(caseDrop => caseDrop.caseName)
            .map(caseDrop => this.fetchPricesForCaseDrop(caseDrop))
        
        await Promise.allSettled(pricePromises)
        this.showNotification('Prices refreshed successfully!', 'success')
    }

    /**
     * Format date as dd/mm/yyyy
     */
    formatDate(date) {
        if (!date) return ''
        const d = new Date(date)
        const day = d.getDate().toString().padStart(2, '0')
        const month = (d.getMonth() + 1).toString().padStart(2, '0')
        const year = d.getFullYear()
        return `${day}/${month}/${year}`
    }

    /**
     * Get today's date in dd/mm/yyyy format
     */
    getTodayFormatted() {
        return this.formatDate(new Date())
    }

    /**
     * Get today's date in yyyy-mm-dd format (for HTML date inputs)
     */
    getTodayISO() {
        const today = new Date()
        return today.toISOString().split('T')[0]
    }

    /**
     * Convert yyyy-mm-dd format to dd/mm/yyyy format
     */
    convertISOToFormattedDate(isoDate) {
        if (!isoDate) return ''
        const parts = isoDate.split('-')
        if (parts.length === 3) {
            const [year, month, day] = parts
            return `${day}/${month}/${year}`
        }
        return isoDate
    }

    /**
     * Convert dd/mm/yyyy format to yyyy-mm-dd format
     */
    convertFormattedToISODate(formattedDate) {
        if (!formattedDate) return ''
        const parts = formattedDate.split('/')
        if (parts.length === 3) {
            const [day, month, year] = parts
            // Ensure we pad with zeros and parse as integers to avoid leading zero issues
            const paddedMonth = parseInt(month, 10).toString().padStart(2, '0')
            const paddedDay = parseInt(day, 10).toString().padStart(2, '0')
            return `${year}-${paddedMonth}-${paddedDay}`
        }
        return formattedDate
    }

    /**
     * Fix corrupted NaN dates in the database
     */
    fixCorruptedDates() {
        const state = this.getStore()
        let fixedCount = 0
        
        console.log('🔧 Checking for corrupted dates...')
        
        const updatedCaseDrops = state.caseDrops.map(caseDrop => {
            if (caseDrop.dropDate && caseDrop.dropDate.includes('NaN')) {
                console.log('🚫 Found corrupted date:', caseDrop.dropDate, 'in case:', caseDrop.caseName)
                fixedCount++
                
                // Set to today's date as fallback
                const today = new Date()
                const fixedDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`
                
                return {
                    ...caseDrop,
                    dropDate: fixedDate
                }
            }
            return caseDrop
        })
        
        if (fixedCount > 0) {
            // Update the store with fixed data
            const caseDropsData = {
                years: state.years,
                caseDrops: updatedCaseDrops
            }
            localStorage.setItem('caseDropsHierarchical', JSON.stringify(caseDropsData))
            
            // Force a state update
            this.getStore().setState({ caseDrops: updatedCaseDrops })
            
            console.log(`✅ Fixed ${fixedCount} corrupted dates`)
            this.showNotification(`Fixed ${fixedCount} corrupted dates`, 'success')
            
            // Refresh the display
            this.renderCurrentWeek()
            this.refreshCaseDropsDisplay()
            this.refreshAnalytics()
        }
    }

    /**
     * Normalize date to dd/mm/yyyy format (handles both ISO and formatted dates)
     */
    normalizeDateFormat(dateString) {
        if (!dateString) return ''
        
        // If it's already in dd/mm/yyyy format
        if (dateString.includes('/')) {
            return dateString
        }
        
        // If it's in ISO format (yyyy-mm-dd)
        if (dateString.includes('-') && dateString.length === 10) {
            return this.convertISOToFormattedDate(dateString)
        }
        
        return dateString
    }

    /**
     * Validate dd/mm/yyyy date format
     */
    isValidDate(dateString) {
        if (!dateString) return false
        const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/
        const match = dateString.match(regex)
        if (!match) return false
        
        const day = parseInt(match[1], 10)
        const month = parseInt(match[2], 10)
        const year = parseInt(match[3], 10)
        
        const date = new Date(year, month - 1, day)
        return date.getFullYear() === year && 
               date.getMonth() === month - 1 && 
               date.getDate() === day
    }
}