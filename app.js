// Kiosk State Management
let menuData = [];
let catsData = [];
let cart = [];
let currentCategory = 'time';
let selectedOptionItem = null; // Holds the item currently being customized in a modal
let orderCounter = 1;

// Elements Selectors
const menuItemsContainer = document.getElementById('menu-items-container');
const cartItemsContainer = document.getElementById('cart-items-container');
const totalPriceDisplay = document.getElementById('total-price-display');
const checkoutBtn = document.getElementById('checkout-btn');
const clearCartBtn = document.getElementById('clear-cart-btn');

// Sidebar and Navigation
const navItems = document.querySelectorAll('.sidebar .nav-item');
const tabPanels = document.querySelectorAll('.main-content .tab-panel');
const brandLogo = document.getElementById('brand-logo');

// Modals
const drinkOptionModal = document.getElementById('drink-option-modal');
const treatSafetyModal = document.getElementById('treat-safety-modal');
const receiptModal = document.getElementById('receipt-modal');
const adminPassModal = document.getElementById('admin-pass-modal');

// Admin Elements
const adminLoginTrigger = document.getElementById('admin-login-trigger');
const confirmAdminPassBtn = document.getElementById('confirm-admin-pass-btn');
const adminPasswordInput = document.getElementById('admin-password-input');
const adminPassError = document.getElementById('admin-pass-error');
const exitAdminBtn = document.getElementById('exit-admin-btn');
const adminTabs = document.querySelectorAll('.admin-tab');
const adminPanels = document.querySelectorAll('.admin-panel');

// Forms
const menuForm = document.getElementById('menu-form');
const catForm = document.getElementById('cat-form');

// App Initialization
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  setupEventListeners();
  renderKioskMenu();
  renderCatsGallery();
  updateCartUI();
});

// Load Data (Detect Electron vs Web Browser Browser Mode)
async function loadData() {
  try {
    if (window.api) {
      console.log("Running in Electron mode.");
      menuData = await window.api.readMenu();
      catsData = await window.api.readCats();
    } else {
      console.log("Running in Web Browser mode (GitHub Pages compatible).");
      // Load from LocalStorage or Fallback Defaults
      const savedMenu = localStorage.getItem('cat_cafe_menu');
      const savedCats = localStorage.getItem('cat_cafe_cats');
      
      if (savedMenu) {
        menuData = JSON.parse(savedMenu);
      } else {
        menuData = getDefaultMenu();
        localStorage.setItem('cat_cafe_menu', JSON.stringify(menuData));
      }
      
      if (savedCats) {
        catsData = JSON.parse(savedCats);
      } else {
        catsData = getDefaultCats();
        localStorage.setItem('cat_cafe_cats', JSON.stringify(catsData));
      }
    }
  } catch (error) {
    console.error("Error loading data:", error);
  }
}

