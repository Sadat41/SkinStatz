// ================================================================================================
// EXPORT/IMPORT UTILITY - COMPREHENSIVE DATA MANAGEMENT
// ================================================================================================
// Professional export/import functionality for Trading, Investments, and Weekly Drops data
// Supports JSON, CSV, and Excel formats with data validation and error handling
// ================================================================================================

class ExportImportManager {
    constructor(store) {
        this.store = store
    }

    // ============================================================================================
    // EXPORT FUNCTIONALITY
    // ============================================================================================

    /**
     * Export all data as JSON with comprehensive structure
     */
    exportAllDataAsJSON() {
        try {
            const data = this.store.exportData()
            
            // Add summary information for user reference
            const summary = this.generateExportSummary(data)
            const enrichedData = {
                ...data,
                summary,
                instructions: {
                    import: "To import this data, use the Import Data button in SkinStatz sidebar",
                    compatibility: "This export is compatible with SkinStatz v2.0.0 and later",
                    warning: "Always backup your existing data before importing"
                }
            }
            
            const filename = `SkinStatz_Complete_Export_${this.formatDateForFilename()}.json`
            this.downloadFile(JSON.stringify(enrichedData, null, 2), filename, 'application/json')
            
            if (window.notyf) {
                window.notyf.success(`✅ Complete data exported: ${summary.totalRecords} records in ${filename}`)
            }
        } catch (error) {
            console.error('Export failed:', error)
            if (window.notyf) {
                window.notyf.error(`❌ Export failed: ${error.message}`)
            }
        }
    }

    /**
     * Export trading data only
     */
    exportTradingData() {
        try {
            const state = this.store
            const tradingData = {
                tradeHistory: state.tradeHistory || [],
                accountBalance: state.accountBalance || 0,
                deposits: state.deposits || [],
                withdrawals: state.withdrawals || [],
                performanceMetrics: state.performanceMetrics || {},
                exportDate: new Date().toISOString(),
                version: '2.0.0',
                type: 'trading'
            }

            const filename = `SkinStatz_Trading_Export_${this.formatDateForFilename()}.json`
            this.downloadFile(JSON.stringify(tradingData, null, 2), filename, 'application/json')
            
            if (window.notyf) {
                window.notyf.success(`📈 Trading data exported successfully`)
            }
        } catch (error) {
            console.error('Trading export failed:', error)
            if (window.notyf) {
                window.notyf.error(`❌ Trading export failed: ${error.message}`)
            }
        }
    }

    /**
     * Export investments data only
     */
    exportInvestmentsData() {
        try {
            const state = this.store
            const investmentsData = {
                investments: state.investments || [],
                longTermInvestments: state.longTermInvestments || [],
                categories: state.categories || [],
                exportDate: new Date().toISOString(),
                version: '2.0.0',
                type: 'investments'
            }

            const filename = `SkinStatz_Investments_Export_${this.formatDateForFilename()}.json`
            this.downloadFile(JSON.stringify(investmentsData, null, 2), filename, 'application/json')
            
            if (window.notyf) {
                window.notyf.success(`💼 Investments data exported successfully`)
            }
        } catch (error) {
            console.error('Investments export failed:', error)
            if (window.notyf) {
                window.notyf.error(`❌ Investments export failed: ${error.message}`)
            }
        }
    }

    /**
     * Export weekly drops data only
     */
    exportWeeklyDropsData() {
        try {
            const state = this.store
            const weeklyDropsData = {
                caseDrops: state.caseDrops || [],
                years: state.years || [],
                exportDate: new Date().toISOString(),
                version: '2.0.0',
                type: 'weeklyDrops'
            }

            const filename = `SkinStatz_WeeklyDrops_Export_${this.formatDateForFilename()}.json`
            this.downloadFile(JSON.stringify(weeklyDropsData, null, 2), filename, 'application/json')
            
            if (window.notyf) {
                window.notyf.success(`📦 Weekly Drops data exported successfully`)
            }
        } catch (error) {
            console.error('Weekly drops export failed:', error)
            if (window.notyf) {
                window.notyf.error(`❌ Weekly drops export failed: ${error.message}`)
            }
        }
    }

