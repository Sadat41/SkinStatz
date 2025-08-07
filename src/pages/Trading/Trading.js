// ================================================================================================
// CS2 TRADING TRACKER - PROFESSIONAL TRADING PAGE
// ================================================================================================
// Professional-grade trading dashboard inspired by TradingView, Binance, and financial platforms
// Features real-time charts, market heatmaps, advanced analytics, and position management
// ================================================================================================

import { useAppStore } from '../../store.js'
import { priceService } from '../../services/PriceService.js'

// Components will be loaded dynamically when needed

export class TradingPage {
    constructor() {
        this.store = useAppStore()
        this.charts = {}
        this.currentTab = 'overview'
        this.currentView = 'professional' // professional, compact, mobile
        this.currentEditIndex = null // For tracking which trade is being edited
        this.analyticsTimePeriod = 'all' // Default analytics time period
        
        // Professional trading components
        this.tradingChart = null
        this.marketHeatmap = null
        this.waterfallChart = null
        this.priceUpdateInterval = null
        
        // Price cache for CSFloat and Buff163
        this.priceCache = new Map()
        this.pricePromises = new Map()
        
        // Filter and sort states
        this.selectedStatusFilter = 'holding' // null = all, 'holding', 'sold' - default to holding
        this.selectedSortOption = 'recent' // 'recent', 'ascending', 'descending'
    }

