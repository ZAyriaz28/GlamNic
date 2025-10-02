// ===============================================================
// XENON-WEB: LÓGICA DE NEGOCIO Y APLICACIÓN
// MODIFICADO: Autenticación solo al ELIMINAR producto en admin.html
// ===============================================================

// ---------------------------------------------------------------
// I. MÓDULO DE NEGOCIO (Cálculo y Persistencia)
// ---------------------------------------------------------------

// --- VARIABLES DE CONFIGURACIÓN Y CONSTANTES ---
const TASA_CAMBIO_DOLAR = 36.6243; 
const LS_KEY = 'sheinOrdersData';
const ADMIN_USER = 'admin2106';
const ADMIN_PASS = 'admin2106';

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

// --- PERSISTENCIA LOCAL STORAGE ---
const saveOrdersToLocalStorage = (data) => {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
};

const loadOrdersFromLocalStorage = () => {
    const json = localStorage.getItem(LS_KEY);
    // Aseguramos que el Local Storage se cargue como un array.
    try {
        return json ? JSON.parse(json) : [];
    } catch (e) {
        console.error("Error cargando datos de Local Storage:", e);
        return [];
    }
};

let ordersData = loadOrdersFromLocalStorage();

// --- FUNCIÓN DE INICIALIZACIÓN DE DATOS Y CONTADOR ---
const initializeDataAndCounter = () => {
    ordersData = loadOrdersFromLocalStorage();
    // Aseguramos que N sea un número para el cálculo
    const maxN = ordersData.reduce((max, item) => Math.max(max, parseInt(item.N) || 0), 0);
    itemCounter = maxN + 1;
};


// --- FUNCIÓN DE ELIMINACIÓN (GLOBAL) CON AUTENTICACIÓN ON-DEMAND ---
const deleteOrder = (n) => {
    
    const executeDeletion = () => {
        if (confirm(`¿Estás seguro de que quieres eliminar el artículo Nº ${n}? Esta acción es irreversible.`)) {
            // Aseguramos que N sea numérico para la comparación
            ordersData = ordersData.filter(order => parseInt(order.N) !== parseInt(n));
            saveOrdersToLocalStorage(ordersData);
            
            // Re-renderizar la vista de admin sin modo editable
            renderAdminView(); 
            initializeDataAndCounter(); // Reajustar el contador
            alert(`Artículo Nº ${n} eliminado exitosamente.`);
        }
    };

    // Si no está logueado, pedir credenciales
    if (sessionStorage.getItem('isAdminLoggedIn') !== 'true') {
        // Usamos prompt para el usuario/contraseña de forma simple
        const username = prompt("Introduce el Usuario de Administración:");
        // Si el usuario cancela el primer prompt, cancelamos.
        if (username === null) return;
        
        const password = prompt("Introduce la Contraseña:");
        // Si el usuario cancela el segundo prompt, cancelamos.
        if (password === null) return;

        if (username === ADMIN_USER && password === ADMIN_PASS) {
            sessionStorage.setItem('isAdminLoggedIn', 'true');
            alert("Inicio de sesión exitoso. Procediendo a eliminar.");
            executeDeletion(); 
        } else {
            alert("Usuario o contraseña incorrectos. No se puede eliminar.");
            return;
        }
    } else {
        // Si ya está logueado, proceder directamente
        executeDeletion();
    }
};
window.deleteOrder = deleteOrder; // Hacemos la función global


