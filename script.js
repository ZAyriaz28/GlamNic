// ===============================================================
// XENON-WEB: LÓGICA DE NEGOCIO Y APLICACIÓN - CORREGIDO
// ===============================================================

const TASA_CAMBIO_DOLAR = 36.6243; 
const LS_KEY = 'sheinOrdersData';
const ADMIN_USER = 'admin2106';
const ADMIN_PASS = 'admin2106';

let itemCounter = 0; 

const EXCEL_HEADERS = [
    "N", "Articulo", "U/M", "CostoU$", "costo/envíoU$", "GastosTotalesU$", "Unidades", 
    "Costo/UnidadU$", "Costo/UnidadC$", "Precio/ventaC$", "Ganancia/UnidadC$", 
    "Ganancia/TotalC$", "T/C"
];

const DISPLAY_HEADER_NAMES = [
    "Nº", "Artículo", "U/M", "Costo Shein ($)", "Envío Paquete ($)", "Gastos Totales ($)", "Unidades", 
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
        'GastosTotalesU$': parseFloat(costoTotalLoteUSD.toFixed(2)),
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
    try {
        return json ? JSON.parse(json) : [];
    } catch (e) {
        console.error("Error cargando datos:", e);
        return [];
    }
};

let ordersData = loadOrdersFromLocalStorage();

const initializeDataAndCounter = () => {
    ordersData = loadOrdersFromLocalStorage();
    const maxN = ordersData.reduce((max, item) => Math.max(max, parseInt(item.N) || 0), 0);
    itemCounter = maxN + 1;
};

