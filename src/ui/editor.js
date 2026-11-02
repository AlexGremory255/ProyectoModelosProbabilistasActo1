import {
  obtener,
  suscribir,
  actualizar,
  agregarNodo,
  eliminarNodo,
  renombrarNodo,
  renombrarRed,
  cambiarEstados,
  cambiarPadres,
  ponerProbabilidad,
  normalizarFilaCpt,
  distribuirUniformeTodoNodo,
  distribuirAleatorioTodoNodo,
  escapar} from '../estado.js';
import { minimoNodos, maximoNodos } from '../logica/validacion.js';
import { confirmar, avisar, iconos } from './dialogos.js';

const iconoFlecha = '<svg class="acordeon-flecha" viewBox="0 0 16 16" aria-hidden="true"><path class="trazo-h" d="M3 7.5h10v1H3z"/><path class="trazo-v" d="M7.5 3h1v10h-1z"/></svg>';

const separarEstados = texto =>
  texto
    .split(',')
    .map(fragmento => fragmento.trim())
    .filter(Boolean);

const leerNumero = texto => parseFloat(String(texto).replace(',', '.'));

const formatearNumero = valor => String(Number(valor.toFixed(6)));

const seccionesAbiertas = { nodos: true, propiedades: true, tabla: true };
let formularioVisible = false;

function avisoRed(red, errores) {
  const nodosFaltantes = minimoNodos - red.nodos.length;
  const erroresEstructurales = errores.filter(mensajeError => !/nodos; el (mínimo|máximo)/.test(mensajeError));

  if (erroresEstructurales.length) {
    return `
      <div class="aviso aviso-error" role="alert">
        ${iconos.error}
        <div>
          <p class="aviso-titulo">La red tiene ${erroresEstructurales.length === 1 ? 'un problema' : `${erroresEstructurales.length} problemas`}</p>
          <ul>${erroresEstructurales.map(mensajeError => `<li>${escapar(mensajeError)}</li>`).join('')}</ul>
        </div>
      </div>`;}

  if (nodosFaltantes > 0 && red.nodos.length > 0) {
    return `
      <div class="aviso aviso-info">
        ${iconos.info}
        <p>Agrega ${nodosFaltantes === 1 ? 'un nodo más' : `${nodosFaltantes} nodos más`} para poder hacer consultas. La red debe tener entre ${minimoNodos} y ${maximoNodos}.</p>
      </div>`;}

  return '';}

function estadoResumen(red, errores) {
  if (!red.nodos.length) return { clase: 'incompleta', texto: 'Sin nodos' };
  const erroresEstructurales = errores.filter(mensajeError => !/nodos; el (mínimo|máximo)/.test(mensajeError));
  if (erroresEstructurales.length) return { clase: 'con-errores', texto: 'Requiere correcciones' };
  if (red.nodos.length < minimoNodos) return { clase: 'incompleta', texto: `${red.nodos.length} de ${minimoNodos} nodos mínimos` };
  return { clase: '', texto: 'Lista para consultar' };}

