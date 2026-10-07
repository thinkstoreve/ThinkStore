# ThinkStore Enterprise V10.17 · Boot Failsafe

Corrección puntual de la pantalla de bienvenida que podía quedar bloqueada si una sección fallaba durante el render inicial.

- La bienvenida se libera automáticamente en un máximo de ~2.8 s.
- El dashboard se muestra antes de cargar datos pesados.
- Un error en una gráfica/módulo no bloquea el resto del panel.
- La sincronización continúa en segundo plano.
- Sin cambios de base de datos, BCV, Staff o Soporte.
