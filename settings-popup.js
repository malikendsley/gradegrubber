//default settings
resetSettings = {
    EXTENSION_ENABLED: true,
    GOOD_COLOR: "#00ff00",
    BAD_COLOR: "#ff0000",
    NEUTRAL_COLOR: "#ffff00",
    SENSITIVITY: 1.0,
    SETTINGS_RESET: true,
}

// Retrieve DOM elements
const sensitivitySlider = document.getElementById('sensitivitySlider');
const sensitivityOutput = document.getElementById('sensitivityOutput');
const goodColorPicker = document.getElementById('goodColorPicker');
const neutralColorPicker = document.getElementById('neutralColorPicker');
const badColorPicker = document.getElementById('badColorPicker');

// Load settings from storage
chrome.storage.sync.get(null, function (settings) {
    GC = settings.GOOD_COLOR;
    NC = settings.NEUTRAL_COLOR;
    BC = settings.BAD_COLOR;

    //set the values of the sliders and color pickers
    sensitivitySlider.value = settings.SENSITIVITY;
    sensitivityOutput.textContent = settings.SENSITIVITY;
    goodColorPicker.value = GC;
    neutralColorPicker.value = NC;
    badColorPicker.value = BC;
});


// Add event listeners or perform any desired operations
sensitivitySlider.addEventListener('input', () => {
    const sensitivityValue = sensitivitySlider.value;
    sensitivityOutput.textContent = sensitivityValue;
    chrome.storage.sync.set({ SENSITIVITY: sensitivityValue }, function () {
        console.log("Sensitivity changed to " + sensitivityValue);
    });
});

goodColorPicker.addEventListener('input', () => {
    const goodColorValue = goodColorPicker.value;
    chrome.storage.sync.set({ GOOD_COLOR: goodColorValue }, function () {
        console.log("Good color changed to " + goodColorValue);
    });
});

neutralColorPicker.addEventListener('input', () => {
    const neutralColorValue = neutralColorPicker.value;
    chrome.storage.sync.set({ NEUTRAL_COLOR: neutralColorValue }, function () {
        console.log("Neutral color changed to " + neutralColorValue);
    });
});

badColorPicker.addEventListener('input', () => {
    const badColorValue = badColorPicker.value;
    chrome.storage.sync.set({ BAD_COLOR: badColorValue }, function () {
        console.log("Bad color changed to " + badColorValue);
    });
});


//controls the settings reset button
document.getElementById('reset-settings-button').addEventListener('click', function () {
    chrome.storage.sync.set(resetSettings, function () {
        console.log("Settings reset");
    });
});

//controls the enable/disable switch
document.getElementById('enable-switch').addEventListener('change', function () {
    let isChecked = this.checked;
    chrome.storage.sync.set({ EXTENSION_ENABLED: isChecked }, function () {
        console.log("Extension " + (isChecked ? "enabled" : "disabled"));
    });
});
