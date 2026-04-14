import json
import os
import requests
from urllib.parse import urlparse

# Ensure directires exist
os.makedirs('assets/products', exist_ok=True)

# Download hero image
hero_url = "https://nathansdecants.myshopify.com/cdn/shop/files/nathan_s_decants_image.png?v=1759020369"
print(f"Downloading hero image: {hero_url}")
r = requests.get(hero_url)
with open('assets/hero.png', 'wb') as f:
    f.write(r.content)

# Download product images
with open('data/products.json', 'r') as f:
    data = json.load(f)

for product in data['products']:
    handle = product['handle']
    for i, image in enumerate(product['images']):
        src = image['src']
        # Remove query params
        base_url = src.split('?')[0]
        ext = os.path.splitext(base_url)[1] or '.jpg'
        filename = f"{handle}_{i}{ext}"
        filepath = os.path.join('assets/products', filename)
        
        if not os.path.exists(filepath):
            print(f"Downloading {filename} from {src}")
            try:
                r = requests.get(src, timeout=10)
                if r.status_code == 200:
                    with open(filepath, 'wb') as f_img:
                        f_img.write(r.content)
                else:
                    print(f"Failed to download {filename}: Status {r.status_code}")
            except Exception as e:
                print(f"Error downloading {filename}: {e}")

print("Done!")
