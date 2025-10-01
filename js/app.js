// Global Variables
let selectedAPIs = JSON.parse(localStorage.getItem('selectedAPIs') || '["tyyszy","dyttzy", "bfzy", "ruyi"]'); // Default Selected Resources
let customAPIs = JSON.parse(localStorage.getItem('customAPIs') || '[]'); // Store Custom API List

// Add current playing episode index
let currentEpisodeIndex = 0;
// Add all episodes of current video
let currentEpisodes = [];
// Add current video title
let currentVideoTitle = '';
// Global variable for reverse order state
let episodesReversed = false;

// Page Initialization
document.addEventListener('DOMContentLoaded', function () {
    // Initialize API Checkboxes
    initAPICheckboxes();

    // Initialize Custom API List
    renderCustomAPIsList();

    // Initialize display of selected API count
    updateSelectedApiCount();

    // Render Search History
    renderSearchHistory();

    // Set default API selection (if first time loading)
    if (!localStorage.getItem('hasInitializedDefaults')) {
        // Default Selected Resources
        selectedAPIs = ["tyyszy", "bfzy", "dyttzy", "ruyi"];
        localStorage.setItem('selectedAPIs', JSON.stringify(selectedAPIs));

        // Default filter toggle selected
        localStorage.setItem('yellowFilterEnabled', 'true');
        localStorage.setItem(PLAYER_CONFIG.adFilteringStorage, 'true');

        // Enable Douban feature by default
        localStorage.setItem('doubanEnabled', 'true');

        // Flag initialized with default value
        localStorage.setItem('hasInitializedDefaults', 'true');
    }

    // Set initial state of adult content filter toggle
    const yellowFilterToggle = document.getElementById('yellowFilterToggle');
    if (yellowFilterToggle) {
        yellowFilterToggle.checked = localStorage.getItem('yellowFilterEnabled') === 'true';
    }

    // Set initial state of ad filter toggle
    const adFilterToggle = document.getElementById('adFilterToggle');
    if (adFilterToggle) {
        adFilterToggle.checked = localStorage.getItem(PLAYER_CONFIG.adFilteringStorage) !== 'false'; // Default is true
    }

    // Set event listeners
    setupEventListeners();

    // Initial check of adult API selection status
    setTimeout(checkAdultAPIsSelected, 100);
});

// Initialize API Checkboxes
function initAPICheckboxes() {
    const container = document.getElementById('apiCheckboxes');
    container.innerHTML = '';

    // Add general API group title
    const normaldiv = document.createElement('div');
    normaldiv.id = 'normaldiv';
    normaldiv.className = 'grid grid-cols-2 gap-2';
    const normalTitle = document.createElement('div');
    normalTitle.className = 'api-group-title';
    normalTitle.textContent = 'General Resources';
    normaldiv.appendChild(normalTitle);

    // Create checkboxes for general API sources
    Object.keys(API_SITES).forEach(apiKey => {
        const api = API_SITES[apiKey];
        if (api.adult) return; // Skip adult content APIs, add later

        const checked = selectedAPIs.includes(apiKey);

        const checkbox = document.createElement('div');
        checkbox.className = 'flex items-center';
        checkbox.innerHTML = `
            <input type="checkbox" id="api_${apiKey}" 
                   class="form-checkbox h-3 w-3 text-blue-600 bg-[#222] border border-[#333]" 
                   ${checked ? 'checked' : ''} 
                   data-api="${apiKey}">
            <label for="api_${apiKey}" class="ml-1 text-xs text-gray-400 truncate">${api.name}</label>
        `;
        normaldiv.appendChild(checkbox);

        // Add event listeners
        checkbox.querySelector('input').addEventListener('change', function () {
            updateSelectedAPIs();
            checkAdultAPIsSelected();
        });
    });
    container.appendChild(normaldiv);

    // Add adult API list
    addAdultAPI();

    // Initial check of adult content status
    checkAdultAPIsSelected();
}

// Add adult API list
function addAdultAPI() {
    // Only add adult API group when hide setting is false
    if (!HIDE_BUILTIN_ADULT_APIS && (localStorage.getItem('yellowFilterEnabled') === 'false')) {
        const container = document.getElementById('apiCheckboxes');

        // Add adult API group title
        const adultdiv = document.createElement('div');
        adultdiv.id = 'adultdiv';
        adultdiv.className = 'grid grid-cols-2 gap-2';
        const adultTitle = document.createElement('div');
        adultTitle.className = 'api-group-title adult';
        adultTitle.innerHTML = `Adult Content Sources <span class="adult-warning">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        </span>`;
        adultdiv.appendChild(adultTitle);

        // Create checkboxes for adult API sources
        Object.keys(API_SITES).forEach(apiKey => {
            const api = API_SITES[apiKey];
            if (!api.adult) return; // Only add adult content APIs

            const checked = selectedAPIs.includes(apiKey);

            const checkbox = document.createElement('div');
            checkbox.className = 'flex items-center';
            checkbox.innerHTML = `
                <input type="checkbox" id="api_${apiKey}" 
                       class="form-checkbox h-3 w-3 text-blue-600 bg-[#222] border border-[#333] api-adult" 
                       ${checked ? 'checked' : ''} 
                       data-api="${apiKey}">
                <label for="api_${apiKey}" class="ml-1 text-xs text-pink-400 truncate">${api.name}</label>
            `;
            adultdiv.appendChild(checkbox);

            // Add event listeners
            checkbox.querySelector('input').addEventListener('change', function () {
                updateSelectedAPIs();
                checkAdultAPIsSelected();
            });
        });
        container.appendChild(adultdiv);
    }
}

