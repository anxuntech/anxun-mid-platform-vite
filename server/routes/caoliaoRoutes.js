import { handleCaoliaoWebhook } from '../controllers/caoliaoWebhookController.js'

export const isCaoliaoWebhookRoute = request => request.url === '/api/caoliao/webhook'

export const handleCaoliaoWebhookRoute = async (request, response) => {
  await handleCaoliaoWebhook(request, response)
}
