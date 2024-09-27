let dataset = [];
let centroidsList = [];
let clusterGroups = [];

function resetter() {
    function clearArrays() {
        dataset.length = 0;
        centroidsList.length = 0;
        clusterGroups.length = 0;
    }
    clearArrays();
    renderPlot(dataset, clusterGroups, centroidsList);
}
function generator() {fetch('/generator', {method: 'POST'}).then(res => res.json()).then(data => {dataset = data;renderPlot(dataset, clusterGroups, centroidsList);});}

function clearer() {
    if (centroidsList.length > 0) {
        centroidsList.length = 0; 
        renderPlot(dataset, clusterGroups, centroidsList);}
}

function initialize() {
    let initMethod = document.getElementById('init-method').value;
    let k = parseInt(document.getElementById('num-clusters').value);
    if (isNaN(k) || k <= 0) {
        alert('needs valid kluster numberss...');
        return;
    }
    if (initMethod !== 'manual') {
        centroidsList.length = 0; 
    }
    fetch('/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: dataset, k, initialization: initMethod, initial_centroids: centroidsList })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw err; });
        }
        return response.json();
    })
    .then(({ centroids, clusters }) => {
        centroidsList = centroids;
        clusterGroups = clusters;
        renderPlot(dataset, clusterGroups, centroidsList);
    })
    .catch(error => {
        if (error.error === 'NEEDSINIT') {
            alert('you are needs press gnerate first pls');
        } else {
            console.error('An unexpected error occurred:', error);
        }
    });
}


function stepper() {
    fetch('/stepper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(errorData => { throw errorData; });
        }
        return res.json();
    })
    .then(result => {
        centroidsList = result.centroids;
        clusterGroups = result.clusters;
        renderPlot(dataset, clusterGroups, centroidsList);
        if (result.converged) {
            alert('OMG, K-Means has converged!');
        }
    })
    .catch(error => {
        if (error.error === 'STEPBAD') {
            alert('please init before step');
        }
        else if (error.error === 'NEEDSINIT') {
            alert('you are needs press gnerate first pls');
        } 
        else {
            console.error('An unexpected error occurred:', error);
        }
    });
}

function runner() {
    let clustern = parseInt(document.getElementById('num-clusters').value);

    fetch('/runner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: dataset, k: clustern, initial_centroids: centroidsList })
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(errorData => { throw errorData; });
        }
        return res.json();
    })
    .then(result => {
        centroidsList = result.centroids;
        clusterGroups = result.clusters;
        renderPlot(dataset, clusterGroups, centroidsList);
        if (result.converged) {
            alert('OMG, K-Means has converged!');
        }
    })
    .catch(error => {
        if (error.error === 'NEEDSINIT') {
            alert('WHY YOU DIDNT INIT DATA???? GEN RANDOM PLS');
        } else if (error.error === 'BAD') {
            alert('did press initialize before run to converge? stop try break pls');
        } else {
            console.error('An unexpected error occurred:', error);
        }
    });
}

function renderPlot(dataPoints, clusterGroups, centroidLocations) {
    let plotArea = d3.select("#plot").select("svg");
    if (!plotArea.empty()) {
        plotArea.remove();
    }

    let width = 800;
    let height = 500;

    let xExtent = d3.extent(dataPoints, point => point[0]);
    let yExtent = d3.extent(dataPoints, point => point[1]);

    let xAxisScale = d3.scaleLinear()
        .range([0, width])
        .domain([xExtent[0], xExtent[1]]);

    let yAxisScale = d3.scaleLinear()
        .range([height, 0])
        .domain([yExtent[0], yExtent[1]]);

    let svgContainer = d3.select("#plot")
        .append("svg")
        .attr("height", height)
        .attr("width", width)
        .style("background-color", "#f0f0f0")
        .on("click", function(event) {
            let coords = d3.pointer(event);
            let xVal = xAxisScale.invert(coords[0]);
            let yVal = yAxisScale.invert(coords[1]);
            let numClusters = parseInt(document.getElementById('num-clusters').value);
            if (centroidLocations.length < numClusters) {
                centroidLocations.push([xVal, yVal]);
                renderPlot(dataPoints, clusterGroups, centroidLocations);
            }
        });

    svgContainer.selectAll("circle.data-point")
        .data(dataPoints)
        .enter()
        .append("circle")
        .attr("r", 6)
        .attr("cy", point => yAxisScale(point[1]))
        .attr("cx", point => xAxisScale(point[0]))
        .style("stroke", "white")
        .style("fill", "#87CEFA")
        .style("stroke-width", 1);

    svgContainer.selectAll("circle.centroid")
        .data(centroidLocations)
        .enter()
        .append("circle")
        .attr("r", 10)
        .attr("cy", centroid => yAxisScale(centroid[1]))
        .attr("cx", centroid => xAxisScale(centroid[0]))
        .style("stroke", "yellow")
        .style("fill", "red")
        .style("stroke-width", 2);

    clusterGroups.forEach((group, index) => {
        svgContainer.selectAll(`circle.cluster-${index}`)
            .data(group)
            .enter()
            .append("circle")
            .attr("r", 6)
            .attr("cy", point => yAxisScale(point[1]))
            .attr("cx", point => xAxisScale(point[0]))
            .style("stroke", "black")
            .style("fill", d3.schemeCategory10[index % 10])
            .style("stroke-width", 1);
    });
}

