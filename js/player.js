const selectedAPIs = JSON.parse(localStorage.getItem('selectedAPIs') || '[]');
const customAPIs = JSON.parse(localStorage.getItem('customAPIs') || '[]'); // Store Custom API List

// Improve back functionality
function goBack(event) {
    // Prevent default link behavior
    if (event) event.preventDefault();
    
    // 1. Prioritize checking returnUrl in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const returnUrl = urlParams.get('returnUrl');
    
    if (returnUrl) {
        // Use returnUrl parameter from URL if available
        window.location.href = decodeURIComponent(returnUrl);
        return;
    }
    
    // 2. Check lastPageUrl saved in localStorage
    const lastPageUrl = localStorage.getItem('lastPageUrl');
    if (lastPageUrl && lastPageUrl !== window.location.href) {
        window.location.href = lastPageUrl;
        return;
    }
    
    // 3. Check if entered player from search page
    const referrer = document.referrer;
    
    // Check if referrer contains search parameters
    if (referrer && (referrer.includes('/s=') || referrer.includes('?s='))) {
        // If coming from search page, return to search page
        window.location.href = referrer;
        return;
    }
    
    // 4. If opened in iframe, try to close iframe
    if (window.self !== window.top) {
        try {
            // Try to call parent window's close player function
            window.parent.closeVideoPlayer && window.parent.closeVideoPlayer();
            return;
        } catch (e) {
            console.error('Failed to call parent window closeVideoPlayer:', e);
        }
    }
    
    // 5. If previous page cannot be determined, return to homepage
    if (!referrer || referrer === '') {
        window.location.href = '/';
        return;
    }
    
    // 6. If none of the above applies, use default behavior: go back to previous page
    window.history.back();
}

// Save current URL to localStorage on page load as return target
window.addEventListener('load', function () {
    // Save previous page URL
    if (document.referrer && document.referrer !== window.location.href) {
        localStorage.setItem('lastPageUrl', document.referrer);
    }

    // Extract important parameters from current URL to restore current page when needed
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('id');
    const sourceCode = urlParams.get('source');

    if (videoId && sourceCode) {
        // Save current playback state so other pages can return
        localStorage.setItem('currentPlayingId', videoId);
        localStorage.setItem('currentPlayingSource', sourceCode);
    }
});


// =================================
// ============== PLAYER ==========
// =================================
// Global Variables
let currentVideoTitle = '';
let currentEpisodeIndex = 0;
let art = null; // For ArtPlayer instance
let currentHls = null; // Track current HLS instance
let currentEpisodes = [];
let episodesReversed = false;
let autoplayEnabled = true; // Auto-play next episode enabled by default
let videoHasEnded = false; // Track whether video has naturally ended
let userClickedPosition = null; // Record user click position
let shortcutHintTimeout = null; // Control keyboard shortcut hint display duration
let adFilteringEnabled = true; // Ad filtering enabled by default
let progressSaveInterval = null; // Timer for periodic progress saving
let currentVideoUrl = ''; // Record current actual video URL
const isWebkit = (typeof window.webkitConvertPointFromNodeToPage === 'function')
Artplayer.FULLSCREEN_WEB_IN_BODY = true;

// Page load
document.addEventListener('DOMContentLoaded', function () {
    // First check if user has passed password verification
    if (!isPasswordVerified()) {
        // Hide loading indicator
        document.getElementById('player-loading').style.display = 'none';
        return;
    }

    initializePageContent();
});

// Listen for password verification success event
document.addEventListener('passwordVerified', () => {
    document.getElementById('player-loading').style.display = 'block';

    initializePageContent();
});

// Initialize page content
function initializePageContent() {

    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    let videoUrl = urlParams.get('url');
    const title = urlParams.get('title');
    const sourceCode = urlParams.get('source');
    let index = parseInt(urlParams.get('index') || '0');
    const episodesList = urlParams.get('episodes'); // Get episode information from URL
    const savedPosition = parseInt(urlParams.get('position') || '0'); // Get saved playback position
    // Fix history issue: check if URL starts with player.html
    // If yes, this is a history redirect, need to parse actual video URL
    if (videoUrl && videoUrl.includes('player.html')) {
        try {
            // Try to extract real video link from nested URL
            const nestedUrlParams = new URLSearchParams(videoUrl.split('?')[1]);
            // Get real video URL from nested parameters
            const nestedVideoUrl = nestedUrlParams.get('url');
            // Check if nested URL contains playback position info
            const nestedPosition = nestedUrlParams.get('position');
            const nestedIndex = nestedUrlParams.get('index');
            const nestedTitle = nestedUrlParams.get('title');

            if (nestedVideoUrl) {
                videoUrl = nestedVideoUrl;

                // Update current URL parameters
                const url = new URL(window.location.href);
                if (!urlParams.has('position') && nestedPosition) {
                    url.searchParams.set('position', nestedPosition);
                }
                if (!urlParams.has('index') && nestedIndex) {
                    url.searchParams.set('index', nestedIndex);
                }
                if (!urlParams.has('title') && nestedTitle) {
                    url.searchParams.set('title', nestedTitle);
                }
                // Replace current URL
                window.history.replaceState({}, '', url);
            } else {
                showError('Invalid history link, please return to homepage and try again');
            }
        } catch (e) {
        }
    }

    // Save current video URL
    currentVideoUrl = videoUrl || '';

    // Get data from localStorage
    currentVideoTitle = title || localStorage.getItem('currentVideoTitle') || 'Unknown Video';
    currentEpisodeIndex = index;

    // Set auto-play toggle state
    autoplayEnabled = localStorage.getItem('autoplayEnabled') !== 'false'; // Default is true
    document.getElementById('autoplayToggle').checked = autoplayEnabled;

    // Get ad filtering settings
    adFilteringEnabled = localStorage.getItem(PLAYER_CONFIG.adFilteringStorage) !== 'false'; // Default is true

    // Listen for auto-play toggle changes
    document.getElementById('autoplayToggle').addEventListener('change', function (e) {
        autoplayEnabled = e.target.checked;
        localStorage.setItem('autoplayEnabled', autoplayEnabled);
    });

    // Prioritize episode info from URL, otherwise get from localStorage
    try {
        if (episodesList) {
            // If URL contains episode data, use it first
            currentEpisodes = JSON.parse(decodeURIComponent(episodesList));

        } else {
            // Otherwise get from localStorage
            currentEpisodes = JSON.parse(localStorage.getItem('currentEpisodes') || '[]');

        }

        // Check if episode index is valid, if not adjust to 0
        if (index < 0 || (currentEpisodes.length > 0 && index >= currentEpisodes.length)) {
            // If index is too large, use maximum valid index
            if (index >= currentEpisodes.length && currentEpisodes.length > 0) {
                index = currentEpisodes.length - 1;
            } else {
                index = 0;
            }

            // Update URL to reflect corrected index
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('index', index);
            window.history.replaceState({}, '', newUrl);
        }

        // Update current index to validated value
        currentEpisodeIndex = index;

        episodesReversed = localStorage.getItem('episodesReversed') === 'true';
    } catch (e) {
        currentEpisodes = [];
        currentEpisodeIndex = 0;
        episodesReversed = false;
    }

    // Set page title
    document.title = currentVideoTitle + ' - OmniView Player';
    document.getElementById('videoTitle').textContent = currentVideoTitle;

    // Initialize player
    if (videoUrl) {
        initPlayer(videoUrl);
    } else {
        showError('Invalid video link');
    }

    // Render source information
    renderResourceInfoBar();

    // Update episode information
    updateEpisodeInfo();

    // Render episode list
    renderEpisodes();

    // Update button state
    updateButtonStates();

    // Update sort button state
    updateOrderButton();

    // Add progress bar listener to ensure accurate seek on click
    setTimeout(() => {
        setupProgressBarPreciseClicks();
    }, 1000);

    // Add keyboard shortcut event listener
    document.addEventListener('keydown', handleKeyboardShortcuts);

    // Add page leave event listener to save playback position
    window.addEventListener('beforeunload', saveCurrentProgress);

    // New: also save when page is hidden (switch to background/switch tab)
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') {
            saveCurrentProgress();
        }
    });

    // Also save when video is paused
    const waitForVideo = setInterval(() => {
        if (art && art.video) {
            art.video.addEventListener('pause', saveCurrentProgress);

            // New: throttled save on playback progress change
            let lastSave = 0;
            art.video.addEventListener('timeupdate', function() {
                const now = Date.now();
                if (now - lastSave > 5000) { // Save at most once every 5 seconds
                    saveCurrentProgress();
                    lastSave = now;
                }
            });

            clearInterval(waitForVideo);
        }
    }, 200);
}

