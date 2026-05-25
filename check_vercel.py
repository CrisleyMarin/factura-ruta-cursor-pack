import urllib.request, urllib.error
urls=[
 'https://factura-ruta-cursor-pack.vercel.app',
 'https://factura-ruta-cursor-pack.vercel.app/styles.css',
 'https://factura-ruta-cursor-pack.vercel.app/app.js',
 'https://factura-ruta-cursor-pack-73vy4wkre-crisleymarins-projects.vercel.app',
 'https://factura-ruta-cursor-pack-73vy4wkre-crisleymarins-projects.vercel.app/styles.css',
 'https://factura-ruta-cursor-pack-73vy4wkre-crisleymarins-projects.vercel.app/app.js',
]
for u in urls:
    try:
        r=urllib.request.urlopen(u, timeout=10)
        data=r.read()
        print(u, r.getcode(), len(data))
    except urllib.error.HTTPError as e:
        print(u, 'HTTP', e.code)
    except Exception as e:
        print(u, 'ERR', type(e).__name__, e)
