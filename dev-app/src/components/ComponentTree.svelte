<script>
    import { parse, walk } from 'svelte/compiler';
    // const svelte = require('svelte/compiler');
    import exploreCompositeDataType from "./exploreCompositeDataType";
    import * as d3ChartRender from "./d3ChartRender";
    import * as d3TreeRender from "./d3TreeRender";
    import syntaxHighlight from "./syntaxHighlight";
    import ComponentHierarchy from "./ComponentHierarchy.svelte";
    import * as d3 from "d3";
    import Hidden from './Hidden.svelte';
    import { getData } from '../utils/componentDisplayFuncs';
    // import Tree from './Tree.svelte';
  
    // Refresh page
    let refreshPage = true;
  
    // DevTools Page Connection to Background
    const backgroundPageConnection = chrome.runtime.connect({
      name: "panel"
    });
    backgroundPageConnection.postMessage({
      name: "init",
      tabId: chrome.devtools.inspectedWindow.tabId
    });
    backgroundPageConnection.onMessage.addListener(() => {
      getData("tree");
      refreshPage = false;
    });

    const componentShow = (passedChild) => {
    const children = [child, child1, child2];
    children.forEach(el => el === passedChild ? el.show() : el.noShow())
  };

  </script>
 
    
    
  <div id="component-tree-display">
    <nav class="header" id="views-navbar">
      <button on:click={() => getData('tree')}>TREE</button>
      <button on:click={() => getData('chart')}>HIERARCHY</button>
    </nav>
    <br>
  </div>

  <!-- <Tree {templateStructured} /> -->


<style>
  #component-tree-display{
    width: 50%;
    height: 100%;

    resize: horizontal;
    overflow: auto;
  }

  #views-navbar {
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
    /* flex-direction: column; */
    /* justify-items: center; */
    width: 100%;
  }
  /* #load-screen {
    position: fixed;
    height: 100%;
    width: 100%;
    background-color: rgb(25, 25, 25);
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
  }
  #refresh {
    color: white;
    font-size: 1.25rem;
  } */

  /* Loading Icon */
  /* @keyframes ldio-qgqa75k37hd-r {
    0%,
    100% {
      animation-timing-function: cubic-bezier(0.2 0 0.8 0.8);
    }
    50% {
      animation-timing-function: cubic-bezier(0.2 0.2 0.8 1);
    }
    0% {
      transform: rotate(0deg);
    }
    50% {
      transform: rotate(180deg);
    }
    100% {
      transform: rotate(360deg);
    }
  } */
  /* @keyframes ldio-qgqa75k37hd-s {
    0%,
    100% {
      animation-timing-function: cubic-bezier(0.2 0 0.8 0.8);
    }
    50% {
      animation-timing-function: cubic-bezier(0.2 0.2 0.8 1);
    }
    0% {
      transform: translate(-19px, -19px) scale(0);
    }
    50% {
      transform: translate(-19px, -19px) scale(1);
    }
    100% {
      transform: translate(-19px, -19px) scale(0);
    }
  } */
  .ldio-qgqa75k37hd > div {
    transform: translate(0px, -9.5px);
  }
  .ldio-qgqa75k37hd > div > div {
    animation: ldio-qgqa75k37hd-r 1.6949152542372878s linear infinite;
    transform-origin: 50px 50px;
  }
  .ldio-qgqa75k37hd > div > div > div {
    position: absolute;
    transform: translate(50px, 38.6px);
  }
  .ldio-qgqa75k37hd > div > div > div > div {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: #f80000;
    animation: ldio-qgqa75k37hd-s 1.6949152542372878s linear infinite;
  }
  .ldio-qgqa75k37hd > div > div:last-child {
    animation-delay: -0.8474576271186439s;
  }
  .ldio-qgqa75k37hd > div > div:last-child > div > div {
    animation-delay: -0.8474576271186439s;
    background: #faa44a;
  }
  .loadingio-spinner-interwind-cjqvhe7g9xe {
    width: 94px;
    height: 94px;
    display: inline-block;
    overflow: hidden;
    background: none;
  }
  .ldio-qgqa75k37hd {
    width: 100%;
    height: 100%;
    position: relative;
    transform: translateZ(0) scale(0.94);
    backface-visibility: hidden;
    transform-origin: 0 0; /* see note above */
  }
  .ldio-qgqa75k37hd div {
    box-sizing: content-box;
  }
  

</style>
  
