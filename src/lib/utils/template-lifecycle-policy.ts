export const RECOVERY_REENTRY_QUALIFIED_SALES_30D = 4;
export const MIN_PAID_TEMPLATE_OFFER_PRICE = 19;
export const MIN_TEMPLATE_OFFER_MARKETPLACE_PRICE_RATIO = 0.35;

const RECOVERY_STRATEGY_TOKENS = ['prune recovery', 'exit sale', 'before delist'] as const;

function normalizePolicyText(value?: string | null): string {
	return String(value ?? '').trim().toLowerCase();
}

export function isRecoveryOfferStrategy(strategy?: string | null): boolean {
	const normalized = normalizePolicyText(strategy);
	if (!normalized) return false;
	return RECOVERY_STRATEGY_TOKENS.some((token) => normalized.includes(token));
}

export function recoverySalesRemaining(qualifiedSales30d?: number | null): number {
	const sales = Math.max(0, Math.floor(qualifiedSales30d ?? 0));
	return Math.max(0, RECOVERY_REENTRY_QUALIFIED_SALES_30D - sales);
}

export function hasReachedRecoveryReentryThreshold(qualifiedSales30d?: number | null): boolean {
	return recoverySalesRemaining(qualifiedSales30d) === 0;
}

export function minimumTemplateOfferPrice(marketplacePrice?: number | null): number {
	if (typeof marketplacePrice === 'number' && Number.isFinite(marketplacePrice)) {
		const normalizedMarketplacePrice = Number(marketplacePrice.toFixed(2));
		if (normalizedMarketplacePrice <= 0) return 0;

		const ratioFloor = Number(
			(
				normalizedMarketplacePrice * MIN_TEMPLATE_OFFER_MARKETPLACE_PRICE_RATIO
			).toFixed(2)
		);
		return Math.min(
			normalizedMarketplacePrice,
			Math.max(MIN_PAID_TEMPLATE_OFFER_PRICE, ratioFloor)
		);
	}

	return MIN_PAID_TEMPLATE_OFFER_PRICE;
}

export function isTemplateSearchSuppressed(visibility?: string | null): boolean {
	const normalized = normalizePolicyText(visibility);
	if (!normalized) return false;

	if (
		/\b(searchable|search\s*enabled|listed|marketplace\s*search)\b/.test(normalized) &&
		!normalized.includes('unlisted')
	) {
		return false;
	}

	return (
		normalized.includes('detail only') ||
		normalized.includes('detail-only') ||
		normalized.includes('unlisted') ||
		normalized.includes('hidden') ||
		normalized.includes('suppress') ||
		normalized.includes('not searchable') ||
		normalized.includes('no search') ||
		normalized.includes('remove from search')
	);
}

export function isReentryReviewRequested(visibility?: string | null): boolean {
	const normalized = normalizePolicyText(visibility);
	if (!normalized) return false;
	return (
		normalized.includes('re-entry review requested') ||
		normalized.includes('reentry review requested') ||
		normalized.includes('search re-entry review')
	);
}
