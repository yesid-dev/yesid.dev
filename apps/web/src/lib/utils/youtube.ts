import type { BlockEditorDoc } from '@repo/shared';
import type { Locale } from '#lib/types.ts';
import { resolveLocale } from '#lib/utils/locale.ts';
import { siteLabels } from '#lib/content/index.ts';

export type YouTubeVideo = { id: string; caption: string };

type YouTubeLabels = { play: string; close: string; title: string; gallery: string; media: string };

const youtubeCopy = (locale: Locale): YouTubeLabels => ({
	play: resolveLocale(siteLabels.mediaChrome.playVideo, locale),
	close: resolveLocale(siteLabels.mediaChrome.closeVideo, locale),
	title: resolveLocale(siteLabels.mediaChrome.youtubeTitle, locale),
	gallery: resolveLocale(siteLabels.mediaChrome.videos, locale),
	media: resolveLocale(siteLabels.mediaChrome.imagesAndVideos, locale),
});

/** Video chrome, resolved from CMS labels (DEV-28 G1). */
export const youtubeLabels: Record<Locale, YouTubeLabels> = {
	en: youtubeCopy('en'),
	fr: youtubeCopy('fr'),
	es: youtubeCopy('es'),
};

const NAMED_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' };
const decodeEntities = (text: string) =>
	text.replace(/&(?:#(\d+)|#x([0-9a-f]+)|(amp|lt|gt|quot|apos|nbsp));/gi, (entity, dec?: string, hex?: string, name?: string) => {
		if (name) return NAMED_ENTITIES[name.toLowerCase()]!;
		const code = dec ? Number(dec) : parseInt(hex!, 16);
		return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
	});

/** Only a standalone URL or one complete anchor becomes a player. */
export function parseYouTubeParagraph(text: string): YouTubeVideo | null {
	const value = text.trim();
	const anchor = value.match(/^<a\b([^>]*)>([\s\S]*?)<\/a>$/i);
	const href = anchor?.[1].match(/(?:^|\s)href\s*=\s*(["'])(.*?)\1/i)?.[2];
	if (anchor && (!href || /<\/?a\b/i.test(anchor[2]))) return null;
	if (!anchor && /[\s<>]/.test(value)) return null;
	try {
		const url = new URL((href ?? value).replace(/&amp;/gi, '&'));
		if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
		let id: string | null = null;
		if (url.hostname === 'youtu.be') {
			id = url.pathname.match(/^\/([\w-]+)\/?$/)?.[1] ?? null;
		} else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'].includes(url.hostname)) {
			id = url.pathname === '/watch'
				? url.searchParams.get('v')
				: url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)\/?$/)?.[1] ?? null;
		}
		if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
		const caption = anchor && !/[<>]/.test(anchor[2]) ? decodeEntities(anchor[2]).trim() : '';
		return { id, caption: caption === href || caption === value ? '' : caption };
	} catch {
		return null;
	}
}

/** Different share/watch URLs for one video produce one gallery preview. */
export function collectProjectVideos(docs: readonly BlockEditorDoc[]): YouTubeVideo[] {
	const videos = new Map<string, YouTubeVideo>();
	for (const doc of docs) {
		for (const block of doc.blocks) {
			if (block.type !== 'paragraph') continue;
			const video = parseYouTubeParagraph(block.data.text);
			if (!video) continue;
			const previous = videos.get(video.id);
			if (!previous || !previous.caption) videos.set(video.id, video);
		}
	}
	return [...videos.values()];
}