    /**
     * Format date as dd/mm/yyyy
     */
    formatDate(date) {
        if (!date) return ''
        
        // If the date is already in dd/mm/yyyy format, return it as is
        if (typeof date === 'string' && date.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            return date
        }
        
        // Parse the date - handle both ISO format and dd/mm/yyyy format
        let d
        if (typeof date === 'string' && date.includes('/')) {
            // Handle dd/mm/yyyy format
            const parts = date.split('/')
            if (parts.length === 3) {
                // Create date from dd/mm/yyyy: new Date(year, month-1, day)
                d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
            } else {
                d = new Date(date)
            }
        } else {
            // Handle ISO format or other formats
            d = new Date(date)
        }
        
        // Check if date is valid
        if (isNaN(d.getTime())) {
            console.warn('Invalid date:', date)
            return ''
        }
        
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
     * Convert dd/mm/yyyy to yyyy-mm-dd (for HTML date inputs)
     */
    convertToISODate(ddmmyyyy) {
        if (!ddmmyyyy) return ''
        if (ddmmyyyy.match(/^\d{4}-\d{2}-\d{2}$/)) return ddmmyyyy // Already in ISO format
        
        const parts = ddmmyyyy.split('/')
        if (parts.length === 3) {
            const [day, month, year] = parts
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        }
        return ''
    }

    /**
     * Convert yyyy-mm-dd to dd/mm/yyyy (for display)
     */
    convertFromISODate(yyyymmdd) {
        if (!yyyymmdd) return ''
        if (yyyymmdd.match(/^\d{2}\/\d{2}\/\d{4}$/)) return yyyymmdd // Already in dd/mm/yyyy format
        
        const parts = yyyymmdd.split('-')
        if (parts.length === 3) {
            const [year, month, day] = parts
            return `${day}/${month}/${year}`
        }
        return ''
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
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        }
        return formattedDate
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

    /**
     * Clear all price caches to force fresh data
     */
    clearAllPriceCaches() {
        console.log('🧹 Clearing all price caches...')
        
        // Clear Trading component caches
        if (this.priceCache) {
            this.priceCache.clear()
        }
        if (this.pricePromises) {
            this.pricePromises.clear()
        }
        
        // Clear PriceService cache
        if (priceService) {
            priceService.priceDataCache = null
            priceService.priceCacheTimestamp = null
        }
        
        // Clear any localStorage price cache keys (comprehensive list)
        const priceKeys = [
            'priceCache', 
            'tradingPrices', 
            'priceData', 
            'csfloatPrices',
            'buff163Prices',
            'itemPrices',
            'priceTimestamp',
            'cachedPrices',
            'marketPrices'
        ]
        priceKeys.forEach(key => {
            if (localStorage.getItem(key)) {
                localStorage.removeItem(key)
                console.log(`🗑️ Removed localStorage key: ${key}`)
            }
        })
        
        // Clear sessionStorage as well
        priceKeys.forEach(key => {
            if (sessionStorage.getItem(key)) {
                sessionStorage.removeItem(key)
                console.log(`🗑️ Removed sessionStorage key: ${key}`)
            }
        })
        
        // Update last cache clear timestamp
        localStorage.setItem('lastPriceCacheClear', Date.now().toString())
        
        console.log('✅ All price caches cleared')
    }

    /**
     * Check if price cache should be reset (weekly auto-reset)
     */
    shouldResetPriceCache() {
        const lastClear = localStorage.getItem('lastPriceCacheClear')
        if (!lastClear) {
            return true // Never cleared before
        }
        
        const weekInMs = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
        const timeSinceLastClear = Date.now() - parseInt(lastClear)
        
        return timeSinceLastClear > weekInMs
    }

    /**
     * Auto-reset price cache if it's been more than a week
     */
    autoResetPriceCacheIfNeeded() {
        if (this.shouldResetPriceCache()) {
            console.log('📅 Weekly auto-reset: Clearing price caches (>7 days old)')
            this.clearAllPriceCaches()
            return true
        }
        return false
    }

    async render(container, params = {}) {
        try {
            // Only auto-reset price cache weekly (like Investment tab)
            this.autoResetPriceCacheIfNeeded()
            
            const metrics = this.calculateTradingMetrics()
            
            // Add formatNumber method if not available
            if (!this.store.formatNumber) {
                this.store.formatNumber = (num, decimals = 2) => {
                    if (num === null || num === undefined || isNaN(num)) return '0.00'
                    return parseFloat(num).toLocaleString('en-US', {
                        minimumFractionDigits: decimals,
                        maximumFractionDigits: decimals
                    })
                }
            }
            
            container.innerHTML = this.getHTML(metrics, this.store)
            
            // Setup event listeners
            this.setupEventListeners()
            
            // Initialize current tab content
            setTimeout(() => {
                this.switchTab(this.currentTab)
                this.updateTradingStatsCards()
                this.updateHeaderMetrics()
                // Set initial filter button state
                this.updateStatusFilterButtons()
                // Update monthly dashboard with real values
                this.refreshMonthlyDashboard()
            }, 100)
            
            // Initialize icons
            if (typeof lucide !== 'undefined') {
                lucide.createIcons()
            }
            
            // Setup modal event listeners after a delay to ensure DOM is ready
            setTimeout(() => {
                this.setupModalEventListeners()
                // Initialize filter button states
                this.updateStatusFilterButtons()
                this.updateSortButtonText()
            }, 500)

            // Also call button update after a longer delay to ensure DOM is fully ready
            setTimeout(() => {
                console.log('🔄 Final button state update')
                this.updateStatusFilterButtons()
            }, 1000)
            
            // Make this instance available globally for onclick handlers
            window.tradingPage = this
            
        } catch (error) {
            console.error('❌ Failed to render trading page:', error)
            container.innerHTML = this.getErrorHTML(error)
        }
    }

    getHTML(metrics, state) {
        return `
            <!-- Professional Trading Dashboard -->
            <div class="professional-trading-dashboard min-h-full bg-gray-950">
                
                <!-- Top Navigation Bar -->
                <div class="trading-header bg-gray-900 border-b border-gray-700 py-4">
                    <div class="px-6">
                        <div class="flex items-center justify-between">
                            <!-- Left: Logo and Main Metrics -->
                            <div class="flex items-center gap-6" style="overflow: hidden;">
                                <div class="flex items-center gap-3" style="min-width: 250px;">
                                    <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                        <i data-lucide="trending-up" class="w-5 h-5 text-white"></i>
                                    </div>
                                    <h1 class="text-xl font-bold text-white">CS2 Trading Pro</h1>
                                    <span class="bg-gradient-to-r from-green-500 to-blue-600 text-white text-xs px-2 py-1 rounded-full">
                                        Live
                                    </span>
                                </div>
                                
                                <!-- Real-time Trading Metrics -->
                                <div class="flex items-center gap-6 text-sm">
                                    <div class="flex items-center gap-2">
                                        <span class="text-gray-400">Holdings:</span>
                                        <span class="text-white font-semibold" id="portfolio-value">$${this.store.formatNumber(metrics.portfolioValue || 0)}</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <span class="text-gray-400">Positions:</span>
                                        <span class="text-blue-400 font-semibold" id="open-positions">${metrics.activePositions || 0}</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <span class="text-gray-400">Today:</span>
                                        <span class="text-green-400 font-semibold" id="daily-pnl">$0.00</span>
                                        <span class="text-green-400 text-xs" id="daily-pnl-percent">0.0%</span>
                                    </div>
                                    <!-- Trading Gains Card -->
                                    <div class="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1">
                                        <div class="flex items-center gap-3 text-xs">
                                            <span class="text-gray-400">7d</span>
                                            <span class="text-green-400 font-medium" id="header-gains-7d">$0</span>
                                            <span class="text-gray-400">30d</span>
                                            <span class="text-green-400 font-medium" id="header-gains-30d">$0</span>
                                            <span class="text-gray-400">60d</span>
                                            <span class="text-green-400 font-medium" id="header-gains-60d">$0</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Right: Controls and Settings -->
                            <div class="flex items-center gap-3">
                                <div class="trading-status flex items-center gap-2 bg-green-900/30 px-3 py-1 rounded-lg">
                                    <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                    <span class="text-green-400 text-sm">Market Open</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Main Navigation Tabs -->
                <div class="main-navigation bg-gray-950 pt-6">
                    <div class="px-6">
                        <div class="flex">
                            <button id="tab-overview" class="trading-tab active flex-1 px-2 py-3 text-sm font-semibold text-white bg-blue-600 border-r border-gray-950 hover:bg-blue-950 transition">
                                <i data-lucide="pie-chart" class="w-4 h-4 mr-2 inline"></i>
                                Overview
                            </button>
                            <button id="tab-positions" class="trading-tab flex-1 px-2 py-3 text-sm font-semibold text-gray-300 bg-gray-950 hover:bg-gray-950 border-r border-gray-950 transition">
                                <i data-lucide="briefcase" class="w-4 h-4 mr-2 inline"></i>
                                Positions
                            </button>
                            <button id="tab-analytics" class="trading-tab flex-1 px-2 py-3 text-sm font-semibold text-gray-300 bg-gray-950 hover:bg-gray-950 transition">
                                <i data-lucide="bar-chart-3" class="w-4 h-4 mr-2 inline"></i>
                                Analytics
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Main Tab Content Area -->
                <div class="main-content-area flex-1 bg-gray-950 min-h-screen px-6">
                    <!-- Overview Tab Content - Monthly Trading Dashboard -->
                    <div id="content-overview" class="tab-content active">
                        <div class="overview-dashboard py-4">
                            <!-- Monthly Dashboard + Weekly Breakdown Card -->
                            <div class="bg-gray-900 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all duration-200 mb-8">
                                    <!-- Month Navigation Header -->
                                    <div class="flex items-center justify-between mb-6">
                                        <div class="flex items-center gap-4">
                                            <h2 class="text-2xl font-bold text-white">Monthly Trading Dashboard</h2>
                                            <div class="flex items-center gap-2 bg-gray-800 rounded-lg p-2">
                                                <button id="prev-month-btn" class="p-1 text-gray-400 hover:text-white transition">
                                                    <i data-lucide="chevron-left" class="w-4 h-4"></i>
                                                </button>
                                                <span id="current-month-display" class="text-white font-medium px-3">${this.getCurrentMonthDisplay()}</span>
                                                <button id="next-month-btn" class="p-1 text-gray-400 hover:text-white transition">
                                                    <i data-lucide="chevron-right" class="w-4 h-4"></i>
                                                </button>
                                            </div>
                                        </div>
                                        <div class="text-gray-400 text-sm">
                                            Focus: ${this.getCurrentMonthDisplay()} Performance
                                        </div>
                                    </div>

                            <!-- Enhanced Monthly Summary Cards -->
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                                <!-- Average Return Percentage -->
                                <div class="stat-card bg-gray-900 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all duration-200">
                                    <div class="flex items-center justify-between mb-3">
                                        <h3 class="text-gray-300 text-sm font-medium">Avg Return %</h3>
                                        <div class="p-2 bg-blue-500/10 rounded-lg">
                                            <i data-lucide="trending-up" class="w-4 h-4 text-blue-400"></i>
                                        </div>
                                    </div>
                                    <div id="monthly-avg-return" class="text-4xl font-bold text-white mb-2">${this.getEnhancedMonthlyMetrics().avgReturnPercent}%</div>
                                    <div class="text-gray-400 text-xs mb-3">Per completed trade</div>
                                    <div class="text-sm">
                                        <span id="monthly-total-trades-info" class="text-gray-500">${this.getMonthlyMetrics().totalTrades} trades completed</span>
                                    </div>
                                </div>
                                
                                <!-- Best Trade Performance -->
                                <div class="stat-card bg-gray-900 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all duration-200">
                                    <div class="flex items-center justify-between mb-3">
                                        <h3 class="text-gray-300 text-sm font-medium">Best Trade</h3>
                                        <div class="p-2 bg-green-500/10 rounded-lg">
                                            <i data-lucide="trophy" class="w-4 h-4 text-green-400"></i>
                                        </div>
                                    </div>
                                    <div id="monthly-best-trade" class="text-4xl font-bold text-green-400 mb-2">
                                        ${(() => {
                                            const best = this.getEnhancedMonthlyMetrics().bestTrade
                                            return best ? `+$${this.store.formatNumber(best.sellPrice - best.buyPrice)}` : '$0.00'
                                        })()}
                                    </div>
                                    <div class="text-gray-400 text-xs mb-3">Monthly high</div>
                                    <div class="text-sm">
                                        <span id="best-trade-item" class="text-gray-500 truncate">
                                            ${(() => {
                                                const best = this.getEnhancedMonthlyMetrics().bestTrade
                                                return best ? best.itemName.split(' ').slice(0, 2).join(' ') + '...' : 'No trades yet'
                                            })()}
                                        </span>
                                    </div>
                                </div>
                                
                                <!-- Win Streak & Performance -->
                                <div class="stat-card bg-gray-900 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all duration-200">
                                    <div class="flex items-center justify-between mb-3">
                                        <h3 class="text-gray-300 text-sm font-medium">Current Streak</h3>
                                        <div class="p-2 ${this.getEnhancedMonthlyMetrics().streakType === 'winning' ? 'bg-green-500/10' : this.getEnhancedMonthlyMetrics().streakType === 'losing' ? 'bg-red-500/10' : 'bg-gray-500/10'} rounded-lg">
                                            <i data-lucide="${this.getEnhancedMonthlyMetrics().streakType === 'winning' ? 'flame' : this.getEnhancedMonthlyMetrics().streakType === 'losing' ? 'trending-down' : 'minus'}" class="w-4 h-4 ${this.getEnhancedMonthlyMetrics().streakType === 'winning' ? 'text-green-400' : this.getEnhancedMonthlyMetrics().streakType === 'losing' ? 'text-red-400' : 'text-gray-400'}"></i>
                                        </div>
                                    </div>
                                    <div id="monthly-streak" class="text-4xl font-bold ${this.getEnhancedMonthlyMetrics().streakType === 'winning' ? 'text-green-400' : this.getEnhancedMonthlyMetrics().streakType === 'losing' ? 'text-red-400' : 'text-white'} mb-2">${this.getEnhancedMonthlyMetrics().currentStreak}</div>
                                    <div class="text-gray-400 text-xs mb-3">${this.getEnhancedMonthlyMetrics().streakType === 'winning' ? 'Winning trades' : this.getEnhancedMonthlyMetrics().streakType === 'losing' ? 'Losing trades' : 'No streak'}</div>
                                    <div class="text-sm">
                                        <span id="win-rate-info" class="text-gray-500">${this.getMonthlyMetrics().winRate}% win rate</span>
                                    </div>
                                </div>
                                
                                <!-- Hold Time Analysis -->
                                <div class="stat-card bg-gray-900 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all duration-200">
                                    <div class="flex items-center justify-between mb-3">
                                        <h3 class="text-gray-300 text-sm font-medium">Avg Hold Time</h3>
                                        <div class="p-2 bg-orange-500/10 rounded-lg">
                                            <i data-lucide="clock" class="w-4 h-4 text-orange-400"></i>
                                        </div>
                                    </div>
                                    <div id="monthly-hold-time" class="text-4xl font-bold text-white mb-2">${this.getEnhancedMonthlyMetrics().avgHoldDays}d</div>
                                    <div class="text-gray-400 text-xs mb-3">Days to profit</div>
                                    <div class="text-sm">
                                        <span id="completion-rate-info" class="text-gray-500">${this.getEnhancedMonthlyMetrics().completionRate}% completion rate</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Original Monthly Metrics Cards -->
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                                <!-- Total Trades This Month -->
                                <div class="stat-card bg-gray-900 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all duration-200">
                                    <div class="flex items-center justify-between mb-3">
                                        <h3 class="text-gray-300 text-sm font-medium">Total Trades</h3>
                                        <div class="p-2 bg-blue-500/10 rounded-lg">
                                            <i data-lucide="activity" class="w-4 h-4 text-blue-400"></i>
                                        </div>
                                    </div>
                                    <div id="monthly-total-trades" class="text-4xl font-bold text-white mb-2">${this.getMonthlyMetrics().totalTrades}</div>
                                    <div class="text-gray-400 text-xs mb-3">This month</div>
                                    <div class="text-sm" id="total-trades-comparison">
                                        <!-- Comparison updated by JavaScript -->
                                    </div>
                                </div>
                                
                                <!-- Monthly P&L -->
                                <div class="stat-card bg-gray-900 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all duration-200">
                                    <div class="flex items-center justify-between mb-3">
                                        <h3 class="text-gray-300 text-sm font-medium">Monthly P&L</h3>
                                        <div class="p-2 bg-green-500/10 rounded-lg">
                                            <i data-lucide="dollar-sign" class="w-4 h-4 text-green-400"></i>
                                        </div>
                                    </div>
                                    <div id="monthly-pnl" class="text-4xl font-bold text-green-400 mb-2">
                                        ${(() => {
                                            const pnl = this.getMonthlyMetrics().monthlyPnL
                                            return pnl >= 0 ? '+' : ''
                                        })()}$${this.store.formatNumber(Math.abs(this.getMonthlyMetrics().monthlyPnL))}
                                    </div>
                                    <div class="text-gray-400 text-xs mb-3">Net profit/loss</div>
                                    <div class="text-sm" id="monthly-pnl-comparison">
                                        <!-- Comparison updated by JavaScript -->
                                    </div>
                                </div>
                                
                                <!-- Win Rate This Month -->
                                <div class="stat-card bg-gray-900 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all duration-200">
                                    <div class="flex items-center justify-between mb-3">
                                        <h3 class="text-gray-300 text-sm font-medium">Win Rate</h3>
                                        <div class="p-2 bg-purple-500/10 rounded-lg">
                                            <i data-lucide="target" class="w-4 h-4 text-purple-400"></i>
                                        </div>
                                    </div>
                                    <div id="monthly-win-rate" class="text-4xl font-bold text-white mb-2">${this.getMonthlyMetrics().winRate}%</div>
                                    <div class="text-gray-400 text-xs mb-3">Profitable trades</div>
                                    <div class="text-sm" id="win-rate-comparison">
                                        <!-- Comparison updated by JavaScript -->
                                    </div>
                                </div>
                                
                                <!-- Average Profit Per Trade -->
                                <div class="stat-card bg-gray-900 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all duration-200">
                                    <div class="flex items-center justify-between mb-3">
                                        <h3 class="text-gray-300 text-sm font-medium">Avg Profit/Trade</h3>
                                        <div class="p-2 bg-orange-500/10 rounded-lg">
                                            <i data-lucide="bar-chart-3" class="w-4 h-4 text-orange-400"></i>
                                        </div>
                                    </div>
                                    <div id="monthly-avg-profit" class="text-4xl font-bold text-white mb-2">$${this.store.formatNumber(this.getMonthlyMetrics().avgProfitPerTrade)}</div>
                                    <div class="text-gray-400 text-xs mb-3">Per completed trade</div>
                                    <div class="text-sm" id="avg-profit-comparison">
                                        <!-- Comparison updated by JavaScript -->
                                    </div>
                                </div>
                            </div>

                                    <!-- Weekly Breakdown Section -->
                                    <div class="mb-8">
                                        <div class="flex items-center gap-3 mb-6">
                                            <div class="p-2 bg-gray-700/50 rounded-lg">
                                                <i data-lucide="calendar-days" class="w-5 h-5 text-gray-400"></i>
                                            </div>
                                            <h3 id="weekly-breakdown-title" class="text-xl font-bold text-white">Weekly Breakdown - ${this.getCurrentMonthDisplay()}</h3>
                                        </div>
                                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6" id="weekly-breakdown-container">
                                            ${this.generateWeeklyBreakdownHTML()}
                                        </div>
                                    </div>
                            </div>

                            <!-- Trading Activity Card -->
                            <div class="bg-gray-900 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all duration-200 mb-8 mx-0">
                                <div class="flex items-center gap-3 mb-6">
                                    <div class="p-2 bg-gray-700/50 rounded-lg">
                                        <i data-lucide="activity" class="w-5 h-5 text-gray-400"></i>
                                    </div>
                                    <h3 class="text-xl font-bold text-white">Trading Activity</h3>
                                </div>
                                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <!-- Current Holdings -->
                                <div class="bg-gray-900 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all duration-200">
                                    <div class="flex items-center justify-between mb-6">
                                        <div class="flex items-center gap-3">
                                            <div class="p-2 bg-blue-500/10 rounded-lg">
                                                <i data-lucide="package" class="w-5 h-5 text-blue-400"></i>
                                            </div>
                                            <h3 class="text-white font-semibold text-lg">Current Holdings</h3>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <span class="px-2 py-1 bg-gray-700/50 rounded-full text-xs text-gray-300">${this.getCurrentHoldings().length} items</span>
                                        </div>
                                    </div>
                                    <div class="space-y-3 max-h-64 overflow-y-auto" id="current-holdings-list">
                                        ${this.generateCurrentHoldingsHTML()}
                                    </div>
                                </div>

                                <!-- Recent Completed Trades -->
                                <div class="bg-gray-900 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all duration-200">
                                    <div class="flex items-center justify-between mb-6">
                                        <div class="flex items-center gap-3">
                                            <div class="p-2 bg-green-500/10 rounded-lg">
                                                <i data-lucide="check-circle" class="w-5 h-5 text-green-400"></i>
                                            </div>
                                            <h3 class="text-white font-semibold text-lg">Recent Completed Trades</h3>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <span class="px-2 py-1 bg-gray-700/50 rounded-full text-xs text-gray-300">This month</span>
                                        </div>
                                    </div>
                                    <div class="space-y-3 max-h-64 overflow-y-auto" id="recent-trades-list">
                                        ${this.generateRecentTradesHTML()}
                                    </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Trading Insights Card - Full Width Below -->
                            <div class="bg-gray-900 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all duration-200 mx-0">
                                <div class="flex items-center gap-3 mb-6">
                                    <div class="p-2 bg-gray-700/50 rounded-lg">
                                        <i data-lucide="brain" class="w-5 h-5 text-gray-400"></i>
                                    </div>
                                    <h3 class="text-xl font-bold text-white">Trading Insights</h3>
                                </div>
                                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <!-- Trading Pattern Analysis -->
                                    <div class="bg-gray-900 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all duration-200">
                                        <div class="flex items-center gap-3 mb-4">
                                            <div class="p-2 bg-purple-500/10 rounded-lg">
                                                <i data-lucide="activity" class="w-4 h-4 text-purple-400"></i>
                                            </div>
                                            <h4 class="text-white font-semibold">Pattern Analysis</h4>
                                        </div>
                                        <div id="pattern-analysis" class="space-y-3">
                                            ${this.generatePatternAnalysisHTML()}
                                        </div>
                                    </div>

                                    <!-- Performance Momentum -->
                                    <div class="bg-gray-900 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all duration-200">
                                        <div class="flex items-center gap-3 mb-4">
                                            <div class="p-2 bg-blue-500/10 rounded-lg">
                                                <i data-lucide="zap" class="w-4 h-4 text-blue-400"></i>
                                            </div>
                                            <h4 class="text-white font-semibold">Momentum</h4>
                                        </div>
                                        <div id="momentum-analysis" class="space-y-3">
                                            ${this.generateMomentumAnalysisHTML()}
                                        </div>
                                    </div>

                                    <!-- Risk & Optimization -->
                                    <div class="bg-gray-900 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all duration-200">
                                        <div class="flex items-center gap-3 mb-4">
                                            <div class="p-2 bg-orange-500/10 rounded-lg">
                                                <i data-lucide="shield" class="w-4 h-4 text-orange-400"></i>
                                            </div>
                                            <h4 class="text-white font-semibold">Risk & Tips</h4>
                                        </div>
                                        <div id="risk-analysis" class="space-y-3">
                                            ${this.generateRiskAnalysisHTML()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Positions Tab Content -->
                    <div id="content-positions" class="tab-content hidden relative z-10">
                        <div class="positions-dashboard px-6 py-4">
                            <!-- Add New Trade Form -->
                            <section class="bg-gray-900 border border-gray-700 rounded-2xl p-10 mb-8 shadow-2xl backdrop-blur-sm">
                                <div class="flex items-center justify-between mb-10">
                                    <div class="flex items-center gap-3">
                                        <i data-lucide="plus-circle" class="w-6 h-6 text-green-400"></i>
                                        <div>
                                            <h2 class="text-white font-bold text-xl">Add New Trade</h2>
                                            <p class="text-gray-400 text-sm">Track your CS2 trading with precision</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Trade Form -->
                                <form id="tradeForm" class="space-y-8">
                                    <!-- Row 1: Item Name and Category -->
                                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                                        <div class="group">
                                            <label class="block text-gray-300 text-sm font-medium mb-3 flex items-center gap-2">
                                                <i data-lucide="package" class="w-4 h-4 text-purple-400"></i>
                                                Item Name
                                            </label>
                                            <div class="relative">
                                                <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 p-0.5 opacity-60 group-focus-within:opacity-100 transition-opacity duration-300">
                                                    <div class="w-full h-full bg-gray-900 rounded-xl"></div>
                                                </div>
                                                <input type="text" id="itemName" placeholder="AK-47 | Redline (Field-Tested)" 
                                                    class="relative z-10 w-full bg-transparent text-white px-4 py-3 rounded-xl focus:outline-none transition-colors duration-200" required>
                                            </div>
                                        </div>
                                        <div class="group">
                                            <label class="block text-gray-300 text-sm font-medium mb-3 flex items-center gap-2">
                                                <i data-lucide="folder" class="w-4 h-4 text-blue-400"></i>
                                                Category
                                            </label>
                                            <div class="relative">
                                                <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 p-0.5 opacity-60 group-focus-within:opacity-100 transition-opacity duration-300">
                                                    <div class="w-full h-full bg-gray-900 rounded-xl"></div>
                                                </div>
                                                <select id="itemCategory" required
                                                        class="relative z-10 w-full bg-transparent text-white px-4 py-3 rounded-xl focus:outline-none transition-colors duration-200 appearance-none cursor-pointer">
                                                    <option value="" disabled selected class="bg-gray-800 text-gray-400">Select Category</option>
                                                    <option value="Guns" class="bg-gray-800 text-white">Guns</option>
                                                    <option value="Knives" class="bg-gray-800 text-white">Knives</option>
                                                    <option value="Gloves" class="bg-gray-800 text-white">Gloves</option>
                                                    <option value="Cases" class="bg-gray-800 text-white">Cases</option>
                                                    <option value="Stickers" class="bg-gray-800 text-white">Stickers</option>
                                                    <option value="Agents" class="bg-gray-800 text-white">Agents</option>
                                                    <option value="Charms" class="bg-gray-800 text-white">Charms</option>
                                                    <option value="Patches" class="bg-gray-800 text-white">Patches</option>
                                                    <option value="Pins" class="bg-gray-800 text-white">Pins</option>
                                                    <option value="Graffiti" class="bg-gray-800 text-white">Graffiti</option>
                                                    <option value="Keys" class="bg-gray-800 text-white">Keys</option>
                                                    <option value="Music Kits" class="bg-gray-800 text-white">Music Kits</option>
                                                </select>
                                                <i data-lucide="chevron-down" class="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"></i>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Row 2: Buy Price and Sell Price -->
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <!-- Buy Price -->
                                        <div class="group">
                                            <label class="block text-gray-300 text-sm font-medium mb-3 flex items-center gap-2">
                                                <i data-lucide="dollar-sign" class="w-4 h-4 text-cyan-400"></i>
                                                Buy Price
                                            </label>
                                            <div class="relative">
                                                <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 p-0.5 opacity-80 group-focus-within:opacity-100 transition-opacity duration-300">
                                                    <div class="w-full h-full bg-gray-900 rounded-xl"></div>
                                                </div>
                                                <input type="number" id="buyPrice" placeholder="0.00" step="0.01" min="0"
                                                        class="relative z-10 w-full bg-transparent text-white px-4 py-3 rounded-xl focus:outline-none transition-colors duration-200" required>
                                            </div>
                                        </div>
                                        <!-- Sell Price -->
                                        <div class="group">
                                            <label class="block text-gray-300 text-sm font-medium mb-3 flex items-center gap-2">
                                                <i data-lucide="trending-up" class="w-4 h-4 text-green-400"></i>
                                                Sell Price <span class="text-gray-500 font-normal">(Optional)</span>
                                            </label>
                                            <div class="relative">
                                                <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 p-0.5 opacity-60 group-focus-within:opacity-100 transition-opacity duration-300">
                                                    <div class="w-full h-full bg-gray-900 rounded-xl"></div>
                                                </div>
                                                <input type="number" id="sellPrice" placeholder="0.00" step="0.01" min="0"
                                                        class="relative z-10 w-full bg-transparent text-white px-4 py-3 rounded-xl focus:outline-none transition-colors duration-200">
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Row 3: Buy Date and Sell Date -->
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <!-- Buy Date -->
                                        <div class="group">
                                            <label class="block text-gray-300 text-sm font-medium mb-3 flex items-center gap-2">
                                                <i data-lucide="calendar" class="w-4 h-4 text-orange-400"></i>
                                                Buy Date
                                            </label>
                                            <div class="relative">
                                                <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 p-0.5 opacity-80 group-focus-within:opacity-100 transition-opacity duration-300">
                                                    <div class="w-full h-full bg-gray-900 rounded-xl"></div>
                                                </div>
                                                <div class="flex items-center gap-2">
                                                    <input type="text" id="buyDate" placeholder="dd/mm/yyyy" value="${this.getTodayFormatted()}"
                                                            class="relative z-10 flex-1 bg-transparent text-white px-4 py-3 rounded-xl focus:outline-none transition-colors duration-200" required>
                                                    <input type="date" id="buyDatePicker" value="${this.getTodayISO()}"
                                                            class="absolute opacity-0 pointer-events-none" tabindex="-1">
                                                    <button type="button" onclick="document.getElementById('buyDatePicker').showPicker(); event.preventDefault();"
                                                            class="relative z-10 p-2 text-gray-400 hover:text-white transition-colors duration-200" title="Open calendar">
                                                        <i data-lucide="calendar" class="w-5 h-5"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <!-- Sell Date -->
                                        <div class="group">
                                            <label class="block text-gray-300 text-sm font-medium mb-3 flex items-center gap-2">
                                                <i data-lucide="calendar-check" class="w-4 h-4 text-red-400"></i>
                                                Sell Date <span class="text-gray-500 font-normal">(Optional)</span>
                                            </label>
                                            <div class="relative">
                                                <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-red-500 to-pink-500/60 p-0.5 opacity-60 group-focus-within:opacity-100 transition-opacity duration-300">
                                                    <div class="w-full h-full bg-gray-900 rounded-xl"></div>
                                                </div>
                                                <div class="flex items-center gap-2">
                                                    <input type="text" id="sellDate" placeholder="dd/mm/yyyy (optional)"
                                                            class="relative z-10 flex-1 bg-transparent text-white px-4 py-3 rounded-xl focus:outline-none transition-colors duration-200">
                                                    <input type="date" id="sellDatePicker"
                                                            class="absolute opacity-0 pointer-events-none" tabindex="-1">
                                                    <button type="button" onclick="document.getElementById('sellDatePicker').showPicker(); event.preventDefault();"
                                                            class="relative z-10 p-2 text-gray-400 hover:text-white transition-colors duration-200" title="Open calendar">
                                                        <i data-lucide="calendar" class="w-5 h-5"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Action Button -->
                                    <div class="flex justify-center">
                                        <button type="button" onclick="window.tradingPage?.safeAddTrade()" class="group relative bg-gray-900 hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-600 text-gray-300 hover:text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center gap-2 overflow-hidden border border-gray-700 hover:border-transparent">
                                            <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 p-0.5">
                                                <div class="w-full h-full bg-gray-900 rounded-xl group-hover:bg-transparent transition-colors duration-300"></div>
                                            </div>
                                            <i data-lucide="plus" class="w-4 h-4 relative z-10"></i>
                                            <span class="relative z-10">Add Trade</span>
                                        </button>
                                    </div>
                                </form>
                            </section>

                            <!-- Trading Portfolio Dashboard Card -->
                            <div class="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-6">
                                <!-- Trading Activity Header -->
                                <div class="flex items-center justify-between mb-6">
                                    <h2 class="text-2xl font-bold text-white">Trading Activity</h2>
                                    <div class="flex items-center gap-3">
                                        <button id="exportCsvBtn" class="group relative bg-gray-900 hover:bg-gradient-to-r hover:from-emerald-500 hover:to-teal-600 text-gray-300 hover:text-white px-4 py-3 rounded-xl transition-all duration-300 flex items-center gap-2 overflow-hidden">
                                            <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 p-0.5">
                                                <div class="w-full h-full bg-gray-900 rounded-xl group-hover:bg-transparent transition-colors duration-300"></div>
                                            </div>
                                            <i data-lucide="download" class="w-4 h-4 relative z-10"></i>
                                            <span class="relative z-10">CSV</span>
                                        </button>
                                        <button id="exportExcelBtn" class="group relative bg-gray-900 hover:bg-gradient-to-r hover:from-green-500 hover:to-emerald-600 text-gray-300 hover:text-white px-4 py-3 rounded-xl transition-all duration-300 flex items-center gap-2 overflow-hidden">
                                            <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 p-0.5">
                                                <div class="w-full h-full bg-gray-900 rounded-xl group-hover:bg-transparent transition-colors duration-300"></div>
                                            </div>
                                            <i data-lucide="file-spreadsheet" class="w-4 h-4 relative z-10"></i>
                                            <span class="relative z-10">Excel</span>
                                        </button>
                                        <input type="file" id="importCsvFile" accept=".csv" class="hidden">
                                        <button id="importCsvBtn" class="group relative bg-gray-900 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 text-gray-300 hover:text-white px-4 py-3 rounded-xl transition-all duration-300 flex items-center gap-2 overflow-hidden">
                                            <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 p-0.5">
                                                <div class="w-full h-full bg-gray-900 rounded-xl group-hover:bg-transparent transition-colors duration-300"></div>
                                            </div>
                                            <i data-lucide="upload" class="w-4 h-4 relative z-10"></i>
                                            <span class="relative z-10">Import</span>
                                        </button>
                                    </div>
                                </div>
                                <!-- Trading Statistics Cards -->
                            <section class="trading-stats-cards mb-8">
                                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <!-- Total Portfolio Value -->
                                    <div class="stat-card bg-gray-800 border border-gray-600 rounded-xl p-6">
                                        <div class="text-center">
                                            <i data-lucide="dollar-sign" class="w-8 h-8 text-green-400 mx-auto mb-3"></i>
                                            <div class="text-2xl font-bold text-white mb-1" id="tradingPortfolioValue">$0.00</div>
                                            <div class="text-gray-400 text-sm">Available to Trade</div>
                                            <div class="text-gray-500 text-xs">Holdings value</div>
                                        </div>
                                    </div>
                                    
                                    <!-- Total Profit/Loss -->
                                    <div class="stat-card bg-gray-800 border border-gray-600 rounded-xl p-6">
                                        <div class="text-center">
                                            <i data-lucide="trending-up" class="w-8 h-8 text-blue-400 mx-auto mb-3"></i>
                                            <div class="text-2xl font-bold text-white mb-1" id="tradingTotalPnL">$0.00</div>
                                            <div class="text-gray-400 text-sm">Total P&L</div>
                                            <div class="text-gray-500 text-xs">Realized profits</div>
                                        </div>
                                    </div>
                                    
                                    <!-- Active Positions -->
                                    <div class="stat-card bg-gray-800 border border-gray-600 rounded-xl p-6">
                                        <div class="text-center">
                                            <i data-lucide="briefcase" class="w-8 h-8 text-purple-400 mx-auto mb-3"></i>
                                            <div class="text-2xl font-bold text-white mb-1" id="tradingActivePositions">0</div>
                                            <div class="text-gray-400 text-sm">Active Positions</div>
                                            <div class="text-gray-500 text-xs">Holdings count</div>
                                        </div>
                                    </div>
                                    
                                    <!-- Win Rate -->
                                    <div class="stat-card bg-gray-800 border border-gray-600 rounded-xl p-6">
                                        <div class="text-center">
                                            <i data-lucide="target" class="w-8 h-8 text-orange-400 mx-auto mb-3"></i>
                                            <div class="text-2xl font-bold text-white mb-1" id="tradingWinRate">0.0%</div>
                                            <div class="text-gray-400 text-sm">Win Rate</div>
                                            <div class="text-gray-500 text-xs">Success ratio</div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <!-- Second Row - Performance Metrics -->
                            <section class="trading-performance-cards mb-8">
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <!-- Price Changes -->
                                    <div class="stat-card bg-gray-800 border border-gray-600 rounded-xl p-4">
                                        <div class="text-center">
                                            <div class="text-gray-400 text-xs mb-2">Price Changes</div>
                                            <div class="grid grid-cols-3 gap-3">
                                                <div class="text-center">
                                                    <div class="text-sm font-bold text-amber-400" id="tradingPrice24h">--%</div>
                                                    <div class="text-gray-500 text-xs">24h</div>
                                                </div>
                                                <div class="text-center">
                                                    <div class="text-sm font-bold text-emerald-400" id="tradingPrice7d">--%</div>
                                                    <div class="text-gray-500 text-xs">7d</div>
                                                </div>
                                                <div class="text-center">
                                                    <div class="text-sm font-bold text-blue-400" id="tradingPrice30d">--%</div>
                                                    <div class="text-gray-500 text-xs">30d</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Realized P&L -->
                                    <div class="stat-card bg-gray-800 border border-gray-600 rounded-xl p-4">
                                        <div class="text-center">
                                            <div class="text-3xl font-bold text-purple-400 mb-1" id="tradingRealizedPnL">$0.00</div>
                                            <div class="text-gray-400 text-sm">Realized P&L</div>
                                        </div>
                                    </div>
                                    
                                    <!-- Trading Gains -->
                                    <div class="stat-card bg-gray-800 border border-gray-600 rounded-xl p-4">
                                        <div class="text-center">
                                            <div class="text-gray-400 text-xs mb-2">Trading Gains</div>
                                            <div class="grid grid-cols-3 gap-3">
                                                <div class="text-center">
                                                    <div class="text-sm font-bold text-green-400" id="tradingGains7d">$0.00</div>
                                                    <div class="text-xs font-semibold text-green-300" id="tradingGains7dPercent">0.0%</div>
                                                    <div class="text-gray-500 text-xs">7d</div>
                                                </div>
                                                <div class="text-center">
                                                    <div class="text-sm font-bold text-blue-400" id="tradingGains30d">$0.00</div>
                                                    <div class="text-xs font-semibold text-blue-300" id="tradingGains30dPercent">0.0%</div>
                                                    <div class="text-gray-500 text-xs">30d</div>
                                                </div>
                                                <div class="text-center">
                                                    <div class="text-sm font-bold text-purple-400" id="tradingGains60d">$0.00</div>
                                                    <div class="text-xs font-semibold text-purple-300" id="tradingGains60dPercent">0.0%</div>
                                                    <div class="text-gray-500 text-xs">60d</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            
                            
                            <!-- Trading Table -->
                            <div class="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
                                <div class="p-4 border-b border-gray-700">
                                    <div class="flex items-center justify-between">
                                        <h3 class="text-white font-semibold">Trading History</h3>
                                        <div class="flex items-center gap-3">
                                            <i data-lucide="activity" class="w-4 h-4 text-gray-400"></i>
                                            <!-- Status Filter Buttons -->
                                            <div class="flex items-center gap-1 bg-gray-800 p-1 rounded-lg border border-gray-600">
                                                <button onclick="window.tradingPage?.selectStatusFilter(null)" 
                                                        id="statusFilterAll"
                                                        class="status-filter-btn px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 text-gray-400 hover:text-white hover:bg-gray-700">
                                                    All
                                                </button>
                                                <button onclick="window.tradingPage?.selectStatusFilter('holding')" 
                                                        id="statusFilterHolding"
                                                        class="status-filter-btn px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 text-gray-400 hover:text-white hover:bg-gray-700">
                                                    Holding
                                                </button>
                                                <button onclick="window.tradingPage?.selectStatusFilter('sold')" 
                                                        id="statusFilterSold"
                                                        class="status-filter-btn px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 text-gray-400 hover:text-white hover:bg-gray-700">
                                                    Sold
                                                </button>
                                            </div>
                                            <!-- Sort Dropdown -->
                                            <div class="relative z-[9999]">
                                                <button onclick="window.tradingPage?.toggleSortDropdown()" 
                                                        id="sortDropdownBtn"
                                                        class="flex items-center gap-2 bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-600 transition-all duration-200 text-xs font-medium">
                                                    <i data-lucide="arrow-up-down" class="w-3.5 h-3.5"></i>
                                                    <span id="sortButtonText">Recent</span>
                                                    <i data-lucide="chevron-down" class="w-3.5 h-3.5"></i>
                                                </button>
                                                <!-- Sort Dropdown Menu -->
                                                <div id="sortDropdown" class="absolute top-full right-0 mt-2 bg-gray-900 border-2 border-gray-600 rounded-lg shadow-2xl" style="display: none; min-width: 160px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8); z-index: 10000;">
                                                    <div class="p-2">
                                                        <button onclick="window.tradingPage?.selectSortOption('recent')" 
                                                                class="sort-option w-full text-left px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-all duration-200 flex items-center gap-2">
                                                            <i data-lucide="clock" class="w-3.5 h-3.5"></i>
                                                            Recent
                                                        </button>
                                                        <button onclick="window.tradingPage?.selectSortOption('ascending')" 
                                                                class="sort-option w-full text-left px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-all duration-200 flex items-center gap-2">
                                                            <i data-lucide="trending-up" class="w-3.5 h-3.5"></i>
                                                            Ascending (Low to High)
                                                        </button>
                                                        <button onclick="window.tradingPage?.selectSortOption('descending')" 
                                                                class="sort-option w-full text-left px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-all duration-200 flex items-center gap-2">
                                                            <i data-lucide="trending-down" class="w-3.5 h-3.5"></i>
                                                            Descending (High to Low)
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="p-4 border-b border-gray-700">
                                    <div class="flex items-center gap-3 w-full text-gray-400 text-sm font-medium">
                                        <div class="flex-none w-12 text-center">
                                            <span class="inline-flex items-center justify-center w-6 h-6 bg-gray-800 border border-gray-600 rounded text-gray-400 text-xs font-medium">
                                                #
                                            </span>
                                        </div>
                                        <div class="flex-none w-20 text-center">
                                            <span class="inline-flex items-center justify-center gap-1">
                                                <svg class="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                                </svg>
                                                <span class="text-blue-400">Image</span>
                                            </span>
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <span class="inline-flex items-center justify-center gap-1">
                                                <svg class="w-3 h-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                                                </svg>
                                                <span class="text-purple-400">Item Name</span>
                                            </span>
                                        </div>
                                        
                                        <!-- 24h % Column -->
                                        <div class="flex-none w-20 text-center">
                                            <span class="inline-flex items-center justify-center gap-1">
                                                <svg class="w-3 h-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                                                </svg>
                                                <span class="text-amber-400">24h %</span>
                                            </span>
                                        </div>
                                        
                                        <!-- 7d % Column -->
                                        <div class="flex-none w-20 text-center">
                                            <span class="inline-flex items-center justify-center gap-1">
                                                <svg class="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                                                </svg>
                                                <span class="text-emerald-400">7d %</span>
                                            </span>
                                        </div>
                                        
                                        <!-- 30d % Column -->
                                        <div class="flex-none w-20 text-center">
                                            <span class="inline-flex items-center justify-center gap-1">
                                                <svg class="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                                </svg>
                                                <span class="text-blue-400">30d %</span>
                                            </span>
                                        </div>
                                        
                                        <!-- Category Column -->
                                        <div class="flex-none w-24 text-center">
                                            <span class="inline-flex items-center justify-center gap-1">
                                                <svg class="w-3 h-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                                                </svg>
                                                <span class="text-purple-400">Category</span>
                                            </span>
                                        </div>
                                        
                                        <div class="flex-none w-28 text-center">
                                            <span class="inline-flex items-center justify-center gap-1">
                                                <svg class="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                                                </svg>
                                                <span class="text-green-400">Buy Price</span>
                                            </span>
                                        </div>
                                        <div class="flex-none w-28 text-center">
                                            <span class="inline-flex items-center justify-center gap-1">
                                                <svg class="w-3 h-3 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                                </svg>
                                                <span class="text-yellow-400">Buy Date</span>
                                            </span>
                                        </div>
                                        <div class="flex-none w-28 text-center">
                                            <span class="inline-flex items-center justify-center gap-1">
                                                <svg class="w-3 h-3 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                                                </svg>
                                                <span class="text-orange-400">Sell Price</span>
                                            </span>
                                        </div>
                                        <div class="flex-none w-28 text-center">
                                            <span class="inline-flex items-center justify-center gap-1">
                                                <svg class="w-3 h-3 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                                </svg>
                                                <span class="text-pink-400">Sell Date</span>
                                            </span>
                                        </div>
                                        <div class="flex-none w-24 text-center">
                                            <span class="inline-flex items-center justify-center gap-1">
                                                <svg class="w-3 h-3 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                                                </svg>
                                                <span class="text-indigo-400">P&L</span>
                                            </span>
                                        </div>
                                        <div class="flex-none w-24 text-center">
                                            <span class="inline-flex items-center justify-center gap-1">
                                                <svg class="w-3 h-3 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                                                </svg>
                                                <span class="text-teal-400">Return %</span>
                                            </span>
                                        </div>
                                        <div class="flex-none w-24 text-center">
                                            <span class="inline-flex items-center justify-center gap-1">
                                                <svg class="w-3 h-3 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                                </svg>
                                                <span class="text-violet-400">Status</span>
                                            </span>
                                        </div>
                                        <div class="flex-none w-28 text-center">
                                            <span class="inline-flex items-center justify-center gap-1">
                                                <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
                                                </svg>
                                                <span class="text-gray-400">Actions</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div id="trades-table-body" class="divide-y divide-gray-700">
                                    ${this.getTradingTableHTML()}
                                </div>
                            </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Analytics Tab Content -->
                    <div id="content-analytics" class="tab-content hidden relative z-20">
                        <div class="analytics-dashboard py-4">
                            <!-- Enhanced Header with Time Period Controls -->
                            <div class="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
                                <div>
                                    <h2 class="text-2xl font-bold text-white mb-2">Trading Performance Analytics</h2>
                                    <p class="text-gray-400 text-sm">Comprehensive CS2 trading analysis focused on profit-based metrics</p>
                                </div>
                                <div class="flex gap-3 items-center">
                                    <!-- Time Period Quick Selectors -->
                                    <div class="flex bg-gray-800 rounded-lg p-1">
                                        <button id="period-7d" class="period-btn px-3 py-1 text-sm rounded text-gray-400 hover:text-white transition" data-period="7">7D</button>
                                        <button id="period-30d" class="period-btn px-3 py-1 text-sm rounded text-gray-400 hover:text-white transition" data-period="30">30D</button>
                                        <button id="period-90d" class="period-btn px-3 py-1 text-sm rounded text-gray-400 hover:text-white transition" data-period="90">90D</button>
                                        <button id="period-6m" class="period-btn px-3 py-1 text-sm rounded text-gray-400 hover:text-white transition" data-period="180">6M</button>
                                        <button id="period-1y" class="period-btn px-3 py-1 text-sm rounded text-gray-400 hover:text-white transition" data-period="365">1Y</button>
                                        <button id="period-all" class="period-btn px-3 py-1 text-sm rounded bg-blue-600 text-white transition" data-period="all">All</button>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Trading Summary Card -->
                            <div class="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-8">
                                <div class="flex items-center justify-between mb-6">
                                    <h2 class="text-2xl font-bold text-white">Trading Summary</h2>
                                    <i data-lucide="bar-chart-3" class="w-6 h-6 text-blue-400"></i>
                                </div>
                                
                                <!-- Row 1: Core Performance Metrics -->
                                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                    <div class="bg-gray-800 border border-gray-600 rounded-lg p-4 hover:border-gray-500 transition-all">
                                        <div class="flex items-center justify-between mb-2">
                                            <h3 class="text-gray-400 text-sm">Total Profit</h3>
                                            <i data-lucide="trending-up" class="w-4 h-4 text-green-400"></i>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <div id="analytics-total-profit" class="text-xl font-bold ${this.getAnalyticsMetrics().totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}">
                                                ${this.getAnalyticsMetrics().totalProfit >= 0 ? '+' : ''}$${this.store.formatNumber(Math.abs(this.getAnalyticsMetrics().totalProfit))}
                                            </div>
                                            <div id="analytics-total-profit-trend" class="trend-indicator"></div>
                                        </div>
                                        <div class="text-gray-500 text-xs">ROI: ${this.getAnalyticsMetrics().roiPercent}%</div>
                                    </div>
                                    
                                    <div class="bg-gray-800 border border-gray-600 rounded-lg p-4 hover:border-gray-500 transition-all">
                                        <div class="flex items-center justify-between mb-2">
                                            <h3 class="text-gray-400 text-sm">Success Rate</h3>
                                            <i data-lucide="target" class="w-4 h-4 text-purple-400"></i>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <div id="analytics-success-rate" class="text-xl font-bold text-white">${this.getAnalyticsMetrics().successRate}%</div>
                                            <div id="analytics-success-rate-trend" class="trend-indicator"></div>
                                        </div>
                                        <div class="text-gray-500 text-xs">${this.getAnalyticsMetrics().profitableTrades}/${this.getAnalyticsMetrics().completedTrades} trades</div>
                                    </div>
                                    
                                    <div class="bg-gray-800 border border-gray-600 rounded-lg p-4 hover:border-gray-500 transition-all">
                                        <div class="flex items-center justify-between mb-2">
                                            <h3 class="text-gray-400 text-sm">Avg Profit/Trade</h3>
                                            <i data-lucide="calculator" class="w-4 h-4 text-blue-400"></i>
                                        </div>
                                        <div id="analytics-avg-profit" class="text-xl font-bold text-white">$${this.store.formatNumber(this.getBasicTradingStats().avgProfitPerTrade)}</div>
                                        <div class="text-gray-500 text-xs">Per completed trade</div>
                                    </div>
                                    
                                    <div class="bg-gray-800 border border-gray-600 rounded-lg p-4 hover:border-gray-500 transition-all">
                                        <div class="flex items-center justify-between mb-2">
                                            <h3 class="text-gray-400 text-sm">Total Volume</h3>
                                            <i data-lucide="dollar-sign" class="w-4 h-4 text-yellow-400"></i>
                                        </div>
                                        <div id="analytics-total-volume" class="text-xl font-bold text-white">$${this.store.formatNumber(this.getBasicTradingStats().totalVolume)}</div>
                                        <div class="text-gray-500 text-xs">Total traded value</div>
                                    </div>
                                </div>
                                
                                <!-- Row 2: Trade Records & Metrics -->
                                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div class="bg-gray-800 border border-gray-600 rounded-lg p-4 hover:border-gray-500 transition-all">
                                        <div class="flex items-center justify-between mb-2">
                                            <h3 class="text-gray-400 text-sm">Best Trade</h3>
                                            <i data-lucide="trophy" class="w-4 h-4 text-green-400"></i>
                                        </div>
                                        <div id="analytics-best-trade" class="text-xl font-bold text-green-400">+$${this.store.formatNumber(this.getBasicTradingStats().bestTrade)}</div>
                                        <div class="text-gray-500 text-xs">Single trade record</div>
                                    </div>
                                    
                                    <div class="bg-gray-800 border border-gray-600 rounded-lg p-4 hover:border-gray-500 transition-all">
                                        <div class="flex items-center justify-between mb-2">
                                            <h3 class="text-gray-400 text-sm">Worst Trade</h3>
                                            <i data-lucide="trending-down" class="w-4 h-4 text-red-400"></i>
                                        </div>
                                        <div id="analytics-worst-trade" class="text-xl font-bold text-red-400">-$${this.store.formatNumber(Math.abs(this.getBasicTradingStats().worstTrade))}</div>
                                        <div class="text-gray-500 text-xs">Biggest loss</div>
                                    </div>
                                    
                                    <div class="bg-gray-800 border border-gray-600 rounded-lg p-4 hover:border-gray-500 transition-all">
                                        <div class="flex items-center justify-between mb-2">
                                            <h3 class="text-gray-400 text-sm">Win Streak</h3>
                                            <i data-lucide="zap" class="w-4 h-4 text-yellow-400"></i>
                                        </div>
                                        <div id="analytics-win-streak" class="text-xl font-bold text-yellow-400">${this.getAdvancedAnalytics().winStreak}</div>
                                        <div class="text-gray-500 text-xs">Consecutive wins</div>
                                    </div>
                                    
                                    <div class="bg-gray-800 border border-gray-600 rounded-lg p-4 hover:border-gray-500 transition-all">
                                        <div class="flex items-center justify-between mb-2">
                                            <h3 class="text-gray-400 text-sm">Avg Hold Time</h3>
                                            <i data-lucide="clock" class="w-4 h-4 text-purple-400"></i>
                                        </div>
                                        <div id="analytics-avg-hold-time" class="text-xl font-bold text-white">${this.getBasicTradingStats().avgHoldTime}</div>
                                        <div class="text-gray-500 text-xs">Days per trade</div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Card 1: Performance Overview -->
                            <div class="bg-gray-900 border border-gray-700 rounded-2xl p-10 mb-12 shadow-xl">
                                <div class="flex items-center justify-between mb-8">
                                    <div>
                                        <h2 class="text-3xl font-bold text-white mb-2">Performance Overview</h2>
                                        <p class="text-gray-400 text-sm">Comprehensive portfolio performance analysis</p>
                                    </div>
                                    <div class="flex items-center gap-3 bg-gray-700 px-4 py-2 rounded-xl">
                                        <i data-lucide="trending-up" class="w-6 h-6 text-green-400"></i>
                                        <span class="text-gray-300 text-sm font-medium">Portfolio Performance</span>
                                    </div>
                                </div>
                                
                                <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                    <!-- Cumulative P&L Timeline -->
                                    <div class="bg-gray-900 border border-gray-600 rounded-2xl p-6">
                                        <div class="flex items-center justify-between mb-6">
                                            <h3 class="text-xl font-semibold text-white">Cumulative P&L Timeline</h3>
                                            <div class="flex bg-gray-800 rounded-lg p-1">
                                                <button class="chart-period-btn px-3 py-1 text-sm rounded text-gray-400 hover:text-white transition-colors" data-chart="cumulative" data-period="30">30D</button>
                                                <button class="chart-period-btn px-3 py-1 text-sm rounded text-gray-400 hover:text-white transition-colors" data-chart="cumulative" data-period="90">90D</button>
                                                <button class="chart-period-btn px-3 py-1 text-sm rounded bg-blue-600 text-white" data-chart="cumulative" data-period="all">All</button>
                                            </div>
                                        </div>
                                        <div id="cumulative-pnl-chart" class="h-80 relative z-10 overflow-hidden rounded-xl"></div>
                                    </div>
                                    
                                    <!-- Daily P&L Distribution -->
                                    <div class="bg-gray-900 border border-gray-600 rounded-2xl p-6">
                                        <div class="flex items-center justify-between mb-6">
                                            <h3 class="text-xl font-semibold text-white">Daily P&L Distribution</h3>
                                            <div class="flex items-center gap-2">
                                                <i data-lucide="bar-chart-3" class="w-5 h-5 text-blue-400"></i>
                                                <span class="text-gray-300 text-sm">Last 90 days</span>
                                            </div>
                                        </div>
                                        <div id="daily-pnl-chart" class="h-80 relative z-10 overflow-hidden rounded-xl"></div>
                                    </div>
                                </div>
                            </div>

                            <!-- Card 2: Trading Patterns & Timing -->
                            <div class="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-12">
                                <!-- Main Trading Calendar -->
                                <div class="lg:col-span-2">
                                    <div class="bg-gray-900 border border-gray-700 rounded-2xl p-10 shadow-xl">
                                        <div class="flex items-center justify-between mb-8">
                                            <div>
                                                <h2 class="text-3xl font-bold text-white mb-2">Trading Patterns & Timing</h2>
                                                <p class="text-gray-400 text-sm">Analysis of when and how you trade</p>
                                            </div>
                                            <div class="flex items-center gap-3 bg-gray-700 px-4 py-2 rounded-xl">
                                                <i data-lucide="calendar" class="w-6 h-6 text-blue-400"></i>
                                                <span class="text-gray-300 text-sm font-medium">Daily P&L over time</span>
                                            </div>
                                        </div>
                                        
                                        <!-- Monthly Trading Calendar -->
                                        <div class="mb-10 bg-gray-900 border border-gray-600 rounded-2xl p-6">
                                            <h3 class="text-xl font-semibold text-white mb-6">Monthly Trading Calendar</h3>
                                            <div id="weekly-heatmap-chart" class="h-80 relative z-10 overflow-hidden rounded-xl"></div>
                                            <div class="flex justify-between items-center mt-6 text-sm text-gray-300">
                                                <span class="flex items-center gap-2">
                                                    <div class="w-4 h-4 bg-red-500 rounded-sm"></div>
                                                    Losses
                                                </span>
                                                <div class="flex items-center gap-3">
                                                    <div class="w-4 h-4 bg-gray-600 rounded-sm" title="Break Even"></div>
                                                    <div class="w-4 h-4 bg-green-300 rounded-sm" title="Small Profit"></div>
                                                    <div class="w-4 h-4 bg-green-500 rounded-sm" title="Good Profit"></div>
                                                    <div class="w-4 h-4 bg-green-700 rounded-sm" title="Major Profit"></div>
                                                </div>
                                                <span class="flex items-center gap-2">
                                                    Profits
                                                    <div class="w-4 h-4 bg-green-500 rounded-sm"></div>
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <!-- Trading Activity Charts -->
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <!-- Trading Frequency -->
                                            <div class="bg-gray-900 border border-gray-600 rounded-2xl p-6">
                                                <div class="flex items-center gap-2 mb-6">
                                                    <h4 class="text-lg font-semibold text-white">Trading Frequency</h4>
                                                    <i data-lucide="activity" class="w-5 h-5 text-blue-400"></i>
                                                </div>
                                                <div id="trade-frequency-chart" class="h-64 relative z-10 overflow-hidden rounded-xl"></div>
                                            </div>
                                            
                                            <!-- Win Rate Trend -->
                                            <div class="bg-gray-900 border border-gray-600 rounded-2xl p-6">
                                                <div class="flex items-center gap-2 mb-6">
                                                    <h4 class="text-lg font-semibold text-white">Win Rate Trend</h4>
                                                    <i data-lucide="target" class="w-5 h-5 text-green-400"></i>
                                                </div>
                                                <div id="win-rate-timeline-chart" class="h-64 relative z-10 overflow-hidden rounded-xl"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Card 3: Monthly Performance Breakdown -->
                                <div class="bg-gray-900 border border-gray-700 rounded-2xl p-10 shadow-xl">
                                    <div class="flex items-center justify-between mb-8">
                                        <div>
                                            <h2 class="text-2xl font-bold text-white mb-2">Monthly Breakdown</h2>
                                            <p class="text-gray-400 text-sm">Monthly performance summary</p>
                                        </div>
                                        <div class="bg-gray-700 p-3 rounded-xl">
                                            <i data-lucide="calendar-days" class="w-6 h-6 text-purple-400"></i>
                                        </div>
                                    </div>
                                    <div class="bg-gray-900 border border-gray-600 rounded-2xl p-6">
                                        <div id="monthly-stats-list" class="space-y-4 max-h-96 overflow-y-auto pr-2">
                                            ${this.generateMonthlyStatsHTML()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Card 4: Market Intelligence -->
                            <div class="bg-gray-900 border border-gray-700 rounded-2xl p-10 mb-12 shadow-xl">
                                <div class="flex items-center justify-between mb-8">
                                    <div>
                                        <h2 class="text-3xl font-bold text-white mb-2">Market Intelligence</h2>
                                        <p class="text-gray-400 text-sm">Strategic insights and trading patterns</p>
                                    </div>
                                    <div class="flex items-center gap-3 bg-gray-700 px-4 py-2 rounded-xl">
                                        <i data-lucide="target" class="w-6 h-6 text-purple-400"></i>
                                        <span class="text-gray-300 text-sm font-medium">Trading Strategy Insights</span>
                                    </div>
                                </div>
                                
                                <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                    <!-- Left Column: Category & Items -->
                                    <div class="space-y-8">
                                        <!-- Category Performance -->
                                        <div class="bg-gray-900 border border-gray-600 rounded-2xl p-6">
                                            <div class="flex items-center gap-2 mb-6">
                                                <h3 class="text-xl font-semibold text-white">Category Performance</h3>
                                                <i data-lucide="pie-chart" class="w-5 h-5 text-blue-400"></i>
                                            </div>
                                            <div id="category-performance-pie-chart" class="h-80 relative z-10 overflow-hidden rounded-xl"></div>
                                        </div>
                                        
                                        <!-- Most Traded Items -->
                                        <div class="bg-gray-900 border border-gray-600 rounded-2xl p-6">
                                            <div class="flex items-center gap-2 mb-6">
                                                <h3 class="text-xl font-semibold text-white">Most Traded Items</h3>
                                                <i data-lucide="trending-up" class="w-5 h-5 text-blue-400"></i>
                                            </div>
                                            <div id="condition-roi-chart" class="h-80 relative z-10 overflow-hidden rounded-xl"></div>
                                        </div>
                                    </div>
                                    
                                    <!-- Right Column: Timing & Pricing -->
                                    <div class="space-y-8">
                                        <!-- Hold Time Analysis -->
                                        <div class="bg-gray-900 border border-gray-600 rounded-2xl p-6">
                                            <div class="flex items-center gap-2 mb-6">
                                                <h3 class="text-xl font-semibold text-white">Hold Time vs Profit</h3>
                                                <i data-lucide="clock" class="w-5 h-5 text-yellow-400"></i>
                                            </div>
                                            <div id="hold-time-analysis-chart" class="h-80 relative z-10 overflow-hidden rounded-xl"></div>
                                        </div>
                                        
                                        <!-- Price Range ROI -->
                                        <div class="bg-gray-900 border border-gray-600 rounded-2xl p-6">
                                            <div class="flex items-center gap-2 mb-6">
                                                <h3 class="text-xl font-semibold text-white">Price Range ROI</h3>
                                                <i data-lucide="dollar-sign" class="w-5 h-5 text-green-400"></i>
                                            </div>
                                            <div id="price-range-heatmap-chart" class="h-80 relative z-10 overflow-hidden rounded-xl"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Card 5: Trade Analysis -->
                            <div class="bg-gray-900 border border-gray-700 rounded-2xl p-10 mb-12 shadow-xl">
                                <div class="flex items-center justify-between mb-8">
                                    <div>
                                        <h2 class="text-3xl font-bold text-white mb-2">Trade Analysis</h2>
                                        <p class="text-gray-400 text-sm">Comprehensive performance breakdown and insights</p>
                                    </div>
                                    <div class="flex items-center gap-3 bg-gray-700 px-4 py-2 rounded-xl">
                                        <i data-lucide="bar-chart-4" class="w-6 h-6 text-green-400"></i>
                                        <span class="text-gray-300 text-sm font-medium">Performance Breakdown</span>
                                    </div>
                                </div>
                                
                                <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                    <!-- Profit Distribution -->
                                    <div class="bg-gray-900 border border-gray-600 rounded-2xl p-6">
                                        <div class="flex items-center gap-2 mb-6">
                                            <h3 class="text-xl font-semibold text-white">Profit Distribution</h3>
                                            <i data-lucide="bar-chart-4" class="w-5 h-5 text-purple-400"></i>
                                        </div>
                                        <div class="text-gray-400 text-sm mb-6">Trade profitability spread analysis</div>
                                        <div id="profit-distribution-chart" class="h-80 relative z-10 overflow-hidden rounded-xl"></div>
                                    </div>
                                    
                                    <!-- Best vs Worst Trades -->
                                    <div class="bg-gray-900 border border-gray-600 rounded-2xl p-6">
                                        <div class="flex items-center gap-2 mb-6">
                                            <h3 class="text-xl font-semibold text-white">Best vs Worst Trades</h3>
                                            <i data-lucide="trending-up" class="w-5 h-5 text-green-400"></i>
                                        </div>
                                        <div class="text-gray-400 text-sm mb-6">Top 5 performers in each category</div>
                                        <div id="top-bottom-performers-chart" class="h-80 relative z-10 overflow-hidden rounded-xl"></div>
                                    </div>
                                </div>
                            </div>



                        </div>
                    </div>
                    
                    <!-- Edit Trade Modal -->
                    <div id="edit-trade-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
                        <div class="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-2xl mx-4">
                            <div class="flex items-center justify-between mb-6">
                                <h3 class="text-white font-semibold text-lg">Edit Trade</h3>
                                <button id="close-edit-modal" class="text-gray-400 hover:text-white transition">
                                    <i data-lucide="x" class="w-5 h-5"></i>
                                </button>
                            </div>
                            
                            <form id="edit-trade-form" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="md:col-span-2">
                                    <label class="block text-gray-400 text-sm mb-2">Item Name</label>
                                    <input type="text" id="edit-item-name" class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none" required>
                                </div>
                                <div class="md:col-span-2">
                                    <label class="block text-gray-400 text-sm mb-2">Category</label>
                                    <select id="edit-item-category" class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none" required>
                                        <option value="" disabled selected>Select Category</option>
                                        <option value="Guns">Guns</option>
                                        <option value="Knives">Knives</option>
                                        <option value="Gloves">Gloves</option>
                                        <option value="Cases">Cases</option>
                                        <option value="Stickers">Stickers</option>
                                        <option value="Agents">Agents</option>
                                        <option value="Charms">Charms</option>
                                        <option value="Patches">Patches</option>
                                        <option value="Pins">Pins</option>
                                        <option value="Graffiti">Graffiti</option>
                                        <option value="Keys">Keys</option>
                                        <option value="Music Kits">Music Kits</option>
                                    </select>
                                </div>
                                <div class="group">
                                    <label class="block text-gray-400 text-sm mb-2">Buy Price</label>
                                    <div class="relative">
                                        <div class="absolute inset-0 rounded bg-gradient-to-r from-cyan-500 to-blue-600 p-0.5 opacity-60 group-focus-within:opacity-100 transition-opacity duration-300">
                                            <div class="w-full h-full bg-gray-800 rounded"></div>
                                        </div>
                                        <input type="number" id="edit-buy-price" class="relative z-10 w-full bg-transparent text-white px-3 py-2 rounded focus:outline-none transition-colors duration-200" step="0.01" required>
                                    </div>
                                </div>
                                <div class="group">
                                    <label class="block text-gray-400 text-sm mb-2">Buy Date</label>
                                    <div class="relative">
                                        <div class="absolute inset-0 rounded bg-gradient-to-r from-orange-500 to-red-600 p-0.5 opacity-60 group-focus-within:opacity-100 transition-opacity duration-300">
                                            <div class="w-full h-full bg-gray-800 rounded"></div>
                                        </div>
                                        <div class="flex items-center gap-2 relative z-10">
                                            <input type="text" id="edit-buy-date" placeholder="dd/mm/yyyy" class="flex-1 bg-transparent text-white px-3 py-2 rounded focus:outline-none transition-colors duration-200" required>
                                            <input type="date" id="edit-buy-date-picker" class="absolute opacity-0 pointer-events-none" tabindex="-1">
                                            <button type="button" onclick="document.getElementById('edit-buy-date-picker').showPicker(); event.preventDefault();" class="p-1 text-gray-400 hover:text-white transition-colors duration-200" title="Open calendar">
                                                <i data-lucide="calendar" class="w-4 h-4"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-gray-400 text-sm mb-2">Sell Price <span class="text-gray-500">(Optional)</span></label>
                                    <input type="number" id="edit-sell-price" class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none" step="0.01" placeholder="Leave empty if not sold">
                                </div>
                                <div>
                                    <label class="block text-gray-400 text-sm mb-2">Sell Date <span class="text-gray-500">(Optional)</span></label>
                                    <div class="flex items-center gap-2">
                                        <input type="text" id="edit-sell-date" placeholder="dd/mm/yyyy (optional)" class="flex-1 bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none">
                                        <input type="date" id="edit-sell-date-picker" class="absolute opacity-0 pointer-events-none" tabindex="-1">
                                        <button type="button" onclick="document.getElementById('edit-sell-date-picker').showPicker(); event.preventDefault();" class="p-1 text-gray-400 hover:text-white transition-colors duration-200" title="Open calendar">
                                            <i data-lucide="calendar" class="w-4 h-4"></i>
                                        </button>
                                    </div>
                                </div>
                                <div class="md:col-span-2 flex gap-3 pt-4">
                                    <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition">
                                        <i data-lucide="save" class="w-4 h-4 mr-2 inline"></i>
                                        Save Changes
                                    </button>
                                    <button type="button" id="cancel-edit-trade" class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition">
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
            </div>

            <!-- Trading Modals -->
            
            <!-- Edit Trade Modal -->
            <div id="editTradeModal" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
                <div class="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all duration-300 scale-95">
                    <!-- Modal Header -->
                    <div class="bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-2xl p-6">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                            </div>
                            <div>
                                <h3 class="text-2xl font-bold text-white">Edit Trade</h3>
                                <p class="text-blue-100 text-sm">Update your trade details</p>
                            </div>
                        </div>
                    </div>

                    <!-- Modal Body -->
                    <div class="p-6">
                        <form id="editTradeForm">
                            <div class="grid grid-cols-1 gap-6">
                                <!-- Item Name - Full Width -->
                                <div class="group">
                                    <label class="block text-sm font-semibold text-gray-400 mb-2 group-focus-within:text-blue-400 transition-colors">
                                        <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                                        </svg>
                                        Item Name
                                    </label>
                                    <input type="text" id="editTradeItemName" 
                                           class="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200" 
                                           placeholder="Enter item name" required>
                                </div>

                                <!-- Category Row -->
                                <div class="group">
                                    <label class="block text-sm font-semibold text-gray-400 mb-2 group-focus-within:text-purple-400 transition-colors">
                                        <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                                        </svg>
                                        Category
                                    </label>
                                    <select id="editTradeCategory" required
                                           class="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-all duration-200 appearance-none cursor-pointer">
                                        <option value="" disabled selected class="bg-gray-800 text-gray-400">Select Category</option>
                                        <option value="Guns" class="bg-gray-800 text-white">Guns</option>
                                        <option value="Knives" class="bg-gray-800 text-white">Knives</option>
                                        <option value="Gloves" class="bg-gray-800 text-white">Gloves</option>
                                        <option value="Cases" class="bg-gray-800 text-white">Cases</option>
                                        <option value="Stickers" class="bg-gray-800 text-white">Stickers</option>
                                        <option value="Agents" class="bg-gray-800 text-white">Agents</option>
                                        <option value="Charms" class="bg-gray-800 text-white">Charms</option>
                                        <option value="Patches" class="bg-gray-800 text-white">Patches</option>
                                        <option value="Pins" class="bg-gray-800 text-white">Pins</option>
                                        <option value="Graffiti" class="bg-gray-800 text-white">Graffiti</option>
                                        <option value="Keys" class="bg-gray-800 text-white">Keys</option>
                                        <option value="Music Kits" class="bg-gray-800 text-white">Music Kits</option>
                                    </select>
                                </div>

                                <!-- Dates Row -->
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div class="group">
                                        <label class="block text-sm font-semibold text-gray-400 mb-2 group-focus-within:text-blue-400 transition-colors">
                                            <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                            </svg>
                                            Buy Date
                                        </label>
                                        <div class="relative">
                                            <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 p-0.5 opacity-60 group-focus-within:opacity-100 transition-opacity duration-300">
                                                <div class="w-full h-full bg-gray-800 rounded-xl"></div>
                                            </div>
                                            <div class="flex items-center gap-2 relative z-10">
                                                <input type="text" id="editTradeBuyDate" placeholder="dd/mm/yyyy"
                                                       class="flex-1 px-4 py-3 bg-transparent text-white rounded-xl focus:outline-none transition-all duration-200" 
                                                       required>
                                                <input type="date" id="editTradeBuyDatePicker"
                                                       class="absolute opacity-0 pointer-events-none" tabindex="-1">
                                                <button type="button" onclick="document.getElementById('editTradeBuyDatePicker').showPicker(); event.preventDefault();"
                                                        class="p-2 text-gray-400 hover:text-white transition-colors duration-200" title="Open calendar">
                                                    <i data-lucide="calendar" class="w-4 h-4"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="group">
                                        <label class="block text-sm font-semibold text-gray-400 mb-2 group-focus-within:text-blue-400 transition-colors">
                                            <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                            </svg>
                                            Sell Date
                                            <span class="text-xs text-gray-500 ml-1">(optional)</span>
                                        </label>
                                        <div class="relative">
                                            <div class="flex items-center gap-2">
                                                <input type="text" id="editTradeSellDate" placeholder="dd/mm/yyyy (optional)"
                                                       class="flex-1 px-4 py-3 pr-12 bg-gray-800 border border-gray-600 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200">
                                                <input type="date" id="editTradeSellDatePicker"
                                                       class="absolute opacity-0 pointer-events-none" tabindex="-1">
                                                <button type="button" onclick="document.getElementById('editTradeSellDatePicker').showPicker(); event.preventDefault();"
                                                        class="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-white transition-colors duration-200" title="Open calendar">
                                                    <i data-lucide="calendar" class="w-4 h-4"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Prices Row -->
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div class="group">
                                        <label class="block text-sm font-semibold text-gray-400 mb-2 group-focus-within:text-green-400 transition-colors">
                                            <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                                            </svg>
                                            Buy Price ($)
                                        </label>
                                        <div class="relative">
                                            <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 p-0.5 opacity-60 group-focus-within:opacity-100 transition-opacity duration-300">
                                                <div class="w-full h-full bg-gray-800 rounded-xl"></div>
                                            </div>
                                            <input type="number" id="editTradeBuyPrice" step="0.01" min="0" 
                                                   class="relative z-10 w-full px-4 py-3 bg-transparent text-white placeholder-gray-400 rounded-xl focus:outline-none transition-all duration-200" 
                                                   placeholder="0.00" required>
                                        </div>
                                    </div>
                                    <div class="group">
                                        <label class="block text-sm font-semibold text-gray-400 mb-2 group-focus-within:text-emerald-400 transition-colors">
                                            <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                                            </svg>
                                            Sell Price ($)
                                            <span class="text-xs text-gray-500 ml-1">(optional)</span>
                                        </label>
                                        <input type="number" id="editTradeSellPrice" step="0.01" min="0" 
                                               class="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 transition-all duration-200" 
                                               placeholder="0.00">
                                    </div>
                                </div>
                            </div>

                            <!-- Action Buttons -->
                            <div class="flex gap-4 mt-8 pt-6 border-t border-gray-700">
                                <button type="button" id="cancelTradeEdit" 
                                        class="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                    Cancel
                                </button>
                                <button type="submit" 
                                        class="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                    </svg>
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>     
                </div>
            </div>

            <!-- Delete Confirmation Modal -->
            <div id="deleteTradeModal" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center" style="display: none;">
                <div class="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 scale-95">
                    <!-- Modal Header -->
                    <div class="bg-gradient-to-r from-red-600 to-pink-600 rounded-t-2xl p-6">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                            </div>
                            <div>
                                <h3 class="text-2xl font-bold text-white">Delete Trade</h3>
                                <p class="text-red-100 text-sm">Permanently remove this trade</p>
                            </div>
                        </div>
                    </div>

                    <!-- Modal Body -->
                    <div class="p-6">
                        <div class="text-center mb-6">
                            <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                </svg>
                            </div>
                            
                            <p class="text-gray-300 mb-2 text-lg">
                                Are you sure you want to delete
                            </p>
                            <p class="text-white font-bold text-xl mb-4">
                                "<span id="deleteTradeItemName"></span>"?
                            </p>
                            
                            <div class="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
                                <div class="flex items-center gap-2 text-red-400 text-sm">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                    </svg>
                                    <span class="font-medium">Warning: This action cannot be undone</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div class="flex gap-4 mt-8 pt-6 border-t border-gray-700">
                            <button id="cancelTradeDelete" class="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                                Cancel
                            </button>
                            <button id="confirmTradeDelete" class="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                                Delete Trade
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sell Trade Modal -->
            <div id="sellTradeModal" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center" style="display: none;">
                <div class="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 scale-95">
                    <!-- Modal Header -->
                    <div class="bg-gradient-to-r from-green-600 to-emerald-600 rounded-t-2xl p-6">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                                </svg>
                            </div>
                            <div>
                                <h3 class="text-2xl font-bold text-white">Sell Trade</h3>
                                <p class="text-green-100 text-sm">Complete your trade transaction</p>
                            </div>
                        </div>
                    </div>

                    <!-- Modal Body -->
                    <div class="p-6">
                        <div class="mb-6">
                            <p class="text-gray-400 mb-4 text-center">
                                Enter sell price for "<span id="sellTradeItemName" class="text-white font-semibold"></span>"
                            </p>
                            
                            <div class="space-y-4">
                                <div class="group">
                                    <label class="block text-sm font-semibold text-gray-400 mb-2 group-focus-within:text-green-400 transition-colors">
                                        <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                                        </svg>
                                        Sell Price ($)
                                    </label>
                                    <input type="number" id="sellTradePrice" step="0.01" min="0" 
                                           class="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition-all duration-200 text-lg font-semibold"
                                           placeholder="0.00">
                                </div>
                                
                                <div class="bg-gray-800 rounded-lg p-3 border border-gray-600">
                                    <div class="flex justify-between items-center text-sm">
                                        <span class="text-gray-400">Original Buy Price:</span>
                                        <span class="text-white font-semibold">$<span id="originalTradeBuyPrice">0.00</span></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div class="flex gap-4 mt-8 pt-6 border-t border-gray-700">
                            <button id="cancelTradeSell" class="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                                Cancel
                            </button>
                            <button id="confirmTradeSell" class="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                </svg>
                                Confirm Sale
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Add Trade Modal -->
            <div id="addTradeModal" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
                <div class="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all duration-300 scale-95">
                    <!-- Modal Header -->
                    <div class="bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-2xl p-6">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                                </svg>
                            </div>
                            <div>
                                <h3 class="text-2xl font-bold text-white">Add Trade</h3>
                                <p class="text-blue-100 text-sm">Record your CS2 skin trade</p>
                            </div>
                        </div>
                    </div>

                    <!-- Modal Body -->
                    <div class="p-6">
                        <form id="addTradeForm">
                            <div class="grid grid-cols-1 gap-6">
                                <!-- Item Name - Full Width -->
                                <div class="group">
                                    <label class="block text-gray-300 text-sm font-medium mb-3 flex items-center gap-2">
                                        <i data-lucide="tag" class="w-4 h-4 text-blue-400"></i>
                                        Item Name
                                    </label>
                                    <div class="relative">
                                        <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 p-0.5 opacity-60 group-focus-within:opacity-100 transition-opacity duration-300">
                                            <div class="w-full h-full bg-gray-900 rounded-xl"></div>
                                        </div>
                                        <input type="text" id="addTradeItemName" placeholder="AK-47 | Redline (Field-Tested)" 
                                            class="relative z-10 w-full bg-transparent text-white px-4 py-3 rounded-xl focus:outline-none transition-colors duration-200" required>
                                    </div>
                                </div>

                                <!-- Prices Row -->
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div class="group">
                                        <label class="block text-gray-300 text-sm font-medium mb-3 flex items-center gap-2">
                                            <i data-lucide="dollar-sign" class="w-4 h-4 text-green-400"></i>
                                            Buy Price
                                        </label>
                                        <div class="relative">
                                            <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 p-0.5 opacity-60 group-focus-within:opacity-100 transition-opacity duration-300">
                                                <div class="w-full h-full bg-gray-900 rounded-xl"></div>
                                            </div>
                                            <input type="number" id="addTradeBuyPrice" step="0.01" min="0" placeholder="0.00"
                                                class="relative z-10 w-full bg-transparent text-white px-4 py-3 rounded-xl focus:outline-none transition-colors duration-200" required>
                                        </div>
                                    </div>
                                    <div class="group">
                                        <label class="block text-gray-300 text-sm font-medium mb-3 flex items-center gap-2">
                                            <i data-lucide="dollar-sign" class="w-4 h-4 text-orange-400"></i>
                                            Sell Price <span class="text-gray-500 text-xs">(optional)</span>
                                        </label>
                                        <div class="relative">
                                            <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 p-0.5 opacity-50 group-focus-within:opacity-100 transition-opacity duration-200">
                                                <div class="w-full h-full bg-gray-900 rounded-xl"></div>
                                            </div>
                                            <input type="number" id="addTradeSellPrice" step="0.01" min="0" placeholder="0.00"
                                                class="relative z-10 w-full bg-transparent text-white px-4 py-3 rounded-xl focus:outline-none transition-colors duration-200">
                                        </div>
                                    </div>
                                </div>

                                <!-- Dates Row -->
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div class="group">
                                        <label class="block text-gray-300 text-sm font-medium mb-3 flex items-center gap-2">
                                            <i data-lucide="calendar" class="w-4 h-4 text-blue-400"></i>
                                            Buy Date
                                        </label>
                                        <div class="relative">
                                            <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 p-0.5 opacity-60 group-focus-within:opacity-100 transition-opacity duration-300">
                                                <div class="w-full h-full bg-gray-900 rounded-xl"></div>
                                            </div>
                                            <div class="flex items-center gap-2 relative z-10">
                                                <input type="text" id="addTradeBuyDate" placeholder="dd/mm/yyyy" value="${this.getTodayFormatted()}"
                                                       class="flex-1 bg-transparent text-white px-4 py-3 rounded-xl focus:outline-none transition-colors duration-200" required>
                                                <input type="date" id="addTradeBuyDatePicker" value="${this.getTodayISO()}"
                                                       class="absolute opacity-0 pointer-events-none" tabindex="-1">
                                                <button type="button" onclick="document.getElementById('addTradeBuyDatePicker').showPicker(); event.preventDefault();"
                                                        class="p-2 text-gray-400 hover:text-white transition-colors duration-200" title="Open calendar">
                                                    <i data-lucide="calendar" class="w-4 h-4"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="group">
                                        <label class="block text-gray-300 text-sm font-medium mb-3 flex items-center gap-2">
                                            <i data-lucide="calendar" class="w-4 h-4 text-purple-400"></i>
                                            Sell Date <span class="text-gray-500 text-xs">(optional)</span>
                                        </label>
                                        <div class="relative">
                                            <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 p-0.5 opacity-50 group-focus-within:opacity-100 transition-opacity duration-200">
                                                <div class="w-full h-full bg-gray-900 rounded-xl"></div>
                                            </div>
                                            <div class="flex items-center gap-2 relative z-10">
                                                <input type="text" id="addTradeSellDate" placeholder="dd/mm/yyyy (optional)"
                                                       class="flex-1 bg-transparent text-white px-4 py-3 rounded-xl focus:outline-none transition-colors duration-200">
                                                <input type="date" id="addTradeSellDatePicker"
                                                       class="absolute opacity-0 pointer-events-none" tabindex="-1">
                                                <button type="button" onclick="document.getElementById('addTradeSellDatePicker').showPicker(); event.preventDefault();"
                                                        class="p-2 text-gray-400 hover:text-white transition-colors duration-200" title="Open calendar">
                                                    <i data-lucide="calendar" class="w-4 h-4"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Action Buttons -->
                            <div class="flex gap-4 mt-8 pt-6 border-t border-gray-700">
                                <button type="button" onclick="window.tradingPage?.closeAddTradeModal()" 
                                        class="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                    Cancel
                                </button>
                                <button type="submit" 
                                        class="flex-1 group relative bg-gray-900 hover:bg-gradient-to-r hover:from-green-500 hover:to-emerald-600 text-gray-300 hover:text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden">
                                    <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 p-0.5">
                                        <div class="w-full h-full bg-gray-900 rounded-xl group-hover:bg-transparent transition-colors duration-300"></div>
                                    </div>
                                    <i data-lucide="plus" class="w-4 h-4 relative z-10"></i>
                                    <span class="relative z-10">Add Trade</span>
                                </button>
                            </div>
                        </form>
                    </div>     
                </div>
            </div>
        </div>
        `
    }

    getTradingTableHTML() {
        const trades = this.getFilteredAndSortedTrades()
        if (trades.length === 0) {
            return `
                <div class="p-8 text-center text-gray-400">
                    <i data-lucide="inbox" class="w-12 h-12 mx-auto mb-4"></i>
                    <p class="text-lg mb-2">No trades yet</p>
                    <p class="text-sm">Click "Add Trade" to start tracking your CS2 skin trades</p>
                </div>
            `
        }
        
        const formatNum = (num) => this.store.formatNumber ? this.store.formatNumber(num) : num.toFixed(2)
        const allTrades = this.getTradingData()
        
        return trades.map((trade, index) => {
            // Find the original index in the full trades array
            const originalIndex = allTrades.findIndex(t => 
                t.itemName === trade.itemName && 
                t.buyPrice === trade.buyPrice && 
                t.buyDate === trade.buyDate
            )
            const profit = trade.sellPrice ? (trade.sellPrice - trade.buyPrice) : 0
            const returnPercent = trade.sellPrice ? ((trade.sellPrice - trade.buyPrice) / trade.buyPrice * 100) : 0
            const status = trade.sellPrice ? 'sold' : 'holding'
            const profitClass = profit >= 0 ? 'text-green-400' : 'text-red-400'
            
            return `
                <div class="p-4 hover:bg-gray-800 transition">
                    <div class="flex items-center gap-3 w-full">
                        <!-- Row Number -->
                        <div class="flex-none w-12 text-center">
                            <div class="w-8 h-8 bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600 rounded-lg flex items-center justify-center text-gray-300 text-sm font-bold">
                                ${index + 1}
                            </div>
                        </div>
                        
                        <!-- Image Placeholder -->
                        <div class="flex-none w-20 flex items-center justify-center">
                            <div class="w-16 h-16 bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center hover:border-blue-500 transition-colors">
                                <svg class="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                </svg>
                            </div>
                        </div>
                        
                        <!-- Sophisticated Item Card -->
                        <div class="item-card group flex-1 min-w-0 overflow-hidden relative">
                            <!-- Animated Background -->
                            <div class="absolute inset-0 bg-gradient-to-r from-gray-900/20 via-gray-800/10 to-gray-900/20 opacity-0 group-hover:opacity-100 transition-all duration-700 rounded-lg"></div>
                            <div class="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-all duration-1000 rounded-lg animate-pulse"></div>
                            
                            <!-- Main Content Container -->
                            <div class="relative flex items-center gap-4 p-3 rounded-lg transition-all duration-500 group-hover:bg-gray-800/30 group-hover:shadow-lg group-hover:shadow-gray-700/20 group-hover:transform group-hover:scale-[1.02]">
                                <!-- Accent Bar with Animation -->
                                <div class="relative">
                                    <div class="w-1 h-12 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full transition-all duration-500 group-hover:h-14 group-hover:w-1.5 group-hover:shadow-lg group-hover:shadow-purple-500/50"></div>
                                    <div class="absolute inset-0 w-1 h-12 bg-gradient-to-b from-blue-400 to-purple-500 rounded-full opacity-0 group-hover:opacity-60 transition-all duration-500 animate-pulse"></div>
                                </div>
                                
                                <!-- Item Content -->
                                <div class="flex-1 min-w-0 space-y-2">
                                    <!-- Item Name -->
                                    <div class="relative">
                                        <div class="text-white font-bold text-base leading-tight truncate bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent group-hover:from-blue-100 group-hover:to-purple-200 transition-all duration-500">${trade.itemName}</div>
                                        
                                        <!-- Floating Sparkles -->
                                        <div class="absolute -top-1 -right-2 w-1 h-1 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping animation-delay-200"></div>
                                        <div class="absolute top-1 -left-1 w-0.5 h-0.5 bg-purple-400 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping animation-delay-500"></div>
                                    </div>
                                    
                                    <!-- Enhanced Price Badge Container -->
                                    <div class="relative">
                                        <!-- Sophisticated Price Badge -->
                                        <div class="price-badge-container relative inline-flex items-center">
                                            <div class="price-badge relative flex flex-col gap-2 px-4 py-3 bg-gradient-to-br from-gray-800/60 to-gray-900/80 border border-gray-600/40 rounded-xl backdrop-blur-sm hover:from-blue-900/60 hover:to-purple-900/60 hover:border-blue-500/60 transition-all duration-500 hover:scale-110 hover:shadow-2xl hover:shadow-blue-500/30 overflow-hidden cursor-pointer group">
                                                <!-- Dramatic Color Background -->
                                                <div class="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-orange-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                                <div class="absolute inset-0 bg-gradient-to-tl from-cyan-500/10 via-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-pulse"></div>
                                                
                                                <!-- Glowing Border Effect -->
                                                <div class="absolute inset-0 rounded-xl border-2 border-transparent bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-orange-500/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse" style="animation-duration: 1.5s;"></div>
                                                <div class="absolute inset-0.5 rounded-xl bg-gradient-to-br from-gray-800/90 to-gray-900/90"></div>
                                                
                                                <!-- Rainbow Glow Ring -->
                                                <div class="absolute -inset-1 rounded-xl bg-gradient-to-r from-blue-400 via-purple-400 to-orange-400 opacity-0 group-hover:opacity-30 transition-opacity duration-500 blur-sm animate-pulse" style="animation-duration: 2s;"></div>
                                                
                                                <!-- Enhanced Floating Elements -->
                                                <div class="absolute top-1 left-1 w-2 h-2 bg-blue-400/80 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-bounce animation-delay-100"></div>
                                                <div class="absolute top-1 right-1 w-1.5 h-1.5 bg-purple-400/80 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-bounce animation-delay-300"></div>
                                                <div class="absolute bottom-1 left-1 w-1.5 h-1.5 bg-orange-400/80 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-bounce animation-delay-500"></div>
                                                <div class="absolute bottom-1 right-1 w-2 h-2 bg-cyan-400/80 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-bounce animation-delay-700"></div>
                                                
                                                <!-- Pulsing Corner Accents -->
                                                <div class="absolute top-0 left-0 w-3 h-3 bg-blue-500/60 rounded-br-xl opacity-0 group-hover:opacity-100 animate-pulse animation-delay-200"></div>
                                                <div class="absolute top-0 right-0 w-3 h-3 bg-purple-500/60 rounded-bl-xl opacity-0 group-hover:opacity-100 animate-pulse animation-delay-400"></div>
                                                <div class="absolute bottom-0 left-0 w-3 h-3 bg-orange-500/60 rounded-tr-xl opacity-0 group-hover:opacity-100 animate-pulse animation-delay-600"></div>
                                                <div class="absolute bottom-0 right-0 w-3 h-3 bg-cyan-500/60 rounded-tl-xl opacity-0 group-hover:opacity-100 animate-pulse animation-delay-800"></div>
                                                
                                                <!-- CSFloat Row -->
                                                <div class="relative flex items-center justify-between gap-3 min-w-0 transform group-hover:translate-x-0.5 transition-transform duration-400">
                                                    <div class="flex items-center gap-2.5 min-w-0">
                                                        <div class="relative flex items-center justify-center">
                                                            <div class="w-2.5 h-2.5 bg-blue-400 rounded-full animate-pulse group-hover:animate-bounce"></div>
                                                            <div class="absolute inset-0 w-2.5 h-2.5 bg-blue-400 rounded-full animate-ping opacity-20 group-hover:opacity-40"></div>
                                                            <div class="absolute inset-0 w-3 h-3 border border-blue-400/30 rounded-full opacity-0 group-hover:opacity-100 animate-spin"></div>
                                                        </div>
                                                        <span class="text-blue-300 font-semibold text-xs tracking-wide group-hover:text-blue-200 transition-colors duration-400">CSFloat</span>
                                                    </div>
                                                    <span class="text-emerald-400 font-bold text-xs tabular-nums group-hover:text-emerald-300 transform group-hover:scale-105 transition-all duration-400" id="csfloat-trade-${index}">
                                                        <div class="inline-flex items-center gap-1.5">
                                                            <div class="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin group-hover:border-blue-300"></div>
                                                            <span class="text-xs text-gray-400 group-hover:text-gray-300">Loading...</span>
                                                        </div>
                                                    </span>
                                                </div>
                                                
                                                <!-- Buff163 Row -->
                                                <div class="relative flex items-center justify-between gap-3 min-w-0 transform group-hover:-translate-x-0.5 transition-transform duration-400">
                                                    <div class="flex items-center gap-2.5 min-w-0">
                                                        <div class="relative flex items-center justify-center">
                                                            <div class="w-2.5 h-2.5 bg-orange-400 rounded-full animate-pulse group-hover:animate-bounce animation-delay-100"></div>
                                                            <div class="absolute inset-0 w-2.5 h-2.5 bg-orange-400 rounded-full animate-ping opacity-20 group-hover:opacity-40"></div>
                                                            <div class="absolute inset-0 w-3 h-3 border border-orange-400/30 rounded-full opacity-0 group-hover:opacity-100 animate-spin animation-delay-200"></div>
                                                        </div>
                                                        <span class="text-orange-300 font-semibold text-xs tracking-wide group-hover:text-orange-200 transition-colors duration-400">Buff163</span>
                                                    </div>
                                                    <span class="text-emerald-400 font-bold text-xs tabular-nums group-hover:text-emerald-300 transform group-hover:scale-105 transition-all duration-400" id="buff-trade-${index}">
                                                        <div class="inline-flex items-center gap-1.5">
                                                            <div class="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin group-hover:border-orange-300"></div>
                                                            <span class="text-xs text-gray-400 group-hover:text-gray-300">Loading...</span>
                                                        </div>
                                                    </span>
                                                </div>
                                                
                                                <!-- Subtle Corner Elements -->
                                                <div class="absolute top-0 right-0 w-3 h-3 bg-gradient-to-bl from-blue-400/20 to-transparent rounded-bl-lg opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                                                <div class="absolute bottom-0 left-0 w-3 h-3 bg-gradient-to-tr from-orange-400/20 to-transparent rounded-tr-lg opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                                            </div>
                                        </div>
                                        
                                        <!-- Floating Price Indicators -->
                                        <div class="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400/40 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping animation-delay-300"></div>
                                        <div class="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-blue-400/40 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping animation-delay-600"></div>
                                    </div>
                                </div>
                                
                                <!-- Ambient Glow Border -->
                                <div class="absolute inset-0 rounded-lg border border-transparent bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-orange-500/0 group-hover:from-blue-500/20 group-hover:via-purple-500/20 group-hover:to-orange-500/20 transition-all duration-700 pointer-events-none"></div>
                            </div>
                        </div>
                        
                        <!-- 24h % -->
                        <div class="flex-none w-20 text-center">
                            <span class="text-xs font-medium text-gray-500">
                                --%
                            </span>
                        </div>
                        
                        <!-- 7d % -->
                        <div class="flex-none w-20 text-center">
                            <span class="text-xs font-medium text-gray-500">
                                --%
                            </span>
                        </div>
                        
                        <!-- 30d % -->
                        <div class="flex-none w-20 text-center">
                            <span class="text-xs font-medium text-gray-500">
                                --%
                            </span>
                        </div>
                        
                        <!-- Category -->
                        <div class="flex-none w-24 text-center">
                            <span class="text-xs font-medium text-purple-400">
                                ${trade.category || 'Unknown'}
                            </span>
                        </div>
                        
                        <!-- Buy Price -->
                        <div class="flex-none w-28 text-center text-white font-semibold">
                            $${formatNum(trade.buyPrice)}
                        </div>
                        
                        <!-- Buy Date -->
                        <div class="flex-none w-28 text-center text-gray-400 text-sm">
                            ${this.formatDate(trade.buyDate)}
                        </div>
                        
                        <!-- Sell Price -->
                        <div class="flex-none w-28 text-center">
                            ${trade.sellPrice ? 
                                `<span class="text-green-400 font-semibold">$${formatNum(trade.sellPrice)}</span>` :
                                `<span class="text-gray-500">-</span>`
                            }
                        </div>
                        
                        <!-- Sell Date -->
                        <div class="flex-none w-28 text-center">
                            ${trade.sellDate ? 
                                `<span class="text-gray-400 text-sm">${this.formatDate(trade.sellDate)}</span>` :
                                `<span class="text-gray-500">-</span>`
                            }
                        </div>
                        
                        <!-- P&L -->
                        <div class="flex-none w-24 text-center">
                            ${trade.sellPrice ? 
                                `<span class="${profit >= 0 ? 'text-green-400' : 'text-red-400'} font-bold">${profit >= 0 ? '+' : ''}$${formatNum(Math.abs(profit))}</span>` :
                                `<span class="text-gray-500">-</span>`
                            }
                        </div>
                        
                        <!-- Return % -->
                        <div class="flex-none w-24 text-center">
                            ${trade.sellPrice ? 
                                `<span class="${profit >= 0 ? 'text-green-400' : 'text-red-400'} font-semibold">${returnPercent >= 0 ? '+' : ''}${returnPercent.toFixed(1)}%</span>` :
                                `<span class="text-gray-500">-</span>`
                            }
                        </div>
                        
                        <!-- Status -->
                        <div class="flex-none w-24 text-center">
                            <span class="px-2 py-1 rounded-full text-xs font-medium ${
                                status === 'sold' 
                                    ? 'bg-green-900 text-green-400 border border-green-700' 
                                    : 'bg-blue-900 text-blue-400 border border-blue-700'
                            }">
                                ${status === 'sold' ? 'Sold' : 'Holding'}
                            </span>
                        </div>
                        
                        <!-- Actions -->
                        <div class="flex-none w-28 flex items-center justify-center">
                            <div class="flex gap-1 items-center">
                                ${status === 'holding' ? `
                                    <button onclick="window.tradingPage?.openSellModal(${originalIndex})" class="text-green-400 hover:text-green-300 transition p-1 rounded hover:bg-green-900/20" title="Sell Trade">
                                        <i data-lucide="trending-up" class="w-4 h-4"></i>
                                    </button>
                                ` : `
                                    <div class="w-6"></div>
                                `}
                                <button onclick="window.tradingPage?.editTrade(${originalIndex})" class="text-blue-400 hover:text-blue-300 transition p-1 rounded hover:bg-blue-900/20" title="Edit Trade">
                                    <i data-lucide="edit" class="w-4 h-4"></i>
                                </button>
                                <button onclick="window.tradingPage?.deleteTrade(${originalIndex})" class="text-red-400 hover:text-red-300 transition p-1 rounded hover:bg-red-900/20" title="Delete Trade">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `
        }).join('')
    }

    getTradingData() {
        // Get trading data from localStorage or return sample data
        const savedTrades = localStorage.getItem('tradingData')
        let trades = []
        
        // For debugging - uncomment to clear localStorage and get fresh sample data
        // localStorage.removeItem('tradingData')
        
        if (savedTrades) {
            try {
                trades = JSON.parse(savedTrades)
                console.log('📦 Loaded trades from localStorage:', trades.length, 'trades')
            } catch (e) {
                console.error('❌ Error parsing saved trades:', e)
                trades = []
            }
        } else {
            console.log('🆕 No saved trades found, using sample data')
            // Sample data for demonstration - using current dates
            const now = new Date()
            const currentMonth = now.getMonth()
            const currentYear = now.getFullYear()
            
            trades = [
                {
                    itemName: 'AK-47 | Redline (FT)',
                    buyPrice: 127.45,
                    buyDate: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-15`,
                    sellPrice: 145.20,
                    sellDate: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-20`,
                },
                {
                    itemName: 'AWP | Dragon Lore (FN)',
                    buyPrice: 12450.00,
                    buyDate: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-18`,
                    sellPrice: null,
                    sellDate: null,
                },
                {
                    itemName: 'Karambit | Fade (FN)',
                    buyPrice: 2890.50,
                    buyDate: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-05`,
                    sellPrice: 3120.00,
                    sellDate: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-25`,
                },
                {
                    itemName: 'M4A4 | Howl (FT)',
                    buyPrice: 3200.00,
                    buyDate: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-10`,
                    sellPrice: 3450.75,
                    sellDate: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-28`,
                },
                {
                    itemName: 'Glock-18 | Fade (FN)',
                    buyPrice: 850.25,
                    buyDate: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-12`,
                    sellPrice: 920.00,
                    sellDate: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-30`,
                }
            ]
        }
        
        // Sort trades by buy date (most recent first)
        return trades.sort((a, b) => this.parseDateForSorting(b.buyDate) - this.parseDateForSorting(a.buyDate))
    }

    saveTradingData(trades) {
        try {
            console.log('💾 Saving to localStorage...', trades.length, 'trades')
            localStorage.setItem('tradingData', JSON.stringify(trades))
            console.log('📊 Refreshing positions tab...')
            this.refreshPositionsTab()
            
            console.log('📈 Updating analytics display...')
            // Always update analytics display since starting capital might have changed
            this.updateAnalyticsDisplay()
            console.log('✅ Save completed successfully')
        } catch (error) {
            console.error('❌ Error in saveTradingData:', error)
            alert('Error saving trade data: ' + error.message)
        }
    }

    // Starting Capital Management - Now automatically calculated from trading history
    getStartingCapital() {
        const trades = this.getTradingData()
        
        // If no trades, use manually saved value or default
        if (trades.length === 0) {
            const saved = localStorage.getItem('startingCapital')
            return saved ? parseFloat(saved) : 10000 // Default $10k
        }
        
        // Calculate starting capital from first trade's buy price
        // Sort trades by buy date to find the earliest trade
        const sortedTrades = [...trades].sort((a, b) => this.parseDateForSorting(a.buyDate) - this.parseDateForSorting(b.buyDate))
        const firstTrade = sortedTrades[0]
        
        // Starting capital = first trade buy price (this represents the initial capital needed to start trading)
        return firstTrade.buyPrice || 10000
    }

    setStartingCapital(amount) {
        localStorage.setItem('startingCapital', amount.toString())
        this.updateAnalyticsDisplay()
    }

    // Portfolio Snapshot Calculation - This is the key method for flipping tracking
    calculatePortfolioSnapshots() {
        const trades = this.getTradingData()
        const startingCapital = this.getStartingCapital()
        
        // Sort trades by date to calculate portfolio progression
        const sortedTrades = [...trades].sort((a, b) => this.parseDateForSorting(a.buyDate) - this.parseDateForSorting(b.buyDate))
        
        let portfolioSnapshots = []
        let availableCash = startingCapital
        let holdings = new Map() // Track current holdings by date
        
        // Create timeline of all trade events
        let events = []
        
        sortedTrades.forEach(trade => {
            // Buy event
            events.push({
                date: trade.buyDate,
                type: 'buy',
                amount: trade.buyPrice,
                itemName: trade.itemName,
                tradeId: trade.itemName + '_' + trade.buyDate
            })
            
            // Sell event (if completed)
            if (trade.sellPrice && trade.sellDate) {
                events.push({
                    date: trade.sellDate,
                    type: 'sell', 
                    amount: trade.sellPrice,
                    buyAmount: trade.buyPrice,
                    itemName: trade.itemName,
                    tradeId: trade.itemName + '_' + trade.buyDate
                })
            }
        })
        
        // Sort all events by date
        events.sort((a, b) => this.parseDateForSorting(a.date) - this.parseDateForSorting(b.date))
        
        // Process events chronologically to build portfolio timeline
        events.forEach(event => {
            if (event.type === 'buy') {
                availableCash -= event.amount
                holdings.set(event.tradeId, {
                    itemName: event.itemName,
                    buyPrice: event.amount,
                    currentValue: event.amount // Start with buy price
                })
            } else if (event.type === 'sell') {
                availableCash += event.amount
                holdings.delete(event.tradeId)
            }
            
            // Calculate current holdings value (simplified - using buy price for now)
            let holdingsValue = 0
            holdings.forEach(holding => {
                holdingsValue += holding.currentValue
            })
            
            const totalPortfolio = availableCash + holdingsValue
            const totalReturn = totalPortfolio - startingCapital
            const roiPercent = (totalReturn / startingCapital) * 100
            
            portfolioSnapshots.push({
                date: event.date,
                availableCash,
                holdingsValue,
                totalPortfolio,
                totalReturn,
                roiPercent,
                eventType: event.type,
                eventAmount: event.amount
            })
        })
        
        return portfolioSnapshots
    }

    // Updated metrics calculation using portfolio snapshots
    calculateTradingMetrics() {
        const trades = this.getTradingData()
        const snapshots = this.calculatePortfolioSnapshots()
        const startingCapital = this.getStartingCapital()
        
        const completedTrades = trades.filter(t => t.sellPrice)
        const holdingTrades = trades.filter(t => !t.sellPrice)
        
        // Current portfolio state
        const currentSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : {
            availableCash: startingCapital,
            holdingsValue: 0,
            totalPortfolio: startingCapital,
            totalReturn: 0,
            roiPercent: 0
        }
        
        // Basic trade statistics
        const totalTrades = trades.length
        const winningTrades = completedTrades.filter(t => t.sellPrice > t.buyPrice)
        const losingTrades = completedTrades.filter(t => t.sellPrice <= t.buyPrice)
        const winRate = completedTrades.length > 0 ? (winningTrades.length / completedTrades.length * 100) : 0
        
        // Realized P&L from completed trades
        const realizedPnL = completedTrades.reduce((sum, t) => sum + (t.sellPrice - t.buyPrice), 0)
        const avgProfit = completedTrades.length > 0 ? realizedPnL / completedTrades.length : 0
        
        // Unrealized P&L (simplified - assume 5% gain on current holdings)
        const unrealizedPnL = holdingTrades.reduce((sum, t) => sum + (t.buyPrice * 0.05), 0)
        
        // Calculate monthly average return
        const monthsTrading = this.getMonthsTrading(snapshots)
        const monthlyAvgReturn = monthsTrading > 0 ? (currentSnapshot.roiPercent / monthsTrading) : 0
        
        // Other metrics
        const tradingVelocity = totalTrades / Math.max(monthsTrading, 1)
        const profitFactor = losingTrades.reduce((sum, t) => sum + Math.abs(t.sellPrice - t.buyPrice), 0) > 0 
            ? winningTrades.reduce((sum, t) => sum + (t.sellPrice - t.buyPrice), 0) / losingTrades.reduce((sum, t) => sum + Math.abs(t.sellPrice - t.buyPrice), 0)
            : 999
        
        return {
            // Portfolio metrics (main focus for flipping)
            startingCapital,
            currentPortfolio: currentSnapshot.totalPortfolio,
            availableCapital: currentSnapshot.availableCash,
            capitalInUse: currentSnapshot.holdingsValue,
            totalReturn: currentSnapshot.totalReturn,
            roiPercent: currentSnapshot.roiPercent,
            monthlyAvgReturn,
            
            // Traditional trade metrics
            totalTrades,
            winRate: winRate.toFixed(2),
            avgProfit,
            totalProfit: realizedPnL, // This is realized P&L
            realizedPnL,
            unrealizedPnL,
            tradingVelocity: tradingVelocity.toFixed(1),
            profitFactor: profitFactor > 100 ? '999.0' : profitFactor.toFixed(1),
            
            // Data for charts
            portfolioSnapshots: snapshots,
            activeHoldings: holdingTrades,
            completedTrades,
            
            // Legacy compatibility
            avgReturn: currentSnapshot.roiPercent.toFixed(2),
            capitalEfficiency: currentSnapshot.totalPortfolio > 0 ? (currentSnapshot.totalPortfolio / startingCapital).toFixed(1) : '1.0',
            riskExposure: currentSnapshot.totalPortfolio > 0 ? ((currentSnapshot.holdingsValue / currentSnapshot.totalPortfolio) * 100).toFixed(0) : '0',
            totalCapital: currentSnapshot.totalPortfolio
        }
    }
    
    getMonthsTrading(snapshots) {
        if (snapshots.length === 0) return 1
        
        const firstDate = new Date(snapshots[0].date)
        const lastDate = new Date(snapshots[snapshots.length - 1].date)
        const diffTime = Math.abs(lastDate - firstDate)
        const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30))
        
        return Math.max(diffMonths, 1)
    }

    // New Monthly Trading Dashboard Methods
    getCurrentMonthDisplay() {
        if (!this.currentMonth) {
            this.currentMonth = this.getMostRecentTradingMonth()
        }
        return this.currentMonth.toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
        })
    }

    // Find the most recent month with trading activity
    getMostRecentTradingMonth() {
        const trades = this.getTradingData()
        if (trades.length === 0) {
            return new Date() // Default to current month if no trades
        }

        // Get all sell dates from completed trades
        const sellDates = trades
            .filter(trade => trade.sellDate && trade.sellPrice)
            .map(trade => this.parseDateForSorting(trade.sellDate))
            .filter(date => !isNaN(date.getTime()))

        // Get all buy dates
        const buyDates = trades
            .map(trade => this.parseDateForSorting(trade.buyDate))
            .filter(date => !isNaN(date.getTime()))

        // Combine all dates and find the most recent
        const allDates = [...sellDates, ...buyDates]
        if (allDates.length === 0) {
            return new Date()
        }

        // Sort dates and get the most recent
        allDates.sort((a, b) => b - a)
        const mostRecentDate = allDates[0]

        // Return the first day of that month
        return new Date(mostRecentDate.getFullYear(), mostRecentDate.getMonth(), 1)
    }

    // Navigate to previous/next month
    navigateMonth(direction) {
        if (!this.currentMonth) {
            this.currentMonth = this.getMostRecentTradingMonth()
        }
        
        // Move to previous/next month
        const newMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + direction, 1)
        this.currentMonth = newMonth
        
        console.log(`📅 Navigated to: ${this.getCurrentMonthDisplay()}`)
        
        // Refresh the monthly dashboard
        this.refreshMonthlyDashboard()
    }

    getMonthlyMetrics() {
        if (!this.currentMonth) {
            this.currentMonth = this.getMostRecentTradingMonth()
        }
        const currentMonth = this.currentMonth
        const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
        const currentMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
        
        const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
        const prevMonthStart = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1)
        const prevMonthEnd = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0)

        const trades = this.getTradingData()
        
        // Filter COMPLETED trades for current month (based on sell date)
        const currentMonthCompleted = trades.filter(trade => {
            if (!trade.sellDate || !trade.sellPrice) return false
            const sellDate = this.parseDateForSorting(trade.sellDate)
            return sellDate >= currentMonthStart && sellDate <= currentMonthEnd
        })
        
        // Filter COMPLETED trades for previous month (based on sell date)  
        const prevMonthCompleted = trades.filter(trade => {
            if (!trade.sellDate || !trade.sellPrice) return false
            const sellDate = this.parseDateForSorting(trade.sellDate)
            return sellDate >= prevMonthStart && sellDate <= prevMonthEnd
        })

        // Calculate metrics
        const totalTrades = currentMonthCompleted.length
        const monthlyPnL = currentMonthCompleted.reduce((sum, t) => sum + (t.sellPrice - t.buyPrice), 0)
        const winningTrades = currentMonthCompleted.filter(t => t.sellPrice > t.buyPrice)
        const winRate = totalTrades > 0 ? ((winningTrades.length / totalTrades) * 100).toFixed(1) : '0.0'
        const avgProfitPerTrade = totalTrades > 0 ? monthlyPnL / totalTrades : 0
        
        // Debug logging
        console.log(`📊 Monthly Metrics for ${currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}:`, {
            totalTrades,
            monthlyPnL,
            completedTradesCount: currentMonthCompleted.length
        })

        // Compare with previous month
        const prevTotalTrades = prevMonthCompleted.length
        const prevMonthlyPnL = prevMonthCompleted.reduce((sum, t) => sum + (t.sellPrice - t.buyPrice), 0)
        const prevWinningTrades = prevMonthCompleted.filter(t => t.sellPrice > t.buyPrice)
        const prevWinRate = prevTotalTrades > 0 ? ((prevWinningTrades.length / prevTotalTrades) * 100) : 0
        const prevAvgProfitPerTrade = prevTotalTrades > 0 ? prevMonthlyPnL / prevTotalTrades : 0

        const result = {
            totalTrades,
            monthlyPnL,
            winRate: parseFloat(winRate),
            avgProfitPerTrade,
            tradesVsPrevMonth: totalTrades - prevTotalTrades,
            pnlVsPrevMonth: monthlyPnL - prevMonthlyPnL,
            winRateVsPrevMonth: (parseFloat(winRate) - prevWinRate).toFixed(1),
            avgProfitVsPrevMonth: avgProfitPerTrade - prevAvgProfitPerTrade
        }
        
        console.log('📊 Monthly Metrics Calculated:', result)
        console.log('📊 Previous month data:', { prevTotalTrades, prevMonthlyPnL, prevWinRate, prevAvgProfitPerTrade })
        
        return result
    }

    // Enhanced metrics for better trading insights
    getEnhancedMonthlyMetrics() {
        if (!this.currentMonth) {
            this.currentMonth = this.getMostRecentTradingMonth()
        }
        const currentMonth = this.currentMonth
        const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
        const currentMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
        
        const trades = this.getTradingData()
        
        // Get COMPLETED trades for current month (based on sell date)
        const completedTrades = trades.filter(trade => {
            if (!trade.sellDate || !trade.sellPrice) return false
            const sellDate = this.parseDateForSorting(trade.sellDate)
            return sellDate >= currentMonthStart && sellDate <= currentMonthEnd
        })
        
        // Get ALL trades for current month (for holdings analysis - based on buy date)
        const currentMonthTrades = trades.filter(trade => {
            const buyDate = this.parseDateForSorting(trade.buyDate)
            return buyDate >= currentMonthStart && buyDate <= currentMonthEnd
        })
        
        const holdingTrades = currentMonthTrades.filter(t => !t.sellPrice)
        
        // Calculate average return percentage
        const avgReturnPercent = completedTrades.length > 0 
            ? completedTrades.reduce((sum, t) => sum + ((t.sellPrice - t.buyPrice) / t.buyPrice * 100), 0) / completedTrades.length
            : 0
            
        // Find best and worst trades
        const bestTrade = completedTrades.length > 0 ? completedTrades.reduce((best, trade) => {
            const profit = trade.sellPrice - trade.buyPrice
            const bestProfit = best ? best.sellPrice - best.buyPrice : -Infinity
            return profit > bestProfit ? trade : best
        }, null) : null
        
        const worstTrade = completedTrades.length > 0 ? completedTrades.reduce((worst, trade) => {
            const profit = trade.sellPrice - trade.buyPrice
            const worstProfit = worst ? worst.sellPrice - worst.buyPrice : Infinity
            return profit < worstProfit ? trade : worst
        }, null) : null
        
        // Calculate average hold time for completed trades
        const avgHoldDays = completedTrades.length > 0
            ? completedTrades.reduce((sum, t) => {
                const buyDate = this.parseDateForSorting(t.buyDate)
                const sellDate = this.parseDateForSorting(t.sellDate)
                if (isNaN(buyDate.getTime()) || isNaN(sellDate.getTime())) {
                    return sum // Skip invalid dates
                }
                return sum + Math.floor((sellDate - buyDate) / (1000 * 60 * 60 * 24))
            }, 0) / completedTrades.length
            : 0
            
        // Calculate total capital in holdings
        const capitalInHoldings = holdingTrades.reduce((sum, t) => sum + t.buyPrice, 0)
        
        // Win streak calculation
        const allCompletedTrades = trades.filter(t => t.sellPrice).sort((a, b) => this.parseDateForSorting(b.sellDate) - this.parseDateForSorting(a.sellDate))
        let currentStreak = 0
        let streakType = 'none' // 'winning', 'losing', 'none'
        
        for (const trade of allCompletedTrades) {
            const isWin = trade.sellPrice > trade.buyPrice
            if (currentStreak === 0) {
                currentStreak = 1
                streakType = isWin ? 'winning' : 'losing'
            } else if ((streakType === 'winning' && isWin) || (streakType === 'losing' && !isWin)) {
                currentStreak++
            } else {
                break
            }
        }
        
        return {
            avgReturnPercent: completedTrades.length > 0 ? avgReturnPercent.toFixed(2) : '0.00',
            bestTrade,
            worstTrade,
            avgHoldDays: completedTrades.length > 0 ? Math.round(avgHoldDays) : 0,
            capitalInHoldings,
            currentHoldings: holdingTrades.length,
            completionRate: trades.length > 0 ? ((completedTrades.length / trades.length) * 100).toFixed(1) : '0.0',
            currentStreak: completedTrades.length > 0 ? currentStreak : 0,
            streakType: completedTrades.length > 0 ? streakType : 'none'
        }
    }

    generateWeeklyBreakdownHTML() {
        if (!this.currentMonth) {
            this.currentMonth = this.getMostRecentTradingMonth()
        }
        const currentMonth = this.currentMonth
        const weeks = this.getWeeksInMonth(currentMonth)
        
        // Show all weeks in the month (can be 4, 5, or even 6 depending on the month)
        return weeks.map((week, index) => {
            const weekData = this.getWeekData(week.start, week.end)
            const profitClass = weekData.profit >= 0 ? 'text-green-400' : 'text-red-400'
            const profitIcon = weekData.profit >= 0 ? 'trending-up' : 'trending-down'
            
            return `
                <div class="bg-gray-900 border border-gray-700 rounded-xl p-5 hover:border-gray-600 transition-all duration-200">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-2">
                            <div class="p-1.5 ${weekData.completedTrades > 0 ? 'bg-green-500/10' : weekData.initiatedTrades > 0 ? 'bg-blue-500/10' : 'bg-gray-700/50'} rounded-lg">
                                <i data-lucide="${weekData.completedTrades > 0 ? 'check-circle' : weekData.initiatedTrades > 0 ? 'shopping-cart' : 'calendar'}" class="w-3 h-3 ${weekData.completedTrades > 0 ? 'text-green-400' : weekData.initiatedTrades > 0 ? 'text-blue-400' : 'text-gray-400'}"></i>
                            </div>
                            <h4 class="text-white font-semibold text-sm">Week ${index + 1}</h4>
                        </div>
                        <span class="text-gray-500 text-xs">${week.start.getDate()}-${week.end.getDate()}</span>
                    </div>
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <span class="text-gray-400 text-sm">P&L:</span>
                            <div class="flex items-center gap-1">
                                <i data-lucide="${profitIcon}" class="w-3 h-3 ${profitClass}"></i>
                                <span class="${profitClass} text-sm font-semibold">
                                    ${weekData.profit >= 0 ? '+' : ''}$${this.store.formatNumber(Math.abs(weekData.profit))}
                                </span>
                            </div>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-gray-400 text-sm">Completed:</span>
                            <span class="text-white text-sm font-medium">${weekData.completedTrades}</span>
                        </div>
                        ${weekData.completedTrades > 0 ? `
                        <div class="flex items-center justify-between">
                            <span class="text-gray-400 text-sm">Win Rate:</span>
                            <span class="text-${weekData.winRate === 100 ? 'green' : weekData.winRate >= 50 ? 'blue' : 'red'}-400 text-sm font-medium">${weekData.winRate.toFixed(0)}%</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-gray-400 text-sm">Avg Return:</span>
                            <span class="text-gray-300 text-sm">${weekData.avgReturnPercent >= 0 ? '+' : ''}${weekData.avgReturnPercent.toFixed(1)}%</span>
                        </div>
                        ` : weekData.initiatedTrades > 0 ? `
                        <div class="flex items-center justify-between">
                            <span class="text-gray-400 text-sm">Initiated:</span>
                            <span class="text-blue-400 text-sm font-medium">${weekData.initiatedTrades}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-gray-400 text-sm">Status:</span>
                            <span class="text-gray-300 text-sm">Holding</span>
                        </div>
                        ` : `
                        <div class="flex items-center justify-between">
                            <span class="text-gray-400 text-sm">Activity:</span>
                            <span class="text-gray-500 text-sm">No trades</span>
                        </div>
                        `}
                    </div>
                </div>
            `
        }).join('')
    }

    getWeeksInMonth(date) {
        const weeks = []
        const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)
        
        console.log(`📅 Generating weeks for ${monthName}:`, {
            firstDay: firstDay.toLocaleDateString(),
            lastDay: lastDay.toLocaleDateString()
        })
        
        let currentWeekStart = new Date(firstDay)
        
        while (currentWeekStart <= lastDay) {
            const currentWeekEnd = new Date(currentWeekStart)
            currentWeekEnd.setDate(currentWeekStart.getDate() + 6)
            
            if (currentWeekEnd > lastDay) {
                currentWeekEnd.setTime(lastDay.getTime())
            }
            
            const week = {
                start: new Date(currentWeekStart),
                end: new Date(currentWeekEnd)
            }
            
            console.log(`📅 Week ${weeks.length + 1}:`, {
                start: week.start.toLocaleDateString(),
                end: week.end.toLocaleDateString()
            })
            
            weeks.push(week)
            currentWeekStart.setDate(currentWeekStart.getDate() + 7)
        }
        
        return weeks
    }

    getWeekData(startDate, endDate) {
        const trades = this.getTradingData()
        
        // Completed trades (sold) in this week - but only if sell date is within the target month
        if (!this.currentMonth) {
            this.currentMonth = this.getMostRecentTradingMonth()
        }
        const currentMonth = this.currentMonth
        const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
        const currentMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
        
        const weekCompletedTrades = trades.filter(trade => {
            if (!trade.sellDate) return false
            const sellDate = this.parseDateForSorting(trade.sellDate)
            
            // Must be within the week AND within the current month
            const isInWeek = sellDate >= startDate && sellDate <= endDate
            const isInCurrentMonth = sellDate >= currentMonthStart && sellDate <= currentMonthEnd
            const shouldInclude = isInWeek && isInCurrentMonth
            
            // Debug logging for trades in this week
            if (isInWeek) {
                console.log(`📅 Trade found in week ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}:`, {
                    item: trade.itemName,
                    sellDate: trade.sellDate,
                    sellDateParsed: sellDate.toLocaleDateString(),
                    profit: trade.sellPrice - trade.buyPrice,
                    isInCurrentMonth,
                    shouldInclude,
                    currentMonth: currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                })
            }
            
            return shouldInclude
        })
        
        // All trades (bought) in this week for activity tracking
        const weekInitiatedTrades = trades.filter(trade => {
            const buyDate = this.parseDateForSorting(trade.buyDate)
            return buyDate >= startDate && buyDate <= endDate
        })
        
        const profit = weekCompletedTrades.reduce((sum, t) => sum + (t.sellPrice - t.buyPrice), 0)
        const avgProfit = weekCompletedTrades.length > 0 ? profit / weekCompletedTrades.length : 0
        
        // Win rate for completed trades this week
        const winningTrades = weekCompletedTrades.filter(t => t.sellPrice > t.buyPrice)
        const winRate = weekCompletedTrades.length > 0 ? (winningTrades.length / weekCompletedTrades.length * 100) : 0
        
        // Average return percentage
        const avgReturnPercent = weekCompletedTrades.length > 0
            ? weekCompletedTrades.reduce((sum, t) => sum + ((t.sellPrice - t.buyPrice) / t.buyPrice * 100), 0) / weekCompletedTrades.length
            : 0
        
        return {
            completedTrades: weekCompletedTrades.length,
            initiatedTrades: weekInitiatedTrades.length,
            profit,
            avgProfit,
            winRate,
            avgReturnPercent,
            // Legacy support
            trades: weekCompletedTrades.length
        }
    }

    getCurrentHoldings() {
        const trades = this.getTradingData()
        return trades.filter(trade => !trade.sellDate)
    }

    generateCurrentHoldingsHTML() {
        const holdings = this.getCurrentHoldings()
        
        if (holdings.length === 0) {
            return `
                <div class="text-center py-8">
                    <div class="p-4 bg-gray-700/30 rounded-lg mx-auto w-fit mb-4">
                        <i data-lucide="package" class="w-8 h-8 text-gray-500 mx-auto"></i>
                    </div>
                    <p class="text-gray-400 font-medium">No current holdings</p>
                    <p class="text-gray-600 text-sm mt-1">Items you buy will appear here</p>
                </div>
            `
        }

        // Calculate average hold time for completed trades for comparison
        const completedTrades = this.getTradingData().filter(t => t.sellPrice)
        const avgCompletedHoldTime = completedTrades.length > 0
            ? completedTrades.reduce((sum, t) => {
                const buyDate = this.parseDateForSorting(t.buyDate)
                const sellDate = this.parseDateForSorting(t.sellDate)
                if (isNaN(buyDate.getTime()) || isNaN(sellDate.getTime())) {
                    return sum // Skip invalid dates
                }
                return sum + Math.floor((sellDate - buyDate) / (1000 * 60 * 60 * 24))
            }, 0) / completedTrades.length
            : 7 // Default comparison

        return holdings.map(trade => {
            const daysHeld = Math.floor((new Date() - this.parseDateForSorting(trade.buyDate)) / (1000 * 60 * 60 * 24))
            
            // Determine hold status based on specific day ranges
            let holdLabel, holdColor, holdIcon, holdDescription
            if (daysHeld <= 6) {
                holdLabel = 'Recent'
                holdColor = 'text-green-400'
                holdIcon = 'timer'
                holdDescription = 'Actively trading'
            } else if (daysHeld <= 14) {
                holdLabel = 'Short Hold'
                holdColor = 'text-blue-400'
                holdIcon = 'clock'
                holdDescription = 'Might flip soon'
            } else if (daysHeld <= 29) {
                holdLabel = 'Strategic Hold'
                holdColor = 'text-yellow-400'
                holdIcon = 'watch'
                holdDescription = 'In the hold zone'
            } else if (daysHeld <= 59) {
                holdLabel = '1M+'
                holdColor = 'text-orange-400'
                holdIcon = 'calendar'
                holdDescription = 'Likely waiting on price action'
            } else if (daysHeld <= 89) {
                holdLabel = '2M+'
                holdColor = 'text-orange-500'
                holdIcon = 'calendar'
                holdDescription = 'Passive hold, low activity'
            } else if (daysHeld <= 179) {
                holdLabel = '3M+'
                holdColor = 'text-red-400'
                holdIcon = 'calendar-days'
                holdDescription = 'HODL territory'
            } else if (daysHeld <= 364) {
                holdLabel = '6M+'
                holdColor = 'text-red-500'
                holdIcon = 'calendar-days'
                holdDescription = 'HODL territory'
            } else {
                holdLabel = '1Y+'
                holdColor = 'text-red-600'
                holdIcon = 'calendar-x'
                holdDescription = 'HODL territory'
            }
            
            // Calculate percentage of capital tied up in this holding
            const totalCapital = this.getTradingData().reduce((sum, t) => sum + t.buyPrice, 0)
            const capitalPercent = totalCapital > 0 ? (trade.buyPrice / totalCapital * 100) : 0
            
            return `
                <div class="flex items-center justify-between p-4 bg-gray-900 border border-gray-700 rounded-lg hover:border-gray-600 transition-all duration-200">
                    <div class="flex items-center gap-3 flex-1">
                        <div class="p-2 ${holdLabel === '1Y+' || holdLabel === '6M+' || holdLabel === '3M+' ? 'bg-red-500/10' : holdLabel === '2M+' || holdLabel === '1M+' ? 'bg-orange-500/10' : holdLabel === 'Strategic Hold' ? 'bg-yellow-500/10' : holdLabel === 'Short Hold' ? 'bg-blue-500/10' : 'bg-green-500/10'} rounded-lg">
                            <i data-lucide="${holdIcon}" class="w-4 h-4 ${holdColor}"></i>
                        </div>
                        <div class="flex-1">
                            <div class="text-white font-semibold truncate">${trade.itemName}</div>
                            <div class="text-gray-400 text-sm">
                                $${this.store.formatNumber(trade.buyPrice)} • ${daysHeld}d • ${daysHeld > avgCompletedHoldTime ? 'Above avg' : 'Below avg'}
                                ${capitalPercent >= 30 ? `• ${capitalPercent.toFixed(0)}% of portfolio` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="${holdColor} text-sm font-semibold">
                            ${holdLabel}
                        </div>
                        <div class="text-gray-500 text-xs">
                            ${holdDescription}
                        </div>
                    </div>
                </div>
            `
        }).join('')
    }

    generateRecentTradesHTML() {
        const trades = this.getTradingData()
        if (!this.currentMonth) {
            this.currentMonth = this.getMostRecentTradingMonth()
        }
        const currentMonth = this.currentMonth
        const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
        const currentMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
        
        const recentTrades = trades
            .filter(trade => {
                if (!trade.sellDate) return false
                const sellDate = this.parseDateForSorting(trade.sellDate)
                return sellDate >= currentMonthStart && sellDate <= currentMonthEnd
            })
            .sort((a, b) => this.parseDateForSorting(b.sellDate) - this.parseDateForSorting(a.sellDate))
            .slice(0, 5)
        
        if (recentTrades.length === 0) {
            return `
                <div class="text-center py-8">
                    <div class="p-4 bg-gray-700/30 rounded-lg mx-auto w-fit mb-4">
                        <i data-lucide="activity" class="w-8 h-8 text-gray-500 mx-auto"></i>
                    </div>
                    <p class="text-gray-400 font-medium">No completed trades this month</p>
                    <p class="text-gray-600 text-sm mt-1">Completed trades will appear here</p>
                </div>
            `
        }

        return recentTrades.map(trade => {
            const profit = trade.sellPrice - trade.buyPrice
            const profitClass = profit >= 0 ? 'text-green-400' : 'text-red-400'
            const profitSymbol = profit >= 0 ? '+' : ''
            const profitIcon = profit >= 0 ? 'trending-up' : 'trending-down'
            const statusColor = profit >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
            const statusIconColor = profit >= 0 ? 'text-green-400' : 'text-red-400'
            
            // Calculate return percentage and hold time
            const returnPercent = ((trade.sellPrice - trade.buyPrice) / trade.buyPrice * 100)
            const buyDate = this.parseDateForSorting(trade.buyDate)
            const sellDate = this.parseDateForSorting(trade.sellDate)
            const holdDays = !isNaN(buyDate.getTime()) && !isNaN(sellDate.getTime()) 
                ? Math.floor((sellDate - buyDate) / (1000 * 60 * 60 * 24))
                : 0
            
            // Performance rating based on return percentage
            const performanceRating = returnPercent >= 10 ? 'Excellent' : returnPercent >= 5 ? 'Great' : returnPercent >= 1 ? 'Good' : returnPercent >= 0 ? 'Break-even' : 'Loss'
            const ratingClass = returnPercent >= 5 ? 'text-green-400' : returnPercent >= 1 ? 'text-blue-400' : returnPercent >= 0 ? 'text-gray-400' : 'text-red-400'
            
            return `
                <div class="flex items-center justify-between p-4 bg-gray-900 border border-gray-700 rounded-lg hover:border-gray-600 transition-all duration-200">
                    <div class="flex items-center gap-3 flex-1">
                        <div class="p-2 ${statusColor} rounded-lg">
                            <i data-lucide="${profitIcon}" class="w-4 h-4 ${statusIconColor}"></i>
                        </div>
                        <div class="flex-1">
                            <div class="text-white font-semibold truncate">${trade.itemName}</div>
                            <div class="text-gray-400 text-sm">
                                ${this.formatDate(trade.sellDate)} • ${holdDays}d hold
                            </div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="${profitClass} font-semibold">${profitSymbol}$${this.store.formatNumber(Math.abs(profit))}</div>
                        <div class="text-xs">
                            <span class="${ratingClass}">${returnPercent >= 0 ? '+' : ''}${returnPercent.toFixed(1)}%</span>
                            <span class="text-gray-500 ml-1">${performanceRating}</span>
                        </div>
                    </div>
                </div>
            `
        }).join('')
    }

    // Strategic Insights Generation Methods
    generatePatternAnalysisHTML() {
        const trades = this.getTradingData()
        const completedTrades = trades.filter(t => t.sellPrice)
        
        if (completedTrades.length === 0) {
            return `<div class="text-gray-500 text-sm">No completed trades yet</div>`
        }
        
        // Analyze trade size patterns
        const tradeSizes = completedTrades.map(t => t.buyPrice)
        const avgTradeSize = tradeSizes.reduce((sum, size) => sum + size, 0) / tradeSizes.length
        const largeTradeThreshold = avgTradeSize * 1.5
        const largeTradesCount = tradeSizes.filter(size => size >= largeTradeThreshold).length
        
        // Hold time patterns
        const holdTimes = completedTrades.map(t => {
            const buyDate = this.parseDateForSorting(t.buyDate)
            const sellDate = this.parseDateForSorting(t.sellDate)
            if (isNaN(buyDate.getTime()) || isNaN(sellDate.getTime())) {
                return 0 // Default for invalid dates
            }
            return Math.floor((sellDate - buyDate) / (1000 * 60 * 60 * 24))
        })
        const avgHoldTime = holdTimes.reduce((sum, time) => sum + time, 0) / holdTimes.length
        
        return `
            <div class="text-sm space-y-2">
                <div class="flex justify-between">
                    <span class="text-gray-400">Avg Trade Size:</span>
                    <span class="text-white">$${this.store.formatNumber(avgTradeSize)}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-400">Large Trades:</span>
                    <span class="text-blue-400">${largeTradesCount}/${completedTrades.length}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-400">Avg Hold Time:</span>
                    <span class="text-white">${Math.round(avgHoldTime)}d</span>
                </div>
                <div class="pt-3 mt-3 border-t border-gray-700">
                    <div class="text-sm font-medium text-blue-400 bg-blue-500/10 px-3 py-2 rounded-lg flex items-center gap-2">
                        <i data-lucide="lightbulb" class="w-4 h-4"></i>
                        ${largeTradesCount > completedTrades.length / 2 ? 'Focus: High-value trading' : 'Focus: Consistent small gains'}
                    </div>
                </div>
            </div>
        `
    }

    generateMomentumAnalysisHTML() {
        const trades = this.getTradingData()
        const completedTrades = trades.filter(t => t.sellPrice).sort((a, b) => this.parseDateForSorting(a.sellDate) - this.parseDateForSorting(b.sellDate))
        
        if (completedTrades.length < 2) {
            return `<div class="text-gray-500 text-sm">Need more trades for momentum analysis</div>`
        }
        
        // Recent performance vs historical
        const recentTrades = completedTrades.slice(-3) // Last 3 trades
        const historicalTrades = completedTrades.slice(0, -3) || completedTrades.slice(0, completedTrades.length - 1)
        
        const recentAvgReturn = recentTrades.length > 0 
            ? recentTrades.reduce((sum, t) => sum + ((t.sellPrice - t.buyPrice) / t.buyPrice * 100), 0) / recentTrades.length 
            : 0
        const historicalAvgReturn = historicalTrades.length > 0
            ? historicalTrades.reduce((sum, t) => sum + ((t.sellPrice - t.buyPrice) / t.buyPrice * 100), 0) / historicalTrades.length
            : recentAvgReturn
        
        const momentum = recentAvgReturn - historicalAvgReturn
        const momentumDirection = momentum > 1 ? 'Improving' : momentum < -1 ? 'Declining' : 'Stable'
        const momentumColor = momentum > 1 ? 'text-green-400' : momentum < -1 ? 'text-red-400' : 'text-gray-400'
        
        return `
            <div class="text-sm space-y-2">
                <div class="flex justify-between">
                    <span class="text-gray-400">Recent Avg Return:</span>
                    <span class="text-white">${recentAvgReturn >= 0 ? '+' : ''}${recentAvgReturn.toFixed(1)}%</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-400">Historical Avg:</span>
                    <span class="text-gray-300">${historicalAvgReturn >= 0 ? '+' : ''}${historicalAvgReturn.toFixed(1)}%</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-400">Momentum:</span>
                    <span class="${momentumColor}">${momentumDirection}</span>
                </div>
                <div class="pt-3 mt-3 border-t border-gray-700">
                    <div class="text-sm font-medium text-green-400 bg-green-500/10 px-3 py-2 rounded-lg flex items-center gap-2">
                        <i data-lucide="trending-up" class="w-4 h-4"></i>
                        ${momentum > 1 ? 'Your trading is improving!' : momentum < -1 ? 'Consider reviewing strategy' : 'Consistent performance'}
                    </div>
                </div>
            </div>
        `
    }

    generateRiskAnalysisHTML() {
        const trades = this.getTradingData()
        const holdings = trades.filter(t => !t.sellPrice)
        const completedTrades = trades.filter(t => t.sellPrice)
        
        // Portfolio concentration risk
        const totalCapital = trades.reduce((sum, t) => sum + t.buyPrice, 0)
        const largestHolding = holdings.length > 0 ? Math.max(...holdings.map(h => h.buyPrice)) : 0
        const concentrationRisk = totalCapital > 0 ? (largestHolding / totalCapital * 100) : 0
        
        // Hold time risk
        const currentHoldTimes = holdings.map(h => {
            const buyDate = this.parseDateForSorting(h.buyDate)
            if (isNaN(buyDate.getTime())) return 0
            return Math.floor((new Date() - buyDate) / (1000 * 60 * 60 * 24))
        })
        const avgCurrentHoldTime = currentHoldTimes.length > 0 ? currentHoldTimes.reduce((sum, time) => sum + time, 0) / currentHoldTimes.length : 0
        
        const completedAvgHoldTime = completedTrades.length > 0
            ? completedTrades.reduce((sum, t) => {
                const buyDate = this.parseDateForSorting(t.buyDate)
                const sellDate = this.parseDateForSorting(t.sellDate)
                if (isNaN(buyDate.getTime()) || isNaN(sellDate.getTime())) {
                    return sum // Skip invalid dates
                }
                return sum + Math.floor((sellDate - buyDate) / (1000 * 60 * 60 * 24))
            }, 0) / completedTrades.length
            : 0
        
        const holdRisk = avgCurrentHoldTime > completedAvgHoldTime * 1.5 ? 'High' : avgCurrentHoldTime > completedAvgHoldTime ? 'Medium' : 'Low'
        const holdRiskColor = holdRisk === 'High' ? 'text-red-400' : holdRisk === 'Medium' ? 'text-yellow-400' : 'text-green-400'
        
        return `
            <div class="text-sm space-y-2">
                <div class="flex justify-between">
                    <span class="text-gray-400">Concentration:</span>
                    <span class="text-${concentrationRisk > 50 ? 'red' : concentrationRisk > 30 ? 'yellow' : 'green'}-400">${concentrationRisk.toFixed(0)}%</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-400">Hold Risk:</span>
                    <span class="${holdRiskColor}">${holdRisk}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-400">Active Holdings:</span>
                    <span class="text-white">${holdings.length}</span>
                </div>
                <div class="pt-3 mt-3 border-t border-gray-700">
                    <div class="text-sm font-medium text-yellow-400 bg-yellow-500/10 px-3 py-2 rounded-lg flex items-center gap-2">
                        <i data-lucide="shield-check" class="w-4 h-4"></i>
                        ${concentrationRisk > 50 ? 'Consider diversifying' : holdings.length > 3 ? 'Monitor hold times' : 'Good risk management'}
                    </div>
                </div>
            </div>
        `
    }

    getFilteredTradesForAnalytics() {
        const allTrades = this.getTradingData()
        const timePeriod = this.analyticsTimePeriod || 'all'
        
        if (timePeriod === 'all') {
            return allTrades
        }
        
        const now = new Date()
        let cutoffDate
        
        // Handle day-based periods (7, 30, 90, 180, 365)
        if (!isNaN(parseInt(timePeriod))) {
            const days = parseInt(timePeriod)
            cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000))
        } else {
            // Handle text-based periods
            switch (timePeriod) {
                case 'current':
                    cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1)
                    break
                case 'last3':
                    cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, 1)
                    break
                case 'last6':
                    cutoffDate = new Date(now.getFullYear(), now.getMonth() - 6, 1)
                    break
                default:
                    return allTrades
            }
        }
        
        return allTrades.filter(trade => {
            const tradeDate = this.parseDateForSorting(trade.sellDate || trade.buyDate)
            return tradeDate >= cutoffDate
        })
    }

    getAnalyticsMetrics() {
        const trades = this.getFilteredTradesForAnalytics()
        const completedTrades = trades.filter(t => t.sellPrice)
        
        console.log('📊 Analytics Debug:', {
            timePeriod: this.analyticsTimePeriod || 'current',
            totalTrades: trades.length,
            completedTrades: completedTrades.length,
            trades: trades
        })
        
        const totalProfit = completedTrades.reduce((sum, t) => sum + (t.sellPrice - t.buyPrice), 0)
        const profitableTrades = completedTrades.filter(t => t.sellPrice > t.buyPrice)
        const successRate = completedTrades.length > 0 ? ((profitableTrades.length / completedTrades.length) * 100).toFixed(1) : '0.0'
        
        // Calculate average hold time
        const totalHoldTime = completedTrades.reduce((sum, t) => {
            if (t.sellDate && t.buyDate) {
                const buyDate = this.parseDateForSorting(t.buyDate)
                const sellDate = this.parseDateForSorting(t.sellDate)
                if (!isNaN(buyDate.getTime()) && !isNaN(sellDate.getTime())) {
                    const days = Math.floor((sellDate - buyDate) / (1000 * 60 * 60 * 24))
                    return sum + days
                }
            }
            return sum
        }, 0)
        
        const avgHoldTime = completedTrades.length > 0 ? Math.round(totalHoldTime / completedTrades.length) : 0
        
        // Enhanced metrics
        const totalCapitalInvested = completedTrades.reduce((sum, t) => sum + t.buyPrice, 0)
        const roiPercent = totalCapitalInvested > 0 ? ((totalProfit / totalCapitalInvested) * 100) : 0
        
        return {
            completedTrades: completedTrades.length,
            profitableTrades: profitableTrades.length,
            totalProfit,
            successRate: parseFloat(successRate),
            avgHoldTime,
            roiPercent: roiPercent.toFixed(2),
            totalCapitalInvested
        }
    }

    // Advanced Analytics Methods
    getAdvancedAnalytics() {
        const trades = this.getFilteredTradesForAnalytics()
        const completedTrades = trades.filter(t => t.sellPrice && t.sellDate && t.buyDate)
        
        if (completedTrades.length === 0) {
            return {
                sharpeRatio: 0,
                maxDrawdown: 0,
                winStreak: 0,
                lossStreak: 0,
                profitFactor: 0,
                avgDaysToProfit: 0,
                volatility: 0
            }
        }

        // Sort trades by sell date for chronological analysis
        const sortedTrades = [...completedTrades].sort((a, b) => this.parseDateForSorting(a.sellDate) - this.parseDateForSorting(b.sellDate))
        
        // Calculate daily returns
        const dailyReturns = sortedTrades.map(trade => {
            const roi = (trade.sellPrice - trade.buyPrice) / trade.buyPrice
            return roi * 100 // Convert to percentage
        })
        
        // Sharpe Ratio calculation (simplified)
        const avgReturn = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length
        const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length
        const volatility = Math.sqrt(variance)
        const sharpeRatio = volatility > 0 ? (avgReturn / volatility) : 0

        // Maximum Drawdown
        let peak = 0
        let maxDrawdown = 0
        let runningTotal = 0
        
        sortedTrades.forEach(trade => {
            runningTotal += (trade.sellPrice - trade.buyPrice)
            if (runningTotal > peak) {
                peak = runningTotal
            }
            const drawdown = ((peak - runningTotal) / Math.max(peak, 1)) * 100
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown
            }
        })

        // Win/Loss Streaks
        let currentWinStreak = 0
        let currentLossStreak = 0
        let maxWinStreak = 0
        let maxLossStreak = 0
        
        sortedTrades.forEach(trade => {
            const isWin = trade.sellPrice > trade.buyPrice
            if (isWin) {
                currentWinStreak++
                currentLossStreak = 0
                maxWinStreak = Math.max(maxWinStreak, currentWinStreak)
            } else {
                currentLossStreak++
                currentWinStreak = 0
                maxLossStreak = Math.max(maxLossStreak, currentLossStreak)
            }
        })

        // Profit Factor
        const grossProfit = sortedTrades.filter(t => t.sellPrice > t.buyPrice).reduce((sum, t) => sum + (t.sellPrice - t.buyPrice), 0)
        const grossLoss = Math.abs(sortedTrades.filter(t => t.sellPrice <= t.buyPrice).reduce((sum, t) => sum + (t.sellPrice - t.buyPrice), 0))
        const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0

        // Average Days to Profit (for profitable trades only)
        const profitableTrades = sortedTrades.filter(t => t.sellPrice > t.buyPrice)
        const avgDaysToProfit = profitableTrades.length > 0 
            ? profitableTrades.reduce((sum, t) => {
                const buyDate = this.parseDateForSorting(t.buyDate)
                const sellDate = this.parseDateForSorting(t.sellDate)
                if (!isNaN(buyDate.getTime()) && !isNaN(sellDate.getTime())) {
                    const days = Math.floor((sellDate - buyDate) / (1000 * 60 * 60 * 24))
                    return sum + days
                }
                return sum
            }, 0) / profitableTrades.length 
            : 0

        return {
            sharpeRatio: sharpeRatio.toFixed(2),
            maxDrawdown: maxDrawdown.toFixed(2),
            winStreak: maxWinStreak,
            lossStreak: maxLossStreak,
            profitFactor: profitFactor.toFixed(2),
            avgDaysToProfit: Math.round(avgDaysToProfit),
            volatility: volatility.toFixed(2),
            grossProfit,
            grossLoss
        }
    }

    // Time-based Performance Analysis
    getTimeBasedPerformance() {
        const trades = this.getFilteredTradesForAnalytics()
        const completedTrades = trades.filter(t => t.sellPrice && t.sellDate)
        
        if (completedTrades.length === 0) {
            return {
                daily: [],
                weekly: [],
                monthly: []
            }
        }

        // Group trades by time periods
        const daily = this.groupTradesByPeriod(completedTrades, 'day')
        const weekly = this.groupTradesByPeriod(completedTrades, 'week') 
        const monthly = this.groupTradesByPeriod(completedTrades, 'month')

        return { daily, weekly, monthly }
    }

    groupTradesByPeriod(trades, period) {
        const groups = {}
        
        trades.forEach(trade => {
            if (!trade.sellDate) return // Skip trades without sell date
            const sellDate = this.parseDateForSorting(trade.sellDate)
            if (isNaN(sellDate.getTime())) return // Skip invalid dates
            let key
            
            switch(period) {
                case 'day':
                    key = sellDate.toISOString().split('T')[0] // YYYY-MM-DD
                    break
                case 'week':
                    const weekStart = new Date(sellDate)
                    weekStart.setDate(sellDate.getDate() - sellDate.getDay())
                    key = weekStart.toISOString().split('T')[0]
                    break
                case 'month':
                    key = `${sellDate.getFullYear()}-${(sellDate.getMonth() + 1).toString().padStart(2, '0')}`
                    break
            }
            
            if (!groups[key]) {
                groups[key] = {
                    date: key,
                    trades: [],
                    profit: 0,
                    volume: 0,
                    count: 0
                }
            }
            
            const profit = trade.sellPrice - trade.buyPrice
            groups[key].trades.push(trade)
            groups[key].profit += profit
            groups[key].volume += trade.buyPrice
            groups[key].count += 1
        })
        
        return Object.values(groups).sort((a, b) => new Date(a.date) - new Date(b.date))
    }

    // Market Intelligence
    getMarketIntelligence() {
        const trades = this.getFilteredTradesForAnalytics()
        const completedTrades = trades.filter(t => t.sellPrice)
        
        if (completedTrades.length === 0) {
            return {
                categoryPerformance: [],
                conditionAnalysis: [],
                seasonalPatterns: [],
                priceRangeAnalysis: []
            }
        }

        // Enhanced category analysis
        const categories = this.analyzeCategoryPerformance(completedTrades)
        const conditions = this.analyzeConditionPerformance(completedTrades)
        const seasonal = this.analyzeSeasonalPatterns(completedTrades)
        const priceRanges = this.analyzePriceRanges(completedTrades)

        return {
            categoryPerformance: categories,
            conditionAnalysis: conditions,
            seasonalPatterns: seasonal,
            priceRangeAnalysis: priceRanges
        }
    }

    analyzeCategoryPerformance(trades) {
        const categories = {}
        
        trades.forEach(trade => {
            const category = this.detectItemCategory(trade.itemName || trade.item)
            
            if (!categories[category]) {
                categories[category] = {
                    name: category,
                    trades: 0,
                    totalProfit: 0,
                    totalVolume: 0,
                    winRate: 0,
                    avgHoldTime: 0
                }
            }
            
            const profit = trade.sellPrice - trade.buyPrice
            categories[category].trades += 1
            categories[category].totalProfit += profit
            categories[category].totalVolume += trade.buyPrice
            
            if (trade.sellDate && trade.buyDate) {
                const buyDate = this.parseDateForSorting(trade.buyDate)
                const sellDate = this.parseDateForSorting(trade.sellDate)
                if (!isNaN(buyDate.getTime()) && !isNaN(sellDate.getTime())) {
                    const holdDays = Math.floor((sellDate - buyDate) / (1000 * 60 * 60 * 24))
                    categories[category].avgHoldTime += holdDays
                }
            }
        })
        
        // Calculate averages and win rates
        Object.values(categories).forEach(cat => {
            const categoryTrades = trades.filter(t => this.detectItemCategory(t.itemName || t.item) === cat.name)
            const profitableTrades = categoryTrades.filter(t => t.sellPrice > t.buyPrice)
            cat.winRate = ((profitableTrades.length / categoryTrades.length) * 100).toFixed(1)
            cat.avgHoldTime = Math.round(cat.avgHoldTime / cat.trades)
            cat.roi = ((cat.totalProfit / cat.totalVolume) * 100).toFixed(2)
        })
        
        return Object.values(categories).sort((a, b) => b.totalProfit - a.totalProfit)
    }


    analyzeConditionPerformance(trades) {
        const conditions = {}
        
        trades.forEach(trade => {
            const condition = this.extractCondition(trade.itemName)
            
            if (!conditions[condition]) {
                conditions[condition] = {
                    name: condition,
                    trades: 0,
                    totalProfit: 0,
                    avgProfit: 0,
                    winRate: 0
                }
            }
            
            const profit = trade.sellPrice - trade.buyPrice
            conditions[condition].trades += 1
            conditions[condition].totalProfit += profit
        })
        
        // Calculate averages and win rates
        Object.values(conditions).forEach(cond => {
            const conditionTrades = trades.filter(t => this.extractCondition(t.itemName) === cond.name)
            const profitableTrades = conditionTrades.filter(t => t.sellPrice > t.buyPrice)
            cond.winRate = ((profitableTrades.length / conditionTrades.length) * 100).toFixed(1)
            cond.avgProfit = (cond.totalProfit / cond.trades).toFixed(2)
        })
        
        return Object.values(conditions).sort((a, b) => b.totalProfit - a.totalProfit)
    }

    extractCondition(itemName) {
        const name = itemName.toLowerCase()
        
        if (name.includes('factory new')) return 'Factory New'
        if (name.includes('minimal wear')) return 'Minimal Wear'
        if (name.includes('field-tested')) return 'Field-Tested'
        if (name.includes('well-worn')) return 'Well-Worn'
        if (name.includes('battle-scarred')) return 'Battle-Scarred'
        
        return 'Unknown Condition'
    }

    detectItemCategory(itemName) {
        if (!itemName) return 'Other'
        
        const name = itemName.toLowerCase()
        
        // Knives - Most comprehensive knife detection
        if (name.includes('knife') || name.includes('bayonet') || name.includes('karambit') || 
            name.includes('butterfly') || name.includes('flip') || name.includes('gut') ||
            name.includes('huntsman') || name.includes('falchion') || name.includes('bowie') ||
            name.includes('shadow daggers') || name.includes('daggers') || name.includes('stiletto') ||
            name.includes('ursus') || name.includes('navaja') || name.includes('talon') ||
            name.includes('skeleton') || name.includes('survival') || name.includes('paracord') ||
            name.includes('classic') || name.includes('nomad')) {
            return 'Knives'
        }
        
        // Guns (broader category covering all weapons)
        if (name.includes('ak-47') || name.includes('ak47') || name.includes('m4a4') || name.includes('m4a1-s') || 
            name.includes('m4a1') || name.includes('awp') || name.includes('rifle') || name.includes('scar-20') ||
            name.includes('g3sg1') || name.includes('sg') || name.includes('aug') ||
            name.includes('famas') || name.includes('galil') || name.includes('glock') || 
            name.includes('usp') || name.includes('p250') || name.includes('tec-9') || 
            name.includes('five-seven') || name.includes('cz75') || name.includes('p2000') || 
            name.includes('dual berettas') || name.includes('desert eagle') || name.includes('deagle') || name.includes('r8') ||
            name.includes('p90') || name.includes('mp7') || name.includes('mp9') || 
            name.includes('mac-10') || name.includes('ump-45') || name.includes('pp-bizon') ||
            name.includes('mp5') || name.includes('nova') || name.includes('xm1014') || 
            name.includes('sawed-off') || name.includes('mag-7') || name.includes('knight') ||
            name.includes('asiimov') || name.includes('redline') || name.includes('howl') ||
            name.includes('lightning strike') || name.includes('cyrex') || name.includes('vulcan')) {
            return 'Guns'
        }
        
        // Gloves
        if (name.includes('gloves') || name.includes('wraps')) {
            return 'Gloves'
        }
        
        // Cases
        if (name.includes('case') && !name.includes('knife')) {
            return 'Cases'
        }
        
        // Stickers
        if (name.includes('sticker')) {
            return 'Stickers'
        }
        
        // Agents
        if (name.includes('agent') || name.includes('specialist') || name.includes('operator')) {
            return 'Agents'
        }
        
        // Charms
        if (name.includes('charm')) {
            return 'Charms'
        }
        
        // Patches
        if (name.includes('patch')) {
            return 'Patches'
        }
        
        // Pins
        if (name.includes('pin')) {
            return 'Pins'
        }
        
        // Graffiti
        if (name.includes('graffiti')) {
            return 'Graffiti'
        }
        
        // Keys
        if (name.includes('key')) {
            return 'Keys'
        }
        
        // Music Kits
        if (name.includes('music kit')) {
            return 'Music Kits'
        }
        
        return 'Other'
    }

    // Calculate trend indicators by comparing current vs previous period
    getTrendIndicators() {
        const currentPeriod = this.analyticsTimePeriod || 'all'
        const allTrades = this.getTradingData()
        
        // Get current metrics
        const currentMetrics = this.getAnalyticsMetrics()
        
        // Calculate previous period for comparison
        let previousTrades = []
        const now = new Date()
        
        if (currentPeriod === '7d') {
            // Compare with 7 days before that
            const startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
            const endDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            previousTrades = this.getTradesInDateRange(allTrades, startDate, endDate)
        } else if (currentPeriod === '30d') {
            // Compare with 30 days before that
            const startDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
            const endDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            previousTrades = this.getTradesInDateRange(allTrades, startDate, endDate)
        } else if (currentPeriod === '90d') {
            // Compare with 90 days before that
            const startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
            const endDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
            previousTrades = this.getTradesInDateRange(allTrades, startDate, endDate)
        } else {
            // For other periods, use a simple split approach
            const midPoint = Math.floor(allTrades.length / 2)
            previousTrades = allTrades.slice(0, midPoint)
        }
        
        // Calculate previous period metrics
        const prevCompleted = previousTrades.filter(t => t.sellPrice)
        const prevProfit = prevCompleted.reduce((sum, t) => sum + (t.sellPrice - t.buyPrice), 0)
        const prevProfitable = prevCompleted.filter(t => t.sellPrice > t.buyPrice)
        const prevSuccessRate = prevCompleted.length > 0 ? (prevProfitable.length / prevCompleted.length) * 100 : 0
        
        // Calculate trends
        const profitTrend = this.calculateTrend(currentMetrics.totalProfit, prevProfit)
        const successRateTrend = this.calculateTrend(parseFloat(currentMetrics.successRate), prevSuccessRate)
        
        return {
            totalProfitTrend: profitTrend,
            successRateTrend: successRateTrend
        }
    }

    getTradesInDateRange(trades, startDate, endDate) {
        return trades.filter(trade => {
            if (!trade.sellDate) return false
            const tradeDate = this.parseDateForSorting(trade.sellDate)
            return tradeDate >= startDate && tradeDate <= endDate
        })
    }

    calculateTrend(current, previous) {
        if (previous === 0 && current === 0) return { direction: 'stable', percentage: 0 }
        if (previous === 0) return { direction: 'up', percentage: 100 }
        
        const change = ((current - previous) / Math.abs(previous)) * 100
        
        if (Math.abs(change) < 5) return { direction: 'stable', percentage: change }
        return {
            direction: change > 0 ? 'up' : 'down',
            percentage: Math.abs(change)
        }
    }

    renderTrendIndicator(trend) {
        if (!trend || trend.direction === 'stable') {
            return '<i class="text-gray-400 text-xs">—</i>'
        }
        
        const color = trend.direction === 'up' ? 'text-green-400' : 'text-red-400'
        const icon = trend.direction === 'up' ? 'trending-up' : 'trending-down'
        const percentage = trend.percentage > 999 ? '999+' : Math.round(trend.percentage)
        
        return `<div class="flex items-center gap-1 ${color} text-xs">
            <i data-lucide="${icon}" class="w-3 h-3"></i>
            <span>${percentage}%</span>
        </div>`
    }

    analyzeSeasonalPatterns(trades) {
        const months = {}
        
        trades.forEach(trade => {
            if (!trade.sellDate) return
            
            const sellDate = this.parseDateForSorting(trade.sellDate)
            if (isNaN(sellDate.getTime())) return // Skip invalid dates
            const monthKey = sellDate.toLocaleString('default', { month: 'long' })
            
            if (!months[monthKey]) {
                months[monthKey] = {
                    month: monthKey,
                    trades: 0,
                    totalProfit: 0,
                    avgProfit: 0
                }
            }
            
            const profit = trade.sellPrice - trade.buyPrice
            months[monthKey].trades += 1
            months[monthKey].totalProfit += profit
        })
        
        // Calculate averages
        Object.values(months).forEach(month => {
            month.avgProfit = (month.totalProfit / month.trades).toFixed(2)
        })
        
        return Object.values(months).sort((a, b) => b.totalProfit - a.totalProfit)
    }

    analyzePriceRanges(trades) {
        const ranges = {
            'Under $50': { min: 0, max: 50, trades: 0, totalProfit: 0, winRate: 0 },
            '$50-$200': { min: 50, max: 200, trades: 0, totalProfit: 0, winRate: 0 },
            '$200-$500': { min: 200, max: 500, trades: 0, totalProfit: 0, winRate: 0 },
            '$500-$1000': { min: 500, max: 1000, trades: 0, totalProfit: 0, winRate: 0 },
            'Over $1000': { min: 1000, max: Infinity, trades: 0, totalProfit: 0, winRate: 0 }
        }
        
        trades.forEach(trade => {
            const buyPrice = trade.buyPrice
            const profit = trade.sellPrice - trade.buyPrice
            
            Object.entries(ranges).forEach(([rangeName, range]) => {
                if (buyPrice >= range.min && buyPrice < range.max) {
                    range.trades += 1
                    range.totalProfit += profit
                }
            })
        })
        
        // Calculate win rates
        Object.entries(ranges).forEach(([rangeName, range]) => {
            if (range.trades > 0) {
                const rangeTrades = trades.filter(t => t.buyPrice >= range.min && t.buyPrice < range.max)
                const profitableTrades = rangeTrades.filter(t => t.sellPrice > t.buyPrice)
                range.winRate = ((profitableTrades.length / rangeTrades.length) * 100).toFixed(1)
                range.avgProfit = (range.totalProfit / range.trades).toFixed(2)
            }
        })
        
        return Object.entries(ranges).map(([name, data]) => ({
            range: name,
            ...data
        })).filter(r => r.trades > 0)
    }

    // HTML Generation Methods for Enhanced Analytics
    generateMonthlyStatsHTML() {
        const timeBasedData = this.getTimeBasedPerformance()
        const monthlyData = timeBasedData.monthly
        
        if (monthlyData.length === 0) {
            return '<div class="text-gray-500 text-center py-4">No monthly data available</div>'
        }
        
        return monthlyData.slice(-6).reverse().map(month => {
            const profitClass = month.profit >= 0 ? 'text-green-400' : 'text-red-400'
            const monthName = new Date(month.date + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
            
            return `
                <div class="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div>
                        <div class="text-white font-medium">${monthName}</div>
                        <div class="text-gray-400 text-xs">${month.count} trades</div>
                    </div>
                    <div class="text-right">
                        <div class="font-bold ${profitClass}">
                            ${month.profit >= 0 ? '+' : ''}$${this.store.formatNumber(Math.abs(month.profit))}
                        </div>
                        <div class="text-gray-400 text-xs">$${this.store.formatNumber(month.volume)} vol</div>
                    </div>
                </div>
            `
        }).join('')
    }

    generateCategoryPerformanceHTML() {
        const marketData = this.getMarketIntelligence()
        const categories = marketData.categoryPerformance
        
        if (categories.length === 0) {
            return '<div class="text-gray-500 text-center py-4">No category data available</div>'
        }
        
        return categories.slice(0, 6).map(category => {
            const profitClass = category.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'
            const roiClass = parseFloat(category.roi) >= 0 ? 'text-green-400' : 'text-red-400'
            
            return `
                <div class="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div class="flex-1">
                        <div class="text-white font-medium">${category.name}</div>
                        <div class="text-gray-400 text-xs">${category.trades} trades • ${category.winRate}% win</div>
                    </div>
                    <div class="text-right">
                        <div class="font-bold ${profitClass}">
                            ${category.totalProfit >= 0 ? '+' : ''}$${this.store.formatNumber(Math.abs(category.totalProfit))}
                        </div>
                        <div class="text-xs ${roiClass}">${category.roi}% ROI</div>
                    </div>
                </div>
            `
        }).join('')
    }

    generateConditionAnalysisHTML() {
        const marketData = this.getMarketIntelligence()
        const conditions = marketData.conditionAnalysis
        
        if (conditions.length === 0) {
            return '<div class="text-gray-500 text-center py-4">No condition data available</div>'
        }
        
        return conditions.map(condition => {
            const profitClass = condition.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'
            const avgProfitClass = parseFloat(condition.avgProfit) >= 0 ? 'text-green-400' : 'text-red-400'
            
            return `
                <div class="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div class="flex-1">
                        <div class="text-white font-medium">${condition.name}</div>
                        <div class="text-gray-400 text-xs">${condition.trades} trades • ${condition.winRate}% win</div>
                    </div>
                    <div class="text-right">
                        <div class="font-bold ${profitClass}">
                            ${condition.totalProfit >= 0 ? '+' : ''}$${this.store.formatNumber(Math.abs(condition.totalProfit))}
                        </div>
                        <div class="text-xs ${avgProfitClass}">$${condition.avgProfit} avg</div>
                    </div>
                </div>
            `
        }).join('')
    }

    generatePriceRangeHTML() {
        const marketData = this.getMarketIntelligence()
        const priceRanges = marketData.priceRangeAnalysis
        
        if (priceRanges.length === 0) {
            return '<div class="text-gray-500 text-center py-4">No price range data available</div>'
        }
        
        return priceRanges.map(range => {
            const profitClass = range.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'
            const winRateClass = parseFloat(range.winRate) >= 60 ? 'text-green-400' : parseFloat(range.winRate) >= 40 ? 'text-yellow-400' : 'text-red-400'
            
            return `
                <div class="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div class="flex-1">
                        <div class="text-white font-medium">${range.range}</div>
                        <div class="text-gray-400 text-xs">${range.trades} trades</div>
                    </div>
                    <div class="text-right">
                        <div class="font-bold ${profitClass}">
                            ${range.totalProfit >= 0 ? '+' : ''}$${this.store.formatNumber(Math.abs(range.totalProfit))}
                        </div>
                        <div class="text-xs ${winRateClass}">${range.winRate}% win</div>
                    </div>
                </div>
            `
        }).join('')
    }

    // ApexCharts Management Methods
    destroyAllCharts() {
        // Destroy existing chart instances to prevent overlapping
        if (this.chartInstances) {
            Object.values(this.chartInstances).forEach(chart => {
                if (chart && typeof chart.destroy === 'function') {
                    try {
                        chart.destroy()
                    } catch (error) {
                        console.warn('Error destroying chart:', error)
                    }
                }
            })
        }
        this.chartInstances = {}
        
        // Clear chart containers and reset their styling
        const chartContainers = [
            '#cumulative-pnl-chart',
            '#daily-pnl-chart', 
            '#weekly-heatmap-chart',
            '#profit-distribution-chart',
            '#top-bottom-performers-chart',
            '#trade-frequency-chart',
            '#win-rate-timeline-chart',
            '#hold-time-analysis-chart',
            '#category-performance-pie-chart',
            '#condition-roi-chart',
            '#price-range-heatmap-chart'
        ]
        
        chartContainers.forEach(selector => {
            const container = document.querySelector(selector)
            if (container) {
                container.innerHTML = ''
                // Reset any inline styles that might cause issues
                container.style.cssText = ''
                // Force visibility reset
                container.style.visibility = 'visible'
                container.style.opacity = '1'
            }
        })
    }

    initializeAnalyticsCharts() {
        // First destroy any existing charts
        this.destroyAllCharts()
        
        // Initialize chart instances object
        if (!this.chartInstances) {
            this.chartInstances = {}
        }
        
        setTimeout(() => {
            // Only initialize if we're still on the analytics tab
            if (this.currentTab === 'analytics') {
                this.initializeCumulativePnLChart()
                this.initializeDailyPnLChart()
                this.initializeWeeklyHeatmapChart()
                
                // Initialize new enhanced charts
                this.initializeProfitDistributionChart()
                this.initializeTopBottomPerformersChart()
                this.initializeTradeFrequencyChart()
                this.initializeWinRateTimelineChart()
                this.initializeHoldTimeAnalysisChart()
                this.initializeCategoryPerformancePieChart()
                this.initializeConditionROIChart()
                this.initializePriceRangeHeatmapChart()
            }
        }, 500)
    }

    initializeCumulativePnLChart() {
        const timeBasedData = this.getTimeBasedPerformance()
        const dailyData = timeBasedData.daily
        
        if (dailyData.length === 0) return
        
        // Calculate cumulative P&L
        let cumulative = 0
        const cumulativeData = dailyData.map(day => {
            cumulative += day.profit
            return {
                x: new Date(day.date),
                y: cumulative
            }
        })
        
        const options = {
            series: [{
                name: 'Cumulative P&L',
                data: cumulativeData
            }],
            chart: {
                type: 'area',
                height: 300,
                background: 'transparent',
                toolbar: { 
                    show: true,
                    tools: {
                        download: false,
                        selection: true,
                        zoom: true,
                        zoomin: true,
                        zoomout: true,
                        pan: true,
                        reset: true
                    }
                },
                animations: { enabled: true }
            },
            theme: { mode: 'dark' },
            colors: ['#3B82F6'],
            fill: {
                type: 'gradient',
                gradient: {
                    shade: 'dark',
                    gradientToColors: ['#1E40AF'],
                    shadeIntensity: 1,
                    type: 'vertical',
                    opacityFrom: 0.8,
                    opacityTo: 0.1,
                }
            },
            stroke: {
                curve: 'smooth',
                width: 2
            },
            grid: {
                borderColor: '#374151',
                strokeDashArray: 3
            },
            xaxis: {
                type: 'datetime',
                labels: { style: { colors: '#9CA3AF' } },
                axisBorder: { color: '#374151' },
                axisTicks: { color: '#374151' }
            },
            yaxis: {
                labels: { 
                    style: { colors: '#9CA3AF' },
                    formatter: (val) => '$' + this.store.formatNumber(val)
                },
                axisBorder: { color: '#374151' }
            },
            tooltip: {
                theme: 'dark',
                y: {
                    formatter: (val) => '$' + this.store.formatNumber(val)
                }
            }
        }
        
        const chartElement = document.querySelector("#cumulative-pnl-chart")
        if (chartElement && this.currentTab === 'analytics') {
            // Ensure clean container
            chartElement.innerHTML = ''
            chartElement.style.position = 'relative'
            chartElement.style.zIndex = '10'
            
            const chart = new ApexCharts(chartElement, options)
            chart.render()
            this.chartInstances.cumulativePnL = chart
        }
    }

    initializeDailyPnLChart() {
        const timeBasedData = this.getTimeBasedPerformance()
        const dailyData = timeBasedData.daily.slice(-90) // Last 90 days
        
        if (dailyData.length === 0) return
        
        const chartData = dailyData.map(day => ({
            x: new Date(day.date),
            y: day.profit
        }))
        
        const options = {
            series: [{
                name: 'Daily P&L',
                data: chartData
            }],
            chart: {
                type: 'bar',
                height: 300,
                background: 'transparent',
                toolbar: { 
                    show: true,
                    tools: {
                        download: false,
                        selection: true,
                        zoom: true,
                        zoomin: true,
                        zoomout: true,
                        pan: true,
                        reset: true
                    }
                }
            },
            theme: { mode: 'dark' },
            colors: ['#10B981'],
            plotOptions: {
                bar: {
                    distributed: true,
                    colors: {
                        ranges: [{
                            from: -1000000,
                            to: 0,
                            color: '#EF4444'
                        }, {
                            from: 0,
                            to: 1000000,
                            color: '#10B981'
                        }]
                    }
                }
            },
            grid: {
                borderColor: '#374151',
                strokeDashArray: 3
            },
            xaxis: {
                type: 'datetime',
                labels: { style: { colors: '#9CA3AF' } },
                axisBorder: { color: '#374151' }
            },
            yaxis: {
                labels: { 
                    style: { colors: '#9CA3AF' },
                    formatter: (val) => '$' + this.store.formatNumber(val)
                }
            },
            tooltip: {
                theme: 'dark',
                y: {
                    formatter: (val) => '$' + this.store.formatNumber(val)
                }
            },
            legend: { show: false }
        }
        
        const chartElement = document.querySelector("#daily-pnl-chart")
        if (chartElement && this.currentTab === 'analytics') {
            // Ensure clean container
            chartElement.innerHTML = ''
            chartElement.style.position = 'relative'
            chartElement.style.zIndex = '10'
            
            const chart = new ApexCharts(chartElement, options)
            chart.render()
            this.chartInstances.dailyPnL = chart
        }
    }

    initializeWeeklyHeatmapChart() {
        const trades = this.getFilteredTradesForAnalytics()
        const completedTrades = trades.filter(t => t.sellPrice && t.sellDate)
        
        if (completedTrades.length === 0) return
        
        // Create monthly calendar heatmap data
        const calendarData = this.generateCalendarHeatmapData(completedTrades)
        
        if (calendarData.length === 0) return
        
        const options = {
            series: calendarData.series,
            chart: {
                height: 300,
                type: 'heatmap',
                background: 'transparent',
                toolbar: { 
                    show: true,
                    tools: {
                        download: false,
                        selection: true,
                        zoom: true,
                        zoomin: true,
                        zoomout: true,
                        pan: true,
                        reset: true
                    }
                }
            },
            theme: { mode: 'dark' },
            plotOptions: {
                heatmap: {
                    shadeIntensity: 0.5,
                    colorScale: {
                        ranges: [
                            { from: -1000, to: -200, color: '#DC2626', name: 'Major Loss' },
                            { from: -199, to: -50, color: '#EF4444', name: 'Moderate Loss' },
                            { from: -49, to: -1, color: '#FCA5A5', name: 'Small Loss' },
                            { from: 0, to: 0, color: '#6B7280', name: 'Break Even' },
                            { from: 1, to: 49, color: '#86EFAC', name: 'Small Profit' },
                            { from: 50, to: 199, color: '#22C55E', name: 'Good Profit' },
                            { from: 200, to: 1000, color: '#16A34A', name: 'Major Profit' }
                        ]
                    }
                }
            },
            dataLabels: {
                enabled: false
            },
            grid: {
                borderColor: '#374151',
                padding: {
                    top: 0,
                    right: 10,
                    bottom: 0,
                    left: 10
                }
            },
            xaxis: {
                type: 'category',
                labels: { 
                    style: { colors: '#9CA3AF', fontSize: '12px' }
                }
            },
            yaxis: {
                labels: { 
                    style: { colors: '#9CA3AF', fontSize: '12px' }
                }
            },
            tooltip: {
                theme: 'dark',
                custom: ({ seriesIndex, dataPointIndex, w }) => {
                    const data = w.globals.initialSeries[seriesIndex].data[dataPointIndex]
                    const profit = data.y || 0
                    const date = data.date || 'Unknown'
                    const trades = data.trades || 0
                    const items = data.items || []
                    
                    let itemsList = ''
                    if (items.length > 0) {
                        itemsList = items.slice(0, 3).map(item => 
                            `<div class="text-xs text-gray-300">• ${item}</div>`
                        ).join('')
                        if (items.length > 3) {
                            itemsList += `<div class="text-xs text-gray-400">+${items.length - 3} more...</div>`
                        }
                    }
                    
                    const profitColor = profit >= 0 ? '#22C55E' : '#EF4444'
                    const profitText = profit >= 0 ? `+$${Math.abs(profit).toFixed(2)}` : `-$${Math.abs(profit).toFixed(2)}`
                    
                    return `
                        <div class="bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-600 min-w-48">
                            <div class="font-semibold text-white mb-1">${date}</div>
                            <div class="text-sm text-gray-300 mb-2">${trades} trade${trades !== 1 ? 's' : ''}</div>
                            <div class="font-bold text-lg mb-2" style="color: ${profitColor}">${profitText}</div>
                            ${itemsList}
                        </div>
                    `
                }
            }
        }
        
        const chartElement = document.querySelector("#weekly-heatmap-chart")
        if (chartElement && this.currentTab === 'analytics') {
            // Ensure clean container
            chartElement.innerHTML = ''
            chartElement.style.position = 'relative'
            chartElement.style.zIndex = '10'
            
            const chart = new ApexCharts(chartElement, options)
            chart.render()
            this.chartInstances.weeklyHeatmap = chart
        }
    }

    generateCalendarHeatmapData(trades) {
        // Group trades by date and calculate daily P&L
        const dailyData = {}
        
        trades.forEach(trade => {
            if (!trade.sellDate) return
            
            const sellDate = this.parseDateForSorting(trade.sellDate)
            if (isNaN(sellDate.getTime())) return
            
            const dateKey = sellDate.toISOString().split('T')[0] // YYYY-MM-DD format
            const profit = (trade.sellPrice || 0) - (trade.buyPrice || 0)
            
            if (!dailyData[dateKey]) {
                dailyData[dateKey] = {
                    profit: 0,
                    trades: 0,
                    items: []
                }
            }
            
            dailyData[dateKey].profit += profit
            dailyData[dateKey].trades++
            dailyData[dateKey].items.push(trade.itemName || trade.item || 'Unknown Item')
        })
        
        // Convert to calendar format (months as series, days as x-axis)
        const monthData = {}
        
        Object.entries(dailyData).forEach(([dateKey, data]) => {
            const date = new Date(dateKey)
            const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
            const dayKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            
            if (!monthData[monthKey]) {
                monthData[monthKey] = []
            }
            
            monthData[monthKey].push({
                x: dayKey,
                y: Math.round(data.profit * 100) / 100, // Round to 2 decimal places
                date: date.toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                }),
                trades: data.trades,
                items: data.items
            })
        })
        
        // Convert to ApexCharts series format
        const series = Object.entries(monthData)
            .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
            .slice(-6) // Show last 6 months
            .map(([monthKey, data]) => ({
                name: monthKey,
                data: data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            }))
        
        return { series }
    }

    // Enhanced Analytics Chart Methods
    initializeProfitDistributionChart() {
        const trades = this.getFilteredTradesForAnalytics()
        const completedTrades = trades.filter(t => t.sellPrice)
        
        if (completedTrades.length === 0) return
        
        // Calculate profit percentages and create histogram data
        const profitPercentages = completedTrades.map(trade => {
            const profit = ((trade.sellPrice - trade.buyPrice) / trade.buyPrice) * 100
            return profit
        })
        
        // Create histogram bins
        const binSize = 10 // 10% bins
        const bins = {}
        const minProfit = Math.floor(Math.min(...profitPercentages) / binSize) * binSize
        const maxProfit = Math.ceil(Math.max(...profitPercentages) / binSize) * binSize
        
        // Initialize bins
        for (let i = minProfit; i <= maxProfit; i += binSize) {
            bins[i] = 0
        }
        
        // Populate bins
        profitPercentages.forEach(profit => {
            const binKey = Math.floor(profit / binSize) * binSize
            bins[binKey] = (bins[binKey] || 0) + 1
        })
        
        // Convert to chart data
        const chartData = Object.entries(bins).map(([bin, count]) => ({
            x: `${bin}% - ${parseInt(bin) + binSize}%`,
            y: count
        }))
        
        const options = {
            series: [{
                name: 'Number of Trades',
                data: chartData
            }],
            chart: {
                type: 'bar',
                height: 300,
                background: 'transparent',
                toolbar: { 
                    show: true,
                    tools: {
                        download: false,
                        selection: true,
                        zoom: true,
                        zoomin: true,
                        zoomout: true,
                        pan: true,
                        reset: true
                    }
                }
            },
            theme: { mode: 'dark' },
            colors: ['#8B5CF6'],
            plotOptions: {
                bar: {
                    distributed: false,
                    borderRadius: 4
                }
            },
            dataLabels: {
                enabled: true,
                style: { colors: ['#fff'] }
            },
            grid: {
                borderColor: '#374151'
            },
            xaxis: {
                labels: { 
                    style: { colors: '#9CA3AF' },
                    rotate: -45
                },
                title: {
                    text: 'Profit Range (%)',
                    style: { color: '#9CA3AF' }
                }
            },
            yaxis: {
                labels: { style: { colors: '#9CA3AF' } },
                title: {
                    text: 'Number of Trades',
                    style: { color: '#9CA3AF' }
                }
            },
            tooltip: {
                theme: 'dark',
                y: {
                    formatter: (val) => val + ' trades'
                }
            }
        }
        
        const chartElement = document.querySelector("#profit-distribution-chart")
        if (chartElement && this.currentTab === 'analytics') {
            chartElement.innerHTML = ''
            chartElement.style.position = 'relative'
            chartElement.style.zIndex = '10'
            
            const chart = new ApexCharts(chartElement, options)
            chart.render()
            this.chartInstances.profitDistribution = chart
        }
    }

    initializeTopBottomPerformersChart() {
        const trades = this.getFilteredTradesForAnalytics()
        const completedTrades = trades.filter(t => t.sellPrice && t.itemName)
        
        if (completedTrades.length === 0) return
        
        // Calculate profit for each trade
        const tradesWithProfit = completedTrades.map(trade => ({
            ...trade,
            profit: trade.sellPrice - trade.buyPrice
        }))
        
        // Sort by profit and get top 5 and bottom 5
        const sorted = tradesWithProfit.sort((a, b) => b.profit - a.profit)
        const top5 = sorted.slice(0, 5)
        const bottom5 = sorted.slice(-5).reverse()
        
        // Combine and create chart data
        const chartData = [
            ...top5.map(trade => ({
                x: trade.itemName.length > 20 ? trade.itemName.substring(0, 20) + '...' : trade.itemName,
                y: trade.profit,
                fillColor: '#10B981'
            })),
            ...bottom5.map(trade => ({
                x: trade.itemName.length > 20 ? trade.itemName.substring(0, 20) + '...' : trade.itemName,
                y: trade.profit,
                fillColor: '#EF4444'
            }))
        ]
        
        const options = {
            series: [{
                name: 'Profit/Loss',
                data: chartData
            }],
            chart: {
                type: 'bar',
                height: 300,
                background: 'transparent',
                toolbar: { 
                    show: true,
                    tools: {
                        download: false,
                        selection: true,
                        zoom: true,
                        zoomin: true,
                        zoomout: true,
                        pan: true,
                        reset: true
                    }
                }
            },
            theme: { mode: 'dark' },
            plotOptions: {
                bar: {
                    distributed: true,
                    horizontal: true,
                    borderRadius: 4
                }
            },
            dataLabels: {
                enabled: true,
                formatter: (val) => '$' + this.store.formatNumber(Math.abs(val)),
                style: { colors: ['#fff'] }
            },
            colors: ['#10B981', '#EF4444'],
            grid: {
                borderColor: '#374151'
            },
            xaxis: {
                labels: { 
                    style: { colors: '#9CA3AF' },
                    formatter: (val) => '$' + this.store.formatNumber(Math.abs(val))
                }
            },
            yaxis: {
                labels: { style: { colors: '#9CA3AF' } }
            },
            tooltip: {
                theme: 'dark',
                y: {
                    formatter: (val) => (val >= 0 ? '+' : '') + '$' + this.store.formatNumber(Math.abs(val))
                }
            }
        }
        
        const chartElement = document.querySelector("#top-bottom-performers-chart")
        if (chartElement && this.currentTab === 'analytics') {
            chartElement.innerHTML = ''
            chartElement.style.position = 'relative'
            chartElement.style.zIndex = '10'
            
            const chart = new ApexCharts(chartElement, options)
            chart.render()
            this.chartInstances.topBottomPerformers = chart
        }
    }

    initializeTradeFrequencyChart() {
        const trades = this.getFilteredTradesForAnalytics()
        
        if (trades.length === 0) return
        
        // Group trades by day of week
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        const dayFrequency = new Array(7).fill(0)
        
        trades.forEach(trade => {
            if (trade.buyDate) {
                const date = this.parseDateForSorting(trade.buyDate)
                if (!isNaN(date.getTime())) {
                    dayFrequency[date.getDay()]++
                }
            }
        })
        
        const chartData = dayFrequency.map((count, index) => ({
            x: dayNames[index].substring(0, 3), // Short day names
            y: count
        }))
        
        const options = {
            series: [{
                name: 'Trades',
                data: chartData
            }],
            chart: {
                type: 'bar',
                height: 280,
                background: 'transparent',
                toolbar: { 
                    show: true,
                    tools: {
                        download: false,
                        selection: true,
                        zoom: true,
                        zoomin: true,
                        zoomout: true,
                        pan: true,
                        reset: true
                    }
                }
            },
            theme: { mode: 'dark' },
            colors: ['#3B82F6'],
            plotOptions: {
                bar: {
                    borderRadius: 4,
                    distributed: false
                }
            },
            dataLabels: {
                enabled: true,
                style: { colors: ['#fff'] }
            },
            grid: {
                borderColor: '#374151'
            },
            xaxis: {
                labels: { style: { colors: '#9CA3AF' } }
            },
            yaxis: {
                labels: { style: { colors: '#9CA3AF' } }
            },
            tooltip: {
                theme: 'dark',
                y: {
                    formatter: (val) => val + ' trades'
                }
            }
        }
        
        const chartElement = document.querySelector("#trade-frequency-chart")
        if (chartElement && this.currentTab === 'analytics') {
            chartElement.innerHTML = ''
            chartElement.style.position = 'relative'
            chartElement.style.zIndex = '10'
            
            const chart = new ApexCharts(chartElement, options)
            chart.render()
            this.chartInstances.tradeFrequency = chart
        }
    }

    initializeWinRateTimelineChart() {
        const trades = this.getFilteredTradesForAnalytics()
        const completedTrades = trades.filter(t => t.sellPrice && t.sellDate)
        
        if (completedTrades.length < 5) return // Need at least 5 trades for meaningful timeline
        
        // Sort trades by sell date
        const sortedTrades = completedTrades.sort((a, b) => {
            const dateA = this.parseDateForSorting(a.sellDate)
            const dateB = this.parseDateForSorting(b.sellDate)
            return dateA - dateB
        })
        
        // Calculate rolling win rate (last 10 trades)
        const windowSize = Math.min(10, sortedTrades.length)
        const winRateData = []
        
        for (let i = windowSize - 1; i < sortedTrades.length; i++) {
            const window = sortedTrades.slice(i - windowSize + 1, i + 1)
            const wins = window.filter(t => t.sellPrice > t.buyPrice).length
            const winRate = (wins / windowSize) * 100
            
            winRateData.push({
                x: this.parseDateForSorting(sortedTrades[i].sellDate),
                y: winRate
            })
        }
        
        const options = {
            series: [{
                name: 'Win Rate (%)',
                data: winRateData
            }],
            chart: {
                type: 'line',
                height: 280,
                background: 'transparent',
                toolbar: { 
                    show: true,
                    tools: {
                        download: false,
                        selection: true,
                        zoom: true,
                        zoomin: true,
                        zoomout: true,
                        pan: true,
                        reset: true
                    }
                }
            },
            theme: { mode: 'dark' },
            colors: ['#10B981'],
            stroke: {
                curve: 'smooth',
                width: 3
            },
            markers: {
                size: 4,
                colors: ['#10B981'],
                strokeWidth: 2,
                strokeColors: '#1F2937'
            },
            grid: {
                borderColor: '#374151'
            },
            xaxis: {
                type: 'datetime',
                labels: { style: { colors: '#9CA3AF' } }
            },
            yaxis: {
                labels: { 
                    style: { colors: '#9CA3AF' },
                    formatter: (val) => val.toFixed(1) + '%'
                },
                min: 0,
                max: 100
            },
            tooltip: {
                theme: 'dark',
                y: {
                    formatter: (val) => val.toFixed(1) + '% (last ' + windowSize + ' trades)'
                }
            }
        }
        
        const chartElement = document.querySelector("#win-rate-timeline-chart")
        if (chartElement && this.currentTab === 'analytics') {
            chartElement.innerHTML = ''
            chartElement.style.position = 'relative'
            chartElement.style.zIndex = '10'
            
            const chart = new ApexCharts(chartElement, options)
            chart.render()
            this.chartInstances.winRateTimeline = chart
        }
    }

    initializeHoldTimeAnalysisChart() {
        const trades = this.getFilteredTradesForAnalytics()
        const completedTrades = trades.filter(t => t.sellPrice && t.sellDate && t.buyDate)
        
        if (completedTrades.length === 0) return
        
        // Calculate hold time and profit for each trade
        const scatterData = completedTrades.map(trade => {
            const buyDate = this.parseDateForSorting(trade.buyDate)
            const sellDate = this.parseDateForSorting(trade.sellDate)
            
            if (isNaN(buyDate.getTime()) || isNaN(sellDate.getTime())) return null
            
            const holdDays = Math.max(1, Math.floor((sellDate - buyDate) / (1000 * 60 * 60 * 24)))
            const profitPercent = ((trade.sellPrice - trade.buyPrice) / trade.buyPrice) * 100
            
            return {
                x: holdDays,
                y: profitPercent,
                profit: trade.sellPrice - trade.buyPrice
            }
        }).filter(Boolean)
        
        const options = {
            series: [{
                name: 'Trades',
                data: scatterData
            }],
            chart: {
                type: 'scatter',
                height: 280,
                background: 'transparent',
                toolbar: { 
                    show: true,
                    tools: {
                        download: false,
                        selection: true,
                        zoom: true,
                        zoomin: true,
                        zoomout: true,
                        pan: true,
                        reset: true
                    }
                }
            },
            theme: { mode: 'dark' },
            colors: ['#F59E0B'],
            markers: {
                size: 6,
                strokeWidth: 1,
                strokeColors: '#1F2937'
            },
            grid: {
                borderColor: '#374151'
            },
            xaxis: {
                labels: { 
                    style: { colors: '#9CA3AF' },
                    formatter: (val) => Math.floor(val) + ' days'
                },
                title: {
                    text: 'Hold Time (Days)',
                    style: { color: '#9CA3AF' }
                }
            },
            yaxis: {
                labels: { 
                    style: { colors: '#9CA3AF' },
                    formatter: (val) => val.toFixed(1) + '%'
                },
                title: {
                    text: 'Profit %',
                    style: { color: '#9CA3AF' }
                }
            },
            tooltip: {
                theme: 'dark',
                custom: ({ dataPointIndex, w }) => {
                    const data = scatterData[dataPointIndex]
                    return `
                        <div class="bg-gray-800 p-2 rounded shadow-lg">
                            <div>Hold Time: ${data.x} days</div>
                            <div>Profit: ${data.y.toFixed(1)}% ($${this.store.formatNumber(Math.abs(data.profit))})</div>
                        </div>
                    `
                }
            }
        }
        
        const chartElement = document.querySelector("#hold-time-analysis-chart")
        if (chartElement && this.currentTab === 'analytics') {
            chartElement.innerHTML = ''
            chartElement.style.position = 'relative'
            chartElement.style.zIndex = '10'
            
            const chart = new ApexCharts(chartElement, options)
            chart.render()
            this.chartInstances.holdTimeAnalysis = chart
        }
    }

    initializeCategoryPerformancePieChart() {
        const trades = this.getFilteredTradesForAnalytics()
        const completedTrades = trades.filter(t => t.sellPrice)
        
        if (completedTrades.length === 0) return
        
        // Group by category and calculate profits
        const categories = {}
        completedTrades.forEach(trade => {
            const category = this.detectItemCategory(trade.itemName || trade.item)
            if (!categories[category]) {
                categories[category] = { profit: 0, trades: 0 }
            }
            categories[category].profit += (trade.sellPrice - trade.buyPrice)
            categories[category].trades++
        })
        
        // Convert to pie chart data
        const pieData = Object.entries(categories).map(([category, data]) => data.profit)
        const pieLabels = Object.keys(categories)
        
        const options = {
            series: pieData,
            chart: {
                type: 'pie',
                height: 300,
                background: 'transparent',
                toolbar: { 
                    show: true,
                    tools: {
                        download: false,
                        selection: false,
                        zoom: false,
                        zoomin: false,
                        zoomout: false,
                        pan: false,
                        reset: true
                    }
                }
            },
            labels: pieLabels,
            theme: { mode: 'dark' },
            colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'],
            dataLabels: {
                enabled: true,
                style: { colors: ['#fff'] },
                formatter: (val, opts) => {
                    return val.toFixed(1) + '%'
                }
            },
            legend: {
                position: 'bottom',
                labels: { colors: '#9CA3AF' }
            },
            tooltip: {
                theme: 'dark',
                y: {
                    formatter: (val) => '$' + this.store.formatNumber(Math.abs(val))
                }
            }
        }
        
        const chartElement = document.querySelector("#category-performance-pie-chart")
        if (chartElement && this.currentTab === 'analytics') {
            chartElement.innerHTML = ''
            chartElement.style.position = 'relative'
            chartElement.style.zIndex = '10'
            
            const chart = new ApexCharts(chartElement, options)
            chart.render()
            this.chartInstances.categoryPerformancePie = chart
        }
    }

    initializeConditionROIChart() {
        const trades = this.getFilteredTradesForAnalytics()
        const completedTrades = trades.filter(t => t.sellPrice && t.itemName)
        
        if (completedTrades.length === 0) return
        
        // Count trades by specific item/knife type
        const itemCounts = {}
        completedTrades.forEach(trade => {
            // Extract the main item name (remove condition and extras)
            let itemName = trade.itemName || trade.item || 'Unknown'
            
            // Clean up the name - remove condition words and common prefixes
            itemName = itemName.replace(/\s*\|\s*.*$/, '') // Remove skin name after |
            itemName = itemName.replace(/\s*\(.*?\)/g, '') // Remove condition in parentheses
            itemName = itemName.replace(/★\s*StatTrak™?\s*/i, 'StatTrak ') // Normalize StatTrak
            itemName = itemName.replace(/★\s*/g, '') // Remove star symbol
            itemName = itemName.replace(/\s*(Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\s*$/i, '') // Remove trailing condition
            itemName = itemName.trim()
            
            if (!itemCounts[itemName]) {
                itemCounts[itemName] = { 
                    count: 0, 
                    totalProfit: 0, 
                    avgProfit: 0,
                    totalValue: 0
                }
            }
            itemCounts[itemName].count++
            itemCounts[itemName].totalProfit += (trade.sellPrice - trade.buyPrice)
            itemCounts[itemName].totalValue += trade.buyPrice
        })
        
        // Calculate average profit and sort by count
        Object.keys(itemCounts).forEach(item => {
            itemCounts[item].avgProfit = itemCounts[item].totalProfit / itemCounts[item].count
        })
        
        // Get top 10 most traded items
        const chartData = Object.entries(itemCounts)
            .sort(([,a], [,b]) => b.count - a.count)
            .slice(0, 10)
            .map(([itemName, data]) => ({
                x: itemName.length > 25 ? itemName.substring(0, 25) + '...' : itemName,
                y: data.count,
                avgProfit: data.avgProfit,
                totalProfit: data.totalProfit,
                totalValue: data.totalValue,
                fullName: itemName
            }))
        
        const options = {
            series: [{
                name: 'Trade Count',
                data: chartData
            }],
            chart: {
                type: 'bar',
                height: 300,
                background: 'transparent',
                toolbar: { 
                    show: true,
                    tools: {
                        download: false,
                        selection: true,
                        zoom: true,
                        zoomin: true,
                        zoomout: true,
                        pan: true,
                        reset: true
                    }
                }
            },
            theme: { mode: 'dark' },
            colors: ['#3B82F6'],
            plotOptions: {
                bar: {
                    borderRadius: 4,
                    horizontal: true
                }
            },
            dataLabels: {
                enabled: true,
                formatter: (val) => val + ' trades',
                style: { colors: ['#fff'] }
            },
            grid: {
                borderColor: '#374151'
            },
            xaxis: {
                labels: { 
                    style: { colors: '#9CA3AF' }
                }
            },
            yaxis: {
                labels: { 
                    style: { colors: '#9CA3AF' }
                }
            },
            tooltip: {
                theme: 'dark',
                custom: ({ dataPointIndex }) => {
                    const data = chartData[dataPointIndex]
                    const profitColor = data.avgProfit >= 0 ? '#22C55E' : '#EF4444'
                    const profitText = data.avgProfit >= 0 ? `+$${Math.abs(data.avgProfit).toFixed(2)}` : `-$${Math.abs(data.avgProfit).toFixed(2)}`
                    const totalProfitColor = data.totalProfit >= 0 ? '#22C55E' : '#EF4444'
                    const totalProfitText = data.totalProfit >= 0 ? `+$${Math.abs(data.totalProfit).toFixed(2)}` : `-$${Math.abs(data.totalProfit).toFixed(2)}`
                    
                    return `
                        <div class="bg-gray-800 p-3 rounded shadow-lg">
                            <div class="font-semibold text-white mb-2">${data.fullName}</div>
                            <div class="text-sm text-gray-300">Trades: ${data.y}</div>
                            <div class="text-sm" style="color: ${profitColor}">Avg Profit: ${profitText}</div>
                            <div class="text-sm" style="color: ${totalProfitColor}">Total Profit: ${totalProfitText}</div>
                            <div class="text-sm text-gray-300">Total Invested: $${this.store.formatNumber(data.totalValue)}</div>
                        </div>
                    `
                }
            }
        }
        
        const chartElement = document.querySelector("#condition-roi-chart")
        if (chartElement && this.currentTab === 'analytics') {
            chartElement.innerHTML = ''
            chartElement.style.position = 'relative'
            chartElement.style.zIndex = '10'
            
            const chart = new ApexCharts(chartElement, options)
            chart.render()
            this.chartInstances.conditionROI = chart
        }
    }

    initializePriceRangeHeatmapChart() {
        const trades = this.getFilteredTradesForAnalytics()
        const completedTrades = trades.filter(t => t.sellPrice)
        
        if (completedTrades.length === 0) return
        
        // Define price ranges
        const ranges = [
            { min: 0, max: 50, label: '$0-50' },
            { min: 50, max: 100, label: '$50-100' },
            { min: 100, max: 250, label: '$100-250' },
            { min: 250, max: 500, label: '$250-500' },
            { min: 500, max: 1000, label: '$500-1000' },
            { min: 1000, max: Infinity, label: '$1000+' }
        ]
        
        // Group trades by price range
        const rangeData = ranges.map(range => {
            const tradesInRange = completedTrades.filter(trade => 
                trade.buyPrice >= range.min && trade.buyPrice < range.max
            )
            
            if (tradesInRange.length === 0) return { x: range.label, y: 0 }
            
            const totalInvested = tradesInRange.reduce((sum, t) => sum + t.buyPrice, 0)
            const totalReturn = tradesInRange.reduce((sum, t) => sum + t.sellPrice, 0)
            const roi = ((totalReturn - totalInvested) / totalInvested) * 100
            
            return {
                x: range.label,
                y: roi,
                trades: tradesInRange.length
            }
        })
        
        const options = {
            series: [{
                name: 'ROI %',
                data: rangeData
            }],
            chart: {
                height: 300,
                type: 'heatmap',
                background: 'transparent',
                toolbar: { 
                    show: true,
                    tools: {
                        download: false,
                        selection: true,
                        zoom: true,
                        zoomin: true,
                        zoomout: true,
                        pan: true,
                        reset: true
                    }
                }
            },
            theme: { mode: 'dark' },
            colorScale: {
                ranges: [
                    { from: -100, to: 0, color: '#EF4444' },
                    { from: 0, to: 10, color: '#F59E0B' },
                    { from: 10, to: 25, color: '#10B981' },
                    { from: 25, to: 100, color: '#059669' }
                ]
            },
            dataLabels: {
                enabled: true,
                formatter: (val) => val.toFixed(1) + '%',
                style: { colors: ['#fff'] }
            },
            grid: {
                borderColor: '#374151'
            },
            xaxis: {
                labels: { style: { colors: '#9CA3AF' } }
            },
            yaxis: {
                labels: { style: { colors: '#9CA3AF' } }
            },
            tooltip: {
                theme: 'dark',
                custom: ({ dataPointIndex }) => {
                    const data = rangeData[dataPointIndex]
                    return `
                        <div class="bg-gray-800 p-2 rounded shadow-lg">
                            <div><strong>${data.x}</strong></div>
                            <div>ROI: ${data.y.toFixed(1)}%</div>
                            <div>Trades: ${data.trades}</div>
                        </div>
                    `
                }
            }
        }
        
        const chartElement = document.querySelector("#price-range-heatmap-chart")
        if (chartElement && this.currentTab === 'analytics') {
            chartElement.innerHTML = ''
            chartElement.style.position = 'relative'
            chartElement.style.zIndex = '10'
            
            const chart = new ApexCharts(chartElement, options)
            chart.render()
            this.chartInstances.priceRangeHeatmap = chart
        }
    }

    generateAnalyticsWeeklyHTML() {
        const currentMonth = this.currentMonth || new Date()
        const weeks = this.getWeeksInMonth(currentMonth)
        
        if (weeks.length === 0) {
            return '<div class="text-gray-500 text-center py-4">No data available</div>'
        }

        return weeks.map((week, index) => {
            const weekData = this.getWeekData(week.start, week.end)
            const profitClass = weekData.profit >= 0 ? 'text-green-400' : 'text-red-400'
            
            return `
                <div class="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div>
                        <div class="text-white font-medium">Week ${index + 1}</div>
                        <div class="text-gray-400 text-sm">${week.start.getDate()}-${week.end.getDate()}</div>
                    </div>
                    <div class="text-right">
                        <div class="${profitClass} font-medium">
                            ${weekData.profit >= 0 ? '+' : ''}$${this.store.formatNumber(Math.abs(weekData.profit))}
                        </div>
                        <div class="text-gray-500 text-xs">${weekData.trades} trades</div>
                    </div>
                </div>
            `
        }).join('')
    }

    generateTopItemsHTML() {
        const trades = this.getFilteredTradesForAnalytics()
        const completedTrades = trades.filter(t => t.sellPrice)
        
        // Group by item and calculate profit for each
        const itemProfits = {}
        completedTrades.forEach(trade => {
            const item = trade.itemName
            const profit = trade.sellPrice - trade.buyPrice
            
            if (!itemProfits[item]) {
                itemProfits[item] = {
                    totalProfit: 0,
                    trades: 0,
                    totalVolume: 0
                }
            }
            
            itemProfits[item].totalProfit += profit
            itemProfits[item].trades += 1
            itemProfits[item].totalVolume += trade.buyPrice
        })
        
        // Sort by total profit and take top 5
        const topItems = Object.entries(itemProfits)
            .sort(([,a], [,b]) => b.totalProfit - a.totalProfit)
            .slice(0, 5)
        
        if (topItems.length === 0) {
            return '<div class="text-gray-500 text-center py-8">No completed trades yet</div>'
        }

        return topItems.map(([itemName, data]) => {
            const profitClass = data.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'
            const avgProfit = data.totalProfit / data.trades
            
            return `
                <div class="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div class="flex-1">
                        <div class="text-white font-medium">${itemName}</div>
                        <div class="text-gray-400 text-sm">${data.trades} trades • Avg: $${this.store.formatNumber(avgProfit)}</div>
                    </div>
                    <div class="text-right">
                        <div class="${profitClass} font-medium">
                            ${data.totalProfit >= 0 ? '+' : ''}$${this.store.formatNumber(Math.abs(data.totalProfit))}
                        </div>
                        <div class="text-gray-500 text-xs">Total</div>
                    </div>
                </div>
            `
        }).join('')
    }

    getBasicTradingStats() {
        const trades = this.getFilteredTradesForAnalytics()
        const completedTrades = trades.filter(t => t.sellPrice)
        
        if (completedTrades.length === 0) {
            return {
                avgProfitPerTrade: 0,
                bestTrade: 0,
                worstTrade: 0,
                totalVolume: 0,
                avgHoldTime: 0
            }
        }
        
        const profits = completedTrades.map(t => t.sellPrice - t.buyPrice)
        const totalProfit = profits.reduce((sum, p) => sum + p, 0)
        const avgProfitPerTrade = totalProfit / completedTrades.length
        const bestTrade = Math.max(...profits)
        const worstTrade = Math.min(...profits)
        const totalVolume = completedTrades.reduce((sum, t) => sum + t.buyPrice, 0)
        
        // Calculate average hold time
        const holdTimes = completedTrades
            .filter(t => t.sellDate && t.buyDate)
            .map(t => {
                const buyDate = this.parseDateForSorting(t.buyDate)
                const sellDate = this.parseDateForSorting(t.sellDate)
                if (!isNaN(buyDate.getTime()) && !isNaN(sellDate.getTime())) {
                    return Math.floor((sellDate - buyDate) / (1000 * 60 * 60 * 24))
                }
                return 0
            })
        
        const avgHoldTime = holdTimes.length > 0 ? Math.round(holdTimes.reduce((sum, days) => sum + days, 0) / holdTimes.length) : 0
        
        return {
            avgProfitPerTrade,
            bestTrade,
            worstTrade,
            totalVolume,
            avgHoldTime
        }
    }

    generateCategoryPerformanceHTML() {
        const trades = this.getFilteredTradesForAnalytics()
        const completedTrades = trades.filter(t => t.sellPrice)
        
        // Simple category detection based on item names
        const categories = {}
        completedTrades.forEach(trade => {
            let category = 'Other'
            const itemName = trade.itemName.toLowerCase()
            
            if (itemName.includes('ak-47') || itemName.includes('ak47')) category = 'AK-47'
            else if (itemName.includes('awp')) category = 'AWP'
            else if (itemName.includes('m4a4') || itemName.includes('m4a1')) category = 'M4'
            else if (itemName.includes('glock')) category = 'Glock'
            else if (itemName.includes('karambit') || itemName.includes('knife')) category = 'Knives'
            else if (itemName.includes('gloves')) category = 'Gloves'
            
            const profit = trade.sellPrice - trade.buyPrice
            
            if (!categories[category]) {
                categories[category] = {
                    totalProfit: 0,
                    trades: 0,
                    profitable: 0
                }
            }
            
            categories[category].totalProfit += profit
            categories[category].trades += 1
            if (profit > 0) categories[category].profitable += 1
        })
        
        const sortedCategories = Object.entries(categories)
            .sort(([,a], [,b]) => b.totalProfit - a.totalProfit)
            .slice(0, 6)
        
        if (sortedCategories.length === 0) {
            return '<div class="text-gray-500 text-center py-4">No data available</div>'
        }

        return sortedCategories.map(([category, data]) => {
            const profitClass = data.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'
            const successRate = ((data.profitable / data.trades) * 100).toFixed(1)
            
            return `
                <div class="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div>
                        <div class="text-white font-medium">${category}</div>
                        <div class="text-gray-400 text-sm">${data.trades} trades • ${successRate}% success</div>
                    </div>
                    <div class="text-right">
                        <div class="${profitClass} font-medium">
                            ${data.totalProfit >= 0 ? '+' : ''}$${this.store.formatNumber(Math.abs(data.totalProfit))}
                        </div>
                        <div class="text-gray-500 text-xs">Total</div>
                    </div>
                </div>
            `
        }).join('')
    }

    navigateMonth(direction) {
        if (!this.currentMonth) {
            this.currentMonth = new Date()
        }
        
        this.currentMonth.setMonth(this.currentMonth.getMonth() + direction)
        this.refreshMonthlyDashboard()
    }

    refreshMonthlyDashboard() {
        console.log('🔄 Refreshing enhanced monthly dashboard...')
        
        // Update month display
        const monthDisplay = document.getElementById('current-month-display')
        if (monthDisplay) {
            monthDisplay.textContent = this.getCurrentMonthDisplay()
        }

        // Update all focus text
        document.querySelectorAll('.focus-month-text').forEach(el => {
            el.textContent = `Focus: ${this.getCurrentMonthDisplay()} Performance`
        })

        // Get enhanced metrics
        const enhancedMetrics = this.getEnhancedMonthlyMetrics()
        const basicMetrics = this.getMonthlyMetrics()
        
        // Update Average Return Percentage
        const avgReturnEl = document.getElementById('monthly-avg-return')
        if (avgReturnEl) {
            avgReturnEl.textContent = `${enhancedMetrics.avgReturnPercent}%`
        }
        
        const totalTradesInfoEl = document.getElementById('monthly-total-trades-info')
        if (totalTradesInfoEl) {
            totalTradesInfoEl.textContent = `${basicMetrics.totalTrades} trades completed`
        }

        // Update Best Trade
        const bestTradeEl = document.getElementById('monthly-best-trade')
        const bestTradeItemEl = document.getElementById('best-trade-item')
        if (bestTradeEl && bestTradeItemEl) {
            const best = enhancedMetrics.bestTrade
            if (best) {
                const profit = best.sellPrice - best.buyPrice
                bestTradeEl.textContent = `+$${this.store.formatNumber(profit)}`
                bestTradeItemEl.textContent = best.itemName.split(' ').slice(0, 2).join(' ') + '...'
            } else {
                bestTradeEl.textContent = '$0.00'
                bestTradeItemEl.textContent = 'No trades yet'
            }
        }

        // Update Current Streak
        const streakEl = document.getElementById('monthly-streak')
        const winRateInfoEl = document.getElementById('win-rate-info')
        if (streakEl && winRateInfoEl) {
            streakEl.textContent = enhancedMetrics.currentStreak
            const streakType = enhancedMetrics.streakType
            streakEl.className = `text-4xl font-bold ${streakType === 'winning' ? 'text-green-400' : streakType === 'losing' ? 'text-red-400' : 'text-white'} mb-2`
            winRateInfoEl.textContent = `${basicMetrics.winRate}% win rate`
        }

        // Update Hold Time
        const holdTimeEl = document.getElementById('monthly-hold-time')
        const completionRateInfoEl = document.getElementById('completion-rate-info')
        if (holdTimeEl && completionRateInfoEl) {
            holdTimeEl.textContent = `${enhancedMetrics.avgHoldDays}d`
            completionRateInfoEl.textContent = `${enhancedMetrics.completionRate}% completion rate`
        }

        // Update original monthly cards
        // Update Total Trades
        const totalTradesEl = document.getElementById('monthly-total-trades')
        if (totalTradesEl) totalTradesEl.textContent = basicMetrics.totalTrades
        
        // Update Total Trades comparison  
        const totalTradesComparison = document.getElementById('total-trades-comparison')
        if (totalTradesComparison) {
            const sign = basicMetrics.tradesVsPrevMonth >= 0 ? '+' : ''
            const iconClass = basicMetrics.tradesVsPrevMonth >= 0 ? 'trending-up' : 'trending-down'
            const colorClass = basicMetrics.tradesVsPrevMonth >= 0 ? 'text-green-400' : 'text-red-400'
            totalTradesComparison.innerHTML = `
                <div class="flex items-center gap-1.5 ${colorClass}">
                    <i data-lucide="${iconClass}" class="w-3 h-3"></i>
                    <span class="font-medium">${sign}${basicMetrics.tradesVsPrevMonth}</span>
                    <span class="text-gray-500 font-normal">vs last month</span>
                </div>
            `
        }

        // Update Monthly P&L
        const monthlyPnLEl = document.getElementById('monthly-pnl')
        if (monthlyPnLEl) {
            monthlyPnLEl.textContent = `${basicMetrics.monthlyPnL >= 0 ? '+' : ''}$${this.store.formatNumber(Math.abs(basicMetrics.monthlyPnL))}`
            monthlyPnLEl.className = `text-4xl font-bold ${basicMetrics.monthlyPnL >= 0 ? 'text-green-400' : 'text-red-400'} mb-2`
        }
        
        // Update Monthly P&L comparison
        const monthlyPnLComparison = document.getElementById('monthly-pnl-comparison')
        if (monthlyPnLComparison) {
            const sign = basicMetrics.pnlVsPrevMonth >= 0 ? '+' : ''
            const iconClass = basicMetrics.pnlVsPrevMonth >= 0 ? 'trending-up' : 'trending-down'
            const colorClass = basicMetrics.pnlVsPrevMonth >= 0 ? 'text-green-400' : 'text-red-400'
            monthlyPnLComparison.innerHTML = `
                <div class="flex items-center gap-1.5 ${colorClass}">
                    <i data-lucide="${iconClass}" class="w-3 h-3"></i>
                    <span class="font-medium">${sign}$${this.store.formatNumber(Math.abs(basicMetrics.pnlVsPrevMonth))}</span>
                    <span class="text-gray-500 font-normal">vs last month</span>
                </div>
            `
        }

        // Update Win Rate
        const winRateEl = document.getElementById('monthly-win-rate')
        if (winRateEl) winRateEl.textContent = `${basicMetrics.winRate}%`
        
        // Update Win Rate comparison
        const winRateComparison = document.getElementById('win-rate-comparison')
        if (winRateComparison) {
            const sign = basicMetrics.winRateVsPrevMonth >= 0 ? '+' : ''
            const iconClass = basicMetrics.winRateVsPrevMonth >= 0 ? 'trending-up' : 'trending-down'
            const colorClass = basicMetrics.winRateVsPrevMonth >= 0 ? 'text-green-400' : 'text-red-400'
            winRateComparison.innerHTML = `
                <div class="flex items-center gap-1.5 ${colorClass}">
                    <i data-lucide="${iconClass}" class="w-3 h-3"></i>
                    <span class="font-medium">${sign}${basicMetrics.winRateVsPrevMonth}%</span>
                    <span class="text-gray-500 font-normal">vs last month</span>
                </div>
            `
        }

        // Update Avg Profit Per Trade
        const avgProfitEl = document.getElementById('monthly-avg-profit')
        if (avgProfitEl) avgProfitEl.textContent = `$${this.store.formatNumber(basicMetrics.avgProfitPerTrade)}`
        
        // Update Avg Profit comparison
        const avgProfitComparison = document.getElementById('avg-profit-comparison')
        if (avgProfitComparison) {
            const sign = basicMetrics.avgProfitVsPrevMonth >= 0 ? '+' : ''
            const iconClass = basicMetrics.avgProfitVsPrevMonth >= 0 ? 'trending-up' : 'trending-down'
            const colorClass = basicMetrics.avgProfitVsPrevMonth >= 0 ? 'text-green-400' : 'text-red-400'
            avgProfitComparison.innerHTML = `
                <div class="flex items-center gap-1.5 ${colorClass}">
                    <i data-lucide="${iconClass}" class="w-3 h-3"></i>
                    <span class="font-medium">${sign}$${this.store.formatNumber(Math.abs(basicMetrics.avgProfitVsPrevMonth))}</span>
                    <span class="text-gray-500 font-normal">vs last month</span>
                </div>
            `
        }

        // Update weekly breakdown title
        const weeklyBreakdownTitle = document.getElementById('weekly-breakdown-title')
        if (weeklyBreakdownTitle) {
            weeklyBreakdownTitle.textContent = `Weekly Breakdown - ${this.getCurrentMonthDisplay()}`
        }

        // Update weekly breakdown
        const weeklyContainer = document.getElementById('weekly-breakdown-container')
        if (weeklyContainer) {
            weeklyContainer.innerHTML = this.generateWeeklyBreakdownHTML()
        }

        // Update holdings and recent trades
        const holdingsContainer = document.getElementById('current-holdings-list')
        if (holdingsContainer) {
            holdingsContainer.innerHTML = this.generateCurrentHoldingsHTML()
        }

        const recentTradesContainer = document.getElementById('recent-trades-list')
        if (recentTradesContainer) {
            recentTradesContainer.innerHTML = this.generateRecentTradesHTML()
        }

        // Update strategic insights
        const patternAnalysisEl = document.getElementById('pattern-analysis')
        if (patternAnalysisEl) {
            patternAnalysisEl.innerHTML = this.generatePatternAnalysisHTML()
        }

        const momentumAnalysisEl = document.getElementById('momentum-analysis')
        if (momentumAnalysisEl) {
            momentumAnalysisEl.innerHTML = this.generateMomentumAnalysisHTML()
        }

        const riskAnalysisEl = document.getElementById('risk-analysis')
        if (riskAnalysisEl) {
            riskAnalysisEl.innerHTML = this.generateRiskAnalysisHTML()
        }

        // Re-initialize icons to render new trend icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons()
            console.log('🎨 Icons refreshed for enhanced monthly dashboard')
        }
        
        console.log('✅ Enhanced monthly dashboard refresh completed')
    }

    setupEventListeners() {
        console.log('🎯 Setting up professional trading event listeners')
        
        setTimeout(() => {
            // Tab navigation listeners
            document.querySelectorAll('.trading-tab').forEach((tab, index) => {
                const tabId = tab.id?.replace('tab-', '') || ['overview', 'positions', 'analytics'][index]
                
                tab.addEventListener('click', (e) => {
                    e.preventDefault()
                    console.log(`🔄 Tab clicked: ${tabId}`)
                    this.switchTab(tabId)
                })
            })

            // Month navigation listeners
            const prevMonthBtn = document.getElementById('prev-month-btn')
            const nextMonthBtn = document.getElementById('next-month-btn')

            if (prevMonthBtn) {
                prevMonthBtn.addEventListener('click', () => {
                    this.navigateMonth(-1)
                })
            }

            if (nextMonthBtn) {
                nextMonthBtn.addEventListener('click', () => {
                    this.navigateMonth(1)
                })
            }

            // Add trade form listeners
            const addTradeBtn = document.getElementById('add-trade-btn')
            const addTradeForm = document.getElementById('add-trade-form')
            const cancelAddTradeBtn = document.getElementById('cancel-add-trade')
            const newTradeForm = document.getElementById('new-trade-form')

            if (addTradeBtn) {
                addTradeBtn.addEventListener('click', () => {
                    addTradeForm.classList.remove('hidden')
                    addTradeBtn.style.display = 'none'
                })
            }

            if (cancelAddTradeBtn) {
                cancelAddTradeBtn.addEventListener('click', () => {
                    addTradeForm.classList.add('hidden')
                    addTradeBtn.style.display = 'block'
                    newTradeForm.reset()
                })
            }

            if (newTradeForm) {
                newTradeForm.addEventListener('submit', (e) => {
                    e.preventDefault()
                    this.addNewTrade()
                })
            }

            // Edit trade modal listeners
            const closeEditModal = document.getElementById('close-edit-modal')
            const cancelEditTrade = document.getElementById('cancel-edit-trade')
            const editTradeForm = document.getElementById('edit-trade-form')

            if (closeEditModal) {
                closeEditModal.addEventListener('click', () => {
                    this.closeEditModal()
                })
            }

            if (cancelEditTrade) {
                cancelEditTrade.addEventListener('click', () => {
                    this.closeEditModal()
                })
            }

            if (editTradeForm) {
                editTradeForm.addEventListener('submit', (e) => {
                    e.preventDefault()
                    this.saveEditedTrade()
                })
            }

            // Close modal when clicking outside
            const editModal = document.getElementById('edit-trade-modal')
            if (editModal) {
                editModal.addEventListener('click', (e) => {
                    if (e.target === editModal) {
                        this.closeEditModal()
                    }
                })
            }

            // Enhanced Analytics controls
            const analyticsMonthSelector = document.getElementById('analytics-month-selector')

            if (analyticsMonthSelector) {
                analyticsMonthSelector.addEventListener('change', (e) => {
                    this.updateAnalyticsDisplay(e.target.value)
                })
            }

            // Time period quick selectors
            document.querySelectorAll('.period-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault()
                    const period = btn.getAttribute('data-period')
                    
                    // Update button states
                    document.querySelectorAll('.period-btn').forEach(b => {
                        b.classList.remove('bg-blue-600', 'text-white')
                        b.classList.add('text-gray-400')
                    })
                    btn.classList.add('bg-blue-600', 'text-white')
                    btn.classList.remove('text-gray-400')
                    
                    // Update analytics display
                    this.updateAnalyticsDisplay(period)
                })
            })

            // Chart period controls
            document.querySelectorAll('.chart-period-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault()
                    const chart = btn.getAttribute('data-chart')
                    const period = btn.getAttribute('data-period')
                    
                    // Update button states for this chart
                    const parentContainer = btn.closest('.bg-gray-900')
                    if (parentContainer) {
                        parentContainer.querySelectorAll('.chart-period-btn').forEach(b => {
                            b.classList.remove('bg-blue-600', 'text-white')
                            b.classList.add('text-gray-400')
                        })
                        btn.classList.add('bg-blue-600', 'text-white')
                        btn.classList.remove('text-gray-400')
                    }
                    
                    // Refresh the specific chart
                    this.refreshSpecificChart(chart, period)
                })
            })

            // Import/Export listeners
            const exportCsvBtn = document.getElementById('exportCsvBtn')
            const exportExcelBtn = document.getElementById('exportExcelBtn')
            const importCsvBtn = document.getElementById('importCsvBtn')
            const importCsvFile = document.getElementById('importCsvFile')

            if (exportCsvBtn) {
                exportCsvBtn.addEventListener('click', () => {
                    this.exportToCsv()
                })
            }

            if (exportExcelBtn) {
                exportExcelBtn.addEventListener('click', () => {
                    this.exportToExcel()
                })
            }

            if (importCsvBtn) {
                importCsvBtn.addEventListener('click', () => {
                    document.getElementById('importCsvFile').click()
                })
            }

            if (importCsvFile) {
                importCsvFile.addEventListener('change', (e) => {
                    this.handleImport(e)
                })
            }

            // Date picker sync functionality
            this.setupDatePickerSync('buyDate', 'buyDatePicker')
            this.setupDatePickerSync('sellDate', 'sellDatePicker')
            this.setupDatePickerSync('edit-buy-date', 'edit-buy-date-picker')
            this.setupDatePickerSync('edit-sell-date', 'edit-sell-date-picker')
            this.setupDatePickerSync('editTradeBuyDate', 'editTradeBuyDatePicker')
            this.setupDatePickerSync('editTradeSellDate', 'editTradeSellDatePicker')
            this.setupDatePickerSync('addTradeBuyDate', 'addTradeBuyDatePicker')
            this.setupDatePickerSync('addTradeSellDate', 'addTradeSellDatePicker')
        }, 300)
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
                        textInput.value = this.convertFromISODate(datePicker.value)
                    }
                })
                
                // When text input changes, update date picker
                textInput.addEventListener('blur', () => {
                    const isoDate = this.convertToISODate(textInput.value)
                    if (isoDate) {
                        datePicker.value = isoDate
                    }
                })
            }
        }, 100)
    }

    updateAnalyticsDisplay(timePeriod = 'all') {
        console.log('🔄 Updating enhanced analytics display for period:', timePeriod)
        
        // Set analytics period for data filtering
        this.analyticsTimePeriod = timePeriod
        
        // Update basic analytics metrics cards
        const analyticsMetrics = this.getAnalyticsMetrics()
        const advancedMetrics = this.getAdvancedAnalytics()
        const trendIndicators = this.getTrendIndicators()
        
        // Update Enhanced Summary Cards
        const totalProfitEl = document.getElementById('analytics-total-profit')
        if (totalProfitEl) {
            const profitClass = analyticsMetrics.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'
            totalProfitEl.textContent = `${analyticsMetrics.totalProfit >= 0 ? '+' : ''}$${this.store.formatNumber(Math.abs(analyticsMetrics.totalProfit))}`
            totalProfitEl.className = `text-xl font-bold ${profitClass}`
        }

        // Update profit trend indicator
        const profitTrendEl = document.getElementById('analytics-total-profit-trend')
        if (profitTrendEl) {
            profitTrendEl.innerHTML = this.renderTrendIndicator(trendIndicators.totalProfitTrend)
        }
        
        const successRateEl = document.getElementById('analytics-success-rate')
        if (successRateEl) {
            successRateEl.textContent = `${analyticsMetrics.successRate}%`
        }

        // Update success rate trend indicator  
        const successRateTrendEl = document.getElementById('analytics-success-rate-trend')
        if (successRateTrendEl) {
            successRateTrendEl.innerHTML = this.renderTrendIndicator(trendIndicators.successRateTrend)
        }
        
        // Update Trading Statistics Cards
        const tradingStats = this.getBasicTradingStats()
        
        const avgProfitEl = document.getElementById('analytics-avg-profit')
        if (avgProfitEl) {
            avgProfitEl.textContent = `$${this.store.formatNumber(tradingStats.avgProfitPerTrade)}`
        }
        
        const bestTradeEl = document.getElementById('analytics-best-trade')
        if (bestTradeEl) {
            bestTradeEl.textContent = `+$${this.store.formatNumber(tradingStats.bestTrade)}`
        }
        
        const totalVolumeEl = document.getElementById('analytics-total-volume')
        if (totalVolumeEl) {
            totalVolumeEl.textContent = `$${this.store.formatNumber(tradingStats.totalVolume)}`
        }
        
        const avgHoldTimeEl = document.getElementById('analytics-avg-hold-time')
        if (avgHoldTimeEl) {
            avgHoldTimeEl.textContent = `${tradingStats.avgHoldTime}`
        }
        
        const worstTradeEl = document.getElementById('analytics-worst-trade')
        if (worstTradeEl) {
            worstTradeEl.textContent = `-$${this.store.formatNumber(Math.abs(tradingStats.worstTrade))}`
        }
        
        const winStreakEl = document.getElementById('analytics-win-streak')
        if (winStreakEl) {
            winStreakEl.textContent = `${advancedMetrics.winStreak}`
        }
        
        // Update Market Intelligence Lists
        const categoryListEl = document.getElementById('category-performance-list')
        if (categoryListEl) {
            categoryListEl.innerHTML = this.generateCategoryPerformanceHTML()
        }
        
        const conditionListEl = document.getElementById('condition-analysis-list')
        if (conditionListEl) {
            conditionListEl.innerHTML = this.generateConditionAnalysisHTML()
        }
        
        const priceRangeListEl = document.getElementById('price-range-list')
        if (priceRangeListEl) {
            priceRangeListEl.innerHTML = this.generatePriceRangeHTML()
        }
        
        const monthlyStatsEl = document.getElementById('monthly-stats-list')
        if (monthlyStatsEl) {
            monthlyStatsEl.innerHTML = this.generateMonthlyStatsHTML()
        }
        
        // Initialize Professional Charts
        this.initializeAnalyticsCharts()
        
        // Re-initialize icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons()
        }
        
        console.log('✅ Enhanced analytics display updated successfully')
    }

    // Chart refresh method for individual chart updates
    refreshSpecificChart(chartType, period) {
        console.log(`🔄 Refreshing ${chartType} chart for period: ${period}`)
        
        // Only refresh if we're on the analytics tab
        if (this.currentTab !== 'analytics') {
            return
        }
        
        switch(chartType) {
            case 'cumulative':
                // Destroy existing chart first
                if (this.chartInstances && this.chartInstances.cumulativePnL) {
                    this.chartInstances.cumulativePnL.destroy()
                    delete this.chartInstances.cumulativePnL
                }
                this.initializeCumulativePnLChart()
                break
            default:
                console.log(`⚠️ Unknown chart type: ${chartType}`)
        }
    }

    // Calculate stats specifically for the trading statistics cards
    calculateTradingStatsForCards() {
        const trades = this.getTradingData()
        
        // Available to Trade: Sum of buy prices for items still in holding (not sold)
        const holdingTrades = trades.filter(t => !t.sellPrice || t.sellPrice === 0)
        const availableToTrade = holdingTrades.reduce((sum, trade) => {
            return sum + (parseFloat(trade.buyPrice) || 0)
        }, 0)
        
        // Total P&L: Only from sold items
        const completedTrades = trades.filter(t => t.sellPrice && t.sellPrice > 0)
        const totalPnL = completedTrades.reduce((sum, trade) => {
            const profit = (parseFloat(trade.sellPrice) || 0) - (parseFloat(trade.buyPrice) || 0)
            return sum + profit
        }, 0)
        
        // Active positions (unsold trades)
        const activePositions = holdingTrades.length
        
        // Win rate calculation
        const profitableTrades = completedTrades.filter(trade => {
            const profit = (parseFloat(trade.sellPrice) || 0) - (parseFloat(trade.buyPrice) || 0)
            return profit > 0
        }).length
        const winRate = completedTrades.length > 0 ? (profitableTrades / completedTrades.length) * 100 : 0
        
        // Calculate realized P&L (same as totalPnL for now, but can be different)
        const realizedPnL = totalPnL
        
        // Calculate time-based gains (7d, 30d, 60d) from sold items - SIMPLE APPROACH
        const today = new Date() // August 4, 2025
        
        // Create cutoff dates using simple date arithmetic
        const date7dAgo = new Date(today)
        date7dAgo.setDate(today.getDate() - 7) // July 28, 2025
        
        const date30dAgo = new Date(today)
        date30dAgo.setDate(today.getDate() - 30) // July 5, 2025
        
        const date60dAgo = new Date(today)
        date60dAgo.setDate(today.getDate() - 60) // June 5, 2025
        
        console.log(`📅 Today: ${today.toLocaleDateString()}`)
        console.log(`📅 7d cutoff: ${date7dAgo.toLocaleDateString()}`)
        console.log(`📅 30d cutoff: ${date30dAgo.toLocaleDateString()}`)
        console.log(`📅 60d cutoff: ${date60dAgo.toLocaleDateString()}`)
        
        // Simple function to check if a sell date is within period
        const isWithinPeriod = (sellDateString, cutoffDate) => {
            if (!sellDateString) return false
            
            // Parse dd/mm/yyyy format: "31/07/2025" -> July 31, 2025
            const parts = sellDateString.split('/')
            if (parts.length !== 3) return false
            
            const day = parseInt(parts[0])
            const month = parseInt(parts[1]) - 1 // JavaScript months are 0-indexed
            const year = parseInt(parts[2])
            
            const sellDate = new Date(year, month, day)
            // Check if sell date is between cutoff date and today (inclusive)
            return sellDate >= cutoffDate && sellDate <= today
        }
        
        // Calculate gains for each period
        let gains = {}
        
        // 7-day gains
        const trades7d = completedTrades.filter(trade => isWithinPeriod(trade.sellDate, date7dAgo))
        const profit7d = trades7d.reduce((sum, trade) => sum + ((parseFloat(trade.sellPrice) || 0) - (parseFloat(trade.buyPrice) || 0)), 0)
        const investment7d = trades7d.reduce((sum, trade) => sum + (parseFloat(trade.buyPrice) || 0), 0)
        
        console.log(`🔵 7d trades:`, trades7d.map(t => `${t.itemName} (${t.sellDate}) = $${((parseFloat(t.sellPrice) || 0) - (parseFloat(t.buyPrice) || 0)).toFixed(2)}`))
        console.log(`💰 7d total: $${profit7d.toFixed(2)}`)
        
        // 30-day gains
        const trades30d = completedTrades.filter(trade => isWithinPeriod(trade.sellDate, date30dAgo))
        const profit30d = trades30d.reduce((sum, trade) => sum + ((parseFloat(trade.sellPrice) || 0) - (parseFloat(trade.buyPrice) || 0)), 0)
        const investment30d = trades30d.reduce((sum, trade) => sum + (parseFloat(trade.buyPrice) || 0), 0)
        
        console.log(`🔵 30d trades:`, trades30d.map(t => `${t.itemName} (${t.sellDate}) = $${((parseFloat(t.sellPrice) || 0) - (parseFloat(t.buyPrice) || 0)).toFixed(2)}`))
        console.log(`💰 30d total: $${profit30d.toFixed(2)}`)
        
        // 60-day gains
        const trades60d = completedTrades.filter(trade => isWithinPeriod(trade.sellDate, date60dAgo))
        const profit60d = trades60d.reduce((sum, trade) => sum + ((parseFloat(trade.sellPrice) || 0) - (parseFloat(trade.buyPrice) || 0)), 0)
        const investment60d = trades60d.reduce((sum, trade) => sum + (parseFloat(trade.buyPrice) || 0), 0)
        
        console.log(`🔵 60d trades:`, trades60d.map(t => `${t.itemName} (${t.sellDate}) = $${((parseFloat(t.sellPrice) || 0) - (parseFloat(t.buyPrice) || 0)).toFixed(2)}`))
        console.log(`💰 60d total: $${profit60d.toFixed(2)}`)
        
        gains = {
            '7d': {
                amount: profit7d,
                percent: investment7d > 0 ? (profit7d / investment7d) * 100 : 0
            },
            '30d': {
                amount: profit30d,
                percent: investment30d > 0 ? (profit30d / investment30d) * 100 : 0
            },
            '60d': {
                amount: profit60d,
                percent: investment60d > 0 ? (profit60d / investment60d) * 100 : 0
            }
        }
        
        // Price changes - placeholder values (would need real market data)
        const priceChanges = {
            price24h: 0, // Would need historical price data
            price7d: 0,  // Would need historical price data  
            price30d: 0  // Would need historical price data
        }
        
        return {
            portfolioValue: availableToTrade, // Now represents "Available to Trade"
            totalPnL,
            activePositions,
            winRate,
            realizedPnL,
            gains,
            priceChanges
        }
    }

    // Update the header metrics with current data
    updateHeaderMetrics() {
        try {
            const stats = this.calculateTradingStatsForCards()
            
            // Update Holdings (Available to Trade)
            const holdingsElement = document.getElementById('portfolio-value')
            if (holdingsElement) {
                holdingsElement.textContent = '$' + this.store.formatNumber(stats.portfolioValue)
            }
            
            // Update Positions count
            const positionsElement = document.getElementById('open-positions')
            if (positionsElement) {
                positionsElement.textContent = stats.activePositions
            }
            
            // Update Today's P&L (calculate from trades sold today)
            const dailyPnlElement = document.getElementById('daily-pnl')
            const dailyPnlPercentElement = document.getElementById('daily-pnl-percent')
            if (dailyPnlElement) {
                const todayData = this.calculateTodayPnL()
                const todayText = (todayData.amount >= 0 ? '+' : '') + '$' + this.store.formatNumber(Math.abs(todayData.amount))
                dailyPnlElement.textContent = todayText
                dailyPnlElement.className = dailyPnlElement.className.replace(/text-(red|green)-400/, '')
                dailyPnlElement.classList.add(todayData.amount >= 0 ? 'text-green-400' : 'text-red-400')
                
                // Update percentage
                if (dailyPnlPercentElement) {
                    const percentText = (todayData.percent >= 0 ? '+' : '') + todayData.percent.toFixed(1) + '%'
                    dailyPnlPercentElement.textContent = percentText
                    dailyPnlPercentElement.className = dailyPnlPercentElement.className.replace(/text-(red|green)-400/, '')
                    dailyPnlPercentElement.classList.add(todayData.amount >= 0 ? 'text-green-400' : 'text-red-400')
                }
            }
            
            
        } catch (error) {
            console.error('❌ Error updating header metrics:', error)
        }
    }

    // Calculate P&L for today specifically (5th August 2025)
    calculateTodayPnL() {
        const trades = this.getTradingData()
        const today = new Date()
        const todayStr = this.formatDateForComparison(today) // e.g., "05/08/2025"
        
        console.log(`📅 Calculating today's P&L for: ${todayStr}`)
        
        let todayPnl = 0
        let todayInvestment = 0
        
        // Find all trades sold today
        const todayTrades = trades.filter(trade => {
            if (!trade.sellDate || !trade.sellPrice) return false
            
            // Direct string comparison - sellDate should already be in DD/MM/YYYY format
            const sellDate = trade.sellDate.trim()
            const isToday = sellDate === todayStr
            
            console.log(`🔍 Checking trade ${trade.itemName}: sellDate="${sellDate}" vs today="${todayStr}" = ${isToday}`)
            
            if (isToday) {
                console.log(`📈 Found today's trade: ${trade.itemName}, sold for $${trade.sellPrice}`)
            }
            
            return isToday
        })
        
        // Calculate total P&L and investment for today's trades
        todayTrades.forEach(trade => {
            const buyPrice = parseFloat(trade.buyPrice) || 0
            const sellPrice = parseFloat(trade.sellPrice) || 0
            const profit = sellPrice - buyPrice
            todayPnl += profit
            todayInvestment += buyPrice
            
            console.log(`💰 ${trade.itemName}: Buy $${buyPrice}, Sell $${sellPrice}, Profit: $${profit.toFixed(2)}`)
        })
        
        // Calculate percentage return
        const todayPercent = todayInvestment > 0 ? (todayPnl / todayInvestment * 100) : 0
        
        console.log(`📊 Total today's P&L: $${todayPnl.toFixed(2)} (${todayPercent.toFixed(1)}%) from ${todayTrades.length} trades`)
        
        return {
            amount: todayPnl,
            percent: todayPercent
        }
    }
    
    // Helper function to format date for comparison (DD/MM/YYYY)
    formatDateForComparison(date) {
        if (!date) return ''
        const day = String(date.getDate()).padStart(2, '0')
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const year = date.getFullYear()
        return `${day}/${month}/${year}`
    }
    
    // Helper function to parse date string (handles DD/MM/YYYY format)
    parseDate(dateString) {
        if (!dateString) return null
        
        // Handle DD/MM/YYYY format
        const parts = dateString.split('/')
        if (parts.length === 3) {
            const day = parseInt(parts[0])
            const month = parseInt(parts[1]) - 1 // Month is 0-indexed
            const year = parseInt(parts[2])
            return new Date(year, month, day)
        }
        
        // Fallback to standard date parsing
        return new Date(dateString)
    }

    // Update the trading statistics cards with current data
    updateTradingStatsCards() {
        try {
            const stats = this.calculateTradingStatsForCards()
        
        // Update Portfolio Value
        const portfolioElement = document.getElementById('tradingPortfolioValue')
        if (portfolioElement) {
            portfolioElement.textContent = '$' + this.store.formatNumber(stats.portfolioValue)
        }
        
        // Update Total P&L with color coding
        const pnlElement = document.getElementById('tradingTotalPnL')
        if (pnlElement) {
            const pnlText = (stats.totalPnL >= 0 ? '+' : '') + '$' + this.store.formatNumber(Math.abs(stats.totalPnL))
            pnlElement.textContent = pnlText
            pnlElement.className = pnlElement.className.replace(/text-(red|green)-400/, '')
            pnlElement.classList.add(stats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400')
        }
        
        // Update Active Positions
        const positionsElement = document.getElementById('tradingActivePositions')
        if (positionsElement) {
            positionsElement.textContent = stats.activePositions.toString()
        }
        
        // Update Win Rate
        const winRateElement = document.getElementById('tradingWinRate')
        if (winRateElement) {
            winRateElement.textContent = stats.winRate.toFixed(1) + '%'
        }
        
        // Update P&L icon based on performance
        const pnlIcon = pnlElement?.previousElementSibling?.previousElementSibling
        if (pnlIcon) {
            pnlIcon.setAttribute('data-lucide', stats.totalPnL >= 0 ? 'trending-up' : 'trending-down')
            if (typeof lucide !== 'undefined') {
                lucide.createIcons()
            }
        }
        
        // Update Price Changes (24h, 7d, 30d)
        const price24hElement = document.getElementById('tradingPrice24h')
        if (price24hElement) {
            const change24h = stats.priceChanges.price24h
            price24hElement.textContent = change24h === 0 ? '--' : (change24h >= 0 ? '+' : '') + change24h.toFixed(1) + '%'
            price24hElement.className = price24hElement.className.replace(/text-(red|green|amber)-400/g, 'text-amber-400')
        }
        
        const price7dElement = document.getElementById('tradingPrice7d')
        if (price7dElement) {
            const change7d = stats.priceChanges.price7d
            price7dElement.textContent = change7d === 0 ? '--' : (change7d >= 0 ? '+' : '') + change7d.toFixed(1) + '%'
            price7dElement.className = price7dElement.className.replace(/text-(red|green|emerald)-400/g, 'text-emerald-400')
        }
        
        const price30dElement = document.getElementById('tradingPrice30d')
        if (price30dElement) {
            const change30d = stats.priceChanges.price30d
            price30dElement.textContent = change30d === 0 ? '--' : (change30d >= 0 ? '+' : '') + change30d.toFixed(1) + '%'
            price30dElement.className = price30dElement.className.replace(/text-(red|green|blue)-400/g, 'text-blue-400')
        }
        
        // Update Realized P&L with color coding
        const realizedPnLElement = document.getElementById('tradingRealizedPnL')
        if (realizedPnLElement) {
            const realizedText = (stats.realizedPnL >= 0 ? '+' : '') + '$' + this.store.formatNumber(Math.abs(stats.realizedPnL))
            realizedPnLElement.textContent = realizedText
            realizedPnLElement.className = realizedPnLElement.className.replace(/text-(red|green|purple)-400/g, '')
            realizedPnLElement.classList.add(stats.realizedPnL >= 0 ? 'text-green-400' : 'text-red-400')
        }
        
        // Update Trading Gains (7d, 30d, 60d) - SIMPLIFIED TO PREVENT CRASHES
        const periods = ['7d', '30d', '60d']
        const colors = ['green', 'blue', 'purple']
        
        periods.forEach((period, index) => {
            try {
                const color = colors[index]
                const gainData = stats.gains && stats.gains[period] ? stats.gains[period] : { amount: 0, percent: 0 }
                
                // Update dollar amount
                const amountElement = document.getElementById('tradingGains' + period)
                if (amountElement) {
                    const amount = gainData.amount || 0
                    const amountText = (amount >= 0 ? '+' : '') + '$' + this.store.formatNumber(Math.abs(amount))
                    amountElement.textContent = amountText
                    // Set color based on profit/loss
                    amountElement.className = 'text-sm font-bold ' + (amount >= 0 ? 'text-green-400' : 'text-red-400')
                }
                
                // Update percentage
                const percentElement = document.getElementById('tradingGains' + period + 'Percent')
                if (percentElement) {
                    const percent = gainData.percent || 0
                    const percentText = (percent >= 0 ? '+' : '') + percent.toFixed(1) + '%'
                    percentElement.textContent = percentText
                    // Set color based on profit/loss
                    percentElement.className = 'text-xs font-semibold ' + (percent >= 0 ? 'text-green-300' : 'text-red-300')
                }
            } catch (error) {
                console.error('Error updating gains for period:', period, error)
            }
        })
        
        // Sync header gains with Trading Activity section - MOVED HERE AFTER ACTIVITY UPDATE
        try {
            const headerGains7d = document.getElementById('header-gains-7d')
            const headerGains30d = document.getElementById('header-gains-30d') 
            const headerGains60d = document.getElementById('header-gains-60d')
            
            const activityGains7d = document.getElementById('tradingGains7d')
            const activityGains30d = document.getElementById('tradingGains30d')
            const activityGains60d = document.getElementById('tradingGains60d')
            
            if (headerGains7d && activityGains7d) {
                headerGains7d.textContent = activityGains7d.textContent
                headerGains7d.className = activityGains7d.className.replace('text-sm font-bold', 'text-green-400 font-medium')
            }
            if (headerGains30d && activityGains30d) {
                headerGains30d.textContent = activityGains30d.textContent
                headerGains30d.className = activityGains30d.className.replace('text-sm font-bold', 'text-green-400 font-medium')
            }
            if (headerGains60d && activityGains60d) {
                headerGains60d.textContent = activityGains60d.textContent
                headerGains60d.className = activityGains60d.className.replace('text-sm font-bold', 'text-green-400 font-medium')
            }
        } catch (error) {
            console.error('Error syncing header gains:', error)
        }
        
        } catch (error) {
            console.error('Error updating trading stats cards:', error)
            // Fail silently to prevent page crash
        }
    }

    // NEW SAFE ADD TRADE METHOD
    safeAddTrade() {
        try {
            console.log('🔥 SAFE ADD TRADE CALLED')
            
            // Get form values with null checks
            const itemNameElement = document.getElementById('itemName')
            const categoryElement = document.getElementById('itemCategory')
            const buyPriceElement = document.getElementById('buyPrice')
            const buyDateElement = document.getElementById('buyDate')
            const sellPriceElement = document.getElementById('sellPrice')
            const sellDateElement = document.getElementById('sellDate')
            
            if (!itemNameElement || !categoryElement || !buyPriceElement || !buyDateElement) {
                alert('Form elements not found. Please refresh the page.')
                return
            }
            
            const itemName = itemNameElement.value?.trim() || ''
            const category = categoryElement.value?.trim() || ''
            const buyPrice = parseFloat(buyPriceElement.value) || 0
            let buyDate = buyDateElement.value?.trim() || ''
            const sellPrice = sellPriceElement?.value ? parseFloat(sellPriceElement.value) : null
            let sellDate = sellDateElement?.value || null
            
            // Dates are already in dd/mm/yyyy format from text inputs
            // No conversion needed
            
            console.log('📝 Form data:', { itemName, category, buyPrice, buyDate, sellPrice, sellDate })
            
            // Validation
            if (!itemName) {
                alert('Please enter an item name')
                return
            }
            
            if (!category) {
                alert('Category is required')
                return
            }
            
            if (!buyPrice || buyPrice <= 0) {
                alert('Please enter a valid buy price')
                return
            }
            
            if (!buyDate) {
                alert('Buy Date is required')
                return
            }

            // Validate date formats
            if (!this.isValidDate(buyDate)) {
                alert('Please enter buy date in dd/mm/yyyy format')
                return
            }

            if (sellDate && !this.isValidDate(sellDate)) {
                alert('Please enter sell date in dd/mm/yyyy format')
                return
            }
            
            // Get existing trades safely
            let trades = []
            try {
                const existing = localStorage.getItem('tradingData')
                trades = existing ? JSON.parse(existing) : []
            } catch (e) {
                console.warn('Could not load existing trades:', e)
                trades = []
            }
            
            // Create new trade object
            const newTrade = {
                itemName: itemName,
                category: category,
                buyPrice: buyPrice,
                buyDate: buyDate,
                sellPrice: sellPrice,
                sellDate: sellDate,
                timestamp: Date.now()
            }
            
            console.log('💾 Adding trade:', newTrade)
            
            // Add to beginning of array
            trades.unshift(newTrade)
            
            // Save safely
            localStorage.setItem('tradingData', JSON.stringify(trades))
            console.log('✅ Trade saved successfully')
            
            // Reset form
            itemNameElement.value = ''
            buyPriceElement.value = ''
            buyDateElement.value = this.getTodayFormatted() // Set to today's date instead of clearing
            if (sellPriceElement) sellPriceElement.value = ''
            if (sellDateElement) sellDateElement.value = ''
            
            // Show success message
            alert('Trade added successfully!')
            
            // Try to refresh the display (but don't crash if it fails)
            try {
                this.refreshPositionsTab()
            } catch (e) {
                console.warn('Could not refresh positions tab:', e)
                // Just reload the page instead
                window.location.reload()
            }
            
        } catch (error) {
            console.error('❌ Error in safeAddTrade:', error)
            alert('Error adding trade: ' + error.message)
        }
    }

    addNewTrade() {
        try {
            console.log('🔄 Adding new trade...')
            
            const itemName = document.getElementById('item-name').value
            const buyPrice = parseFloat(document.getElementById('buy-price').value)
            let buyDate = document.getElementById('buy-date').value
            const sellPrice = document.getElementById('sell-price').value
            const sellDate = document.getElementById('sell-date').value

            console.log('📝 Form data:', { itemName, buyPrice, buyDate, sellPrice, sellDate })

            // Set default buy date to today if not provided
            if (!buyDate) {
                buyDate = this.getTodayFormatted()
            }

            if (!itemName || !buyPrice || !buyDate) {
                alert('Please fill in required fields (Item Name, Buy Price, Buy Date)')
                return
            }

            const trades = this.getTradingData()
            console.log('📊 Current trades count:', trades.length)
            
            // Use unshift to add new trade at the beginning (most recent first)
            trades.unshift({
                itemName,
                buyPrice,
                buyDate,
                sellPrice: sellPrice ? parseFloat(sellPrice) : null,
                sellDate: sellDate || null
            })

            console.log('💾 Saving trade data...')
            this.saveTradingData(trades)
            console.log('✅ Trade added successfully')
            
            // Hide form and reset on success
            document.getElementById('add-trade-form').classList.add('hidden')
            document.getElementById('add-trade-btn').style.display = 'block'
            document.getElementById('new-trade-form').reset()
        } catch (error) {
            console.error('❌ Error adding trade:', error)
            alert('Error adding trade. Please check the console for details.')
        }
    }

    openSellModal(tradeIndex) {
        const trades = this.getTradingData()
        const trade = trades[tradeIndex]
        
        const sellPrice = prompt(`Sell ${trade.itemName}\nBought for: $${trade.buyPrice}\nEnter sell price:`)
        if (sellPrice && !isNaN(parseFloat(sellPrice))) {
            const sellDate = prompt('Enter sell date (DD/MM/YYYY):', this.getTodayFormatted())
            if (sellDate) {
                trades[tradeIndex].sellPrice = parseFloat(sellPrice)
                trades[tradeIndex].sellDate = sellDate
                this.saveTradingData(trades)
            }
        }
    }

    editTrade(tradeIndex) {
        this.currentEditIndex = tradeIndex
        const trades = this.getTradingData()
        const trade = trades[tradeIndex]
        
        // Populate the form with current values
        document.getElementById('edit-item-name').value = trade.itemName
        const categoryElement = document.getElementById('edit-item-category') || document.getElementById('editTradeCategory')
        if (categoryElement) {
            categoryElement.value = trade.category || ''
        }
        document.getElementById('edit-buy-price').value = trade.buyPrice
        document.getElementById('edit-buy-date').value = trade.buyDate
        document.getElementById('edit-sell-price').value = trade.sellPrice || ''
        document.getElementById('edit-sell-date').value = trade.sellDate || ''
        
        // Show the modal
        document.getElementById('edit-trade-modal').classList.remove('hidden')
    }

    closeEditModal() {
        document.getElementById('edit-trade-modal').classList.add('hidden')
        document.getElementById('edit-trade-form').reset()
        this.currentEditIndex = null
    }

    saveEditedTrade() {
        if (this.currentEditIndex === null) return
        
        const itemName = document.getElementById('edit-item-name').value
        const category = document.getElementById('edit-item-category').value || document.getElementById('editTradeCategory').value
        const buyPrice = parseFloat(document.getElementById('edit-buy-price').value)
        let buyDate = document.getElementById('edit-buy-date').value
        const sellPrice = document.getElementById('edit-sell-price').value
        let sellDate = document.getElementById('edit-sell-date').value
        
        // Dates are already in dd/mm/yyyy format from text inputs
        // No conversion needed
        
        if (!itemName || !buyPrice || !buyDate) {
            alert('Please fill in required fields (Item Name, Buy Price, Buy Date)')
            return
        }
        
        const trades = this.getTradingData()
        trades[this.currentEditIndex] = {
            itemName,
            category: category || 'Unknown',
            buyPrice,
            buyDate,
            sellPrice: sellPrice ? parseFloat(sellPrice) : null,
            sellDate: sellDate || null
        }
        
        this.saveTradingData(trades)
        this.closeEditModal()
    }

    deleteTrade(tradeIndex) {
        if (confirm('Are you sure you want to delete this trade?')) {
            const trades = this.getTradingData()
            trades.splice(tradeIndex, 1)
            this.saveTradingData(trades)
        }
    }

    refreshPositionsTab() {
        const tableBody = document.getElementById('trades-table-body')
        if (tableBody) {
            tableBody.innerHTML = this.getTradingTableHTML()
            
            // Refresh Lucide icons after table rendering
            setTimeout(() => {
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons()
                }
                
                // Load pricing data if we're on the positions tab
                if (this.currentTab === 'positions') {
                    this.loadTradingPrices()
                }
            }, 100)
        }
        
        // Update trading stats cards
        this.updateTradingStatsCards()
        this.updateHeaderMetrics()
    }

    initializeFlippingCharts(metrics) {
        setTimeout(() => {
            this.initializePortfolioTimelineChart(metrics)
            this.initializeMonthlyProfitChart(metrics)
            this.initializeROITimelineChart(metrics)
            this.initializeCapitalAllocationChart(metrics)
        }, 500)
    }

    initializePortfolioTimelineChart(metrics) {
        const canvas = document.getElementById('portfolioTimelineCanvas')
        if (!canvas) return
        
        const ctx = canvas.getContext('2d')
        const width = canvas.width = canvas.offsetWidth
        const height = canvas.height = canvas.offsetHeight
        
        const snapshots = metrics.portfolioSnapshots || []
        const startingCapital = metrics.startingCapital
        
        // If no snapshots, create basic starting point
        if (snapshots.length === 0) {
            snapshots.push({
                date: new Date().toISOString().split('T')[0],
                totalPortfolio: startingCapital
            })
        }
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height)
        
        const padding = 40
        const chartWidth = width - padding * 2
        const chartHeight = height - padding * 2
        
        // Calculate value range
        const portfolioValues = snapshots.map(s => s.totalPortfolio)
        const maxValue = Math.max(...portfolioValues, startingCapital)
        const minValue = Math.min(...portfolioValues, startingCapital)
        const valueRange = Math.max(maxValue - minValue, startingCapital * 0.1) // Min 10% range
        
        // Draw baseline (starting capital)
        const baselineY = height - padding - ((startingCapital - minValue) / valueRange) * chartHeight
        ctx.strokeStyle = '#6B7280'
        ctx.setLineDash([5, 5])
        ctx.beginPath()
        ctx.moveTo(padding, baselineY)
        ctx.lineTo(width - padding, baselineY)
        ctx.stroke()
        ctx.setLineDash([])
        
        // Draw portfolio timeline
        if (snapshots.length > 1) {
            ctx.strokeStyle = '#3B82F6'
            ctx.lineWidth = 3
            
            // Create gradient fill
            const gradient = ctx.createLinearGradient(0, padding, 0, height - padding)
            gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)')
            gradient.addColorStop(1, 'rgba(59, 130, 246, 0.05)')
            
            // Draw fill area
            ctx.beginPath()
            snapshots.forEach((snapshot, index) => {
                const x = padding + (index / (snapshots.length - 1)) * chartWidth
                const y = height - padding - ((snapshot.totalPortfolio - minValue) / valueRange) * chartHeight
                
                if (index === 0) {
                    ctx.moveTo(x, y)
                } else {
                    ctx.lineTo(x, y)
                }
            })
            ctx.lineTo(width - padding, height - padding)
            ctx.lineTo(padding, height - padding)
            ctx.closePath()
            ctx.fillStyle = gradient
            ctx.fill()
            
            // Draw line
            ctx.beginPath()
            snapshots.forEach((snapshot, index) => {
                const x = padding + (index / (snapshots.length - 1)) * chartWidth
                const y = height - padding - ((snapshot.totalPortfolio - minValue) / valueRange) * chartHeight
                
                if (index === 0) {
                    ctx.moveTo(x, y)
                } else {
                    ctx.lineTo(x, y)
                }
            })
            ctx.stroke()
            
            // Draw data points
            ctx.fillStyle = '#3B82F6'
            snapshots.forEach((snapshot, index) => {
                const x = padding + (index / (snapshots.length - 1)) * chartWidth
                const y = height - padding - ((snapshot.totalPortfolio - minValue) / valueRange) * chartHeight
                
                ctx.beginPath()
                ctx.arc(x, y, 4, 0, 2 * Math.PI)
                ctx.fill()
            })
        }
    }

    initializeMonthlyProfitChart(metrics) {
        const canvas = document.getElementById('monthlyProfitCanvas')
        if (!canvas) return
        
        const ctx = canvas.getContext('2d')
        const width = canvas.width = canvas.offsetWidth
        const height = canvas.height = canvas.offsetHeight
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height)
        
        // Generate monthly profit data from snapshots
        const monthlyProfits = this.calculateMonthlyProfits(metrics.portfolioSnapshots || [])
        
        if (monthlyProfits.length === 0) {
            // Show "No data" message
            ctx.fillStyle = '#6B7280'
            ctx.font = '14px Arial'
            ctx.textAlign = 'center'
            ctx.fillText('No monthly data available', width / 2, height / 2)
            return
        }
        
        const padding = 40
        const chartWidth = width - padding * 2
        const chartHeight = height - padding * 2
        
        // Calculate value range
        const maxProfit = Math.max(...monthlyProfits.map(m => m.profit), 0)
        const minProfit = Math.min(...monthlyProfits.map(m => m.profit), 0)
        const valueRange = Math.max(maxProfit - minProfit, 100) // Min $100 range
        
        // Draw zero line
        const zeroY = height - padding - ((0 - minProfit) / valueRange) * chartHeight
        ctx.strokeStyle = '#6B7280'
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(padding, zeroY)
        ctx.lineTo(width - padding, zeroY)
        ctx.stroke()
        ctx.setLineDash([])
        
        // Draw bars
        const barWidth = chartWidth / monthlyProfits.length * 0.8
        const barSpacing = chartWidth / monthlyProfits.length * 0.2
        
        monthlyProfits.forEach((monthData, index) => {
            const barX = padding + (index * (barWidth + barSpacing)) + barSpacing / 2
            const barHeight = Math.abs((monthData.profit / valueRange) * chartHeight)
            const barY = monthData.profit >= 0 
                ? zeroY - barHeight
                : zeroY
                
            // Color based on profit/loss
            ctx.fillStyle = monthData.profit >= 0 ? '#10B981' : '#EF4444'
            ctx.fillRect(barX, barY, barWidth, barHeight)
        })
    }
    
    calculateMonthlyProfits(snapshots) {
        if (snapshots.length === 0) return []
        
        // Group snapshots by month
        const monthlyData = new Map()
        
        snapshots.forEach(snapshot => {
            const date = new Date(snapshot.date)
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            
            if (!monthlyData.has(monthKey)) {
                monthlyData.set(monthKey, {
                    month: monthKey,
                    startValue: snapshot.totalPortfolio,
                    endValue: snapshot.totalPortfolio,
                    profit: 0
                })
            }
            
            const data = monthlyData.get(monthKey)
            data.endValue = snapshot.totalPortfolio
            data.profit = data.endValue - data.startValue
        })
        
        return Array.from(monthlyData.values())
    }

    initializeROITimelineChart(metrics) {
        const canvas = document.getElementById('roiTimelineCanvas')
        if (!canvas) return
        
        const ctx = canvas.getContext('2d')
        const width = canvas.width = canvas.offsetWidth
        const height = canvas.height = canvas.offsetHeight
        
        const snapshots = metrics.portfolioSnapshots || []
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height)
        
        if (snapshots.length === 0) {
            ctx.fillStyle = '#6B7280'
            ctx.font = '14px Arial'
            ctx.textAlign = 'center'
            ctx.fillText('No ROI data available', width / 2, height / 2)
            return
        }
        
        const padding = 40
        const chartWidth = width - padding * 2
        const chartHeight = height - padding * 2
        
        // Calculate ROI range
        const roiValues = snapshots.map(s => s.roiPercent || 0)
        const maxROI = Math.max(...roiValues, 5) // Min 5% range
        const minROI = Math.min(...roiValues, -5)
        const roiRange = Math.max(maxROI - minROI, 10)
        
        // Draw zero line
        const zeroY = height - padding - ((0 - minROI) / roiRange) * chartHeight
        ctx.strokeStyle = '#6B7280'
        ctx.setLineDash([5, 5])
        ctx.beginPath()
        ctx.moveTo(padding, zeroY)
        ctx.lineTo(width - padding, zeroY)
        ctx.stroke()
        ctx.setLineDash([])
        
        // Draw ROI line
        ctx.strokeStyle = '#8B5CF6'
        ctx.lineWidth = 3
        
        ctx.beginPath()
        snapshots.forEach((snapshot, index) => {
            const x = padding + (index / (snapshots.length - 1)) * chartWidth
            const y = height - padding - (((snapshot.roiPercent || 0) - minROI) / roiRange) * chartHeight
            
            if (index === 0) {
                ctx.moveTo(x, y)
            } else {
                ctx.lineTo(x, y)
            }
        })
        ctx.stroke()
        
        // Draw data points
        const currentROI = roiValues[roiValues.length - 1] || 0
        const pointColor = currentROI >= 0 ? '#10B981' : '#EF4444'
        
        snapshots.forEach((snapshot, index) => {
            const x = padding + (index / (snapshots.length - 1)) * chartWidth
            const y = height - padding - (((snapshot.roiPercent || 0) - minROI) / roiRange) * chartHeight
            
            ctx.fillStyle = (snapshot.roiPercent || 0) >= 0 ? '#10B981' : '#EF4444'
            ctx.beginPath()
            ctx.arc(x, y, 4, 0, 2 * Math.PI)
            ctx.fill()
        })
    }

