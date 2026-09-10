# -*- coding: utf-8 -*-
"""Transforma el XLSForm en un esquema optimizado para movil.
Imprime el informe de podas y escribe esquema.json"""
import json, re, io, collections
from correcciones import CORRIGE

d = json.load(open("form.json", encoding="utf-8"))
survey, choices = d["survey"], d["choices"]

lists = collections.OrderedDict()
for c in choices:
    lists.setdefault(c["list_name"], []).append(c)

def limpia(t):
    if t is None: return ""
    t = re.sub(r'<br\s*/?>', ' | ', str(t), flags=re.I)
    t = re.sub(r'<[^>]+>', '', t)
    t = t.replace('&nbsp;', ' ').replace('&times;', 'x').replace('&amp;', '&')
    t = re.sub(r'\s*\|\s*', ' | ', t)
    return re.sub(r'[ \t]+', ' ', t).strip(' |')

MOD = {'a': 'eval', 'b': 'rep', 'c': 'dem', 'd': 'dem', 's': 'gen', 'z': 'gen'}

# ---------------------------------------------------------------- podas
# 1. identidad del evaluador -> perfil recordado en el dispositivo
PERFIL = ['entidad','entidad_otra','evaluador_nombre','evaluador_tipo_doc',
          'evaluador_num_doc','evaluador_profesion','evaluador_profesion_otra',
          'evaluador_matricula']
# 2. preguntas que el propio flujo de la app resuelve
FLUJO  = ['confirmacion']
# la fecha/hora la pone el dispositivo: se guarda, pero no se pregunta
AUTO   = {'fecha_hora_inspeccion': 'now()'}
# notas que quedaron huerfanas al retirar los bloques de dibujo
HUERFANAS = ['nota_huella','nota_huella_area','esc_escombros_nota']
# el area de huella deja de preguntarse y pasa a calcularse por un solo camino
INJECTA = {'dem_volumen': {'name':'dem_area_huella','tipo':'calc',
    'calc':'if(${area_huella_mapa} > 0, ${area_huella_mapa}, ${area_huella_campo})'}}
# la misma pregunta partida por la rama: se unifica y sube al paso comun
MOVER  = {'esc_personas_desaparecidas': ('c0_estado',
    'Personas aún desaparecidas en la edificación o entre los escombros')}
# 3. duplicados exactos: la misma pregunta partida en dos por la rama
FUSION = {'esc_personas_desaparecidas_t': 'esc_personas_desaparecidas'}
# 4. el area de huella se pregunta cuatro veces por cuatro caminos
AREA   = ['dem_area_huella']          # se calcula, ya no se pregunta
# 5. geoshape: sin mapa no se puede dibujar en una pagina web sin red
SINMAPA = ['huella_geom','huella_area','esc_escombros_geom','esc_escombros_area',
           'huella_coincide']
# notas puramente decorativas (encabezados que la app ya rotula)
NOTA_DECOR = re.compile(r'^\s*\d\.\d\.\s|^(Registro fotogr|Identificación del)')

PAT_UNO = re.compile(r"selected\(\$\{(\w+)\}\s*,\s*'([^']+)'\)|\$\{(\w+)\}\s*=\s*'([^']+)'")

def disyuncion(rel):
    """Si la condicion es solo 'el padre vale A (o B o C)', devuelve (padre, [codigos])."""
    if not rel: return None
    padres, codigos, resto = set(), [], rel
    for m in PAT_UNO.finditer(rel):
        padres.add(m.group(1) or m.group(3))
        codigos.append(m.group(2) or m.group(4))
        resto = resto.replace(m.group(0), '')
    resto = re.sub(r'\bor\b|\s|\(|\)', '', resto)
    if len(padres) == 1 and resto == '' and codigos:
        return padres.pop(), codigos
    return None

def es_otro(codigos):
    return all(c.startswith('otr') or c.endswith('_otro') or c == 'mixto' for c in codigos)

def clase_fusion(codigos, f_padre, adyacente):
    """Solo tres patrones se funden en el control del padre. El resto sigue suelto."""
    if es_otro(codigos):
        return 'campo "¿cuál?" fundido en su propia opción'
    if set(codigos) == {'l','m','s'}:
        return 'foto o detalle fundido en la escala de daño'
    if adyacente and f_padre.get('lista') in ('si_no','si_no_noclaro'):
        return 'detalle que abre un sí/no, dentro del mismo control'
    return None

