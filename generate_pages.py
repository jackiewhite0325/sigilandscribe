#!/usr/bin/env python3
# Sigil and Scribe - single page generator (replaces gen_pages.py + patch_gen.py)
#
# Every book/offering page shares one stylesheet: book.css
# Every link is a plain relative path. No referrer sniffing, no token patching.
#
# Run from inside sigilandscribe/:
#   python3 generate_pages.py
# Output lands directly in sigilandscribe/ (no pages/ subfolder), alongside index.html

import os

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = ROOT
os.makedirs(OUT, exist_ok=True)

SECTIONS = {
    "children":     ("Children's Books", "100s"),
    "wellness":     ("Health & Wellness", "200s"),
    "more":         ("More Books", "300s"),
    "fiction":      ("Fiction", "400s"),
    "subconscious": ("The Subconscious Shelf", "700s"),
}

ITEMS = [
    dict(id="muffin-wiggles", call="100.1", title="Muffin Gets the Wiggles", author="J. White", section="children",
         cover="images/children/book1-cover-v2.png",
         tagline="Book 1 of the Muffin the Pitbull Puppy series.",
         shelf_note='Book 1 of 26 · <a href="muffin-series.html" style="color:var(--amber-deep);text-decoration:underline;">View full Muffin series shelf</a>',
         description="A 26-book series helping kids understand and cope with chronic illness, inspired by a real dog who had seizures and taught her family what courage looks like. Five percent of net series royalties are donated quarterly to St. Jude Children's Research Hospital in Muffin's name.",
         meta_desc="A 26-book series helping kids understand and cope with chronic illness, inspired by a real dog who had seizures and taught her family what courage looks like.",
         links=[("Buy: Kindle", "https://www.amazon.com/dp/B0HDYB7624?tag=jwhitemuffin-20"), ("Buy: Paperback", "https://www.amazon.com/dp/B0HF43T8BV?tag=jwhitemuffin-20")]),

    dict(id="bingo-card-chronic-illness", call="200.1", title="The Bingo Card of Chronic Illness: Have you tried this?", author="J. White", section="wellness",
         cover="images/health-wellness/bingo-cover-v2.jpg",
         tagline="A dark humor validation sheet for the weary.",
         description="A sharp, funny, deeply validating look at the endless parade of advice chronically ill people face, from yoga to kale smoothies to \"just stop talking about it.\" Fifteen chapters unpack the myths behind the most common miracle cures, each closing with its own Bingo Card breakdown, verdict scripts for the hard conversations, and community rants. A survival guide for anyone living with chronic illness, or loving someone who is.",
         meta_desc="A sharp, funny, validating look at the miracle-cure advice chronically ill people face, with a Bingo Card breakdown in every chapter.",
         links=[("Buy: Paperback", "https://www.amazon.com/dp/B0G4V4SGJ1?tag=jwhitemuffin-20")]),

    dict(id="many-faces-of-grace", call="300.2", title="The Many Faces of Grace", author="J. White", section="more",
         cover="images/more-books/grace-cover-v2.png",
         tagline="Cross-cultural perspectives and interpretations.",
         description="Across cultures, religions, languages, and eras, the word grace has carried countless shades of beauty, mercy, favor, compassion, and transcendence. A sweeping journey through how a single word shaped spiritual thought, connection, creativity, and the search for meaning.",
         links=[("Buy: Paperback", "https://www.amazon.com/dp/B0G4CTRVQZ?tag=jwhitemuffin-20")]),

    dict(id="dont-quote-me", call="300.1", title="Don't Quote Me: Smart Mouths", author="J. White", section="more",
         cover="images/more-books/dqm-cover-v2.jpg",
         tagline="Wit, wisdom, and sass from history's greatest thinkers.",
         description="A witty and insightful collection that captures the essence of clever wordplay and memorable expressions, with sharp observations and thoughtful commentary on the power of language. Quotes from history's greatest thinkers, for language enthusiasts and anyone who appreciates the art of smart conversation.",
         meta_desc="A witty and insightful collection of clever wordplay and memorable expressions, with sharp observations on the power of language.",
         links=[("Get the Book", "https://www.amazon.com/dp/B0FL9V16YT?tag=jwhitemuffin-20")],
         og_image="https://jackiewhite0325.github.io/sigilandscribe/images/site/sigil_scribe_cover_1200x400.jpg?v=2"),

    dict(id="syncretic-ritualist-almanac", call="300.3", title="Syncretic Ritualist Almanac", author="Petra C.Ht.", section="more",
         cover="images/more-books/petra-cover-v1.jpg",
         tagline="A working almanac for ritual and practice.",
         description="An almanac blending ritual traditions into a practical, syncretic guide, for readers building their own practice rather than following one script.",
         links=[("Get the Book", "https://books2read.com/u/475ep7")],
         og_image="https://jackiewhite0325.github.io/sigilandscribe/images/site/sigil_scribe_cover_1200x400.jpg?v=2"),

    dict(id="ties-that-tear", call="400.1", title="The Ties That Tear", author="S.J. Helix", section="fiction",
         cover="images/fiction/ttt1-cover.png",
         # pen name house form is S.J. Helix (periods), locked by JW 08-30
         tagline="Book 1 of the Trinity Tension Saga.",
         description="The opening thread of the Trinity Tension Saga: a modern journey tangled in a Tudor dynasty trap, with Anna Boleyn at the heart of it. In production: this cover is a working draft.",
         links=[], comingSoon=True),

    dict(id="untying-the-knot", call="400.2", title="Untying the Knot", author="S.J. Helix", section="fiction",
         cover=None,
         tagline="Book 2 of the Trinity Tension Saga.",
         description="The second thread of the Trinity Tension Saga. Coming soon.",
         links=[], comingSoon=True),

    dict(id="walking-a-tightrope", call="400.3", title="Walking a Tightrope", author="S.J. Helix", section="fiction",
         cover=None,
         tagline="Book 3 of the Trinity Tension Saga.",
         description="The third thread of the Trinity Tension Saga. Coming soon.",
         links=[], comingSoon=True),

]

