let MOCK_USERS = [
  { id: 1, name: 'Test Learner', email: 'learner@test.com', password: '123456', role: 'Learner' },
  { id: 2, name: 'Test Instructor', email: 'instructor@test.com', password: '123456', role: 'Instructor' },
  { id: 3, name: 'Test TA', email: 'ta@test.com', password: '123456', role: 'TA' },
  { id: 4, name: 'Test Admin', email: 'admin@test.com', password: '123456', role: 'Admin' },
]

export const loginApi = (credentials) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const match = MOCK_USERS.find(
        (u) => u.email === credentials.email && u.password === credentials.password
      )
      if (match) {
        const { password, ...user } = match
        resolve({ data: { token: 'mock-jwt-token-' + user.role, user } })
      } else {
        reject({ response: { data: { message: 'Invalid email or password' } } })
      }
    }, 500)
  })
}

export const registerApi = (formData) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const exists = MOCK_USERS.some((u) => u.email === formData.email)
      if (exists) {
        reject({ response: { data: { message: 'duplicate account — email already registered' } } })
        return
      }
      const newUser = {
        id: MOCK_USERS.length + 1,
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: 'Learner',
      }
      MOCK_USERS = [...MOCK_USERS, newUser]
      const { password, ...user } = newUser
      resolve({ data: { token: 'mock-jwt-token-' + user.role, user } })
    }, 500)
  })
}

export const updateProfileApi = (userId, updates) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = MOCK_USERS.findIndex((u) => u.id === userId)
      if (index === -1) {
        reject({ response: { data: { message: 'User not found' } } })
        return
      }
      MOCK_USERS[index] = { ...MOCK_USERS[index], ...updates }
      const { password, ...user } = MOCK_USERS[index]
      resolve({ data: { user } })
    }, 500)
  })
}

export const logoutApi = () => Promise.resolve({ data: { message: 'Logged out' } })
export const getCurrentUserApi = () => Promise.resolve({ data: { user: null } })
