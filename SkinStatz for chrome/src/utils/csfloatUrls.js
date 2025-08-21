/**
 * Utility functions for generating CSFloat marketplace URLs for different CS:GO item types
 */

/**
 * Generates CSFloat marketplace URL based on item type and def_index
 * @param {string} itemType - Type of item (case, agent, keychain, patch, music_kit)
 * @param {string|number} defIndex - The def_index from the item's JSON data
 * @returns {string} Complete CSFloat marketplace URL
 */
export function generateCSFloatUrl(itemType, defIndex) {
    const baseUrl = 'https://csfloat.com/search?sort_by=lowest_price';
    
    switch (itemType.toLowerCase()) {
        case 'case':
        case 'container':
        case 'capsule':
        case 'agent':
            return `${baseUrl}&def_index=${defIndex}`;
            
        case 'keychain':
        case 'charm':
            return `${baseUrl}&keychain_index=${defIndex}`;
            
        case 'patch':
            return `${baseUrl}&sticker_index=${defIndex}`;
            
        case 'music_kit':
            return `${baseUrl}&music_kit_index=${defIndex}`;
            
        default:
            throw new Error(`Unsupported item type: ${itemType}`);
    }
}

/**
 * Determines item type based on item ID prefix
 * @param {string} itemId - Item ID from JSON (e.g., "crate-4597", "agent-4726")
 * @returns {string} Item type for URL generation
 */
export function getItemTypeFromId(itemId) {
    if (itemId.startsWith('crate-')) return 'case';
    if (itemId.startsWith('agent-')) return 'agent';
    if (itemId.startsWith('keychain-')) return 'keychain';
    if (itemId.startsWith('patch-')) return 'patch';
    if (itemId.startsWith('music_kit-')) return 'music_kit';
    
    throw new Error(`Unknown item ID format: ${itemId}`);
}

/**
 * Generates CSFloat URL directly from item JSON object
 * @param {Object} item - Item object from JSON files
 * @param {string} item.id - Item ID (e.g., "crate-4597")
 * @param {string} item.def_index - Item's def_index
 * @returns {string} Complete CSFloat marketplace URL
 */
export function generateUrlFromItem(item) {
    if (!item.id || !item.def_index) {
        throw new Error('Item must have id and def_index properties');
    }
    
    const itemType = getItemTypeFromId(item.id);
    return generateCSFloatUrl(itemType, item.def_index);
}

/**
 * Batch generate URLs for multiple items
 * @param {Array} items - Array of item objects
 * @returns {Array} Array of objects with item data and generated URL
 */
export function generateUrlsForItems(items) {
    return items.map(item => ({
        ...item,
        csfloatUrl: generateUrlFromItem(item)
    }));
}