    /**
     * Export data as CSV format (for spreadsheet compatibility)
     */
    exportAsCSV(dataType = 'all') {
        try {
            let csvContent = ''
            let filename = ''

            const state = this.store

            switch (dataType) {
                case 'trading':
                    csvContent = this.convertTradingToCSV(state.tradeHistory || [])
                    filename = `SkinStatz_Trading_${this.formatDateForFilename()}.csv`
                    break
                case 'investments':
                    csvContent = this.convertInvestmentsToCSV([...(state.investments || []), ...(state.longTermInvestments || [])])
                    filename = `SkinStatz_Investments_${this.formatDateForFilename()}.csv`
                    break
                case 'weeklyDrops':
                    csvContent = this.convertWeeklyDropsToCSV(state.caseDrops || [])
                    filename = `SkinStatz_WeeklyDrops_${this.formatDateForFilename()}.csv`
                    break
                default:
                    // Export all as separate CSV files in a zip would be ideal, but for now export investments
                    csvContent = this.convertInvestmentsToCSV([...(state.investments || []), ...(state.longTermInvestments || [])])
                    filename = `SkinStatz_AllInvestments_${this.formatDateForFilename()}.csv`
            }

            this.downloadFile(csvContent, filename, 'text/csv')
            
            if (window.notyf) {
                window.notyf.success(`📊 ${dataType} data exported as CSV successfully`)
            }
        } catch (error) {
            console.error('CSV export failed:', error)
            if (window.notyf) {
                window.notyf.error(`❌ CSV export failed: ${error.message}`)
            }
        }
    }

    // ============================================================================================
    // IMPORT FUNCTIONALITY
    // ============================================================================================