    initializeCapitalAllocationChart(metrics) {
        const canvas = document.getElementById('capitalAllocationCanvas')
        if (!canvas) return
        
        const ctx = canvas.getContext('2d')
        const width = canvas.width = canvas.offsetWidth
        const height = canvas.height = canvas.offsetHeight
        
        const snapshots = metrics.portfolioSnapshots || []
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height)
        
        if (snapshots.length === 0) {
            // Show current allocation if no history
            const currentAvailable = metrics.availableCapital || 0
            const currentHoldings = metrics.capitalInUse || 0
            const total = currentAvailable + currentHoldings
            
            if (total > 0) {
                const availableHeight = (currentAvailable / total) * (height - 80)
                const holdingsHeight = (currentHoldings / total) * (height - 80)
                
                // Draw available capital (bottom, green)
                ctx.fillStyle = '#10B981'
                ctx.fillRect(40, height - 40 - availableHeight, width - 80, availableHeight)
                
                // Draw holdings value (top, blue) 
                ctx.fillStyle = '#3B82F6'
                ctx.fillRect(40, height - 40 - availableHeight - holdingsHeight, width - 80, holdingsHeight)
            }
            return
        }
        
        const padding = 40
        const chartWidth = width - padding * 2
        const chartHeight = height - padding * 2
        
