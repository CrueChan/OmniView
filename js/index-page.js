// Show popup after page load script
document.addEventListener('DOMContentLoaded', function() {
    // Popup display script
    // Check if user has already seen the disclaimer
    const hasSeenDisclaimer = localStorage.getItem('hasSeenDisclaimer');
    
    if (!hasSeenDisclaimer) {
        // Show popup
        const disclaimerModal = document.getElementById('disclaimerModal');
        disclaimerModal.style.display = 'flex';
        
        // Add accept button event
        document.getElementById('acceptDisclaimerBtn').addEventListener('click', function() {
            // Save user's seen disclaimer status
            localStorage.setItem('hasSeenDisclaimer', 'true');
            // Hide popup
            disclaimerModal.style.display = 'none';
        });
    }

    // URL search parameter handling script
    // First check if it's a watch URL format (path starting with /watch)
    if (window.location.pathname.startsWith('/watch')) {
        // Watch URL, no additional processing needed, watch.html will handle redirect
        return;
    }
    
    // Check search parameters in page path (format: /s=keyword)
    const path = window.location.pathname;
    const searchPrefix = '/s=';
    
    if (path.startsWith(searchPrefix)) {
        // Extract search keyword
        const keyword = decodeURIComponent(path.substring(searchPrefix.length));
        if (keyword) {
            // Set search box value
            document.getElementById('searchInput').value = keyword;
            // Show clear button
            toggleClearButton();
            // Execute search
            setTimeout(() => {
                // Use setTimeout to ensure other DOM loading and initialization is complete
                search();
                // Update browser history without changing URL (keep search parameters in address bar)
                try {
                    window.history.replaceState(
                        { search: keyword }, 
                        `Search: ${keyword} - OmniView`, 
                        window.location.href
                    );
                } catch (e) {
                    console.error('Failed to update browser history:', e);
                }
            }, 300);
        }
    }
    
    // Also check search parameters in query string (format: ?s=keyword)
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('s');
    
    if (searchQuery) {
        // Set search box value
        document.getElementById('searchInput').value = searchQuery;
        // Execute search
        setTimeout(() => {
            search();
            // Update URL to canonical format
            try {
                window.history.replaceState(
                    { search: searchQuery }, 
                    `Search: ${searchQuery} - OmniView`, 
                    `/s=${encodeURIComponent(searchQuery)}`
                );
            } catch (e) {
                console.error('Failed to update browser history:', e);
            }
        }, 300);
    }
});
