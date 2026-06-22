function openLogin() {
  document.getElementById("loginDialog").showModal();
}

function closeLogin() {
  document.getElementById("loginDialog").close();
}

function openLookup() {
  document.getElementById("lookupDialog").showModal();
}

function closeLookup() {
  document.getElementById("lookupDialog").close();
}

function login(event) {
  event.preventDefault();

  const user = document.getElementById("user").value.trim();
  const password = document.getElementById("password").value.trim();

  const demoUsers = {
    admin: "admin123",
    tecnico: "tecnico123",
    recepcion: "recepcion123"
  };

  if (demoUsers[user] && demoUsers[user] === password) {
    alert("Acceso autorizado: " + user);
    closeLogin();
    return false;
  }

  alert("Credenciales incorrectas o usuario no autorizado.");
  return false;
}

function lookup(event) {
  event.preventDefault();
  const code = document.getElementById("orderCode").value.trim();

  if (!code) {
    alert("Ingresa un código de reparación.");
    return false;
  }

  alert("Consulta recibida para la orden: " + code);
  closeLookup();
  return false;
}
