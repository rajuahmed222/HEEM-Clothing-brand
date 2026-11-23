from shop.models import Category, Collection, Product, ProductVariant

DATA = [
    dict(name='ORIGIN Canvas Jacket', price=4290, cat=('Men', 'Jackets & Coats'), col='HEEM Signature',
         season='winter', tags='canvas, relaxed, outerwear', sig=True, new=True,
         desc='Heavy canvas jacket with a relaxed, structured fit.',
         variants=[('M', 'Black', 10), ('L', 'Black', 8), ('XL', 'Black', 4), ('M', 'Beige', 6), ('L', 'Beige', 5)]),
    dict(name='Signature Oversized Tee', price=1890, cat=('Men', 'T-Shirts'), col='HEEM Signature',
         season='summer', tags='oversized, cotton, essential', sig=True, new=True,
         desc='Heavyweight cotton tee with an oversized cut.',
         variants=[('S', 'Black', 10), ('M', 'Black', 12), ('L', 'Black', 9), ('XL', 'Black', 5), ('M', 'White', 8), ('L', 'White', 6)]),
    dict(name='Essential Relaxed Shirt', price=2790, cat=('Men', 'Shirts'), col='Essentials',
         season='summer', tags='linen, relaxed, essential', sig=True, new=False,
         desc='Soft linen-blend shirt with a relaxed fit.',
         variants=[('M', 'Black', 7), ('L', 'Black', 6), ('M', 'Beige', 8), ('L', 'Beige', 5), ('M', 'White', 9), ('XL', 'White', 4), ('M', 'Navy', 5)]),
    dict(name='HEEM Structured Pants', price=3490, cat=('Men', 'Pants'), col='HEEM Signature',
         season='all', tags='tailored, structured', sig=True, new=False,
         desc='Tailored pants with a clean, structured line.',
         variants=[('S', 'Black', 6), ('M', 'Black', 9), ('L', 'Black', 7), ('M', 'Grey', 5), ('L', 'Grey', 4)]),
    dict(name='Heritage Panjabi', price=3200, cat=('Men', 'Panjabi'), col='Limited Edition',
         season='autumn', tags='embroidered, festive, cotton', sig=False, new=True,
         desc='Fine cotton panjabi with subtle embroidery.',
         variants=[('M', 'Navy', 6), ('L', 'Navy', 8), ('XL', 'Navy', 4), ('L', 'Burgundy', 5)]),
    dict(name='Silk Saree', price=8900, cat=('Women', 'Saree'), col='Limited Edition',
         season='all', tags='silk, handwoven, festive', sig=False, new=True,
         desc='Handwoven silk saree with a soft drape.',
         variants=[('', 'Burgundy', 5), ('', 'Olive', 4)]),
    dict(name='Wool Winter Coat', price=12500, cat=('Women', 'Jackets & Coats'), col='Winter Collection',
         season='winter', tags='wool, tailored, outerwear', sig=False, new=False,
         desc='Tailored wool coat for the cold season.',
         variants=[('S', 'Black', 4), ('M', 'Black', 6), ('L', 'Black', 3), ('M', 'Beige', 4)]),
    dict(name='Linen Summer Dress', price=4600, cat=('Women', 'Dresses'), col='Summer Collection',
         season='summer', tags='linen, flowy, lightweight', sig=False, new=True,
         desc='Light linen dress with a flowing cut.',
         variants=[('S', 'Beige', 5), ('M', 'Beige', 7), ('L', 'Beige', 4), ('S', 'White', 4), ('M', 'White', 6)]),
    dict(name='Classic Leather Belt', price=1500, cat=('Lifestyle', 'Belts'), col='Essentials',
         season='all', tags='leather, classic', sig=False, new=False,
         desc='Full-grain leather belt with a brushed buckle.',
         variants=[('', 'Black', 12), ('', 'Brown', 10)]),
    dict(name='Boys Cotton Panjabi', price=1900, cat=('Kids', 'Boys'), col='New Collection',
         season='autumn', tags='cotton, festive', sig=False, new=True,
         desc='Soft cotton panjabi for boys.',
         variants=[('S', 'White', 6), ('M', 'White', 6), ('M', 'Navy', 5)]),
]

for d in DATA:
    top, sub = d['cat']
    p, _ = Product.objects.update_or_create(name=d['name'], defaults=dict(
        description=d['desc'], price=d['price'],
        category=Category.objects.get(name=sub, parent__name=top),
        collection=Collection.objects.get(name=d['col']),
        season=d['season'], tags=d['tags'],
        is_signature=d['sig'], is_new=d['new'], is_active=True))
    for size, color, stock in d['variants']:
        ProductVariant.objects.update_or_create(product=p, size=size, color=color, defaults={'stock': stock})

print('Done:', Product.objects.count(), 'products,', ProductVariant.objects.count(), 'variants')