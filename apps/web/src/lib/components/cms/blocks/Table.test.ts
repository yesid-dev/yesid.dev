import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Table from './Table.svelte';

describe('authored table row headings', () => {
	it.each([true, false])('exposes native row headers with column headings %s', withHeadings => {
		const { container } = render(Table, { data: { withHeadings, withRowHeadings: true,
			content: [['Project', 'Choice'], ['<b>Site</b>', 'Static']],
		} });
		expect(screen.getByRole('rowheader', { name: 'Site' })).toHaveAttribute('scope', 'row');
		expect(screen.getByRole('cell', { name: 'Static' })).toBeInTheDocument();
		expect(container.querySelectorAll('thead th[scope="col"]')).toHaveLength(withHeadings ? 2 : 0);
		expect(screen.getByRole('region')).toHaveAttribute('tabindex', '0');
	});
	it.each([undefined, false])('keeps first-column data cells when the option is %s', withRowHeadings => {
		render(Table, { data: { withHeadings: true, withRowHeadings, content: [['Project'], ['Site']] } });
		expect(screen.queryByRole('rowheader')).toBeNull();
		expect(screen.getByRole('cell', { name: 'Site' })).toBeInTheDocument();
	});
	it('sanitizes authored row-header markup', () => {
		const { container } = render(Table, { data: { withHeadings: false, withRowHeadings: true,
			content: [['<b onclick="bad()">Safe</b><script>bad()</script>', 'Value']],
		} });
		expect(screen.getByRole('rowheader', { name: 'Safe' })).toHaveAttribute('scope', 'row');
		expect(container.querySelector('script, [onclick]')).toBeNull();
	});
});
