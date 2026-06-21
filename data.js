const CATEGORIES = [
  {
    "id": "Todos",
    "title": "Todos",
    "subtitle": "Todo el catálogo",
    "image": "logo.jpg"
  },
  {
    "id": "iPhone",
    "title": "iPhone",
    "subtitle": "Modelos por color y capacidad",
    "image": "iphone_air_group.jpeg"
  },
  {
    "id": "Mac",
    "title": "Mac",
    "subtitle": "MacBook Air y Pro",
    "image": "808305CE-598A-4D9B-8E47-B54AE9A0ACD9.jpeg"
  },
  {
    "id": "iPad",
    "title": "iPad",
    "subtitle": "iPad por color",
    "image": "C1D43603-926A-4ACF-AA49-5AD3866E8AC5.jpeg"
  },
  {
    "id": "Audio",
    "title": "AirPods",
    "subtitle": "Audio Apple",
    "image": "FD7B07BD-D841-400A-931C-4F4EC3BAA9BA.jpeg"
  },
  {
    "id": "Accesorios",
    "title": "Accesorios",
    "subtitle": "Pencil, AirTag, cables y carga",
    "image": "0006EEA4-4088-48F6-A287-F0EBB608BB63.jpeg"
  }
];

const PRODUCTS = [
  {
    "id": "iphone-17",
    "brand": "Apple",
    "category": "iPhone",
    "family": "Serie iPhone 17",
    "model": "iPhone 17",
    "name": "iPhone 17",
    "badge": "Nuevo",
    "main": "2D7E0106-D37A-42C8-8718-9CC04B9CFDC3.jpeg",
    "gallery": [
      "2D7E0106-D37A-42C8-8718-9CC04B9CFDC3.jpeg",
      "84547CF2-F3E7-4ECE-AD91-EDAEF2289225.jpeg",
      "B11F8B70-E258-484E-9368-86F525A0AFA5.jpeg"
    ],
    "colors": {
      "Verde": "2D7E0106-D37A-42C8-8718-9CC04B9CFDC3.jpeg",
      "Blanco": "84547CF2-F3E7-4ECE-AD91-EDAEF2289225.jpeg",
      "Negro": "B11F8B70-E258-484E-9368-86F525A0AFA5.jpeg"
    },
    "storage": [
      "128GB",
      "256GB",
      "512GB"
    ],
    "condition": [
      "Nuevo",
      "Renovado",
      "Pre-Order"
    ],
    "features": [
      "Pantalla Super Retina XDR",
      "USB-C",
      "Cámara avanzada",
      "Diseño moderno"
    ],
    "details": {
      "Pantalla": "6.1” Super Retina XDR",
      "Cámara": "Sistema dual",
      "Conexión": "USB‑C"
    },
    "desc": "iPhone 17 organizado por color y capacidad, con diseño moderno y gran rendimiento para uso diario."
  },
  {
    "id": "iphone-17-air",
    "brand": "Apple",
    "category": "iPhone",
    "family": "Serie iPhone 17",
    "model": "iPhone 17 Air",
    "name": "iPhone 17 Air",
    "badge": "Ultradelgado",
    "main": "iphone_air_group.jpeg",
    "gallery": [
      "iphone_air_group.jpeg",
      "iphone_air_light_blue.jpeg",
      "iphone_air_champagne.jpeg",
      "iphone_air_white.jpeg",
      "iphone_air_black.jpeg"
    ],
    "colors": {
      "Azul Cielo": "iphone_air_light_blue.jpeg",
      "Oro Suave": "iphone_air_champagne.jpeg",
      "Plata Polar": "iphone_air_white.jpeg",
      "Negro Espacial": "iphone_air_black.jpeg"
    },
    "storage": [
      "128GB",
      "256GB",
      "512GB",
      "1TB"
    ],
    "condition": [
      "Nuevo",
      "Renovado",
      "Pre-Order"
    ],
    "features": [
      "Diseño ultradelgado",
      "Pantalla de alta definición",
      "Excelente autonomía",
      "Cámara principal avanzada"
    ],
    "details": {
      "Pantalla": "Alta definición",
      "Diseño": "Ultradelgado",
      "Conexión": "USB‑C"
    },
    "desc": "El iPhone más ligero y elegante de la nueva generación, ideal para quienes buscan portabilidad, rendimiento y diseño premium."
  },
  {
    "id": "iphone-17-pro",
    "brand": "Apple",
    "category": "iPhone",
    "family": "Serie iPhone 17",
    "model": "iPhone 17 Pro",
    "name": "iPhone 17 Pro",
    "badge": "Pro",
    "main": "13549673-EDE8-4E53-964C-E0B970440BC1.jpeg",
    "gallery": [
      "13549673-EDE8-4E53-964C-E0B970440BC1.jpeg",
      "41EE6CE4-37E2-4BF9-B652-56935AB56916.jpeg",
      "2D7E0106-D37A-42C8-8718-9CC04B9CFDC3.jpeg",
      "84547CF2-F3E7-4ECE-AD91-EDAEF2289225.jpeg"
    ],
    "colors": {
      "Azul Galaxia": "41EE6CE4-37E2-4BF9-B652-56935AB56916.jpeg",
      "Naranja Solar": "2D7E0106-D37A-42C8-8718-9CC04B9CFDC3.jpeg",
      "Plata Lunar": "84547CF2-F3E7-4ECE-AD91-EDAEF2289225.jpeg"
    },
    "storage": [
      "256GB",
      "512GB",
      "1TB",
      "2TB"
    ],
    "condition": [
      "Nuevo",
      "Renovado",
      "Pre-Order"
    ],
    "features": [
      "Sistema de cámaras profesional",
      "Pantalla de alta calidad",
      "Gran rendimiento",
      "Batería optimizada"
    ],
    "details": {
      "Cámara": "Sistema profesional",
      "Capacidad máxima": "2TB",
      "Conexión": "USB‑C"
    },
    "desc": "Diseñado para quienes buscan rendimiento y elegancia, con cámara profesional, pantalla de alta definición y gran potencia."
  },
  {
    "id": "iphone-17-pro-max",
    "brand": "Apple",
    "category": "iPhone",
    "family": "Serie iPhone 17",
    "model": "iPhone 17 Pro Max",
    "name": "iPhone 17 Pro Max",
    "badge": "Pro Max",
    "main": "13549673-EDE8-4E53-964C-E0B970440BC1.jpeg",
    "gallery": [
      "13549673-EDE8-4E53-964C-E0B970440BC1.jpeg",
      "41EE6CE4-37E2-4BF9-B652-56935AB56916.jpeg",
      "2D7E0106-D37A-42C8-8718-9CC04B9CFDC3.jpeg",
      "84547CF2-F3E7-4ECE-AD91-EDAEF2289225.jpeg"
    ],
    "colors": {
      "Azul Galaxia": "41EE6CE4-37E2-4BF9-B652-56935AB56916.jpeg",
      "Naranja Solar": "2D7E0106-D37A-42C8-8718-9CC04B9CFDC3.jpeg",
      "Plata Lunar": "84547CF2-F3E7-4ECE-AD91-EDAEF2289225.jpeg"
    },
    "storage": [
      "256GB",
      "512GB",
      "1TB",
      "2TB"
    ],
    "condition": [
      "Nuevo",
      "Renovado",
      "Pre-Order"
    ],
    "features": [
      "Pantalla de mayor tamaño",
      "Batería de larga duración",
      "Cámara profesional",
      "Máximo rendimiento"
    ],
    "details": {
      "Pantalla": "Gran formato",
      "Capacidad máxima": "2TB",
      "Conexión": "USB‑C"
    },
    "desc": "El modelo más avanzado de la línea iPhone 17, con pantalla grande, excelente autonomía y sistema de cámaras profesional."
  },
  {
    "id": "iphone-16-pro",
    "brand": "Apple",
    "category": "iPhone",
    "family": "Serie iPhone 16",
    "model": "iPhone 16 Pro",
    "name": "iPhone 16 Pro",
    "badge": "Titanium",
    "main": "B11F8B70-E258-484E-9368-86F525A0AFA5.jpeg",
    "gallery": [
      "B11F8B70-E258-484E-9368-86F525A0AFA5.jpeg",
      "2F07A14E-2D60-4200-8647-F83A27D016D1.jpeg",
      "678BE8F4-3BEB-4CC5-AAC8-1D4AA52CE03C.jpeg",
      "41EE6CE4-37E2-4BF9-B652-56935AB56916.jpeg"
    ],
    "colors": {
      "Black Titanium": "B11F8B70-E258-484E-9368-86F525A0AFA5.jpeg",
      "White Titanium": "2F07A14E-2D60-4200-8647-F83A27D016D1.jpeg",
      "Natural Titanium": "678BE8F4-3BEB-4CC5-AAC8-1D4AA52CE03C.jpeg",
      "Desert Titanium": "41EE6CE4-37E2-4BF9-B652-56935AB56916.jpeg"
    },
    "storage": [
      "128GB",
      "256GB",
      "512GB",
      "1TB"
    ],
    "condition": [
      "Nuevo",
      "Renovado",
      "Pre-Order"
    ],
    "features": [
      "Chip Pro",
      "Titanium Design",
      "Cámara Pro",
      "ProMotion"
    ],
    "details": {
      "Material": "Titanium",
      "Cámara": "Pro"
    },
    "desc": "iPhone 16 Pro con colores Titanium y capacidades profesionales."
  },
  {
    "id": "iphone-16-pro-max",
    "brand": "Apple",
    "category": "iPhone",
    "family": "Serie iPhone 16",
    "model": "iPhone 16 Pro Max",
    "name": "iPhone 16 Pro Max",
    "badge": "Titanium Max",
    "main": "123D2418-8B25-4C0B-BAEA-0353B6A45AF4.jpeg",
    "gallery": [
      "123D2418-8B25-4C0B-BAEA-0353B6A45AF4.jpeg",
      "B11F8B70-E258-484E-9368-86F525A0AFA5.jpeg",
      "2F07A14E-2D60-4200-8647-F83A27D016D1.jpeg",
      "678BE8F4-3BEB-4CC5-AAC8-1D4AA52CE03C.jpeg",
      "41EE6CE4-37E2-4BF9-B652-56935AB56916.jpeg"
    ],
    "colors": {
      "Black Titanium": "B11F8B70-E258-484E-9368-86F525A0AFA5.jpeg",
      "White Titanium": "2F07A14E-2D60-4200-8647-F83A27D016D1.jpeg",
      "Natural Titanium": "678BE8F4-3BEB-4CC5-AAC8-1D4AA52CE03C.jpeg",
      "Desert Titanium": "41EE6CE4-37E2-4BF9-B652-56935AB56916.jpeg"
    },
    "storage": [
      "256GB",
      "512GB",
      "1TB"
    ],
    "condition": [
      "Nuevo",
      "Renovado",
      "Pre-Order"
    ],
    "features": [
      "Pantalla grande",
      "Titanium Design",
      "Cámara Pro",
      "Mayor autonomía"
    ],
    "details": {
      "Material": "Titanium",
      "Cámara": "Pro"
    },
    "desc": "iPhone 16 Pro Max con diseño Titanium y pantalla de gran formato."
  },
  {
    "id": "macbook-air-m3-13",
    "brand": "Apple",
    "category": "Mac",
    "family": "MacBook Air M3",
    "model": "MacBook Air M3 13”",
    "name": "MacBook Air M3 13”",
    "badge": "M3 13”",
    "main": "15BE25B5-AC00-4514-BCDE-5B94E3104EDB.jpeg",
    "gallery": [
      "15BE25B5-AC00-4514-BCDE-5B94E3104EDB.jpeg",
      "0B8D2367-C7F9-4E05-8C7E-87BF7282140C.jpeg",
      "6C6BD776-07FC-4884-A0C3-B5263AA15B55.jpeg",
      "DDC1CBFD-2AEC-4904-B1C7-0A967D99A2A1.jpeg",
      "CA58125C-4DCB-430B-8FDE-EC2D3ED98963.jpeg"
    ],
    "colors": {
      "Azul Cielo": "15BE25B5-AC00-4514-BCDE-5B94E3104EDB.jpeg",
      "Starlight": "DDC1CBFD-2AEC-4904-B1C7-0A967D99A2A1.jpeg",
      "Plata": "CA58125C-4DCB-430B-8FDE-EC2D3ED98963.jpeg",
      "Medianoche": "6C6BD776-07FC-4884-A0C3-B5263AA15B55.jpeg"
    },
    "storage": [
      "SSD 256GB · 8GB RAM",
      "SSD 512GB · 8GB RAM",
      "SSD 512GB · 16GB RAM",
      "SSD 1TB · 16GB RAM",
      "SSD 2TB · 24GB RAM"
    ],
    "condition": [
      "Nuevo",
      "Renovado",
      "Pre-Order"
    ],
    "features": [
      "Chip Apple M3",
      "Pantalla Liquid Retina 13.6”",
      "Touch ID",
      "MagSafe"
    ],
    "details": {
      "Pantalla": "13.6” Liquid Retina",
      "Chip": "Apple M3",
      "Memoria": "hasta 24GB",
      "SSD": "hasta 2TB"
    },
    "desc": "MacBook Air M3 de 13 pulgadas, ligera, rápida y perfecta para estudio, trabajo y productividad diaria."
  },
  {
    "id": "macbook-air-m3-16",
    "brand": "Apple",
    "category": "Mac",
    "family": "MacBook Air M3",
    "model": "MacBook Air M3 16”",
    "name": "MacBook Air M3 16”",
    "badge": "M3 16”",
    "main": "CA58125C-4DCB-430B-8FDE-EC2D3ED98963.jpeg",
    "gallery": [
      "15BE25B5-AC00-4514-BCDE-5B94E3104EDB.jpeg",
      "0B8D2367-C7F9-4E05-8C7E-87BF7282140C.jpeg",
      "6C6BD776-07FC-4884-A0C3-B5263AA15B55.jpeg",
      "DDC1CBFD-2AEC-4904-B1C7-0A967D99A2A1.jpeg",
      "CA58125C-4DCB-430B-8FDE-EC2D3ED98963.jpeg"
    ],
    "colors": {
      "Azul Cielo": "15BE25B5-AC00-4514-BCDE-5B94E3104EDB.jpeg",
      "Starlight": "DDC1CBFD-2AEC-4904-B1C7-0A967D99A2A1.jpeg",
      "Plata": "CA58125C-4DCB-430B-8FDE-EC2D3ED98963.jpeg",
      "Medianoche": "6C6BD776-07FC-4884-A0C3-B5263AA15B55.jpeg"
    },
    "storage": [
      "SSD 256GB · 8GB RAM",
      "SSD 512GB · 8GB RAM",
      "SSD 512GB · 16GB RAM",
      "SSD 1TB · 16GB RAM",
      "SSD 2TB · 24GB RAM"
    ],
    "condition": [
      "Nuevo",
      "Renovado",
      "Pre-Order"
    ],
    "features": [
      "Chip Apple M3",
      "Pantalla amplia",
      "Touch ID",
      "MagSafe"
    ],
    "details": {
      "Pantalla": "Formato amplio",
      "Chip": "Apple M3",
      "Memoria": "hasta 24GB",
      "SSD": "hasta 2TB"
    },
    "desc": "MacBook Air M3 con pantalla amplia para mayor comodidad visual, manteniendo diseño delgado y gran autonomía."
  },
  {
    "id": "macbook-air-m4-13",
    "brand": "Apple",
    "category": "Mac",
    "family": "MacBook Air M4",
    "model": "MacBook Air M4 13”",
    "name": "MacBook Air M4 13”",
    "badge": "M4 Air",
    "main": "DDC1CBFD-2AEC-4904-B1C7-0A967D99A2A1.jpeg",
    "gallery": [
      "15BE25B5-AC00-4514-BCDE-5B94E3104EDB.jpeg",
      "0B8D2367-C7F9-4E05-8C7E-87BF7282140C.jpeg",
      "6C6BD776-07FC-4884-A0C3-B5263AA15B55.jpeg",
      "DDC1CBFD-2AEC-4904-B1C7-0A967D99A2A1.jpeg",
      "CA58125C-4DCB-430B-8FDE-EC2D3ED98963.jpeg"
    ],
    "colors": {
      "Plata": "0B8D2367-C7F9-4E05-8C7E-87BF7282140C.jpeg",
      "Starlight": "DDC1CBFD-2AEC-4904-B1C7-0A967D99A2A1.jpeg",
      "Medianoche": "6C6BD776-07FC-4884-A0C3-B5263AA15B55.jpeg"
    },
    "storage": [
      "SSD 256GB · 16GB RAM",
      "SSD 512GB · 16GB RAM",
      "SSD 1TB · 24GB RAM",
      "SSD 2TB · 32GB RAM"
    ],
    "condition": [
      "Nuevo",
      "Renovado",
      "Pre-Order"
    ],
    "features": [
      "Chip Apple M4",
      "Apple Intelligence",
      "Pantalla Liquid Retina",
      "Cámara 12MP Center Stage"
    ],
    "details": {
      "Chip": "Apple M4",
      "Memoria": "hasta 32GB",
      "SSD": "hasta 2TB"
    },
    "desc": "MacBook Air con chip M4, más velocidad, eficiencia energética y diseño ultradelgado."
  },
  {
    "id": "macbook-air-m4-16",
    "brand": "Apple",
    "category": "Mac",
    "family": "MacBook Air M4",
    "model": "MacBook Air M4 16”",
    "name": "MacBook Air M4 16”",
    "badge": "M4 16”",
    "main": "6C6BD776-07FC-4884-A0C3-B5263AA15B55.jpeg",
    "gallery": [
      "15BE25B5-AC00-4514-BCDE-5B94E3104EDB.jpeg",
      "0B8D2367-C7F9-4E05-8C7E-87BF7282140C.jpeg",
      "6C6BD776-07FC-4884-A0C3-B5263AA15B55.jpeg",
      "DDC1CBFD-2AEC-4904-B1C7-0A967D99A2A1.jpeg",
      "CA58125C-4DCB-430B-8FDE-EC2D3ED98963.jpeg"
    ],
    "colors": {
      "Plata": "0B8D2367-C7F9-4E05-8C7E-87BF7282140C.jpeg",
      "Starlight": "DDC1CBFD-2AEC-4904-B1C7-0A967D99A2A1.jpeg",
      "Medianoche": "6C6BD776-07FC-4884-A0C3-B5263AA15B55.jpeg"
    },
    "storage": [
      "SSD 256GB · 16GB RAM",
      "SSD 512GB · 16GB RAM",
      "SSD 1TB · 24GB RAM",
      "SSD 2TB · 32GB RAM"
    ],
    "condition": [
      "Nuevo",
      "Renovado",
      "Pre-Order"
    ],
    "features": [
      "Chip Apple M4",
      "Pantalla amplia",
      "Apple Intelligence",
      "MagSafe"
    ],
    "details": {
      "Chip": "Apple M4",
      "Memoria": "hasta 32GB",
      "SSD": "hasta 2TB"
    },
    "desc": "MacBook Air M4 de pantalla amplia, ideal para productividad, estudio y creación de contenido."
  },
  {
    "id": "macbook-pro-m4-14-negro-espacial",
    "brand": "Apple",
    "category": "Mac",
    "family": "MacBook Pro M4",
    "model": "MacBook Pro 14” M4",
    "name": "MacBook Pro 14” M4 · Negro Espacial",
    "badge": "M4 Pro / Max",
    "main": "808305CE-598A-4D9B-8E47-B54AE9A0ACD9.jpeg",
    "gallery": [
      "808305CE-598A-4D9B-8E47-B54AE9A0ACD9.jpeg",
      "53CDC13A-6D5B-494D-89A3-499F59FE04BA.jpeg",
      "097B8C63-D8D6-40C3-A788-8936E607C166.jpeg",
      "282606E3-694F-4B37-B9B6-0D33B5B6B6B0.jpeg",
      "B505E99B-D7F8-4B82-8830-3111A280B850.jpeg"
    ],
    "colors": {
      "Negro Espacial": "808305CE-598A-4D9B-8E47-B54AE9A0ACD9.jpeg"
    },
    "storage": [
      "M4 Pro · 24GB RAM · 512GB SSD",
      "M4 Pro · 24GB RAM · 1TB SSD",
      "M4 Pro · 48GB RAM · 2TB SSD",
      "M4 Max · 36GB RAM · 1TB SSD",
      "M4 Max · 64GB RAM · 4TB SSD",
      "M4 Max · 128GB RAM · 8TB SSD"
    ],
    "condition": [
      "Nuevo",
      "Renovado",
      "Pre-Order"
    ],
    "features": [
      "Pantalla Liquid Retina XDR",
      "M4 Pro o M4 Max",
      "ProMotion 120Hz",
      "USB‑C a MagSafe 3 incluido"
    ],
    "details": {
      "Pantalla": "14” Liquid Retina XDR",
      "Chip": "M4 Pro / M4 Max",
      "SSD": "hasta 8TB",
      "Color": "Negro Espacial"
    },
    "desc": "MacBook Pro 14” con chip M4 Pro o M4 Max en color Negro Espacial, diseñada para edición, programación, IA y flujos profesionales."
  },
  {
    "id": "macbook-pro-m4-14-plata",
    "brand": "Apple",
    "category": "Mac",
    "family": "MacBook Pro M4",
    "model": "MacBook Pro 14” M4",
    "name": "MacBook Pro 14” M4 · Plata",
    "badge": "M4 Pro / Max",
    "main": "6C6BD776-07FC-4884-A0C3-B5263AA15B55.jpeg",
    "gallery": [
      "6C6BD776-07FC-4884-A0C3-B5263AA15B55.jpeg",
      "CA58125C-4DCB-430B-8FDE-EC2D3ED98963.jpeg",
      "097B8C63-D8D6-40C3-A788-8936E607C166.jpeg",
      "282606E3-694F-4B37-B9B6-0D33B5B6B6B0.jpeg",
      "B505E99B-D7F8-4B82-8830-3111A280B850.jpeg"
    ],
    "colors": {
      "Plata": "6C6BD776-07FC-4884-A0C3-B5263AA15B55.jpeg"
    },
    "storage": [
      "M4 Pro · 24GB RAM · 512GB SSD",
      "M4 Pro · 24GB RAM · 1TB SSD",
      "M4 Pro · 48GB RAM · 2TB SSD",
      "M4 Max · 36GB RAM · 1TB SSD",
      "M4 Max · 64GB RAM · 4TB SSD",
      "M4 Max · 128GB RAM · 8TB SSD"
    ],
    "condition": [
      "Nuevo",
      "Renovado",
      "Pre-Order"
    ],
    "features": [
      "Pantalla Liquid Retina XDR",
      "M4 Pro o M4 Max",
      "ProMotion 120Hz",
      "USB‑C a MagSafe 3 incluido"
    ],
    "details": {
      "Pantalla": "14” Liquid Retina XDR",
      "Chip": "M4 Pro / M4 Max",
      "SSD": "hasta 8TB",
      "Color": "Plata"
    },
    "desc": "MacBook Pro 14” con chip M4 Pro o M4 Max en color Plata, diseñada para edición, programación, IA y flujos profesionales."
  },
  {
    "id": "macbook-pro-m4-16-negro-espacial",
    "brand": "Apple",
    "category": "Mac",
    "family": "MacBook Pro M4",
    "model": "MacBook Pro 16” M4",
    "name": "MacBook Pro 16” M4 · Negro Espacial",
    "badge": "M4 Pro / Max",
    "main": "808305CE-598A-4D9B-8E47-B54AE9A0ACD9.jpeg",
    "gallery": [
      "808305CE-598A-4D9B-8E47-B54AE9A0ACD9.jpeg",
      "53CDC13A-6D5B-494D-89A3-499F59FE04BA.jpeg",
      "097B8C63-D8D6-40C3-A788-8936E607C166.jpeg",
      "282606E3-694F-4B37-B9B6-0D33B5B6B6B0.jpeg",
      "B505E99B-D7F8-4B82-8830-3111A280B850.jpeg"
    ],
    "colors": {
      "Negro Espacial": "808305CE-598A-4D9B-8E47-B54AE9A0ACD9.jpeg"
    },
    "storage": [
      "M4 Pro · 24GB RAM · 512GB SSD",
      "M4 Pro · 24GB RAM · 1TB SSD",
      "M4 Pro · 48GB RAM · 2TB SSD",
      "M4 Max · 36GB RAM · 1TB SSD",
      "M4 Max · 64GB RAM · 4TB SSD",
      "M4 Max · 128GB RAM · 8TB SSD"
    ],
    "condition": [
      "Nuevo",
      "Renovado",
      "Pre-Order"
    ],
    "features": [
      "Pantalla Liquid Retina XDR",
      "M4 Pro o M4 Max",
      "ProMotion 120Hz",
      "USB‑C a MagSafe 3 incluido"
    ],
    "details": {
      "Pantalla": "16” Liquid Retina XDR",
      "Chip": "M4 Pro / M4 Max",
      "SSD": "hasta 8TB",
      "Color": "Negro Espacial"
    },
    "desc": "MacBook Pro 16” con chip M4 Pro o M4 Max en color Negro Espacial, diseñada para edición, programación, IA y flujos profesionales."
  },
  {
    "id": "macbook-pro-m4-16-plata",
    "brand": "Apple",
    "category": "Mac",
    "family": "MacBook Pro M4",
    "model": "MacBook Pro 16” M4",
    "name": "MacBook Pro 16” M4 · Plata",
    "badge": "M4 Pro / Max",
    "main": "6C6BD776-07FC-4884-A0C3-B5263AA15B55.jpeg",
    "gallery": [
      "6C6BD776-07FC-4884-A0C3-B5263AA15B55.jpeg",
      "CA58125C-4DCB-430B-8FDE-EC2D3ED98963.jpeg",
      "097B8C63-D8D6-40C3-A788-8936E607C166.jpeg",
      "282606E3-694F-4B37-B9B6-0D33B5B6B6B0.jpeg",
      "B505E99B-D7F8-4B82-8830-3111A280B850.jpeg"
    ],
    "colors": {
      "Plata": "6C6BD776-07FC-4884-A0C3-B5263AA15B55.jpeg"
    },
    "storage": [
      "M4 Pro · 24GB RAM · 512GB SSD",
      "M4 Pro · 24GB RAM · 1TB SSD",
      "M4 Pro · 48GB RAM · 2TB SSD",
      "M4 Max · 36GB RAM · 1TB SSD",
      "M4 Max · 64GB RAM · 4TB SSD",
      "M4 Max · 128GB RAM · 8TB SSD"
    ],
    "condition": [
      "Nuevo",
      "Renovado",
      "Pre-Order"
    ],
    "features": [
      "Pantalla Liquid Retina XDR",
      "M4 Pro o M4 Max",
      "ProMotion 120Hz",
      "USB‑C a MagSafe 3 incluido"
    ],
    "details": {
      "Pantalla": "16” Liquid Retina XDR",
      "Chip": "M4 Pro / M4 Max",
      "SSD": "hasta 8TB",
      "Color": "Plata"
    },
    "desc": "MacBook Pro 16” con chip M4 Pro o M4 Max en color Plata, diseñada para edición, programación, IA y flujos profesionales."
  },
  {
    "id": "airpods-pro-3",
    "brand": "Apple",
    "category": "Audio",
    "family": "AirPods",
    "model": "AirPods Pro 3",
    "name": "AirPods Pro 3",
    "badge": "Audio",
    "main": "FD7B07BD-D841-400A-931C-4F4EC3BAA9BA.jpeg",
    "gallery": [
      "FD7B07BD-D841-400A-931C-4F4EC3BAA9BA.jpeg",
      "BC3BEB02-EECB-47A7-994D-8D817D772336.jpeg"
    ],
    "colors": {
      "Blanco": "FD7B07BD-D841-400A-931C-4F4EC3BAA9BA.jpeg"
    },
    "storage": [
      "Estuche USB‑C"
    ],
    "condition": [
      "Nuevo",
      "Pre-Order"
    ],
    "features": [
      "Cancelación de ruido",
      "Audio espacial",
      "USB‑C"
    ],
    "details": {
      "Tipo": "In-ear",
      "Carga": "USB‑C"
    },
    "desc": "AirPods Pro con cancelación de ruido, audio espacial y estuche de carga USB‑C."
  },
  {
    "id": "airpods-max",
    "brand": "Apple",
    "category": "Audio",
    "family": "AirPods",
    "model": "AirPods Max",
    "name": "AirPods Max",
    "badge": "Premium Audio",
    "main": "1B1E3583-F373-4064-9BA5-D8C2BFD8753E.jpeg",
    "gallery": [
      "1B1E3583-F373-4064-9BA5-D8C2BFD8753E.jpeg",
      "FC19404A-DCB1-4CD5-BE04-CD45A2AD0B80.jpeg",
      "0DBF6309-60A6-4A74-A29F-3188A0B028AC.jpeg",
      "918B6DBB-98C9-4896-998D-C676CBEDD44C.jpeg"
    ],
    "colors": {
      "Azul": "1B1E3583-F373-4064-9BA5-D8C2BFD8753E.jpeg",
      "Plata": "FC19404A-DCB1-4CD5-BE04-CD45A2AD0B80.jpeg",
      "Negro": "0DBF6309-60A6-4A74-A29F-3188A0B028AC.jpeg",
      "Morado": "918B6DBB-98C9-4896-998D-C676CBEDD44C.jpeg"
    },
    "storage": [
      "Versión estándar"
    ],
    "condition": [
      "Nuevo",
      "Renovado"
    ],
    "features": [
      "Audio Hi‑Fi",
      "Cancelación de ruido",
      "Audio espacial"
    ],
    "details": {
      "Tipo": "Over-ear",
      "Conectividad": "Bluetooth"
    },
    "desc": "AirPods Max con diseño premium, cancelación activa de ruido y audio espacial."
  },
  {
    "id": "ipad-a16",
    "brand": "Apple",
    "category": "iPad",
    "family": "iPad",
    "model": "iPad A16",
    "name": "iPad A16",
    "badge": "iPad",
    "main": "C1D43603-926A-4ACF-AA49-5AD3866E8AC5.jpeg",
    "gallery": [
      "C1D43603-926A-4ACF-AA49-5AD3866E8AC5.jpeg",
      "DB026A04-BE10-4DFE-BAD8-CB143E67D14D.jpeg",
      "96581A2E-8F6F-4DD6-9F24-F29584414053.jpeg",
      "5F066EFD-92A6-435A-A94F-33EBAC852AB1.jpeg"
    ],
    "colors": {
      "Plata": "C1D43603-926A-4ACF-AA49-5AD3866E8AC5.jpeg",
      "Amarillo": "DB026A04-BE10-4DFE-BAD8-CB143E67D14D.jpeg",
      "Rosa": "96581A2E-8F6F-4DD6-9F24-F29584414053.jpeg",
      "Azul": "5F066EFD-92A6-435A-A94F-33EBAC852AB1.jpeg"
    },
    "storage": [
      "64GB Wi‑Fi",
      "256GB Wi‑Fi",
      "64GB Wi‑Fi + Cellular",
      "256GB Wi‑Fi + Cellular"
    ],
    "condition": [
      "Nuevo",
      "Renovado",
      "Pre-Order"
    ],
    "features": [
      "Chip A16",
      "Pantalla Liquid Retina",
      "USB‑C"
    ],
    "details": {
      "Chip": "A16",
      "Conexión": "USB‑C"
    },
    "desc": "iPad A16 por color, capacidad y conexión, ideal para estudio, entretenimiento y productividad."
  },
  {
    "id": "apple-pencil-usbc",
    "brand": "Apple",
    "category": "Accesorios",
    "family": "Apple Pencil",
    "model": "Apple Pencil USB‑C",
    "name": "Apple Pencil USB‑C",
    "badge": "Pencil",
    "main": "0006EEA4-4088-48F6-A287-F0EBB608BB63.jpeg",
    "gallery": [
      "0006EEA4-4088-48F6-A287-F0EBB608BB63.jpeg",
      "94CBDFD5-70E9-4ABE-88B7-9DFAE1A00275.jpeg"
    ],
    "colors": {
      "Blanco": "0006EEA4-4088-48F6-A287-F0EBB608BB63.jpeg"
    },
    "storage": [
      "USB‑C"
    ],
    "condition": [
      "Nuevo"
    ],
    "features": [
      "Carga USB‑C",
      "Precisión para notas y dibujo"
    ],
    "details": {
      "Conexión": "USB‑C"
    },
    "desc": "Apple Pencil USB‑C para escritura, dibujo y productividad en iPad compatible."
  }
];