// Handle keyboard shortcuts
function handleKeyboardShortcuts(e) {
    // Ignore key events in input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // Alt + Left Arrow = Previous episode
    if (e.altKey && e.key === 'ArrowLeft') {
        if (currentEpisodeIndex > 0) {
            playPreviousEpisode();
            showShortcutHint('Previous episode', 'left');
            e.preventDefault();
        }
    }

    // Alt + Right Arrow = Next episode
    if (e.altKey && e.key === 'ArrowRight') {
        if (currentEpisodeIndex < currentEpisodes.length - 1) {
            playNextEpisode();
            showShortcutHint('Next episode', 'right');
            e.preventDefault();
        }
    }

    // Left Arrow = Rewind
    if (!e.altKey && e.key === 'ArrowLeft') {
        if (art && art.currentTime > 5) {
            art.currentTime -= 5;
            showShortcutHint('Rewind', 'left');
            e.preventDefault();
        }
    }

    // Right Arrow = Fast forward
    if (!e.altKey && e.key === 'ArrowRight') {
        if (art && art.currentTime < art.duration - 5) {
            art.currentTime += 5;
            showShortcutHint('Fast forward', 'right');
            e.preventDefault();
        }
    }

    // Up Arrow = Volume up
    if (e.key === 'ArrowUp') {
        if (art && art.volume < 1) {
            art.volume += 0.1;
            showShortcutHint('Volume up', 'up');
            e.preventDefault();
        }
    }

    // Down Arrow = Volume down
    if (e.key === 'ArrowDown') {
        if (art && art.volume > 0) {
            art.volume -= 0.1;
            showShortcutHint('Volume down', 'down');
            e.preventDefault();
        }
    }

    // Space = Play/Pause
    if (e.key === ' ') {
        if (art) {
            art.toggle();
            showShortcutHint('Play/Pause', 'play');
            e.preventDefault();
        }
    }

    // F key = Toggle fullscreen
    if (e.key === 'f' || e.key === 'F') {
        if (art) {
            art.fullscreen = !art.fullscreen;
            showShortcutHint('Toggle fullscreen', 'fullscreen');
            e.preventDefault();
        }
    }
}

// Show shortcut hint
function showShortcutHint(text, direction) {
    const hintElement = document.getElementById('shortcutHint');
    const textElement = document.getElementById('shortcutText');
    const iconElement = document.getElementById('shortcutIcon');

    // Clear previous timeout
    if (shortcutHintTimeout) {
        clearTimeout(shortcutHintTimeout);
    }

    // Set text and icon direction
    textElement.textContent = text;

    if (direction === 'left') {
        iconElement.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>';
    } else if (direction === 'right') {
        iconElement.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>';
    }  else if (direction === 'up') {
        iconElement.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>';
    } else if (direction === 'down') {
        iconElement.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>';
    } else if (direction === 'fullscreen') {
        iconElement.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"></path>';
    } else if (direction === 'play') {
        iconElement.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3l14 9-14 9V3z"></path>';
    }

    // Show hint
    hintElement.classList.add('show');

    // Hide after 2 seconds
    shortcutHintTimeout = setTimeout(() => {
        hintElement.classList.remove('show');
    }, 2000);
}

