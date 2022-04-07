// Keep a record of content types and their size in bytes.
// let contentTypes = {};

// HTML element to output our data.
// const output = document.querySelector('.analysis-output');

// // Simple render function.
// const render = () => {
//   output.innerHTML = '';
//   for (let type in contentTypes) {
//     output.innerHTML += `<p>${type}: ${contentTypes[type].size}</p>`
//   }
// };

// When a network request has finished this function will be called.
// chrome.devtools.network.onRequestFinished.addListener(request => {
//   const response = request.response;
//   // Find the Content-Type header.
//   const contentHeader = response.headers.find(header => header.name === 'Content-Type');
//   if (contentHeader) {
//     const contentType = contentHeader.value;
//     if (!contentTypes[contentType]) {
//       contentTypes[contentType] = { size: 0 };
//     }
//     // Add the size of the body response to our table.
//     contentTypes[contentType].size += response.bodySize;
//     render();
//   }
// });

// // Clear the record if the page is refreshed or the user navigates to another page.
// chrome.devtools.network.onNavigated.addListener(() => contentTypes = {});

const test = document.createElement('button');
test.innerHTML = 'GABBA GOOL';
const body = document.querySelector('body');
body.appendChild(test);