// --- RENDERIZACIÓN DE LA TABLA (COMPARTIDA) ---
const renderTable = (data, containerId, isEditable = false) => {
    const container = document.getElementById(containerId);
    if (!container) return; // Salir si el contenedor no existe (estamos en otra página)
    
    if (data.length === 0) {
        container.innerHTML = '<p class="status-text">No hay artículos cargados o guardados.</p>';
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
    
    let html = '<div class="table-container"><table class="order-table"><thead><tr>';
    headers.forEach(header => { html += `<th>${header.name}</th>`; });
    
    if (isEditable) {
        html += '<th>Eliminar</th>';
    }
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
        
        if (isEditable) {
            // Se llama a la función global deleteOrder
            html += `<td><button class="btn-delete" onclick="deleteOrder(${order.N})">❌</button></td>`;
        }
        html += '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
};


// ---------------------------------------------------------------
// II. LÓGICA DE index.html (Página Principal)
// ---------------------------------------------------------------
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
    
    saveOrdersToLocalStorage(ordersData); // PERSISTENCIA: Guardar en Local Storage

    renderTable(ordersData, 'tableContainer', false); // Renderiza la lista pública
    
    document.getElementById('orderForm').reset();
    document.getElementById('feedbackGanancia').innerHTML = 'Ingresa los costos y el precio de venta para ver el cálculo en vivo.';
    document.getElementById('feedbackGanancia').style.color = '#333333';
    alert(`Lote de ${cantUnidades} unidades de "${articulo}" guardado exitosamente.`);
};


const initializeIndexPage = () => {
    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
        // Lógica de index.html (Página principal)
        const inputPrecioVenta = document.getElementById('precioVentaC');
        const inputPrecioUSD = document.getElementById('precioTotalUSD');
        const inputEnvioUSD = document.getElementById('costoEnvioUSD');
        const inputUnidades = document.getElementById('cantUnidades');
        const feedbackDiv = document.getElementById('feedbackGanancia');

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

        // Asignación de eventos
        inputPrecioVenta.addEventListener('input', updateLiveFeedback);
        inputPrecioUSD.addEventListener('input', updateLiveFeedback);
        inputEnvioUSD.addEventListener('input', updateLiveFeedback);
        inputUnidades.addEventListener('input', updateLiveFeedback);

        orderForm.addEventListener('submit', handleFormSubmit);

        // Renderizar la tabla pública
        renderTable(ordersData, 'tableContainer', false);
        updateLiveFeedback();
    }
};

// ---------------------------------------------------------------
// III. LÓGICA DE admin.html (Página de Administración)
// ---------------------------------------------------------------

const renderAdminView = () => {
    const listTitle = document.getElementById('listTitle');
    const downloadCard = document.getElementById('downloadCard');
    
    // El título ahora es estático
    listTitle.textContent = '🔑 Lista Completa de Artículos (Administración)';
    
    if (downloadCard) downloadCard.style.display = 'block';

    // RENDERIZAR TABLA CON BOTONES DE ELIMINAR (isEditable = true)
    renderTable(ordersData, 'dynamicContent', true);
};

const initializeAdminPage = () => {
    const dynamicContent = document.getElementById('dynamicContent');
    if (dynamicContent) {
        // Lógica de admin.html: Muestra la lista completa inmediatamente
        const downloadExcelBtn = document.getElementById('downloadExcelBtn');
        if(downloadExcelBtn) {
            downloadExcelBtn.addEventListener('click', handleDownloadExcel);
        }

        // Muestra la vista de administración por defecto (Sin login inicial)
        renderAdminView();
    }
};


// --- MANEJO DE EXCEL (ESCRITURA Y DESCARGA - Compartida) ---
const handleDownloadExcel = () => {
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
        EXCEL_HEADERS, 
        ...dataRows 
    ];

    // 4. Convertir el array de arrays a hoja de trabajo y generar el archivo
    const ws = XLSX.utils.aoa_to_sheet(dataForSheet);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pedidos_Shein");

    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Pedidos_Shein_Actualizado_Unitario_${today}.xlsx`);
};


// --- INICIALIZACIÓN GENERAL ---
document.addEventListener('DOMContentLoaded', () => {
    initializeDataAndCounter(); // Cargar datos y ajustar contador global
    
    initializeIndexPage(); // Intenta inicializar la página principal (index.html)
    initializeAdminPage(); // Intenta inicializar la página de administración (admin.html)
});