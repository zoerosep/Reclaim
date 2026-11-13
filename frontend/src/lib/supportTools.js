/**
 * Outside tools Reclaim points to but never talks to.
 *
 * Reclaim only opens these sites in a new browser tab. It does not send an image,
 * a web address or anything else to them. Whatever the person does on those
 * sites is between them and that site.
 *
 * Links checked November 12, 2026 against each organisation's own pages
 * (StopNCII.org, NCMEC Take It Down). The four search engine addresses are their
 * public home pages. Check all of them again before any real-world release.
 */

/** Free services that stop copies of an image spreading on participating platforms. */
export const PREVENTION_TOOLS = [
  {
    id: 'stopncii',
    name: 'StopNCII.org',
    who: 'If you were 18 or older in the image',
    text: 'Makes a digital fingerprint of the image on your own device. The image itself is not uploaded. Participating platforms use the fingerprint to find and block copies. You need to be the person in the image and have a copy of it. It only covers platforms that take part.',
    label: 'Open StopNCII.org',
    href: 'https://stopncii.org/',
  },
  {
    id: 'takeitdown',
    name: 'Take It Down (NCMEC)',
    who: 'If you were under 18 in the image',
    text: 'A free service from the National Center for Missing & Exploited Children. It works the same way: the fingerprint is made on your device and the image is not uploaded. Adults can use it for images taken when they were under 18. This is a different thing from the U.S. law called the Take It Down Act.',
    label: 'Open Take It Down',
    href: 'https://takeitdown.ncmec.org/',
  },
];

/** Search engines the person can use themselves. Reclaim does not search them. */
export const SEARCH_ENGINES = [
  {
    id: 'google-lens',
    name: 'Google Lens',
    text: 'The broadest general search. Finds pages showing the same or a similar picture.',
    href: 'https://lens.google.com/',
  },
  {
    id: 'yandex',
    name: 'Yandex Images',
    text: 'Sometimes finds matches other engines miss, and is often good with faces.',
    href: 'https://yandex.com/images/',
  },
  {
    id: 'tineye',
    name: 'TinEye',
    text: 'Good at finding exact copies and edited versions, such as cropped or resized ones.',
    href: 'https://tineye.com/',
  },
  {
    id: 'pimeyes',
    name: 'PimEyes',
    text: 'Searches by face. Use an ordinary photo of your own face. Seeing where a result comes from needs a paid plan.',
    href: 'https://pimeyes.com/en',
  },
];
