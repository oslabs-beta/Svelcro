<script>
// COMPONENT IMPORTS
import ComponentHierarchy from '../ComponentHierarchy.svelte'
import ComponentStats from '../ComponentStats.svelte'
import ComponentTree from '../ComponentTree.svelte'

</script>

<div id="component-display">
  <ComponentTree/>
  <!-- <ComponentHierarchy/> -->
  <ComponentStats/>
</div>

<style>

#component-display{
  display: flex;
  width: 100%;
  height: 82%;

  border: 1px solid rgb(1, 1, 1);
}



</style>
