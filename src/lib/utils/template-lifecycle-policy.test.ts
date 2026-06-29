import { describe, expect, it } from 'vitest';
import { minimumTemplateOfferPrice } from './template-lifecycle-policy';

describe('minimumTemplateOfferPrice', () => {
	it('uses the marketplace ratio floor for paid templates', () => {
		expect(minimumTemplateOfferPrice(169)).toBe(59.15);
	});

	it('uses the fixed floor for low-priced templates without dropping below paid minimum', () => {
		expect(minimumTemplateOfferPrice(29)).toBe(19);
	});

	it('allows free offers for free templates', () => {
		expect(minimumTemplateOfferPrice(0)).toBe(0);
	});
});