// Event Listeners Setup
function setupEventListeners() {
  // Navigation tabs
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  // Logo click triggers admin mode directly for fun (hidden feature)
  brandLogo.addEventListener('click', () => {
    openModal(adminPassModal);
    adminPasswordInput.focus();
  });

  // Category selection tabs
  const categoryButtons = document.querySelectorAll('.category-tab');
  categoryButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      categoryButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.getAttribute('data-category');
      renderKioskMenu();
    });
  });

  // Cart controls
  clearCartBtn.addEventListener('click', () => {
    cart = [];
    updateCartUI();
  });

  checkoutBtn.addEventListener('click', handleCheckout);

  // Admin login trigger
  adminLoginTrigger.addEventListener('click', () => {
    openModal(adminPassModal);
    adminPasswordInput.focus();
  });

  // Admin password confirmation
  confirmAdminPassBtn.addEventListener('click', handleAdminLogin);
  adminPasswordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleAdminLogin();
  });

  // Exit Admin Mode button
  exitAdminBtn.addEventListener('click', () => {
    switchTab('order');
  });

  // Admin Tab Switchers (Menu vs Cats)
  adminTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      adminTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const targetPanel = tab.getAttribute('data-admin-panel');
      adminPanels.forEach(p => p.classList.remove('active'));
      document.getElementById(`admin-panel-${targetPanel}`).classList.add('active');
    });
  });

  // Modals Close buttons
  const closeModalButtons = document.querySelectorAll('.close-modal-btn');
  closeModalButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-modal');
      closeModalById(modalId);
    });
  });

  // Drink option confirmation
  document.getElementById('confirm-drink-option-btn').addEventListener('click', () => {
    const tempOption = document.querySelector('input[name="drink-temp"]:checked').value;
    addToCartWithOptions(selectedOptionItem, tempOption);
    closeModal(drinkOptionModal);
  });

  // Treat Safety checkbox validation
  const rule1 = document.getElementById('consent-rule-1');
  const rule2 = document.getElementById('consent-rule-2');
  const confirmTreatBtn = document.getElementById('confirm-treat-safety-btn');

  const checkConsent = () => {
    confirmTreatBtn.disabled = !(rule1.checked && rule2.checked);
  };
  rule1.addEventListener('change', checkConsent);
  rule2.addEventListener('change', checkConsent);

  // Treat safety agreement confirmation
  confirmTreatBtn.addEventListener('click', () => {
    addToCartWithOptions(selectedOptionItem, null);
    closeModal(treatSafetyModal);
    // Reset checkboxes
    rule1.checked = false;
    rule2.checked = false;
    confirmTreatBtn.disabled = true;
  });

  // Receipt Close button returns to start
  document.getElementById('receipt-close-btn').addEventListener('click', () => {
    closeModal(receiptModal);
    cart = [];
    updateCartUI();
  });

  // Form resets
  document.getElementById('reset-menu-form-btn').addEventListener('click', resetMenuForm);
  document.getElementById('reset-cat-form-btn').addEventListener('click', resetCatForm);

  // Form saves
  document.getElementById('save-menu-item-btn').addEventListener('click', saveMenuItem);
  document.getElementById('save-cat-btn').addEventListener('click', saveCatProfile);
}

// Switch Tab logic
function switchTab(tabId) {
  navItems.forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  tabPanels.forEach(panel => {
    if (panel.id === `tab-${tabId}`) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });

  // Refresh admin displays if switching to admin tab
  if (tabId === 'admin') {
    renderAdminMenuList();
    renderAdminCatsList();
  }
}

// Render Kiosk Menu Grid
function renderKioskMenu() {
  menuItemsContainer.innerHTML = '';
  const filtered = menuData.filter(item => item.category === currentCategory);

  if (filtered.length === 0) {
    menuItemsContainer.innerHTML = `<p class="text-muted">등록된 상품이 없습니다.</p>`;
    return;
  }

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = `menu-card cat-${item.category}`;
    card.innerHTML = `
      <div class="menu-card-body">
        <span class="menu-item-badge">${getCategoryName(item.category)}</span>
        <h4 class="menu-item-title">${escapeHTML(item.name)}</h4>
        <p class="menu-item-desc">${escapeHTML(item.description)}</p>
      </div>
      <div class="menu-card-footer">
        <span class="menu-item-price">${item.price.toLocaleString()}원</span>
        <button class="menu-item-add-btn">
          <i class="fa-solid fa-plus"></i>
        </button>
      </div>
    `;

    // Add to cart event
    card.addEventListener('click', () => handleAddItemClick(item));
    menuItemsContainer.appendChild(card);
  });
}

// Translate Category values to Korean Labels
function getCategoryName(category) {
  switch (category) {
    case 'time': return '이용 시간';
    case 'drink': return '음료';
    case 'dessert': return '디저트';
    case 'treat': return '고양이 간식';
    default: return '기타';
  }
}

// Handle clicking on menu items
function handleAddItemClick(item) {
  selectedOptionItem = item;

  if (item.category === 'drink' && item.options) {
    // Open drink Hot/Ice dialog
    document.getElementById('drink-option-name').textContent = item.name;
    document.getElementById('drink-option-desc').textContent = item.description;
    openModal(drinkOptionModal);
  } else if (item.category === 'treat' && item.options) {
    // Open cat safety warning dialog
    openModal(treatSafetyModal);
  } else if (item.category === 'time') {
    // Kiosk rule: Time ticket replacement
    const existingTimeIndex = cart.findIndex(i => i.category === 'time');
    if (existingTimeIndex > -1) {
      const currentQty = cart[existingTimeIndex].quantity;
      cart.splice(existingTimeIndex, 1);
      cart.push({ ...item, quantity: currentQty, count: currentQty });
    } else {
      cart.push({ ...item, quantity: 1, count: 1 });
    }
    updateCartUI();
  } else {
    // Direct add for desserts and non-option items
    addToCartWithOptions(item, null);
  }
}

