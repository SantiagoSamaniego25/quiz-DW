const MENU_STORAGE_KEY = 'clave-menu';
const AUTH_API = 'api/auth.php';

async function authRequest(action, payload = null) {
  const options = payload
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
    : { method: 'POST' };

  const response = await fetch(`${AUTH_API}?action=${encodeURIComponent(action)}`, options);
  return response.json();
}

const elements = {
  dateInput: document.querySelector('#date'),
  customerLogin: document.querySelector('#customer-login'),
  customerRegister: document.querySelector('#customer-register'),
  customerRegisterForm: document.querySelector('#customer-register-form'),
  customerLoginView: document.querySelector('#customer-login-view'),
  customerLoginForm: document.querySelector('#customer-login-form'),
  customerLoginMessage: document.querySelector('#customer-login-message'),
  showCustomerLogin: document.querySelector('#show-customer-login'),
  showCustomerRegister: document.querySelector('#show-customer-register'),
  customerSession: document.querySelector('#customer-session'),
  customerLogout: document.querySelector('#customer-logout'),
  bookingPanel: document.querySelector('#booking'),
  bookingForm: document.querySelector('#booking-form'),
  details: document.querySelector('#details'),
  done: document.querySelector('#done'),
  againButton: document.querySelector('#again'),
  adminLogin: document.querySelector('#admin-login'),
  adminLoginForm: document.querySelector('#admin-login-form'),
  adminPanel: document.querySelector('#admin-panel'),
  adminLogout: document.querySelector('#admin-logout'),
  loginMessage: document.querySelector('#login-message'),
  adminMessage: document.querySelector('#admin-message'),
  menuEditor: document.querySelector('#menu-editor'),
  menuEditorForm: document.querySelector('#menu-editor-form'),
  addDishForm: document.querySelector('#add-dish-form'),
  menuGrid: document.querySelector('.menu-grid')
};

function setMinimumDate() {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const normalizedDate = new Date(today.getTime() - offset * 60 * 1000);
  elements.dateInput.min = normalizedDate.toISOString().split('T')[0];
}

function formatPrice(price) {
  return new Intl.NumberFormat('es-CO').format(price);
}

function attachImagePreview(input, preview, status) {
  const updatePreview = () => {
    const imageUrl = input.value.trim();
    preview.hidden = !imageUrl;
    if (!imageUrl) {
      preview.removeAttribute('src');
      status.textContent = '';
      return;
    }

    status.textContent = 'Cargando imagen…';
    preview.onload = () => {
      status.textContent = 'Imagen cargada correctamente.';
    };
    preview.onerror = () => {
      status.textContent = 'No se pudo cargar. Usa la dirección directa de la foto, no la página donde aparece.';
    };
    preview.src = imageUrl;
  };

  input.addEventListener('input', updatePreview);
  updatePreview();
}

function getInitialMenu() {
  return [...elements.menuGrid.querySelectorAll('.dish-card')].map((card, index) => ({
    id: `dish-${index + 1}`,
    name: card.querySelector('h3').textContent.trim(),
    description: card.querySelector('.dish-copy p').textContent.trim(),
    price: Number(card.querySelector('.dish-copy span').textContent.replace(/\D/g, '')),
    image: card.querySelector('img').src
  }));
}

function isValidMenu(menu) {
  return Array.isArray(menu) && menu.every((dish) =>
    dish &&
    typeof dish.id === 'string' &&
    typeof dish.name === 'string' &&
    typeof dish.description === 'string' &&
    Number.isFinite(dish.price) &&
    dish.price >= 0 &&
    typeof dish.image === 'string'
  );
}

let menu = getInitialMenu();
let menuWarning = '';
try {
  const savedMenu = localStorage.getItem(MENU_STORAGE_KEY);
  if (savedMenu) {
    const parsedMenu = JSON.parse(savedMenu);
    if (!isValidMenu(parsedMenu)) {
      throw new Error('El formato del menú guardado no es válido.');
    }
    menu = parsedMenu;
  }
} catch (error) {
  console.error('No se pudo cargar el menú guardado:', error);
  menuWarning = 'No se pudo cargar el menú guardado. Se mostrará el menú original.';
}

function renderMenu() {
  elements.menuGrid.replaceChildren();

  menu.forEach((dish) => {
    const card = document.createElement('article');
    card.className = 'dish-card';

    if (dish.image) {
      const image = document.createElement('img');
      image.className = 'dish-image';
      image.src = dish.image;
      image.alt = dish.name;
      card.append(image);
    }

    const copy = document.createElement('div');
    copy.className = 'dish-copy';

    const name = document.createElement('h3');
    name.textContent = dish.name;
    const description = document.createElement('p');
    description.textContent = dish.description;
    const price = document.createElement('span');
    price.textContent = `Desde $${formatPrice(dish.price)}`;

    copy.append(name, description, price);
    card.append(copy);
    elements.menuGrid.append(card);
  });
}