// Initialize player
function initPlayer(videoUrl) {
    if (!videoUrl) {
        return
    }

    // Destroy old instance
    if (art) {
        art.destroy();
        art = null;
    }

    // Configure HLS.js options
    const hlsConfig = {
        debug: false,
        loader: adFilteringEnabled ? CustomHlsJsLoader : Hls.DefaultConfig.loader,
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferSize: 30 * 1000 * 1000,
        maxBufferHole: 0.5,
        fragLoadingMaxRetry: 6,
        fragLoadingMaxRetryTimeout: 64000,
        fragLoadingRetryDelay: 1000,
        manifestLoadingMaxRetry: 3,
        manifestLoadingRetryDelay: 1000,
        levelLoadingMaxRetry: 4,
        levelLoadingRetryDelay: 1000,
        startLevel: -1,
        abrEwmaDefaultEstimate: 500000,
        abrBandWidthFactor: 0.95,
        abrBandWidthUpFactor: 0.7,
        abrMaxWithRealBitrate: true,
        stretchShortVideoTrack: true,
        appendErrorMaxRetry: 5,  // Increase retry attempts
        liveSyncDurationCount: 3,
        liveDurationInfinity: false
    };

    // Create new ArtPlayer instance
    art = new Artplayer({
        container: '#player',
        url: videoUrl,
        type: 'm3u8',
        title: videoTitle,
        volume: 0.8,
        isLive: false,
        muted: false,
        autoplay: true,
        pip: true,
        autoSize: false,
        autoMini: true,
        screenshot: true,
        setting: true,
        loop: false,
        flip: false,
        playbackRate: true,
        aspectRatio: false,
        fullscreen: true,
        fullscreenWeb: true,
        subtitleOffset: false,
        miniProgressBar: true,
        mutex: true,
        backdrop: true,
        playsInline: true,
        autoPlayback: false,
        airplay: true,
        hotkey: false,
        theme: '#23ade5',
        lang: navigator.language.toLowerCase(),
        moreVideoAttr: {
            crossOrigin: 'anonymous',
        },
        customType: {
            m3u8: function (video, url) {
                // Clean up previous HLS instance
                if (currentHls && currentHls.destroy) {
                    try {
                        currentHls.destroy();
                    } catch (e) {
                    }
                }

                // Create new HLS instance
                const hls = new Hls(hlsConfig);
                currentHls = hls;

                // Track whether error has been shown
                let errorDisplayed = false;
                // Track whether error has occurred
                let errorCount = 0;
                // Track whether video has started playing
                let playbackStarted = false;
                // Track whether video has bufferAppendError
                let bufferAppendErrorCount = 0;

                // Listen for video play event
                video.addEventListener('playing', function () {
                    playbackStarted = true;
                    document.getElementById('player-loading').style.display = 'none';
                    document.getElementById('error').style.display = 'none';
                });

                // Listen for video progress event
                video.addEventListener('timeupdate', function () {
                    if (video.currentTime > 1) {
                        // Video progress exceeds 1 second, hide error (if exists)
                        document.getElementById('error').style.display = 'none';
                    }
                });

                hls.loadSource(url);
                hls.attachMedia(video);

                // enable airplay, from https://github.com/video-dev/hls.js/issues/5989
                // Check if source element exists, update if exists, create if not
                let sourceElement = video.querySelector('source');
                if (sourceElement) {
                    // Update the URL of existing source element
                    sourceElement.src = videoUrl;
                } else {
                    // Create new source element
                    sourceElement = document.createElement('source');
                    sourceElement.src = videoUrl;
                    video.appendChild(sourceElement);
                }
                video.disableRemotePlayback = false;

                hls.on(Hls.Events.MANIFEST_PARSED, function () {
                    video.play().catch(e => {
                    });
                });

                hls.on(Hls.Events.ERROR, function (event, data) {
                    // Increment error count
                    errorCount++;

                    // Handle bufferAppendError
                    if (data.details === 'bufferAppendError') {
                        bufferAppendErrorCount++;
                        // Ignore this error if video has already started playing
                        if (playbackStarted) {
                            return;
                        }

                        // Attempt recovery if bufferAppendError occurs multiple times but video hasn't played
                        if (bufferAppendErrorCount >= 3) {
                            hls.recoverMediaError();
                        }
                    }

                    // If it's a fatal error and video hasn't played
                    if (data.fatal && !playbackStarted) {
                        // Attempt error recovery
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                hls.startLoad();
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                hls.recoverMediaError();
                                break;
                            default:
                                // Display error only after multiple recovery attempts
                                if (errorCount > 3 && !errorDisplayed) {
                                    errorDisplayed = true;
                                    showError('Video failed to load, possibly due to incompatible format or unavailable source');
                                }
                                break;
                        }
                    }
                });

                // Listen to fragment loading events
                hls.on(Hls.Events.FRAG_LOADED, function () {
                    document.getElementById('player-loading').style.display = 'none';
                });

                // Listen to level loading events
                hls.on(Hls.Events.LEVEL_LOADED, function () {
                    document.getElementById('player-loading').style.display = 'none';
                });
            }
        }
    });

    // artplayer doesn't have 'fullscreenWeb:enter', 'fullscreenWeb:exit' and similar events
    // So the original control bar hiding code didn't work
    // What actually works is artplayer's default behavior, which supports auto-hiding toolbar
    // But there's a bug: when in picture-in-picture fullscreen, toolbar doesn't auto-hide after mouse leaves the screen
    // Refactoring and fixing below:
    let hideTimer;

    // Hide control bar
    function hideControls() {
        if (art && art.controls) {
            art.controls.show = false;
        }
    }

    // Reset timer, keeping timeout duration consistent with artplayer
    function resetHideTimer() {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
            hideControls();
        }, Artplayer.CONTROL_HIDE_TIME);
    }

    // Handle mouse leaving browser window
    function handleMouseOut(e) {
        if (e && !e.relatedTarget) {
            resetHideTimer();
        }
    }

    // Register/remove mouseout event on fullscreen state toggle, listening for mouse leaving screen
    // Thus initiating hide countdown for player status bar
    function handleFullScreen(isFullScreen, isWeb) {
        if (isFullScreen) {
            document.addEventListener('mouseout', handleMouseOut);
        } else {
            document.removeEventListener('mouseout', handleMouseOut);
            // Clean up timer when exiting fullscreen
            clearTimeout(hideTimer);
        }

        if (!isWeb) {
            if (window.screen.orientation && window.screen.orientation.lock) {
                window.screen.orientation.lock('landscape')
                    .then(() => {
                    })
                    .catch((error) => {
                    });
            }
        }
    }

    // Initially hide toolbar after player loads
    art.on('ready', () => {
        hideControls();
    });

    // Web fullscreen mode handling
    art.on('fullscreenWeb', function (isFullScreen) {
        handleFullScreen(isFullScreen, true);
    });

    // Fullscreen mode handling
    art.on('fullscreen', function (isFullScreen) {
        handleFullScreen(isFullScreen, false);
    });

    art.on('video:loadedmetadata', function() {
        document.getElementById('player-loading').style.display = 'none';
        videoHasEnded = false; // Reset end flag when video loads
        // Prioritize position parameter passed via URL
        const urlParams = new URLSearchParams(window.location.search);
        const savedPosition = parseInt(urlParams.get('position') || '0');

        if (savedPosition > 10 && savedPosition < art.duration - 2) {
            // Use it directly if there's a valid playback position parameter in URL
            art.currentTime = savedPosition;
            showPositionRestoreHint(savedPosition);
        } else {
            // Otherwise attempt to restore playback progress from local storage
            try {
                const progressKey = 'videoProgress_' + getVideoId();
                const progressStr = localStorage.getItem(progressKey);
                if (progressStr && art.duration > 0) {
                    const progress = JSON.parse(progressStr);
                    if (
                        progress &&
                        typeof progress.position === 'number' &&
                        progress.position > 10 &&
                        progress.position < art.duration - 2
                    ) {
                        art.currentTime = progress.position;
                        showPositionRestoreHint(progress.position);
                    }
                }
            } catch (e) {
            }
        }

        // Set progress bar click listener
        setupProgressBarPreciseClicks();

        // Add to watch history with slight delay after video loads successfully
        setTimeout(saveToHistory, 3000);

        // Start periodic saving of playback progress
        startProgressSaveInterval();
    })

    // Error handling
    art.on('video:error', function (error) {
        // Ignore error if switching videos
        if (window.isSwitchingVideo) {
            return;
        }

        // Hide all loading indicators
        const loadingElements = document.querySelectorAll('#player-loading, .player-loading-container');
        loadingElements.forEach(el => {
            if (el) el.style.display = 'none';
        });

        showError('Video playback failed: ' + (error.message || 'Unknown error'));
    });

    // Add mobile long-press 3x speed playback feature
    setupLongPressSpeedControl();

    // Video playback ended event
    art.on('video:ended', function () {
        videoHasEnded = true;

        clearVideoProgress();

        // If auto-play next episode is enabled and there is indeed a next episode
        if (autoplayEnabled && currentEpisodeIndex < currentEpisodes.length - 1) {
            // Longer delay to ensure all event handling is complete
            setTimeout(() => {
                // Confirm it's not a false end event caused by user dragging
                playNextEpisode();
                videoHasEnded = false; // Reset flag
            }, 1000);
        } else {
            art.fullscreen = false;
        }
    });

    // Add double-click fullscreen support
    art.on('video:playing', () => {
        // Bind double-click event to video container
        if (art.video) {
            art.video.addEventListener('dblclick', () => {
                art.fullscreen = !art.fullscreen;
                art.play();
            });
        }
    });

    // If still loading after 10 seconds, but don't show error immediately
    setTimeout(function () {
        // Don't display error if video has already started playing
        if (art && art.video && art.video.currentTime > 0) {
            return;
        }

        const loadingElement = document.getElementById('player-loading');
        if (loadingElement && loadingElement.style.display !== 'none') {
            loadingElement.innerHTML = `
                <div class="loading-spinner"></div>
                <div>Video is taking longer to load, please be patient...</div>
                <div style="font-size: 12px; color: #aaa; margin-top: 10px;">If unresponsive for a long time, please try other video sources</div>
            `;
        }
    }, 10000);
}

