"""What each category shows on the website: live, coming_soon or hidden.

The admin picks a status per category:
  auto         live when the category (or something inside it) has products, otherwise coming soon  [default]
  active       always live
  coming_soon  Coming Soon page, and so is everything inside it
  hidden       left out of the menu, and everything inside it
A product counts for its own category AND every extra place it is shown in (Product.placements).
A product that is out of stock still counts: an empty category and a sold-out product are different things.
"""
from collections import defaultdict

from .models import Category, Product


def category_states():
    """{category id: {status, state, own_count, total_count}} computed with three queries."""
    cats = {c['id']: c for c in Category.objects.values('id', 'parent_id', 'status')}
    ids = defaultdict(set)  # category id -> ids of active products shown there
    for cid, pid in Product.objects.filter(is_active=True).values_list('category_id', 'id'):
        ids[cid].add(pid)
    for cid, pid in Product.placements.through.objects.filter(product__is_active=True).values_list('category_id', 'product_id'):
        ids[cid].add(pid)
    return _resolve(cats, ids)


def _resolve(cats, ids):
    children = defaultdict(list)
    for c in cats.values():
        children[c['parent_id']].append(c['id'])

    out, total = {}, {}

    def subtree(cid):
        if cid not in total:
            s = set(ids.get(cid, ()))
            for k in children.get(cid, []):
                s |= subtree(k)
            total[cid] = s
        return total[cid]

    def resolve(cid, forced):
        c = cats[cid]
        if forced is None and c['status'] in ('hidden', 'coming_soon'):
            forced = c['status']                       # a forced status also covers everything inside it
        kids_live = [resolve(k, forced) for k in children.get(cid, [])]
        if forced:
            state = 'hidden' if forced == 'hidden' else 'coming_soon'
        elif c['status'] == 'active':
            state = 'live'
        else:
            state = 'live' if ids.get(cid) or any(kids_live) else 'coming_soon'
        out[cid] = {'status': c['status'], 'state': state, 'own_count': len(ids.get(cid, ())), 'total_count': len(subtree(cid))}
        return state == 'live'

    for cid in children.get(None, []):
        resolve(cid, None)
    return out