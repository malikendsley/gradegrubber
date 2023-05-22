// This script is injected into the CourseWorks grades page and is responsible for pulling the grades from the page.

//==================================================================================================
// UTILITY FUNCTIONS (Same scope to avoid using the messaging API for them)
//==================================================================================================
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

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
  }

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
    let color = "#" + componentToHex(interpolatedComponents.r) + componentToHex(interpolatedComponents.g) + componentToHex(interpolatedComponents.b);
    return color;
}

function getRelativePerformance(userGrade, maxGrade, averageGrade) {
    console.log("userGrade: " + userGrade + " maxGrade: " + maxGrade + " averageGrade: " + averageGrade)
    return (userGrade - averageGrade) / maxGrade;
}

//==================================================================================================
// MAIN CODE
//==================================================================================================


window.addEventListener("load", () => {

    // dump the contents of chrome's storage (it only contains the settings)
    chrome.storage.sync.get(null, function (retrievedSettings) {
        console.log(retrievedSettings);

        if (!retrievedSettings.EXTENSION_ENABLED) {
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

            //format {"assignmentName": {"grade": float, "maxGrade": float, "averageGrade": float, "type": "whatever the type is"}}
            var grades = {};

            // iterate through each row
            // each assignment if graded has a following row with the mean
            // find each assignment, then try to find the row containing the mean
            // if another assignment is found, then the stats row is skipped
            let curMode = "skip";
            let assignmentCount = 0;
            let curAssignment = "";
            let curAssignmentRow;
            //console.log("Rows: " + rows.length)
            for (let i = 0; i < rows.length; i++) {
                // figure out what kind of row we're looking at
                let rowType = "skip";
                if (rows[i].classList.contains("student_assignment") && rows[i].classList.contains("assignment_graded")) {
                    rowType = "assignment";
                    assignmentCount++;
                } else if (rows[i].classList.contains("comments") && rows[i].classList.contains("grade_details") && rows[i].classList.contains("assignment_graded")) {
                    // some graded assignments don't have statistics, their details rows have no children
                    if (!rows[i].children.length == 0) {
                        rowType = "statistics";
                    }
                }
                if (rowType != "skip") {
                    console.log("Row " + i + ": " + rowType + (rowType == "assignment" ? " (" + assignmentCount + ")" : ""));
                }

                // error case(s)
                if (curMode == "statistics" && rowType == "statistics") {
                    // error
                    console.log("Error: two statistics rows in a row, this may indicate a courseworks update");
                    return;
                }

                // normal case(s)
                if (rowType == "assignment") {
                    // retrieve data
                    let assignmentName = rows[i].getElementsByTagName("th")[0].getElementsByTagName("a")[0].innerHTML;
                    //console.log("Assignment: " + assignmentName);
                    let assignmentType = rows[i].getElementsByTagName("th")[0].getElementsByTagName("div")[0].innerHTML;
                    let score = rows[i].querySelector(".grade").lastChild.textContent.trim();
                    //if the score contains a % sign, then its a special form of grade, so don't check the maxScore (we know its 100)
                    let maxScore;
                    if (score.includes("%")) {
                        // special case for percentage grades
                        //console.log("Percentage grade detected");
                        score = score.replace(/[^0-9.]/g, "");
                        score = parseFloat(score);
                        maxScore = 100;
                    } else {
                        // normal score retrieval
                        let spans = Array.from(rows[i].querySelector(".tooltip").getElementsByTagName("span"));
                        //console.log("debug" + spans.innerHTML);
                        maxScore = spans.filter(span => span.classList.length === 0)[0].textContent.replace(/[^0-9.]/g, "");
                    }
                    // create a new assignment object, null the averageGrade in case there is no statistics row
                    grades[assignmentName] = { "grade": score, "maxGrade": maxScore, "averageGrade": null, "type": assignmentType };
                    curAssignment = assignmentName;
                    //console.log(assignmentName + ": " + score + " / " + maxScore);
                    curAssignmentRow = rows[i];
                } else if (rowType == "statistics") {
                    // retrieve the average score from the row
                    meanMedian = rows[i].querySelector("tbody").querySelector("td").innerHTML;
                    //split by whitespace
                    pieces = meanMedian.split(/\s+/);
                    //get the element after the "Mean:" string
                    meanValue = pieces[pieces.indexOf("Mean:") + 1].trim();
                    // update the last assignment object, the key is curAssignment
                    grades[curAssignment]["averageGrade"] = meanValue;

                    // once you have the stats for the row, you can shade it
                    // get the relative performance of the user
                    let relativePerformance = getRelativePerformance(grades[curAssignment]["grade"], grades[curAssignment]["maxGrade"], grades[curAssignment]["averageGrade"]);
                    console.log("Relative performance for " + curAssignment + ": " + relativePerformance);
                    // find the olor to shade the row
                    GC = retrievedSettings.GOOD_COLOR;
                    BC = retrievedSettings.BAD_COLOR;
                    NC = retrievedSettings.NEUTRAL_COLOR;
                    sens = retrievedSettings.SENSITIVITY;
                    console.log("Colors (G, B, N): " + GC + ", " + BC + ", " + NC + ", sens: " + sens);
                    let color = getBlendedColor(relativePerformance, BC, GC, NC, sens);
                    console.log("Setting color to " + color + " for " + curAssignment);
                    rows[i].style.backgroundColor = color; 
                    if(curAssignmentRow){
                        curAssignmentRow.style.backgroundColor = color;
                    }
                } else {
                    // skip row
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