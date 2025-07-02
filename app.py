from datetime import datetime
import requests
from dotenv import load_dotenv
import os
from flask import Flask, render_template, redirect, url_for, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO, emit, join_room
from sqlalchemy import func
import eventlet
eventlet.monkey_patch()


load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev_key_default")

socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

PUSHINPAY_TOKEN = os.environ.get("PUSHINPAY_TOKEN", "SUA_CHAVE_AQUI")

PRECO_POR_BILHETE = float(os.environ.get("PRECO_POR_BILHETE", "0.99"))

# Rota para consultar PIX na PushinPay


@app.route("/presell")
def presell():
    return render_template("page_presell/index.html")


@app.route("/obrigado")
def obrigado():
    return render_template("obrigado/index.html")


@app.route("/")
def home():
    return render_template("sorteio/index.html", preco_bilhete=PRECO_POR_BILHETE)


@app.route("/gerar-pix", methods=["POST"])
def gerar_pix():
    valor = request.json.get("valor")
    print("JSON recebido em /gerar-pix:", request.json)
    quantidade = request.json.get("quantidade")
    produto = request.json.get("produto")
    if not quantidade or not produto:
        return "Campos obrigatórios não enviados", 400

    try:
        quantidade = int(quantidade)
        valor_total = PRECO_POR_BILHETE * quantidade
    except ValueError:
        return "Quantidade inválida", 400

    # substitua pelo seu link de webhook
    webhook_url = "https://pagina-sorteio.onrender.com/webhook"

    headers = {
        "Authorization": f"Bearer {PUSHINPAY_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "value": int(round(valor_total * 100)),
        "webhook_url": webhook_url,
        "external_reference": f"{datetime.now().timestamp()}_{produto}",
        "split_rules": []
    }

    response = requests.post(
        "https://api.pushinpay.com.br/api/pix/cashIn", json=payload, headers=headers)
    print("Status da resposta PushinPay:", response.status_code)
    print(response.text)

    if response.status_code == 200:
        data = response.json()
        print("Resposta da Pushin:", data)
        chave_pix = data.get("id") or data.get("identificador")
        if not chave_pix:
            print("Erro: Identificador da transação ausente na resposta da PushinPay")
            return jsonify({"erro": "Chave não recebida da PushinPay"}), 400
        print("Dados recebidos da PushinPay:", data)
        print("Payload enviado à PushinPay:", payload)
        print("Usando chave_pix:", chave_pix)

        nova_transacao = Transacao(
            chave=chave_pix,
            status="pendente"
        )
        db.session.add(nova_transacao)
        db.session.commit()

        return jsonify({
            "qr_code": data.get("qr_code"),
            "qr_code_base64": data.get("qr_code_base64"),
            "chave": chave_pix
        })
    else:
        return jsonify({"erro": "Falha ao gerar PIX"}), 400


@app.route("/pagamento")
def pagamento():
    # Simulação de dados vindos do formulário
    produto = request.args.get("produto", "Produto não informado")
    nome = request.args.get("nome", "Cliente Teste")
    quantidade = request.args.get("quantidade", 70)
    total = request.args.get("total", "10,50")
    data_hora = datetime.now().strftime("%d/%m/%Y às %Hh%M")

    return render_template(
        "sorteio/pagamento.html",
        produto=produto,
        nome=nome,
        quantidade=quantidade,
        total=total,
        data_hora=data_hora
    )


@app.route("/consultar-pix", methods=["POST"])
def consultar_pix():
    chave = request.json.get("chave")
    if not chave:
        return jsonify({"erro": "Chave não fornecida"}), 400

    url = f"https://api.pushinpay.com.br/api/transactions/{chave}"
    headers = {
        "Authorization": f"Bearer {PUSHINPAY_TOKEN}",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        return jsonify(response.json())
    else:
        return jsonify({"erro": "Erro ao consultar PIX"}), response.status_code


app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///transacoes.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)


class Transacao(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    chave = db.Column(db.String(120), unique=True, nullable=False)
    status = db.Column(db.String(20), default="pendente")


@app.route("/healthz")
def healthz():
    return "ok", 200


@app.route("/webhook", methods=["POST"])
def webhook():
    try:
        print("Headers recebidos:", request.headers)
        print("Content-Type:", request.content_type)
        print("Body bruto:", request.data.decode())

        if request.is_json:
            dados = request.get_json()
        elif request.content_type == "application/x-www-form-urlencoded":
            dados = request.form.to_dict()
        else:
            print("Webhook recebido com Content-Type inválido:",
                  request.content_type)
            return jsonify({"erro": "Requisição deve ser JSON ou form-urlencoded"}), 415

        print("Dados interpretados:", dados)

        chave = dados.get("chave") or dados.get("id")
        status = dados.get("status")
        if status:
            status = status.lower()
            if status == "paid":
                status = "pago"
            elif status == "pending":
                status = "pendente"

        print("Chave recebida no webhook:", chave)
        print("Status recebido:", status)

        if not chave or not status:
            return jsonify({"erro": "Dados incompletos"}), 400

        transacao = Transacao.query.filter(func.lower(
            Transacao.chave) == chave.lower()).first()
        if transacao:
            transacao.status = status
            db.session.commit()
            print(f"Emitindo evento pagamento_confirmado para chave: {chave}")
            socketio.emit("pagamento_confirmado", {"chave": chave}, room=chave)
            print(f"Transação {chave} atualizada para {status}")
            return jsonify({"ok": True})
        else:
            return jsonify({"erro": "Transação não encontrada"}), 404

    except Exception as e:
        print("Erro no processamento do webhook:", e)
        return jsonify({"erro": f"Erro interno no servidor: {str(e)}"}), 500


@socketio.on("join")
def handle_join(chave):
    print(f"Cliente entrou na sala: {chave}")
    join_room(chave)


# if __name__ == "__main__":
#     socketio.run(app, debug=True, host='0.0.0.0', port=5001)

if __name__ == "__main__":
    from os import environ
    socketio.run(app, host="0.0.0.0", port=int(
        environ.get("PORT", 5000)), debug=True)
