// ================================================================================================
// CS2 TRADING TRACKER - PROFESSIONAL TRADING PAGE
// ================================================================================================
// Professional-grade trading dashboard inspired by TradingView, Binance, and financial platforms
// Features real-time charts, market heatmaps, advanced analytics, and position management
// ================================================================================================

import { useAppStore } from '../../store.js'

// Components will be loaded dynamically when needed

export class TradingPage {
    constructor() {
        this.store = useAppStore()
        this.charts = {}
        this.currentTab = 'overview'
        this.currentView = 'professional' // professional, compact, mobile
        this.currentEditIndex = null // For tracking which trade is being edited
        
        // Professional trading components
        this.tradingChart = null
        this.marketHeatmap = null
        this.waterfallChart = null
        this.priceUpdateInterval = null
        
        // Real-time data simulation
        this.mockPrices = {
            'AK-47 Redline': 127.45,
            'AWP Dragon Lore': 12450.00,
            'Karambit Fade': 2890.50,
            'M4A4 Howl': 3200.00
        }
    }

    async render(container, params = {}) {
        try {
            const metrics = this.calculateTradingMetrics()
            
            // Add formatNumber method if not available
            if (!this.store.formatNumber) {
                this.store.formatNumber = (num, decimals = 2) => {
                    if (num === null || num === undefined || isNaN(num)) return '0.00'
                    return parseFloat(num).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                }
            }
            
            container.innerHTML = this.getHTML(metrics, this.store)
            
            // Setup event listeners
            this.setupEventListeners()
            
            // Initialize current tab content
            setTimeout(() => {
                this.switchTab(this.currentTab)
            }, 100)
            
            // Initialize icons
            if (typeof lucide !== 'undefined') {
                lucide.createIcons()
            }
            
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
            <div class="professional-trading-dashboard h-full bg-gray-950">
                
                <!-- Top Navigation Bar -->
                <div class="trading-header bg-gray-900 border-b border-gray-700 p-4">
                    <div class="flex items-center justify-between">
                        <!-- Left: Logo and Main Metrics -->
                        <div class="flex items-center gap-6">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                    <i data-lucide="trending-up" class="w-5 h-5 text-white"></i>
                                </div>
                                <h1 class="text-xl font-bold text-white">CS2 Trading Pro</h1>
                                <span class="bg-gradient-to-r from-green-500 to-blue-600 text-white text-xs px-2 py-1 rounded-full">
                                    Live
                                </span>
                            </div>
                            
                            <!-- Real-time Portfolio Metrics -->
                            <div class="flex items-center gap-6 text-sm">
                                <div class="flex items-center gap-2">
                                    <span class="text-gray-400">Portfolio:</span>
                                    <span class="text-white font-semibold" id="portfolio-value">$${this.store.formatNumber(metrics.totalCapital || 0)}</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="text-gray-400">Today:</span>
                                    <span class="text-green-400 font-semibold" id="daily-pnl">+$127.45</span>
                                    <span class="text-green-400 text-xs">+2.31%</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="text-gray-400">Positions:</span>
                                    <span class="text-blue-400 font-semibold" id="open-positions">${metrics.activeHoldings?.length || 0}</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Right: Controls and Settings -->
                        <div class="flex items-center gap-3">
                            <div class="trading-status flex items-center gap-2 bg-green-900/30 px-3 py-1 rounded-lg">
                                <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span class="text-green-400 text-sm">Market Open</span>
                            </div>
                            <button class="layout-toggle bg-gray-800 hover:bg-gray-700 p-2 rounded-lg transition">
                                <i data-lucide="layout-grid" class="w-4 h-4 text-gray-400"></i>
                            </button>
                            <button class="alerts-btn bg-gray-800 hover:bg-gray-700 p-2 rounded-lg transition relative">
                                <i data-lucide="bell" class="w-4 h-4 text-gray-400"></i>
                                <div class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">3</div>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Main Navigation Tabs -->
                <div class="main-navigation bg-gray-900 border-b border-gray-700">
                    <div class="flex">
                        <button id="tab-overview" class="trading-tab active flex-1 px-6 py-3 text-sm font-semibold text-white bg-blue-600 border-r border-gray-600 hover:bg-blue-700 transition">
                            <i data-lucide="pie-chart" class="w-4 h-4 mr-2 inline"></i>
                            Overview
                        </button>
                        <button id="tab-positions" class="trading-tab flex-1 px-6 py-3 text-sm font-semibold text-gray-300 bg-gray-800 hover:bg-gray-700 border-r border-gray-600 transition">
                            <i data-lucide="briefcase" class="w-4 h-4 mr-2 inline"></i>
                            Positions
                        </button>
                        <button id="tab-analytics" class="trading-tab flex-1 px-6 py-3 text-sm font-semibold text-gray-300 bg-gray-800 hover:bg-gray-700 transition">
                            <i data-lucide="bar-chart-3" class="w-4 h-4 mr-2 inline"></i>
                            Analytics
                        </button>
                    </div>
                </div>

                <!-- Main Tab Content Area -->
                <div class="main-content-area flex-1 bg-gray-950 min-h-screen">
                    <!-- Overview Tab Content -->
                    <div id="content-overview" class="tab-content active">
                        <div class="overview-dashboard p-6">
                            <!-- First Row - Basic Metrics -->
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                                <!-- Total Trades -->
                                <div class="stat-card bg-gray-900 border border-gray-700 rounded-xl p-4">
                                    <div class="text-center">
                                        <div class="text-3xl font-bold text-green-400 mb-1">${metrics.totalTrades || 7}</div>
                                        <div class="text-gray-400 text-sm">Total Trades</div>
                                    </div>
                                </div>
                                
                                <!-- Win Rate -->
                                <div class="stat-card bg-gray-900 border border-gray-700 rounded-xl p-4">
                                    <div class="text-center">
                                        <div class="text-3xl font-bold text-green-400 mb-1">${metrics.winRate || '57.14'}%</div>
                                        <div class="text-gray-400 text-sm">Win Rate</div>
                                    </div>
                                </div>
                                
                                <!-- Avg Profit -->
                                <div class="stat-card bg-gray-900 border border-gray-700 rounded-xl p-4">
                                    <div class="text-center">
                                        <div class="text-3xl font-bold text-green-400 mb-1">$${this.store.formatNumber(metrics.avgProfit || 104.54)}</div>
                                        <div class="text-gray-400 text-sm">Avg Profit</div>
                                    </div>
                                </div>
                                
                                <!-- Total Profit -->
                                <div class="stat-card bg-gray-900 border border-gray-700 rounded-xl p-4">
                                    <div class="text-center">
                                        <div class="text-3xl font-bold text-purple-400 mb-1">$${this.store.formatNumber(metrics.totalProfit || 731.81)}</div>
                                        <div class="text-gray-400 text-sm">Total Profit</div>
                                    </div>
                                </div>
                                
                                <!-- Avg Return -->
                                <div class="stat-card bg-gray-900 border border-gray-700 rounded-xl p-4">
                                    <div class="text-center">
                                        <div class="text-3xl font-bold text-green-400 mb-1">${metrics.avgReturn || '7.28'}%</div>
                                        <div class="text-gray-400 text-sm">Avg Return</div>
                                    </div>
                                </div>
                            </div>

                            <!-- Second Row - Advanced Capital Metrics -->
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                <!-- Available Capital -->
                                <div class="stat-card bg-gray-900 border border-gray-700 rounded-xl p-6">
                                    <div class="flex items-center mb-4">
                                        <i data-lucide="dollar-sign" class="w-5 h-5 text-green-400 mr-3"></i>
                                        <div>
                                            <div class="text-2xl font-bold text-white">$${this.store.formatNumber(metrics.availableCapital || 950.00)}</div>
                                            <div class="text-gray-400 text-sm">Available Capital</div>
                                            <div class="text-gray-500 text-xs">Ready for trades</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Capital in Use -->
                                <div class="stat-card bg-gray-900 border border-gray-700 rounded-xl p-6">
                                    <div class="flex items-center mb-4">
                                        <i data-lucide="trending-up" class="w-5 h-5 text-blue-400 mr-3"></i>
                                        <div>
                                            <div class="text-2xl font-bold text-white">$${this.store.formatNumber(metrics.capitalInUse || 22004.06)}</div>
                                            <div class="text-gray-400 text-sm">Capital in Use</div>
                                            <div class="text-gray-500 text-xs">Tied up in holdings</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Capital Efficiency -->
                                <div class="stat-card bg-gray-900 border border-gray-700 rounded-xl p-6">
                                    <div class="flex items-center mb-4">
                                        <i data-lucide="zap" class="w-5 h-5 text-purple-400 mr-3"></i>
                                        <div>
                                            <div class="text-2xl font-bold text-white">${metrics.capitalEfficiency || '0.7'}x</div>
                                            <div class="text-gray-400 text-sm">Capital Efficiency</div>
                                            <div class="text-gray-500 text-xs">Turnover rate</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Risk Exposure -->
                                <div class="stat-card bg-gray-900 border border-gray-700 rounded-xl p-6">
                                    <div class="flex items-center mb-4">
                                        <i data-lucide="shield-alert" class="w-5 h-5 text-orange-400 mr-3"></i>
                                        <div>
                                            <div class="text-2xl font-bold text-white">${metrics.riskExposure || '96'}%</div>
                                            <div class="text-gray-400 text-sm">Risk Exposure</div>
                                            <div class="text-gray-500 text-xs">% of capital at risk</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Third Row - P&L and Performance Metrics -->
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                <!-- Realized P&L -->
                                <div class="stat-card bg-gray-900 border border-gray-700 rounded-xl p-6">
                                    <div class="flex items-center mb-4">
                                        <i data-lucide="check-circle" class="w-5 h-5 text-green-400 mr-3"></i>
                                        <div>
                                            <div class="text-2xl font-bold text-white">$${this.store.formatNumber(metrics.realizedPnL || 731.81)}</div>
                                            <div class="text-gray-400 text-sm">Realized P&L</div>
                                            <div class="text-gray-500 text-xs">Completed trades</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Unrealized P&L -->
                                <div class="stat-card bg-gray-900 border border-gray-700 rounded-xl p-6">
                                    <div class="flex items-center mb-4">
                                        <i data-lucide="clock" class="w-5 h-5 text-yellow-400 mr-3"></i>
                                        <div>
                                            <div class="text-2xl font-bold text-white">$${this.store.formatNumber(metrics.unrealizedPnL || 1100.20)}</div>
                                            <div class="text-gray-400 text-sm">Unrealized P&L</div>
                                            <div class="text-gray-500 text-xs">Paper profits</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Trading Velocity -->
                                <div class="stat-card bg-gray-900 border border-gray-700 rounded-xl p-6">
                                    <div class="flex items-center mb-4">
                                        <i data-lucide="activity" class="w-5 h-5 text-blue-400 mr-3"></i>
                                        <div>
                                            <div class="text-2xl font-bold text-white">${metrics.tradingVelocity || '1.4'}</div>
                                            <div class="text-gray-400 text-sm">Trading Velocity</div>
                                            <div class="text-gray-500 text-xs">Trades per month</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Profit Factor -->
                                <div class="stat-card bg-gray-900 border border-gray-700 rounded-xl p-6">
                                    <div class="flex items-center mb-4">
                                        <i data-lucide="trending-up" class="w-5 h-5 text-purple-400 mr-3"></i>
                                        <div>
                                            <div class="text-2xl font-bold text-white">${this.store.formatNumber(metrics.profitFactor || 999.0)}</div>
                                            <div class="text-gray-400 text-sm">Profit Factor</div>
                                            <div class="text-gray-500 text-xs">Win/loss ratio</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Recent Activity -->
                            <div class="bg-gray-900 border border-gray-700 rounded-xl p-6">
                                <h3 class="text-white font-semibold mb-4">Recent Activity</h3>
                                <div class="space-y-3">
                                    <div class="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                                        <div class="flex items-center gap-3">
                                            <div class="w-2 h-2 bg-green-400 rounded-full"></div>
                                            <span class="text-white">AK-47 Redline</span>
                                            <span class="text-gray-400 text-sm">Purchased</span>
                                        </div>
                                        <span class="text-green-400">+$12.50</span>
                                    </div>
                                    <div class="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                                        <div class="flex items-center gap-3">
                                            <div class="w-2 h-2 bg-red-400 rounded-full"></div>
                                            <span class="text-white">AWP Dragon Lore</span>
                                            <span class="text-gray-400 text-sm">Sold</span>
                                        </div>
                                        <span class="text-red-400">-$250.00</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Positions Tab Content -->
                    <div id="content-positions" class="tab-content hidden">
                        <div class="positions-dashboard p-6">
                            <div class="flex items-center justify-between mb-6">
                                <h2 class="text-2xl font-bold text-white">Trading History</h2>
                                <button id="add-trade-btn" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition">
                                    <i data-lucide="plus" class="w-4 h-4 mr-2 inline"></i>
                                    Add Trade
                                </button>
                            </div>
                            
                            <!-- Add New Trade Form -->
                            <div id="add-trade-form" class="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-6 hidden">
                                <h3 class="text-white font-semibold mb-4">Add New Trade</h3>
                                <form id="new-trade-form" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                    <div>
                                        <label class="block text-gray-400 text-sm mb-2">Item Name</label>
                                        <input type="text" id="item-name" class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none" placeholder="AK-47 | Redline (FT)" required>
                                    </div>
                                    <div>
                                        <label class="block text-gray-400 text-sm mb-2">Buy Price</label>
                                        <input type="number" id="buy-price" class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none" placeholder="0.00" step="0.01" required>
                                    </div>
                                    <div>
                                        <label class="block text-gray-400 text-sm mb-2">Buy Date</label>
                                        <input type="date" id="buy-date" class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none" required>
                                    </div>
                                    <div>
                                        <label class="block text-gray-400 text-sm mb-2">Sell Price <span class="text-gray-500">(Optional)</span></label>
                                        <input type="number" id="sell-price" class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none" placeholder="0.00" step="0.01">
                                    </div>
                                    <div>
                                        <label class="block text-gray-400 text-sm mb-2">Sell Date <span class="text-gray-500">(Optional)</span></label>
                                        <input type="date" id="sell-date" class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none">
                                    </div>
                                    <div class="md:col-span-2 lg:col-span-5 flex gap-3">
                                        <button type="submit" class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition">
                                            <i data-lucide="plus" class="w-4 h-4 mr-2 inline"></i>
                                            Add Trade
                                        </button>
                                        <button type="button" id="cancel-add-trade" class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition">
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                            
                            <!-- Trading Table -->
                            <div class="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
                                <div class="p-4 border-b border-gray-700">
                                    <div class="grid grid-cols-9 gap-4 text-gray-400 text-sm font-medium">
                                        <div>Item Name</div>
                                        <div>Buy Price</div>
                                        <div>Buy Date</div>
                                        <div>Sell Price</div>
                                        <div>Sell Date</div>
                                        <div>Profit</div>
                                        <div>Return %</div>
                                        <div>Status</div>
                                        <div>Actions</div>
                                    </div>
                                </div>
                                <div id="trades-table-body" class="divide-y divide-gray-700">
                                    ${this.getTradingTableHTML()}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Analytics Tab Content -->
                    <div id="content-analytics" class="tab-content hidden">
                        <div class="analytics-dashboard p-6">
                            <div class="flex items-center justify-between mb-6">
                                <h2 class="text-2xl font-bold text-white">Trading Performance Analytics</h2>
                                <div class="flex gap-3 items-center">
                                    <div class="flex items-center gap-2">
                                        <span class="text-gray-400 text-sm">Flipping Performance Analytics</span>
                                    </div>
                                    <select id="time-period" class="bg-gray-800 text-white px-3 py-2 rounded border border-gray-600">
                                        <option value="7d">Last 7 days</option>
                                        <option value="30d">Last 30 days</option>
                                        <option value="90d">Last 3 months</option>
                                        <option value="all">All Time</option>
                                    </select>
                                </div>
                            </div>
                            
                            <!-- Performance Summary Cards -->
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                <div class="bg-gray-900 border border-gray-700 rounded-xl p-4">
                                    <div class="flex items-center justify-between mb-2">
                                        <h3 class="text-gray-400 text-sm">Starting Capital</h3>
                                        <i data-lucide="dollar-sign" class="w-4 h-4 text-gray-400"></i>
                                    </div>
                                    <div id="starting-capital-display" class="text-xl font-bold text-white">$${this.store.formatNumber(this.getStartingCapital())}</div>
                                    <div class="text-gray-500 text-xs">Auto-calculated from first trade</div>
                                </div>
                                
                                <div class="bg-gray-900 border border-gray-700 rounded-xl p-4">
                                    <div class="flex items-center justify-between mb-2">
                                        <h3 class="text-gray-400 text-sm">Current Portfolio</h3>
                                        <i data-lucide="trending-up" class="w-4 h-4 text-blue-400"></i>
                                    </div>
                                    <div id="current-portfolio-display" class="text-xl font-bold text-white">$12,000</div>
                                    <div class="text-gray-500 text-xs">Cash + Holdings</div>
                                </div>
                                
                                <div class="bg-gray-900 border border-gray-700 rounded-xl p-4">
                                    <div class="flex items-center justify-between mb-2">
                                        <h3 class="text-gray-400 text-sm">Total Return</h3>
                                        <i data-lucide="arrow-up" class="w-4 h-4 text-green-400"></i>
                                    </div>
                                    <div id="total-return-display" class="text-xl font-bold text-green-400">+$2,000</div>
                                    <div id="total-return-percent" class="text-green-400 text-xs">+20.0%</div>
                                </div>
                                
                                <div class="bg-gray-900 border border-gray-700 rounded-xl p-4">
                                    <div class="flex items-center justify-between mb-2">
                                        <h3 class="text-gray-400 text-sm">Monthly Avg</h3>
                                        <i data-lucide="calendar" class="w-4 h-4 text-purple-400"></i>
                                    </div>
                                    <div id="monthly-avg-display" class="text-xl font-bold text-white">+3.2%</div>
                                    <div class="text-gray-500 text-xs">Average monthly return</div>
                                </div>
                            </div>
                            
                            <!-- Financial Performance Charts -->
                            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                                <!-- Portfolio Value Timeline -->
                                <div class="bg-gray-900 border border-gray-700 rounded-xl p-6">
                                    <div class="flex items-center justify-between mb-4">
                                        <h3 class="text-white font-semibold">Portfolio Value Timeline</h3>
                                        <div class="flex items-center gap-2">
                                            <i data-lucide="trending-up" class="w-4 h-4 text-green-400"></i>
                                            <span class="text-green-400 text-sm">+20.0%</span>
                                        </div>
                                    </div>
                                    <div id="portfolio-timeline-chart" class="h-64">
                                        <canvas id="portfolioTimelineCanvas" class="w-full h-full"></canvas>
                                    </div>
                                    <div class="flex justify-center mt-4 gap-4">
                                        <div class="flex items-center">
                                            <div class="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                                            <span class="text-sm text-gray-400">Total Portfolio Value</span>
                                        </div>
                                        <div class="flex items-center">
                                            <div class="w-3 h-3 bg-gray-500 rounded-full mr-2"></div>
                                            <span class="text-sm text-gray-400">Starting Capital</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Monthly Net Profit -->
                                <div class="bg-gray-900 border border-gray-700 rounded-xl p-6">
                                    <h3 class="text-white font-semibold mb-4">Monthly Net Profit</h3>
                                    <div id="monthly-profit-chart" class="h-64">
                                        <canvas id="monthlyProfitCanvas" class="w-full h-full"></canvas>
                                    </div>
                                    <div class="flex justify-center mt-4 gap-4">
                                        <div class="flex items-center">
                                            <div class="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                                            <span class="text-sm text-gray-400">Profitable Months</span>
                                        </div>
                                        <div class="flex items-center">
                                            <div class="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                                            <span class="text-sm text-gray-400">Loss Months</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Advanced Performance Charts -->
                            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <!-- ROI Percentage Over Time -->
                                <div class="bg-gray-900 border border-gray-700 rounded-xl p-6">
                                    <h3 class="text-white font-semibold mb-4">ROI Percentage Over Time</h3>
                                    <div id="roi-timeline-chart" class="h-64">
                                        <canvas id="roiTimelineCanvas" class="w-full h-full"></canvas>
                                    </div>
                                    <div class="flex justify-center mt-4 gap-4">
                                        <div class="flex items-center">
                                            <div class="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                                            <span class="text-sm text-gray-400">Cumulative ROI %</span>
                                        </div>
                                        <div class="flex items-center">
                                            <div class="w-3 h-3 bg-gray-500 rounded-full mr-2"></div>
                                            <span class="text-sm text-gray-400">0% Baseline</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Capital Allocation Flow -->
                                <div class="bg-gray-900 border border-gray-700 rounded-xl p-6">
                                    <h3 class="text-white font-semibold mb-4">Capital Allocation Over Time</h3>
                                    <div id="capital-allocation-chart" class="h-64">
                                        <canvas id="capitalAllocationCanvas" class="w-full h-full"></canvas>
                                    </div>
                                    <div class="flex justify-center mt-4 gap-4">
                                        <div class="flex items-center">
                                            <div class="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                                            <span class="text-sm text-gray-400">Available Cash</span>
                                        </div>
                                        <div class="flex items-center">
                                            <div class="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                                            <span class="text-sm text-gray-400">Holdings Value</span>
                                        </div>
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
                                <div>
                                    <label class="block text-gray-400 text-sm mb-2">Buy Price</label>
                                    <input type="number" id="edit-buy-price" class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none" step="0.01" required>
                                </div>
                                <div>
                                    <label class="block text-gray-400 text-sm mb-2">Buy Date</label>
                                    <input type="date" id="edit-buy-date" class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none" required>
                                </div>
                                <div>
                                    <label class="block text-gray-400 text-sm mb-2">Sell Price <span class="text-gray-500">(Optional)</span></label>
                                    <input type="number" id="edit-sell-price" class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none" step="0.01" placeholder="Leave empty if not sold">
                                </div>
                                <div>
                                    <label class="block text-gray-400 text-sm mb-2">Sell Date <span class="text-gray-500">(Optional)</span></label>
                                    <input type="date" id="edit-sell-date" class="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none">
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
        `
    }

    getTradingTableHTML() {
        const trades = this.getTradingData()
        if (trades.length === 0) {
            return `
                <div class="p-8 text-center text-gray-400">
                    <i data-lucide="inbox" class="w-12 h-12 mx-auto mb-4"></i>
                    <p class="text-lg mb-2">No trades yet</p>
                    <p class="text-sm">Click "Add Trade" to start tracking your CS2 skin trades</p>
                </div>
            `
        }
        
        return trades.map((trade, index) => {
            const profit = trade.sellPrice ? (trade.sellPrice - trade.buyPrice) : 0
            const returnPercent = trade.sellPrice ? ((trade.sellPrice - trade.buyPrice) / trade.buyPrice * 100) : 0
            const status = trade.sellPrice ? 'sold' : 'holding'
            
            return `
                <div class="p-4 hover:bg-gray-800 transition">
                    <div class="grid grid-cols-9 gap-4 items-center">
                        <div class="text-white font-medium">${trade.itemName}</div>
                        <div class="text-white">$${this.store.formatNumber(trade.buyPrice)}</div>
                        <div class="text-gray-400">${trade.buyDate}</div>
                        <div class="text-white">${trade.sellPrice ? '$' + this.store.formatNumber(trade.sellPrice) : '-'}</div>
                        <div class="text-gray-400">${trade.sellDate || '-'}</div>
                        <div class="text-${profit >= 0 ? 'green' : 'red'}-400 font-semibold">
                            ${trade.sellPrice ? (profit >= 0 ? '+' : '') + '$' + this.store.formatNumber(profit) : '-'}
                        </div>
                        <div class="text-${returnPercent >= 0 ? 'green' : 'red'}-400 font-semibold">
                            ${trade.sellPrice ? (returnPercent >= 0 ? '+' : '') + this.store.formatNumber(returnPercent) + '%' : '-'}
                        </div>
                        <div>
                            <span class="px-2 py-1 rounded-full text-xs font-medium ${
                                status === 'sold' 
                                    ? 'bg-green-900 text-green-400 border border-green-700' 
                                    : 'bg-blue-900 text-blue-400 border border-blue-700'
                            }">
                                ${status === 'sold' ? 'Sold' : 'Holding'}
                            </span>
                        </div>
                        <div class="flex gap-2">
                            ${status === 'holding' ? `
                                <button onclick="window.tradingPage?.openSellModal(${index})" class="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs transition">
                                    <i data-lucide="trending-up" class="w-3 h-3 mr-1 inline"></i>
                                    Sell
                                </button>
                            ` : ''}
                            <button onclick="window.tradingPage?.editTrade(${index})" class="text-blue-400 hover:text-blue-300 transition">
                                <i data-lucide="edit" class="w-4 h-4"></i>
                            </button>
                            <button onclick="window.tradingPage?.deleteTrade(${index})" class="text-red-400 hover:text-red-300 transition">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `
        }).join('')
    }

    getTradingData() {
        // Get trading data from localStorage or return sample data
        const savedTrades = localStorage.getItem('tradingData')
        if (savedTrades) {
            return JSON.parse(savedTrades)
        }
        
        // Sample data for demonstration
        return [
            {
                itemName: 'AK-47 | Redline (FT)',
                buyPrice: 127.45,
                buyDate: '2024-07-15',
                sellPrice: 145.20,
                sellDate: '2024-07-20',
            },
            {
                itemName: 'AWP | Dragon Lore (FN)',
                buyPrice: 12450.00,
                buyDate: '2024-07-18',
                sellPrice: null,
                sellDate: null,
            },
            {
                itemName: 'Karambit | Fade (FN)',
                buyPrice: 2890.50,
                buyDate: '2024-07-22',
                sellPrice: 3120.00,
                sellDate: '2024-07-25',
            }
        ]
    }

    saveTradingData(trades) {
        localStorage.setItem('tradingData', JSON.stringify(trades))
        this.refreshPositionsTab()
        
        // Always update analytics display since starting capital might have changed
        this.updateAnalyticsDisplay()
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
        const sortedTrades = [...trades].sort((a, b) => new Date(a.buyDate) - new Date(b.buyDate))
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
        const sortedTrades = [...trades].sort((a, b) => new Date(a.buyDate) - new Date(b.buyDate))
        
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
        events.sort((a, b) => new Date(a.date) - new Date(b.date))
        
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

            // Analytics controls
            const timePeriodSelect = document.getElementById('time-period')

            if (timePeriodSelect) {
                timePeriodSelect.addEventListener('change', (e) => {
                    this.updateAnalyticsDisplay(e.target.value)
                })
            }
        }, 300)
    }

    updateAnalyticsDisplay(timePeriod = 'all') {
        const metrics = this.calculateTradingMetrics()
        
        // Update summary cards
        const startingCapitalElement = document.getElementById('starting-capital-display')
        if (startingCapitalElement) {
            startingCapitalElement.textContent = '$' + this.store.formatNumber(metrics.startingCapital)
        }
        document.getElementById('current-portfolio-display').textContent = 
            '$' + this.store.formatNumber(metrics.currentPortfolio)
        
        const totalReturn = metrics.totalReturn
        const totalReturnPercent = metrics.roiPercent
        
        document.getElementById('total-return-display').textContent = 
            (totalReturn >= 0 ? '+' : '') + '$' + this.store.formatNumber(Math.abs(totalReturn))
        document.getElementById('total-return-percent').textContent = 
            (totalReturnPercent >= 0 ? '+' : '') + totalReturnPercent.toFixed(1) + '%'
        document.getElementById('monthly-avg-display').textContent = 
            (metrics.monthlyAvgReturn >= 0 ? '+' : '') + metrics.monthlyAvgReturn.toFixed(1) + '%'
        
        // Update colors based on performance
        const returnDisplays = ['total-return-display', 'total-return-percent']
        const colorClass = totalReturn >= 0 ? 'text-green-400' : 'text-red-400'
        returnDisplays.forEach(id => {
            const element = document.getElementById(id)
            if (element) {
                element.className = element.className.replace(/text-(red|green)-400/, colorClass)
            }
        })
        
        // Refresh charts if analytics tab is active
        if (this.currentTab === 'analytics') {
            this.initializeFlippingCharts(metrics)
        }
    }

    addNewTrade() {
        const itemName = document.getElementById('item-name').value
        const buyPrice = parseFloat(document.getElementById('buy-price').value)
        const buyDate = document.getElementById('buy-date').value
        const sellPrice = document.getElementById('sell-price').value
        const sellDate = document.getElementById('sell-date').value

        if (!itemName || !buyPrice || !buyDate) {
            alert('Please fill in required fields (Item Name, Buy Price, Buy Date)')
            return
        }

        const trades = this.getTradingData()
        trades.push({
            itemName,
            buyPrice,
            buyDate,
            sellPrice: sellPrice ? parseFloat(sellPrice) : null,
            sellDate: sellDate || null
        })

        this.saveTradingData(trades)
        
        // Hide form and reset
        document.getElementById('add-trade-form').classList.add('hidden')
        document.getElementById('add-trade-btn').style.display = 'block'
        document.getElementById('new-trade-form').reset()
    }

    openSellModal(tradeIndex) {
        const trades = this.getTradingData()
        const trade = trades[tradeIndex]
        
        const sellPrice = prompt(`Sell ${trade.itemName}\nBought for: $${trade.buyPrice}\nEnter sell price:`)
        if (sellPrice && !isNaN(parseFloat(sellPrice))) {
            const sellDate = prompt('Enter sell date (YYYY-MM-DD):', new Date().toISOString().split('T')[0])
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
        const buyPrice = parseFloat(document.getElementById('edit-buy-price').value)
        const buyDate = document.getElementById('edit-buy-date').value
        const sellPrice = document.getElementById('edit-sell-price').value
        const sellDate = document.getElementById('edit-sell-date').value
        
        if (!itemName || !buyPrice || !buyDate) {
            alert('Please fill in required fields (Item Name, Buy Price, Buy Date)')
            return
        }
        
        const trades = this.getTradingData()
        trades[this.currentEditIndex] = {
            itemName,
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
        }
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
            this.updateAnalyticsDisplay()
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
}
