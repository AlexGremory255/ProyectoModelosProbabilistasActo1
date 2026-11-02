export function enumerar(red, consulta, evidencia = {}) {
  const listaNodos = red.nodos;
  const asignacionActual = {};
  const sumasPorClave = {};
  let probabilidadEvidencia = 0;

  function calcularProbabilidadConjunta() {
    let productoConjunto = 1;
    for (const nodo of listaNodos) {
      const clavePadres = (nodo.padres ?? []).map(nombrePadre => asignacionActual[nombrePadre]).join(',');
      const posicionEstado = nodo.estados.indexOf(asignacionActual[nodo.id]);
      productoConjunto *= nodo.cpt[clavePadres][posicionEstado];}
    return productoConjunto;}

  function recorrerNodos(posicionNodo) {
    if (posicionNodo === listaNodos.length) {
      const probabilidad = calcularProbabilidadConjunta();
      const claveConsulta = consulta.map(variableConsulta => asignacionActual[variableConsulta]).join(',');
      probabilidadEvidencia += probabilidad;
      sumasPorClave[claveConsulta] = (sumasPorClave[claveConsulta] ?? 0) + probabilidad;
      return;}

    const nodoActual = listaNodos[posicionNodo];
    const estadosPosibles = nodoActual.id in evidencia ? [evidencia[nodoActual.id]] : nodoActual.estados;

    for (const estadoActual of estadosPosibles) {
      asignacionActual[nodoActual.id] = estadoActual;
      recorrerNodos(posicionNodo + 1);}}

  recorrerNodos(0);

  let combinacionesConsulta = [[]];
  for (const variableConsulta of consulta) {
    const estadosVariable = listaNodos.find(nodo => nodo.id === variableConsulta).estados;
    combinacionesConsulta = combinacionesConsulta.flatMap(combinacionParcial =>
      estadosVariable.map(estadoActual => [...combinacionParcial, estadoActual]));}

  const distribucion = combinacionesConsulta.map(combinacionEstados => ({
    asignacion: Object.fromEntries(
      consulta.map((variableConsulta, posicionVariable) => [variableConsulta, combinacionEstados[posicionVariable]])),
    probabilidad: (sumasPorClave[combinacionEstados.join(',')] ?? 0) / probabilidadEvidencia}));

  return { probabilidadEvidencia, distribucion };}
