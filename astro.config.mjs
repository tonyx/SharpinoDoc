// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';

// https://astro.build/config
export default defineConfig({
	integrations: [
		mermaid(),
		starlight({
			title: 'Sharpino',
			logo: {
				src: './src/assets/logo.png',
			},
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/tonyx/Sharpino' }],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Introduction', slug: 'introduction' },
						{ label: 'Installation & Setup', slug: 'installation' },
					],
				},
				{
					label: 'Core Concepts',
					items: [
						{ label: 'Overview & Architecture', slug: 'core-concepts' },
						{ label: 'Aggregates', slug: 'aggregates' },
						{ label: 'Events', slug: 'events' },
						{ label: 'Commands', slug: 'commands' },
						{ label: 'StateView', slug: 'stateview' },
					],
				},
				{
					label: 'Caching',
					items: [
						{ label: 'Caching Architecture', slug: 'caching/architecture' },
						{ label: 'Aggregate Cache', slug: 'caching/aggregate-cache' },
						{ label: 'Refreshable Details & Views', slug: 'caching/details-view' },
						{ label: 'Cache Invalidation & L2', slug: 'caching/report' },
					],
				},
				{
					label: 'Advanced Features',
					items: [
						{ label: 'Upcasting Techniques', slug: 'advanced/upcasting' },
						{ label: 'Extending the Decision Boundary', slug: 'advanced/cross-aggregate-constraints' },
					],
				},
				{
					label: 'Samples & Examples',
					items: [
						{ label: 'Overview', slug: 'samples/overview' },
						{ label: 'Blazor Book Library Demo', slug: 'samples/blazor-book-library' },
						{ label: 'tit4Taxi Cooperative Demo', slug: 'samples/tit4taxi' },
					],
				},
				{
					label: 'Reference',
					items: [
						{ label: 'FAQ & Trivia', slug: 'reference/faq' },
						{ label: 'Benchmarks & Performance', slug: 'reference/benchmarks' },
						{ label: 'Release Notes', slug: 'reference/release-notes' },
					],
				},
			],
		}),
	],
});
