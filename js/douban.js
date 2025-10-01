// Douban popular movie and TV show recommendation feature

// Douban tag list - modified to default tags
let defaultMovieTags = ['热门', '最新', '经典', '豆瓣高分', '冷门佳片', '华语', '欧美', '韩国', '日本', '动作', '喜剧', '爱情', '科幻', '悬疑', '恐怖', '治愈'];
let defaultTvTags = ['热门', '美剧', '英剧', '韩剧', '日剧', '国产剧', '港剧', '日本动画', '综艺', '纪录片'];

// User tag list - stores tags actually used by users (including reserved system tags and user-added custom tags)
let movieTags = [];
let tvTags = [];

// Load user tags
function loadUserTags() {
    try {
        // Attempt to load user-saved tags from local storage
        const savedMovieTags = localStorage.getItem('userMovieTags');
        const savedTvTags = localStorage.getItem('userTvTags');
        
        // If tag data exists in local storage, use it
        if (savedMovieTags) {
            movieTags = JSON.parse(savedMovieTags);
        } else {
            // Otherwise use default tags
            movieTags = [...defaultMovieTags];
        }
        
        if (savedTvTags) {
            tvTags = JSON.parse(savedTvTags);
        } else {
            // Otherwise use default tags
            tvTags = [...defaultTvTags];
        }
    } catch (e) {
        console.error('Failed to load tags:', e);
        // Initialize to default values to prevent errors
        movieTags = [...defaultMovieTags];
        tvTags = [...defaultTvTags];
    }
}

// Save user tags
function saveUserTags() {
    try {
        localStorage.setItem('userMovieTags', JSON.stringify(movieTags));
        localStorage.setItem('userTvTags', JSON.stringify(tvTags));
    } catch (e) {
        console.error('Failed to save tags:', e);
        showToast('Failed to save tags', 'error');
    }
}

let doubanMovieTvCurrentSwitch = 'movie';
let doubanCurrentTag = '热门';
let doubanPageStart = 0;
const doubanPageSize = 16; // Number of items to display at once

// Initialize Douban functionality
function initDouban() {
    // Set initial state of Douban toggle
    const doubanToggle = document.getElementById('doubanToggle');
    if (doubanToggle) {
        const isEnabled = localStorage.getItem('doubanEnabled') === 'true';
        doubanToggle.checked = isEnabled;
        
        // Set toggle appearance
        const toggleBg = doubanToggle.nextElementSibling;
        const toggleDot = toggleBg.nextElementSibling;
        if (isEnabled) {
            toggleBg.classList.add('bg-pink-600');
            toggleDot.classList.add('translate-x-6');
        }
        
        // Add event listener
        doubanToggle.addEventListener('change', function(e) {
            const isChecked = e.target.checked;
            localStorage.setItem('doubanEnabled', isChecked);
            
            // Update toggle appearance
            if (isChecked) {
                toggleBg.classList.add('bg-pink-600');
                toggleDot.classList.add('translate-x-6');
            } else {
                toggleBg.classList.remove('bg-pink-600');
                toggleDot.classList.remove('translate-x-6');
            }
            
            // Update display status
            updateDoubanVisibility();
        });
        
        // Initial display status update
        updateDoubanVisibility();

        // Scroll to top of page
        window.scrollTo(0, 0);
    }

    // Load user tags
    loadUserTags();

    // Render movie/TV show toggle
    renderDoubanMovieTvSwitch();
    
    // Render Douban tags
    renderDoubanTags();
    
    // Refresh button event listener
    setupDoubanRefreshBtn();
    
    // Initial load of popular content
    if (localStorage.getItem('doubanEnabled') === 'true') {
        renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart);
    }
}