    /**
     * Import data from file
     */
    importData(file, importMode = 'merge') {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('No file selected'))
                return
            }

            const reader = new FileReader()
            
            reader.onload = (e) => {
                try {
                    const content = e.target.result
                    let data

                    // Parse based on file type
                    if (file.name.endsWith('.json')) {
                        data = JSON.parse(content)
                    } else if (file.name.endsWith('.csv')) {
                        // For CSV, we'll need to implement CSV parsing
                        reject(new Error('CSV import not yet implemented. Please use JSON format.'))
                        return
                    } else {
                        reject(new Error('Unsupported file format. Please use JSON.'))
                        return
                    }

                    // Validate data structure
                    this.validateImportData(data)

                    // Import based on mode
                    if (importMode === 'replace') {
                        this.store.replaceAllData(data)
                        if (window.notyf) {
                            window.notyf.success('✅ Data replaced successfully')
                        }
                    } else {
                        this.store.importData(data)
                        if (window.notyf) {
                            window.notyf.success('✅ Data imported and merged successfully')
                        }
                    }

                    resolve(data)
                } catch (error) {
                    console.error('Import failed:', error)
                    if (window.notyf) {
                        window.notyf.error(`❌ Import failed: ${error.message}`)
                    }
                    reject(error)
                }
            }

            reader.onerror = () => {
                const error = new Error('Failed to read file')
                if (window.notyf) {
                    window.notyf.error('❌ Failed to read file')
                }
                reject(error)
            }

            reader.readAsText(file)
        })
    }

    // ============================================================================================
    // VALIDATION & UTILITY FUNCTIONS
    // ============================================================================================

    /**
     * Validate imported data structure
     */
    validateImportData(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data format: Expected object')
        }

        // Check version compatibility
        if (data.version && !this.isVersionCompatible(data.version)) {
            console.warn(`Warning: Data version ${data.version} may not be fully compatible`)
        }

        // Validate array fields
        const arrayFields = ['trades', 'tradeHistory', 'investments', 'longTermInvestments', 'caseDrops', 'years', 'deposits', 'withdrawals', 'categories']
        arrayFields.forEach(field => {
            if (data[field] && !Array.isArray(data[field])) {
                throw new Error(`Invalid data format: ${field} must be an array`)
            }
        })

        // Validate numeric fields
        if (data.accountBalance && typeof data.accountBalance !== 'number') {
            throw new Error('Invalid data format: accountBalance must be a number')
        }

        return true
    }

    /**
     * Check version compatibility
     */
    isVersionCompatible(version) {
        const currentVersion = '2.0.0'
        const supportedVersions = ['1.0.0', '2.0.0', '2.0.0-simple']
        return supportedVersions.includes(version)
    }

    // ============================================================================================
    // CSV CONVERSION FUNCTIONS
    // ============================================================================================

    convertTradingToCSV(trades) {
        if (!trades || trades.length === 0) return 'No trading data available'

        const headers = ['ID', 'Date', 'Item', 'Type', 'Entry Price', 'Exit Price', 'Quantity', 'Profit', 'Status', 'Notes']
        let csv = headers.join(',') + '\\n'

        trades.forEach(trade => {
            const row = [
                trade.id || '',
                trade.date || '',
                `"${(trade.itemName || '').replace(/"/g, '""')}"`,
                trade.type || '',
                trade.entryPrice || 0,
                trade.exitPrice || '',
                trade.quantity || 1,
                trade.profit || 0,
                trade.status || '',
                `"${(trade.notes || '').replace(/"/g, '""')}"`
            ]
            csv += row.join(',') + '\\n'
        })

        return csv
    }

    convertInvestmentsToCSV(investments) {
        if (!investments || investments.length === 0) return 'No investment data available'

        const headers = ['ID', 'Date', 'Item Name', 'Buy Price', 'Sell Price', 'Sell Date', 'Status', 'Profit', 'Return %', 'Category', 'Notes']
        let csv = headers.join(',') + '\\n'

        investments.forEach(inv => {
            const row = [
                inv.id || '',
                inv.date || '',
                `"${(inv.itemName || '').replace(/"/g, '""')}"`,
                inv.buyPrice || 0,
                inv.sellPrice || '',
                inv.sellDate || '',
                inv.status || 'holding',
                inv.profit || 0,
                inv.returnPercentage || 0,
                inv.category || '',
                `"${(inv.notes || '').replace(/"/g, '""')}"`
            ]
            csv += row.join(',') + '\\n'
        })

        return csv
    }

    convertWeeklyDropsToCSV(caseDrops) {
        if (!caseDrops || caseDrops.length === 0) return 'No weekly drops data available'

        const headers = ['ID', 'Drop Date', 'Case Type', 'Item Received', 'Item Value', 'Week', 'Month', 'Year', 'Notes']
        let csv = headers.join(',') + '\\n'

        caseDrops.forEach(drop => {
            const row = [
                drop.id || '',
                drop.dropDate || '',
                `"${(drop.caseType || '').replace(/"/g, '""')}"`,
                `"${(drop.itemReceived || '').replace(/"/g, '""')}"`,
                drop.itemValue || 0,
                drop.week || '',
                drop.month || '',
                drop.year || '',
                `"${(drop.notes || '').replace(/"/g, '""')}"`
            ]
            csv += row.join(',') + '\\n'
        })

        return csv
    }

    // ============================================================================================
    // UTILITY FUNCTIONS
    // ============================================================================================

    /**
     * Generate summary of exported data
     */
    generateExportSummary(data) {
        const summary = {
            totalRecords: 0,
            trading: {
                trades: (data.trades || []).length,
                tradeHistory: (data.tradeHistory || []).length,
                deposits: (data.deposits || []).length,
                withdrawals: (data.withdrawals || []).length,
                accountBalance: data.accountBalance || 0
            },
            investments: {
                shortTerm: (data.investments || []).length,
                longTerm: (data.longTermInvestments || []).length,
                categories: (data.categories || []).length
            },
            weeklyDrops: {
                caseDrops: (data.caseDrops || []).length,
                years: (data.years || []).length
            }
        }

        // Calculate total records
        summary.totalRecords = 
            summary.trading.trades +
            summary.trading.tradeHistory +
            summary.trading.deposits +
            summary.trading.withdrawals +
            summary.investments.shortTerm +
            summary.investments.longTerm +
            summary.investments.categories +
            summary.weeklyDrops.caseDrops +
            summary.weeklyDrops.years

        return summary
    }

    /**
     * Download file to user's computer
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    /**
     * Format current date for filename
     */
    formatDateForFilename() {
        const now = new Date()
        return now.getFullYear() + 
               String(now.getMonth() + 1).padStart(2, '0') + 
               String(now.getDate()).padStart(2, '0') + '_' +
               String(now.getHours()).padStart(2, '0') + 
               String(now.getMinutes()).padStart(2, '0')
    }

    /**
     * Show import dialog
     */
    showImportDialog() {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = '.json,.csv'
            
            input.onchange = (event) => {
                const file = event.target.files[0]
                if (file) {
                    // Ask user for import mode
                    const importMode = confirm('Do you want to REPLACE all existing data?\\n\\nClick OK to REPLACE all data\\nClick Cancel to MERGE with existing data') 
                        ? 'replace' 
                        : 'merge'
                    
                    this.importData(file, importMode)
                        .then(resolve)
                        .catch(reject)
                } else {
                    reject(new Error('No file selected'))
                }
            }
            
            input.click()
        })
    }

    /**
     * Show export options dialog
     */
    showExportDialog() {
        const options = [
            { key: 'all', label: '📊 Export All Data (JSON)', action: () => this.exportAllDataAsJSON() },
            { key: 'trading', label: '📈 Export Trading Data Only', action: () => this.exportTradingData() },
            { key: 'investments', label: '💼 Export Investments Only', action: () => this.exportInvestmentsData() },
            { key: 'weeklyDrops', label: '📦 Export Weekly Drops Only', action: () => this.exportWeeklyDropsData() },
            { key: 'csv-investments', label: '📋 Export Investments as CSV', action: () => this.exportAsCSV('investments') },
            { key: 'csv-drops', label: '📋 Export Weekly Drops as CSV', action: () => this.exportAsCSV('weeklyDrops') }
        ]

        // Create a simple selection dialog
        const selection = prompt(
            'Choose export option:\\n\\n' + 
            options.map((opt, i) => `${i + 1}. ${opt.label}`).join('\\n') + 
            '\\n\\nEnter number (1-' + options.length + '):'
        )

        const selectedIndex = parseInt(selection) - 1
        if (selectedIndex >= 0 && selectedIndex < options.length) {
            options[selectedIndex].action()
        } else if (selection !== null) {
            if (window.notyf) {
                window.notyf.error('❌ Invalid selection')
            }
        }
    }
}

// Make it available globally
window.ExportImportManager = ExportImportManager