function renderEditor() {
  elements.menuEditor.replaceChildren();

  menu.forEach((dish, index) => {
    const row = document.createElement('fieldset');
    row.className = 'menu-editor-item';
    row.dataset.index = String(index);

    const legend = document.createElement('legend');
    legend.textContent = `Plato ${index + 1}`;
    row.append(legend);

    const fields = [
      { label: 'Nombre', name: 'name', value: dish.name, type: 'text' },
      { label: 'Descripción', name: 'description', value: dish.description, type: 'text' },
      { label: 'Precio (COP)', name: 'price', value: String(dish.price), type: 'number' },
      { label: 'URL de imagen', name: 'image', value: dish.image, type: 'url' }
    ];

    fields.forEach((field) => {
      const label = document.createElement('label');
      label.textContent = field.label;
      const input = document.createElement('input');
      input.name = field.name;
      input.type = field.type;
      input.value = field.value;
      input.required = field.name !== 'image';
      if (field.name === 'price') {
        input.min = '0';
        input.step = '500';
      }
      label.append(input);
      row.append(label);

      if (field.name === 'image') {
        const preview = document.createElement('img');
        preview.className = 'image-preview';
        preview.alt = `Vista previa de ${dish.name}`;
        preview.hidden = true;
        const status = document.createElement('small');
        status.className = 'image-status';
        row.append(preview, status);
        attachImagePreview(input, preview, status);
      }
    });

    const removeButton = document.createElement('button');
    removeButton.className = 'plain remove-dish';
    removeButton.type = 'button';
    removeButton.textContent = 'Eliminar plato';
    removeButton.addEventListener('click', () => {
      const updatedMenu = menu.filter((_, dishIndex) => dishIndex !== index);
      if (persistMenu(updatedMenu, 'Plato eliminado del menú.')) {
        renderEditor();
        renderMenu();
      }
    });
    row.append(removeButton);
    elements.menuEditor.append(row);
  });
}

function persistMenu(updatedMenu, successMessage) {
  try {
    localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(updatedMenu));
    menu = updatedMenu;
    elements.adminMessage.textContent = successMessage;
    return true;
  } catch (error) {
    console.error('No se pudo guardar el menú:', error);
    elements.adminMessage.textContent = 'No se pudieron guardar los cambios en este navegador.';
    return false;
  }
}

function showAdminPanel() {
  elements.adminLogin.hidden = true;
  elements.adminPanel.hidden = false;
  renderEditor();
}

async function signOutAdmin() {
  await authRequest('logout');
  elements.adminPanel.hidden = true;
  elements.adminLogin.hidden = false;
  elements.adminLoginForm.reset();
  elements.loginMessage.textContent = '';
}

function formatReservationDate(dateValue) {
  const date = new Date(`${dateValue}T12:00:00`);
  return date.toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
}

function setCustomerSignedIn(isSignedIn, username = '') {
  elements.customerLogin.hidden = isSignedIn;
  elements.customerSession.hidden = !isSignedIn;
  elements.bookingPanel.hidden = !isSignedIn;
  elements.done.hidden = true;
  if (isSignedIn) {
    elements.customerSession.querySelector('span').textContent = `Sesión iniciada como ${username}`;
  }
}

async function signOutCustomer() {
  await authRequest('logout');
  elements.bookingForm.reset();
  elements.customerLoginForm.reset();
  elements.customerRegisterForm.reset();
  elements.customerLoginMessage.textContent = '';
  showCustomerAuthView('register');
  setCustomerSignedIn(false);
}

function showCustomerAuthView(view) {
  const showLogin = view === 'login';
  elements.customerRegister.hidden = showLogin;
  elements.customerLoginView.hidden = !showLogin;
  elements.customerLoginMessage.textContent = '';
}

setMinimumDate();
renderMenu();

async function restoreAuthSession() {
  try {
    const session = await authRequest('session');
    if (!session.authenticated) {
      setCustomerSignedIn(false);
      return;
    }

    if (session.role === 'admin') {
      showAdminPanel();
    } else {
      setCustomerSignedIn(true, session.username);
    }
  } catch (error) {
    console.error('No se pudo restaurar la sesión:', error);
    setCustomerSignedIn(false);
  }
}

restoreAuthSession();

elements.adminLoginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const username = document.querySelector('#admin-username').value.trim();
  const password = document.querySelector('#admin-password').value;

  try {
    const result = await authRequest('login', { username, password });
    if (!result.ok || result.role !== 'admin') {
      elements.loginMessage.textContent = result.role === 'customer'
        ? 'Esta cuenta no tiene permisos de administrador.'
        : result.message || 'Usuario o contraseña incorrectos.';
      return;
    }

    elements.loginMessage.textContent = '';
    elements.adminMessage.textContent = menuWarning;
    showAdminPanel();
  } catch (error) {
    elements.loginMessage.textContent = 'No se pudo conectar con el servidor.';
  }
});

