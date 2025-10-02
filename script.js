// ===============================================================
// XENON-WEB: LÓGICA DE NEGOCIO Y APLICACIÓN
// Esta estructura simula la separación de archivos calculator.js y app.js
// ===============================================================

// ---------------------------------------------------------------
// I. MÓDULO DE NEGOCIO (Simula calculator.js)
// ---------------------------------------------------------------

// --- VARIABLES DE CONFIGURACIÓN Y CONSTANTES ---
const TASA_CAMBIO_DOLAR = 36.6243; 
let itemCounter = 0; 

// Definición de las cabeceras (para consistencia de lectura/escritura)
const EXCEL_HEADERS = [
    "N", "Articulo", "U/M", "CostoU$", "costo/envíoU$", "Unidades", 
    "Costo/UnidadU$", "Costo/UnidadC$", "Precio/ventaC$", "Ganancia/UnidadC$", 
    "Ganancia/TotalC$", "T/C"
];

const DISPLAY_HEADER_NAMES = [
    "Nº", "Artículo", "U/M", "Costo Shein ($)", "Envío Paquete ($)", "Unidades", 
    "Costo Unitario ($)", "Costo Unitario (C$)", "Precio Venta (C$)", "Ganancia Unidad (C$)", 
    "Ganancia Total (C$)", "T/C"
];


// --- FUNCIÓN DE CÁLCULO CORE ---
const calcularValoresFinancieros = (precioTotalUSD, costoEnvioUSD, cantUnidades, precioVentaC) => {
    const costoTotalLoteUSD = precioTotalUSD + costoEnvioUSD;
    const costoUnidadUSD = cantUnidades > 0 ? costoTotalLoteUSD / cantUnidades : 0;
    const costoUnidadC = costoUnidadUSD * TASA_CAMBIO_DOLAR;
    const gananciaUnidadC = precioVentaC - costoUnidadC;
    const gananciaTotalC = gananciaUnidadC * cantUnidades;

    return {
        costoUnidadUSD: parseFloat(costoUnidadUSD.toFixed(4)), 
        costoUnidadC: parseFloat(costoUnidadC.toFixed(2)),   
        gananciaUnidadC: parseFloat(gananciaUnidadC.toFixed(2)),
        gananciaTotalC: parseFloat(gananciaTotalC.toFixed(2)),
        tasaCambio: TASA_CAMBIO_DOLAR
    };
};


// ---------------------------------------------------------------
// II. MÓDULO DE APLICACIÓN (Simula app.js)
// ---------------------------------------------------------------

// Elementos del DOM
const orderForm = document.getElementById('orderForm');
const excelFileInput = document.getElementById('excelFile');
const fileStatusText = document.getElementById('fileStatus');
const tableContainer = document.getElementById('tableContainer');
const downloadExcelBtn = document.getElementById('downloadExcelBtn');

// Estructura de datos global
let ordersData = [];


// --- MANEJO DE EXCEL (LECTURA y REVALIDACIÓN) ---
const handleFileLoad = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    fileStatusText.textContent = `Cargando "${file.name}"...`;
    
    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]]; 
            
            const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            let loadedOrders = [];

            if (rawData.length > 2) { 
                const headers = rawData[1].map(h => h ? h.toString().trim().replace(/[\s\W]+/g, '') : '');
                
                // 1. Mapeo inicial de datos sin procesar
                loadedOrders = rawData.slice(2)
                    .filter(row => row.length > 0 && row.some(cell => cell))
                    .map(row => {
                        const order = {};
                        headers.forEach((key, index) => {
                            let cleanedKey = key.replace(/N\s*▫/, 'N').replace(/Ganacia/, 'Ganancia');
                            order[cleanedKey] = row[index] || ''; 
                        });
                        return order;
                    });
                
                // 2. CRÍTICO: RECALCULAMOS y REVALIDAMOS CADA FILA CARGADA
                ordersData = loadedOrders.map(order => {
                    const costoU = parseFloat(order['CostoU$']) || 0;
                    const envioU = parseFloat(order['costo/envíoU$']) || 0;
                    const unidades = parseInt(order['Unidades']) || 1;
                    const precioVentaC = parseFloat(order['Precio/ventaC$']) || 0;

                    // Si no tiene datos de costo, es probable que sea una fila vacía o corrupta
                    if (costoU === 0 && envioU === 0 && precioVentaC === 0) {
                        return null; 
                    }

                    const calculated = calcularValoresFinancieros(costoU, envioU, unidades, precioVentaC);

                    // Devolvemos el objeto completo con los cálculos actualizados
                    return {
                        ...order, 
                        'Costo/UnidadU$': calculated.costoUnidadUSD,
                        'Costo/UnidadC$': calculated.costoUnidadC,
                        'Ganancia/UnidadC$': calculated.gananciaUnidadC,
                        'Ganancia/TotalC$': calculated.gananciaTotalC,
                        'T/C': calculated.tasaCambio 
                    };
                }).filter(order => order !== null); 

                
                // Inicialización del contador para el próximo pedido
                const maxN = ordersData.reduce((max, item) => Math.max(max, parseInt(item.N) || 0), 0);
                itemCounter = maxN + 1;

                fileStatusText.textContent = `✅ Archivo "${file.name}" cargado. ${ordersData.length} artículos encontrados. Próximo Nº: ${itemCounter}`;
                renderTable(ordersData);
                downloadExcelBtn.style.display = 'block';

            } else {
                ordersData = []; 
                itemCounter = 1; 
                fileStatusText.textContent = `⚠️ Archivo cargado. No hay artículos. Próximo Nº: ${itemCounter}`;
                renderTable(ordersData);
            }

        } catch (error) {
            console.error("Error al procesar el archivo Excel:", error);
            fileStatusText.textContent = `❌ Error al leer el archivo. Asegúrate de que las cabeceras estén en la segunda fila.`;
        }
    };

    reader.readAsArrayBuffer(file);
};

