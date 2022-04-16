<script>
// COMPONENT IMPORTS
import ComponentStats from '../tree_hierarchy/ComponentStats.svelte';
import ComponentTree from '../tree_hierarchy/ComponentTree.svelte';

</script>

<div id="component-display">
  <ComponentTree/>
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
