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
         description="A 26-book series helping kids understand and cope with chronic illness, inspired by a real dog who had seizures and taught her family what courage looks like. Five percent of net series royalties are donated quarterly to St. Jude Children's Research Hospital in her name.",
         links=[("Buy: Kindle", "https://www.amazon.com/dp/B0HDYB7624"), ("Buy: Paperback", "https://www.amazon.com/dp/B0HF43T8BV")]),

    dict(id="bingo-card-chronic-illness", call="200.1", title="The Bingo Card of Chronic Illness", author="J. White", section="wellness",
         cover="images/health-wellness/bingo-cover-v2.jpg",
         tagline="A dark humor validation sheet for the weary.",
         description="An interactive workbook for those tracking difficult symptoms, medical gaslighting, and recovery milestones. Designed as a soft place to land when standard self-care frameworks fall short.",
         links=[("Buy: Kindle", "https://amazon.com")]),

    dict(id="many-faces-of-grace", call="200.2", title="The Many Faces of Grace", author="J. White", section="wellness",
         cover="images/health-wellness/grace-cover-v2.png",
         tagline="Meditations on chronic existence.",
         description="A companion compilation focusing on internal landscape shifts when moving from health into ongoing patient management strategies.",
         links=[("Buy: Paperback", "https://amazon.com")]),

    dict(id="dont-quote-me", call="300.1", title="Don't Quote Me: Smart Mouths", author="J. White", section="more",
         cover="images/more-books/dqm-cover-v2.jpg",
         tagline="Conversational essays regarding creative boundaries.",
         description="A series of sharp, funny breakdowns of the structural problems that show up during long solo production cycles.",
         links=[("Get the Book", "https://books2read.com")]),

    dict(id="axolotl-dreams", call="300.2", title="Axolotl Dreams", author="J. White", section="more",
         cover="images/more-books/axo-cover-v1.jpg",
         tagline="A coloring book, gently strange and calming.",
         description="A coloring journey built around the odd little charm of axolotls. A quiet, low-stakes creative outlet.",
         links=[("Buy: Paperback", "https://www.amazon.com/dp/B0FPDM6SG5")]),

    dict(id="syncretic-ritualist-almanac", call="300.3", title="Syncretic Ritualist Almanac", author="Petra C.Ht.", section="more",
         cover="images/more-books/petra-cover-v1.jpg",
         tagline="A working almanac for ritual and practice.",
         description="An almanac blending ritual traditions into a practical, syncretic guide, for readers building their own practice rather than following one script.",
         links=[("Get the Book", "https://books2read.com/u/475ep7")]),

    dict(id="ties-that-tear", call="400.1", title="The Ties That Tear", author="SJ Helix", section="fiction",
         cover="images/fiction/ttt1.1-working-cover1.png",
         tagline="Book 1 of the Ties That Tear series.",
         description="The opening thread of the Trinity Tension Saga: a modern journey tangled in a Tudor dynasty trap, with Anna Boleyn at the heart of it. In production: this cover is a working draft.",
         links=[], comingSoon=True),

    dict(id="untying-the-knot", call="400.2", title="Untying the Knot", author="SJ Helix", section="fiction",
         cover=None,
         tagline="Book 1 of the Untying the Knot series.",
         description="The second thread of the Trinity Tension Saga. Coming soon.",
         links=[], comingSoon=True),

    dict(id="walking-a-tightrope", call="400.3", title="Walking a Tightrope", author="SJ Helix", section="fiction",
         cover=None,
         tagline="Book 1 of the Walking a Tightrope series.",
         description="The third thread of the Trinity Tension Saga. Coming soon.",
         links=[], comingSoon=True),

    dict(id="hypnotherapy", call="700.1", title="The Subconscious Shelf", author="Petra C.Ht.", section="subconscious",
         cover=None,
         tagline="Guided neuroregulation, one track at a time.",
         description="Guided hypnotherapy audio, theta and isochronic acoustic tracks, and digital gaze anchors, curated by a Certified Hypnotherapist. Everything here is educational and relaxation-focused, never a substitute for professional care. The first gaze anchor is live in the study now; the audio library is being recorded.",
         links=[], comingSoon=True, note="The audio library is still being recorded. Want to know when it opens? Join The Study Letter from the main library page."),
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
<footer class="site-footer"><p>&copy; 2026 Sigil and Scribe, LLC &middot; J. White</p>
  <p>Muffin the Pitbull&trade; is a trademark of Sigil and Scribe, LLC.</p></footer>
</body>
</html>
"""


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
        '<p style="font-family:\'Courier Prime\',monospace; font-size:11px; opacity:0.6; padding:20px;">'
        'You have reached the end of this shelf section.</p>')

    return PAGE_TEMPLATE.format(
        title=item["title"], meta_desc=item["description"][:150],
        call=item["call"], author=item["author"], tagline=item["tagline"],
        description=item["description"], cover_html=cover_html_for(item), badge_html=badge_html,
        note_html=note_html, actions_html=actions_html,
        section_label=section_label, call_range=call_range, shelf_html=shelf_html,
    )


for item in ITEMS:
    out_file = os.path.join(OUT, "{0}.html".format(item["id"]))
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(build_page(item, ITEMS))

print("Generated {0} pages into {1}".format(len(ITEMS), OUT))