// Custom M3U8 Loader for filtering ads
class CustomHlsJsLoader extends Hls.DefaultConfig.loader {
    constructor(config) {
        super(config);
        const load = this.load.bind(this);
        this.load = function (context, config, callbacks) {
            // Intercept manifest and level requests
            if (context.type === 'manifest' || context.type === 'level') {
                const onSuccess = callbacks.onSuccess;
                callbacks.onSuccess = function (response, stats, context) {
                    // If it's an m3u8 file, process content to remove ad segments
                    if (response.data && typeof response.data === 'string') {
                        // Filter out ad segments - implement more precise ad filtering logic
                        response.data = filterAdsFromM3U8(response.data, true);
                    }
                    return onSuccess(response, stats, context);
                };
            }
            // Execute original load method
            load(context, config, callbacks);
        };
    }
}

// Filter suspicious ad content
function filterAdsFromM3U8(m3u8Content, strictMode = false) {
    if (!m3u8Content) return '';

    // Split M3U8 content by lines
    const lines = m3u8Content.split('\n');
    const filteredLines = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Only filter #EXT-X-DISCONTINUITY tags
        if (!line.includes('#EXT-X-DISCONTINUITY')) {
            filteredLines.push(line);
        }
    }

    return filteredLines.join('\n');
}


// Display error
function showError(message) {
    // Don't display error when video is already playing
    if (art && art.video && art.video.currentTime > 1) {
        return;
    }
    const loadingEl = document.getElementById('player-loading');
    if (loadingEl) loadingEl.style.display = 'none';
    const errorEl = document.getElementById('error');
    if (errorEl) errorEl.style.display = 'flex';
    const errorMsgEl = document.getElementById('error-message');
    if (errorMsgEl) errorMsgEl.textContent = message;
}

// Update episode information
function updateEpisodeInfo() {
    if (currentEpisodes.length > 0) {
        document.getElementById('episodeInfo').textContent = `Episode ${currentEpisodeIndex + 1}/${currentEpisodes.length}`;
    } else {
        document.getElementById('episodeInfo').textContent = 'No episode information';
    }
}

// Update button state
function updateButtonStates() {
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');

    // Handle previous episode button
    if (currentEpisodeIndex > 0) {
        prevButton.classList.remove('bg-gray-700', 'cursor-not-allowed');
        prevButton.classList.add('bg-[#222]', 'hover:bg-[#333]');
        prevButton.removeAttribute('disabled');
    } else {
        prevButton.classList.add('bg-gray-700', 'cursor-not-allowed');
        prevButton.classList.remove('bg-[#222]', 'hover:bg-[#333]');
        prevButton.setAttribute('disabled', '');
    }

    // Handle next episode button
    if (currentEpisodeIndex < currentEpisodes.length - 1) {
        nextButton.classList.remove('bg-gray-700', 'cursor-not-allowed');
        nextButton.classList.add('bg-[#222]', 'hover:bg-[#333]');
        nextButton.removeAttribute('disabled');
    } else {
        nextButton.classList.add('bg-gray-700', 'cursor-not-allowed');
        nextButton.classList.remove('bg-[#222]', 'hover:bg-[#333]');
        nextButton.setAttribute('disabled', '');
    }
}

// Render episode buttons
function renderEpisodes() {
    const episodesList = document.getElementById('episodesList');
    if (!episodesList) return;

    if (!currentEpisodes || currentEpisodes.length === 0) {
        episodesList.innerHTML = '<div class="col-span-full text-center text-gray-400 py-8">No episodes available</div>';
        return;
    }

    const episodes = episodesReversed ? [...currentEpisodes].reverse() : currentEpisodes;
    let html = '';

    episodes.forEach((episode, index) => {
        // Calculate actual episode index based on reverse order state
        const realIndex = episodesReversed ? currentEpisodes.length - 1 - index : index;
        const isActive = realIndex === currentEpisodeIndex;

        html += `
            <button id="episode-${realIndex}" 
                    onclick="playEpisode(${realIndex})" 
                    class="px-4 py-2 ${isActive ? 'episode-active' : '!bg-[#222] hover:!bg-[#333] hover:!shadow-none'} !border ${isActive ? '!border-blue-500' : '!border-[#333]'} rounded-lg transition-colors text-center episode-btn">
                ${realIndex + 1}
            </button>
        `;
    });

    episodesList.innerHTML = html;
}

// Play specified episode
function playEpisode(index) {
    // Ensure index is within valid range
    if (index < 0 || index >= currentEpisodes.length) {
        return;
    }

    // Save current playback progress (if playing)
    if (art && art.video && !art.video.paused && !videoHasEnded) {
        saveCurrentProgress();
    }

    // Clear progress save timer
    if (progressSaveInterval) {
        clearInterval(progressSaveInterval);
        progressSaveInterval = null;
    }

    // First hide any previously displayed errors
    document.getElementById('error').style.display = 'none';
    // Show loading indicator
    document.getElementById('player-loading').style.display = 'flex';
    document.getElementById('player-loading').innerHTML = `
        <div class="loading-spinner"></div>
        <div>Loading video...</div>
    `;

    // Get sourceCode
    const urlParams2 = new URLSearchParams(window.location.search);
    const sourceCode = urlParams2.get('source_code');

    // Prepare URL for episode switching
    const url = currentEpisodes[index];

    // Update current episode index
    currentEpisodeIndex = index;
    currentVideoUrl = url;
    videoHasEnded = false; // Reset video end flag

    clearVideoProgress();

    // Update URL parameters (without page refresh)
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('index', index);
    currentUrl.searchParams.set('url', url);
    currentUrl.searchParams.delete('position');
    window.history.replaceState({}, '', currentUrl.toString());

    if (isWebkit) {
        initPlayer(url);
    } else {
        art.switch = url;
    }

    // Update UI
    updateEpisodeInfo();
    updateButtonStates();
    renderEpisodes();

    // Reset user click position record
    userClickedPosition = null;

    // Save to history after three seconds
    setTimeout(() => saveToHistory(), 3000);
}

