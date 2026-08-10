const PHONE_NUMBER = "5585999999999"; 

let cart = [];

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();

    // Eventos do WhatsApp
    document.getElementById('btn-whatsapp')?.addEventListener('click', sendToWhatsApp);
    document.getElementById('btn-whatsapp-modal')?.addEventListener('click', sendToWhatsApp);

    // Eventos do Modal
    document.getElementById('cart-info-trigger')?.addEventListener('click', openModal);
    document.getElementById('close-modal')?.addEventListener('click', closeModal);

    document.getElementById('cart-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'cart-modal') closeModal();
    });
});

async function loadProducts() {
    try {
        const response = await fetch('/produtos.csv');
        
        if (!response.ok) {
            console.error(`Erro ao carregar produtos.csv! Status HTTP: ${response.status}`);
            return;
        }

        const csvText = await response.text();
        const products = parseCSV(csvText);

        if (products.length === 0) {
            console.error("Nenhum produto foi processado do CSV.");
            return;
        }

        renderProducts(products);
    } catch (error) {
        console.error("Erro na leitura do CSV:", error);
    }
}

function parseCSV(csvText) {
    // Remove quebras de linha invisíveis e divide em linhas
    const lines = csvText.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(l => l.length > 0);

    if (lines.length <= 1) return [];

    // O separador do seu CSV é ponto e vírgula (;)
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

        // Mapeia colunas buscando palavras-chave (ex: 'produto', 'valor')
        const idKey = Object.keys(row).find(k => k.includes('id')) || '';
        const brandKey = Object.keys(row).find(k => k.includes('marca')) || '';
        const nameKey = Object.keys(row).find(k => k.includes('produto')) || '';
        const priceKey = Object.keys(row).find(k => k.includes('valor') || k.includes('venda')) || '';

        const id = row[idKey] || String(i);
        const brand = row[brandKey] || 'Vivícia';
        const name = row[nameKey] || '';
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

function sendToWhatsApp() {
    if (cart.length === 0) {
        alert("Seu carrinho está vazio! Adicione produtos antes de finalizar.");
        return;
    }

    let message = "🛍️ *NOVO PEDIDO - VIVÍCIA*\n\n";
    message += "*Itens do Pedido:*\n";

    let total = 0;
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        message += `• ${item.quantity}x ${item.name} - R$ ${itemTotal.toFixed(2).replace('.', ',')}\n`;
    });

    message += `\n💰 *Total:* R$ ${total.toFixed(2).replace('.', ',')}\n\n`;
    message += "Olá! Gostaria de finalizar o pagamento do meu pedido.";

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${PHONE_NUMBER}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
}