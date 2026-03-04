// ==== Configurações ====
const WHATSAPP_NUMBER = "5599991756968";

// ==== Estado da Aplicação ====
let catalogItems = [];
let cart = {}; // { productId: qt_in_cart }
let quantities = {}; // { productId: current_display_qty } mantido igual ao site 1 para os cards

// ==== Elementos do DOM ====
const catalogGrid = document.getElementById('catalog-grid');
const cartBar = document.getElementById('cart-bar');
const cartBadge = document.getElementById('cart-badge');
const cartTotalPrice = document.getElementById('cart-total-price');
const viewCartBtn = document.getElementById('view-cart-btn');

// Elementos do Modal
const cartModal = document.getElementById('cart-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const cartItemsList = document.getElementById('cart-items-list');
const modalTotalPrice = document.getElementById('modal-total-price');
const sendWhatsappBtn = document.getElementById('send-whatsapp-btn');
const toastElement = document.getElementById('toast');

// ==== Inicialização ====
document.addEventListener('DOMContentLoaded', () => {
    createParticles();
    setupEventListeners();
    loadCatalog();

    // Header scroll background effect
    window.addEventListener('scroll', () => {
        const header = document.getElementById('header');
        header.style.boxShadow = window.scrollY > 40 ? '0 4px 40px rgba(0,0,0,0.5)' : '';
    });
});

// ==== Particulars (Hero - Site 1) ====
function createParticles() {
    const container = document.getElementById('heroParticles');
    const emojis = ['🥟', '🍕', '🌭', '🧀', '🍗', '🫔'];
    for (let i = 0; i < 18; i++) {
        const el = document.createElement('span');
        el.className = 'particle';
        el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        el.style.cssText = `
        left: ${Math.random() * 100}%;
        font-size: ${12 + Math.random() * 20}px;
        animation-duration: ${8 + Math.random() * 16}s;
        animation-delay: ${Math.random() * -20}s;
        opacity: 0.12;
        border-radius: 0;
        background: none;
        `;
        container.appendChild(el);
    }
}

// ==== Funções do Catálogo ====
async function loadCatalog() {
    try {
        const response = await fetch('./data/catalog.json');

        if (!response.ok) {
            throw new Error('Falha ao carregar o catálogo');
        }

        const data = await response.json();
        // O json atual nao tem emojis, então preencheremos um fallback para ficar igual o Site 1
        catalogItems = (data.items || []).map(item => ({
            ...item,
            emoji: '🥟',
            category: 'fritos', // default category
            unitLabel: 'por unidade'
        }));

        renderCatalog();

    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        catalogGrid.innerHTML = `
            <div class="loading-state" style="grid-column: 1/-1; text-align:center;">
                <p style="color:red">😞 Desculpe, não conseguimos carregar o cardápio no momento.</p>
                <p style="font-size: 0.8em; margin-top: 10px;">Erro: ${error.message}</p>
            </div>
        `;
    }
}

function formatPrice(price) {
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
}

function getCategoryLabelHTML(cat) {
    const map = { fritos: '🔥 Fritos', assados: '🥐 Assados', caldinhos: '🍲 Caldos', bebidas: '🥤 Bebidas' };
    return map[cat] || `🌟 Destaque`;
}

function renderCatalog(filter = 'todos') {
    catalogGrid.innerHTML = '';

    if (catalogItems.length === 0) {
        catalogGrid.innerHTML = '<div class="loading-state" style="grid-column: 1/-1; text-align:center;"><p>Nenhum produto cadastrado ainda.</p></div>';
        return;
    }

    const filtered = filter === 'todos' ? catalogItems : catalogItems.filter(p => p.category === filter);

    catalogGrid.innerHTML = filtered.map((item, i) => {
        const qty = quantities[item.id] || 1;
        const inCart = (cart[item.id] || 0) > 0;

        return `
        <div class="product-card" id="card-${item.id}" style="animation-delay:${i * 0.06}s">
            ${item.image
                ? `<img class="product-img" src="${item.image}" alt="${item.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
                   <div class="product-emoji-wrap" style="display:none">${item.emoji}</div>`
                : `<div class="product-emoji-wrap">${item.emoji}</div>`
            }
            <div class="product-body">
                <div class="product-category-tag">${getCategoryLabelHTML(item.category)}</div>
                <div class="product-name">${item.name}</div>
                <div class="product-desc">${item.description || ''}</div>
                <div class="product-unit">📦 ${item.unitLabel}</div>
                <div class="product-price">${formatPrice(item.price)}</div>
                
                <div class="product-actions">
                    <div class="qty-control">
                        <button class="qty-btn" onclick="changeQty('${item.id}', -1)" aria-label="Diminuir">&minus;</button>
                        <span class="qty-val" id="qty-${item.id}">${qty}</span>
                        <button class="qty-btn" onclick="changeQty('${item.id}', 1)" aria-label="Aumentar">&plus;</button>
                    </div>
                    <button class="add-btn ${inCart ? 'in-cart' : ''}" id="addBtn-${item.id}" onclick="addToCart('${item.id}')">
                        ${inCart ? '✅ Adicionado' : '+ Adicionar'}
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ==== Funções de Interação na Tela de Catálogo ====
function changeQty(id, delta) {
    quantities[id] = Math.max(1, (quantities[id] || 1) + delta);
    const el = document.getElementById(`qty-${id}`);
    if (el) el.textContent = quantities[id];
}

function addToCart(id) {
    const amountToAdd = quantities[id] || 1;
    cart[id] = (cart[id] || 0) + amountToAdd;
    quantities[id] = 1; // reset back to 1

    updateCartState();
    showToast('✅ Adicionado ao pedido!');

    // update current button view without full rerender if possible
    const btn = document.getElementById(`addBtn-${id}`);
    if (btn) {
        btn.classList.add('in-cart');
        btn.innerHTML = '✅ Adicionado';
    }
    const el = document.getElementById(`qty-${id}`);
    if (el) el.textContent = 1;
}

// ==== Funções do Carrinho & Modal ====
function adjustCart(id, delta) {
    if (cart[id]) {
        cart[id] += delta;
        if (cart[id] <= 0) {
            delete cart[id];

            // Reverte botao na interface principal se zerar
            const btn = document.getElementById(`addBtn-${id}`);
            if (btn) {
                btn.classList.remove('in-cart');
                btn.innerHTML = '+ Adicionar';
            }
        }
        updateCartState();

        if (cartModal.classList.contains('active')) {
            renderModalCart();
            if (Object.keys(cart).length === 0) {
                closeModal();
            }
        }
    }
}

function updateCartState() {
    let totalItems = 0;
    let totalPrice = 0;

    for (const [id, qty] of Object.entries(cart)) {
        const item = catalogItems.find(p => p.id === id);
        if (item) {
            totalItems += qty;
            totalPrice += (item.price * qty);
        }
    }

    // Atualiza a interface
    cartBadge.textContent = totalItems;

    // Animação do badge
    cartBadge.classList.remove('bump');
    void cartBadge.offsetWidth; // trigger reflow
    cartBadge.classList.add('bump');

    cartTotalPrice.textContent = formatPrice(totalPrice);
    modalTotalPrice.textContent = formatPrice(totalPrice);

    if (totalItems > 0) {
        cartBar.classList.remove('hidden');
    } else {
        cartBar.classList.add('hidden');
    }
}

function openModal() {
    if (Object.keys(cart).length === 0) return;
    renderModalCart();
    cartModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    cartModal.classList.remove('active');
    document.body.style.overflow = '';
}

function renderModalCart() {
    cartItemsList.innerHTML = '';

    for (const [id, qty] of Object.entries(cart)) {
        const item = catalogItems.find(p => p.id === id);
        if (item) {
            const row = document.createElement('div');
            row.className = 'cart-item-row';
            row.innerHTML = `
                ${item.image ? `<img src="${item.image}" class="cart-item-img">` : `<div class="cart-item-img" style="display:flex;align-items:center;justify-content:center;font-size:2rem;">${item.emoji}</div>`}
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${formatPrice(item.price)} un</div>
                </div>
                <!-- Re-utilizando controles com estilo escuro adaptado -->
                <div class="qty-control" style="transform: scale(0.9); background: rgba(0,0,0,0.2);">
                    <button class="qty-btn" onclick="adjustCart('${item.id}', -1)" style="color: #fff;">&minus;</button>
                    <span class="qty-val" style="color: #fff;">${qty}</span>
                    <button class="qty-btn" onclick="adjustCart('${item.id}', 1)" style="color: #fff;">&plus;</button>
                </div>
            `;
            cartItemsList.appendChild(row);
        }
    }
}

// ==== Geração do link para WhatsApp (Estilo Novo) ====
function generateWhatsAppMessage() {
    let lines = "🛒 *PEDIDO - Salgadinhos & Cia*\\n";
    lines += "━━━━━━━━━━━━━━━━━━━━━━━━\\n\\n";
    let totalPrice = 0;

    for (const [id, qty] of Object.entries(cart)) {
        const item = catalogItems.find(p => p.id === id);
        if (item) {
            const subtotal = item.price * qty;
            totalPrice += subtotal;
            lines += `▪ *${item.name}*\\n`;
            lines += `   Qtd: ${qty} × ${formatPrice(item.price)} = ${formatPrice(subtotal)}\\n\\n`;
        }
    }

    lines += `━━━━━━━━━━━━━━━━━━━━━━━━\\n`;
    lines += `💰 *TOTAL: ${formatPrice(totalPrice)}*\\n\\n`;

    const dateStr = new Date().toLocaleString('pt-BR');
    lines += `📅 Pedido feito em: ${dateStr}\\n\\n`;
    lines += `_Aguardo confirmação! 😊_`;

    // Removemos os escape strings para URL formatar certo
    lines = lines.replace(/\\n/g, '\n');
    return encodeURIComponent(lines);
}

function sendToWhatsApp() {
    if (Object.keys(cart).length === 0) return;

    const text = generateWhatsAppMessage();
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;

    // Zera o carrinho após envio
    cart = {};
    updateCartState();
    renderCatalog(); // reseta os botões de adicionado na grid
    closeModal();

    window.open(url, '_blank');
}

// ==== Utilitários ====
function showToast(message) {
    toastElement.textContent = message;
    toastElement.classList.add('show');
    clearTimeout(toastElement._timer);
    toastElement._timer = setTimeout(() => {
        toastElement.classList.remove('show');
    }, 3000);
}

// ==== Event Listeners Setup ====
function setupEventListeners() {
    viewCartBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    sendWhatsappBtn.addEventListener('click', sendToWhatsApp);

    // Close modal when clicking outside content
    cartModal.addEventListener('click', (e) => {
        if (e.target === cartModal) {
            closeModal();
        }
    });

    // Filtros de categorias
    const categoryTabs = document.getElementById('categoryTabs');
    if (categoryTabs) {
        categoryTabs.addEventListener('click', e => {
            const btn = e.target.closest('.tab-btn');
            if (!btn) return;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderCatalog(btn.dataset.cat);
        });
    }

    // Hamburger menu header
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('open');
        });
    }

    // Expose functions globally for inline HTML clicks
    window.changeQty = changeQty;
    window.addToCart = addToCart;
    window.adjustCart = adjustCart;
}
