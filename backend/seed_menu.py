"""One-time (safe to run again): arrange the categories into the menu columns the Navbar had before.

Run from the backend folder:   python manage.py shell < seed_menu.py
- existing categories keep their products, web address and status; they only get a group and an order
- missing menu items are created
- nothing is deleted
"""
from django.utils.text import slugify

from shop.models import Category

FEATURED = ['New Arrivals', 'Best Sellers', 'HEEM Essentials', 'Signature Collection']
BAGS = ['Bags', 'Caps & Hats', 'Belts', 'Wallets', 'Sunglasses']

MENU = {
    'Men': [
        ('Clothing', ['T-Shirts', 'Shirts', 'Polo Shirts', 'Panjabi', 'Hoodies & Sweatshirts', 'Jackets & Coats',
                      'Sweaters', 'Pants', 'Jeans', 'Shorts', 'Suits & Blazers']),
        ('Featured', FEATURED),
        ('Accessories', BAGS),
    ],
    'Women': [
        ('Clothing', ['T-Shirts', 'Tops', 'Shirts', 'Saree', 'Dresses', 'Hoodies & Sweatshirts', 'Jackets & Coats',
                      'Sweaters', 'Pants', 'Jeans', 'Skirts', 'Blazers']),
        ('Featured', FEATURED),
        ('Accessories', ['Bags', 'Belts', 'Scarves', 'Sunglasses', 'Caps & Hats']),
    ],
    'Kids': [
        ('Boys', ['@Boys=All Boys', 'T-Shirts', 'Shirts', 'Panjabi', 'Hoodies', 'Jackets', 'Pants', 'Shorts']),
        ('Girls', ['@Girls=All Girls', 'Tops', 'Dresses', 'T-Shirts', 'Hoodies', 'Jackets', 'Pants', 'Skirts']),
        ('Featured', ['New Arrivals', 'Best Sellers', 'Kids Collection']),
        ('Shop by age', ['2–4 Years', '5–7 Years', '8–12 Years', '13–16 Years']),
    ],
    'Lifestyle': [
        ('Accessories', BAGS + ['Scarves']),
        ('Lifestyle', ['Fragrance', 'Travel Accessories', 'Watches', 'Lifestyle Objects']),
        ('Featured', ['New Lifestyle', 'Best Sellers', 'HEEM Essentials']),
    ],
}


def slug_for(parent, group, name):
    for base in (slugify(f'{parent.name} {name}'), slugify(f'{parent.name} {group} {name}')):
        if base and not Category.objects.filter(slug=base).exists():
            return base
    n = 2
    base = slugify(f'{parent.name} {group} {name}')
    while Category.objects.filter(slug=f'{base}-{n}').exists():
        n += 1
    return f'{base}-{n}'


made = placed = 0
for top, groups in MENU.items():
    parent, _ = Category.objects.get_or_create(name=top, parent=None)
    pos = 0
    for group, names in groups:
        for entry in names:
            pos += 10
            old = None
            if entry.startswith('@'):                      # existing category to keep under a new name: @OldName=NewName
                old, name = entry[1:].split('=')
            else:
                name = entry
            c = (Category.objects.filter(parent=parent, group=group, name=name).first()
                 or Category.objects.filter(parent=parent, name=old or name, group='').first())
            if c is None:
                c = Category.objects.create(parent=parent, name=name, group=group, position=pos, slug=slug_for(parent, group, name))
                made += 1
            else:
                c.name, c.group, c.position = name, group, pos
                c.save(update_fields=['name', 'group', 'position'])
                placed += 1

print(f'Done: {placed} existing categories arranged, {made} new ones created, {Category.objects.count()} categories in total.')