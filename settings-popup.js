//default settings
resetSettings = {
  EXTENSION_ENABLED: true,
  GOOD_COLOR: "#00ff00",
  BAD_COLOR: "#ff0000",
  NEUTRAL_COLOR: "#ffffff",
  SENSITIVITY: 1.0,
  SHADE_GRADES: true,
  SHADE_CATEGORIES: true,
  SETTINGS_RESET: true,
};

// Retrieve DOM elements
const sensitivitySlider = document.getElementById("sensitivitySlider");
const sensitivityOutput = document.getElementById("sensitivityOutput");
const goodColorPicker = document.getElementById("goodColorPicker");
const neutralColorPicker = document.getElementById("neutralColorPicker");
const badColorPicker = document.getElementById("badColorPicker");
const enableSwitch = document.getElementById("enable-switch");
const shadeGradesSwitch = document.getElementById("shadeGradesSwitch");
const shadeCategoriesSwitch = document.getElementById("shadeCategoriesSwitch");

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
  enableSwitch.checked = settings.EXTENSION_ENABLED;
  shadeGradesSwitch.checked = settings.SHADE_GRADES;
  shadeCategoriesSwitch.checked = settings.SHADE_CATEGORIES;
});

// Listeners for settings changes
sensitivitySlider.addEventListener("input", () => {
  const sensitivityValue = sensitivitySlider.value;
  sensitivityOutput.textContent = sensitivityValue;
  chrome.storage.sync.set({ SENSITIVITY: sensitivityValue }, function () {
    //console.log("Sensitivity changed to " + sensitivityValue);
  });
});

goodColorPicker.addEventListener("input", () => {
  const goodColorValue = goodColorPicker.value;
  chrome.storage.sync.set({ GOOD_COLOR: goodColorValue }, function () {
    //console.log("Good color changed to " + goodColorValue);
  });
});

neutralColorPicker.addEventListener("input", () => {
  const neutralColorValue = neutralColorPicker.value;
  chrome.storage.sync.set({ NEUTRAL_COLOR: neutralColorValue }, function () {
    //console.log("Neutral color changed to " + neutralColorValue);
  });
});

badColorPicker.addEventListener("input", () => {
  const badColorValue = badColorPicker.value;
  chrome.storage.sync.set({ BAD_COLOR: badColorValue }, function () {
    //console.log("Bad color changed to " + badColorValue);
  });
});

shadeGradesSwitch.addEventListener("change", () => {
  const shadeGradesValue = shadeGradesSwitch.checked;
  chrome.storage.sync.set({ SHADE_GRADES: shadeGradesValue }, function () {
    //console.log("Shade grades changed to " + shadeGradesValue);
  });
});

shadeCategoriesSwitch.addEventListener("change", () => {
  const shadeCategoriesValue = shadeCategoriesSwitch.checked;
  chrome.storage.sync.set(
    { SHADE_CATEGORIES: shadeCategoriesValue },
    function () {
      //console.log("Shade categories changed to " + shadeCategoriesValue);
    }
  );
});

//controls the settings reset button
document
  .getElementById("reset-settings-button")
  .addEventListener("click", function () {
    chrome.storage.sync.set(resetSettings, function () {
      //console.log("Settings reset");
      //set the values of the sliders and color pickers
      sensitivitySlider.value = resetSettings.SENSITIVITY;
      sensitivityOutput.textContent = resetSettings.SENSITIVITY;
      goodColorPicker.value = resetSettings.GOOD_COLOR;
      neutralColorPicker.value = resetSettings.NEUTRAL_COLOR;
      badColorPicker.value = resetSettings.BAD_COLOR;
      enableSwitch.checked = resetSettings.EXTENSION_ENABLED;

      //reload the current tab
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.reload(tabs[0].id);
      });
      //close the popup
      window.close();
    });
  });

//controls the enable/disable switch
document
  .getElementById("enable-switch")
  .addEventListener("change", function () {
    let isChecked = this.checked;
    chrome.storage.sync.set({ EXTENSION_ENABLED: isChecked }, function () {
      //console.log("Extension " + (isChecked ? "enabled" : "disabled"));
    });
  });