// Play previous episode
function playPreviousEpisode() {
    if (currentEpisodeIndex > 0) {
        playEpisode(currentEpisodeIndex - 1);
    }
}

// Play next episode
function playNextEpisode() {
    if (currentEpisodeIndex < currentEpisodes.length - 1) {
        playEpisode(currentEpisodeIndex + 1);
    }
}

// Copy playback link
function copyLinks() {
    // Attempt to get parameters from URL
    const urlParams = new URLSearchParams(window.location.search);
    const linkUrl = urlParams.get('url') || '';
    if (linkUrl !== '') {
        navigator.clipboard.writeText(linkUrl).then(() => {
            showToast('Play link copied', 'success');
        }).catch(err => {
            showToast('Copy failed, please check browser permissions', 'error');
        });
    }
}

// Toggle episode sorting
function toggleEpisodeOrder() {
    episodesReversed = !episodesReversed;

    // Save to localStorage
    localStorage.setItem('episodesReversed', episodesReversed);

    // Re-render episode list
    renderEpisodes();

    // Update sort button
    updateOrderButton();
}

// Update sort button state
function updateOrderButton() {
    const orderText = document.getElementById('orderText');
    const orderIcon = document.getElementById('orderIcon');

    if (orderText && orderIcon) {
        orderText.textContent = episodesReversed ? 'Ascending Order' : 'Descending Order';
        orderIcon.style.transform = episodesReversed ? 'rotate(180deg)' : '';
    }
}

// Set accurate progress bar click handling
function setupProgressBarPreciseClicks() {
    // Find DPlayer's progress bar element
    const progressBar = document.querySelector('.dplayer-bar-wrap');
    if (!progressBar || !art || !art.video) return;

    // Remove potentially existing old event listeners
    progressBar.removeEventListener('mousedown', handleProgressBarClick);

    // Add new event listener
    progressBar.addEventListener('mousedown', handleProgressBarClick);

    // Add touch event support for mobile as well
    progressBar.removeEventListener('touchstart', handleProgressBarTouch);
    progressBar.addEventListener('touchstart', handleProgressBarTouch);

    // Handle progress bar click
    function handleProgressBarClick(e) {
        if (!art || !art.video) return;

        // Calculate click position ratio relative to progress bar
        const rect = e.currentTarget.getBoundingClientRect();
        const percentage = (e.clientX - rect.left) / rect.width;

        // Calculate video time corresponding to click position
        const duration = art.video.duration;
        let clickTime = percentage * duration;

        // Handle case when video is near the end
        if (duration - clickTime < 1) {
            // If click position is very close to the end, move back slightly
            clickTime = Math.min(clickTime, duration - 1.5);

        }

        // Record user click position
        userClickedPosition = clickTime;

        // Prevent default event propagation to avoid DPlayer's internal logic jumping video to the end
        e.stopPropagation();

        // Set video time directly
        art.seek(clickTime);
    }

    // Handle mobile touch events
    function handleProgressBarTouch(e) {
        if (!art || !art.video || !e.touches[0]) return;

        const touch = e.touches[0];
        const rect = e.currentTarget.getBoundingClientRect();
        const percentage = (touch.clientX - rect.left) / rect.width;

        const duration = art.video.duration;
        let clickTime = percentage * duration;

        // Handle case when video is near the end
        if (duration - clickTime < 1) {
            clickTime = Math.min(clickTime, duration - 1.5);
        }

        // Record user click position
        userClickedPosition = clickTime;

        e.stopPropagation();
        art.seek(clickTime);
    }
}

// Add video to history after player initialization
function saveToHistory() {
    // Ensure currentEpisodes is not empty and has current video URL
    if (!currentEpisodes || currentEpisodes.length === 0 || !currentVideoUrl) {
        return;
    }

    // Attempt to get parameters from URL
    const urlParams = new URLSearchParams(window.location.search);
    const sourceName = urlParams.get('source') || '';
    const sourceCode = urlParams.get('source') || '';
    const id_from_params = urlParams.get('id'); // Get video ID from player URL (passed as 'id')

    // Get current playback progress
    let currentPosition = 0;
    let videoDuration = 0;

    if (art && art.video) {
        currentPosition = art.video.currentTime;
        videoDuration = art.video.duration;
    }

    // Define a show identifier: Prioritize sourceName_id, fallback to first episode URL or current video URL
    let show_identifier_for_video_info;
    if (sourceName && id_from_params) {
        show_identifier_for_video_info = `${sourceName}_${id_from_params}`;
    } else {
        show_identifier_for_video_info = (currentEpisodes && currentEpisodes.length > 0) ? currentEpisodes[0] : currentVideoUrl;
    }

    // Build video information object to save
    const videoInfo = {
        title: currentVideoTitle,
        directVideoUrl: currentVideoUrl, // Current episode's direct URL
        url: `player.html?url=${encodeURIComponent(currentVideoUrl)}&title=${encodeURIComponent(currentVideoTitle)}&source=${encodeURIComponent(sourceName)}&source_code=${encodeURIComponent(sourceCode)}&id=${encodeURIComponent(id_from_params || '')}&index=${currentEpisodeIndex}&position=${Math.floor(currentPosition || 0)}`,
        episodeIndex: currentEpisodeIndex,
        sourceName: sourceName,
        vod_id: id_from_params || '', // Store the ID from params as vod_id in history item
        sourceCode: sourceCode,
        showIdentifier: show_identifier_for_video_info, // Identifier for the show/series
        timestamp: Date.now(),
        playbackPosition: currentPosition,
        duration: videoDuration,
        episodes: currentEpisodes && currentEpisodes.length > 0 ? [...currentEpisodes] : []
    };
    
    try {
        const history = JSON.parse(localStorage.getItem('viewingHistory') || '[]');

        // Check if the same series record already exists (based on title, source and showIdentifier)
        const existingIndex = history.findIndex(item => 
            item.title === videoInfo.title && 
            item.sourceName === videoInfo.sourceName && 
            item.showIdentifier === videoInfo.showIdentifier
        );

        if (existingIndex !== -1) {
            // If exists, update current episode, timestamp, playback progress and URL of existing record
            const existingItem = history[existingIndex];
            existingItem.episodeIndex = videoInfo.episodeIndex;
            existingItem.timestamp = videoInfo.timestamp;
            existingItem.sourceName = videoInfo.sourceName; // Should be consistent, but update just in case
            existingItem.sourceCode = videoInfo.sourceCode;
            existingItem.vod_id = videoInfo.vod_id;
            
            // Update URLs to reflect the current episode being watched
            existingItem.directVideoUrl = videoInfo.directVideoUrl; // Current episode's direct URL
            existingItem.url = videoInfo.url; // Player link for the current episode

            // Update playback progress information
            existingItem.playbackPosition = videoInfo.playbackPosition > 10 ? videoInfo.playbackPosition : (existingItem.playbackPosition || 0);
            existingItem.duration = videoInfo.duration || existingItem.duration;
            
            // Update episode list (if new episode list differs from stored one, e.g. episodes increased)
            if (videoInfo.episodes && videoInfo.episodes.length > 0) {
                if (!existingItem.episodes || 
                    !Array.isArray(existingItem.episodes) || 
                    existingItem.episodes.length !== videoInfo.episodes.length || 
                    !videoInfo.episodes.every((ep, i) => ep === existingItem.episodes[i])) { // Basic check for content change
                    existingItem.episodes = [...videoInfo.episodes]; // Deep copy
                }
            }
            
            // Move to front
            const updatedItem = history.splice(existingIndex, 1)[0];
            history.unshift(updatedItem);
        } else {
            // Add new record to front
            history.unshift(videoInfo);
        }

        // Limit history records to 50 entries
        if (history.length > 50) history.splice(50);

        localStorage.setItem('viewingHistory', JSON.stringify(history));
    } catch (e) {
    }
}

