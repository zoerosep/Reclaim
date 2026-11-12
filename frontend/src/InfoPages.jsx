// Separate, informational pages. No uploaded files or search results are sent from these pages.
// Sources and support organizations were checked on November 11, 2026.
const STATS = [
  {
    value: '1 in 12',
    category: 'Image-based abuse',
    text: 'Adult social media users who have experienced nonconsensual distribution of intimate images.',
    sourceLabel: 'Cyber Civil Rights Initiative, Fast Facts',
    url: 'https://cybercivilrights.org/',
  },
  {
    value: '1 in 8',
    category: 'Image-based abuse',
    text: 'Adult social media users who have been targets of nonconsensual distribution of intimate images.',
    sourceLabel: 'Cyber Civil Rights Initiative, Fast Facts',
    url: 'https://cybercivilrights.org/',
  },
  {
    value: '41%',
    category: 'Online harassment, broadly',
    text: 'Of U.S. adults surveyed had experienced at least one measured form of online harassment.',
    sourceLabel: 'Pew Research Center, The State of Online Harassment (2021; 2020 survey)',
    url: 'https://www.pewresearch.org/internet/2021/01/13/the-state-of-online-harassment/',
  },
  {
    value: '25%',
    category: 'Online harassment, broadly',
    text: 'Of U.S. adults surveyed reported a more severe form, such as stalking or sexual harassment.',
    sourceLabel: 'Pew Research Center, The State of Online Harassment (2021; 2020 survey)',
    url: 'https://www.pewresearch.org/internet/2021/01/13/the-state-of-online-harassment/',
  },
  {
    value: '75%',
    category: 'Online harassment, broadly',
    text: 'Of online-harassment targets said their most recent experience happened on social media.',
    sourceLabel: 'Pew Research Center, The State of Online Harassment (2021; 2020 survey)',
    url: 'https://www.pewresearch.org/internet/2021/01/13/characterizing-peoples-most-recent-online-harassment-experience/',
  },
];

