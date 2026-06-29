interface Env {
	TEMPLATE_LIFECYCLE_CRON_SECRET: string;
	TEMPLATE_LIFECYCLE_CRON_URL?: string;
}

const DEFAULT_TEMPLATE_LIFECYCLE_CRON_URL =
	'https://webflowassets.createsomething.io/api/cron/template-lifecycle';

async function runTemplateLifecycleCron(env: Env): Promise<Response> {
	const url = env.TEMPLATE_LIFECYCLE_CRON_URL || DEFAULT_TEMPLATE_LIFECYCLE_CRON_URL;
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${env.TEMPLATE_LIFECYCLE_CRON_SECRET}`
		}
	});

	if (!response.ok) {
		const body = await response.text();
		throw new Error(`Template lifecycle cron failed: ${response.status} ${body}`);
	}

	return response;
}

export default {
	async scheduled(
		controller: ScheduledController,
		env: Env,
		ctx: ExecutionContext
	): Promise<void> {
		ctx.waitUntil(
			runTemplateLifecycleCron(env)
				.then(async (response) => {
					console.log('[Template Lifecycle Cron]', {
						cron: controller.cron,
						scheduledTime: controller.scheduledTime,
						status: response.status,
						result: await response.text()
					});
				})
				.catch((error) => {
					console.error('[Template Lifecycle Cron] Failed', {
						cron: controller.cron,
						scheduledTime: controller.scheduledTime,
						error: error instanceof Error ? error.message : String(error)
					});
					throw error;
				})
		);
	},

	async fetch(): Promise<Response> {
		return new Response('Not Found', { status: 404 });
	}
};
