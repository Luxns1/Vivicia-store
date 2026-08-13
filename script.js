const PHONE_NUMBER = "558591251320"; 
const GOOGLE_SHEETS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR7PJLBEA-DSFQYrozFbAJgvL00ZEHptPlNWIvdjM2m5m0WeCj_gm-P6fj-Xw7_sg7SMYz_kg6JIlao/pub?gid=0&single=true&output=csv";

let cart = [];
let allProducts = [];       
let selectedBrand = 'todas'; 
let searchQuery = '';       

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();

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

    document.getElementById('btn-whatsapp')?.addEventListener('click', sendToWhatsApp);
    document.getElementById('btn-whatsapp-modal')?.addEventListener('click', sendToWhatsApp);

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

    // Evento para buscar o endereço automaticamente ao digitar o CEP
    const cepInput = document.getElementById('client-cep');
    cepInput?.addEventListener('blur', function() {
        let cep = this.value.replace(/\D/g, '');
        if (cep.length === 8) {
            fetch(`https://viacep.com.br/ws/${cep}/json/`)
                .then(response => response.json())
                .then(data => {
                    if (!data.erro) {
                        const addressInput = document.getElementById('client-address');
                        if (addressInput) {
                            addressInput.value = `${data.logradouro}, Bairro: ${data.bairro}, ${data.localidade} - ${data.uf} (CEP: ${data.cep}) - `;
                            addressInput.focus();
                        }
                    } else {
                        alert("CEP não encontrado. Verifique os números digitados.");
                    }
                })
                .catch(() => {
                    console.error("Erro ao consultar o CEP.");
                });
        }
    });
});

async function loadProducts() {
    try {
        let csvText = "";

        // Tenta carregar primeiro da URL do Google Sheets publicada
        if (GOOGLE_SHEETS_CSV_URL && GOOGLE_SHEETS_CSV_URL !== "") {
            try {
                const sheetResponse = await fetch(GOOGLE_SHEETS_CSV_URL);
                if (sheetResponse.ok) {
                    csvText = await sheetResponse.text();
                }
            } catch (e) {
                console.warn("Google Sheets inacessível, tentando arquivo local...", e);
            }
        }

        // Se falhar, tenta o arquivo local com o nome correto codificado para URL
        if (!csvText || csvText.trim().length === 0) {
            const response = await fetch('Produtos%20disponiveis(Pro%20site).csv');
            if (!response.ok) {
                console.error(`Erro ao carregar o CSV local! Status HTTP: ${response.status}`);
                document.getElementById('product-grid').innerHTML = `<p style="text-align:center; width:100%; color:#8a3b50; padding:20px;">Erro ao carregar o arquivo CSV. Verifique se o nome exato é "Produtos disponiveis(Pro site).csv".</p>`;
                return;
            }
            const buffer = await response.arrayBuffer();
            csvText = new TextDecoder('utf-8').decode(buffer);

            if (csvText.includes('\ufffd')) {
                csvText = new TextDecoder('iso-8859-1').decode(buffer);
            }
        }

        allProducts = parseCSV(csvText);

        if (allProducts.length === 0) {
            console.error("O CSV foi carregado, mas nenhum produto foi processado.");
            document.getElementById('product-grid').innerHTML = `<p style="text-align:center; width:100%; color:#8a3b50; padding:20px;">Nenhum produto válido encontrado no arquivo.</p>`;
            return;
        }

        renderBrandFilters(allProducts);
        applyFilters();
    } catch (error) {
        console.error("Erro crítico na leitura dos produtos:", error);
    }
}

