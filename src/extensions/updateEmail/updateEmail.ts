import { fromEvent } from 'graphcool-lib'
import * as bcrypt from 'bcryptjs'
import * as validator from 'validator'

export = function (event: any) {
  const { email, password } = event.data.email
  const newEmail = event.data.newEmail

  const graphcool = fromEvent(event)
  const api = graphcool.api('simple/v1')

  function getGraphcoolUser(email: any) {
    return api.request(`
    query {
      User(email: "${email}") {
        id
        password
      }
    }`)
      .then((userQueryResult: any) => {
        if (userQueryResult.error) {
          return Promise.reject(userQueryResult.error)
        } else {
          return userQueryResult.User
        }
      })
  }

  function updateGraphcoolUser(id: any, newEmail: any) {
    return api.request(`
      mutation {
        updateUser(
          id: "${id}",
          email: "${newEmail}"
        ) {
          id
        }
      }`)
      .then((userMutationResult: any) => {
        return userMutationResult.updateUser.id
      })
  }

  if (validator.isEmail(newEmail)) {
    return getGraphcoolUser(email)
      .then((graphcoolUser) => {
        if (graphcoolUser === null) {
          return Promise.reject("Invalid Credentials")
        } else {
          return bcrypt.compare(password, graphcoolUser.password)
            .then((res) => {
              if (res == true) {
                return updateGraphcoolUser(graphcoolUser.id, newEmail)
              } else {
                return Promise.reject("Invalid Credentials")
              }
            })
        }
      })
      .then((id: any) => {
        return { data: { id, email: newEmail } }
      })
      .catch((error: any) => {
        console.log(error)
        return { error: 'An unexpected error occured.' }
      })
  } else {
    return { error: "Not a valid email" }
  }
}
