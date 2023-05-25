// This script is injected into the CourseWorks grades page

//==================================================================================================
// MAIN CODE
//==================================================================================================

window.addEventListener("load", () => {

    // dump the contents of the extension's storage (only contains the settings)
    chrome.storage.sync.get(null, function (settings) {
        //console.log(settings);

        if (!settings.EXTENSION_ENABLED) {
            console.log("Extension disabled");
            return;
        } else {
            // check if the URL contains "grades" and "courseworks2"
            let url = window.location.href;
            if (!(url.includes("grades") && url.includes("courseworks2"))) {
                console.log("Not on grades page");
                return;
            }

            // retrieve table, drill down to the body, and then the rows
            let table = document.getElementById("grades_summary");
            let tableBody = table.getElementsByTagName("tbody")[0];
            let rows = tableBody.getElementsByTagName("tr");

            //format {"assignmentName": {"grade": float, "maxGrade": float, "averageGrade": float, "type": string}}
            let grades = {};

            // iterate through each row
            // match together assignments with their statistics rows, if they exist
            // shade rows with complete data
            let curMode = "skip";
            let curAssignment = "";
            let curAssignmentRow;
            for (let i = 0; i < rows.length; i++) {
                // figure out what kind of row we're looking at
                let curRow = rows[i];
                let rowType = parseRow(curRow);

                // error case(s)
                if (curMode == "statistics" && rowType == "statistics") {
                    // error
                    console.log("Error: two statistics rows in a row, this may indicate a courseworks update");
                    return;
                }

                // normal case(s)
                if (rowType == "assignment") {
                    let assignmentName = extractAssignmentName(curRow);
                    let assignmentType = extractAssignmentType(curRow);
                    let [score, maxScore] = extractAssignmentScores(curRow);
                    // create a new assignment object, null the averageGrade in case there is no statistics row
                    grades[assignmentName] = { "grade": score, "maxGrade": maxScore, "averageGrade": null, "type": assignmentType };
                    curAssignment = assignmentName;
                    curAssignmentRow = curRow;
                } else if (rowType == "statistics") {
                    // update the last assignment object, the key is curAssignment
                    grades[curAssignment]["averageGrade"] = extractMean(curRow);
                    if (settings.SHADE_GRADES) {
                        // once you have the stats for the row, you can shade it
                        let relativePerformance = getRelativePerformance(grades[curAssignment]["grade"], grades[curAssignment]["maxGrade"], grades[curAssignment]["averageGrade"]);
                        let color = getBlendedColor(relativePerformance, settings.BAD_COLOR, settings.GOOD_COLOR, settings.NEUTRAL_COLOR, settings.SENSITIVITY);

                        curRow.style.backgroundColor = color;
                        if (curAssignmentRow) {
                            curAssignmentRow.style.backgroundColor = color;
                        }
                    } else {
                        //console.log("Grade shading disabled");
                    }
                }
                curMode = rowType;
            }

            //check to see if grades are weighted
            let isWeighted = document.getElementById("assignments-not-weighted").innerHTML.includes("Assignments are weighted by group:");
            let studentAvg, courseAvg;
            if (isWeighted) {
                let gradeWeights = extractGradeWeights();
                //unlikely, but fall back to unweighted total points if weight extraction fails
                [studentAvg, courseAvg, perCategoryPerformance] = (gradeWeights) ? calculateTotalGradesWeighted(grades, gradeWeights) : calculateTotalGradesUnweighted(grades);

                // if present, shade the group scores at the bottom and on the sidebar
                if (perCategoryPerformance && settings.SHADE_CATEGORIES) {
                    //shade the categories according to their relative performances
                    for (let categoryStatEntry in perCategoryPerformance) {
                        let relativePerformance = getRelativePerformance(perCategoryPerformance[categoryStatEntry]["personal"], perCategoryPerformance[categoryStatEntry]["maxPersonal"], perCategoryPerformance[categoryStatEntry]["average"]);
                        let color = getBlendedColor(relativePerformance, settings.BAD_COLOR, settings.GOOD_COLOR, settings.NEUTRAL_COLOR, settings.SENSITIVITY);
                        categories = tableBody.querySelectorAll(".hard_coded.group_total");
                        for (let i = 0; i < categories.length; i++) {
                            let categoryName = categories[i].getElementsByClassName("title")[0].innerHTML.trim();
                            if (categoryName && categoryName == categoryStatEntry) {
                                categories[i].style.background = color;
                            }
                        }
                    }
                }
            } else {

                [studentAvg, courseAvg] = calculateTotalGradesUnweighted(grades);
            }
            //console.log("Student average: " + studentAvg + " Course average: " + courseAvg);

            let relativePerformance = getRelativePerformance(studentAvg, 1, courseAvg);
            console.log("Relative performance: " + relativePerformance);
            let totalcourseColor = getBlendedColor(relativePerformance * 5, settings.BAD_COLOR, settings.GOOD_COLOR, settings.NEUTRAL_COLOR, settings.SENSITIVITY);
            console.log("Total course color: " + totalcourseColor);
            // create a div to store the grades
            let div = document.createElement("div");
            div.id = "gg-container";
            let style = document.createElement("style");
            style.textContent = css;
            document.head.appendChild(style);
            // Inject the HTML code
            div.innerHTML = `
        <div class="gg-top">
            <div class="gg-bar">
                <div class="gg-bar-title">Your score</div>
                <div class="gg-bar-progress" id="gg-personalBar-progress">
                    <div class="gg-bar-progress-bar" id="gg-personalBar-progress-bar"></div>
                </div>
                <div id="gg-personalBar-value" class="gg-bar-value">0%</div>
            </div>
            <div id="gg-background" class="gg-pic">
                <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAQAAABpN6lAAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAJcEhZcwAADsIAAA7CARUoSoAAAAAHdElNRQfnBRkHGiiis1JbAAADeElEQVR42u2cSZbDIAxEY7/c/8ruVV4mDBqqKJyW1oGSPsLM2Y7b/7Zd7YDaCoDaAbUVALUDaisAagfUVgDUDqitAKgdUFsBUDugtgKgdkBtBUDtgNoKgNoBtRUAtQNqKwBqB9R2Z1W8nRw4HBsznLZqT3PDH4yMq2RAiKpCAdgrwyLI6MIAeCtCIcjqQr4BhH40TTddR7yCXA6gdJMZoGl7pGqirrwbkRxABP+qG84A27CDzhDrYGfXDQHQjPRj3YhqYCrsCR8JwhO+XdedAYxWyOvGVZ0Z8GvhOwH8XvguAJHwe2WsjqPDfy9hBrBm6+dLGQHgw7eV4GM3AVh1sRMJ/7OMAQBj2mMpMafTDQFccdZ3Xva71ABALvnj+4KcTtfSTe8KM9Kfk3XtMl0AjHZYqfUHACyOeHsiJvx+LT5d2sEIL3ys7t1TkT8g328VXY52MnRsz3CwwfdrA+mi2x8VPFb3djvJgJlTX9U0uwvAYvl2iIWOnnc2ALDbRN3mQwArh45fd0wCoGz1d+3h4ajNVXtLWMcTBqJWndsBPRtEha9RJgNA5xI++AYAXCL6wsfB8kZAWgypWt/fgCEAI8e9bqDyLlLPnq0g7gb3wlwIwLUt1u3gAHjtz8mYAIDJ9y6NFlX+kS4QB78jKvGb6npUF0DekVXPEJ/mPhn6fXsBkP3KXvGqdDAD2stMZFDzdAVdINP+n+HmsQcBvAtvxxXuDBsORz1t8wx6bvBo3dSGyPrD3timfwNaWTZjXRg4Hp9puqXxB4A11uhCAGw7B8xF77ggEXdElT3T7gqzw4/VkNVtAIjs1djK4HMkr7t7CzDD8uoilE+6gL1q7C/n6+6xYo/fvP4KMz/z6+asMxXun9l6XfC0mO+ZRQ78YC3QgsAf7s7Q4y7ImgHYZbkPW3i2yFogblnwruXwQ4zX/+ebGcAr6c9rJvNuluFnKMY3Q/i9OE/wTzWPHzZY4TdD9n1A7B8loNGn3gzxEz++EY55lml6vMJ52GqpFfEuNf1khpMFo1q3AxM+fR7AGwAx4ZMBaMZ/n2oXQC6AK4Q/zADVDmG0tL/csAtoduo4K7+WGT/inm/9zD9Oyes6FFQ3v7m6oWH8u9CMDx7nLxrXesAjsMtviBSAAlAACkABKAAFoAAUgAJQAApAASgABaAAFIACUAAKgMf+AGCAZyZJBq9xAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDIzLTA1LTI1VDA3OjI2OjQwKzA5OjAwdEiFdwAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyMy0wNS0yNVQwNzoyNjo0MCswOTowMAUVPcsAAAAASUVORK5CYII=" alt="GradeGrubber">
            </div>
            <div class="gg-bar">
                <div class="gg-bar-title">Class Average</div>
                <div class="gg-bar-progress" id="gg-courseBar-progress">
                    <div class="gg-bar-progress-bar" id="gg-courseBar-progress-bar"></div>
                </div>
                <div id="gg-courseBar-value" class="gg-bar-value">0%</div>
            </div>
        </div>
        <div id="gg-readout">

        </div>
        `;

            // display this immediately after the div with the ID "GradeSummarySelectMenuGroup"
            let parent = document.getElementById("GradeSummarySelectMenuGroup").parentNode;
            parent.insertBefore(div, parent.childNodes[3]);

            // thematic styling
            studentAvg *= 100;
            courseAvg *= 100;
            let personalScoreBar = document.querySelector("#gg-personalBar-progress-bar");
            personalScoreBar.style.backgroundColor = settings.GOOD_COLOR;
            let courseScoreBar = document.querySelector("#gg-courseBar-progress-bar");
            courseScoreBar.style.backgroundColor = settings.GOOD_COLOR;
            let ggLogoBackground = document.querySelector("#gg-background");
            ggLogoBackground.style.backgroundColor = totalcourseColor;
            document.querySelector("#gg-readout").innerHTML = "<p>Your grade is <b>" + Math.abs(studentAvg - courseAvg).toFixed(2) + "% " + (studentAvg > courseAvg ? "higher" : "lower") + "</b> than the class average. " + getCallToAction(studentAvg, courseAvg) + "</p>";
            setbarValue("personalBar", studentAvg.toFixed(2));
            setbarValue("courseBar", courseAvg.toFixed(2));
        }

    });
});

