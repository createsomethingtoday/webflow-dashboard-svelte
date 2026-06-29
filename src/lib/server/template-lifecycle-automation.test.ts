import { describe, expect, it } from 'vitest';
import type { Asset } from './airtable';
import { runTemplateLifecycleAutomation } from './template-lifecycle-automation';

const NOW = new Date('2026-06-29T12:00:00.000Z');

function templateAsset(overrides: Partial<Asset> = {}): Asset {
	return {
		id: 'recTemplate',
		name: 'Template',
		type: 'Template',
		status: 'Published',
		publishedDate: '2026-06-01T00:00:00.000Z',
		uniqueViewers: 600,
		cumulativePurchases: 1,
		cumulativeRevenue: 59,
		qualityScore: 'Good',
		priceAmount: 169,
		...overrides
	};
}

describe('runTemplateLifecycleAutomation', () => {
	it('moves a template detail-only after recovery is used and the threshold is missed', async () => {
		const asset = templateAsset({
			recoveryOfferUsed: true,
			qualifiedSales30d: 1
		});
		const updates: Array<{ id: string; searchVisibility: string }> = [];

		const result = await runTemplateLifecycleAutomation(
			{
				async getTemplateAssetsForLifecycleAutomation() {
					return [asset];
				},
				async syncTemplateOfferMirrors() {
					return asset;
				},
				async updateTemplateSearchVisibility(id, searchVisibility) {
					updates.push({ id, searchVisibility });
					return { ...asset, searchVisibility };
				}
			},
			NOW
		);

		expect(result).toMatchObject({
			success: true,
			checked: 1,
			updated: 1,
			failed: 0
		});
		expect(updates).toEqual([{ id: asset.id, searchVisibility: 'Detail only' }]);
		expect(result.results[0]).toMatchObject({
			action: 'moved_detail_only',
			afterCode: 'move_detail_only',
			searchVisibilityAfter: 'Detail only'
		});
	});

	it('restores marketplace search when a detail-only template reaches re-entry threshold', async () => {
		const asset = templateAsset({
			searchVisibility: 'Detail only',
			recoveryOfferUsed: true,
			qualifiedSales30d: 4,
			cumulativePurchases: 4
		});
		const updates: Array<{ id: string; searchVisibility: string }> = [];

		const result = await runTemplateLifecycleAutomation(
			{
				async getTemplateAssetsForLifecycleAutomation() {
					return [asset];
				},
				async syncTemplateOfferMirrors() {
					return asset;
				},
				async updateTemplateSearchVisibility(id, searchVisibility) {
					updates.push({ id, searchVisibility });
					return { ...asset, searchVisibility };
				}
			},
			NOW
		);

		expect(result).toMatchObject({
			success: true,
			checked: 1,
			updated: 1,
			failed: 0
		});
		expect(updates).toEqual([{ id: asset.id, searchVisibility: 'Searchable' }]);
		expect(result.results[0]).toMatchObject({
			action: 'restored_search',
			afterCode: 'eligible_for_reentry',
			searchVisibilityAfter: 'Searchable'
		});
	});

	it('does not prune a recovered template that has reached the re-entry threshold', async () => {
		const asset = templateAsset({
			recoveryOfferUsed: true,
			qualifiedSales30d: 4,
			cumulativePurchases: 4,
			uniqueViewers: 800
		});

		const result = await runTemplateLifecycleAutomation(
			{
				async getTemplateAssetsForLifecycleAutomation() {
					return [asset];
				},
				async syncTemplateOfferMirrors() {
					return asset;
				},
				async updateTemplateSearchVisibility() {
					throw new Error('should not update search visibility');
				}
			},
			NOW
		);

		expect(result).toMatchObject({
			success: true,
			checked: 1,
			updated: 0,
			failed: 0
		});
		expect(result.results[0].action).not.toBe('moved_detail_only');
	});
});
