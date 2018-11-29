import { fromEvent } from 'graphcool-lib'
import * as bcryptjs from 'bcryptjs'

const userQuery = `
query UserQuery($email: String!) {
  User(email: $email){
    id
    password
  }
}`

const login = async (event: any) => {
  const getGraphcoolUser = async (api: any, email: any) => {
    return await api.request(userQuery, { email }).then((userQueryResult: any) => {
      if (userQueryResult.error) {
        return Promise.reject(userQueryResult.error)
      } else {
        return userQueryResult.User
      }
    })
  }

  if (!event.context.graphcool.pat) {
    console.log('Please provide a valid root token!')
    return { error: 'Email Authentication not configured correctly.' }
  }

  // Retrieve payload from event
  const { email, password } = event.data

  const graphcool = fromEvent(event)
  const api = graphcool.api('simple/v1')

  return await getGraphcoolUser(api, email)
    .then((graphcoolUser: any) => {
      if (!graphcoolUser) {
        return Promise.reject('Invalid Credentials')
      } else {
        return bcryptjs.compare(password, graphcoolUser.password)
          .then((passwordCorrect: any) => {
            if (passwordCorrect) {
              let newid = graphcoolUser.id
              console.log('newlogin user id', newid)
              return newid
            } else {
              return Promise.reject('Invalid Credentials')
            }
          })
      }
    })
    .then(graphcoolUserId => {
      let generateAuthTokenID: any = graphcool.generateAuthToken(graphcoolUserId, 'User')
      console.log('Auth ID', generateAuthTokenID)
      return generateAuthTokenID
    })
    .then((token) => {
      return { data: { token } }
    })
    .catch(error => {
      throw error;
    })
}
export default login;
