const HTTP_STATUS = require('../constants/httpStatus')

// Todo endpoint responde no mesmo formato, sucesso ou erro. Isso poupa o
// frontend (ou qualquer cliente) de checar "esse endpoint retorna o dado
// direto ou dentro de um `data`?" — a resposta é sempre a mesma forma.
// `meta` é opcional e usado só pelos endpoints de listagem paginada; quando
// omitido, a chave nem aparece no JSON (undefined não é serializado).
function success(res, { data = null, message = '', statusCode = HTTP_STATUS.OK, meta } = {}) {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
    meta,
  })
}

function error(res, { message = 'Erro inesperado.', code = 'INTERNAL_ERROR', details = [], statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR } = {}) {
  return res.status(statusCode).json({
    success: false,
    message,
    code,
    details,
  })
}

module.exports = { success, error }
