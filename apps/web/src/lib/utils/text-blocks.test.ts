import { describe, expect, it } from 'vitest';
import { splitLeadSentence, toTextBlocks } from './text-blocks.ts';

describe('toTextBlocks', () => {
	it('keeps plain text as a single paragraph', () => {
		expect(toTextBlocks('Signs this is you: slow queries.')).toEqual([
			{ kind: 'paragraph', text: 'Signs this is you: slow queries.' },
		]);
	});

	it('groups consecutive dash lines into one list and keeps the closing line as a paragraph', () => {
		expect(toTextBlocks('- Slow site\n- Hard to update\r\n\nThat is the gap I close.')).toEqual([
			{ kind: 'list', items: ['Slow site', 'Hard to update'] },
			{ kind: 'paragraph', text: 'That is the gap I close.' },
		]);
	});

	it('does not treat a hyphenated word as a list item', () => {
		expect(toTextBlocks('Copy-paste everywhere')).toEqual([
			{ kind: 'paragraph', text: 'Copy-paste everywhere' },
		]);
	});
});

describe('splitLeadSentence', () => {
	it('splits off the first sentence and keeps the rest', () => {
		expect(splitLeadSentence('Next stop: your work moves on its own. Right now someone copies data. Then more.')).toEqual({
			lead: 'Next stop: your work moves on its own.',
			rest: 'Right now someone copies data. Then more.',
		});
	});

	it('leaves a single sentence whole, with nothing to fold', () => {
		expect(splitLeadSentence(' One sentence only. ')).toEqual({ lead: null, rest: 'One sentence only.' });
	});

	it('does not split inside a number', () => {
		expect(splitLeadSentence('It runs 2.5 times faster. Every day.')).toEqual({ lead: 'It runs 2.5 times faster.', rest: 'Every day.' });
	});
});