const HELP_GROUPS = [
  {
    id: 'emotional-support',
    number: '01',
    eyebrow: 'Care & connection',
    title: 'Emotional and therapeutic support',
    summary: 'Talk with someone, find compassionate guidance, or make a plan for the next hour.',
    resources: [
      { name: 'RAINN National Sexual Assault Hotline', detail: 'Free, confidential support for survivors of sexual violence, 24/7. Call 800-656-4673 or use online chat.', url: 'https://rainn.org/help-and-healing', tag: '24/7 · U.S.' },
      { name: 'CCRI Image Abuse Helpline', detail: 'Support and referrals specific to image-based sexual abuse. Call 844-878-2274.', url: 'https://cybercivilrights.org/ccri-crisis-helpline/', tag: '24/7 · U.S.' },
      { name: '988 Suicide & Crisis Lifeline', detail: 'For immediate emotional distress or crisis. Call or text 988, or chat online.', url: 'https://988lifeline.org/', tag: '24/7 · U.S.' },
      { name: 'Find a trauma-informed therapist', detail: 'RAINN’s guide to finding licensed, trauma-informed mental health care and local survivor-support referrals.', url: 'https://rainn.org/mental-health-therapy-support-after-sexual-violence/how-to-find-a-trauma-informed-therapist/', tag: 'Therapy guide' },
      { name: 'FindTreatment.gov', detail: 'A confidential U.S. treatment locator for mental health care and related services, including nearby programs.', url: 'https://www.findtreatment.gov/', tag: 'Find care near you' },
      { name: 'VictimConnect Resource Center', detail: 'Confidential support and referrals for people affected by crime. Call or text 855-484-2846.', url: 'https://victimconnect.org/', tag: 'Support & referrals' },
      { name: 'Digital Identity Foundation — Aster Ellis Fund', detail: 'Free, individualized support for adults experiencing image-based sexual abuse, sexual deepfakes, or sextortion, including image-removal assistance and referrals.', url: 'https://www.thedigitalidentityfoundation.org/get-support', tag: 'Image-based abuse' },
      { name: 'National Human Trafficking Hotline', detail: '24/7 trafficking-related support and service referrals. Call 1-888-373-7888 or text 233733. Confidentiality exceptions apply.', url: 'https://humantraffickinghotline.org/', tag: 'Trafficking support' },
    ],
  },
  {
    id: 'evidence',
    number: '02',
    eyebrow: 'Documentation & victim services',
    title: 'Evidence and crime-victim assistance',
    summary: 'Learn what information may be useful to preserve, and find advocates who can explain reporting options.',
    resources: [
      { name: 'CCRI Safety Center', detail: 'Practical guidance on documenting and preserving online evidence, including URLs, dates and screenshots.', url: 'https://cybercivilrights.org/ccri-safety-center/', tag: 'Evidence guidance' },
      { name: 'Office for Victims of Crime directory', detail: 'Find local victim-service organizations by location, victimization type and available services.', url: 'https://ovc.ojp.gov/directory-crime-victim-services/search', tag: 'Find local help' },
      { name: 'National Crime Victim Law Institute', detail: 'A searchable database of crime-victim support, rights information, advocacy and referrals.', url: 'https://ncvli.org/victim-resources-database/', tag: 'Victim rights' },
      { name: 'RAINN: Medical and forensic care', detail: 'Information about trauma-informed sexual-assault medical services, including Sexual Assault Nurse Examiners (SANEs) where relevant.', url: 'https://rainn.org/where-to-find-medical-care-after-sexual-assault/', tag: 'Medical / forensic care' },
      { name: 'FBI Tips', detail: 'Official federal tip portal. For an emergency or immediate danger, contact local emergency services instead.', url: 'https://tips.fbi.gov/', tag: 'Reporting option' },
      { name: 'NNEDV Safety Net', detail: 'Technology safety, privacy, documentation, and safety-planning guidance for survivors of domestic violence, stalking, sexual assault, and trafficking. Educational resource, not a crisis hotline.', url: 'https://www.techsafety.org/', tag: 'Digital safety' },
    ],
  },
  {
    id: 'removal',
    number: '03',
    eyebrow: 'Content removal',
    title: 'Tools to help limit the spread',
    summary: 'These organizations and agencies have different roles and eligibility requirements.',
    resources: [
      { name: 'StopNCII.org', detail: 'Free on-device hashing tool for adults whose intimate images were made when they were 18 or older. Works with participating platforms.', url: 'https://stopncii.org/', tag: 'Images taken at 18+' },
      { name: 'Take It Down by NCMEC', detail: 'Hash-based service for intimate images taken when the person was under 18. The image remains on your device.', url: 'https://takeitdown.ncmec.org/', tag: 'Images taken under 18' },
      { name: 'FTC: Report a platform', detail: 'Report covered platforms that fail to provide a removal process or do not act within 48 hours of a valid request.', url: 'https://www.takeitdown.ftc.gov/', tag: 'U.S. · Platform complaints' },
      { name: 'NCMEC CyberTipline', detail: 'Report suspected online child sexual exploitation to the National Center for Missing & Exploited Children.', url: 'https://report.cybertip.org/', tag: 'Child protection' },
    ],
  },
  {
    id: 'legal',
    number: '04',
    eyebrow: 'Rights & advocacy',
    title: 'Legal information and assistance',
    summary: 'Find jurisdiction-specific advice and learn about rights and available remedies.',
    resources: [
      { name: 'LawHelp.org', detail: 'State-by-state legal aid directories and plain-language legal information; eligibility varies.', url: 'https://www.lawhelp.org/', tag: 'Find legal aid' },
      { name: 'Legal Services Corporation', detail: 'Locate organizations providing civil legal aid for eligible people with low incomes.', url: 'https://www.lsc.gov/about-lsc/what-legal-aid/i-need-legal-help', tag: 'Civil legal aid' },
      { name: 'FTC: Know your removal rights', detail: 'Consumer guidance on the TAKE IT DOWN Act, removal requests, and what to do if a platform does not comply.', url: 'https://consumer.ftc.gov/consumer-alerts/2026/09/was-your-intimate-image-shared-online-without-your-consent-heres-what-do', tag: 'U.S. federal guidance' },
      { name: 'National Crime Victim Law Institute', detail: 'Information and referrals connected to legal rights for victims of crime.', url: 'https://ncvli.org/', tag: 'Rights & referrals' },
      { name: 'Cyber Civil Rights Legal Project', detail: 'Pro bono legal assistance for qualifying cases involving nonconsensual intimate imagery. Eligibility restrictions apply, including restrictions involving minors and certain sextortion cases.', url: 'https://cyberrightsproject.com/', tag: 'Legal assistance' },
      { name: 'ALIGHT — Mobilizing Justice', detail: 'Connects eligible human trafficking survivors with pro bono legal assistance for issues including online privacy, family law, identity theft, criminal records, and other legal needs. Geographic and intake requirements apply.', url: 'https://alightnet.org/get-help/', tag: 'Survivor legal support' },
      { name: 'The Joseph Project', detail: 'Connects human trafficking survivors with pro bono legal assistance through an intake and referral process. Eligibility is assessed individually, and representation is not guaranteed.', url: 'https://www.josephproject.com/advocate', tag: 'Trafficking legal aid' },
      { name: 'Freedom Network USA', detail: 'National network of organizations providing legal assistance, advocacy, and support services for human trafficking survivors. Explore its member organizations to find potential legal help; services and eligibility vary.', url: 'https://freedomnetworkusa.org/', tag: 'Trafficking legal resources' },
    ],
  },
];

