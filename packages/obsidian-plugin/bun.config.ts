import { type BuildConfig, type BunPlugin } from "bun";
import fsp from "fs/promises";
import { join } from "path";
import process from "process";
import { compile } from "svelte/compiler";

const banner = `/*
THIS IS A GENERATED/BUNDLED FILE BY BUN
if you want to view the source, please visit the github repository of this plugin
*/
`;

// Parse command line arguments
const args = process.argv.slice(2);
const isWatch = args.includes("--watch");
const isProd = args.includes("--prod");

// Svelte plugin implementation
const sveltePlugin: BunPlugin = {
	name: "svelte",
	setup(build) {
		build.onLoad({ filter: /\.svelte$/ }, async ({ path }) => {
			try {
				const source = await Bun.file(path).text();
				const result = compile(source, {
					filename: path,
					generate: "client",
					css: "injected",
					dev: false,
				});

				return {
					loader: "js",
					contents: result.js.code,
				};
			} catch (error) {
				throw new Error(`Error compiling Svelte component: ${error}`);
			}
		});
	},
};

const config: BuildConfig = {
	entrypoints: ["./src/main.ts"],
	outdir: "./",
	minify: isProd,
	plugins: [sveltePlugin],
	external: [
		"obsidian",
		"electron",
		"@codemirror/autocomplete",
		"@codemirror/collab",
		"@codemirror/commands",
		"@codemirror/language",
		"@codemirror/lint",
		"@codemirror/search",
		"@codemirror/state",
		"@codemirror/view",
		"@lezer/common",
		"@lezer/highlight",
		"@lezer/lr",
	],
	target: "node",
	format: "cjs",
	sourcemap: isProd ? "none" : "inline",
	define: {
		"process.env.NODE_ENV": JSON.stringify(
			isProd ? "production" : "development",
		),
		"import.meta.filename": JSON.stringify(import.meta.file),
	},
	naming: {
		entry: "main.js", // Match original output name
	},
	// Add banner to output
	banner,
};

async function build() {
	try {
		const result = await Bun.build(config);

		if (!result.success) {
			console.error("Build failed");
			for (const message of result.logs) {
				console.error(message);
			}
			process.exit(1);
		}

		console.log("Build successful");
	} catch (error) {
		console.error("Build failed:", error);
		process.exit(1);
	}
}

async function watch() {
	const watcher = fsp.watch(join(import.meta.dir, "src"), {
		recursive: true,
	});
	console.log("Watching for changes...");
	for await (const event of watcher) {
		console.log(`Detected ${event.eventType} in ${event.filename}`);
		await build();
	}
}

async function main() {
	if (isWatch) {
		await build();
		return watch();
	} else {
		return build();
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