def ui_de(q, n_opts):
    t = q['type']
    if t.startswith('select_one '):
        ln = t.split(' ', 1)[1]
        if ln == 'nivel_nlms':                    return 'escala'
        if ln in ('si_no','si_no_noclaro'):       return 'segmentado'
        if n_opts <= 4:                           return 'segmentado' if n_opts <= 3 else 'tarjetas'
        if n_opts <= 7:                           return 'tarjetas'
        return 'lista'
    if t.startswith('select_multiple '):          return 'chips'
    if t == 'integer':                            return 'contador'
    if t == 'decimal':                            return 'numero'
    if t == 'text':
        ap = q.get('appearance','') or ''
        if 'multiline' in ap:                     return 'parrafo'
        if 'numbers' in ap:                       return 'numerico'
        return 'texto'
    return {'image':'camara','geopoint':'gps','date':'fecha','dateTime':'fechahora',
            'barcode':'codigo'}.get(t, t)

UNIDAD = [(r'\(m2\)|\(m²\)','m²'), (r'\(m\)','m'), (r'\(cm\)','cm'), (r'\(m3\)|\(m³\)','m³')]
def unidad(lbl):
    for pat, u in UNIDAD:
        if re.search(pat, lbl, re.I): return u
    return None

# ---------------------------------------------------------------- recorrido
podado = collections.defaultdict(list)
pasos, paso = [], None
pendientes = {}          # name -> field ya emitido, para colgarle subcampos
orden = []

for q in survey:
    t, name = q['type'], q.get('name')

    if t == 'begin group':
        paso = {'id': name, 'titulo': limpia(q.get('label')), 'mod': MOD[name[0]],
                'relevant': q.get('relevant'), 'campos': []}
        pasos.append(paso); continue
    if t in ('end group','end repeat','begin repeat','start','end','today','username','deviceid'):
        if t == 'begin repeat': podado['sin mapa (bloque repetible de dibujo)'].append(name)
        continue
    if paso is None: continue

    if name in PERFIL:  podado['perfil del evaluador recordado'].append(name); continue
    if name in FLUJO:   podado['lo resuelve el propio flujo de la app'].append(name); continue
    if name in AUTO:
        podado['lo pone el dispositivo, no se pregunta'].append(name)
        paso['campos'].append({'name': name, 'tipo': 'auto', 'calc': AUTO[name]}); continue
    if name in HUERFANAS:
        podado['sin mapa (bloque repetible de dibujo)'].append(name); continue
    if name in FUSION:  podado['duplicado exacto de otra pregunta'].append(name); continue
    if name in AREA:    podado['area de huella: cuatro caminos, uno solo'].append(name); continue
    if name in SINMAPA: podado['sin mapa (bloque repetible de dibujo)'].append(name); continue

    lbl = limpia(q.get('label'))

    if t == 'note':
        if NOTA_DECOR.match(lbl) and '${' not in (q.get('label') or ''):
            podado['encabezado decorativo que la app ya rotula'].append(name); continue
        kind = 'vivo' if '${' in (q.get('label') or '') else 'ayuda'
        paso['campos'].append({'name': name, 'tipo': 'nota', 'kind': kind,
                               'texto': limpia(q.get('label')), 'relevant': q.get('relevant')})
        continue

    if t == 'calculate':
        if name in INJECTA: paso['campos'].append(dict(INJECTA[name]))
        paso['campos'].append({'name': name, 'tipo': 'calc', 'calc': q.get('calculation'),
                               'relevant': q.get('relevant')})
        continue

    # -------- fusiones: subcampos que se despliegan dentro del control del padre
    rel = q.get('relevant')
    if t in ('text', 'image'):
        dis = disyuncion(rel)
        if dis:
            padre, codigos = dis
            f_padre = pendientes.get(padre)
            clase = clase_fusion(codigos, f_padre, orden[-1:] == [padre]) if f_padre else None
            if clase and len(f_padre.get('subs', [])) < 3:
                f_padre.setdefault('subs', []).append({
                    'name': name, 'label': lbl, 'tipo': t,
                    'ui': ui_de(q, 0), 'cuando': codigos,
                    'req': q.get('required') == 'yes',
                    'ayuda': limpia(q.get('hint')) or None,
                    'valida': q.get('constraint'), 'vmsg': limpia(q.get('constraint_message'))})
                podado[clase].append(name)
                continue

    # -------- campo normal
    f = {'name': name, 'label': lbl, 'tipo': t.split(' ')[0],
         'relevant': rel, 'req': q.get('required') == 'yes'}
    if q.get('hint'):        f['ayuda'] = limpia(q['hint'])
    if q.get('constraint'):  f['valida'] = q['constraint']; f['vmsg'] = limpia(q.get('constraint_message'))
    if q.get('default'):     f['def'] = q['default']
    if q.get('choice_filter'): f['filtro'] = q['choice_filter']
    n_opts = 0
    if t.startswith('select_'):
        ln = t.split(' ', 1)[1]; f['lista'] = ln; n_opts = len(lists.get(ln, []))
    f['ui'] = ui_de(q, n_opts)
    u = unidad(lbl)
    if u: f['unidad'] = u; f['label'] = re.sub(r'\s*\((m2|m²|m|cm|m3|m³)\)\s*$', '', lbl, flags=re.I)
    paso['campos'].append(f)
    pendientes[name] = f
    orden.append(name)

