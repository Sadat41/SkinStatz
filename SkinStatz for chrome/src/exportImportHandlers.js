// ================================================================================================
// EXPORT/IMPORT EVENT HANDLERS - EXTENSION COMPATIBLE
// ================================================================================================
// Handles export/import functionality with extension CSP compliance
// ================================================================================================

// Simple export/import functions without complex initialization
window.handleQuickExport = function() {
    console.log('🔄 Export button clicked');
    
    try {
        // Get the store directly
        const store = window.useAppStore ? window.useAppStore() : null;
        if (!store || !store.exportData) {
            if (window.notyf) {
                window.notyf.error('❌ Data store not ready. Please refresh the page.');
            }
            return;
        }
        
        // Simple export dialog using confirm/prompt
        const choice = prompt(
            'Choose export option:\n\n' +
            '1. Export All Data (JSON)\n' +
            '2. Export Trading Data Only\n' +
            '3. Export Investments Only\n' +
            '4. Export Weekly Drops Only\n' +
            '5. Export Investments as CSV\n\n' +
            'Enter number (1-5):'
        );
        
        if (!choice) return;
        
        const now = new Date();
        const timestamp = now.getFullYear() + 
            String(now.getMonth() + 1).padStart(2, '0') + 
            String(now.getDate()).padStart(2, '0') + '_' +
            String(now.getHours()).padStart(2, '0') + 
            String(now.getMinutes()).padStart(2, '0');
        
        switch (choice) {
            case '1':
                // Export all data
                const allData = store.exportData();
                downloadFile(JSON.stringify(allData, null, 2), `SkinStatz_Complete_Export_${timestamp}.json`, 'application/json');
                if (window.notyf) window.notyf.success('✅ Complete data exported successfully');
                break;
                
            case '2':
                // Trading data only
                const tradingData = {
                    tradeHistory: store.tradeHistory || [],
                    accountBalance: store.accountBalance || 0,
                    deposits: store.deposits || [],
                    withdrawals: store.withdrawals || [],
                    exportDate: new Date().toISOString(),
                    version: '2.0.0',
                    type: 'trading'
                };
                downloadFile(JSON.stringify(tradingData, null, 2), `SkinStatz_Trading_Export_${timestamp}.json`, 'application/json');
                if (window.notyf) window.notyf.success('📈 Trading data exported successfully');
                break;
                
            case '3':
                // Investments only
                const investmentsData = {
                    investments: store.investments || [],
                    longTermInvestments: store.longTermInvestments || [],
                    categories: store.categories || [],
                    exportDate: new Date().toISOString(),
                    version: '2.0.0',
                    type: 'investments'
                };
                downloadFile(JSON.stringify(investmentsData, null, 2), `SkinStatz_Investments_Export_${timestamp}.json`, 'application/json');
                if (window.notyf) window.notyf.success('💼 Investments data exported successfully');
                break;
                
            case '4':
                // Weekly drops only
                const weeklyDropsData = {
                    caseDrops: store.caseDrops || [],
                    years: store.years || [],
                    exportDate: new Date().toISOString(),
                    version: '2.0.0',
                    type: 'weeklyDrops'
                };
                downloadFile(JSON.stringify(weeklyDropsData, null, 2), `SkinStatz_WeeklyDrops_Export_${timestamp}.json`, 'application/json');
                if (window.notyf) window.notyf.success('📦 Weekly Drops data exported successfully');
                break;
                
            case '5':
                // Investments as CSV
                const allInvestments = [...(store.investments || []), ...(store.longTermInvestments || [])];
                const csvContent = convertInvestmentsToCSV(allInvestments);
                downloadFile(csvContent, `SkinStatz_Investments_${timestamp}.csv`, 'text/csv');
                if (window.notyf) window.notyf.success('📊 Investments exported as CSV successfully');
                break;
                
            default:
                if (window.notyf) window.notyf.error('❌ Invalid selection');
        }
        
    } catch (error) {
        console.error('Export failed:', error);
        if (window.notyf) {
            window.notyf.error(`❌ Export failed: ${error.message}`);
        }
    }
};

window.handleQuickImport = function() {
    console.log('🔄 Import button clicked');
    
    try {
        const store = window.useAppStore ? window.useAppStore() : null;
        if (!store) {
            if (window.notyf) {
                window.notyf.error('❌ Data store not ready. Please refresh the page.');
            }
            return;
        }
        
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            const importMode = confirm('Do you want to REPLACE all existing data?\n\nClick OK to REPLACE all data\nClick Cancel to MERGE with existing data') 
                ? 'replace' 
                : 'merge';
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (importMode === 'replace' && store.replaceAllData) {
                        store.replaceAllData(data);
                        if (window.notyf) window.notyf.success('✅ Data replaced successfully');
                    } else if (store.importData) {
                        store.importData(data);
                        if (window.notyf) window.notyf.success('✅ Data imported and merged successfully');
                    } else {
                        throw new Error('Import functions not available');
                    }
                    
                    // Refresh page
                    setTimeout(() => window.location.reload(), 1000);
                    
                } catch (error) {
                    console.error('Import failed:', error);
                    if (window.notyf) {
                        window.notyf.error(`❌ Import failed: ${error.message}`);
                    }
                }
            };
            reader.readAsText(file);
        };
        
        input.click();
        
    } catch (error) {
        console.error('Import failed:', error);
        if (window.notyf) {
            window.notyf.error(`❌ Import failed: ${error.message}`);
        }
    }
};

// Utility functions
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function convertInvestmentsToCSV(investments) {
    if (!investments || investments.length === 0) return 'No investment data available';

    const headers = ['ID', 'Date', 'Item Name', 'Buy Price', 'Sell Price', 'Sell Date', 'Status', 'Profit', 'Return %', 'Category', 'Notes'];
    let csv = headers.join(',') + '\n';

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
        ];
        csv += row.join(',') + '\n';
    });

    return csv;
}

// Attach event handlers when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const quickExportBtn = document.getElementById('quick-export');
    if (quickExportBtn) {
        quickExportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.handleQuickExport();
        });
        console.log('✅ Export button handler attached');
    }
    
    const quickImportBtn = document.getElementById('quick-import');
    if (quickImportBtn) {
        quickImportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.handleQuickImport();
        });
        console.log('✅ Import button handler attached');
    }
});