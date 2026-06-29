/**
 * Template Lifecycle Cron Job
 *
 * Syncs template offer mirror fields, automatically moves underperforming
 * templates detail-only after a recovery window, and restores search when
 * detail-only templates reach the re-entry threshold.
 *
 * Trigger URL: /api/cron/template-lifecycle
 *
 * Trigger with CRON_SECRET:
 * curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://webflow-dashboard.pages.dev/api/cron/template-lifecycle
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '$lib/server/airtable';
import { isAuthorizedCronRequest } from '$lib/server/security';
import { runTemplateLifecycleAutomation } from '$lib/server/template-lifecycle-automation';

export const GET: RequestHandler = async ({ request, platform }) => {
	const env = platform?.env;
	const isAuthorized =
		isAuthorizedCronRequest(request, env?.CRON_SECRET, env?.ENVIRONMENT) ||
		isAuthorizedCronRequest(
			request,
			env?.TEMPLATE_LIFECYCLE_CRON_SECRET,
			env?.ENVIRONMENT
		);

	if (!isAuthorized) {
		throw error(401, 'Unauthorized');
	}

	if (!env) {
		throw error(500, 'Platform environment not available');
	}

	const airtable = getAirtableClient(env);
	const result = await runTemplateLifecycleAutomation(airtable);

	if (!result.success) {
		console.error('[Template Lifecycle Cron] Completed with failures', result);
	}

	return json(result);
};

export const POST: RequestHandler = async (event) => {
	return GET(event);
};
