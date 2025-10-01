// Add animation style
(function() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0%, 100% {
                opacity: 1;
            }
            50% {
                opacity: 0.6;
            }
        }
        .animate-pulse {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
    `;
    document.head.appendChild(style);
})();

// Get version information
async function fetchVersion(url, errorMessage, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(errorMessage);
    }
    return await response.text();
}

// Version check function
async function checkForUpdates() {
    try {
        // Get current version
        const currentVersion = await fetchVersion('/VERSION.txt', 'Failed to get current version', {
            cache: 'no-store'
        });
        
        // Get latest version
        let latestVersion;
        const VERSION_URL = {
            PROXY: 'https://ghfast.top/raw.githubusercontent.com/CrueChan/OmniView/main/VERSION.txt',
            DIRECT: 'https://raw.githubusercontent.com/CrueChan/OmniView/main/VERSION.txt'
        };
        const FETCH_TIMEOUT = 1500;
        
        try {
            // Attempting to get latest version via proxy URL
            const proxyPromise = fetchVersion(VERSION_URL.PROXY, 'Proxy request failed');
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Proxy request timeout')), FETCH_TIMEOUT)
            );
            
            latestVersion = await Promise.race([proxyPromise, timeoutPromise]);
            console.log('Successfully retrieved version via proxy server');
        } catch (error) {
            console.log('Proxy request failed, attempting direct request:', error.message);
            try {
                // Attempting direct fetch after proxy failure
                latestVersion = await fetchVersion(VERSION_URL.DIRECT, 'Failed to get latest version');
                console.log('Successfully retrieved version via direct request');
            } catch (directError) {
                console.error('All version check requests failed:', directError);
                throw new Error('Unable to retrieve latest version information');
            }
        }
        
        console.log('Current version:', currentVersion);
        console.log('Latest version:', latestVersion);
        
        // Clean version string (remove possible spaces or line breaks)
        const cleanCurrentVersion = currentVersion.trim();
        const cleanLatestVersion = latestVersion.trim();
        
        // Return version information
        return {
            current: cleanCurrentVersion,
            latest: cleanLatestVersion,
            hasUpdate: parseInt(cleanLatestVersion) > parseInt(cleanCurrentVersion),
            currentFormatted: formatVersion(cleanCurrentVersion),
            latestFormatted: formatVersion(cleanLatestVersion)
        };
    } catch (error) {
        console.error('Version detection error:', error);
        throw error;
    }
}

// Format version number to readable form (yyyyMMddhhmm -> yyyy-MM-dd hh:mm)
function formatVersion(versionString) {
    // Validate version string
    if (!versionString) {
        return 'Unknown version';
    }
    
    // Clean version string (remove possible spaces or line breaks)
    const cleanedString = versionString.trim();
    
    // Format standard 12-digit version number
    if (cleanedString.length === 12) {
        const year = cleanedString.substring(0, 4);
        const month = cleanedString.substring(4, 6);
        const day = cleanedString.substring(6, 8);
        const hour = cleanedString.substring(8, 10);
        const minute = cleanedString.substring(10, 12);
        
        return `${year}-${month}-${day} ${hour}:${minute}`;
    }
    
    return cleanedString;
}

// Create error version info element
function createErrorVersionElement(errorMessage) {
    const errorElement = document.createElement('p');
    errorElement.className = 'text-gray-500 text-sm mt-1 text-center md:text-left';
    errorElement.innerHTML = `Version: <span class="text-amber-500">Detection Failed</span>`;
    errorElement.title = errorMessage;
    return errorElement;
}

// Add version info to footer
function addVersionInfoToFooter() {
    checkForUpdates().then(result => {
        if (!result) {
            // Display error message if version detection fails
            const versionElement = createErrorVersionElement();
            // Display error element in footer
            displayVersionElement(versionElement);
            return;
        }
        
        // Create version info element
        const versionElement = document.createElement('p');
        versionElement.className = 'text-gray-500 text-sm mt-1 text-center md:text-left';
        
        // Add current version info
        versionElement.innerHTML = `Version: ${result.currentFormatted}`;
        
        // Add update notification if available
        if (result.hasUpdate) {
            versionElement.innerHTML += ` <span class="inline-flex items-center bg-red-600 text-white text-xs px-2 py-0.5 rounded-md ml-1 cursor-pointer animate-pulse font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                New Version Available
            </span>`;
            
            setTimeout(() => {
                const updateBtn = versionElement.querySelector('span');
                if (updateBtn) {
                    updateBtn.addEventListener('click', () => {
                        window.open('https://github.com/CrueChan/OmniView', '_blank');
                    });
                }
            }, 100);
        } else {
            // Display current version as latest if no update available
            versionElement.innerHTML = `Version: ${result.currentFormatted} <span class="text-green-500">(Latest)</span>`;
        }
        
        // Display version element
        displayVersionElement(versionElement);
    }).catch(error => {
        console.error('Version detection error:', error);
        // Create and display error version info element
        const errorElement = createErrorVersionElement(`Error message: ${error.message}`);
        displayVersionElement(errorElement);
    });
}

// Helper function to display version element in footer
function displayVersionElement(element) {
    // Get footer element
    const footerElement = document.querySelector('.footer p.text-gray-500.text-sm');
    if (footerElement) {
        // Insert version info after original copyright info
        footerElement.insertAdjacentElement('afterend', element);
    } else {
        // If footer element not found, try adding to the end of footer area
        const footer = document.querySelector('.footer .container');
        if (footer) {
            footer.querySelector('div').appendChild(element);
        }
    }
}

// Add version info after page load complete
document.addEventListener('DOMContentLoaded', addVersionInfoToFooter);
