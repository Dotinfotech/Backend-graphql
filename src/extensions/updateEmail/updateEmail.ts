import { fromEvent } from 'graphcool-lib'
import * as bcrypt from 'bcryptjs'
import * as validator from 'validator'

export const updateEmail = async (event: any) => {
  const { email, password, newEmail } = event.data
  const graphcool = fromEvent(event)
  const api = graphcool.api('simple/v1')

  async function getGraphcoolUser(email: any) {
    await api.request(`
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
          let userQueryResultUser: any= userQueryResult.User
          return userQueryResultUser;
        }
      })
  }

  async function updateGraphcoolUser(id: any, newEmail: any) {
    await api.request(`
      mutation {
        updateUser(
          id: "${id}",
          email: "${newEmail}"
        ) {
          id
        }
      }`)
      .then((userMutationResult: any) => {
        let userMutationResultUpdateUser: any = userMutationResult.updateUser.id
        return userMutationResultUpdateUser;
      })
  }

  if (validator.isEmail(newEmail)) {
    return getGraphcoolUser(email)
      .then((graphcoolUser: any) => {
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
      .then((id) => {
        let DataNewEmail: any = { data: { id, email: newEmail } }
        return DataNewEmail;
      })
      .catch((error) => {
        console.log(error)

        // don't expose error message to client!
        return { error: 'An unexpected error occured.' }
      })
  } else {
    return { error: "Not a valid email" }
  }
}
