import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { pool } from '../db.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET ?? 'orion-dev-secret-change-in-prod'

function signToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '30d' }
  )
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ error: 'Email y contraseña requeridos.' })
    if (password.length < 6)
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' })

    const hash = await bcrypt.hash(password, 10)
    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email.toLowerCase().trim(), hash]
    )
    const user  = rows[0]
    const token = signToken(user)
    res.json({ token, user: { id: user.id, email: user.email } })
  } catch (err) {
    if (err.code === '23505')
      return res.status(400).json({ error: 'Este email ya está registrado.' })
    next(err)
  }
})

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ error: 'Email y contraseña requeridos.' })

    const { rows } = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    )
    if (!rows.length)
      return res.status(401).json({ error: 'Email o contraseña incorrectos.' })

    const valid = await bcrypt.compare(password, rows[0].password_hash)
    if (!valid)
      return res.status(401).json({ error: 'Email o contraseña incorrectos.' })

    const user  = rows[0]
    const token = signToken(user)
    res.json({ token, user: { id: user.id, email: user.email } })
  } catch (err) { next(err) }
})

// GET /api/auth/me  — verifica token y devuelve usuario
router.get('/me', async (req, res) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ error: 'No autorizado' })
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET)
    res.json({ user: { id: payload.userId, email: payload.email } })
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado.' })
  }
})

export default router