// Update Douban section display status based on settings
function updateDoubanVisibility() {
    const doubanArea = document.getElementById('doubanArea');
    if (!doubanArea) return;
    
    const isEnabled = localStorage.getItem('doubanEnabled') === 'true';
    const isSearching = document.getElementById('resultsArea') && 
        !document.getElementById('resultsArea').classList.contains('hidden');
    
    // Only show Douban section when enabled and no search results are displayed
    if (isEnabled && !isSearching) {
        doubanArea.classList.remove('hidden');
        // If Douban results are empty, reload
        if (document.getElementById('douban-results').children.length === 0) {
            renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart);
        }
    } else {
        doubanArea.classList.add('hidden');
    }
}

// Only populate search box without executing search, let user decide when to search
function fillSearchInput(title) {
    if (!title) return;
    
    // Safely handle title to prevent XSS
    const safeTitle = title
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    
    const input = document.getElementById('searchInput');
    if (input) {
        input.value = safeTitle;
        
        // Focus search box for immediate keyboard operation
        input.focus();
        
        // Show a prompt informing user to click search button to search
        showToast('Search content populated, click search button to begin search', 'info');
    }
}

// Populate search box and execute search
function fillAndSearch(title) {
    if (!title) return;
    
    // Safely handle title to prevent XSS
    const safeTitle = title
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    
    const input = document.getElementById('searchInput');
    if (input) {
        input.value = safeTitle;
        search(); // Execute search using existing search function
        
        // Also update browser URL to reflect current search state
        try {
            // Use URI encoding to ensure special characters display correctly
            const encodedQuery = encodeURIComponent(safeTitle);
            // Update URL using HTML5 History API without page refresh
            window.history.pushState(
                { search: safeTitle }, 
                `Search: ${safeTitle} - OmniView`, 
                `/s=${encodedQuery}`
            );
            // Update page title
            document.title = `Search: ${safeTitle} - OmniView`;
        } catch (e) {
            console.error('Failed to update browser history:', e);
        }
    }
}

// Populate search box, ensure Douban API is selected, then execute search
async function fillAndSearchWithDouban(title) {
    if (!title) return;
    
    // Safely handle title to prevent XSS
    const safeTitle = title
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    
    // Ensure Douban API is selected
    if (typeof selectedAPIs !== 'undefined' && !selectedAPIs.includes('dbzy')) {
        // Check Douban API checkbox in settings
        const doubanCheckbox = document.querySelector('input[id="api_dbzy"]');
        if (doubanCheckbox) {
            doubanCheckbox.checked = true;
            
            // Trigger updateSelectedAPIs function to update state
            if (typeof updateSelectedAPIs === 'function') {
                updateSelectedAPIs();
            } else {
                // If function is unavailable, manually add to selectedAPIs
                selectedAPIs.push('dbzy');
                localStorage.setItem('selectedAPIs', JSON.stringify(selectedAPIs));
                
                // Update selected API count (if element exists)
                const countEl = document.getElementById('selectedAPICount');
                if (countEl) {
                    countEl.textContent = selectedAPIs.length;
                }
            }
            
            showToast('Douban API automatically selected', 'info');
        }
    }
    
    // Populate search box and execute search
    const input = document.getElementById('searchInput');
    if (input) {
        input.value = safeTitle;
        await search(); // Execute search using existing search function
        
        // Update browser URL to reflect current search state
        try {
            // Use URI encoding to ensure special characters display correctly
            const encodedQuery = encodeURIComponent(safeTitle);
            // Update URL using HTML5 History API without page refresh
            window.history.pushState(
                { search: safeTitle }, 
                `Search: ${safeTitle} - OmniView`, 
                `/s=${encodedQuery}`
            );
            // Update page title
            document.title = `Search: ${safeTitle} - OmniView`;
        } catch (e) {
            console.error('Failed to update browser history:', e);
        }

        if (window.innerWidth <= 768) {
          window.scrollTo({
              top: 0,
              behavior: 'smooth'
          });
        }
    }
}

