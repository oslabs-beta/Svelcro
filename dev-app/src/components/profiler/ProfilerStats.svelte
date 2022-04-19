<script>
// COMPONENT IMPORTS

chrome.runtime.onMessage.addListener((msg, sender, response) => {
    if (msg.body) {
      const { body } = msg;
      console.log("recieving at Dev Tools! Coming from ", body);
    }
    return true;
  });
</script>

<div id="profiler-Stats">
  profiler-Stats
</div>

<style>
  #profiler-Stats{
  border-left: 1px solid rgb(1, 1, 1);

  width: 50%;
  height: 100%;
}
</style>

