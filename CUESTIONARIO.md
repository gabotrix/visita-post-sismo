# Encuesta integral

**ID del formulario:** `eval_post_sismo_col` · **Versión:** 4.0.0 · **Presentación:** por páginas · **Idioma:** español (es)

> Extraído del XLSForm del item `ad5ce3ac27d847a1be59668d55e2ae2c` de ArcGIS Online (Survey123 Connect 3.25.27).

## Resumen

- **200 preguntas** que responde el evaluador
- **30 secciones**
- 60 textos informativos, 22 campos calculados, 45 listas de opciones
- 2 bloques repetibles (huella de la construcción, huella de los escombros)

---

## Cuestionario


### 1. Información del evaluador

**1. Fecha y hora de la visita** **(obligatoria)**

- Campo: `fecha_hora_inspeccion` · Tipo: Fecha y hora
- Ayuda: Se prellena con la fecha y hora del dispositivo; puede corregirla.
- Valor por defecto: `now()`
- Validación: `. <= now()` — *La fecha y hora no pueden ser posteriores al momento actual*

**2. Escanear código QR** **(obligatoria)**

- Campo: `unit_Code` · Tipo: Código QR/barras

**3. Entidad** **(obligatoria)**

- Campo: `entidad` · Tipo: Selección única → lista `entidad`
- Opciones (4): `miyamoto` Miyamoto · `alcaldia` Alcaldía local · `ungrd` UNGRD · `otra` Otra

**4. ¿Cuál entidad?** **(obligatoria)**

- Campo: `entidad_otra` · Tipo: Texto
- Aparece si: `selected(entidad,'otra')`

**5. Nombre completo del evaluador** **(obligatoria)**

- Campo: `evaluador_nombre` · Tipo: Texto

**6. Tipo de documento** **(obligatoria)**

- Campo: `evaluador_tipo_doc` · Tipo: Selección única → lista `tipo_documento`
- Opciones (3): `cc` Cédula de ciudadanía · `ce` Cédula de extranjería · `pasaporte` Pasaporte

**7. Número de documento** **(obligatoria)**

- Campo: `evaluador_num_doc` · Tipo: Texto

**8. Profesión** **(obligatoria)**

- Campo: `evaluador_profesion` · Tipo: Selección única → lista `profesion`
- Opciones (5): `ingeniero_civil` Ingeniero civil · `arquitecto` Arquitecto · `ingeniero_catastral` Ingeniero catastral o topográfico · `tecnologo` Tecnólogo en construcción · `otra` Otra

**9. ¿Cuál profesión?** **(obligatoria)**

- Campo: `evaluador_profesion_otra` · Tipo: Texto
- Aparece si: `selected(evaluador_profesion,'otra')`

**10. Matrícula profesional**

- Campo: `evaluador_matricula` · Tipo: Texto


### 2. Localización

**11. Departamento** **(obligatoria)**

- Campo: `departamento` · Tipo: Selección única → lista `departamento`
- Opciones (2): `17` Caldas · `66` Risaralda

**12. Municipio** **(obligatoria)**

- Campo: `municipio` · Tipo: Selección única → lista `municipio`
- Opciones filtradas por: `departamento=${departamento}`
- Opciones (2): `66001` Pereira · `17001` Manizales

**13. Barrio / Vereda** **(obligatoria)**

- Campo: `barrio_vereda` · Tipo: Texto

**14. Zona** **(obligatoria)**

- Campo: `zona` · Tipo: Selección única → lista `zona`
- Opciones (2): `urbano` Urbano · `rural` Rural

> Identificación del construccion en la capa base Escoja la manzana y luego el construccion. Si el construccion no está dibujado en la capa base, márquelo y asígnele un identificador temporal.

**15. Manzana**

- Campo: `manzana` · Tipo: Texto

**16. ¿La construcción existe en la capa base?**

- Campo: `construccion_existe` · Tipo: Selección única → lista `si_no`
- Opciones (2): `si` Sí · `no` No

**17. Construcción**

- Campo: `construccion` · Tipo: Texto
- Aparece si: `construccion_existe='si'`
- Opciones filtradas por: `manzana=${manzana}`

**18. Identificador temporal de la construccion**

- Campo: `construccion_nueva` · Tipo: Texto
- Ayuda: Asigne un consecutivo, por ejemplo N01, N02.
- Aparece si: `construccion_existe='no'`

- *Calculado* `cod_registro` = `if(${construccion_existe}='si', concat(${manzana}, '-', ${construccion}), concat(${manzana}, '-N-', ${construccion_nueva}))`

- *Calculado* `area_huella_mapa` = `pulldata('edificaciones', 'area_huella', 'uid', ${cod_registro})`

> Código de registro: ${cod_registro}  
> *(se muestra si `string-length(cod_registro)>1`)*

> Área de huella según la capa base: ${area_huella_mapa} m²  
> *(se muestra si `construccion_existe='si'`)*

**19. Ubicación de la edificación** **(obligatoria)**

- Campo: `ubicacion` · Tipo: Punto en mapa
- Ayuda: Espere a que la precisión llegue a 20 m o mejor. Verifique en la imagen que el punto quede sobre la edificación evaluada.

- *Calculado* `longitud` = `pulldata("@geopoint", ${ubicacion}, "x")`

- *Calculado* `latitud` = `pulldata("@geopoint", ${ubicacion}, "y")`

- *Calculado* `precision_gps` = `pulldata("@geopoint", ${ubicacion}, "horizontalAccuracy")`

> La precisión del GPS es de ${precision_gps} m. Espere a mejorar la señal antes de continuar.  
> *(se muestra si `precision_gps > 20`)*

**20. ¿La huella de la capa base corresponde a la construcción?** **(obligatoria)**

- Campo: `huella_coincide` · Tipo: Selección única → lista `si_no`
- Aparece si: `construccion_existe='si'`
- Opciones (2): `si` Sí · `no` No

> Huella de la construcción Si la construcción no está en la capa base, o si la huella dibujada no corresponde, dibújela sobre la imagen.  
> *(se muestra si `construccion_existe='no' or huella_coincide='no'`)*


**Bloque repetible — Huella de la construcción** *(si `construccion_existe='no' or huella_coincide='no'`)*

**21. Dibuje la huella sobre la imagen** **(obligatoria)**

- Campo: `huella_geom` · Tipo: Polígono en mapa
- Ayuda: Recorra el perímetro de la construcción tocando el mapa.

- *Calculado* `huella_area` = `round(area(${huella_geom}),0)`

> Área dibujada: ${huella_area} m²


### 3. Identificación de la construcción

**22. Estado de colapso de la edificación** **(obligatoria)**

- Campo: `estado_colapso` · Tipo: Selección única → lista `estado_colapso`
- Ayuda: Obsérvelo desde afuera antes de continuar: define qué preguntas siguen.
- Opciones (3): `ninguno` En pie - sin colapso · `parcial` Parcialmente colapsada · `total` Totalmente colapsada

**23. ¿La edificación presenta inclinación evidente?** **(obligatoria)**

- Campo: `inclinacion` · Tipo: Selección única → lista `si_no`
- Aparece si: `estado_colapso!='total'`
- Opciones (2): `si` Sí · `no` No

**24. Nombre de la edificación**

- Campo: `nombre_edificacion` · Tipo: Texto

**25. Dirección** **(obligatoria)**

- Campo: `direccion` · Tipo: Texto

**26. Tipo de edificación** **(obligatoria)**

- Campo: `tipo_edificacion` · Tipo: Selección única → lista `tipo_edificacion`
- Opciones (2): `publica` Pública · `privada` Privada

**27. Uso principal** **(obligatoria)**

- Campo: `uso` · Tipo: Selección única → lista `uso`
- Opciones (12): `residencial` Residencial · `comercial` Comercial · `educacional` Educacional · `salud` Salud · `hotelero` Hotelero · `oficinas` Oficinas · `institucional` Institucional · `religioso` Religioso · `industrial` Industrial · `bodegas` Bodegas · `estacionamientos` Estacionamientos · `otro` Otro

**28. ¿Cuál uso?** **(obligatoria)**

- Campo: `uso_otro` · Tipo: Texto
- Aparece si: `selected(uso,'otro')`

**29. Año de construcción** **(obligatoria)**

- Campo: `ano_construccion` · Tipo: Selección única → lista `ano_construccion`
- Ayuda: Los rangos corresponden a las normas sismo resistentes vigentes.
- Aparece si: `estado_colapso!='total'`
- Opciones (5): `post_2010` 2010 o posterior (NSR-10) · `1998_2009` 1998 a 2009 (NSR-98) · `1984_1997` 1984 a 1997 (CCCSR-84) · `pre_1984` Anterior a 1984 (sin norma sismo resistente) · `desconocido` Desconocido

**30. Número de pisos sobre el nivel del suelo** **(obligatoria)**

- Campo: `num_pisos` · Tipo: Entero
- Aparece si: `estado_colapso!='total'`
- Validación: `. >= 0 and . <= 200` — *Ingrese un valor entre 0 y 200*

**31. Número de sótanos** **(obligatoria)**

- Campo: `num_sotanos` · Tipo: Entero
- Aparece si: `estado_colapso!='total'`
- Validación: `. >= 0 and . <= 20` — *Ingrese un valor entre 0 y 20*

**32. Dimensiones aproximadas - Frente (m)** **(obligatoria)**

- Campo: `dim_frente` · Tipo: Decimal
- Aparece si: `estado_colapso!='total'`
- Validación: `. > 0 and . < 1000` — *Ingrese un valor mayor que 0 y menor que 1000*

**33. Dimensiones aproximadas - Fondo (m)** **(obligatoria)**

- Campo: `dim_fondo` · Tipo: Decimal
- Aparece si: `estado_colapso!='total'`
- Validación: `. > 0 and . < 1000` — *Ingrese un valor mayor que 0 y menor que 1000*

- *Calculado* `area_huella_campo` = `${dim_frente} * ${dim_fondo}`


### 4. Sistema estructural, entrepiso y cubierta

> 4.1. Sistema estructural

**34. Material** **(obligatoria)**

