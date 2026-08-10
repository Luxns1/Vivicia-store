const PHONE_NUMBER = "5585991251320"; 
const GOOGLE_SHEETS_CSV_URL = ""; // Cole aqui a URL do CSV publicado do Google Sheets, se houver

let cart = [];
let allProducts = []; // Guarda a lista de produtos original para filtrar

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();

    // Eventos do Filtro e Busca
    document.getElementById('search-input')?.addEventListener('input', filterProducts);
    document.getElementById('brand-filter')?.addEventListener('change', filterProducts);

    // Eventos do WhatsApp
    document.getElementById('btn-whatsapp-modal')?.addEventListener('click', sendToWhatsApp);

    // Eventos do Modal do Carrinho
    document.getElementById('cart-info-trigger')?.addEventListener('click', openModal);
    document.getElementById('close-modal')?.addEventListener('click', closeModal);

    document.getElementById('cart-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'cart-modal') closeModal();
    });

    // Eventos do Modal de Rastreio
    document.getElementById('btn-open-tracking')?.addEventListener('click', openTrackingModal);
    document.getElementById('close-tracking-modal')?.addEventListener('click', closeTrackingModal);
    document.getElementById('btn-search-tracking')?.addEventListener('click', searchOrderStatus);

    document.getElementById('tracking-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'tracking-modal') closeTrackingModal();
    });
});

async function loadProducts() {
    try {
        const response = await fetch('/Produtos disponiveis(Pro site).csv');
        
        if (!response.ok) {
            console.error(`Erro ao carregar produtos.csv! Status HTTP: ${response.status}`);
            return;
        }

        const csvText = await response.text();
        allProducts = parseCSV(csvText);

        if (allProducts.length === 0) {
            console.error("Nenhum produto foi processado do CSV.");
            return;
        }

        populateBrandFilter(allProducts);
        renderProducts(allProducts);
    } catch (error) {
        console.error("Erro na leitura do CSV:", error);
    }
}

function parseCSV(csvText) {
    const lines = csvText.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(l => l.length > 0);

    if (lines.length <= 1) return [];

    const delimiter = ';';
    const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());

    const products = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter).map(v => v.trim());
        let row = {};

        headers.forEach((header, idx) => {
            row[header] = values[idx] || '';
        });

        const idKey = Object.keys(row).find(k => k.includes('id')) || '';
        const brandKey = Object.keys(row).find(k => k.includes('marca')) || '';
        const nameKey = Object.keys(row).find(k => k.includes('produto')) || '';
        const priceKey = Object.keys(row).find(k => k.includes('valor') || k.includes('venda')) || '';
        const imageKey = Object.keys(row).find(k => k.includes('imagem') || k.includes('foto') || k.includes('img') || k.includes('url')) || '';

        const id = row[idKey] || String(i);
        const brand = (row[brandKey] || 'Vivícia').trim();
        const name = (row[nameKey] || '').trim();
        const image = (row[imageKey] || '').trim();
        let rawPrice = row[priceKey] || '';

        rawPrice = rawPrice.replace('R$', '').replace(/\s/g, '');

        if (rawPrice.includes(',') && rawPrice.includes('.')) {
            rawPrice = rawPrice.replace(/\./g, '').replace(',', '.');
        } else if (rawPrice.includes(',')) {
            rawPrice = rawPrice.replace(',', '.');
        }

        const price = parseFloat(rawPrice);

        if (name && !isNaN(price)) {
            products.push({ id, brand, name, price, image });
        }
    }

    return products;
}

function populateBrandFilter(products) {
    const brandSelect = document.getElementById('brand-filter');
    if (!brandSelect) return;

    const brands = [...new Set(products.map(p => p.brand))].sort();
    brandSelect.innerHTML = '<option value="">Todas as Marcas</option>';

    brands.forEach(brand => {
        const option = document.createElement('option');
        option.value = brand;
        option.textContent = brand;
        brandSelect.appendChild(option);
    });
}

