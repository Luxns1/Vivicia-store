const PHONE_NUMBER = "558591251320";

const GOOGLE_SHEETS_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vR7PJLBEA-DSFQYrozFbAJgvL00ZEHptPlNWIvdjM2m5m0WeCj_gm-P6fj-Xw7_sg7SMYz_kg6JIlao/pub?gid=0&single=true&output=csv";


let cart = [];
let allProducts = [];
let selectedBrand = "todas";
let searchQuery = "";


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    loadProducts();


    const searchInput =
        document.getElementById("search-input");

    const clearBtn =
        document.getElementById("btn-clear-search");


    searchInput?.addEventListener("input", (e) => {

        searchQuery =
            e.target.value
                .toLowerCase()
                .trim();

        if (clearBtn) {
            clearBtn.style.display =
                searchQuery ? "block" : "none";
        }

        applyFilters();

    });


    clearBtn?.addEventListener("click", () => {

        if (searchInput) {
            searchInput.value = "";
        }

        searchQuery = "";

        if (clearBtn) {
            clearBtn.style.display = "none";
        }

        applyFilters();

    });


    document
        .getElementById("btn-whatsapp")
        ?.addEventListener(
            "click",
            sendToWhatsApp
        );


    document
        .getElementById("btn-whatsapp-modal")
        ?.addEventListener(
            "click",
            sendToWhatsApp
        );


    document
        .getElementById("cart-info-trigger")
        ?.addEventListener(
            "click",
            openModal
        );


    document
        .getElementById("close-modal")
        ?.addEventListener(
            "click",
            closeModal
        );


    document
        .getElementById("cart-modal")
        ?.addEventListener("click", (e) => {

            if (e.target.id === "cart-modal") {
                closeModal();
            }

        });


    /* RASTREAMENTO */

    document
        .getElementById("btn-open-tracking")
        ?.addEventListener(
            "click",
            openTrackingModal
        );


    document
        .getElementById("close-tracking-modal")
        ?.addEventListener(
            "click",
            closeTrackingModal
        );


    document
        .getElementById("btn-search-tracking")
        ?.addEventListener(
            "click",
            searchOrderStatus
        );


    document
        .getElementById("tracking-modal")
        ?.addEventListener("click", (e) => {

            if (e.target.id === "tracking-modal") {
                closeTrackingModal();
            }

        });


    /* DETALHES DO PRODUTO */

    document
        .getElementById("close-detail-modal")
        ?.addEventListener(
            "click",
            closeDetailModal
        );


    document
        .getElementById("product-detail-modal")
        ?.addEventListener("click", (e) => {

            if (
                e.target.id ===
                "product-detail-modal"
            ) {
                closeDetailModal();
            }

        });


    /* CEP */

    const cepInput =
        document.getElementById("client-cep");


    cepInput?.addEventListener(
        "blur",
        function () {

            const cep =
                this.value.replace(
                    /\D/g,
                    ""
                );


            if (cep.length !== 8) {
                return;
            }


            fetch(
                `https://viacep.com.br/ws/${cep}/json/`
            )
                .then(response => {

                    if (!response.ok) {
                        throw new Error(
                            "Erro ao consultar CEP"
                        );
                    }

                    return response.json();

                })
                .then(data => {

                    if (data.erro) {

                        alert(
                            "CEP não encontrado. Verifique os números digitados."
                        );

                        return;
                    }


                    const addressInput =
                        document.getElementById(
                            "client-address"
                        );


                    if (addressInput) {

                        addressInput.value =
                            `${data.logradouro}, Bairro: ${data.bairro}, ${data.localidade} - ${data.uf} (CEP: ${data.cep}) - `;

                        addressInput.focus();

                    }

                })
                .catch(error => {

                    console.error(
                        "Erro ao consultar o CEP:",
                        error
                    );

                });

        }
    );

});


/* =========================================================
   PRODUTOS
========================================================= */

