# -*- coding: utf-8 -*-
"""Dos defectos del XLSForm original que se corrigen en la version movil.

1. rep_piso pide "los pisos en los que se encuentran los danos" y su propia ayuda
   dice "puede indicar varios, por ejemplo: 1 y 3", pero lleva una validacion
   numerica (. >= 0 and . <= 100). Cualquier respuesta con varios pisos la
   incumple, asi que la pregunta es imposible de responder como se indica.

2. rep_res_col_a y rep_res_col_l son las lineas del resumen de reparabilidad para
   el recubrimiento de columnas, pero su condicion mira ${rep_Panete_dano} y
   ${rep_Panete_tipo} en lugar de ${rep_col_dano} y ${rep_col_tipo}. Es un
   copiar-pegar del bloque de panete: el resumen de columnas aparece o
   desaparece segun lo que se haya respondido del panete.
"""

CORRIGE = {
    'rep_piso': {
        'valida': "regex(., '^[0-9]{1,3}( *[,y] *[0-9]{1,3})*$')",
        'vmsg': 'Escriba uno o varios pisos separados por coma o por «y». Por ejemplo: 1, 3',
    },
    'rep_res_col_a': {
        'relevant': "${rep_col_dano}='si' and ${rep_col_tipo}='area'",
    },
    'rep_res_col_l': {
        'relevant': "${rep_col_dano}='si' and ${rep_col_tipo}='lineal'",
    },
}
