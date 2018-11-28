import { fromEvent } from 'graphcool-lib'
import * as  bcrypt from 'bcryptjs'

export = function (event:any) {
  const {email,password,newPassword} = event.data.email
  const graphcool = fromEvent(event)
  const api = graphcool.api('simple/v1')
  const saltRounds = 10

  function getGraphcoolUser(email:any) {
    return api.request(`
    query {
      User(email: "${email}"){
        id
        password
      }
    }`)
      .then((userQueryResult:any) => {
        if (userQueryResult.error) {
          return Promise.reject(userQueryResult.error)
        } else {
          return userQueryResult.User
        }
      })
  }

  function updateGraphcoolUser(id:any, newPasswordHash:any) {
    return api.request(`
      mutation {
        updateUser(
          id:"${id}",
          password:"${newPasswordHash}"
        ){
          id
        }
      }`)
      .then((userMutationResult:any) => {
        return userMutationResult.updateUser.id
      })
  }

  return getGraphcoolUser(email)
    .then((graphcoolUser) => {
      if (graphcoolUser === null) {
        return Promise.reject("Invalid Credentials")
      } else {
        return bcrypt.compare(password, graphcoolUser.password)
          .then((res) => {
            if (res == true) {
              return bcrypt.hash(newPassword, saltRounds)
                .then(hash => updateGraphcoolUser(graphcoolUser.id, hash))
            } else {
              return Promise.reject("Invalid Credentials")
            }
          })
      }
    })
    .then((id) => {
      return { data: { id } }
    })
    .catch((error) => {
      console.log(error)
      return { error: 'An unexpected error occured.' }
    })
}
