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

const squishPolygon = (polygon, scale) => {
    const newPolygon = polygon.map(([x, y]) => [x, scale * y]);
    newPolygon.site = polygon.site;
    return newPolygon;
};

const setupSingleRowCell = (row, rowName) => {
    const containerWidth = document.getElementById("row-" + row.row + "-cell").clientWidth;
    const containerHeight = document.getElementById("row-" + row.row + "-cell").clientHeight;

    const margin = {
        top: 0.05 * containerHeight,
        right: 0.03 * containerWidth,
        bottom: 0.25 * containerHeight,
        left: 0.03 * containerWidth
    };

    const width = containerWidth - (margin.right + margin.left);
    const height = containerHeight - (margin.top + margin.bottom);

    const svg = d3.select(`#row-${row.row}-cell`)
        .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
        .attr("xmlns", "http://www.w3.org/2000/svg")
        .attr("xmlns:xlink", "http://www.w3.org/1999/xlink");

    svg.append('defs')
        .append('style')
        .attr('type', 'text/css')
        .text("@import url('https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&display=swap');");

    svg.append("rect")
        .attr("width", containerWidth)
        .attr("height", containerHeight)
        .attr("fill", "#222222");

    // Cells
    const chartArea = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const constWidth = 525.46;
    const constHeight = 596.1600000000001;
    const simulation = d3.voronoiMapSimulation(row.groups)
        .weight(d => d.total)
        .clip([[0, 0], [0, constHeight], [constWidth, constHeight], [constWidth, 0]])
        .prng(prng)
        .stop();

    let state = simulation.state();

    while (!state.ended) {
        simulation.tick();
        state = simulation.state();
    }

    const originalPolygons = state.polygons
        .map(polygon => scalePolygon(polygon, width / 525.46))
        .map(polygon => squishPolygon(polygon, (height / width) / (constHeight / constWidth)))
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
        I: textures.paths().d("crosses").background("#666666").stroke("#222222").size(width * 0.03),
        T: textures.circles().radius(width * 0.002).background("#f7fc76").fill("#c3c90c").size(width * 0.03),
        S: textures.circles().radius(width * 0.003).background("#fcc964").fill("#e59a04").size(width * 0.03), 
        B: textures.circles().radius(width * 0.004).background("#fca45d").fill("#ce5f04").size(width * 0.03),
        H: textures.circles().radius(width * 0.005).background("#f4695a").fill("#d11c08").size(width * 0.03),
        A: textures.paths().d("waves").background("#316be0").stroke("#1d2ec6").size(width * 0.03), 
        L: textures.paths().d("nylon").background("#68c96a").stroke("#19841a").size(width * 0.06), 
        C: textures.paths().d("woven").background("#51c1a7").stroke("#11ad88").size(width * 0.06),
        G: textures.lines().orientation("horizontal").background("#cbaaf7").stroke("#8845e0").size(width * 0.03),
        F: textures.paths().d(s =>
                    `M ${s * 1 / 6},${s * 1 / 3}
                     l ${s * 1 / 6},${0}
                     l ${s * 1 / 6},${s * 1 / 3}
                     l ${s * 1 / 6},${-s * 1 / 3}
                     l ${s * 1 / 6},${0}`
                ).background("#dfdee0").stroke("#727272").size(width * 0.03)
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

    chartArea.selectAll("path")
        .data(scaledPolygons)
        .join("path")
        .attr("d", d => pathGenerator(d[1]))
        .attr("stroke", "#222222")
        .attr("stroke-width", width * 0.002)
        .attr("fill", d => customTextures[d[1].site.originalObject.data.originalData.id.substring(d[0], d[0] + 1)].url());

    const texts = chartArea.selectAll("text")
        .data(originalPolygons.filter(d => d3.polygonArea(d) > (width * height / 5)))
        .join("text")
        .attr("transform", d => `translate(${d3.polygonCentroid(d)[0]}, ${d3.polygonCentroid(d)[1]})`)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("text-multiplier", 0.9)
        .attr("font-size", function() { return d3.select(this).attr("text-multiplier") * 0.03 * height })
        .text(d => {
            const id = d.site.originalObject.data.originalData.id;
            if (id === "III") return "open the drawers to find out";
            return `${textMap[id[0]]} ${textMap[id[1]]} organisms ${textMap[id[2]]}`.trim(); 
        });

    texts._groups[0].forEach(text => {
        const bounds = text.getBBox();
        const padding = width * 0.015;
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
        .attr("y", height + margin.top * 1.2)
        .attr("width", width - margin.left - margin.right)
        .attr("height", width * 0.004)
        .attr("fill", "white");


    // Legend
    const rowHeight = (margin.bottom * 0.9) / 2;
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
        .attr("transform", `translate(${margin.left},${margin.top + height * 1.06})`);

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
                .attr("cy", rowHeight * (i + 0.2))
                .attr("r", rowHeight / 3)
                .attr("width", 2 * rowHeight / 3)
                .attr("height", 2 * rowHeight / 3)
                .attr("fill", customTextures[item].url());

            legend.append("text")
                .attr("transform", d => `translate(${j * rowWidth / group.length + (rowWidth / group.length) / 2}, ${rowHeight * (i + 4 / 6)})`)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .attr("text-multiplier", 0.7)
                .attr("font-size", function() { return d3.select(this).attr("text-multiplier") * 0.03 * height })
                .attr("font-family", "'Google Sans', sans-serif")
                .attr("fill", "white")
                .text(legendTextMap[item]);
        });
    });

    svg.append("text")
        .attr("transform", _ => `translate(${containerWidth * 0.94 - margin.left}, ${containerHeight - containerWidth * 0.005})`)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("text-multiplier", 0.7)
        .attr("font-size", function() { return d3.select(this).attr("text-multiplier") * 0.03 * height })
        .attr("font-family", "'Google Sans', sans-serif")
        .attr("fill", "white")
        .text("Find out more!");

    const qrCode = QRCode({
        msg: "https://marasolen.github.io/beaty-fingerprinting/landing.html",
        dim: Math.floor(containerWidth * 0.12),
        pad: 0,
        ecl: "L",
        ecb: 0,
        pal: ["#ffffff"]
    });

    svg.append("g")
        .attr("transform", `translate(${containerWidth * 0.88 - margin.left}, ${containerHeight - containerWidth * 0.15})`)
        .node().append(qrCode);

    svg.append("text")
        .attr("transform", _ => `translate(${margin.left + width / 2}, ${margin.top / 2})`)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("text-multiplier", 1.44)
        .attr("font-size", function() { return d3.select(this).attr("text-multiplier") * 0.03 * height })
        .attr("font-family", "'Google Sans', sans-serif")
        .attr("fill", "white")
        .text(rowName);
};

const renderVisualization = () => {
    const container = d3.select("#row-visualization-container");
    const rowContainers = container.selectAll(".row")
        .data(rows)
        .join("div")
        .attr("class", "row")
        .style("text-align", "center");

    rowContainers.selectAll(".row-cell-svg")
        .data(d => [d])
        .join("svg")
        .attr("class", "row-cell-svg")
        .attr("id", d => "row-" + d.row + "-cell");

    prng = new Math.seedrandom("my seed");

    rows.forEach(d => {
        let rowName = d.name.toLowerCase();
        rowName = rowName.charAt(0).toUpperCase() + rowName.slice(1);
        if (d.row === 0) {
            rowName = "Entire Museum";
        } else if (d.row < 1) {
            rowName = d.name;
        } else {
            rowName = "Row " + d.row + ": " + rowName;
        }
        setupSingleRowCell(d, rowName);
    });
};

Promise.all([d3.json("data/row-meaning.json")]).then(([_rows]) => {
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