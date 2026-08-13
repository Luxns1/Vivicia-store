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

    document.getElementById('btn-open-tracking')?.addEventListener('click', openTrackingModal);
    document.getElementById('close-tracking-modal')?.addEventListener('click', closeTrackingModal);
    document.getElementById('btn-search-tracking')?.addEventListener('click', searchOrderStatus);

    document.getElementById('tracking-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'tracking-modal') closeTrackingModal();
    });

    document.getElementById('close-detail-modal')?.addEventListener('click', closeDetailModal);

    document.getElementById('product-detail-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'product-detail-modal') closeDetailModal();
    });

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

        const response = await fetch('Produtos%20disponiveis(Pro%20site).csv');

        if (!response.ok) {

            console.error(`Erro ao carregar o CSV local! Status HTTP: ${response.status}`);

            const grid = document.getElementById('product-grid');

            if (grid) {
                grid.innerHTML =
                    `<p style="text-align:center; width:100%; color:#8a3b50; padding:20px;">Erro ao carregar o arquivo CSV. Verifique se o nome exato é "Produtos disponiveis(Pro site).csv".</p>`;
            }

            return;
        }

        const buffer = await response.arrayBuffer();

        let csvText = new TextDecoder('utf-8').decode(buffer);

        if (csvText.includes('\ufffd')) {
            csvText = new TextDecoder('windows-1252').decode(buffer);
        }

        allProducts = parseCSV(csvText);

        console.log("Produtos carregados:", allProducts);

        if (allProducts.length === 0) {

            console.error("O CSV foi carregado, mas nenhum produto foi processado.");

            const grid = document.getElementById('product-grid');

            if (grid) {
                grid.innerHTML =
                    `<p style="text-align:center; width:100%; color:#8a3b50; padding:20px;">Nenhum produto válido encontrado no arquivo.</p>`;
            }

            return;
        }

        renderBrandFilters(allProducts);
        applyFilters();

    } catch (error) {

        console.error("Erro crítico na leitura dos produtos:", error);

    }

}