// --- FUNCIÓN DE ELIMINACIÓN ---
const deleteOrder = async (n) => {
    const executeDeletion = async () => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            html: `Vas a eliminar el artículo N° **${n}**.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, Eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            ordersData = ordersData.filter(order => parseInt(order.N) !== parseInt(n));
            saveOrdersToLocalStorage(ordersData);
            renderAdminView(); 
            initializeDataAndCounter();

            Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1500, showConfirmButton: false });
        }
    };

    if (sessionStorage.getItem('isAdminLoggedIn') !== 'true') {
        const { value: formValues } = await Swal.fire({
            title: 'Login Admin',
            html: '<input id="swal-input-user" class="swal2-input" placeholder="Usuario">' +
                 '<input id="swal-input-pass" class="swal2-input" type="password" placeholder="Contraseña">',
            preConfirm: () => [
                document.getElementById('swal-input-user').value,
                document.getElementById('swal-input-pass').value
            ]
        });

        if (formValues && formValues[0] === ADMIN_USER && formValues[1] === ADMIN_PASS) {
            sessionStorage.setItem('isAdminLoggedIn', 'true');
            executeDeletion();
        } else if (formValues) {
            Swal.fire('Error', 'Credenciales incorrectas', 'error');
        }
    } else {
        executeDeletion();
    }
};
window.deleteOrder = deleteOrder;

// --- RENDERIZACIÓN DE LA TABLA ---
const renderTable = (data, containerId, isEditable = false) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (data.length === 0) {
        container.innerHTML = '<p class="text-center p-3 border rounded">No hay datos.</p>';
        return;
    }

    const displayHeaders = [
        { key: 'N', name: 'Nº' }, { key: 'Articulo', name: 'Artículo' }, { key: 'U/M', name: 'U/M' },
        { key: 'CostoU$', name: 'Shein ($)' }, { key: 'costo/envíoU$', name: 'Envío ($)' },
        { key: 'GastosTotalesU$', name: 'Total ($)' }, { key: 'Unidades', name: 'Cant.' },
        { key: 'Costo/UnidadC$', name: 'Costo (C$)' }, { key: 'Precio/ventaC$', name: 'Venta (C$)' },
        { key: 'Ganancia/TotalC$', name: 'Ganancia (C$)' }
    ];

    let html = '<div class="table-responsive"><table class="table table-striped table-hover"><thead><tr>';
    displayHeaders.forEach(h => html += `<th>${h.name}</th>`);
    if (isEditable) html += '<th>Acción</th>';
    html += '</tr></thead><tbody>';

    data.forEach(order => {
        html += '<tr>';
        displayHeaders.forEach(h => {
            let val = order[h.key];
            if (h.key.includes('C$')) val = 'C$ ' + val.toLocaleString();
            if (h.key.includes('U$')) val = '$ ' + val.toLocaleString();
            html += `<td>${val || '—'}</td>`;
        });
        if (isEditable) html += `<td><button class="btn btn-danger btn-sm" onclick="deleteOrder(${order.N})">Borrar</button></td>`;
        html += '</tr>';
    });
    container.innerHTML = html + '</tbody></table></div>';
};

// --- LÓGICA DE INDEX ---
const initializeIndexPage = () => {
    const orderForm = document.getElementById('orderForm');
    if (!orderForm) return;

    const inputs = ['precioVentaC', 'precioTotalUSD', 'costoEnvioUSD', 'cantUnidades'].map(id => document.getElementById(id));
    const feedbackDiv = document.getElementById('feedbackGanancia');

    const updateLiveFeedback = () => {
        const [pVentaC, pTotalUSD, cEnvioUSD, unidades] = inputs.map(i => parseFloat(i.value) || 0);
        
        if (pTotalUSD > 0 || cEnvioUSD > 0) {
            const calc = calcularValoresFinancieros(pTotalUSD, cEnvioUSD, unidades || 1, pVentaC);
            // CORRECCIÓN: Una sola declaración de color
            const color = calc.gananciaUnidadC > 0.01 ? '#10b981' : '#ef4444'; 
            
            feedbackDiv.style.color = color;
            feedbackDiv.innerHTML = `
                <b>Gastos Totales:</b> $ ${calc.GastosTotalesU$.toFixed(2)}<br>
                <b>Costo Unitario:</b> C$ ${calc.costoUnidadC.toFixed(2)}<br>
                <b>Ganancia Unidad:</b> C$ ${calc.gananciaUnidadC.toFixed(2)}
            `;
        }
    };

    inputs.forEach(input => input.addEventListener('input', updateLiveFeedback));
    orderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const calc = calcularValoresFinancieros(parseFloat(inputs[1].value), parseFloat(inputs[2].value), parseInt(inputs[3].value), parseFloat(inputs[0].value));
        
        const newOrder = {
            'N': itemCounter++,
            'Articulo': document.getElementById('articulo').value,
            'U/M': 'Paquete',
            'CostoU$': parseFloat(inputs[1].value),
            'costo/envíoU$': parseFloat(inputs[2].value),
            'GastosTotalesU$': calc.GastosTotalesU$,
            'Unidades': parseInt(inputs[3].value),
            'Costo/UnidadU$': calc.costoUnidadUSD,
            'Costo/UnidadC$': calc.costoUnidadC,
            'Precio/ventaC$': parseFloat(inputs[0].value),
            'Ganancia/UnidadC$': calc.gananciaUnidadC,
            'Ganancia/TotalC$': calc.gananciaTotalC,
            'T/C': TASA_CAMBIO_DOLAR
        };

        ordersData.push(newOrder);
        saveOrdersToLocalStorage(ordersData);
        renderTable(ordersData, 'tableContainer', false);
        orderForm.reset();
        Swal.fire('Guardado', 'Artículo agregado correctamente', 'success');
    });

    renderTable(ordersData, 'tableContainer', false);
};

// --- LÓGICA DE ADMIN ---
const renderAdminView = () => {
    const dynamicContent = document.getElementById('dynamicContent');
    if (dynamicContent) renderTable(ordersData, 'dynamicContent', true);
};

const initializeAdminPage = () => {
    if (document.getElementById('dynamicContent')) {
        const btn = document.getElementById('downloadExcelBtn');
        if (btn) btn.addEventListener('click', handleDownloadExcel);
        renderAdminView();
    }
};

const handleDownloadExcel = () => {
    if (ordersData.length === 0) return alert('No hay datos.');
    const ws = XLSX.utils.json_to_sheet(ordersData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pedidos");
    XLSX.writeFile(wb, `Pedidos_SHEIN_${new Date().toISOString().slice(0,10)}.xlsx`);
};

// --- INICIO ---
document.addEventListener('DOMContentLoaded', () => {
    initializeDataAndCounter();
    initializeIndexPage();
    initializeAdminPage();
});

// Ocultar pantalla de carga al finalizar (con retraso de 2 segundos para que no sea tan rápido)
window.addEventListener('load', () => {
    const loader = document.getElementById('loader-wrapper');
    if (loader) {
        setTimeout(() => {
            loader.style.opacity = '0';
            loader.style.visibility = 'hidden';
        }, 10000); // 2000 milisegundos = 2 segundos
    }
});