// Check if any adult APIs are selected
function checkAdultAPIsSelected() {
    // Find all built-in adult API checkboxes
    const adultBuiltinCheckboxes = document.querySelectorAll('#apiCheckboxes .api-adult:checked');

    // Find all custom adult API checkboxes
    const customApiCheckboxes = document.querySelectorAll('#customApisList .api-adult:checked');

    const hasAdultSelected = adultBuiltinCheckboxes.length > 0 || customApiCheckboxes.length > 0;

    const yellowFilterToggle = document.getElementById('yellowFilterToggle');
    const yellowFilterContainer = yellowFilterToggle.closest('div').parentNode;
    const filterDescription = yellowFilterContainer.querySelector('p.filter-description');

    // If adult APIs are selected, disable adult content filter
    if (hasAdultSelected) {
        yellowFilterToggle.checked = false;
        yellowFilterToggle.disabled = true;
        localStorage.setItem('yellowFilterEnabled', 'false');

        // Add disabled style
        yellowFilterContainer.classList.add('filter-disabled');

        // Modify description text
        if (filterDescription) {
            filterDescription.innerHTML = '<strong class="text-pink-300">Cannot enable this filter when adult content sources are selected</strong>';
        }

        // Remove tooltip message (if exists)
        const existingTooltip = yellowFilterContainer.querySelector('.filter-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }
    } else {
        // Enable adult content filter
        yellowFilterToggle.disabled = false;
        yellowFilterContainer.classList.remove('filter-disabled');

        // Restore original description text
        if (filterDescription) {
            filterDescription.innerHTML = 'Filter adult content such as "ethical films"';
        }

        // Remove tooltip message
        const existingTooltip = yellowFilterContainer.querySelector('.filter-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }
    }
}

// Render custom API list
function renderCustomAPIsList() {
    const container = document.getElementById('customApisList');
    if (!container) return;

    if (customAPIs.length === 0) {
        container.innerHTML = '<p class="text-xs text-gray-500 text-center my-2">No custom APIs added</p>';
        return;
    }

    container.innerHTML = '';
    customAPIs.forEach((api, index) => {
        const apiItem = document.createElement('div');
        apiItem.className = 'flex items-center justify-between p-1 mb-1 bg-[#222] rounded';
        const textColorClass = api.isAdult ? 'text-pink-400' : 'text-white';
        const adultTag = api.isAdult ? '<span class="text-xs text-pink-400 mr-1">(18+)</span>' : '';
        // Add detail address display
        const detailLine = api.detail ? `<div class="text-xs text-gray-400 truncate">detail: ${api.detail}</div>` : '';
        apiItem.innerHTML = `
            <div class="flex items-center flex-1 min-w-0">
                <input type="checkbox" id="custom_api_${index}" 
                       class="form-checkbox h-3 w-3 text-blue-600 mr-1 ${api.isAdult ? 'api-adult' : ''}" 
                       ${selectedAPIs.includes('custom_' + index) ? 'checked' : ''} 
                       data-custom-index="${index}">
                <div class="flex-1 min-w-0">
                    <div class="text-xs font-medium ${textColorClass} truncate">
                        ${adultTag}${api.name}
                    </div>
                    <div class="text-xs text-gray-500 truncate">${api.url}</div>
                    ${detailLine}
                </div>
            </div>
            <div class="flex items-center">
                <button class="text-blue-500 hover:text-blue-700 text-xs px-1" onclick="editCustomApi(${index})">✎</button>
                <button class="text-red-500 hover:text-red-700 text-xs px-1" onclick="removeCustomApi(${index})">✕</button>
            </div>
        `;
        container.appendChild(apiItem);
        apiItem.querySelector('input').addEventListener('change', function () {
            updateSelectedAPIs();
            checkAdultAPIsSelected();
        });
    });
}

// Edit custom API
function editCustomApi(index) {
    if (index < 0 || index >= customAPIs.length) return;
    const api = customAPIs[index];
    document.getElementById('customApiName').value = api.name;
    document.getElementById('customApiUrl').value = api.url;
    document.getElementById('customApiDetail').value = api.detail || '';
    const isAdultInput = document.getElementById('customApiIsAdult');
    if (isAdultInput) isAdultInput.checked = api.isAdult || false;
    const form = document.getElementById('addCustomApiForm');
    if (form) {
        form.classList.remove('hidden');
        const buttonContainer = form.querySelector('div:last-child');
        buttonContainer.innerHTML = `
            <button onclick="updateCustomApi(${index})" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs">Update</button>
            <button onclick="cancelEditCustomApi()" class="bg-[#444] hover:bg-[#555] text-white px-3 py-1 rounded text-xs">Cancel</button>
        `;
    }
}

// Update custom API
function updateCustomApi(index) {
    if (index < 0 || index >= customAPIs.length) return;
    const nameInput = document.getElementById('customApiName');
    const urlInput = document.getElementById('customApiUrl');
    const detailInput = document.getElementById('customApiDetail');
    const isAdultInput = document.getElementById('customApiIsAdult');
    const name = nameInput.value.trim();
    let url = urlInput.value.trim();
    const detail = detailInput ? detailInput.value.trim() : '';
    const isAdult = isAdultInput ? isAdultInput.checked : false;
    if (!name || !url) {
        showToast('Please enter API name and link', 'warning');
        return;
    }
    if (!/^https?:\/\/.+/.test(url)) {
        showToast('Invalid API link format, must start with http:// or https://', 'warning');
        return;
    }
    if (url.endsWith('/')) url = url.slice(0, -1);
    // Save detail field
    customAPIs[index] = { name, url, detail, isAdult };
    localStorage.setItem('customAPIs', JSON.stringify(customAPIs));
    renderCustomAPIsList();
    checkAdultAPIsSelected();
    restoreAddCustomApiButtons();
    nameInput.value = '';
    urlInput.value = '';
    if (detailInput) detailInput.value = '';
    if (isAdultInput) isAdultInput.checked = false;
    document.getElementById('addCustomApiForm').classList.add('hidden');
    showToast('Custom API updated: ' + name, 'success');
}

// Cancel edit custom API
function cancelEditCustomApi() {
    // Clear form
    document.getElementById('customApiName').value = '';
    document.getElementById('customApiUrl').value = '';
    document.getElementById('customApiDetail').value = '';
    const isAdultInput = document.getElementById('customApiIsAdult');
    if (isAdultInput) isAdultInput.checked = false;

    // Hide form
    document.getElementById('addCustomApiForm').classList.add('hidden');

    // Restore add button
    restoreAddCustomApiButtons();
}

// Restore custom API add button
function restoreAddCustomApiButtons() {
    const form = document.getElementById('addCustomApiForm');
    const buttonContainer = form.querySelector('div:last-child');
    buttonContainer.innerHTML = `
        <button onclick="addCustomApi()" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs">Add</button>
        <button onclick="cancelAddCustomApi()" class="bg-[#444] hover:bg-[#555] text-white px-3 py-1 rounded text-xs">Cancel</button>
    `;
}

// Update selected API list
function updateSelectedAPIs() {
    // Get all built-in API checkboxes
    const builtInApiCheckboxes = document.querySelectorAll('#apiCheckboxes input:checked');

    // Get selected built-in APIs
    const builtInApis = Array.from(builtInApiCheckboxes).map(input => input.dataset.api);

    // Get selected custom APIs
    const customApiCheckboxes = document.querySelectorAll('#customApisList input:checked');
    const customApiIndices = Array.from(customApiCheckboxes).map(input => 'custom_' + input.dataset.customIndex);

    // Merge built-in and custom APIs
    selectedAPIs = [...builtInApis, ...customApiIndices];

    // Save to localStorage
    localStorage.setItem('selectedAPIs', JSON.stringify(selectedAPIs));

    // Update display of selected API count
    updateSelectedApiCount();
}

// Update selected API count display
function updateSelectedApiCount() {
    const countEl = document.getElementById('selectedApiCount');
    if (countEl) {
        countEl.textContent = selectedAPIs.length;
    }
}

// Select all or deselect all APIs
function selectAllAPIs(selectAll = true, excludeAdult = false) {
    const checkboxes = document.querySelectorAll('#apiCheckboxes input[type="checkbox"]');

    checkboxes.forEach(checkbox => {
        if (excludeAdult && checkbox.classList.contains('api-adult')) {
            checkbox.checked = false;
        } else {
            checkbox.checked = selectAll;
        }
    });

    updateSelectedAPIs();
    checkAdultAPIsSelected();
}

// Show add custom API form
function showAddCustomApiForm() {
    const form = document.getElementById('addCustomApiForm');
    if (form) {
        form.classList.remove('hidden');
    }
}

// Cancel add custom API - modify function to reuse restore button logic
function cancelAddCustomApi() {
    const form = document.getElementById('addCustomApiForm');
    if (form) {
        form.classList.add('hidden');
        document.getElementById('customApiName').value = '';
        document.getElementById('customApiUrl').value = '';
        document.getElementById('customApiDetail').value = '';
        const isAdultInput = document.getElementById('customApiIsAdult');
        if (isAdultInput) isAdultInput.checked = false;

        // Ensure button is add button
        restoreAddCustomApiButtons();
    }
}

// Add custom API
function addCustomApi() {
    const nameInput = document.getElementById('customApiName');
    const urlInput = document.getElementById('customApiUrl');
    const detailInput = document.getElementById('customApiDetail');
    const isAdultInput = document.getElementById('customApiIsAdult');
    const name = nameInput.value.trim();
    let url = urlInput.value.trim();
    const detail = detailInput ? detailInput.value.trim() : '';
    const isAdult = isAdultInput ? isAdultInput.checked : false;
    if (!name || !url) {
        showToast('Please enter API name and link', 'warning');
        return;
    }
    if (!/^https?:\/\/.+/.test(url)) {
        showToast('Invalid API link format, must start with http:// or https://', 'warning');
        return;
    }
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    // Save detail field
    customAPIs.push({ name, url, detail, isAdult });
    localStorage.setItem('customAPIs', JSON.stringify(customAPIs));
    const newApiIndex = customAPIs.length - 1;
    selectedAPIs.push('custom_' + newApiIndex);
    localStorage.setItem('selectedAPIs', JSON.stringify(selectedAPIs));

    // Re-render custom API list
    renderCustomAPIsList();
    updateSelectedApiCount();
    checkAdultAPIsSelected();
    nameInput.value = '';
    urlInput.value = '';
    if (detailInput) detailInput.value = '';
    if (isAdultInput) isAdultInput.checked = false;
    document.getElementById('addCustomApiForm').classList.add('hidden');
    showToast('Custom API added: ' + name, 'success');
}

// Remove custom API
function removeCustomApi(index) {
    if (index < 0 || index >= customAPIs.length) return;

    const apiName = customAPIs[index].name;

    // Remove API from list
    customAPIs.splice(index, 1);
    localStorage.setItem('customAPIs', JSON.stringify(customAPIs));

    // Remove this API from selected list
    const customApiId = 'custom_' + index;
    selectedAPIs = selectedAPIs.filter(id => id !== customApiId);

    // Update custom API indices greater than this index
    selectedAPIs = selectedAPIs.map(id => {
        if (id.startsWith('custom_')) {
            const currentIndex = parseInt(id.replace('custom_', ''));
            if (currentIndex > index) {
                return 'custom_' + (currentIndex - 1);
            }
        }
        return id;
    });

    localStorage.setItem('selectedAPIs', JSON.stringify(selectedAPIs));

    // Re-render custom API list
    renderCustomAPIsList();

    // Update selected API count
    updateSelectedApiCount();

    // Recheck adult API selection status
    checkAdultAPIsSelected();

    showToast('Custom API removed: ' + apiName, 'info');
}

function toggleSettings(e) {
    const settingsPanel = document.getElementById('settingsPanel');
    if (!settingsPanel) return;

    // Check if admin password exists
    const hasAdminPassword = window.__ENV__?.ADMINPASSWORD && 
                           window.__ENV__.ADMINPASSWORD.length === 64 && 
                           !/^0+$/.test(window.__ENV__.ADMINPASSWORD);

    if (settingsPanel.classList.contains('show')) {
        settingsPanel.classList.remove('show');
    } else {
        // Only intercept when admin password is set and not verified
        if (hasAdminPassword && !isAdminVerified()) {
            e.preventDefault();
            e.stopPropagation();
            showAdminPasswordModal();
            return;
        }
        settingsPanel.classList.add('show');
    }

    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
}

// Set event listeners
function setupEventListeners() {
    // Press Enter to search
    document.getElementById('searchInput').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            search();
        }
    });

    // Click outside to close settings panel and history panel
    document.addEventListener('click', function (e) {
        // Close settings panel
        const settingsPanel = document.querySelector('#settingsPanel.show');
        const settingsButton = document.querySelector('#settingsPanel .close-btn');

        if (settingsPanel && settingsButton &&
            !settingsPanel.contains(e.target) &&
            !settingsButton.contains(e.target)) {
            settingsPanel.classList.remove('show');
        }

        // Close history panel
        const historyPanel = document.querySelector('#historyPanel.show');
        const historyButton = document.querySelector('#historyPanel .close-btn');

        if (historyPanel && historyButton &&
            !historyPanel.contains(e.target) &&
            !historyButton.contains(e.target)) {
            historyPanel.classList.remove('show');
        }
    });

    // Adult content filter toggle event binding
    const yellowFilterToggle = document.getElementById('yellowFilterToggle');
    if (yellowFilterToggle) {
        yellowFilterToggle.addEventListener('change', function (e) {
            localStorage.setItem('yellowFilterEnabled', e.target.checked);

            // Control display status of adult content interfaces
            const adultdiv = document.getElementById('adultdiv');
            if (adultdiv) {
                if (e.target.checked === true) {
                    adultdiv.style.display = 'none';
                } else if (e.target.checked === false) {
                    adultdiv.style.display = ''
                }
            } else {
                // Add adult API list
                addAdultAPI();
            }
        });
    }

    // Ad filter toggle event binding
    const adFilterToggle = document.getElementById('adFilterToggle');
    if (adFilterToggle) {
        adFilterToggle.addEventListener('change', function (e) {
            localStorage.setItem(PLAYER_CONFIG.adFilteringStorage, e.target.checked);
        });
    }
}