- Campo: `mat_estructural` · Tipo: Selección única → lista `material_estructural`
- Opciones (6): `concreto` Concreto reforzado · `mamposteria` Mampostería · `acero` Acero · `madera` Madera · `bahareque_tapia` Bahareque o tapia · `otros` Otros

**35. Sistema estructural** **(obligatoria)**

- Campo: `sist_estructural` · Tipo: Selección única → lista `sistema_estructural`
- Opciones filtradas por: `material=${mat_estructural}`
- Opciones (16): `porticos` Pórticos · `muros_estructurales` Muros estructurales · `dual_combinado` Sistema dual o combinado · `prefabricado` Prefabricado · `mamp_confinada` Mampostería confinada · `mamp_reforzada` Mampostería reforzada · `mamp_simple` Mampostería simple · `porticos_arriostrados` Pórticos arriostrados · `porticos_no_arriostrados` Pórticos no arriostrados · `acero_otro` Otro · `estructura_madera` Estructura en madera · `estructura_guadua` Estructura en guadua · `muros_bahareque` Muros en bahareque · `muros_tapia` Muros en tapia · `mixto` Mixto · `ninguno` Ninguno

**36. Especifique cuáles** **(obligatoria)**

- Campo: `sist_estructural_otro` · Tipo: Texto
- Ayuda: Indique qué materiales y sistemas estructurales se combinan.
- Aparece si: `selected(sist_estructural,'acero_otro') or selected(sist_estructural,'mixto')`

> 4.2. Sistema de entrepiso

**37. Material**

- Campo: `mat_entrepiso` · Tipo: Selección única → lista `material_entrepiso`
- Opciones (4): `concreto` Concreto reforzado · `acero` Acero · `madera` Madera · `otro` Otro

**38. Sistema de entrepiso**

- Campo: `sist_entrepiso` · Tipo: Selección única → lista `sistema_entrepiso`
- Opciones filtradas por: `material=${mat_entrepiso}`
- Opciones (9): `placa_maciza` Placa maciza · `placa_aligerada` Placa aligerada · `steeldeck` Steeldeck / losacero · `vigas_con_conectores` Vigas con conectores · `vigas_sin_conectores` Vigas sin conectores · `vigas_madera` Vigas · `cerchas_madera` Cerchas · `mixto` Mixto · `entrepiso_otro` Otro

**39. Especifique cuáles** **(obligatoria)**

- Campo: `sist_entrepiso_otro` · Tipo: Texto
- Aparece si: `selected(sist_entrepiso,'entrepiso_otro') or selected(sist_entrepiso,'mixto')`

> 4.3. Soporte de la cubierta

**40. Material** **(obligatoria)**

- Campo: `mat_sop_cubierta` · Tipo: Selección única → lista `material_cubierta`
- Opciones (4): `concreto` Concreto reforzado · `acero` Acero · `madera` Madera · `otro` Otro

**41. Sistema de soporte de la cubierta** **(obligatoria)**

- Campo: `sop_cubierta` · Tipo: Selección única → lista `soporte_cubierta`
- Opciones filtradas por: `material=${mat_sop_cubierta}`
- Opciones (7): `vigas_concreto` Vigas de concreto · `placa_maciza_aligerada` Placa maciza o aligerada · `vigas_acero` Vigas de acero · `cerchas_acero` Cerchas de acero · `vigas_madera` Vigas de madera · `cerchas_madera` Cerchas de madera · `cubierta_otro` Otro

**42. ¿Cuál?** **(obligatoria)**

- Campo: `sop_cubierta_otro` · Tipo: Texto
- Aparece si: `selected(sop_cubierta,'cubierta_otro')`

> 4.4. Tipo de cubierta

**43. Tipo de cubierta** **(obligatoria)**

- Campo: `tipo_cubierta` · Tipo: Selección única → lista `tipo_cubierta`
- Opciones (6): `teja_zinc` Teja de zinc · `teja_barro` Teja de barro · `teja_fibrocemento` Teja de fibrocemento · `teja_plastica` Teja plástica · `plastico_paja` Plástico / paja · `otro` Otro

**44. ¿Cuál?** **(obligatoria)**

- Campo: `tipo_cubierta_otro` · Tipo: Texto
- Aparece si: `selected(tipo_cubierta,'otro')`

> 4.5. Muros

**45. Muros divisorios y de cerramiento** **(obligatoria)**

- Campo: `muros_divisorios` · Tipo: Selección múltiple → lista `muros`
- Ayuda: Puede marcar varios.
- Opciones (7): `ladrillo_hueco` Mampostería de ladrillo hueco de arcilla · `ladrillo_macizo` Mampostería de ladrillo macizo de arcilla · `bloque_concreto` Mampostería de bloque de concreto · `piedra` Mampostería en piedra · `drywall` Perfiles metálicos y placas de yeso (drywall) · `madera_guadua` Madera o guadua · `otro` Otro

**46. ¿Cuáles?** **(obligatoria)**

- Campo: `muros_otro` · Tipo: Texto
- Aparece si: `selected(muros_divisorios,'otro')`


### 5. Ocupantes y contacto

**47. ¿Le es posible obtener la información de ocupantes y/o propietario?** **(obligatoria)**

- Campo: `recoleccion_ocupantes` · Tipo: Selección única → lista `si_no`
- Opciones (2): `si` Sí · `no` No

**48. Nombre del propietario o responsable**

- Campo: `propietario` · Tipo: Texto
- Aparece si: `recoleccion_ocupantes='si'`

**49. Celular del propietario o responsable**

- Campo: `propietario_celular` · Tipo: Texto
- Ayuda: 10 dígitos, sin indicativo ni espacios.
- Aparece si: `recoleccion_ocupantes='si'`
- Validación: `string-length(.)=0 or regex(., '^[0-9]{10}$')` — *Debe tener 10 dígitos, sin espacios ni signos.*

**50. Documento del propietario o responsable**

- Campo: `propietario_documento` · Tipo: Texto
- Aparece si: `recoleccion_ocupantes='si'`

**51. Estado de la edificación al momento de la visita** **(obligatoria)**

- Campo: `estado_ocupacion` · Tipo: Selección única → lista `ocupacion`
- Aparece si: `recoleccion_ocupantes='si'`
- Opciones (2): `ocupada` Ocupada · `desocupada` Desocupada

**52. Hombres que habitan/habitaban la edificación**

- Campo: `hab_hombres` · Tipo: Entero
- Aparece si: `recoleccion_ocupantes='si'`
- Validación: `. >= 0` — *Debe ser mayor o igual a 0*

**53. Mujeres que habitan/habitaban la edificación**

- Campo: `hab_mujeres` · Tipo: Entero
- Aparece si: `recoleccion_ocupantes='si'`
- Validación: `. >= 0` — *Debe ser mayor o igual a 0*

**54. Personas menores de 18 años que habitan/habitaban la edificación**

- Campo: `hab_menores` · Tipo: Entero
- Aparece si: `recoleccion_ocupantes='si'`
- Validación: `. >= 0` — *Debe ser mayor o igual a 0*

**55. Personas mayores de 60 años que habitan/habitaban la edificación**

- Campo: `hab_mayores` · Tipo: Entero
- Aparece si: `recoleccion_ocupantes='si'`
- Validación: `. >= 0` — *Debe ser mayor o igual a 0*

- *Calculado* `hab_total` = `${hab_hombres} + ${hab_mujeres}`

> Total de habitantes: ${hab_total}  
> *(se muestra si `recoleccion_ocupantes='si'`)*


### 6. Registro fotográfico general

> Registro fotográfico Tome al menos dos: una vista general de la fachada y otra desde un costado, que deje ver la forma de la edificación.

**56. Fotografías de la edificación** **(obligatoria)**

- Campo: `foto_edificacion` · Tipo: Fotografía
- Ayuda: Máximo 4.
- Validación: `count-selected(.)<=4` — *Puede cargar máximo 4 fotografías*

**57. Descripción de las fotografías**

- Campo: `foto_descripcion` · Tipo: Texto


### 7. Ruta de la visita

> Ruta de la visita Si se diligencia la evaluación rápida de daños, el formulario lo guiará según la clasificación de habitabilidad. Si no se diligencia, indique el motivo y escoja manualmente los apartados que sí se van a levantar.

> Colapso total registrado en la sección 3. La visita continúa directamente en Demolición y escombros. No se diligencian Evaluación ni Reparabilidad.  
> *(se muestra si `estado_colapso='total'`)*

**58. ¿Se debe diligenciar la evaluación rápida de daños?** **(obligatoria)**

- Campo: `gate_evaluacion` · Tipo: Selección única → lista `si_no`
- Aparece si: `estado_colapso!='total'`
- Opciones (2): `si` Sí · `no` No

**59. Motivo por el cual NO se diligencia la evaluación** **(obligatoria)**

- Campo: `motivo_evaluacion` · Tipo: Selección única → lista `motivos`
- Aparece si: `gate_evaluacion='no'`
- Opciones (2): `ya_levantado` Ya se había levantado anteriormente · `no_requiere` No requiere ese formulario

**60. ¿Con cuál módulo desea continuar?**

- Campo: `modulo_continuar` · Tipo: Selección única → lista `modulos_rd`
- Ayuda: Marque el que aplique.
- Aparece si: `gate_evaluacion='no'`
- Opciones (2): `reparabilidad` Reparabilidad · `demolicion` Demolición y escombros


### A. Evaluación - alcance

*Sección condicionada a:* `estado_colapso!='total' and gate_evaluacion='si'`

> Módulo de Evaluación de daños Evaluación rápida por inspección visual de daños.

**61. Tipo de inspección** **(obligatoria)**

- Campo: `eva_tipo_inspeccion` · Tipo: Selección única → lista `tipo_inspeccion`
- Opciones (2): `exterior` Exterior solamente · `completa` Completa

**62. Tipo de amenaza** **(obligatoria)**

- Campo: `eva_tipo_amenaza` · Tipo: Selección única → lista `tipo_amenaza`
- Valor por defecto: `sismo`
- Opciones (8): `sismo` Sismo · `movimiento_masa` Movimiento en masa · `avenida_torrencial` Avenida torrencial · `inundacion` Inundación · `erupcion_volcanica` Erupción volcánica · `incendio_estructural` Incendio estructural · `vendaval` Vendaval · `otro` Otro

