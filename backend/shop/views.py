from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Category, Product, SearchLog
from .search import run_search, suggest
from .serializers import CategorySerializer, ProductDetailSerializer, ProductSerializer

RELATED_LIMIT = 8


def active_products():
    return (Product.objects.filter(is_active=True)
            .select_related('category__parent', 'collection')
            .prefetch_related('images', 'variants'))


class ProductList(generics.ListAPIView):
    serializer_class = ProductSerializer

    def get_queryset(self):
        qs = active_products()
        p = self.request.query_params
        if p.get('category'):
            qs = qs.filter(Q(category__slug=p['category']) | Q(category__parent__slug=p['category']))
        if p.get('signature') == 'true':
            qs = qs.filter(is_signature=True)
        if p.get('new') == 'true':
            qs = qs.filter(is_new=True)
        if p.get('q'):
            qs = qs.filter(Q(name__icontains=p['q']) | Q(description__icontains=p['q']))
        return qs


class ProductDetail(generics.RetrieveAPIView):
    serializer_class = ProductDetailSerializer
    lookup_field = 'slug'

    def get_queryset(self):
        return active_products()


class RelatedProducts(generics.GenericAPIView):
    """Same category first, then same collection, then the wider department. Never the product itself."""
    serializer_class = ProductSerializer

    def get(self, request, slug):
        base = get_object_or_404(active_products(), slug=slug)
        department = base.category.parent or base.category
        picked, seen = [], {base.id}

        def take(qs):
            for p in qs.exclude(id__in=seen)[:RELATED_LIMIT]:
                if len(picked) < RELATED_LIMIT and p.id not in seen:
                    picked.append(p)
                    seen.add(p.id)

        take(active_products().filter(category=base.category))
        if base.collection_id:
            take(active_products().filter(collection_id=base.collection_id))
        take(active_products().filter(Q(category=department) | Q(category__parent=department)))
        return Response(ProductSerializer(picked, many=True, context={'request': request}).data)


class CategoryList(generics.ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer


@api_view(['GET'])
def search_view(request):
    params = request.query_params
    data = run_search(params)
    # log only plain searches (not every filter click), first page only
    if data['query'] and data['page'] == 1 and set(params.keys()) <= {'q', 'sort', 'page', 'page_size'}:
        SearchLog.objects.create(query=data['query'].lower()[:200], results=data['count'])
    return Response({
        'query': data['query'],
        'corrected_query': data['corrected_query'],
        'count': data['count'],
        'page': data['page'],
        'page_size': data['page_size'],
        'total_pages': data['total_pages'],
        'results': ProductSerializer(data['products'], many=True, context={'request': request}).data,
        'facets': data['facets'],
    })


@api_view(['GET'])
def suggest_view(request):
    s = suggest(request.query_params.get('q'))
    return Response({
        'queries': s['queries'],
        'categories': [{'name': c.name, 'slug': c.slug, 'parent': c.parent.name if c.parent else None}
                       for c in s['categories']],
        'collections': [{'name': c.name, 'slug': c.slug} for c in s['collections']],
        'products': ProductSerializer(s['products'], many=True, context={'request': request}).data,
    })