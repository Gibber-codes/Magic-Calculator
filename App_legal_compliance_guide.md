# Legal compliance guide for an MTG battlefield simulator

A Magic: The Gathering fan app can legally operate with display ads under WotC's Fan Content Policy, which explicitly permits "ad/click revenue" while requiring the content remain **free to access**. Compliance requires a specific disclaimer, proper handling of card imagery (especially preserving copyright notices when using Scryfall API), comprehensive privacy policies for GDPR/CCPA, and cookie consent management before loading any analytics or advertising scripts.

The core legal framework involves four intersecting requirements: Wizards of the Coast intellectual property rules, EU/California privacy regulations, Google AdSense publisher policies, and standard web app legal protections. Successfully navigating these allows full monetization through display ads and affiliate marketing without legal exposure.

---

## WotC permits ad-monetized fan tools with specific conditions

The **Wizards of the Coast Fan Content Policy** (last updated November 15, 2017) explicitly allows fan-created apps, websites, and tools using Magic: The Gathering intellectual property. Critically for your use case, the policy **permits monetization through display advertising**, stating that "ad/click revenue" like Google AdSense is acceptable alongside donations, Patreon, YouTube/Twitch partner programs, and third-party sponsorships.

### What you can freely use

Card names, oracle text, mana symbols, and card images can all be incorporated. Established tools like Moxfield, Archidekt, and Scryfall all display this information without issue. The policy explicitly states: *"Can I create a fan page about your games? And use Wizards' art? Yes! We love it!"*

When using **Scryfall API** for card images, you must follow their additional requirements:
- Never cover, crop, or remove the copyright notice or artist name
- Never distort, skew, stretch, or add watermarks to card images
- If using `art_crop` images (artwork only), display the artist name and copyright elsewhere in your interface
- Maintain **50-100ms delays** between API requests (10 requests/second maximum)

### What is strictly prohibited

| Prohibited Activity | Reason |
|---------------------|--------|
| Charging for access | Content must be completely free—no paywalls, subscriptions, or required registration |
| Selling merchandise with MTG IP | Cannot sell products featuring card art or WotC trademarks |
| Using WotC logos in your branding | Cannot incorporate official logos as your app's identity |
| Creating proxy/counterfeit cards | Printing cards that could substitute for official products |
| Removing copyright notices | Must preserve all legal notices on card images |
| Competitor sponsorships | Cannot accept sponsors that compete with WotC |

### The required WotC disclaimer

The official policy mandates this specific format:

> **"[Your App Name] is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC."**

Established sites expand on this. **Moxfield's implementation** serves as a comprehensive template:

> *"Wizards of the Coast, Magic: The Gathering, and their logos are trademarks of Wizards of the Coast LLC in the United States and other countries. © 2020 Wizards. All Rights Reserved. [Your App] is not affiliated with, endorsed, sponsored, or specifically approved by Wizards of the Coast LLC. [Your App] may use the trademarks and other intellectual property of Wizards of the Coast LLC, which is permitted under Wizards' Fan Site Policy. MAGIC: THE GATHERING® is a trademark of Wizards of the Coast."*

---

## Privacy requirements for global users demand careful attention

GDPR applies to any web application that offers services to EU residents or monitors their behavior through analytics and advertising cookies—regardless of where your business is located. CCPA thresholds (**$26.6M annual revenue** or **100,000+ California users**) likely won't apply to smaller fan tools, but implementing transparency measures is best practice regardless.

### Privacy policy must include these specific elements

