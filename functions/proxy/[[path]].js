// functions/proxy/[[path]].js

// --- Configuration (now read from Cloudflare environment variables) ---
// Set the following variables in Cloudflare Pages Settings -> Functions -> Environment Variable Bindings:
// CACHE_TTL (e.g., 86400)
// MAX_RECURSION (e.g., 5)
// FILTER_DISCONTINUITY (no longer needed, set to false or remove)
// USER_AGENTS_JSON (e.g., ["UA1", "UA2"]) - JSON string array
// DEBUG (e.g., false or true)
// --- Configuration End ---

// --- Constants (previously in config.js, now moved here as they relate to proxy logic) ---
const MEDIA_FILE_EXTENSIONS = [
    '.mp4', '.webm', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.f4v', '.m4v', '.3gp', '.3g2', '.ts', '.mts', '.m2ts',
    '.mp3', '.wav', '.ogg', '.aac', '.m4a', '.flac', '.wma', '.alac', '.aiff', '.opus',
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.svg', '.avif', '.heic'
];
const MEDIA_CONTENT_TYPES = ['video/', 'audio/', 'image/'];
// --- Constants End ---


/**
 * Main Pages Function handler
 * Intercepts requests to /proxy/*
 */
export async function onRequest(context) {
    const { request, env, next, waitUntil } = context; // next and waitUntil may be needed
    const url = new URL(request.url);

    // --- Read configuration from environment variables ---
    const DEBUG_ENABLED = (env.DEBUG === 'true');
    const CACHE_TTL = parseInt(env.CACHE_TTL || '86400'); // Default 24 hours
    const MAX_RECURSION = parseInt(env.MAX_RECURSION || '5'); // Default 5 levels
    // Ad filtering has been moved to player processing, proxy no longer executes it
    let USER_AGENTS = [ // Provide a basic default value
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    try {
        // Try to parse USER_AGENTS_JSON from environment variables
        const agentsJson = env.USER_AGENTS_JSON;
        if (agentsJson) {
            const parsedAgents = JSON.parse(agentsJson);
            if (Array.isArray(parsedAgents) && parsedAgents.length > 0) {
                USER_AGENTS = parsedAgents;
            } else {
                 logDebug("Environment variable USER_AGENTS_JSON format is invalid or empty, using default value");
            }
        }
    } catch (e) {
        logDebug(`Failed to parse environment variable USER_AGENTS_JSON: ${e.message}, using default value`);
    }
    // --- Configuration reading end ---


    // --- Helper functions ---

    // Output debug logs (requires DEBUG: true environment variable)
    function logDebug(message) {
        if (DEBUG_ENABLED) {
            console.log(`[Proxy Func] ${message}`);
        }
    }

    // Extract target URL from request path
    function getTargetUrlFromPath(pathname) {
        // Path format: /proxy/encoded URL
        // Example: /proxy/https%3A%2F%2Fexample.com%2Fplaylist.m3u8
        const encodedUrl = pathname.replace(/^\/proxy\//, '');
        if (!encodedUrl) return null;
        try {
            // Decode
            let decodedUrl = decodeURIComponent(encodedUrl);

             // Simple check if decoded string is a valid http/https URL
             if (!decodedUrl.match(/^https?:\/\//i)) {
                 // Maybe the original path wasn't encoded? If it looks like a URL, use it directly
                 if (encodedUrl.match(/^https?:\/\//i)) {
                     decodedUrl = encodedUrl;
                     logDebug(`Warning: Path was not encoded but looks like URL: ${decodedUrl}`);
                 } else {
                    logDebug(`Invalid target URL format (after decoding): ${decodedUrl}`);
                    return null;
                 }
             }
             return decodedUrl;

        } catch (e) {
            logDebug(`Error decoding target URL: ${encodedUrl} - ${e.message}`);
            return null;
        }
    }

    // Create standardized response
    function createResponse(body, status = 200, headers = {}) {
        const responseHeaders = new Headers(headers);
        // Key: Add CORS headers to allow frontend JS to access proxied responses
        responseHeaders.set("Access-Control-Allow-Origin", "*"); // Allow access from any origin
        responseHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS"); // Allowed methods
        responseHeaders.set("Access-Control-Allow-Headers", "*"); // Allow all request headers

        // Handle CORS preflight requests (OPTIONS) - placing here ensures all responses handle it
         if (request.method === "OPTIONS") {
             // Using the onOptions function below would be more standard, but handling here works too
             return new Response(null, {
                 status: 204, // No Content
                 headers: responseHeaders // Includes CORS headers set above
             });
         }

        return new Response(body, { status, headers: responseHeaders });
    }

    // Create M3U8 type response
    function createM3u8Response(content) {
        return createResponse(content, 200, {
            "Content-Type": "application/vnd.apple.mpegurl", // Standard MIME type for M3U8
            "Cache-Control": `public, max-age=${CACHE_TTL}` // Allow browser and CDN caching
        });
    }

    // Get random User-Agent
    function getRandomUserAgent() {
        return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    }

    // Get base path of URL (for resolving relative paths)
    function getBaseUrl(urlStr) {
        try {
            const parsedUrl = new URL(urlStr);
            // If path is root directory or has no slash, directly return origin + /
            if (!parsedUrl.pathname || parsedUrl.pathname === '/') {
                return `${parsedUrl.origin}/`;
            }
            const pathParts = parsedUrl.pathname.split('/');
            pathParts.pop(); // Remove filename or last path segment
            return `${parsedUrl.origin}${pathParts.join('/')}/`;
        } catch (e) {
            logDebug(`Error getting BaseUrl: ${urlStr} - ${e.message}`);
            // Fallback method: find the last slash
            const lastSlashIndex = urlStr.lastIndexOf('/');
            // Ensure it's not a slash from the protocol part (http://)
            return lastSlashIndex > urlStr.indexOf('://') + 2 ? urlStr.substring(0, lastSlashIndex + 1) : urlStr + '/';
        }
    }


    // Convert relative URL to absolute URL
    function resolveUrl(baseUrl, relativeUrl) {
        // If already an absolute URL, return directly
        if (relativeUrl.match(/^https?:\/\//i)) {
            return relativeUrl;
        }
        try {
            // Use URL object to handle relative paths
            return new URL(relativeUrl, baseUrl).toString();
        } catch (e) {
            logDebug(`Failed to resolve URL: baseUrl=${baseUrl}, relativeUrl=${relativeUrl}, error=${e.message}`);
            // Simple fallback method
            if (relativeUrl.startsWith('/')) {
                // Handle root path relative URL
                const urlObj = new URL(baseUrl);
                return `${urlObj.origin}${relativeUrl}`;
            }
            // Handle same-level directory relative URL
            return `${baseUrl.replace(/\/[^/]*$/, '/')}${relativeUrl}`; // Ensure baseUrl ends with /
        }
    }

    // Rewrite target URL to internal proxy path (/proxy/...)
    function rewriteUrlToProxy(targetUrl) {
        // Ensure target URL is properly encoded to be used as part of the path
        return `/proxy/${encodeURIComponent(targetUrl)}`;
    }

    // Fetch remote content and its type
    async function fetchContentWithType(targetUrl) {
        const headers = new Headers({
            'User-Agent': getRandomUserAgent(),
            'Accept': '*/*',
            // Try to pass some original request headers
            'Accept-Language': request.headers.get('Accept-Language') || 'zh-CN,zh;q=0.9,en;q=0.8',
            // Try to set Referer to target site's domain, or pass original Referer
            'Referer': request.headers.get('Referer') || new URL(targetUrl).origin
        });

        try {
            // Directly request target URL
            logDebug(`Starting direct request: ${targetUrl}`);
            // Cloudflare Functions' fetch supports redirects by default
            const response = await fetch(targetUrl, { headers, redirect: 'follow' });

            if (!response.ok) {
                 const errorBody = await response.text().catch(() => '');
                 logDebug(`Request failed: ${response.status} ${response.statusText} - ${targetUrl}`);
                 throw new Error(`HTTP error ${response.status}: ${response.statusText}. URL: ${targetUrl}. Body: ${errorBody.substring(0, 150)}`);
            }

            // Read response content as text
            const content = await response.text();
            const contentType = response.headers.get('Content-Type') || '';
            logDebug(`Request successful: ${targetUrl}, Content-Type: ${contentType}, content length: ${content.length}`);
            return { content, contentType, responseHeaders: response.headers }; // Also return original response headers

        } catch (error) {
             logDebug(`Request completely failed: ${targetUrl}: ${error.message}`);
            // Throw more detailed error
            throw new Error(`Failed to request target URL ${targetUrl}: ${error.message}`);
        }
    }

    // Determine if content is M3U8
    function isM3u8Content(content, contentType) {
        // Check Content-Type
        if (contentType && (contentType.includes('application/vnd.apple.mpegurl') || contentType.includes('application/x-mpegurl') || contentType.includes('audio/mpegurl'))) {
            return true;
        }
        // Check if content itself starts with #EXTM3U
        return content && typeof content === 'string' && content.trim().startsWith('#EXTM3U');
    }

    // Determine if it's a media file (based on extension and Content-Type) - seems unused in this proxy but kept
    function isMediaFile(url, contentType) {
        if (contentType) {
            for (const mediaType of MEDIA_CONTENT_TYPES) {
                if (contentType.toLowerCase().startsWith(mediaType)) {
                    return true;
                }
            }
        }
        const urlLower = url.toLowerCase();
        for (const ext of MEDIA_FILE_EXTENSIONS) {
            if (urlLower.endsWith(ext) || urlLower.includes(`${ext}?`)) {
                return true;
            }
        }
        return false;
    }

    // Process #EXT-X-KEY line in M3U8 (encryption key)
    function processKeyLine(line, baseUrl) {
        return line.replace(/URI="([^"]+)"/, (match, uri) => {
            const absoluteUri = resolveUrl(baseUrl, uri);
            logDebug(`Processing KEY URI: original='${uri}', absolute='${absoluteUri}'`);
            return `URI="${rewriteUrlToProxy(absoluteUri)}"`; // Rewrite to proxy path
        });
    }

    // Process #EXT-X-MAP line in M3U8 (initialization segment)
    function processMapLine(line, baseUrl) {
         return line.replace(/URI="([^"]+)"/, (match, uri) => {
             const absoluteUri = resolveUrl(baseUrl, uri);
             logDebug(`Processing MAP URI: original='${uri}', absolute='${absoluteUri}'`);
             return `URI="${rewriteUrlToProxy(absoluteUri)}"`; // Rewrite to proxy path
         });
     }

    // Process media M3U8 playlist (containing video/audio segments)
    function processMediaPlaylist(url, content) {
        const baseUrl = getBaseUrl(url);
        const lines = content.split('\n');
        const output = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // Keep the final empty line
            if (!line && i === lines.length - 1) {
                output.push(line);
                continue;
            }
            if (!line) continue; // Skip empty lines in the middle

            if (line.startsWith('#EXT-X-KEY')) {
                output.push(processKeyLine(line, baseUrl));
                continue;
            }
            if (line.startsWith('#EXT-X-MAP')) {
                output.push(processMapLine(line, baseUrl));
                 continue;
            }
             if (line.startsWith('#EXTINF')) {
                 output.push(line);
                 continue;
             }
             if (!line.startsWith('#')) {
                 const absoluteUrl = resolveUrl(baseUrl, line);
                 logDebug(`Rewriting media segment: original='${line}', absolute='${absoluteUrl}'`);
                 output.push(rewriteUrlToProxy(absoluteUrl));
                 continue;
             }
             // Add other M3U8 tags directly
             output.push(line);
        }
        return output.join('\n');
    }

    // Recursively process M3U8 content
     async function processM3u8Content(targetUrl, content, recursionDepth = 0, env) {
         if (content.includes('#EXT-X-STREAM-INF') || content.includes('#EXT-X-MEDIA:')) {
             logDebug(`Detected master playlist: ${targetUrl}`);
             return await processMasterPlaylist(targetUrl, content, recursionDepth, env);
         }
         logDebug(`Detected media playlist: ${targetUrl}`);
         return processMediaPlaylist(targetUrl, content);
     }

    // Process master M3U8 playlist
    async function processMasterPlaylist(url, content, recursionDepth, env) {
        if (recursionDepth > MAX_RECURSION) {
            throw new Error(`Too many recursion levels when processing master playlist (${MAX_RECURSION}): ${url}`);
        }

        const baseUrl = getBaseUrl(url);
        const lines = content.split('\n');
        let highestBandwidth = -1;
        let bestVariantUrl = '';

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('#EXT-X-STREAM-INF')) {
                const bandwidthMatch = lines[i].match(/BANDWIDTH=(\d+)/);
                const currentBandwidth = bandwidthMatch ? parseInt(bandwidthMatch[1], 10) : 0;

                 let variantUriLine = '';
                 for (let j = i + 1; j < lines.length; j++) {
                     const line = lines[j].trim();
                     if (line && !line.startsWith('#')) {
                         variantUriLine = line;
                         i = j;
                         break;
                     }
                 }

                 if (variantUriLine && currentBandwidth >= highestBandwidth) {
                     highestBandwidth = currentBandwidth;
                     bestVariantUrl = resolveUrl(baseUrl, variantUriLine);
                 }
            }
        }

         if (!bestVariantUrl) {
             logDebug(`No BANDWIDTH or STREAM-INF found in master playlist, trying to find first sub-playlist reference: ${url}`);
             for (let i = 0; i < lines.length; i++) {
                 const line = lines[i].trim();
                 if (line && !line.startsWith('#') && (line.endsWith('.m3u8') || line.includes('.m3u8?'))) { // Fix: check if contains .m3u8?
                    bestVariantUrl = resolveUrl(baseUrl, line);
                     logDebug(`Fallback: found first sub-playlist reference: ${bestVariantUrl}`);
                     break;
                 }
             }
         }

        if (!bestVariantUrl) {
            logDebug(`No valid sub-playlist URLs found in master playlist ${url}. Format may be problematic or contains only audio/subtitles. Will try to process original content as media playlist.`);
            return processMediaPlaylist(url, content);
        }

        // --- Fetch and process selected sub-M3U8 ---

        const cacheKey = `m3u8_processed:${bestVariantUrl}`; // Use processed cache key

        let kvNamespace = null;
        try {
            kvNamespace = env.LIBRETV_PROXY_KV; // Get KV namespace from environment (variable name in Cloudflare settings)
            if (!kvNamespace) throw new Error("KV namespace not bound");
        } catch (e) {
            logDebug(`Error accessing KV namespace 'LIBRETV_PROXY_KV' or not bound: ${e.message}`);
            kvNamespace = null; // Ensure set to null
        }

        if (kvNamespace) {
            try {
                const cachedContent = await kvNamespace.get(cacheKey);
                if (cachedContent) {
                    logDebug(`[Cache hit] Sub-playlist of master playlist: ${bestVariantUrl}`);
                    return cachedContent;
                } else {
                    logDebug(`[Cache miss] Sub-playlist of master playlist: ${bestVariantUrl}`);
                }
            } catch (kvError) {
                logDebug(`Failed to read cache from KV (${cacheKey}): ${kvError.message}`);
                // Error doesn't affect functionality, continue
            }
        }

        logDebug(`Selected sub-playlist (bandwidth: ${highestBandwidth}): ${bestVariantUrl}`);
        const { content: variantContent, contentType: variantContentType } = await fetchContentWithType(bestVariantUrl);

        if (!isM3u8Content(variantContent, variantContentType)) {
            logDebug(`Fetched sub-playlist ${bestVariantUrl} is not M3U8 content (type: ${variantContentType}). May be a direct media file, returning original content.`);
             // If not M3U8 but looks like media content, directly return proxied content
             // Note: may need to decide whether to directly proxy this non-M3U8 URL
             // For simplicity, we assume if not M3U8, the flow is interrupted or processed as-is
             // Or try to process it as a media playlist? (current behavior)
             // return createResponse(variantContent, 200, { 'Content-Type': variantContentType || 'application/octet-stream' });
             // Try processing as media playlist, just in case
             return processMediaPlaylist(bestVariantUrl, variantContent);

        }

        const processedVariant = await processM3u8Content(bestVariantUrl, variantContent, recursionDepth + 1, env);

        if (kvNamespace) {
             try {
                 // Use waitUntil to asynchronously write to cache, don't block response return
                 // Note KV write limits (free tier: 1000 writes per day)
                 waitUntil(kvNamespace.put(cacheKey, processedVariant, { expirationTtl: CACHE_TTL }));
                 logDebug(`Written processed sub-playlist to cache: ${bestVariantUrl}`);
             } catch (kvError) {
                 logDebug(`Failed to write cache to KV (${cacheKey}): ${kvError.message}`);
                 // Write failure doesn't affect returned result
             }
        }

        return processedVariant;
    }

    // --- Main request processing logic ---

    try {
        const targetUrl = getTargetUrlFromPath(url.pathname);

        if (!targetUrl) {
            logDebug(`Invalid proxy request path: ${url.pathname}`);
            return createResponse("Invalid proxy request. Path should be /proxy/<encoded URL>", 400);
        }

        logDebug(`Received proxy request: ${targetUrl}`);

        // --- Cache check (KV) ---
        const cacheKey = `proxy_raw:${targetUrl}`; // Use cache key for raw content
        let kvNamespace = null;
        try {
            kvNamespace = env.LIBRETV_PROXY_KV;
            if (!kvNamespace) throw new Error("KV namespace not bound");
        } catch (e) {
            logDebug(`Error accessing KV namespace 'LIBRETV_PROXY_KV' or not bound: ${e.message}`);
            kvNamespace = null;
        }

        if (kvNamespace) {
            try {
                const cachedDataJson = await kvNamespace.get(cacheKey); // Directly get string
                if (cachedDataJson) {
                    logDebug(`[Cache hit] Raw content: ${targetUrl}`);
                    const cachedData = JSON.parse(cachedDataJson); // Parse JSON
                    const content = cachedData.body;
                    let headers = {};
                    try { headers = JSON.parse(cachedData.headers); } catch(e){} // Parse headers
                    const contentType = headers['content-type'] || headers['Content-Type'] || '';

                    if (isM3u8Content(content, contentType)) {
                        logDebug(`Cached content is M3U8, reprocessing: ${targetUrl}`);
                        const processedM3u8 = await processM3u8Content(targetUrl, content, 0, env);
                        return createM3u8Response(processedM3u8);
                    } else {
                        logDebug(`Returning non-M3U8 content from cache: ${targetUrl}`);
                        return createResponse(content, 200, new Headers(headers));
                    }
                } else {
                     logDebug(`[Cache miss] Raw content: ${targetUrl}`);
                 }
            } catch (kvError) {
                 logDebug(`Failed to read or parse cache from KV (${cacheKey}): ${kvError.message}`);
                 // Error doesn't affect functionality, continue
            }
        }

        // --- Actual request ---
        const { content, contentType, responseHeaders } = await fetchContentWithType(targetUrl);

        // --- Write to cache (KV) ---
        if (kvNamespace) {
             try {
                 const headersToCache = {};
                 responseHeaders.forEach((value, key) => { headersToCache[key.toLowerCase()] = value; });
                 const cacheValue = { body: content, headers: JSON.stringify(headersToCache) };
                 // Note KV write limits
                 waitUntil(kvNamespace.put(cacheKey, JSON.stringify(cacheValue), { expirationTtl: CACHE_TTL }));
                 logDebug(`Written raw content to cache: ${targetUrl}`);
            } catch (kvError) {
                 logDebug(`Failed to write cache to KV (${cacheKey}): ${kvError.message}`);
                 // Write failure doesn't affect returned result
            }
        }

        // --- Process response ---
        if (isM3u8Content(content, contentType)) {
            logDebug(`Content is M3U8, starting processing: ${targetUrl}`);
            const processedM3u8 = await processM3u8Content(targetUrl, content, 0, env);
            return createM3u8Response(processedM3u8);
        } else {
            logDebug(`Content is not M3U8 (type: ${contentType}), returning directly: ${targetUrl}`);
            const finalHeaders = new Headers(responseHeaders);
            finalHeaders.set('Cache-Control', `public, max-age=${CACHE_TTL}`);
            // Add CORS headers to ensure non-M3U8 content can also be accessed cross-origin (e.g., images, subtitle files, etc.)
            finalHeaders.set("Access-Control-Allow-Origin", "*");
            finalHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS");
            finalHeaders.set("Access-Control-Allow-Headers", "*");
            return createResponse(content, 200, finalHeaders);
        }

    } catch (error) {
        logDebug(`Serious error occurred while processing proxy request: ${error.message} \n ${error.stack}`);
        return createResponse(`Proxy processing error: ${error.message}`, 500);
    }
}

// Function to handle OPTIONS preflight requests
export async function onOptions(context) {
    // Directly return headers allowing cross-origin
    return new Response(null, {
        status: 204, // No Content
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
            "Access-Control-Allow-Headers": "*", // Allow all request headers
            "Access-Control-Max-Age": "86400", // Cache preflight request result for one day
        },
    });
}