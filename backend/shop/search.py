import re
from collections import Counter
from difflib import get_close_matches

from django.db.models import Q
from django.http import QueryDict

from .models import Category, Collection, Product, ProductVariant, SIZES

WORD = re.compile(r'[a-z0-9]+')
SEASONS = {'spring': 'spring', 'summer': 'summer', 'autumn': 'autumn', 'fall': 'autumn', 'winter': 'winter'}
GENDERS = {'men': 'men', 'mens': 'men', 'man': 'men', 'male': 'men',
           'women': 'women', 'womens': 'women', 'woman': 'women', 'female': 'women', 'ladies': 'women',
           'kids': 'kids', 'kid': 'kids', 'boys': 'kids', 'girls': 'kids'}
SYN = {'shari': 'saree', 'sari': 'saree', 'punjabi': 'panjabi', 'trouser': 'pant', 'coat': 'jacket'}
FILLER = {'size', 'in', 'for', 'and', 'the', 'a', 'with', 'of'}
PRICE_MAX = re.compile(r'(?:under|below|less than|upto|up to|max)\s*(?:৳|tk|bdt)?\s*(\d+)')
PRICE_MIN = re.compile(r'(?:above|over|more than|from|min)\s*(?:৳|tk|bdt)?\s*(\d+)')


def norm(w):
    w = w.lower()
    if len(w) > 3 and w.endswith('s') and not w.endswith('ss'):
        w = w[:-1]
    return SYN.get(w, w)


def words(text):
    return [norm(w) for w in WORD.findall((text or '').lower())]


def parse_query(q):
    q = (q or '').lower().replace(',', '')
    out = {'content': [], 'raw': [], 'sizes': set(), 'seasons': set(), 'gender': None, 'min': None, 'max': None}
    m = PRICE_MAX.search(q)
    if m:
        out['max'] = int(m.group(1))
        q = q.replace(m.group(0), ' ')
    m = PRICE_MIN.search(q)
    if m:
        out['min'] = int(m.group(1))
        q = q.replace(m.group(0), ' ')
    toks = WORD.findall(q)
    for t in toks:
        up = t.upper()
        if t in FILLER:
            continue
        if t in SEASONS:
            out['seasons'].add(SEASONS[t])
        elif t in GENDERS:
            out['gender'] = GENDERS[t]
        elif up in ('XS', 'XL', 'XXL') or (up in ('S', 'M', 'L') and len(toks) > 1):
            out['sizes'].add(up)
        elif len(t) >= 2:
            out['content'].append(norm(t))
            out['raw'].append(t)
    out['empty'] = not (out['content'] or out['sizes'] or out['seasons'] or out['gender']
                        or out['min'] is not None or out['max'] is not None)
    return out


def vocabulary():
    v = set()
    for name, tags in Product.objects.filter(is_active=True).values_list('name', 'tags'):
        v.update(words(name))
        v.update(words(tags))
    for n in Category.objects.values_list('name', flat=True):
        v.update(words(n))
    for n in Collection.objects.values_list('name', flat=True):
        v.update(words(n))
    for c in ProductVariant.objects.values_list('color', flat=True).distinct():
        v.update(words(c))
    return {w for w in v if len(w) >= 2}


def correct(content):
    """Fix small typos using words that really exist in the catalogue."""
    vocab = vocabulary()
    fixed, changed = [], False
    for t in content:
        if t in vocab or any(w.startswith(t) for w in vocab):
            fixed.append(t)
            continue
        m = get_close_matches(t, vocab, n=1, cutoff=0.78)
        fixed.append(m[0] if m else t)
        changed = changed or bool(m)
    return fixed, changed


