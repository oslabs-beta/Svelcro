<script>
// COMPONENT IMPORTS
import ComponentHierarchy from '../ComponentHierarchy.svelte'
import ComponentStats from '../ComponentStats.svelte'

</script>

<div id="component-display">
  <ComponentHierarchy/>
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
