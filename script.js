const PHONE_NUMBER = "5585999999999"; 

let cart = [];

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('Produtos disponiveis(Pro site).csv');
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const csvData = await response.text();
        const products = parseCSV(csvData);
        
        renderProducts(products);
    } catch (error) {
        console.error("Erro ao carregar o arquivo CSV:", error);
    }

    // Listeners para os botões do WhatsApp
    document.getElementById('btn-whatsapp').addEventListener('click', sendToWhatsApp);
    document.getElementById('btn-whatsapp-modal').addEventListener('click', sendToWhatsApp);

    // Listeners para abrir e fechar o modal
    document.getElementById('cart-info-trigger').addEventListener('click', openModal);
    document.getElementById('close-modal').addEventListener('click', closeModal);

    // Fechar modal clicando fora dele
    document.getElementById('cart-modal').addEventListener('click', (e) => {
        if (e.target.id === 'cart-modal') closeModal();
    });
});

// Converter CSV tratando padronização do Excel BR para as colunas: Id, marca, produto, valor
function parseCSV(csvText) {
    const cleanText = csvText.replace(/\r/g, '').trim();
    const lines = cleanText.split('\n');

    if (lines.length <= 1) return [];

    const delimiter = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());

    return lines.slice(1).map(line => {
        if (!line.trim()) return null;
        const values = line.split(delimiter).map(v => v.trim());
        let obj = {};

        headers.forEach((header, index) => {
            obj[header] = values[index] || '';
        });

        const parsePrice = (val) => {
            if (!val) return null;
            const cleanVal = val.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
            const num = parseFloat(cleanVal);
            return isNaN(num) ? null : num;
        };

        return {
            id: obj.id || obj.id,
            brand: obj.marca || 'Vivícia',
            name: obj.produto || 'Produto Sem Nome',
            price: parsePrice(obj.valor)
        };
    }).filter(p => p !== null && p.price !== null);
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
    document.getElementById('cart-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('cart-modal').classList.remove('active');
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