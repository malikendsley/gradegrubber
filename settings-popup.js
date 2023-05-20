

// Retrieve DOM elements
const sensitivitySlider = document.getElementById('sensitivitySlider');
const sensitivityOutput = document.getElementById('sensitivityOutput');
const goodColorPicker = document.getElementById('goodColorPicker');
const neutralColorPicker = document.getElementById('neutralColorPicker');
const badColorPicker = document.getElementById('badColorPicker');

// Add event listeners or perform any desired operations
sensitivitySlider.addEventListener('input', () => {
    const sensitivityValue = sensitivitySlider.value;
    sensitivityOutput.textContent = sensitivityValue;
    console.log("Sensitivity changed to " + sensitivityValue);
    
});

goodColorPicker.addEventListener('input', () => {
    const goodColorValue = goodColorPicker.value;
    console.log("Good color changed to " + goodColorValue);
});

neutralColorPicker.addEventListener('input', () => {
    const neutralColorValue = neutralColorPicker.value;
    console.log("Neutral color changed to " + neutralColorValue);
});

badColorPicker.addEventListener('input', () => {
    const badColorValue = badColorPicker.value;
    console.log("Bad color changed to " + badColorValue);
});


//default settings
resetSettings = {
    EXTENSION_ENABLED: true,
    GOOD_COLOR: "#00FF00",
    BAD_COLOR: "#FF0000",
    NEUTRAL_COLOR: "#FFFF00",
    SENSITIVITY: 1.0,
    SETTINGS_RESET: true,
}

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
