// /api/proxy/[...path].mjs - Vercel Serverless Function (ES Module)

import fetch from 'node-fetch';
import { URL } from 'url'; // Use Node.js built-in URL handling

// --- Configuration (read from environment variables) ---
const DEBUG_ENABLED = process.env.DEBUG === 'true';
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '86400', 10); // Default 24 hours
const MAX_RECURSION = parseInt(process.env.MAX_RECURSION || '5', 10); // Default 5 layers

// --- User Agent Handling ---
// Default User Agent list
let USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
];
// Try to read and parse USER_AGENTS_JSON from environment variables
try {
    const agentsJsonString = process.env.USER_AGENTS_JSON;
    if (agentsJsonString) {
        const parsedAgents = JSON.parse(agentsJsonString);
        // Check if the parsing result is a non-empty array
        if (Array.isArray(parsedAgents) && parsedAgents.length > 0) {
            USER_AGENTS = parsedAgents; // Use the array from environment variables
            console.log(`[Proxy Log] Loaded ${USER_AGENTS.length} User Agents from environment variables.`);
        } else {
            console.warn("[Proxy Log] Environment variable USER_AGENTS_JSON is not a valid non-empty array, using default values.");
        }
    } else {
        console.log("[Proxy Log] Environment variable USER_AGENTS_JSON is not set, using default User Agents.");
    }
} catch (e) {
    // If JSON parsing fails, log the error and use default values
    console.error(`[Proxy Log] Error parsing environment variable USER_AGENTS_JSON: ${e.message}. Using default User Agents.`);
}

// Ad filtering is disabled in the proxy and handled by the player
const FILTER_DISCONTINUITY = false;


// --- Helper Functions ---

function logDebug(message) {
    if (DEBUG_ENABLED) {
        console.log(`[Proxy Log] ${message}`);
    }
}

/**
 * Extracts the encoded target URL from the proxy request path.
 * @param {string} encodedPath - The URL-encoded path part (e.g., "https%3A%2F%2F...")
 * @returns {string|null} The decoded target URL, or null if invalid.
 */
function getTargetUrlFromPath(encodedPath) {
    if (!encodedPath) {
        logDebug("getTargetUrlFromPath received an empty path.");
        return null;
    }
    try {
        const decodedUrl = decodeURIComponent(encodedPath);
        // Basic check to see if it looks like an HTTP/HTTPS URL
        if (decodedUrl.match(/^https?:\/\/.+/i)) {
            return decodedUrl;
        } else {
            logDebug(`Invalid decoded URL format: ${decodedUrl}`);
            // Alternative check: is the original path unencoded but looks like a URL?
            if (encodedPath.match(/^https?:\/\/.+/i)) {
                logDebug(`Warning: Path is not encoded but looks like a URL: ${encodedPath}`);
                return encodedPath;
            }
            return null;
        }
    } catch (e) {
        // Catch decoding errors (e.g., malformed URI)
        logDebug(`Error decoding target URL: ${encodedPath} - ${e.message}`);
        return null;
    }
}

function getBaseUrl(urlStr) {
    if (!urlStr) return '';
    try {
        const parsedUrl = new URL(urlStr);
        // Handle root directory or filename-only cases
        const pathSegments = parsedUrl.pathname.split('/').filter(Boolean); // Remove empty strings
        if (pathSegments.length <= 1) {
            return `${parsedUrl.origin}/`;
        }
        pathSegments.pop(); // Remove the last segment
        return `${parsedUrl.origin}/${pathSegments.join('/')}/`;
    } catch (e) {
        logDebug(`Failed to get BaseUrl: "${urlStr}": ${e.message}`);
        // Fallback method: find the last slash
        const lastSlashIndex = urlStr.lastIndexOf('/');
        if (lastSlashIndex > urlStr.indexOf('://') + 2) { // Ensure it's not the slash from the protocol
            return urlStr.substring(0, lastSlashIndex + 1);
        }
        return urlStr + '/'; // Add a slash if there is no path
    }
}

