"""Every picture or video on the website that is not a product photo, and where it goes.
Add a line here to get a new upload slot in Admin > Site media."""

NAV_LABELS = {
    'new': ('New', 'Latest collection', 'Signature'),
    'men': ('Men', 'Men’s collection', 'Essentials'),
    'women': ('Women', 'Women’s collection', 'Signature'),
    'kids': ('Kids', 'Kids collection', 'Little essentials'),
    'lifestyle': ('Lifestyle', 'Objects', 'Fragrance'),
}
TOP_RATED = ['Canvas jacket', 'Oversized tee', 'Linen panjabi', 'Silk saree']

# (key, label, kind, hint). kind: image | video | either
GROUPS = [
    ('Home page', [
        ('home_hero', 'Top banner (video or photo)', 'either', 'Wide, 16:9. A short silent loop works best (MP4, up to 50 MB).'),
        ('home_men', 'Men tile', 'image', 'Large photo. The word “Men” sits on its lower left.'),
        ('home_women', 'Women tile', 'image', 'Large photo. The word “Women” sits on its lower left.'),
        ('home_origin', 'New collection: big photo', 'image', 'Portrait, 4:5.'),
        ('home_origin_1', 'New collection: Full outfit', 'image', 'Portrait, 4:5.'),
        ('home_origin_2', 'New collection: Fabric detail', 'image', 'Portrait, 4:5.'),
        ('home_origin_3', 'New collection: Product close-up', 'image', 'Portrait, 4:5.'),
        ('home_origin_4', 'New collection: Model styling', 'image', 'Portrait, 4:5.'),
        ('home_cta', 'Bottom banner “Discover your next look”', 'image', 'Wide. A dark layer is added so the text stays readable.'),
    ]),
    ('Menu pictures (shown when you hover a menu on a computer)', [
        (f'nav_{s}_{n}', f'{name}: picture {n}', 'image', f'Default caption: {labels[n - 1]}. Portrait or square. Shown in a tile about 14 rem tall.')
        for s, (name, *labels) in NAV_LABELS.items() for n in (1, 2)
    ]),
    ('Search box', [
        (f'search_top_{i + 1}', f'Top rated: tile {i + 1}', 'image', f'Default caption: {t}. Portrait, 3:4.') for i, t in enumerate(TOP_RATED)
    ]),
    ('Lookbook page', [
        ('lb_hero', 'Lookbook: cover (video or photo)', 'either', 'Full width, landscape 16:9 or taller. The campaign title sits on top, so keep the face high in the frame.'),
        ('lb_intro', 'Lookbook: introduction photo', 'image', 'Portrait, 4:5. Shown beside the editorial text.'),
        ('lb_g1', 'Lookbook gallery 1: full-body, portrait', 'image', 'Portrait, 3:4 or 4:5. Large frame.'),
        ('lb_g2', 'Lookbook gallery 2: landscape', 'image', 'Landscape, 3:2 or 16:9.'),
        ('lb_g3', 'Lookbook gallery 3: back view', 'image', 'Portrait, 3:4.'),
        ('lb_g4', 'Lookbook gallery 4: fabric detail', 'image', 'Square or portrait close-up.'),
        ('lb_g5', 'Lookbook gallery 5: full-body, portrait', 'image', 'Portrait, 3:4 or 4:5. Large frame.'),
        ('lb_g6', 'Lookbook gallery 6: landscape', 'image', 'Landscape, 3:2 or 16:9.'),
        ('lb_g7', 'Lookbook gallery 7: front view', 'image', 'Portrait, 3:4.'),
        ('lb_g8', 'Lookbook gallery 8: detail', 'image', 'Square or portrait close-up.'),
        ('lb_look1', 'Shop the look 1: full look', 'image', 'Portrait, 3:4. The products chosen for this look are listed beside it.'),
        ('lb_look2', 'Shop the look 2: full look', 'image', 'Portrait, 3:4.'),
        ('lb_look3', 'Shop the look 3: full look', 'image', 'Portrait, 3:4.'),
        ('lb_c1', 'Campaign 1 cover (current)', 'image', 'Portrait, 4:5.'),
        ('lb_c2', 'Campaign 2 cover', 'image', 'Portrait, 4:5.'),
        ('lb_c3', 'Campaign 3 cover', 'image', 'Portrait, 4:5.'),
        ('lb_c4', 'Campaign 4 cover', 'image', 'Portrait, 4:5.'),
    ]),
    ('Coming Soon page', [
        ('coming_soon', 'Background photo', 'image', 'Wide. It is shown dim behind the text.'),
    ]),
]

# Menu and search tiles may show a product instead of (or without) an uploaded picture
SLOTS = {k: dict(key=k, label=l, kind=kind, hint=h, group=g, product_ok=k.startswith(('nav_', 'search_top_')))
         for g, items in GROUPS for k, l, kind, h in items}

IMAGE_EXT = {'.jpg', '.jpeg', '.png', '.webp', '.avif'}
VIDEO_EXT = {'.mp4', '.webm'}
MAX_IMAGE = 8 * 1024 * 1024
MAX_VIDEO = 50 * 1024 * 1024