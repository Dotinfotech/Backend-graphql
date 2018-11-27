import { fromEvent } from 'graphcool-lib'
import * as bcryptjs from 'bcryptjs'

const userQuery = `
query UserQuery($email: String!) {
  User(email: $email){
    id
    password
  }
}`

const getGraphcoolUser = async (api: any, email: any) => {
  await api.request(userQuery, { email })
    .then((userQueryResult: any)=> {
      if (userQueryResult.error) {
        return Promise.reject(userQueryResult.error)
      } else {
        let userQueryResultUser: any = userQueryResult.User
        return userQueryResultUser
      }
    })
}

const authenticate = async (event: any) => {
  if (!event.context.graphcool.pat) {
    console.log('Please provide a valid root token!')
    return { error: 'Email Authentication not configured correctly.' }
  }

  // Retrieve payload from event
  const { email, password } = event.data

  const graphcool = fromEvent(event)
  const api = graphcool.api('simple/v1')

  await getGraphcoolUser(api, email)
    .then((graphcoolUser: any) => {
      if (!graphcoolUser) {
        return Promise.reject('Invalid Credentials')
      } else {
        return bcryptjs.compare(password, graphcoolUser.password)
    .then((passwordCorrect: any) => {
      if (passwordCorrect) {
        return graphcoolUser.id
      } else {
        return Promise.reject('Invalid Credentials')
      }
    })
}
    })
    .then(graphcoolUserId => {
      let generateAuthTokenID: any = graphcool.generateAuthToken(graphcoolUserId, 'User')
      return generateAuthTokenID
})
  .then(token => {
    let tokenData = { data: { token } }
    return tokenData
  })
  .catch(error => {
    console.log(`Error: ${JSON.stringify(error)}`)
    return { error: `An unexpected error occured` }
  })
}
export default authenticate;