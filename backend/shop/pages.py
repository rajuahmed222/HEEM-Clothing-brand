"""Public read-only data for the Collections and Size Guide pages. No new models: it reads what the admin already manages."""
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import SIZE_COLUMNS, Category, Collection, SizeChart
from .serializers import ProductSerializer
from .views import active_products


@api_view(['GET'])
def collections_view(request):
    """Collections that have at least one active product. The cover is the first photo of the collection's first product."""
    out = []
    for c in Collection.objects.all():
        products = list(active_products().filter(collection=c))
        if not products:
            continue
        cover = None
        for p in products:
            imgs = list(p.images.all())
            if imgs:
                cover = request.build_absolute_uri(imgs[0].image.url)
                break
        out.append({'name': c.name, 'slug': c.slug, 'count': len(products), 'cover': cover})
    return Response(out)


@api_view(['GET'])
def collection_detail_view(request, slug):
    c = get_object_or_404(Collection, slug=slug)
    products = active_products().filter(collection=c)
    return Response({
        'name': c.name, 'slug': c.slug,
        'products': ProductSerializer(products, many=True, context={'request': request}).data,
    })


def _chart(ch):
    """A chart, or None when it has no rows (so the page can say 'awaiting confirmed measurements')."""
    if ch is None:
        return None
    rows = list(ch.rows.all())
    cols = [{'key': k, 'label': label} for k, label in SIZE_COLUMNS if any(getattr(r, k) for r in rows)]
    if not rows or not cols:
        return None
    return {
        'title': ch.title,
        'unit': 'cm' if ch.unit.strip().lower().startswith('cm') else 'in',
        'note': ch.note,
        'columns': cols,
        'rows': [{'size': r.size, **{c['key']: getattr(r, c['key']) for c in cols}} for r in rows],
    }


@api_view(['GET'])
def size_guide_view(request):
    """Departments (Men, Women ...) with their garment categories. A garment without its own chart uses its department's."""
    charts = {c.category_id: c for c in SizeChart.objects.prefetch_related('rows')}
    cats = list(Category.objects.all())
    out = []
    for parent in (c for c in cats if c.parent_id is None):
        own = _chart(charts.get(parent.id))
        children = []
        for ch in (c for c in cats if c.parent_id == parent.id):
            mine = _chart(charts.get(ch.id))
            children.append({'slug': ch.slug, 'name': ch.name, 'chart': mine or own, 'inherited': mine is None and own is not None})
        out.append({'slug': parent.slug, 'name': parent.name, 'chart': own, 'children': children})
    return Response(out)