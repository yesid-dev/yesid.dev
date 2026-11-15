import { it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ManifestoEdgeRight from './ManifestoEdgeRight.svelte';

it('derives the compact route from all four supplied CMS readouts', () => {
 render(ManifestoEdgeRight, { props: { lat: 'LAT 1', lng: 'LNG 2', src: 'SRC Alpha, QC', via: 'VIA Beta, QC', dst: 'DST Gamma, QC', node: 'NODE Delta', status: 'STATUS active' } });
 expect(screen.getByTestId('manifesto-edge-route')).toHaveTextContent('Alpha · Beta · Gamma · Delta');
 expect(screen.getByTestId('manifesto-edge-right')).toHaveAttribute('aria-hidden', 'true');
 expect(screen.getByTestId('manifesto-edge-right')).not.toHaveTextContent('STATUS');
});
