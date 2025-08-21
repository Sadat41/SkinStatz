// ================================================================================================
// CS2 TRADING TRACKER - INVESTMENTS PAGE
// ================================================================================================
// Professional Investment Management System
// Features: Portfolio tracking, Performance analytics, Category management, Price monitoring
// ================================================================================================

import { useAppStore } from '../../store.js'
import { ChartComponent } from '../../components/Chart.js'
import { priceService } from '../../services/PriceService.js'

export class InvestmentsPage {
    constructor() {
        this.store = useAppStore
        this.charts = {}
        this.editingInvestment = null
        this.editingLongTermInvestment = null
        this.selectedCategoryId = null
        this.selectedStatusFilter = 'holding' // null = all, 'holding', 'sold'
        this.selectedSortOption = 'recent' // 'recent', 'ascending', 'descending'
        this.priceCache = new Map()
        this.pricePromises = new Map()
        this.isSelectMode = false
        this.selectedInvestments = new Set()
    }

    async render(container, params = {}) {
        try {
            const state = this.store()
            const metrics = state.calculateTradingMetrics()
            
            container.innerHTML = this.getHTML(metrics, state)
            window.investmentsPage = this
            
            setTimeout(() => {
                try {
                    this.setupEventListeners()
                    this.initializeInvestmentForm()
                    this.renderLongTermInvestments()
                    this.renderCategoryTabs()
                    this.updateStatusFilterButtons()
                    this.updateSortButtonText()
                    this.updateMetrics()
                    this.initializeHoldingsChart()
                    
                    // Fix any corrupted dates on page load
                    setTimeout(() => {
                        this.fixCorruptedDates()
                    }, 1000)
                    
                    console.log('💼 Investments page initialized')
                } catch (initError) {
                    console.error('❌ Failed to initialize investments page:', initError)
                }
            }, 0)
            
            if (typeof lucide !== 'undefined') {
                lucide.createIcons()
            }
            
        } catch (error) {
            console.error('❌ Failed to render investments page:', error)
            container.innerHTML = this.getErrorHTML(error)
        }
    }