def candidates(parsed):
    qs = (Product.objects.filter(is_active=True)
          .select_related('category__parent', 'collection')
          .prefetch_related('images', 'variants'))
    terms = set(parsed['content']) | set(parsed['raw'])
    if terms:
        cond = Q()
        for t in terms:
            cond |= (Q(name__icontains=t) | Q(description__icontains=t) | Q(tags__icontains=t)
                     | Q(category__name__icontains=t) | Q(category__parent__name__icontains=t)
                     | Q(collection__name__icontains=t) | Q(variants__color__icontains=t))
        qs = qs.filter(cond).distinct()
    return qs[:600]


def hit(t, ws):
    if t in ws:
        return 2
    if len(t) >= 2 and any(w.startswith(t) for w in ws):
        return 1
    return 0


def score_product(p, parsed):
    content = parsed['content']
    name_w = words(p.name)
    cat_w = words(p.category.name) + (words(p.category.parent.name) if p.category.parent else [])
    coll_w = words(p.collection.name) if p.collection else []
    tag_w = words(p.tags)
    variants = list(p.variants.all())
    color_w = [w for v in variants for w in words(v.color)]
    desc_w = set(words(p.description))

    score, strong, desc_hits = 0.0, 0, 0
    for t in content:
        got = False
        for ws, weight in ((name_w, 10), (cat_w, 6), (coll_w, 5), (color_w, 6), (tag_w, 4)):
            h = hit(t, ws)
            if h:
                score += weight if h == 2 else weight * 0.7
                got = True
        if got:
            strong += 1
        elif t in desc_w:
            score += 1
            desc_hits += 1
    if content and ' '.join(content) in ' '.join(name_w):
        score += 20

    # a product needs a real match, not just one word buried in the description
    ok = (strong >= 1 or desc_hits == len(content)) if content else True

    if parsed['sizes']:
        has = any(v.size in parsed['sizes'] and v.stock > 0 for v in variants)
        score += 4 if has else 0
        if not content and not has:
            ok = False
    if parsed['seasons']:
        match = p.season in parsed['seasons']
        score += 4 if match else (1 if p.season == 'all' else 0)
        if not content and not (match or p.season == 'all'):
            ok = False
    root = p.category.parent or p.category
    if parsed['gender'] and root.slug != parsed['gender']:
        ok = False
    price = float(p.price)
    if parsed['max'] is not None and price > parsed['max']:
        ok = False
    if parsed['min'] is not None and price < parsed['min']:
        ok = False
    return score, ok


def multi(params, key):
    out = []
    for v in params.getlist(key):
        out += [x.strip().lower() for x in v.split(',') if x.strip()]
    return out


def number(params, key):
    try:
        return float(params.get(key))
    except (TypeError, ValueError):
        return None


def passes(p, f):
    root = p.category.parent or p.category
    if f['category'] and not ({p.category.slug, root.slug} & set(f['category'])):
        return False
    if f['collection'] and not (p.collection and p.collection.slug in f['collection']):
        return False
    vs = list(p.variants.all())
    if f['size'] and not any(v.size.lower() in f['size'] for v in vs):
        return False
    if f['color'] and not any(v.color.lower() in f['color'] for v in vs):
        return False
    if f['season'] and p.season not in f['season']:
        return False
    price = float(p.price)
    if f['min_price'] is not None and price < f['min_price']:
        return False
    if f['max_price'] is not None and price > f['max_price']:
        return False
    stock = sum(v.stock for v in vs)
    if f['availability'] == 'in_stock' and stock <= 0:
        return False
    if f['availability'] == 'out_of_stock' and stock > 0:
        return False
    if f['signature'] and not p.is_signature:
        return False
    if f['new'] and not p.is_new:
        return False
    return True


def ts(p):
    return p.created_at.timestamp()


SORTS = {
    'recommended': lambda x: (-x[1], -x[0].is_signature, -x[0].is_new, -ts(x[0])),
    'newest': lambda x: -ts(x[0]),
    'featured': lambda x: (-x[0].is_signature, -ts(x[0])),
    'best_selling': lambda x: (-x[0].is_signature, -ts(x[0])),  # no sales data yet
    'price_asc': lambda x: float(x[0].price),
    'price_desc': lambda x: -float(x[0].price),
}