function resolveUrl(baseUrl, relativeUrl) {
    if (!relativeUrl) return ''; // Handle empty relativeUrl
    if (relativeUrl.match(/^https?:\/\/.+/i)) {
        return relativeUrl; // Already an absolute URL
    }
    if (!baseUrl) return relativeUrl; // Cannot resolve without a base URL

    try {
        // Use Node.js's URL constructor to handle relative paths
        return new URL(relativeUrl, baseUrl).toString();
    } catch (e) {
        logDebug(`URL resolution failed: base="${baseUrl}", relative="${relativeUrl}". Error: ${e.message}`);
        // Simple fallback logic
        if (relativeUrl.startsWith('/')) {
             try {
                const baseOrigin = new URL(baseUrl).origin;
                return `${baseOrigin}${relativeUrl}`;
             } catch { return relativeUrl; } // If baseUrl is also invalid, return the original relative path
        } else {
            // Assume it's relative to the directory containing the base URL resource
            return `${baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1)}${relativeUrl}`;
        }
    }
}

// ** Fixed: Ensure links are generated with the /proxy/ prefix **
function rewriteUrlToProxy(targetUrl) {
    if (!targetUrl || typeof targetUrl !== 'string') return '';
    // Return a path consistent with vercel.json's "source" and the frontend's PROXY_URL
    return `/proxy/${encodeURIComponent(targetUrl)}`;
}

function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function fetchContentWithType(targetUrl, requestHeaders) {
    // Prepare request headers
    const headers = {
        'User-Agent': getRandomUserAgent(),
        'Accept': requestHeaders['accept'] || '*/*', // Pass the original Accept header if available
        'Accept-Language': requestHeaders['accept-language'] || 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
        // Try to set a reasonable Referer
        'Referer': requestHeaders['referer'] || new URL(targetUrl).origin,
    };
    // Clean up headers with null/undefined/empty values
    Object.keys(headers).forEach(key => headers[key] === undefined || headers[key] === null || headers[key] === '' ? delete headers[key] : {});

    logDebug(`Preparing to request target: ${targetUrl}, headers: ${JSON.stringify(headers)}`);

    try {
        // Make the fetch request
        const response = await fetch(targetUrl, { headers, redirect: 'follow' });

        // Check if the response is successful
        if (!response.ok) {
            const errorBody = await response.text().catch(() => ''); // Try to get the error response body
            logDebug(`Request failed: ${response.status} ${response.statusText} - ${targetUrl}`);
            // Create an error object containing the status code
            const err = new Error(`HTTP error ${response.status}: ${response.statusText}. URL: ${targetUrl}. Body: ${errorBody.substring(0, 200)}`);
            err.status = response.status; // Attach the status code to the error object
            throw err; // Throw the error
        }

        // Read the response content
        const content = await response.text();
        const contentType = response.headers.get('content-type') || '';
        logDebug(`Request successful: ${targetUrl}, Content-Type: ${contentType}, Content length: ${content.length}`);
        // Return the result
        return { content, contentType, responseHeaders: response.headers };

    } catch (error) {
        // Catch fetch's own errors (network, timeout, etc.) or the HTTP errors thrown above
        logDebug(`Request exception ${targetUrl}: ${error.message}`);
        // Re-throw to ensure the original error information is included
        throw new Error(`Failed to request target URL ${targetUrl}: ${error.message}`);
    }
}

function isM3u8Content(content, contentType) {
    if (contentType && (contentType.includes('application/vnd.apple.mpegurl') || contentType.includes('application/x-mpegurl') || contentType.includes('audio/mpegurl'))) {
        return true;
    }
    return content && typeof content === 'string' && content.trim().startsWith('#EXTM3U');
}