# encadenados material -> sistema: se marcan para pintarse en una sola tarjeta
CADENAS = [('mat_estructural','sist_estructural'), ('mat_entrepiso','sist_entrepiso'),
           ('mat_sop_cubierta','sop_cubierta')]
idx = {f['name']: (p, f) for p in pasos for f in p['campos'] if 'name' in f}
for madre, hija in CADENAS:
    if madre in idx and hija in idx:
        idx[madre][1]['cadena'] = hija
        idx[hija][1]['esHija'] = True

# el material del muro danado se prellena con los muros de la seccion 4
if 'rep_muro_material' in idx:
    idx['rep_muro_material'][1]['prellena'] = 'muros_divisorios'

# aplicar las correcciones a los dos defectos del XLSForm original
_apl = []
for _p in pasos:
    for _f in _p['campos']:
        if _f.get('name') in CORRIGE:
            _f.update(CORRIGE[_f['name']]); _apl.append(_f['name'])

# unificar la pregunta partida por la rama y subirla al paso comun
_idx = {p['id']: p for p in pasos}
for _n, (_destino, _lbl) in MOVER.items():
    for _p in pasos:
        for _f in list(_p['campos']):
            if _f.get('name') == _n and _p['id'] != _destino and _destino in _idx:
                _p['campos'].remove(_f)
                _f['label'] = _lbl
                _f['relevant'] = None
                _idx[_destino]['campos'].append(_f)

pasos = [p for p in pasos if p['campos']]

esq = {
    'meta': {'titulo': 'Encuesta integral post-sismo', 'form_id': 'eval_post_sismo_col',
             'version': '4.0.0-movil', 'origen': 'ad5ce3ac27d847a1be59668d55e2ae2c'},
    'perfil': PERFIL,
    'pasos': pasos,
    'listas': {k: [{'v': str(c['name']), 'l': limpia(c['label']),
                    'f': str(c.get('material') or c.get('departamento') or '')}
                   for c in v] for k, v in lists.items()},
}
io.open('esquema.json','w',encoding='utf-8').write(json.dumps(esq, ensure_ascii=False, separators=(',',':')))

# ---------------------------------------------------------------- informe
preg = [f for p in pasos for f in p['campos'] if f.get('tipo') not in ('nota','calc','auto')]
print('=== PODA ===')
tot = 0
for k, v in sorted(podado.items(), key=lambda x: -len(x[1])):
    print('  %2d  %s' % (len(v), k))
    print('      ' + ', '.join(v))
    tot += len(v)
print('  --- %d campos retirados de la vista' % tot)
print()
print('preguntas visibles ahora :', len(preg))
print('pasos                    :', len(pasos))
print('controles con subcampos  :', len([f for f in preg if 'subs' in f]))
print('subcampos fundidos       :', sum(len(f['subs']) for f in preg if 'subs' in f))
print()
print('=== CONTROLES ===')
for u, n in collections.Counter(f['ui'] for f in preg).most_common():
    print('  %-12s %3d' % (u, n))

# ---------------------------------------------------------------- integridad
definidos = set()
for p in pasos:
    for f in p['campos']:
        definidos.add(f['name'])
        for sub in f.get('subs', []): definidos.add(sub['name'])
definidos |= set(PERFIL) | {'inicio','fin','fecha_hoy','usuario','dispositivo'}

REF = re.compile(r'\$\{(\w+)\}')
rotas = collections.defaultdict(set)
for p in pasos:
    for txt in [p.get('relevant')]:
        for r in REF.findall(txt or ''):
            if r not in definidos: rotas[r].add('paso ' + p['id'])
    for f in p['campos']:
        for campo in ('relevant','calc','texto','valida','def','filtro'):
            for r in REF.findall(str(f.get(campo) or '')):
                if r not in definidos: rotas[r].add(f['name'])
        for sub in f.get('subs', []):
            for r in REF.findall(str(sub.get('valida') or '')):
                if r not in definidos: rotas[r].add(sub['name'])

print()
print('=== CORRECCIONES AL FORMULARIO ORIGINAL ===')
for _n in _apl:
    print('  ' + _n)

print()
print('=== REFERENCIAS ROTAS ===')
if not rotas:
    print('  ninguna')
for r, quien in sorted(rotas.items()):
    print('  ${%s} <- %s' % (r, ', '.join(sorted(quien))))
