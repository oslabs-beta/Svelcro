<script>
  // COMPONENT IMPORTS
  import * as d3 from "d3";
  import { compCountsStore, compTimesStore, type } from "../../store.js";
  $: $compCountsStore, getGraphs($type);

  const getGraphs = (type) => {
    //find max value of the data to determine x axis
    if (type !== "time" && type !== "count") return;

    const findMaxTime = (input) => {
      let values = input.map((el) => el.time);
      return Math.max(...values);
    };
    const findMaxCount = (input) => {
      let values = input.map((el) => el.count);

      return Math.max(...values);
    };

    switch (type) {
      case "time":
        let maxTime = Math.ceil(findMaxTime($compTimesStore));
        var margin = { top: 20, right: 30, bottom: 40, left: 90 },
          width = 460 - margin.left - margin.right,
          height = 400 - margin.top - margin.bottom;

        //check if a D3 tree is already present
        // if so, replace tree, instead of appending tree
        if (!d3.select("#graph").empty()) {
          d3.select("#graph").remove();
        }

        // append the svg object to the body of the page
        var svg = d3
          .select("#profiler-Graphs")
          .append("svg")
          .attr("id", "graph")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .append("g")
          .attr(
            "transform",
            "translate(" + margin.left + "," + margin.top + ")"
          );

        const generateTimeGraph = (data) => {
          // Add X axis
          var x = d3
            .scaleLinear()

            //change x axis limit to be maxvalue +5
            .domain([0, maxTime + 2])
            .range([0, width]);
          svg
            .append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "translate(-10,0)rotate(-45)")
            .style("text-anchor", "end");

          // Y axis
          var y = d3
            .scaleBand()
            .range([0, height])
            .domain(
              data.map(function (d) {
                return d.component;
              })
            )
            .padding(0.1);
          svg.append("g").call(d3.axisLeft(y));

          //Bars
          svg
            .selectAll("myRect")
            .data(data)
            .enter()
            .append("rect")
            .attr("x", x(0))
            .attr("y", function (d) {
              return y(d.component);
            })
            .attr("width", function (d) {
              return x(d.time);
            })
            .attr("height", y.bandwidth())
            .attr("fill", "#ff3e00")
            .append("text")
            .style("text-anchor", "start")
            .style("font-size", "14px")
            .text("testing")
            .style("fill", "rgb(163, 163, 163)")
            .attr("x", "x(0")
            .attr("y", function (d) {
              return x(d.time) + 1;
            });

          svg
            .append("text")
            .attr("class", "x_label")
            .attr("text-anchor", "end")
            .attr("x", width)
            .attr("y", height - 6)
            .text("Time (ms)");

          svg
            .append("text")
            .attr("class", "graph_title")
            .attr("x", width / 2)
            .attr("y", height - 340)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .text("Render Time per Component")
            .style("fill", "rgb(163, 163, 163)");
        };

        generateTimeGraph($compTimesStore);
        break;

      //count graph
      case "count":
        let maxCount = findMaxCount($compCountsStore);
        // set the dimensions and margins of the graph
        var margin = { top: 20, right: 30, bottom: 40, left: 90 },
          width = 460 - margin.left - margin.right,
          height = 400 - margin.top - margin.bottom;

        //check if a D3 tree is already present
        // if so, replace tree, instead of appending tree
        if (!d3.select("#graph").empty()) {
          d3.select("#graph").remove();
        }

        // append the svg object to the body of the page
        var svg = d3
          .select("#profiler-Graphs")
          .append("svg")
          .attr("id", "graph")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .append("g")
          .attr(
            "transform",
            "translate(" + margin.left + "," + margin.top + ")"
          );

        const generateCountGraph = (data) => {
          // Add X axis
          var x = d3
            .scaleLinear()
            .domain([0, maxCount + 2])
            .range([0, width]);
          svg
            .append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "translate(-10,0)rotate(-45)")
            .style("text-anchor", "end");

          // Y axis
          var y = d3
            .scaleBand()
            .range([0, height])
            .domain(
              data.map(function (d) {
                return d.component;
              })
            )
            .padding(0.1);
          svg.append("g").call(d3.axisLeft(y));

          //Bars
          svg
            .selectAll("myRect")
            .data(data)
            .enter()
            .append("rect")
            .attr("x", x(0))
            .attr("y", function (d) {
              return y(d.component);
            })
            .attr("width", function (d) {
              return x(d.count);
            })
            .attr("height", y.bandwidth())
            .attr("fill", "#ff3e00");

          svg
            .append("text")
            .attr("class", "x_label")
            .attr("text-anchor", "end")
            .attr("x", width)
            .attr("y", height - 6)
            .text("Count");

          svg
            .append("text")
            .attr("class", "graph_title")
            .attr("x", width / 2)
            .attr("y", height - 340)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .text("Render Count per Component")
            .style("fill", "rgb(163, 163, 163)");
        };
        generateCountGraph($compCountsStore);
        break;
    }
  };
</script>

<div id="profiler-Graphs">
  <nav class="header" id="profile-navbar">
    <button
      id = "time-button"
      on:click={() => {
        type.set("time");
      }}>Render Time</button
    >
    <button
    id = "count-button"
      on:click={() => {
        type.set("count");
      }}>Render Count</button
    >
  </nav>
  <br />
</div>

<style>
  #profiler-Graphs {
    width: 100%;
    height: 100%;
    resize: horizontal;
    overflow: auto;
  }

  #profile-navbar {
    background-color: rgb(53, 60, 69);
    border-bottom: 1px solid rgb(70, 80, 90);
    display: flex;
    justify-content: space-evenly;
    height: 4%;
    min-height: 25px;
  }

  button {
    background-color: rgb(45, 42, 45);
    cursor: pointer;
    border: none;
    width: 100%;
    color: rgba(245, 245, 245, 0.543);
  }

  .header {
    display: flex;
    width: 100%;
  }
  
  .x_label {
    fill: rgb(163, 163, 163);
  }

  .axis text {
    font-family: Arial;
    font-size: 13px;
    color: #333333;
    text-anchor: end;
  }

  .axis path {
    fill: none;
    stroke: #333333;
    stroke-width: 1.5px;
    shape-rendering: crispEdges;
    font-family: Arial;
  }

  .bar {
    stroke: none;
    fill: #037faa;
  }

  .axis .label {
    font-family: Arial;
    font-size: 13px;
    color: #333333;
    text-anchor: middle;
  }
  .textlabel {
    font-family: Arial;
    font-size: 13px;
    color: #333333;
    text-anchor: left;
  }
</style>
