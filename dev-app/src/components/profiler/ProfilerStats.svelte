<script>
  // COMPONENT IMPORTS

  const compCountRecord = {};

  // chrome.runtime.onMessageExternal.addListener((msg, sender, response) => {
  //   if (msg.header === "UPDATE_RENDER") {
  //     const { data, body } = msg;
  //     console.log("recieving at Dev Tools! Coming from ", JSON.parse(data));
  //     console.log("body.components: ", body.components);

  //     const tempObj = { ...JSON.parse(data) };
  //     for (const property in tempObj) {
  //       compCountRecord[property] = tempObj[property];
  //     }

  //     console.log("compCountRecord: ", compCountRecord);
  //   } else if (msg.header) {
  //     console.log("recieving at Dev Tools! Coming from ", header);
  //   }
  //   return true;
  // });
</script>

<div id="profiler-Stats">
  profiler-Stats
  <div id="record">
    ${compCountRecord}
  </div>
</div>

<style>
  #profiler-Stats {
    border-left: 1px solid rgb(1, 1, 1);

    width: 50%;
    height: 100%;
  }
</style>
