// ================= ==========================================
// CONFIGURAÇÕES GERAIS E ARQUIVOS
// ============================================================
const CONFIG = {
    PHONE_NUMBER: '5585999999999', // Substitua pelo seu número com DDD (ex: 5585987654321)
    CSV_FILE: 'Produtos disponiveis(Pro site).csv',
    LOGO_FILE: 'Logo - Vivi.png',
    GOOGLE_SHEETS_CSV_URL: '' // Cole aqui a URL do CSV publicado do Google Sheets, se houver
};

// ============================================================
// ESTADO DA APLICAÇÃO
// ============================================================
let products = [];
let cart = JSON.parse(localStorage.getItem('ig_cart')) || [];
let activeCategory = 'Todos';

// ============================================================
// INICIALIZAÇÃO
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    setupLogo();
    loadProducts();
    setupEventListeners();
    updateCart();
});

// Configura a Logo do Site
function setupLogo() {
    const logoImg = document.getElementById('site-logo');
    if (logoImg) {
        logoImg.src = CONFIG.LOGO_FILE;
    }
}

// ============================================================
// CARREGAMENTO E PARSER DE PRODUTOS (CSV)
// ============================================================
async function loadProducts() {
    try {
        const response = await fetch(CONFIG.CSV_FILE);
        const data = await response.text();
        products = parseCSV(data);
        renderCategories();
        renderProducts(products);
    } catch (error) {
        console.error('Erro ao carregar o arquivo CSV de produtos:', error);
    }
}

function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length <= 1) return [];

    const headers = lines[0].split(';').map(h => h.trim().toLowerCase());
    
    return lines.slice(1).map((line, index) => {
        const values = line.split(';').map(v => v.trim());
        const item = {};
        
        headers.forEach((header, i) => {
            item[header] = values[i] || '';
        });

        // Tratamento de preço e imagem
        const rawPrice = item.preco || item.preço || item.price || '0';
        const cleanPrice = parseFloat(rawPrice.replace('R$', '').replace('.', '').replace(',', '.').trim()) || 0;

        return {
            id: item.id || `prod-${index}`,
            name: item.nome || item.produto || item.title || 'Produto sem nome',
            category: item.categoria || item.category || 'Geral',
            price: cleanPrice,
            image: item.imagem || item.foto || item.image || 'https://via.placeholder.com/300?text=Sem+Foto',
            description: item.descricao || item.descrição || ''
        };
    });
}

// ============================================================
// RENDERIZAÇÃO DE TELA (CATEGORIAS E PRODUTOS)
// ============================================================
function renderCategories() {
    const categoryContainer = document.getElementById('category-filters');
    if (!categoryContainer) return;

    const categories = ['Todos', ...new Set(products.map(p => p.category))];
    
    categoryContainer.innerHTML = categories.map(cat => `
        <button class="filter-btn ${cat === activeCategory ? 'active' : ''}" data-category="${cat}">
            ${cat}
        </button>
    `).join('');

    categoryContainer.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            activeCategory = e.target.dataset.category;
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            filterProducts();
        });
    });
}

function renderProducts(items) {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    if (items.length === 0) {
        grid.innerHTML = `<p class="no-products">Nenhum produto encontrado.</p>`;
        return;
    }

    grid.innerHTML = items.map(product => `
        <div class="product-card">
            <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.src='https://via.placeholder.com/300?text=Sem+Foto'">
            <div class="product-info">
                <span class="product-category">${product.category}</span>
                <h3 class="product-title">${product.name}</h3>
                <p class="product-price">R$ ${product.price.toFixed(2).replace('.', ',')}</p>
                <button class="btn-add-cart" onclick="addToCart('${product.id}')">Adicionar ao Carrinho</button>
            </div>
        </div>
    `).join('');
}

function filterProducts() {
    const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
    
    const filtered = products.filter(product => {
        const matchesCategory = activeCategory === 'Todos' || product.category === activeCategory;
        const matchesSearch = product.name.toLowerCase().includes(searchTerm) || 
                              product.category.toLowerCase().includes(searchTerm);
        return matchesCategory && matchesSearch;
    });

    renderProducts(filtered);
}

// ============================================================
// GERENCIAMENTO DO CARRINHO
// ============================================================
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    saveCart();
    updateCart();
    openCartModal();
}

function updateQuantity(productId, delta) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
        cart = cart.filter(i => i.id !== productId);
    }

    saveCart();
    updateCart();
}