// Reset search area
function resetSearchArea() {
    // Clear search results
    document.getElementById('results').innerHTML = '';
    document.getElementById('searchInput').value = '';

    // Restore search area styles
    document.getElementById('searchArea').classList.add('flex-1');
    document.getElementById('searchArea').classList.remove('mb-8');
    document.getElementById('resultsArea').classList.add('hidden');

    // Ensure footer displays correctly, remove relative positioning
    const footer = document.querySelector('.footer');
    if (footer) {
        footer.style.position = '';
    }

    // If Douban feature exists, check if Douban recommendation area needs to be displayed
    if (typeof updateDoubanVisibility === 'function') {
        updateDoubanVisibility();
    }

    // Reset URL to homepage
    try {
        window.history.pushState(
            {},
            `OmniView - Free Online Video Search and Viewing Platform`,
            `/`
        );
        // Update page title
        document.title = `OmniView - Free Online Video Search and Viewing Platform`;
    } catch (e) {
        console.error('Failed to update browser history:', e);
    }
}

// Get custom API information
function getCustomApiInfo(customApiIndex) {
    const index = parseInt(customApiIndex);
    if (isNaN(index) || index < 0 || index >= customAPIs.length) {
        return null;
    }
    return customAPIs[index];
}

// Search functionality - modified to support multi-select APIs and multi-page results
async function search() {
    // Password protection verification
    if (window.isPasswordProtected && window.isPasswordVerified) {
        if (window.isPasswordProtected() && !window.isPasswordVerified()) {
            showPasswordModal && showPasswordModal();
            return;
        }
    }
    const query = document.getElementById('searchInput').value.trim();

    if (!query) {
        showToast('Please enter search content', 'info');
        return;
    }

    if (selectedAPIs.length === 0) {
        showToast('Please select at least one API source', 'warning');
        return;
    }

    showLoading();

    try {
        // Save search history
        saveSearchHistory(query);

        // Search from all selected API sources
        let allResults = [];
        const searchPromises = selectedAPIs.map(apiId => 
            searchByAPIAndKeyWord(apiId, query)
        );

        // Wait for all search requests to complete
        const resultsArray = await Promise.all(searchPromises);

        // Merge all results
        resultsArray.forEach(results => {
            if (Array.isArray(results) && results.length > 0) {
                allResults = allResults.concat(results);
            }
        });

        // Sort search results: prioritize by name, sort by API source when names are identical
        allResults.sort((a, b) => {
            // First sort by video name
            const nameCompare = (a.vod_name || '').localeCompare(b.vod_name || '');
            if (nameCompare !== 0) return nameCompare;
            
            // If names are identical, sort by source
            return (a.source_name || '').localeCompare(b.source_name || '');
        });

        // Update search result count
        const searchResultsCount = document.getElementById('searchResultsCount');
        if (searchResultsCount) {
            searchResultsCount.textContent = allResults.length;
        }

        // Show results area, adjust search area
        document.getElementById('searchArea').classList.remove('flex-1');
        document.getElementById('searchArea').classList.add('mb-8');
        document.getElementById('resultsArea').classList.remove('hidden');

        // Hide Douban recommendation area (if exists)
        const doubanArea = document.getElementById('doubanArea');
        if (doubanArea) {
            doubanArea.classList.add('hidden');
        }

        const resultsDiv = document.getElementById('results');

        // If no results
        if (!allResults || allResults.length === 0) {
            resultsDiv.innerHTML = `
                <div class="col-span-full text-center py-16">
                    <svg class="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 class="mt-2 text-lg font-medium text-gray-400">No matching results found</h3>
                    <p class="mt-1 text-sm text-gray-500">Please try other keywords or switch data source</p>
                </div>
            `;
            hideLoading();
            return;
        }

        // Update URL only when there are search results
        try {
            // Use URI encoding to ensure special characters display correctly
            const encodedQuery = encodeURIComponent(query);
            // Update URL using HTML5 History API without page refresh
            window.history.pushState(
                { search: query },
                `Search: ${query} - OmniView`,
                `/s=${encodedQuery}`
            );
            // Update page title
            document.title = `Search: ${query} - OmniView`;
        } catch (e) {
            console.error('Failed to update browser history:', e);
            // Continue search execution if URL update fails
        }

        // Handle search result filtering: filter out items with sensitive content categories if adult content filtering is enabled
        const yellowFilterEnabled = localStorage.getItem('yellowFilterEnabled') === 'true';
        if (yellowFilterEnabled) {
            const banned = ['Adult Films', 'Adult Content', 'Hentai Anime', 'Scandal', 'Loli', 'Uniform Fetish', 'Domestic Adult Media', 'cosplay', 'Stockings Fetish', 'Uncensored', 'Japanese Uncensored', 'Censored', 'Japanese Censored', 'SWAG', 'Streamer Content', 'Pornography', 'LGBT Content', 'Adult Video', 'Adult Film'];
            allResults = allResults.filter(item => {
                const typeName = item.type_name || '';
                return !banned.some(keyword => typeName.includes(keyword));
            });
        }

        // Add XSS protection using textContent and attribute escaping
        const safeResults = allResults.map(item => {
            const safeId = item.vod_id ? item.vod_id.toString().replace(/[^\w-]/g, '') : '';
            const safeName = (item.vod_name || '').toString()
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
            const sourceInfo = item.source_name ?
                `<span class="bg-[#222] text-xs px-1.5 py-0.5 rounded-full">${item.source_name}</span>` : '';
            const sourceCode = item.source_code || '';

            // Add API URL attribute for detail fetching
            const apiUrlAttr = item.api_url ?
                `data-api-url="${item.api_url.replace(/"/g, '&quot;')}"` : '';

            // Change to horizontal card layout with image on left and text on right, optimize styles
            const hasCover = item.vod_pic && item.vod_pic.startsWith('http');

            return `
                <div class="card-hover bg-[#111] rounded-lg overflow-hidden cursor-pointer transition-all hover:scale-[1.02] h-full shadow-sm hover:shadow-md" 
                     onclick="showDetails('${safeId}','${safeName}','${sourceCode}')" ${apiUrlAttr}>
                    <div class="flex h-full">
                        ${hasCover ? `
                        <div class="relative flex-shrink-0 search-card-img-container">
                            <img src="${item.vod_pic}" alt="${safeName}" 
                                 class="h-full w-full object-cover transition-transform hover:scale-110" 
                                 onerror="this.onerror=null; this.src='https://via.placeholder.com/300x450?text=No+Cover'; this.classList.add('object-contain');" 
                                 loading="lazy">
                            <div class="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent"></div>
                        </div>` : ''}
                        
                        <div class="p-2 flex flex-col flex-grow">
                            <div class="flex-grow">
                                <h3 class="font-semibold mb-2 break-words line-clamp-2 ${hasCover ? '' : 'text-center'}" title="${safeName}">${safeName}</h3>
                                
                                <div class="flex flex-wrap ${hasCover ? '' : 'justify-center'} gap-1 mb-2">
                                    ${(item.type_name || '').toString().replace(/</g, '&lt;') ?
                    `<span class="text-xs py-0.5 px-1.5 rounded bg-opacity-20 bg-blue-500 text-blue-300">
                                          ${(item.type_name || '').toString().replace(/</g, '&lt;')}
                                      </span>` : ''}
                                    ${(item.vod_year || '') ?
                    `<span class="text-xs py-0.5 px-1.5 rounded bg-opacity-20 bg-purple-500 text-purple-300">
                                          ${item.vod_year}
                                      </span>` : ''}
                                </div>
                                <p class="text-gray-400 line-clamp-2 overflow-hidden ${hasCover ? '' : 'text-center'} mb-2">
                                    ${(item.vod_remarks || 'No description available').toString().replace(/</g, '&lt;')}
                                </p>
                            </div>
                            
                            <div class="flex justify-between items-center mt-1 pt-1 border-t border-gray-800">
                                ${sourceInfo ? `<div>${sourceInfo}</div>` : '<div></div>'}
                                <!-- API name too long will be squeezed and deformed
                                <div>
                                    <span class="text-gray-500 flex items-center hover:text-blue-400 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                        </svg>
                                        Play
                                    </span>
                                </div>
                                -->
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        resultsDiv.innerHTML = safeResults;
    } catch (error) {
        console.error('Search error:', error);
        if (error.name === 'AbortError') {
            showToast('Search request timeout, please check network connection', 'error');
        } else {
            showToast('Search request failed, please try again later', 'error');
        }
    } finally {
        hideLoading();
    }
}

// Toggle clear button display state
function toggleClearButton() {
    const searchInput = document.getElementById('searchInput');
    const clearButton = document.getElementById('clearSearchInput');
    if (searchInput.value !== '') {
        clearButton.classList.remove('hidden');
    } else {
        clearButton.classList.add('hidden');
    }
}

// Clear search box content
function clearSearchInput() {
    const searchInput = document.getElementById('searchInput');
    searchInput.value = '';
    const clearButton = document.getElementById('clearSearchInput');
    clearButton.classList.add('hidden');
}

// Hijack search box value property to detect external modifications
function hookInput() {
    const input = document.getElementById('searchInput');
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

    // Rewrite value property getter and setter
    Object.defineProperty(input, 'value', {
        get: function () {
            // Ensure string is returned when reading (even if original value is undefined/null)
            const originalValue = descriptor.get.call(this);
            return originalValue != null ? String(originalValue) : '';
        },
        set: function (value) {
            // Explicitly convert value to string before writing
            const strValue = String(value);
            descriptor.set.call(this, strValue);
            this.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });

    // Initialize input box value to empty string (avoid initial value being undefined)
    input.value = '';
}
document.addEventListener('DOMContentLoaded', hookInput);

// Show details - modified to support custom API
async function showDetails(id, vod_name, sourceCode) {
    // Password protection verification
    if (window.isPasswordProtected && window.isPasswordVerified) {
        if (window.isPasswordProtected() && !window.isPasswordVerified()) {
            showPasswordModal && showPasswordModal();
            return;
        }
    }
    if (!id) {
        showToast('Invalid video ID', 'error');
        return;
    }

    showLoading();
    try {
        // Build API parameters
        let apiParams = '';

        // Handle custom API source
        if (sourceCode.startsWith('custom_')) {
            const customIndex = sourceCode.replace('custom_', '');
            const customApi = getCustomApiInfo(customIndex);
            if (!customApi) {
                showToast('Invalid custom API configuration', 'error');
                hideLoading();
                return;
            }
            // Pass detail field
            if (customApi.detail) {
                apiParams = '&customApi=' + encodeURIComponent(customApi.url) + '&customDetail=' + encodeURIComponent(customApi.detail) + '&source=custom';
            } else {
                apiParams = '&customApi=' + encodeURIComponent(customApi.url) + '&source=custom';
            }
        } else {
            // Built-in API
            apiParams = '&source=' + sourceCode;
        }

        // Add a timestamp to prevent caching
        const timestamp = new Date().getTime();
        const cacheBuster = `&_t=${timestamp}`;
        const response = await fetch(`/api/detail?id=${encodeURIComponent(id)}${apiParams}${cacheBuster}`);

        const data = await response.json();

        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modalTitle');
        const modalContent = document.getElementById('modalContent');

        // Display source information
        const sourceName = data.videoInfo && data.videoInfo.source_name ?
            ` <span class="text-sm font-normal text-gray-400">(${data.videoInfo.source_name})</span>` : '';

        // Do not truncate title, allow full display
        modalTitle.innerHTML = `<span class="break-words">${vod_name || 'Unknown Video'}</span>${sourceName}`;
        currentVideoTitle = vod_name || 'Unknown Video';

        if (data.episodes && data.episodes.length > 0) {
            // Build detail information HTML
            let detailInfoHtml = '';
            if (data.videoInfo) {
                // Prepare description text, strip HTML and trim whitespace
                const descriptionText = data.videoInfo.desc ? data.videoInfo.desc.replace(/<[^>]+>/g, '').trim() : '';

                // Check if there's any actual grid content
                const hasGridContent = data.videoInfo.type || data.videoInfo.year || data.videoInfo.area || data.videoInfo.director || data.videoInfo.actor || data.videoInfo.remarks;

                if (hasGridContent || descriptionText) { // Only build if there's something to show
                    detailInfoHtml = `
                <div class="modal-detail-info">
                    ${hasGridContent ? `
                    <div class="detail-grid">
                        ${data.videoInfo.type ? `<div class="detail-item"><span class="detail-label">Type:</span> <span class="detail-value">${data.videoInfo.type}</span></div>` : ''}
                        ${data.videoInfo.year ? `<div class="detail-item"><span class="detail-label">Year:</span> <span class="detail-value">${data.videoInfo.year}</span></div>` : ''}
                        ${data.videoInfo.area ? `<div class="detail-item"><span class="detail-label">Region:</span> <span class="detail-value">${data.videoInfo.area}</span></div>` : ''}
                        ${data.videoInfo.director ? `<div class="detail-item"><span class="detail-label">Director:</span> <span class="detail-value">${data.videoInfo.director}</span></div>` : ''}
                        ${data.videoInfo.actor ? `<div class="detail-item"><span class="detail-label">Cast:</span> <span class="detail-value">${data.videoInfo.actor}</span></div>` : ''}
                        ${data.videoInfo.remarks ? `<div class="detail-item"><span class="detail-label">Notes:</span> <span class="detail-value">${data.videoInfo.remarks}</span></div>` : ''}
                    </div>` : ''}
                    ${descriptionText ? `
                    <div class="detail-desc">
                        <p class="detail-label">Description:</p>
                        <p class="detail-desc-content">${descriptionText}</p>
                    </div>` : ''}
                </div>
                `;
                }
            }

            currentEpisodes = data.episodes;
            currentEpisodeIndex = 0;

            modalContent.innerHTML = `
                ${detailInfoHtml}
                <div class="flex flex-wrap items-center justify-between mb-4 gap-2">
                    <div class="flex items-center gap-2">
                        <button onclick="toggleEpisodeOrder('${sourceCode}', '${id}')" 
                                class="px-3 py-1.5 bg-[#333] hover:bg-[#444] border border-[#444] rounded text-sm transition-colors flex items-center gap-1">
                            <svg class="w-4 h-4 transform ${episodesReversed ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                            </svg>
                            <span>${episodesReversed ? 'Ascending Order' : 'Descending Order'}</span>
                        </button>
                        <span class="text-gray-400 text-sm">Total ${data.episodes.length} episodes</span>
                    </div>
                    <button onclick="copyLinks()" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors">
                        Copy Link
                    </button>
                </div>
                <div id="episodesGrid" class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                    ${renderEpisodes(vod_name, sourceCode, id)}
                </div>
            `;
        } else {
            modalContent.innerHTML = `
                <div class="text-center py-8">
                    <div class="text-red-400 mb-2">❌ No playback resources found</div>
                    <div class="text-gray-500 text-sm">This video may be temporarily unavailable, please try other videos</div>
                </div>
            `;
        }

        modal.classList.remove('hidden');
    } catch (error) {
        console.error('Get details error:', error);
        showToast('Failed to get details, please try again later', 'error');
    } finally {
        hideLoading();
    }
}

// Update play video function, changed to use /watch path instead of directly opening player.html
function playVideo(url, vod_name, sourceCode, episodeIndex = 0, vodId = '') {
    // Password protection verification
    if (window.isPasswordProtected && window.isPasswordVerified) {
        if (window.isPasswordProtected() && !window.isPasswordVerified()) {
            showPasswordModal && showPasswordModal();
            return;
        }
    }

    // Get current path as return page
    let currentPath = window.location.href;

    // Build playback page URL, use watch.html as intermediate redirect page
    let watchUrl = `watch.html?id=${vodId || ''}&source=${sourceCode || ''}&url=${encodeURIComponent(url)}&index=${episodeIndex}&title=${encodeURIComponent(vod_name || '')}`;

    // Add return URL parameter
    if (currentPath.includes('index.html') || currentPath.endsWith('/')) {
        watchUrl += `&back=${encodeURIComponent(currentPath)}`;
    }

    // Save current state to localStorage
    try {
        localStorage.setItem('currentVideoTitle', vod_name || 'Unknown Video');
        localStorage.setItem('currentEpisodes', JSON.stringify(currentEpisodes));
        localStorage.setItem('currentEpisodeIndex', episodeIndex);
        localStorage.setItem('currentSourceCode', sourceCode || '');
        localStorage.setItem('lastPlayTime', Date.now());
        localStorage.setItem('lastSearchPage', currentPath);
        localStorage.setItem('lastPageUrl', currentPath);  // Ensure return page URL is saved
    } catch (e) {
        console.error('Failed to save playback state:', e);
    }

    // Open playback page in current tab
    window.location.href = watchUrl;
}

// Pop up player page
function showVideoPlayer(url) {
    // Hide detail modal before opening player
    const detailModal = document.getElementById('modal');
    if (detailModal) {
        detailModal.classList.add('hidden');
    }
    // Temporarily hide search results and Douban area to prevent scrollbar from appearing when height exceeds player
    document.getElementById('resultsArea').classList.add('hidden');
    document.getElementById('doubanArea').classList.add('hidden');
    // Open playback page in iframe
    videoPlayerFrame = document.createElement('iframe');
    videoPlayerFrame.id = 'VideoPlayerFrame';
    videoPlayerFrame.className = 'fixed w-full h-screen z-40';
    videoPlayerFrame.src = url;
    document.body.appendChild(videoPlayerFrame);
    // Move focus into iframe
    videoPlayerFrame.focus();
}

// Close player page
function closeVideoPlayer(home = false) {
    videoPlayerFrame = document.getElementById('VideoPlayerFrame');
    if (videoPlayerFrame) {
        videoPlayerFrame.remove();
        // Restore search results display
        document.getElementById('resultsArea').classList.remove('hidden');
        // Hide details popup when closing player
        const detailModal = document.getElementById('modal');
        if (detailModal) {
            detailModal.classList.add('hidden');
        }
        // Show Douban section if enabled
        if (localStorage.getItem('doubanEnabled') === 'true') {
            document.getElementById('doubanArea').classList.remove('hidden');
        }
    }
    if (home) {
        // Refresh homepage
        window.location.href = '/'
    }
}

// Play previous episode
function playPreviousEpisode(sourceCode) {
    if (currentEpisodeIndex > 0) {
        const prevIndex = currentEpisodeIndex - 1;
        const prevUrl = currentEpisodes[prevIndex];
        playVideo(prevUrl, currentVideoTitle, sourceCode, prevIndex);
    }
}

// Play next episode
function playNextEpisode(sourceCode) {
    if (currentEpisodeIndex < currentEpisodes.length - 1) {
        const nextIndex = currentEpisodeIndex + 1;
        const nextUrl = currentEpisodes[nextIndex];
        playVideo(nextUrl, currentVideoTitle, sourceCode, nextIndex);
    }
}

// Handle player loading error
function handlePlayerError() {
    hideLoading();
    showToast('Video playback failed to load, please try another video source', 'error');
}

// Helper function to render episode buttons (using current sort state)
function renderEpisodes(vodName, sourceCode, vodId) {
    const episodes = episodesReversed ? [...currentEpisodes].reverse() : currentEpisodes;
    return episodes.map((episode, index) => {
        // Calculate actual episode index based on reverse order state
        const realIndex = episodesReversed ? currentEpisodes.length - 1 - index : index;
        return `
            <button id="episode-${realIndex}" onclick="playVideo('${episode}','${vodName.replace(/"/g, '&quot;')}', '${sourceCode}', ${realIndex}, '${vodId}')" 
                    class="px-4 py-2 bg-[#222] hover:bg-[#333] border border-[#333] rounded-lg transition-colors text-center episode-btn">
                ${realIndex + 1}
            </button>
        `;
    }).join('');
}

// Copy video link to clipboard
function copyLinks() {
    const episodes = episodesReversed ? [...currentEpisodes].reverse() : currentEpisodes;
    const linkList = episodes.join('\r\n');
    navigator.clipboard.writeText(linkList).then(() => {
        showToast('Play link copied', 'success');
    }).catch(err => {
        showToast('Copy failed, please check browser permissions', 'error');
    });
}

// Function to toggle sort order
function toggleEpisodeOrder(sourceCode, vodId) {
    episodesReversed = !episodesReversed;
    // Re-render episode section using currentVideoTitle as video title
    const episodesGrid = document.getElementById('episodesGrid');
    if (episodesGrid) {
        episodesGrid.innerHTML = renderEpisodes(currentVideoTitle, sourceCode, vodId);
    }

    // Update button text and arrow direction
    const toggleBtn = document.querySelector(`button[onclick="toggleEpisodeOrder('${sourceCode}', '${vodId}')"]`);
    if (toggleBtn) {
        toggleBtn.querySelector('span').textContent = episodesReversed ? 'Ascending Order' : 'Descending Order';
        const arrowIcon = toggleBtn.querySelector('svg');
        if (arrowIcon) {
            arrowIcon.style.transform = episodesReversed ? 'rotate(180deg)' : 'rotate(0deg)';
        }
    }
}

// Import config from URL
async function importConfigFromUrl() {
    // Create modal element
    let modal = document.getElementById('importUrlModal');
    if (modal) {
        document.body.removeChild(modal);
    }

    modal = document.createElement('div');
    modal.id = 'importUrlModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-40';

    modal.innerHTML = `
        <div class="bg-[#191919] rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto relative">
            <button id="closeUrlModal" class="absolute top-4 right-4 text-gray-400 hover:text-white text-xl">&times;</button>
            
            <h3 class="text-xl font-bold mb-4">Import config from URL</h3>
            
            <div class="mb-4">
                <input type="text" id="configUrl" placeholder="Enter config file URL" 
                       class="w-full px-3 py-2 bg-[#222] border border-[#333] rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
            </div>
            
            <div class="flex justify-end space-x-2">
                <button id="confirmUrlImport" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">Import</button>
                <button id="cancelUrlImport" class="bg-[#444] hover:bg-[#555] text-white px-4 py-2 rounded">Cancel</button>
            </div>
        </div>`;

    document.body.appendChild(modal);

    // Close button event
    document.getElementById('closeUrlModal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    // Cancel button event
    document.getElementById('cancelUrlImport').addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    // Confirm import button event
    document.getElementById('confirmUrlImport').addEventListener('click', async () => {
        const url = document.getElementById('configUrl').value.trim();
        if (!url) {
            showToast('Please enter config file URL', 'warning');
            return;
        }

        // Validate URL format
        try {
            const urlObj = new URL(url);
            if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
                showToast('URL必须以http://or https://', 'warning');
                return;
            }
        } catch (e) {
            showToast('Invalid URL format', 'warning');
            return;
        }

        showLoading('Importing config from URL...');

        try {
            // Fetch config file - direct URL request
            const response = await fetch(url, {
                mode: 'cors',
                headers: {
                    'Accept': 'application/json'
                }
            });
            if (!response.ok) throw 'Failed to fetch config file';

            // Validate response content type
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw 'Response is not valid JSON format';
            }

            const config = await response.json();
            if (config.name !== 'OmniView-Settings') throw 'Invalid config file format';

            // Validate hash
            const dataHash = await sha256(JSON.stringify(config.data));
            if (dataHash !== config.hash) throw 'Config file hash mismatch';

            // Import Config
            for (let item in config.data) {
                localStorage.setItem(item, config.data[item]);
            }

            showToast('Config imported successfully, page will refresh automatically in 3 seconds.', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 3000);
        } catch (error) {
            const message = typeof error === 'string' ? error : 'Failed to import config';
            showToast(`Error importing config from URL (${message})`, 'error');
        } finally {
            hideLoading();
            document.body.removeChild(modal);
        }
    });

    // Click outside modal to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// Config file import function
async function importConfig() {
    showImportBox(async (file) => {
        try {
            // Check file type
            if (!(file.type === 'application/json' || file.name.endsWith('.json'))) throw 'Invalid file type';

            // Check file size
            if (file.size > 1024 * 1024 * 10) throw new Error('File size exceeds 10MB');

            // Read file content
            const content = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject('Failed to read file');
                reader.readAsText(file);
            });

            // Parse and validate config
            const config = JSON.parse(content);
            if (config.name !== 'OmniView-Settings') throw 'Invalid config file format';

            // Validate hash
            const dataHash = await sha256(JSON.stringify(config.data));
            if (dataHash !== config.hash) throw 'Config file hash mismatch';

            // Import Config
            for (let item in config.data) {
                localStorage.setItem(item, config.data[item]);
            }

            showToast('Config imported successfully, page will refresh automatically in 3 seconds.', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 3000);
        } catch (error) {
            const message = typeof error === 'string' ? error : 'Invalid config file format';
            showToast(`Error reading config file (${message})`, 'error');
        }
    });
}

// Config file export function
async function exportConfig() {
    // Store config data
    const config = {};
    const items = {};

    const settingsToExport = [
        'selectedAPIs',
        'customAPIs',
        'yellowFilterEnabled',
        'adFilteringEnabled',
        'doubanEnabled',
        'hasInitializedDefaults'
    ];

    // Export settings
    settingsToExport.forEach(key => {
        const value = localStorage.getItem(key);
        if (value !== null) {
            items[key] = value;
        }
    });

    // Export history
    const viewingHistory = localStorage.getItem('viewingHistory');
    if (viewingHistory) {
        items['viewingHistory'] = viewingHistory;
    }

    const searchHistory = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (searchHistory) {
        items[SEARCH_HISTORY_KEY] = searchHistory;
    }

    const times = Date.now().toString();
    config['name'] = 'OmniView-Settings';  // Config filename for validation
    config['time'] = times;               // Config generation time
    config['cfgVer'] = '1.0.0';           // Config version
    config['data'] = items;               // Config data
    config['hash'] = await sha256(JSON.stringify(config['data']));  // Calculate data hash for validation

    // Save config data as JSON file
    saveStringAsFile(JSON.stringify(config), 'OmniView-Settings_' + times + '.json');
}

// Save string as file
function saveStringAsFile(content, fileName) {
    // Create Blob object with specified type
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    // Generate temporary URL
    const url = window.URL.createObjectURL(blob);
    // Create <a> tag and trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    // Clean up temporary objects
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Remove Node.js require statements as this runs in browser environment