// Add Item to cart with specified option
function addToCartWithOptions(item, option) {
  const cartKey = option ? `${item.id}-${option}` : item.id;
  const existingIndex = cart.findIndex(cartItem => {
    const itemKey = cartItem.option ? `${cartItem.id}-${cartItem.option}` : cartItem.id;
    return itemKey === cartKey;
  });

  if (existingIndex > -1) {
    cart[existingIndex].quantity += 1;
    if (cart[existingIndex].category === 'time') {
      cart[existingIndex].count = cart[existingIndex].quantity;
    }
  } else {
    cart.push({
      ...item,
      option: option,
      quantity: 1,
      count: item.category === 'time' ? 1 : undefined
    });
  }
  updateCartUI();
}

// Update Cart View and Price calculations
function updateCartUI() {
  cartItemsContainer.innerHTML = '';
  
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="cart-empty-state">
        <i class="fa-solid fa-cart-shopping"></i>
        <p>장바구니가 비어 있습니다.<br>이용권을 선택하여 주문을 시작해 주세요!</p>
      </div>
    `;
    totalPriceDisplay.textContent = '0원';
    checkoutBtn.disabled = true;
    return;
  }

  let total = 0;
  let hasTimeTicket = false;

  cart.forEach((item, index) => {
    const itemKey = item.option ? `${item.id}-${item.option}` : item.id;
    const itemPrice = item.price * item.quantity;
    total += itemPrice;

    if (item.category === 'time') {
      hasTimeTicket = true;
    }

    const cartItemEl = document.createElement('div');
    cartItemEl.className = 'cart-item';
    cartItemEl.innerHTML = `
      <div class="cart-item-header">
        <div>
          <span class="cart-item-title">${escapeHTML(item.name)}</span>
          ${item.option ? `<br><span class="cart-item-option">${item.option}</span>` : ''}
        </div>
        <button class="cart-item-remove-btn" onclick="removeFromCart(${index})">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
      <div class="cart-item-footer">
        <span class="cart-item-price">${itemPrice.toLocaleString()}원</span>
        <div class="stepper">
          <button class="stepper-btn" onclick="changeQuantity(${index}, -1)">
            <i class="fa-solid fa-minus"></i>
          </button>
          <span class="stepper-value">${item.quantity}</span>
          <button class="stepper-btn" onclick="changeQuantity(${index}, 1)">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
      </div>
    `;

    cartItemsContainer.appendChild(cartItemEl);
  });

  totalPriceDisplay.textContent = `${total.toLocaleString()}원`;

  // Enable/Disable Checkout Button based on Kiosk Rules
  if (!hasTimeTicket) {
    checkoutBtn.disabled = true;
    const timeWarning = document.createElement('div');
    timeWarning.className = 'cart-empty-state';
    timeWarning.style.padding = '10px';
    timeWarning.style.color = '#cf7165';
    timeWarning.innerHTML = `<i class="fa-solid fa-clock-rotate-left" style="font-size: 2rem; margin-bottom: 5px;"></i><p style="font-size: 0.82rem;"><strong>이용 시간권</strong>을 최소 1개 이상 담아야 결제가 가능합니다.</p>`;
    cartItemsContainer.prepend(timeWarning);
  } else {
    checkoutBtn.disabled = false;
  }
}

// Global functions for cart manipulation
window.changeQuantity = function (index, delta) {
  const item = cart[index];
  const newQty = item.quantity + delta;
  
  if (newQty > 0) {
    item.quantity = newQty;
    if (item.category === 'time') {
      item.count = newQty;
    }
  } else {
    cart.splice(index, 1);
  }
  updateCartUI();
};

window.removeFromCart = function (index) {
  cart.splice(index, 1);
  updateCartUI();
};

// Checkout Order Handler
async function handleCheckout() {
  if (cart.length === 0) return;

  checkoutBtn.disabled = true;
  checkoutBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> 주문 저장 중...`;

  const orderId = String(orderCounter++).padStart(4, '0');
  const now = new Date();
  const formattedDate = now.getFullYear() + '-' + 
                        String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                        String(now.getDate()).padStart(2, '0') + ' ' + 
                        String(now.getHours()).padStart(2, '0') + ':' + 
                        String(now.getMinutes()).padStart(2, '0') + ':' + 
                        String(now.getSeconds()).padStart(2, '0');

  let total = 0;
  const itemsList = cart.map(item => {
    const itemPrice = item.price * item.quantity;
    total += itemPrice;
    return {
      id: item.id,
      name: item.name,
      option: item.option || "",
      quantity: item.quantity,
      price: item.price,
      count: item.count || 1
    };
  });

  const orderObj = {
    orderId: orderId,
    date: formattedDate,
    items: itemsList,
    totalPrice: total
  };

  try {
    if (window.api) {
      // Electron API Mode
      const result = await window.api.saveOrder(orderObj);
      if (result.success) {
        showReceipt(orderObj, result.filename);
      } else {
        alert("주문 처리에 실패했습니다: " + result.error);
        resetCheckoutButton();
      }
    } else {
      // Web Browser Mode (GitHub Pages Support)
      // 1. Generate Receipt Text Content
      const receiptText = generateReceiptText(orderObj);
      const formattedDateFile = now.toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
      const filename = `order_${formattedDateFile}_${orderId}`;

      // 2. Trigger Browser File Download
      const blob = new Blob([receiptText], { type: 'text/plain;charset=utf-8' });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${filename}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      // 3. Show Receipt Modal
      showReceipt(orderObj, filename);
    }
  } catch (error) {
    console.error("Failed to checkout:", error);
    alert("오류가 발생했습니다: " + error.message);
    resetCheckoutButton();
  }
}

