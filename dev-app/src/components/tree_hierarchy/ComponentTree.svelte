<script>
  
    import { getData } from '../../utils/componentDisplayFuncs';

    let compInstanceRecord = {};
    let compRecord;

    chrome.runtime.onMessageExternal.addListener((msg, sender, response) => {

    if (msg.body === "UPDATE_INSTANCE") {
      const { data, components } = msg;
      console.log('components in UPDATE_INSTANCE: ', JSON.parse(components))
     
      // Updating Instance
      for (const key in compInstanceRecord) {
        delete compInstanceRecord[key];
      }
      const tempObj = { ...JSON.parse(data) };
      console.log("data in UPDATE_INSTANCE: ", tempObj )
      for (const property in tempObj) {
        compInstanceRecord[property] = tempObj[property];
      }

      // Updating Component Record
      compRecord = JSON.parse(components);
    }
    return true;
  });

  // chrome.runtime.onMessageExternal.addListener((msg, sender, response) => {
  //   if (msg.body === "UPDATE_RENDER") {
  //     const { data } = msg;
  //     console.log("compInstanceRecord: ", compInstanceRecord);
     
  //     // Updating Instance
  //     for (const key in compInstanceRecord) {
  //       delete compInstanceRecord[key];
  //     }
  //     const tempObj = { ...JSON.parse(data) };
  //     console.log("data in UPDATE_RENDER: ", tempObj )
  //     for (const property in tempObj) {
  //       compInstanceRecord[property] = tempObj[property];
  //     }

  //     // Updating Component Record
  //     compRecord = components;
  //   }
  // });
  
  
</script>
 
    
    
  <div id="component-tree-display">
    <nav class="header" id="views-navbar">
      <button on:click={() => getData('tree', compRecord)}>TREE</button>
      <button on:click={() => getData('chart', compRecord)}>HIERARCHY</button>
    </nav>
    <br>
  </div>


<style>
  #component-tree-display{
    width: 50%;
    height: 100%;

    /* resize: horizontal; */
    overflow: auto;
  }

  #views-navbar {
    background-color: rgb(53, 60, 69);
    border-bottom: 1px solid rgb(70, 80, 90);
    display: flex;
    justify-content: space-evenly;
    height: 4%;
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
  
