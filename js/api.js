// Improved API request handler function
async function handleApiRequest(url) {
    const customApi = url.searchParams.get('customApi') || '';
    const customDetail = url.searchParams.get('customDetail') || '';
    const source = url.searchParams.get('source') || 'heimuer';
    
    try {
        if (url.pathname === '/api/search') {
            const searchQuery = url.searchParams.get('wd');
            if (!searchQuery) {
                throw new Error('Missing search parameter');
            }
            
            // Validate API and source validity
            if (source === 'custom' && !customApi) {
                throw new Error('API address must be provided when using custom API');
            }
            
            if (!API_SITES[source] && source !== 'custom') {
                throw new Error('Invalid API source');
            }
            
            const apiUrl = customApi
                ? `${customApi}${API_CONFIG.search.path}${encodeURIComponent(searchQuery)}`
                : `${API_SITES[source].api}${API_CONFIG.search.path}${encodeURIComponent(searchQuery)}`;
            
            // Add timeout handling
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            try {
                const response = await fetch(PROXY_URL + encodeURIComponent(apiUrl), {
                    headers: API_CONFIG.search.headers,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`API request failed: ${response.status}`);
                }
                
                const data = await response.json();
                
                // Check JSON format validity
                if (!data || !Array.isArray(data.list)) {
                    throw new Error('Invalid data format returned by API');
                }
                
                // Add source information to each result
                data.list.forEach(item => {
                    item.source_name = source === 'custom' ? 'Custom Source' : API_SITES[source].name;
                    item.source_code = source;
                    // For custom sources, add API URL information
                    if (source === 'custom') {
                        item.api_url = customApi;
                    }
                });
                
                return JSON.stringify({
                    code: 200,
                    list: data.list || [],
                });
            } catch (fetchError) {
                clearTimeout(timeoutId);
                throw fetchError;
            }
        }

        // Detail handling
        if (url.pathname === '/api/detail') {
            const id = url.searchParams.get('id');
            const sourceCode = url.searchParams.get('source') || 'heimuer'; // Get source code
            
            if (!id) {
                throw new Error('Missing video ID parameter');
            }
            
            // Validate ID format - only allow numbers and limited special characters
            if (!/^[\w-]+$/.test(id)) {
                throw new Error('Invalid video ID format');
            }

            // Validate API and source validity
            if (sourceCode === 'custom' && !customApi) {
                throw new Error('API address must be provided when using custom API');
            }
            
            if (!API_SITES[sourceCode] && sourceCode !== 'custom') {
                throw new Error('Invalid API source');
            }

            // For sources with detail parameter, all use special handling
            if (sourceCode !== 'custom' && API_SITES[sourceCode].detail) {
                return await handleSpecialSourceDetail(id, sourceCode);
            }
            
            // If it's a custom API and detail parameter is passed, try special handling
            // Priority: customDetail
            if (sourceCode === 'custom' && customDetail) {
                return await handleCustomApiSpecialDetail(id, customDetail);
            }
            if (sourceCode === 'custom' && url.searchParams.get('useDetail') === 'true') {
                return await handleCustomApiSpecialDetail(id, customApi);
            }
            
            const detailUrl = customApi
                ? `${customApi}${API_CONFIG.detail.path}${id}`
                : `${API_SITES[sourceCode].api}${API_CONFIG.detail.path}${id}`;
            
            // Add timeout handling
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            try {
                const response = await fetch(PROXY_URL + encodeURIComponent(detailUrl), {
                    headers: API_CONFIG.detail.headers,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`Detail request failed: ${response.status}`);
                }
                
                // Parse JSON
                const data = await response.json();
                
                // Check if returned data is valid
                if (!data || !data.list || !Array.isArray(data.list) || data.list.length === 0) {
                    throw new Error('Retrieved detail content is invalid');
                }
                
                // Get the first matching video detail
                const videoDetail = data.list[0];
                
                // Extract playback URLs
                let episodes = [];
                
                if (videoDetail.vod_play_url) {
                    // Split different playback sources
                    const playSources = videoDetail.vod_play_url.split('$$$');
                    
                    // Extract episodes from the first playback source (usually the main source)
                    if (playSources.length > 0) {
                        const mainSource = playSources[0];
                        const episodeList = mainSource.split('#');
                        
                        // Extract URL from each episode
                        episodes = episodeList.map(ep => {
                            const parts = ep.split('$');
                            // Return URL part (usually the second part, if it exists)
                            return parts.length > 1 ? parts[1] : '';
                        }).filter(url => url && (url.startsWith('http://') || url.startsWith('https://')));
                    }
                }
                
                // If no playback URL found, try using regex to find m3u8 links
                if (episodes.length === 0 && videoDetail.vod_content) {
                    const matches = videoDetail.vod_content.match(M3U8_PATTERN) || [];
                    episodes = matches.map(link => link.replace(/^\$/, ''));
                }
                
                return JSON.stringify({
                    code: 200,
                    episodes: episodes,
                    detailUrl: detailUrl,
                    videoInfo: {
                        title: videoDetail.vod_name,
                        cover: videoDetail.vod_pic,
                        desc: videoDetail.vod_content,
                        type: videoDetail.type_name,
                        year: videoDetail.vod_year,
                        area: videoDetail.vod_area,
                        director: videoDetail.vod_director,
                        actor: videoDetail.vod_actor,
                        remarks: videoDetail.vod_remarks,
                        // Add source information
                        source_name: sourceCode === 'custom' ? 'Custom Source' : API_SITES[sourceCode].name,
                        source_code: sourceCode
                    }
                });
            } catch (fetchError) {
                clearTimeout(timeoutId);
                throw fetchError;
            }
        }

        throw new Error('Unknown API path');
    } catch (error) {
        console.error('API processing error:', error);
        return JSON.stringify({
            code: 400,
            msg: error.message || 'Request processing failed',
            list: [],
            episodes: [],
        });
    }
}