// Render movie/TV show switcher
function renderDoubanMovieTvSwitch() {
    // Get toggle button elements
    const movieToggle = document.getElementById('douban-movie-toggle');
    const tvToggle = document.getElementById('douban-tv-toggle');

    if (!movieToggle ||!tvToggle) return;

    movieToggle.addEventListener('click', function() {
        if (doubanMovieTvCurrentSwitch !== 'movie') {
            // Update button styles
            movieToggle.classList.add('bg-pink-600', 'text-white');
            movieToggle.classList.remove('text-gray-300');
            
            tvToggle.classList.remove('bg-pink-600', 'text-white');
            tvToggle.classList.add('text-gray-300');
            
            doubanMovieTvCurrentSwitch = 'movie';
            doubanCurrentTag = 'Popular';

            // Reload Douban content
            renderDoubanTags(movieTags);

            // Refresh button event listener
            setupDoubanRefreshBtn();
            
            // Initial load of popular content
            if (localStorage.getItem('doubanEnabled') === 'true') {
                renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart);
            }
        }
    });
    
    // TV show button click event
    tvToggle.addEventListener('click', function() {
        if (doubanMovieTvCurrentSwitch !== 'tv') {
            // Update button styles
            tvToggle.classList.add('bg-pink-600', 'text-white');
            tvToggle.classList.remove('text-gray-300');
            
            movieToggle.classList.remove('bg-pink-600', 'text-white');
            movieToggle.classList.add('text-gray-300');
            
            doubanMovieTvCurrentSwitch = 'tv';
            doubanCurrentTag = '热门';

            // Reload Douban content
            renderDoubanTags(tvTags);

            // Refresh button event listener
            setupDoubanRefreshBtn();
            
            // Initial load of popular content
            if (localStorage.getItem('doubanEnabled') === 'true') {
                renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart);
            }
        }
    });
}

// Render Douban tag selector
function renderDoubanTags(tags) {
    const tagContainer = document.getElementById('douban-tags');
    if (!tagContainer) return;
    
    // Determine which tag list should be used currently
    const currentTags = doubanMovieTvCurrentSwitch === 'movie' ? movieTags : tvTags;
    
    // Clear tag container
    tagContainer.innerHTML = '';

    // Add tag management button first
    const manageBtn = document.createElement('button');
    manageBtn.className = 'py-1.5 px-3.5 rounded text-sm font-medium transition-all duration-300 bg-[#1a1a1a] text-gray-300 hover:bg-pink-700 hover:text-white border border-[#333] hover:border-white';
    manageBtn.innerHTML = '<span class="flex items-center"><svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>Manage Tags</span>';
    manageBtn.onclick = function() {
        showTagManageModal();
    };
    tagContainer.appendChild(manageBtn);

    // Add all tags
    currentTags.forEach(tag => {
        const btn = document.createElement('button');
        
        // Set styles
        let btnClass = 'py-1.5 px-3.5 rounded text-sm font-medium transition-all duration-300 border ';
        
        // Currently selected tag uses highlight style
        if (tag === doubanCurrentTag) {
            btnClass += 'bg-pink-600 text-white shadow-md border-white';
        } else {
            btnClass += 'bg-[#1a1a1a] text-gray-300 hover:bg-pink-700 hover:text-white border-[#333] hover:border-white';
        }
        
        btn.className = btnClass;
        btn.textContent = tag;
        
        btn.onclick = function() {
            if (doubanCurrentTag !== tag) {
                doubanCurrentTag = tag;
                doubanPageStart = 0;
                renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart);
                renderDoubanTags();
            }
        };
        
        tagContainer.appendChild(btn);
    });
}

// Set refresh button event
function setupDoubanRefreshBtn() {
    // Fix ID, use correct ID douban-refresh instead of douban-refresh-btn
    const btn = document.getElementById('douban-refresh');
    if (!btn) return;
    
    btn.onclick = function() {
        doubanPageStart += doubanPageSize;
        if (doubanPageStart > 9 * doubanPageSize) {
            doubanPageStart = 0;
        }
        
        renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart);
    };
}

