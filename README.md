# 🤖 PoC: Orquestração de Machine Learning (ARIMA) no Dataform

Este repositório contém a Prova de Conceito (PoC) desenvolvida no Google Dataform para a orquestração declarativa de modelos de previsão de custos em FinOps, utilizando o algoritmo nativo **ARIMA_PLUS** do BigQuery ML.

---

## 👨‍💻 Autor

**João Batista Rodrigues Ribeiro**  
*Estudante de Engenharia da Computação | Estagiário em Engenharia de Dados*  
Especialidade em Cloud, Automação, Inteligência Artificial, SQL, Python e soluções voltadas para arquitetura, organização e melhoria contínua de processos de dados.

---

## 🎯 Objetivos da PoC

1. **Orquestração Nativa de IA:** Eliminar scripts procedurais e dependências externas para o treino de modelos de séries temporais.
2. **Encadeamento via DAG (Grafo Direcionado Acíclico):** Garantir a dependência sequencial estrita entre o fecho da base agregada de consumo diário e o disparo do treino do modelo.
3. **Escalabilidade Multi-Tenant:** Treinar e versionar modelos independentes por cliente a partir de uma matriz centralizada de parâmetros.
4. **Idempotência no Ciclo de Treino:** Utilização de instruções declarativas `CREATE OR REPLACE MODEL`, garantindo reexecuções seguras e sem duplicação de artefactos analíticos.

---

## 🏗️ Arquitetura e Decisões Técnicas

### 1. Gestão Centralizada de Parâmetros (`includes/config_arima.js`)
As definições analíticas e de ingestão de cada cliente são isoladas da lógica do modelo, permitindo pausar ou adicionar novos ambientes sem alterar o SQLX do pipeline:
* Identificador do cliente
* Dataset de destino
* Janela temporal de dados históricos para treino
* Estado operacional (`ativo` ou `pausado`)

### 2. Dependência Sequencial com `ctx.ref()`
O modelo preditivo exige como pré-requisito a consolidação da tabela de consumo diário (`tn_billing_1_day_<cliente>`). 

Em vez de comandos de espera arbitrários (`sleep` ou ciclos de polling), o Dataform orquestra a dependência nativamente:

```sql
FROM ${ctx.ref("tn_billing_1_day_" + cliente.nome)}

### 3. BigQuery ML Integrado
A especificação do modelo é declarada dentro do fluxo do Dataform, gerando o modelo preditivo diretamente no dataset do cliente:
* **Algoritmo:** `ARIMA_PLUS`
* **Eixo Temporal:** `usage_date`
* **Coluna Alvo:** `custo_total`
* **Tratamento Automático:** Decomposição de sazonalidade semanal/mensal, interpolação de dados em falta e deteção de anomalias nativas do BigQuery.

---

## 📂 Estrutura do Repositório

```text
├── definitions/
│   └── arima_forecast.js     # Declaração das tabelas base e do modelo ARIMA via ctx.ref()
├── includes/
│   └── config_arima.js       # Matriz de parâmetros analíticos e catálogo de clientes
├── workflow_settings.yaml    # Configurações globais de compilação do Dataform
└── README.md                 # Documentação técnica da solução