function parseCSV(csvText) {
    const lines = csvText.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(l => l.length > 0);

    if (lines.length <= 1) return [];

    const delimiter = lines[0].includes(';') ? ';' : ',';
    // Remove aspas, BOM e dá trim absoluto em cada cabeçalho para evitar problemas com espaços extras (ex: "MARCA ")
    const headers = lines[0].split(delimiter).map(h => h.replace(/["\uFEFF]/g, '').trim().toLowerCase());

    const products = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter).map(v => v.replace(/^["']|["']$/g, '').trim());
        let row = {};

        headers.forEach((header, idx) => {
            row[header] = values[idx] || '';
        });

        // Identifica as colunas com base no seu padrão exato do CSV
        const idKey = Object.keys(row).find(k => k.includes('id') || k.includes('codigo')) || headers[0];
        const brandKey = Object.keys(row).find(k => k.includes('marca')) || headers[1];
        const nameKey = Object.keys(row).find(k => k.includes('produto') || k.includes('nome')) || headers[2];
        const priceKey = Object.keys(row).find(k => k.includes('valor') || k.includes('venda') || k.includes('preco')) || headers[3];
        const imageKey = Object.keys(row).find(k => k.includes('imagem') || k.includes('foto') || k.includes('img')) || '';

        const id = row[idKey] || String(i);
        const brand = (row[brandKey] || 'Vivícia').trim();
        const name = (row[nameKey] || '').trim();
        const image = imageKey ? (row[imageKey] || '').trim() : '';
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

function getGenericImageForProduct(productName, brandName) {
    const name = productName.toLowerCase();

    const images = {
        esfoliante: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=500&q=80",
        locao_creme: "https://images.unsplash.com/photo-1608248597263-0007823f6d71?auto=format&fit=crop&w=500&q=80",
        sabonete: "https://images.unsplash.com/photo-1607006344380-b6775a0824a7?auto=format&fit=crop&w=500&q=80",
        serum: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=500&q=80",
        gloss_lip: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=500&q=80",
        cabelo: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=500&q=80",
        kit: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=500&q=80",
        perfume: "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=500&q=80"
    };

    if (name.includes('kit')) return images.kit;
    if (name.includes('gloss') || name.includes('lip') || name.includes('fruit juice')) return images.gloss_lip;
    if (name.includes('esfoliante')) return images.esfoliante;
    if (name.includes('serum') || name.includes('sérum')) return images.serum;
    if (name.includes('reparador') || name.includes('pontas') || name.includes('shampoo') || name.includes('capilar')) return images.cabelo;
    if (name.includes('sabonete') || name.includes('limpeza')) return images.sabonete;
    if (name.includes('loção') || name.includes('locao') || name.includes('creme') || name.includes('manteiga') || name.includes('gel') || name.includes('bumbum') || name.includes('firmador')) return images.locao_creme;

    return `https://placehold.co/400x350/f7e6e8/8a3b50?text=${encodeURIComponent(brandName.toUpperCase())}`;
}

function renderBrandFilters(products) {
    const brandContainer = document.getElementById('brand-filters');
    if (!brandContainer) return;

    const brandsSet = new Set(products.map(p => p.brand).filter(b => b.length > 0));
    const uniqueBrands = Array.from(brandsSet);

    let html = `<button class="brand-btn active" data-brand="todas">Todas as Marcas</button>`;

    uniqueBrands.forEach(brand => {
        html += `<button class="brand-btn" data-brand="${brand}">${brand}</button>`;
    });

    brandContainer.innerHTML = html;

    document.querySelectorAll('.brand-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.brand-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            selectedBrand = e.target.getAttribute('data-brand');
            applyFilters();
        });
    });
}

function applyFilters() {
    let filtered = allProducts;

    if (selectedBrand !== 'todas') {
        filtered = filtered.filter(p => p.brand.toLowerCase() === selectedBrand.toLowerCase());
    }

    if (searchQuery) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchQuery) || 
            p.brand.toLowerCase().includes(searchQuery)
        );
    }

    const countElement = document.getElementById('results-count');
    if (countElement) {
        countElement.innerText = `${filtered.length} produto(s) encontrado(s)`;
    }

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

    products.forEach(product => {
        const fallbackImage = `https://placehold.co/400x350/f7e6e8/8a3b50?text=${encodeURIComponent(product.brand.toUpperCase())}`;
        const productImage = product.image ? product.image : getGenericImageForProduct(product.name, product.brand);

        const cardHTML = `
            <div class="product-card" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}">
                <div class="product-image-container">
                    <img src="${productImage}" 
                         alt="${product.name}" 
                         class="product-image" 
                         loading="lazy" 
                         onerror="this.src='${fallbackImage}'">
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

    const addressInput = document.getElementById('client-address');
    const clientAddress = addressInput ? addressInput.value.trim() : '';

    if (!clientAddress) {
        alert("Por favor, preencha o seu endereço de entrega antes de finalizar o pedido!");
        openModal(); 
        addressInput?.focus();
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

    message += `\n📍 *Endereço de Entrega:* ${clientAddress}\n`;
    message += `💰 *Total:* R$ ${total.toFixed(2).replace('.', ',')}\n`;
    message += `📦 *Código do Pedido:* ${orderId}\n\n`;
    message += "Olá! Gostaria de finalizar o pagamento do meu pedido.";

    saveLocalOrder(orderId, 'Recebido', cart, total);

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${PHONE_NUMBER}?text=${encodedMessage}`;

    cart = [];
    if (addressInput) addressInput.value = ''; 
    const cepInput = document.getElementById('client-cep');
    if (cepInput) cepInput.value = '';
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
    const codeInput = document.getElementById('tracking-input'); 
    const resultDiv = document.getElementById('tracking-result');
    const errorDiv = document.getElementById('tracking-error');
    
    if (!codeInput) return;

    const code = codeInput.value.trim().toUpperCase();
    if (!code) {
        alert("Por favor, digite o código do pedido.");
        return;
    }

    let orderStatus = null;

    if (typeof GOOGLE_SHEETS_CSV_URL !== 'undefined' && GOOGLE_SHEETS_CSV_URL !== "") {
        try {
            const response = await fetch(GOOGLE_SHEETS_CSV_URL);
            const csvText = await response.text();
            
            const lines = csvText.replace(/\r/g, '').split('\n').filter(l => l.trim().length > 0);
            
            if (lines.length > 0) {
                const delimiter = lines[0].includes(';') ? ';' : ',';
                
                const headers = lines[0].split(delimiter).map(h => h.replace(/["\uFEFF]/g, '').trim().toLowerCase());
                
                const idCol = headers.findIndex(h => h.includes('codigo') || h.includes('pedido') || h.includes('id'));
                const statCol = headers.findIndex(h => h.includes('status') || h.includes('situacao'));

                for (let i = 1; i < lines.length; i++) {
                    const cols = lines[i].split(delimiter).map(v => v.replace(/^["']|["']$/g, '').trim());
                    const rowId = cols[idCol] ? cols[idCol].toUpperCase() : '';
                    
                    if (rowId === code) {
                        orderStatus = cols[statCol] || 'Recebido';
                        break;
                    }
                }
            }
        } catch (e) {
            console.warn('Erro ao consultar o Google Sheets. Tentando dados locais...', e);
        }
    }

    if (!orderStatus) {
        const localOrders = JSON.parse(localStorage.getItem('ig_orders')) || {};
        if (localOrders[code]) {
            orderStatus = localOrders[code].status;
        }
    }

    if (orderStatus) {
        if (resultDiv) resultDiv.style.display = 'block';
        if (errorDiv) errorDiv.style.display = 'none';

        const orderIdSpan = document.getElementById('track-order-id');
        if (orderIdSpan) orderIdSpan.innerText = '#' + code;

        const statusBadge = document.getElementById('track-status-badge');
        if (statusBadge) statusBadge.innerText = orderStatus;

        updateTimelineVisuals(orderStatus);
    } else {
        if (resultDiv) resultDiv.style.display = 'none';
        if (errorDiv) errorDiv.style.display = 'block';
    }
}

function updateTimelineVisuals(currentStatus) {
    const stages = ['Recebido', 'Em Separação', 'Saiu p/ Entrega', 'Entregue'];
    const currentIndex = stages.findIndex(s => s.toLowerCase() === currentStatus.toLowerCase());
    const activeIdx = currentIndex !== -1 ? currentIndex : 0;

    for (let i = 1; i <= 4; i++) {
        const stepElement = document.querySelector(`.timeline-step.step-${i}`);
        if (!stepElement) continue;

        stepElement.classList.remove('completed', 'current', 'active');

        if (i - 1 < activeIdx) {
            stepElement.classList.add('completed');
        } else if (i - 1 === activeIdx) {
            stepElement.classList.add('current', 'active');
        }
    }
}