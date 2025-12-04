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

const setupSingleRow = (row) => {
    const containerWidth = document.getElementById("row-" + row.row).clientWidth;
    const containerHeight = document.getElementById("row-" + row.row).clientHeight;

    const margin = {
        top: 0 * containerHeight,
        right: 0 * containerWidth,
        bottom: 0 * containerHeight,
        left: 0 * containerWidth
    };

    const width = containerWidth - (margin.right + margin.left);
    const height = containerHeight - (margin.top + margin.bottom);

    const svg = d3.select(`#row-${row.row}`);
    const chartArea = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const countScale = d3.scaleSymlog()
        .domain([0, d3.max(classes.map(c => overall[c].total))])
        .range([width / 16, width / 2]);
    const classScale = d3.scaleBand()
        .domain(classes)
        .range([0, 2 * Math.PI]);

    console.log(countScale.range())

    const ringColours = {
        image: "#00C49A", 
        shiftedObject: "#FB8F67", 
        total: "#F6F7EB",
        nothing: "#222222"
    };

    chartArea.selectAll(".ring")
        .data([
            { source: overall, attribute: "total" },
            { source: row, attribute: "shiftedObject" },
            { source: row, attribute: "image" },
            { source: nothing, attribute: "nothing" }
        ])
        .join("path")
        .attr("class", "ring")
        .attr("d", d => {
            return d3.lineRadial()
                .angle(j => classScale(j.c))
                .radius(j => countScale(j.radius))
                .curve(d3.curveCardinalClosed.tension(0.6))
                (classes.map(c => { return { c: c, radius: d.source[c][d.attribute] } }))
        })
        .attr("transform", `translate(${width / 2}, ${height / 2})`)
        .attr("fill", d => ringColours[d.attribute]);
};

const renderVisualization = () => {
    const container = d3.select("#row-visualization-container");
    const rowContainers = container.selectAll(".row")
        .data(rows)
        .join("div")
        .attr("class", "row")
        .style("text-align", "center");

    rowContainers.selectAll(".row-svg")
        .data(d => [d])
        .join("svg")
        .attr("class", "row-svg")
        .attr("id", d => "row-" + d.row);

    rowContainers.selectAll(".row-label")
        .data(d => [d])
        .join("i")
        .attr("class", "row-label")
        .text(d => d.row === 0 ? "Entire Museum" : "Row " + d.row);

    rows.forEach(setupSingleRow);
};

Promise.all([d3.csv('data/rows.csv')]).then(([_rows]) => {
    rows = _rows;

    overall = { row: 0 };
    nothing = {};
    classes = rows.columns.filter(d => d !== "row");
    classes.forEach(c => {
        overall[c] = { image: 0, object: 0, shiftedObject: 0, total: 0 }
        nothing[c] = { nothing: 0.01 };
    });
    rows.forEach(row => {
        classes.forEach(c => {
            const rowClassImage = +row[c].split(", ")[0];
            const rowClassObject = +row[c].split(", ")[1];
            overall[c] = { 
                image: overall[c].image + rowClassImage, 
                object: overall[c].object + rowClassObject, 
                shiftedObject: overall[c].shiftedObject + rowClassImage + rowClassObject,
                total: overall[c].total + rowClassImage + rowClassObject 
            };
            row[c] = { image: rowClassImage, object: rowClassObject, shiftedObject: rowClassImage + rowClassObject };
        });
    });
    rows.unshift(overall);

    resizeAndRender();
});