function fetchDoubanTags() {
    const movieTagsTarget = `https://movie.douban.com/j/search_tags?type=movie`
    fetchDoubanData(movieTagsTarget)
        .then(data => {
            movieTags = data.tags;
            if (doubanMovieTvCurrentSwitch === 'movie') {
                renderDoubanTags(movieTags);
            }
        })
        .catch(error => {
            console.error("Failed to fetch Douban popular movie tags:", error);
        });
    const tvTagsTarget = `https://movie.douban.com/j/search_tags?type=tv`
    fetchDoubanData(tvTagsTarget)
       .then(data => {
            tvTags = data.tags;
            if (doubanMovieTvCurrentSwitch === 'tv') {
                renderDoubanTags(tvTags);
            }
        })
       .catch(error => {
            console.error("Failed to fetch Douban popular TV show tags:", error);
        });
}

// Render popular recommendations
function renderRecommend(tag, pageLimit, pageStart) {
    const container = document.getElementById("douban-results");
    if (!container) return;

    const loadingOverlayHTML = `
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-10">
            <div class="flex items-center justify-center">
                <div class="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin inline-block"></div>
                <span class="text-pink-500 ml-4">Loading...</span>
            </div>
        </div>
    `;

    container.classList.add("relative");
    container.insertAdjacentHTML('beforeend', loadingOverlayHTML);
    
    const target = `https://movie.douban.com/j/search_subjects?type=${doubanMovieTvCurrentSwitch}&tag=${tag}&sort=recommend&page_limit=${pageLimit}&page_start=${pageStart}`;
    
    // Use generic request function
    fetchDoubanData(target)
        .then(data => {
            renderDoubanCards(data, container);
        })
        .catch(error => {
            console.error("Failed to fetch Douban data:", error);
            container.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <div class="text-red-400">❌ Failed to fetch Douban data, please try again later</div>
                    <div class="text-gray-500 text-sm mt-2">Tip: Using a VPN may help resolve this issue</div>
                </div>
            `;
        });
}

async function fetchDoubanData(url) {
    // Add timeout control
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    // Set request options including signal and headers
    const fetchOptions = {
        signal: controller.signal,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Referer': 'https://movie.douban.com/',
            'Accept': 'application/json, text/plain, */*',
        }
    };

    try {
        // Try direct access (Douban API may allow some CORS requests)
        const response = await fetch(PROXY_URL + encodeURIComponent(url), fetchOptions);
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        return await response.json();
    } catch (err) {
        console.error("Douban API request failed (direct proxy):", err);
        
        // Try fallback method after failure: as alternative
        const fallbackUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        
        try {
            const fallbackResponse = await fetch(fallbackUrl);
            
            if (!fallbackResponse.ok) {
                throw new Error(`Fallback API request failed! Status: ${fallbackResponse.status}`);
            }
            
            const data = await fallbackResponse.json();
            
            // Parse raw content
            if (data && data.contents) {
                return JSON.parse(data.contents);
            } else {
                throw new Error("Unable to fetch valid data");
            }
        } catch (fallbackErr) {
            console.error("Douban API fallback request also failed:", fallbackErr);
            throw fallbackErr; // Throw error upward for caller to handle
        }
    }
}

// Extract Douban card rendering logic into separate function
function renderDoubanCards(data, container) {
    // Create document fragment to improve performance
    const fragment = document.createDocumentFragment();
    
    // If no data available
    if (!data.subjects || data.subjects.length === 0) {
        const emptyEl = document.createElement("div");
        emptyEl.className = "col-span-full text-center py-8";
        emptyEl.innerHTML = `
            <div class="text-pink-500">❌ No data available, please try another category or refresh</div>
        `;
        fragment.appendChild(emptyEl);
    } else {
        // Loop to create each media card
        data.subjects.forEach(item => {
            const card = document.createElement("div");
            card.className = "bg-[#111] hover:bg-[#222] transition-all duration-300 rounded-lg overflow-hidden flex flex-col transform hover:scale-105 shadow-md hover:shadow-lg";
            
            // Generate card content, ensure safe display (prevent XSS)
            const safeTitle = item.title
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
            
            const safeRate = (item.rate || "N/A")
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            
            // Handle image URL
            // 1. Use Douban image URL directly (add no-referrer attribute)
            const originalCoverUrl = item.cover;
            
            // 2. Also prepare proxy URL as fallback
            const proxiedCoverUrl = PROXY_URL + encodeURIComponent(originalCoverUrl);
            
            // Optimize card layout for different devices
            card.innerHTML = `
                <div class="relative w-full aspect-[2/3] overflow-hidden cursor-pointer" onclick="fillAndSearchWithDouban('${safeTitle}')">
                    <img src="${originalCoverUrl}" alt="${safeTitle}" 
                        class="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                        onerror="this.onerror=null; this.src='${proxiedCoverUrl}'; this.classList.add('object-contain');"
                        loading="lazy" referrerpolicy="no-referrer">
                    <div class="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-60"></div>
                    <div class="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-sm">
                        <span class="text-yellow-400">★</span> ${safeRate}
                    </div>
                    <div class="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-sm hover:bg-[#333] transition-colors">
                        <a href="${item.url}" target="_blank" rel="noopener noreferrer" title="View on Douban" onclick="event.stopPropagation();">
                            🔗
                        </a>
                    </div>
                </div>
                <div class="p-2 text-center bg-[#111]">
                    <button onclick="fillAndSearchWithDouban('${safeTitle}')" 
                            class="text-sm font-medium text-white truncate w-full hover:text-pink-400 transition"
                            title="${safeTitle}">
                        ${safeTitle}
                    </button>
                </div>
            `;
            
            fragment.appendChild(card);
        });
    }
    
    // Clear and add all new elements
    container.innerHTML = "";
    container.appendChild(fragment);
}

// Reset to homepage
function resetToHome() {
    resetSearchArea();
    updateDoubanVisibility();
}

// Load Douban homepage content
document.addEventListener('DOMContentLoaded', initDouban);

// Show tag management modal
function showTagManageModal() {
    // Ensure only one modal instance exists on page
    let modal = document.getElementById('tagManageModal');
    if (modal) {
        document.body.removeChild(modal);
    }
    
    // Create modal element
    modal = document.createElement('div');
    modal.id = 'tagManageModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-40';
    
    // Currently used tag type and default tags
    const isMovie = doubanMovieTvCurrentSwitch === 'movie';
    const currentTags = isMovie ? movieTags : tvTags;
    const defaultTags = isMovie ? defaultMovieTags : defaultTvTags;
    
    // Modal content
    modal.innerHTML = `
        <div class="bg-[#191919] rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto relative">
            <button id="closeTagModal" class="absolute top-4 right-4 text-gray-400 hover:text-white text-xl">&times;</button>
            
            <h3 class="text-xl font-bold text-white mb-4">Tag Management (${isMovie ? 'Movies' : 'TV Shows'})</h3>
            
            <div class="mb-4">
                <div class="flex justify-between items-center mb-2">
                    <h4 class="text-lg font-medium text-gray-300">Tag List</h4>
                    <button id="resetTagsBtn" class="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded">
                        Restore Default Tags
                    </button>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4" id="tagsGrid">
                    ${currentTags.length ? currentTags.map(tag => {
                        // "Popular" tag cannot be deleted
                        const canDelete = tag !== 'Popular';
                        return `
                            <div class="bg-[#1a1a1a] text-gray-300 py-1.5 px-3 rounded text-sm font-medium flex justify-between items-center group">
                                <span>${tag}</span>
                                ${canDelete ? 
                                    `<button class="delete-tag-btn text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" 
                                        data-tag="${tag}">✕</button>` : 
                                    `<span class="text-gray-500 text-xs italic opacity-0 group-hover:opacity-100">Required</span>`
                                }
                            </div>
                        `;
                    }).join('') : 
                    `<div class="col-span-full text-center py-4 text-gray-500">No tags, please add or restore defaults</div>`}
                </div>
            </div>
            
            <div class="border-t border-gray-700 pt-4">
                <h4 class="text-lg font-medium text-gray-300 mb-3">Add New Tag</h4>
                <form id="addTagForm" class="flex items-center">
                    <input type="text" id="newTagInput" placeholder="Enter tag name..." 
                           class="flex-1 bg-[#222] text-white border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-pink-500">
                    <button type="submit" class="ml-2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded">Add</button>
                </form>
                <p class="text-xs text-gray-500 mt-2">Note: Tag name cannot be empty, duplicated, or contain special characters</p>
            </div>
        </div>
    `;
    
    // Add modal to page
    document.body.appendChild(modal);
    
    // Focus on input field
    setTimeout(() => {
        document.getElementById('newTagInput').focus();
    }, 100);
    
    // Add event listener - close button
    document.getElementById('closeTagModal').addEventListener('click', function() {
        document.body.removeChild(modal);
    });
    
    // Add event listener - close on outside click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
    
    // Add event listener - restore default tags button
    document.getElementById('resetTagsBtn').addEventListener('click', function() {
        resetTagsToDefault();
        showTagManageModal(); // Reload modal
    });
    
    // Add event listener - delete tag button
    const deleteButtons = document.querySelectorAll('.delete-tag-btn');
    deleteButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const tagToDelete = this.getAttribute('data-tag');
            deleteTag(tagToDelete);
            showTagManageModal(); // Reload modal
        });
    });
    
    // Add event listener - form submit
    document.getElementById('addTagForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const input = document.getElementById('newTagInput');
        const newTag = input.value.trim();
        
        if (newTag) {
            addTag(newTag);
            input.value = '';
            showTagManageModal(); // Reload modal
        }
    });
}

// Add tag
function addTag(tag) {
    // Sanitize tag name to prevent XSS
    const safeTag = tag
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    
    // Determine whether current tags are for movies or TV shows
    const isMovie = doubanMovieTvCurrentSwitch === 'movie';
    const currentTags = isMovie ? movieTags : tvTags;
    
    // Check if already exists (case-insensitive)
    const exists = currentTags.some(
        existingTag => existingTag.toLowerCase() === safeTag.toLowerCase()
    );
    
    if (exists) {
        showToast('Tag already exists', 'warning');
        return;
    }
    
    // Add to corresponding tag array
    if (isMovie) {
        movieTags.push(safeTag);
    } else {
        tvTags.push(safeTag);
    }
    
    // Save to local storage
    saveUserTags();
    
    // Re-render tags
    renderDoubanTags();
    
    showToast('Tag added successfully', 'success');
}

// Delete tag
function deleteTag(tag) {
    // Popular tags cannot be deleted
    if (tag === 'Popular') {
        showToast('Popular tags cannot be deleted', 'warning');
        return;
    }
    
    // Determine whether current tags are for movies or TV shows
    const isMovie = doubanMovieTvCurrentSwitch === 'movie';
    const currentTags = isMovie ? movieTags : tvTags;
    
    // Find tag index
    const index = currentTags.indexOf(tag);
    
    // Delete if tag is found
    if (index !== -1) {
        currentTags.splice(index, 1);
        
        // Save to local storage
        saveUserTags();
        
        // Reset to "Popular" if currently selected tag is deleted
        if (doubanCurrentTag === tag) {
            doubanCurrentTag = 'Popular';
            doubanPageStart = 0;
            renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart);
        }
        
        // Re-render tags
        renderDoubanTags();
        
        showToast('Tag deleted successfully', 'success');
    }
}

// Reset to default tags
function resetTagsToDefault() {
    // Determine whether current content is movies or TV shows
    const isMovie = doubanMovieTvCurrentSwitch === 'movie';
    
    // Reset to default tags
    if (isMovie) {
        movieTags = [...defaultMovieTags];
    } else {
        tvTags = [...defaultTvTags];
    }
    
    // Set current tag to Popular
    doubanCurrentTag = 'Popular';
    doubanPageStart = 0;
    
    // Save to local storage
    saveUserTags();
    
    // Re-render tags and content
    renderDoubanTags();
    renderRecommend(doubanCurrentTag, doubanPageSize, doubanPageStart);
    
    showToast('Default tags restored', 'success');
}
