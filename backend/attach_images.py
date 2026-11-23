import os
from django.core.files import File
from django.conf import settings
from shop.models import Product, ProductImage

# Folder containing your product images
folder = os.path.join(settings.BASE_DIR, "seed_images")

if not os.path.isdir(folder):
    raise FileNotFoundError(f"Image folder not found: {folder}")

for fname in sorted(os.listdir(folder)):
    base, ext = os.path.splitext(fname)

    if ext.lower() not in (".jpg", ".jpeg", ".png", ".webp"):
        continue

    # Expected filename: Product Name 1.jpg
    # Example: ORIGIN Canvas Jacket 1.jpg
    product_name, separator, order_text = base.rpartition(" ")

    if not separator or not order_text.isdigit():
        print("SKIP - Invalid filename:", fname)
        continue

    order = int(order_text)
    product_name = product_name.strip()

    try:
        product = Product.objects.get(name__iexact=product_name)
    except Product.DoesNotExist:
        print("NO PRODUCT FOUND:", product_name, "| File:", fname)
        continue
    except Product.MultipleObjectsReturned:
        print("DUPLICATE PRODUCT NAME:", product_name)
        continue

    if ProductImage.objects.filter(product=product, order=order).exists():
        print("ALREADY EXISTS:", fname)
        continue

    image_path = os.path.join(folder, fname)

    with open(image_path, "rb") as image_file:
        ProductImage.objects.create(
            product=product,
            order=order,
            alt=product.name,
            image=File(image_file, name=fname)
        )

    print("ADDED:", fname, "->", product.name)

print("Finished attaching product images.")