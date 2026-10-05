ThinkStore V13.38 — corrección de bloqueo al cargar

Se eliminó el MutationObserver global introducido en V13.37.
Ese observer reaccionaba a los cambios de DOM que hacía su propia función sync(),
creando un ciclo continuo que podía dejar Chrome en “La página no responde”.

Se mantiene el acceso único de cuenta y el versionado de recursos se actualizó a 13.38.
Prueba esta versión primero en Live Server antes de hacer deploy.
