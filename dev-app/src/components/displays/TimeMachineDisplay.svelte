<script>
// COMPONENT IMPORTS
import TimeTransport from '../TimeTransport.svelte'
import TimeStats from '../TimeStats.svelte'

</script>

<div id="time-machine-display">
  <TimeTransport/>
  <TimeStats/>
</div>

<style>

#time-machine-display{
  display: flex;
  width: 100%;
  height: 82%;

  border: 1px solid rgb(1, 1, 1);
}



</style>
  
