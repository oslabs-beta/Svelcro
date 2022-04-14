import { parse, walk } from 'svelte/compiler';
import exploreCompositeDataType from "../components/exploreCompositeDataType.js";
import * as d3 from "d3";

export const getData = tab => {
  const viewsRoot = document.getElementById("component-hierarchy");
  // const statesRoot = document.getElementById("states-root");
  // const propsRoot = document.getElementById("props-root");
  // const chartRoot = document.getElementById("chart-root");
  
  let i = 0;
  let componentNames = [];
  const D3PreTree = [];
  // This is a pre- or partial tree with known relationships among componenets/files that go only 1 layer deep (this is all we need to build the rest of the tree)
  const unorderedListOfNodes = [];
  let componentTree;

  const createNode = (ast) => {
    const node = {};
    const dependencies = {};
    const state = {};
    const props = {};
    const elementOfD3PreTree = {};
    // console.log('AST ARG IS', ast.instance.content);

    ast.instance.content.body.forEach((el) => {
      // Find dependencies (via import statements) of current svelte component/file and store the dep in the node for said svelte component/file
      if (
        el.type === "ImportDeclaration" &&
        el.source.value.includes(".svelte")
      ) {
        const componentName = `<${el.source.value.slice(2, el.source.value.length - 7)} />`;
        dependencies[componentName] = {};
      } 
      // Find props (via export statements) of current svelte component/file and store the props in the node for said svelte component/file
      else if (el.type === "ExportNamedDeclaration") {
        props[el.declaration.declarations[0].id.name] = null;
      }
    });

    node[componentNames[i]] = Object.keys(dependencies).length ? dependencies : {};

    // console.log("CHECKING ELS", dependencies)
    // console.log("NODE", node);

    Object.defineProperty(node[componentNames[i]], "Props", {
      value: props,
      configurable: true,
      writable: true,
      enumerable: false
    });

    walk(ast, {
      enter(ASTnode, parent, prop, index) {
        // console.log('inside of walk func')
        // console.log('AST Node inside walk', ASTnode)
        // console.log('Parent inside walk', parent)
        if (ASTnode.hasOwnProperty("declarations")) {
          // For variable declarations that either have not been initialized or have a value that is equal to "null"
          if (!ASTnode.declarations[0].init) {
            state[ASTnode.declarations[0].id.name] = ASTnode.declarations[0].init;
          } 
          // For variable declarations that have a value that is a primitive data type or is a "Literal"
          else if (ASTnode.declarations[0].init.type === "Literal") {
            state[ASTnode.declarations[0].id.name] = ASTnode.declarations[0].init.value;
          } 
          // For variable declarations that have a value that is a composite data type
          else if (
            ASTnode.declarations[0].init.type === "ObjectExpression" ||
            ASTnode.declarations[0].init.type === "ArrayExpression"
          ) {
            state[ASTnode.declarations[0].id.name] = exploreCompositeDataType(ASTnode.declarations[0].init);
          }

          Object.defineProperty(node[componentNames[i]], "State", {
            value: state,
            configurable: true,
            writable: true,
            enumerable: false
          });
        }
      },
      leave(ASTnode, parent, prop, index) {
        // doSomethingElse(ASTnode) if required
      }
    });

    if (Object.keys(node).length) {
      unorderedListOfNodes.push(node);

      // For D3
      const temp = {};
      temp["State"] = state;
      temp["Props"] = props;
      elementOfD3PreTree[componentNames[i]] = temp;
      D3PreTree.push(elementOfD3PreTree);
    }
  }

  const createTree = (arr) => {
    for (let j = 0; j < arr.length; j += 1) {
      let success = 0;

      const searchTree = (
        tree,
        keyToSearchFor,
        valToSubstituteIfKeyIsFound
      ) => {
        for (const key in tree) {
          if (key === keyToSearchFor) {
            tree[key] = valToSubstituteIfKeyIsFound;
            arr.splice(j, 1);
            success += 1;
            return true;
          }
          if (
            Object.keys(tree[key]).length &&
            searchTree(
              tree[key],
              keyToSearchFor,
              valToSubstituteIfKeyIsFound
            )
          ) {
            return true;
          }
        }
        return false;
      }

      for (const key in arr[j]) {
        // If an unordered array node has keys that are not null (an object and therefore has dependencies)
        if (Object.keys(arr[j][key]).length > 0) {
          // testing top-most component (second level)
          for (const nestedKey in arr[j][key]) {
            for (const masterKey in componentTree) {
              if (nestedKey === masterKey) {
                arr[j][key][nestedKey] = componentTree[masterKey];
                componentTree = arr[j];
                arr.splice(j, 1);
                success += 1;
              }
            }
          }
        }
      }

      for (const key in arr[j]) {
        if (!success) {
          searchTree(componentTree, key, arr[j][key]);
        }
      }
      if (success) {
        j -= success;
        success = 0;
      }
    }

    if (arr.length !== 0) {
      createTree(arr);
    }
  }

  // Get resources of inspected program and generate views
  chrome.devtools.inspectedWindow.getResources(resources => {
    const arrSvelteFiles = resources.filter(file =>file.url.includes(".svelte"));
    console.log("arrSvelteFiles: ", arrSvelteFiles);
    componentNames = arrSvelteFiles.map(svelteFile => `<${svelteFile.url.slice(7, svelteFile.url.indexOf("/"))} />`);
    // componentNames = arrSvelteFiles.map(svelteFile => svelteFile);
    //console.log("please work:", componentNames)

    arrSvelteFiles.forEach(svelteFile => {
      svelteFile.getContent(source => {
        if (source) {
          const ast = parse(source);
          console.log("AST:", ast)
          createNode(ast);

          if (i === componentNames.length - 1) {
            componentTree = unorderedListOfNodes[0];
            unorderedListOfNodes.shift();
            createTree(unorderedListOfNodes);
          }
          i += 1;
        }
      });
    });

    // For D3 component tree
    let AST = [];
    let urls = [];

    // retrieves URLs from Svelte files and adds them to urls array
    // adds each Svelte file's contents to AST array
    for (let i = 0; i < arrSvelteFiles.length; i++) {
      urls.push(JSON.parse(JSON.stringify(arrSvelteFiles[i])));
      arrSvelteFiles[i].getContent(content => {
        AST.push(parse(content));
      });
    }
    //console.log('ALL ASTS:', AST);

    /* ---- D3 ---- */
    // executes after svelte.parse is completed
    setTimeout(() => {
      // modified D3PreTree so that it fits for D3 stratify function
      const newD3Pre = [];
      for (let eachObj of D3PreTree) {
        let temp = {};
        let key = Object.keys(eachObj)[0];
        let value = Object.values(eachObj)[0];
        key = key.split("");
        key.shift();
        key.pop();
        key.pop();
        key.pop();
        key = key.join("");
        temp[key] = value;
        newD3Pre.push(temp);
      }

      // declare object to assemble component template
      let bigData = {};

      // map out AST array so that it is easier to access the node that contains import declaration
      // iterated through the AST array and modified the source key to later match with url array to
      // combined into bigData object
      AST = AST.map(obj => obj.instance.content.body);
      for (let i = 0; i < AST.length; i++) {
        AST[i] = AST[i].filter(node => node.type === "ImportDeclaration");
        for (let j = 0; j < AST[i].length; j++) {
          if (AST[i][j].source.value !== "svelte") {
            let obj = {};
            obj.type = AST[i][j].type;
            obj.source = AST[i][j].source.value.split("");
            obj.source.shift();
            obj.source.shift();
            obj.source = obj.source.join("");
            obj.source = obj.source.replace(".svelte", "");
            AST[i][j] = obj;
          } else {
            let obj = {};
            obj.type = AST[i][j].type;
            obj.source = AST[i][j].source.value;
            AST[i][j] = obj;
          }
        }
      }
      console.log("AST: ", AST)

      // modified the url array to match with AST array and then combined into
      // bigData object
      for (let i = 0; i < urls.length; i++) {
        for (let j = urls[i].url.length - 1; j > 0; j--) {
          if (urls[i].url[j] === "/") {
            urls[i].url = urls[i].url
              .slice(j + 1, urls[i].url.length)
              .replace(".svelte", "");
          }
        }
        bigData[urls[i].url] = AST[i];
      }
      console.log('big data', bigData)

      // iterate through bigData and made parent/child object and pushed into componentTemplate array
      let componentTemplate = [];
      function componentChildren(bigObj) {
        for (let eachKey in bigObj) {
          for (let eachObj of bigObj[eachKey]) {
            if (
              eachObj.type == "ImportDeclaration" &&
              eachObj.source !== "svelte"
            ) {
              let obj = {};
              obj.parent = eachKey;
              obj.child = eachObj.source;
              componentTemplate.push(obj);
            }
          }
        }
      }
      console.log("component template:", componentTemplate)
      componentChildren(bigData);

      // added special obj for the top parent component for D3 stratifyy function to successfully create relevant array
      for (let i = 0; i < componentTemplate.length; i++) {
        let obj = {};
        obj.child = componentTemplate[i].parent;
        if (componentTemplate.every(object => object.child !== obj.child)) {
          if (obj.child !== "") {
            obj.parent = "";
            componentTemplate.unshift(obj);
          }
        }
      }

      // combined data from newD3Pre into componentTemplate to render state/props onto panel with D3JS
      for (let i = 0; i < componentTemplate.length; i++) {
        for (let j = 0; j < newD3Pre.length; j++) {
          if (componentTemplate[i].child === Object.keys(newD3Pre[j])[0]) {
            componentTemplate[i].data = Object.values(newD3Pre[j])[0];
          }
        }
      }

      // modified componentTemplate for data that has no States and/or Prop to render appropriate states for users
      // modified the data to show only Props keys for better user experience
      for (let i = 0; i < componentTemplate.length; i++) {
        if (!componentTemplate[i].hasOwnProperty("data")) {
          componentTemplate[i].data = {
            State: "No State",
            Props: "No Props"
          };
        } else if (
          Object.keys(componentTemplate[i].data.Props).length === 0
        ) {
          componentTemplate[i].data.Props = "No Props";
        } else {
          let result = [];
          componentTemplate[i].data.Props = result.concat(
            Object.keys(componentTemplate[i].data.Props)
          );
        }
      }

      // finally create templateStructured for D3 using D3.stratify function
       let templateStructured = d3
        .stratify()
        .id(function(d) {
          return d.child;
        })
        .parentId(function(d) {
          console.log("parent component: ", d.parent);
          return d.parent;
        })(componentTemplate);
        console.log("template structure: ", templateStructured); 


      switch (tab) {
        case "tree":
          //FROM SVELTE SIGHT
          // viewsRoot.innerHTML = "";
          //  chartRoot.innerHTML = "";
          // d3TreeRender.treeRender(templateStructured, d3, viewsRoot);

          //WORKING HORIZONTAL TREE
          // const result = test.Tree(templateStructured)
          // console.log('result is', result);
          // viewsRoot.appendChild(result);
          // var width = 960,

          //DONT WORK
          // horizon.BuildVerticaLTree(templateStructured, "#component-hierarchy")
          // <ComponentHierarchy/>

          var margin = {top: 40, right: 90, bottom: 50, left: 90},
          width = 660 - margin.left - margin.right,
          height = 500 - margin.top - margin.bottom;

          // declares a tree layout and assigns the size
          var treemap = d3.tree()
              .size([width, height]);
              

          //  assigns the data to a hierarchy using parent-child relationships
          var nodes = d3.hierarchy(templateStructured);
     

          // maps the node data to the tree layout
          nodes = treemap(nodes);
          console.log('nodes', nodes)

          //check if a D3 tree is already present
          // if so, replace tree, instead of appending tree
          if (!d3.select("#component-tree").empty()) {
            console.log('hit')
            d3.select("#component-tree").remove()
          };
          // append the svg obgect to the body of the page
          // appends a 'group' element to 'svg'
          // moves the 'group' element to the top left margin
          var svg = d3.select("#component-tree-display").append("svg")
                .attr('id', 'component-tree')
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom),
              g = svg.append("g")
                .attr("transform",
                      "translate(" + margin.left + "," + margin.top + ")");
            console.log('svg is', svg)

          // adds the links between the nodes
          var link = g.selectAll(".link")
              .data( nodes.descendants().slice(1))
            .enter().append("path")
              .attr("class", "link")
              .attr("d", function(d) {
                return "M" + d.x + "," + d.y
                  + "C" + d.x + "," + (d.y + d.parent.y) / 2
                  + " " + d.parent.x + "," +  (d.y + d.parent.y) / 2
                  + " " + d.parent.x + "," + d.parent.y;
                });
                console.log('link', link)

          // adds each node as a group
          var node = g.selectAll(".node")
              .data(nodes.descendants())
              .enter().append("g")
              .attr("class", function(d) { 
                return "node" + 
                  (d.children ? " node--internal" : " node--leaf"); })
              .attr("transform", function(d) { 
                return "translate(" + d.x + "," + d.y + ")"; });

          // adds the circle to the node
          node.append("circle")
            .attr("r", 10);

          // adds the text to the node
          node.append("text")
            .attr("dy", ".35em")
            .attr("y", function(d) { return d.children ? -20 : 20; })
            .style("text-anchor", "middle")
            .text(function(d) { return d.data.id; });
          
            console.log('LAST NODE', node);
          break;
//         case "chart":
//           viewsRoot.innerHTML = "";
//           chartRoot.innerHTML = "";
//           d3ChartRender.chartRender(
//             template,
//             d3,
//             chartRoot,
//             templateStructured,
//             collapse
//           );
//           break;
//         case "raw":
//           viewsRoot.innerHTML = "";
//           chartRoot.innerHTML = "";
//           statesRoot.innerHTML = "";
//           propsRoot.innerHTML = "";
//           const pre = document.createElement("pre");
//           const prettyJSON = JSON.stringify(componentTree, null, 2);
//           pre.innerHTML = syntaxHighlight(prettyJSON);
//           viewsRoot.appendChild(pre);
//           break;
      }
    }, 100);
  });
};
