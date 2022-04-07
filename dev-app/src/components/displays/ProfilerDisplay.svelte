<script>
// COMPONENT IMPORTS
import ProfilerGraphs from "../ProfilerGraphs.svelte";
import ProfilerStats from '../ProfilerStats.svelte'

</script>

<div id="profiler-display">
  <ProfilerGraphs/>
  <ProfilerStats/>
</div>

<style>

#profiler-display{
  display: flex;
  width: 100%;
  height: 82%;

  border: 1px solid rgb(1, 1, 1);
}

</style>

