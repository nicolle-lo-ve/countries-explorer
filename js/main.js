/**
 * main.js — Lógica de la interfaz
 * ---------------------------------------------------------------
 * 1. Rellena el selector de regiones (valores estáticos).
 * 2. Al cambiar la región, obtiene los países de esa región desde
 *    https://restcountries.com/v3.1/region/{region}
 *    usando el parámetro ?fields= para limitar la respuesta.
 * 3. Al cambiar el país, muestra una tabla con los idiomas y el
 *    nombre nativo del país en cada idioma.
 * ---------------------------------------------------------------
 */

'use strict';

/* ============================================================
   Referencias al DOM
   ============================================================ */
const els = {
  regionSelect: document.getElementById('regionSelect'),
  countrySelect: document.getElementById('countrySelect'),
  status: document.getElementById('status'),
  statusText: document.getElementById('statusText'),
  spinner: document.getElementById('spinner'),
  tableWrapper: document.getElementById('tableWrapper'),
  tableTitle: document.getElementById('tableTitle'),
  resultBody: document.getElementById('resultBody'),
};

/* ============================================================
   Regiones disponibles (valores que acepta la API)
   ============================================================ */
const REGIONS = [
  { value: 'africa', label: 'África' },
  { value: 'americas', label: 'América' },
  { value: 'asia', label: 'Asia' },
  { value: 'europe', label: 'Europa' },
  { value: 'oceania', label: 'Oceanía' },
  { value: 'antarctic', label: 'Antártida' },
];

const API_BASE = 'https://restcountries.com/v3.1';
// Campos que necesitamos: nombre (incluye nativeName) y languages
const FIELDS = 'name,languages';

/* ============================================================
   Estado interno
   ============================================================ */
let countriesCache = []; // países de la región actual

/* ============================================================
   Utilidades de UI
   ============================================================ */
function showLoading(message = 'Cargando…') {
  els.status.hidden = false;
  els.status.classList.remove('error');
  els.spinner.hidden = false;
  els.statusText.textContent = message;
}

function hideLoading() {
  els.status.hidden = true;
}

function showError(message) {
  els.status.hidden = false;
  els.status.classList.add('error');
  els.spinner.hidden = true;
  els.statusText.textContent = `❌ ${message}`;
}

function clearTable() {
  els.tableWrapper.hidden = true;
  els.resultBody.replaceChildren();
  els.tableTitle.textContent = '';
}

/* ============================================================
   Inicialización
   ============================================================ */
function populateRegions() {
  els.regionSelect.replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Selecciona una región';
  els.regionSelect.appendChild(placeholder);

  REGIONS.forEach(({ value, label }) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    els.regionSelect.appendChild(option);
  });

  els.regionSelect.disabled = false;
}

/* ============================================================
   Carga de países por región
   ============================================================ */
async function loadCountriesByRegion(region) {
  // Resetear selector de países
  els.countrySelect.replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Cargando países…';
  els.countrySelect.appendChild(placeholder);
  els.countrySelect.disabled = true;

  clearTable();
  showLoading('Obteniendo países de la región…');

  try {
    const url = `${API_BASE}/region/${region}?fields=${FIELDS}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // La API puede devolver un objeto de error si no hay resultados
    if (!Array.isArray(data)) {
      throw new Error('La respuesta de la API no es válida.');
    }

    // Ordenar alfabéticamente por nombre común
    countriesCache = data
      .filter((country) => country.name && country.name.common)
      .sort((a, b) => a.name.common.localeCompare(b.name.common, 'es'));

    if (countriesCache.length === 0) {
      throw new Error('No se encontraron países para esta región.');
    }

    // Rellenar selector de países
    els.countrySelect.replaceChildren();
    const countryPlaceholder = document.createElement('option');
    countryPlaceholder.value = '';
    countryPlaceholder.textContent = 'Selecciona un país';
    els.countrySelect.appendChild(countryPlaceholder);

    countriesCache.forEach((country, index) => {
      const option = document.createElement('option');
      option.value = String(index); // usamos el índice como referencia
      option.textContent = country.name.common;
      els.countrySelect.appendChild(option);
    });

    els.countrySelect.disabled = false;
    hideLoading();
  } catch (error) {
    console.error(error);
    showError(error.message || 'No se pudieron cargar los países.');
    els.countrySelect.disabled = true;
  }
}

/* ============================================================
   Render de la tabla de idiomas y nombres nativos
   ============================================================ */
function renderLanguagesTable(country) {
  const { name, languages } = country;

  // Título de la tabla
  els.tableTitle.textContent = `Idiomas de ${name.common}`;

  // Construir filas
  const fragment = document.createDocumentFragment();

  const languageEntries = languages ? Object.entries(languages) : [];

  if (languageEntries.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 2;
    td.textContent = 'No hay información de idiomas disponible.';
    td.style.textAlign = 'center';
    td.style.color = '#64748b';
    tr.appendChild(td);
    fragment.appendChild(tr);
  } else {
    languageEntries.forEach(([code, languageName]) => {
      const tr = document.createElement('tr');

      // Columna: nombre del idioma
      const tdLanguage = document.createElement('td');
      tdLanguage.textContent = languageName;

      // Columna: nombre nativo (buscamos en name.nativeName por código de idioma)
      const tdNative = document.createElement('td');
      const nativeName = name.nativeName?.[code]?.common;
      tdNative.textContent = nativeName || '—';

      tr.append(tdLanguage, tdNative);
      fragment.appendChild(tr);
    });
  }

  els.resultBody.replaceChildren(fragment);
  els.tableWrapper.hidden = false;
}

/* ============================================================
   Eventos
   ============================================================ */
els.regionSelect.addEventListener('change', (event) => {
  const region = event.target.value;
  if (!region) {
    // Si se deselecciona la región, limpiamos todo
    els.countrySelect.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Primero selecciona una región';
    els.countrySelect.appendChild(placeholder);
    els.countrySelect.disabled = true;
    clearTable();
    return;
  }
  loadCountriesByRegion(region);
});

els.countrySelect.addEventListener('change', (event) => {
  const index = event.target.value;
  if (index === '') {
    clearTable();
    return;
  }

  const country = countriesCache[Number(index)];
  if (country) {
    renderLanguagesTable(country);
  }
});

/* ============================================================
   Arranque
   ============================================================ */
populateRegions();
