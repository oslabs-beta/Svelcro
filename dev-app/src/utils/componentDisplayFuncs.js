import { parse, walk } from 'svelte/compiler';
import * as d3 from 'd3';
import exploreCompositeDataType from './exploreCompositeDataType';

const getData = (tab, compRecord) => {
  console.log('componentDisplayFunc - compRecord in getData: ', compRecord);
  let i = 0;
  let componentNames = [];
  const D3PreTree = [];
  // This is a pre- or partial tree with known relationships among componenets/files
  // that go only 1 layer deep (this is all we need to build the rest of the tree)
  const unorderedListOfNodes = [];
  let componentTree;

  const createNode = (ast) => {
    const node = {};
    const dependencies = {};
    const state = {};
    const props = {};
    const elementOfD3PreTree = {};

    ast.instance.content.body.forEach((el) => {
      // Find dependencies (via import statements) of current svelte component/file
      // and store the dep in the node for said svelte component/file
      if (
        el.type === 'ImportDeclaration'
        && el.source.value.includes('.svelte')
      ) {
        const componentName = `<${el.source.value.slice(
          el.source.value.lastIndexOf('/') + 1,
          el.source.value.lastIndexOf('.'),
        )} />`;
        dependencies[componentName] = {};
      // eslint-disable-next-line brace-style
      }
      // Find props (via export statements) of current svelte component/file
      // and store the props in the node for said svelte component/file
      else if (el.type === 'ExportNamedDeclaration') {
        props[el.declaration.declarations[0].id.name] = null;
      }
    });

    node[componentNames[i]] = Object.keys(dependencies).length ? dependencies : {};

    Object.defineProperty(node[componentNames[i]], 'Props', {
      value: props,
      configurable: true,
      writable: true,
      enumerable: false,
    });

    walk(ast, {
      enter(ASTnode, parent, prop, index) {
        // eslint-disable-next-line no-prototype-builtins
        if (ASTnode.hasOwnProperty('declarations')) {
          // For variable declarations that either
          // have not been initialized or have a value that is equal to "null"
          if (!ASTnode.declarations[0].init) {
            state[ASTnode.declarations[0].id.name] = ASTnode.declarations[0].init;
          }
          // For variable declarations that
          // have a value that is a primitive data type or is a "Literal"
          else if (ASTnode.declarations[0].init.type === 'Literal') {
            state[ASTnode.declarations[0].id.name] = ASTnode.declarations[0].init.value;
          } 
          // For variable declarations that have a value that is a composite data type
          else if (
            ASTnode.declarations[0].init.type === 'ObjectExpression'
            || ASTnode.declarations[0].init.type === 'ArrayExpression'
          ) {
            console.log('AST NODE IS:', ASTnode)
            state[ASTnode.declarations[0].id.name] = exploreCompositeDataType(ASTnode.declarations[0].init);
          }

          Object.defineProperty(node[componentNames[i]], 'State', {
            value: state,
            configurable: true,
            writable: true,
            enumerable: false,
          });
        }
      },
    });

    if (Object.keys(node).length) {
      unorderedListOfNodes.push(node);

      // For D3
      const temp = {};
      temp.State = state;
      temp.Props = props;
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
        valToSubstituteIfKeyIsFound,
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

  const filterTree = (compRecord, templateStructured) => {
    console.log('filterTree - compRecord: ', compRecord);
    console.log('filterTree - templateStructured: ', templateStructured);
    // original templateStructured saved
    const newTemp = templateStructured;
    // comp record tag names
    const compRecordTagNames = {};
    
    compRecord.forEach((comp) => {
      const curTag = comp.$$.tag_name;
      if (compRecordTagNames.hasOwnProperty(curTag)) compRecordTagNames[curTag] += 1;
      else compRecordTagNames[curTag] = 1;
    });
    console.log('filterTree - compRecordTagNames: ', compRecordTagNames);
    // helper
    const helper = (struc) => {
      // if no children, return
      if (struc.children.length === 0) return;
      // start at beginning of template structured
      // check that children have a match in compRecord
      const curChildren = struc.children;
      struc.children = curChildren.filter((child) => { compRecordTagNames.hasOwnProperty(child.id)});
      struc.children.forEach((child) => { helper(child); });
      // console.log("filterTreeHelper - children after filter: ", struc.children);
    };
    // call helper
    helper(templateStructured);
    console.log('filterTree - templateStructured after', templateStructured);
    // return template structured
    return templateStructured;
  }

  // Get resources of inspected program and generate views
  chrome.devtools.inspectedWindow.getResources((resources) => {
    const arrSvelteFiles = resources.filter((file) => file.url.includes('.svelte'));
    console.log('arrSvelteFiles: ', arrSvelteFiles);
    componentNames = arrSvelteFiles.map((svelteFile) => `<${svelteFile.url.slice(
      svelteFile.url.lastIndexOf('/') + 1,
      svelteFile.url.lastIndexOf('.'),
    )} />`);
    console.log('component names:', componentNames);

    arrSvelteFiles.forEach((svelteFile) => {
      svelteFile.getContent((source) => {
        if (source) {
          const ast = parse(source);
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
    const urls = [];

    // retrieves URLs from Svelte files and adds them to urls array
    // adds each Svelte file's contents to AST array
    for (let i = 0; i < arrSvelteFiles.length; i++) {
      urls.push(JSON.parse(JSON.stringify(arrSvelteFiles[i])));
      arrSvelteFiles[i].getContent((content) => { AST.push(parse(content)); });
    }

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
      const bigData = {};

      // map out AST array so that it is easier to access the node that contains import declaration
      // iterated through the AST array and modified the source key to later match with url array to
      // combined into bigData object
      AST = AST.map((obj) => obj.instance.content.body);
      for (let i = 0; i < AST.length; i++) {
        AST[i] = AST[i].filter((node) => node.type === 'ImportDeclaration');
        for (let j = 0; j < AST[i].length; j++) {
          if (AST[i][j].source.value !== 'svelte') {
            const obj = {};
            obj.type = AST[i][j].type;
            obj.source = AST[i][j].source.value.split('');
            obj.source.shift();
            obj.source.shift();
            obj.source = obj.source.join('');
            obj.source = obj.source.replace('.svelte', '');
            AST[i][j] = obj;
          } else {
            const obj = {};
            obj.type = AST[i][j].type;
            obj.source = AST[i][j].source.value;
            AST[i][j] = obj;
          }
        }
      }

      // modified the url array to match with AST array and then combined into
      // bigData object
      for (let i = 0; i < urls.length; i++) {
        for (let j = urls[i].url.length - 1; j > 0; j--) {
          if (urls[i].url[j] === '/') {
            urls[i].url = urls[i].url
              .slice(j + 1, urls[i].url.length)
              .replace('.svelte', '');
          }
        }
        bigData[urls[i].url] = AST[i];
      }

      // iterate through bigData and made parent/child object
      // and pushed into componentTemplate array
      const componentTemplate = [];
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
      componentChildren(bigData);

      // added special obj for the top parent component for
      // D3 stratifyy function to successfully create relevant array
      for (let i = 0; i < componentTemplate.length; i++) {
        const obj = {};
        obj.child = componentTemplate[i].parent;
        if (componentTemplate.every((object) => object.child !== obj.child)) {
          if (obj.child !== '') {
            obj.parent = '';
            componentTemplate.unshift(obj);
          }
        }
      }

      // combined data from newD3Pre into componentTemplate
      // to render state/props onto panel with D3JS
      for (let i = 0; i < componentTemplate.length; i++) {
        for (let j = 0; j < newD3Pre.length; j++) {
          if (componentTemplate[i].child === Object.keys(newD3Pre[j])[0]) {
            componentTemplate[i].data = Object.values(newD3Pre[j])[0];
          }
        }
      }

      // modified componentTemplate for data that
      // has no States and/or Prop to render appropriate states for users
      // modified the data to show only Props keys for better user experience
      for (let i = 0; i < componentTemplate.length; i++) {
        if (!componentTemplate[i].hasOwnProperty('data')) {
          componentTemplate[i].data = {
            State: 'No State',
            Props: 'No Props',
          };
        } else if (
          Object.keys(componentTemplate[i].data.Props).length === 0
        ) {
          componentTemplate[i].data.Props = 'No Props';
        } else {
          const result = [];
          componentTemplate[i].data.Props = result.concat(
            Object.keys(componentTemplate[i].data.Props),
          );
        }
      }

      // finally create templateStructured for D3 using D3.stratify function
      let templateStructured = d3
        .stratify()
        .id((d) => d.child)
        .parentId((d) => {
          console.log('parent component: ', d.parent);
          return d.parent;
        })(componentTemplate);
      console.log('template structure: ', templateStructured);

      // filter through templateStructured
      templateStructured = filterTree(compRecord, templateStructured);
      switch (tab) {
        case 'tree':
          var margin = { top: 40, right: 10, bottom: 50, left: 10 
},
            width = 150 - margin.left - margin.right, // 660
            height = 500 - margin.top - margin.bottom;

          // declares a tree layout and assigns the size
          var treemap = d3.tree()
            .size([width, height]);


          //  assigns the data to a hierarchy using parent-child relationships
          var nodes = d3.hierarchy(templateStructured);

         

          // maps the node data to the tree layout
          nodes = treemap(nodes);

          // check if a D3 tree is already present
          // if so, replace tree, instead of appending tree
          if (!d3.select("#component-cur").empty()) {
            d3.select("#component-cur").remove()
          };
  
          var svg = d3.select("#component-tree-display").append("svg")
              .attr('id', 'component-cur')
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
        case 'chart':
               
          (function () {
            'use strict';
          }());
          let tree = d3.tree;
          let hierarchy = d3.hierarchy;
          let select = d3.select;
          let data = templateStructured;
          let MyTree = /** @class */ (function () {
            function MyTree() {
              let _this = this;
              this.connector = function (d) {
                // curved 
                /* return "M" + d.y + "," + d.x +
                      "C" + (d.y + d.parent.y) / 2 + "," + d.x +
                      " " + (d.y + d.parent.y) / 2 + "," + d.parent.x +
                      " " + d.parent.y + "," + d.parent.x; */
                // straight
                return "M" + d.parent.y + "," + d.parent.x
                        + "V" + d.x + "H" + d.y;
              };
              this.collapse = function (d) {
                if (d.children) {
                  d._children = d.children;
                  d._children.forEach(_this.collapse);
                  d.children = null;
                }
              };
              this.click = function (d) {
                if (d.children) {
                  d._children = d.children;
                  d.children = null;
                }
                else {
                  d.children = d._children;
                  d._children = null;
                }
                _this.update(d);
              };
              this.update = function (source) {
                _this.width = 100;
                // Compute the new tree layout.
                let nodes = _this.tree(_this.root);
                let nodesSort = [];
                nodes.eachBefore(function (n) {
                  nodesSort.push(n);
                });
                _this.height = Math.max(500, nodesSort.length * _this.barHeight + _this.margin.top + _this.margin.bottom);
                let links = nodesSort.slice(1);
                // Compute the "layout".
                nodesSort.forEach(function (n, i) {
                  n.x = i * _this.barHeight;
                });
                d3.select('svg').transition()
                  .duration(_this.duration)
                  .attr("height", _this.height);
                // Update the nodes…
                let node = _this.svg.selectAll('g.node')
                  .data(nodesSort, function (d) {
                    return d.id || (d.id = ++this.i);
                  });
                // Enter any new nodes at the parent's previous position.
                let nodeEnter = node.enter().append('g')
                  .attr('class', 'node')
                  .attr('transform', function () {
                    return 'translate(' + source.y0 + ',' + source.x0 + ')';
                  })
                  .on('click', _this.click);
                nodeEnter.append('circle')
                  .attr('r', 1e-6)
                  .style('fill', function (d) {
                    return d._children ? 'lightsteelblue' : '#fff';
                  });
                nodeEnter.append('text')
                  .attr('x', function (d) {
                    return d.children || d._children ? 10 : 10;
                  })
                  .attr('dy', '.35em')
                  .attr('text-anchor', function (d) {
                    return d.children || d._children ? 'start' : 'start';
                  })
                  .text(function (d) {
                    if (d.data.id.length > 20) {
                      return d.data.id.substring(0, 20) + '...';
                    }
                    else {
                      return d.data.id;
                    }
                  })
                  .style('fill-opacity', 1e-6);
                nodeEnter.append('svg:title').text(function (d) {
                  return d.data.id;
                });
                // Transition nodes to their new position.
                let nodeUpdate = node.merge(nodeEnter)
                  .transition()
                  .duration(_this.duration);
                nodeUpdate
                  .attr('transform', function (d) {
                    return 'translate(' + d.y + ',' + d.x + ')';
                  });
                nodeUpdate.select('circle')
                  .attr('r', 4.5)
                  .style('fill', function (d) {
                    return d._children ? 'lightsteelblue' : '#fff';
                  });
                nodeUpdate.select('text')
                  .style('fill-opacity', 1);
                // Transition exiting nodes to the parent's new position (and remove the nodes)
                let nodeExit = node.exit().transition()
                  .duration(_this.duration);
                nodeExit
                  .attr('transform', function (d) {
                    return 'translate(' + source.y + ',' + source.x + ')';
                  })
                  .remove();
                nodeExit.select('circle')
                  .attr('r', 1e-6);
                nodeExit.select('text')
                  .style('fill-opacity', 1e-6);
                // Update the links…
                let link = _this.svg.selectAll('path.link')
                  .data(links, function (d) {
                    // return d.target.id;
                    let id = d.id + '->' + d.parent.id;
                    return id;
                  });
                // Enter any new links at the parent's previous position.
                let linkEnter = link.enter().insert('path', 'g')
                  .attr('class', 'link')
                  .attr('d', function (d) {
                    let o = { x: source.x0, y: source.y0, parent: { x: source.x0, y: source.y0 } };
                    return _this.connector(o);
                  });
                // Transition links to their new position.
                link.merge(linkEnter).transition()
                  .duration(_this.duration)
                  .attr('d', _this.connector);
                // Transition exiting nodes to the parent's new position.
                link.exit().transition()
                  .duration(_this.duration)
                  .attr('d', function (d) {
                    let o = { x: source.x, y: source.y, parent: { x: source.x, y: source.y } };
                    return _this.connector(o);
                  })
                  .remove();
                // Stash the old positions for transition.
                nodesSort.forEach(function (d) {
                  d.x0 = d.x;
                  d.y0 = d.y;
                });
              };
            }
            MyTree.prototype.$onInit = function () {
              let _this = this;
              this.margin = { top: 20, right: 10, bottom: 20, left: 10 };
              this.width = 150 - this.margin.right - this.margin.left;
              this.height = 100 - this.margin.top - this.margin.bottom;
              this.barHeight = 20;
              this.barWidth = this.width * .8;
              this.i = 0;
              this.duration = 750;
              this.tree = tree().size([this.width, this.height]);
              // this.tree = tree().nodeSize([0, 30]);
              this.tree = tree().nodeSize([0, 30]);
              this.root = this.tree(hierarchy(data));
              this.root.each(function (d) {
                d.id = d.id; // transferring name to a name variable
                d.id = _this.i; // Assigning numerical Ids
                _this.i++;
              });
              this.root.x0 = this.root.x;
              this.root.y0 = this.root.y;
              if (!d3.select("#component-cur").empty()) {
                console.log('hit')
                d3.select("#component-cur").remove()
              };
              this.svg = select('#component-tree-display').append('svg')
                .attr('id', 'component-cur')
                .attr('width', this.width + this.margin.right + this.margin.left)
                .attr('height', this.height + this.margin.top + this.margin.bottom)
                .append('g')
                .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');
              // this.root.children.forEach(this.collapse);
              this.update(this.root);
            };
            return MyTree;
          }());
          ;
          let myTree = new MyTree();

          const test = myTree.$onInit(); 
          break;
        default: 
          console.log('error')
          return err;
      }
    }, 100);
  });
};

export default getData;