function processKeyLine(line, baseUrl) {
    return line.replace(/URI="([^"]+)"/, (match, uri) => {
        const absoluteUri = resolveUrl(baseUrl, uri);
        logDebug(`Processing KEY URI: original='${uri}', absolute='${absoluteUri}'`);
        return `URI="${rewriteUrlToProxy(absoluteUri)}"`;
    });
}

function processMapLine(line, baseUrl) {
     return line.replace(/URI="([^"]+)"/, (match, uri) => {
        const absoluteUri = resolveUrl(baseUrl, uri);
        logDebug(`Processing MAP URI: original='${uri}', absolute='${absoluteUri}'`);
        return `URI="${rewriteUrlToProxy(absoluteUri)}"`;
     });
 }

function processMediaPlaylist(url, content) {
    const baseUrl = getBaseUrl(url);
    if (!baseUrl) {
        logDebug(`Could not determine Base URL for media playlist: ${url}, relative paths may not be handled correctly.`);
    }
    const lines = content.split('\n');
    const output = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Keep the last empty line
        if (!line && i === lines.length - 1) { output.push(line); continue; }
        if (!line) continue; // Skip intermediate empty lines
        // Ad filtering is disabled
        if (line.startsWith('#EXT-X-KEY')) { output.push(processKeyLine(line, baseUrl)); continue; }
        if (line.startsWith('#EXT-X-MAP')) { output.push(processMapLine(line, baseUrl)); continue; }
        if (line.startsWith('#EXTINF')) { output.push(line); continue; }
        // Process URL lines
        if (!line.startsWith('#')) {
            const absoluteUrl = resolveUrl(baseUrl, line);
            logDebug(`Rewriting media segment: original='${line}', resolved='${absoluteUrl}'`);
            output.push(rewriteUrlToProxy(absoluteUrl)); continue;
        }
        // Keep other M3U8 tags
        output.push(line);
    }
    return output.join('\n');
}

async function processM3u8Content(targetUrl, content, recursionDepth = 0) {
    // Determine if it's a master playlist or a media playlist
    if (content.includes('#EXT-X-STREAM-INF') || content.includes('#EXT-X-MEDIA:')) {
        logDebug(`Detected master playlist: ${targetUrl} (depth: ${recursionDepth})`);
        return await processMasterPlaylist(targetUrl, content, recursionDepth);
    }
    logDebug(`Detected media playlist: ${targetUrl} (depth: ${recursionDepth})`);
    return processMediaPlaylist(targetUrl, content);
}

async function processMasterPlaylist(url, content, recursionDepth) {
    // Check recursion depth
    if (recursionDepth > MAX_RECURSION) {
        throw new Error(`Recursion depth exceeded maximum limit (${MAX_RECURSION}) when processing master playlist: ${url}`);
    }
    const baseUrl = getBaseUrl(url);
    const lines = content.split('\n');
    let highestBandwidth = -1;
    let bestVariantUrl = '';

    // Find the stream with the highest bandwidth
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('#EXT-X-STREAM-INF')) {
            const bandwidthMatch = lines[i].match(/BANDWIDTH=(\d+)/);
            const currentBandwidth = bandwidthMatch ? parseInt(bandwidthMatch[1], 10) : 0;
            let variantUriLine = '';
            // Find the URI on the next line
            for (let j = i + 1; j < lines.length; j++) {
                const line = lines[j].trim();
                if (line && !line.startsWith('#')) { variantUriLine = line; i = j; break; }
            }
            if (variantUriLine && currentBandwidth >= highestBandwidth) {
                highestBandwidth = currentBandwidth;
                bestVariantUrl = resolveUrl(baseUrl, variantUriLine);
            }
        }
    }
    // If no bandwidth information is found, try to find the first .m3u8 link
    if (!bestVariantUrl) {
        logDebug(`No BANDWIDTH information found in master playlist, trying to find the first URI: ${url}`);
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
             // More reliably match .m3u8 links
            if (line && !line.startsWith('#') && line.match(/\.m3u8($|\?.*)/i)) {
                bestVariantUrl = resolveUrl(baseUrl, line);
                logDebug(`Fallback: Found first sub-playlist URI: ${bestVariantUrl}`);
                break;
            }
        }
    }
    // If a sub-playlist URL is still not found
    if (!bestVariantUrl) {
        logDebug(`No valid sub-playlist URI found in master playlist ${url}, treating it as a media playlist.`);
        return processMediaPlaylist(url, content);
    }

    logDebug(`Selected sub-playlist (bandwidth: ${highestBandwidth}): ${bestVariantUrl}`);
    // Request the content of the selected sub-playlist (Note: passing {} as headers, not the client's original headers)
    const { content: variantContent, contentType: variantContentType } = await fetchContentWithType(bestVariantUrl, {});

    // Check if the fetched content is M3U8
    if (!isM3u8Content(variantContent, variantContentType)) {
        logDebug(`Fetched sub-playlist ${bestVariantUrl} is not M3U8 (type: ${variantContentType}), treating it as a media playlist.`);
        return processMediaPlaylist(bestVariantUrl, variantContent);
    }

    // Recursively process the fetched sub-M3U8 content
    return await processM3u8Content(bestVariantUrl, variantContent, recursionDepth + 1);
}