excelFileInput.addEventListener('change', handleFileLoad);

// --- MANEJO DEL FORMULARIO (ESCRITURA Y ACTUALIZACIÓN EN VIVO) ---
const handleFormSubmit = (event) => {
    event.preventDefault();

    const articulo = document.getElementById('articulo').value.trim();
    const precioTotalUSD = parseFloat(document.getElementById('precioTotalUSD').value) || 0;
    const costoEnvioUSD = parseFloat(document.getElementById('costoEnvioUSD').value) || 0;
    const cantUnidades = parseInt(document.getElementById('cantUnidades').value) || 0;
    const precioVentaC = parseFloat(document.getElementById('precioVentaC').value) || 0;
    
    if (cantUnidades <= 0) {
        alert("La cantidad de unidades debe ser mayor a cero.");
        return;
    }

    const calculated = calcularValoresFinancieros(precioTotalUSD, costoEnvioUSD, cantUnidades, precioVentaC);
    
    // Crear nuevo objeto de pedido
    const newOrder = {
        'N': itemCounter,
        'Articulo': articulo,
        'U/M': 'Paquete', 
        'CostoU$': precioTotalUSD, 
        'costo/envíoU$': costoEnvioUSD, 
        'Unidades': cantUnidades,
        'Costo/UnidadU$': calculated.costoUnidadUSD,
        'Costo/UnidadC$': calculated.costoUnidadC,
        'Precio/ventaC$': precioVentaC,
        'Ganancia/UnidadC$': calculated.gananciaUnidadC,
        'Ganancia/TotalC$': calculated.gananciaTotalC,
        'T/C': calculated.tasaCambio
    };

    ordersData.push(newOrder); 
    itemCounter++;

    renderTable(ordersData);
    
    downloadExcelBtn.style.display = 'block';

    orderForm.reset();
    document.getElementById('feedbackGanancia').innerHTML = 'Ingresa los costos y el precio de venta para ver el cálculo en vivo.';
    document.getElementById('feedbackGanancia').style.color = '#333333';
    alert(`Lote de ${cantUnidades} unidades de "${articulo}" guardado exitosamente. Ahora puedes descargar el Excel o agregar otro artículo.`);
};

orderForm.addEventListener('submit', handleFormSubmit);