async function loadProducts() {

    try {

        const response =
            await fetch(
                "Produtos%20disponiveis(Pro%20site).csv"
            );


        if (!response.ok) {

            console.error(
                `Erro ao carregar o CSV local! Status HTTP: ${response.status}`
            );


            const grid =
                document.getElementById(
                    "product-grid"
                );


            if (grid) {

                grid.innerHTML = `
                    <p style="
                        text-align:center;
                        width:100%;
                        color:#8a3b50;
                        padding:20px;
                    ">
                        Erro ao carregar o arquivo CSV.
                        Verifique o nome exato do arquivo.
                    </p>
                `;

            }

            return;
        }


        const buffer =
            await response.arrayBuffer();


        let csvText =
            new TextDecoder("utf-8")
                .decode(buffer);


        if (csvText.includes("\ufffd")) {

            csvText =
                new TextDecoder(
                    "iso-8859-1"
                ).decode(buffer);

        }


        allProducts =
            parseCSV(csvText);


        if (allProducts.length === 0) {

            console.error(
                "Nenhum produto encontrado."
            );

            return;
        }


        renderBrandFilters(
            allProducts
        );


        applyFilters();

    } catch (error) {

        console.error(
            "Erro ao carregar produtos:",
            error
        );

    }

}


/* =========================================================
   PARSER CSV
========================================================= */

