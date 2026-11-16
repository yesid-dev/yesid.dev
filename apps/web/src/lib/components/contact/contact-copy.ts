import type { LocalizedString } from '#lib/types.ts';

/*
 * Words from the owner-reviewed contact preview D-M4 (DEV-40). They are code-owned until the CMS
 * carries them (CMS follow-up listed in the PR); the page still reads every other word from the CMS.
 */

/** The reply time (owner answer 4A), in the info panel and after a send. Replaces the "~24h" lines. */
export const replyTimeCopy: LocalizedString = {
	en: 'I usually reply within one business day.',
	fr: 'Je réponds habituellement dans un délai d’un jour ouvrable.',
	es: 'Normalmente respondo en un día hábil.',
};

/** French Connect label: "Connexion" reads as sign-in. English and Spanish stay the CMS's. */
export const connectLabelFr = 'ME JOINDRE';

/** French "Meanwhile" line in vous (6A). English and Spanish stay the CMS's. */
export const meanwhileFr = 'En attendant, jetez un œil à mes {work} ou à mon {blog}';

/** The form's heading, read by screen readers only (the window title is the visible name). */
export const formHeadingCopy: LocalizedString = {
	en: 'Send a message',
	fr: 'Envoyer un message',
	es: 'Enviar un mensaje',
};
