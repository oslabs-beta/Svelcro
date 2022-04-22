<script>
// COMPONENT IMPORTS
import * as d3 from "d3";

let compCountRecord = [];

  chrome.runtime.onMessageExternal.addListener((msg, sender, response) => {
    if (msg.body === "UPDATE_RENDER") {
      const { data } = msg;
      console.log("recieving at Dev Tools! Coming from ", JSON.parse(data));

      const tempObj = { ...JSON.parse(data) };
      // for (const property in tempObj) {
      //   compCountRecord[property] = tempObj[property];
      // }
      const countData = [];
      for (let key in tempObj) {
        let subObj = {};
        subObj.component = key;
        subObj.count = tempObj[key];
        countData.push(subObj)
      }
      compCountRecord = countData;

      console.log("compCountRecord: ", compCountRecord);
      // console.log('testing:', Object.entries(compCountRecord));
    } else if (msg.body) {
      // console.log("recieving at Dev Tools! Coming from ", body);
    }
    return true;
  });
  const getGraphs = (type) => {
    switch(type) {
      case "time":
        console.log('we are in time')
        break;
      case "count":
        // set the dimensions and margins of the graph
        var margin = {top: 20, right: 30, bottom: 40, left: 90},
            width = 460 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;

        //check if a D3 tree is already present
        // if so, replace tree, instead of appending tree
        if (!d3.select("#component-cur").empty()) {
          d3.select("#component-cur").remove()
        };

        // append the svg object to the body of the page
        var svg = d3.select("#profiler-Graphs")
          .append("svg")
            .attr('id', 'component-cur')
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
          .append("g")
            .attr("transform",
                  "translate(" + margin.left + "," + margin.top + ")");

        const generateGraph = (data) => {
          // Add X axis
          var x = d3.scaleLinear()
            .domain([0, 20])
            .range([ 0, width]);
          svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x))
            .selectAll("text")
              .attr("transform", "translate(-10,0)rotate(-45)")
              .style("text-anchor", "end");

          // Y axis
          var y = d3.scaleBand()
            .range([ 0, height ])
            .domain(data.map(function(d) { return d.component; }))
            .padding(.1);
          svg.append("g")
            .call(d3.axisLeft(y))

          //Bars
          svg.selectAll("myRect")
            .data(data)
            .enter()
            .append("rect")
            .attr("x", x(0) )
            .attr("y", function(d) { return y(d.component); })
            .attr("width", function(d) { return x(d.count); })
            .attr("height", y.bandwidth() )
            .attr("fill", "#ff3e00")

           
        }
        generateGraph(compCountRecord);
        break;
    }

  }
  

</script>


<div id="profiler-Graphs">
  <nav class="header" id="profile-navbar">
    <button on:click={() => getGraphs("time")}>Render Time</button>
    <button on:click={() => getGraphs("count")}>Render Count</button>
  </nav>
  <br>
</div>

<style>
  
  #profiler-Graphs{
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
  }

  button {
  background-color: rgb(45, 42, 45);
  cursor: pointer;
  border: none;
  width: 100%;

  /* TEXT COLOR */
  color: rgba(245, 245, 245, 0.543);
  }

  .header {
    display: flex;
    width: 100%;
  }

</style>

