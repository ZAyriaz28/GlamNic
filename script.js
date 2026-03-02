// ===============================================================
// SISTEMA GLAM NIC: GESTIÓN EN LA NUBE CON FIREBASE
// ===============================================================

// 1. CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyAyEjZ5Dz4L0mjAY0uIe80pU8yEBkIesq8",
    authDomain: "glamnic.firebaseapp.com",
    databaseURL: "https://glamnic-default-rtdb.firebaseio.com",
    projectId: "glamnic",
    storageBucket: "glamnic.firebasestorage.app",
    messagingSenderId: "309482731559",
    appId: "1:309482731559:web:518db399a18c953cb53602",
    measurementId: "G-TE91PQSLQ0"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// --- CONSTANTES DE CONFIGURACIÓN ---
const TASA_CAMBIO_DOLAR = 36.6243; //
const ADMIN_USER = 'admin2106'; //
const ADMIN_PASS = 'admin2106'; //

let ordersData = [];
let itemCounter = 0; 

const EXCEL_HEADERS = [
    "N", "Articulo", "U/M", "CostoU$", "costo/envíoU$", "GastosTotalesU$", "Unidades", 
    "Costo/UnidadU$", "Costo/UnidadC$", "Precio/ventaC$", "Ganancia/UnidadC$", 
    "Ganancia/TotalC$", "T/C"
]; //

// --- MÓDULO DE NEGOCIO (Cálculos) ---
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
}; //

// --- SINCRONIZACIÓN CON FIREBASE ---
const initializeDataAndCounter = () => {
    // Escuchar cambios en la base de datos en tiempo real
    db.ref('orders').on('value', (snapshot) => {
        const data = snapshot.val();
        // Firebase devuelve un objeto; lo convertimos en array para las tablas
        ordersData = data ? Object.values(data) : [];
        
        // Calcular el siguiente número N basado en el valor más alto actual
        const maxN = ordersData.reduce((max, item) => Math.max(max, parseInt(item.N) || 0), 0);
        itemCounter = maxN + 1;

        // Actualizar automáticamente la vista según la página
        renderCurrentPage();
    });
};

const renderCurrentPage = () => {
    // Página principal (index.html)
    if (document.getElementById('tableContainer')) {
        renderTable(ordersData, 'tableContainer', false);
    }
    // Página administrativa (admin.html)
    if (document.getElementById('dynamicContent')) {
        renderAdminView();
    }
};

