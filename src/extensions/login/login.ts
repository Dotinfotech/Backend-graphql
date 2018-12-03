// Importing libraries
import { fromEvent } from 'graphcool-lib'
import * as bcryptjs from 'bcryptjs'

// UserQuery for Email
const userQuery = `
query UserQuery($email: String!) {
  User(email: $email){
    id
    password
  }
}`

// Main Export Function 
const login = async (event: any) => {

  // FetchUser Function with Email
  const getGraphcoolUser = async (api: any, email: any) => {
    return await api.request(userQuery, { email })
      .then((userQueryResult: any) => {
        if (userQueryResult.error) {
          return Promise.reject(userQueryResult.error)
        } else {
          return userQueryResult.User
        }
      })
  }

  // Validating Root Token
  if (!event.context.graphcool.pat) {
    console.log('Please provide a valid root token!')
    return { error: 'Email Authentication not configured correctly.' }
  }

  // Retrieve payload from event
  const { email, password } = event.data

  // Graphcool-Library Event and API
  const graphcool = fromEvent(event)
  const api = graphcool.api('simple/v1')

  return await getGraphcoolUser(api, email)
    .then((graphcoolUser: any) => {
      if (!graphcoolUser) {
        return Promise.reject('Invalid Credentials')
      } else {
        // Comparing Passwords
        return bcryptjs.compare(password, graphcoolUser.password)
          .then((passwordCorrect: any) => {
            if (passwordCorrect) {
              let IDData = graphcoolUser.id
              return IDData
            } else {
              return { Error: 'Invalid Credentials' }
            }
          })
      }
    })
    // Generating Authentication Token for User
    .then((graphcoolUserId: any) => {
      let generateAuthTokenID: any = graphcool.generateAuthToken(graphcoolUserId, 'User')
      return generateAuthTokenID
    })
    .then((token: any) => {
      let tokenData = { data: { token: token } }
      return tokenData
    })
    .catch((error: any) => {
      console.log(`Error: ${JSON.stringify(error)}`)
      throw new Error('An Error Occurred')
    })
}
// Exporting Main Function
export default login;