SECTION_CLASS = {
    "children": "sc-children", "wellness": "sc-wellness", "more": "sc-more",
    "fiction": "sc-fiction", "subconscious": "sc-subconscious",
}

PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} | Sigil and Scribe Library</title>
<meta name="description" content="{meta_desc}">
<link rel="icon" href="images/site/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Sigil and Scribe | The Immersive Library">
<meta property="og:title" content="{title} | Sigil and Scribe">
<meta property="og:description" content="{meta_desc}">
<meta property="og:image" content="{og_image}">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&family=Inter:wght@400;500;600&family=Courier+Prime:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="book.css">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-FBP908LERR"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag('js', new Date());
  gtag('config', 'G-FBP908LERR');
</script>
</head>
<body>
<header class="site-header">
  <div class="inner">
    <a class="brand" href="index.html">Sigil <span>&amp;</span> Scribe</a>
    <span class="bp-crumb">{call} {title}</span>
  </div>
</header>
<main class="page">
  <div class="bp-grid">
    <div class="bp-cover">
      {cover_html}
      {badge_html}
    </div>
    <div class="bp-info">
      <span class="bp-call">{call}</span><span class="bp-author">by {author}</span>
      <h2 class="bp-title">{title}</h2>
      <p class="bp-tagline">{tagline}</p>
      <div class="bp-desc"><p>{description}</p></div>
      {note_html}
      <div class="bp-actions">{actions_html}</div>
    </div>
  </div>
  <div class="bp-shelf-wrap">
    <p class="bp-shelf-label">On the shelf</p>
    <div class="sc-section-label"><h2>{section_label}</h2><span>{call_range}</span></div>
    <div class="sc-shelf">
      <div class="sc-shelf-board"></div>
      {shelf_html}
    </div>
  </div>
</main>
<footer class="site-footer"><p>&copy; 2026 Sigil and Scribe, LLC &middot; J. White &middot; <a href="privacy.html">Privacy</a> &middot; <a href="terms.html">Terms</a> &middot; <a href="return-policy.html">Returns</a> &middot; <a href="https://ko-fi.com/sigilandscribe" target="_blank" rel="noopener">Ko-fi</a></p>
  <p>Muffin the Pitbull&trade; is a trademark of Sigil and Scribe, LLC.</p></footer>
