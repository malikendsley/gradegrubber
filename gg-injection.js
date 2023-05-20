// This script is injected into the CourseWorks grades page and is responsible for pulling the grades from the page.

//==================================================================================================
// UTILITY FUNCTIONS (Same scope to avoid using the messaging API for them)
//==================================================================================================
function getBlendedColor(relativePerformance, badColor, goodColor, neutral) {

    let blendedColor;

    if (relativePerformance < 0) {
        // Interpolate between badColor and white
        blendedColor = {
            r: Math.round((1 + relativePerformance) * badColor.r + (-relativePerformance) * neutral.r),
            g: Math.round((1 + relativePerformance) * badColor.g + (-relativePerformance) * neutral.g),
            b: Math.round((1 + relativePerformance) * badColor.b + (-relativePerformance) * neutral.b)
        };
    } else {
        // Interpolate between white and goodColor
        blendedColor = {
            r: Math.round((1 - relativePerformance) * neutral.r + relativePerformance * goodColor.r),
            g: Math.round((1 - relativePerformance) * neutral.g + relativePerformance * goodColor.g),
            b: Math.round((1 - relativePerformance) * neutral.b + relativePerformance * goodColor.b)
        };
    }

    return blendedColor;
}

function getRelativePerformance(userGrade, maxGrade, averageGrade) {

    //get the performance relative to the average, as a number between -1 and 1
    // -1 is the worst, 0 is average, 1 is the best
    // the worst score is achieved when the user has 0 and the average is maxGrade
    // the best score is achieved when the user has maxGrade and the average is 0
    // this is extracted to a function in case we want to change the formula later
    return (userGrade - averageGrade) / (maxGrade - averageGrade);
}

//==================================================================================================
// MAIN CODE
//==================================================================================================

// retrieve the table from the page with the ID "grades_summary"
window.addEventListener("load", () => {

    // dump the contents of chrome's storage (it only contains the settings)
    chrome.storage.sync.get(null, function (result) {
        console.log(result);

        if (!result.EXTENSION_ENABLED) {
            console.log("Extension disabled");
            return;
        } else {
            // check if the URL contains "grades" and "courseworks2"
            var url = window.location.href;
            if (!(url.includes("grades") && url.includes("courseworks2"))) {
                TODO: //store a variable in local storage that says we're not on the grades page for the UI to read
                console.log("Not on grades page");
                return;
            }

            // retrieve table, drill down to the body, and then the rows
            var table = document.getElementById("grades_summary");
            var tableBody = table.getElementsByTagName("tbody")[0];
            var rows = tableBody.getElementsByTagName("tr");

            //format {"assignmentName": "grade"}
            var grades = {};

            // iterate through each row
            for (let i = 0; i < rows.length; i++) {
                // only pull the rows containing the class "student_assignment"
                if (rows[i].classList.contains("student_assignment") && rows[i].classList.contains("assignment_graded")) {
                    //print "reading row" followed by the row to string
                    // the assignment name is in a div inside the th tag
                    let assignmentName = rows[i].getElementsByTagName("th")[0].getElementsByTagName("a")[0].innerHTML;
                    //console.log("assignment name: " + assignmentName);
                    // retrieve the score and the max score from the row
                    let score = rows[i].getElementsByTagName("td")[2].querySelector(".grade").lastChild.textContent.trim();
                    console.log("score: " + score);
                    // this is the selector path: td.assignment_score > div > span > span:nth-child(2)
                    let outOf = rows[i].getElementsByTagName("td")[2].querySelector(".tooltip > span:last-child").textContent;
                    console.log("out of: " + outOf);
                    // filter for just numbers
                    outOf = outOf.replace(/[^0-9.]/g, "");
                    // combine the score and outof into a string of the format "score / outOf"
                    let grade = score + " / " + outOf;
                    // add the assignment name and grade to the dictionary
                    grades[assignmentName.toString()] = grade;
                }
            }

            // display this as plaintext immediately after the div with the ID "GradeSummarySelectMenuGroup"
            // create a div to store the grades
            var div = document.createElement("div");
            div.id = "gradegrubber-result";
            div.style = "padding: 10px; margin: 10px; border: 1px solid black; border-radius: 5px; background-color: #f2f2f2;";
            // put the result in plaintext in the div
            div.innerHTML = JSON.stringify(grades);
            // insert the div after the div with the ID "GradeSummarySelectMenuGroup"
            var parent = document.getElementById("GradeSummarySelectMenuGroup").parentNode;
            parent.insertBefore(div, parent.childNodes[3]);
            // display the image at https://cdn.britannica.com/39/7139-050-A88818BB/Himalayan-chocolate-point.jpg as a test
            div.innerHTML += "<img src='https://cdn.britannica.com/39/7139-050-A88818BB/Himalayan-chocolate-point.jpg' alt='cat' width='200' height='200'>";
        }
    });
});