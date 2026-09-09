function setResetMessage(message, type=''){
  const el = document.getElementById('resetMessage');
  if(!el) return;
  el.textContent = message;
  el.className = `login-message ${type}`.trim();
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('resetForm');

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const password = document.getElementById('newPassword')?.value;
    const confirm = document.getElementById('confirmPassword')?.value;

    if(!password || password.length < 8){
      setResetMessage('La contraseña debe tener al menos 8 caracteres.', 'error');
      return;
    }

    if(password !== confirm){
      setResetMessage('Las contraseñas no coinciden.', 'error');
      return;
    }

    try{
      setResetMessage('Actualizando contraseña...', '');
      const { error } = await window.supabaseClient.auth.updateUser({ password });
      if(error) throw error;

      setResetMessage('Contraseña actualizada correctamente. Redirigiendo...', 'success');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1500);
    }catch(error){
      console.error(error);
      setResetMessage(error.message || 'No se pudo actualizar la contraseña. Solicita un nuevo enlace.', 'error');
    }
  });
});