//==================================================================================================
// UTILITY FUNCTIONS
//==================================================================================================

// parses a row of the gradebook and returns its type. skips rows that it can't parse
function parseRow(row) {
    let rowType = "skip";
    if (row.classList.contains("student_assignment") && row.classList.contains("assignment_graded")) {
        rowType = "assignment";
        //console.log("assignment row detected");
    } else if (row.classList.contains("comments") && row.classList.contains("grade_details") && row.classList.contains("assignment_graded")) {
        // some graded assignments don't have statistics, their details rows have no children
        if (!row.children.length == 0) {
            rowType = "statistics";
            //console.log("statistics row detected");
        }
    }
    return rowType;
}

function extractAssignmentName(row) {
    try {

        return row.getElementsByTagName("th")[0].getElementsByTagName("a")[0].innerHTML;
    } catch (e) {
        console.log("Failed to extract assignment name: " + e);
        return "Uknown Assignment";
    }
}

// get assignment type
function extractAssignmentType(row) {
    try {
        return row.getElementsByTagName("th")[0].getElementsByTagName("div")[0].innerHTML;
    } catch (e) {
        console.log("Failed to extract assignment type: " + e);
        return "Uknown Type";
    }
}

// get score and max score
function extractAssignmentScores(row) {
    try {
        let score = row.querySelector(".grade").lastChild.textContent.trim();
        //if the score has a %, its out of 100
        if (score.includes("%")) {
            score = score.replace(/[^0-9.]/g, "");
            score = parseFloat(score);
            maxScore = 100;
        } else {
            // normal score retrieval
            let spans = Array.from(row.querySelector(".tooltip").getElementsByTagName("span"));
            //console.log("debug" + spans.innerHTML);
            maxScore = spans.filter(span => span.classList.length === 0)[0].textContent.replace(/[^0-9.]/g, "");
        }
        // return the score and max score as an array
        return [parseFloat(score), parseFloat(maxScore)];
    }
    catch (e) {
        console.log("Failed to extract assignment score: " + e);
        return [0, 0];
    }
}

