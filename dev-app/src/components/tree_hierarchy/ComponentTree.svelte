<script>
  import { getData } from "../../utils/componentDisplayFuncs";

  // STORE IMPORT
  import { compArrayStore, type } from "../../store";
  $: $compArrayStore, getData($type, $compArrayStore);

</script>

<div id="component-tree-display">
  <nav class="header" id="views-navbar">
    <button
      on:click={() => {
        type.set("tree");
      }}>Tree</button
    >

    <button
      on:click={() => {
        type.set("chart");
      }}>Hierarchy</button
    >
  </nav>
  <br />
</div>

<style>
  #component-tree-display {
    width: 50%;
    height: 100%;
    overflow: auto;
  }

  #views-navbar {
    background-color: rgb(53, 60, 69);
    border-bottom: 1px solid rgb(70, 80, 90);
    display: flex;
    justify-content: space-evenly;
    height: 4%;
    min-height: 25px;
    width: 100%;
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
</style>
