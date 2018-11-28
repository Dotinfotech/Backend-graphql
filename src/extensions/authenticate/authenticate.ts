import { fromEvent } from 'graphcool-lib'
import * as bcryptjs from 'bcryptjs'

const userQuery = `
query UserQuery($email: String!) {
  User(email: $email){
    id
    password
  }
}`

const getGraphcoolUser = (api: any, email: any) => {
  return api.request(userQuery, { email })
    .then((userQueryResult:any) => {
      if (userQueryResult.error) {
        return Promise.reject(userQueryResult.error)
      } else {
        return userQueryResult.User
      }
    })
}

export = (event:any) => {
  if (!event.context.graphcool.pat) {
    console.log('Please provide a valid root token!')
    return { error: 'Email Authentication not configured correctly.' }
  }

  // Retrieve payload from event
  const email = event.data.email
  const password = event.data.password

  const graphcool = fromEvent(event)
  const api = graphcool.api('simple/v1')

  return getGraphcoolUser(api, email)
    .then((graphcoolUser:any) => {
      if (!graphcoolUser) {
        return Promise.reject('Invalid Credentials')
      } else {
        return bcryptjs.compare(password, graphcoolUser.password)
          .then(passwordCorrect => {
            if (passwordCorrect) {
              return graphcoolUser.id
            } else {
              return Promise.reject('Invalid Credentials')
            }
          })
      }
    })
    .then((graphcoolUserId:any) => {
      return graphcool.generateAuthToken(graphcoolUserId, 'User')
    })
    .then((token:any) => {
      return { data: { token } }
    })
    .catch((error:any) => {
      console.log(`Error: ${JSON.stringify(error)}`)
      return { error: `An unexpected error occured` }
    })
}
