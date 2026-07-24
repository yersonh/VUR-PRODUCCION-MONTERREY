# Manual de Usuario — Rol OPERADOR
## Sistema de Radicación de Correspondencia — Alcaldía de Monterrey Casanare

---

### 1. Introducción

Este manual está dirigido a los usuarios con rol **OPERADOR**. El Operador es quien recibe físicamente la correspondencia (oficios, cartas, solicitudes) que llega a la Alcaldía y la registra ("radica") en el sistema, asignándola a la dependencia y al funcionario que debe atenderla.

Como Operador usted puede:

- Radicar correspondencia nueva (con ayuda de Inteligencia Artificial para leer el PDF).
- Consultar y filtrar toda la correspondencia radicada en el sistema.
- Ver el detalle e historial de cualquier radicado.
- Adjuntar la respuesta (PDF de salida) de los radicados de su propia dependencia que no tengan un responsable exclusivo asignado.
- Ver el tablero de indicadores (Dashboard) con radicados vencidos y por vencer.
- Recibir notificaciones del sistema.

Usted **no puede**: anular radicados, ni acceder a los módulos de Administración (Usuarios, Dependencias, Catálogos, etc.).

> `[CAPTURA: Pantalla de login del sistema, vacía, con el logo de la Alcaldía]`

---

### 2. Ingresar al sistema

1. Abra el navegador y vaya a la dirección del sistema (por ejemplo `https://radicacion.railway.app`).
2. Digite su **correo electrónico** y **contraseña**.
3. Haga clic en **Ingresar**.

> `[CAPTURA: Formulario de login con los campos correo y contraseña diligenciados]`

**Primer ingreso:** si es la primera vez que ingresa (o el administrador le restableció la contraseña), el sistema lo llevará automáticamente a la pantalla **Cambiar Contraseña**. Debe digitar la contraseña temporal que le entregó el administrador, y luego crear una nueva que cumpla:

- Mínimo 8 caracteres
- Al menos una mayúscula
- Al menos una minúscula
- Al menos un número

> `[CAPTURA: Pantalla "Cambiar contraseña" mostrando el checklist de requisitos en verde]`

---

### 3. Recorrido general de la pantalla

Al ingresar llega a **Inicio**. En la parte superior encontrará:

- El **menú lateral izquierdo** con las opciones disponibles para su rol: *Inicio, Dashboard, Nueva Radicación, Bandeja de Radicados*.
- En la parte superior derecha, el icono de **campana** (notificaciones) y su **foto/menú de usuario** (nombre, rol "Operador", opción de cambiar foto de perfil y **Cerrar sesión**).

> `[CAPTURA: Pantalla "Inicio" completa, señalando con flechas el menú lateral, la campana de notificaciones y el menú de usuario]`

---

### 4. Radicar un nuevo documento (Nueva Radicación)

Esta es su tarea principal en el sistema. Siga estos pasos cada vez que llegue un documento físico o digital nuevo:

1. En el menú lateral, haga clic en **Nueva Radicación** (o en la tarjeta "Nueva Radicación" de la pantalla de Inicio).

> `[CAPTURA: Menú lateral con la opción "Nueva Radicación" resaltada]`

#### Paso 1 — Cargar el documento

2. Haga clic en el recuadro de carga y seleccione el archivo **PDF** del documento recibido (o arrástrelo).

> `[CAPTURA: Paso 1 del formulario "Sube el documento de entrada", con el recuadro de carga de PDF vacío]`

3. Haga clic en **Analizar con IA**. El sistema leerá el PDF y sugerirá automáticamente datos como remitente, tipo de correspondencia y asunto, mostrando un porcentaje de confianza.

> `[CAPTURA: Resultado del análisis de IA mostrando los campos sugeridos y el porcentaje de confianza]`

4. Si el sistema detecta que el remitente (persona, empresa o funcionario) **no existe** en el sistema, aparecerán los botones **Buscar** o **+ Registrar**. Use **+ Registrar** para darlo de alta sin salir del formulario.

> `[CAPTURA: Aviso de remitente no encontrado con los botones "Buscar" y "+ Registrar"]`
> `[CAPTURA: Modal "Registrar Tercero" o "Registrar Funcionario" con el formulario abierto]`

#### Paso 2 — Verificar y completar los datos

5. Revise/complete los siguientes campos:
   - **Tipo de remitente**: Tercero (NIT), Funcionario o Ciudadano.
   - **Datos del remitente**: use el buscador para seleccionar el remitente correcto si no fue autocompletado.
   - **Dependencia remitente** (si aplica).
   - **Tipo de correspondencia** y **submotivo** (Aux Tip).
   - **Asunto**.
   - **Dependencia destino** y, si se conoce, el **funcionario responsable** que debe atenderlo.
   - **Folios**, **medio de ingreso**, **fecha del documento** y **fecha de entrega**.
   - **Anexos**, indicando el tipo de cada uno.
   - **Observaciones** (opcional).

> `[CAPTURA: Paso 2 del formulario completo, con todos los campos diligenciados]`
> `[CAPTURA: Buscador de remitente/dependencia destino (SearchModal) abierto]`

6. Verifique la información y haga clic en **Guardar** (o el botón equivalente para radicar). El sistema asignará automáticamente el **número de radicado** (consecutivo-año).

> `[CAPTURA: Mensaje de confirmación "Radicado creado exitosamente" con el número de radicado asignado]`

