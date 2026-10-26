/*const config = require("includes/config_arima");

// O Dataform vai ler a lista de clientes e criar um ciclo (loop)
config.clientes.forEach(cliente => {
  
  // Gera a tabela diária automaticamente para o cliente
  publish(`tn_billing_1_day_${cliente.nome}`, {
    type: "table",
    schema: cliente.dataset_origem,
    description: `Tabela agregada diária do cliente ${cliente.nome}`
  }).query(ctx => `
    SELECT 
      CURRENT_DATE() AS invoice,
      DATE(usage_start_time) AS usage_date,
      billing_account_id,
      SUM(cost * ${cliente.multiplicador}) AS cost
    FROM \`${cliente.dataset_origem}.${cliente.tabela_origem}\`
    GROUP BY 1, 2, 3
  `);
  
});*/

/*const config = require("includes/config_arima");

config.clientes.forEach(cliente => {
  
  // 1. Gera a tabela diária automaticamente para o cliente
  publish(`tn_billing_1_day_${cliente.nome}`, {
    type: "table",
    schema: cliente.dataset_origem,
    description: `Tabela agregada diária do cliente ${cliente.nome}`
  }).query(ctx => `
    SELECT 
      CURRENT_DATE() AS invoice,
      DATE(usage_start_time) AS usage_date,
      billing_account_id,
      SUM(cost * ${cliente.multiplicador}) AS cost
    FROM \`${cliente.dataset_origem}.${cliente.tabela_origem}\`
    GROUP BY 1, 2, 3
  `);

  // 2. Treina o Modelo ARIMA dependendo da tabela acima
  operate(`arima_model_${cliente.nome}`).queries(ctx => `
    CREATE OR REPLACE MODEL \`${cliente.dataset_origem}.arima_model_${cliente.nome}\`
    OPTIONS
    (model_type = 'ARIMA_PLUS',
    time_series_timestamp_col = 'data',
    time_series_data_col = 'custo',
    horizon = 30,
    auto_arima = TRUE,
    data_frequency = 'DAILY',
    decompose_time_series = FALSE
    ) AS
    SELECT
      CAST(usage_date AS DATE) AS data,
      CAST(SUM(cost) AS FLOAT64) AS custo
    FROM ${ctx.ref(`tn_billing_1_day_${cliente.nome}`)}
    WHERE usage_date > DATE_SUB(date_trunc(CURRENT_DATE(), MONTH), INTERVAL 35 DAY)
    GROUP BY usage_date
    ORDER BY usage_date;
  `);
  
});*/

const config = require("includes/config_arima");

config.clientes.forEach(cliente => {

    // 1. Gera a tabela diária automaticamente para o cliente
    publish(`tn_billing_1_day_${cliente.nome}`, {
        type: "table",
        schema: cliente.dataset_origem,
        description: `Tabela agregada diária do cliente ${cliente.nome}`
    }).query(ctx => `
    SELECT 
      CURRENT_DATE() AS invoice,
      DATE(usage_start_time) AS usage_date,
      billing_account_id,
      SUM(cost * ${cliente.multiplicador}) AS cost
    FROM \`${cliente.dataset_origem}.${cliente.tabela_origem}\`
    GROUP BY 1, 2, 3
  `);

    // 2. Treina o Modelo ARIMA dependendo da tabela acima
    operate(`arima_model_${cliente.nome}`).queries(ctx => `
    CREATE OR REPLACE MODEL \`${cliente.dataset_origem}.arima_model_${cliente.nome}\`
    OPTIONS
    (model_type = 'ARIMA_PLUS',
    time_series_timestamp_col = 'data',
    time_series_data_col = 'custo',
    horizon = 30,
    auto_arima = TRUE,
    data_frequency = 'DAILY',
    decompose_time_series = FALSE
    ) AS
    SELECT
      CAST(usage_date AS DATE) AS data,
      CAST(SUM(cost) AS FLOAT64) AS custo
    FROM ${ctx.ref(`tn_billing_1_day_${cliente.nome}`)}
    WHERE usage_date > DATE_SUB(date_trunc(CURRENT_DATE(), MONTH), INTERVAL 35 DAY)
    GROUP BY usage_date
    ORDER BY usage_date;
  `);

    // 3. Cria a View de Previsões para o Dashboard dependendo do modelo ARIMA
    publish(`forecast_view_${cliente.nome}`, {
        type: "view",
        schema: cliente.dataset_origem,
        description: `View de previsões a 30 dias para o dashboard do cliente ${cliente.nome}`,
        dependencies: [`arima_model_${cliente.nome}`]
    }).query(ctx => `
    SELECT 
      CAST(forecast_timestamp AS DATE) AS data_previsao,
      ROUND(forecast_value, 2) AS custo_previsto,
      ROUND(prediction_interval_lower_bound, 2) AS limite_inferior,
      ROUND(prediction_interval_upper_bound, 2) AS limite_superior
    FROM ML.FORECAST(MODEL \`${cliente.dataset_origem}.arima_model_${cliente.nome}\`, 
                     STRUCT(30 AS horizon, 0.95 AS confidence_level))
  `);

});