// Show resume position prompt
function showPositionRestoreHint(position) {
    if (!position || position < 10) return;

    // Create prompt element
    const hint = document.createElement('div');
    hint.className = 'position-restore-hint';
    hint.innerHTML = `
        <div class="hint-content">
            Resumed from ${formatTime(position)} Continue playing
        </div>
    `;

    // Add to player container
    const playerContainer = document.querySelector('.player-container'); // Ensure this selector is correct
    if (playerContainer) { // Check if playerContainer exists
        playerContainer.appendChild(hint);
    } else {
        return; // Exit if container not found
    }

    // Show hint
    setTimeout(() => {
        hint.classList.add('show');

        // Hide after 3 seconds
        setTimeout(() => {
            hint.classList.remove('show');
            setTimeout(() => hint.remove(), 300);
        }, 3000);
    }, 100);
}

// Format time to mm:ss format
function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Start saving playback progress periodically
function startProgressSaveInterval() {
    // Clear possible existing old timer
    if (progressSaveInterval) {
        clearInterval(progressSaveInterval);
    }

    // Save playback progress every 30 seconds
    progressSaveInterval = setInterval(saveCurrentProgress, 30000);
}

// Save current playback progress
function saveCurrentProgress() {
    if (!art || !art.video) return;
    const currentTime = art.video.currentTime;
    const duration = art.video.duration;
    if (!duration || currentTime < 1) return;

    // Save progress in localStorage
    const progressKey = `videoProgress_${getVideoId()}`;
    const progressData = {
        position: currentTime,
        duration: duration,
        timestamp: Date.now()
    };
    try {
        localStorage.setItem(progressKey, JSON.stringify(progressData));
        // --- New: Sync update progress in viewingHistory ---
        try {
            const historyRaw = localStorage.getItem('viewingHistory');
            if (historyRaw) {
                const history = JSON.parse(historyRaw);
                // Uniquely identify by title + episode index
                const idx = history.findIndex(item =>
                    item.title === currentVideoTitle &&
                    (item.episodeIndex === undefined || item.episodeIndex === currentEpisodeIndex)
                );
                if (idx !== -1) {
                    // Update only when progress changes significantly to reduce writes
                    if (
                        Math.abs((history[idx].playbackPosition || 0) - currentTime) > 2 ||
                        Math.abs((history[idx].duration || 0) - duration) > 2
                    ) {
                        history[idx].playbackPosition = currentTime;
                        history[idx].duration = duration;
                        history[idx].timestamp = Date.now();
                        localStorage.setItem('viewingHistory', JSON.stringify(history));
                    }
                }
            }
        } catch (e) {
        }
    } catch (e) {
    }
}

// Set mobile long-press 3x speed playback feature
function setupLongPressSpeedControl() {
    if (!art || !art.video) return;

    const playerElement = document.getElementById('player');
    let longPressTimer = null;
    let originalPlaybackRate = 1.0;
    let isLongPress = false;

    // Show quick tip
    function showSpeedHint(speed) {
        showShortcutHint(`${speed}x speed`, 'right');
    }

    // Disable right-click
    playerElement.oncontextmenu = () => {
        // Detect if mobile device
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        // Disable right-click only on mobile devices
        if (isMobile) {
            const dplayerMenu = document.querySelector(".dplayer-menu");
            const dplayerMask = document.querySelector(".dplayer-mask");
            if (dplayerMenu) dplayerMenu.style.display = "none";
            if (dplayerMask) dplayerMask.style.display = "none";
            return false;
        }
        return true; // Allow right-click menu on desktop devices
    };

    // Touch start event
    playerElement.addEventListener('touchstart', function (e) {
        // Check if video is playing, if not playing then don't trigger long-press feature
        if (art.video.paused) {
            return; // Don't trigger long-press feature when video is paused
        }

        // Save original playback speed
        originalPlaybackRate = art.video.playbackRate;

        // Set long-press timer
        longPressTimer = setTimeout(() => {
            // Check again if video is still playing
            if (art.video.paused) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
                return;
            }

            // Long-press over 500ms, set to 3x speed
            art.video.playbackRate = 3.0;
            isLongPress = true;
            showSpeedHint(3.0);

            // Prevent default behavior only when confirmed as long-press
            e.preventDefault();
        }, 500);
    }, { passive: false });

    // Touch end event
    playerElement.addEventListener('touchend', function (e) {
        // Clear long-press timer
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }

        // If in long-press state, restore original playback speed
        if (isLongPress) {
            art.video.playbackRate = originalPlaybackRate;
            isLongPress = false;
            showSpeedHint(originalPlaybackRate);

            // Prevent click event after long-press
            e.preventDefault();
        }
        // If not long-press, allow normal click event (pause/play)
    });

    // Touch cancel event
    playerElement.addEventListener('touchcancel', function () {
        // Clear long-press timer
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }

        // If in long-press state, restore original playback speed
        if (isLongPress) {
            art.video.playbackRate = originalPlaybackRate;
            isLongPress = false;
        }
    });

    // Touch move event - prevent page scroll during long-press
    playerElement.addEventListener('touchmove', function (e) {
        if (isLongPress) {
            e.preventDefault();
        }
    }, { passive: false });

    // Cancel long-press state when video pauses
    art.video.addEventListener('pause', function () {
        if (isLongPress) {
            art.video.playbackRate = originalPlaybackRate;
            isLongPress = false;
        }

        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    });
}