</body>
</html>
"""


def meta_description(item):
    """Meta/og description: explicit override, else a clean sentence-boundary trim."""
    if item.get("meta_desc"):
        return item["meta_desc"]
    desc = item["description"]
    if len(desc) <= 150:
        return desc
    cut = desc[:150]
    for sep in (". ", "! ", "? "):
        idx = cut.rfind(sep)
        if idx != -1:
            return cut[:idx + 1]
    return cut.rstrip() + "..."


def cover_html_for(item):
    if item.get("cover"):
        return '<img src="{0}" alt="Cover of {1}" onerror="this.src=\'images/children/book1-cover-v2.png\'">'.format(
            item["cover"], item["title"])
    cls = SECTION_CLASS[item["section"]]
    return ('<div class="sc-ph-cover {cls}"><div><p class="sc-ph-top">Sigil and Scribe</p>'
            '<p class="sc-ph-title">{title}</p><p class="sc-ph-sub">{tagline}</p></div>'
            '<div><p class="sc-ph-bottom">{author}</p></div></div>').format(
        cls=cls, title=item["title"], tagline=item["tagline"], author=item["author"])


def build_page(item, all_items):
    badge_html = '<div class="bp-badge">In Production</div>' if item.get("comingSoon") else ""

    actions_html = "".join(
        '<a class="sc-btn sc-btn-primary" href="{0}" target="_blank" rel="noopener">{1}</a>'.format(url, label)
        for label, url in item["links"]
    )
    if not actions_html:
        actions_html = '<button class="sc-btn sc-btn-secondary" disabled>Drafting Phase</button>'

    note_html = ""
    if item.get("note"):
        note_html = '<p class="bp-note">{0}</p>'.format(item["note"])
    if item.get("section") == "fiction" and not item.get("note"):
        note_html = '<p class="bp-note">Fiction · Adult readers. Mature themes noted as content information. <a href="fiction.html" style="color:var(--amber-deep);text-decoration:underline;">Back to the fiction shelf</a>.</p>'

    section_label, call_range = SECTIONS[item["section"]]
    cls = SECTION_CLASS[item["section"]]

    siblings = [s for s in all_items if s["section"] == item["section"]]
    shelf_parts = []
    for i, sib in enumerate(siblings):
        variant = "" if i == 0 else " sc-v{0}".format(min(i + 1, 3))
        if sib["id"] == item["id"]:
            shelf_parts.append(
                '<div class="sc-book-wrapper"><div class="sc-spine {cls}{v} sc-current" '
                'aria-label="{title}, this book"><span class="sc-stitle">{title}</span>'
                '<span class="sc-sauthor">{author}</span><span class="sc-call">{call}</span></div></div>'.format(
                    cls=cls, v=variant, title=sib["title"], author=sib["author"], call=sib["call"]))
        else:
            coming = " sc-coming" if sib.get("comingSoon") else ""
            shelf_parts.append(
                '<div class="sc-book-wrapper"><a class="sc-spine {cls}{v}{coming}" '
                'href="{link}.html" aria-label="{title}"><span class="sc-stitle">{title}</span>'
                '<span class="sc-sauthor">{author}</span><span class="sc-call">{call}</span></a></div>'.format(
                    cls=cls, v=variant, coming=coming, link=sib["id"],
                    title=sib["title"], author=sib["author"], call=sib["call"]))
    shelf_html = "".join(shelf_parts) if len(siblings) > 1 else (
        '<p style="font-family:\'Courier Prime\',monospace; font-size:11px; opacity:0.6; padding:20px;">{0}</p>'.format(
            item.get("shelf_note", "You have reached the end of this shelf section.")))

    return PAGE_TEMPLATE.format(
        title=item["title"], meta_desc=meta_description(item),
        call=item["call"], author=item["author"], tagline=item["tagline"],
        description=item["description"], cover_html=cover_html_for(item), badge_html=badge_html,
        note_html=note_html, actions_html=actions_html,
        section_label=section_label, call_range=call_range, shelf_html=shelf_html,
        og_image=item.get("og_image", "https://jackiewhite0325.github.io/sigilandscribe/images/site/social-share.jpg"),
    )


for item in ITEMS:
    out_file = os.path.join(OUT, "{0}.html".format(item["id"]))
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(build_page(item, ITEMS))

print("Generated {0} pages into {1}".format(len(ITEMS), OUT))
