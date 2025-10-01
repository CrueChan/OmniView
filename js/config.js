// Global constant configuration
const PROXY_URL = '/proxy/';    // Compatible with Cloudflare, Netlify (with rewrites), Vercel (with rewrites)
// const HOPLAYER_URL = 'https://hoplayer.com/index.html';
const SEARCH_HISTORY_KEY = 'videoSearchHistory';
const MAX_HISTORY_ITEMS = 5;

// Password protection configuration
const PASSWORD_CONFIG = {
    localStorageKey: 'passwordVerified',  // Key name for storing verification state
    verificationTTL: 90 * 24 * 60 * 60 * 1000,  // Verification validity period (90 days, approximately 3 months)
    adminLocalStorageKey: 'adminPasswordVerified'  // Key name for new admin verification state
};

// Website information configuration
const SITE_CONFIG = {
    name: 'OmniView',
    url: 'https://omniview.is-an.org',
    description: 'Free Online Video Search and Streaming Platform',
    logo: 'image/logo.png',
    version: '1.0.3'
};

// API site configuration
const API_SITES = {
    dyttzy: {
        api: 'http://caiji.dyttzyapi.com/api.php/provide/vod',
        name: 'Movie Paradise Resources',
        detail: 'http://caiji.dyttzyapi.com', 
    },
    ruyi: {
        api: 'https://cj.rycjapi.com/api.php/provide/vod',
        name: 'Ruyi Resources',
    },
    bfzy: {
        api: 'https://bfzyapi.com/api.php/provide/vod',
        name: 'Baofeng Resources',
    },
    tyyszy: {
        api: 'https://tyyszy.com/api.php/provide/vod',
        name: 'Tianya Resources',
    },
    xiaomaomi: {
        api: 'https://zy.xmm.hk/api.php/provide/vod',
        name: 'Xiaomao Resources',
    },
    ffzy: {
        api: 'http://ffzy5.tv/api.php/provide/vod',
        name: 'Feifan Video',
        detail: 'http://ffzy5.tv', 
    },
    heimuer: {
        api: 'https://json.heimuer.xyz/api.php/provide/vod',
        name: 'Heimuer',
        detail: 'https://heimuer.tv', 
    },
    zy360: {
        api: 'https://360zy.com/api.php/provide/vod',
        name: '360 Resources',
    },
    iqiyi: {
        api: 'https://www.iqiyizyapi.com/api.php/provide/vod',
        name: 'iQiyi Resources',
    },
    wolong: {
        api: 'https://wolongzyw.com/api.php/provide/vod',
        name: 'Wolong Resources',
    }, 
    hwba: {
        api: 'https://cjhwba.com/api.php/provide/vod',
        name: 'Huawei Bar Resources',
    },
    jisu: {
        api: 'https://jszyapi.com/api.php/provide/vod',
        name: 'Jisu Resources',
        detail: 'https://jszyapi.com', 
    },
    dbzy: {
        api: 'https://dbzy.tv/api.php/provide/vod',
        name: 'Douban Resources',
    },
    mozhua: {
        api: 'https://mozhuazy.com/api.php/provide/vod',
        name: 'Mozhua Resources',
    },
    mdzy: {
        api: 'https://www.mdzyapi.com/api.php/provide/vod',
        name: 'Modu Resources',
    },
    zuid: {
        api: 'https://api.zuidapi.com/api.php/provide/vod',
        name: 'Zuida Resources'
    },
    yinghua: {
        api: 'https://m3u8.apiyhzy.com/api.php/provide/vod',
        name: 'Sakura Resources'
    },
    baidu: {
        api: 'https://api.apibdzy.com/api.php/provide/vod',
        name: 'Baidu Cloud Resources'
    },
    wujin: {
        api: 'https://api.wujinapi.me/api.php/provide/vod',
        name: 'Wujin Resources'
    },
    wwzy: {
        api: 'https://wwzy.tv/api.php/provide/vod',
        name: 'Wangwang Short Dramas'
    },
    ikun: {
        api: 'https://ikunzyapi.com/api.php/provide/vod',
        name: 'iKun Resources'
    },
    lzi: {
        api: 'https://cj.lziapi.com/api.php/provide/vod/',
        name: 'Quantum Resources'
    },
    testSource: {
        api: 'https://www.example.com/api.php/provide/vod',
        name: 'Empty content test source',
        adult: true
    },
    // Below are some adult content API sources, hidden by default. Using this project to browse adult content goes against the project's original intention
    // Pornographic content spread on the internet completely objectifies and instrumentalizes people, representing a major obstacle on the path to gender liberation and human equality.
    // These adult films are the most vicious manifestation of capitalist patriarchal oppression. They commodify violence and humiliation, trample human dignity, cause irreparable harm to victims, and poison social relationships.
    // Capital commodifies the most despicable exploitation (including exploitation of victims and performers) and violence for profit,
    // shaping gender exploitation as 'sexual pleasure' to numb audience consciousness and divert our attention from real-life contradictions and oppression.
    // These films and the industry behind them have driven millions of men and women into the industry, selling their bodies, even making it their livelihood.
    // Are the viewers innocent? Undoubtedly, they facilitate the reproduction of the adult content industry chain.
    // We provide this warning in hopes that you can recognize the nature of this content - it is a tool of oppression and enslavement, not entertainment.
    // ckzy: {
    //     api: 'https://www.ckzy1.com',
    //     name: 'CK Resources',
    //     adult: true
    // },
    // jkun: {
    //     api: 'https://jkunzyapi.com',
    //     name: 'jkun Resources',
    //     adult: true
    // },
    // bwzy: {
    //     api: 'https://api.bwzym3u8.com',
    //     name: 'Million Resources',
    //     adult: true
    // },
    // souav: {
    //     api: 'https://api.souavzy.vip',
    //     name: 'souav Resources',
    //     adult: true
    // },
    // r155: {
    //     api: 'https://155api.com',
    //     name: '155 Resources',
    //     adult: true
    // },
    // lsb: {
    //     api: 'https://apilsbzy1.com',
    //     name: 'lsb Resources',
    //     adult: true
    // },
    // huangcang: {
    //     api: 'https://hsckzy.vip',
    //     name: 'Adult Warehouse',
    //     adult: true,
    //     detail: 'https://hsckzy.vip'
    // },
    // yutu: {
    //     api: 'https://yutuzy10.com',
    //     name: 'Jade Rabbit Resources',
    //     adult: true
    // },

    // The following are API sources with high failure rates, not recommended for use
    // subo: {
    //     api: 'https://subocaiji.com/api.php/provide/vod',
    //     name: 'Quick Play Resources'
    // },
    // fczy: {
    //     api: 'https://api.fczy888.me/api.php/provide/vod',
    //     name: 'Hive Resources'
    // },
    // ukzy: {
    //     api: 'https://api.ukuapi88.com/api.php/provide/vod',
    //     name: 'U Cool Resources'
    // },
};