function filterProducts() {
    const searchInput = document.getElementById('search-input')?.value.toLowerCase().trim() || '';
    const selectedBrand = document.getElementById('brand-filter')?.value || '';

    const filtered = allProducts.filter(product => {
        const matchesName = product.name.toLowerCase().includes(searchInput);
        const matchesBrand = selectedBrand === '' || product.brand === selectedBrand;
        return matchesName && matchesBrand;
    });

    renderProducts(filtered);
}

function renderProducts(products) {
    const mainGrid = document.getElementById('product-grid');
    if (!mainGrid) return;

    mainGrid.innerHTML = '';

    // Imagem SVG de fallback local (garante que sempre carregará sem depender de internet)
    const fallbackImage = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='250' height='220' viewBox='0 0 250 220'><rect width='100%' height='100%' fill='%23fceeee'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='20' font-weight='bold' fill='%23111111'>Viv%C3%ADcia</text></svg>";

    if (products.length === 0) {
        mainGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #888;">Nenhum produto encontrado.</p>`;
        return;
    }

    products.forEach(product => {
        const imgSrc = product.image && product.image !== '' ? product.image : fallbackImage;

        const cardHTML = `
            <div class="product-card" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}">
                <div class="product-image-container">
                    <img src="${imgSrc}" alt="${product.name}" class="product-image" onerror="this.src='${fallbackImage}'">
                </div>
                <div class="product-details">
                    <span class="product-brand">${product.brand}</span>
                    <h3 class="product-name">${product.name}</h3>
                    <div class="product-pricing">
                        <span class="current-price">R$ ${product.price.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <button class="btn-add-cart">Adicionar ao Carrinho</button>
                </div>
            </div>
        `;
        mainGrid.innerHTML += cardHTML;
    });

    document.querySelectorAll('.btn-add-cart').forEach(button => {
        button.addEventListener('click', addToCart);
    });
}

function addToCart(event) {
    const card = event.target.closest('.product-card');
    const id = card.getAttribute('data-id');
    const name = card.getAttribute('data-name');
    const price = parseFloat(card.getAttribute('data-price'));

    const existingItem = cart.find(item => item.id === id);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id, name, price, quantity: 1 });
    }

    updateCartUI();
}

function changeQuantity(id, change) {
    const item = cart.find(item => item.id === id);
    if (!item) return;

    item.quantity += change;

    if (item.quantity <= 0) {
        removeFromCart(id);
    } else {
        updateCartUI();
    }
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    updateCartUI();
}

function updateCartUI() {
    const cartCountElement = document.getElementById('cart-count');
    const cartTotalElement = document.getElementById('cart-total-value');
    const modalTotalElement = document.getElementById('modal-total-value');
    const cartItemsContainer = document.getElementById('cart-items-container');

    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    const totalPrice = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const formattedTotal = `R$ ${totalPrice.toFixed(2).replace('.', ',')}`;

    if (cartCountElement) cartCountElement.innerText = totalItems;
    if (cartTotalElement) cartTotalElement.innerText = formattedTotal;
    if (modalTotalElement) modalTotalElement.innerText = formattedTotal;

    if (cartItemsContainer) {
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = `<p class="cart-empty-text">Seu carrinho está vazio.</p>`;
        } else {
            cartItemsContainer.innerHTML = cart.map(item => `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <h4>${item.name}</h4>
                        <p>R$ ${item.price.toFixed(2).replace('.', ',')} un.</p>
                    </div>
                    <div class="cart-item-actions">
                        <button class="qty-btn" onclick="changeQuantity('${item.id}', -1)">-</button>
                        <span>${item.quantity}</span>
                        <button class="qty-btn" onclick="changeQuantity('${item.id}', 1)">+</button>
                        <button class="remove-btn" onclick="removeFromCart('${item.id}')">🗑️</button>
                    </div>
                </div>
            `).join('');
        }
    }
}

function openModal() {
    document.getElementById('cart-modal')?.classList.add('active');
}

function closeModal() {
    document.getElementById('cart-modal')?.classList.remove('active');
}

function openTrackingModal() {
    document.getElementById('tracking-modal')?.classList.add('active');
}

function closeTrackingModal() {
    document.getElementById('tracking-modal')?.classList.remove('active');
}

