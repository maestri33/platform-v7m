"""Probe temporário pra ler spec do GO."""
import json
spec = json.load(open('go-spec.json', encoding='utf-8-sig'))
# Schema do param 'instance' em /instance/create
print("=== Schema do param 'instance' em /instance/create ===")
op = spec['paths']['/instance/create']['post']
for p in op.get('parameters', []):
    if p['name'] == 'instance':
        ref = (p.get('schema') or {}).get('$ref', '')
        if ref and ref.startswith('#/definitions/'):
            defn_name = ref.rsplit('/', 1)[-1]
            defn = spec.get('definitions', {}).get(defn_name, {})
            print(f"  {defn_name}:")
            for field, ft in (defn.get('properties') or {}).items():
                typ = ft.get('type', ft.get('$ref', ft.get('items', {}).get('type', '?')))
                desc = ft.get('description', '')
                print(f"    {field}: {typ}  ({desc})")
            print(f"  required: {defn.get('required', [])}")
