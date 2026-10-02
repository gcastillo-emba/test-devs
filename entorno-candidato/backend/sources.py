import json
import hashlib
from urllib.parse import urljoin, urlparse, parse_qs
from urllib.request import urlopen


def download(base='http://localhost:8000'):
    """Solo API pública; valida completitud observable sin afirmar consistencia transaccional."""
    url = base + '/registros?pagina=1&tamano=500'
    seen = set()
    fingerprints = set()
    records = []
    total = None
    expected_page = 1
    while url:
        parsed = urlparse(url)
        if (parsed.scheme, parsed.netloc) != (urlparse(base).scheme, urlparse(base).netloc) or parsed.path != '/registros':
            raise ValueError('Paginación apunta fuera de la API pública')
        params = parse_qs(parsed.query)
        sizes = params.get('tamano', [])
        if params.get('pagina') != [str(expected_page)] or len(sizes) != 1 or not sizes[0].isdigit() or not 1 <= int(sizes[0]) <= 500:
            raise ValueError('Paginación incompleta o tamaño inesperado')
        requested_size = int(sizes[0])
        if url in seen:
            raise ValueError('Página repetida')
        seen.add(url)
        with urlopen(url, timeout=20) as response:
            page = json.load(response)
        if not isinstance(page, dict) or not {'datos', 'pagina', 'tamano', 'total', 'siguiente'}.issubset(page):
            raise ValueError('Respuesta de paginación incompatible')
        if type(page['total']) is not int or page['total'] < 0 or type(page['pagina']) is not int or type(page['tamano']) is not int or page['pagina'] != expected_page or page['tamano'] != requested_size:
            raise ValueError('Metadatos de paginación incompatibles')
        if total is None: total = page['total']
        if page['total'] != total: raise ValueError('Total cambió durante la descarga')
        data = page['datos']
        if not isinstance(data, list) or len(data) > requested_size:
            raise ValueError('Página de datos inválida')
        if data:
            fingerprint = hashlib.sha256(json.dumps(data, sort_keys=True).encode()).digest()
            if fingerprint in fingerprints:
                raise ValueError('Contenido de página repetido')
            fingerprints.add(fingerprint)
        records.extend(data)
        if len(records) > total: raise ValueError('Recuento supera total')
        next_page = page['siguiente']
        if next_page is not None and (not isinstance(next_page, str) or not next_page or not data):
            raise ValueError('Paginación incompleta')
        if next_page is None and len(records) != total:
            raise ValueError('Descarga parcial: recuento distinto del total')
        url = urljoin(base, next_page) if next_page is not None else None
        expected_page += 1
    return records
