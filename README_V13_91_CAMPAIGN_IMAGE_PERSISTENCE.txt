ThinkStore V13.91 — Campaign Studio: imagen persistente

Corrección:
- La URL pública de la imagen subida ahora se conserva entre envíos de prueba.
- Al cambiar precio, texto u otros campos, el siguiente correo mantiene la misma imagen.
- Después de subir una imagen, su URL se guarda también en el campo URL del panel.
- Al seleccionar una imagen nueva se limpia la URL anterior para evitar mezclar campañas.
- La lectura de errores de campaign-image ahora tolera respuestas no JSON.

Motivo del fallo anterior:
Tras el primer envío, el archivo ya quedaba subido y tsCampaignImage.file pasaba a null.
Los siguientes envíos construían bannerUrl solo desde el campo URL manual, que seguía vacío.
Por eso el primer correo podía llevar imagen y el siguiente —por ejemplo después de cambiar el precio— no.