function resetCheckoutButton() {
  checkoutBtn.disabled = false;
  checkoutBtn.innerHTML = `<span>주문 완료 및 결제하기</span><i class="fa-solid fa-arrow-right"></i>`;
}

// Generate Receipt Text (equivalent layout to main.js)
function generateReceiptText(order) {
  let text = "";
  text += `==========================================\n`;
  text += `           고양이 카페 [MEOW CAFE]        \n`;
  text += `               키오스크 주문서            \n`;
  text += `==========================================\n`;
  text += ` 주문 번호 : # ${order.orderId}\n`;
  text += ` 주문 일시 : ${order.date}\n`;
  text += `------------------------------------------\n`;
  text += ` 상품명                    수량      금액 \n`;
  text += `------------------------------------------\n`;

  order.items.forEach(item => {
    let itemName = item.name;
    if (item.option) {
      itemName += ` (${item.option})`;
    }
    if (item.count > 1 && item.id.startsWith('time')) {
      itemName += ` (인원:${item.count})`;
    }
    
    // Formatting alignment for monospaced receipt text
    const namePad = itemName.padEnd(25, ' ').substring(0, 25);
    const qtyPad = item.quantity.toString().padStart(4, ' ');
    const pricePad = (item.price * item.quantity).toLocaleString().padStart(9, ' ') + "원";
    text += ` ${namePad} ${qtyPad}  ${pricePad}\n`;
  });

  text += `------------------------------------------\n`;
  text += ` 총 주문 금액 :             ${order.totalPrice.toLocaleString().padStart(12, ' ')}원\n`;
  text += `==========================================\n`;
  text += `   고양이들을 만질 때는 부드럽게 다뤄주세요.  \n`;
  text += `    간식은 하루 권장량을 꼭 지켜주세요!      \n`;
  text += `       이용해 주셔서 대단히 감사합니다.       \n`;
  text += `==========================================\n`;
  return text;
}

