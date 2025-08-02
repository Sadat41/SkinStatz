// ================================================================================================
// CS2 TRADING TRACKER - CASE DROPS PAGE
// ================================================================================================
// Case Drop Analytics with hierarchical year/month/week organization
// Enhanced with features from the old tracker implementation
// Supports Wednesday-to-Tuesday week cycles, hierarchical navigation, and comprehensive analytics
// ================================================================================================

import { useAppStore } from '../../store.js'

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
                console.log('🔍 Store state at initialization:', { 
                    store: initState, 
                    years: initState?.years, 
                    caseDrops: initState?.caseDrops 
                })
                this.renderYearTabs()
                this.initializeYearMonthWeek()
                
                // Re-setup event listeners after DOM is fully ready
                this.setupEventListenersDelayed()
            }, 100)
            
            // Initialize charts if Chart.js is available
            this.initializeCharts()
            
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
            const dropDate = new Date(drop.dropDate || drop.date)
            return dropDate >= thirtyDaysAgo
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
            }
        }
    }

    getHTML(stats, state) {
        return `
            <!-- Case Drops Header -->
            <div class="mb-8">
                <div class="flex items-center justify-between mb-4">
                    <div>
                        <h1 class="text-3xl font-bold gradient-text">Case Drop Analytics</h1>
                        <p class="text-gray-400 mt-1">Hierarchical case drop tracking with year/month/week organization</p>
                    </div>
                    <div class="flex items-center space-x-3">
                        <button id="add-new-year-btn" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2">
                            <i data-lucide="plus" class="w-4 h-4"></i>
                            Add New Year
                        </button>
                        <button id="export-cases-csv-btn" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2">
                            <i data-lucide="download" class="w-4 h-4"></i>
                            Export CSV
                        </button>
                        <button id="export-cases-excel-btn" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2">
                            <i data-lucide="file-spreadsheet" class="w-4 h-4"></i>
                            Export Excel
                        </button>
                    </div>
                </div>
            </div>

            <!-- Case Drop Overview -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div class="glass-card rounded-xl p-6 metric-card group hover:scale-105 transition-all duration-300 relative overflow-hidden">
                    <div class="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
                    <div class="relative z-10">
                        <div class="flex items-center justify-between mb-2">
                            <i data-lucide="package" class="w-6 h-6 text-blue-400"></i>
                            <span class="text-xs text-blue-300">Total</span>
                        </div>
                        <div class="text-2xl font-bold gradient-text">${stats.totalCases}</div>
                        <div class="text-sm text-gray-400">Case Drops</div>
                    </div>
                </div>

                <div class="glass-card rounded-xl p-6 metric-card group hover:scale-105 transition-all duration-300 relative overflow-hidden">
                    <div class="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent"></div>
                    <div class="relative z-10">
                        <div class="flex items-center justify-between mb-2">
                            <i data-lucide="dollar-sign" class="w-6 h-6 text-green-400"></i>
                            <span class="text-xs text-green-300">Value</span>
                        </div>
                        <div class="text-2xl font-bold text-green-400">$${this.formatNumber(stats.totalValue)}</div>
                        <div class="text-sm text-gray-400">Total Value</div>
                    </div>
                </div>

                <div class="glass-card rounded-xl p-6 metric-card group hover:scale-105 transition-all duration-300 relative overflow-hidden">
                    <div class="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent"></div>
                    <div class="relative z-10">
                        <div class="flex items-center justify-between mb-2">
                            <i data-lucide="bar-chart" class="w-6 h-6 text-purple-400"></i>
                            <span class="text-xs text-purple-300">Average</span>
                        </div>
                        <div class="text-2xl font-bold text-purple-400">$${this.formatNumber(stats.avgValue)}</div>
                        <div class="text-sm text-gray-400">Avg Value</div>
                    </div>
                </div>

                <div class="glass-card rounded-xl p-6 metric-card group hover:scale-105 transition-all duration-300 relative overflow-hidden">
                    <div class="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent"></div>
                    <div class="relative z-10">
                        <div class="flex items-center justify-between mb-2">
                            <i data-lucide="activity" class="w-6 h-6 text-orange-400"></i>
                            <span class="text-xs text-orange-300">Recent</span>
                        </div>
                        <div class="text-2xl font-bold text-orange-400">${stats.recentActivity.cases}</div>
                        <div class="text-sm text-gray-400">Last 30 Days</div>
                    </div>
                </div>
            </div>

            <!-- Hierarchical Navigation -->
            <div class="glass-card rounded-2xl p-6 mb-6" style="position: relative; z-index: 1;">
                <h3 class="text-lg font-bold gradient-text mb-4">Time Navigation</h3>
                
                <!-- Year Selector -->
                <div class="mb-4" id="year-selector-container">
                    <div class="flex items-center space-x-3 mb-3">
                        <span class="text-gray-300 font-medium">Year:</span>
                        <div class="flex space-x-2 overflow-x-auto" id="year-tabs">
                            <!-- Year tabs will be populated here -->
                        </div>
                    </div>
                </div>

                <!-- Month Selector -->
                <div class="mb-4 hidden relative" id="month-selector-container">
                    <div class="flex items-center space-x-3 mb-3">
                        <span class="text-gray-300 font-medium">Month:</span>
                        <div class="relative inline-block">
                            <button id="month-dropdown-btn" class="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition font-semibold flex items-center gap-2">
                                <span id="selected-month-text">Select Month</span>
                                <i data-lucide="chevron-down" class="w-4 h-4"></i>
                            </button>
                            <!-- Dropdown menu positioned absolutely relative to button -->
                            <div id="month-dropdown-menu" class="hidden bg-gray-800 border border-gray-600 rounded-lg shadow-xl w-40 max-h-64 overflow-y-auto absolute top-full left-0 mt-1" style="z-index: 999999 !important;">
                                <!-- Month options will be populated here -->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Week Selector -->
                <div class="mb-4 hidden" id="week-selector-container">
                    <div class="flex items-center space-x-3 mb-3">
                        <span class="text-gray-300 font-medium">Week:</span>
                        <div class="flex space-x-2 overflow-x-auto" id="week-tabs">
                            <!-- Week tabs will be populated here -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- Add Case Drop Form -->
            <div class="glass-card rounded-2xl p-6 mb-6 hidden" id="case-drop-form-container">
                <h3 class="text-lg font-bold gradient-text mb-4">Add Case Drop</h3>
                <form id="case-drop-form" class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Case Name</label>
                        <input type="text" id="case-name" placeholder="e.g., Recoil Case" 
                               class="input-field w-full px-3 py-2 rounded-lg text-white placeholder-gray-500 outline-none" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Drop Date</label>
                        <input type="date" id="drop-date" 
                               class="input-field w-full px-3 py-2 rounded-lg text-white placeholder-gray-500 outline-none" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Price ($)</label>
                        <input type="number" id="case-price" placeholder="0.00" step="0.01" min="0"
                               class="input-field w-full px-3 py-2 rounded-lg text-white placeholder-gray-500 outline-none" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Account</label>
                        <input type="text" id="case-account" placeholder="e.g., Main" 
                               class="input-field w-full px-3 py-2 rounded-lg text-white placeholder-gray-500 outline-none" required>
                    </div>
                </form>
                <div class="mt-4 flex justify-center">
                    <button id="save-case-drop" class="btn-primary text-white font-semibold py-3 px-8 rounded-lg min-w-[200px]">
                        Add Case Drop
                    </button>
                </div>
            </div>

            <!-- Current Week Summary -->
            <div class="glass-card rounded-2xl p-6 mb-6 hidden" id="week-summary-container">
                <h3 class="text-lg font-bold gradient-text mb-4">Week Summary</h3>
                <div id="week-content">
                    <!-- Week content will be populated here -->
                </div>
            </div>

            <!-- Case Drops Analytics -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div class="glass-card rounded-2xl p-6">
                    <h3 class="text-lg font-bold gradient-text mb-4">Weekly Distribution</h3>
                    <div class="chart-container">
                        <canvas id="weeklyDistributionChart" class="w-full h-64"></canvas>
                    </div>
                </div>
                <div class="glass-card rounded-2xl p-6">
                    <h3 class="text-lg font-bold gradient-text mb-4">Account Statistics</h3>
                    <div id="account-stats-content">
                        ${this.getAccountStatsHTML(stats.accountStats, state)}
                    </div>
                </div>
            </div>

            <!-- Case Drops Table -->
            <div class="glass-card rounded-2xl p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold gradient-text">Case Drops</h3>
                    <button id="add-case-drop-btn" class="btn-primary text-white px-4 py-2 rounded-lg transition flex items-center gap-2 hidden">
                        <i data-lucide="plus" class="w-4 h-4"></i>
                        Add Case Drop
                    </button>
                </div>

                <div id="case-drops-content">
                    ${stats.caseDrops.length > 0 ? this.getCaseDropsTableHTML(stats.caseDrops, state) : this.getEmptyStateHTML()}
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
            <div id="edit-case-drop-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50">
                <div class="glass-card rounded-2xl p-6 max-w-md w-full mx-4">
                    <h3 class="text-xl font-bold gradient-text mb-4">Edit Case Drop</h3>
                    <form id="edit-case-drop-form">
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-2">Case Name</label>
                                <input type="text" id="edit-case-name" class="input-field w-full px-3 py-2 rounded-lg text-white outline-none" required>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-300 mb-2">Drop Date</label>
                                    <input type="date" id="edit-drop-date" class="input-field w-full px-3 py-2 rounded-lg text-white outline-none" required>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-300 mb-2">Price ($)</label>
                                    <input type="number" id="edit-case-price" step="0.01" min="0" class="input-field w-full px-3 py-2 rounded-lg text-white outline-none" required>
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-2">Account</label>
                                <input type="text" id="edit-case-account" class="input-field w-full px-3 py-2 rounded-lg text-white outline-none" required>
                            </div>
                        </div>
                        <div class="flex space-x-4 mt-6">
                            <button type="submit" class="btn-success flex-1 text-white font-semibold py-2 px-4 rounded-lg">
                                Save Changes
                            </button>
                            <button type="button" id="cancel-edit-case-drop" class="bg-gray-600 hover:bg-gray-700 flex-1 text-white font-semibold py-2 px-4 rounded-lg transition">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `
    }

    getCaseDropsTableHTML(caseDrops, state) {
        return `
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead>
                        <tr class="border-b border-gray-700">
                            <th class="text-left py-3 px-4 text-gray-400 text-sm">Case Name</th>
                            <th class="text-center py-3 px-4 text-gray-400 text-sm">Drop Date</th>
                            <th class="text-center py-3 px-4 text-gray-400 text-sm">Price</th>
                            <th class="text-center py-3 px-4 text-gray-400 text-sm">Account</th>
                            <th class="text-center py-3 px-4 text-gray-400 text-sm">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${caseDrops.map(caseDrop => `
                            <tr class="border-b border-gray-800 hover:bg-gray-800/30 transition animate-fadeIn">
                                <td class="py-4 px-4">
                                    <div class="font-medium text-white">${this.escapeHtml(caseDrop.caseName || 'Unknown Case')}</div>
                                    <div class="text-xs text-gray-400">ID: ${caseDrop.id ? caseDrop.id.slice(-8) : 'N/A'}</div>
                                </td>
                                <td class="py-4 px-4 text-center text-gray-300 text-sm">
                                    ${caseDrop.dropDate ? new Date(caseDrop.dropDate).toLocaleDateString() : 'N/A'}
                                </td>
                                <td class="py-4 px-4 text-center text-green-400 font-semibold">
                                    $${this.formatNumber(caseDrop.price || 0)}
                                </td>
                                <td class="py-4 px-4 text-center text-gray-300 text-sm">
                                    ${this.escapeHtml(caseDrop.account || 'N/A')}
                                </td>
                                <td class="py-4 px-4 text-center">
                                    <div class="flex space-x-2 text-sm justify-center">
                                        <button data-action="edit" data-id="${caseDrop.id}"
                                                class="text-blue-400 hover:text-blue-300 transition case-action-btn">
                                            Edit
                                        </button>
                                        <button data-action="remove" data-id="${caseDrop.id}"
                                                class="text-red-400 hover:text-red-300 transition case-action-btn">
                                            Remove
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `
    }

    getEmptyStateHTML() {
        return `
            <div class="text-center py-12 text-gray-400">
                <svg class="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                </svg>
                <h3 class="text-lg font-medium text-gray-400 mb-2">No case drops yet</h3>
                <p class="text-gray-500 mb-4">Start by selecting a year, month, and week above.</p>
            </div>
        `
    }

    setupEventListeners() {
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            // Add new year button
            const addYearBtn = document.getElementById('add-new-year-btn')
            console.log('🔍 Add Year Button found:', !!addYearBtn)
            if (addYearBtn) {
                addYearBtn.addEventListener('click', () => {
                    console.log('➕ Add New Year button clicked')
                    this.showAddYearModal()
                })
            }
        }, 50)

        // Export buttons
        const exportCsvBtn = document.getElementById('export-cases-csv-btn')
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', () => this.exportCasesCSV())
        }
        
        const exportExcelBtn = document.getElementById('export-cases-excel-btn')
        if (exportExcelBtn) {
            exportExcelBtn.addEventListener('click', () => this.exportCasesExcel())
        }

        // Add case drop button
        const addCaseBtn = document.getElementById('add-case-drop-btn')
        if (addCaseBtn) {
            addCaseBtn.addEventListener('click', () => this.showCaseDropForm())
        }

        // Save case drop button
        const saveCaseBtn = document.getElementById('save-case-drop')
        if (saveCaseBtn) {
            saveCaseBtn.addEventListener('click', () => this.saveCaseDrop())
        }

        // Edit case drop form
        const editForm = document.getElementById('edit-case-drop-form')
        if (editForm) {
            editForm.addEventListener('submit', (e) => {
                e.preventDefault()
                this.saveCaseDropEdit()
            })
        }
        
        const cancelEditBtn = document.getElementById('cancel-edit-case-drop')
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
            if (e.target.classList.contains('case-action-btn')) {
                const action = e.target.dataset.action
                const id = e.target.dataset.id
                this.handleCaseDropAction(action, id)
            }
        })
    }

    setupEventListenersDelayed() {
        // Additional event listener setup after DOM is ready
        setTimeout(() => {
            const addYearBtn = document.getElementById('add-new-year-btn')
            console.log('🔍 Delayed Add Year Button setup:', !!addYearBtn)
            if (addYearBtn && !addYearBtn.hasAttribute('data-listener-added')) {
                addYearBtn.addEventListener('click', () => {
                    console.log('➕ Add New Year button clicked (delayed setup)')
                    this.showAddYearModal()
                })
                addYearBtn.setAttribute('data-listener-added', 'true')
            }
        }, 200)
    }

    renderYearTabs() {
        // Get fresh store state
        const state = this.getStore()
        const years = state.years || []
        const yearTabsContainer = document.getElementById('year-tabs')
        
        console.log('🔍 renderYearTabs called:', { 
            storeExists: !!this.getStore, 
            yearsLength: years.length, 
            years: years, 
            containerExists: !!yearTabsContainer 
        })
        
        if (!yearTabsContainer) {
            console.warn('❌ Year tabs container not found')
            return
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
    }

    initializeYearMonthWeek() {
        const state = this.getStore()
        if (state && state.years && state.years.length > 0) {
            // Select first year by default
            this.selectYear(state.years[0].year)
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
        
        const addBtn = document.getElementById('add-case-drop-btn')
        if (addBtn) addBtn.classList.add('hidden')
        
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
        
        const addBtn = document.getElementById('add-case-drop-btn')
        if (addBtn) addBtn.classList.add('hidden')
        
        console.log(`📅 Selected month: ${month} (${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][month]})`)
    }

    renderWeekTabs(year, month) {
        const weekTabsContainer = document.getElementById('week-tabs')
        if (!weekTabsContainer) return

        const state = this.getStore()
        const yearData = state.years.find(y => y.year === year)
        
        if (!yearData || !yearData.months || !yearData.months[month]) {
            // Generate default weeks if no data structure exists
            const weeks = this.generateWeeksForMonth(year, month)
            weekTabsContainer.innerHTML = weeks.map((week, index) => `
                <div class="relative week-tab-container">
                    <button class="week-tab px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition text-sm font-semibold" 
                            data-week-id="${week.id}">
                        ${week.name}
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
                            data-week-id="${week.id}">
                        ${week.name}
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

        // Show week summary and enable form
        this.renderCurrentWeek()
        
        const summaryContainer = document.getElementById('week-summary-container')
        if (summaryContainer) summaryContainer.classList.remove('hidden')
        
        const addBtn = document.getElementById('add-case-drop-btn')
        if (addBtn) addBtn.classList.remove('hidden')
        
        console.log(`📅 Selected week: ${weekId}`)
    }

    enableCaseDropForm() {
        // Form is now available for adding case drops
        console.log(`📅 Selected time period: Year ${this.currentYear}, Month ${this.currentMonth}, Week ${this.currentWeek}`)
    }

    showCaseDropForm() {
        const formContainer = document.getElementById('case-drop-form-container')
        if (formContainer) formContainer.classList.remove('hidden')
        
        // Set default date to today
        const today = new Date().toISOString().split('T')[0]
        const dropDateElement = document.getElementById('drop-date')
        if (dropDateElement) dropDateElement.value = today
    }

    clearCaseDropForm() {
        document.getElementById('case-drop-form').reset()
    }

    saveCaseDrop() {
        const caseDropData = this.getCaseDropFormData()
        
        if (!this.validateCaseDropForm(caseDropData)) {
            return
        }

        // Check if the drop date falls within the current week
        const currentWeek = this.getCurrentWeek()
        if (currentWeek && !this.isDateInWeek(caseDropData.dropDate, currentWeek)) {
            const weekStart = new Date(currentWeek.startDate).toLocaleDateString()
            const weekEnd = new Date(currentWeek.endDate).toLocaleDateString()
            this.showNotification(
                `Drop date must be within ${currentWeek.name} (${weekStart} - ${weekEnd})`, 
                'error'
            )
            return
        }

        const caseDrop = {
            id: this.generateUniqueId(),
            caseName: caseDropData.caseName,
            dropDate: caseDropData.dropDate,
            price: caseDropData.casePrice,
            account: caseDropData.caseAccount,
            weekId: this.currentWeek,
            year: this.currentYear,
            month: this.currentMonth,
            dateAdded: new Date().toISOString()
        }

        // Add to store
        this.getStore().addCaseDrop(caseDrop)
        
        // Clear form and refresh display
        this.clearCaseDropForm()
        this.renderCurrentWeek()
        this.refreshCaseDropsDisplay()
        
        const selectedWeek = this.getCurrentWeek()
        this.showNotification(`Added "${caseDropData.caseName}" to ${selectedWeek?.name || 'current week'}`, 'success')
    }

    refreshCaseDropsDisplay() {
        const state = this.getStore()
        const stats = this.calculateCaseDropStats(state)
        
        // Update the case drops content
        const contentContainer = document.getElementById('case-drops-content')
        if (contentContainer) {
            contentContainer.innerHTML = stats.caseDrops.length > 0 ? 
                this.getCaseDropsTableHTML(stats.caseDrops, state) : 
                this.getEmptyStateHTML()
        }
    }
    
    updateStatisticsCards() {
        const state = this.getStore()
        const stats = this.calculateCaseDropStats(state)
        
        console.log('📊 Updating statistics cards with fresh data:', stats)
        
        // Find the statistics grid container (it's the first grid after the header)
        const headerDiv = document.querySelector('.mb-8')
        if (headerDiv) {
            const statisticsGrid = headerDiv.nextElementSibling
            if (statisticsGrid && statisticsGrid.classList.contains('grid')) {
                statisticsGrid.innerHTML = `
                    <div class="glass-card rounded-xl p-6 metric-card group hover:scale-105 transition-all duration-300 relative overflow-hidden">
                        <div class="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
                        <div class="relative z-10">
                            <div class="flex items-center justify-between mb-2">
                                <i data-lucide="package" class="w-6 h-6 text-blue-400"></i>
                                <span class="text-xs text-blue-300">Total</span>
                            </div>
                            <div class="text-2xl font-bold gradient-text">${stats.totalCases}</div>
                            <div class="text-sm text-gray-400">Case Drops</div>
                        </div>
                    </div>

                    <div class="glass-card rounded-xl p-6 metric-card group hover:scale-105 transition-all duration-300 relative overflow-hidden">
                        <div class="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent"></div>
                        <div class="relative z-10">
                            <div class="flex items-center justify-between mb-2">
                                <i data-lucide="dollar-sign" class="w-6 h-6 text-green-400"></i>
                                <span class="text-xs text-green-300">Value</span>
                            </div>
                            <div class="text-2xl font-bold text-green-400">$${this.formatNumber(stats.totalValue)}</div>
                            <div class="text-sm text-gray-400">Total Value</div>
                        </div>
                    </div>

                    <div class="glass-card rounded-xl p-6 metric-card group hover:scale-105 transition-all duration-300 relative overflow-hidden">
                        <div class="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent"></div>
                        <div class="relative z-10">
                            <div class="flex items-center justify-between mb-2">
                                <i data-lucide="bar-chart" class="w-6 h-6 text-purple-400"></i>
                                <span class="text-xs text-purple-300">Average</span>
                            </div>
                            <div class="text-2xl font-bold text-purple-400">$${this.formatNumber(stats.avgValue)}</div>
                            <div class="text-sm text-gray-400">Avg Value</div>
                        </div>
                    </div>

                    <div class="glass-card rounded-xl p-6 metric-card group hover:scale-105 transition-all duration-300 relative overflow-hidden">
                        <div class="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent"></div>
                        <div class="relative z-10">
                            <div class="flex items-center justify-between mb-2">
                                <i data-lucide="activity" class="w-6 h-6 text-orange-400"></i>
                                <span class="text-xs text-orange-300">Recent</span>
                            </div>
                            <div class="text-2xl font-bold text-orange-400">${stats.recentActivity.cases}</div>
                            <div class="text-sm text-gray-400">Last 30 Days</div>
                        </div>
                    </div>
                `
                
                // Re-initialize icons after updating the HTML
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons()
                }
                
                console.log('✅ Statistics cards updated successfully')
            }
        }
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
        
        // Check if year has case drops
        const state = this.getStore()
        const caseDropsInYear = state.caseDrops.filter(caseDrop => {
            const dropDate = new Date(caseDrop.dropDate)
            return dropDate.getFullYear() === year
        })
        
        let message = `Are you sure you want to delete year ${year}?`
        if (caseDropsInYear.length > 0) {
            message += `\n\nThis will also delete ${caseDropsInYear.length} case drop(s) from this year.`
        }
        
        if (confirm(message)) {
            this.deleteYear(year)
        }
    }
    
    deleteYear(year) {
        console.log('🗑️ deleteYear called for year:', year)
        
        try {
            const currentState = this.getStore()
            console.log('🔍 Current state before deletion:', { 
                years: currentState.years?.length, 
                caseDrops: currentState.caseDrops?.length 
            })
            
            // Get case drops that will be deleted for logging
            const caseDropsToDelete = currentState.caseDrops.filter(caseDrop => {
                const dropDate = new Date(caseDrop.dropDate)
                return dropDate.getFullYear() === year
            })
            console.log(`🗑️ Will delete ${caseDropsToDelete.length} case drops`)
            
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
            drop.dateAdded ? new Date(drop.dateAdded).toLocaleDateString() : ''
        ])
        
        const csvContent = [csvHeaders, ...csvRows].map(row => 
            row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
        ).join('\n')
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `cs2-case-drops-${new Date().toISOString().split('T')[0]}.csv`
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
                drop.dateAdded ? new Date(drop.dateAdded).toLocaleDateString() : ''
            ])
        ]
        
        const ws = XLSX.utils.aoa_to_sheet(wsData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Case Drops')
        
        XLSX.writeFile(wb, `cs2-case-drops-${new Date().toISOString().split('T')[0]}.xlsx`)
        
        this.showNotification(`Exported ${caseDrops.length} case drops to Excel`, 'success')
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
                <div class="text-red-400 text-6xl mb-4">⚠️</div>
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
    // UTILITY METHODS
    // ============================================================================================

    /**
     * Generates a unique ID for case drops
     */
    generateUniqueId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9)
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
        return {
            caseName: document.getElementById('case-name').value.trim(),
            dropDate: document.getElementById('drop-date').value,
            casePrice: parseFloat(document.getElementById('case-price').value),
            caseAccount: document.getElementById('case-account').value.trim()
        }
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
            dropDateElement.value = new Date().toISOString().split('T')[0]
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
     * Generates weeks for a specific month (Wednesday to Tuesday cycle)
     */
    generateWeeksForMonth(year, month) {
        const weeks = []
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        
        // Simple week generation for now
        for (let week = 1; week <= 4; week++) {
            weeks.push({
                id: `${year}-${month}-w${week}`,
                name: `Week ${week}`,
                startDate: new Date(year, month, (week - 1) * 7 + 1).toISOString().split('T')[0],
                endDate: new Date(year, month, week * 7).toISOString().split('T')[0]
            })
        }
        
        return weeks
    }

    /**
     * Checks if date falls within a week
     */
    isDateInWeek(dateString, week) {
        if (!week.startDate || !week.endDate) return true // Allow if no date range set
        
        const dropDateObj = new Date(dateString)
        const weekStart = new Date(week.startDate)
        const weekEnd = new Date(week.endDate)
        return dropDateObj >= weekStart && dropDateObj <= weekEnd
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
     * Shows the case drop form
     */
    showCaseDropForm() {
        if (!this.currentWeek) {
            this.showNotification('Please select a year, month, and week first', 'warning')
            return
        }
        
        const formContainer = document.getElementById('case-drop-form-container')
        if (formContainer) formContainer.classList.remove('hidden')
        
        // Set default date to today
        const today = new Date().toISOString().split('T')[0]
        const dropDateElement = document.getElementById('drop-date')
        if (dropDateElement) dropDateElement.value = today
    }

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
                    <div class="text-xs text-gray-400">${stat.cases} cases</div>
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
        document.getElementById('edit-case-name').value = caseDrop.caseName || ''
        document.getElementById('edit-drop-date').value = caseDrop.dropDate || ''
        document.getElementById('edit-case-price').value = caseDrop.price || ''
        document.getElementById('edit-case-account').value = caseDrop.account || ''

        // Show modal
        const modal = document.getElementById('edit-case-drop-modal')
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
            caseName: document.getElementById('edit-case-name').value.trim(),
            dropDate: document.getElementById('edit-drop-date').value,
            price: parseFloat(document.getElementById('edit-case-price').value),
            account: document.getElementById('edit-case-account').value.trim()
        }
        
        if (!editData.caseName || !editData.dropDate || 
            !editData.price || editData.price <= 0 || 
            !editData.account) {
            this.showNotification('Please fill in all required fields with valid values', 'error')
            return
        }

        // Update in store
        this.getStore().updateCaseDrop(this.editingCaseDrop.id, editData)
        
        this.closeCaseDropEditModal()
        this.renderCurrentWeek()
        this.refreshCaseDropsDisplay()
        this.showNotification(`Updated "${editData.caseName}" successfully`, 'success')
    }

    /**
     * Closes case drop edit modal
     */
    closeCaseDropEditModal() {
        const modal = document.getElementById('edit-case-drop-modal')
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

        if (confirm(`Are you sure you want to remove "${caseDrop.caseName}" from your case drops?`)) {
            this.getStore().deleteCaseDrop(id)
            this.renderCurrentWeek()
            this.refreshCaseDropsDisplay()
            this.showNotification(`Removed "${caseDrop.caseName}" from case drops`, 'success')
            console.log('✅ Case drop removed:', caseDrop.caseName)
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
        
        if (currentWeekCaseDrops.length === 0) {
            weekContent.innerHTML = '<p class="text-gray-400 text-center py-4">No case drops for this week yet</p>'
            return
        }
        
        weekContent.innerHTML = this.generateWeekContent(currentWeek, currentWeekCaseDrops)
    }

    /**
     * Generates week content HTML
     */
    generateWeekContent(currentWeek, currentWeekCaseDrops) {
        const state = this.getStore()
        const totalCases = currentWeekCaseDrops.length
        const totalValue = currentWeekCaseDrops.reduce((sum, drop) => sum + (drop.price || 0), 0)
        const avgValue = totalCases > 0 ? totalValue / totalCases : 0
        
        const weekStart = currentWeek.startDate ? new Date(currentWeek.startDate).toLocaleDateString() : 'N/A'
        const weekEnd = currentWeek.endDate ? new Date(currentWeek.endDate).toLocaleDateString() : 'N/A'
        
        return `
            <!-- Week Summary -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div class="glass-card rounded-xl p-4 text-center">
                    <div class="text-2xl font-bold gradient-text">${totalCases}</div>
                    <div class="text-sm text-gray-400">Total Cases</div>
                </div>
                <div class="glass-card rounded-xl p-4 text-center">
                    <div class="text-2xl font-bold text-green-400">$${this.formatNumber(totalValue)}</div>
                    <div class="text-sm text-gray-400">Total Value</div>
                </div>
                <div class="glass-card rounded-xl p-4 text-center">
                    <div class="text-2xl font-bold text-blue-400">$${this.formatNumber(avgValue)}</div>
                    <div class="text-sm text-gray-400">Average Value</div>
                </div>
                <div class="glass-card rounded-xl p-4 text-center">
                    <div class="text-lg font-bold text-gray-300">${weekStart} - ${weekEnd}</div>
                    <div class="text-sm text-gray-400">Week Period</div>
                </div>
            </div>
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
        
        // Force UI update after store change
        this.forceUIUpdate()
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
        // Placeholder for chart initialization
        console.log('📊 Chart initialization placeholder - Chart.js integration pending')
    }
}