// 1. Interpret the URL
function parseURL() {
    let diceExpression = new URLSearchParams(window.location.search).get('dice');
    diceExpression = diceExpression.replace(/ /g, '+');
    return diceExpression ? diceExpression.split('v') : [];
}

// Helper function to generate outcomes for a dice expression (like 2d6)
function generateOutcomes(diceCount, sides) {
    if (diceCount === 1) {
        return Array.from({ length: sides }, (_, i) => i + 1);
    }

    const smallerRolls = generateOutcomes(diceCount - 1, sides);
    const outcomes = [];

    for (let i = 1; i <= sides; i++) {
        for (const smallerRoll of smallerRolls) {
            outcomes.push(i + smallerRoll);
        }
    }

    return outcomes;
}

function generateStats(diceExpression) {
    const segments = diceExpression.split(/(\+|\-)/);
    let combinedOutcomes = [0];  // start with 0 as a base outcome for adding other outcomes

    let i = 0; // Index for looping
    while (i < segments.length) {
        let operator = "+"; // Default operator is '+'
        let segment = segments[i];
        
        // Check if the current segment is an operator
        if (segment === "+" || segment === "-") {
            operator = segment;
            i++;
            segment = segments[i];
        }
    
        const match = segment.match(/^(\d*)d(\d+)$/);
        if (match) {
            const diceCount = parseInt(match[1] || "1"); // Default to 1 if no count is given
            const sides = parseInt(match[2]);
    
            const newOutcomes = generateOutcomes(diceCount, sides);
            const tempOutcomes = [];
    
            for (const baseOutcome of combinedOutcomes) {
                for (const newOutcome of newOutcomes) {
                    if (operator === "+") {
                        tempOutcomes.push(baseOutcome + newOutcome);
                    } else {
                        tempOutcomes.push(baseOutcome - newOutcome);
                    }
                }
            }
            
            combinedOutcomes = tempOutcomes;
        } else {
            const modifier = parseInt(segment);
            if (operator === "+") {
                combinedOutcomes = combinedOutcomes.map(o => o + modifier);
            } else {
                combinedOutcomes = combinedOutcomes.map(o => o - modifier);
            }
        }
        
        i++; // Move to the next segment
    }    

    let outcomes = combinedOutcomes;
    console.log('outcomes:', outcomes);

    // Compute statistics
    const min = Math.min(...outcomes);
    const max = Math.max(...outcomes);
    const sum = outcomes.reduce((a, b) => a + b, 0);
    const mean = sum / outcomes.length;

    outcomes.sort((a, b) => a - b);
    const median = outcomes.length % 2 === 0 ? (outcomes[outcomes.length / 2 - 1] + outcomes[outcomes.length / 2]) / 2 : outcomes[(outcomes.length - 1) / 2];

    const frequency = {};
    let maxFreq = 0;
    let mode = [];
    outcomes.forEach(outcome => {
        frequency[outcome] = (frequency[outcome] || 0) + 1;
        if (frequency[outcome] > maxFreq) {
            maxFreq = frequency[outcome];
            mode = [outcome];
        } else if (frequency[outcome] === maxFreq) {
            mode.push(outcome);
        }
    });

    const variance = outcomes.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / outcomes.length;
    const standardDeviation = Math.sqrt(variance);

    return {
        stats: {
            min,
            max,
            mean: mean.toFixed(2),
            median,
            mode,
            standardDeviation: standardDeviation.toFixed(2)
        },
        combinedOutcomes: outcomes
    };
}

