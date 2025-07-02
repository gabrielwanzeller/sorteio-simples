document.addEventListener('DOMContentLoaded', function () {
  const decrementBtn = document.querySelector('.qtd button:first-child');
  const incrementBtn = document.querySelector('.qtd button:last-child');
  const quantityInput = document.querySelector('.quantidade-input');
  const quickAddBtns = document.querySelectorAll('.btn-group button');

  const precoPorBilhete = typeof PRECO_BILHETE !== "undefined" ? PRECO_BILHETE : 0.99;
  const valorBump = typeof VALOR_BUMP !== "undefined" ? VALOR_BUMP : 9.90;

  const valorPrincipal = document.getElementById('valor-principal');
  const precoUnitario = parseFloat(valorPrincipal.textContent.replace('R$', '').replace(',', '.'));

  document.querySelectorAll('.pacotes button').forEach(btn => {
    const qtd = parseInt(btn.getAttribute('data-quantidade'));
    const precoTotal = (precoUnitario * qtd).toFixed(2).replace('.', ',');
    btn.textContent = `${qtd} bilhetes por R$ ${precoTotal}`;

    btn.addEventListener('click', () => {
      quantityInput.value = qtd;
      updateDisplay();
    });
  });

  function updateDisplay() {
    let quantity = parseInt(quantityInput.value) || 10;
    if (quantity < 10) quantity = 10;
    quantityInput.value = quantity;
    const total = (quantity * precoPorBilhete).toFixed(2).replace('.', ',');
    const comprarBtn = document.querySelector('.comprar');
    comprarBtn.textContent = `Comprar: R$ ${total}`;

    const valorInput = document.getElementById('input-valor-sorteio');
    if (valorInput) {
      valorInput.value = (quantity * precoPorBilhete).toFixed(2).replace(',', '.');
    }
  }

  // Nova lógica para consumir a API /gerar-pix e exibir o QR Code
  const comprarBtn = document.querySelector('.comprar');
  comprarBtn.addEventListener('click', () => {
    document.getElementById('modal-cadastro').style.display = 'flex';
  });

  // Função para copiar o código PIX
  function copiarCodigo() {
    const texto = document.getElementById("qrcodeTexto").innerText;
    navigator.clipboard.writeText(texto).then(() => {
      alert("Código copiado!");
    });
  }

  decrementBtn.addEventListener('click', () => {
    let quantity = parseInt(quantityInput.value) || 10;
    if (quantity > 10) {
      quantity--;
      quantityInput.value = quantity;
      updateDisplay();
    }
  });

  incrementBtn.addEventListener('click', () => {
    let quantity = parseInt(quantityInput.value) || 10;
    if (quantity >= 100) {
      showError('Limite máximo de 100 bilhetes atingido.');
      return;
    }
    quantity++;
    quantityInput.value = quantity;
    updateDisplay();
  });

  quickAddBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const add = parseInt(btn.textContent.replace('+', ''));
      let quantity = parseInt(quantityInput.value) || 10;
      if (quantity + add > 100) {
        showError('Limite máximo de 100 bilhetes atingido.');
        return;
      }
      quantity += add;
      quantityInput.value = quantity;
      updateDisplay();
    });
  });

  quantityInput.addEventListener('input', updateDisplay);

  updateDisplay();

  // Função para enviar cadastro
  window.enviarCadastro = function () {
    const nome = document.getElementById("nome").value.trim();
    const celular = document.getElementById("celular").value.trim();
    // const celularConfirmacao = document.getElementById("celular-confirmacao").value.trim();
    const email = document.getElementById("email").value.trim();
    // const cpf = document.getElementById("cpf").value.trim();
    const quantidade = parseInt(quantityInput.value) || 10;

    if (!nome || !celular || !email) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    let quantidadeFinal = quantidade;
    let valorAdicional = 0;

    const bumpCheckbox = document.getElementById("bumpMaisNumeros");
    if (bumpCheckbox && bumpCheckbox.checked) {
      quantidadeFinal += 20; // Cliente recebe 20 rifas extras
      valorAdicional = valorBump;
    }

    const dados = {
      nome,
      celular,
      email,
      quantidade: quantidadeFinal,
      valorAdicional
    };

    sessionStorage.setItem("dadosCadastro", JSON.stringify(dados));
    const queryParams = new URLSearchParams({
      nome,
      quantidade: quantidadeFinal,
      total: (quantidade * precoPorBilhete + valorAdicional).toFixed(2).replace('.', ','),
      produto: "Sorteio"
    });
    window.location.href = `/pagamento?${queryParams.toString()}`;
  };

  function showError(message) {
    let errorEl = document.querySelector('.error-message');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'error-message';
      errorEl.style.color = 'red';
      errorEl.style.marginTop = '10px';
      quantityInput.parentNode.appendChild(errorEl);
    }
    errorEl.textContent = message;
  }

  // Adiciona clique na bump-box-alerta para marcar/desmarcar o checkbox ao clicar em qualquer lugar da caixa
  const bumpBoxAlerta = document.querySelector('.bump-box-alerta');
  if (bumpBoxAlerta) {
    bumpBoxAlerta.addEventListener('click', (e) => {
      const checkbox = bumpBoxAlerta.querySelector('input[type="checkbox"]');
      if (e.target !== checkbox) {
        checkbox.checked = !checkbox.checked;
      }
    });
  }
});