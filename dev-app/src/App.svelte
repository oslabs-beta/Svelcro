<script>
	// COMPONENT IMPORTS
	import Nav from './components/nav.svelte';
	import Router from 'svelte-spa-router';
	// import ComponentDisplay from './componentDisplay.svelte'
  // import ProfilerDisplay from './profilerDisplay.svelte'
  // import TimeMachineDisplay from './timeMachineDisplay.svelte'
	export let name;
</script>

<main>
	<h1>Hello {name}!</h1>
	<Nav/>
</main>

<style>

	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
	
</style>