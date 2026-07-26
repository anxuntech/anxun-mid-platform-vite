import { handleLogin, handleLogout, handleSession } from '../controllers/authController.js'

export const isAuthRoute = request =>
  new URL(request.url, 'http://localhost').pathname.startsWith('/api/auth/')

export const handleAuthRoute = async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname
  if (pathname === '/api/auth/login') {
    await handleLogin(request, response)
    return
  }
  if (pathname === '/api/auth/session') {
    await handleSession(request, response)
    return
  }
  if (pathname === '/api/auth/logout') {
    await handleLogout(request, response)
    return
  }
  response.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify({ success: false, message: 'not found' }))
}
