<script lang="ts">
	interface Props {
		html: string;
		class?: string;
	}

	let { html, class: className = '' }: Props = $props();
</script>

<!-- HTML приходит из собственного PocketBase (контент каталога), не от пользователей -->
<!-- eslint-disable-next-line svelte/no-at-html-tags -->
<div class="rich-text {className}">{@html html}</div>

<style>
	.rich-text {
		font-size: 15px;
		line-height: 1.6;
	}

	.rich-text :global(p) {
		margin: 0 0 0.75em;
	}

	.rich-text :global(p:last-child) {
		margin-bottom: 0;
	}

	.rich-text :global(ul),
	.rich-text :global(ol) {
		margin: 0 0 0.75em;
		padding-left: 1.2em;
	}

	.rich-text :global(li) {
		margin-bottom: 0.25em;
	}

	.rich-text :global(strong) {
		font-weight: 700;
	}

	.rich-text :global(em) {
		font-style: italic;
	}

	.rich-text :global(a) {
		color: var(--color-accent);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.rich-text :global(code) {
		background: var(--color-sunken);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius);
		padding: 0.1em 0.3em;
		font-family: var(--font-mono);
		font-size: 0.92em;
	}

	.rich-text :global(pre) {
		background: var(--color-sunken);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius);
		padding: 12px;
		overflow: auto;
	}

	.rich-text :global(pre code) {
		background: none;
		border: none;
		padding: 0;
	}

	.rich-text :global(blockquote) {
		margin: 0 0 0.75em;
		padding: 8px 12px;
		border-left: 3px solid var(--color-border-strong);
		color: var(--color-muted);
	}
</style>