function parseCSV(csvText) {

    const lines = csvText
        .replace(/^\uFEFF/, '')
        .replace(/\r/g, '')
        .split('\n')
        .filter(line => line.trim() !== '');

    if (lines.length < 2) return [];

    const products = [];

    for (let i = 1; i < lines.length; i++) {

        const values = [];
        let current = '';
        let insideQuotes = false;

        for (let j = 0; j < lines[i].length; j++) {

            const char = lines[i][j];

            if (char === '"') {

                if (insideQuotes && lines[i][j + 1] === '"') {
                    current += '"';
                    j++;
                } else {
                    insideQuotes = !insideQuotes;
                }

            } else if (char === ';' && !insideQuotes) {

                values.push(current.trim());
                current = '';

            } else {

                current += char;

            }

        }

        values.push(current.trim());

        const id = (values[0] || String(i)).trim();

        const brand = (values[1] || 'Vivícia').trim();

        const type = (values[2] || '').trim();

        const name = (values[3] || '').trim();

        const description = (values[4] || '').trim();


        // =========================
        // PREÇO CORRIGIDO
        // =========================

        let rawPrice = (values[5] || '').trim();

        rawPrice = rawPrice
            .replace(/^["']|["']$/g, '')
            .replace(/R\$/gi, '')
            .replace(/\s/g, '')
            .trim();

        let price = 0;

        if (rawPrice) {

            if (rawPrice.includes(',') && rawPrice.includes('.')) {

                rawPrice = rawPrice
                    .replace(/\./g, '')
                    .replace(',', '.');

            } else if (rawPrice.includes(',')) {

                rawPrice = rawPrice.replace(',', '.');

            }

            price = Number(rawPrice);

        }

        if (isNaN(price)) {
            price = 0;
        }


        // =========================
        // IMAGEM CORRIGIDA
        // =========================

        let image = (values[6] || '').trim();

        image = image
            .replace(/^["']|["']$/g, '')
            .trim();

        if (image) {

            // produto-001.jpeg → 001.jpeg
            image = image.replace(/^produto-/i, '');

            // Direciona para a pasta Fotos dos produtos
            image = encodeURI(`./Fotos dos produtos/${image}`);

        }


        if (name) {

            products.push({
                id,
                brand,
                type,
                name,
                description,
                price,
                image
            });

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

        const fallbackImage =
            `https://placehold.co/400x350/f7e6e8/8a3b50?text=${encodeURIComponent(product.brand.toUpperCase())}`;

        const productImage = product.image
            ? product.image
            : getGenericImageForProduct(product.name, product.brand);

        const cardHTML = `

            <div class="product-card"
                data-id="${product.id}"
                data-name="${product.name}"
                data-price="${product.price}"
                style="cursor: pointer;">

                <div class="product-image-container">

                    <img
                        src="${productImage}"
                        alt="${product.name}"
                        class="product-image"
                        loading="lazy"
                        onerror="this.onerror=null;this.src='${fallbackImage}'">

                </div>

                <div class="product-details">

                    <span class="product-brand">${product.brand}</span>

                    <h3 class="product-name">${product.name}</h3>

                    <div class="product-pricing">

                        <span class="current-price">
                            R$ ${product.price.toFixed(2).replace('.', ',')}
                        </span>

                    </div>

                    <button class="btn-add-cart">
                        Adicionar ao Carrinho
                    </button>

                </div>

            </div>

        `;

        mainGrid.innerHTML += cardHTML;

    });


    document.querySelectorAll('.product-card').forEach(card => {

        card.addEventListener('click', (e) => {

            if (e.target.classList.contains('btn-add-cart')) return;

            const id = card.getAttribute('data-id');

            const product = allProducts.find(p => p.id === id);

            if (product) {
                openDetailModal(product);
            }

        });

    });


    document.querySelectorAll('.btn-add-cart').forEach(button => {
        button.addEventListener('click', addToCart);
    });

}


function openDetailModal(product) {

    const modal = document.getElementById('product-detail-modal');

    if (!modal) return;

    document.getElementById('detail-name').innerText = product.name;

    document.getElementById('detail-brand').innerText = product.brand;

    document.getElementById('detail-price').innerText =
        `R$ ${product.price.toFixed(2).replace('.', ',')}`;

    const descElement = document.getElementById('detail-desc');

    if (descElement) {

        descElement.innerText = product.description ||
            `O ${product.name} da marca ${product.brand} foi desenvolvido com alto padrão de qualidade para garantir a melhor experiência em cuidados diários.`;

    }

    const imageElement = document.getElementById('detail-img');

    if (imageElement) {

        imageElement.src = product.image ||
            getGenericImageForProduct(product.name, product.brand);

        imageElement.alt = product.name;

        imageElement.onerror = function() {

            this.onerror = null;

            this.src = getGenericImageForProduct(
                product.name,
                product.brand
            );

        };

    }

    const addBtn = document.getElementById('detail-btn-add');

    if (addBtn) {

        addBtn.onclick = function() {

            const existingItem = cart.find(item => item.id === product.id);

            if (existingItem) {

                existingItem.quantity += 1;

            } else {

                cart.push({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    quantity: 1
                });

            }

            updateCartUI();
            closeDetailModal();
            openModal();

        };

    }

    modal.classList.add('active');

}


function closeDetailModal() {

    const modal = document.getElementById('product-detail-modal');

    if (modal) modal.classList.remove('active');

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

        cart.push({
            id,
            name,
            price,
            quantity: 1
        });

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

    const totalItems = cart.reduce(
        (acc, item) => acc + item.quantity,
        0
    );

    const totalPrice = cart.reduce(
        (acc, item) => acc + (item.price * item.quantity),
        0
    );

    const formattedTotal =
        `R$ ${totalPrice.toFixed(2).replace('.', ',')}`;

    if (cartCountElement) {
        cartCountElement.innerText = totalItems;
    }

    if (cartTotalElement) {
        cartTotalElement.innerText = formattedTotal;
    }

    if (modalTotalElement) {
        modalTotalElement.innerText = formattedTotal;
    }

    if (cartItemsContainer) {

        if (cart.length === 0) {

            cartItemsContainer.innerHTML =
                `<p class="cart-empty-text">Seu carrinho está vazio.</p>`;

        } else {

            cartItemsContainer.innerHTML = cart.map(item => `

                <div class="cart-item">

                    <div class="cart-item-info">

                        <h4>${item.name}</h4>

                        <p>
                            R$ ${item.price.toFixed(2).replace('.', ',')} un.
                        </p>

                    </div>

                    <div class="cart-item-actions">

                        <button
                            class="qty-btn"
                            onclick="changeQuantity('${item.id}', -1)">
                            -
                        </button>

                        <span>${item.quantity}</span>

                        <button
                            class="qty-btn"
                            onclick="changeQuantity('${item.id}', 1)">
                            +
                        </button>

                        <button
                            class="remove-btn"
                            onclick="removeFromCart('${item.id}')">
                            🗑️
                        </button>

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

    const clientAddress = addressInput
        ? addressInput.value.trim()
        : '';

    if (!clientAddress) {

        alert("Por favor, preencha o seu endereço de entrega antes de finalizar o pedido!");

        openModal();

        addressInput?.focus();

        return;

    }

    const orderId =
        'VV-' + Math.floor(1000 + Math.random() * 9000);

    let total = 0;

    let message =
        `🛍️ *NOVO PEDIDO (#${orderId}) - VIVÍCIA*\n\n`;

    message += "*Itens do Pedido:*\n";

    cart.forEach(item => {

        const itemTotal =
            item.price * item.quantity;

        total += itemTotal;

        message +=
            `• ${item.quantity}x ${item.name} - R$ ${itemTotal.toFixed(2).replace('.', ',')}\n`;

    });

    message +=
        `\n📍 *Endereço de Entrega:* ${clientAddress}\n`;

    message +=
        `💰 *Total:* R$ ${total.toFixed(2).replace('.', ',')}\n`;

    message +=
        `📦 *Código do Pedido:* ${orderId}\n\n`;

    message +=
        "Olá! Gostaria de finalizar o pagamento do meu pedido.";

    const encodedMessage =
        encodeURIComponent(message);

    const whatsappUrl =
        `https://wa.me/${PHONE_NUMBER}?text=${encodedMessage}`;

    cart = [];

    if (addressInput) {
        addressInput.value = '';
    }

    const cepInput =
        document.getElementById('client-cep');

    if (cepInput) {
        cepInput.value = '';
    }

    updateCartUI();

    closeModal();

    window.open(whatsappUrl, '_blank');

}


async function searchOrderStatus() {

    const codeInput =
        document.getElementById('tracking-input');

    const resultDiv =
        document.getElementById('tracking-result');

    const errorDiv =
        document.getElementById('tracking-error');

    if (!codeInput) return;

    const code =
        codeInput.value.trim().toUpperCase();

    if (!code) {

        alert("Por favor, digite o código do pedido.");

        return;

    }

    try {

        const response =
            await fetch(
                GOOGLE_SHEETS_CSV_URL + "&t=" + Date.now()
            );

        if (!response.ok) {
            throw new Error("Erro ao consultar a planilha.");
        }

        const buffer =
            await response.arrayBuffer();

        let csvText =
            new TextDecoder('utf-8').decode(buffer);

        if (csvText.includes('\ufffd')) {
            csvText =
                new TextDecoder('windows-1252').decode(buffer);
        }

        const lines =
            csvText
                .replace(/^\uFEFF/, '')
                .replace(/\r/g, '')
                .split('\n')
                .filter(l => l.trim().length > 0);

        if (lines.length < 2) {
            throw new Error("Planilha vazia.");
        }

        const parseLine = (line) => {

            const cols = [];
            let current = '';
            let insideQuotes = false;

            for (let i = 0; i < line.length; i++) {

                const char = line[i];

                if (char === '"') {

                    if (insideQuotes && line[i + 1] === '"') {
                        current += '"';
                        i++;
                    } else {
                        insideQuotes = !insideQuotes;
                    }

                } else if (char === ';' && !insideQuotes) {

                    cols.push(current.trim());
                    current = '';

                } else {

                    current += char;

                }

            }

            cols.push(current.trim());

            return cols;

        };

        const headers =
            parseLine(lines[0]).map(
                h => h
                    .replace(/["\uFEFF]/g, '')
                    .trim()
                    .toLowerCase()
            );

        const idCol =
            headers.findIndex(h =>
                h === 'codigos de pedidos' ||
                h === 'códigos de pedidos' ||
                h === 'codigo de pedidos' ||
                h === 'código de pedidos'
            );

        const statCol =
            headers.findIndex(h =>
                h === 'status da entrega'
            );

        if (idCol === -1 || statCol === -1) {
            throw new Error("Colunas da planilha não encontradas.");
        }

        let orderStatus = null;

        for (let i = 1; i < lines.length; i++) {

            const cols = parseLine(lines[i]);

            const rowId = cols[idCol]
                ? cols[idCol]
                    .replace(/["']/g, '')
                    .trim()
                    .toUpperCase()
                : '';

            if (rowId === code) {

                orderStatus =
                    cols[statCol]
                        ? cols[statCol]
                            .replace(/["']/g, '')
                            .trim()
                        : '';

                break;

            }

        }

        if (!orderStatus) {

            if (resultDiv) {
                resultDiv.style.display = 'none';
            }

            if (errorDiv) {
                errorDiv.style.display = 'block';
            }

            return;

        }

        if (resultDiv) {
            resultDiv.style.display = 'block';
        }

        if (errorDiv) {
            errorDiv.style.display = 'none';
        }

        const orderIdSpan =
            document.getElementById('track-order-id');

        if (orderIdSpan) {
            orderIdSpan.innerText = '#' + code;
        }

        const statusBadge =
            document.getElementById('track-status-badge');

        if (statusBadge) {
            statusBadge.innerText = orderStatus;
        }

        updateTimelineVisuals(orderStatus);

    } catch (e) {

        console.error(
            "Erro ao consultar o Google Sheets:",
            e
        );

        if (resultDiv) {
            resultDiv.style.display = 'none';
        }

        if (errorDiv) {
            errorDiv.style.display = 'block';
        }

    }

}


function updateTimelineVisuals(currentStatus) {

    const stages = [
        'Recebido',
        'Em Separação',
        'Saiu p/ Entrega',
        'Entregue'
    ];

    const currentIndex =
        stages.findIndex(
            s =>
                s.toLowerCase() ===
                currentStatus.toLowerCase()
        );

    const activeIdx =
        currentIndex !== -1
            ? currentIndex
            : 0;

    for (let i = 1; i <= 4; i++) {

        const stepElement =
            document.querySelector(
                `.timeline-step.step-${i}`
            );

        if (!stepElement) continue;

        stepElement.classList.remove(
            'completed',
            'current',
            'active'
        );

        if (i - 1 < activeIdx) {

            stepElement.classList.add(
                'completed'
            );

        } else if (i - 1 === activeIdx) {

            stepElement.classList.add(
                'current',
                'active'
            );

        }

    }

}