// Handle special detail page for custom API
async function handleCustomApiSpecialDetail(id, customApi) {
    try {
        // Construct detail page URL
        const detailUrl = `${customApi}/index.php/vod/detail/id/${id}.html`;
        
        // Add timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        // Get detail page HTML
        const response = await fetch(PROXY_URL + encodeURIComponent(detailUrl), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`Custom API detail page request failed: ${response.status}`);
        }
        
        // Get HTML content
        const html = await response.text();
        
        // Use general pattern to extract m3u8 links
        const generalPattern = /\$(https?:\/\/[^"'\s]+?\.m3u8)/g;
        let matches = html.match(generalPattern) || [];
        
        // Process links
        matches = matches.map(link => {
            link = link.substring(1, link.length);
            const parenIndex = link.indexOf('(');
            return parenIndex > 0 ? link.substring(0, parenIndex) : link;
        });
        
        // Extract basic information
        const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
        const titleText = titleMatch ? titleMatch[1].trim() : '';
        
        const descMatch = html.match(/<div[^>]*class=["']sketch["'][^>]*>([\s\S]*?)<\/div>/);
        const descText = descMatch ? descMatch[1].replace(/<[^>]+>/g, ' ').trim() : '';
        
        return JSON.stringify({
            code: 200,
            episodes: matches,
            detailUrl: detailUrl,
            videoInfo: {
                title: titleText,
                desc: descText,
                source_name: 'Custom Source',
                source_code: 'custom'
            }
        });
    } catch (error) {
        console.error(`Custom API detail retrieval failed:`, error);
        throw error;
    }
}

// General special source detail handler function
async function handleSpecialSourceDetail(id, sourceCode) {
    try {
        // Construct detail page URL (using detail URL from config instead of api URL)
        const detailUrl = `${API_SITES[sourceCode].detail}/index.php/vod/detail/id/${id}.html`;
        
        // Add timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        // Get detail page HTML
        const response = await fetch(PROXY_URL + encodeURIComponent(detailUrl), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`Detail page request failed: ${response.status}`);
        }
        
        // Get HTML content
        const html = await response.text();
        
        // Use different regex patterns based on different source types
        let matches = [];
        
        if (sourceCode === 'ffzy') {
            // Feifan Video uses specific regex
            const ffzyPattern = /\$(https?:\/\/[^"'\s]+?\/\d{8}\/\d+_[a-f0-9]+\/index\.m3u8)/g;
            matches = html.match(ffzyPattern) || [];
        }
        
        // If no links found or it's other source types, try a more general pattern
        if (matches.length === 0) {
            const generalPattern = /\$(https?:\/\/[^"'\s]+?\.m3u8)/g;
            matches = html.match(generalPattern) || [];
        }
        // Deduplication to avoid displaying multiple episodes from one playback source
        matches = [...new Set(matches)];
        // Process links
        matches = matches.map(link => {
            link = link.substring(1, link.length);
            const parenIndex = link.indexOf('(');
            return parenIndex > 0 ? link.substring(0, parenIndex) : link;
        });
        
        // Extract possible basic information like title, description, etc.
        const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
        const titleText = titleMatch ? titleMatch[1].trim() : '';
        
        const descMatch = html.match(/<div[^>]*class=["']sketch["'][^>]*>([\s\S]*?)<\/div>/);
        const descText = descMatch ? descMatch[1].replace(/<[^>]+>/g, ' ').trim() : '';
        
        return JSON.stringify({
            code: 200,
            episodes: matches,
            detailUrl: detailUrl,
            videoInfo: {
                title: titleText,
                desc: descText,
                source_name: API_SITES[sourceCode].name,
                source_code: sourceCode
            }
        });
    } catch (error) {
        console.error(`${API_SITES[sourceCode].name} detail retrieval failed:`, error);
        throw error;
    }
}

// Handle aggregated search
async function handleAggregatedSearch(searchQuery) {
    // Get list of available API sources (excluding aggregated and custom)
    const availableSources = Object.keys(API_SITES).filter(key => 
        key !== 'aggregated' && key !== 'custom'
    );
    
    if (availableSources.length === 0) {
        throw new Error('No available API sources');
    }
    
    // Create search requests for all API sources
    const searchPromises = availableSources.map(async (source) => {
        try {
            const apiUrl = `${API_SITES[source].api}${API_CONFIG.search.path}${encodeURIComponent(searchQuery)}`;
            
            // Add timeout handling using Promise.race
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`${source} source search timeout`)), 8000)
            );
            
            const fetchPromise = fetch(PROXY_URL + encodeURIComponent(apiUrl), {
                headers: API_CONFIG.search.headers
            });
            
            const response = await Promise.race([fetchPromise, timeoutPromise]);
            
            if (!response.ok) {
                throw new Error(`${source} source request failed: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data || !Array.isArray(data.list)) {
                throw new Error(`${source} source returned invalid data format`);
            }
            
            // Add source information to search results
            const results = data.list.map(item => ({
                ...item,
                source_name: API_SITES[source].name,
                source_code: source
            }));
            
            return results;
        } catch (error) {
            console.warn(`${source} source search failed:`, error);
            return []; // Return empty array to indicate this source search failed
        }
    });
    
    try {
        // Execute all search requests in parallel
        const resultsArray = await Promise.all(searchPromises);
        
        // Merge all results
        let allResults = [];
        resultsArray.forEach(results => {
            if (Array.isArray(results) && results.length > 0) {
                allResults = allResults.concat(results);
            }
        });
        
        // If no search results, return empty results
        if (allResults.length === 0) {
            return JSON.stringify({
                code: 200,
                list: [],
                msg: 'All sources returned no search results'
            });
        }
        
        // Deduplicate (based on vod_id and source_code combination)
        const uniqueResults = [];
        const seen = new Set();
        
        allResults.forEach(item => {
            const key = `${item.source_code}_${item.vod_id}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueResults.push(item);
            }
        });
        
        // Sort by video name and source
        uniqueResults.sort((a, b) => {
            // First sort by video name
            const nameCompare = (a.vod_name || '').localeCompare(b.vod_name || '');
            if (nameCompare !== 0) return nameCompare;
            
            // If names are the same, sort by source
            return (a.source_name || '').localeCompare(b.source_name || '');
        });
        
        return JSON.stringify({
            code: 200,
            list: uniqueResults,
        });
    } catch (error) {
        console.error('Aggregated search processing error:', error);
        return JSON.stringify({
            code: 400,
            msg: 'Aggregated search processing failed: ' + error.message,
            list: []
        });
    }
}

// Handle aggregated search for multiple custom API sources
async function handleMultipleCustomSearch(searchQuery, customApiUrls) {
    // Parse custom API list
    const apiUrls = customApiUrls.split(CUSTOM_API_CONFIG.separator)
        .map(url => url.trim())
        .filter(url => url.length > 0 && /^https?:\/\//.test(url))
        .slice(0, CUSTOM_API_CONFIG.maxSources);
    
    if (apiUrls.length === 0) {
        throw new Error('No valid custom API addresses provided');
    }
    
    // Create search request for each API
    const searchPromises = apiUrls.map(async (apiUrl, index) => {
        try {
            const fullUrl = `${apiUrl}${API_CONFIG.search.path}${encodeURIComponent(searchQuery)}`;
            
            // Add timeout handling using Promise.race
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`Custom API ${index+1} search timeout`)), 8000)
            );
            
            const fetchPromise = fetch(PROXY_URL + encodeURIComponent(fullUrl), {
                headers: API_CONFIG.search.headers
            });
            
            const response = await Promise.race([fetchPromise, timeoutPromise]);
            
            if (!response.ok) {
                throw new Error(`Custom API ${index+1} request failed: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data || !Array.isArray(data.list)) {
                throw new Error(`Custom API ${index+1} returned invalid data format`);
            }
            
            // Add source information to search results
            const results = data.list.map(item => ({
                ...item,
                source_name: `${CUSTOM_API_CONFIG.namePrefix}${index+1}`,
                source_code: 'custom',
                api_url: apiUrl // Save API URL for detail retrieval
            }));
            
            return results;
        } catch (error) {
            console.warn(`Custom API ${index+1} search failed:`, error);
            return []; // Return empty array to indicate this source search failed
        }
    });
    
    try {
        // Execute all search requests in parallel
        const resultsArray = await Promise.all(searchPromises);
        
        // Merge all results
        let allResults = [];
        resultsArray.forEach(results => {
            if (Array.isArray(results) && results.length > 0) {
                allResults = allResults.concat(results);
            }
        });
        
        // If no search results, return empty results
        if (allResults.length === 0) {
            return JSON.stringify({
                code: 200,
                list: [],
                msg: 'All custom API sources returned no search results'
            });
        }
        
        // Deduplicate (based on vod_id and api_url combination)
        const uniqueResults = [];
        const seen = new Set();
        
        allResults.forEach(item => {
            const key = `${item.api_url || ''}_${item.vod_id}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueResults.push(item);
            }
        });
        
        return JSON.stringify({
            code: 200,
            list: uniqueResults,
        });
    } catch (error) {
        console.error('Custom API aggregated search processing error:', error);
        return JSON.stringify({
            code: 400,
            msg: 'Custom API aggregated search processing failed: ' + error.message,
            list: []
        });
    }
}

// Intercept API requests
(function() {
    const originalFetch = window.fetch;
    
    window.fetch = async function(input, init) {
        const requestUrl = typeof input === 'string' ? new URL(input, window.location.origin) : input.url;
        
        if (requestUrl.pathname.startsWith('/api/')) {
            if (window.isPasswordProtected && window.isPasswordVerified) {
                if (window.isPasswordProtected() && !window.isPasswordVerified()) {
                    return;
                }
            }
            try {
                const data = await handleApiRequest(requestUrl);
                return new Response(data, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                });
            } catch (error) {
                return new Response(JSON.stringify({
                    code: 500,
                    msg: 'Internal server error',
                }), {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            }
        }
        
        // Non-API requests use original fetch
        return originalFetch.apply(this, arguments);
    };
})();

async function testSiteAvailability(apiUrl) {
    try {
        // Use simpler test query
        const response = await fetch('/api/search?wd=test&customApi=' + encodeURIComponent(apiUrl), {
            // Add timeout
            signal: AbortSignal.timeout(5000)
        });
        
        // Check response status
        if (!response.ok) {
            return false;
        }
        
        const data = await response.json();
        
        // Check validity of API response
        return data && data.code !== 400 && Array.isArray(data.list);
    } catch (error) {
        console.error('Site availability test failed:', error);
        return false;
    }
}