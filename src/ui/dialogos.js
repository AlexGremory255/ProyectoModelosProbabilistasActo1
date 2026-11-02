import { escapar } from '../estado.js';

export const iconos = {
  info: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zm.75 12.5h-1.5V9h1.5v5zm0-6.5h-1.5V6h1.5v1.5z"/></svg>',
  error: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zm3.18 10.62-1.06 1.06L10 11.06l-2.12 2.12-1.06-1.06L8.94 10 6.82 7.88l1.06-1.06L10 8.94l2.12-2.12 1.06 1.06L11.06 10l2.12 2.12z"/></svg>',
  exito: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zm-1.1 11.8L5.4 9.8l1.06-1.06 2.44 2.44 4.64-4.64 1.06 1.06-5.7 5.7z"/></svg>'};

export function confirmar({ etiqueta = '', titulo, mensaje, aceptar = 'Aceptar', cancelar = 'Cancelar', peligro = false }) {
  const modalPrevio = document.querySelector('.modal-fondo');
  if (modalPrevio) modalPrevio.remove();

  return new Promise(resolver => {
    const elementoAnterior = document.activeElement;
    const fondoModal = document.createElement('div');
    fondoModal.className = 'modal-fondo';
    fondoModal.innerHTML = `
      <form class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitulo" novalidate>
        <div class="modal-encabezado">
          ${etiqueta ? `<p class="modal-etiqueta">${escapar(etiqueta)}</p>` : ''}
          <h2 id="modalTitulo" class="modal-titulo">${escapar(titulo)}</h2>
        </div>
        <div class="modal-cuerpo"><p>${escapar(mensaje)}</p></div>
        <div class="modal-pie">
          <button type="button" class="boton boton-secundario" data-accion="cancelar">${escapar(cancelar)}</button>
          <button type="submit" class="boton ${peligro ? 'boton-peligro' : 'boton-primario'}">${escapar(aceptar)}</button>
        </div>
      </form>`;
    document.body.appendChild(fondoModal);

    const formularioModal = fondoModal.querySelector('form');
    let yaCerrado = false;

    const cerrarModal = confirmado => {
      if (yaCerrado) return;
      yaCerrado = true;
      document.removeEventListener('keydown', manejarTeclado, true);
      fondoModal.classList.add('saliendo');
      setTimeout(() => {
        fondoModal.remove();
        if (elementoAnterior && typeof elementoAnterior.focus === 'function') elementoAnterior.focus();
        resolver(confirmado);}, 130);};

    const manejarTeclado = evento => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        cerrarModal(false);}
      if (evento.key === 'Tab') {
        const botonesModal = [...formularioModal.querySelectorAll('button')].filter(boton => !boton.disabled);
        const primerBoton = botonesModal[0];
        const ultimoBoton = botonesModal[botonesModal.length - 1];
        if (evento.shiftKey && document.activeElement === primerBoton) {
          evento.preventDefault();
          ultimoBoton.focus();
        } else if (!evento.shiftKey && document.activeElement === ultimoBoton) {
          evento.preventDefault();
          primerBoton.focus();}}};

    document.addEventListener('keydown', manejarTeclado, true);

    fondoModal.addEventListener('mousedown', evento => {
      if (evento.target === fondoModal) cerrarModal(false);});

    formularioModal.querySelector('[data-accion="cancelar"]').onclick = () => cerrarModal(false);
    formularioModal.onsubmit = evento => {
      evento.preventDefault();
      cerrarModal(true);};

    formularioModal.querySelector('[type="submit"]').focus();});}

function retirarNotificacion(elementoAviso) {
  if (!elementoAviso || elementoAviso.dataset.retirando === 'true') return;
  elementoAviso.dataset.retirando = 'true';
  clearTimeout(Number(elementoAviso.dataset.temporizador));
  elementoAviso.classList.add('saliendo');
  setTimeout(() => elementoAviso.remove(), 180);}

export function avisar(mensaje, tipo = 'info') {
  const contenedorAvisos = document.querySelector('#avisos');
  if (!contenedorAvisos) return;

  const duracionVisible = tipo === 'error' ? 5500 : 3400;

  const avisoDuplicado = [...contenedorAvisos.querySelectorAll('.notificacion')].find(
    elemento => elemento.dataset.mensaje === mensaje && elemento.dataset.retirando !== 'true');

  if (avisoDuplicado) {
    clearTimeout(Number(avisoDuplicado.dataset.temporizador));
    avisoDuplicado.classList.remove('pulso');
    void avisoDuplicado.offsetWidth;
    avisoDuplicado.classList.add('pulso');
    avisoDuplicado.dataset.temporizador = String(setTimeout(() => retirarNotificacion(avisoDuplicado), duracionVisible));
    return;}

  const avisosActivos = [...contenedorAvisos.querySelectorAll('.notificacion')].filter(
    elemento => elemento.dataset.retirando !== 'true');
  if (avisosActivos.length >= 2) retirarNotificacion(avisosActivos[0]);

  const iconoSeleccionado = iconos[tipo] || iconos.info;
  const nuevoAviso = document.createElement('div');
  nuevoAviso.className = `notificacion ${tipo}`;
  nuevoAviso.dataset.mensaje = mensaje;
  nuevoAviso.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
  nuevoAviso.innerHTML = `
    <span class="notificacion-icono">${iconoSeleccionado}</span>
    <span class="notificacion-texto">${escapar(mensaje)}</span>
    <button type="button" class="notificacion-cerrar" aria-label="Cerrar notificación">
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M12.3 4.7 11.3 3.7 8 7 4.7 3.7 3.7 4.7 7 8l-3.3 3.3 1 1L8 9l3.3 3.3 1-1L9 8z"/></svg>
    </button>`;

  nuevoAviso.querySelector('.notificacion-cerrar').onclick = () => retirarNotificacion(nuevoAviso);
  contenedorAvisos.appendChild(nuevoAviso);
  nuevoAviso.dataset.temporizador = String(setTimeout(() => retirarNotificacion(nuevoAviso), duracionVisible));}