// --- RENDERIZACIÓN DE LA TABLA (Sin cambios) ---
const renderTable = (data) => {
    if (data.length === 0) {
        tableContainer.innerHTML = '<p class="status-text">No hay artículos cargados o guardados.</p>';
        return;
    }

    const displayHeaders = [
        { key: 'N', name: 'Nº' }, { key: 'Articulo', name: 'Artículo' }, { key: 'U/M', name: 'U/M' },
        { key: 'CostoU$', name: 'Costo Shein ($)' }, { key: 'costo/envíoU$', name: 'Envío Paquete ($)' }, 
        { key: 'Unidades', name: 'Unidades' }, { key: 'Costo/UnidadU$', name: 'Costo Unitario ($)' },
        { key: 'Costo/UnidadC$', name: 'Costo Unitario (C$)' }, { key: 'Precio/ventaC$', name: 'Precio Venta (C$)' },
        { key: 'Ganancia/UnidadC$', name: 'Ganancia Unidad (C$)' }, { key: 'Ganancia/TotalC$', name: 'Ganancia Total (C$)' },
        { key: 'T/C', name: 'T/C' },
    ];
    
    const headers = displayHeaders.filter(h => data[0].hasOwnProperty(h.key));
    
    let html = '<table class="order-table"><thead><tr>';
    headers.forEach(header => { html += `<th>${header.name}</th>`; });
    html += '</tr></thead><tbody>';

    data.forEach(order => {
        html += '<tr>';
        headers.forEach(header => {
            let value = order[header.key];
            
            if (!isNaN(value) && value !== '') {
                 const num = parseFloat(value);
                 let formatted = num.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

                 if (header.key.includes('C$')) { formatted = 'C$ ' + formatted; } 
                 else if (header.key.includes('U$') || header.key === 'CostoU$' || header.key === 'costo/envíoU$') { formatted = '$ ' + formatted; } 
                 else if (header.key === 'T/C') { formatted = parseFloat(value).toFixed(4); }
                 value = formatted;
            }
            html += `<td>${value || '—'}</td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table>';
    tableContainer.innerHTML = html;
};

// --- MANEJO DE EXCEL (ESCRITURA Y DESCARGA - Formato Final) ---
downloadExcelBtn.addEventListener('click', () => {
    if (ordersData.length === 0) {
        alert('No hay datos para descargar.');
        return;
    }

    const excelHeaders = EXCEL_HEADERS;

    // 1. Preprocesar los datos para limpiar y formatear números antes de escribir en el Excel
    const dataForExport = ordersData.map(order => {
        const newOrder = { ...order };
        EXCEL_HEADERS.forEach(key => {
            const num = parseFloat(newOrder[key]);
            if (!isNaN(num)) {
                newOrder[key] = key === 'Costo/UnidadU$' ? num.toFixed(4) : num.toFixed(2);
            }
        });
        return newOrder;
    });

    // 2. Mapeamos de forma segura los objetos a arrays de valores.
    const dataRows = dataForExport.map(item => excelHeaders.map(key => {
        return item[key] !== undefined && item[key] !== null ? item[key] : '';
    }));
    
    // 3. Construimos el array completo: Título + Cabeceras (legibles) + Datos
    const dataForSheet = [
        ["Registro de Artículos SHEIN - Love Orders"], 
        DISPLAY_HEADER_NAMES, 
        ...dataRows 
    ];

    // 4. Convertir el array de arrays a hoja de trabajo y generar el archivo
    const ws = XLSX.utils.aoa_to_sheet(dataForSheet);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pedidos_Shein");

    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Pedidos_Shein_Actualizado_Unitario_${today}.xlsx`);
});


// --- MEJORA UX: CÁLCULO EN VIVO (Sin cambios) ---
const inputPrecioVenta = document.getElementById('precioVentaC');
const inputPrecioUSD = document.getElementById('precioTotalUSD');
const inputEnvioUSD = document.getElementById('costoEnvioUSD');
const inputUnidades = document.getElementById('cantUnidades');

const feedbackDiv = document.createElement('div');
feedbackDiv.id = 'feedbackGanancia';
feedbackDiv.style.marginTop = '5px';
feedbackDiv.style.fontSize = '0.85rem';
feedbackDiv.style.fontWeight = '600';
feedbackDiv.style.transition = 'color 0.3s ease';

if (inputPrecioVenta && inputPrecioVenta.parentNode) {
    inputPrecioVenta.parentNode.appendChild(feedbackDiv); 
}

const updateLiveFeedback = () => {
    const pVentaC = parseFloat(inputPrecioVenta.value) || 0;
    const pTotalUSD = parseFloat(inputPrecioUSD.value) || 0;
    const cEnvioUSD = parseFloat(inputEnvioUSD.value) || 0;
    const unidades = parseInt(inputUnidades.value) || 1; 

    if (pTotalUSD > 0 || cEnvioUSD > 0 || pVentaC > 0) {
        const calculated = calcularValoresFinancieros(pTotalUSD, cEnvioUSD, unidades, pVentaC);
        
        const costoUnitarioC = calculated.costoUnidadC.toLocaleString('es-NI', { minimumFractionDigits: 2 });
        const gananciaUnidadC = calculated.gananciaUnidadC.toLocaleString('es-NI', { minimumFractionDigits: 2 });
        const gananciaTotalC = calculated.gananciaTotalC.toLocaleString('es-NI', { minimumFractionDigits: 2 });

        let color = calculated.gananciaUnidadC >= 0.01 ? '#10b981' : '#ef4444'; 

        feedbackDiv.style.color = color;
        feedbackDiv.innerHTML = `
            Costo Unitario: **C$ ${costoUnitarioC}** <br>
            Ganancia/Unidad: **C$ ${gananciaUnidadC}** | Ganancia/Total: **C$ ${gananciaTotalC}**
        `;

    } else {
        feedbackDiv.textContent = 'Ingresa los costos y el precio de venta para ver el cálculo en vivo.';
        feedbackDiv.style.color = '#333333'; 
    }
};

inputPrecioVenta.addEventListener('input', updateLiveFeedback);
inputPrecioUSD.addEventListener('input', updateLiveFeedback);
inputEnvioUSD.addEventListener('input', updateLiveFeedback);
inputUnidades.addEventListener('input', updateLiveFeedback);


// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    fileStatusText.textContent = `Tasa de Cambio (T/C) definida en ${TASA_CAMBIO_DOLAR} C$.`;
    renderTable(ordersData); 
    updateLiveFeedback();
});