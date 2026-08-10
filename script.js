const PHONE_NUMBER = "5585991251320"; 
const GOOGLE_SHEETS_CSV_URL = ""; // Cole aqui a URL do CSV publicado do Google Sheets, se houver

let cart = [];
let allProducts = [];      // Armazena todos os produtos do CSV
let selectedBrand = 'todas'; // Marca selecionada no filtro
let searchQuery = '';      // Texto de busca digitado

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();

    // Eventos de Busca e Filtro
    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('btn-clear-search');

    searchInput?.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        if (clearBtn) clearBtn.style.display = searchQuery ? 'block' : 'none';
        applyFilters();
    });

    clearBtn?.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        searchQuery = '';
        if (clearBtn) clearBtn.style.display = 'none';
        applyFilters();
    });

    // Eventos do WhatsApp
    document.getElementById('btn-whatsapp')?.addEventListener('click', sendToWhatsApp);
    document.getElementById('btn-whatsapp-modal')?.addEventListener('click', sendToWhatsApp);

    // Eventos do Modal
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

        // Lê o buffer do arquivo e decodifica como ISO-8859-1 (corrigindo os acentos '??')
        const buffer = await response.arrayBuffer();
        let csvText = '';
        try {
            const decoderIso = new TextDecoder('iso-8859-1');
            csvText = decoderIso.decode(buffer);
            // Se encontrar o caractere de substituição (), tenta UTF-8 como fallback
            if (csvText.includes('')) {
                const decoderUtf = new TextDecoder('utf-8');
                csvText = decoderUtf.decode(buffer);
            }
        } catch (e) {
            const decoder = new TextDecoder('utf-8');
            csvText = decoder.decode(buffer);
        }

        allProducts = parseCSV(csvText);

        if (allProducts.length === 0) {
            console.error("Nenhum produto foi processado do CSV.");
            return;
        }

        // Monta os botões das marcas dinamicamente baseando-se no CSV
        renderBrandFilters(allProducts);

        // Renderiza os produtos inicialmente
        applyFilters();
    } catch (error) {
        console.error("Erro na leitura do CSV:", error);
    }
}

function parseCSV(csvText) {
    // Remove quebras de linha invisíveis e divide em linhas
    const lines = csvText.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(l => l.length > 0);

    if (lines.length <= 1) return [];

    // O separador do CSV é ponto e vírgula (;)
    const delimiter = ';';

    // Normaliza os cabeçalhos (remove espaços extras e caracteres invisíveis)
    const headers = lines[0].split(delimiter).map(h => h.replace(/[\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, '').trim().toLowerCase());

    const products = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter).map(v => v.trim());
        let row = {};

        headers.forEach((header, idx) => {
            row[header] = values[idx] || '';
        });

        // Mapeia colunas buscando palavras-chave (ex: 'id', 'marca', 'produto', 'valor' / 'venda')
        const idKey = Object.keys(row).find(k => k.includes('id')) || '';
        const brandKey = Object.keys(row).find(k => k.includes('marca')) || '';
        const nameKey = Object.keys(row).find(k => k.includes('produto')) || '';
        const priceKey = Object.keys(row).find(k => k.includes('valor') || k.includes('venda')) || '';

        const id = row[idKey] || String(i);
        const brand = (row[brandKey] || 'Vivícia').trim();
        const name = (row[nameKey] || '').trim();
        let rawPrice = row[priceKey] || '';

        // Tratamento do valor da venda (ex: R$ 39,90 ou 39,90)
        rawPrice = rawPrice.replace('R$', '').replace(/\s/g, '');

        if (rawPrice.includes(',') && rawPrice.includes('.')) {
            rawPrice = rawPrice.replace(/\./g, '').replace(',', '.');
        } else if (rawPrice.includes(',')) {
            rawPrice = rawPrice.replace(',', '.');
        }

        const price = parseFloat(rawPrice);

        if (name && !isNaN(price)) {
            products.push({ id, brand, name, price });
        }
    }

    return products;
}

// Gera botões de filtro de marcas automaticamente
function renderBrandFilters(products) {
    const brandContainer = document.getElementById('brand-filters');
    if (!brandContainer) return;

    // Extrai marcas únicas
    const brandsSet = new Set(products.map(p => p.brand).filter(b => b.length > 0));
    const uniqueBrands = Array.from(brandsSet);

    let html = `<button class="brand-btn active" data-brand="todas">Todas as Marcas</button>`;

    uniqueBrands.forEach(brand => {
        html += `<button class="brand-btn" data-brand="${brand}">${brand}</button>`;
    });

    brandContainer.innerHTML = html;

    // Adiciona evento de clique aos botões de marca
    document.querySelectorAll('.brand-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.brand-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            selectedBrand = e.target.getAttribute('data-brand');
            applyFilters();
        });
    });
}

// Filtra os produtos por busca e marca
function applyFilters() {
    let filtered = allProducts;

    // Filtro de Marca
    if (selectedBrand !== 'todas') {
        filtered = filtered.filter(p => p.brand.toLowerCase() === selectedBrand.toLowerCase());
    }

    // Filtro de Busca (Nome ou Marca)
    if (searchQuery) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchQuery) || 
            p.brand.toLowerCase().includes(searchQuery)
        );
    }

    // Atualiza o contador de resultados
    const countElement = document.getElementById('results-count');
    if (countElement) {
        countElement.innerText = `${filtered.length} produto(s) encontrado(s)`;
    }

    // Exibe ou oculta a mensagem de nenhum produto
    const noProductsMsg = document.getElementById('no-products-msg');
    if (noProductsMsg) {
        noProductsMsg.style.display = filtered.length === 0 ? 'block' : 'none';
    }

    renderProducts(filtered);
}

function renderProducts(products) {
    const mainGrid = document.getElementById('product-grid');
    if (!mainGrid) return;

    mainGrid.innerHTML = '';
    const defaultImage = 'https://via.placeholder.com/250x220/fceeee/111111?text=Viv%C3%ADcia';

    products.forEach(product => {
        const cardHTML = `
            <div class="product-card" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}">
                <div class="product-image-container">
                    <img src="${defaultImage}" alt="${product.name}" class="product-image">
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
        resultDiv.innerHTML = '<p class="error-msg">Por favor, digite o código do pedido.</p>';
        return;
    }

    resultDiv.innerHTML = '<p class="loading-msg">Consultando status...</p>';

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
        resultDiv.innerHTML = `<p class="error-msg">Pedido <strong>#${code}</strong> não encontrado.</p>`;
    }
}

function renderTrackingTimeline(code, currentStatus, container) {
    const stages = ['Recebido', 'Em Separação', 'Saiu p/ Entrega', 'Entregue'];
    const currentIndex = stages.findIndex(s => s.toLowerCase() === currentStatus.toLowerCase());
    const activeIdx = currentIndex !== -1 ? currentIndex : 0;

    container.innerHTML = `
        <div class="order-info-header">
            <h4>Pedido: <span>#${code}</span></h4>
            <span class="status-badge">${stages[activeIdx]}</span>
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