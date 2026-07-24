# Manual de Usuario — Rol ADMINISTRADOR
## Sistema de Radicación de Correspondencia — Alcaldía de Monterrey Casanare

---

### 1. Introducción

Este manual está dirigido a los usuarios con rol **ADMIN**. El Administrador tiene control total del sistema: puede hacer todo lo que hacen el Operador y el Funcionario, y además es el único que administra los catálogos maestros, los usuarios del sistema y puede anular radicados.

Como Administrador usted puede:

- Radicar correspondencia nueva y adjuntar respuestas sin restricción.
- Consultar toda la correspondencia del sistema y el Dashboard de indicadores.
- **Anular** radicados.
- Administrar **Usuarios**, **Dependencias**, **Tipos de Correspondencia**, **Funcionarios**, **Ciudadanos**, **Empresas** y **Catálogos** auxiliares.
- Consultar **Reportes** y estadísticas globales exportables.

> `[CAPTURA: Pantalla de login del sistema, vacía, con el logo de la Alcaldía]`

---

### 2. Ingresar al sistema

1. Abra el navegador y vaya a la dirección del sistema (por ejemplo `https://radicacion.railway.app`).
2. Digite su **correo electrónico** y **contraseña**.
3. Haga clic en **Ingresar**.

> `[CAPTURA: Formulario de login con los campos correo y contraseña diligenciados]`

Si es su primer ingreso, el sistema lo llevará a **Cambiar Contraseña**: digite la contraseña temporal y cree una nueva (mínimo 8 caracteres, con mayúscula, minúscula y número).

> `[CAPTURA: Pantalla "Cambiar contraseña" mostrando el checklist de requisitos en verde]`

---

### 3. Recorrido general de la pantalla

Al ingresar llega a **Inicio**. El menú lateral del Administrador es el más completo del sistema, organizado en tres secciones:

**Principal**
- Inicio
- Dashboard

**Correspondencia**
- Nueva Radicación
- Bandeja de Radicados

**Administración**
- Reportes
- Usuarios
- Dependencias
- Tipos Correspondencia
- Funcionarios
- Ciudadanos
- Empresas
- Catálogos

En la parte superior derecha están el icono de **campana** (notificaciones) y su **menú de usuario** (foto de perfil, badge "Administrador" y **Cerrar sesión**).

> `[CAPTURA: Pantalla "Inicio" con el menú lateral completo desplegado, señalando las tres secciones: Principal, Correspondencia y Administración]`

---

### 4. Radicar y consultar correspondencia (igual que el Operador)

El Administrador tiene exactamente las mismas funciones de radicación que el Operador:

#### 4.1 Nueva Radicación

1. Clic en **Nueva Radicación**.
2. **Paso 1**: cargue el PDF y use **Analizar con IA** para autocompletar los datos. Si el remitente no existe, use **+ Registrar**.
3. **Paso 2**: verifique/complete tipo de remitente, datos del remitente, dependencia remitente, tipo de correspondencia, asunto, dependencia destino, responsable, folios, medio de ingreso, fechas, anexos y observaciones.
4. Clic en **Guardar**. El sistema asigna el número de radicado automáticamente.

> `[CAPTURA: Paso 1 del formulario "Sube el documento de entrada"]`
> `[CAPTURA: Resultado del análisis de IA con los campos sugeridos]`
> `[CAPTURA: Paso 2 del formulario completo y diligenciado]`
> `[CAPTURA: Confirmación "Radicado creado exitosamente" con el número asignado]`

#### 4.2 Bandeja de Radicados

1. Clic en **Bandeja de Radicados** para ver **todos** los radicados del sistema, con búsqueda por número, filtro por estado, filtros avanzados, pestaña de **Solicitudes CDR**, y exportación a Excel/CSV.

> `[CAPTURA: Bandeja de Radicados completa con filtros y pestañas visibles]`

#### 4.3 Detalle de un radicado y respuesta

