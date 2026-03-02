// ===============================================================
// GLAM NIC: LÓGICA CON FIREBASE REALTIME DATABASE
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

// --- VARIABLES DE CONFIGURACIÓN ---
const TASA_CAMBIO_DOLAR = 36.6243; 
const ADMIN_USER = 'admin2106';
const ADMIN_PASS = 'admin2106';

let ordersData = [];
let itemCounter = 0; 

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

// --- SINCRONIZACIÓN CON FIREBASE ---
const initializeDataAndCounter = () => {
    // Escuchar cambios en la base de datos en tiempo real
    db.ref('orders').on('value', (snapshot) => {
        const data = snapshot.val();
        // Convertir objeto de Firebase a Array
        ordersData = data ? Object.values(data) : [];
        
        // Calcular el siguiente número N
        const maxN = ordersData.reduce((max, item) => Math.max(max, parseInt(item.N) || 0), 0);
        itemCounter = maxN + 1;

        // Renderizar automáticamente en la página actual
        renderCurrentPage();
    });
};

const renderCurrentPage = () => {
    // Renderiza la tabla en index.html si existe el contenedor
    if (document.getElementById('tableContainer')) {
        renderTable(ordersData, 'tableContainer', false);
    }
    // Renderiza la tabla en admin.html si existe el contenedor
    if (document.getElementById('dynamicContent')) {
        renderAdminView();
    }
};

// --- FUNCIÓN DE ELIMINACIÓN EN FIREBASE ---
const deleteOrder = async (n) => {
    const executeDeletion = async () => {
        const result = await Swal.fire({
            title: '¿Estás seguro de eliminar?',
            html: `Vas a eliminar el artículo N° **${n}**.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Sí, ¡Eliminar!'
        });

        if (result.isConfirmed) {
            // Eliminar directamente de Firebase usando la referencia N
            db.ref('orders/' + n).remove()
                .then(() => {
                    Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1500, showConfirmButton: false });
                });
        }
    };

    if (sessionStorage.getItem('isAdminLoggedIn') !== 'true') {
        const { value: formValues } = await Swal.fire({
            title: 'Autenticación',
            html: '<input id="swal-input-user" class="swal2-input" placeholder="Usuario"><input id="swal-input-pass" class="swal2-input" type="password" placeholder="Contraseña">',
            preConfirm: () => [document.getElementById('swal-input-user').value, document.getElementById('swal-input-pass').value]
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
        { key: 'CostoU$', name: 'Costo Shein ($)' }, { key: 'costo/envíoU$', name: 'Envío Paquete ($)' }, 
        { key: 'GastosTotalesU$', name: 'Gastos Totales ($)' }, { key: 'Unidades', name: 'Unidades' }, 
        { key: 'Costo/UnidadU$', name: 'Costo Unitario ($)' }, { key: 'Costo/UnidadC$', name: 'Costo Unitario (C$)' }, 
        { key: 'Precio/ventaC$', name: 'Precio Venta (C$)' }, { key: 'Ganancia/UnidadC$', name: 'Ganancia Unidad (C$)' }, 
        { key: 'Ganancia/TotalC$', name: 'Ganancia Total (C$)' }, { key: 'T/C', name: 'T/C' }
    ];
    
    let html = '<div class="table-responsive"><table class="order-table table table-striped table-hover align-middle"><thead><tr>';
    headers.forEach(h => html += `<th>${h.name}</th>`);
    if (isEditable) html += '<th>Eliminar</th>';
    html += '</tr></thead><tbody>';

    data.forEach(order => {
        html += '<tr>';
        headers.forEach(h => {
            let val = order[h.key];
            if (!isNaN(val) && val !== '') {
                 if (h.key.includes('C$')) val = 'C$ ' + parseFloat(val).toLocaleString('es-NI', { minimumFractionDigits: 2 });
                 else if (h.key.includes('U$')) val = '$ ' + parseFloat(val).toLocaleString('es-NI', { minimumFractionDigits: 2 });
            }
            html += `<td>${val || '—'}</td>`;
        });
        if (isEditable) html += `<td><button class="btn btn-sm btn-danger" onclick="deleteOrder(${order.N})">Eliminar</button></td>`;
        html += '</tr>';
    });
    container.innerHTML = html + '</tbody></table></div>';
};

// --- GUARDAR EN FIREBASE ---
const handleFormSubmit = (event) => {
    event.preventDefault();
    const articulo = document.getElementById('articulo').value.trim();
    const precioTotalUSD = parseFloat(document.getElementById('precioTotalUSD').value) || 0;
    const costoEnvioUSD = parseFloat(document.getElementById('costoEnvioUSD').value) || 0;
    const cantUnidades = parseInt(document.getElementById('cantUnidades').value) || 1;
    const precioVentaC = parseFloat(document.getElementById('precioVentaC').value) || 0;

    const calculated = calcularValoresFinancieros(precioTotalUSD, costoEnvioUSD, cantUnidades, precioVentaC);
    
    const newOrder = {
        'N': itemCounter,
        'Articulo': articulo,
        'U/M': 'Paquete', 
        'CostoU$': precioTotalUSD, 
        'costo/envíoU$': costoEnvioUSD, 
        'GastosTotalesU$': calculated.GastosTotalesU$,
        'Unidades': cantUnidades,
        'Costo/UnidadU$': calculated.costoUnidadUSD,
        'Costo/UnidadC$': calculated.costoUnidadC,
        'Precio/ventaC$': precioVentaC,
        'Ganancia/UnidadC$': calculated.gananciaUnidadC,
        'Ganancia/TotalC$': calculated.gananciaTotalC,
        'T/C': calculated.tasaCambio
    };

    // Guardar en la ruta 'orders/N'
    db.ref('orders/' + newOrder.N).set(newOrder)
        .then(() => {
            document.getElementById('orderForm').reset();
            Swal.fire({ icon: 'success', title: 'Guardado en la Nube', timer: 1500, showConfirmButton: false });
        })
        .catch(err => console.error("Error al guardar:", err));
};

// --- INICIALIZACIÓN DE PÁGINAS ---
const initializeIndexPage = () => {
    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
        orderForm.addEventListener('submit', handleFormSubmit);
    }
};

const renderAdminView = () => {
    const listTitle = document.getElementById('listTitle');
    if (listTitle) listTitle.textContent = '🔑 Lista Completa (Nube)';
    renderTable(ordersData, 'dynamicContent', true);
};

document.addEventListener('DOMContentLoaded', () => {
    initializeDataAndCounter();
    initializeIndexPage();
});
