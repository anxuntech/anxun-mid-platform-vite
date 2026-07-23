import { handleCaoliaoWebhook } from '../controllers/caoliaoWebhookController.js'
import {
  handleCaoliaoEvents,
  handleCaoliaoHazards,
  handleCaoliaoHealth,
  handleCaoliaoServiceRecords,
} from '../controllers/caoliaoDataController.js'

export const isCaoliaoWebhookRoute = request =>
  new URL(request.url, 'http://localhost').pathname === '/api/caoliao/webhook'
export const isCaoliaoDataRoute = request => {
  const pathname = new URL(request.url, 'http://localhost').pathname
  return ['/api/caoliao/health', '/api/caoliao/events', '/api/caoliao/service-records', '/api/caoliao/hazards'].includes(pathname)
}

export const handleCaoliaoWebhookRoute = async (request, response) => {
  await handleCaoliaoWebhook(request, response)
}

export const handleCaoliaoDataRoute = async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname

  if (pathname === '/api/caoliao/health') {
    await handleCaoliaoHealth(request, response)
    return
  }

  if (pathname === '/api/caoliao/events') {
    await handleCaoliaoEvents(request, response)
    return
  }

  if (pathname === '/api/caoliao/hazards') {
    await handleCaoliaoHazards(request, response)
    return
  }

  await handleCaoliaoServiceRecords(request, response)
}