function ExternalLink({ href, children, className = '' }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{children} <span aria-hidden="true">↗</span></a>;
}

function InfoHeader({ label, title, subtitle }) {
  return <section className="info-hero" aria-labelledby="info-title">
    <p className="info-eyebrow">{label}</p>
    <h1 id="info-title">{title}</h1>
    <p className="info-intro">{subtitle}</p>
  </section>;
}

export function WhyItMattersPage({ onNavigate }) {
  return <div className="info-page">
    <InfoHeader label="Why it matters" title="Why Reclaim matters" subtitle="Nonconsensual image sharing can reach far beyond the original post. Understanding the scope is one part of making tools and support easier to find." />

    <section className="facts-section" aria-label="Five statistics about image-based abuse and online harassment">
      <div className="facts-grid">
        {STATS.map((stat, i) => <article className="fact-card" key={i}>
          <p className="fact-type">{stat.category}</p>
          <p className="fact-figure">{stat.value}</p>
          <p className="fact-description">{stat.text}<sup><a href={`#source-${i+1}`} aria-label={`Read source ${i+1}`}>{i+1}</a></sup></p>
        </article>)}
        <article className="fact-card fact-cta">
          <p className="fact-type">Explore the project</p>
          <h2>From awareness to options.</h2>
          <p>See how our demo approaches discovery, review, saving and reporting.</p>
          <a href="/" onClick={event => onNavigate?.(event, '/')} className="mini-cta">Open the app <span aria-hidden="true">→</span></a>
        </article>
      </div>
      <p className="facts-caveat">These figures come from different surveys and measure different experiences. The first two concern nonconsensual intimate-image distribution; the other three concern online harassment more broadly.</p>
    </section>

    <section className="panel info-mission" aria-labelledby="mission-title">
      <div className="info-mission-text">
        <p className="section-kicker purple">About / our mission</p>
        <h2 id="mission-title">Privacy, agency, and practical next steps.</h2>
        <p>Reclaim is a hackathon project exploring how people could find possible image matches, choose what information to keep, and access reporting guidance and support resources.</p>
        <p>The experience is designed around choice. Possible matches are for people to review, not conclusions made on their behalf.</p>
      </div>
      <aside className="mission-note">
        <span className="mission-mark" aria-hidden="true">✳</span>
        <h3>A demonstration, not a live search</h3>
        <p>Reclaim currently searches an approved local demo collection. It does not scan the live internet. Do not upload intimate or sensitive imagery.</p>
      </aside>
    </section>

    <section className="panel source-section" aria-labelledby="sources-title">
      <p className="section-kicker steel">Research & reading</p>
      <h2 id="sources-title">Sources</h2>
      <ol className="source-list">{STATS.map((stat, i) => <li id={`source-${i+1}`} key={i}>
        <ExternalLink href={stat.url}>{stat.sourceLabel}</ExternalLink>
        <span className="source-context">Supports the {stat.value} card.</span>
      </li>)}</ol>
    </section>
  </div>;
}

export function GetHelpPage() {
  return <div className="info-page help-page">
    <InfoHeader label="Get help" title="Support, when you want it." subtitle="You can begin with emotional support, evidence guidance, content removal, or legal information. These paths can happen in any order." />

    <nav className="help-quick-links" aria-label="Choose a kind of help">
      {HELP_GROUPS.map(group => <a key={group.id} href={`#${group.id}`} className="help-quick-link">
        <span className="help-quick-number">{group.number}</span>
        <span>{group.title}</span>
        <span className="help-quick-arrow" aria-hidden="true">↓</span>
      </a>)}
    </nav>

    <div className="help-sections">
      {HELP_GROUPS.map(group => <section className="panel help-section" id={group.id} key={group.id} aria-labelledby={`${group.id}-heading`}>
        <div className="help-section-head">
          <span className="help-section-number" aria-hidden="true">{group.number}</span>
          <div>
            <p className="section-kicker purple">{group.eyebrow}</p>
            <h2 id={`${group.id}-heading`}>{group.title}</h2>
            <p>{group.summary}</p>
          </div>
        </div>
        <div className="resource-grid">{group.resources.map(resource => <article className="resource-card" key={resource.name}>
          <span className="resource-tag">{resource.tag}</span>
          <h3>{resource.name}</h3>
          <p>{resource.detail}</p>
          <ExternalLink href={resource.url} className="resource-link">Visit resource</ExternalLink>
        </article>)}</div>
      </section>)}
    </div>
    <section className="support-note" aria-label="Important support information">
      <h2>Need help with immediate safety?</h2>
      <p>If you are in immediate physical danger in the U.S., call 911. If you are in emotional crisis, call or text 988. Resources on this page are external and may have different confidentiality rules. Reclaim is not a crisis service, law firm, or law-enforcement agency.</p>
    </section>
  </div>;
}