def build_facets(products):
    cat, sub, col, size, color, season = Counter(), Counter(), Counter(), Counter(), Counter(), Counter()
    prices = []
    for p in products:
        root = p.category.parent or p.category
        cat[(root.slug, root.name)] += 1
        if p.category.parent:
            sub[(p.category.slug, p.category.name, root.slug)] += 1
        if p.collection:
            col[(p.collection.slug, p.collection.name)] += 1
        season[p.season] += 1
        vs = p.variants.all()
        for s in {v.size for v in vs if v.size}:
            size[s] += 1
        for c in {v.color for v in vs if v.color}:
            color[c] += 1
        prices.append(float(p.price))

    def fmt(counter, keys):
        return [dict(zip(keys, k), count=n) for k, n in sorted(counter.items(), key=lambda kv: -kv[1])]

    ordered = [s for s in SIZES if s in size] + sorted(set(size) - set(SIZES))
    return {
        'categories': fmt(cat, ('slug', 'name')),
        'subcategories': fmt(sub, ('slug', 'name', 'parent')),
        'collections': fmt(col, ('slug', 'name')),
        'sizes': [{'value': s, 'count': size[s]} for s in ordered],
        'colors': [{'value': c, 'count': n} for c, n in sorted(color.items())],
        'seasons': [{'value': s, 'count': n} for s, n in season.items() if s != 'all'],
        'price': {'min': min(prices) if prices else 0, 'max': max(prices) if prices else 0},
    }


def run_search(params):
    q = (params.get('q') or '').strip()[:100]
    parsed = parse_query(q)
    corrected = None
    if parsed['content']:
        fixed, changed = correct(parsed['content'])
        if changed:
            parsed['content'] = fixed
            corrected = ' '.join(fixed)

    f = {
        'category': multi(params, 'category'), 'collection': multi(params, 'collection'),
        'size': multi(params, 'size'), 'color': multi(params, 'color'), 'season': multi(params, 'season'),
        'min_price': number(params, 'min_price'), 'max_price': number(params, 'max_price'),
        'availability': params.get('availability', ''),
        'signature': params.get('signature') == 'true', 'new': params.get('new') == 'true',
    }

    matched = []
    if not (q and parsed['empty']):
        for p in candidates(parsed):
            s, ok = score_product(p, parsed)
            if ok:
                matched.append((p, s))

    items = [x for x in matched if passes(x[0], f)]  # `matched` (before filters) feeds the facets
    items.sort(key=SORTS.get(params.get('sort'), SORTS['recommended']))

    try:
        page = max(1, int(params.get('page', 1)))
    except ValueError:
        page = 1
    try:
        page_size = min(48, max(1, int(params.get('page_size', 12))))
    except ValueError:
        page_size = 12
    total = len(items)
    return {
        'query': q, 'corrected_query': corrected, 'count': total, 'page': page, 'page_size': page_size,
        'total_pages': max(1, -(-total // page_size)),
        'products': [p for p, _ in items[(page - 1) * page_size: page * page_size]],
        'facets': build_facets([p for p, _ in matched]),
    }


def suggest(q):
    q = (q or '').strip()[:60]
    empty = {'queries': [], 'categories': [], 'collections': [], 'products': []}
    if len(q) < 2:
        return empty
    params = QueryDict(mutable=True)
    params.update({'q': q, 'page_size': 5})
    data = run_search(params)
    names = []
    for p in data['products']:
        if p.name not in names:
            names.append(p.name)
    return {
        'queries': names[:4],
        'categories': list(Category.objects.filter(name__icontains=q).select_related('parent')[:4]),
        'collections': list(Collection.objects.filter(name__icontains=q)[:3]),
        'products': data['products'],
    }