function parseCSV(csvText) {

    const lines =
        csvText
            .replace(/\r/g, "")
            .split("\n")
            .map(line => line.trim())
            .filter(line => line.length > 0);


    if (lines.length <= 1) {
        return [];
    }


    const products = [];


    for (
        let i = 1;
        i < lines.length;
        i++
    ) {

        const values =
            lines[i]
                .split(";")
                .map(value =>
                    value
                        .replace(
                            /^["']|["']$/g,
                            ""
                        )
                        .trim()
                );


        const id =
            values[0] || String(i);


        const brand =
            values[1] || "Vivícia";


        const name =
            values[2] || "";


        let rawPrice =
            values[3] || "0";


        rawPrice =
            rawPrice
                .replace("R$", "")
                .replace(/\s/g, "");


        if (
            rawPrice.includes(",") &&
            rawPrice.includes(".")
        ) {

            rawPrice =
                rawPrice
                    .replace(/\./g, "")
                    .replace(",", ".");

        } else if (
            rawPrice.includes(",")
        ) {

            rawPrice =
                rawPrice.replace(
                    ",",
                    "."
                );

        }


        const price =
            parseFloat(rawPrice);


        const image =
            values[4] || "";


        if (
            name &&
            !isNaN(price)
        ) {

            products.push({
                id,
                brand,
                name,
                price,
                image
            });

        }

    }


    return products;
}


/* =========================================================
   IMAGENS
========================================================= */

function getGenericImageForProduct(
    productName,
    brandName
) {

    const name =
        productName.toLowerCase();


    const images = {

        esfoliante:
            "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=500&q=80",

        locao_creme:
            "https://images.unsplash.com/photo-1608248597263-0007823f6d71?auto=format&fit=crop&w=500&q=80",

        sabonete:
            "https://images.unsplash.com/photo-1607006344380-b6775a0824a7?auto=format&fit=crop&w=500&q=80",

        serum:
            "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=500&q=80",

        gloss_lip:
            "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=500&q=80",

        cabelo:
            "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=500&q=80",

        kit:
            "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=500&q=80",

        perfume:
            "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=500&q=80"

    };


    if (name.includes("kit")) {
        return images.kit;
    }


    if (
        name.includes("gloss") ||
        name.includes("lip") ||
        name.includes("fruit juice")
    ) {
        return images.gloss_lip;
    }


    if (name.includes("esfoliante")) {
        return images.esfoliante;
    }


    if (
        name.includes("serum") ||
        name.includes("sérum")
    ) {
        return images.serum;
    }


    if (
        name.includes("reparador") ||
        name.includes("pontas") ||
        name.includes("shampoo") ||
        name.includes("capilar")
    ) {
        return images.cabelo;
    }


    if (
        name.includes("sabonete") ||
        name.includes("limpeza")
    ) {
        return images.sabonete;
    }


    if (
        name.includes("loção") ||
        name.includes("locao") ||
        name.includes("creme") ||
        name.includes("manteiga") ||
        name.includes("gel") ||
        name.includes("bumbum") ||
        name.includes("firmador")
    ) {
        return images.locao_creme;
    }


    if (
        name.includes("perfume") ||
        name.includes("fragrância") ||
        name.includes("fragrancia")
    ) {
        return images.perfume;
    }


    return `
        https://placehold.co/400x350/f7e6e8/8a3b50?text=${
            encodeURIComponent(
                brandName.toUpperCase()
            )
        }
    `;
}


/* =========================================================
   FILTROS
========================================================= */

function renderBrandFilters(products) {

    const brandContainer =
        document.getElementById(
            "brand-filters"
        );


    if (!brandContainer) {
        return;
    }


    const brandsSet =
        new Set(
            products
                .map(
                    product =>
                        product.brand
                )
                .filter(
                    brand =>
                        brand.length > 0
                )
        );


    const uniqueBrands =
        Array.from(brandsSet);


    let html = `
        <button
            class="brand-btn active"
            data-brand="todas"
            type="button"
        >
            Todas as Marcas
        </button>
    `;


    uniqueBrands.forEach(brand => {

        html += `
            <button
                class="brand-btn"
                data-brand="${escapeHTML(brand)}"
                type="button"
            >
                ${escapeHTML(brand)}
            </button>
        `;

    });


    brandContainer.innerHTML =
        html;


    document
        .querySelectorAll(
            ".brand-btn"
        )
        .forEach(btn => {

            btn.addEventListener(
                "click",
                e => {

                    document
                        .querySelectorAll(
                            ".brand-btn"
                        )
                        .forEach(
                            b =>
                                b.classList.remove(
                                    "active"
                                )
                        );


                    e.currentTarget
                        .classList.add(
                            "active"
                        );


                    selectedBrand =
                        e.currentTarget
                            .getAttribute(
                                "data-brand"
                            ) ||
                        "todas";


                    applyFilters();

                }
            );

        });

}


function applyFilters() {

    let filtered =
        allProducts;


    if (
        selectedBrand !==
        "todas"
    ) {

        filtered =
            filtered.filter(
                product =>
                    product.brand
                        .toLowerCase() ===
                    selectedBrand
                        .toLowerCase()
            );

    }


    if (searchQuery) {

        filtered =
            filtered.filter(
                product =>
                    product.name
                        .toLowerCase()
                        .includes(
                            searchQuery
                        ) ||
                    product.brand
                        .toLowerCase()
                        .includes(
                            searchQuery
                        )
            );

    }


    const countElement =
        document.getElementById(
            "results-count"
        );


    if (countElement) {

        countElement.innerText =
            `${filtered.length} produto(s) encontrado(s)`;

    }


    const noProductsMsg =
        document.getElementById(
            "no-products-msg"
        );


    if (noProductsMsg) {

        noProductsMsg.style.display =
            filtered.length === 0
                ? "block"
                : "none";

    }


    renderProducts(filtered);

}


/* =========================================================
   PRODUTOS NA TELA
========================================================= */

function renderProducts(products) {

    const mainGrid =
        document.getElementById(
            "product-grid"
        );


    if (!mainGrid) {
        return;
    }


    mainGrid.innerHTML = "";


    products.forEach(product => {

        const fallbackImage =
            `https://placehold.co/400x350/f7e6e8/8a3b50?text=${
                encodeURIComponent(
                    product.brand.toUpperCase()
                )
            }`;


        const productImage =
            product.image ||
            getGenericImageForProduct(
                product.name,
                product.brand
            );


        const cardHTML = `
            <div
                class="product-card"
                data-id="${escapeHTML(String(product.id))}"
                data-name="${escapeHTML(product.name)}"
                data-brand="${escapeHTML(product.brand)}"
                data-price="${product.price}"
            >

                <div class="product-image-container">

                    <img
                        src="${escapeHTML(productImage)}"
                        alt="${escapeHTML(product.name)}"
                        class="product-image"
                        loading="lazy"
                        onerror="this.src='${fallbackImage}'"
                    >

                </div>

                <div class="product-details">

                    <span class="product-brand">
                        ${escapeHTML(product.brand)}
                    </span>

                    <h3 class="product-name">
                        ${escapeHTML(product.name)}
                    </h3>

                    <div class="product-pricing">

                        <span class="current-price">
                            R$ ${product.price
                                .toFixed(2)
                                .replace(".", ",")}
                        </span>

                    </div>

                    <button
                        class="btn-add-cart"
                        type="button"
                    >
                        Adicionar ao Carrinho
                    </button>

                </div>

            </div>
        `;


        mainGrid.insertAdjacentHTML(
            "beforeend",
            cardHTML
        );

    });


    document
        .querySelectorAll(
            ".product-card"
        )
        .forEach(card => {

            card.addEventListener(
                "click",
                e => {

                    if (
                        e.target.closest(
                            ".btn-add-cart"
                        )
                    ) {
                        return;
                    }


                    const id =
                        card.getAttribute(
                            "data-id"
                        );


                    const name =
                        card.getAttribute(
                            "data-name"
                        );


                    const brand =
                        card.getAttribute(
                            "data-brand"
                        );


                    const price =
                        parseFloat(
                            card.getAttribute(
                                "data-price"
                            )
                        );


                    const image =
                        card.querySelector(
                            ".product-image"
                        )?.src || "";


                    openDetailModal({
                        id,
                        name,
                        brand,
                        price,
                        image
                    });

                }
            );

        });


    document
        .querySelectorAll(
            ".btn-add-cart"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                addToCart
            );

        });

}