**For GDPR compliance (Articles 13-14):**
- Your identity and contact information
- Categories of personal data collected (IP addresses, cookies, usage data)
- Purposes and legal basis for processing (consent for analytics/advertising)
- Third parties receiving data (explicitly name Google Analytics and AdSense)
- Data retention periods
- International data transfers (your data goes to Google's US servers)
- All user rights: access, rectification, erasure, portability, objection
- How to withdraw consent
- Right to lodge complaints with supervisory authorities

**For Google AdSense (required by their Terms Section 10):**
Your privacy policy must specifically disclose that third-party vendors including Google use cookies to serve ads based on prior visits, and must link to:
- Google Ads Settings: `ads.google.com/settings`
- How Google Uses Data: `google.com/policies/privacy/partners/`

**For Google Analytics:**
Google explicitly requires disclosure of Analytics usage and how data is collected/processed. Include information about IP anonymization if enabled.

### Cookie consent requires active opt-in before loading trackers

Under GDPR and the ePrivacy Directive, **analytics and advertising cookies require prior consent** before being set. This means Google Analytics and AdSense scripts cannot execute until users actively accept. Scrolling or continued browsing does not constitute valid consent.

Your cookie banner must include:
- Clear explanation of cookie purposes in plain language
- **Equally prominent Accept and Reject buttons** (reject cannot be hidden or de-emphasized)
- Granular options allowing users to consent to some categories but not others
- No pre-ticked boxes—consent must be an affirmative action
- Link to full cookie policy with detailed information
- Easy mechanism to withdraw consent later

**Recommended implementation:** Use a Google-certified Consent Management Platform (CMP). Since February 2024, Google requires integration with IAB TCF v2.0 for EEA/UK users. **CookieYes** offers a free tier (5,000 pageviews/month) with automatic cookie blocking, GDPR/CCPA templates, and Consent Mode v2 support. **Termly** and **iubenda** provide similar functionality with free and paid tiers.

---

## Google AdSense has specific requirements for gaming apps

AdSense will approve an MTG simulator provided you meet content quality standards, include required legal pages, and follow game-specific ad placement rules.

### Required pages for AdSense approval

| Page | Requirement Level | Content |
|------|-------------------|---------|
| Privacy Policy | **Mandatory** | Must include cookie disclosure, data collection practices, third-party sharing, opt-out links |
| Terms of Service | Strongly recommended | Liability limitations, acceptable use, user responsibilities |
| About Page | Recommended | Establishes trust and site purpose |
| Contact Page | Recommended | Communication channel for users |

### Ad placement rules for game interfaces

Google specifies a **minimum 150-pixel distance** between ads and interactive game elements. This prevents accidental clicks during gameplay, which can trigger invalid click violations and account suspension.

**Interstitial ads** (if used) must:
- Only appear at natural transition points (between sessions, after completing actions)
- Never appear during active gameplay
- Never appear on first page load
- Have a clear, immediately visible exit option
- Respect a default frequency cap of 1 impression per 10 minutes

**Prohibited placements:** Pop-ups, pop-unders, pages created solely to show ads, content framed from other sites without adding value, any placement likely to generate accidental clicks.

### Content policy considerations

Your simulator must add genuine value beyond simply displaying card information. Google prohibits monetizing "replicated content" that merely copies third-party content without "additional commentary, curation, or otherwise adding value." A battlefield simulator's interactive functionality clearly qualifies as added value, but you should avoid pages that simply repackage Scryfall data without transformation.

The WotC Fan Content disclaimer protects you from intellectual property concerns with Google—they recognize legitimate fan content arrangements. However, verbatim copying of extensive rules text without transformation could raise content quality flags.

---

## Implementation: exact text and placement guidance

### Complete footer implementation

```html
<footer>
  <p>
    [Your App Name] is unofficial Fan Content permitted under the 
    <a href="https://company.wizards.com/en/legal/fancontentpolicy">
    Wizards of the Coast Fan Content Policy</a>. Not approved/endorsed 
    by Wizards. Portions of the materials used are property of Wizards 
    of the Coast. ©Wizards of the Coast LLC.
  </p>
  <p>
    Magic: The Gathering is a trademark of Wizards of the Coast, Inc. 
    and Hasbro, Inc. [Your App Name] is unaffiliated.
  </p>
  <nav>
    <a href="/privacy">Privacy Policy</a> | 
    <a href="/terms">Terms of Service</a> |
    <a href="#" id="cookie-preferences">Cookie Preferences</a>
  </nav>
  <p>© 2026 [Your Name/Company]</p>
</footer>
```

This footer should appear on every page. Standard footer placement (as used by Scryfall, Archidekt, Moxfield) is accepted—no specific prominence requirements exist beyond being findable.

### Privacy policy structure template

Organize your privacy policy with these sections:

1. **Introduction** — Who you are, effective date, what the policy covers
2. **Information We Collect** — Personal data, automatically collected data (IP, browser info), cookies, third-party service data
3. **How We Use Information** — Service provision, improvement, analytics, advertising
4. **Information Sharing** — Explicitly list Google Analytics, Google AdSense, any other services
5. **Cookies and Tracking** — Types used, essential vs. non-essential, how to control them
6. **Data Retention** — How long data is stored
7. **Your Rights** — Access, correction, deletion, portability (GDPR), California rights (CCPA)
8. **Data Security** — Measures taken to protect data
9. **Children's Privacy** — Age restriction (typically 13+)
10. **Changes to Policy** — How users will be notified
11. **Contact Information** — How to reach you with concerns

Include this **required Google disclosure**: *"Third party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website and other websites. Google's use of advertising cookies enables it and its partners to serve ads to users based on their visit to this site and/or other sites on the Internet. Users may opt out of personalized advertising by visiting [Ads Settings](https://adssettings.google.com). For more information about how Google uses data, visit [How Google uses information from sites or apps that use our services](https://www.google.com/policies/privacy/partners/)."*

### Terms of Service essential clauses

For a free web tool, these protective clauses are critical:

**Disclaimer of Warranties:**
> THE SITE IS PROVIDED ON AN "AS-IS" AND "AS AVAILABLE" BASIS. [YOUR APP] EXPRESSLY DISCLAIMS ALL WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING ALL WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE MAKE NO GUARANTEE THAT THE SITE WILL MEET YOUR REQUIREMENTS, WILL BE AVAILABLE ON AN UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE BASIS, OR WILL BE ACCURATE, RELIABLE, COMPLETE, LEGAL, OR SAFE.

**Limitation of Liability:**
> TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL [YOUR APP] BE LIABLE FOR ANY INDIRECT, CONSEQUENTIAL, EXEMPLARY, INCIDENTAL, SPECIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF, OR INABILITY TO USE, THE SITE. OUR AGGREGATE LIABILITY SHALL NOT EXCEED FIFTY U.S. DOLLARS ($50).

**Intellectual Property (MTG-specific):**
> Magic: The Gathering content and materials are trademarks and copyrights of Wizards of the Coast, LLC, a subsidiary of Hasbro, Inc. [Your App] is not affiliated with, endorsed, sponsored, or specifically approved by Wizards of the Coast LLC.

**Age Requirement:**
> You must be at least 13 years of age to access or use this Site.

### Cookie consent banner text

```
We use cookies to enhance your experience. Essential cookies are 
required for the site to function. Analytics cookies help us improve 
our service. Advertising cookies enable personalized ads.

[Accept All]  [Reject All]  [Customize]
```

Ensure the Reject All button is visually equal to Accept All—same size, color prominence, and position accessibility.

---

## Practical compliance checklist

**WotC Compliance:**
- [ ] WotC disclaimer in footer (required text format)
- [ ] "Unaffiliated" statement included
- [ ] Card images preserve copyright/artist information
- [ ] Content freely accessible (no paywall/registration requirement)
- [ ] No WotC logos used in your branding

**Privacy Compliance:**
- [ ] Privacy Policy page created with all required sections
- [ ] Google Analytics and AdSense specifically disclosed
- [ ] Links to Google opt-out and data use pages included
- [ ] Cookie consent banner blocks non-essential cookies until acceptance
- [ ] Accept/Reject buttons equally prominent
- [ ] Cookie preferences link in footer
- [ ] User rights (access, deletion) process documented

**AdSense Compliance:**
- [ ] HTTPS implemented site-wide
- [ ] Privacy Policy published and accessible
- [ ] 150px+ spacing between ads and interactive elements
- [ ] No ads during active gameplay
- [ ] Interstitials only at natural breaks (if used)
- [ ] Clear navigation structure
- [ ] Sufficient original content demonstrating value

**Terms of Service:**
- [ ] Warranty disclaimer (AS-IS language)
- [ ] Limitation of liability clause
- [ ] Age requirement (13+)
- [ ] MTG trademark acknowledgment
- [ ] Acceptable use provisions

---

## Conclusion: a clear path to compliant monetization

Building an ad-supported MTG battlefield simulator is legally straightforward when following established patterns from sites like Moxfield and Scryfall. The key constraints are ensuring **free access** (no paywalls), including the **required WotC disclaimer**, implementing **proper cookie consent** before loading Google scripts, and maintaining **150px spacing** between ads and interactive game elements.

For implementation, use a privacy policy generator like **Termly** or **iubenda** to create GDPR/CCPA-compliant policies, then customize with the required Google AdSense disclosures. Implement cookie consent through a certified CMP like **CookieYes** that handles script blocking and Consent Mode v2 automatically. Place your WotC disclaimer prominently in the footer following the established format, and structure Terms of Service with strong warranty disclaimers and liability limitations to protect against free-tool exposure.

The combination of WotC's explicit permission for ad revenue, Google's acceptance of properly-disclosed fan content, and standard privacy compliance creates a viable legal framework for sustainable monetization without requiring legal counsel for basic implementation.