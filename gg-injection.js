// This script is injected into the CourseWorks grades page and is responsible for pulling the grades from the page.

//==================================================================================================
// MAIN CODE
//==================================================================================================


window.addEventListener("load", () => {

    // dump the contents of chrome's storage (it only contains the settings)
    chrome.storage.sync.get(null, function (settings) {
        console.log(settings);

        if (!settings.EXTENSION_ENABLED) {
            console.log("Extension disabled");
            return;
        } else {
            // check if the URL contains "grades" and "courseworks2"
            var url = window.location.href;
            if (!(url.includes("grades") && url.includes("courseworks2"))) {
                console.log("Not on grades page");
                return;
            }

            // retrieve table, drill down to the body, and then the rows
            var table = document.getElementById("grades_summary");
            var tableBody = table.getElementsByTagName("tbody")[0];
            var rows = tableBody.getElementsByTagName("tr");

            //format {"assignmentName": {"grade": float, "maxGrade": float, "averageGrade": float, "type": string}}
            var grades = {};

            // iterate through each row
            // match together assignments with their statistics rows, if they exist
            // shade rows with complete data
            let curMode = "skip";
            let curAssignment = "";
            let curAssignmentRow;
            //console.log("Rows: " + rows.length)
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
                    let [ score, maxScore ] = extractAssignmentScores(curRow);
                    // create a new assignment object, null the averageGrade in case there is no statistics row
                    grades[assignmentName] = { "grade": score, "maxGrade": maxScore, "averageGrade": null, "type": assignmentType };
                    curAssignment = assignmentName;
                    curAssignmentRow = curRow;
                } else if (rowType == "statistics") {
                    // update the last assignment object, the key is curAssignment
                    grades[curAssignment]["averageGrade"] = extractMean(curRow);

                    // once you have the stats for the row, you can shade it
                    let relativePerformance = getRelativePerformance(grades[curAssignment]["grade"], grades[curAssignment]["maxGrade"], grades[curAssignment]["averageGrade"]);
                    let color = getBlendedColor(relativePerformance, settings.BAD_COLOR, settings.GOOD_COLOR, settings.NEUTRAL_COLOR, settings.SENSITIVITY);

                    curRow.style.backgroundColor = color;
                    if (curAssignmentRow) {
                        curAssignmentRow.style.backgroundColor = color;
                    }
                }
                curMode = rowType;
            }
        }

        //scrape for the grading weights

        //calculate the average course score using the weights
        //calculate the average student score using the weights
        //calculate the relative performance of the student overall, shading accordingly

        // display this as plaintext immediately after the div with the ID "GradeSummarySelectMenuGroup"
        // create a div to store the grades
        var div = document.createElement("div");
        div.id = "gradegrubber-result";
        div.style = "padding: 10px; margin: 10px; border: 1px solid black; border-radius: 5px; background-color: #f2f2f2;";
        // put the result in plaintext in the div
        console.log(grades);
        div.innerHTML = JSON.stringify(grades);
        // insert the div after the div with the ID "GradeSummarySelectMenuGroup"
        var parent = document.getElementById("GradeSummarySelectMenuGroup").parentNode;
        parent.insertBefore(div, parent.childNodes[3]);
        // display the image at https://cdn.britannica.com/39/7139-050-A88818BB/Himalayan-chocolate-point.jpg as a test
        div.innerHTML += "<img src='https://cdn.britannica.com/39/7139-050-A88818BB/Himalayan-chocolate-point.jpg' alt='cat' width='200' height='200'>";
    });
});
  
//==================================================================================================
// UTILITY FUNCTIONS (Same scope to avoid using the messaging API for them)
//==================================================================================================

// parses a row of the gradebook and returns its type. skips rows that it can't parse
function parseRow(row) {
    let rowType = "skip";
    if (row.classList.contains("student_assignment") && row.classList.contains("assignment_graded")) {
        rowType = "assignment";
    } else if (row.classList.contains("comments") && row.classList.contains("grade_details") && row.classList.contains("assignment_graded")) {
        // some graded assignments don't have statistics, their details rows have no children
        if (!row.children.length == 0) {
            rowType = "statistics";
        }
    }
    console.log(rowType + " detected");
    return rowType;
}

function extractAssignmentName(row) {
    try {
        return row.getElementsByTagName("th")[0].getElementsByTagName("a")[0].innerHTML;
    } catch (e) {
        console.log("Failed to extract assignment name");
        return "Uknown Assignment";
    }
}

// get assignment type
function extractAssignmentType(row) {
    try {
        return row.getElementsByTagName("th")[0].getElementsByTagName("div")[0].innerHTML;
    } catch (e) {
        console.log("Failed to extract assignment type");
        return "Uknown Assignment";
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
        return [score, maxScore];
    }
    catch (e) {
        console.log("Failed to extract assignment score");
        console.log(e);
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
        return meanValue;
    } catch (e) {
        console.log("Failed to extract mean");
        return 0;
    }
}

// allows any string to be converted to an RGB array
String.prototype.convertToRGB = function () {
    if (this.length != 6) {
        throw "Only six-digit hex colors are allowed.";
    }

    var aRgbHex = this.match(/.{1,2}/g);
    var aRgb = [
        parseInt(aRgbHex[0], 16),
        parseInt(aRgbHex[1], 16),
        parseInt(aRgbHex[2], 16)
    ];
    return aRgb;
}

function RGBComponentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

// given a relative performance and some tuning parameters, returns a color code for this performance
function getBlendedColor(relPerf, badColor, goodColor, neutralColor, sens) {
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
            r: Math.round((1 + relPerf * sens) * neutralColor.r + (-relPerf * sens) * badColor.r),
            g: Math.round((1 + relPerf * sens) * neutralColor.g + (-relPerf * sens) * badColor.g),
            b: Math.round((1 + relPerf * sens) * neutralColor.b + (-relPerf * sens) * badColor.b),
        };
    } else {
        // Interpolate between white and goodColor
        interpolatedComponents = {
            r: Math.round((1 - relPerf * sens) * neutralColor.r + relPerf * sens * goodColor.r),
            g: Math.round((1 - relPerf * sens) * neutralColor.g + relPerf * sens * goodColor.g),
            b: Math.round((1 - relPerf * sens) * neutralColor.b + relPerf * sens * goodColor.b),
        };
    }

    //convert the color to a 6 digit hex string
    let color = "#" + RGBComponentToHex(interpolatedComponents.r) + RGBComponentToHex(interpolatedComponents.g) + RGBComponentToHex(interpolatedComponents.b);
    return color;
}

function getRelativePerformance(userGrade, maxGrade, averageGrade) {
    console.log("userGrade: " + userGrade + " maxGrade: " + maxGrade + " averageGrade: " + averageGrade)
    return (userGrade - averageGrade) / maxGrade;
}