**63. ¿Cuál?** **(obligatoria)**

- Campo: `eva_tipo_amenaza_otro` · Tipo: Texto
- Aparece si: `selected(eva_tipo_amenaza,'otro')`


### A.1. Condiciones preexistentes y del entorno

*Sección condicionada a:* `estado_colapso!='total' and gate_evaluacion='si'`

> Morfología del sitio

**64. Morfología del sitio** **(obligatoria)**

- Campo: `eva_morfologia` · Tipo: Selección única → lista `morfologia`
- Opciones (7): `divisoria` Divisoria · `ladera` Ladera · `pie_ladera` Pie de ladera · `valle` Valle · `borde_rio` Borde de río · `talud` Talud · `otro` Otro

**65. ¿Cuál?** **(obligatoria)**

- Campo: `eva_morfologia_otro` · Tipo: Texto
- Aparece si: `selected(eva_morfologia,'otro')`

> Amenaza por cuerpos hídricos afectados

**66. ¿Amenaza por cuerpos hídricos afectados?** **(obligatoria)**

- Campo: `eva_amenaza_hidrica` · Tipo: Selección única → lista `si_no`
- Opciones (2): `si` Sí · `no` No

**67. Distancia aproximada (m)** **(obligatoria)**

- Campo: `eva_distancia_hidrica` · Tipo: Decimal
- Aparece si: `eva_amenaza_hidrica='si'`
- Validación: `. >= 0` — *Debe ser mayor o igual a 0*

**68. Observaciones**

- Campo: `eva_obs_hidrica` · Tipo: Texto

> Irregularidades estructurales Se diligencian porque la evaluación de daños es por sismo.  
> *(se muestra si `eva_tipo_amenaza='sismo'`)*

**69. ¿Hay piso débil?** **(obligatoria)**

- Campo: `eva_piso_debil` · Tipo: Selección única → lista `si_no`
- Aparece si: `eva_tipo_amenaza='sismo'`
- Opciones (2): `si` Sí · `no` No

**70. ¿Hay piso con columna corta?** **(obligatoria)**

- Campo: `eva_columna_corta` · Tipo: Selección única → lista `si_no`
- Aparece si: `eva_tipo_amenaza='sismo'`
- Opciones (2): `si` Sí · `no` No

**71. ¿Hay cambios drásticos de rigidez?** **(obligatoria)**

- Campo: `eva_cambios_rigidez` · Tipo: Selección única → lista `si_no`
- Aparece si: `eva_tipo_amenaza='sismo'`
- Opciones (2): `si` Sí · `no` No


### A.2. Peligro global y condiciones geotécnicas

*Sección condicionada a:* `estado_colapso!='total' and gate_evaluacion='si'`

> Peligro global

> Estado estructural registrado al inicio En la sección 3 usted indicó: Colapso: ${estado_colapso} Inclinación evidente: ${inclinacion} Estos datos alimentan la sugerencia de habitabilidad. Si necesita corregirlos, regrese a la sección 3.

**72. Riesgo por edificaciones adyacentes** **(obligatoria)**

- Campo: `eva_riesgo_adyacentes` · Tipo: Selección única → lista `si_no_noclaro`
- Opciones (3): `si` Sí · `no` No · `no_claro` No es claro

> Peligro por condiciones geotécnicas

**73. Licuación, asentamiento o subsidencia del terreno** **(obligatoria)**

- Campo: `eva_licuacion` · Tipo: Selección única → lista `si_no`
- Opciones (2): `si` Sí · `no` No

**74. Movimientos en masa cercanos** **(obligatoria)**

- Campo: `eva_mov_masa` · Tipo: Selección única → lista `si_no`
- Opciones (2): `si` Sí · `no` No


### A.3. Daño en elementos estructurales

*Sección condicionada a:* `estado_colapso!='total' and gate_evaluacion='si'`

> Escala de daño N Ninguno · L Leve · M Moderado · S Severo. Al marcar L, M o S se habilita la fotografía del elemento. Concreto y acero: L fisuras de menos de 1 mm · M de 1 a 3 mm, desprende recubrimiento · S más de 3 mm, acero expuesto o deformación del elemento. Muros portantes: L fisuras de menos de 1 mm · M de 1 a 5 mm · S más de 5 mm, agrietamiento diagonal en X o desplome fuera del plano.

**75. Columnas** **(obligatoria)**

- Campo: `eva_dano_columnas` · Tipo: Selección única → lista `nivel_nlms`
- Opciones (4): `n` N · `l` L · `m` M · `s` S

**76. Fotografía del daño - Columnas**

- Campo: `eva_foto_columnas` · Tipo: Fotografía
- Aparece si: `selected(eva_dano_columnas,'l') or selected(eva_dano_columnas,'m') or selected(eva_dano_columnas,'s')`

**77. Muros portantes** **(obligatoria)**

- Campo: `eva_dano_muros_portantes` · Tipo: Selección única → lista `nivel_nlms`
- Opciones (4): `n` N · `l` L · `m` M · `s` S

**78. Fotografía del daño - Muros portantes**

- Campo: `eva_foto_muros_portantes` · Tipo: Fotografía
- Aparece si: `selected(eva_dano_muros_portantes,'l') or selected(eva_dano_muros_portantes,'m') or selected(eva_dano_muros_portantes,'s')`

**79. Vigas** **(obligatoria)**

- Campo: `eva_dano_vigas` · Tipo: Selección única → lista `nivel_nlms`
- Opciones (4): `n` N · `l` L · `m` M · `s` S

**80. Fotografía del daño - Vigas**

- Campo: `eva_foto_vigas` · Tipo: Fotografía
- Aparece si: `selected(eva_dano_vigas,'l') or selected(eva_dano_vigas,'m') or selected(eva_dano_vigas,'s')`

**81. Nodos o puntos de conexión** **(obligatoria)**

- Campo: `eva_dano_nodos` · Tipo: Selección única → lista `nivel_nlms`
- Opciones (4): `n` N · `l` L · `m` M · `s` S

**82. Fotografía del daño - Nodos o puntos de conexión**

- Campo: `eva_foto_nodos` · Tipo: Fotografía
- Aparece si: `selected(eva_dano_nodos,'l') or selected(eva_dano_nodos,'m') or selected(eva_dano_nodos,'s')`

**83. Riostras** **(obligatoria)**

- Campo: `eva_dano_riostras` · Tipo: Selección única → lista `nivel_nlms`
- Opciones (4): `n` N · `l` L · `m` M · `s` S

**84. Fotografía del daño - Riostras**

- Campo: `eva_foto_riostras` · Tipo: Fotografía
- Aparece si: `selected(eva_dano_riostras,'l') or selected(eva_dano_riostras,'m') or selected(eva_dano_riostras,'s')`

**85. Entrepiso** **(obligatoria)**

- Campo: `eva_dano_entrepiso` · Tipo: Selección única → lista `nivel_nlms`
- Opciones (4): `n` N · `l` L · `m` M · `s` S

**86. Fotografía del daño - Entrepiso**

- Campo: `eva_foto_entrepiso` · Tipo: Fotografía
- Aparece si: `selected(eva_dano_entrepiso,'l') or selected(eva_dano_entrepiso,'m') or selected(eva_dano_entrepiso,'s')`


### A.4. Daño no estructural - cerramientos y circulación

*Sección condicionada a:* `estado_colapso!='total' and gate_evaluacion='si'`

> Cerramientos, acabados y circulación N Ninguno · L Leve · M Moderado · S Severo. Al marcar L, M o S se habilita la fotografía del elemento. L daño superficial sin riesgo de caída · M riesgo de caída parcial, requiere acordonar el área · S colapsado o con caída inminente, evacuar. Los elementos interiores solo aparecen si la inspección es Completa.

**87. Muros de fachada / antepechos** **(obligatoria)**

- Campo: `eva_dano_muros_fachada` · Tipo: Selección única → lista `nivel_nlms`
- Opciones (4): `n` N · `l` L · `m` M · `s` S

**88. Fotografía del daño - Muros de fachada / antepechos**

- Campo: `eva_foto_muros_fachada` · Tipo: Fotografía
- Aparece si: `selected(eva_dano_muros_fachada,'l') or selected(eva_dano_muros_fachada,'m') or selected(eva_dano_muros_fachada,'s')`

**89. Muros divisorios** **(obligatoria)**

- Campo: `eva_dano_muros_div` · Tipo: Selección única → lista `nivel_nlms`
- Aparece si: `eva_tipo_inspeccion='completa'`
- Opciones (4): `n` N · `l` L · `m` M · `s` S

**90. Fotografía del daño - Muros divisorios**

- Campo: `eva_foto_muros_div` · Tipo: Fotografía
- Aparece si: `selected(eva_dano_muros_div,'l') or selected(eva_dano_muros_div,'m') or selected(eva_dano_muros_div,'s')`

**91. Ventanales / vidrios de fachada** **(obligatoria)**

- Campo: `eva_dano_ventanales` · Tipo: Selección única → lista `nivel_nlms`
- Opciones (4): `n` N · `l` L · `m` M · `s` S

**92. Fotografía del daño - Ventanales / vidrios de fachada**

- Campo: `eva_foto_ventanales` · Tipo: Fotografía
- Aparece si: `selected(eva_dano_ventanales,'l') or selected(eva_dano_ventanales,'m') or selected(eva_dano_ventanales,'s')`

**93. Cielo raso / luminarias** **(obligatoria)**

- Campo: `eva_dano_cielo_raso` · Tipo: Selección única → lista `nivel_nlms`
- Aparece si: `eva_tipo_inspeccion='completa'`
- Opciones (4): `n` N · `l` L · `m` M · `s` S

**94. Fotografía del daño - Cielo raso / luminarias**

- Campo: `eva_foto_cielo_raso` · Tipo: Fotografía
- Aparece si: `selected(eva_dano_cielo_raso,'l') or selected(eva_dano_cielo_raso,'m') or selected(eva_dano_cielo_raso,'s')`

**95. Cubiertas** **(obligatoria)**

- Campo: `eva_dano_cubiertas` · Tipo: Selección única → lista `nivel_nlms`
- Opciones (4): `n` N · `l` L · `m` M · `s` S

