/**
 * Auto-Sync Manager - Plain JavaScript with Chunking Support
 * Automatically syncs data to chrome.storage.sync across devices
 * Supports large datasets by chunking into multiple 8KB pieces
 */

(function() {
    'use strict';

    console.log('🔄 Auto-Sync Manager initializing...');

    // Storage configuration
    const STORAGE_PREFIX = 'skinstatz_';
    const METADATA_KEY = STORAGE_PREFIX + 'meta';
    const CHUNK_PREFIX = STORAGE_PREFIX + 'chunk_';

    // Chrome.storage.sync limits
    const MAX_CHUNK_SIZE = 7500; // Stay under 8KB (8192 bytes) per item
    const MAX_TOTAL_SIZE = 95000; // Stay under 100KB (102400 bytes) total
    const SYNC_DEBOUNCE_MS = 2000; // Wait 2 seconds after last change before syncing

    let debounceTimer = null;
    let isSyncing = false;

    /**
     * Prepare data for storage (just stringify, Chrome compresses internally)
     */
    function compressData(data) {
        try {
            const jsonString = JSON.stringify(data);
            const sizeKB = Math.round(jsonString.length / 1024);

            // Log what's taking up space
            console.log(`📦 Data breakdown:`, {
                totalKB: sizeKB,
                trades: data.trades?.length || 0,
                investments: data.investments?.length || 0,
                caseDrops: data.caseDrops?.length || 0
            });

            return jsonString;
        } catch (error) {
            console.error('❌ JSON stringify failed:', error);
            return null;
        }
    }

    /**
     * Parse data from storage (handles old base64 format too)
     */
    function decompressData(dataString) {
        try {
            // Try parsing as plain JSON first (new format)
            return JSON.parse(dataString);
        } catch (error) {
            // If that fails, try old base64 format
            try {
                console.log('⚠️ Detected old base64 format, converting...');
                const decoded = decodeURIComponent(escape(atob(dataString)));
                return JSON.parse(decoded);
            } catch (base64Error) {
                console.error('❌ Failed to parse as JSON or base64:', error);
                return null;
            }
        }
    }

    /**
     * Split data into chunks
     */
    function chunkData(compressed) {
        const chunks = [];
        for (let i = 0; i < compressed.length; i += MAX_CHUNK_SIZE) {
            chunks.push(compressed.substring(i, i + MAX_CHUNK_SIZE));
        }
        return chunks;
    }

    /**
     * Clear old chunks from storage
     */
    function clearOldChunks(callback) {
        if (!chrome || !chrome.storage || !chrome.storage.sync) {
            if (callback) callback();
            return;
        }

        chrome.storage.sync.get(null, function(items) {
            const keysToRemove = [];

            for (const key in items) {
                if (key.startsWith(STORAGE_PREFIX)) {
                    keysToRemove.push(key);
                }
            }

            if (keysToRemove.length > 0) {
                console.log(`🗑️ Clearing ${keysToRemove.length} old chunks`);
                chrome.storage.sync.remove(keysToRemove, function() {
                    if (chrome.runtime.lastError) {
                        console.warn('⚠️ Failed to clear old chunks:', chrome.runtime.lastError.message);
                    }
                    if (callback) callback();
                });
            } else {
                if (callback) callback();
            }
        });
    }

    /**
     * Save data to chrome.storage.sync with chunking
     */
    function saveToSync(data, callback) {
        if (!chrome || !chrome.storage || !chrome.storage.sync) {
            console.warn('⚠️ chrome.storage.sync not available');
            if (callback) callback(false, 'Sync not available');
            return;
        }

        if (isSyncing) {
            console.log('⏳ Sync already in progress, skipping...');
            return;
        }

        isSyncing = true;

        try {
            // Compress the data
            const compressed = compressData(data);
            if (!compressed) {
                isSyncing = false;
                if (callback) callback(false, 'Compression failed');
                return;
            }

            const totalSize = compressed.length;

            // Check if it exceeds total quota (with safety margin)
            const safeLimit = 80000; // 80KB safe limit (Chrome has ~100KB total)
            if (totalSize > safeLimit) {
                isSyncing = false;
                const message = `Data too large (${Math.round(totalSize/1024)}KB exceeds ${Math.round(safeLimit/1024)}KB limit). Try deleting old trades.`;
                console.error('❌', message);
                if (callback) callback(false, message);
                return;
            }

            console.log(`💾 Saving ${Math.round(totalSize / 1024)}KB to sync storage...`);

            // Clear old chunks first
            clearOldChunks(function() {
                // Split into chunks
                const chunks = chunkData(compressed);
                console.log(`📦 Split into ${chunks.length} chunks`);

                // Prepare all data to save
                const saveData = {
                    [METADATA_KEY]: {
                        version: '2.0.0',
                        timestamp: Date.now(),
                        totalSize: totalSize,
                        chunkCount: chunks.length
                    }
                };

                // Add all chunks
                chunks.forEach((chunk, index) => {
                    saveData[CHUNK_PREFIX + index] = chunk;
                });

                // Save everything at once
                chrome.storage.sync.set(saveData, function() {
                    isSyncing = false;

                    if (chrome.runtime.lastError) {
                        const error = chrome.runtime.lastError.message;
                        console.error('❌ Sync save failed:', error);
                        if (callback) callback(false, error);
                    } else {
                        console.log('✅ Data synced successfully');

                        // Update store sync status
                        if (window.store) {
                            window.store.getState().setSyncStatus('synced');
                        }

                        if (callback) callback(true);
                    }
                });
            });

        } catch (error) {
            isSyncing = false;
            console.error('❌ Sync save error:', error);
            if (callback) callback(false, error.message);
        }
    }

    /**
     * Load data from chrome.storage.sync with chunk reassembly
     */
    function loadFromSync(callback) {
        if (!chrome || !chrome.storage || !chrome.storage.sync) {
            console.warn('⚠️ chrome.storage.sync not available');
            if (callback) callback(null);
            return;
        }

        console.log('📥 Loading data from sync storage...');

        chrome.storage.sync.get(null, function(items) {
            if (chrome.runtime.lastError) {
                console.error('❌ Sync load failed:', chrome.runtime.lastError.message);
                if (callback) callback(null);
                return;
            }

            // Check if metadata exists
            if (!items[METADATA_KEY]) {
                console.log('ℹ️ No synced data found');
                if (callback) callback(null);
                return;
            }

            try {
                const metadata = items[METADATA_KEY];
                console.log(`📦 Found ${metadata.chunkCount} chunks (${Math.round(metadata.totalSize/1024)}KB total)`);

                // Reassemble chunks
                let reassembled = '';
                for (let i = 0; i < metadata.chunkCount; i++) {
                    const chunk = items[CHUNK_PREFIX + i];
                    if (!chunk) {
                        throw new Error(`Missing chunk ${i}`);
                    }
                    reassembled += chunk;
                }

                // Decompress
                const decompressed = decompressData(reassembled);

                if (decompressed) {
                    const age = Date.now() - metadata.timestamp;
                    console.log(`✅ Loaded synced data (${Math.round(age / 1000)}s old)`);
                    if (callback) callback(decompressed);
                } else {
                    console.error('❌ Failed to decompress synced data');
                    if (callback) callback(null);
                }
            } catch (error) {
                console.error('❌ Sync load error:', error);
                if (callback) callback(null);
            }
        });
    }

    /**
     * Auto-save with debouncing
     */
    function autoSave(data) {
        // Clear existing timer
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }

        // Set new timer
        debounceTimer = setTimeout(() => {
            console.log('🔄 Auto-saving to sync...');
            saveToSync(data, function(success, error) {
                if (success) {
                    // setSyncStatus is already called in saveToSync
                } else {
                    console.error('❌ Auto-save failed:', error);
                    if (window.store) {
                        window.store.getState().setSyncStatus('error', error);
                    }
                }
            });
        }, SYNC_DEBOUNCE_MS);
    }

    /**
     * Listen for storage changes from other devices
     */
    function setupStorageListener() {
        if (!chrome || !chrome.storage || !chrome.storage.onChanged) {
            return;
        }

        chrome.storage.onChanged.addListener(function(changes, areaName) {
            if (areaName !== 'sync') return;
            if (!changes[METADATA_KEY]) return;

            console.log('📡 Sync data changed from another device');

            // Load and merge the new data
            loadFromSync(function(data) {
                if (data && window.store) {
                    console.log('🔄 Merging synced data from other device...');

                    try {
                        window.store.getState().importData(data);
                        window.store.getState().setSyncStatus('synced');
                        console.log('✅ Synced data merged successfully');
                    } catch (error) {
                        console.error('❌ Failed to merge synced data:', error);
                        window.store.getState().setSyncStatus('error', error.message);
                    }
                }
            });
        });

        console.log('✅ Storage change listener active');
    }

    /**
     * Get sync statistics
     */
    function getSyncStats(callback) {
        if (!chrome || !chrome.storage || !chrome.storage.sync) {
            if (callback) callback(null);
            return;
        }

        chrome.storage.sync.getBytesInUse(null, function(bytes) {
            const safeLimit = 80000; // 80KB safe limit
            const stats = {
                bytesUsed: bytes,
                kbUsed: Math.round(bytes / 1024 * 10) / 10,
                percentUsed: Math.round((bytes / safeLimit) * 100),
                maxKB: Math.round(safeLimit / 1024)
            };
            if (callback) callback(stats);
        });
    }

    /**
     * Clear all synced data
     */
    function clearSync(callback) {
        clearOldChunks(function() {
            console.log('✅ All synced data cleared');
            if (callback) callback();
        });
    }

    // Create the global AutoSync object
    window.AutoSync = {
        save: saveToSync,
        load: loadFromSync,
        autoSave: autoSave,
        getStats: getSyncStats,
        clear: clearSync,
        setupListener: setupStorageListener,

        // Helper to check if sync is available
        isAvailable: function() {
            return !!(chrome && chrome.storage && chrome.storage.sync);
        }
    };

    console.log('✅ Auto-Sync Manager ready (with chunking support)');

})();
