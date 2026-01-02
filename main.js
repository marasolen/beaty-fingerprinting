let rows, overall, nothing, classes;

const resizeAndRender = () => {
    d3.selectAll("#row-visualization-container > *").remove();

    renderVisualization();

    d3.selectAll("text")
        .attr("font-size", function() { return d3.select(this).attr("text-multiplier") * 0.008 * document.getElementById("row-visualization-container").clientWidth });

    d3.select("#tooltip")
        .style("border-radius", 0.02 * document.getElementById("row-visualization-container").clientHeight + "px");
};

window.onresize = resizeAndRender;

const setupSingleRowPetri = (row) => {
    const containerWidth = document.getElementById("row-" + row.row + "-petri").clientWidth;
    const containerHeight = document.getElementById("row-" + row.row + "-petri").clientHeight;

    const margin = {
        top: 0.03 * containerHeight,
        right: 0.03 * containerWidth,
        bottom: 0.03 * containerHeight,
        left: 0.03 * containerWidth
    };

    const width = containerWidth - (margin.right + margin.left);

    const svg = d3.select(`#row-${row.row}-petri`);
    const chartArea = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const rScale = d3.scaleSqrt()
        .domain([0, d3.max(row.groups.map(group => group.total))])
        .range([0, width / 8]);

    const colours = {
        T: "#e41a1c", 
        S: "#377eb8", 
        B: "#4daf4a",
        H: "#984ea3",
        A: "#ff7f00", 
        L: "#ffff33", 
        C: "#a65628",
        G: "#f781bf",
        F: "#999999",
    };

    const defs = chartArea.append('defs')
        .selectAll("radialGradient")
        .data(row.groups)
        .join("radialGradient")
        .attr("id", d => d.id)
        .attr("cx", "50%")
        .attr("cy", "50%")
        .attr("r", "50%")
        .attr("fx", "50%")
        .attr("fy", "50%");
    
    defs.selectAll("stop")
        .data(d => d.id.split("").map((c, i) => [c, (i * 50) + "%"]))
        .join("stop")
        .attr("offset", d => d[1])
        .attr("stop-color", d => colours[d[0]]);

    chartArea.append("circle")
        .attr("r", width / 2)
        .attr("cx", width / 2)
        .attr("cy", width / 2)
        .attr("fill", row.danger ? "#FFD5D5" : "white")
        .attr("stroke", row.danger ? "#DB1E1E" : "lightgrey")
        .attr("stroke-width", width / 32);

    const links = [];
    row.groups.forEach((groupA, i) => {
        row.groups.forEach((groupB, j) => {
            if (j > i) {
                links.push({ 
                    source: groupA.id, 
                    target: groupB.id, 
                    value: 5 + (groupA.id[0] === groupB.id[0] ? 1 : 0) + (groupA.id[1] === groupB.id[1] ? 1 : 0) + (groupA.id[2] === groupB.id[2] ? 1 : 0)})
            }
        });
    });

    const simulation = d3.forceSimulation().nodes(row.groups)
        .force('charge', d3.forceManyBody().strength(-30))
        .force('center', d3.forceCenter(width / 2, width / 2).strength(1.9))
        .force('collide', d3.forceCollide(d => rScale(d.total)))
        .force('link', d3.forceLink().id(d => d.id).links(links).strength(0.001));

    const nodes = chartArea.selectAll("circle.node")
        .data(row.groups)
        .join("circle")
        .attr("class", "node")
        .attr("r", d => rScale(d.total))
        .attr("fill", d => `url(#${d.id})`);

    simulation.on('tick', () => {
      nodes
          .attr('cx', d => d.x)
          .attr('cy', d => d.y);
    });
};

const setupSingleRowVial = (row) => {
    const containerWidth = document.getElementById("row-" + row.row + "-vial").clientWidth;
    const containerHeight = document.getElementById("row-" + row.row + "-vial").clientHeight;

    const margin = {
        top: 0.03 * containerHeight,
        right: 0.03 * containerWidth,
        bottom: 0 * containerHeight,
        left: 0.03 * containerWidth
    };

    const width = containerWidth - (margin.right + margin.left);
    const height = containerHeight - (margin.top + margin.bottom);

    const svg = d3.select(`#row-${row.row}-vial`);
    const chartArea = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const categories = {
        T: {
            name: "tiny",
            colour: "#e41a1c", 
            count: 0
        },
        S: {
            name: "small",
            colour: "#377eb8", 
            count: 0
        }, 
        B: {
            name: "big",
            colour: "#4daf4a", 
            count: 0
        },
        H: {
            name: "huge",
            colour: "#984ea3", 
            count: 0
        },
        A: {
            name: "aquatic",
            colour: "#ff7f00", 
            count: 0
        }, 
        L: {
            name: "terrestrial",
            colour: "#ffff33", 
            count: 0
        }, 
        C: {
            name: "semiaquatic",
            colour: "#a65628", 
            count: 0
        },
        G: {
            name: "cannot fly",
            colour: "#f781bf", 
            count: 0
        },
        F: {
            name: "can fly",
            colour: "#999999", 
            count: 0
        }
    };

    row.groups.forEach(group => {
        group.id.split("").forEach(c => {
            categories[c].count += group.total;
        });
    });

    const xScale = d3.scaleBand()
        .domain(Object.values(categories).map(d => d.name))
        .range([0, width])
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(Object.values(categories), d => d.count)])
        .range([0, 0.46 * height]);

    chartArea.selectAll("rect.vial")
        .data(Object.values(categories))
        .join("rect")
        .attr("class", "vial")
        .attr("x", d => xScale(d.name) + xScale.bandwidth() / 4)
        .attr("y", 0)
        .attr("width", xScale.bandwidth() / 2)
        .attr("height", height / 2)
        .attr("rx", width / 200)
        .attr("ry", width / 200)
        .attr("fill", "#dddddd");

    chartArea.selectAll("rect.liquid")
        .data(Object.values(categories))
        .join("rect")
        .attr("class", "liquid")
        .attr("x", d => xScale(d.name) + xScale.bandwidth() / 3)
        .attr("y", d => 0.48 * height - yScale(d.count))
        .attr("width", xScale.bandwidth() / 3)
        .attr("height", d => yScale(d.count))
        .attr("rx", width / 200)
        .attr("ry", width / 200)
        .attr("fill", d => d.colour);

    chartArea.selectAll("text")
        .data(Object.values(categories))
        .join("text")
        .attr("text-multiplier", 1)
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "middle")
        .attr("fill", "white")
        .attr("transform", d => `translate(${xScale(d.name) + xScale.bandwidth() / 2}, ${0.55 * height})rotate(-90)`)
        .text(d => d.name);
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

    rowContainers.selectAll(".row-petri-svg")
        .data(d => [d])
        .join("svg")
        .attr("class", "row-petri-svg")
        .attr("id", d => "row-" + d.row + "-petri");

    rowContainers.selectAll(".row-vial-svg")
        .data(d => [d])
        .join("svg")
        .attr("class", "row-vial-svg")
        .attr("id", d => "row-" + d.row + "-vial");

    rows.forEach(setupSingleRowPetri);
    rows.forEach(setupSingleRowVial);
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