function saveCart() {
    localStorage.setItem('ig_cart', JSON.stringify(cart));
}

function updateCart() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartCount = document.getElementById('cart-count');
    const cartTotal = document.getElementById('cart-total');

    // Atualiza contador do ícone
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCount) cartCount.textContent = totalCount;

    // Atualiza modal do carrinho
    if (cartItemsContainer) {
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="empty-cart">Seu carrinho está vazio.</p>';
        } else {
            cartItemsContainer.innerHTML = cart.map(item => `
                <div class="cart-item">
                    <div class="cart-item-details">
                        <h4>${item.name}</h4>
                        <p>R$ ${item.price.toFixed(2).replace('.', ',')}</p>
                    </div>
                    <div class="cart-item-controls">
                        <button onclick="updateQuantity('${item.id}', -1)">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="updateQuantity('${item.id}', 1)">+</button>
                    </div>
                </div>
            `).join('');
        }
    }

    // Atualiza total
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (cartTotal) cartTotal.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

// ============================================================
// CHECKOUT E WHATSAPP
// ============================================================
function checkout() {
    if (cart.length === 0) {
        alert('Seu carrinho está vazio!');
        return;
    }

    const orderId = 'VV-' + Math.floor(1000 + Math.random() * 9000);
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Salva pedido localmente para o rastreio do cliente
    saveLocalOrder(orderId, 'Recebido', cart, total);

    let message = `*NOVO PEDIDO: #${orderId}*\n\n`;
    message += `*Itens do Pedido:*\n`;
    
    cart.forEach(item => {
        message += `- ${item.quantity}x ${item.name} (R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')})\n`;
    });

    message += `\n*Total:* R$ ${total.toFixed(2).replace('.', ',')}\n`;
    message += `\n_Código para Acompanhar Pedido no site:_ *${orderId}*`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${CONFIG.PHONE_NUMBER}?text=${encodedMessage}`;

    // Limpa carrinho e redireciona
    cart = [];
    saveCart();
    updateCart();
    closeCartModal();

    window.open(whatsappUrl, '_blank');
}

// ============================================================
// SISTEMA DE RASTREIO E MODAIS
// ============================================================
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

    // 1. Tenta buscar no Google Sheets (se configurado)
    if (CONFIG.GOOGLE_SHEETS_CSV_URL) {
        try {
            const response = await fetch(CONFIG.GOOGLE_SHEETS_CSV_URL);
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
            console.warn('Erro ao consultar Google Sheets. Verificando dados locais...', e);
        }
    }

    // 2. Fallback: Busca nos pedidos locais salvos no navegador
    if (!orderStatus) {
        const localOrders = JSON.parse(localStorage.getItem('ig_orders')) || {};
        if (localOrders[code]) {
            orderStatus = localOrders[code].status;
        }
    }

    // Renderiza a linha do tempo do status
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

// ============================================================
// EVENT LISTENERS E MODAIS (IDs CORRIGIDOS)
// ============================================================
function setupEventListeners() {
    // Campo de busca
    document.getElementById('search-input')?.addEventListener('input', filterProducts);

    // Modal do Carrinho
    document.getElementById('btn-cart')?.addEventListener('click', openCartModal);
    document.getElementById('close-cart-modal')?.addEventListener('click', closeCartModal);

    // Modal de Rastreio (Acompanhar Pedido)
    document.getElementById('btn-open-tracking')?.addEventListener('click', () => {
        document.getElementById('tracking-modal')?.classList.add('active');
    });

    document.getElementById('close-tracking-modal')?.addEventListener('click', () => {
        document.getElementById('tracking-modal')?.classList.remove('active');
    });

    // Botão de buscar no modal de rastreio
    document.getElementById('btn-search-tracking')?.addEventListener('click', searchOrderStatus);

    // Botão de checkout
    document.getElementById('btn-checkout')?.addEventListener('click', checkout);

    // Fechar modais ao clicar fora
    window.addEventListener('click', (e) => {
        const cartModal = document.getElementById('cart-modal');
        const trackingModal = document.getElementById('tracking-modal');

        if (e.target === cartModal) closeCartModal();
        if (e.target === trackingModal) trackingModal.classList.remove('active');
    });
}

function openCartModal() {
    document.getElementById('cart-modal')?.classList.add('active');
}

function closeCartModal() {
    document.getElementById('cart-modal')?.classList.remove('active');
}