> **Nota:** si se equivoca o desea cancelar el proceso, use el botón **Cancelar**; el sistema pedirá confirmación antes de descartar los datos digitados.

---

### 5. Consultar la Bandeja de Radicados

1. En el menú lateral, haga clic en **Bandeja de Radicados**.

> `[CAPTURA: Bandeja de Radicados con el listado completo, el botón "Nuevo Radicado" y las pestañas visibles]`

En esta pantalla usted puede:

- Ver **todos** los radicados del sistema (no solo los suyos).
- Usar la pestaña **Solicitudes CDR** para ver las solicitudes de Certificado de Residencia Digital pendientes (con contador en rojo).
- Buscar por **número de radicado**.
- Filtrar por **estado** (Radicado, En Trámite, Respondido, Cerrado, Anulado).
- Usar **Filtros avanzados** para buscar por rango de fechas, remitente, tipo de correspondencia o dependencia destino.
- **Exportar** el listado a Excel/CSV.
- Cambiar la cantidad de resultados por página (10/20/50).
- Hacer clic en **Ver** en cualquier fila para abrir el detalle del radicado.

> `[CAPTURA: Panel de "Filtros avanzados" desplegado]`
> `[CAPTURA: Pestaña "Solicitudes CDR" con el contador de pendientes]`

---

### 6. Ver el detalle de un radicado

Al hacer clic en **Ver** sobre cualquier radicado, encontrará:

- Los datos completos de la radicación (remitente, tipo, destino, fechas, folios).
- El **PDF de entrada** y los **anexos**, disponibles para ver/descargar.
- El **historial de actuaciones** (línea de tiempo) con cada movimiento del radicado.
- El botón **Recargar** para actualizar la información en pantalla.

> `[CAPTURA: Detalle de un radicado completo, señalando datos, documentos y línea de tiempo]`

#### Adjuntar la respuesta (PDF de salida)

Si el radicado es de **su dependencia** y **no tiene un responsable exclusivo asignado**, verá la opción **Adjuntar PDF de respuesta**:

1. Haga clic en **Adjuntar PDF de respuesta**.
2. Seleccione el archivo PDF con la respuesta oficial.
3. Confirme la carga. El estado del radicado cambiará automáticamente a **Respondido**.

> `[CAPTURA: Sección "Adjuntar PDF de respuesta" con el botón de carga visible]`
> `[CAPTURA: Radicado ya respondido, mostrando el badge de estado "Respondido" y el PDF de salida disponible]`

> **Nota:** si el radicado tiene un funcionario responsable específico asignado, solo ese funcionario podrá adjuntar la respuesta; usted verá el mensaje *"Solo el funcionario responsable de este radicado puede adjuntar la respuesta."*

#### Eliminar un anexo

Si el radicado aún no está Cerrado ni Anulado, puede eliminar un anexo haciendo clic en el icono de papelera junto a él.

> `[CAPTURA: Lista de anexos con el icono de papelera visible junto a uno de ellos]`

---

### 7. Dashboard con indicadores

1. En el menú lateral, haga clic en **Dashboard**.

Esta pantalla es solo de consulta y muestra:

- **Radicados hoy**, **Vencidos** y **Por vencer** (próximos 3 días).
- Gráfico de **radicados de hoy por estado**.
- **Carga activa por dependencia**.
- Listas de **vencidos** y **próximos a vencer**, en las que puede hacer clic para ir directo al detalle.
- **Actividad reciente** del sistema.
- Botón de **refrescar** (icono circular) para actualizar los datos.

> `[CAPTURA: Dashboard completo con los KPIs, gráficos y listas de vencidos/por vencer]`

---

### 8. Notificaciones

Haga clic en el icono de **campana** (esquina superior derecha) para ver sus notificaciones:

- **Radicado nuevo** asignado a su dependencia.
- **Cambio de estado** de un radicado.
- **Vencimiento próximo** de un radicado.
- **Respuesta cargada**.

Puede marcar una notificación como leída, marcarlas todas como leídas, o hacer clic sobre una para ir directamente al radicado relacionado.

> `[CAPTURA: Panel de notificaciones desplegado con varias notificaciones de ejemplo]`

---

### 9. Mi perfil y cerrar sesión

1. Haga clic en su nombre/foto en la esquina superior derecha.
2. Desde ahí puede **subir o cambiar su foto de perfil**.
3. Para salir del sistema, haga clic en **Cerrar sesión** y confirme en el cuadro de diálogo que aparece.

> `[CAPTURA: Menú de usuario desplegado con las opciones "Cambiar foto" y "Cerrar sesión"]`
> `[CAPTURA: Modal de confirmación "¿Cerrar sesión?"]`

---

### 10. Resumen de lo que puede hacer el Operador

| Acción | ¿Puede hacerlo? |
|---|:---:|
| Radicar correspondencia nueva | Sí |
| Ver la bandeja completa de radicados | Sí |
| Ver el detalle de cualquier radicado | Sí |
| Adjuntar respuesta (si es de su dependencia, sin responsable exclusivo) | Sí |
| Eliminar anexos (si el estado lo permite) | Sí |
| Exportar radicados a Excel | Sí |
| Ver el Dashboard con indicadores | Sí |
| Anular un radicado | No |
| Entrar a Administración (Usuarios, Dependencias, Catálogos, etc.) | No |

---

*Fin del manual — Rol OPERADOR.*