Al abrir el detalle de cualquier radicado, el Administrador puede:

- Ver todos los datos, documentos e historial.
- **Adjuntar el PDF de respuesta de cualquier radicado**, sin importar la dependencia ni si tiene un responsable asignado (privilegio exclusivo del rol ADMIN).
- Eliminar anexos (si el estado lo permite).

> `[CAPTURA: Detalle de un radicado con la sección "Adjuntar PDF de respuesta" disponible]`

#### 4.4 Anular un radicado (acción exclusiva del Administrador)

Solo el Administrador ve el botón **Anular**, disponible siempre que el radicado no esté en estado Respondido, Cerrado o Anulado.

1. Abra el detalle del radicado.
2. Haga clic en el botón **Anular**.
3. Confirme la acción en el cuadro de diálogo (*"¿Anular radicado? Esta acción no se puede deshacer"*).

> `[CAPTURA: Botón "Anular" visible en el detalle del radicado, solo para el rol Administrador]`
> `[CAPTURA: Modal de confirmación "¿Anular radicado?"]`
> `[CAPTURA: Radicado con el badge de estado "Anulado"]`

---

### 5. Dashboard con indicadores

1. Clic en **Dashboard** en el menú lateral.
2. Consulte: Radicados hoy, Vencidos, Por vencer, radicados de hoy por estado, carga activa por dependencia, listas de vencidos/próximos a vencer y actividad reciente.

> `[CAPTURA: Dashboard completo con KPIs, gráficos y listas]`

---

### 6. Módulo Administración

Todas las pantallas siguientes solo son visibles y accesibles para el rol ADMIN.

#### 6.1 Reportes

1. Clic en **Reportes**.
2. Consulte gráficas (línea, barras, dona) de la correspondencia radicada, filtrables por rango de fechas, tipo de correspondencia, dependencia y estado.
3. Use el botón de exportar para descargar el reporte en Excel/CSV.

> `[CAPTURA: Pantalla "Reportes" con las gráficas y filtros visibles]`
> `[CAPTURA: Panel de filtros de Reportes desplegado]`

#### 6.2 Usuarios

1. Clic en **Usuarios**.
2. Aquí se administran las cuentas de acceso al sistema:
   - **Crear usuario**: nombre, correo, contraseña temporal, **rol** (ADMIN / OPERADOR / FUNCIONARIO), dependencia y, si aplica, vínculo con un registro de "Personal" existente.
   - **Editar** un usuario existente.
   - **Activar/Desactivar** un usuario (toggle).
   - **Restablecer contraseña**: genera una nueva contraseña temporal que el usuario deberá cambiar en su próximo ingreso.

> `[CAPTURA: Tabla de "Usuarios" con la lista de cuentas]`
> `[CAPTURA: Modal "Crear/Editar Usuario" con el selector de rol visible]`
> `[CAPTURA: Confirmación de "Restablecer contraseña"]`

#### 6.3 Dependencias

1. Clic en **Dependencias**.
2. Cree, edite, active/desactive dependencias/secretarías y asigne o quite el **líder** de cada dependencia.

> `[CAPTURA: Tabla de "Dependencias" con el listado]`
> `[CAPTURA: Modal "Crear/Editar Dependencia"]`

#### 6.4 Tipos Correspondencia

1. Clic en **Tipos Correspondencia**.
2. Cree, edite y active/desactive los tipos de correspondencia (ej. Oficio, Solicitud, Queja), definiendo el **plazo máximo de respuesta en días** (`max_dias`) y la dependencia destino por defecto.

> `[CAPTURA: Tabla de "Tipos Correspondencia" con el listado]`
> `[CAPTURA: Modal "Crear/Editar Tipo de Correspondencia" mostrando el campo de días máximos]`

#### 6.5 Funcionarios