// Define merge method
function extendAPISites(newSites) {
    Object.assign(API_SITES, newSites);
}

// Expose to global scope
window.API_SITES = API_SITES;
window.extendAPISites = extendAPISites;


// Add aggregated search configuration options
const AGGREGATED_SEARCH_CONFIG = {
    enabled: true,             // Enable aggregated search
    timeout: 8000,            // Single source timeout (milliseconds)
    maxResults: 10000,          // Maximum number of results
    parallelRequests: true,   // Request all sources in parallel
    showSourceBadges: true    // Show source badges
};

// Abstract API request configuration
const API_CONFIG = {
    search: {
        // Only concatenate parameter part, no longer includes /api.php/provide/vod/
        path: '?ac=videolist&wd=',
        pagePath: '?ac=videolist&wd={query}&pg={page}',
        maxPages: 50, // Maximum number of pages to fetch
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'application/json'
        }
    },
    detail: {
        // Only concatenate parameter part
        path: '?ac=videolist&ids=',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'application/json'
        }
    }
};

// Optimized regex pattern
const M3U8_PATTERN = /\$https?:\/\/[^"'\s]+?\.m3u8/g;

// Add custom player URL
const CUSTOM_PLAYER_URL = 'player.html'; // Use relative path to reference local player.html

// Add video playback related configuration
const PLAYER_CONFIG = {
    autoplay: true,
    allowFullscreen: true,
    width: '100%',
    height: '600',
    timeout: 15000,  // Player loading timeout
    filterAds: true,  // Enable ad filtering
    autoPlayNext: true,  // Enable autoplay by default
    adFilteringEnabled: true, // Enable segmented ad filtering by default
    adFilteringStorage: 'adFilteringEnabled' // Key name for storing ad filter settings
};

// Add error message localization
const ERROR_MESSAGES = {
    NETWORK_ERROR: 'Network connection error, please check network settings',
    TIMEOUT_ERROR: 'Request timeout, server response time too long',
    API_ERROR: 'API interface returned error, please try switching data source',
    PLAYER_ERROR: 'Player failed to load, please try other video sources',
    UNKNOWN_ERROR: 'Unknown error occurred, please refresh the page and try again'
};

// Add further security settings
const SECURITY_CONFIG = {
    enableXSSProtection: true,  // Enable XSS protection
    sanitizeUrls: true,         // Sanitize URL
    maxQueryLength: 100,        // Maximum search length
    // allowedApiDomains no longer needed as all requests go through internal proxy
};

// Add configuration for multiple custom API sources
const CUSTOM_API_CONFIG = {
    separator: ',',           // Delimiter
    maxSources: 5,            // Maximum number of custom sources allowed
    testTimeout: 5000,        // Test timeout (milliseconds)
    namePrefix: 'Custom-',    // Custom source name prefix
    validateUrl: true,        // Validate URL format
    cacheResults: true,       // Cache test results
    cacheExpiry: 5184000000,  // Cache expiration time (2 months)
    adultPropName: 'isAdult' // Attribute name for marking adult content
};

// Variable to hide built-in adult content API sources
const HIDE_BUILTIN_ADULT_APIS = false;