// get mean and median 
function extractMean(row) {
    try {
        meanMedian = row.querySelector("tbody").querySelector("td").innerHTML;
        //split by whitespace
        pieces = meanMedian.split(/\s+/);
        //get the element after the "Mean:" string
        meanValue = pieces[pieces.indexOf("Mean:") + 1].trim();
        return parseFloat(meanValue);
    } catch (e) {
        console.log("Failed to extract mean: " + e);
        return 0;
    }
}

// extract the grade weights from the sidebar
function extractGradeWeights() {
    try {
        gradeWeightsList = document.getElementById("assignments-not-weighted").querySelector("tbody");
        //iterate through all children except the last, which is just a "total" row
        gradeWeights = {};
        for (let i = 0; i < gradeWeightsList.children.length - 1; i++) {
            //key each weight by the assignment type name, strip % and convert to decimal
            let fraction = gradeWeightsList.children[i].children[1].innerHTML;
            fraction = parseFloat(fraction.substring(0, fraction.length - 1)) / 100;
            gradeWeights[gradeWeightsList.children[i].children[0].innerHTML] = fraction;
        }
        return gradeWeights;
    } catch (e) {
        console.log("Failed to extract grade weights: " + e);
        return null;
    }
}

// get the student and class averages using supplied weights
function calculateTotalGradesWeighted(grades, weights) {
    // Initializing an empty object to hold the personal and average scores for each assignment type
    let typeScores = {}
    let usedWeights = {}

    for (let weight in weights) {
        typeScores[weight] = { personal: 0, average: 0, maxPersonal: 0, maxAverage: 0 };
    }

    // Iterating over the grades object
    for (let assignment in grades) {
        let info = grades[assignment];
        // Adding the personal grade, average grade, max personal grade, and max average grade to the appropriate type in the typeScores object
        typeScores[info.type].personal += info.grade;
        typeScores[info.type].average += info.averageGrade;
        typeScores[info.type].maxPersonal += info.maxGrade;
        typeScores[info.type].maxAverage += info.maxGrade;

        // Save the weights of the used types
        usedWeights[info.type] = weights[info.type];
    }

    // Calculate the sum of used weights
    let sumWeights = Object.values(usedWeights).reduce((a, b) => a + b, 0);

    // Normalizing the used weights so they add up to 1
    for (let type in usedWeights) {
        usedWeights[type] = usedWeights[type] / sumWeights;
    }

    // // Printing out the per-category average
    // for (let type in typeScores) {
    //     if (typeScores[type].maxPersonal > 0 && typeScores[type].maxAverage > 0) {
    //         let personalAverage = typeScores[type].personal / typeScores[type].maxPersonal;
    //         let classAverage = typeScores[type].average / typeScores[type].maxAverage;
    //         console.log(`Category: ${type}, Student Average: ${personalAverage}, Class Average: ${classAverage}`);
    //     }
    // }

    // Calculating the total personal and average scores
    let personalScore = 0, averageScore = 0;
    for (let type in typeScores) {
        if (typeScores[type].maxPersonal > 0) {  // Making sure not to divide by zero
            // Adding the weighted personal score to the total personal score
            personalScore += (typeScores[type].personal / typeScores[type].maxPersonal) * usedWeights[type];
        }
        if (typeScores[type].maxAverage > 0) {  // Making sure not to divide by zero
            // Adding the weighted average score to the total average score
            averageScore += (typeScores[type].average / typeScores[type].maxAverage) * usedWeights[type];
        }
    }

    return [personalScore, averageScore, typeScores];
}