1. Clic en **Funcionarios**.
2. Administre el catálogo de personal de la Alcaldía (nombre, cargo, dependencia). Cree, edite y active/desactive registros.
3. Use el botón **Crear usuario de acceso** sobre un funcionario ya registrado para abrir el módulo de Usuarios prellenado y darle login al sistema.

> `[CAPTURA: Tabla de "Funcionarios" con el listado y el botón "Crear usuario de acceso"]`
> `[CAPTURA: Modal "Crear/Editar Funcionario"]`

**Flujo recomendado para dar de alta a un nuevo funcionario:**
1. Vaya a **Funcionarios** y cree el registro de personal (nombre, cargo, dependencia).
2. Haga clic en **Crear usuario de acceso**.
3. En el formulario de Usuarios que se abre prellenado, asigne el rol **FUNCIONARIO** y guarde.
4. El sistema genera una contraseña temporal; comuníquesela al funcionario para que la cambie en su primer ingreso.

> `[CAPTURA: Secuencia — desde "Crear usuario de acceso" hasta el formulario de Usuarios prellenado]`

#### 6.6 Ciudadanos

1. Clic en **Ciudadanos**.
2. Cree y edite registros de ciudadanos (remitentes personas naturales).

> `[CAPTURA: Tabla de "Ciudadanos" con el listado]`
> `[CAPTURA: Modal "Crear/Editar Ciudadano"]`

#### 6.7 Empresas

1. Clic en **Empresas**.
2. Cree y consulte registros de empresas (remitentes personas jurídicas).

> `[CAPTURA: Tabla de "Empresas" con el listado]`
> `[CAPTURA: Modal "Crear Empresa"]`

> **Nota:** actualmente este módulo solo permite crear y listar empresas; la edición no está disponible.

#### 6.8 Catálogos

1. Clic en **Catálogos**.
2. Administre tres catálogos auxiliares desde una sola pantalla (pestañas o secciones):
   - **Aux Tips** (submotivos de un tipo de correspondencia) — con activar/desactivar.
   - **Tipos de Anexo**.
   - **Medios de Ingreso**.
3. En cada uno puede crear y editar registros.

> `[CAPTURA: Pantalla "Catálogos" mostrando las tres secciones/pestañas]`
> `[CAPTURA: Modal "Crear/Editar" de uno de los catálogos auxiliares]`

---

### 7. Notificaciones

Haga clic en el icono de **campana** para ver notificaciones de radicados nuevos, cambios de estado, vencimientos próximos y respuestas cargadas. Puede marcarlas como leídas o hacer clic para ir al radicado relacionado.

> `[CAPTURA: Panel de notificaciones desplegado]`

---

### 8. Mi perfil y cerrar sesión

1. Haga clic en su nombre/foto en la esquina superior derecha para subir/cambiar su foto de perfil.
2. Haga clic en **Cerrar sesión** y confirme en el cuadro de diálogo.

> `[CAPTURA: Menú de usuario desplegado]`
> `[CAPTURA: Modal de confirmación "¿Cerrar sesión?"]`

---

### 9. Resumen de lo que puede hacer el Administrador

| Acción | ¿Puede hacerlo? |
|---|:---:|
| Radicar correspondencia nueva | Sí |
| Ver la bandeja completa de radicados y el Dashboard | Sí |
| Adjuntar respuesta a **cualquier** radicado | Sí, sin restricción |
| Anular un radicado | Sí (único rol que puede) |
| Exportar radicados y reportes a Excel | Sí |
| Gestionar Usuarios (crear, editar, activar/desactivar, resetear contraseña) | Sí |
| Gestionar Dependencias | Sí |
| Gestionar Tipos de Correspondencia | Sí |
| Gestionar Funcionarios/Personal | Sí |
| Gestionar Ciudadanos y Empresas | Sí |
| Gestionar Catálogos (Aux Tips, Tipos de Anexo, Medios de Ingreso) | Sí |
| Consultar Reportes globales | Sí |

---

*Fin del manual — Rol ADMINISTRADOR.*