    getHTML(metrics, state) {
        return `
            <div class="professional-investment-dashboard h-full bg-gray-950">
                <!-- Top Navigation Bar -->
                <div class="investment-header bg-gray-900 border-b border-gray-700 p-4 mb-6">
                    <div class="flex items-center justify-between">
                        <!-- Left: Logo and Main Metrics -->
                        <div class="flex items-center gap-6">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                                    <i data-lucide="trending-up" class="w-5 h-5 text-white"></i>
                                </div>
                                <h1 class="text-xl font-bold text-white">Investment Portfolio</h1>
                                <span class="bg-gradient-to-r from-green-500 to-blue-600 text-white text-xs px-2 py-1 rounded-full">
                                    Live Tracking
                                </span>
                            </div>
                            
                            <div class="flex items-center gap-6 text-sm">
                                <div class="flex items-center gap-2">
                                    <span class="text-gray-400">Holdings:</span>
                                    <span class="text-white font-semibold" id="header-total-items">0</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="text-gray-400">Value:</span>
                                    <span class="text-green-400 font-semibold" id="header-holding-value">$0.00</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="text-gray-400">Realized P&L:</span>
                                    <span class="text-purple-400 font-semibold" id="header-realized-pnl">$0.00</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="flex items-center gap-3">
                            <div class="investment-status flex items-center gap-2 bg-green-900/30 px-3 py-1 rounded-lg">
                                <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span class="text-green-400 text-sm">Portfolio Active</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="investments-dashboard p-6">
                    <!-- Add New Investment Form -->
                    <section class="bg-gray-900 border border-gray-700 rounded-xl p-8 mb-8 shadow-2xl">
                    <div class="flex items-center justify-between mb-8">
                        <div class="flex items-center gap-3">
                            <div class="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                                <i data-lucide="plus-circle" class="w-6 h-6 text-white"></i>
                            </div>
                            <div>
                                <h2 class="text-white font-bold text-xl">Add New Investment</h2>
                                <p class="text-gray-400 text-sm">Track your CS2 investments with precision</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Investment Form -->
                    <form id="investmentForm">
                        <!-- Row 1: Item Name, Category, Quantity -->
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <!-- Item Name -->
                            <div class="group">
                                <label class="block text-gray-300 text-sm font-medium mb-3 flex items-center gap-2">
                                    <i data-lucide="tag" class="w-4 h-4 text-purple-400"></i>
                                    Item Name
                                </label>
                                <div class="relative">
                                    <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 p-0.5 opacity-60 group-focus-within:opacity-100 transition-opacity duration-300">
                                        <div class="w-full h-full bg-gray-900 rounded-xl"></div>
                                    </div>
                                    <input type="text" id="itemName" placeholder="AK-47 | Redline (FT)" 
                                        class="relative z-10 w-full bg-transparent text-white px-4 py-3 rounded-xl focus:outline-none transition-colors duration-200" required>
                                </div>
                            </div>

                            <!-- Category -->
                            <div class="group">
                                <label class="block text-gray-300 text-sm font-medium mb-3 flex items-center gap-2">
                                    <i data-lucide="folder" class="w-4 h-4 text-blue-400"></i>
                                    Category
                                </label>
                                <div class="relative">
                                    <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 p-0.5 opacity-60 group-focus-within:opacity-100 transition-opacity duration-300">
                                        <div class="w-full h-full bg-gray-900 rounded-xl"></div>
                                    </div>
                                    <select id="categorySelect" class="relative z-10 w-full bg-gray-900 text-white px-4 py-3 rounded-xl focus:outline-none transition-colors duration-200" style="color-scheme: dark;">
                                        <option value="" class="bg-gray-800 text-white">Select Category</option>
                                        <!-- Categories will be populated by JavaScript -->
                                    </select>
                                </div>
                            </div>

                            <!-- Quantity -->
                            <div class="group">
                                <label class="block text-gray-300 text-sm font-medium mb-3 flex items-center gap-2">
                                    <i data-lucide="hash" class="w-4 h-4 text-cyan-400"></i>
                                    Quantity
                                </label>
                                <div class="relative">
                                    <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-600 p-0.5 opacity-60 group-focus-within:opacity-100 transition-opacity duration-300">
                                        <div class="w-full h-full bg-gray-900 rounded-xl"></div>
                                    </div>
                                    <input type="number" id="quantity" placeholder="1" min="1" step="1" value="1"
                                        class="relative z-10 w-full bg-transparent text-white px-4 py-3 rounded-xl focus:outline-none transition-colors duration-200">
                                </div>
                            </div>
                        </div>
                        
                        <!-- Row 2: Buy Price, Sell Price -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <!-- Buy Price -->
                            <div class="group">
                                <label class="block text-gray-300 text-sm font-medium mb-3 flex items-center gap-2">
                                    <i data-lucide="dollar-sign" class="w-4 h-4 text-green-400"></i>
                                    Buy Price
                                </label>
                                <div class="relative">
                                    <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 p-0.5 opacity-60 group-focus-within:opacity-100 transition-opacity duration-300">
                                        <div class="w-full h-full bg-gray-900 rounded-xl"></div>
                                    </div>
                                    <input type="number" id="buyPrice" placeholder="0.00" step="0.01" min="0"
                                            class="relative z-10 w-full bg-transparent text-white px-4 py-3 rounded-xl focus:outline-none transition-colors duration-200" required>
                                </div>
                            </div>

                            <!-- Sell Price -->
                            <div class="group">
                                <label class="block text-gray-300 text-sm font-medium mb-3 flex items-center gap-2">
                                    <i data-lucide="trending-up" class="w-4 h-4 text-orange-400"></i>
                                    Sell Price <span class="text-gray-500 font-normal">(Optional)</span>
                                </label>
                                <div class="relative">
                                    <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 p-0.5 opacity-60 group-focus-within:opacity-100 transition-opacity duration-300">
                                        <div class="w-full h-full bg-gray-900 rounded-xl"></div>
                                    </div>
                                    <input type="number" id="sellPrice" placeholder="0.00" step="0.01" min="0"
                                            class="relative z-10 w-full bg-transparent text-white px-4 py-3 rounded-xl focus:outline-none transition-colors duration-200">
                                </div>
                            </div>
                        </div>
                        
                        <!-- Row 3: Buy Date, Sell Date -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <!-- Buy Date -->
                            <div class="group">
                                <label class="block text-gray-300 text-sm font-medium mb-3 flex items-center gap-2">
                                    <i data-lucide="calendar" class="w-4 h-4 text-red-400"></i>
                                    Buy Date
                                </label>
                                <div class="relative">
                                    <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 p-0.5 opacity-60 group-focus-within:opacity-100 transition-opacity duration-300">
                                        <div class="w-full h-full bg-gray-900 rounded-xl"></div>
                                    </div>
                                    <div class="flex items-center gap-2 relative z-10">
                                        <input type="text" id="buyDate" placeholder="dd/mm/yyyy" value="${this.getTodayFormatted()}"
                                                class="flex-1 bg-transparent text-white px-4 py-3 rounded-xl focus:outline-none transition-colors duration-200" required>
                                        <input type="date" id="buyDatePicker" value="${this.getTodayISO()}"
                                                class="absolute opacity-0 pointer-events-none" tabindex="-1">
                                        <button type="button" onclick="document.getElementById('buyDatePicker').showPicker(); event.preventDefault();"
                                                class="p-2 text-gray-400 hover:text-white transition-colors duration-200" title="Open calendar">
                                            <i data-lucide="calendar" class="w-4 h-4"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Sell Date -->
                            <div class="group">
                                <label class="block text-gray-300 text-sm font-medium mb-3 flex items-center gap-2">
                                    <i data-lucide="calendar-check" class="w-4 h-4 text-pink-400"></i>
                                    Sell Date <span class="text-gray-500 font-normal">(Optional)</span>
                                </label>
                                <div class="relative">
                                    <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 p-0.5 opacity-60 group-focus-within:opacity-100 transition-opacity duration-300">
                                        <div class="w-full h-full bg-gray-900 rounded-xl"></div>
                                    </div>
                                    <div class="flex items-center gap-2 relative z-10">
                                        <input type="text" id="sellDate" placeholder="dd/mm/yyyy (optional)"
                                                class="flex-1 bg-transparent text-white px-4 py-3 rounded-xl focus:outline-none transition-colors duration-200">
                                        <input type="date" id="sellDatePicker"
                                                class="absolute opacity-0 pointer-events-none" tabindex="-1">
                                        <button type="button" onclick="document.getElementById('sellDatePicker').showPicker(); event.preventDefault();"
                                                class="p-2 text-gray-400 hover:text-white transition-colors duration-200" title="Open calendar">
                                            <i data-lucide="calendar" class="w-4 h-4"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Submit Button Row -->
                        <div class="flex justify-center">
                            <button type="submit" class="group relative bg-gray-900 hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-600 text-gray-300 hover:text-white font-semibold py-3 px-8 rounded-xl transition-all duration-300 flex items-center gap-2 overflow-hidden border border-gray-700 hover:border-transparent">
                                <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 p-0.5">
                                    <div class="w-full h-full bg-gray-900 rounded-xl group-hover:bg-transparent transition-colors duration-300"></div>
                                </div>
                                <i data-lucide="plus" class="w-4 h-4 relative z-10"></i>
                                <span class="relative z-10">Add Investment</span>
                            </button>
                        </div>
                    </form>
                </section>

                <!-- Investments Section -->
                <section class="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-6">
                    <div class="flex items-center justify-between mb-6">
                        <div class="flex items-center gap-3">
                            <h2 class="text-white font-semibold text-lg">Investment Portfolio</h2>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div class="flex items-center gap-3">
                            <button id="exportCsvBtn" class="group relative bg-gray-900 hover:bg-gradient-to-r hover:from-gray-500 hover:to-slate-600 text-gray-300 hover:text-white px-3 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 overflow-hidden">
                                <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-gray-500 to-slate-600 p-0.5">
                                    <div class="w-full h-full bg-gray-900 rounded-xl group-hover:bg-transparent transition-colors duration-300"></div>
                                </div>
                                <i data-lucide="download" class="w-4 h-4 relative z-10"></i>
                                <span class="relative z-10">CSV</span>
                            </button>
                            <button id="exportExcelBtn" class="group relative bg-gray-900 hover:bg-gradient-to-r hover:from-green-500 hover:to-emerald-600 text-gray-300 hover:text-white px-3 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 overflow-hidden">
                                <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 p-0.5">
                                    <div class="w-full h-full bg-gray-900 rounded-xl group-hover:bg-transparent transition-colors duration-300"></div>
                                </div>
                                <i data-lucide="file-spreadsheet" class="w-4 h-4 relative z-10"></i>
                                <span class="relative z-10">Excel</span>
                            </button>
                            <input type="file" id="importCsvFile" accept=".csv" class="hidden">
                            <button id="importCsvBtn" class="group relative bg-gray-900 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 text-gray-300 hover:text-white px-3 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 overflow-hidden">
                                <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 p-0.5">
                                    <div class="w-full h-full bg-gray-900 rounded-xl group-hover:bg-transparent transition-colors duration-300"></div>
                                </div>
                                <i data-lucide="upload" class="w-4 h-4 relative z-10"></i>
                                <span class="relative z-10">Import</span>
                            </button>
                            <button id="clearAllBtn" class="group relative bg-gray-900 hover:bg-gradient-to-r hover:from-red-500 hover:to-pink-600 text-gray-300 hover:text-white px-3 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 overflow-hidden">
                                <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 p-0.5">
                                    <div class="w-full h-full bg-gray-900 rounded-xl group-hover:bg-transparent transition-colors duration-300"></div>
                                </div>
                                <i data-lucide="trash-2" class="w-4 h-4 relative z-10"></i>
                                <span class="relative z-10">Clear</span>
                            </button>
                        </div>
                    </div>

                    <!-- First Row - Advanced Capital Metrics -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <!-- Current Holdings -->
                        <div class="stat-card bg-gray-900 border border-gray-700 rounded-xl p-6">
                            <div class="text-center">
                                <i data-lucide="dollar-sign" class="w-8 h-8 text-green-400 mx-auto mb-3"></i>
                                <div class="text-2xl font-bold text-white mb-1" id="longTermHoldingValue2">$0.00</div>
                                <div class="text-gray-400 text-sm">Current Holdings</div>
                                <div class="text-gray-500 text-xs">Investment value</div>
                            </div>
                        </div>
                        
                        <!-- Market Prices -->
                        <div class="stat-card bg-gray-900 border border-gray-700 rounded-xl p-6">
                            <div class="text-center">
                                <i data-lucide="trending-up" class="w-8 h-8 text-blue-400 mx-auto mb-3"></i>
                                <div class="text-lg font-bold text-white mb-1">
                                    <div class="text-sm">CSFloat: <span id="totalCSFloatValue" class="text-blue-300">$0.00</span></div>
                                    <div class="text-sm">Buff163: <span id="totalBuffValue" class="text-orange-300">$0.00</span></div>
                                </div>
                                <div class="text-gray-400 text-sm">Market Prices</div>
                                <div class="text-gray-500 text-xs">Live valuations</div>
                            </div>
                        </div>
                        
                        <!-- Total Items -->
                        <div class="stat-card bg-gray-900 border border-gray-700 rounded-xl p-6">
                            <div class="text-center">
                                <i data-lucide="zap" class="w-8 h-8 text-purple-400 mx-auto mb-3"></i>
                                <div class="text-2xl font-bold text-white mb-1" id="longTermTotalQuantity2">0</div>
                                <div class="text-gray-400 text-sm">Total Items</div>
                                <div class="text-gray-500 text-xs">Portfolio size</div>
                            </div>
                        </div>
                        
                        <!-- Active Holdings -->
                        <div class="stat-card bg-gray-900 border border-gray-700 rounded-xl p-6">
                            <div class="text-center">
                                <i data-lucide="activity" class="w-8 h-8 text-emerald-400 mx-auto mb-3"></i>
                                <div class="text-2xl font-bold text-white mb-1" id="activeInvestments">0</div>
                                <div class="text-gray-400 text-sm">Active Holdings</div>
                                <div class="text-gray-500 text-xs">Unsold items</div>
                            </div>
                        </div>
                    </div>

                    <!-- Second Row - Performance Metrics -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <!-- Price Changes -->
                        <div class="stat-card bg-gray-900 border border-gray-700 rounded-xl p-4">
                            <div class="text-center">
                                <div class="text-gray-400 text-xs mb-2">Price Changes</div>
                                <div class="grid grid-cols-3 gap-3">
                                    <div class="text-center">
                                        <div class="text-sm font-bold text-amber-400" id="price24h">--%</div>
                                        <div class="text-gray-500 text-xs">24h</div>
                                    </div>
                                    <div class="text-center">
                                        <div class="text-sm font-bold text-emerald-400" id="price7d">--%</div>
                                        <div class="text-gray-500 text-xs">7d</div>
                                    </div>
                                    <div class="text-center">
                                        <div class="text-sm font-bold text-blue-400" id="price30d">--%</div>
                                        <div class="text-gray-500 text-xs">30d</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Total Quantity -->
                        <div class="stat-card bg-gray-900 border border-gray-700 rounded-xl p-4">
                            <div class="text-center">
                                <div class="text-3xl font-bold text-blue-400 mb-1" id="longTermTotalQuantity">0</div>
                                <div class="text-gray-400 text-sm">Total Quantity</div>
                            </div>
                        </div>
                        
                        <!-- Realized P&L -->
                        <div class="stat-card bg-gray-900 border border-gray-700 rounded-xl p-4">
                            <div class="text-center">
                                <div class="text-3xl font-bold text-purple-400 mb-1" id="longTermRealizedPnL">$0.00</div>
                                <div class="text-gray-400 text-sm">Realized P&L</div>
                            </div>
                        </div>
                        
                        <!-- Average ROI -->
                        <div class="stat-card bg-gray-900 border border-gray-700 rounded-xl p-4">
                            <div class="text-center">
                                <div class="text-3xl font-bold text-orange-400 mb-1" id="averageROI">0.0%</div>
                                <div class="text-gray-400 text-sm">Avg ROI</div>
                            </div>
                        </div>
                    </div>

                    <!-- Chart Section - Professional Styling -->
                    <div class="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-6">
                        <div class="flex items-center justify-between mb-6">
                            <div class="flex items-center gap-3">
                                <div class="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                                    <i data-lucide="bar-chart-3" class="w-5 h-5 text-white"></i>
                                </div>
                                <div>
                                    <h3 class="text-white font-bold text-lg">Holdings Distribution</h3>
                                    <p class="text-gray-400 text-sm">Portfolio composition by quantity</p>
                                </div>
                            </div>
                            <div class="flex items-center gap-3">
                                <button id="refreshChart" class="group relative bg-gray-800 hover:bg-gray-700 p-2 rounded-lg transition-all duration-200" title="Refresh Chart">
                                    <i data-lucide="refresh-cw" class="w-4 h-4 text-gray-400 group-hover:text-white transition-colors"></i>
                                </button>
                            </div>
                        </div>
                        <div class="chart-container bg-gray-950/50 rounded-lg p-4" style="height: 420px; position: relative;">
                            <canvas id="longTermQuantityChart"></canvas>
                        </div>
                    </div>

                    <!-- Categories Section - Professional Styling -->
                    <div class="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-6">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-white font-semibold">Categories</h3>
                            <div class="flex items-center gap-3 relative">
                                <button type="button" id="addCategoryBtn" class="group relative bg-gray-900 hover:bg-gradient-to-r hover:from-green-500 hover:to-emerald-600 text-gray-300 hover:text-white px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 overflow-hidden">
                                    <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 p-0.5">
                                        <div class="w-full h-full bg-gray-900 rounded-xl group-hover:bg-transparent transition-colors duration-300"></div>
                                    </div>
                                    <i data-lucide="plus" class="w-4 h-4 relative z-10"></i>
                                    <span class="relative z-10">Add Category</span>
                                </button>
                                <button type="button" id="selectModeBtn" class="group relative bg-gray-900 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 text-gray-300 hover:text-white px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 overflow-hidden" onclick="window.investmentsPage?.toggleSelectMode()">
                                    <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 p-0.5">
                                        <div class="w-full h-full bg-gray-900 rounded-xl group-hover:bg-transparent transition-colors duration-300"></div>
                                    </div>
                                    <i data-lucide="check-square" class="w-4 h-4 relative z-10"></i>
                                    <span class="relative z-10">Select</span>
                                </button>
                                <button type="button" id="moveSelectedBtn" class="group relative bg-gray-900 hover:bg-gradient-to-r hover:from-amber-500 hover:to-orange-600 text-gray-300 hover:text-white px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 overflow-hidden" style="display: none" onclick="window.investmentsPage?.showMoveDropdown()">
                                    <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 p-0.5">
                                        <div class="w-full h-full bg-gray-900 rounded-xl group-hover:bg-transparent transition-colors duration-300"></div>
                                    </div>
                                    <i data-lucide="folder-input" class="w-4 h-4 relative z-10"></i>
                                    <span class="relative z-10">Move</span>
                                </button>
                                <button type="button" id="removeSelectedBtn" class="group relative bg-gray-900 hover:bg-gradient-to-r hover:from-red-500 hover:to-pink-600 text-gray-300 hover:text-white px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 overflow-hidden" style="display: none" onclick="window.investmentsPage?.removeSelectedInvestments()">
                                    <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 p-0.5">
                                        <div class="w-full h-full bg-gray-900 rounded-xl group-hover:bg-transparent transition-colors duration-300"></div>
                                    </div>
                                    <i data-lucide="trash-2" class="w-4 h-4 relative z-10"></i>
                                    <span class="relative z-10">Remove Selected</span>
                                </button>
                            </div>
                        </div>

                        <!-- Category Tabs - Horizontal -->
                        <div class="flex items-center gap-2 mb-4 overflow-x-auto pb-2" id="categoryTabsContainer">
                            <!-- Categories will be populated here as tabs -->
                        </div>

                        <!-- Add Category Form - Compact Enhanced Styling -->
                        <div id="addCategoryForm" class="hidden mb-4 p-4 bg-gray-900 border border-gray-700 rounded-lg">
                            <div class="flex gap-3 items-end">
                                <div class="flex-1 group">
                                    <label class="block text-sm font-medium text-gray-300 mb-2">Category Name</label>
                                    <div class="relative">
                                        <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 p-0.5 opacity-50 group-focus-within:opacity-100 transition-opacity duration-200">
                                            <div class="w-full h-full bg-gray-900 rounded-xl"></div>
                                        </div>
                                        <input type="text" id="newCategoryName" placeholder="e.g., Cases, Weapons, Stickers" 
                                                class="relative z-10 w-full bg-transparent text-white px-3 py-2 rounded-xl focus:outline-none transition-colors duration-200">
                                    </div>
                                </div>
                                <!-- Save Button with Gradient Border -->
                                <button type="button" id="saveCategoryBtn" class="group relative bg-gray-900 hover:bg-gradient-to-r hover:from-green-500 hover:to-emerald-600 text-gray-300 hover:text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 overflow-hidden">
                                    <div class="absolute inset-0 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 p-0.5">
                                        <div class="w-full h-full bg-gray-900 rounded-lg group-hover:bg-transparent transition-colors duration-300"></div>
                                    </div>
                                    <i data-lucide="check" class="w-4 h-4 relative z-10"></i>
                                    <span class="relative z-10">Save</span>
                                </button>
                                <!-- Cancel Button with Gradient Border -->
                                <button type="button" id="cancelCategoryBtn" class="group relative bg-gray-900 hover:bg-gradient-to-r hover:from-gray-500 hover:to-gray-600 text-gray-300 hover:text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 overflow-hidden">
                                    <div class="absolute inset-0 rounded-lg bg-gradient-to-r from-gray-500 to-gray-600 p-0.5">
                                        <div class="w-full h-full bg-gray-900 rounded-lg group-hover:bg-transparent transition-colors duration-300"></div>
                                    </div>
                                    <i data-lucide="x" class="w-4 h-4 relative z-10"></i>
                                    <span class="relative z-10">Cancel</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Long Term Investments Table - Professional Styling -->
                    <div class="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
                        <div class="p-4 border-b border-gray-700">
                            <div class="flex items-center justify-between">
                                <h3 class="text-white font-semibold">Investment History</h3>
                                <div class="flex items-center gap-3">
                                    <i data-lucide="activity" class="w-4 h-4 text-gray-400"></i>
                                    <!-- Status Filter Buttons -->
                                    <div class="flex items-center gap-1 bg-gray-800 p-1 rounded-lg border border-gray-600">
                                        <button onclick="window.investmentsPage?.selectStatusFilter(null)" 
                                                id="statusFilterAll"
                                                class="status-filter-btn px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 text-gray-400 hover:text-white hover:bg-gray-700">
                                            All
                                        </button>
                                        <button onclick="window.investmentsPage?.selectStatusFilter('holding')" 
                                                id="statusFilterHolding"
                                                class="status-filter-btn px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 bg-blue-600 text-white">
                                            Holding
                                        </button>
                                        <button onclick="window.investmentsPage?.selectStatusFilter('sold')" 
                                                id="statusFilterSold"
                                                class="status-filter-btn px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 text-gray-400 hover:text-white hover:bg-gray-700">
                                            Sold
                                        </button>
                                    </div>
                                    <!-- Sort Dropdown -->
                                    <div class="relative z-[9999]">
                                        <button onclick="window.investmentsPage?.toggleSortDropdown()" 
                                                id="sortDropdownBtn"
                                                class="flex items-center gap-2 bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-600 transition-all duration-200 text-xs font-medium">
                                            <i data-lucide="arrow-up-down" class="w-3.5 h-3.5"></i>
                                            <span id="sortButtonText">Recent</span>
                                            <i data-lucide="chevron-down" class="w-3.5 h-3.5"></i>
                                        </button>
                                        <!-- Sort Dropdown Menu -->
                                        <div id="sortDropdown" class="absolute top-full right-0 mt-2 bg-gray-900 border-2 border-gray-600 rounded-lg shadow-2xl" style="display: none; min-width: 160px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8); z-index: 10000;">
                                            <div class="p-2">
                                                <button onclick="window.investmentsPage?.selectSortOption('recent')" 
                                                        class="sort-option w-full text-left px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-all duration-200 flex items-center gap-2">
                                                    <i data-lucide="clock" class="w-3.5 h-3.5"></i>
                                                    Recent
                                                </button>
                                                <button onclick="window.investmentsPage?.selectSortOption('ascending')" 
                                                        class="sort-option w-full text-left px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-all duration-200 flex items-center gap-2">
                                                    <i data-lucide="trending-up" class="w-3.5 h-3.5"></i>
                                                    Ascending (Low to High)
                                                </button>
                                                <button onclick="window.investmentsPage?.selectSortOption('descending')" 
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
                            <div class="flex items-center gap-3 text-gray-400 text-sm font-semibold w-full">
                                <div class="flex-none w-10 text-center" id="selectAllColumn" style="display: none">
                                    <input type="checkbox" id="selectAll" class="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2" onchange="window.investmentsPage?.toggleSelectAll(this.checked)">
                                </div>
                                <div class="flex-none w-12 text-center">
                                    <span class="inline-flex items-center justify-center w-8 h-8 bg-gray-800 border border-gray-600 rounded-lg text-xs">#</span>
                                </div>
                                <div class="flex-none w-20 text-center">
                                    <span class="inline-flex items-center justify-center gap-1">
                                        <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                        </svg>
                                        <span class="text-blue-400">Image</span>
                                    </span>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <span class="inline-flex items-center gap-1">
                                        <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                                        </svg>
                                        <span class="text-purple-400">Item Name</span>
                                    </span>
                                </div>
                                
                                <!-- 24h % Column -->
                                <div class="flex-none w-16 text-center">
                                    <span class="inline-flex items-center justify-center gap-1">
                                        <svg class="w-3 h-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                                        </svg>
                                        <span class="text-amber-400">24h %</span>
                                    </span>
                                </div>
                                
                                <!-- 7d % Column -->
                                <div class="flex-none w-16 text-center">
                                    <span class="inline-flex items-center justify-center gap-1">
                                        <svg class="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                                        </svg>
                                        <span class="text-emerald-400">7d %</span>
                                    </span>
                                </div>
                                
                                <!-- 30d % Column -->
                                <div class="flex-none w-16 text-center">
                                    <span class="inline-flex items-center justify-center gap-1">
                                        <svg class="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                        </svg>
                                        <span class="text-blue-400">30d %</span>
                                    </span>
                                </div>
                                
                                <div class="flex-none w-16 text-center">
                                    <span class="inline-flex items-center justify-center gap-1">
                                        <svg class="w-3 h-3 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/>
                                        </svg>
                                        <span class="text-cyan-400">Qty</span>
                                    </span>
                                </div>
                                <div class="flex-none w-24 text-center">
                                    <span class="inline-flex items-center justify-center gap-1">
                                        <svg class="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                                        </svg>
                                        <span class="text-green-400">Unit Buy</span>
                                    </span>
                                </div>
                                <div class="flex-none w-28 text-center">
                                    <span class="inline-flex items-center justify-center gap-1">
                                        <svg class="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                                        </svg>
                                        <span class="text-emerald-400">Total Buy</span>
                                    </span>
                                </div>
                                <div class="flex-none w-24 text-center">
                                    <span class="inline-flex items-center justify-center gap-1">
                                        <svg class="w-3 h-3 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                        </svg>
                                        <span class="text-yellow-400">Buy Date</span>
                                    </span>
                                </div>
                                <div class="flex-none w-24 text-center">
                                    <span class="inline-flex items-center justify-center gap-1">
                                        <svg class="w-3 h-3 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                                        </svg>
                                        <span class="text-orange-400">Unit Sell</span>
                                    </span>
                                </div>
                                <div class="flex-none w-28 text-center">
                                    <span class="inline-flex items-center justify-center gap-1">
                                        <svg class="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                                        </svg>
                                        <span class="text-red-400">Total Sell</span>
                                    </span>
                                </div>
                                <div class="flex-none w-24 text-center">
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
                                <div class="flex-none w-20 text-center">
                                    <span class="inline-flex items-center justify-center gap-1">
                                        <svg class="w-3 h-3 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                                        </svg>
                                        <span class="text-teal-400">Return %</span>
                                    </span>
                                </div>
                                <div class="flex-none w-20 text-center">
                                    <span class="inline-flex items-center justify-center gap-1">
                                        <svg class="w-3 h-3 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                        </svg>
                                        <span class="text-violet-400">Status</span>
                                    </span>
                                </div>
                                <div class="flex-none w-32 text-center">
                                    <span class="inline-flex items-center justify-center gap-1">
                                        <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
                                        </svg>
                                        <span class="text-gray-400">Actions</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="divide-y divide-gray-700">
                            <div id="longTermInvestmentsTable">
                                <!-- Long term investments will be populated here by JavaScript -->
                            </div>
                        </div>
                    </div>

                    <!-- Empty state -->
                    <div id="longTermEmptyState" class="text-center py-12 hidden">
                        <svg class="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                        </svg>
                        <h3 class="text-lg font-medium text-gray-400 mb-2">No investments yet</h3>
                        <p class="text-gray-500">Start tracking your investments by adding items above.</p>
                    </div>
                </section>
            </div>

            <!-- Move Category Dropdown - Enhanced Styling (Fixed Position) -->
            <div id="moveCategoryDropdown" class="fixed bg-gray-900 border-2 border-gray-600 rounded-xl shadow-2xl z-[9999]" style="display: none; min-width: 220px; max-height: 320px; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);">
                <div class="p-4">
                    <div class="flex items-center gap-2 text-white text-sm font-semibold mb-4">
                        <i data-lucide="folder-open" class="w-4 h-4 text-blue-400"></i>
                        Move to Category:
                    </div>
                    <div id="categoryDropdownList" class="space-y-2">
                        <!-- Categories will be populated here -->
                    </div>
                </div>
            </div>

            <!-- Edit Investment Modal -->
            <div id="editModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 hidden flex items-center justify-center p-4">
                <div class="glass-card rounded-2xl p-6 w-full max-w-md">
                    <h3 class="text-xl font-bold gradient-text mb-4">Edit Investment</h3>
                    <form id="editForm">
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-2">Item Name</label>
                                <input type="text" id="editItemName" class="input-field w-full px-3 py-2 rounded-lg text-white bg-gray-700 border border-gray-600 focus:border-blue-500 outline-none" required>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-300 mb-2">Buy Price ($)</label>
                                    <input type="number" id="editBuyPrice" step="0.01" class="input-field w-full px-3 py-2 rounded-lg text-white bg-gray-700 border border-gray-600 focus:border-blue-500 outline-none" required>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-300 mb-2">Sell Price ($)</label>
                                    <input type="number" id="editSellPrice" step="0.01" class="input-field w-full px-3 py-2 rounded-lg text-white bg-gray-700 border border-gray-600 focus:border-blue-500 outline-none">
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-300 mb-2">Buy Date</label>
                                    <div class="relative">
                                        <input type="text" id="editBuyDate" placeholder="dd/mm/yyyy" class="input-field w-full px-3 py-2 pr-10 rounded-lg text-white bg-gray-700 border border-gray-600 focus:border-blue-500 outline-none" required>
                                        <input type="date" id="editBuyDatePicker" class="absolute opacity-0 pointer-events-none" tabindex="-1">
                                        <button type="button" onclick="document.getElementById('editBuyDatePicker').showPicker(); event.preventDefault();" class="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-white transition-colors duration-200" title="Open calendar">
                                            <i data-lucide="calendar" class="w-4 h-4"></i>
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-300 mb-2">Sell Date</label>
                                    <div class="relative">
                                        <input type="text" id="editSellDate" placeholder="dd/mm/yyyy (optional)" class="input-field w-full px-3 py-2 pr-10 rounded-lg text-white bg-gray-700 border border-gray-600 focus:border-blue-500 outline-none">
                                        <input type="date" id="editSellDatePicker" class="absolute opacity-0 pointer-events-none" tabindex="-1">
                                        <button type="button" onclick="document.getElementById('editSellDatePicker').showPicker(); event.preventDefault();" class="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-white transition-colors duration-200" title="Open calendar">
                                            <i data-lucide="calendar" class="w-4 h-4"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="flex justify-end space-x-3 mt-6">
                            <button type="button" id="cancelEdit" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition">Cancel</button>
                            <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
            </div>

            <!-- Edit Long Term Investment Modal - Enhanced -->
            <div id="editLongTermModal" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
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
                                <h3 class="text-2xl font-bold text-white">Edit Investment</h3>
                                <p class="text-blue-100 text-sm">Update your investment details</p>
                            </div>
                        </div>
                    </div>

                    <!-- Modal Body -->
                    <div class="p-6">
                        <form id="editLongTermForm">
                            <div class="grid grid-cols-1 gap-6">
                                <!-- Item Name - Full Width -->
                                <div class="group">
                                    <label class="block text-sm font-semibold text-gray-400 mb-2 group-focus-within:text-blue-400 transition-colors">
                                        <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                                        </svg>
                                        Item Name
                                    </label>
                                    <input type="text" id="editLongTermItemName" 
                                           class="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200" 
                                           placeholder="Enter item name" required>
                                </div>
                        
                                <!-- Quantity and Category Row -->
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div class="group">
                                        <label class="block text-sm font-semibold text-gray-400 mb-2 group-focus-within:text-blue-400 transition-colors">
                                            <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/>
                                            </svg>
                                            Quantity
                                        </label>
                                        <input type="number" id="editLongTermQuantity" min="1" step="1" 
                                               class="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200" 
                                               placeholder="1" required>
                                    </div>
                                    <div class="group">
                                        <label class="block text-sm font-semibold text-gray-400 mb-2 group-focus-within:text-blue-400 transition-colors">
                                            <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                                            </svg>
                                            Category
                                        </label>
                                        <select id="editLongTermCategory" 
                                                class="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200">
                                            <option value="">Select Category</option>
                                            <!-- Categories will be populated by JavaScript -->
                                        </select>
                                    </div>
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
                                            <input type="text" id="editLongTermBuyDate" placeholder="dd/mm/yyyy"
                                                   class="w-full px-4 py-3 pr-12 bg-gray-800 border border-gray-600 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200" 
                                                   required>
                                            <input type="date" id="editLongTermBuyDatePicker"
                                                   class="absolute opacity-0 pointer-events-none" tabindex="-1">
                                            <button type="button" onclick="document.getElementById('editLongTermBuyDatePicker').showPicker(); event.preventDefault();"
                                                    class="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-white transition-colors duration-200" title="Open calendar">
                                                <i data-lucide="calendar" class="w-4 h-4"></i>
                                            </button>
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
                                            <input type="text" id="editLongTermSellDate" placeholder="dd/mm/yyyy (optional)"
                                                   class="w-full px-4 py-3 pr-12 bg-gray-800 border border-gray-600 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200">
                                            <input type="date" id="editLongTermSellDatePicker"
                                                   class="absolute opacity-0 pointer-events-none" tabindex="-1">
                                            <button type="button" onclick="document.getElementById('editLongTermSellDatePicker').showPicker(); event.preventDefault();"
                                                    class="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-white transition-colors duration-200" title="Open calendar">
                                                <i data-lucide="calendar" class="w-4 h-4"></i>
                                            </button>
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
                                            Unit Buy Price ($)
                                        </label>
                                        <input type="number" id="editLongTermBuyPrice" step="0.01" min="0" 
                                               class="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition-all duration-200" 
                                               placeholder="0.00" required>
                                    </div>
                                    <div class="group">
                                        <label class="block text-sm font-semibold text-gray-400 mb-2 group-focus-within:text-emerald-400 transition-colors">
                                            <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                                            </svg>
                                            Unit Sell Price ($)
                                            <span class="text-xs text-gray-500 ml-1">(optional)</span>
                                        </label>
                                        <input type="number" id="editLongTermSellPrice" step="0.01" min="0" 
                                               class="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 transition-all duration-200" 
                                               placeholder="0.00">
                                    </div>
                                </div>
                            </div>
                    
                            <!-- Action Buttons -->
                            <div class="flex gap-4 mt-8 pt-6 border-t border-gray-700">
                                <button type="button" id="cancelLongTermEdit" 
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

            <!-- Custom Modal Infrastructure -->
            <!-- Delete Confirmation Modal -->
            <div id="deleteConfirmModal" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center" style="display: none;">
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
                                <h3 class="text-2xl font-bold text-white">Delete Investment</h3>
                                <p class="text-red-100 text-sm">Permanently remove this investment</p>
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
                                "<span id="deleteItemName"></span>"?
                            </p>

                            <!-- Warning Box -->
                            <div class="bg-red-900/20 border border-red-700/50 rounded-lg p-4 mb-6">
                                <div class="flex items-center gap-2 text-red-400">
                                    <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                    </svg>
                                    <span class="font-medium">Warning: This action cannot be undone</span>
                                </div>
                            </div>
                        </div>

                        <div class="flex gap-3">
                            <button id="cancelDelete" class="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                                Cancel
                            </button>
                            <button id="confirmDelete" class="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                                Delete Investment
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sell Price Input Modal -->
            <div id="sellPriceModal" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center" style="display: none;">
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
                                <h3 class="text-2xl font-bold text-white">Sell Investment</h3>
                                <p class="text-green-100 text-sm">Complete your investment transaction</p>
                            </div>
                        </div>
                    </div>

                    <!-- Modal Body -->
                    <div class="p-6">
                        <div class="mb-6">
                            <p class="text-gray-400 mb-4 text-center">
                                Enter sell price for "<span id="sellItemName" class="text-white font-semibold"></span>"
                            </p>
                            
                            <div class="space-y-4">
                                <div class="group">
                                    <label class="block text-sm font-semibold text-gray-400 mb-2 group-focus-within:text-green-400 transition-colors">
                                        <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                                        </svg>
                                        Sell Price ($)
                                    </label>
                                    <input type="number" id="sellPriceInput" step="0.01" min="0" 
                                           class="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                                           placeholder="0.00">
                                </div>

                                <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
                                    <div class="flex justify-between items-center text-sm">
                                        <span class="text-gray-400">Original Buy Price:</span>
                                        <span class="text-white font-semibold">$<span id="originalBuyPrice">0.00</span></span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="flex gap-3">
                            <button id="cancelSell" class="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                                Cancel
                            </button>
                            <button id="confirmSell" class="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                </svg>
                                Confirm Sale
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `
    }

