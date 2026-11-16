<!-- /contact route: the contact page (page type: contact) -->

<script lang="ts">
	import ContactPage from '#lib/components/contact/ContactPage.svelte';

	let { data } = $props();
</script>

<ContactPage contactPage={data.contactPage} weather={data.weather} />