function seccionNodos(red, seleccionado) {
  const limiteAlcanzado = red.nodos.length >= maximoNodos;
  return `
    <details class="acordeon" data-seccion="nodos" ${seccionesAbiertas.nodos ? 'open' : ''}>
      <summary>Nodos <span class="acordeon-extra">${red.nodos.length} de ${maximoNodos}</span>${iconoFlecha}</summary>
      <div class="acordeon-contenido">
        ${
          red.nodos.length
            ? `<ul class="lista-nodos">
                ${red.nodos
                  .map(
                    (nodo, posicionNodo) => `
                  <li>
                    <button type="button" class="elemento-nodo ${nodo.id === seleccionado ? 'activo' : ''}" data-id="${escapar(nodo.id)}" ${nodo.id === seleccionado ? 'aria-current="true"' : ''}>
                      <span class="nodo-pastilla" aria-hidden="true">${String(posicionNodo + 1).padStart(2, '0')}</span>
                      <span class="nodo-nombre">${escapar(nodo.id)}</span>
                      <span class="nodo-detalle">${nodo.padres.length ? `${nodo.padres.length} ${nodo.padres.length === 1 ? 'padre' : 'padres'}` : 'raíz'}</span>
                      <span class="nodo-mas" aria-hidden="true">+</span>
                    </button>
                  </li>`)
                  .join('')}
              </ul>`
            : `<div class="vacio"><strong>Todavía no hay nodos</strong>Crea el primero con el formulario de abajo o abre un ejemplo desde la barra superior.</div>`}

        ${
          formularioVisible || !red.nodos.length
            ? `
          <form id="formNodo" class="formulario-nodo" autocomplete="off">
            <div class="campo">
              <label class="etiqueta" for="nombreNodo">Nombre del nodo</label>
              <input id="nombreNodo" class="entrada" placeholder="Por ejemplo, Lluvia" required>
            </div>
            <div class="campo">
              <label class="etiqueta" for="estadosNodo">Estados</label>
              <input id="estadosNodo" class="entrada" value="si, no" required>
              <span class="ayuda">Sepáralos con comas. Mínimo dos.</span>
            </div>
            <div class="acciones-fila">
              ${red.nodos.length ? '<button type="button" id="cancelarNodo" class="boton boton-fantasma boton-chico">Cancelar</button>' : ''}
              <button type="submit" class="boton boton-primario boton-chico">Agregar nodo</button>
            </div>
          </form>`
            : `
          <div class="acciones-fila" style="justify-content:flex-start">
            <button type="button" id="mostrarFormulario" class="boton boton-terciario boton-chico" ${limiteAlcanzado ? 'disabled' : ''}>
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8.5 3v4.5H13v1H8.5V13h-1V8.5H3v-1h4.5V3z"/></svg>
              ${limiteAlcanzado ? 'Límite de 10 nodos alcanzado' : 'Agregar nodo'}
            </button>
          </div>`}
      </div>
    </details>`;}

function seccionPropiedades(red, nodo) {
  const nodosCandidatos = red.nodos.filter(otroNodo => otroNodo.id !== nodo.id);
  return `
    <details class="acordeon" data-seccion="propiedades" ${seccionesAbiertas.propiedades ? 'open' : ''}>
      <summary>Propiedades de ${escapar(nodo.id)}${iconoFlecha}</summary>
      <div class="acordeon-contenido">
        <div class="campo">
          <label class="etiqueta" for="renombrarNodo">Nombre</label>
          <input id="renombrarNodo" class="entrada" value="${escapar(nodo.id)}" autocomplete="off">
        </div>
        <div class="campo">
          <label class="etiqueta" for="estadosEditar">Estados</label>
          <input id="estadosEditar" class="entrada" value="${escapar(nodo.estados.join(', '))}" autocomplete="off">
          <span class="ayuda">Al cambiar los estados se reinicia su tabla de probabilidad.</span>
        </div>
        <fieldset class="campo" style="border:0;padding:0;margin:0 0 16px">
          <legend class="etiqueta" style="margin-bottom:8px">Depende de</legend>
          ${
            nodosCandidatos.length
              ? `<div class="casillas">
                  ${nodosCandidatos
                    .map(
                      otroNodo => `
                    <label class="casilla">
                      <input type="checkbox" data-padre="${escapar(otroNodo.id)}" ${nodo.padres.includes(otroNodo.id) ? 'checked' : ''}>
                      <span>${escapar(otroNodo.id)}</span>
                    </label>`)
                    .join('')}
                </div>`
              : '<span class="ayuda">Agrega más nodos para definir dependencias.</span>'}
        </fieldset>
        <button type="button" id="botonEliminar" class="boton boton-peligro-fantasma boton-chico">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 6h1v6H6zm3 0h1v6H9zM2 3v1h1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4h1V3zm2 11V4h8v10zM6 1h4v1H6z"/></svg>
          Eliminar nodo
        </button>
      </div>
    </details>`;}