**96. Fotografía del daño - Cubiertas**

- Campo: `eva_foto_cubiertas` · Tipo: Fotografía
- Aparece si: `selected(eva_dano_cubiertas,'l') or selected(eva_dano_cubiertas,'m') or selected(eva_dano_cubiertas,'s')`

**97. Escaleras** **(obligatoria)**

- Campo: `eva_dano_escaleras` · Tipo: Selección única → lista `nivel_nlms`
- Aparece si: `eva_tipo_inspeccion='completa'`
- Opciones (4): `n` N · `l` L · `m` M · `s` S

**98. Fotografía del daño - Escaleras**

- Campo: `eva_foto_escaleras` · Tipo: Fotografía
- Aparece si: `selected(eva_dano_escaleras,'l') or selected(eva_dano_escaleras,'m') or selected(eva_dano_escaleras,'s')`


### A.5. Daño no estructural - equipos e instalaciones

*Sección condicionada a:* `estado_colapso!='total' and gate_evaluacion='si'`

> Equipos e instalaciones N Ninguno · L Leve · M Moderado · S Severo. Al marcar L, M o S se habilita la fotografía del elemento. Elementos: L sin riesgo de caída · M riesgo de caída parcial · S caída inminente, evacuar. Instalaciones: L opera con normalidad · M obliga a suspender el servicio · S fuga o conductor expuesto, desconectar de inmediato.

**99. Ascensores** **(obligatoria)**

- Campo: `eva_dano_ascensores` · Tipo: Selección única → lista `nivel_nlms`
- Aparece si: `eva_tipo_inspeccion='completa'`
- Opciones (4): `n` N · `l` L · `m` M · `s` S

**100. Fotografía del daño - Ascensores**

- Campo: `eva_foto_ascensores` · Tipo: Fotografía
- Aparece si: `selected(eva_dano_ascensores,'l') or selected(eva_dano_ascensores,'m') or selected(eva_dano_ascensores,'s')`

**101. Balcones** **(obligatoria)**

- Campo: `eva_dano_balcones` · Tipo: Selección única → lista `nivel_nlms`
- Opciones (4): `n` N · `l` L · `m` M · `s` S

**102. Fotografía del daño - Balcones**

- Campo: `eva_foto_balcones` · Tipo: Fotografía
- Aparece si: `selected(eva_dano_balcones,'l') or selected(eva_dano_balcones,'m') or selected(eva_dano_balcones,'s')`

**103. Tanques elevados** **(obligatoria)**

- Campo: `eva_dano_tanques` · Tipo: Selección única → lista `nivel_nlms`
- Opciones (4): `n` N · `l` L · `m` M · `s` S

**104. Fotografía del daño - Tanques elevados**

- Campo: `eva_foto_tanques` · Tipo: Fotografía
- Aparece si: `selected(eva_dano_tanques,'l') or selected(eva_dano_tanques,'m') or selected(eva_dano_tanques,'s')`

**105. Instalaciones de gas** **(obligatoria)**

- Campo: `eva_dano_gas` · Tipo: Selección única → lista `nivel_nlms`
- Aparece si: `eva_tipo_inspeccion='completa'`
- Opciones (4): `n` N · `l` L · `m` M · `s` S

**106. Fotografía del daño - Instalaciones de gas**

- Campo: `eva_foto_gas` · Tipo: Fotografía
- Aparece si: `selected(eva_dano_gas,'l') or selected(eva_dano_gas,'m') or selected(eva_dano_gas,'s')`

**107. Instalaciones eléctricas** **(obligatoria)**

- Campo: `eva_dano_electricas` · Tipo: Selección única → lista `nivel_nlms`
- Aparece si: `eva_tipo_inspeccion='completa'`
- Opciones (4): `n` N · `l` L · `m` M · `s` S

**108. Fotografía del daño - Instalaciones eléctricas**

- Campo: `eva_foto_electricas` · Tipo: Fotografía
- Aparece si: `selected(eva_dano_electricas,'l') or selected(eva_dano_electricas,'m') or selected(eva_dano_electricas,'s')`

**109. Acueducto y alcantarillado** **(obligatoria)**

- Campo: `eva_dano_acueducto` · Tipo: Selección única → lista `nivel_nlms`
- Aparece si: `eva_tipo_inspeccion='completa'`
- Opciones (4): `n` N · `l` L · `m` M · `s` S

**110. Fotografía del daño - Acueducto y alcantarillado**

- Campo: `eva_foto_acueducto` · Tipo: Fotografía
- Aparece si: `selected(eva_dano_acueducto,'l') or selected(eva_dano_acueducto,'m') or selected(eva_dano_acueducto,'s')`

**111. Otros**

- Campo: `eva_dano_otros` · Tipo: Selección única → lista `nivel_nlms`
- Opciones (4): `n` N · `l` L · `m` M · `s` S

**112. Otros, ¿cuál?** **(obligatoria)**

- Campo: `eva_dano_otros_desc` · Tipo: Texto
- Aparece si: `selected(eva_dano_otros,'l') or selected(eva_dano_otros,'m') or selected(eva_dano_otros,'s')`

**113. Fotografía del daño - Otros**

- Campo: `eva_foto_otros` · Tipo: Fotografía
- Aparece si: `selected(eva_dano_otros,'l') or selected(eva_dano_otros,'m') or selected(eva_dano_otros,'s')`


### A.6. Clasificación de habitabilidad y del daño

*Sección condicionada a:* `estado_colapso!='total' and gate_evaluacion='si'`

- *Calculado* `eva_sugerencia` = `if(string-length(${eva_dano_columnas})=0 or string-length(${eva_dano_muros_portantes})=0 or string-length(${eva_dano_vigas})=0 or string-length(${eva_dano_nodos})=0 or string-length(${eva_dano_riostras})=0 or string-length(${eva_dano_entrepiso})=0, 'Complete la sección A.3 para ver la sugerencia', if(${estado_colapso}='total' or ${estado_colapso}='parcial' or ${inclinacion}='si' or ${eva_dano_columnas}='s' or ${eva_dano_muros_portantes}='s' or ${eva_dano_vigas}='s' or ${eva_dano_nodos}='s' or ${eva_dano_riostras}='s' or ${eva_dano_entrepiso}='s', 'NO HABITABLE (Rojo)', if(${eva_dano_columnas}='m' or ${eva_dano_muros_portantes}='m' or ${eva_dano_vigas}='m' or ${eva_dano_nodos}='m' or ${eva_dano_riostras}='m' or ${eva_dano_entrepiso}='m' or ${eva_riesgo_adyacentes}='si' or ${eva_licuacion}='si' or ${eva_mov_masa}='si', 'USO RESTRINGIDO (Amarillo)', 'HABITABLE (Verde)')))`

> Sugerencia del sistema: NO HABITABLE (Rojo) Calculada con el peligro global, las condiciones geotécnicas y el daño estructural. Es una ayuda; la decisión es del evaluador.  
> *(se muestra si `eva_sugerencia='NO HABITABLE (Rojo)'`)*

> Sugerencia del sistema: USO RESTRINGIDO (Amarillo) Es una ayuda; la decisión es del evaluador.  
> *(se muestra si `eva_sugerencia='USO RESTRINGIDO (Amarillo)'`)*

> Sugerencia del sistema: HABITABLE (Verde) Es una ayuda; la decisión es del evaluador.  
> *(se muestra si `eva_sugerencia='HABITABLE (Verde)'`)*

> Complete la sección A.3 para ver la sugerencia del sistema.  
> *(se muestra si `eva_sugerencia='Complete la sección A.3 para ver la sugerencia'`)*

**114. Clasificación de habitabilidad** **(obligatoria)**

- Campo: `eva_clasif_habitabilidad` · Tipo: Selección única → lista `habitabilidad`
- Opciones (3): `habitable` Habitable (Verde) · `uso_restringido` Uso restringido (Amarillo) · `no_habitable` No habitable (Rojo)

**115. Clasificación del daño** **(obligatoria)**

- Campo: `eva_nivel_dano` · Tipo: Selección única → lista `nivel_dano`
- Opciones (3): `ninguno_menor` Ninguno / Menor · `moderado` Moderado · `severo` Severo

**116. ¿Existe una evaluación previa?**

- Campo: `eva_previa` · Tipo: Selección única → lista `si_no`
- Opciones (2): `si` Sí · `no` No

**117. Tipo de evaluación previa**

- Campo: `eva_previa_tipo` · Tipo: Texto
- Aparece si: `eva_previa='si'`

**118. Entidad que la realizó**

- Campo: `eva_previa_entidad` · Tipo: Texto
- Aparece si: `eva_previa='si'`

**119. Clasificación de habitabilidad de la evaluación previa**

- Campo: `eva_previa_clasif` · Tipo: Selección única → lista `habitabilidad`
- Aparece si: `eva_previa='si'`
- Opciones (3): `habitable` Habitable (Verde) · `uso_restringido` Uso restringido (Amarillo) · `no_habitable` No habitable (Rojo)

**120. Fecha de la evaluación previa**

- Campo: `eva_previa_fecha` · Tipo: Fecha
- Aparece si: `eva_previa='si'`
- Validación: `. <= today()` — *La fecha no puede ser posterior a hoy*

> La edificación es HABITABLE. El cuestionario termina en este apartado. No se requiere Reparabilidad ni Demolición y escombros. Complete este módulo y envíe el formulario.  
> *(se muestra si `eva_clasif_habitabilidad='habitable'`)*

> La edificación es de USO RESTRINGIDO. El cuestionario continúa en Reparabilidad. Al final de ese módulo se le preguntará si la edificación debe demolerse.  
> *(se muestra si `eva_clasif_habitabilidad='uso_restringido'`)*

> La edificación es NO HABITABLE. El cuestionario continúa en Demolición y escombros. No se diligencia Reparabilidad. Complete este módulo y envíe el formulario.  
> *(se muestra si `eva_clasif_habitabilidad='no_habitable'`)*


### A.7. Recomendaciones y medidas de seguridad

*Sección condicionada a:* `estado_colapso!='total' and gate_evaluacion='si'`

**121. Evaluación adicional** **(obligatoria)**