        // Find max total portfolio for scaling
        const maxTotal = Math.max(...snapshots.map(s => s.totalPortfolio))
        
        // Draw stacked areas over time
        snapshots.forEach((snapshot, index) => {
            if (index === snapshots.length - 1) return // Skip last point for area drawing
            
            const x1 = padding + (index / (snapshots.length - 1)) * chartWidth
            const x2 = padding + ((index + 1) / (snapshots.length - 1)) * chartWidth
            
            const availableHeight1 = (snapshot.availableCash / maxTotal) * chartHeight
            const holdingsHeight1 = (snapshot.holdingsValue / maxTotal) * chartHeight
            
            const nextSnapshot = snapshots[index + 1]
            const availableHeight2 = (nextSnapshot.availableCash / maxTotal) * chartHeight
            const holdingsHeight2 = (nextSnapshot.holdingsValue / maxTotal) * chartHeight
            
            // Draw available cash area (bottom, green)
            ctx.fillStyle = 'rgba(16, 185, 129, 0.6)'
            ctx.beginPath()
            ctx.moveTo(x1, height - padding)
            ctx.lineTo(x1, height - padding - availableHeight1)
            ctx.lineTo(x2, height - padding - availableHeight2)
            ctx.lineTo(x2, height - padding)
            ctx.closePath()
            ctx.fill()
            
            // Draw holdings area (top, blue)
            ctx.fillStyle = 'rgba(59, 130, 246, 0.6)'
            ctx.beginPath()
            ctx.moveTo(x1, height - padding - availableHeight1)
            ctx.lineTo(x1, height - padding - availableHeight1 - holdingsHeight1)
            ctx.lineTo(x2, height - padding - availableHeight2 - holdingsHeight2)
            ctx.lineTo(x2, height - padding - availableHeight2)
            ctx.closePath()
            ctx.fill()
        })
        
