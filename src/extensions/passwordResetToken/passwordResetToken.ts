import { fromEvent } from 'graphcool-lib'
import * as bcrypt from 'bcryptjs'

export = function (event:any) {
  const resetToken = event.data.resetToken
  const newPassword = event.data.password
  
  const graphcool = fromEvent(event)
  const api = graphcool.api('simple/v1')
  
  const saltRounds = 10

  function getUserWithToken(resetToken:any) {
    return api.request(`
      query {
        User(resetToken: "${resetToken}") {
          id
          resetExpires
        }
      }`)
      .then((userQueryResult: any) => {
        if (userQueryResult.error) {
          return Promise.reject(userQueryResult.error)
        } else if (!userQueryResult.User || !userQueryResult.User.id || !userQueryResult.User.resetExpires) {
          return Promise.reject('Not a valid token')
        } else {
          return userQueryResult.User
        }
      })
  }

  function updatePassword(id:any, newPasswordHash:any) {
    return api.request(`
      mutation {
        updateUser(
          id: "${id}",
          password: "${newPasswordHash}",
          resetToken: null,
          resetExpires: null
        ) {
          id
        }
      }`)
      .then((userMutationResult: any) => (userMutationResult.updateUser.id))
  }

  return getUserWithToken(resetToken)
    .then(graphcoolUser => {
      const userId = graphcoolUser.id
      const resetExpires = graphcoolUser.resetExpires
      if (new Date() > new Date(resetExpires)) {
        return Promise.reject('Token expired.')
      } else {
        return bcrypt.hash(newPassword, saltRounds)
          .then(hash => updatePassword(userId, hash))
          .then(id => ({ data: { id } }))
          .catch(error => ({ error: error.toString() }))
      }
    })
    .catch((error:any) => {
      console.log(error)

      return { error: 'An unexpected error occured.' }
    })
}


