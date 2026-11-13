/**
 * Reporting guides for the demonstration "fictional finding" flow.
 *
 * Each guide only links to the platform's OWN reporting pages. Reclaim never
 * submits a report. Links were copied from the platforms' official help pages
 * (checked November 12, 2026), except where a platform says `linkStatus: 'unverified'`.
 * Check them again before any real-world release: platforms change these pages.
 *
 * To add a platform: add an entry here. The save form, the vault stamp and the
 * reporting panel all read from this list.
 */

// Deliberately non-existent addresses. example.invalid can never resolve, so these
// cannot point at a real person's post or profile.
export const PLATFORMS = {
  reddit: {
    name: 'Reddit',
    exampleLabel: 'Fictional Reddit example',
    stamp: 'FICTIONAL REDDIT',
    sourcePlatform: 'Reddit (fictional)',
    fictionalUrl: 'https://www.reddit.com/r/RECLAIM_DEMO/comments/000000/fictional_post/',
    heading: 'Reddit: nonconsensual intimate media',
    intro: "For a real case, an individual in the U.S. can use Reddit's Take It Down Act legal form. Reddit requires a genuine direct content URL, contact email, and full legal signature. Alternatively, a user can report the relevant post/comment under Reddit's sitewide rules.",
    draftNote: 'Reddit’s U.S. legal notice form also requires contact email and full legal signature.',
    links: [
      { label: "Open Reddit's U.S. legal removal form", href: 'https://support.reddithelp.com/hc/en-us/requests/new?ticket_form_id=19623931614484' },
      { label: 'See Reddit in-app reporting instructions', href: 'https://support.reddithelp.com/hc/en-us/articles/360043513951-What-should-I-do-if-someone-has-shared-or-threatened-to-share-intimate-images-of-me-or-somebody-I-know' },
      { label: 'Legal form requirements', href: 'https://support.reddithelp.com/hc/en-us/articles/49223517214996-U-S-Take-It-Down-Act-Information-for-people-in-the-U-S' },
    ],
  },

  x: {
    name: 'X',
    exampleLabel: 'Fictional X example',
    stamp: 'FICTIONAL X',
    sourcePlatform: 'X (fictional)',
    fictionalUrl: 'https://example.invalid/x/RECLAIM_DEMO/status/0',
    heading: 'X: non-consensual intimate content',
    intro: "X says it removes non-consensual intimate images and videos, including AI-generated ones, within 48 hours of a valid report under the U.S. Take It Down Act, and that you do not need an X account to report. You can report from the post itself (the three-dot menu, then Private or Non-Consensual Content, then the Take It Down Act option), or use X's Help Center form.",
    draftNote: 'X lets you report from the post itself or through its Help Center form.',
    links: [
      { label: "Open X's Take It Down Act report form", href: 'https://help.x.com/forms/safety-and-sensitive-content/take-it-down' },
      { label: 'How X handles Take It Down Act reports', href: 'https://help.x.com/en/rules-and-policies/us-tida' },
      { label: "X's policy on intimate content and how to report", href: 'https://help.x.com/en/rules-and-policies/intimate-media' },
    ],
    note: 'X says it is a partner of StopNCII.org, which can help stop copies of an image spreading.',
  },

  snapchat: {
    name: 'Snapchat',
    exampleLabel: 'Fictional Snapchat example',
    stamp: 'FICTIONAL SNAPCHAT',
    sourcePlatform: 'Snapchat (fictional)',
    fictionalUrl: 'https://example.invalid/snapchat/RECLAIM_DEMO',
    heading: 'Snapchat: intimate images shared without consent',
    intro: "Snapchat asks you to report in the app when you can: press and hold the Snap or Story, then tap Report. It also has a web form for non-consensual intimate imagery, and Snapchat has said its report form can be used by anyone, with or without a Snapchat account. Snapchat recommends using the in-app report as well, because it helps them find the exact content.",
    draftNote: 'Snapchat recommends also reporting the content inside the app.',
    links: [
      { label: "Open Snapchat's intimate-imagery report form", href: 'https://help.snapchat.com/hc/requests/new?co=true&tf_23701027754644=cf_report_violation_nudity_sexual_content_leak&ticket_form_id=17471023300884' },
      { label: 'How to report abuse or illegal content on Snapchat', href: 'https://help.snapchat.com/hc/en-us/articles/7012399221652-How-do-I-report-abuse-or-illegal-content-on-Snapchat' },
    ],
    note: 'Snapchat says it takes part in StopNCII.org for people 18 or older.',
  },

  onlyfans: {
    name: 'OnlyFans',
    exampleLabel: 'Fictional OnlyFans example',
    stamp: 'FICTIONAL ONLYFANS',
    sourcePlatform: 'OnlyFans (fictional)',
    fictionalUrl: 'https://example.invalid/onlyfans/RECLAIM_DEMO',
    heading: 'OnlyFans: content shared without consent',
    intro: "Australia's eSafety Commissioner lists a “Report a user or post” option provided by OnlyFans. Reclaim could not check OnlyFans' own help pages, so it does not link straight to a report form. Look for the report option on the post or profile on OnlyFans, and check OnlyFans' own help pages for how to request removal.",
    draftNote: 'OnlyFans: Reclaim has not verified the official reporting form.',
    // The team can fill this in once someone confirms OnlyFans' official page:
    // links: [{ label: "Open OnlyFans' report form", href: 'https://...' }, ...]
    linkStatus: 'unverified',
    links: [
      { label: "Australian eSafety Commissioner's guide to OnlyFans", href: 'https://esafety.gov.au/key-issues/esafety-guide/onlyfans' },
    ],
    note: 'Direct OnlyFans link not yet verified.',
  },
};

export const PLATFORM_IDS = Object.keys(PLATFORMS);
export const isPlatform = id => Object.prototype.hasOwnProperty.call(PLATFORMS, id);

/**
 * Shown for a hand-added record about a site Reclaim has no guide for.
 * Google's page explains how to ask for a result to be removed from Google Search
 * (checked November 12, 2026). That does not remove it from the website itself.
 */
export const GENERAL_GUIDE = {
  name: 'the website',
  heading: 'Another website or app',
  intro: "Reclaim does not have a guide for this site yet. Look for a Report or Contact link on the page itself, or in the site's help pages, and give them the web address you saved. Whatever the site does, you can also ask Google to stop showing the page in its search results. That takes it out of Google Search, not off the website.",
  draftNote: '',
  links: [
    { label: 'How to ask Google to remove it from search results', href: 'https://support.google.com/websearch/answer/6302812' },
  ],
};

/**
 * Which platform guide a saved record belongs to.
 * - Hand-added records: the platform the person chose, or null for "another website".
 * - Fictional demo records: their platform. Older ones (Reddit only) have no field.
 */
export function platformForRecord(record) {
  if (record?.recordType === 'manual') return isPlatform(record.reportPlatform) ? record.reportPlatform : null;
  if (!record?.sourceIsFictional) return null;
  const id = record.reportPlatform || record.sourceKind;
  return isPlatform(id) ? id : 'reddit';
}