- Campo: `eva_adicional` · Tipo: Selección múltiple → lista `eval_adicional`
- Opciones (4): `ninguna` Ninguna · `estructural` Estructural · `geotecnica` Geotécnica · `empresa_servicios` Empresa prestadora de servicios públicos

**122. Medidas de seguridad** **(obligatoria)**

- Campo: `eva_medidas` · Tipo: Selección múltiple → lista `medidas`
- Opciones (12): `ninguna` Ninguna · `evacuar_edificacion` Evacuar edificación · `evacuar_aledanas` Evacuar edificaciones aledañas · `desconectar_servicios` Desconectar servicios · `apuntalar` Apuntalar · `demoler_elementos` Demoler elementos en peligro de caer · `restringir_paso` Restringir paso · `estabilizar_taludes` Estabilizar taludes · `drenar_agua` Drenar agua · `limpiar_cubierta` Limpiar material acumulado en cubierta · `cambiar_cubierta` Cambiar teja o material de cubierta · `otro` Otro

**123. Desconectar servicios** **(obligatoria)**

- Campo: `eva_servicios_desconectar` · Tipo: Selección múltiple → lista `servicios`
- Aparece si: `selected(eva_medidas,'desconectar_servicios')`
- Opciones (3): `energia` Energía · `agua` Agua · `gas` Gas

**124. Restringir paso** **(obligatoria)**

- Campo: `eva_restringir_paso` · Tipo: Selección múltiple → lista `paso`
- Aparece si: `selected(eva_medidas,'restringir_paso')`
- Opciones (2): `peatonal` Peatonal · `vehicular` Vehicular

**125. ¿Cuál otra medida?** **(obligatoria)**

- Campo: `eva_medidas_otro` · Tipo: Texto
- Aparece si: `selected(eva_medidas,'otro')`


### A.8. Elementos a intervenir

*Sección condicionada a:* `estado_colapso!='total' and gate_evaluacion='si'`

> Elementos a intervenir Marque los elementos que requieren intervención. Por cada uno indique el material y el área aproximada.

**126. Tipo de intervención requerida** **(obligatoria)**

- Campo: `eva_tipo_intervencion` · Tipo: Selección única → lista `intervencion`
- Opciones (3): `mejoramiento` Reparaciones locativas (reparaciones puntuales) · `reconstruccion` Reconstrucción (obra mayor o vivienda nueva) · `ninguna` No requiere materiales

**127. Elementos a intervenir** **(obligatoria)**

- Campo: `eva_elementos_interv` · Tipo: Selección múltiple → lista `elementos`
- Ayuda: Puede marcar varios.
- Aparece si: `eva_tipo_intervencion!='ninguna'`
- Opciones (4): `muros` Muros · `cubierta` Cubierta · `est_cubierta` Estructura de cubierta · `placa` Placa

**128. Muros - Material** **(obligatoria)**

- Campo: `eva_mat_muros` · Tipo: Texto
- Aparece si: `selected(eva_elementos_interv, 'muros')`

**129. Muros - Área (m²)** **(obligatoria)**

- Campo: `eva_area_muros` · Tipo: Decimal
- Aparece si: `selected(eva_elementos_interv, 'muros')`
- Validación: `. > 0` — *El área debe ser mayor que cero*

**130. Cubierta - Material** **(obligatoria)**

- Campo: `eva_mat_cubierta` · Tipo: Texto
- Aparece si: `selected(eva_elementos_interv, 'cubierta')`

**131. Cubierta - Área (m²)** **(obligatoria)**

- Campo: `eva_area_cubierta` · Tipo: Decimal
- Aparece si: `selected(eva_elementos_interv, 'cubierta')`
- Validación: `. > 0` — *El área debe ser mayor que cero*

**132. Estructura de cubierta - Material** **(obligatoria)**

- Campo: `eva_mat_est_cubierta` · Tipo: Texto
- Aparece si: `selected(eva_elementos_interv, 'est_cubierta')`

**133. Estructura de cubierta - Área (m²)** **(obligatoria)**

- Campo: `eva_area_est_cubierta` · Tipo: Decimal
- Aparece si: `selected(eva_elementos_interv, 'est_cubierta')`
- Validación: `. > 0` — *El área debe ser mayor que cero*

**134. Placa - Material** **(obligatoria)**

- Campo: `eva_mat_placa` · Tipo: Texto
- Aparece si: `selected(eva_elementos_interv, 'placa')`

**135. Placa - Área (m²)** **(obligatoria)**

- Campo: `eva_area_placa` · Tipo: Decimal
- Aparece si: `selected(eva_elementos_interv, 'placa')`
- Validación: `. > 0` — *El área debe ser mayor que cero*

**136. Observaciones sobre los elementos**

- Campo: `eva_obs_elementos` · Tipo: Texto
- Aparece si: `eva_tipo_intervencion!='ninguna'`


### B. Reparabilidad

*Sección condicionada a:* `estado_colapso!='total' and (eva_clasif_habitabilidad='uso_restringido' or (gate_evaluacion='no' and modulo_continuar='reparabilidad'))`

> Módulo de Reparabilidad - generalidades

**137. Pisos en los que se encuentran los daños**

- Campo: `rep_piso` · Tipo: Texto
- Ayuda: Puede indicar varios, por ejemplo: 1 y 3.
- Validación: `. >= 0 and . <= 100` — *Ingrese un valor entre 0 y 100*

**138. Número de unidad (si es multifamiliar)**

- Campo: `rep_unidad` · Tipo: Texto


### B.1. Muro divisorio

*Sección condicionada a:* `(estado_colapso!='total' and (eva_clasif_habitabilidad='uso_restringido' or (gate_evaluacion='no' and modulo_continuar='reparabilidad')))`

**139. ¿Se observa daño en muros divisorios?** **(obligatoria)**

- Campo: `rep_muro_dano` · Tipo: Selección única → lista `si_no`
- Opciones (2): `si` Sí · `no` No

**140. Longitud del muro (m)** **(obligatoria)**

- Campo: `rep_muro_longitud` · Tipo: Decimal
- Aparece si: `rep_muro_dano='si'`
- Validación: `. > 0 and . <= 20` — *Debe estar entre 0 y 20 m*

**141. Altura del muro (m)** **(obligatoria)**

- Campo: `rep_muro_altura` · Tipo: Decimal
- Aparece si: `rep_muro_dano='si'`
- Validación: `. > 0 and . <= 10` — *Debe estar entre 0 y 10 m*

**142. Espesor del muro (cm)** **(obligatoria)**

- Campo: `rep_muro_espesor` · Tipo: Decimal
- Aparece si: `rep_muro_dano='si'`
- Validación: `. > 0 and . <= 100` — *Debe estar entre 0 y 100 cm*

- *Calculado* `rep_muro_area` = `${rep_muro_longitud} * ${rep_muro_altura}`

> Área del muro: ${rep_muro_area} m²  
> *(se muestra si `rep_muro_dano='si'`)*

**143. Material del muro** **(obligatoria)**

- Campo: `rep_muro_material` · Tipo: Selección única → lista `material_muro`
- Aparece si: `rep_muro_dano='si'`
- Opciones (5): `bloque_concreto` Bloque de concreto · `ladrillo_hueco` Ladrillo hueco de arcilla · `ladrillo_macizo` Ladrillo macizo de arcilla · `drywall` Perfiles metálicos y placas de yeso (drywall) · `otro` Otro

**144. Acabado del muro** **(obligatoria)**

- Campo: `rep_muro_acabado` · Tipo: Selección única → lista `acabado_muro`
- Aparece si: `rep_muro_dano='si'`
- Opciones (4): `panete_ambos` Pañete por ambas caras · `ceramica_ambos` Enchape cerámico por ambas caras · `mixto` Una cara pañetada y la otra enchapada · `sin_acabado` Sin acabado

**145. ¿Cuántos muros tienen estas características?** **(obligatoria)**

- Campo: `rep_muro_elementos` · Tipo: Entero
- Aparece si: `rep_muro_dano='si'`

- *Calculado* `rep_muro_total` = `round(${rep_muro_area} * ${rep_muro_elementos}, 2)`

**146. Fotografía del daño en el muro** **(obligatoria)**

- Campo: `rep_muro_foto` · Tipo: Fotografía
- Ayuda: Máximo 3.
- Aparece si: `rep_muro_dano='si'`
- Validación: `count-selected(.)<=3` — *Puede cargar máximo 3 fotografías*

**147. Observaciones**

- Campo: `rep_muro_notas` · Tipo: Texto
- Aparece si: `rep_muro_dano='si'`


### B.2. Pañete

*Sección condicionada a:* `(estado_colapso!='total' and (eva_clasif_habitabilidad='uso_restringido' or (gate_evaluacion='no' and modulo_continuar='reparabilidad')))`

**148. ¿Se observa daño en el pañete?** **(obligatoria)**

- Campo: `rep_Panete_dano` · Tipo: Selección única → lista `si_no`
- Opciones (2): `si` Sí · `no` No

**149. Forma del daño** **(obligatoria)**

- Campo: `rep_Panete_tipo` · Tipo: Selección única → lista `tipo_panete_col_col`
- Aparece si: `rep_Panete_dano='si'`
- Opciones (2): `area` Por área (parche o zona amplia) · `lineal` Lineal (fisura)

**150. Área afectada (m²)** **(obligatoria)**

- Campo: `rep_Panete_area` · Tipo: Decimal
- Aparece si: `rep_Panete_tipo='area'`
- Validación: `. > 0 and . <= 50` — *Debe estar entre 0 y 50 m²*

**151. Longitud de la fisura (m)** **(obligatoria)**

- Campo: `rep_Panete_longitud` · Tipo: Decimal
- Aparece si: `rep_Panete_tipo='lineal'`
- Validación: `. > 0 and . <= 20` — *Debe estar entre 0 y 20 m*

**152. ¿Cuántas zonas tienen estas características?** **(obligatoria)**

- Campo: `rep_Panete_elementos` · Tipo: Entero
- Aparece si: `rep_Panete_dano='si'`

- *Calculado* `rep_panete_total_long` = `round(${rep_Panete_longitud} * ${rep_Panete_elementos}, 2)`