function drawBoxPlot(cell, stats, globalMin, globalMax) {
    const scale = cell.clientHeight / (globalMax - globalMin);

    const whisker = document.createElement('div');
    whisker.className = 'whisker';
    whisker.style.top = (globalMax - stats.max) * scale + 'px';
    whisker.style.height = (stats.max - stats.min) * scale + 'px';
    whisker.style.width = '10px';
    cell.appendChild(whisker);
    console.log("whisker:", whisker);

    const box = document.createElement('div');
    box.className = 'box';
    const calculatedTop = (globalMax - (parseFloat(stats.mean) + parseFloat(stats.standardDeviation))) * scale;
    console.log('Calculated Top:', calculatedTop);
    box.style.top = calculatedTop + 'px';
    box.style.height = 2 * stats.standardDeviation * scale + 'px';
    box.style.width = '20px';
    cell.appendChild(box);
    console.log("box:", box);

    const median = document.createElement('div');
    median.className = 'median';
    median.style.top = ((globalMax - stats.median) * scale) - 2 + 'px';
    median.style.height = '4px';
    median.style.width = '30px';
    cell.appendChild(median);
    console.log("median:", median);

    const mean = document.createElement('div');
    mean.className = 'mean';
    mean.style.top = ((globalMax - stats.mean) * scale) - 1 + 'px';
    mean.style.height = '2px';
    mean.style.width = '40px';
    cell.appendChild(mean);
    console.log("mean:", mean);
}

function drawChart(cell, outcomes, globalMin, globalMax) {
    console.log("cell:", cell);
    console.log("outcomes:", outcomes);
    console.log("globalMin:", globalMin);
    console.log("globalMax:", globalMax);
    // Create a canvas element inside the cell and set dimensions
    const canvas = document.createElement("canvas");
    canvas.width = 300;

    const numberOfRows = globalMax - globalMin + 1;
    canvas.height = (20 * numberOfRows) + 20;

    cell.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    // Count occurrences
    const occurrences = outcomes.reduce((acc, value) => {
        acc[value] = (acc[value] || 0) + 1;
        return acc;
    }, {});

    // Prepare the data ensuring every value from globalMin to globalMax is included
    const labels = Array.from({ length: globalMax - globalMin + 1 }, (_, i) => i + globalMin);
    const dataPoints = labels.map(label => occurrences[label] || 0);

    // Create the chart using the prepared data
    // console.log(config);
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Frequency',
                data: dataPoints,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            scales: {
                x: {
                    beginAtZero: true,
                    display: false, // hides the x-axis labels and line
                    grid: {
                        display: false // hides x-axis grid lines
                    }
                },
                y: {
                    min: globalMin,
                    max: globalMax,
                    reverse: true,
                    ticks: {
                        stepSize: 1,
                        reverse: true,
                        suggestedMin: globalMin,
                        suggestedMax: globalMax
                    },
                    grid: {
                        display: false // hides y-axis grid lines
                    }
                }
            }
        }
    });
}