/* =========================================================
   MODAL DO PRODUTO
========================================================= */

function openDetailModal(product) {

    const modal =
        document.getElementById(
            "product-detail-modal"
        );


    if (!modal) {
        return;
    }


    /*
     * IDs CORRETOS DO SEU HTML
     */

    const nameElement =
        document.getElementById(
            "detail-name"
        );


    const brandElement =
        document.getElementById(
            "detail-brand"
        );


    const priceElement =
        document.getElementById(
            "detail-price"
        );


    const descElement =
        document.getElementById(
            "detail-desc"
        );


    const imageElement =
        document.getElementById(
            "detail-img"
        );


    const addBtn =
        document.getElementById(
            "detail-btn-add"
        );


    if (nameElement) {
        nameElement.innerText =
            product.name;
    }


    if (brandElement) {
        brandElement.innerText =
            product.brand;
    }


    if (priceElement) {

        priceElement.innerText =
            `R$ ${Number(product.price)
                .toFixed(2)
                .replace(".", ",")}`;

    }


    if (imageElement) {

        imageElement.src =
            product.image ||
            getGenericImageForProduct(
                product.name,
                product.brand
            );

        imageElement.alt =
            product.name;

    }


    if (descElement) {

        descElement.innerText =
            `O ${product.name} da marca ${product.brand} foi desenvolvido com alto padrão de qualidade para garantir a melhor experiência em cuidados diários, oferecendo eficácia e ótimo rendimento.`;

    }


    if (addBtn) {

        addBtn.onclick = () => {

            const existingItem =
                cart.find(
                    item =>
                        item.id ===
                        product.id
                );


            if (existingItem) {

                existingItem.quantity += 1;

            } else {

                cart.push({
                    id: product.id,
                    name: product.name,
                    price: Number(
                        product.price
                    ),
                    quantity: 1
                });

            }


            updateCartUI();

            closeDetailModal();

            openModal();

        };

    }


    modal.classList.add("active");

}


function closeDetailModal() {

    document
        .getElementById(
            "product-detail-modal"
        )
        ?.classList.remove(
            "active"
        );

}


/* =========================================================
   CARRINHO
========================================================= */

