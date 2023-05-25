settings = {
    EXTENSION_ENABLED: true,
    GOOD_COLOR: "#00ff00",
    BAD_COLOR: "#ff0000",
    NEUTRAL_COLOR: "#ffffff",
    SENSITIVITY: 1.0,
    SHADE_GRADES: true,
    SHADE_CATEGORIES: true,
    SETTINGS_RESET: false,
}

chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason === 'install') {
        // Fresh installation
        console.log('Extension installed');
        chrome.storage.sync.set(settings, function () {
            console.log("Settings loaded");
        });
    } else if (details.reason === 'update') {
        // Extension update
        console.log('Extension updated');

    }
});
