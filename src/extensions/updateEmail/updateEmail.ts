import { fromEvent } from 'graphcool-lib'
import * as bcrypt from 'bcryptjs'
import * as validator from 'validator'

 const updateEmail = async (event: any) => {

  const { email, password, newEmail } = event.data

  const graphcool = fromEvent(event)
  const api = graphcool.api('simple/v1')

  const getGraphcoolUser = async function getGraphcoolUser(email: any) {
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
          let userQueryResultUser: any = userQueryResult.User
          return userQueryResultUser
        }
      })
  }

  const updateGraphcoolUser = async function updateGraphcoolUser(id: any, newEmail: any) {
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
        return userMutationResultUpdateUser
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
      .then((id:any) => {
        let DataID: any = { data: { id } }
        return DataID
      })
      .catch((error:any) => {
        console.log(error)
        return { error: 'An unexpected error occured.' }
      })
  } else {
    return { error: "Not a valid email" }
  }
}

export default updateEmail;