// --- ELIMINACIÓN CON AUTENTICACIÓN ---
const deleteOrder = async (n) => {
    const executeDeletion = async () => {
        const result = await Swal.fire({
            title: '¿Estás seguro de eliminar?',
            html: `Vas a eliminar el artículo N° **${n}**. Esta acción es **irreversible**.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Sí, ¡Eliminar!',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            // Eliminar directamente de Firebase
            db.ref('orders/' + n).remove().then(() => {
                Swal.fire({
                    icon: 'success',
                    title: '¡Eliminado!',
                    text: `Artículo N° ${n} eliminado de la nube.`,
                    timer: 1500,
                    showConfirmButton: false
                });
            });
        }
    };

    if (sessionStorage.getItem('isAdminLoggedIn') !== 'true') {
        const { value: formValues } = await Swal.fire({
            title: 'Autenticación de Administrador',
            html:
                '<input id="swal-input-user" class="swal2-input" placeholder="Usuario">' +
                '<input id="swal-input-pass" class="swal2-input" type="password" placeholder="Contraseña">',
            focusConfirm: false,
            preConfirm: () => [
                document.getElementById('swal-input-user').value,
                document.getElementById('swal-input-pass').value
            ]
        });

        if (formValues && formValues[0] === ADMIN_USER && formValues[1] === ADMIN_PASS) {
            sessionStorage.setItem('isAdminLoggedIn', 'true');
            executeDeletion();
        } else if (formValues) {
            Swal.fire({ icon: 'error', title: 'Acceso Denegado' });
        }
    } else {
        executeDeletion();
    }
};
window.deleteOrder = deleteOrder;

// --- RENDERIZACIÓN DE TABLA ---
const renderTable = (data, containerId, isEditable = false) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (data.length === 0) {
        container.innerHTML = '<p class="status-text text-muted text-center p-3 border rounded">No hay artículos guardados en la nube.</p>';
        return;
    }

    const headers = [
        { key: 'N', name: 'Nº' }, { key: 'Articulo', name: 'Artículo' }, { key: 'U/M', name: 'U/M' },
        { key: 'CostoU$', name: 'Costo Shein ($)' }, { key: 'costo/envíoU$', name: 'Envío ($)' }, 
        { key: 'GastosTotalesU$', name: 'Gastos Totales ($)' }, { key: 'Unidades', name: 'Unidades' }, 
        { key: 'Costo/UnidadU$', name: 'Costo Unit ($)' }, { key: 'Costo/UnidadC$', name: 'Costo Unit (C$)' }, 
        { key: 'Precio/ventaC$', name: 'Precio Venta (C$)' }, { key: 'Ganancia/UnidadC$', name: 'Ganancia Uni (C$)' }, 
        { key: 'Ganancia/TotalC$', name: 'Ganancia Total (C$)' }, { key: 'T/C', name: 'T/C' }
    ]; //
    
    let html = '<div class="table-responsive"><table class="order-table table table-striped table-hover align-middle"><thead><tr>';
    headers.forEach(h => html += `<th>${h.name}</th>`);
    if (isEditable) html += '<th>Acción</th>';
    html += '</tr></thead><tbody>';

    data.forEach(order => {
        html += '<tr>';
        headers.forEach(h => {
            let val = order[h.key];
            if (!isNaN(val) && val !== '' && h.key !== 'N' && h.key !== 'Unidades') {
                 if (h.key.includes('C$')) val = 'C$ ' + parseFloat(val).toLocaleString('es-NI', { minimumFractionDigits: 2 });
                 else if (h.key.includes('U$')) val = '$ ' + parseFloat(val).toLocaleString('es-NI', { minimumFractionDigits: 2 });
                 else if (h.key === 'T/C') val = parseFloat(val).toFixed(4);
            }
            html += `<td>${val || '—'}</td>`;
        });
        if (isEditable) html += `<td><button class="btn btn-sm btn-danger" onclick="deleteOrder(${order.N})">Eliminar</button></td>`;
        html += '</tr>';
    });

    container.innerHTML = html + '</tbody></table></div>';
}; //

// --- PÁGINA PRINCIPAL (FORMULARIO Y FEEDBACK) ---
const handleFormSubmit = (event) => {
    event.preventDefault();
    const art = document.getElementById('articulo').value.trim();
    const pTotal = parseFloat(document.getElementById('precioTotalUSD').value) || 0;
    const cEnvio = parseFloat(document.getElementById('costoEnvioUSD').value) || 0;
    const units = parseInt(document.getElementById('cantUnidades').value) || 1;
    const pVenta = parseFloat(document.getElementById('precioVentaC').value) || 0;

    const res = calcularValoresFinancieros(pTotal, cEnvio, units, pVenta);
    
    const newOrder = {
        'N': itemCounter,
        'Articulo': art,
        'U/M': 'Paquete', 
        'CostoU$': pTotal, 
        'costo/envíoU$': cEnvio, 
        'GastosTotalesU$': res.GastosTotalesU$,
        'Unidades': units,
        'Costo/UnidadU$': res.costoUnidadUSD,
        'Costo/UnidadC$': res.costoUnidadC,
        'Precio/ventaC$': pVenta,
        'Ganancia/UnidadC$': res.gananciaUnidadC,
        'Ganancia/TotalC$': res.gananciaTotalC,
        'T/C': res.tasaCambio
    }; //

    db.ref('orders/' + newOrder.N).set(newOrder).then(() => {
        document.getElementById('orderForm').reset();
        document.getElementById('feedbackGanancia').innerHTML = 'Ingresa los costos para calcular.';
        Swal.fire({ icon: 'success', title: 'Sincronizado con la Nube', timer: 1500, showConfirmButton: false });
    });
};

const updateLiveFeedback = () => {
    const pVentaC = parseFloat(document.getElementById('precioVentaC')?.value) || 0;
    const pTotalUSD = parseFloat(document.getElementById('precioTotalUSD')?.value) || 0;
    const cEnvioUSD = parseFloat(document.getElementById('costoEnvioUSD')?.value) || 0;
    const unidades = parseInt(document.getElementById('cantUnidades')?.value) || 1; 
    const feedbackDiv = document.getElementById('feedbackGanancia');

    if (feedbackDiv && (pTotalUSD > 0 || cEnvioUSD > 0 || pVentaC > 0)) {
        const res = calcularValoresFinancieros(pTotalUSD, cEnvioUSD, unidades, pVentaC);
        feedbackDiv.style.color = res.gananciaUnidadC > 0.01 ? '#10b981' : '#ef4444';
        feedbackDiv.innerHTML = `
            <span style="color:#3b82f6;">Gastos Totales (Lote): $ ${res.GastosTotalesU$.toFixed(2)}</span><br>
            Costo Unitario: C$ ${res.costoUnidadC.toLocaleString('es-NI', {minimumFractionDigits:2})}<br>
            Ganancia/Unidad: C$ ${res.gananciaUnidadC.toLocaleString('es-NI', {minimumFractionDigits:2})}
        `;
    }
}; //

// --- EXCEL ---
const handleDownloadExcel = () => {
    if (ordersData.length === 0) return Swal.fire('Error', 'No hay datos para descargar', 'error');
    
    const dataForSheet = [["Registro Glam Nic"], EXCEL_HEADERS, ...ordersData.map(o => EXCEL_HEADERS.map(key => o[key]))];
    const ws = XLSX.utils.aoa_to_sheet(dataForSheet);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pedidos_Shein");
    XLSX.writeFile(wb, `GlamNic_Nube_${new Date().toISOString().slice(0, 10)}.xlsx`);
}; //

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    initializeDataAndCounter();
    
    const form = document.getElementById('orderForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
        ['precioVentaC', 'precioTotalUSD', 'costoEnvioUSD', 'cantUnidades'].forEach(id => {
            document.getElementById(id).addEventListener('input', updateLiveFeedback);
        });
    }

    document.getElementById('downloadExcelBtn')?.addEventListener('click', handleDownloadExcel);
});

const renderAdminView = () => {
    const listTitle = document.getElementById('listTitle');
    if (listTitle) listTitle.textContent = '🔑 Administración (Datos en la Nube)';
    if (document.getElementById('downloadCard')) document.getElementById('downloadCard').style.display = 'block';
    renderTable(ordersData, 'dynamicContent', true);
}; //