// get the student and class avergaes with total points method
function calculateTotalGradesUnweighted(grades) {
    console.log("Calculating total grades unweighted");
    let totalGrade = 0.0;
    let totalMaxGrade = 0.0;
    let totalAverageGrade = 0.0;
    for (let assignment in grades) {
        totalGrade += grades[assignment]["grade"];
        totalMaxGrade += grades[assignment]["maxGrade"];
        totalAverageGrade += grades[assignment]["averageGrade"];
    }
    // calculate the average student score using total points
    let studentAverageGrade = totalGrade / totalMaxGrade;
    let classAverageGrade = totalAverageGrade / totalMaxGrade;

    return [studentAverageGrade, classAverageGrade];
}

// allows any string to be converted to an RGB array
String.prototype.convertToRGB = function () {
    if (this.length != 6) {
        throw "Only six-digit hex colors are allowed.";
    }

    let aRgbHex = this.match(/.{1,2}/g);
    let aRgb = [
        parseInt(aRgbHex[0], 16),
        parseInt(aRgbHex[1], 16),
        parseInt(aRgbHex[2], 16)
    ];
    return aRgb;
}

function RGBComponentToHex(c) {
    let hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

// given a relative performance and some tuning parameters, returns a color code for this performance
function getBlendedColor(relPerf, badColor, goodColor, neutralColor, sens) {
    //clamp relperf to [-1, 1]
    relPerf = Math.max(-1, Math.min(1, relPerf));

    //strip the leading # if it's there
    badColor = badColor.replace('#', '');
    goodColor = goodColor.replace('#', '');
    neutralColor = neutralColor.replace('#', '');
    BCrgb = badColor.convertToRGB(); // however these are lists, not objects
    GCrgb = goodColor.convertToRGB();
    NCrgb = neutralColor.convertToRGB();

    // convert to objects
    badColor = { r: BCrgb[0], g: BCrgb[1], b: BCrgb[2] };
    goodColor = { r: GCrgb[0], g: GCrgb[1], b: GCrgb[2] };
    neutralColor = { r: NCrgb[0], g: NCrgb[1], b: NCrgb[2] };

    let interpolatedComponents;
    if (relPerf < 0) {
        // Interpolate between badColor and white
        interpolatedComponents = {
            r: Math.round(Math.max(0, Math.min(255, (1 + relPerf * sens) * neutralColor.r + (-relPerf * sens) * badColor.r))),
            g: Math.round(Math.max(0, Math.min(255, (1 + relPerf * sens) * neutralColor.g + (-relPerf * sens) * badColor.g))),
            b: Math.round(Math.max(0, Math.min(255, (1 + relPerf * sens) * neutralColor.b + (-relPerf * sens) * badColor.b))),
        };
    } else {
        // Interpolate between white and goodColor
        interpolatedComponents = {
            r: Math.round(Math.max(0, Math.min(255, (1 - relPerf * sens) * neutralColor.r + relPerf * sens * goodColor.r))),
            g: Math.round(Math.max(0, Math.min(255, (1 - relPerf * sens) * neutralColor.g + relPerf * sens * goodColor.g))),
            b: Math.round(Math.max(0, Math.min(255, (1 - relPerf * sens) * neutralColor.b + relPerf * sens * goodColor.b))),
        };
    }

    //convert the color to a 6 digit hex string
    let color = "#" + RGBComponentToHex(interpolatedComponents.r) + RGBComponentToHex(interpolatedComponents.g) + RGBComponentToHex(interpolatedComponents.b);
    return color;
}


function getRelativePerformance(userGrade, maxGrade, averageGrade) {
    //console.log("userGrade: " + userGrade + " maxGrade: " + maxGrade + " averageGrade: " + averageGrade)
    return (userGrade - averageGrade) / maxGrade;
}

function setbarValue(barId, value) {
    let progressBarElement = document.getElementById("gg-" + barId + "-progress-bar");
    let valueElement = document.getElementById("gg-" + barId + "-value");

    progressBarElement.style.width = value + "%";
    valueElement.textContent = value + "%";
}

function getCallToAction(studentGrade, courseGrade) {
    // retrieve an encouraging, congratulatory, or neutral statement about the student's performance
    let dif = studentGrade - courseGrade;
    // Array of good statements
    let goodStatements = [
        "You're doing great! Keep up the good work!",
        "Excellent job! You're making fantastic progress!",
        "Congratulations on your outstanding performance!",
        "You're excelling in the course. Well done!",
        "Impressive work! Your hard work is paying off!"
    ];

    // Array of bad statements
    let badStatements = [
        "Don't worry, you're making progress. Keep going!",
        "Challenges are a part of learning. Keep pushing forward!",
        "You've got this! Stay motivated and you'll improve!",
        "Don't be discouraged. Every step counts towards improvement!",
        "Stay determined. Your effort will lead to better results!"
    ];

    // Array of neutral statements
    let neutralStatements = [
        "Keep working hard and you'll see progress!",
        "Stay focused and continue putting in your best effort.",
        "Keep up the consistent effort. It will pay off!",
        "You're on the right track. Stay committed to your goals!",
        "Maintain a positive attitude and keep striving for success."
    ];
    if (dif > 0.03) {
        //3% above average or higher
        return goodStatements[goodStatements.length * Math.random() | 0];
    } else if (dif < -0.03) {
        //3% below average or lower
        return badStatements[badStatements.length * Math.random() | 0];
    } else {
        //within 3% of average
        return neutralStatements[neutralStatements.length * Math.random() | 0];
    }
}

// Manifest V3 makes this a hassle (and ugly)

let css = `
#gg-container {
    border: 1px solid #bfbfbf;
    border-radius: 4px;
    margin: 10px;
    padding: 10px;
}

.gg-top {
    display: flex;
    flex-direction: row;
    justify-content: space-around;
}

.gg-bar {
    width: 200px;
}

.gg-bar-title {
    text-align: center;
    margin-bottom: 10px;
}

.gg-bar-progress {
    background-color: #bfbfbf;
    border-radius: 4px;
    height: 20px;
}

.gg-bar-progress-bar {
    height: 100%;
    background-color: green;
    width: 0;
    transition: width 0.5s ease-in-out;
}

.gg-bar-value {
    text-align: center;
    font-size: 16px;
    margin-top: 4px;
    font-weight: bold;
}

.gg-top .gg-pic {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 75px;
    height: 75px;
    overflow: hidden;
    border-radius: 50%;
    border: 2px solid #000;
    /* Change the color and size as desired */
    box-sizing: border-box;
    position: relative;
}

.gg-pic img {
    width: 90%;
    height: 90%;
    object-fit: cover;
    object-position: center center;
    border-radius: 50%;
}


`