// Clear video progress record
function clearVideoProgress() {
    const progressKey = `videoProgress_${getVideoId()}`;
    try {
        localStorage.removeItem(progressKey);
    } catch (e) {
    }
}

// Get video unique identifier
function getVideoId() {
    // Use video title and episode index as unique identifier
    // If currentVideoUrl is available and more unique, prefer it. Otherwise, fallback.
    if (currentVideoUrl) {
        return `${encodeURIComponent(currentVideoUrl)}`;
    }
    return `${encodeURIComponent(currentVideoTitle)}_${currentEpisodeIndex}`;
}

let controlsLocked = false;
function toggleControlsLock() {
    const container = document.getElementById('playerContainer');
    controlsLocked = !controlsLocked;
    container.classList.toggle('controls-locked', controlsLocked);
    const icon = document.getElementById('lockIcon');
    // Toggle icon: lock / unlock
    icon.innerHTML = controlsLocked
        ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d=\"M12 15v2m0-8V7a4 4 0 00-8 0v2m8 0H4v8h16v-8H6v-6z\"/>'
        : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d=\"M15 11V7a3 3 0 00-6 0v4m-3 4h12v6H6v-6z\"/>';
}

// Support closing player in iframe
function closeEmbeddedPlayer() {
    try {
        if (window.self !== window.top) {
            // If in iframe, try to call parent window's close method
            if (window.parent && typeof window.parent.closeVideoPlayer === 'function') {
                window.parent.closeVideoPlayer();
                return true;
            }
        }
    } catch (e) {
        console.error('Failed to close embedded player:', e);
    }
    return false;
}

function renderResourceInfoBar() {
    // Get container element
    const container = document.getElementById('resourceInfoBarContainer');
    if (!container) {
        console.error('Cannot find resource info card container');
        return;
    }
    
    // Get current video source_code
    const urlParams = new URLSearchParams(window.location.search);
    const currentSource = urlParams.get('source') || '';
    
    // Show temporary loading state
    container.innerHTML = `
      <div class="resource-info-bar-left flex">
        <span>Loading...</span>
        <span class="resource-info-bar-videos">-</span>
      </div>
      <button class="resource-switch-btn flex" id="switchResourceBtn" onclick="showSwitchResourceModal()">
        <span class="resource-switch-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4v16m0 0l-6-6m6 6l6-6" stroke="#a67c2d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
        Switch source
      </button>
    `;

    // Find current source name from API_SITES and custom_api
    let resourceName = currentSource
    if (currentSource && API_SITES[currentSource]) {
        resourceName = API_SITES[currentSource].name;
    }
    if (resourceName === currentSource) {
        const customAPIs = JSON.parse(localStorage.getItem('customAPIs') || '[]');
        const customIndex = parseInt(currentSource.replace('custom_', ''), 10);
        if (customAPIs[customIndex]) {
            resourceName = customAPIs[customIndex].name || 'Custom source';
        }
    }

    container.innerHTML = `
      <div class="resource-info-bar-left flex">
        <span>${resourceName}</span>
        <span class="resource-info-bar-videos">${currentEpisodes.length} videos</span>
      </div>
      <button class="resource-switch-btn flex" id="switchResourceBtn" onclick="showSwitchResourceModal()">
        <span class="resource-switch-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4v16m0 0l-6-6m6 6l6-6" stroke="#a67c2d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
        Switch source
      </button>
    `;
}

// Function to test video source speed
async function testVideoSourceSpeed(sourceKey, vodId) {
    try {
        const startTime = performance.now();
        
        // Build API parameters
        let apiParams = '';
        if (sourceKey.startsWith('custom_')) {
            const customIndex = sourceKey.replace('custom_', '');
            const customApi = getCustomApiInfo(customIndex);
            if (!customApi) {
                return { speed: -1, error: 'Invalid API configuration' };
            }
            if (customApi.detail) {
                apiParams = '&customApi=' + encodeURIComponent(customApi.url) + '&customDetail=' + encodeURIComponent(customApi.detail) + '&source=custom';
            } else {
                apiParams = '&customApi=' + encodeURIComponent(customApi.url) + '&source=custom';
            }
        } else {
            apiParams = '&source=' + sourceKey;
        }
        
        // Add timestamp to prevent caching
        const timestamp = new Date().getTime();
        const cacheBuster = `&_t=${timestamp}`;
        
        // Get video details
        const response = await fetch(`/api/detail?id=${encodeURIComponent(vodId)}${apiParams}${cacheBuster}`, {
            method: 'GET',
            cache: 'no-cache'
        });
        
        if (!response.ok) {
            return { speed: -1, error: 'Failed to fetch' };
        }
        
        const data = await response.json();
        
        if (!data.episodes || data.episodes.length === 0) {
            return { speed: -1, error: 'No playback source' };
        }
        
        // Test response speed of first playback link
        const firstEpisodeUrl = data.episodes[0];
        if (!firstEpisodeUrl) {
            return { speed: -1, error: 'Invalid link' };
        }
        
        // Test video link response time
        const videoTestStart = performance.now();
        try {
            const videoResponse = await fetch(firstEpisodeUrl, {
                method: 'HEAD',
                mode: 'no-cors',
                cache: 'no-cache',
                signal: AbortSignal.timeout(5000) // 5 second timeout
            });
            
            const videoTestEnd = performance.now();
            const totalTime = videoTestEnd - startTime;
            
            // Return total response time (milliseconds)
            return { 
                speed: Math.round(totalTime),
                episodes: data.episodes.length,
                error: null 
            };
        } catch (videoError) {
            // If video link test fails, return only API response time
            const apiTime = performance.now() - startTime;
            return { 
                speed: Math.round(apiTime),
                episodes: data.episodes.length,
                error: null,
                note: 'API response' 
            };
        }
        
    } catch (error) {
        return { 
            speed: -1, 
            error: error.name === 'AbortError' ? 'Timeout' : 'Test failed' 
        };
    }
}

// Format speed display
function formatSpeedDisplay(speedResult) {
    if (speedResult.speed === -1) {
        return `<span class="speed-indicator error">❌ ${speedResult.error}</span>`;
    }
    
    const speed = speedResult.speed;
    let className = 'speed-indicator good';
    let icon = '🟢';
    
    if (speed > 2000) {
        className = 'speed-indicator poor';
        icon = '🔴';
    } else if (speed > 1000) {
        className = 'speed-indicator medium';
        icon = '🟡';
    }
    
    const note = speedResult.note ? ` (${speedResult.note})` : '';
    return `<span class="${className}">${icon} ${speed}ms${note}</span>`;
}