function sendToWhatsApp() {
    if (cart.length === 0) {
        alert("Seu carrinho está vazio! Adicione produtos antes de finalizar.");
        return;
    }

    const orderId = 'VV-' + Math.floor(1000 + Math.random() * 9000);
    let total = 0;

    let message = `🛍️ *NOVO PEDIDO (#${orderId}) - VIVÍCIA*\n\n`;
    message += "*Itens do Pedido:*\n";

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        message += `• ${item.quantity}x ${item.name} - R$ ${itemTotal.toFixed(2).replace('.', ',')}\n`;
    });

    message += `\n💰 *Total:* R$ ${total.toFixed(2).replace('.', ',')}\n`;
    message += `📦 *Código do Pedido:* ${orderId}\n\n`;
    message += "Olá! Gostaria de finalizar o pagamento do meu pedido.";

    saveLocalOrder(orderId, 'Recebido', cart, total);

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${PHONE_NUMBER}?text=${encodedMessage}`;

    cart = [];
    updateCartUI();
    closeModal();

    window.open(whatsappUrl, '_blank');
}

function saveLocalOrder(orderId, status, items, total) {
    const orders = JSON.parse(localStorage.getItem('ig_orders')) || {};
    orders[orderId] = {
        status: status,
        date: new Date().toLocaleDateString('pt-BR'),
        items: items,
        total: total
    };
    localStorage.setItem('ig_orders', JSON.stringify(orders));
}

async function searchOrderStatus() {
    const codeInput = document.getElementById('tracking-code-input');
    const resultDiv = document.getElementById('tracking-result');
    if (!codeInput || !resultDiv) return;

    const code = codeInput.value.trim().toUpperCase();
    if (!code) {
        resultDiv.innerHTML = '<p class="error-msg" style="color:red; margin-top:10px;">Por favor, digite o código do pedido.</p>';
        return;
    }

    resultDiv.innerHTML = '<p class="loading-msg" style="margin-top:10px;">Consultando status...</p>';

    let orderStatus = null;

    if (GOOGLE_SHEETS_CSV_URL) {
        try {
            const response = await fetch(GOOGLE_SHEETS_CSV_URL);
            const csvText = await response.text();
            const rows = csvText.split('\n');
            
            for (let i = 1; i < rows.length; i++) {
                const cols = rows[i].split(';');
                if (cols[0] && cols[0].trim().toUpperCase() === code) {
                    orderStatus = cols[1] ? cols[1].trim() : 'Recebido';
                    break;
                }
            }
        } catch (e) {
            console.warn('Erro ao consultar Google Sheets. Buscando nos dados locais...', e);
        }
    }

    if (!orderStatus) {
        const localOrders = JSON.parse(localStorage.getItem('ig_orders')) || {};
        if (localOrders[code]) {
            orderStatus = localOrders[code].status;
        }
    }

    if (orderStatus) {
        renderTrackingTimeline(code, orderStatus, resultDiv);
    } else {
        resultDiv.innerHTML = `<p class="error-msg" style="color:red; margin-top:10px;">Pedido <strong>#${code}</strong> não encontrado.</p>`;
    }
}

function renderTrackingTimeline(code, currentStatus, container) {
    const stages = ['Recebido', 'Em Separação', 'Saiu p/ Entrega', 'Entregue'];
    const currentIndex = stages.findIndex(s => s.toLowerCase() === currentStatus.toLowerCase());
    const activeIdx = currentIndex !== -1 ? currentIndex : 0;

    container.innerHTML = `
        <div style="margin-top: 15px;">
            <h4>Pedido: <span>#${code}</span></h4>
            <p>Status Atual: <strong>${stages[activeIdx]}</strong></p>
        </div>
        <div class="timeline">
            ${stages.map((stage, idx) => `
                <div class="timeline-step ${idx <= activeIdx ? 'completed' : ''} ${idx === activeIdx ? 'current' : ''}">
                    <div class="step-icon">${idx <= activeIdx ? '✓' : idx + 1}</div>
                    <span class="step-label">${stage}</span>
                </div>
            `).join('')}
        </div>
    `;
}