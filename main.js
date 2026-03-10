let rows, prng;

const resizeAndRender = () => {
    d3.selectAll("#row-visualization-container > *").remove();

    renderVisualization();
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

const scalePolygon = (polygon, scale) => {
    const newPolygon = polygon.map(([x, y]) => [scale * x, scale * y]);
    newPolygon.site = polygon.site;
    return newPolygon;
};

const setupSingleRowCell = (row) => {
    const containerWidth = document.getElementById("row-" + row.row + "-cell").clientWidth;
    const containerHeight = document.getElementById("row-" + row.row + "-cell").clientHeight;

    const margin = {
        top: 0.01 * containerHeight,
        right: 0.03 * containerWidth,
        bottom: 0.3 * containerHeight,
        left: 0.03 * containerWidth
    };

    const width = containerWidth - (margin.right + margin.left);
    const height = containerHeight - (margin.top + margin.bottom);

    const svg = d3.select(`#row-${row.row}-cell`);

    // Cells
    const chartArea = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const simulation = d3.voronoiMapSimulation(row.groups)
        .weight(d => d.total)
        .clip([[0, 0], [0, 596.1600000000001], [525.46, 596.1600000000001], [525.46, 0]])
        .prng(prng)
        .stop();

    let state = simulation.state();

    while (!state.ended) {
        simulation.tick();
        state = simulation.state();
    }

    const originalPolygons = state.polygons
        .map(polygon => scalePolygon(polygon, width / 525.46))
        .map(polygon => {
        if (d3.polygonArea(polygon) / (width * height) < 0.01) {
            return generateInsetPolygon(polygon, 1)
        } else if (d3.polygonArea(polygon) / (width * height) < 0.02) {
            return generateInsetPolygon(polygon, 2)
        } else {
            return generateInsetPolygon(polygon, 5)
        }
    });

    const order = [
        1, // outside
        2, // middle
        0  // inside
    ]

    const scaledPolygons = [];
    [1, Math.sqrt(0.6), Math.sqrt(0.3)].forEach((scale, i) => {
        scaledPolygons.push(...originalPolygons.filter(p => i === 0 || p.site.originalObject.data.originalData.id !== "III").map(p => [order[i], generateScaledPolygon(p, scale)]));
    });

    const weightedPointAverage = (from, to, weightOnTo) => {
        return [from[0] * (1 - weightOnTo) + to[0] * weightOnTo, from[1] * (1 - weightOnTo) + to[1] * weightOnTo];
    };

    const pathGenerator = (polygon) => {
        let path = d3.path();
        path.moveTo(...weightedPointAverage(polygon[polygon.length - 1], polygon[0], 0.95));
        polygon.forEach((point, i) => {
            if (i > 0) {
                path.quadraticCurveTo(...polygon[i - 1], ...weightedPointAverage(polygon[i - 1], point, 0.05));
                path.lineTo(...weightedPointAverage(polygon[i - 1], point, 0.95));
            }
        });
        path.quadraticCurveTo(...polygon[polygon.length - 1], ...weightedPointAverage(polygon[polygon.length - 1], polygon[0], 0.05));
        path.closePath();
        return path;
    };

    const customTextures = {
        I: textures.paths().d("crosses").lighter().background("#666666").stroke("#222222"),
        T: textures.circles().radius(2).background("#f7fc76").fill("#c3c90c"),
        S: textures.circles().radius(3).background("#fcc964").fill("#e59a04"), 
        B: textures.circles().radius(4).background("#fca45d").fill("#ce5f04"),
        H: textures.circles().radius(5).background("#f4695a").fill("#d11c08"),
        A: textures.paths().d("waves").background("#316be0").stroke("#1d2ec6"), 
        L: textures.paths().d("nylon").background("#68c96a").thinner().stroke("#19841a"), 
        C: textures.paths().d("woven").background("#51c1a7").stroke("#11ad88"),
        G: textures.lines().orientation("horizontal").background("#cbaaf7").stroke("#8845e0"),
        F: textures.paths().d("caps").background("#dfdee0").stroke("#727272")
    };

    const textMap = {
        T: "tiny",
        S: "small", 
        B: "big",
        H: "huge",
        A: "aquatic", 
        L: "terrestrial", 
        C: "semiaquatic",
        G: "",
        F: "that fly"
    };

    Object.values(customTextures).forEach(texture => {
        svg.call(texture);
    });

    chartArea.selectAll('path')
        .data(scaledPolygons)
        .join('path')
        .attr('d', d => pathGenerator(d[1]))
        .attr("stroke", "#222222")
        .attr("stroke-width", 1)
        .attr('fill', d => customTextures[d[1].site.originalObject.data.originalData.id.substring(d[0], d[0] + 1)].url());

    const texts = chartArea.selectAll('text')
        .data(originalPolygons.filter(d => d3.polygonArea(d) > (width * height / 5)))
        .join('text')
        .attr("transform", d => `translate(${d3.polygonCentroid(d)[0]}, ${d3.polygonCentroid(d)[1]})`)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", "1em")
        .text(d => {
            const id = d.site.originalObject.data.originalData.id;
            if (id === "III") return "open the drawers to find out";
            return `${textMap[id[0]]} ${textMap[id[1]]} organisms ${textMap[id[2]]}`.trim(); 
        });

    texts._groups[0].forEach(text => {
        const bounds = text.getBBox();
        const padding = 10;
        chartArea.append("rect")
            .attr("x", bounds.x - padding)
            .attr("y", bounds.y - padding)
            .attr("width", bounds.width + 2 * padding)
            .attr("height", bounds.height + 2 * padding)
            .attr("rx", padding / 2)
            .attr("ry", padding / 2)
            .attr("fill", "white")
            .attr("opacity", 0.8)
            .attr("transform", d3.select(text).attr("transform"));
    });

    texts.raise();

    // Dividing line
    svg.append("rect")
        .attr("x", margin.left * 2)
        .attr("y", height + margin.top + 12)
        .attr("width", width - margin.left - margin.right)
        .attr("height", 2)
        .attr("fill", "white");


    // Legend
    const rowHeight = (margin.bottom - 25) / 2;
    const rowWidth = width;

    const legendTextMap = {
        I: "drawers",
        T: "tiny",
        S: "small", 
        B: "big",
        H: "huge",
        A: "aquatic", 
        L: "terrestrial",
        C: "semiaquatic",
        G: "can't fly",
        F: "can fly"
    };

    const legend = svg.append("g")
        .attr('transform', `translate(${margin.left},${margin.top + height + 30})`);

    [
        ["I",  "", "F", "G",  "", "A", "C", "L"],
        ["T", "S", "B", "H",  "",  "",  "",  ""]
    ].forEach((group, i) => {
        group.forEach((item, j) => {
            if (item === "") {
                return;
            }

            legend.append("circle")
                .attr("cx", j * rowWidth / group.length + (rowWidth / group.length) / 2)
                .attr("cy", rowHeight * (i + 0.3))
                .attr("r", rowHeight / 4)
                .attr("width", 2 * rowHeight / 3)
                .attr("height", 2 * rowHeight / 3)
                .attr("fill", customTextures[item].url());

            legend.append("text")
                .attr("transform", d => `translate(${j * rowWidth / group.length + (rowWidth / group.length) / 2}, ${rowHeight * (i + 4 / 6)})`)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .attr("font-size", "0.8em")
                .attr("fill", "white")
                .text(legendTextMap[item]);
        });
    });

    svg.append("text")
        .attr("transform", _ => `translate(${containerWidth * 0.925 - margin.left}, ${containerHeight - containerWidth * 0.04})`)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", "0.8em")
        .attr("fill", "white")
        .text("Find out more!");

    svg.append("svg:image")
        .attr('x', containerWidth * 0.85 - margin.left)
        .attr('y', containerHeight - containerWidth * 0.22)
        .attr('width', containerWidth * 0.15)
        .attr('height',  containerWidth * 0.15)
        .attr("xlink:href", "qr-code.png")
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
        .text(d => {
            let rowName = d.name.toLowerCase();
            rowName = rowName.charAt(0).toUpperCase() + rowName.slice(1);
            if (d.row === 0) {
                return "Entire Museum";
            } else if (d.row < 1) {
                return d.name;
            } else {
                return "Row " + d.row + ": " + rowName;
            }
        });

    rowContainers.selectAll(".row-cell-svg")
        .data(d => [d])
        .join("svg")
        .attr("class", "row-cell-svg")
        .attr("id", d => "row-" + d.row + "-cell");

    prng = new Math.seedrandom('my seed');

    rows.forEach(setupSingleRowCell);
};

Promise.all([d3.json('data/row-meaning.json')]).then(([_rows]) => {
    rows = _rows;

    const overall = {};

    rows.forEach(row => {
        row.groups.forEach(group => {
            if (!group.total) {
                group.total = group.images + group.objects;
            }

            if (!(group.id in overall)) {
                overall[group.id] = group.total;
            } else {
                overall[group.id] += group.total;
            }
        });
    });

    rows.push({
        row: 0,
        name: "Entire Museum",
        groups: Object.entries(overall).map(([key, value]) => { return { id: key, total: value } })
    });

    resizeAndRender();
});