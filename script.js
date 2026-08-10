// ATENÇÃO: Coloque aqui o número do WhatsApp da loja (DDD + Número sem caracteres especiais)
const PHONE_NUMBER = "5585999999999"; 

let cart = [];

document.addEventListener('DOMContentLoaded', () => {
    const addButtons = document.querySelectorAll('.btn-add-cart');
    const whatsappBtn = document.getElementById('btn-whatsapp');

    addButtons.forEach(button => {
        button.addEventListener('click', addToCart);
    });

    whatsappBtn.addEventListener('click', sendToWhatsApp);
});

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

function updateCartUI() {
    const cartCountElement = document.getElementById('cart-count');
    const cartTotalElement = document.getElementById('cart-total-value');

    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    const totalPrice = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    cartCountElement.innerText = totalItems;
    cartTotalElement.innerText = `R$ ${totalPrice.toFixed(2).replace('.', ',')}`;
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