<script>
  // COMPONENT IMPORTS
  import ProfilerGraphs from "../profiler/ProfilerGraphs.svelte";
</script>

<div id="profiler-display">
  <ProfilerGraphs />
</div>

<style>
  #profiler-display {
    display: flex;
    width: 100%;
    height: 82%;
    border: 1px solid rgb(1, 1, 1);
  }
</style>