function addToCart(event) {

    const card =
        event.currentTarget.closest(
            ".product-card"
        );


    if (!card) {
        return;
    }


    const id =
        card.getAttribute(
            "data-id"
        );


    const name =
        card.getAttribute(
            "data-name"
        );


    const price =
        parseFloat(
            card.getAttribute(
                "data-price"
            )
        );


    const existingItem =
        cart.find(
            item =>
                item.id === id
        );


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


function changeQuantity(
    id,
    change
) {

    const item =
        cart.find(
            item =>
                item.id === id
        );


    if (!item) {
        return;
    }


    item.quantity += change;


    if (item.quantity <= 0) {

        removeFromCart(id);

    } else {

        updateCartUI();

    }

}


function removeFromCart(id) {

    cart =
        cart.filter(
            item =>
                item.id !== id
        );


    updateCartUI();

}


function updateCartUI() {

    const cartCountElement =
        document.getElementById(
            "cart-count"
        );


    const cartTotalElement =
        document.getElementById(
            "cart-total-value"
        );


    const modalTotalElement =
        document.getElementById(
            "modal-total-value"
        );


    const cartItemsContainer =
        document.getElementById(
            "cart-items-container"
        );


    const totalItems =
        cart.reduce(
            (acc, item) =>
                acc + item.quantity,
            0
        );


    const totalPrice =
        cart.reduce(
            (acc, item) =>
                acc +
                item.price *
                    item.quantity,
            0
        );


    const formattedTotal =
        `R$ ${totalPrice
            .toFixed(2)
            .replace(".", ",")}`;


    if (cartCountElement) {
        cartCountElement.innerText =
            totalItems;
    }


    if (cartTotalElement) {
        cartTotalElement.innerText =
            formattedTotal;
    }


    if (modalTotalElement) {
        modalTotalElement.innerText =
            formattedTotal;
    }


    if (!cartItemsContainer) {
        return;
    }


    if (cart.length === 0) {

        cartItemsContainer.innerHTML = `
            <p class="cart-empty-text">
                Seu carrinho está vazio.
            </p>
        `;

        return;
    }


    cartItemsContainer.innerHTML =
        cart.map(item => `

            <div class="cart-item">

                <div class="cart-item-info">

                    <h4>
                        ${escapeHTML(item.name)}
                    </h4>

                    <p>
                        R$ ${item.price
                            .toFixed(2)
                            .replace(".", ",")} un.
                    </p>

                </div>

                <div class="cart-item-actions">

                    <button
                        class="qty-btn"
                        type="button"
                        onclick="changeQuantity('${escapeJS(String(item.id))}', -1)"
                    >
                        -
                    </button>

                    <span>
                        ${item.quantity}
                    </span>

                    <button
                        class="qty-btn"
                        type="button"
                        onclick="changeQuantity('${escapeJS(String(item.id))}', 1)"
                    >
                        +
                    </button>

                    <button
                        class="remove-btn"
                        type="button"
                        onclick="removeFromCart('${escapeJS(String(item.id))}')"
                    >
                        🗑️
                    </button>

                </div>

            </div>

        `).join("");

}


/* =========================================================
   MODAL DO CARRINHO
========================================================= */

function openModal() {

    document
        .getElementById(
            "cart-modal"
        )
        ?.classList.add(
            "active"
        );

}


function closeModal() {

    document
        .getElementById(
            "cart-modal"
        )
        ?.classList.remove(
            "active"
        );

}


/* =========================================================
   MODAL DE RASTREAMENTO
========================================================= */

function openTrackingModal() {

    document
        .getElementById(
            "tracking-modal"
        )
        ?.classList.add(
            "active"
        );

}


function closeTrackingModal() {

    document
        .getElementById(
            "tracking-modal"
        )
        ?.classList.remove(
            "active"
        );

}


/* =========================================================
   WHATSAPP
========================================================= */

function sendToWhatsApp() {

    if (cart.length === 0) {

        alert(
            "Seu carrinho está vazio! Adicione produtos antes de finalizar."
        );

        return;
    }


    const addressInput =
        document.getElementById(
            "client-address"
        );


    const clientAddress =
        addressInput
            ? addressInput.value.trim()
            : "";


    if (!clientAddress) {

        alert(
            "Por favor, preencha o seu endereço de entrega antes de finalizar o pedido!"
        );

        openModal();

        addressInput?.focus();

        return;
    }


    const orderId =
        "VV-" +
        Math.floor(
            1000 +
            Math.random() *
                9000
        );


    let total = 0;


    let message =
        `🛍️ *NOVO PEDIDO (#${orderId}) - VIVÍCIA*\n\n`;


    message +=
        "*Itens do Pedido:*\n";


    cart.forEach(item => {

        const itemTotal =
            item.price *
            item.quantity;


        total += itemTotal;


        message +=
            `• ${item.quantity}x ${item.name} - R$ ${itemTotal
                .toFixed(2)
                .replace(".", ",")}\n`;

    });


    message +=
        `\n📍 *Endereço de Entrega:* ${clientAddress}\n`;


    message +=
        `💰 *Total:* R$ ${total
            .toFixed(2)
            .replace(".", ",")}\n`;


    message +=
        `📦 *Código do Pedido:* ${orderId}\n\n`;


    message +=
        "Olá! Gostaria de finalizar o pagamento do meu pedido.";


    const encodedMessage =
        encodeURIComponent(
            message
        );


    const whatsappUrl =
        `https://wa.me/${PHONE_NUMBER}?text=${encodedMessage}`;


    cart = [];


    if (addressInput) {
        addressInput.value = "";
    }


    const cepInput =
        document.getElementById(
            "client-cep"
        );


    if (cepInput) {
        cepInput.value = "";
    }


    updateCartUI();

    closeModal();


    window.open(
        whatsappUrl,
        "_blank"
    );

}


/* =========================================================
   RASTREAMENTO - GOOGLE SHEETS
========================================================= */

async function searchOrderStatus() {

    const codeInput =
        document.getElementById(
            "tracking-input"
        );


    const resultDiv =
        document.getElementById(
            "tracking-result"
        );


    const errorDiv =
        document.getElementById(
            "tracking-error"
        );


    if (!codeInput) {
        return;
    }


    const code =
        codeInput.value
            .trim()
            .toUpperCase();


    if (!code) {

        alert(
            "Por favor, digite o código do pedido."
        );

        return;
    }


    try {

        /*
         * O Google Sheets é consultado
         * toda vez que o cliente pesquisa.
         */

        const response =
            await fetch(
                GOOGLE_SHEETS_CSV_URL +
                "&t=" +
                Date.now()
            );


        if (!response.ok) {

            throw new Error(
                "Não foi possível acessar a planilha."
            );

        }


        const csvText =
            await response.text();


        const rows =
            parseGoogleCSV(csvText);


        if (rows.length < 2) {

            throw new Error(
                "Planilha vazia."
            );

        }


        const headers =
            rows[0].map(
                header =>
                    header
                        .trim()
                        .toLowerCase()
            );


        const idCol =
            headers.findIndex(
                header =>
                    header.includes(
                        "codigos de pedidos"
                    ) ||
                    header.includes(
                        "códigos de pedidos"
                    ) ||
                    header.includes(
                        "codigo de pedidos"
                    ) ||
                    header.includes(
                        "código de pedidos"
                    )
            );


        const statusCol =
            headers.findIndex(
                header =>
                    header.includes(
                        "status da entrega"
                    )
            );


        if (
            idCol === -1 ||
            statusCol === -1
        ) {

            throw new Error(
                "As colunas de código ou status não foram encontradas."
            );

        }


        let orderStatus = null;


        for (
            let i = 1;
            i < rows.length;
            i++
        ) {

            const row =
                rows[i];


            const rowCode =
                row[idCol]
                    ? row[idCol]
                        .trim()
                        .toUpperCase()
                    : "";


            if (
                rowCode === code
            ) {

                orderStatus =
                    row[statusCol]
                        ? row[statusCol].trim()
                        : "Recebido";

                break;

            }

        }


        if (!orderStatus) {

            if (resultDiv) {
                resultDiv.style.display =
                    "none";
            }


            if (errorDiv) {
                errorDiv.style.display =
                    "block";
            }


            return;
        }


        if (resultDiv) {
            resultDiv.style.display =
                "block";
        }


        if (errorDiv) {
            errorDiv.style.display =
                "none";
        }


        const orderIdSpan =
            document.getElementById(
                "track-order-id"
            );


        if (orderIdSpan) {

            orderIdSpan.innerText =
                "#" + code;

        }


        const statusBadge =
            document.getElementById(
                "track-status-badge"
            );


        if (statusBadge) {

            statusBadge.innerText =
                orderStatus;

        }


        updateTimelineVisuals(
            orderStatus
        );


    } catch (error) {

        console.error(
            "Erro ao consultar pedido:",
            error
        );


        if (resultDiv) {
            resultDiv.style.display =
                "none";
        }


        if (errorDiv) {

            errorDiv.style.display =
                "block";

            errorDiv.innerHTML = `
                <p>
                    Não foi possível consultar o pedido agora.
                    Tente novamente em alguns instantes.
                </p>
            `;

        }

    }

}


/* =========================================================
   LEITOR CSV DO GOOGLE
========================================================= */

function parseGoogleCSV(csvText) {

    const rows = [];

    let row = [];

    let value = "";

    let insideQuotes = false;


    for (
        let i = 0;
        i < csvText.length;
        i++
    ) {

        const char =
            csvText[i];


        const next =
            csvText[i + 1];


        if (
            char === '"' &&
            insideQuotes &&
            next === '"'
        ) {

            value += '"';

            i++;

            continue;

        }


        if (char === '"') {

            insideQuotes =
                !insideQuotes;

            continue;

        }


        if (
            char === "," &&
            !insideQuotes
        ) {

            row.push(value);

            value = "";

            continue;

        }


        if (
            (char === "\n" ||
                char === "\r") &&
            !insideQuotes
        ) {

            if (
                char === "\r" &&
                next === "\n"
            ) {
                i++;
            }


            row.push(value);

            rows.push(row);

            row = [];

            value = "";

            continue;

        }


        value += char;

    }


    if (
        value.length > 0 ||
        row.length > 0
    ) {

        row.push(value);

        rows.push(row);

    }


    return rows.filter(
        r =>
            r.some(
                cell =>
                    cell.trim() !== ""
            )
    );

}


/* =========================================================
   TIMELINE
========================================================= */

function updateTimelineVisuals(
    currentStatus
) {

    const stages = [
        "Recebido",
        "Em Separação",
        "Saiu p/ Entrega",
        "Entregue"
    ];


    const normalizedStatus =
        String(
            currentStatus
        )
            .trim()
            .toLowerCase();


    const currentIndex =
        stages.findIndex(
            stage =>
                stage
                    .toLowerCase() ===
                normalizedStatus
        );


    const activeIdx =
        currentIndex !== -1
            ? currentIndex
            : 0;


    for (
        let i = 1;
        i <= 4;
        i++
    ) {

        const stepElement =
            document.querySelector(
                `.timeline-step.step-${i}`
            );


        if (!stepElement) {
            continue;
        }


        stepElement.classList.remove(
            "completed",
            "current",
            "active"
        );


        if (
            i - 1 <
            activeIdx
        ) {

            stepElement.classList.add(
                "completed"
            );

        } else if (
            i - 1 ===
            activeIdx
        ) {

            stepElement.classList.add(
                "current",
                "active"
            );

        }

    }

}


/* =========================================================
   SEGURANÇA
========================================================= */

function escapeHTML(value) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


function escapeJS(value) {

    return String(value)
        .replace(
            /\\/g,
            "\\\\"
        )
        .replace(
            /'/g,
            "\\'"
        );

}