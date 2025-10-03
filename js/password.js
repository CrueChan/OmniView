// Password protection feature

/**
 * Check if password protection is enabled
 * Check by reading environment variables embedded in the page
 */
function isPasswordProtected() {
    // Check environment variables embedded in the page
    const pwd = window.__ENV__ && window.__ENV__.PASSWORD;
    const adminPwd = window.__ENV__ && window.__ENV__.ADMINPASSWORD;

    // Check if normal password or admin password is valid
    const isPwdValid = typeof pwd === 'string' && pwd.length === 64 && !/^0+$/.test(pwd);
    const isAdminPwdValid = typeof adminPwd === 'string' && adminPwd.length === 64 && !/^0+$/.test(adminPwd);

    // Password protection is considered enabled if either password is valid
    return isPwdValid || isAdminPwdValid;
}

window.isPasswordProtected = isPasswordProtected;

/**
 * Verify if user input password is correct（Async, Use SHA-256 hash）
 */
// Unified verification function
async function verifyPassword(password, passwordType = 'PASSWORD') {
    try {
        const correctHash = window.__ENV__?.[passwordType];
        if (!correctHash) return false;

        const inputHash = await sha256(password);
        const isValid = inputHash === correctHash;

        if (isValid) {
            const storageKey = passwordType === 'PASSWORD'
                ? PASSWORD_CONFIG.localStorageKey
                : PASSWORD_CONFIG.adminLocalStorageKey;

            localStorage.setItem(storageKey, JSON.stringify({
                verified: true,
                timestamp: Date.now(),
                passwordHash: correctHash
            }));
        }
        return isValid;
    } catch (error) {
        console.error(`Error verifying ${passwordType} password:`, error);
        return false;
    }
}

// Unified verification status check
function isVerified(passwordType = 'PASSWORD') {
    try {
        if (!isPasswordProtected()) return true;

        const storageKey = passwordType === 'PASSWORD'
            ? PASSWORD_CONFIG.localStorageKey
            : PASSWORD_CONFIG.adminLocalStorageKey;

        const stored = localStorage.getItem(storageKey);
        if (!stored) return false;

        const { timestamp, passwordHash } = JSON.parse(stored);
        const currentHash = window.__ENV__?.[passwordType];

        return timestamp && passwordHash === currentHash &&
            Date.now() - timestamp < PASSWORD_CONFIG.verificationTTL;
    } catch (error) {
        console.error(`Error checking ${passwordType} verification status:`, error);
        return false;
    }
}

// Update global exports
window.isPasswordProtected = isPasswordProtected;
window.isPasswordVerified = () => isVerified('PASSWORD');
window.isAdminVerified = () => isVerified('ADMINPASSWORD');
window.verifyPassword = verifyPassword;

// SHA-256 implementation, Web Crypto API available
async function sha256(message) {
    if (window.crypto && crypto.subtle && crypto.subtle.digest) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Call original js-sha256 under HTTP
    if (typeof window._jsSha256 === 'function') {
        return window._jsSha256(message);
    }
    throw new Error('No SHA-256 implementation available.');
}

/**
 * Show password verification popup
 */
function showPasswordModal() {
    const passwordModal = document.getElementById('passwordModal');
    if (passwordModal) {
        // Prevent scrollbar in Douban area
        document.getElementById('doubanArea').classList.add('hidden');
        document.getElementById('passwordCancelBtn').classList.add('hidden');

        passwordModal.style.display = 'flex';

        // Ensure input field gets focus
        setTimeout(() => {
            const passwordInput = document.getElementById('passwordInput');
            if (passwordInput) {
                passwordInput.focus();
            }
        }, 100);
    }
}

/**
 * Hide password verification popup
 */
function hidePasswordModal() {
    const passwordModal = document.getElementById('passwordModal');
    if (passwordModal) {
        // Hide password error message
        hidePasswordError();

        // Clear password input field
        const passwordInput = document.getElementById('passwordInput');
        if (passwordInput) passwordInput.value = '';

        passwordModal.style.display = 'none';

        // Show Douban section if enabled
        if (localStorage.getItem('doubanEnabled') === 'true') {
            document.getElementById('doubanArea').classList.remove('hidden');
            initDouban();
        }
    }
}

/**
 * Show password error message
 */
function showPasswordError() {
    const errorElement = document.getElementById('passwordError');
    if (errorElement) {
        errorElement.classList.remove('hidden');
    }
}

/**
 * Hide password error message
 */
function hidePasswordError() {
    const errorElement = document.getElementById('passwordError');
    if (errorElement) {
        errorElement.classList.add('hidden');
    }
}

/**
 * Handle password submit event（Async）
 */
async function handlePasswordSubmit() {
    const passwordInput = document.getElementById('passwordInput');
    const password = passwordInput ? passwordInput.value.trim() : '';
    if (await verifyPassword(password)) {
        hidePasswordModal();

        // Trigger password verification success event
        document.dispatchEvent(new CustomEvent('passwordVerified'));
    } else {
        showPasswordError();
        if (passwordInput) {
            passwordInput.value = '';
            passwordInput.focus();
        }
    }
}

/**
 * Initialize password verification system（Need to adapt for async events）
 */
// Modify initPasswordProtection function
function initPasswordProtection() {
    if (!isPasswordProtected()) {
        return;
    }
    
    // Check if there is a normal password
    const hasNormalPassword = window.__ENV__?.PASSWORD && 
                           window.__ENV__.PASSWORD.length === 64 && 
                           !/^0+$/.test(window.__ENV__.PASSWORD);
    
    // Only show password box when normal password is set and not verified
    if (hasNormalPassword && !isPasswordVerified()) {
        showPasswordModal();
    }
    
    // Set button event listener
    const settingsBtn = document.querySelector('[onclick="toggleSettings(event)"]');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function(e) {
            // Only intercept clicks when normal password is set and not verified
            if (hasNormalPassword && !isPasswordVerified()) {
                e.preventDefault();
                e.stopPropagation();
                showPasswordModal();
                return;
            }
            
        });
    }
}

// Set button password box verification
function showAdminPasswordModal() {
    const passwordModal = document.getElementById('passwordModal');
    if (!passwordModal) return;

    // Clear password input field
    const passwordInput = document.getElementById('passwordInput');
    if (passwordInput) passwordInput.value = '';

    // Change title to Admin Verification
    const title = passwordModal.querySelector('h2');
    if (title) title.textContent = 'Admin Verification';

    document.getElementById('passwordCancelBtn').classList.remove('hidden');
    passwordModal.style.display = 'flex';

    // Set form submit handler
    const form = document.getElementById('passwordForm');
    if (form) {
        form.onsubmit = async function (e) {
            e.preventDefault();
            const password = document.getElementById('passwordInput').value.trim();
            if (await verifyPassword(password, 'ADMINPASSWORD')) {
                passwordModal.style.display = 'none';
                document.getElementById('settingsPanel').classList.add('show');
            } else {
                showPasswordError();
            }
        };
    }
}

// Initialize password protection after page load
document.addEventListener('DOMContentLoaded', function () {
    initPasswordProtection();
});