- *Calculado* `rep_panete_total_area` = `round(${rep_Panete_area} * ${rep_Panete_elementos}, 2)`

**153. Fotografía del daño en el pañete** **(obligatoria)**

- Campo: `rep_Panete_foto` · Tipo: Fotografía
- Ayuda: Máximo 3.
- Aparece si: `rep_Panete_dano='si'`
- Validación: `count-selected(.)<=3` — *Puede cargar máximo 3 fotografías*

**154. Observaciones**

- Campo: `rep_Panete_notas` · Tipo: Texto
- Aparece si: `rep_Panete_dano='si'`


### B.3. Recubrimiento de columna

*Sección condicionada a:* `(estado_colapso!='total' and (eva_clasif_habitabilidad='uso_restringido' or (gate_evaluacion='no' and modulo_continuar='reparabilidad')))`

**155. ¿Se observa daño en el recubrimiento de columnas?** **(obligatoria)**

- Campo: `rep_col_dano` · Tipo: Selección única → lista `si_no`
- Opciones (2): `si` Sí · `no` No

**156. Forma del daño** **(obligatoria)**

- Campo: `rep_col_tipo` · Tipo: Selección única → lista `tipo_panete_col_col`
- Aparece si: `rep_col_dano='si'`
- Opciones (2): `area` Por área (parche o zona amplia) · `lineal` Lineal (fisura)

**157. Área afectada (m²)** **(obligatoria)**

- Campo: `rep_col_area` · Tipo: Decimal
- Aparece si: `rep_col_tipo='area'`
- Validación: `. > 0 and . <=50` — *Debe estar entre 0 y 50 m²*

**158. Longitud de la fisura (m)** **(obligatoria)**

- Campo: `rep_col_longitud` · Tipo: Decimal
- Aparece si: `rep_col_tipo='lineal'`
- Validación: `. > 0 and . <= 20` — *Debe estar entre 0 y 20 m*

**159. ¿Cuántas columnas tienen estas características?** **(obligatoria)**

- Campo: `rep_col_elementos` · Tipo: Entero
- Aparece si: `rep_col_dano='si'`

- *Calculado* `rep_col_total_long` = `round(${rep_col_longitud} * ${rep_col_elementos}, 2)`

- *Calculado* `rep_col_total_area` = `round(${rep_col_area} * ${rep_col_elementos}, 2)`

**160. Fotografía del daño en el recubrimiento** **(obligatoria)**

- Campo: `rep_col_foto` · Tipo: Fotografía
- Ayuda: Máximo 3.
- Aparece si: `rep_col_dano='si'`
- Validación: `count-selected(.)<=3` — *Puede cargar máximo 3 fotografías*

**161. Observaciones**

- Campo: `rep_col_notas` · Tipo: Texto
- Aparece si: `rep_col_dano='si'`


### B.4. Ventanas

*Sección condicionada a:* `(estado_colapso!='total' and (eva_clasif_habitabilidad='uso_restringido' or (gate_evaluacion='no' and modulo_continuar='reparabilidad')))`

**162. ¿Se observa daño en la parte superior o inferior de las ventanas, que puedan repararse?** **(obligatoria)**

- Campo: `rep_ven_dano` · Tipo: Selección única → lista `si_no`
- Opciones (2): `si` Sí · `no` No

**163. Alto del daño (cm)** **(obligatoria)**

- Campo: `rep_ven_alto` · Tipo: Decimal
- Aparece si: `rep_ven_dano='si'`
- Validación: `. > 0 and . <= 100` — *Debe estar entre 0 y 100 cm*

**164. Ancho del daño (cm)** **(obligatoria)**

- Campo: `rep_ven_ancho` · Tipo: Decimal
- Aparece si: `rep_ven_dano='si'`
- Validación: `. > 0 and . <= 100` — *Debe estar entre 0 y 100 cm*

**165. ¿Cuántas ventanas tienen estas características?** **(obligatoria)**

- Campo: `rep_ven_elementos` · Tipo: Entero
- Aparece si: `rep_ven_dano='si'`

- *Calculado* `rep_ven_total` = `round(${rep_ven_alto} div 100 * ${rep_ven_ancho} div 100 * ${rep_ven_elementos}, 2)`

**166. Fotografía del daño en la parte superior o inferior de las ventanas** **(obligatoria)**

- Campo: `rep_ven_foto` · Tipo: Fotografía
- Ayuda: Máximo 3.
- Aparece si: `rep_ven_dano='si'`
- Validación: `count-selected(.)<=3` — *Puede cargar máximo 3 fotografías*

**167. Observaciones**

- Campo: `rep_ven_notas` · Tipo: Texto
- Aparece si: `rep_ven_dano='si'`


### B.5. Dinteles

*Sección condicionada a:* `(estado_colapso!='total' and (eva_clasif_habitabilidad='uso_restringido' or (gate_evaluacion='no' and modulo_continuar='reparabilidad')))`

**168. ¿Se observa daño en el dintel?** **(obligatoria)**

- Campo: `rep_din_dano` · Tipo: Selección única → lista `si_no`
- Opciones (2): `si` Sí · `no` No

**169. Ancho del vano de la puerta (m)** **(obligatoria)**

- Campo: `rep_din_ancho` · Tipo: Decimal
- Aparece si: `rep_din_dano='si'`
- Validación: `. > 0 and . <= 10` — *Debe estar entre 0 y 10 m*

**170. ¿Cuántos dinteles tienen estas características?** **(obligatoria)**

- Campo: `rep_din_elementos` · Tipo: Entero
- Aparece si: `rep_din_dano='si'`

- *Calculado* `rep_din_total` = `round(${rep_din_ancho} * ${rep_din_elementos}, 2)`

**171. Fotografía del daño en el dintel** **(obligatoria)**

- Campo: `rep_din_foto` · Tipo: Fotografía
- Ayuda: Máximo 3.
- Aparece si: `rep_din_dano='si'`
- Validación: `count-selected(.)<=3` — *Puede cargar máximo 3 fotografías*

**172. Observaciones**

- Campo: `rep_din_notas` · Tipo: Texto
- Aparece si: `rep_din_dano='si'`


### B.6. Resumen y cierre de reparabilidad

*Sección condicionada a:* `estado_colapso!='total' and (eva_clasif_habitabilidad='uso_restringido' or (gate_evaluacion='no' and modulo_continuar='reparabilidad'))`

> Resumen de cantidades a reparar Total = dimensión registrada x número de elementos con esas características.

> Muros divisorios: ${rep_muro_total} m² en ${rep_muro_elementos} muro(s), espesor ${rep_muro_espesor} cm.  
> *(se muestra si `rep_muro_dano='si'`)*

> Pañete (por área): ${rep_panete_total_area} m² en ${rep_Panete_elementos} zona(s).  
> *(se muestra si `rep_Panete_dano='si' and rep_Panete_tipo='area'`)*

> Pañete (lineal): ${rep_panete_total_long} m en ${rep_Panete_elementos} zona(s).  
> *(se muestra si `rep_Panete_dano='si' and rep_Panete_tipo='lineal'`)*

> Columna (por área): ${rep_col_total_area} m² en ${rep_col_elementos} zona(s).  
> *(se muestra si `rep_Panete_dano='si' and rep_Panete_tipo='area'`)*

> Columna (lineal): ${rep_col_total_long} m en ${rep_col_elementos} zona(s).  
> *(se muestra si `rep_Panete_dano='si' and rep_Panete_tipo='lineal'`)*

> Ventanas: ${rep_ven_total} m² en ${rep_ven_elementos} ventana(s).  
> *(se muestra si `rep_ven_dano='si'`)*

> Dinteles: ${rep_din_total} m lineales en ${rep_din_elementos} dintel(es).  
> *(se muestra si `rep_din_dano='si'`)*

> No se registró daño reparable en ningún elemento.  
> *(se muestra si `rep_muro_dano!='si' and rep_Panete_dano!='si' and rep_col_dano!='si' and rep_ven_dano!='si' and rep_din_dano!='si'`)*

> Decisión sobre demolición Con base en el daño registrado, indique si la edificación debe demolerse. Si responde que sí, se abrirá el módulo de Demolición y escombros.

**173. ¿La edificación debe demolerse?** **(obligatoria)**

- Campo: `rep_demoler` · Tipo: Selección única → lista `si_no`
- Opciones (2): `si` Sí · `no` No


### D. Demolición y escombros - estado del sitio

*Sección condicionada a:* `(estado_colapso='total' or eva_clasif_habitabilidad='no_habitable' or rep_demoler='si' or (gate_evaluacion='no' and modulo_continuar='demolicion'))`

> Módulo de Demolición y escombros Estimación del volumen de escombros y condiciones de acceso para maquinaria.

**174. ¿Hay evidencia clara de asbesto?** **(obligatoria)**

- Campo: `esc_asbesto` · Tipo: Selección única → lista `si_no`
- Opciones (2): `si` Sí · `no` No

**175. ¿Ya se retiraron todos los escombros del sitio?** **(obligatoria)**

- Campo: `esc_retirados` · Tipo: Selección única → lista `si_no`
- Opciones (2): `si` Sí · `no` No

**176. Fotografía del sitio limpio** **(obligatoria)**

- Campo: `esc_foto_sitio_limpio` · Tipo: Fotografía
- Aparece si: `esc_retirados='si'`


### D.2. Demolición

*Sección condicionada a:* `(estado_colapso='total' or eva_clasif_habitabilidad='no_habitable' or rep_demoler='si' or (gate_evaluacion='no' and modulo_continuar='demolicion')) and esc_retirados='no' and estado_colapso!='total'`

> Resumen de la edificación Estado de colapso: ${estado_colapso} Inclinación evidente: ${inclinacion} Número de pisos: ${num_pisos} Número de sótanos: ${num_sotanos}

**177. Área de la huella de la construcción (m²)** **(obligatoria)**

- Campo: `dem_area_huella` · Tipo: Decimal
- Ayuda: Se prellena con el área de la capa base o con frente por fondo. Corrija si es necesario.
- Valor por defecto: `if(${area_huella_mapa} > 0, ${area_huella_mapa}, ${area_huella_campo})`
- Validación: `. > 0` — *Debe ser mayor que cero*

