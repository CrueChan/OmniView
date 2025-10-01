// Get current URL parameters and pass them to player.html
window.onload = function() {
    // Get query parameters from current URL
    const currentParams = new URLSearchParams(window.location.search);
    
    // Create URL object for player.html
    const playerUrlObj = new URL("player.html", window.location.origin);
    
    // Update status text
    const statusElement = document.getElementById('redirect-status');
    const manualRedirect = document.getElementById('manual-redirect');
    let statusMessages = [
        "Preparing video data...",
        "Loading video information...",
        "Starting playback soon...",
    ];
    let currentStatus = 0;
    
    // Status text animation
    let statusInterval = setInterval(() => {
        if (currentStatus >= statusMessages.length) {
            currentStatus = 0;
        }
        if (statusElement) {
            statusElement.textContent = statusMessages[currentStatus];
            statusElement.style.opacity = 0.7;
            setTimeout(() => {
                if (statusElement) statusElement.style.opacity = 1;
            }, 300);
        }
        currentStatus++;
    }, 1000);
    
    // Ensure all original parameters are preserved
    currentParams.forEach((value, key) => {
        playerUrlObj.searchParams.set(key, value);
    });
    
    // Get source URL (if exists)
    const referrer = document.referrer;
    
    // Get return URL parameter from current URL (if any)
    const backUrl = currentParams.get('back');
    
    // Determine return URL priority: 1. Specified back parameter 2. referrer 3. Search page
    let returnUrl = '';
    if (backUrl) {
        // Explicitly specified return URL
        returnUrl = decodeURIComponent(backUrl);
    } else if (referrer && (referrer.includes('/s=') || referrer.includes('?s='))) {
        // Source is search page
        returnUrl = referrer;
    } else if (referrer && referrer.trim() !== '') {
        // Use referrer if exists but not search page
        returnUrl = referrer;
    } else {
        // Default to home page
        returnUrl = '/';
    }
    
    // Add return URL to player.html parameters
    if (!playerUrlObj.searchParams.has('returnUrl')) {
        playerUrlObj.searchParams.set('returnUrl', encodeURIComponent(returnUrl));
    }
    
    // Also save in localStorage as backup
    localStorage.setItem('lastPageUrl', returnUrl);
    
    // Mark as from search page
    if (returnUrl.includes('/s=') || returnUrl.includes('?s=')) {
        localStorage.setItem('cameFromSearch', 'true');
        localStorage.setItem('searchPageUrl', returnUrl);
    }
    
    // Get final URL string
    const finalPlayerUrl = playerUrlObj.toString();
    
    // Update manual redirect link
    if (manualRedirect) {
        manualRedirect.href = finalPlayerUrl;
    }

    // Update meta refresh tag
    const metaRefresh = document.querySelector('meta[http-equiv="refresh"]');
    if (metaRefresh) {
        metaRefresh.content = `3; url=${finalPlayerUrl}`;
    }
    
    // Redirect to player page
    setTimeout(() => {
        clearInterval(statusInterval);
        window.location.href = finalPlayerUrl;
    }, 2800); // Slightly earlier than meta refresh time to ensure our JS controls the redirect
};