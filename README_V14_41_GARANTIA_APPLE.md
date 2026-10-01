# ThinkStore V14.41 — Garantía Apple

Proyecto completo basado en V14.40.

Se añadió un botón pequeño «Garantía» junto al título del selector de modelos, dentro de la recepción Apple. Abre https://checkcoverage.apple.com/?locale=es_VE en una pestaña nueva, conservando el formulario de recepción. No aparece en Otros equipos ni Consolas y controles porque forma parte de la tarjeta exclusiva de Apple.

Es un acceso directo: no envía automáticamente el serial ni consulta o guarda la garantía en ThinkStore. La consulta se realiza en la página de Apple.

No requiere SQL ni configuración adicional respecto de V14.40. Se mantienen las migraciones V14.38/V14.39 para sus funciones anteriores. Publicar el paquete completo o la carpeta soporte completa, según el despliegue habitual, y recargar el panel.

Verificación: URL exacta, apertura en otra pestaña, aislamiento de la tarjeta Apple y estilos limitados a recepción. No se cambió JavaScript ni el guardado de órdenes. No desplegado en producción.
