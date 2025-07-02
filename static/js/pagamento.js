document.addEventListener("DOMContentLoaded", () => {
  console.log("JS carregado"); // Confirma se o JS foi executado

  // Pega o valor do bilhete no atributo data do body (convertendo para número)
  const valor = parseFloat(document.body.dataset.valor.replace(',', '.')); // Ex: R$ 0,99 por bilhete
  console.log("Valor enviado para o backend:", valor);

  try {
    const payload = {
      valor: valor * 100,
      nome: document.body.dataset.nome || "Não informado",
      quantidade: parseInt(document.body.dataset.quantidade) || 1,
      produto: document.body.dataset.produto || "Produto"
    };
    console.log("Payload final a ser enviado:", payload);
    fetch("/gerar-pix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(async res => {
        const data = await res.json();
        if (data.qr_code_base64) {
          // Exibe o QR Code na imagem
          document.getElementById("qrcodeImg").src = data.qr_code_base64.replace(/\s/g, '');
          // Exibe o código copiável
          document.getElementById("qrcodeTexto").value = data.qr_code;
          // Consulta periódica desativada — uso exclusivo do WebSocket
        } else {
          console.error("Resposta de /gerar-pix (erro):", data);
          alert("Erro ao gerar QR Code");
        }
      })
      .catch(err => {
        console.error("Erro no fetch de /gerar-pix:", err);
      });
  } catch (e) {
    console.error("Erro inesperado ao iniciar fetch:", e);
  }

  iniciarContador(600); // Inicia o contador de 10 minutos (600 segundos)
});

// Função para copiar o código do PIX para a área de transferência
function copiarCodigo() {
  const texto = document.getElementById("qrcodeTexto").value;
  navigator.clipboard.writeText(texto).then(() => {
    alert("Código PIX copiado!");
  });
}

// Função para iniciar o contador regressivo
function iniciarContador(segundos) {
  const contador = document.getElementById("contador");

  const intervalo = setInterval(() => {
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;
    contador.innerText = `${min.toString().padStart(2, '0')}:${seg.toString().padStart(2, '0')}`;

    if (segundos <= 0) {
      clearInterval(intervalo);
      contador.innerText = "Expirado";
      alert("O tempo expirou! Por favor, refaça a compra.");
      window.location.href = "/"; // Redireciona para a home
    }

    segundos--;
  }, 1000);
} 