    setupEventListeners() {
        const form = document.getElementById('investmentForm')
        if (form) {
            form.addEventListener('submit', (e) => this.handleInvestmentSubmit(e))
            this.setupFormEnhancements()
        }

        // Investment type toggle
        document.querySelectorAll('input[name="investmentType"]').forEach(radio => {
            radio.addEventListener('change', () => this.handleInvestmentTypeChange())
        })

        // Edit modal
        const cancelEdit = document.getElementById('cancelEdit')
        if (cancelEdit) {
            cancelEdit.addEventListener('click', () => this.closeEditModal())
        }

        const editForm = document.getElementById('editForm')
        if (editForm) {
            editForm.addEventListener('submit', (e) => this.handleEditSubmit(e))
        }

        // Action buttons
        const exportCsvBtn = document.getElementById('exportCsvBtn')
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', () => this.exportInvestments('csv'))
        }

        const exportExcelBtn = document.getElementById('exportExcelBtn')
        if (exportExcelBtn) {
            exportExcelBtn.addEventListener('click', () => this.exportInvestments('excel'))
        }

        const importCsvBtn = document.getElementById('importCsvBtn')
        if (importCsvBtn) {
            importCsvBtn.addEventListener('click', () => document.getElementById('importCsvFile').click())
        }

        const importCsvFile = document.getElementById('importCsvFile')
        if (importCsvFile) {
            importCsvFile.addEventListener('change', (e) => this.handleImport(e))
        }