- *Calculado* `dem_volumen` = `round(${num_pisos} * ${dem_area_huella} * 2.6 * 0.3, 2)`

> Volumen estimado de escombros Número de pisos x área de huella x 2,6 x 0,3 ${num_pisos} x ${dem_area_huella} m² x 2,6 x 0,3 = ${dem_volumen} m³

**178. Urgencia de la demolición** **(obligatoria)**

- Campo: `dem_urgencia` · Tipo: Selección única → lista `urgencia_demolicion`
- Opciones (3): `menor_24h` Alta - Menos de 24 horas · `24_48h` Media - Entre 24 y 48 horas · `mayor_48h` Baja - Más de 48 horas

**179. Tipo de demolición** **(obligatoria)**

- Campo: `dem_tipo` · Tipo: Selección única → lista `tipo_demolicion`
- Opciones (3): `baja` Baja - algunos elementos a demoler · `media` Media - demolición parcial · `total` Total - demolición completa

**180. Personas aún desaparecidas dentro de la edificación** **(obligatoria)**

- Campo: `esc_personas_desaparecidas` · Tipo: Entero
- Validación: `. >= 0` — *Debe ser mayor o igual a 0*

**181. Observaciones sobre la demolición**

- Campo: `dem_notas` · Tipo: Texto


### D.3. Escombros - colapso total

*Sección condicionada a:* `(estado_colapso='total' or eva_clasif_habitabilidad='no_habitable' or rep_demoler='si' or (gate_evaluacion='no' and modulo_continuar='demolicion')) and esc_retirados='no' and estado_colapso='total'`

> Estado de colapso: ${estado_colapso} Estime el área cubierta por los escombros y su altura promedio. El volumen se calcula automáticamente.

**182. Área aproximada cubierta por escombros (m²)** **(obligatoria)**

- Campo: `esc_area` · Tipo: Decimal
- Validación: `. > 0` — *Debe ser mayor que cero*

**183. Altura promedio de los escombros (m)** **(obligatoria)**

- Campo: `esc_altura` · Tipo: Decimal
- Validación: `. > 0 and . <= 50` — *Ingrese un valor entre 0 y 50 m*

- *Calculado* `esc_volumen` = `round(${esc_area} * ${esc_altura}, 2)`

> Volumen aproximado de escombros ${esc_area} m² x ${esc_altura} m = ${esc_volumen} m³

**184. Personas aún desaparecidas entre los escombros** **(obligatoria)**

- Campo: `esc_personas_desaparecidas_t` · Tipo: Entero
- Validación: `. >= 0` — *Debe ser mayor o igual a 0*

**185. ¿Se están adelantando trabajos de recolección de escombros en este punto?** **(obligatoria)**

- Campo: `esc_excavadoras` · Tipo: Selección única → lista `si_no`
- Opciones (2): `si` Sí · `no` No

> Dibuje la huella de los escombros sobre la imagen.


**Bloque repetible — Huella de los escombros**

**186. Dibuje la huella de los escombros en el mapa** **(obligatoria)**

- Campo: `esc_escombros_geom` · Tipo: Polígono en mapa

- *Calculado* `esc_escombros_area` = `round(area(${esc_escombros_geom}),0)`

> Área dibujada: ${esc_escombros_area} m²


### D.4. Acceso y entorno

*Sección condicionada a:* `(estado_colapso='total' or eva_clasif_habitabilidad='no_habitable' or rep_demoler='si' or (gate_evaluacion='no' and modulo_continuar='demolicion')) and esc_retirados='no'`

**187. Número de fachadas que dan a una vía** **(obligatoria)**

- Campo: `esc_frentes_via` · Tipo: Selección única → lista `frentes_via`
- Opciones (4): `1` 1 · `2` 2 · `3` 3 · `4` 4

**188. Vía más ancha para acceder con maquinaria** **(obligatoria)**

- Campo: `esc_ancho_via` · Tipo: Selección única → lista `ancho_via`
- Opciones (2): `menor_4` Menos de 4 m · `mayor_4` 4 m o más

**189. ¿Existe la posibilidad de acopio de escombros?** **(obligatoria)**

- Campo: `esc_acopio` · Tipo: Selección única → lista `si_no`
- Opciones (2): `si` Sí · `no` No

**190. Distancia mínima a edificaciones adyacentes** **(obligatoria)**

- Campo: `esc_dist_adyacentes` · Tipo: Selección única → lista `dist_adyacentes`
- Opciones (3): `menor_1` Menos de 1 m · `entre_1_4` Entre 1 y 4 m · `mayor_4` Más de 4 m

**191. ¿Hay un campamento o alojamiento temporal justo al lado?** **(obligatoria)**

- Campo: `esc_campamento` · Tipo: Selección única → lista `si_no`
- Opciones (2): `si` Sí · `no` No

**192. ¿Hay un talud pronunciado justo al lado?** **(obligatoria)**

- Campo: `esc_talud` · Tipo: Selección única → lista `si_no`
- Opciones (2): `si` Sí · `no` No

**193. Urgencia para el retiro de los escombros** **(obligatoria)**

- Campo: `esc_urgencia` · Tipo: Selección única → lista `urgencia_escombros`
- Opciones (3): `espacio_publico` Están en el espacio público · `afecta_vecino` Están afectando a un vecino · `contenidos` Están contenidos dentro del propio lote


### D.5. Registro fotográfico

*Sección condicionada a:* `(estado_colapso='total' or eva_clasif_habitabilidad='no_habitable' or rep_demoler='si' or (gate_evaluacion='no' and modulo_continuar='demolicion')) and esc_retirados='no'`

**194. Fotografía de los escombros desde lejos** **(obligatoria)**

- Campo: `esc_foto_escombros` · Tipo: Fotografía
- Aparece si: `estado_colapso='total'`

**195. Fotografías del daño estructural** **(obligatoria)**

- Campo: `esc_foto_dano` · Tipo: Fotografía
- Ayuda: Máximo 8.
- Aparece si: `estado_colapso!='total'`
- Validación: `count-selected(.)<=8` — *Puede cargar máximo 8 fotografías*

**196. Descripción de la tipología y la gravedad del daño** **(obligatoria)**

- Campo: `esc_nota_dano` · Tipo: Texto
- Aparece si: `estado_colapso!='total'`

**197. Otras observaciones de escombros**

- Campo: `esc_notas` · Tipo: Texto


### 8. Cierre

**198. Comentarios finales**

- Campo: `comentarios_finales` · Tipo: Texto

**199. Firma del evaluador** **(obligatoria)**

- Campo: `evaluador_firma` · Tipo: Fotografía

**200. Confirmo que revisé el formulario y que la información está completa y es correcta.** **(obligatoria)**

- Campo: `confirmacion` · Tipo: Selección única → lista `confirmacion`
- Opciones (1): `si` Sí, confirmo y estoy listo para enviar


### 9. Resumen de la visita

- *Calculado* `fecha_texto` = `format-date-time(${fecha_hora_inspeccion}, '%d/%m/%Y %H:%M')`

- *Calculado* `volumen_final` = `if(${estado_colapso}='total', ${esc_volumen}, ${dem_volumen})`

> RESUMEN DE LA VISITA

> Código de registro: ${cod_registro} Dirección: ${direccion} Barrio / Vereda: ${barrio_vereda} Municipio: ${municipio} Fecha y hora: ${fecha_texto}

> HABITABLE (VERDE) La edificación puede seguir siendo ocupada.  
> *(se muestra si `eva_clasif_habitabilidad='habitable'`)*

> USO RESTRINGIDO (AMARILLO) La ocupación está limitada. Atienda las restricciones indicadas.  
> *(se muestra si `eva_clasif_habitabilidad='uso_restringido'`)*

> NO HABITABLE (ROJO) La edificación NO debe ser ocupada.  
> *(se muestra si `eva_clasif_habitabilidad='no_habitable'`)*

> Demolición y escombros: volumen estimado ${volumen_final} m³.  
> *(se muestra si `volumen_final > 0`)*

> IMPORTANTE Revise el resumen y envíe el formulario. Si no lo envía, la visita no queda registrada.

> Evaluación rápida por inspección visual en el marco de la atención de la emergencia. No constituye un estudio de vulnerabilidad estructural ni un concepto técnico definitivo, y puede modificarse ante una evaluación posterior.


---

## Listas de opciones

### `motivos`

| Código | Etiqueta |
|---|---|
| `ya_levantado` | Ya se había levantado anteriormente |
| `no_requiere` | No requiere ese formulario |

### `si_no`

| Código | Etiqueta |
|---|---|
| `si` | Sí |
| `no` | No |

### `si_no_noclaro`

| Código | Etiqueta |
|---|---|
| `si` | Sí |
| `no` | No |
| `no_claro` | No es claro |

### `confirmacion`

| Código | Etiqueta |
|---|---|
| `si` | Sí, confirmo y estoy listo para enviar |

### `tipo_documento`

| Código | Etiqueta |
|---|---|
| `cc` | Cédula de ciudadanía |
| `ce` | Cédula de extranjería |
| `pasaporte` | Pasaporte |

### `profesion`

| Código | Etiqueta |
|---|---|
| `ingeniero_civil` | Ingeniero civil |
| `arquitecto` | Arquitecto |
| `ingeniero_catastral` | Ingeniero catastral o topográfico |
| `tecnologo` | Tecnólogo en construcción |
| `otra` | Otra |

### `departamento`

| Código | Etiqueta |
|---|---|
| `17` | Caldas |
| `66` | Risaralda |

### `municipio`

| Código | Etiqueta | Filtro |
|---|---|---|
| `66001` | Pereira | 66 |
| `17001` | Manizales | 17 |

### `zona`

| Código | Etiqueta |
|---|---|
| `urbano` | Urbano |
| `rural` | Rural |

### `tipo_edificacion`

| Código | Etiqueta |
|---|---|
| `publica` | Pública |
| `privada` | Privada |

### `uso`

| Código | Etiqueta |
|---|---|
| `residencial` | Residencial |
| `comercial` | Comercial |
| `educacional` | Educacional |
| `salud` | Salud |
| `hotelero` | Hotelero |
| `oficinas` | Oficinas |
| `institucional` | Institucional |
| `religioso` | Religioso |
| `industrial` | Industrial |
| `bodegas` | Bodegas |
| `estacionamientos` | Estacionamientos |
| `otro` | Otro |