function seccionTabla(nodo) {
  const clavesTabla = Object.keys(nodo.cpt);
  const cantidadEstados = nodo.estados.length;
  const textoAyuda =
    cantidadEstados === 2
      ? 'Escribe una probabilidad y la otra se completa sola.'
      : 'Al escribir, el último estado toma lo que falta para sumar 1.';

  const filasTabla = clavesTabla
    .map(clave => {
      const valoresPadres = nodo.padres.length ? clave.split(',') : [];
      const fila = nodo.cpt[clave];
      const sumaFila = fila.reduce((acumulado, probabilidad) => acumulado + (Number(probabilidad) || 0), 0);
      const sumaCorrecta = Math.abs(sumaFila - 1) < 1e-6;
      return `
        <tr data-fila="${escapar(clave)}">
          ${valoresPadres.map(valorPadre => `<td class="celda-padre">${escapar(valorPadre)}</td>`).join('')}
          ${fila
            .map(
              (probabilidad, posicionEstado) => `
            <td class="celda-entrada">
              <input class="entrada-prob" inputmode="decimal" autocomplete="off"
                id="prob-${escapar(clave)}-${posicionEstado}"
                aria-label="Probabilidad de ${escapar(nodo.estados[posicionEstado])}${valoresPadres.length ? ' dado ' + escapar(valoresPadres.join(', ')) : ''}"
                value="${formatearNumero(probabilidad)}" data-clave="${escapar(clave)}" data-indice="${posicionEstado}">
            </td>`)
            .join('')}
          <td class="suma ${sumaCorrecta ? '' : 'incorrecta'}" data-suma>
            ${sumaCorrecta ? '1' : `${sumaFila.toFixed(3)} <button type="button" class="boton-enlace" data-normalizar="${escapar(clave)}">Ajustar</button>`}
          </td>
        </tr>`;})
    .join('');

  return `
    <details class="acordeon" data-seccion="tabla" ${seccionesAbiertas.tabla ? 'open' : ''}>
      <summary>Tabla de probabilidad <span class="acordeon-extra">${clavesTabla.length} ${clavesTabla.length === 1 ? 'fila' : 'filas'}</span>${iconoFlecha}</summary>
      <div class="acordeon-contenido">
        <p class="ayuda" style="margin-bottom:12px">${textoAyuda}</p>
        <div class="tabla-contenedor">
          <table class="tabla">
            <thead>
              <tr>
                ${nodo.padres.map(nombrePadre => `<th>${escapar(nombrePadre)}</th>`).join('')}
                ${nodo.estados.map(estadoActual => `<th class="numero">P(${escapar(estadoActual)})</th>`).join('')}
                <th class="numero">Suma</th>
              </tr>
            </thead>
            <tbody>${filasTabla}</tbody>
          </table>
        </div>
        <div class="acciones-fila" style="justify-content:flex-start;flex-wrap:wrap">
          <button type="button" id="btnUniforme" class="boton boton-fantasma boton-chico">Repartir por igual</button>
          <button type="button" id="btnAleatorio" class="boton boton-fantasma boton-chico">Repartir de manera aleatoria</button>
        </div>
      </div>
    </details>`;}

