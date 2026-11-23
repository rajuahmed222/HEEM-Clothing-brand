from shop.models import Category,Collection

TREE = {
    'Men': ['T-Shirts', 'Shirts', 'Polo Shirts', 'Panjabi', 'Hoodies & Sweatshirts',
            'Jackets & Coats', 'Sweaters', 'Pants', 'Jeans', 'Shorts', 'Suits & Blazers'],
    'Women': ['T-Shirts', 'Tops', 'Shirts', 'Saree', 'Dresses', 'Hoodies & Sweatshirts',
              'Jackets & Coats', 'Sweaters', 'Pants', 'Jeans', 'Skirts', 'Blazers'],
    'Kids': ['Boys', 'Girls'],


    'Lifestyle': ['Bags', 'Caps & Hats', 'Belts', 'Wallets', 'Sunglasses',
                  'Scarves', 'Fragrance', 'Watches', 'Travel Accessories', 'Lifestyle Objects'], 
}

for top, subs in TREE.items():
    parent, _ = Category.objects.get_or_create(name=top, parent=None)
    for s in subs:
        Category.objects.get_or_create(name=s, parent=parent)

print('Done:', Category.objects.count(), 'categories')




for name in ['HEEM Signature', 'New Collection', 'Essentials', 'Limited Edition',
             'Winter Collection', 'Summer Collection', 'ORIGIN 01', 'FORM 01']:
    Collection.objects.get_or_create(name=name)

print('Done:', Collection.objects.count(), 'collections')