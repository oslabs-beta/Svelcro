<script>
  
    import { getData } from '../../utils/componentDisplayFuncs';
  
</script>
 
    
    
  <div id="component-tree-display">
    <nav class="header" id="views-navbar">
      <button on:click={() => getData('tree')}>TREE</button>
      <button on:click={() => getData('chart')}>HIERARCHY</button>
    </nav>
    <br>
  </div>


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
    width: 100%;
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
  