function displayStats(stats1, stats2, expression1, expression2, combinedOutcomes1, combinedOutcomes2) {
    const tableBody = document.querySelector("#results tbody");
    tableBody.innerHTML = "";

    if (!stats1) {
        tableBody.innerHTML = "<tr><td colspan='3'>Invalid dice expression!</td></tr>";
        return;
    }

    // Creating a formatted expression row:
    function createExpressionRow(expr) {
        if (!expr) return "<td></td>"; // If no expression is provided
        return `<td>${expr.replace(/\+/g, ', +').trim()}</td>`;
    }

    // Adding the expression row at the top:
    tableBody.innerHTML = `
        <tr>
            <td>Roll</td>
            ${createExpressionRow(expression1)}
            ${createExpressionRow(expression2)}
        </tr>
    `;

    const statsLabels = ["Min", "Max", "Mean", "Median", "Mode", "Std Dev.", "Mean - SD", "Mean + SD"];
    const statsKeys = ["min", "max", "mean", "median", "mode", "standardDeviation", "", ""];

    for (let i = 0; i < statsLabels.length; i++) {
        const label = statsLabels[i];
        const key = statsKeys[i];
        
        let value1, value2;

        if (key) {
            value1 = stats1[key];
            if (stats2) value2 = stats2[key];
        } else {
            if (label === "Mean - SD") {
                value1 = (parseFloat(stats1.mean) - parseFloat(stats1.standardDeviation)).toFixed(2);
                if (stats2) value2 = (parseFloat(stats2.mean) - parseFloat(stats2.standardDeviation)).toFixed(2);
            } else if (label === "Mean + SD") {
                value1 = (parseFloat(stats1.mean) + parseFloat(stats1.standardDeviation)).toFixed(2);
                if (stats2) value2 = (parseFloat(stats2.mean) + parseFloat(stats2.standardDeviation)).toFixed(2);
            }
        }

        let rowHTML = `<tr><td>${label}</td><td>${value1}</td>`;

        if (stats2) {
            rowHTML += `<td>${value2}</td>`;
        } else {
            rowHTML += `<td></td>`;
        }

        rowHTML += `</tr>`;
        tableBody.innerHTML += rowHTML;
    }

    // Handle 'Mode' as it's an array
    const modeCell1 = tableBody.querySelector("tr:nth-child(6) td:nth-child(2)");
    if (modeCell1) modeCell1.textContent = stats1.mode.join(', ');

    if (stats2) {
        const modeCell2 = tableBody.querySelector("tr:nth-child(6) td:nth-child(3)");
        if (modeCell2) modeCell2.textContent = stats2.mode.join(', ');
    }
    
    let chartRowHTML = "<tr><td>Distribution</td>";
    chartRowHTML += '<td class="chartCell"></td>';
    
    if (stats2) {
        chartRowHTML += '<td class="chartCell"></td>';
    } else {
        chartRowHTML += '<td></td>'; 
    }
    
    chartRowHTML += "</tr>";
    tableBody.innerHTML += chartRowHTML;
   
    
    // Now, let's add the Box Plot row
    let boxPlotRowHTML = "<tr><td>Box Plot</td>";
    boxPlotRowHTML += '<td class="boxPlotCell"></td>';

    if (stats2) {
        boxPlotRowHTML += '<td class="boxPlotCell"></td>';
    } else {
        boxPlotRowHTML += '<td></td>'; 
    }

    boxPlotRowHTML += "</tr>";
    tableBody.innerHTML += boxPlotRowHTML;

    // Compute the global min and max
    const globalMin = Math.min(stats1.min, stats2 ? stats2.min : Infinity);
    const globalMax = Math.max(stats1.max, stats2 ? stats2.max : -Infinity);

    // Drawing box plots:
    const boxPlotCells = document.querySelectorAll(".boxPlotCell");
    drawBoxPlot(boxPlotCells[0], stats1, globalMin, globalMax);

    if (stats2) {
        drawBoxPlot(boxPlotCells[1], stats2, globalMin, globalMax);
    }

    const chartCells = document.querySelectorAll(".chartCell");
    drawChart(chartCells[0], combinedOutcomes1, globalMin, globalMax); // Assuming combinedOutcomes1 contains the outcomes for stats1
    
    if (stats2) {
        drawChart(chartCells[1], combinedOutcomes2, globalMin, globalMax); // Similarly for stats2
    }
    
}

// Main execution
const diceExpressions = parseURL();
console.log("diceExpressions:", diceExpressions);
if (diceExpressions.length) {
    const result1 = generateStats(diceExpressions[0]);
    const stats1 = result1.stats;
    const combinedOutcomes1 = result1.combinedOutcomes;

    const result2 = diceExpressions[1] ? generateStats(diceExpressions[1]) : null;
    const stats2 = result2.stats;
    const combinedOutcomes2 = diceExpressions[1] ? result2.combinedOutcomes : null;

    // let stats1 = generateStats(diceExpressions[0]);
    // let stats2 = diceExpressions[1] ? generateStats(diceExpressions[1]) : null;
    displayStats(stats1, stats2, diceExpressions[0], diceExpressions[1], combinedOutcomes1, combinedOutcomes2);
}