        // Draw border lines
        ctx.strokeStyle = '#10B981'
        ctx.lineWidth = 2
        ctx.beginPath()
        snapshots.forEach((snapshot, index) => {
            const x = padding + (index / (snapshots.length - 1)) * chartWidth
            const y = height - padding - (snapshot.availableCash / maxTotal) * chartHeight
            
            if (index === 0) {
                ctx.moveTo(x, y)
            } else {
                ctx.lineTo(x, y)
            }
        })
        ctx.stroke()
        
        ctx.strokeStyle = '#3B82F6'
        ctx.beginPath()
        snapshots.forEach((snapshot, index) => {
            const x = padding + (index / (snapshots.length - 1)) * chartWidth
            const y = height - padding - ((snapshot.availableCash + snapshot.holdingsValue) / maxTotal) * chartHeight
            
            if (index === 0) {
                ctx.moveTo(x, y)
            } else {
                ctx.lineTo(x, y)
            }
        })
        ctx.stroke()
    }

    switchTab(tabName) {
        console.log(`🔄 Professional tab switch: ${tabName}`)
        
        // Clean up charts from previous tab to prevent overlapping/bleeding
        if (this.currentTab === 'analytics' && tabName !== 'analytics') {
            console.log('🧹 Cleaning up analytics charts...')
            this.destroyAllCharts()
        }
        
        this.currentTab = tabName
        
        // Update tab buttons
        document.querySelectorAll('.trading-tab').forEach(tab => {
            tab.classList.remove('active', 'bg-blue-600', 'text-white')
            tab.classList.add('bg-gray-800', 'text-gray-300')
        })
        
        const activeTab = document.getElementById(`tab-${tabName}`)
        if (activeTab) {
            activeTab.classList.add('active', 'bg-blue-600', 'text-white')
            activeTab.classList.remove('bg-gray-800', 'text-gray-300')
        }

        // Show/hide content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden')
            content.classList.remove('active')
        })
        
        const activeContent = document.getElementById(`content-${tabName}`)
        if (activeContent) {
            activeContent.classList.remove('hidden')
            activeContent.classList.add('active')
        }

        // Initialize tab-specific content
        if (tabName === 'analytics') {
            setTimeout(() => {
                this.updateAnalyticsDisplay('all')
            }, 150) // Small delay to ensure DOM is ready and previous charts are cleaned
        }
        
        if (tabName === 'positions') {
            // Load pricing data when positions tab is opened
            setTimeout(() => {
                this.loadTradingPrices()
                // Re-setup modal event listeners to ensure they work
                this.setupModalEventListeners()
                // Update filter button states
                this.updateStatusFilterButtons()
                this.updateSortButtonText()
                // Initialize buy date with today's date
                this.initializeBuyDate()
            }, 100)
        }
    }

    /**
     * Initialize buy date field with today's date in DD/MM/YYYY format
     */
    initializeBuyDate() {
        const buyDateInput = document.getElementById('buyDate')
        if (buyDateInput && !buyDateInput.value) {
            buyDateInput.value = this.getTodayFormatted()
        }
    }

    getErrorHTML(error) {
        return `
            <div class="error-container p-8 text-center">
                <div class="text-red-400 mb-4">
                    <i data-lucide="alert-circle" class="w-12 h-12 mx-auto mb-4"></i>
                    <h3 class="text-xl font-semibold mb-2">Trading Page Error</h3>
                    <p class="text-gray-400">${error.message}</p>
                </div>
                <button onclick="location.reload()" 
                        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                    Reload Page
                </button>
            </div>
        `
    }

    /**
     * Load pricing data for all trades
     */
    async loadTradingPrices() {
        const trades = this.getFilteredAndSortedTrades() // Use same filtered data as display
        if (trades.length === 0) return

        console.log('📡 Loading prices for trading positions...')

        // Use caching like Investment tab - only clear component cache
        this.priceCache.clear()
        this.pricePromises.clear()

        // Batch fetch prices with caching (like Investment tab)
        const pricePromises = trades.map(async (trade, index) => {
            try {
                console.log(`💰 Fetching prices for: "${trade.itemName}"`)
                
                // Use normal caching behavior like Investment tab
                const prices = await priceService.getItemPrices(trade.itemName)
                
                console.log(`✅ Updated prices for ${trade.itemName}: CSFloat $${prices.csfloatPrice}, Buff163 $${prices.buffPrice}`)
                
                // Update display
                this.updateTradePriceDisplay(index, prices, trade.itemName)
                
            } catch (error) {
                console.error(`❌ Failed to fetch prices for ${trade.itemName}:`, error)
                this.updateTradePriceDisplay(index, { csfloatPrice: null, buffPrice: null }, trade.itemName)
            }
        })

        // Execute all price fetches
        await Promise.allSettled(pricePromises)
        console.log('✅ Trading price fetching completed')
    }

    /**
     * Force refresh all prices (clears cache and refetches)
     */
    async refreshAllTradingPrices() {
        console.log('🔄 Forcing refresh of all trading prices...')
        
        // Clear all caches
        this.priceCache.clear()
        this.pricePromises.clear()
        
        // Clear PriceService cache to force fresh data
        priceService.priceDataCache = null
        priceService.priceCacheTimestamp = null
        
        // Reload prices
        await this.loadTradingPrices()
        
        console.log('✅ Price refresh completed')
    }

    /**
     * Update price display for a specific trade
     */
    updateTradePriceDisplay(tradeIndex, prices, itemName) {
        console.log(`🔄 Updating price display for trade ${tradeIndex} (${itemName}):`, prices)
        
        const csfloatElement = document.getElementById(`csfloat-trade-${tradeIndex}`)
        const buffElement = document.getElementById(`buff-trade-${tradeIndex}`)
        
        console.log(`🔍 Looking for elements: csfloat-trade-${tradeIndex}, buff-trade-${tradeIndex}`)
        
        if (csfloatElement) {
            if (prices.csfloatPrice) {
                const formattedPrice = `$${priceService.formatPrice(prices.csfloatPrice)}`
                console.log(`💰 Setting CSFloat price for ${itemName} (index ${tradeIndex}): ${formattedPrice}`)
                csfloatElement.innerHTML = formattedPrice
                csfloatElement.classList.add('text-green-400')
                csfloatElement.classList.remove('text-emerald-400')
            } else {
                console.log(`❌ No CSFloat price for ${itemName} (index ${tradeIndex})`)
                csfloatElement.innerHTML = '<span class="text-gray-500">N/A</span>'
            }
        } else {
            console.log(`❌ CSFloat element not found for ${itemName}: csfloat-trade-${tradeIndex}`)
        }
        
        if (buffElement) {
            if (prices.buffPrice) {
                const formattedPrice = `$${priceService.formatPrice(prices.buffPrice)}`
                console.log(`💰 Setting Buff163 price for ${itemName} (index ${tradeIndex}): ${formattedPrice}`)
                buffElement.innerHTML = formattedPrice
                buffElement.classList.add('text-green-400')
                buffElement.classList.remove('text-emerald-400')
            } else {
                console.log(`❌ No Buff163 price for ${itemName} (index ${tradeIndex})`)
                buffElement.innerHTML = '<span class="text-gray-500">N/A</span>'
            }
        } else {
            console.log(`❌ Buff163 element not found for ${itemName}: buff-trade-${tradeIndex}`)
        }
    }

    /**
     * Open edit modal for a trade
     */
    editTrade(index) {
        const trades = this.getTradingData()
        const trade = trades[index]
        if (!trade) return

        this.currentEditIndex = index

        // Populate edit form
        document.getElementById('editTradeItemName').value = trade.itemName
        const categoryElement = document.getElementById('editTradeCategory') || document.getElementById('edit-item-category')
        if (categoryElement) {
            categoryElement.value = trade.category || ''
        }
        document.getElementById('editTradeBuyPrice').value = trade.buyPrice
        document.getElementById('editTradeSellPrice').value = trade.sellPrice || ''
        document.getElementById('editTradeBuyDate').value = trade.buyDate || ''
        document.getElementById('editTradeSellDate').value = trade.sellDate || ''

        // Show modal with animation
        const modal = document.getElementById('editTradeModal')
        modal.classList.remove('hidden')
        const modalContent = modal.querySelector('.bg-gray-900')
        modalContent.classList.remove('scale-95')
        modalContent.classList.add('scale-100')
    }

    /**
     * Close edit modal
     */
    closeEditModal() {
        console.log('🚪 Closing edit modal...')
        const modal = document.getElementById('editTradeModal')
        if (!modal) {
            console.log('❌ Edit modal not found')
            return
        }
        
        const modalContent = modal.querySelector('.bg-gray-900')
        if (modalContent) {
            // Animate out
            modalContent.classList.remove('scale-100')
            modalContent.classList.add('scale-95')
        }
        
        // Hide after animation
        setTimeout(() => {
            modal.classList.add('hidden')
            this.currentEditIndex = null
            console.log('✅ Edit modal closed')
        }, 200)
    }

    /**
     * Handle edit form submission
     */
    handleEditSubmit(e) {
        e.preventDefault()
        
        if (this.currentEditIndex === null) return

        const trades = this.getTradingData()
        const categoryElement = document.getElementById('editTradeCategory')
        const category = categoryElement ? categoryElement.value : trades[this.currentEditIndex].category || 'Unknown'
        
        let buyDate = document.getElementById('editTradeBuyDate').value
        let sellDate = document.getElementById('editTradeSellDate').value
        
        // Dates are already in dd/mm/yyyy format from text inputs
        // No conversion needed
        
        const updatedTrade = {
            ...trades[this.currentEditIndex],
            itemName: document.getElementById('editTradeItemName').value.trim(),
            category: category,
            buyPrice: parseFloat(document.getElementById('editTradeBuyPrice').value),
            sellPrice: parseFloat(document.getElementById('editTradeSellPrice').value) || null,
            buyDate: buyDate || '',
            sellDate: sellDate || null
        }

        trades[this.currentEditIndex] = updatedTrade
        this.saveTradingData(trades)
        this.refreshPositionsTab()
        this.closeEditModal()
        this.showNotification('Trade updated successfully!', 'success')
    }

    /**
     * Open sell modal for a trade
     */
    openSellModal(index) {
        const trades = this.getTradingData()
        const trade = trades[index]
        if (!trade) return

        this.currentEditIndex = index

        // Populate sell modal
        document.getElementById('sellTradeItemName').textContent = trade.itemName
        document.getElementById('originalTradeBuyPrice').textContent = trade.buyPrice.toFixed(2)
        document.getElementById('sellTradePrice').value = ''

        // Show modal
        document.getElementById('sellTradeModal').style.display = 'flex'
        
        // Focus on price input
        setTimeout(() => {
            document.getElementById('sellTradePrice').focus()
        }, 100)
    }

    /**
     * Close sell modal
     */
    closeSellModal() {
        console.log('🚪 Closing sell modal...')
        const modal = document.getElementById('sellTradeModal')
        if (modal) {
            modal.style.display = 'none'
            this.currentEditIndex = null
            console.log('✅ Sell modal closed')
        } else {
            console.log('❌ Sell modal not found')
        }
    }

    /**
     * Execute sell transaction
     */
    executeSell() {
        if (this.currentEditIndex === null) return

        const sellPrice = parseFloat(document.getElementById('sellTradePrice').value)
        if (!sellPrice || sellPrice <= 0) {
            this.showNotification('Please enter a valid sell price', 'error')
            return
        }

        const trades = this.getTradingData()
        const trade = trades[this.currentEditIndex]
        
        // Update trade with sell information
        trade.sellPrice = sellPrice
        trade.sellDate = this.getTodayFormatted() // Today's date in dd/mm/yyyy

        this.saveTradingData(trades)
        this.refreshPositionsTab()
        this.closeSellModal()
        
        const profit = sellPrice - trade.buyPrice
        const profitText = profit >= 0 ? `profit of $${profit.toFixed(2)}` : `loss of $${Math.abs(profit).toFixed(2)}`
        this.showNotification(`Trade sold successfully with ${profitText}!`, profit >= 0 ? 'success' : 'warning')
    }

    /**
     * Open delete modal for a trade
     */
    deleteTrade(index) {
        const trades = this.getTradingData()
        const trade = trades[index]
        if (!trade) return

        this.currentEditIndex = index

        // Populate delete modal
        document.getElementById('deleteTradeItemName').textContent = trade.itemName

        // Show modal
        document.getElementById('deleteTradeModal').style.display = 'flex'
    }

    /**
     * Close delete modal
     */
    closeDeleteModal() {
        console.log('🚪 Closing delete modal...')
        const modal = document.getElementById('deleteTradeModal')
        if (modal) {
            modal.style.display = 'none'
            this.currentEditIndex = null
            console.log('✅ Delete modal closed')
        } else {
            console.log('❌ Delete modal not found')
        }
    }

    /**
     * Execute delete transaction
     */
    executeDelete() {
        if (this.currentEditIndex === null) return

        const trades = this.getTradingData()
        const deletedTrade = trades[this.currentEditIndex]
        
        // Remove trade from array
        trades.splice(this.currentEditIndex, 1)
        
        this.saveTradingData(trades)
        this.refreshPositionsTab()
        this.closeDeleteModal()
        this.showNotification(`Trade "${deletedTrade.itemName}" deleted successfully`, 'success')
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div')
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full ${
            type === 'success' ? 'bg-green-600 text-white' :
            type === 'error' ? 'bg-red-600 text-white' :
            type === 'warning' ? 'bg-yellow-600 text-white' :
            'bg-blue-600 text-white'
        }`
        notification.innerHTML = `
            <div class="flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    ${type === 'success' ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>' :
                      type === 'error' ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>' :
                      type === 'warning' ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>' :
                      '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>'}
                </svg>
                <span>${message}</span>
            </div>
        `

        document.body.appendChild(notification)

        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full')
        }, 100)

        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.classList.add('translate-x-full')
            setTimeout(() => {
                document.body.removeChild(notification)
            }, 300)
        }, 3000)
    }

    /**
     * Setup modal event listeners
     */
    setupModalEventListeners() {
        console.log('🔧 Setting up modal event listeners...')
        
        // Remove any existing listeners to prevent duplicates
        this.removeModalEventListeners()
        
        // Edit modal events
        const cancelEditBtn = document.getElementById('cancelTradeEdit')
        if (cancelEditBtn) {
            console.log('✅ Found cancelTradeEdit button')
            cancelEditBtn.addEventListener('click', (e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('🔘 Cancel edit clicked')
                this.closeEditModal()
            })
        } else {
            console.log('❌ cancelTradeEdit button not found')
        }

        const editForm = document.getElementById('editTradeForm')
        if (editForm) {
            console.log('✅ Found editTradeForm')
            editForm.addEventListener('submit', (e) => this.handleEditSubmit(e))
        }

        // Sell modal events
        const cancelSellBtn = document.getElementById('cancelTradeSell')
        if (cancelSellBtn) {
            console.log('✅ Found cancelTradeSell button')
            cancelSellBtn.addEventListener('click', (e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('🔘 Cancel sell clicked')
                this.closeSellModal()
            })
        } else {
            console.log('❌ cancelTradeSell button not found')
        }

        const confirmSellBtn = document.getElementById('confirmTradeSell')
        if (confirmSellBtn) {
            console.log('✅ Found confirmTradeSell button')
            confirmSellBtn.addEventListener('click', (e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('✅ Confirm sell clicked')
                this.executeSell()
            })
        }

        const sellPriceInput = document.getElementById('sellTradePrice')
        if (sellPriceInput) {
            sellPriceInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault()
                    this.executeSell()
                }
            })
        }

        // Delete modal events
        const cancelDeleteBtn = document.getElementById('cancelTradeDelete')
        if (cancelDeleteBtn) {
            console.log('✅ Found cancelTradeDelete button')
            cancelDeleteBtn.addEventListener('click', (e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('🔘 Cancel delete clicked')
                this.closeDeleteModal()
            })
        } else {
            console.log('❌ cancelTradeDelete button not found')
        }

        const confirmDeleteBtn = document.getElementById('confirmTradeDelete')
        if (confirmDeleteBtn) {
            console.log('✅ Found confirmTradeDelete button')
            confirmDeleteBtn.addEventListener('click', (e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('🗑️ Confirm delete clicked')
                this.executeDelete()
            })
        }

        // ESC key support for all modals
        if (!this.escKeyListener) {
            this.escKeyListener = (e) => {
                if (e.key === 'Escape') {
                    console.log('⌨️ ESC key pressed - closing modals')
                    this.closeEditModal()
                    this.closeSellModal()
                    this.closeDeleteModal()
                    this.closeAddTradeModal()
                }
            }
            document.addEventListener('keydown', this.escKeyListener)
        }

        // Click outside to close modals
        const editModal = document.getElementById('editTradeModal')
        if (editModal) {
            editModal.addEventListener('click', (e) => {
                if (e.target === editModal) {
                    console.log('🖱️ Clicked outside edit modal - closing')
                    this.closeEditModal()
                }
            })
        }

        const sellModal = document.getElementById('sellTradeModal')
        if (sellModal) {
            sellModal.addEventListener('click', (e) => {
                if (e.target === sellModal) {
                    console.log('🖱️ Clicked outside sell modal - closing')
                    this.closeSellModal()
                }
            })
        }

        const deleteModal = document.getElementById('deleteTradeModal')
        if (deleteModal) {
            deleteModal.addEventListener('click', (e) => {
                if (e.target === deleteModal) {
                    console.log('🖱️ Clicked outside delete modal - closing')
                    this.closeDeleteModal()
                }
            })
        }

        // Add Trade modal events
        const addTradeForm = document.getElementById('addTradeForm')
        if (addTradeForm) {
            console.log('✅ Found addTradeForm')
            addTradeForm.addEventListener('submit', (e) => this.handleAddTradeSubmit(e))
        }

        const addTradeModal = document.getElementById('addTradeModal')
        if (addTradeModal) {
            addTradeModal.addEventListener('click', (e) => {
                if (e.target === addTradeModal) {
                    console.log('🖱️ Clicked outside add trade modal - closing')
                    this.closeAddTradeModal()
                }
            })
        }
        
        console.log('✅ Modal event listeners setup complete')
    }

    /**
     * Remove modal event listeners to prevent duplicates
     */
    removeModalEventListeners() {
        if (this.escKeyListener) {
            document.removeEventListener('keydown', this.escKeyListener)
            this.escKeyListener = null
        }
    }

    /**
     * Filter trades by status
     */
    selectStatusFilter(status) {
        this.selectedStatusFilter = status
        this.refreshPositionsTab()
        this.updateStatusFilterButtons()
    }

    /**
     * Update status filter button styles
     */
    updateStatusFilterButtons() {
        const allBtn = document.getElementById('statusFilterAll')
        const holdingBtn = document.getElementById('statusFilterHolding')
        const soldBtn = document.getElementById('statusFilterSold')

        console.log('🔘 Updating filter buttons:', {
            selectedFilter: this.selectedStatusFilter,
            buttonsFound: { all: !!allBtn, holding: !!holdingBtn, sold: !!soldBtn }
        })

        // Reset all buttons using classList for better reliability
        const buttons = [allBtn, holdingBtn, soldBtn].filter(btn => btn !== null)
        buttons.forEach(btn => {
            // Remove all styling classes
            btn.classList.remove('bg-blue-600', 'text-white', 'text-gray-400')
            // Add gray styling
            btn.classList.add('text-gray-400')
            console.log('Reset button:', btn.id, 'Classes:', btn.className)
        })

        // Highlight active button
        const activeBtn = this.selectedStatusFilter === null ? allBtn :
                         this.selectedStatusFilter === 'holding' ? holdingBtn : soldBtn
        
        if (activeBtn) {
            // Remove gray styling and add blue styling
            activeBtn.classList.remove('text-gray-400')
            activeBtn.classList.add('bg-blue-600', 'text-white')
            console.log('✅ Set active button:', this.selectedStatusFilter, 'Button:', activeBtn.id, 'Final classes:', activeBtn.className)
        } else {
            console.log('❌ No active button found for filter:', this.selectedStatusFilter)
        }
    }

    /**
     * Get filtered and sorted trades
     */
    getFilteredAndSortedTrades() {
        let trades = this.getTradingData()

        // Apply status filter
        if (this.selectedStatusFilter === 'holding') {
            trades = trades.filter(trade => !trade.sellPrice)
        } else if (this.selectedStatusFilter === 'sold') {
            trades = trades.filter(trade => trade.sellPrice)
        }

        // Apply sorting
        if (this.selectedSortOption) {
            trades = trades.sort((a, b) => {
                switch (this.selectedSortOption) {
                    case 'recent':
                        // If filtering by "sold", sort by sell date; otherwise, sort by buy date
                        if (this.selectedStatusFilter === 'sold') {
                            // For sold items, sort by sell date (most recent sold first)
                            const sellDateA = this.parseDateForSorting(a.sellDate)
                            const sellDateB = this.parseDateForSorting(b.sellDate)
                            return sellDateB - sellDateA
                        } else {
                            // For holding or all items, sort by buy date (most recent bought first)
                            return this.parseDateForSorting(b.buyDate) - this.parseDateForSorting(a.buyDate)
                        }
                    
                    case 'ascending':
                        return a.buyPrice - b.buyPrice
                    
                    case 'descending':
                        return b.buyPrice - a.buyPrice
                    
                    default:
                        // Default sorting behavior
                        if (this.selectedStatusFilter === 'sold') {
                            const sellDateA = this.parseDateForSorting(a.sellDate)
                            const sellDateB = this.parseDateForSorting(b.sellDate)
                            return sellDateB - sellDateA
                        } else {
                            return this.parseDateForSorting(b.buyDate) - this.parseDateForSorting(a.buyDate)
                        }
                }
            })
        }

        return trades
    }

    /**
     * Parse date string in dd/mm/yyyy format for sorting
     */
    parseDateForSorting(dateString) {
        if (!dateString) return new Date(0) // Very old date for undefined dates
        
        // Handle dd/mm/yyyy format
        const parts = dateString.split('/')
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10)
            const month = parseInt(parts[1], 10) - 1 // JavaScript months are 0-indexed
            const year = parseInt(parts[2], 10)
            return new Date(year, month, day)
        }
        
        // Fallback to default Date parsing
        return new Date(dateString)
    }

    /**
     * Toggle sort dropdown visibility
     */
    toggleSortDropdown() {
        const dropdown = document.getElementById('sortDropdown')
        if (dropdown) {
            const isVisible = dropdown.style.display !== 'none'
            dropdown.style.display = isVisible ? 'none' : 'block'
            
            // Close dropdown when clicking outside
            if (!isVisible) {
                setTimeout(() => {
                    document.addEventListener('click', this.closeSortDropdownOutside.bind(this), { once: true })
                }, 100)
            }
        }
    }

    /**
     * Close sort dropdown when clicking outside
     */
    closeSortDropdownOutside(event) {
        const dropdown = document.getElementById('sortDropdown')
        const button = document.getElementById('sortDropdownBtn')
        
        if (dropdown && button && !dropdown.contains(event.target) && !button.contains(event.target)) {
            dropdown.style.display = 'none'
        }
    }

    /**
     * Select sort option
     */
    selectSortOption(option) {
        this.selectedSortOption = option
        this.refreshPositionsTab()
        this.updateSortButtonText()
        
        // Close dropdown
        const dropdown = document.getElementById('sortDropdown')
        if (dropdown) {
            dropdown.style.display = 'none'
        }
    }

    /**
     * Update sort button text
     */
    updateSortButtonText() {
        const buttonText = document.getElementById('sortButtonText')
        if (buttonText) {
            switch (this.selectedSortOption) {
                case 'recent':
                    buttonText.textContent = 'Recent'
                    break
                case 'ascending':
                    buttonText.textContent = 'Low to High'
                    break
                case 'descending':
                    buttonText.textContent = 'High to Low'
                    break
                default:
                    buttonText.textContent = 'Recent'
            }
        }
    }

    /**
     * Open Add Trade Modal
     */
    openAddTradeModal() {
        const modal = document.getElementById('addTradeModal')
        if (modal) {
            modal.classList.remove('hidden')
            const modalContent = modal.querySelector('.bg-gray-900')
            modalContent.classList.remove('scale-95')
            modalContent.classList.add('scale-100')

            // Reset form
            this.resetAddTradeForm()
            
            // Focus on first input
            setTimeout(() => {
                document.getElementById('addTradeItemName')?.focus()
            }, 300)
        }
    }

    /**
     * Close Add Trade Modal
     */
    closeAddTradeModal() {
        const modal = document.getElementById('addTradeModal')
        if (modal) {
            const modalContent = modal.querySelector('.bg-gray-900')
            modalContent.classList.remove('scale-100')
            modalContent.classList.add('scale-95')
            
            setTimeout(() => {
                modal.classList.add('hidden')
            }, 200)
        }
    }

    /**
     * Reset Add Trade Form
     */
    resetAddTradeForm() {
        const form = document.getElementById('addTradeForm')
        if (form) {
            form.reset()
            // Set default buy date to today
            const buyDateInput = document.getElementById('addTradeBuyDate')
            if (buyDateInput) {
                buyDateInput.value = this.getTodayFormatted()
            }
        }
    }

    /**
     * Handle Add Trade Form Submission
     */
    handleAddTradeSubmit(e) {
        e.preventDefault()
        
        const itemName = document.getElementById('addTradeItemName').value.trim()
        const buyPrice = parseFloat(document.getElementById('addTradeBuyPrice').value)
        let buyDate = document.getElementById('addTradeBuyDate').value
        const sellPrice = document.getElementById('addTradeSellPrice').value
        let sellDate = document.getElementById('addTradeSellDate').value

        // Dates are already in dd/mm/yyyy format from text inputs
        if (!buyDate) {
            buyDate = this.getTodayFormatted()
        }

        if (!itemName || !buyPrice || !buyDate) {
            this.showNotification('Please fill in required fields (Item Name, Buy Price, Buy Date)', 'error')
            return
        }

        // Validate date formats
        if (!this.isValidDate(buyDate)) {
            this.showNotification('Please enter buy date in dd/mm/yyyy format', 'error')
            return
        }

        if (sellDate && !this.isValidDate(sellDate)) {
            this.showNotification('Please enter sell date in dd/mm/yyyy format', 'error')
            return
        }

        const trades = this.getTradingData()
        // Use unshift to add new trade at the beginning (most recent first)
        trades.unshift({
            itemName,
            buyPrice,
            buyDate,
            sellPrice: sellPrice ? parseFloat(sellPrice) : null,
            sellDate: sellDate || null
        })

        this.saveTradingData(trades)
        this.closeAddTradeModal()
        this.showNotification('Trade added successfully!', 'success')
    }

    // Cleanup method for when the page is being destroyed
    destroy() {
        console.log('🧹 Destroying Trading page and cleaning up resources...')
        
        // Destroy all charts
        this.destroyAllCharts()
        
        // Clear any timers/intervals if they exist
        if (this.priceUpdateInterval) {
            clearInterval(this.priceUpdateInterval)
        }
        
        // Clear caches
        if (this.priceCache) {
            this.priceCache.clear()
        }
        if (this.pricePromises) {
            this.pricePromises.clear()
        }
        
        // Remove global reference
        if (window.tradingPage === this) {
            delete window.tradingPage
        }
        
        console.log('✅ Trading page cleanup complete')
    }

    /**
     * Export trading data to CSV format
     */
    exportToCsv() {
        const trades = this.getTradingData()
        
        if (!trades || trades.length === 0) {
            this.showNotification('No trading data to export', 'warning')
            return
        }

        const headers = [
            'Item Name',
            'Category',
            'Buy Price',
            'Sell Price',
            'Buy Date',
            'Sell Date',
            'P&L',
            'Return %',
            'Status'
        ]

        const csvData = trades.map(trade => {
            const buyPrice = parseFloat(trade.buyPrice) || 0
            const sellPrice = parseFloat(trade.sellPrice) || 0
            const isSold = trade.sellPrice && trade.sellPrice > 0
            const profit = isSold ? (sellPrice - buyPrice) : 0
            const returnPercent = isSold && buyPrice > 0 ? ((sellPrice - buyPrice) / buyPrice * 100) : 0
            
            return {
                'Item Name': trade.itemName || '',
                'Category': trade.category || 'Unknown',
                'Buy Price': buyPrice,
                'Sell Price': isSold ? sellPrice : '',
                'Buy Date': this.formatDate(trade.buyDate) || '',
                'Sell Date': isSold ? this.formatDate(trade.sellDate) : '',
                'P&L': isSold ? profit.toFixed(2) : '',
                'Return %': isSold ? returnPercent.toFixed(2) : '',
                'Status': isSold ? 'sold' : 'holding'
            }
        })

        // Convert to CSV string
        const csvContent = [
            headers.join(','),
            ...csvData.map(row => 
                headers.map(header => {
                    const value = row[header]
                    // Escape commas and quotes in CSV
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                        return `"${value.replace(/"/g, '""')}"`
                    }
                    return value
                }).join(',')
            )
        ].join('\n')

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `trading-data-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        this.showNotification('CSV export completed successfully', 'success')
    }

    /**
     * Export trading data to Excel format
     */
    exportToExcel() {
        // Check if XLSX library is available
        if (typeof XLSX === 'undefined') {
            this.showNotification('Excel export library not available', 'error')
            return
        }

        const trades = this.getTradingData()
        
        if (!trades || trades.length === 0) {
            this.showNotification('No trading data to export', 'warning')
            return
        }

        const headers = [
            'Item Name',
            'Category',
            'Buy Price',
            'Sell Price',
            'Buy Date',
            'Sell Date',
            'P&L',
            'Return %',
            'Status'
        ]

        const excelData = trades.map(trade => {
            const buyPrice = parseFloat(trade.buyPrice) || 0
            const sellPrice = parseFloat(trade.sellPrice) || 0
            const isSold = trade.sellPrice && trade.sellPrice > 0
            const profit = isSold ? (sellPrice - buyPrice) : 0
            const returnPercent = isSold && buyPrice > 0 ? ((sellPrice - buyPrice) / buyPrice * 100) : 0
            
            return {
                'Item Name': trade.itemName || '',
                'Category': trade.category || 'Unknown',
                'Buy Price': buyPrice,
                'Sell Price': isSold ? sellPrice : '',
                'Buy Date': this.formatDate(trade.buyDate) || '',
                'Sell Date': isSold ? this.formatDate(trade.sellDate) : '',
                'P&L': isSold ? profit : '',
                'Return %': isSold ? returnPercent : '',
                'Status': isSold ? 'sold' : 'holding'
            }
        })

        const worksheet = XLSX.utils.json_to_sheet(excelData)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Trading Data')

        // Auto-size columns
        const colWidths = headers.map(header => {
            const maxLength = Math.max(
                header.length,
                ...excelData.map(row => String(row[header] || '').length)
            )
            return { wch: Math.min(maxLength + 2, 50) }
        })
        worksheet['!cols'] = colWidths

        // Create and download file
        XLSX.writeFile(workbook, `trading-data-${new Date().toISOString().split('T')[0]}.xlsx`)

        this.showNotification('Excel export completed successfully', 'success')
    }

    /**
     * Handle CSV import
     */
    handleImport(e) {
        const file = e.target.files[0]
        if (!file) {
            return
        }

        if (!file.name.toLowerCase().endsWith('.csv')) {
            this.showNotification('Please select a CSV file', 'error')
            return
        }

        const reader = new FileReader()
        reader.onload = (event) => {
            try {
                this.processCSVContent(event.target.result)
            } catch (error) {
                console.error('Error processing CSV:', error)
                this.showNotification('Error processing CSV file', 'error')
            }
        }
        
        reader.readAsText(file)
        
        // Clear the file input so the same file can be selected again
        e.target.value = ''
    }

    /**
     * Process CSV content and import trading data
     */
    processCSVContent(csvContent) {
        const lines = csvContent.split('\n').filter(line => line.trim())
        
        if (lines.length < 2) {
            this.showNotification('CSV file appears to be empty or invalid', 'error')
            return
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
        const expectedHeaders = ['Item Name', 'Category', 'Buy Price', 'Sell Price', 'Buy Date', 'Sell Date', 'P&L', 'Return %', 'Status']
        
        // Check if headers match expected format
        const hasRequiredHeaders = ['Item Name', 'Buy Price', 'Buy Date'].every(header => 
            headers.includes(header)
        )
        
        if (!hasRequiredHeaders) {
            this.showNotification('CSV file missing required headers: Item Name, Buy Price, Buy Date', 'error')
            return
        }

        const importedTrades = []
        let successCount = 0
        let errorCount = 0

        for (let i = 1; i < lines.length; i++) {
            try {
                const values = this.parseCSVLine(lines[i])
                if (values.length < headers.length) continue

                const tradeData = {}
                headers.forEach((header, index) => {
                    tradeData[header] = values[index] || ''
                })

                // Convert to internal format
                const trade = {
                    id: Date.now() + Math.random(),
                    itemName: tradeData['Item Name'] || '',
                    category: tradeData['Category'] || 'Unknown',
                    buyPrice: parseFloat(tradeData['Buy Price']) || 0,
                    sellPrice: tradeData['Sell Price'] ? parseFloat(tradeData['Sell Price']) : null,
                    buyDate: this.parseDate(tradeData['Buy Date']),
                    sellDate: tradeData['Sell Date'] ? this.parseDate(tradeData['Sell Date']) : null,
                    status: tradeData['Status'] || 'holding'
                }

                // Validate required fields
                if (!trade.itemName || !trade.buyPrice || !trade.buyDate) {
                    errorCount++
                    continue
                }

                importedTrades.push(trade)
                successCount++
            } catch (error) {
                console.error('Error parsing line:', lines[i], error)
                errorCount++
            }
        }

        if (importedTrades.length === 0) {
            this.showNotification('No valid trading data found in CSV file', 'error')
            return
        }

        // Get existing trades and merge
        const existingTrades = this.getTradingData()
        const allTrades = [...existingTrades, ...importedTrades]
        
        // Save to localStorage
        localStorage.setItem('tradingData', JSON.stringify(allTrades))
        
        // Refresh the display
        this.refreshPositionsTab()
        this.updateTradingStatsCards()
        this.updateHeaderMetrics()
        
        this.showNotification(`Import completed: ${successCount} trades imported${errorCount > 0 ? `, ${errorCount} errors` : ''}`, 'success')
    }

    /**
     * Parse CSV line handling quoted values
     */
    parseCSVLine(line) {
        const result = []
        let current = ''
        let inQuotes = false
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i]
            const nextChar = line[i + 1]
            
            if (char === '"' && inQuotes && nextChar === '"') {
                current += '"'
                i++ // Skip next quote
            } else if (char === '"') {
                inQuotes = !inQuotes
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim())
                current = ''
            } else {
                current += char
            }
        }
        
        result.push(current.trim())
        return result
    }

    /**
     * Parse date from various formats
     */
    parseDate(dateStr) {
        if (!dateStr) return null
        
        // Handle dd/mm/yyyy format
        if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            return dateStr
        }
        
        // Handle other formats and convert to dd/mm/yyyy
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) {
            return null
        }
        
        const day = String(date.getDate()).padStart(2, '0')
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const year = date.getFullYear()
        
        return `${day}/${month}/${year}`
    }
}
