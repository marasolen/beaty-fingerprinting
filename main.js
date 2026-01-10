let rows;

const resizeAndRender = () => {
    d3.selectAll("#row-visualization-container > *").remove();

    renderVisualization();

    d3.selectAll("text")
        .attr("font-size", function() { return d3.select(this).attr("text-multiplier") * 0.008 * document.getElementById("row-visualization-container").clientWidth });

    d3.select("#tooltip")
        .style("border-radius", 0.02 * document.getElementById("row-visualization-container").clientHeight + "px");
};

window.onresize = resizeAndRender;

const generateInsetPolygon = (polygon, inset) => {
    const [cx, cy] = d3.polygonCentroid(polygon);

    const distanceBetween = (a, b) => Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));

    const newPolygon = polygon.map(([x, y]) => {
        const distance = distanceBetween([x, y], [cx, cy]);
        const scale = (distance - inset) / distance;
        return [scale * x + (1 - scale) * cx, scale * y + (1 - scale) * cy]
    });
    newPolygon.site = polygon.site;
    return newPolygon;
};

const generateScaledPolygon = (polygon, scale) => {
    const [cx, cy] = d3.polygonCentroid(polygon);

    const newPolygon = polygon.map(([x, y]) => [scale * x + (1 - scale) * cx, scale * y + (1 - scale) * cy]);
    newPolygon.site = polygon.site;
    return newPolygon;
};

const setupSingleRowCell = (row) => {
    const containerWidth = document.getElementById("row-" + row.row + "-cell").clientWidth;
    const containerHeight = document.getElementById("row-" + row.row + "-cell").clientHeight;

    const margin = {
        top: 0.03 * containerHeight,
        right: 0.03 * containerWidth,
        bottom: 0.03 * containerHeight,
        left: 0.03 * containerWidth
    };

    const width = containerWidth - (margin.right + margin.left);
    const height = containerHeight - (margin.top + margin.bottom);

    const svg = d3.select(`#row-${row.row}-cell`);
    const chartArea = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const simulation = d3.voronoiMapSimulation(row.groups)
        .weight(d => d.total)
        .clip([[0, 0], [0, height], [width, height], [width, 0]])
        .stop();

    let state = simulation.state();

    while (!state.ended) {
        simulation.tick();
        state = simulation.state();
    }

    const originalPolygons = state.polygons.map(polygon => generateInsetPolygon(polygon, 15));

    const scaledPolygons = [];
    [1, Math.sqrt(0.5), Math.sqrt(0.15)].forEach((scale, i) => {
        scaledPolygons.push(...originalPolygons.map(p => [i, generateScaledPolygon(p, scale)]));
    });

    const line = d3.line().curve(d3.curveCardinalClosed.tension(0.8));

    const customTextures = {
        T: textures.circles().radius(2).background("#fccde5"), 
        S: textures.circles().radius(3).background("#fdb462"), 
        B: textures.circles().radius(4).background("#ffed6f"),
        H: textures.circles().radius(5).background("#b3de69"),
        A: textures.paths().d("waves").lighter().background("#80b1d3"), 
        L: textures.paths().d("nylon").lighter().background("#fb8072"), 
        C: textures.paths().d("woven").lighter().background("#bc80bd"),
        G: textures.lines().orientation("3/8", "7/8").lighter().background("#a65628"),
        F: textures.paths().d("caps").lighter().background("#8dd3c7")
    };

    Object.values(customTextures).forEach(texture => {
        svg.call(texture);
    });

    chartArea.selectAll('path').data(scaledPolygons)
        .enter()
        .append('path')
        .attr('d', d => line(d[1]) + 'z')
        .attr('fill', d => customTextures[d[1].site.originalObject.data.originalData.id.substring(d[0], d[0] + 1)].url());
};

const renderVisualization = () => {
    const container = d3.select("#row-visualization-container");
    const rowContainers = container.selectAll(".row")
        .data(rows)
        .join("div")
        .attr("class", "row")
        .style("text-align", "center");

    rowContainers.selectAll(".row-label")
        .data(d => [d])
        .join("i")
        .attr("class", "row-label")
        .text(d => d.row === 0 ? "Entire Museum" : "Row " + d.row);

    rowContainers.selectAll(".row-cell-svg")
        .data(d => [d])
        .join("svg")
        .attr("class", "row-cell-svg")
        .attr("id", d => "row-" + d.row + "-cell");

    rows.forEach(setupSingleRowCell);
};

Promise.all([d3.json('data/row-meaning.json')]).then(([_rows]) => {
    rows = _rows;

    rows.forEach(row => {
        row.groups.forEach(group => {
            group.total = group.images + group.objects;
        });
    });

    resizeAndRender();
});