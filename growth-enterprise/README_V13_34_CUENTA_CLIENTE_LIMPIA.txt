ThinkStore V13.34 · Cuenta cliente limpia

- Header público: queda un único icono de cuenta, sin texto "Mi cuenta" ni botón "Mi panel".
- Sin sesión: el icono abre login.html.
- Con sesión: el mismo icono abre panel.html.
- El acceso antiguo "Mi panel" se elimina de forma preventiva aunque código anterior intente reinyectarlo.
- En el panel del cliente, la marca cambia a "ThinkStore · Cuenta" + "Cliente".
- Se elimina para clientes el texto visual "Panel Multi-Rol" y el pie pasa a "Cuenta de cliente".
- Favoritos usa la misma fuente local de la tienda (ts_wishlist_v55 + catálogo real), corrige las rutas de imágenes a /assets y muestra la ficha guardada con imagen, nombre y precio/estado.