export function iniciar(contenedor) {
  function refrescarResumen() {
    const { red, errores } = obtener();
    const resumen = estadoResumen(red, errores);
    const indicador = contenedor.querySelector('.estado-red');
    if (indicador) {
      indicador.className = `estado-red ${resumen.clase}`;
      indicador.textContent = resumen.texto;}
    const contenedorAviso = contenedor.querySelector('#avisoRed');
    if (contenedorAviso) contenedorAviso.innerHTML = avisoRed(red, errores);}

  function dibujar(origen) {
    if (origen === 'cpt' || origen === 'nombre' || origen === 'posicion') {
      refrescarResumen();
      return;}

    const { red, seleccionado, errores } = obtener();
    const nodoSeleccionado = red.nodos.find(otroNodo => otroNodo.id === seleccionado);
    const resumen = estadoResumen(red, errores);

    const idElementoEnfocado =
      document.activeElement && contenedor.contains(document.activeElement) ? document.activeElement.id : null;
    const desplazamientoVertical = contenedor.scrollTop;

    contenedor.innerHTML = `
      <div class="panel-encabezado">
        <div>
          <h2 class="panel-titulo">Red</h2>
          <p class="estado-red ${resumen.clase}">${resumen.texto}</p>
        </div>
      </div>
      <div class="panel-cuerpo">
        <div class="campo">
          <label class="etiqueta" for="nombreRed">Nombre de la red</label>
          <input id="nombreRed" class="entrada" value="${escapar(red.nombre || '')}" autocomplete="off">
        </div>
        <div id="avisoRed">${avisoRed(red, errores)}</div>
      </div>
      ${seccionNodos(red, seleccionado)}
      ${nodoSeleccionado ? seccionPropiedades(red, nodoSeleccionado) + seccionTabla(nodoSeleccionado) : ''}`;

    contenedor.scrollTop = desplazamientoVertical;
    if (idElementoEnfocado) document.getElementById(idElementoEnfocado)?.focus();

    conectarEventos(red, nodoSeleccionado);}

  function conectarEventos(red, nodo) {
    contenedor.querySelectorAll('details[data-seccion]').forEach(elementoDetalle => {
      elementoDetalle.addEventListener(
        'toggle',
        () => (seccionesAbiertas[elementoDetalle.dataset.seccion] = elementoDetalle.open));});

    const entradaNombreRed = contenedor.querySelector('#nombreRed');
    entradaNombreRed.oninput = () => renombrarRed(entradaNombreRed.value.trim());

    contenedor.querySelectorAll('.elemento-nodo').forEach(botonNodo => {
      botonNodo.onclick = () => actualizar({ seleccionado: botonNodo.dataset.id });});

    const botonMostrarFormulario = contenedor.querySelector('#mostrarFormulario');
    if (botonMostrarFormulario) {
      botonMostrarFormulario.onclick = () => {
        formularioVisible = true;
        seccionesAbiertas.nodos = true;
        actualizar();
        contenedor.querySelector('#nombreNodo')?.focus();};}

    const botonCancelar = contenedor.querySelector('#cancelarNodo');
    if (botonCancelar) {
      botonCancelar.onclick = () => {
        formularioVisible = false;
        actualizar();};}

    const formulario = contenedor.querySelector('#formNodo');
    if (formulario) {
      formulario.onsubmit = evento => {
        evento.preventDefault();
        const campoNombre = formulario.querySelector('#nombreNodo');
        const identificador = campoNombre.value.trim();
        const estados = separarEstados(formulario.querySelector('#estadosNodo').value);
        if (!identificador) return campoNombre.focus();
        if (red.nodos.some(otroNodo => otroNodo.id === identificador)) {
          return avisar(`Ya existe un nodo llamado «${identificador}».`, 'error');}
        if (identificador.includes(',')) return avisar('El nombre no puede contener comas.', 'error');
        if (estados.length < 2) return avisar('Un nodo necesita al menos dos estados.', 'error');
        if (new Set(estados).size !== estados.length) return avisar('Hay estados repetidos.', 'error');
        formularioVisible = false;
        if (!agregarNodo(identificador, estados)) {
          return avisar(`La red admite como máximo ${maximoNodos} nodos.`, 'error');}
        avisar(`Nodo «${identificador}» agregado.`, 'exito');};}

    if (!nodo) return;

    const entradaRenombrar = contenedor.querySelector('#renombrarNodo');
    entradaRenombrar.onchange = () => {
      const nuevoNombre = entradaRenombrar.value.trim();
      if (nuevoNombre === nodo.id) return;
      if (!nuevoNombre || nuevoNombre.includes(',')) {
        avisar('Escribe un nombre válido, sin comas.', 'error');
        entradaRenombrar.value = nodo.id;
        return;}
      if (!renombrarNodo(nodo.id, nuevoNombre)) {
        avisar(`Ya existe un nodo llamado «${nuevoNombre}».`, 'error');
        entradaRenombrar.value = nodo.id;}};

    const entradaEstados = contenedor.querySelector('#estadosEditar');
    entradaEstados.onchange = () => {
      const nuevosEstados = separarEstados(entradaEstados.value);
      if (nuevosEstados.join(',') === nodo.estados.join(',')) return;
      if (nuevosEstados.length < 2 || new Set(nuevosEstados).size !== nuevosEstados.length) {
        avisar('Se necesitan al menos dos estados distintos.', 'error');
        entradaEstados.value = nodo.estados.join(', ');
        return;}
      cambiarEstados(nodo.id, nuevosEstados);};

    contenedor.querySelectorAll('[data-padre]').forEach(casillaPadre => {
      casillaPadre.onchange = () => {
        const padresSeleccionados = [...contenedor.querySelectorAll('[data-padre]:checked')].map(
          casillaMarcada => casillaMarcada.dataset.padre);
        cambiarPadres(nodo.id, padresSeleccionados);
        const { errores } = obtener();
        const errorDeCiclo = errores.find(mensajeError => mensajeError.includes('ciclo'));
        if (errorDeCiclo) avisar(errorDeCiclo, 'error');};});

    contenedor.querySelectorAll('.entrada-prob').forEach(entradaProbabilidad => {
      const clave = entradaProbabilidad.dataset.clave;
      const posicionEstado = Number(entradaProbabilidad.dataset.indice);

      entradaProbabilidad.addEventListener('focus', () => entradaProbabilidad.select());

      entradaProbabilidad.addEventListener('input', () => {
        const valorNumerico = leerNumero(entradaProbabilidad.value);
        if (Number.isNaN(valorNumerico) || valorNumerico < 0 || valorNumerico > 1) {
          entradaProbabilidad.setAttribute('aria-invalid', 'true');
          return;}
        entradaProbabilidad.removeAttribute('aria-invalid');
        const filaActualizada = ponerProbabilidad(nodo.id, clave, posicionEstado, valorNumerico);
        if (!filaActualizada) return;

        const filaTabla = entradaProbabilidad.closest('tr');
        filaTabla.querySelectorAll('.entrada-prob').forEach(otraEntrada => {
          if (otraEntrada !== entradaProbabilidad) {
            otraEntrada.value = formatearNumero(filaActualizada[Number(otraEntrada.dataset.indice)]);}});

        const sumaFila = filaActualizada.reduce((acumulado, probabilidad) => acumulado + probabilidad, 0);
        const celdaSuma = filaTabla.querySelector('[data-suma]');
        const sumaCorrecta = Math.abs(sumaFila - 1) < 1e-6;
        celdaSuma.classList.toggle('incorrecta', !sumaCorrecta);
        if (sumaCorrecta) {
          celdaSuma.textContent = '1';
        } else {
          celdaSuma.innerHTML = `${sumaFila.toFixed(3)} <button type="button" class="boton-enlace" data-normalizar="${escapar(clave)}">Ajustar</button>`;
          celdaSuma.querySelector('[data-normalizar]').onclick = () => normalizarFilaCpt(nodo.id, clave);}});

      entradaProbabilidad.addEventListener('change', () => {
        const filaActual = obtener().red.nodos.find(nodoActual => nodoActual.id === nodo.id)?.cpt[clave];
        if (filaActual) entradaProbabilidad.value = formatearNumero(filaActual[posicionEstado]);
        entradaProbabilidad.removeAttribute('aria-invalid');});});

    contenedor.querySelectorAll('[data-normalizar]').forEach(botonNormalizar => {
      botonNormalizar.onclick = () => normalizarFilaCpt(nodo.id, botonNormalizar.dataset.normalizar);});

    contenedor.querySelector('#btnUniforme').onclick = () => distribuirUniformeTodoNodo(nodo.id);

    contenedor.querySelector('#btnAleatorio').onclick = () => distribuirAleatorioTodoNodo(nodo.id);

    contenedor.querySelector('#botonEliminar').onclick = async () => {
      const nodosHijos = red.nodos.filter(otroNodo => otroNodo.padres.includes(nodo.id)).map(otroNodo => otroNodo.id);
      const confirmado = await confirmar({
        etiqueta: 'Eliminar nodo',
        titulo: `¿Eliminar «${nodo.id}»?`,
        mensaje: nodosHijos.length
          ? `También se quitará como padre de ${nodosHijos.join(', ')} y sus tablas se reiniciarán.`
          : 'Esta acción no se puede deshacer.',
        aceptar: 'Eliminar',
        peligro: true});
      if (confirmado) eliminarNodo(nodo.id);};}

  suscribir(dibujar);
  dibujar();}

export function enfocarNuevoNodo() {
  formularioVisible = true;
  seccionesAbiertas.nodos = true;
  actualizar();
  requestAnimationFrame(() => document.querySelector('#nombreNodo')?.focus());}