### `ano_construccion`

| Código | Etiqueta |
|---|---|
| `post_2010` | 2010 o posterior (NSR-10) |
| `1998_2009` | 1998 a 2009 (NSR-98) |
| `1984_1997` | 1984 a 1997 (CCCSR-84) |
| `pre_1984` | Anterior a 1984 (sin norma sismo resistente) |
| `desconocido` | Desconocido |

### `material_estructural`

| Código | Etiqueta |
|---|---|
| `concreto` | Concreto reforzado |
| `mamposteria` | Mampostería |
| `acero` | Acero |
| `madera` | Madera |
| `bahareque_tapia` | Bahareque o tapia |
| `otros` | Otros |

### `sistema_estructural`

| Código | Etiqueta | Filtro |
|---|---|---|
| `porticos` | Pórticos | concreto |
| `muros_estructurales` | Muros estructurales | concreto |
| `dual_combinado` | Sistema dual o combinado | concreto |
| `prefabricado` | Prefabricado | concreto |
| `mamp_confinada` | Mampostería confinada | mamposteria |
| `mamp_reforzada` | Mampostería reforzada | mamposteria |
| `mamp_simple` | Mampostería simple | mamposteria |
| `porticos_arriostrados` | Pórticos arriostrados | acero |
| `porticos_no_arriostrados` | Pórticos no arriostrados | acero |
| `acero_otro` | Otro | acero |
| `estructura_madera` | Estructura en madera | madera |
| `estructura_guadua` | Estructura en guadua | madera |
| `muros_bahareque` | Muros en bahareque | bahareque_tapia |
| `muros_tapia` | Muros en tapia | bahareque_tapia |
| `mixto` | Mixto | otros |
| `ninguno` | Ninguno | otros |

### `material_entrepiso`

| Código | Etiqueta |
|---|---|
| `concreto` | Concreto reforzado |
| `acero` | Acero |
| `madera` | Madera |
| `otro` | Otro |

### `sistema_entrepiso`

| Código | Etiqueta | Filtro |
|---|---|---|
| `placa_maciza` | Placa maciza | concreto |
| `placa_aligerada` | Placa aligerada | concreto |
| `steeldeck` | Steeldeck / losacero | acero |
| `vigas_con_conectores` | Vigas con conectores | acero |
| `vigas_sin_conectores` | Vigas sin conectores | acero |
| `vigas_madera` | Vigas | madera |
| `cerchas_madera` | Cerchas | madera |
| `mixto` | Mixto | otro |
| `entrepiso_otro` | Otro | otro |

### `material_cubierta`

| Código | Etiqueta |
|---|---|
| `concreto` | Concreto reforzado |
| `acero` | Acero |
| `madera` | Madera |
| `otro` | Otro |

### `soporte_cubierta`

| Código | Etiqueta | Filtro |
|---|---|---|
| `vigas_concreto` | Vigas de concreto | concreto |
| `placa_maciza_aligerada` | Placa maciza o aligerada | concreto |
| `vigas_acero` | Vigas de acero | acero |
| `cerchas_acero` | Cerchas de acero | acero |
| `vigas_madera` | Vigas de madera | madera |
| `cerchas_madera` | Cerchas de madera | madera |
| `cubierta_otro` | Otro | otro |

### `tipo_cubierta`

| Código | Etiqueta |
|---|---|
| `teja_zinc` | Teja de zinc |
| `teja_barro` | Teja de barro |
| `teja_fibrocemento` | Teja de fibrocemento |
| `teja_plastica` | Teja plástica |
| `plastico_paja` | Plástico / paja |
| `otro` | Otro |

### `muros`

| Código | Etiqueta |
|---|---|
| `ladrillo_hueco` | Mampostería de ladrillo hueco de arcilla |
| `ladrillo_macizo` | Mampostería de ladrillo macizo de arcilla |
| `bloque_concreto` | Mampostería de bloque de concreto |
| `piedra` | Mampostería en piedra |
| `drywall` | Perfiles metálicos y placas de yeso (drywall) |
| `madera_guadua` | Madera o guadua |
| `otro` | Otro |

### `ocupacion`

| Código | Etiqueta |
|---|---|
| `ocupada` | Ocupada |
| `desocupada` | Desocupada |

### `tipo_inspeccion`

| Código | Etiqueta |
|---|---|
| `exterior` | Exterior solamente |
| `completa` | Completa |

### `tipo_amenaza`

| Código | Etiqueta |
|---|---|
| `sismo` | Sismo |
| `movimiento_masa` | Movimiento en masa |
| `avenida_torrencial` | Avenida torrencial |
| `inundacion` | Inundación |
| `erupcion_volcanica` | Erupción volcánica |
| `incendio_estructural` | Incendio estructural |
| `vendaval` | Vendaval |
| `otro` | Otro |

### `morfologia`

| Código | Etiqueta |
|---|---|
| `divisoria` | Divisoria |
| `ladera` | Ladera |
| `pie_ladera` | Pie de ladera |
| `valle` | Valle |
| `borde_rio` | Borde de río |
| `talud` | Talud |
| `otro` | Otro |

### `nivel_nlms`

| Código | Etiqueta |
|---|---|
| `n` | N |
| `l` | L |
| `m` | M |
| `s` | S |

### `habitabilidad`

| Código | Etiqueta |
|---|---|
| `habitable` | Habitable (Verde) |
| `uso_restringido` | Uso restringido (Amarillo) |
| `no_habitable` | No habitable (Rojo) |

### `nivel_dano`

| Código | Etiqueta |
|---|---|
| `ninguno_menor` | Ninguno / Menor |
| `moderado` | Moderado |
| `severo` | Severo |

### `eval_adicional`

| Código | Etiqueta |
|---|---|
| `ninguna` | Ninguna |
| `estructural` | Estructural |
| `geotecnica` | Geotécnica |
| `empresa_servicios` | Empresa prestadora de servicios públicos |

### `medidas`

| Código | Etiqueta |
|---|---|
| `ninguna` | Ninguna |
| `evacuar_edificacion` | Evacuar edificación |
| `evacuar_aledanas` | Evacuar edificaciones aledañas |
| `desconectar_servicios` | Desconectar servicios |
| `apuntalar` | Apuntalar |
| `demoler_elementos` | Demoler elementos en peligro de caer |
| `restringir_paso` | Restringir paso |
| `estabilizar_taludes` | Estabilizar taludes |
| `drenar_agua` | Drenar agua |
| `limpiar_cubierta` | Limpiar material acumulado en cubierta |
| `cambiar_cubierta` | Cambiar teja o material de cubierta |
| `otro` | Otro |

### `servicios`

| Código | Etiqueta |
|---|---|
| `energia` | Energía |
| `agua` | Agua |
| `gas` | Gas |

### `paso`

| Código | Etiqueta |
|---|---|
| `peatonal` | Peatonal |
| `vehicular` | Vehicular |

### `intervencion`

| Código | Etiqueta |
|---|---|
| `mejoramiento` | Reparaciones locativas (reparaciones puntuales) |
| `reconstruccion` | Reconstrucción (obra mayor o vivienda nueva) |
| `ninguna` | No requiere materiales |

### `elementos`

| Código | Etiqueta |
|---|---|
| `muros` | Muros |
| `cubierta` | Cubierta |
| `est_cubierta` | Estructura de cubierta |
| `placa` | Placa |

### `material_muro`

| Código | Etiqueta |
|---|---|
| `bloque_concreto` | Bloque de concreto |
| `ladrillo_hueco` | Ladrillo hueco de arcilla |
| `ladrillo_macizo` | Ladrillo macizo de arcilla |
| `drywall` | Perfiles metálicos y placas de yeso (drywall) |
| `otro` | Otro |

### `acabado_muro`

| Código | Etiqueta |
|---|---|
| `panete_ambos` | Pañete por ambas caras |
| `ceramica_ambos` | Enchape cerámico por ambas caras |
| `mixto` | Una cara pañetada y la otra enchapada |
| `sin_acabado` | Sin acabado |

### `frentes_via`

| Código | Etiqueta |
|---|---|
| `1` | 1 |
| `2` | 2 |
| `3` | 3 |
| `4` | 4 |

### `ancho_via`

| Código | Etiqueta |
|---|---|
| `menor_4` | Menos de 4 m |
| `mayor_4` | 4 m o más |

### `dist_adyacentes`

| Código | Etiqueta |
|---|---|
| `menor_1` | Menos de 1 m |
| `entre_1_4` | Entre 1 y 4 m |
| `mayor_4` | Más de 4 m |

### `estado_colapso`

| Código | Etiqueta |
|---|---|
| `ninguno` | En pie - sin colapso |
| `parcial` | Parcialmente colapsada |
| `total` | Totalmente colapsada |

### `tipo_panete_col_col`

| Código | Etiqueta |
|---|---|
| `area` | Por área (parche o zona amplia) |
| `lineal` | Lineal (fisura) |

### `entidad`

| Código | Etiqueta |
|---|---|
| `miyamoto` | Miyamoto |
| `alcaldia` | Alcaldía local |
| `ungrd` | UNGRD |
| `otra` | Otra |

### `urgencia_demolicion`

| Código | Etiqueta |
|---|---|
| `menor_24h` | Alta - Menos de 24 horas |
| `24_48h` | Media - Entre 24 y 48 horas |
| `mayor_48h` | Baja - Más de 48 horas |

### `tipo_demolicion`

| Código | Etiqueta |
|---|---|
| `baja` | Baja - algunos elementos a demoler |
| `media` | Media - demolición parcial |
| `total` | Total - demolición completa |

### `urgencia_escombros`

| Código | Etiqueta |
|---|---|
| `espacio_publico` | Están en el espacio público |
| `afecta_vecino` | Están afectando a un vecino |
| `contenidos` | Están contenidos dentro del propio lote |

### `modulos_rd`

| Código | Etiqueta |
|---|---|
| `reparabilidad` | Reparabilidad |
| `demolicion` | Demolición y escombros |