elements.adminLogout.addEventListener('click', signOutAdmin);

elements.showCustomerLogin.addEventListener('click', () => showCustomerAuthView('login'));
elements.showCustomerRegister.addEventListener('click', () => showCustomerAuthView('register'));

elements.customerRegisterForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const username = document.querySelector('#customer-new-username').value.trim();
  const password = document.querySelector('#customer-new-password').value;
  const confirmation = document.querySelector('#customer-confirm-password').value;

  if (password !== confirmation) {
    elements.customerLoginMessage.textContent = 'Las contraseñas no coinciden.';
    return;
  }

  try {
    const result = await authRequest('register', { username, password });
    if (!result.ok) {
      elements.customerLoginMessage.textContent = result.message || 'No se pudo crear la cuenta.';
      return;
    }

    elements.customerRegisterForm.reset();
    document.querySelector('#customer-username').value = username;
    showCustomerAuthView('login');
    elements.customerLoginMessage.textContent = result.message;
  } catch (error) {
    elements.customerLoginMessage.textContent = 'No se pudo conectar con el servidor.';
  }
});

elements.customerLoginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const username = document.querySelector('#customer-username').value.trim();
  const password = document.querySelector('#customer-password').value;

  try {
    const result = await authRequest('login', { username, password });
    if (!result.ok || result.role !== 'customer') {
      elements.customerLoginMessage.textContent = result.role === 'admin'
        ? 'Usa el acceso de administrador para esta cuenta.'
        : result.message || 'Usuario o contraseña incorrectos.';
      return;
    }

    elements.customerLoginMessage.textContent = '';
    setCustomerSignedIn(true, result.username);
  } catch (error) {
    elements.customerLoginMessage.textContent = 'No se pudo conectar con el servidor.';
  }
});

elements.customerLogout.addEventListener('click', signOutCustomer);

const newDishImageInput = elements.addDishForm.querySelector('[name="image"]');
const newDishImagePreview = document.createElement('img');
newDishImagePreview.className = 'image-preview';
newDishImagePreview.alt = 'Vista previa del nuevo plato';
newDishImagePreview.hidden = true;
const newDishImageStatus = document.createElement('small');
newDishImageStatus.className = 'image-status';
newDishImageInput.insertAdjacentElement('afterend', newDishImagePreview);
newDishImagePreview.insertAdjacentElement('afterend', newDishImageStatus);
attachImagePreview(newDishImageInput, newDishImagePreview, newDishImageStatus);

elements.menuEditorForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const updatedMenu = [...elements.menuEditor.querySelectorAll('.menu-editor-item')].map((row) => {
    const value = (name) => row.querySelector(`[name="${name}"]`).value.trim();
    return {
      id: menu[Number(row.dataset.index)].id,
      name: value('name'),
      description: value('description'),
      price: Number(value('price')),
      image: value('image')
    };
  });

  if (updatedMenu.some((dish) => !dish.name || !dish.description || !Number.isFinite(dish.price) || dish.price < 0)) {
    elements.adminMessage.textContent = 'Revisa el nombre, la descripción y el precio de cada plato.';
    return;
  }

  if (persistMenu(updatedMenu, 'Menú actualizado correctamente.')) {
    renderEditor();
    renderMenu();
  }
});

elements.addDishForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(elements.addDishForm);
  const newDish = {
    id: `dish-${Date.now()}`,
    name: formData.get('name').toString().trim(),
    description: formData.get('description').toString().trim(),
    price: Number(formData.get('price')),
    image: formData.get('image').toString().trim()
  };

  if (persistMenu([...menu, newDish], 'Plato agregado al menú.')) {
    elements.addDishForm.reset();
    renderEditor();
    renderMenu();
  }
});

elements.bookingForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const chosenDate = elements.dateInput.value;
  const chosenTime = document.querySelector('#time').value;
  if (!chosenDate || !chosenTime) {
    return;
  }

  const guestCount = document.querySelector('#guests').value;
  const name = document.querySelector('#name').value.trim() || 'Cliente';
  elements.details.textContent = `${name}, te esperamos el ${formatReservationDate(chosenDate)} a las ${chosenTime} para ${guestCount}.`;
  document.querySelector('#booking').hidden = true;
  elements.done.hidden = false;

  elements.bookingForm.reset();
  setMinimumDate();
});

elements.againButton.addEventListener('click', () => {
  elements.done.hidden = true;
  document.querySelector('#booking').hidden = false;
});
