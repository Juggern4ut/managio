declare module '#auth-utils' {
  interface User {
    username: string
  }

  interface UserSession {
    loggedInAt: string
  }
}

export {}
