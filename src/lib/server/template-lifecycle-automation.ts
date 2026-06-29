import type { Asset } from './airtable';
import {
	DETAIL_ONLY_SEARCH_VISIBILITY,
	SEARCHABLE_VISIBILITY
} from './template-lifecycle-actions';
import { computeTemplateHealth } from '../utils/template-health';

export type TemplateLifecycleAutomationAction =
	| 'synced'
	| 'moved_detail_only'
	| 'restored_search'
	| 'kept_searchable'
	| 'no_action'
	| 'failed';

export interface TemplateLifecycleAutomationAssetResult {
	id: string;
	name: string;
	action: TemplateLifecycleAutomationAction;
	beforeCode: string;
	afterCode?: string;
	searchVisibilityBefore?: string | null;
	searchVisibilityAfter?: string | null;
	message: string;
	error?: string;
}

export interface TemplateLifecycleAutomationResult {
	success: boolean;
	checked: number;
	updated: number;
	failed: number;
	results: TemplateLifecycleAutomationAssetResult[];
	timestamp: string;
}

export interface TemplateLifecycleAutomationClient {
	getTemplateAssetsForLifecycleAutomation(): Promise<Asset[]>;
	syncTemplateOfferMirrors(assetId: string): Promise<Asset | null>;
	updateTemplateSearchVisibility(assetId: string, searchVisibility: string): Promise<Asset | null>;
}

function resultFor(
	asset: Asset,
	action: TemplateLifecycleAutomationAction,
	beforeCode: string,
	message: string,
	extras: Partial<TemplateLifecycleAutomationAssetResult> = {}
): TemplateLifecycleAutomationAssetResult {
	return {
		id: asset.id,
		name: asset.name,
		action,
		beforeCode,
		searchVisibilityBefore: asset.searchVisibility ?? null,
		message,
		...extras
	};
}

export async function runTemplateLifecycleAutomation(
	client: TemplateLifecycleAutomationClient,
	now = new Date()
): Promise<TemplateLifecycleAutomationResult> {
	const candidates = await client.getTemplateAssetsForLifecycleAutomation();
	const results: TemplateLifecycleAutomationAssetResult[] = [];

	for (const asset of candidates) {
		const beforeHealth = computeTemplateHealth(asset, now);

		try {
			const syncedAsset = await client.syncTemplateOfferMirrors(asset.id);
			if (!syncedAsset) {
				results.push(
					resultFor(asset, 'failed', beforeHealth.automation.code, 'Failed to sync offer mirrors', {
						error: 'syncTemplateOfferMirrors returned null'
					})
				);
				continue;
			}

			const afterSyncHealth = computeTemplateHealth(syncedAsset, now);

			if (afterSyncHealth.automation.code === 'move_detail_only') {
				const updatedAsset = await client.updateTemplateSearchVisibility(
					syncedAsset.id,
					DETAIL_ONLY_SEARCH_VISIBILITY
				);

				if (!updatedAsset) {
					results.push(
						resultFor(
							syncedAsset,
							'failed',
							beforeHealth.automation.code,
							'Failed to move template detail-only',
							{
								afterCode: afterSyncHealth.automation.code,
								searchVisibilityAfter: syncedAsset.searchVisibility ?? null,
								error: 'updateTemplateSearchVisibility returned null'
							}
						)
					);
					continue;
				}

				results.push(
					resultFor(
						syncedAsset,
						'moved_detail_only',
						beforeHealth.automation.code,
						'Recovery window ended without the re-entry threshold; template moved detail-only.',
						{
							afterCode: afterSyncHealth.automation.code,
							searchVisibilityAfter: updatedAsset.searchVisibility ?? DETAIL_ONLY_SEARCH_VISIBILITY
						}
					)
				);
				continue;
			}

			if (
				afterSyncHealth.automation.code === 'eligible_for_reentry' ||
				afterSyncHealth.automation.code === 'reentry_review_requested'
			) {
				const updatedAsset = await client.updateTemplateSearchVisibility(
					syncedAsset.id,
					SEARCHABLE_VISIBILITY
				);

				if (!updatedAsset) {
					results.push(
						resultFor(
							syncedAsset,
							'failed',
							beforeHealth.automation.code,
							'Failed to restore marketplace search',
							{
								afterCode: afterSyncHealth.automation.code,
								searchVisibilityAfter: syncedAsset.searchVisibility ?? null,
								error: 'updateTemplateSearchVisibility returned null'
							}
						)
					);
					continue;
				}

				results.push(
					resultFor(
						syncedAsset,
						'restored_search',
						beforeHealth.automation.code,
						'Re-entry threshold reached; marketplace search restored.',
						{
							afterCode: afterSyncHealth.automation.code,
							searchVisibilityAfter: updatedAsset.searchVisibility ?? SEARCHABLE_VISIBILITY
						}
					)
				);
				continue;
			}

			results.push(
				resultFor(
					syncedAsset,
					afterSyncHealth.automation.code === 'keep_searchable' ? 'kept_searchable' : 'no_action',
					beforeHealth.automation.code,
					afterSyncHealth.automation.summary,
					{
						afterCode: afterSyncHealth.automation.code,
						searchVisibilityAfter: syncedAsset.searchVisibility ?? null
					}
				)
			);
		} catch (error) {
			results.push(
				resultFor(asset, 'failed', beforeHealth.automation.code, 'Template lifecycle automation failed', {
					error: error instanceof Error ? error.message : String(error)
				})
			);
		}
	}

	const updated = results.filter((result) =>
		['moved_detail_only', 'restored_search'].includes(result.action)
	).length;
	const failed = results.filter((result) => result.action === 'failed').length;

	return {
		success: failed === 0,
		checked: candidates.length,
		updated,
		failed,
		results,
		timestamp: now.toISOString()
	};
}