// --- Vercel Handler Function ---
export default async function handler(req, res) {
    // --- Log Request Start ---
    console.info('--- Vercel Proxy Request Start ---');
    console.info('Time:', new Date().toISOString());
    console.info('Method:', req.method);
    console.info('URL:', req.url); // Original request URL (e.g., /proxy/...)
    console.info('Query Params:', JSON.stringify(req.query)); // Vercel parsed query parameters

    // --- Set CORS Headers in Advance ---
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*'); // Allow all request headers

    // --- Handle OPTIONS Preflight Request ---
    if (req.method === 'OPTIONS') {
        console.info("Handling OPTIONS preflight request");
        res.status(204).setHeader('Access-Control-Max-Age', '86400').end(); // Cache preflight result for 24 hours
        return;
    }

    let targetUrl = null; // Initialize target URL

    try { // ---- Start of main processing logic try block ----

        // --- Extract Target URL (mainly depends on req.query["...path"]) ---
        // Vercel puts the content captured by :path* (which may contain slashes) into the req.query["...path"] array
        const pathData = req.query["...path"]; // Use the correct key name
        let encodedUrlPath = '';

        if (pathData) {
            if (Array.isArray(pathData)) {
                encodedUrlPath = pathData.join('/'); // Recombine
                console.info(`Encoded path combined from req.query["...path"] (array): ${encodedUrlPath}`);
            } else if (typeof pathData === 'string') {
                encodedUrlPath = pathData; // Also handle cases where Vercel might return a string
                console.info(`Encoded path from req.query["...path"] (string): ${encodedUrlPath}`);
            } else {
                console.warn(`[Proxy Warning] Unknown type for req.query["...path"]: ${typeof pathData}`);
            }
        } else {
            console.warn(`[Proxy Warning] req.query["...path"] is empty or undefined.`);
            // Fallback: try to extract from req.url (if needed)
            if (req.url && req.url.startsWith('/proxy/')) {
                encodedUrlPath = req.url.substring('/proxy/'.length);
                console.info(`Encoded path extracted from req.url using fallback: ${encodedUrlPath}`);
            }
        }

        // If still empty, cannot proceed
        if (!encodedUrlPath) {
             throw new Error("Could not determine the encoded target path from the request.");
        }

        // Parse the target URL
        targetUrl = getTargetUrlFromPath(encodedUrlPath);
        console.info(`Parsed target URL: ${targetUrl || 'null'}`); // Log the parsing result

        // Check if the target URL is valid
        if (!targetUrl) {
            // Throw an error with more context
            throw new Error(`Invalid proxy request path. Could not extract a valid target URL from the combined path "${encodedUrlPath}".`);
        }

        console.info(`Starting to process proxy request for target URL: ${targetUrl}`);

        // --- Fetch and Process Target Content ---
        const { content, contentType, responseHeaders } = await fetchContentWithType(targetUrl, req.headers);

        // --- If it's M3U8, process and return ---
        if (isM3u8Content(content, contentType)) {
            console.info(`Processing M3U8 content: ${targetUrl}`);
            const processedM3u8 = await processM3u8Content(targetUrl, content);

            console.info(`Successfully processed M3U8: ${targetUrl}`);
            // Send the processed M3U8 response
            res.status(200)
                .setHeader('Content-Type', 'application/vnd.apple.mpegurl;charset=utf-8')
                .setHeader('Cache-Control', `public, max-age=${CACHE_TTL}`)
                // Remove original response headers that might cause issues
                .removeHeader('content-encoding') // Very important! node-fetch has already decompressed it
                .removeHeader('content-length')   // The length has changed
                .send(processedM3u8); // Send the M3U8 text

        } else {
            // --- If not M3U8, return the original content directly ---
            console.info(`Returning non-M3U8 content directly: ${targetUrl}, Type: ${contentType}`);

            // Set original response headers, but exclude problematic headers and CORS headers (already set)
            responseHeaders.forEach((value, key) => {
                 const lowerKey = key.toLowerCase();
                 if (!lowerKey.startsWith('access-control-') &&
                     lowerKey !== 'content-encoding' && // Very important!
                     lowerKey !== 'content-length') {   // Very important!
                     res.setHeader(key, value); // Set other original headers
                 }
             });
            // Set our own cache policy
            res.setHeader('Cache-Control', `public, max-age=${CACHE_TTL}`);

            // Send the original (decompressed) content
            res.status(200).send(content);
        }

    // ---- End of main processing logic try block ----
    } catch (error) { // ---- Catch any errors during processing ----
        // **Check if this error is "Assignment to constant variable"**
        console.error(`[Proxy Error Handling V3] Caught error! Target: ${targetUrl || 'parsing failed'} | Error Type: ${error.constructor.name} | Error Message: ${error.message}`);
        console.error(`[Proxy Error Stack V3] ${error.stack}`); // Log the full error stack

        // Specifically flag "Assignment to constant variable" errors
        if (error instanceof TypeError && error.message.includes("Assignment to constant variable")) {
             console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
             console.error("Caught 'Assignment to constant variable' error!");
             console.error("Please double-check the function code and all helper functions for any const-declared variables being reassigned.");
             console.error("Error stack points to:", error.stack);
             console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        }

        // Try to get the status code from the error object, otherwise default to 500
        const statusCode = error.status || 500;

        // Ensure headers have not been sent before sending an error response
        if (!res.headersSent) {
             res.setHeader('Content-type', 'application/json');
             // CORS headers should have been set earlier
             res.status(statusCode).json({
                success: false,
                error: `Proxy processing error: ${error.message}`, // Return error message to the frontend
                targetUrl: targetUrl // Include the target URL for debugging
            });
        } else {
            // If headers have already been sent, we can't send a JSON error
            console.error("[Proxy Error Handling V3] Headers already sent, cannot send JSON error response.");
            // Try to end the response
             if (!res.writableEnded) {
                 res.end();
             }
        }
    }
    finally {
         // Log the end of request processing
         console.info('--- Vercel Proxy Request End ---');
    }
}

// --- [Ensure all helper functions are defined here] ---
// getTargetUrlFromPath, getBaseUrl, resolveUrl, rewriteUrlToProxy, getRandomUserAgent,
// fetchContentWithType, isM3u8Content, processKeyLine, processMapLine,
// processMediaPlaylist, processM3u8Content, processMasterPlaylist
