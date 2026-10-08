// Handling cache
// Caching is now handled by cache.html + iframe_cache.js for firmware based caching
// This way we dont cache just everything for everyone. faster caching.

// window.addEventListener('load', function () {
//     // Only run on PS4 and not in dev mode
//     if (!isPS4 || devMode) return;

//     if (!window.applicationCache || window.applicationCache.status === window.applicationCache.UNCACHED) {
//         // Not cached at all — redirect to the full caching flow
//         window.location.href = './cache.html';
//         return;
//     }

//     // Already cached: silently check if a cache update is available in the background.
//     // We load the firmware-appropriate cacheXXX.html into a hidden iframe.
//     // iframe_cache.js inside it will relay AppCache events via postMessage.
//     //   CACHE_COMPLETE  → updateready fired (new version swapped in) → notify user
//     //   CACHE_EXISTS    → noupdate (already up to date)              → stay silent
//     //   CACHE_ERROR     → something went wrong                       → stay silent
//     startCacheUpdateCheck();
// });

/**
 * Resolves the correct firmware-specific cache page and loads it into the
 * hidden #silentCacheFrame to trigger a background AppCache update check.
 * Listens for postMessages from iframe_cache.js and shows a banner if needed.
 */
function startCacheUpdateCheck() {
    var fwVersion = (typeof getPs4FwVersion === 'function')
        ? getPs4FwVersion(navigator.userAgent)
        : '';

    // Mirror the same routing table used in cache.html
    var routes = [
        { min: 6.70,  max: 6.72,  page: 'cache67x.html' },
        { min: 7.00,  max: 8.52,  page: 'cache7-8xx.html' },
        { min: 9.00,  max: 9.60,  page: 'cache9xx.html' },
        { min: 10.00, max: 10.71, page: 'cache10xx.html' },
        { min: 11.00, max: 11.52, page: 'cache11xx.html' },
        { min: 12.00, max: 12.52, page: 'cache12xx.html' },
        { min: 13.00, max: 13.00, page: 'cache1300.html' },
        { min: 13.02, max: 13.52, page: 'cache1302-1352.html' },
    ];

    var fwNum = parseFloat(fwVersion);
    var page = 'cachePayloads.html'; // fallback
    for (var i = 0; i < routes.length; i++) {
        if (fwNum >= routes[i].min && fwNum <= routes[i].max) {
            page = routes[i].page;
            break;
        }
    }

    var frame = document.getElementById('silentCacheFrame');
    if (!frame) return;

    // One-shot message listener — removed after we get a definitive result
    function onCacheMsg(event) {
        var data = event.data;
        if (!data || !data.type) return;

        if (data.type === 'CACHE_COMPLETE') {
            // updateready fired: a new version is ready in the cache.
            // Tell the user to go through cache.html to apply it.
            showCacheUpdateBanner('A new cache update is available! Click \'Update Cache\' to apply it.');
            window.removeEventListener('message', onCacheMsg);
        } else if (data.type === 'CACHE_EXISTS' || data.type === 'CACHE_ERROR') {
            // noupdate or error — either way, stay completely silent
            window.removeEventListener('message', onCacheMsg);
        }
        // CACHE_CHECKING / CACHE_DOWNLOADING / CACHE_PROGRESS are intentionally ignored
    }

    window.addEventListener('message', onCacheMsg, false);

    // Kick off the silent check by pointing the iframe at the right cache page
    frame.src = 'includes/caches/' + page;
}

/**
 * Slides the #cacheUpdateBanner down from the top of the screen.
 * The banner has Reload and Dismiss buttons wired up here.
 * @param {string} message - Text to display in the banner.
 */
function showCacheUpdateBanner(message) {
    var banner     = document.getElementById('cacheUpdateBanner');
    var msgEl      = document.getElementById('cacheUpdateMsg');
    var reloadBtn  = document.getElementById('cacheUpdateReload');
    var dismissBtn = document.getElementById('cacheUpdateDismiss');

    if (!banner) return;

    if (msgEl) msgEl.textContent = message;

    // Enable pointer events now that we're showing the banner
    banner.style.pointerEvents = 'auto';

    // Force a reflow so the transition picks up the initial transform state,
    // then slide it into view.
    banner.getBoundingClientRect();
    banner.style.transform = 'translateY(0)';

    // "Update Cache" → goes to cache.html to re-run the full caching flow
    if (reloadBtn) {
        reloadBtn.textContent = 'Update Cache';
        reloadBtn.onclick = function () { window.location.href = './cache.html'; };
    }

    if (dismissBtn) {
        dismissBtn.onclick = function () {
            banner.style.transform = 'translateY(-100%)';
            // Disable pointer events again once it's offscreen
            setTimeout(function () {
                banner.style.pointerEvents = 'none';
            }, 380);
        };
    }
}

// Still not used anywhere because I'm not sure how useful this can be.
function terminateCache() {
    if (window.applicationCache) {
        // Status 3 is 'downloading', Status 1 is 'checking'
        if (window.applicationCache.status === 3 || window.applicationCache.status === 1) {
            console.log("Terminating cache process to save memory...");
            window.applicationCache.abort();
            document.title = projectName;
            window.applicationCache.removeEventListener("progress", null);
            window.applicationCache.oncached = null;
            window.applicationCache.onupdateready = null;
        }
    }
}