// Display Beautiful Paper Receipt
function showReceipt(order, filename) {
  document.getElementById('receipt-order-id').textContent = `#${order.orderId}`;
  document.getElementById('receipt-order-date').textContent = order.date;
  
  const fileStatusEl = document.getElementById('receipt-file-status');
  if (filename) {
    fileStatusEl.innerHTML = `<span>주문서 파일명:</span> <span class="file-name">${filename}.txt</span>`;
  } else {
    fileStatusEl.innerHTML = '';
  }

  const tbody = document.getElementById('receipt-items-tbody');
  tbody.innerHTML = '';

  order.items.forEach(item => {
    let displayName = item.name;
    if (item.option) {
      displayName += ` (${item.option})`;
    }
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHTML(displayName)}</td>
      <td class="text-center">${item.quantity}</td>
      <td class="text-right">${(item.price * item.quantity).toLocaleString()}원</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('receipt-total-price').textContent = `${order.totalPrice.toLocaleString()}원`;
  
  resetCheckoutButton();
  openModal(receiptModal);
}

// Render Cats Gallery
function renderCatsGallery() {
  const catsContainer = document.getElementById('cats-container');
  catsContainer.innerHTML = '';

  if (catsData.length === 0) {
    catsContainer.innerHTML = `<p class="text-muted">등록된 고양이 정보가 없습니다.</p>`;
    return;
  }

  catsData.forEach(cat => {
    const card = document.createElement('div');
    card.className = 'cat-card';
    
    const genderClass = cat.gender === '여아' ? 'female' : 'male';
    const genderIcon = cat.gender === '여아' ? '<i class="fa-solid fa-venus"></i>' : '<i class="fa-solid fa-mars"></i>';

    card.innerHTML = `
      <div class="cat-image-container">
        <img src="${escapeHTML(cat.photo)}" alt="${escapeHTML(cat.name)}" onerror="this.src='https://placekitten.com/400/300'">
        <span class="cat-gender-badge ${genderClass}">${genderIcon} ${escapeHTML(cat.gender)}</span>
      </div>
      <div class="cat-card-body">
        <div class="cat-name-row">
          <span class="cat-name">${escapeHTML(cat.name)}</span>
          <span class="cat-breed">${escapeHTML(cat.breed)}</span>
        </div>
        <div class="cat-meta-row">
          <span class="cat-badge">${escapeHTML(cat.age)}</span>
          <span class="cat-badge character">${escapeHTML(cat.character)}</span>
        </div>
        <p class="cat-desc">${escapeHTML(cat.description)}</p>
      </div>
    `;

    catsContainer.appendChild(card);
  });
}

// Admin Mode Functions
function handleAdminLogin() {
  const inputPass = adminPasswordInput.value;
  if (inputPass === '1234') {
    closeModal(adminPassModal);
    adminPasswordInput.value = '';
    adminPassError.style.display = 'none';
    switchTab('admin');
  } else {
    adminPassError.style.display = 'block';
  }
}

// Admin Panel: Render Menu List
function renderAdminMenuList() {
  const container = document.getElementById('admin-menu-list');
  container.innerHTML = '';

  menuData.forEach(item => {
    const row = document.createElement('div');
    row.className = 'admin-item-row';
    row.innerHTML = `
      <div class="admin-item-info">
        <span class="admin-item-name">${escapeHTML(item.name)}</span>
        <span class="admin-item-meta">${getCategoryName(item.category)} | ${item.price.toLocaleString()}원</span>
      </div>
      <div class="admin-item-actions">
        <button class="btn-icon btn-icon-edit" onclick="editMenuItem('${item.id}')">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="btn-icon btn-icon-delete" onclick="deleteMenuItem('${item.id}')">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
    container.appendChild(row);
  });
}

// Admin Panel: Edit Menu Item
window.editMenuItem = function (id) {
  const item = menuData.find(m => m.id === id);
  if (!item) return;

  document.getElementById('menu-form-title').textContent = "메뉴 수정";
  document.getElementById('menu-form-id').value = item.id;
  document.getElementById('menu-name').value = item.name;
  document.getElementById('menu-category').value = item.category;
  document.getElementById('menu-price').value = item.price;
  document.getElementById('menu-description').value = item.description;
  document.getElementById('menu-options-checkbox').checked = item.options;
};

// Admin Panel: Save Menu Item
async function saveMenuItem() {
  const form = document.getElementById('menu-form');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const id = document.getElementById('menu-form-id').value;
  const name = document.getElementById('menu-name').value;
  const category = document.getElementById('menu-category').value;
  const price = parseInt(document.getElementById('menu-price').value, 10);
  const description = document.getElementById('menu-description').value;
  const options = document.getElementById('menu-options-checkbox').checked;

  if (id) {
    const index = menuData.findIndex(m => m.id === id);
    if (index > -1) {
      menuData[index] = { id, category, name, price, description, options };
    }
  } else {
    const newId = `${category}-${Date.now()}`;
    menuData.push({ id: newId, category, name, price, description, options });
  }

  await saveMenuDataToFile();
  resetMenuForm();
  renderKioskMenu();
  renderAdminMenuList();
}

// Admin Panel: Delete Menu Item
window.deleteMenuItem = async function (id) {
  if (!confirm("정말 이 메뉴를 삭제하시겠습니까?")) return;
  menuData = menuData.filter(m => m.id !== id);
  await saveMenuDataToFile();
  renderKioskMenu();
  renderAdminMenuList();
};

function resetMenuForm() {
  document.getElementById('menu-form-title').textContent = "새 메뉴 추가";
  document.getElementById('menu-form-id').value = '';
  menuForm.reset();
}

async function saveMenuDataToFile() {
  if (window.api) {
    await window.api.writeMenu(menuData);
  } else {
    localStorage.setItem('cat_cafe_menu', JSON.stringify(menuData));
  }
}

// Admin Panel: Render Cats List
function renderAdminCatsList() {
  const container = document.getElementById('admin-cats-list');
  container.innerHTML = '';

  catsData.forEach(cat => {
    const row = document.createElement('div');
    row.className = 'admin-item-row';
    row.innerHTML = `
      <div class="admin-item-info">
        <span class="admin-item-name">${escapeHTML(cat.name)} (${escapeHTML(cat.breed)})</span>
        <span class="admin-item-meta">${escapeHTML(cat.gender)} | ${escapeHTML(cat.age)} | ${escapeHTML(cat.character)}</span>
      </div>
      <div class="admin-item-actions">
        <button class="btn-icon btn-icon-edit" onclick="editCatProfile('${cat.id}')">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="btn-icon btn-icon-delete" onclick="deleteCatProfile('${cat.id}')">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
    container.appendChild(row);
  });
}

// Admin Panel: Edit Cat Profile
window.editCatProfile = function (id) {
  const cat = catsData.find(c => c.id === id);
  if (!cat) return;

  document.getElementById('cat-form-title').textContent = "고양이 정보 수정";
  document.getElementById('cat-form-id').value = cat.id;
  document.getElementById('cat-name').value = cat.name;
  document.getElementById('cat-gender').value = cat.gender;
  document.getElementById('cat-age').value = cat.age;
  document.getElementById('cat-breed').value = cat.breed;
  document.getElementById('cat-character').value = cat.character;
  document.getElementById('cat-description').value = cat.description;
  document.getElementById('cat-photo-select').value = cat.photo;
};

// Admin Panel: Save Cat Profile
async function saveCatProfile() {
  const form = document.getElementById('cat-form');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const id = document.getElementById('cat-form-id').value;
  const name = document.getElementById('cat-name').value;
  const gender = document.getElementById('cat-gender').value;
  const age = document.getElementById('cat-age').value;
  const breed = document.getElementById('cat-breed').value;
  const character = document.getElementById('cat-character').value;
  const description = document.getElementById('cat-description').value;
  const photo = document.getElementById('cat-photo-select').value;

  if (id) {
    const index = catsData.findIndex(c => c.id === id);
    if (index > -1) {
      catsData[index] = { id, name, gender, breed, age, description, character, photo };
    }
  } else {
    const newId = `cat-${Date.now()}`;
    catsData.push({ id: newId, name, gender, breed, age, description, character, photo });
  }

  await saveCatsDataToFile();
  resetCatForm();
  renderCatsGallery();
  renderAdminCatsList();
}

// Admin Panel: Delete Cat Profile
window.deleteCatProfile = async function (id) {
  if (!confirm("정말 이 고양이 정보를 삭제하시겠습니까?")) return;
  catsData = catsData.filter(c => c.id !== id);
  await saveCatsDataToFile();
  renderCatsGallery();
  renderAdminCatsList();
};

function resetCatForm() {
  document.getElementById('cat-form-title').textContent = "새 고양이 등록";
  document.getElementById('cat-form-id').value = '';
  catForm.reset();
}

async function saveCatsDataToFile() {
  if (window.api) {
    await window.api.writeCats(catsData);
  } else {
    localStorage.setItem('cat_cafe_cats', JSON.stringify(catsData));
  }
}

// Modal Helper Utility Functions
function openModal(modalEl) {
  modalEl.classList.add('active');
}

function closeModal(modalEl) {
  modalEl.classList.remove('active');
}

function closeModalById(modalId) {
  if (modalId === 'drink-option') closeModal(drinkOptionModal);
  if (modalId === 'treat-safety') closeModal(treatSafetyModal);
  if (modalId === 'receipt') {
    closeModal(receiptModal);
    cart = [];
    updateCartUI();
  }
  if (modalId === 'admin-pass') {
    closeModal(adminPassModal);
    adminPasswordInput.value = '';
    adminPassError.style.display = 'none';
  }
}

// HTML XSS Escaper
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Default Static Fallback Datasets (Equivalent to JSON)
function getDefaultMenu() {
  return [
    { id: "time-1", category: "time", name: "1시간 이용권 (기본)", price: 8000, description: "1인 기본 이용권 + 기본 음료 포함", options: false },
    { id: "time-2", category: "time", name: "2시간 이용권", price: 12000, description: "1인 2시간 이용권 + 기본 음료 포함", options: false },
    { id: "time-3", category: "time", name: "종일 이용권", price: 20000, description: "1인 평일 종일 이용권 + 기본 음료 포함", options: false },
    { id: "drink-1", category: "drink", name: "아메리카노", price: 0, description: "고소한 원두의 아메리카노 (이용권 포함)", options: true },
    { id: "drink-2", category: "drink", name: "카페라떼", price: 500, description: "부드러운 우유가 가미된 카페라떼", options: true },
    { id: "drink-3", category: "drink", name: "발바닥 초코라떼", price: 1500, description: "귀여운 고양이 발바닥 아트 초코라떼", options: true },
    { id: "drink-4", category: "drink", name: "말차 그린티 라떼", price: 1500, description: "진하고 쌉싸름한 말차 라떼", options: true },
    { id: "drink-5", category: "drink", name: "딸기 요거트 스무디", price: 2000, description: "상콤달콤 딸기 스무디", options: true },
    { id: "dessert-1", category: "dessert", name: "고양이 마카롱 (3개)", price: 6500, description: "귀여운 고양이 얼굴 마카롱 세트", options: false },
    { id: "dessert-2", category: "dessert", name: "초코 브라우니 & 아이스크림", price: 5500, description: "달콤 촉촉 브라우니와 바닐라 아이스크림", options: false },
    { id: "dessert-3", category: "dessert", name: "뉴욕 치즈 케이크", price: 5000, description: "부드럽고 진한 치즈 케이크", options: false },
    { id: "treat-1", category: "treat", name: "닭가슴살 츄르 (참치맛)", price: 2000, description: "인기만점 참치맛 액상 간식", options: true },
    { id: "treat-2", category: "treat", name: "바삭 연어 트릿", price: 3000, description: "바삭바삭한 동결건조 연어 간식", options: true },
    { id: "treat-3", category: "treat", name: "츄르 캔 믹스", price: 4000, description: "고농축 영양 캔 간식", options: true }
  ];
}

function getDefaultCats() {
  return [
    { id: "cat-1", name: "나비", gender: "여아", breed: "코리안 숏헤어", age: "2세", description: "까칠해 보이지만 츄르 앞에서는 한없이 약해지는 개냥이입니다.", character: "호기심 많음, 식탐왕", photo: "assets/cat_navi.png" },
    { id: "cat-2", name: "모카", gender: "남아", breed: "러시안 블루", age: "3세", description: "조용하고 얌전한 성격으로, 주로 창가 햇살 아래에서 낮잠을 잡니다.", character: "얌전함, 잠꾸러기", photo: "assets/cat_mocha.png" },
    { id: "cat-3", name: "치즈", gender: "남아", breed: "스코티시 폴드", age: "1세", description: "애교가 아주 많아 손님들의 무릎 위를 차지하는 무릎냥이입니다.", character: "애교쟁이, 무릎냥", photo: "assets/cat_cheese.png" },
    { id: "cat-4", name: "구름", gender: "여아", breed: "페르시안", age: "4세", description: "도도하고 우아한 외모와 달리 깃털 장난감을 보면 사냥 본능이 깨어납니다.", character: "도도함, 깃털 사냥꾼", photo: "assets/cat_cloud.png" }
  ];
}