async function showSwitchResourceModal() {
    const urlParams = new URLSearchParams(window.location.search);
    const currentSourceCode = urlParams.get('source');
    const currentVideoId = urlParams.get('id');

    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');

    modalTitle.innerHTML = `<span class="break-words">${currentVideoTitle}</span>`;
    modalContent.innerHTML = '<div style="text-align:center;padding:20px;color:#aaa;grid-column:1/-1;">Loading source list...</div>';
    modal.classList.remove('hidden');

    // Search
    const resourceOptions = selectedAPIs.map((curr) => {
        if (API_SITES[curr]) {
            return { key: curr, name: API_SITES[curr].name };
        }
        const customIndex = parseInt(curr.replace('custom_', ''), 10);
        if (customAPIs[customIndex]) {
            return { key: curr, name: customAPIs[customIndex].name || 'Custom source' };
        }
        return { key: curr, name: 'Unknown source' };
    });
    let allResults = {};
    await Promise.all(resourceOptions.map(async (opt) => {
        let queryResult = await searchByAPIAndKeyWord(opt.key, currentVideoTitle);
        if (queryResult.length == 0) {
            return 
        }
        // Prioritize exact name match source, otherwise default to first one
        let result = queryResult[0]
        queryResult.forEach((res) => {
            if (res.vod_name == currentVideoTitle) {
                result = res;
            }
        })
        allResults[opt.key] = result;
    }));

    // Update status display: start speed test
    modalContent.innerHTML = '<div style="text-align:center;padding:20px;color:#aaa;grid-column:1/-1;">Testing source speeds...</div>';

    // Test all source speeds simultaneously
    const speedResults = {};
    await Promise.all(Object.entries(allResults).map(async ([sourceKey, result]) => {
        if (result) {
            speedResults[sourceKey] = await testVideoSourceSpeed(sourceKey, result.vod_id);
        }
    }));

    // Sort results
    const sortedResults = Object.entries(allResults).sort(([keyA, resultA], [keyB, resultB]) => {
        // Put currently playing source at the front
        const isCurrentA = String(keyA) === String(currentSourceCode) && String(resultA.vod_id) === String(currentVideoId);
        const isCurrentB = String(keyB) === String(currentSourceCode) && String(resultB.vod_id) === String(currentVideoId);
        
        if (isCurrentA && !isCurrentB) return -1;
        if (!isCurrentA && isCurrentB) return 1;
        
        // Sort others by speed, faster ones first (speed -1 means failed, put at end)
        const speedA = speedResults[keyA]?.speed || 99999;
        const speedB = speedResults[keyB]?.speed || 99999;
        
        if (speedA === -1 && speedB !== -1) return 1;
        if (speedA !== -1 && speedB === -1) return -1;
        if (speedA === -1 && speedB === -1) return 0;
        
        return speedA - speedB;
    });

    // Render source list
    let html = '<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">';
    
    for (const [sourceKey, result] of sortedResults) {
        if (!result) continue;
        
        // Fix isCurrentSource check, ensure type consistency
        const isCurrentSource = String(sourceKey) === String(currentSourceCode) && String(result.vod_id) === String(currentVideoId);
        const sourceName = resourceOptions.find(opt => opt.key === sourceKey)?.name || 'Unknown source';
        const speedResult = speedResults[sourceKey] || { speed: -1, error: 'Not tested' };
        
        html += `
            <div class="relative group ${isCurrentSource ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105 transition-transform'}" 
                 ${!isCurrentSource ? `onclick="switchToResource('${sourceKey}', '${result.vod_id}')"` : ''}>
                <div class="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 relative">
                    <img src="${result.vod_pic}" 
                         alt="${result.vod_name}"
                         class="w-full h-full object-cover"
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNjY2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIgcnk9IjIiPjwvcmVjdD48cGF0aCBkPSJNMjEgMTV2NGEyIDIgMCAwIDEtMiAySDVhMiAyIDAgMCAxLTItMnYtNCI+PC9wYXRoPjxwb2x5bGluZSBwb2ludHM9IjE3IDggMTIgMyA3IDgiPjwvcG9seWxpbmU+PHBhdGggZD0iTTEyIDN2MTIiPjwvcGF0aD48L3N2Zz4='">
                    
                    <!-- Speed displayed in top-right corner of image -->
                    <div class="absolute top-1 right-1 speed-badge bg-black bg-opacity-75">
                        ${formatSpeedDisplay(speedResult)}
                    </div>
                </div>
                <div class="mt-2">
                    <div class="text-xs font-medium text-gray-200 truncate">${result.vod_name}</div>
                    <div class="text-[10px] text-gray-400 truncate">${sourceName}</div>
                    <div class="text-[10px] text-gray-500 mt-1">
                        ${speedResult.episodes ? `${speedResult.episodes} episodes` : ''}
                    </div>
                </div>
                ${isCurrentSource ? `
                    <div class="absolute inset-0 flex items-center justify-center">
                        <div class="bg-blue-600 bg-opacity-75 rounded-lg px-2 py-0.5 text-xs text-white font-medium">
                            Currently playing
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    html += '</div>';
    modalContent.innerHTML = html;
}

// Function to switch source
async function switchToResource(sourceKey, vodId) {
    // Close modal
    document.getElementById('modal').classList.add('hidden');
    
    showLoading();
    try {
        // Build API parameters
        let apiParams = '';
        
        // Handle custom API source
        if (sourceKey.startsWith('custom_')) {
            const customIndex = sourceKey.replace('custom_', '');
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
            apiParams = '&source=' + sourceKey;
        }
        
        // Add a timestamp to prevent caching
        const timestamp = new Date().getTime();
        const cacheBuster = `&_t=${timestamp}`;
        const response = await fetch(`/api/detail?id=${encodeURIComponent(vodId)}${apiParams}${cacheBuster}`);
        
        const data = await response.json();
        
        if (!data.episodes || data.episodes.length === 0) {
            showToast('Playback source not found', 'error');
            hideLoading();
            return;
        }

        // Get current playing episode index
        const currentIndex = currentEpisodeIndex;
        
        // Determine episode index to play
        let targetIndex = 0;
        if (currentIndex < data.episodes.length) {
            // If current episode exists in new resource, use the same episode
            targetIndex = currentIndex;
        }
        
        // Get target episode URL
        const targetUrl = data.episodes[targetIndex];
        
        // Build playback page URL
        const watchUrl = `player.html?id=${vodId}&source=${sourceKey}&url=${encodeURIComponent(targetUrl)}&index=${targetIndex}&title=${encodeURIComponent(currentVideoTitle)}`;
        
        // Save current state to localStorage
        try {
            localStorage.setItem('currentVideoTitle', data.vod_name || 'Unknown Video');
            localStorage.setItem('currentEpisodes', JSON.stringify(data.episodes));
            localStorage.setItem('currentEpisodeIndex', targetIndex);
            localStorage.setItem('currentSourceCode', sourceKey);
            localStorage.setItem('lastPlayTime', Date.now());
        } catch (e) {
            console.error('Failed to save playback state:', e);
        }

        // Navigate to playback page
        window.location.href = watchUrl;
        
    } catch (error) {
        console.error('Switch resource failed:', error);
        showToast('Failed to switch resource, please try again later', 'error');
    } finally {
        hideLoading();
    }
}