        const clearAllBtn = document.getElementById('clearAllBtn')
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => this.clearAllInvestments())
        }

        // Custom Modal Event Listeners
        this.setupModalEventListeners()

        // Add Category functionality
        const addCategoryBtn = document.getElementById('addCategoryBtn')
        if (addCategoryBtn) {
            addCategoryBtn.addEventListener('click', () => this.showAddCategoryForm())
        }

        const saveCategoryBtn = document.getElementById('saveCategoryBtn')
        if (saveCategoryBtn) {
            saveCategoryBtn.addEventListener('click', () => this.saveCategory())
        }

        const cancelCategoryBtn = document.getElementById('cancelCategoryBtn')
        if (cancelCategoryBtn) {
            cancelCategoryBtn.addEventListener('click', () => this.hideAddCategoryForm())
        }

        // Long Term Edit modal
        const cancelLongTermEdit = document.getElementById('cancelLongTermEdit')
        if (cancelLongTermEdit) {
            cancelLongTermEdit.addEventListener('click', () => this.closeLongTermEditModal())
        }

        const editLongTermForm = document.getElementById('editLongTermForm')
        if (editLongTermForm) {
            editLongTermForm.addEventListener('submit', (e) => this.handleLongTermEditSubmit(e))
        }

        // Setup CSP-compliant event listeners
        this.setupCSPCompliantEventListeners()

        const refreshChartBtn = document.getElementById('refreshChart')
        if (refreshChartBtn) {
            refreshChartBtn.addEventListener('click', () => {
                this.renderHoldingsChart()
                const icon = refreshChartBtn.querySelector('i')
                if (icon) {
                    icon.classList.add('animate-spin')
                    setTimeout(() => icon.classList.remove('animate-spin'), 800)
                }
            })
        }

        // Date picker sync functionality
        this.setupDatePickerSync('buyDate', 'buyDatePicker')
        this.setupDatePickerSync('sellDate', 'sellDatePicker')
        this.setupDatePickerSync('editBuyDate', 'editBuyDatePicker')
        this.setupDatePickerSync('editSellDate', 'editSellDatePicker')
        this.setupDatePickerSync('editLongTermBuyDate', 'editLongTermBuyDatePicker')
        this.setupDatePickerSync('editLongTermSellDate', 'editLongTermSellDatePicker')
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

    initializeInvestmentForm() {
        // Set today's date as default
        const today = this.getTodayFormatted()
        const buyDateField = document.getElementById('buyDate')
        if (buyDateField && !buyDateField.value) {
            buyDateField.value = today
        }

        // Populate categories
        this.populateCategories()
    }

    populateCategories() {
        const state = this.store()
        const categories = state.categories || []
        
        // Populate main form category select
        const categorySelect = document.getElementById('categorySelect')
        if (categorySelect) {
            categorySelect.innerHTML = '<option value="" class="bg-gray-800 text-white">Select Category</option>'
            
            categories.forEach(category => {
                const option = document.createElement('option')
                option.value = category.id
                option.textContent = category.name
                option.className = 'bg-gray-800 text-white'
                option.style.backgroundColor = '#1f2937'
                option.style.color = '#ffffff'
                categorySelect.appendChild(option)
            })
        }

        // Populate edit modal category select
        const editCategorySelect = document.getElementById('editLongTermCategory')
        if (editCategorySelect) {
            editCategorySelect.innerHTML = '<option value="" class="bg-gray-800 text-white">Select Category</option>'
            
            categories.forEach(category => {
                const option = document.createElement('option')
                option.value = category.id
                option.textContent = category.name
                option.className = 'bg-gray-800 text-white'
                option.style.backgroundColor = '#1f2937'
                option.style.color = '#ffffff'
                editCategorySelect.appendChild(option)
            })
        }
    }

    handleInvestmentSubmit(e) {
        e.preventDefault()
        console.log('📝 Form submitted!')
        
        const formData = this.getInvestmentFormData()
        console.log('📋 Form data:', formData)
        
        if (!this.validateForm(formData)) {
            console.log('❌ Form validation failed')
            return
        }

        console.log('✅ Form validation passed, adding investment...')
        this.addLongTermInvestment(formData)
        this.updateMetrics()
        this.renderHoldingsChart()
        this.clearForm()
        this.showNotification('Investment added successfully!', 'success')
    }

    getInvestmentFormData() {
        const sellPriceValue = document.getElementById('sellPrice').value
        const sellDateValue = document.getElementById('sellDate').value
        
        return {
            itemName: document.getElementById('itemName').value.trim(),
            quantity: parseInt(document.getElementById('quantity').value) || 1,
            categoryId: document.getElementById('categorySelect').value,
            buyPrice: parseFloat(document.getElementById('buyPrice').value) || 0,
            buyDate: document.getElementById('buyDate').value,
            sellPrice: sellPriceValue ? parseFloat(sellPriceValue) : null,
            sellDate: sellDateValue || null
        }
    }

    validateForm(formData) {
        if (!formData.itemName) {
            this.showNotification('Please enter an item name', 'error')
            return false
        }
        if (!formData.buyPrice || formData.buyPrice <= 0) {
            this.showNotification('Please enter a valid buy price', 'error')
            return false
        }
        if (!formData.buyDate) {
            this.showNotification('Please select a buy date', 'error')
            return false
        }
        return true
    }


    addLongTermInvestment(formData) {
        const investment = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            itemName: formData.itemName,
            quantity: formData.quantity,
            categoryId: formData.categoryId,
            unitBuyPrice: formData.buyPrice,
            totalBuyPrice: formData.buyPrice * formData.quantity,
            unitSellPrice: formData.sellPrice,
            totalSellPrice: formData.sellPrice ? (formData.sellPrice * formData.quantity) : null,
            date: formData.buyDate,
            sellDate: formData.sellDate,
            status: formData.sellPrice ? 'sold' : 'holding',
            profit: formData.sellPrice ? ((formData.sellPrice - formData.buyPrice) * formData.quantity) : null,
            returnPercentage: formData.sellPrice ? ((formData.sellPrice - formData.buyPrice) / formData.buyPrice * 100) : null
        }

        try {
            this.store().addLongTermInvestment(investment)
            this.renderLongTermInvestments()
        } catch (error) {
            console.error('❌ Error adding investment:', error)
        }
    }

    async renderLongTermInvestments() {
        const state = this.store()
        const tbody = document.getElementById('longTermInvestmentsTable')
        console.log('🔍 Rendering investments. Table element found:', !!tbody)
        console.log('📊 Investments to render:', state.longTermInvestments)
        console.log('📊 Number of investments:', state.longTermInvestments?.length || 0)
        
        if (!tbody) {
            console.error('❌ Table body element not found with ID: longTermInvestmentsTable')
            console.log('🔍 Available table elements:', Array.from(document.querySelectorAll('tbody')).map(el => el.id))
            return
        }

        let filteredInvestments = state.longTermInvestments

        // Apply category filter
        if (this.selectedCategoryId) {
            filteredInvestments = filteredInvestments.filter(inv => inv.categoryId === this.selectedCategoryId)
        }

        // Apply status filter
        if (this.selectedStatusFilter) {
            filteredInvestments = filteredInvestments.filter(inv => inv.status === this.selectedStatusFilter)
        }

        // Apply sorting based on selected option
        filteredInvestments = this.applySorting(filteredInvestments)

        console.log('🔍 Filtered investments:', filteredInvestments)
        console.log('🔍 Selected category:', this.selectedCategoryId)
        console.log('🔍 Selected status filter:', this.selectedStatusFilter)

        if (filteredInvestments.length === 0) {
            console.log('📝 Showing empty state')
            tbody.innerHTML = `
                <div class="p-8 text-center text-gray-400">
                    <i data-lucide="inbox" class="w-12 h-12 mx-auto mb-4"></i>
                    <p class="text-lg mb-2">${state.longTermInvestments.length === 0 ? 'No investments yet' : 'No investments in this category'}</p>
                    <p class="text-sm">${state.longTermInvestments.length === 0 ? 'Add your first investment above to start tracking your portfolio' : 'Select a different category or add investments to this category'}</p>
                </div>
            `
            return
        }

        console.log('📝 Rendering', filteredInvestments.length, 'investment rows')
        
        // First render with loading states, then fetch prices
        tbody.innerHTML = filteredInvestments.map((investment, index) => {
            const profit = investment.totalSellPrice ? (investment.totalSellPrice - investment.totalBuyPrice) : 0
            const profitClass = profit >= 0 ? 'text-green-400' : 'text-red-400'
            const returnPercent = investment.totalSellPrice ? ((investment.totalSellPrice - investment.totalBuyPrice) / investment.totalBuyPrice * 100) : 0
            
            // Simple number formatter as fallback
            const formatNum = (num) => state.formatNumber ? state.formatNumber(num) : num.toFixed(2)
            
            return `
                <div class="p-4 hover:bg-gray-800 transition">
                    <div class="flex items-center gap-3 w-full">
                        <!-- Selection Checkbox -->
                        <div class="flex-none w-10 text-center investment-checkbox-column" style="display: ${this.isSelectMode ? 'block' : 'none'}">
                            <input type="checkbox" class="investment-checkbox w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2" data-investment-id="${investment.id}" onchange="window.investmentsPage?.toggleInvestmentSelection('${investment.id}', this.checked)">
                        </div>
                        
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
                            <div class="absolute inset-0 bg-gradient-to-r from-slate-900/20 via-slate-800/10 to-slate-900/20 opacity-0 group-hover:opacity-100 transition-all duration-700 rounded-lg"></div>
                            <div class="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-all duration-1000 rounded-lg animate-pulse"></div>
                            
                            <!-- Main Content Container -->
                            <div class="relative flex items-center gap-4 p-3 rounded-lg transition-all duration-500 group-hover:bg-slate-800/30 group-hover:shadow-lg group-hover:shadow-slate-700/20 group-hover:transform group-hover:scale-[1.02]">
                                <!-- Accent Bar with Animation -->
                                <div class="relative">
                                    <div class="w-1 h-12 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full transition-all duration-500 group-hover:h-14 group-hover:w-1.5 group-hover:shadow-lg group-hover:shadow-purple-500/50"></div>
                                    <div class="absolute inset-0 w-1 h-12 bg-gradient-to-b from-blue-400 to-purple-500 rounded-full opacity-0 group-hover:opacity-60 transition-all duration-500 animate-pulse"></div>
                                </div>
                                
                                <!-- Item Content -->
                                <div class="flex-1 min-w-0 space-y-2">
                                    <!-- Item Name -->
                                    <div class="relative">
                                        <div class="text-white font-bold text-base leading-tight truncate bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent group-hover:from-blue-100 group-hover:to-purple-200 transition-all duration-500">${investment.itemName}</div>
                                        
                                        <!-- Floating Sparkles -->
                                        <div class="absolute -top-1 -right-2 w-1 h-1 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping animation-delay-200"></div>
                                        <div class="absolute top-1 -left-1 w-0.5 h-0.5 bg-purple-400 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping animation-delay-500"></div>
                                    </div>
                                    
                                    <!-- Enhanced Price Badge Container -->
                                    <div class="relative">
                                        <!-- Sophisticated Price Badge -->
                                        <div class="price-badge-container relative inline-flex items-center">
                                            <div class="price-badge relative flex flex-col gap-2 px-4 py-3 bg-gradient-to-br from-slate-800/60 to-slate-900/80 border border-slate-600/40 rounded-xl backdrop-blur-sm hover:from-blue-900/60 hover:to-purple-900/60 hover:border-blue-500/60 transition-all duration-500 hover:scale-110 hover:shadow-2xl hover:shadow-blue-500/30 overflow-hidden cursor-pointer group">
                                                <!-- Dramatic Color Background -->
                                                <div class="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-orange-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                                <div class="absolute inset-0 bg-gradient-to-tl from-cyan-500/10 via-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-pulse"></div>
                                                
                                                <!-- Glowing Border Effect -->
                                                <div class="absolute inset-0 rounded-xl border-2 border-transparent bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-orange-500/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse" style="animation-duration: 1.5s;"></div>
                                                <div class="absolute inset-0.5 rounded-xl bg-gradient-to-br from-slate-800/90 to-slate-900/90"></div>
                                                
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
                                                    <span class="text-emerald-400 font-bold text-xs tabular-nums group-hover:text-emerald-300 transform group-hover:scale-105 transition-all duration-400" id="csfloat-${investment.id}">
                                                        <div class="inline-flex items-center gap-1.5">
                                                            <div class="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin group-hover:border-blue-300"></div>
                                                            <span class="text-xs text-slate-400 group-hover:text-slate-300">Loading...</span>
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
                                                    <span class="text-emerald-400 font-bold text-xs tabular-nums group-hover:text-emerald-300 transform group-hover:scale-105 transition-all duration-400" id="buff-${investment.id}">
                                                        <div class="inline-flex items-center gap-1.5">
                                                            <div class="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin group-hover:border-orange-300"></div>
                                                            <span class="text-xs text-slate-400 group-hover:text-slate-300">Loading...</span>
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
                        <div class="flex-none w-16 text-center">
                            <span class="text-xs font-medium text-gray-500">
                                --%
                            </span>
                        </div>
                        
                        <!-- 7d % -->
                        <div class="flex-none w-16 text-center">
                            <span class="text-xs font-medium text-gray-500">
                                --%
                            </span>
                        </div>
                        
                        <!-- 30d % -->
                        <div class="flex-none w-16 text-center">
                            <span class="text-xs font-medium text-gray-500">
                                --%
                            </span>
                        </div>
                        
                        <!-- Quantity -->
                        <div class="flex-none w-16 text-center">
                            <span class="px-2 py-1 bg-blue-900 text-blue-400 border border-blue-700 rounded-full text-xs font-medium">
                                ${investment.quantity}
                            </span>
                        </div>
                        
                        <!-- Unit Buy Price -->
                        <div class="flex-none w-24 text-center text-white font-semibold">
                            $${formatNum(investment.unitBuyPrice)}
                        </div>
                        
                        <!-- Total Buy Price -->
                        <div class="flex-none w-28 text-center text-white font-bold">
                            $${formatNum(investment.totalBuyPrice)}
                        </div>
                        
                        <!-- Buy Date -->
                        <div class="flex-none w-24 text-center text-gray-400 text-sm">
                            ${this.formatDate(investment.date)}
                        </div>
                        
                        <!-- Unit Sell Price -->
                        <div class="flex-none w-24 text-center">
                            ${investment.unitSellPrice ? 
                                `<span class="text-green-400 font-semibold">$${formatNum(investment.unitSellPrice)}</span>` :
                                `<span class="text-gray-500">-</span>`
                            }
                        </div>
                        
                        <!-- Total Sell Price -->
                        <div class="flex-none w-28 text-center">
                            ${investment.totalSellPrice ? 
                                `<span class="text-green-400 font-bold">$${formatNum(investment.totalSellPrice)}</span>` :
                                `<span class="text-gray-500">-</span>`
                            }
                        </div>
                        
                        <!-- Sell Date -->
                        <div class="flex-none w-24 text-center">
                            ${investment.sellDate ? 
                                `<span class="text-gray-400 text-sm">${this.formatDate(investment.sellDate)}</span>` :
                                `<span class="text-gray-500">-</span>`
                            }
                        </div>
                        
                        <!-- P&L -->
                        <div class="flex-none w-24 text-center">
                            ${investment.totalSellPrice ? 
                                `<span class="${profit >= 0 ? 'text-green-400' : 'text-red-400'} font-bold">${profit >= 0 ? '+' : ''}$${formatNum(Math.abs(profit))}</span>` :
                                `<span class="text-gray-500">-</span>`
                            }
                        </div>
                        
                        <!-- Return % -->
                        <div class="flex-none w-20 text-center">
                            ${investment.totalSellPrice ? 
                                `<span class="${profit >= 0 ? 'text-green-400' : 'text-red-400'} font-semibold">${returnPercent >= 0 ? '+' : ''}${returnPercent.toFixed(1)}%</span>` :
                                `<span class="text-gray-500">-</span>`
                            }
                        </div>
                        
                        <!-- Status -->
                        <div class="flex-none w-20 text-center">
                            <span class="px-2 py-1 rounded-full text-xs font-medium ${
                                investment.status === 'sold' 
                                    ? 'bg-green-900 text-green-400 border border-green-700' 
                                    : 'bg-blue-900 text-blue-400 border border-blue-700'
                            }">
                                ${investment.status === 'sold' ? 'Sold' : 'Holding'}
                            </span>
                        </div>
                        
                        <!-- Actions -->
                        <div class="flex-none w-32 flex items-center justify-center">
                            <div class="flex gap-1 items-center">
                                ${!investment.totalSellPrice ? `
                                    <button onclick="window.investmentsPage?.quickSellLongTerm('${investment.id}')" class="text-green-400 hover:text-green-300 transition-all duration-200 p-1 rounded hover:bg-green-900/20" title="Sell Investment">
                                        <i data-lucide="trending-up" class="w-4 h-4"></i>
                                    </button>
                                ` : `
                                    <div class="w-6"></div>
                                `}
                                <button onclick="window.investmentsPage?.editLongTermInvestment('${investment.id}')" class="text-blue-400 hover:text-blue-300 transition-all duration-200 p-1 rounded hover:bg-blue-900/20" title="Edit Investment">
                                    <i data-lucide="edit" class="w-4 h-4"></i>
                                </button>
                                <button onclick="window.investmentsPage?.deleteLongTermInvestment('${investment.id}')" class="text-red-400 hover:text-red-300 transition-all duration-200 p-1 rounded hover:bg-red-900/20" title="Delete Investment">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `
        }).join('')
        
        console.log('✅ Table HTML generated, length:', tbody.innerHTML.length)
        console.log('🔍 First 200 chars of HTML:', tbody.innerHTML.substring(0, 200))
        
        // Refresh Lucide icons after table rendering
        setTimeout(() => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons()
            }
        }, 100)
        
        // Now fetch prices for each investment
        this.fetchAndDisplayPrices(filteredInvestments)
    }


    renderCategoryTabs() {
        const state = this.store()
        const categories = state.categories || []
        const tabsContainer = document.getElementById('categoryTabsContainer')
        if (!tabsContainer) return

        const allTab = `
            <button onclick="window.investmentsPage?.selectCategory(null)" 
                    class="category-tab px-4 py-2 rounded-lg transition font-medium ${!this.selectedCategoryId ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600'}">
                All (${state.longTermInvestments.length})
            </button>
        `

        const categoryTabs = categories.map(category => {
            const count = state.longTermInvestments.filter(inv => inv.categoryId === category.id).length
            // Default categories that cannot be deleted
            const defaultCategoryIds = ['uncategorized', 'weapons', 'knives', 'cases', 'stickers']
            const isDeletable = !defaultCategoryIds.includes(category.id)
            
            return `
                <div class="category-tab-wrapper flex items-center gap-1 ${this.selectedCategoryId === category.id ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'} border ${this.selectedCategoryId === category.id ? 'border-blue-500' : 'border-gray-600'} rounded-lg">
                    <button onclick="window.investmentsPage?.selectCategory('${category.id}')" 
                            class="px-4 py-2 transition font-medium ${this.selectedCategoryId === category.id ? 'text-white' : 'text-gray-300'} flex-1 text-left rounded-l-lg">
                        ${category.name} (${count})
                    </button>
                    ${isDeletable ? `
                        <button onclick="window.investmentsPage?.deleteCategory('${category.id}')" 
                                class="px-2 py-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-r-lg transition" 
                                title="Delete category">
                            <i data-lucide="x" class="w-4 h-4"></i>
                        </button>
                    ` : ''}
                </div>
            `
        }).join('')

        tabsContainer.innerHTML = allTab + categoryTabs
    }

    updateMetrics() {
        const state = this.store()
        const longTermMetrics = this.calculateLongTermMetrics()
        const formatNum = (num) => state.formatNumber ? state.formatNumber(num) : num.toFixed(2)

        // Update header metrics
        this.updateElement('header-total-items', state.longTermInvestments.length)
        this.updateElement('header-holding-value', `$${formatNum(longTermMetrics.holdingValue)}`)
        this.updateElement('header-realized-pnl', `${longTermMetrics.realizedValue >= 0 ? '+' : ''}$${formatNum(Math.abs(longTermMetrics.realizedValue))}`)
        
        // Update main metrics cards
        this.updateElement('longTermTotalQuantity', longTermMetrics.totalQuantity)
        this.updateElement('longTermHoldingValue2', `$${formatNum(longTermMetrics.holdingValue)}`)
        this.updateElement('longTermTotalQuantity2', state.longTermInvestments.length)
        
        // Calculate and update average ROI
        const completedInvestments = state.longTermInvestments.filter(inv => inv.unitSellPrice)
        const avgROI = completedInvestments.length > 0 ? 
            completedInvestments.reduce((sum, inv) => sum + (inv.returnPercentage || 0), 0) / completedInvestments.length : 0
        this.updateElement('averageROI', `${avgROI.toFixed(1)}%`)
        
        // Update active investments count
        const activeInvestments = state.longTermInvestments.filter(inv => !inv.unitSellPrice).length
        this.updateElement('activeInvestments', activeInvestments)
        
        // Update cash price values separately
        this.updateElement('totalCSFloatValue', `$${formatNum(longTermMetrics.totalCSFloatValue)}`)
        this.updateElement('totalBuffValue', `$${formatNum(longTermMetrics.totalBuffValue)}`)
        
        // Update realized P&L with proper color coding
        const realizedPnLElement = document.getElementById('longTermRealizedPnL')
        if (realizedPnLElement) {
            const pnl = longTermMetrics.realizedValue
            realizedPnLElement.textContent = `${pnl >= 0 ? '+' : ''}$${formatNum(Math.abs(pnl))}`
            realizedPnLElement.className = `text-3xl font-bold mb-1 ${pnl >= 0 ? 'text-purple-400' : 'text-red-400'}`
        }
        
        // Update header realized P&L color
        const headerPnLElement = document.getElementById('header-realized-pnl')
        if (headerPnLElement) {
            headerPnLElement.className = `font-semibold ${longTermMetrics.realizedValue >= 0 ? 'text-purple-400' : 'text-red-400'}`
        }
    }

    calculateMetrics() {
        const state = this.store()
        const totalItems = state.investments.length
        const totalInvested = state.investments.reduce((sum, inv) => sum + inv.buyPrice, 0)
        const totalRealized = state.investments.filter(inv => inv.sellPrice).reduce((sum, inv) => sum + inv.sellPrice, 0)
        const totalPnL = state.investments.reduce((sum, inv) => {
            return sum + (inv.sellPrice ? (inv.sellPrice - inv.buyPrice) : 0)
        }, 0)
        const portfolioValue = totalInvested + totalPnL

        return { totalItems, totalInvested, totalRealized, totalPnL, portfolioValue }
    }

    calculateLongTermMetrics() {
        const state = this.store()
        const totalQuantity = state.longTermInvestments.reduce((sum, inv) => sum + inv.quantity, 0)
        const holdingValue = state.longTermInvestments.filter(inv => !inv.totalSellPrice)
            .reduce((sum, inv) => sum + inv.totalBuyPrice, 0)
        const realizedValue = state.longTermInvestments.filter(inv => inv.totalSellPrice)
            .reduce((sum, inv) => sum + inv.totalSellPrice, 0)
        
        // Calculate total CSFloat and Buff163 values from holdings only
        let totalCSFloatValue = 0
        let totalBuffValue = 0
        
        state.longTermInvestments
            .filter(inv => !inv.totalSellPrice) // Only holdings, not sold items
            .forEach(inv => {
                const cacheKey = inv.itemName.toLowerCase()
                const cachedPrices = this.priceCache.get(cacheKey)
                
                if (cachedPrices) {
                    if (cachedPrices.csfloatPrice) {
                        totalCSFloatValue += cachedPrices.csfloatPrice * inv.quantity
                    }
                    if (cachedPrices.buffPrice) {
                        totalBuffValue += cachedPrices.buffPrice * inv.quantity
                    }
                }
            })

        return { 
            totalQuantity, 
            holdingValue, 
            realizedValue, 
            totalCSFloatValue, 
            totalBuffValue 
        }
    }

    updateElement(id, content) {
        const element = document.getElementById(id)
        if (element) {
            element.textContent = content
        }
    }

    selectCategory(categoryId) {
        this.selectedCategoryId = categoryId
        this.renderLongTermInvestments()
        this.renderCategoryTabs()
        this.renderHoldingsChart()
    }

    selectStatusFilter(status) {
        this.selectedStatusFilter = status
        this.renderLongTermInvestments()
        this.renderHoldingsChart()
        this.updateStatusFilterButtons()
    }

    updateStatusFilterButtons() {
        // Update button styles based on selected filter
        const allBtn = document.getElementById('statusFilterAll')
        const holdingBtn = document.getElementById('statusFilterHolding')
        const soldBtn = document.getElementById('statusFilterSold')

        if (allBtn && holdingBtn && soldBtn) {
            // Reset all buttons to inactive state
            const inactiveClasses = 'text-gray-400 hover:text-white hover:bg-gray-700'
            const activeClasses = 'bg-blue-600 text-white'

            allBtn.className = `status-filter-btn px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${this.selectedStatusFilter === null ? activeClasses : inactiveClasses}`
            holdingBtn.className = `status-filter-btn px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${this.selectedStatusFilter === 'holding' ? activeClasses : inactiveClasses}`
            soldBtn.className = `status-filter-btn px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${this.selectedStatusFilter === 'sold' ? activeClasses : inactiveClasses}`
        }
    }

    applySorting(investments) {
        return [...investments].sort((a, b) => {
            switch (this.selectedSortOption) {
                case 'recent':
                    // Sort by most recent activity date (either buy date or sell date) - newest first
                    const buyDateA = this.parseDateForSorting(a.date)
                    const sellDateA = a.sellDate ? this.parseDateForSorting(a.sellDate) : null
                    const mostRecentA = sellDateA && sellDateA > buyDateA ? sellDateA : buyDateA
                    
                    const buyDateB = this.parseDateForSorting(b.date)
                    const sellDateB = b.sellDate ? this.parseDateForSorting(b.sellDate) : null
                    const mostRecentB = sellDateB && sellDateB > buyDateB ? sellDateB : buyDateB
                    
                    return mostRecentB - mostRecentA
                    
                case 'ascending':
                    // Sort by total buy price - lowest to highest
                    return a.totalBuyPrice - b.totalBuyPrice
                    
                case 'descending':
                    // Sort by total buy price - highest to lowest
                    return b.totalBuyPrice - a.totalBuyPrice
                    
                default:
                    return 0
            }
        })
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

    closeSortDropdownOutside(event) {
        const dropdown = document.getElementById('sortDropdown')
        const button = document.getElementById('sortDropdownBtn')
        
        if (dropdown && button && !dropdown.contains(event.target) && !button.contains(event.target)) {
            dropdown.style.display = 'none'
        }
    }

    selectSortOption(option) {
        this.selectedSortOption = option
        this.renderLongTermInvestments()
        this.updateSortButtonText()
        
        // Close dropdown
        const dropdown = document.getElementById('sortDropdown')
        if (dropdown) {
            dropdown.style.display = 'none'
        }
    }

    updateSortButtonText() {
        const buttonText = document.getElementById('sortButtonText')
        if (buttonText) {
            const textMap = {
                'recent': 'Recent',
                'ascending': 'Low to High',
                'descending': 'High to Low'
            }
            buttonText.textContent = textMap[this.selectedSortOption] || 'Recent'
        }
    }

    editInvestment(id) {
        const state = this.store()
        const investment = state.investments.find(inv => inv.id === id)
        if (!investment) return

        this.editingInvestment = investment

        // Populate edit form
        document.getElementById('editItemName').value = investment.itemName
        document.getElementById('editBuyPrice').value = investment.buyPrice
        document.getElementById('editSellPrice').value = investment.sellPrice || ''

        // Handle buy date formatting properly
        const buyDateInput = document.getElementById('editBuyDate')
        const buyDatePicker = document.getElementById('editBuyDatePicker')
        
        if (investment.date) {
            // Check if the stored date is in ISO format (yyyy-mm-dd) or dd/mm/yyyy format
            let formattedBuyDate = investment.date
            let isoBuyDate = null
            
            if (investment.date.includes('-') && investment.date.length === 10) {
                // It's in ISO format, convert to dd/mm/yyyy
                isoBuyDate = investment.date
                formattedBuyDate = this.convertISOToFormattedDate(investment.date)
            } else if (investment.date.includes('/')) {
                // It's already in dd/mm/yyyy format
                formattedBuyDate = investment.date
                isoBuyDate = this.convertFormattedToISODate(investment.date)
            }
            
            // Set the text input to dd/mm/yyyy format
            buyDateInput.value = formattedBuyDate
            
            // Set the hidden date picker to ISO format if available
            if (buyDatePicker && isoBuyDate) {
                buyDatePicker.value = isoBuyDate
            }
        }

        // Handle sell date formatting properly
        const sellDateInput = document.getElementById('editSellDate')
        const sellDatePicker = document.getElementById('editSellDatePicker')
        
        if (investment.sellDate) {
            // Check if the stored date is in ISO format (yyyy-mm-dd) or dd/mm/yyyy format
            let formattedSellDate = investment.sellDate
            let isoSellDate = null
            
            if (investment.sellDate.includes('-') && investment.sellDate.length === 10) {
                // It's in ISO format, convert to dd/mm/yyyy
                isoSellDate = investment.sellDate
                formattedSellDate = this.convertISOToFormattedDate(investment.sellDate)
            } else if (investment.sellDate.includes('/')) {
                // It's already in dd/mm/yyyy format
                formattedSellDate = investment.sellDate
                isoSellDate = this.convertFormattedToISODate(investment.sellDate)
            }
            
            // Set the text input to dd/mm/yyyy format
            sellDateInput.value = formattedSellDate
            
            // Set the hidden date picker to ISO format if available
            if (sellDatePicker && isoSellDate) {
                sellDatePicker.value = isoSellDate
            }
        } else {
            sellDateInput.value = ''
        }

        // Show modal
        document.getElementById('editModal').classList.remove('hidden')
    }

    closeEditModal() {
        document.getElementById('editModal').classList.add('hidden')
        this.editingInvestment = null
    }

    handleEditSubmit(e) {
        e.preventDefault()
        
        if (!this.editingInvestment) return

        const updatedData = {
            itemName: document.getElementById('editItemName').value.trim(),
            buyPrice: parseFloat(document.getElementById('editBuyPrice').value),
            sellPrice: parseFloat(document.getElementById('editSellPrice').value) || null,
            date: document.getElementById('editBuyDate').value,
            sellDate: document.getElementById('editSellDate').value || null
        }

        this.store().updateInvestment(this.editingInvestment.id, updatedData)
        this.renderLongTermInvestments()
        this.updateMetrics()
        this.closeEditModal()
        this.showNotification('Investment updated successfully!', 'success')
    }

    deleteInvestment(id) {
        const state = this.store()
        const investment = state.investments.find(inv => inv.id === id)
        if (!investment) return

        if (confirm(`Are you sure you want to delete "${investment.itemName}"?`)) {
            this.store().deleteInvestment(id)
            this.renderLongTermInvestments()
            this.updateMetrics()
            this.showNotification('Investment deleted', 'success')
        }
    }

    quickSell(id) {
        const state = this.store()
        const investment = state.investments.find(inv => inv.id === id)
        if (!investment) return

        if (investment.sellPrice) {
            this.showNotification('Investment already sold', 'error')
            return
        }

        const sellPrice = prompt(`Enter sell price for "${investment.itemName}":`, investment.buyPrice.toFixed(2))
        if (sellPrice !== null) {
            const price = parseFloat(sellPrice)
            if (price && price > 0) {
                const updatedData = {
                    sellPrice: price,
                    sellDate: new Date().toISOString().split('T')[0],
                    status: 'sold',
                    profit: price - investment.buyPrice,
                    returnPercentage: ((price - investment.buyPrice) / investment.buyPrice) * 100
                }
                
                this.store().updateInvestment(id, updatedData)
                this.renderLongTermInvestments()
                this.updateMetrics()
                this.showNotification(`Sold "${investment.itemName}" for $${price.toFixed(2)}`, 'success')
            } else {
                this.showNotification('Please enter a valid sell price', 'error')
            }
        }
    }

    clearForm() {
        document.getElementById('investmentForm').reset()
        
        // Reset to today's date
        const today = this.getTodayISO()
        document.getElementById('buyDate').value = today
        
        // Reset quantity to 1
        document.getElementById('quantity').value = 1
    }

    exportInvestments(format) {
        const state = this.store()
        const investments = state.longTermInvestments
        
        if (investments.length === 0) {
            this.showNotification('No investments to export', 'error')
            return
        }

        if (format === 'csv') {
            this.exportToCSV(investments)
        } else if (format === 'excel') {
            this.exportToExcel(investments)
        }
    }

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
        
        reader.onerror = () => {
            this.showNotification('Error reading file', 'error')
        }
        
        reader.readAsText(file)
        
        // Clear the file input so the same file can be selected again
        e.target.value = ''
    }

    processCSVContent(csvContent) {
        const lines = csvContent.trim().split('\n')
        if (lines.length < 2) {
            this.showNotification('CSV file appears to be empty or invalid', 'error')
            return
        }

        // Parse header row
        const headers = this.parseCSVRow(lines[0])
        console.log('📋 Parsed headers:', headers)
        
        const requiredHeaders = ['Item Name', 'Quantity', 'Unit Buy Price', 'Buy Date']
        
        // Check if required headers exist (exact match)
        const missingHeaders = requiredHeaders.filter(header => {
            const found = headers.some(h => h.trim() === header.trim())
            console.log(`🔍 Looking for "${header}", found: ${found}`)
            return !found
        })
        
        if (missingHeaders.length > 0) {
            this.showNotification(`Missing required columns: ${missingHeaders.join(', ')}`, 'error')
            return
        }

        // Find column indices
        const getColumnIndex = (searchTerms) => {
            for (const term of searchTerms) {
                const index = headers.findIndex(header => 
                    header.toLowerCase().replace(/\s+/g, '').includes(term.toLowerCase().replace(/\s+/g, ''))
                )
                if (index !== -1) return index
            }
            return -1
        }

        const columnIndices = {
            itemName: getColumnIndex(['itemname', 'item name', 'item', 'name']),
            quantity: getColumnIndex(['quantity', 'qty', 'amount']),
            unitBuyPrice: getColumnIndex(['unitbuyprice', 'unit buy price', 'buyprice', 'buy price', 'price', 'cost']),
            buyDate: getColumnIndex(['buydate', 'buy date', 'date', 'purchasedate', 'purchase date']),
            unitSellPrice: getColumnIndex(['unitsellprice', 'unit sell price', 'sellprice', 'sell price', 'sold', 'sale']),
            sellDate: getColumnIndex(['selldate', 'sell date', 'saledate', 'sale date']),
            category: getColumnIndex(['category', 'type', 'group'])
        }
        
        console.log('🗂️ Column indices:', columnIndices)

        // Validate that required columns were found
        if (columnIndices.itemName === -1 || columnIndices.unitBuyPrice === -1 || columnIndices.buyDate === -1) {
            const missingCols = []
            if (columnIndices.itemName === -1) missingCols.push('Item Name')
            if (columnIndices.unitBuyPrice === -1) missingCols.push('Unit Buy Price') 
            if (columnIndices.buyDate === -1) missingCols.push('Buy Date')
            this.showNotification(`Could not find columns: ${missingCols.join(', ')}`, 'error')
            return
        }

        // Process data rows
        const importedInvestments = []
        const errors = []
        
        for (let i = 1; i < lines.length; i++) {
            const row = this.parseCSVRow(lines[i])
            if (row.length < 2) continue // Skip empty rows
            
            try {
                const investment = this.parseInvestmentRow(row, columnIndices, i + 1)
                if (investment) {
                    importedInvestments.push(investment)
                }
            } catch (error) {
                errors.push(`Row ${i + 1}: ${error.message}`)
            }
        }

        // Show results
        if (errors.length > 0 && importedInvestments.length === 0) {
            this.showNotification(`Import failed. Errors: ${errors.slice(0, 3).join('; ')}`, 'error')
            return
        }

        // Add investments to store
        let successCount = 0
        importedInvestments.forEach(investment => {
            try {
                this.store().addLongTermInvestment(investment)
                successCount++
            } catch (error) {
                errors.push(`Failed to add: ${investment.itemName}`)
            }
        })

        // Update UI
        this.renderLongTermInvestments()
        this.updateMetrics()
        this.renderCategoryTabs()
        this.renderHoldingsChart()

        // Show success message
        let message = `Successfully imported ${successCount} investments`
        if (errors.length > 0) {
            message += `. ${errors.length} errors occurred`
        }
        
        this.showNotification(message, successCount > 0 ? 'success' : 'error')
        
        if (errors.length > 0) {
            console.warn('Import errors:', errors)
        }
    }

    parseCSVRow(row) {
        const result = []
        let current = ''
        let inQuotes = false
        let i = 0
        
        while (i < row.length) {
            const char = row[i]
            const nextChar = row[i + 1]
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Escaped quote
                    current += '"'
                    i += 2
                    continue
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes
                }
            } else if (char === ',' && !inQuotes) {
                // End of field
                result.push(current.trim())
                current = ''
                i++
                continue
            } else {
                current += char
            }
            i++
        }
        
        // Add the last field
        result.push(current.trim())
        return result
    }

    parseInvestmentRow(row, indices, rowNumber) {
        // Required fields
        const itemName = row[indices.itemName]?.replace(/^"|"$/g, '').trim()
        const quantityStr = row[indices.quantity]?.replace(/^"|"$/g, '').trim()
        const buyPriceStr = row[indices.unitBuyPrice]?.replace(/^"|"$/g, '').trim()
        const buyDateStr = row[indices.buyDate]?.replace(/^"|"$/g, '').trim()
        
        if (!itemName) {
            throw new Error('Item name is required')
        }
        
        const quantity = parseInt(quantityStr) || 1
        const buyPrice = parseFloat(buyPriceStr?.replace(/[$,]/g, ''))
        
        if (!buyPrice || buyPrice <= 0) {
            throw new Error('Valid buy price is required')
        }
        
        if (!buyDateStr) {
            throw new Error('Buy date is required')
        }
        
        // Parse buy date
        let buyDate
        try {
            const date = new Date(buyDateStr)
            if (isNaN(date.getTime())) {
                throw new Error('Invalid buy date format')
            }
            buyDate = date.toISOString().split('T')[0]
        } catch (e) {
            throw new Error('Invalid buy date format')
        }
        
        // Optional fields
        const sellPriceStr = row[indices.unitSellPrice]?.replace(/^"|"$/g, '').trim()
        const sellDateStr = row[indices.sellDate]?.replace(/^"|"$/g, '').trim()
        const categoryStr = row[indices.category]?.replace(/^"|"$/g, '').trim()
        
        const sellPrice = sellPriceStr ? parseFloat(sellPriceStr.replace(/[$,]/g, '')) : null
        let sellDate = null
        
        if (sellDateStr) {
            try {
                const date = new Date(sellDateStr)
                if (!isNaN(date.getTime())) {
                    sellDate = date.toISOString().split('T')[0]
                }
            } catch (e) {
                // Ignore invalid sell dates
            }
        }
        
        // Map category name to ID
        let categoryId = 'uncategorized'
        if (categoryStr) {
            const state = this.store()
            const categories = state.categories || []
            const foundCategory = categories.find(cat => 
                cat.name.toLowerCase() === categoryStr.toLowerCase()
            )
            if (foundCategory) {
                categoryId = foundCategory.id
            }
        }
        
        return {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            itemName,
            quantity,
            categoryId,
            unitBuyPrice: buyPrice,
            totalBuyPrice: buyPrice * quantity,
            unitSellPrice: sellPrice,
            totalSellPrice: sellPrice ? (sellPrice * quantity) : null,
            date: buyDate,
            sellDate,
            status: sellPrice ? 'sold' : 'holding',
            profit: sellPrice ? ((sellPrice - buyPrice) * quantity) : null,
            returnPercentage: sellPrice ? ((sellPrice - buyPrice) / buyPrice * 100) : null
        }
    }

    exportToCSV(investments) {
        const headers = [
            'Item Name',
            'Quantity',
            'Unit Buy Price',
            'Total Buy Price',
            'Buy Date',
            'Unit Sell Price',
            'Total Sell Price',
            'Sell Date',
            'P&L',
            'Return %',
            'Status',
            'Category'
        ]

        const csvData = investments.map(investment => {
            const profit = investment.totalSellPrice ? (investment.totalSellPrice - investment.totalBuyPrice) : 0
            const returnPercent = investment.totalSellPrice ? ((investment.totalSellPrice - investment.totalBuyPrice) / investment.totalBuyPrice * 100) : 0
            const state = this.store()
            const categories = state.categories || []
            const categoryName = categories.find(cat => cat.id === investment.categoryId)?.name || 'Uncategorized'
            
            return [
                investment.itemName,
                investment.quantity,
                investment.unitBuyPrice.toFixed(2),
                investment.totalBuyPrice.toFixed(2),
                investment.date,
                investment.unitSellPrice ? investment.unitSellPrice.toFixed(2) : '',
                investment.totalSellPrice ? investment.totalSellPrice.toFixed(2) : '',
                investment.sellDate || '',
                investment.totalSellPrice ? profit.toFixed(2) : '',
                investment.totalSellPrice ? returnPercent.toFixed(2) : '',
                investment.status,
                categoryName
            ]
        })

        const csvContent = [headers, ...csvData]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `investments_${new Date().toISOString().split('T')[0]}.csv`
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        this.showNotification('CSV export completed', 'success')
    }

    exportToExcel(investments) {
        // Check if XLSX library is available
        if (typeof XLSX === 'undefined') {
            this.showNotification('Excel export library not available', 'error')
            return
        }

        const headers = [
            'Item Name',
            'Quantity',
            'Unit Buy Price',
            'Total Buy Price',
            'Buy Date',
            'Unit Sell Price',
            'Total Sell Price',
            'Sell Date',
            'P&L',
            'Return %',
            'Status',
            'Category'
        ]

        const excelData = investments.map(investment => {
            const profit = investment.totalSellPrice ? (investment.totalSellPrice - investment.totalBuyPrice) : 0
            const returnPercent = investment.totalSellPrice ? ((investment.totalSellPrice - investment.totalBuyPrice) / investment.totalBuyPrice * 100) : 0
            const state = this.store()
            const categories = state.categories || []
            const categoryName = categories.find(cat => cat.id === investment.categoryId)?.name || 'Uncategorized'
            
            return {
                'Item Name': investment.itemName,
                'Quantity': investment.quantity,
                'Unit Buy Price': investment.unitBuyPrice,
                'Total Buy Price': investment.totalBuyPrice,
                'Buy Date': investment.date,
                'Unit Sell Price': investment.unitSellPrice || '',
                'Total Sell Price': investment.totalSellPrice || '',
                'Sell Date': investment.sellDate || '',
                'P&L': investment.totalSellPrice ? profit : '',
                'Return %': investment.totalSellPrice ? returnPercent : '',
                'Status': investment.status,
                'Category': categoryName
            }
        })

        const worksheet = XLSX.utils.json_to_sheet(excelData)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Investments')
        
        XLSX.writeFile(workbook, `investments_${new Date().toISOString().split('T')[0]}.xlsx`)
        
        this.showNotification('Excel export completed', 'success')
    }

    clearAllInvestments() {
        const state = this.store()
        
        if (state.longTermInvestments.length === 0) {
            this.showNotification('No investments to clear', 'info')
            return
        }

        const confirmed = confirm(`Are you sure you want to delete all ${state.longTermInvestments.length} investments? This action cannot be undone.`)
        
        if (confirmed) {
            this.store().clearAllLongTermInvestments()
            this.renderLongTermInvestments()
            this.updateMetrics()
            this.renderCategoryTabs()
            this.renderHoldingsChart()
            this.showNotification('All investments cleared', 'success')
        }
    }

    showNotification(message, type = 'info') {
        if (window.notyf) {
            window.notyf.open({ type, message })
        } else {
            console.log(`${type.toUpperCase()}: ${message}`)
        }
    }

    // Category management methods
    showAddCategoryForm() {
        const form = document.getElementById('addCategoryForm')
        if (form) {
            form.classList.remove('hidden')
            document.getElementById('newCategoryName').focus()
        }
    }

    hideAddCategoryForm() {
        const form = document.getElementById('addCategoryForm')
        if (form) {
            form.classList.add('hidden')
            document.getElementById('newCategoryName').value = ''
        }
    }

    saveCategory() {
        const nameInput = document.getElementById('newCategoryName')
        const categoryName = nameInput.value.trim()
        
        if (!categoryName) {
            this.showNotification('Please enter a category name', 'error')
            return
        }

        const state = this.store()
        const categories = state.categories || []

        // Check if category already exists
        const existingCategory = categories.find(cat => 
            cat.name.toLowerCase() === categoryName.toLowerCase()
        )
        
        if (existingCategory) {
            this.showNotification('Category already exists', 'error')
            return
        }

        // Add new category
        const newCategory = {
            id: categoryName.toLowerCase().replace(/\s+/g, '-'),
            name: categoryName,
            isDefault: false
        }
        
        this.store().addCategory(newCategory)
        this.populateCategories()
        this.renderCategoryTabs()
        this.hideAddCategoryForm()
        this.showNotification(`Category "${categoryName}" added successfully`, 'success')
    }

    deleteCategory(categoryId) {
        const state = this.store()
        const categories = state.categories || []
        const categoryToDelete = categories.find(cat => cat.id === categoryId)
        
        if (!categoryToDelete) {
            this.showNotification('Category not found', 'error')
            return
        }

        // Check if it's a default category that cannot be deleted
        const defaultCategoryIds = ['uncategorized', 'weapons', 'knives', 'cases', 'stickers']
        if (defaultCategoryIds.includes(categoryId)) {
            this.showNotification('Cannot delete default categories', 'error')
            return
        }

        const investmentsInCategory = state.longTermInvestments.filter(inv => inv.categoryId === categoryId)
        
        let confirmMessage = `Are you sure you want to delete the "${categoryToDelete.name}" category?`
        if (investmentsInCategory.length > 0) {
            confirmMessage += `\n\nThis category contains ${investmentsInCategory.length} investment(s). They will be moved to "Uncategorized".`
        }

        const confirmed = confirm(confirmMessage)
        
        if (confirmed) {
            // Move investments to uncategorized
            if (investmentsInCategory.length > 0) {
                investmentsInCategory.forEach(investment => {
                    this.store().updateLongTermInvestment(investment.id, { categoryId: 'uncategorized' })
                })
            }
            
            // Remove category from the store
            this.store().deleteCategory(categoryId)
            
            // If this was the selected category, reset to show all
            if (this.selectedCategoryId === categoryId) {
                this.selectedCategoryId = null
            }
            
            // Update UI
            this.populateCategories()
            this.renderCategoryTabs()
            this.renderLongTermInvestments()
            this.renderHoldingsChart()
            
            this.showNotification(`Category "${categoryToDelete.name}" deleted successfully`, 'success')
        }
    }

    // Chart functionality
    initializeHoldingsChart() {
        // Wait for Chart.js to be available
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not available, skipping chart initialization')
            return
        }

        // Add a small delay to ensure DOM is ready
        setTimeout(() => {
            this.renderHoldingsChart()
        }, 100)
    }

    renderHoldingsChart() {
        const canvas = document.getElementById('longTermQuantityChart')
        if (!canvas) {
            console.warn('Chart canvas not found')
            return
        }

        const ctx = canvas.getContext('2d')
        const state = this.store()
        
        // Destroy existing chart if it exists
        if (this.charts.holdingsChart) {
            this.charts.holdingsChart.destroy()
        }

        // Prepare data for holdings (unsold items only)
        let filteredInvestments = state.longTermInvestments.filter(inv => !inv.totalSellPrice) // Only holdings, not sold items
        
        // Apply category filter if selected
        if (this.selectedCategoryId) {
            filteredInvestments = filteredInvestments.filter(inv => inv.categoryId === this.selectedCategoryId)
        }

        // Apply status filter if selected (for consistency, though this chart only shows holdings)
        if (this.selectedStatusFilter === 'sold') {
            // If filter is set to "sold", show no data since this chart only shows holdings
            filteredInvestments = []
        } else if (this.selectedStatusFilter === 'holding') {
            // Already filtered to holdings only above, so no additional filtering needed
        }
        
        const holdingsData = filteredInvestments
            .reduce((acc, inv) => {
                const key = inv.itemName || 'Unknown Item'
                acc[key] = (acc[key] || 0) + (inv.quantity || 0)
                return acc
            }, {})

        const labels = Object.keys(holdingsData)
        const quantities = Object.values(holdingsData)

        // Generate colors for each bar
        const backgroundColors = this.generateColors(labels.length)

        // Create the professional chart
        this.charts.holdingsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Quantity',
                    data: quantities,
                    backgroundColor: backgroundColors,
                    borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
                    borderWidth: 2,
                    borderRadius: {
                        topLeft: 8,
                        topRight: 8,
                        bottomLeft: 0,
                        bottomRight: 0,
                    },
                    borderSkipped: false,
                    hoverBackgroundColor: backgroundColors.map(color => color.replace('0.7', '0.9')),
                    hoverBorderColor: backgroundColors.map(color => color.replace('0.7', '1')),
                    hoverBorderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                animation: {
                    duration: 800,
                    easing: 'easeInOutQuart'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: 'rgba(59, 130, 246, 0.5)',
                        borderWidth: 2,
                        cornerRadius: 12,
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 13
                        },
                        padding: 12,
                        displayColors: true,
                        boxWidth: 8,
                        boxHeight: 8,
                        callbacks: {
                            title: function(tooltipItems) {
                                return tooltipItems[0].label
                            },
                            label: function(context) {
                                const value = context.parsed.y
                                const percentage = ((value / quantities.reduce((a, b) => a + b, 0)) * 100).toFixed(1)
                                return [
                                    `Quantity: ${value}`,
                                    `Share: ${percentage}%`
                                ]
                            },
                            labelColor: function(context) {
                                return {
                                    borderColor: context.dataset.borderColor[context.dataIndex],
                                    backgroundColor: context.dataset.backgroundColor[context.dataIndex]
                                }
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: true,
                            color: 'rgba(75, 85, 99, 0.3)',
                            drawBorder: false,
                            lineWidth: 1
                        },
                        ticks: {
                            color: '#D1D5DB',
                            font: {
                                size: 11,
                                weight: '500'
                            },
                            maxRotation: 45,
                            minRotation: 0,
                            padding: 8
                        },
                        border: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            display: true,
                            color: 'rgba(75, 85, 99, 0.2)',
                            drawBorder: false,
                            lineWidth: 1
                        },
                        ticks: {
                            color: '#D1D5DB',
                            font: {
                                size: 11,
                                weight: '500'
                            },
                            stepSize: Math.max(1, Math.ceil(Math.max(...quantities) / 10)),
                            padding: 8,
                            callback: function(value) {
                                return Number.isInteger(value) ? value : '';
                            }
                        },
                        border: {
                            display: false
                        }
                    }
                },
                elements: {
                    bar: {
                        borderRadius: {
                            topLeft: 8,
                            topRight: 8
                        }
                    }
                },
                onHover: (event, activeElements) => {
                    event.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default'
                }
            }
        })

    }

    generateColors(count) {
        const modernColors = [
            'rgba(59, 130, 246, 0.8)',   'rgba(16, 185, 129, 0.8)',   'rgba(245, 158, 11, 0.8)',
            'rgba(239, 68, 68, 0.8)',    'rgba(139, 92, 246, 0.8)',   'rgba(6, 182, 212, 0.8)',
            'rgba(236, 72, 153, 0.8)',   'rgba(34, 197, 94, 0.8)',    'rgba(249, 115, 22, 0.8)',
            'rgba(168, 85, 247, 0.8)',   'rgba(20, 184, 166, 0.8)',   'rgba(251, 191, 36, 0.8)',
            'rgba(244, 63, 94, 0.8)',    'rgba(99, 102, 241, 0.8)',   'rgba(14, 165, 233, 0.8)',
        ]
        
        const result = []
        for (let i = 0; i < count; i++) {
            if (i < modernColors.length) {
                result.push(modernColors[i])
            } else {
                const hue = (i * 137.508) % 360
                const saturation = 70 + (i % 3) * 10
                const lightness = 55 + (i % 4) * 5
                result.push(`hsla(${hue}, ${saturation}%, ${lightness}%, 0.8)`)
            }
        }
        
        return result
    }

    getErrorHTML(error) {
        return `
            <div class="text-center py-20">
                <div class="text-red-400 text-6xl mb-4 font-bold">!</div>
                <h2 class="text-2xl font-bold text-red-400 mb-4">Investments Page Error</h2>
                <p class="text-gray-300 mb-6">${error.message}</p>
                <button onclick="window.location.reload()" 
                        class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
                    Reload Page
                </button>
            </div>
        `
    }

    // Long Term Investment specific methods
    editLongTermInvestment(id) {
        const state = this.store()
        const investment = state.longTermInvestments.find(inv => inv.id === id)
        if (!investment) return

        this.editingLongTermInvestment = investment

        // Populate edit form
        document.getElementById('editLongTermItemName').value = investment.itemName
        document.getElementById('editLongTermQuantity').value = investment.quantity
        document.getElementById('editLongTermCategory').value = investment.categoryId || ''
        document.getElementById('editLongTermBuyPrice').value = investment.unitBuyPrice
        document.getElementById('editLongTermSellPrice').value = investment.unitSellPrice || ''

        // Handle buy date formatting properly
        const longTermBuyDateInput = document.getElementById('editLongTermBuyDate')
        const longTermBuyDatePicker = document.getElementById('editLongTermBuyDatePicker')
        
        if (investment.date) {
            // Check if the stored date is in ISO format (yyyy-mm-dd) or dd/mm/yyyy format
            let formattedBuyDate = investment.date
            let isoBuyDate = null
            
            if (investment.date.includes('-') && investment.date.length === 10) {
                // It's in ISO format, convert to dd/mm/yyyy
                isoBuyDate = investment.date
                formattedBuyDate = this.convertISOToFormattedDate(investment.date)
            } else if (investment.date.includes('/')) {
                // It's already in dd/mm/yyyy format
                formattedBuyDate = investment.date
                isoBuyDate = this.convertFormattedToISODate(investment.date)
            }
            
            // Set the text input to dd/mm/yyyy format
            longTermBuyDateInput.value = formattedBuyDate
            
            // Set the hidden date picker to ISO format if available
            if (longTermBuyDatePicker && isoBuyDate) {
                longTermBuyDatePicker.value = isoBuyDate
            }
        }

        // Handle sell date formatting properly
        const longTermSellDateInput = document.getElementById('editLongTermSellDate')
        const longTermSellDatePicker = document.getElementById('editLongTermSellDatePicker')
        
        if (investment.sellDate) {
            // Check if the stored date is in ISO format (yyyy-mm-dd) or dd/mm/yyyy format
            let formattedSellDate = investment.sellDate
            let isoSellDate = null
            
            if (investment.sellDate.includes('-') && investment.sellDate.length === 10) {
                // It's in ISO format, convert to dd/mm/yyyy
                isoSellDate = investment.sellDate
                formattedSellDate = this.convertISOToFormattedDate(investment.sellDate)
            } else if (investment.sellDate.includes('/')) {
                // It's already in dd/mm/yyyy format
                formattedSellDate = investment.sellDate
                isoSellDate = this.convertFormattedToISODate(investment.sellDate)
            }
            
            // Set the text input to dd/mm/yyyy format
            longTermSellDateInput.value = formattedSellDate
            
            // Set the hidden date picker to ISO format if available
            if (longTermSellDatePicker && isoSellDate) {
                longTermSellDatePicker.value = isoSellDate
            }
        } else {
            longTermSellDateInput.value = ''
        }

        // Show modal with animation
        const modal = document.getElementById('editLongTermModal')
        modal.classList.remove('hidden')
        const modalContent = modal.querySelector('.bg-gray-900')
        modalContent.classList.remove('scale-95')
        modalContent.classList.add('scale-100')
    }

    closeLongTermEditModal() {
        const modal = document.getElementById('editLongTermModal')
        const modalContent = modal.querySelector('.bg-gray-900')
        
        // Animate out
        modalContent.classList.remove('scale-100')
        modalContent.classList.add('scale-95')
        
        // Hide after animation
        setTimeout(() => {
            modal.classList.add('hidden')
            this.editingLongTermInvestment = null
        }, 200)
    }

    handleLongTermEditSubmit(e) {
        e.preventDefault()
        
        if (!this.editingLongTermInvestment) return

        const updatedData = {
            itemName: document.getElementById('editLongTermItemName').value.trim(),
            quantity: parseInt(document.getElementById('editLongTermQuantity').value) || 1,
            categoryId: document.getElementById('editLongTermCategory').value,
            unitBuyPrice: parseFloat(document.getElementById('editLongTermBuyPrice').value),
            unitSellPrice: parseFloat(document.getElementById('editLongTermSellPrice').value) || null,
            date: document.getElementById('editLongTermBuyDate').value,
            sellDate: document.getElementById('editLongTermSellDate').value || null
        }

        // Recalculate derived fields
        updatedData.totalBuyPrice = updatedData.unitBuyPrice * updatedData.quantity
        updatedData.totalSellPrice = updatedData.unitSellPrice ? (updatedData.unitSellPrice * updatedData.quantity) : null
        updatedData.status = updatedData.unitSellPrice ? 'sold' : 'holding'
        updatedData.profit = updatedData.unitSellPrice ? 
            ((updatedData.unitSellPrice - updatedData.unitBuyPrice) * updatedData.quantity) : null
        updatedData.returnPercentage = updatedData.unitSellPrice && updatedData.unitBuyPrice > 0 ? 
            ((updatedData.unitSellPrice - updatedData.unitBuyPrice) / updatedData.unitBuyPrice * 100) : null

        this.store().updateLongTermInvestment(this.editingLongTermInvestment.id, updatedData)
        this.renderLongTermInvestments()
        this.updateMetrics()
        this.renderHoldingsChart()
        this.closeLongTermEditModal()
        this.showNotification('Investment updated successfully!', 'success')
    }

    // Modal Event Listeners Setup
    setupModalEventListeners() {
        // Delete confirmation modal
        const deleteModal = document.getElementById('deleteConfirmModal')
        const cancelDelete = document.getElementById('cancelDelete')
        const confirmDelete = document.getElementById('confirmDelete')

        if (cancelDelete) {
            cancelDelete.addEventListener('click', () => this.hideDeleteModal(true))
        }

        if (confirmDelete) {
            confirmDelete.addEventListener('click', () => this.executeDelete())
        }

        if (deleteModal) {
            deleteModal.addEventListener('click', (e) => {
                if (e.target === deleteModal) this.hideDeleteModal(true)
            })
        }

        // Sell price modal
        const sellModal = document.getElementById('sellPriceModal')
        const cancelSell = document.getElementById('cancelSell')
        const confirmSell = document.getElementById('confirmSell')
        const sellPriceInput = document.getElementById('sellPriceInput')

        if (cancelSell) {
            cancelSell.addEventListener('click', () => this.hideSellModal(true))
        }

        if (confirmSell) {
            confirmSell.addEventListener('click', () => this.executeSell())
        }

        if (sellModal) {
            sellModal.addEventListener('click', (e) => {
                if (e.target === sellModal) this.hideSellModal(true)
            })
        }

        if (sellPriceInput) {
            sellPriceInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.executeSell()
            })
        }

        // ESC key support
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideDeleteModal(true)
                this.hideSellModal(true)
                this.closeLongTermEditModal()
            }
        })

        // Edit modal click outside to close
        const editModal = document.getElementById('editLongTermModal')
        if (editModal) {
            editModal.addEventListener('click', (e) => {
                if (e.target === editModal) this.closeLongTermEditModal()
            })
        }
    }

    // Setup CSP-compliant event listeners for buttons that use onclick
    setupCSPCompliantEventListeners() {
        // Use event delegation for dynamically generated buttons
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[onclick]') || e.target

            // Handle date picker buttons
            if (target.getAttribute('onclick')?.includes('showPicker()')) {
                e.preventDefault()
                const match = target.getAttribute('onclick').match(/getElementById\('([^']+)'\)/)
                if (match) {
                    const datePicker = document.getElementById(match[1])
                    if (datePicker) {
                        datePicker.showPicker()
                    }
                }
                return
            }

            // Handle investment page functions
            if (target.getAttribute('onclick')?.includes('investmentsPage')) {
                e.preventDefault()
                const onclick = target.getAttribute('onclick')

                if (onclick.includes('toggleSelectMode')) {
                    this.toggleSelectMode()
                } else if (onclick.includes('showMoveDropdown')) {
                    this.showMoveDropdown()
                } else if (onclick.includes('removeSelectedInvestments')) {
                    this.removeSelectedInvestments()
                } else if (onclick.includes('selectStatusFilter')) {
                    const match = onclick.match(/selectStatusFilter\(([^)]+)\)/)
                    if (match) {
                        const value = match[1] === 'null' ? null : match[1].replace(/'/g, '')
                        this.selectStatusFilter(value)
                    }
                } else if (onclick.includes('toggleSortDropdown')) {
                    this.toggleSortDropdown()
                } else if (onclick.includes('selectSortOption')) {
                    const match = onclick.match(/selectSortOption\('([^']+)'\)/)
                    if (match) {
                        this.selectSortOption(match[1])
                    }
                } else if (onclick.includes('toggleSelectAll')) {
                    const checkbox = target
                    this.toggleSelectAll(checkbox.checked)
                } else if (onclick.includes('toggleInvestmentSelection')) {
                    const match = onclick.match(/toggleInvestmentSelection\('([^']+)',\s*([^)]+)\)/)
                    if (match) {
                        const investmentId = match[1]
                        const isChecked = target.checked
                        this.toggleInvestmentSelection(investmentId, isChecked)
                    }
                } else if (onclick.includes('quickSellLongTerm')) {
                    const match = onclick.match(/quickSellLongTerm\('([^']+)'\)/)
                    if (match) {
                        this.quickSellLongTerm(match[1])
                    }
                } else if (onclick.includes('editLongTermInvestment')) {
                    const match = onclick.match(/editLongTermInvestment\('([^']+)'\)/)
                    if (match) {
                        this.editLongTermInvestment(match[1])
                    }
                } else if (onclick.includes('deleteLongTermInvestment')) {
                    const match = onclick.match(/deleteLongTermInvestment\('([^']+)'\)/)
                    if (match) {
                        this.deleteLongTermInvestment(match[1])
                    }
                } else if (onclick.includes('selectCategory')) {
                    const match = onclick.match(/selectCategory\(([^)]+)\)/)
                    if (match) {
                        const categoryId = match[1] === 'null' ? null : match[1].replace(/'/g, '')
                        this.selectCategory(categoryId)
                    }
                } else if (onclick.includes('deleteCategory')) {
                    const match = onclick.match(/deleteCategory\('([^']+)'\)/)
                    if (match) {
                        this.deleteCategory(match[1])
                    }
                } else if (onclick.includes('moveSelectedInvestments')) {
                    const match = onclick.match(/moveSelectedInvestments\('([^']+)'\)/)
                    if (match) {
                        this.moveSelectedInvestments(match[1])
                    }
                }
                return
            }

            // Handle page reload buttons
            if (target.getAttribute('onclick')?.includes('window.location.reload')) {
                e.preventDefault()
                window.location.reload()
                return
            }
        })

        // Handle change events for checkboxes (since they use onchange, not onclick)
        document.addEventListener('change', (e) => {
            const target = e.target

            // Handle select all checkbox
            if (target.id === 'selectAll' && target.getAttribute('onchange')?.includes('toggleSelectAll')) {
                e.preventDefault()
                this.toggleSelectAll(target.checked)
                return
            }

            // Handle individual investment checkboxes
            if (target.classList.contains('investment-checkbox') && target.getAttribute('onchange')?.includes('toggleInvestmentSelection')) {
                e.preventDefault()
                const investmentId = target.getAttribute('data-investment-id')
                if (investmentId) {
                    console.log('🔘 Checkbox changed:', investmentId, target.checked)
                    this.toggleInvestmentSelection(investmentId, target.checked)
                    console.log('📊 Selected investments count:', this.selectedInvestments.size)
                }
                return
            }
        })
    }

    // Modal Helper Methods
    showDeleteModal(id, itemName) {
        this.pendingDeleteId = id
        document.getElementById('deleteItemName').textContent = itemName
        
        // Show modal with animation
        const modal = document.getElementById('deleteConfirmModal')
        modal.style.display = 'flex'
        const modalContent = modal.querySelector('.bg-gray-900')
        modalContent.classList.remove('scale-95')
        modalContent.classList.add('scale-100')
    }

    hideDeleteModal(instant = false) {
        const modal = document.getElementById('deleteConfirmModal')
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

    executeDelete() {
        if (this.pendingDeleteId) {
            const state = this.store()
            this.store().deleteLongTermInvestment(this.pendingDeleteId)
            this.renderLongTermInvestments()
            this.updateMetrics()
            this.renderCategoryTabs()
            this.renderHoldingsChart()
            this.showNotification('Investment deleted', 'success')
            this.hideDeleteModal()
        }
    }

    showSellModal(id, itemName, buyPrice) {
        this.pendingSellId = id
        document.getElementById('sellItemName').textContent = itemName
        document.getElementById('originalBuyPrice').textContent = buyPrice.toFixed(2)
        document.getElementById('sellPriceInput').value = buyPrice.toFixed(2)
        
        // Show modal with animation
        const modal = document.getElementById('sellPriceModal')
        modal.style.display = 'flex'
        const modalContent = modal.querySelector('.bg-gray-900')
        modalContent.classList.remove('scale-95')
        modalContent.classList.add('scale-100')
        
        // Focus and select the input for quick editing
        setTimeout(() => {
            const input = document.getElementById('sellPriceInput')
            input.focus()
            input.select()
        }, 100)
    }

    hideSellModal(instant = false) {
        const modal = document.getElementById('sellPriceModal')
        const modalContent = modal.querySelector('.bg-gray-900')
        
        if (instant) {
            // Instant close for cancel actions
            modal.style.display = 'none'
            this.pendingSellId = null
        } else {
            // Animate out for successful actions
            modalContent.classList.remove('scale-100')
            modalContent.classList.add('scale-95')
            
            // Hide after animation
            setTimeout(() => {
                modal.style.display = 'none'
                this.pendingSellId = null
            }, 200)
        }
    }

    executeSell() {
        if (!this.pendingSellId) return
        
        const sellPriceInput = document.getElementById('sellPriceInput')
        const sellPrice = parseFloat(sellPriceInput.value)
        
        if (!sellPrice || sellPrice <= 0) {
            this.showNotification('Please enter a valid sell price', 'error')
            return
        }

        const state = this.store()
        const investment = state.longTermInvestments.find(inv => inv.id === this.pendingSellId)
        if (!investment) return

        const updatedData = {
            unitSellPrice: sellPrice,
            totalSellPrice: sellPrice * investment.quantity,
            sellDate: new Date().toISOString().split('T')[0],
            status: 'sold',
            profit: (sellPrice - investment.unitBuyPrice) * investment.quantity,
            returnPercentage: ((sellPrice - investment.unitBuyPrice) / investment.unitBuyPrice) * 100
        }
        
        this.store().updateLongTermInvestment(this.pendingSellId, updatedData)
        this.renderLongTermInvestments()
        this.updateMetrics()
        this.renderCategoryTabs()
        this.renderHoldingsChart()
        this.showNotification(`Investment sold for $${sellPrice.toFixed(2)}`, 'success')
        this.hideSellModal()
    }

    deleteLongTermInvestment(id) {
        const state = this.store()
        const investment = state.longTermInvestments.find(inv => inv.id === id)
        if (!investment) return

        this.showDeleteModal(id, investment.itemName)
    }

    quickSellLongTerm(id) {
        const state = this.store()
        const investment = state.longTermInvestments.find(inv => inv.id === id)
        if (!investment) return

        if (investment.unitSellPrice) {
            this.showNotification('Investment already sold', 'error')
            return
        }

        this.showSellModal(id, investment.itemName, investment.unitBuyPrice)
    }

    // Utility methods
    escapeHtml(text) {
        const div = document.createElement('div')
        div.textContent = text
        return div.innerHTML
    }

    /**
     * Fetch and display real-time prices for investments
     */
    async fetchAndDisplayPrices(investments) {
        console.log('💰 Fetching prices for', investments.length, 'investments')
        
        // Batch fetch prices to avoid overwhelming the API
        const pricePromises = investments.map(async (investment) => {
            try {
                // Check cache first
                const cacheKey = investment.itemName.toLowerCase()
                if (this.priceCache.has(cacheKey)) {
                    const cachedPrices = this.priceCache.get(cacheKey)
                    this.updatePriceDisplay(investment.id, cachedPrices)
                    return
                }

                // Prevent duplicate API calls for same item
                if (this.pricePromises.has(cacheKey)) {
                    const prices = await this.pricePromises.get(cacheKey)
                    this.updatePriceDisplay(investment.id, prices)
                    return
                }

                // Fetch prices
                const pricePromise = priceService.getItemPrices(investment.itemName)
                this.pricePromises.set(cacheKey, pricePromise)
                
                const prices = await pricePromise
                
                // Cache the result
                this.priceCache.set(cacheKey, prices)
                this.pricePromises.delete(cacheKey)
                
                // Update display
                this.updatePriceDisplay(investment.id, prices)
                
            } catch (error) {
                console.error(`❌ Error fetching prices for ${investment.itemName}:`, error)
                this.updatePriceDisplay(investment.id, { csfloatPrice: null, buffPrice: null })
            }
        })

        // Execute all price fetches
        await Promise.allSettled(pricePromises)
        console.log('✅ Price fetching completed')
    }

    /**
     * Update price display in the UI
     */
    updatePriceDisplay(investmentId, prices) {
        const csfloatElement = document.getElementById(`csfloat-${investmentId}`)
        const buffElement = document.getElementById(`buff-${investmentId}`)
        
        if (csfloatElement) {
            if (prices.csfloatPrice) {
                csfloatElement.innerHTML = `$${priceService.formatPrice(prices.csfloatPrice)}`
                csfloatElement.classList.add('text-green-400')
            } else {
                csfloatElement.innerHTML = '<span class="text-gray-500">N/A</span>'
            }
        }
        
        if (buffElement) {
            if (prices.buffPrice) {
                buffElement.innerHTML = `$${priceService.formatPrice(prices.buffPrice)}`
                buffElement.classList.add('text-green-400')
            } else {
                buffElement.innerHTML = '<span class="text-gray-500">N/A</span>'
            }
        }
        
        // Update metrics to reflect new price data
        this.updateMetrics()
    }

    /**
     * Toggle selection mode on/off
     */
    toggleSelectMode() {
        this.isSelectMode = !this.isSelectMode
        this.selectedInvestments.clear()

        // Update button text and icon
        const selectModeBtn = document.getElementById('selectModeBtn')
        const removeBtn = document.getElementById('removeSelectedBtn')
        const moveBtn = document.getElementById('moveSelectedBtn')
        const moveDropdown = document.getElementById('moveCategoryDropdown')
        const selectAllColumn = document.getElementById('selectAllColumn')
        
        if (this.isSelectMode) {
            selectModeBtn.innerHTML = `
                <i data-lucide="x-square" class="w-4 h-4 relative z-10"></i>
                <span class="relative z-10">Cancel</span>
            `
            selectModeBtn.className = "relative bg-gradient-to-r from-gray-600 to-slate-700 hover:from-gray-500 hover:to-slate-600 text-white px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 border-2 border-transparent"
            removeBtn.style.display = 'flex'
            moveBtn.style.display = 'flex'
            if (selectAllColumn) {
                selectAllColumn.style.display = 'block'
            }
            // Show individual row checkboxes
            document.querySelectorAll('.investment-checkbox-column').forEach(col => {
                col.style.display = 'block'
            })
        } else {
            selectModeBtn.innerHTML = `
                <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 p-0.5">
                    <div class="w-full h-full bg-gray-900 rounded-xl group-hover:bg-transparent transition-colors duration-300"></div>
                </div>
                <i data-lucide="check-square" class="w-4 h-4 relative z-10"></i>
                <span class="relative z-10">Select</span>
            `
            selectModeBtn.className = "group relative bg-gray-900 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 text-gray-300 hover:text-white px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 overflow-hidden"
            removeBtn.style.display = 'none'
            moveBtn.style.display = 'none'
            if (moveDropdown) moveDropdown.style.display = 'none'
            if (selectAllColumn) {
                selectAllColumn.style.display = 'none'
            }
            // Hide individual row checkboxes
            document.querySelectorAll('.investment-checkbox-column').forEach(col => {
                col.style.display = 'none'
            })
        }

        // Re-render table to show/hide checkboxes
        this.renderLongTermInvestments()
        
        // Refresh Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons()
        }
    }

    /**
     * Toggle selection of individual investment
     */
    toggleInvestmentSelection(investmentId, isChecked) {
        if (isChecked) {
            this.selectedInvestments.add(investmentId)
        } else {
            this.selectedInvestments.delete(investmentId)
        }

        // Update remove button text with count
        this.updateRemoveButtonText()
        
        // Update select all checkbox state
        this.updateSelectAllCheckbox()
    }

    /**
     * Toggle selection of all investments in current category
     */
    toggleSelectAll(isChecked) {
        const state = this.store()
        
        // Get filtered investments (same logic as renderLongTermInvestments)
        let filteredInvestments = state.longTermInvestments

        // Apply category filter
        if (this.selectedCategoryId) {
            filteredInvestments = filteredInvestments.filter(inv => inv.categoryId === this.selectedCategoryId)
        }

        // Apply status filter
        if (this.selectedStatusFilter) {
            filteredInvestments = filteredInvestments.filter(inv => inv.status === this.selectedStatusFilter)
        }
        
        // Only toggle checkboxes for investments in current category view
        const checkboxes = document.querySelectorAll('.investment-checkbox')
        
        checkboxes.forEach(checkbox => {
            const investmentId = checkbox.getAttribute('data-investment-id')
            const isInCurrentCategory = filteredInvestments.some(inv => inv.id === investmentId)
            
            // Only toggle if this investment is in the current filtered view
            if (isInCurrentCategory) {
                checkbox.checked = isChecked
                
                if (isChecked) {
                    this.selectedInvestments.add(investmentId)
                } else {
                    this.selectedInvestments.delete(investmentId)
                }
            }
        })

        this.updateRemoveButtonText()
    }

    /**
     * Setup form enhancements with smart defaults and UX improvements
     */
    setupFormEnhancements() {
        // Set today's date as default for buy date
        const buyDateInput = document.getElementById('buyDate')
        if (buyDateInput && !buyDateInput.value) {
            const today = this.getTodayISO()
            buyDateInput.value = today
        }

        // Add currency symbols to price inputs
        const priceInputs = ['buyPrice', 'sellPrice']
        priceInputs.forEach(inputId => {
            const input = document.getElementById(inputId)
            if (input) {
                // Add input formatting on blur
                input.addEventListener('blur', (e) => {
                    const value = parseFloat(e.target.value)
                    if (!isNaN(value)) {
                        e.target.setAttribute('data-formatted', `$${value.toFixed(2)}`)
                    }
                })
                
                // Remove formatting on focus
                input.addEventListener('focus', (e) => {
                    e.target.removeAttribute('data-formatted')
                })
            }
        })

        // Auto-focus first input for better UX
        const itemNameInput = document.getElementById('itemName')
        if (itemNameInput) {
            setTimeout(() => itemNameInput.focus(), 100)
        }

        // Add form validation feedback
        const form = document.getElementById('investmentForm')
        const requiredInputs = form.querySelectorAll('input[required]')
        requiredInputs.forEach(input => {
            input.addEventListener('invalid', (e) => {
                e.target.classList.add('invalid')
            })
            
            input.addEventListener('input', (e) => {
                if (e.target.checkValidity()) {
                    e.target.classList.remove('invalid')
                }
            })
        })
    }

    /**
     * Update select all checkbox state based on individual selections in current category
     */
    updateSelectAllCheckbox() {
        const selectAllCheckbox = document.getElementById('selectAll')
        const state = this.store()
        
        // Get filtered investments (same logic as renderLongTermInvestments)
        let filteredInvestments = state.longTermInvestments

        // Apply category filter
        if (this.selectedCategoryId) {
            filteredInvestments = filteredInvestments.filter(inv => inv.categoryId === this.selectedCategoryId)
        }

        // Apply status filter
        if (this.selectedStatusFilter) {
            filteredInvestments = filteredInvestments.filter(inv => inv.status === this.selectedStatusFilter)
        }
        
        // Count only selections in current category
        const currentCategoryInvestmentIds = filteredInvestments.map(inv => inv.id)
        const selectedInCurrentCategory = Array.from(this.selectedInvestments)
            .filter(id => currentCategoryInvestmentIds.includes(id))
        
        const totalInCurrentCategory = filteredInvestments.length
        const selectedCount = selectedInCurrentCategory.length

        if (selectAllCheckbox) {
            if (selectedCount === 0) {
                selectAllCheckbox.checked = false
                selectAllCheckbox.indeterminate = false
            } else if (selectedCount === totalInCurrentCategory) {
                selectAllCheckbox.checked = true
                selectAllCheckbox.indeterminate = false
            } else {
                selectAllCheckbox.checked = false
                selectAllCheckbox.indeterminate = true
            }
        }
    }

    /**
     * Update remove button text with selection count
     */
    updateRemoveButtonText() {
        const removeBtn = document.getElementById('removeSelectedBtn')
        const count = this.selectedInvestments.size
        
        if (removeBtn) {
            removeBtn.innerHTML = count === 0 ? `
                <i data-lucide="trash-2" class="w-4 h-4"></i>
                <span>Remove Selected (${count})</span>
            ` : `
                <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-red-500 to-red-600 p-0.5">
                    <div class="w-full h-full bg-gray-900 rounded-xl group-hover:bg-transparent transition-colors duration-300"></div>
                </div>
                <i data-lucide="trash-2" class="w-4 h-4 relative z-10"></i>
                <span class="relative z-10">Remove Selected (${count})</span>
            `
            removeBtn.disabled = count === 0
            removeBtn.className = count === 0 
                ? "group relative bg-gray-900 text-gray-400 px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 cursor-not-allowed border border-gray-600" 
                : "group relative bg-gray-900 hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 text-gray-300 hover:text-white px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 overflow-hidden"
        }
    }

    /**
     * Remove selected investments
     */
    async removeSelectedInvestments() {
        if (this.selectedInvestments.size === 0) return

        const count = this.selectedInvestments.size
        const confirmed = confirm(`Are you sure you want to remove ${count} selected investment${count > 1 ? 's' : ''}?`)
        
        if (!confirmed) return

        try {
            const state = this.store()
            const selectedIds = Array.from(this.selectedInvestments)
            
            console.log('🗑️ Removing investments:', selectedIds)
            console.log('📊 Current investments:', state.longTermInvestments?.length || 0)
            
            // Use the existing deleteLongTermInvestment method for each selected item
            selectedIds.forEach(investmentId => {
                state.deleteLongTermInvestment(investmentId)
            })
            
            console.log('✅ Bulk deletion completed')
            
            // Clear selections and exit select mode
            this.selectedInvestments.clear()
            this.isSelectMode = false
            
            // Update UI
            const selectModeBtn = document.getElementById('selectModeBtn')
            const removeBtn = document.getElementById('removeSelectedBtn')
            const moveBtn = document.getElementById('moveSelectedBtn')
            const moveDropdown = document.getElementById('moveCategoryDropdown')
            
            selectModeBtn.innerHTML = `
                <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 opacity-100 group-hover:opacity-0 transition-opacity duration-300" style="margin: -1px; z-index: -1;"></div>
                <div class="absolute inset-0 rounded-xl bg-gray-800 group-hover:bg-transparent transition-colors duration-300" style="margin: 1px; z-index: -1;"></div>
                <i data-lucide="check-square" class="w-4 h-4 relative z-10"></i>
                <span class="relative z-10">Select</span>
            `
            selectModeBtn.className = "group relative bg-gray-800/50 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 text-gray-300 hover:text-white px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 border-2 border-transparent overflow-hidden"
            removeBtn.style.display = 'none'
            moveBtn.style.display = 'none'
            if (moveDropdown) moveDropdown.style.display = 'none'
            
            // Re-render table
            this.renderLongTermInvestments()
            
            // Show success message
            console.log(`✅ Successfully removed ${count} investment${count > 1 ? 's' : ''}`)
            
            // Refresh Lucide icons
            if (typeof lucide !== 'undefined') {
                lucide.createIcons()
            }
            
        } catch (error) {
            console.error('❌ Error removing selected investments:', error)
            alert('Error removing investments. Please try again.')
        }
    }

    /**
     * Show dropdown with categories for moving selected investments
     */
    showMoveDropdown() {
        console.log('🔍 showMoveDropdown called, selectedInvestments size:', this.selectedInvestments.size)
        if (this.selectedInvestments.size === 0) {
            alert('Please select investments to move first.')
            return
        }

        const state = this.store()
        const dropdown = document.getElementById('moveCategoryDropdown')
        const categoryList = document.getElementById('categoryDropdownList')
        
        console.log('🔍 Move dropdown debug:', {
            dropdown: dropdown,
            categoryList: categoryList,
            categories: state.categories,
            selectedCount: this.selectedInvestments.size
        })
        
        if (!dropdown || !categoryList) {
            console.error('❌ Dropdown elements not found:', { dropdown: !!dropdown, categoryList: !!categoryList })
            return
        }

        if (!state.categories || state.categories.length === 0) {
            alert('No categories available. Please add categories first.')
            return
        }

        // Hide dropdown first (in case it's already open)
        dropdown.style.display = 'none'

        // Populate categories
        categoryList.innerHTML = state.categories.map(category => `
            <button class="group w-full text-left px-4 py-3 hover:bg-gray-800 rounded-lg text-gray-300 hover:text-white transition-all duration-200 flex items-center gap-3 border border-transparent hover:border-gray-600" 
                    onclick="window.investmentsPage?.moveSelectedInvestments('${category.id}')">
                <i data-lucide="folder" class="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors duration-200"></i>
                <span class="font-medium">${category.name}</span>
            </button>
        `).join('')

        console.log('📝 Populated categories:', categoryList.innerHTML)

        // Position dropdown relative to Move button
        const moveButton = document.getElementById('moveSelectedBtn')
        const buttonRect = moveButton.getBoundingClientRect()
        
        dropdown.style.top = `${buttonRect.bottom + 8}px`
        dropdown.style.left = `${buttonRect.right - 220}px` // Align right edge with button
        
        // Show dropdown
        dropdown.style.display = 'block'
        console.log('👁️ Dropdown should be visible now')

        // Hide dropdown when clicking outside
        const hideDropdown = (e) => {
            if (!dropdown.contains(e.target) && !document.getElementById('moveSelectedBtn').contains(e.target)) {
                dropdown.style.display = 'none'
                document.removeEventListener('click', hideDropdown)
            }
        }
        setTimeout(() => document.addEventListener('click', hideDropdown), 10)
    }

    /**
     * Move selected investments to specified category
     */
    async moveSelectedInvestments(categoryId) {
        if (this.selectedInvestments.size === 0) return
        
        const state = this.store()
        const category = state.categories.find(cat => cat.id === categoryId)
        const count = this.selectedInvestments.size
        
        if (!category) {
            alert('Category not found. Please try again.')
            return
        }

        const confirmed = confirm(`Move ${count} selected investment${count > 1 ? 's' : ''} to "${category.name}" category?`)
        
        if (!confirmed) {
            // Hide dropdown
            const dropdown = document.getElementById('moveCategoryDropdown')
            if (dropdown) dropdown.style.display = 'none'
            return
        }

        try {
            const selectedIds = Array.from(this.selectedInvestments)
            
            console.log('📂 Moving investments to category:', category.name, selectedIds)
            
            // Update each selected investment's category
            selectedIds.forEach(investmentId => {
                const investment = state.longTermInvestments.find(inv => inv.id === investmentId)
                if (investment) {
                    // Update the investment's category
                    const updatedInvestment = { ...investment, categoryId: categoryId }
                    state.updateLongTermInvestment(investmentId, updatedInvestment)
                }
            })
            
            console.log('✅ Bulk move completed')
            
            // Clear selections and exit select mode
            this.selectedInvestments.clear()
            this.isSelectMode = false
            
            // Update UI
            const selectModeBtn = document.getElementById('selectModeBtn')
            const removeBtn = document.getElementById('removeSelectedBtn')
            const moveBtn = document.getElementById('moveSelectedBtn')
            const moveDropdown = document.getElementById('moveCategoryDropdown')
            
            selectModeBtn.innerHTML = `
                <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 opacity-100 group-hover:opacity-0 transition-opacity duration-300" style="margin: -1px; z-index: -1;"></div>
                <div class="absolute inset-0 rounded-xl bg-gray-800 group-hover:bg-transparent transition-colors duration-300" style="margin: 1px; z-index: -1;"></div>
                <i data-lucide="check-square" class="w-4 h-4 relative z-10"></i>
                <span class="relative z-10">Select</span>
            `
            selectModeBtn.className = "group relative bg-gray-800/50 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 text-gray-300 hover:text-white px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 border-2 border-transparent overflow-hidden"
            removeBtn.style.display = 'none'
            moveBtn.style.display = 'none'
            if (moveDropdown) moveDropdown.style.display = 'none'
            
            // Re-render table and category tabs
            this.renderLongTermInvestments()
            this.renderCategoryTabs()
            
            // Show success message
            console.log(`✅ Successfully moved ${count} investment${count > 1 ? 's' : ''} to ${category.name}`)
            
            // Refresh Lucide icons
            if (typeof lucide !== 'undefined') {
                lucide.createIcons()
            }
            
        } catch (error) {
            console.error('❌ Error moving selected investments:', error)
            alert('Error moving investments. Please try again.')
        }
    }

    // Cleanup
    destroy() {
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.destroy) {
                chart.destroy()
            }
        })
        
        this.charts = {}
        this.priceCache.clear()
        this.pricePromises.clear()
        this.selectedInvestments.clear()
    }

    /**
     * Format date as dd/mm/yyyy
     */
    formatDate(date) {
        if (!date) return ''
        
        // If date is already in dd/mm/yyyy format, return as is
        if (typeof date === 'string' && date.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            return date
        }
        
        // If date is in dd/mm/yyyy format, parse it properly
        if (typeof date === 'string' && date.includes('/')) {
            const parts = date.split('/')
            if (parts.length === 3) {
                const day = parseInt(parts[0], 10)
                const month = parseInt(parts[1], 10)
                const year = parseInt(parts[2], 10)
                
                // Validate the parsed values
                if (isNaN(day) || isNaN(month) || isNaN(year)) {
                    return date // Return original if parsing failed
                }
                
                return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`
            }
        }
        
        // Try to parse as a standard date
        const d = new Date(date)
        if (isNaN(d.getTime())) {
            return date // Return original if invalid date
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
     * Fix corrupted NaN dates in the investments database
     */
    fixCorruptedDates() {
        const state = this.store()
        let fixedCount = 0
        
        console.log('🔧 Checking investments for corrupted dates...')
        
        // Fix regular investments
        const updatedInvestments = state.investments.map(investment => {
            let needsUpdate = false
            const updated = { ...investment }
            
            // Check buy date
            if (investment.date && investment.date.includes('NaN')) {
                console.log('🚫 Found corrupted buy date:', investment.date, 'in investment:', investment.itemName)
                const today = new Date()
                updated.date = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`
                needsUpdate = true
                fixedCount++
            }
            
            // Check sell date
            if (investment.sellDate && investment.sellDate.includes('NaN')) {
                console.log('🚫 Found corrupted sell date:', investment.sellDate, 'in investment:', investment.itemName)
                updated.sellDate = null // Clear corrupted sell date
                needsUpdate = true
                fixedCount++
            }
            
            return needsUpdate ? updated : investment
        })
        
        // Fix long-term investments
        const updatedLongTermInvestments = state.longTermInvestments.map(investment => {
            let needsUpdate = false
            const updated = { ...investment }
            
            // Check buy date
            if (investment.date && investment.date.includes('NaN')) {
                console.log('🚫 Found corrupted buy date:', investment.date, 'in long-term investment:', investment.itemName)
                const today = new Date()
                updated.date = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`
                needsUpdate = true
                fixedCount++
            }
            
            // Check sell date
            if (investment.sellDate && investment.sellDate.includes('NaN')) {
                console.log('🚫 Found corrupted sell date:', investment.sellDate, 'in long-term investment:', investment.itemName)
                updated.sellDate = null // Clear corrupted sell date
                needsUpdate = true
                fixedCount++
            }
            
            return needsUpdate ? updated : investment
        })
        
        if (fixedCount > 0) {
            // Update both stores
            state.setInvestments(updatedInvestments)
            state.setLongTermInvestments(updatedLongTermInvestments)
            
            console.log(`✅ Fixed ${fixedCount} corrupted dates in investments`)
            this.showNotification(`Fixed ${fixedCount} corrupted dates`, 'success')
            
            // Refresh the display
            this.renderLongTermInvestments()
            this.updateMetrics()
        }
    }
}

// Make InvestmentsPage available globally for debugging
window.InvestmentsPage = InvestmentsPage